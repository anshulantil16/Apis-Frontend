import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Area, BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Upload, Download, TrendingUp, Target, Users, Package, MapPin, Building2, Network, ChevronDown,
  Zap, RefreshCw, Trash2, AlertTriangle, CheckCircle2, Info, Sparkles,
  BarChart3, Globe2, ShoppingCart, Boxes, X, Filter, ArrowUpRight, ArrowDownRight,
  Activity, Layers, FileSpreadsheet, Trophy, Radar, Brain, UserSearch, CalendarDays,
} from 'lucide-react';
import {
  API, _API_BASE, inr, shortInr, PALETTE, useCountUp, Counter, Reveal, Panel,
  Skel, Empty, ChartTip, Leaderboard, Coverage, sqFetch, canEdit,
} from './SalesIQShared';
import { IntelligencePanel, CustomersPanel } from './SalesIQPanels';

/** '2026-04' -> 'Apr 26', which is how the review sheet heads its columns.
 *  A chip reading "2026-04" makes the reader translate; the sheet's own
 *  spelling does not. */
const monthLabel = (m: string) => {
  const [y, mo] = (m || '').split('-');
  const i = Number(mo) - 1;
  if (!y || Number.isNaN(i) || i < 0 || i > 11) return m;
  return `${['Jan','Feb','Mar','Apr','May','Jun',
             'Jul','Aug','Sep','Oct','Nov','Dec'][i]} ${y.slice(2)}`;
};
import { SalesIQLogin, loadSession, clearSession } from './SalesIQLogin';

/** Download via fetch+blob rather than a bare <a href>. A plain anchor to a
 *  failing endpoint silently navigates away or does nothing at all, which is
 *  indistinguishable from a broken button — this surfaces the actual reason. */
async function downloadFile(url: string, filename: string) {
  const res = await sqFetch(url);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    if (res.status === 404) {
      detail = 'endpoint not found (404) — the SalesIQ backend may not be deployed yet';
    } else {
      try {
        const j = await res.json();
        if (j?.error) detail = j.error;
      } catch { /* non-JSON error body — keep the status code */ }
    }
    throw new Error(`Download failed: ${detail}`);
  }
  const blob = await res.blob();
  const href = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(href);
  document.body.removeChild(a);
}

/* ── target achievement ring ────────────────────────────────────────────── */
function AchievementRing({ value }: { value: number }) {
  const v = useCountUp(value || 0, 1200);
  const capped = Math.min(v, 150);
  const R = 54, C = 2 * Math.PI * R;
  const off = C - (Math.min(capped, 100) / 100) * C;
  const colour = value >= 100 ? '#10b981' : value >= 80 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      <svg className="w-40 h-40 -rotate-90">
        <circle cx="80" cy="80" r={R} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        <circle cx="80" cy="80" r={R} fill="none" stroke={colour} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off}
          style={{ filter: `drop-shadow(0 0 8px ${colour}55)` }} />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-black tabular-nums" style={{ color: colour }}>{v.toFixed(0)}%</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">of target</p>
      </div>
    </div>
  );
}

/* ── KPI card ───────────────────────────────────────────────────────────── */
function Kpi({ icon: Icon, label, value, format = shortInr, prefix = '', sub, delta, accent, delay }: {
  icon: any; label: string; value: number; format?: (n: number) => string;
  prefix?: string; sub?: string; delta?: number | null; accent: string; delay: number;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <Reveal delay={delay}>
      <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm
                      border border-slate-200/80 p-5 shadow-sm transition-all duration-300
                      hover:-translate-y-1.5 hover:shadow-xl">
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
        <div className="siq-sheen pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100" />
        <div className="relative flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center
                           justify-center shadow-lg transition-transform group-hover:scale-110
                           group-hover:rotate-3 duration-300`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {delta !== undefined && delta !== null && (
            <span className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-[11px] font-black
              ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
        </div>
        <p className="relative text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className="relative text-2xl font-black text-slate-900 tabular-nums tracking-tight">
          <Counter value={value} format={format} prefix={prefix} />
        </p>
        {sub && <p className="relative text-[11px] text-slate-400 mt-1">{sub}</p>}
      </div>
    </Reveal>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
type Tab = 'overview' | 'intelligence' | 'geography' | 'products' | 'customers' | 'team' | 'structure' | 'forecast' | 'data';

/* Only label a slice big enough to read.
 *
 * A category split with a long tail drew a label for every slice, so a dozen
 * sub-1% names piled on top of each other in a stack of unreadable colour.
 * Small slices keep their colour, their tooltip and their legend row; they
 * just stop shouting over one another on the chart itself. */
/* What each dimension is CALLED, as against what the column is named.
 *
 * The review sheet answers every figure on this screen, and it heads these
 * two REGION and Sub-Region. They are stored as `zone` and `state` because
 * the invoice dump has columns of those names holding its own vocabulary --
 * North, and a state code. Showing the storage name asked the reader to
 * translate, and "State" in particular named something the sheet does not
 * have. Renaming the columns would be a migration across both files for a
 * wording problem, so the mapping lives here instead. */
const DIM_LABEL: Record<string, string> = {
  zone: 'Region',
  // The sheet's Sub-Region lives in `subzone`, verbatim -- MH-1, KA-5, Lulu.
  // `state` holds a state name DERIVED from that code (MH-1 -> Maharashtra)
  // so the sheet and the invoice dump name states the same way. Labelling
  // `state` Sub-Region showed the derivation in place of the sheet's own
  // words, which is not what the column says.
  subzone: 'Sub-Region',
  state: 'State',
  rsm: 'RSM',
  asm: 'ASM',
  sales_head: 'Head',
  salesperson: 'Salesperson',
  prod_group: 'Product Group',
  sub_category: 'Sub Category',
  item_alt_code: 'I-Code',
  customer_name: 'Customer',
  product_name: 'Item Name',
};
const dimLabel = (k: string) =>
  DIM_LABEL[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const PIE_LABEL_MIN_PCT = 4;
const pieLabel = (e: any) =>
  (e.share_pct ?? 0) >= PIE_LABEL_MIN_PCT ? `${e.name} ${e.share_pct}%` : '';

export function SalesIQPage(_props: { onNavigateBack?: () => void } = {}) {
  // Auth gate. Session is read once on mount; loadSession() also enforces the
  // 12-hour expiry, so a stale localStorage entry can't grant access.
  const [session, setSession] = useState(() => loadSession());

  // The server can end a session before its 12 hours are up — a restart
  // clears the cache it lives in. sqFetch raises this on the first 401 so
  // the page returns to the login instead of showing a wall of dead panels.
  useEffect(() => {
    const out = () => setSession(null);
    window.addEventListener('salesiq-signed-out', out);
    return () => window.removeEventListener('salesiq-signed-out', out);
  }, []);
  const [tab, setTab] = useState<Tab>('overview');
  const [filterList, setFilterList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [trend, setTrend] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [breaks, setBreaks] = useState<Record<string, any>>({});
  const [org, setOrg] = useState<any>(null);
  const [yoy, setYoy] = useState<any>(null);
  const [orgLevels, setOrgLevels] = useState('sales_head,rsm,asm');
  const [filterOpts, setFilterOpts] = useState<any>(null);
  const [uploads, setUploads] = useState<any>(null);
  const [intel, setIntel] = useState<any>({});
  const [cust, setCust] = useState<any>({});
  const [intelDim, setIntelDim] = useState('state');
  const [err, setErr] = useState('');

  // filters
  // Months ('YYYY-MM'), not days. See the note on `span` below.
  const [mFrom, setMFrom] = useState('');
  const [mTo, setMTo] = useState('');
  /* How the dashboard is being asked its question — and therefore which of
     the two uploaded sheets answers it.

     YTD/AOP vs ACH is month-wise and year-wise: twelve columns a year, no
     days in it anywhere, and its YTD ACH column is the figure the business
     actually reads. PRI SALES DUMP is date-wise: one row per invoice line,
     dated to the day, but only the month it was extracted in.

     So the window is a range of MONTHS and the review sheet answers all
     three options. A day-level range was offered once and could only be
     answered by the dump -- which carries no target at all, so the same
     stretch of time asked by month and by day came back with two different
     figures and only one of them had a plan to measure against. */
  const [span, setSpan] = useState<'fy' | 'months'>('fy');
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [horizon, setHorizon] = useState(6);

  const qs = useCallback(() => {
    const p = new URLSearchParams();
    if (span === 'months') {
      if (mFrom) p.set('month_from', mFrom);
      if (mTo) p.set('month_to', mTo);
    }
    Object.entries(sel).forEach(([k, vs]) => vs.forEach(v => p.append(k, v)));
    return p.toString();
  }, [mFrom, mTo, sel, span]);

  const loadAll = useCallback(async () => {
    setLoading(true); setErr('');
    const q = qs();
    const get = async (path: string) => {
      const r = await sqFetch(`/${path}${path.includes('?') ? '&' : '?'}${q}`);
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Failed: ${path}`);
      return r.json();
    };
    try {
      // The two primary-sales files carry more hierarchy than the original
      // template did. Panels for these hide themselves when a dimension comes
      // back empty, so a file that does not have one costs a card rather than
      // showing an empty one.
      const dims = ['state', 'zone', 'area', 'category', 'product', 'sku', 'channel',
                    'salesperson', 'asm', 'rsm', 'customer',
                    'sales_head', 'subzone', 'district', 'location',
                    'business_type', 'warehouse_type', 'variant', 'prod_group'];
      const [ov, tr, ins, fc, fo, up,
             pareto, matrix, movers, anomalies, seasonality, heatmap, pacing, price,
             rfm, cohorts, newRepeat, paretoCustomer, orgTree, yoyData,
             ...bs] = await Promise.all([
        get('overview/'), get('trend/'), get('insights/'),
        get(`forecast/?periods=${horizon}`), sqFetch('/filters/').then(r => r.json()),
        sqFetch('/uploads/').then(r => r.json()),
        // intelligence tab
        get(`pareto/?dim=${intelDim}`), get(`matrix/?dim=${intelDim}`),
        get(`movers/?dim=${intelDim}`), get('anomalies/'), get('seasonality/'),
        get(`heatmap/?dim=${intelDim}`), get('pacing/'), get('price/'),
        // customers tab
        get('rfm/'), get('cohorts/'), get('new-repeat/'), get('pareto/?dim=customer'),
        get(`org/?levels=${orgLevels}`), get('yoy/'),
        ...dims.map(d => get(`breakdown/?dim=${d}&limit=12`)),
      ]);
      setOverview(ov); setTrend(tr); setInsights(ins.insights || []);
      setForecast(fc); setFilterOpts(fo); setUploads(up);
      setIntel({ pareto, matrix, movers, anomalies, seasonality, heatmap, pacing, price });
      setCust({ rfm, cohorts, newRepeat, paretoCustomer });
      setOrg(orgTree); setYoy(yoyData);
      const map: Record<string, any> = {};
      dims.forEach((d, i) => { map[d] = bs[i]; });
      setBreaks(map);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally { setLoading(false); }
  }, [qs, horizon, intelDim, orgLevels]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const hasData = overview?.has_data;
  // Achievement is measured only over months that carry both a plan and a
  // result, so the panel says how many that is rather than leaving the
  // reader to assume it is the whole span on screen.
  const monthsCompared: number = overview?.achievement_basis?.months ?? 0;
  const dated = span === 'months';
  const activeFilters = Object.values(sel).flat().length
    + (dated && mFrom ? 1 : 0) + (dated && mTo ? 1 : 0);

  // Dropping the last filter unmounts the chip, but this state would survive
  // it — so the next filter picked would pop the list open on its own.
  useEffect(() => { if (!activeFilters) setFilterList(false); }, [activeFilters]);

  /* Every applied filter, each carrying the way to drop just itself. The
     header only had a count and a button that cleared the lot, so narrowing
     to Zone=North and Brand=Honey and then wanting only Honey meant starting
     over and re-picking it. */
  const appliedFilters: { key: string; dim: string; value: string; drop: () => void }[] = [
    ...Object.entries(sel).flatMap(([dim, vals]) =>
      (vals as string[]).map(v => ({
        key: `${dim}:${v}`,
        dim: dimLabel(dim),
        value: v,
        drop: () => toggle(dim, v),
      }))),
    ...(dated && mFrom ? [{ key: 'from', dim: 'from', value: monthLabel(mFrom),
                            drop: () => setMFrom('') }] : []),
    ...(dated && mTo ? [{ key: 'to', dim: 'to', value: monthLabel(mTo),
                          drop: () => setMTo('') }] : []),
  ];

  const toggle = (k: string, v: string) =>
    setSel(s => {
      const cur = s[k] || [];
      const next = cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v];
      const out = { ...s, [k]: next };
      if (!next.length) delete out[k];
      return out;
    });

  /* merged history + forecast for the projection chart */
  const fcChart = useMemo(() => {
    if (!forecast) return [];
    const hist = (forecast.history || []).map((h: any) => ({
      label: h.label, actual: h.value, forecast: null, lower: null, upper: null,
    }));
    // Bridge point: repeat the last actual as the forecast's origin so the two
    // lines visually connect instead of leaving a gap at the seam.
    const bridge = hist.length ? [{ ...hist[hist.length - 1], forecast: hist[hist.length - 1].actual }] : [];
    const fut = (forecast.points || []).map((p: any) => ({
      label: new Date(p.period).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      actual: null, forecast: p.value, lower: p.lower, upper: p.upper,
      band: [p.lower, p.upper],
    }));
    return [...hist.slice(0, -1), ...bridge, ...fut];
  }, [forecast]);

  /* "anshul.antil" off the end of an address is not how anybody writes their
     own name. Split on the separators a work address uses, drop anything that
     is only digits (joiner suffixes like anshul.antil02), and capitalise. */
  const displayName = (session?.email || '')
    .split('@')[0]
    .split(/[._\-]+/)
    .filter(w => w && !/^\d+$/.test(w))
    .map(w => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ') || (session?.email || '');

  // A tab that is no longer in the list must not stay selected: every panel
  // is gated on `activeTab === ...`, so a reader whose session lands on 'data'
  // would match nothing and see an empty page. Derived rather than corrected
  // in an effect, so there is never a frame showing nothing.
  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'intelligence', label: 'Intelligence', icon: Brain },
    { id: 'geography', label: 'Geography', icon: Globe2 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'customers', label: 'Customers', icon: UserSearch },
    { id: 'team', label: 'Sales Team', icon: Users },
    { id: 'structure', label: 'Structure', icon: Network },
    { id: 'forecast', label: 'Forecast', icon: Radar },
    // The owner's tab. It is the upload screen, the list of loaded files and
    // their row counts, warnings and spans — none of which is a reader's
    // business, and all of which previously showed with the buttons greyed
    // out, which reads as something broken rather than something private.
    ...(canEdit()
      ? [{ id: 'data' as Tab, label: 'Data', icon: FileSpreadsheet }]
      : []),
  ];

  const activeTab: Tab = TABS.some(t => t.id === tab) ? tab : 'overview';

  if (!session) {
    return (
      <SalesIQLogin
        // Re-read rather than rebuild: the stored session carries the
        // token and the role the server resolved, and both matter below.
        onSuccess={() => setSession(loadSession())}
      />
    );
  }

  return (
    <div className="min-h-full bg-[#f5f7fa] relative">
      <style>{`
        @keyframes siqReveal { from { opacity:0; transform: translateY(14px) scale(.985);} to {opacity:1;transform:none;} }
        .siq-reveal { animation: siqReveal .55s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes siqShimmer { 0%{background-position:-500px 0} 100%{background-position:500px 0} }
        .siq-shimmer { background-image:linear-gradient(90deg,#f1f5f9 0px,#e2e8f0 100px,#f1f5f9 200px);
                       background-size:600px 100%; animation:siqShimmer 1.3s linear infinite; }
        @keyframes siqFloat { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(18px,-22px) scale(1.06)} }
        .siq-blob { animation: siqFloat 16s ease-in-out infinite; }
        @keyframes siqGrow { from { width:0 !important; } }
        .siq-grow { animation: siqGrow .8s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes siqSheen { from{transform:translateX(-120%)} to{transform:translateX(220%)} }
        .siq-sheen::after{content:'';position:absolute;inset:0;width:45%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);
          animation:siqSheen 1.1s ease-in-out; }
        @keyframes siqPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(1.35)}}
        .siq-pulse{animation:siqPulse 2s ease-in-out infinite;}
        @keyframes siqSpinSlow{to{transform:rotate(360deg)}}
        .siq-spin-slow{animation:siqSpinSlow 14s linear infinite;}
      `}</style>

      {/* ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="siq-blob absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-indigo-400/15 blur-[120px]" />
        <div className="siq-blob absolute top-1/2 -right-32 w-[32rem] h-[32rem] rounded-full bg-cyan-400/15 blur-[120px]"
             style={{ animationDelay: '5s' }} />
        <div className="siq-blob absolute -bottom-40 left-1/3 w-[28rem] h-[28rem] rounded-full bg-fuchsia-400/10 blur-[120px]"
             style={{ animationDelay: '9s' }} />
      </div>

      {/* ── header ── */}
      <div className="relative z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-4">
          <div className="ml-auto flex items-center gap-2">
            {activeFilters > 0 && (
              <div className="relative">
                <button onClick={() => setFilterList(o => !o)}
                  title="See which filters are on, and drop them one at a time"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]
                              font-bold transition-all ${filterList
                                ? 'bg-indigo-600 text-white'
                                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
                  <Filter className="w-3.5 h-3.5" />
                  {activeFilters} filter{activeFilters > 1 ? 's' : ''}
                  <ChevronDown className={`w-3 h-3 transition-transform ${filterList ? 'rotate-180' : ''}`} />
                </button>
                {filterList && (
                  <>
                    {/* Click anywhere else to close — a list that only closes
                        by its own button is one people leave open. */}
                    <div className="fixed inset-0 z-40" onClick={() => setFilterList(false)} />
                    <div className="absolute right-0 top-10 z-50 w-72 rounded-xl bg-white shadow-xl
                                    ring-1 ring-slate-200 overflow-hidden">
                      <p className="px-3.5 pt-3 pb-2 text-[10px] font-black uppercase tracking-widest
                                    text-slate-400 border-b border-slate-100">
                        Showing only
                      </p>
                      <div className="max-h-72 overflow-y-auto py-1">
                        {appliedFilters.map(f => (
                          <div key={f.key}
                            className="flex items-center gap-2 px-3.5 py-2 hover:bg-slate-50 group">
                            <div className="min-w-0 flex-1">
                              <p className="text-[9.5px] font-black uppercase tracking-wide
                                            text-slate-400 capitalize">{f.dim}</p>
                              <p className="text-[12.5px] font-bold text-slate-700 truncate">{f.value}</p>
                            </div>
                            <button onClick={f.drop}
                              title={`Stop filtering by ${f.value}`}
                              className="p-1 rounded-md text-slate-300 hover:text-rose-600
                                         hover:bg-rose-50 transition-colors shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => { setSel({}); setMFrom(''); setMTo(''); setFilterList(false); }}
                        className="w-full px-3.5 py-2.5 text-[12px] font-black text-slate-500
                                   hover:bg-rose-50 hover:text-rose-600 border-t border-slate-100
                                   transition-colors">
                        Clear all {activeFilters}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            <button onClick={loadAll} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200
                         text-[12px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
            </button>
            <button
              onClick={async () => {
                setErr('');
                try {
                  await downloadFile(`${API}/export/?${qs()}`, 'SalesIQ_Export.xlsx');
                } catch (e) {
                  setErr(e instanceof Error ? e.message : 'Could not build the export');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white
                         text-[12px] font-bold hover:bg-slate-800 transition-all">
              <Download className="w-3.5 h-3.5" />Export
            </button>
            <div className="flex items-center gap-2 pl-2 ml-1 border-l border-slate-200">
              <div className="hidden sm:block text-right leading-none">
                <p className="text-[11px] font-black text-slate-700">{displayName}</p>
                {/* The role the server resolved, not a label on the page.
                    This said "Super admin" to everybody, in literal text,
                    under their own name. */}
                <p className={`text-[9px] font-bold uppercase tracking-widest ${
                  canEdit() ? 'text-amber-600' : 'text-slate-400'}`}>
                  {canEdit() ? 'Owner' : 'View only'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600
                              flex items-center justify-center text-white text-[12px] font-black
                              shadow-md shadow-amber-500/25">
                {session.email[0].toUpperCase()}
              </div>
              <button onClick={() => { clearSession(); setSession(null); }}
                title="Sign out"
                className="px-2.5 py-1.5 rounded-lg text-[12px] font-bold text-slate-400
                           hover:text-rose-600 hover:bg-rose-50 transition-all">
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="max-w-[1600px] mx-auto px-6 flex items-center gap-1 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon;
            const on = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold
                            whitespace-nowrap transition-all
                  ${on ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <Icon className="w-4 h-4" />{t.label}
                {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full
                                        bg-gradient-to-r from-indigo-500 to-fuchsia-500 siq-reveal" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-6 py-6">
        {err && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-rose-800">{err}</p>
          </div>
        )}

        {/* ── filter bar ── */}
        {hasData && filterOpts && tab !== 'data' && (
          <Reveal>
            <div className="mb-5 rounded-2xl bg-white border border-slate-200 p-3 flex flex-wrap items-center gap-2 shadow-sm">
              <Filter className="w-4 h-4 text-slate-400 ml-1" />
              {/* Named, not implied: a window nobody can see is a window
                  nobody can question — and here the window also decides
                  which sheet answers, which is the first thing anyone asks
                  when a figure looks wrong. */}
              <select value={span}
                onChange={e => setSpan(e.target.value as 'fy' | 'months')}
                title={'Every figure is read off the review sheet — the file your YTD AOP and YTD ACH columns live in.'}
                className="px-2.5 py-1.5 rounded-lg border border-violet-200 bg-violet-50
                           text-[12px] font-bold text-violet-700">
                <option value="fy">
                  {overview?.filters?.window?.label
                    ? `${overview.filters.window.label} to date`
                    : 'This financial year'}
                </option>
                <option value="months">Choose months…</option>
              </select>
              {span === 'months' && (() => {
                /* The months the files actually hold, oldest first so the pair
                   reads left to right like the sheet does. A free month input
                   let somebody pick a month no file covers and read the empty
                   dashboard as a bad month of trading. */
                const all: string[] = [...(filterOpts?.months || [])].sort();
                const pick = `px-2.5 py-1.5 rounded-lg border border-violet-200 bg-white
                              text-[12px] font-bold text-violet-700 cursor-pointer`;
                return (
                  <>
                    <select value={mFrom} aria-label="From month" className={pick}
                      onChange={e => {
                        const v = e.target.value;
                        setMFrom(v);
                        // Keep the pair in order rather than refusing it: an
                        // end before its start is an empty dashboard with
                        // nothing on screen explaining why.
                        if (v && mTo && v > mTo) setMTo(v);
                      }}>
                      <option value="">From…</option>
                      {all.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
                    </select>
                    <span className="text-slate-300 text-xs">to</span>
                    <select value={mTo} aria-label="To month" className={pick}
                      onChange={e => {
                        const v = e.target.value;
                        setMTo(v);
                        if (v && mFrom && v < mFrom) setMFrom(v);
                      }}>
                      <option value="">To…</option>
                      {all.filter(m => !mFrom || m >= mFrom)
                          .map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
                    </select>
                  </>
                );
              })()}
              {(['zone', 'subzone', 'channel', 'category', 'salesperson'] as const).map(k => (
                (filterOpts[k] || []).length > 0 && (
                  <select key={k} value=""
                    onChange={e => e.target.value && toggle(k, e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold
                               text-slate-600 bg-white max-w-[150px]">
                    <option value="">{dimLabel(k)}</option>
                    {filterOpts[k].map((v: string) => <option key={v} value={v}>{v}</option>)}
                  </select>
                )
              ))}
              {Object.entries(sel).flatMap(([k, vs]) => vs.map(v => (
                <button key={`${k}-${v}`} onClick={() => toggle(k, v)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600
                             text-[11px] font-bold hover:bg-indigo-100 transition-all siq-reveal">
                  {v}<X className="w-3 h-3" />
                </button>
              )))}
            </div>
          </Reveal>
        )}

        {/* ── loading ── */}
        {loading && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skel key={i} className="h-32" />)}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <Skel className="h-80 xl:col-span-2" /><Skel className="h-80" />
            </div>
          </div>
        )}

        {/* ── no data ── */}
        {!loading && !hasData && tab !== 'data' && (
          <Reveal>
            <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500
                              flex items-center justify-center mx-auto mb-5 shadow-xl shadow-indigo-500/25">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">No sales data yet</h2>
              <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                {canEdit()
                  ? 'Upload a sales report to unlock revenue trends, state and product breakdowns, team leaderboards and forecasting.'
                  : 'Nothing has been loaded yet. The sales files are maintained by the SalesIQ owner — once a report is uploaded, everything here fills in.'}
              </p>
              {/* No point offering the upload screen to somebody the server
                  will refuse. */}
              {canEdit() && (
                <button onClick={() => setTab('data')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white
                             font-bold shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 transition-all">
                  Upload sales data
                </button>
              )}
            </div>
          </Reveal>
        )}

        {/* ══ OVERVIEW ══ */}
        {!loading && hasData && activeTab === 'overview' && (
          <div className="space-y-5">
            {/* A dashboard built on a handful of leftover rows looks exactly
                as confident as one built on the real file — same tiles, same
                colours, ₹1.91 L where ₹274 Cr belongs. Saying so costs one
                strip and saves somebody concluding the figures are wrong. */}
            {overview.loaded?.looks_empty && (
              <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border-2 border-amber-300 px-4 py-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-amber-900">
                    Only {overview.loaded.lines.toLocaleString('en-IN')} line
                    {overview.loaded.lines === 1 ? '' : 's'} are loaded — these figures
                    are not the business.
                  </p>
                  <p className="text-[11.5px] text-amber-700 font-semibold mt-0.5">
                    The primary sales file runs to tens of thousands of lines. Everything
                    below is computed correctly from what is here, which is almost nothing.
                    {canEdit()
                      ? <> Upload <span className="font-black">Primary sales data.xlsx</span> to replace it.</>
                      : ' The SalesIQ owner needs to load the full file.'}
                  </p>
                  {/* A reader has no Data tab to be sent to. */}
                  {canEdit() && (
                    <button onClick={() => setTab('data')}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[11.5px] font-black
                                 hover:bg-amber-700 transition-colors">
                      Go to upload
                    </button>
                  )}
                </div>
              </div>
            )}
            {/* Plan and actual, read as one relationship.

                This was six equal cards -- Revenue, Target, Orders, Quantity,
                Customers, SKUs -- which gave the plan the same weight as the
                SKU count and left the reader to work out the one thing the
                review actually asks: are we ahead or behind, and by how much.
                Revenue and Target now sit either side of a single bar that
                answers it. */}
            {(() => {
              const rev = Number(overview.revenue || 0);
              const tgt = Number(overview.target || 0);
              const pct = overview.achievement_pct;
              const gap = rev - tgt;
              const ahead = gap >= 0;
              // Clamped: 140% of plan must not render as a bar running off
              // the end of its own track.
              const fill = tgt ? Math.max(0, Math.min(100, (rev / tgt) * 100)) : 0;
              const growth = overview.vs_last_year?.growth_pct
                           ?? overview.revenue_growth_pct;
              const months = overview.achievement_basis?.months ?? 0;
              return (
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm
                                overflow-hidden siq-reveal">
                  <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x
                                  divide-slate-100">
                    <div className="p-6 sm:p-7">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500
                                         to-violet-600 grid place-items-center shrink-0">
                          <TrendingUp className="w-4 h-4 text-white" />
                        </span>
                        <span className="text-[11px] font-black tracking-[0.12em]
                                         text-slate-400 uppercase">Revenue</span>
                        {growth !== null && growth !== undefined && (
                          <span className={`ml-auto px-2 py-0.5 rounded-full text-[11px] font-black
                            ${growth >= 0 ? 'bg-emerald-50 text-emerald-600'
                                          : 'bg-rose-50 text-rose-600'}`}>
                            {growth >= 0 ? '+' : ''}{growth}%
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-[34px] sm:text-[40px] leading-none font-black
                                    text-slate-900 tabular-nums">
                        ₹{shortInr(rev)}
                      </p>
                      <p className="mt-2 text-[12px] font-semibold text-slate-500">
                        {overview.vs_last_year
                          ? `vs ₹${shortInr(overview.vs_last_year.last_year)} same ${overview.vs_last_year.months} months last year`
                          : overview.prev_period_has_data
                            ? `vs ₹${shortInr(overview.prev_revenue)} prior period`
                            : 'nothing loaded for the period before this'}
                      </p>
                    </div>
                    <div className="p-6 sm:p-7">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500
                                         to-teal-600 grid place-items-center shrink-0">
                          <Target className="w-4 h-4 text-white" />
                        </span>
                        <span className="text-[11px] font-black tracking-[0.12em]
                                         text-slate-400 uppercase">Target</span>
                      </div>
                      <p className="mt-3 text-[34px] sm:text-[40px] leading-none font-black
                                    text-slate-900 tabular-nums">
                        {tgt ? `₹${shortInr(tgt)}` : '—'}
                      </p>
                      <p className="mt-2 text-[12px] font-semibold text-slate-500">
                        {tgt
                          ? `${months} month${months === 1 ? '' : 's'} of plan`
                          : 'no target set for this window'}
                      </p>
                    </div>
                  </div>

                  {tgt > 0 && (
                    <div className="px-6 sm:px-7 py-5 border-t border-slate-100 bg-slate-50/70">
                      <div className="flex items-baseline justify-between gap-3 flex-wrap">
                        <p className="text-[13px] font-black text-slate-700">
                          {pct !== null && pct !== undefined ? `${pct}% of plan` : 'Against plan'}
                        </p>
                        <p className={`text-[13px] font-black tabular-nums
                          ${ahead ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {ahead ? 'ahead by ' : 'behind by '}₹{shortInr(Math.abs(gap))}
                        </p>
                      </div>
                      <div className="mt-2.5 h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
                        <div className={`h-full rounded-full transition-[width] duration-700
                          ${ahead ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                  : 'bg-gradient-to-r from-amber-500 to-rose-500'}`}
                          style={{ width: `${fill}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <Panel title="Revenue trend" subtitle="Monthly sales against target" icon={Activity}
                delay={340} className="xl:col-span-2">
                {trend?.results?.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={trend.results}>
                      <defs>
                        <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={shortInr} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
                      <Tooltip content={<ChartTip />} />
                      {/* A month with a plan against it and nothing sold yet
                          comes back as null, not zero. Without this the line
                          dropped to the axis for the rest of the financial
                          year and read as a collapse. The dashed target line
                          carries on past it, which is the real story. */}
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2.5}
                        fill="url(#gRev)" animationDuration={1100} connectNulls={false} />
                      <Line type="monotone" dataKey="target" name="Target" stroke="#f59e0b" strokeWidth={2}
                        strokeDasharray="5 4" dot={false} animationDuration={1300} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : <Empty msg="No trend data" />}
              </Panel>

              {/* The ring compares the months that carry BOTH a plan and a
                  result. Showing full revenue beside it implied the whole
                  Rs 274 crore was being measured against this year's plan,
                  when 12 of those 18 months are last year and have no plan
                  at all. */}
              <Panel title="Target achievement"
                subtitle={monthsCompared
                  ? `Plan vs actual · ${monthsCompared} month${monthsCompared > 1 ? 's' : ''} to date`
                  : 'Actual vs plan'}
                icon={Target} delay={400}>
                <div className="flex flex-col items-center justify-center h-[300px]">
                  {overview.achievement_pct !== null ? (
                    <>
                      <AchievementRing value={overview.achievement_pct} />
                      <div className="grid grid-cols-2 gap-3 w-full mt-4">
                        <div className="rounded-xl bg-slate-50 p-3 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Actual to date
                          </p>
                          <p className="text-sm font-black text-slate-800">
                            ₹{shortInr(overview.achievement_basis?.revenue ?? overview.revenue)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {overview.gap_to_target > 0 ? 'Gap' : 'Surplus'}
                          </p>
                          <p className={`text-sm font-black ${overview.gap_to_target > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ₹{shortInr(Math.abs(overview.gap_to_target || 0))}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : <Empty msg="Add a Target column to your upload to see achievement" />}
                </div>
              </Panel>
            </div>

            {/* insights */}
            {insights.length > 0 && (
              <Panel title="What the data is telling you" icon={Sparkles}
                subtitle="Generated from the current selection" delay={460}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {insights.map((ins, i) => {
                    const style = ins.type === 'risk'
                      ? { wrap: 'border-rose-200 bg-rose-50/60', ic: 'text-rose-500', I: AlertTriangle }
                      : ins.type === 'win'
                        ? { wrap: 'border-emerald-200 bg-emerald-50/60', ic: 'text-emerald-500', I: CheckCircle2 }
                        : { wrap: 'border-blue-200 bg-blue-50/60', ic: 'text-blue-500', I: Info };
                    const I = style.I;
                    return (
                      <div key={i} className={`siq-reveal rounded-xl border p-3.5 ${style.wrap}
                                               transition-transform hover:-translate-y-0.5`}
                        style={{ animationDelay: `${i * 70}ms` }}>
                        <div className="flex items-start gap-2">
                          <I className={`w-4 h-4 mt-0.5 flex-shrink-0 ${style.ic}`} />
                          <div className="min-w-0">
                            <p className="text-[12px] font-black text-slate-800 mb-0.5">{ins.title}</p>
                            <p className="text-[11px] text-slate-600 leading-relaxed">{ins.body}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Panel title="Top states" icon={MapPin} delay={520} right={<Coverage coverage={breaks.state?.coverage} />}>
                {breaks.state?.results?.length ? <Leaderboard rows={breaks.state.results.slice(0, 7)} showTarget />
                  : <Empty msg="No state data" />}
              </Panel>
              <Panel title="Top categories" icon={Package} delay={560} right={<Coverage coverage={breaks.category?.coverage} />}>
                {breaks.category?.results?.length ? <Leaderboard rows={breaks.category.results.slice(0, 7)} />
                  : <Empty msg="No category data" />}
              </Panel>
              <Panel title="Channel mix" icon={ShoppingCart} delay={600}>
                {breaks.channel?.results?.length ? (
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie data={breaks.channel.results} dataKey="revenue" nameKey="name"
                        innerRadius={52} outerRadius={90} paddingAngle={3} animationDuration={1000}>
                        {breaks.channel.results.map((_: any, i: number) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="#fff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <Empty msg="No channel data" />}
              </Panel>
            </div>
          </div>
        )}

        {/* ══ INTELLIGENCE ══ */}
        {!loading && hasData && activeTab === 'overview' && yoy?.results?.length > 1
          && (yoy.years?.length || 0) > 1 && (
          <Panel title="Year on year" icon={CalendarDays}
            subtitle={`Same month, ${yoy.years.join(' vs ')} · April to March — where the year is actually being won or lost`}>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={yoy.results} margin={{ left: 4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false}
                  tickLine={false} tickFormatter={(v: number) => shortInr(v)} width={64} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {yoy.years.map((y: string, i: number) => (
                  i === yoy.years.length - 1 ? (
                    <Area key={y} type="monotone" dataKey={y} name={y}
                      stroke={PALETTE[i % PALETTE.length]} strokeWidth={2.5}
                      fill={PALETTE[i % PALETTE.length]} fillOpacity={0.12}
                      animationDuration={900} connectNulls={false} />
                  ) : (
                    <Line key={y} type="monotone" dataKey={y} name={y}
                      stroke={PALETTE[i % PALETTE.length]} strokeWidth={2}
                      strokeDasharray="5 4" dot={false} animationDuration={900}
                      connectNulls={false} />
                  )
                ))}
              </ComposedChart>
            </ResponsiveContainer>
            {(() => {
              const latest = yoy.years[yoy.years.length - 1];
              const g = yoy.growth?.[latest];
              if (!g || g.pct === null || g.pct === undefined) return null;
              return (
                <p className="text-[12px] font-bold text-slate-500 mt-3">
                  {latest} is{' '}
                  <span className={g.pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {g.pct >= 0 ? 'up' : 'down'} {Math.abs(g.pct).toFixed(1)}%
                  </span>{' '}
                  on {yoy.years[yoy.years.length - 2]}, over the {g.months} month
                  {g.months === 1 ? '' : 's'} both years have.
                </p>
              );
            })()}
          </Panel>
        )}

        {!loading && hasData && activeTab === 'intelligence' && (
          <IntelligencePanel data={intel} dim={intelDim} setDim={setIntelDim} />
        )}

        {/* ══ CUSTOMERS ══ */}
        {!loading && hasData && activeTab === 'customers' && <CustomersPanel data={cust} />}

        {/* ══ GEOGRAPHY ══ */}
        {!loading && hasData && activeTab === 'geography' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <Panel title="Revenue by state" icon={MapPin} subtitle="Ranked by contribution" delay={0} right={<Coverage coverage={breaks.state?.coverage} />}>
              {breaks.state?.results?.length ? (
                <ResponsiveContainer width="100%" height={Math.max(280, breaks.state.results.length * 34)}>
                  <BarChart data={breaks.state.results} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tickFormatter={shortInr} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="revenue" name="Revenue" radius={[0, 6, 6, 0]} animationDuration={1000}>
                      {breaks.state.results.map((_: any, i: number) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty msg="No state column in your upload" />}
            </Panel>
            <Panel title="Zone performance" icon={Globe2} delay={60} right={<Coverage coverage={breaks.zone?.coverage} />}>
              {breaks.zone?.results?.length ? <Leaderboard rows={breaks.zone.results} showTarget />
                : <Empty msg="No zone column in your upload" />}
            </Panel>
            {/* Neither primary-sales file carries an Area column, so this
                drew an empty box on every load. A panel with nothing to put
                in it is not drawn; the Data tab lists what the upload is
                missing, in one place, instead of six blank cards. */}
            {breaks.area?.results?.length > 0 && (
              <Panel title="Top areas" icon={MapPin} subtitle="Beat / district level" delay={120} right={<Coverage coverage={breaks.area?.coverage} />}>
                <Leaderboard rows={breaks.area.results.slice(0, 12)} showTarget />
              </Panel>
            )}
            <Panel title="Top customers" icon={Users} delay={180} right={<Coverage coverage={breaks.customer?.coverage} />}>
              {breaks.customer?.results?.length ? <Leaderboard rows={breaks.customer.results.slice(0, 12)} />
                : <Empty msg="No customer column in your upload" />}
            </Panel>
            {breaks.subzone?.results?.length > 0 && (
              <Panel title="Sub-zone performance" icon={MapPin} delay={240}>
                <Leaderboard rows={breaks.subzone.results.slice(0, 12)} showTarget />
              </Panel>
            )}
            {breaks.district?.results?.length > 0 && (
              <Panel title="Top districts" icon={MapPin} delay={300}>
                <Leaderboard rows={breaks.district.results.slice(0, 12)} />
              </Panel>
            )}
            {breaks.location?.results?.length > 0 && (
              <Panel title="Billing depot" icon={Building2} subtitle="Which location invoiced it"
                delay={360}>
                <Leaderboard rows={breaks.location.results.slice(0, 12)} />
              </Panel>
            )}
          </div>
        )}

        {/* ══ PRODUCTS ══ */}
        {!loading && hasData && activeTab === 'products' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <Panel title="Category contribution" icon={Package} delay={0} right={<Coverage coverage={breaks.category?.coverage} />}>
              {breaks.category?.results?.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={breaks.category.results} dataKey="revenue" nameKey="name"
                      innerRadius={60} outerRadius={105} paddingAngle={3} animationDuration={1000}
                      label={pieLabel} labelLine={false}>
                      {breaks.category.results.map((_: any, i: number) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Empty msg="No category column in your upload" />}
            </Panel>
            <Panel title="Top products" icon={Boxes} subtitle="By revenue" delay={60}>
              {breaks.product?.results?.length ? <Leaderboard rows={breaks.product.results.slice(0, 12)} />
                : <Empty msg="No product column in your upload" />}
            </Panel>
            <Panel title="Top SKUs" icon={Layers} delay={120}>
              {breaks.sku?.results?.length ? <Leaderboard rows={breaks.sku.results.slice(0, 12)} />
                : <Empty msg="No SKU column in your upload" />}
            </Panel>
            <Panel title="Channel split" icon={ShoppingCart} delay={180}>
              {breaks.channel?.results?.length ? <Leaderboard rows={breaks.channel.results} showTarget />
                : <Empty msg="No channel column in your upload" />}
            </Panel>
            {breaks.prod_group?.results?.length > 0 && (
              <Panel title="Product group" icon={Boxes} delay={240}>
                <Leaderboard rows={breaks.prod_group.results.slice(0, 12)} />
              </Panel>
            )}
            {breaks.variant?.results?.length > 0 && (
              <Panel title="By variant" icon={Layers} subtitle="Pack format within a product"
                delay={300}>
                <Leaderboard rows={breaks.variant.results.slice(0, 12)} />
              </Panel>
            )}
            {breaks.business_type?.results?.length > 0 && (
              <Panel title="Customer business type" icon={Users} delay={360}>
                <Leaderboard rows={breaks.business_type.results.slice(0, 10)} />
              </Panel>
            )}
            {breaks.warehouse_type?.results?.length > 0 && (
              <Panel title="Warehouse type" icon={Building2} delay={420}>
                <Leaderboard rows={breaks.warehouse_type.results.slice(0, 10)} />
              </Panel>
            )}
          </div>
        )}

        {/* ══ TEAM ══ */}
        {!loading && hasData && activeTab === 'team' && (
          <div className="space-y-5">
            {/* The three hierarchy panels below used to be nested inside this
                salesperson check, so a file with RSM, ASM and Head but no
                individual salesperson — which is both of the primary-sales
                files — rendered an empty tab while holding all the data to
                fill it. They stand on their own now. */}
            {breaks.salesperson?.results?.length ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {breaks.salesperson.results.slice(0, 3).map((r: any, i: number) => (
                    <Reveal key={r.name} delay={i * 80}>
                      <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-xl
                        ${i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-amber-500/25'
                          : i === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600 shadow-slate-500/25'
                            : 'bg-gradient-to-br from-orange-400 to-rose-600 shadow-orange-500/25'}`}>
                        <Trophy className="siq-spin-slow absolute -right-4 -bottom-4 w-24 h-24 opacity-15" />
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                          #{i + 1} performer
                        </p>
                        <p className="text-lg font-black mt-1 truncate">{r.name}</p>
                        <p className="text-2xl font-black tabular-nums mt-2">
                          ₹<Counter value={r.revenue} />
                        </p>
                        {r.achievement_pct !== null && (
                          <p className="text-[11px] font-bold opacity-90 mt-1">
                            {r.achievement_pct.toFixed(0)}% of target · {r.orders} orders
                          </p>
                        )}
                      </div>
                    </Reveal>
                  ))}
                </div>
                <Panel title="Salesperson leaderboard" icon={Trophy} delay={240}>
                  <Leaderboard rows={breaks.salesperson.results} showTarget />
                </Panel>
              </>
            ) : null}

            {/* The reporting line, deepest first. */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {breaks.asm?.results?.length > 0 && (
                <Panel title="ASM performance" icon={Users}
                  subtitle="Reporting manager" delay={300}>
                  <Leaderboard rows={breaks.asm.results} showTarget />
                </Panel>
              )}
              {breaks.rsm?.results?.length > 0 && (
                <Panel title="RSM performance" icon={Users}
                  subtitle="GTR head" delay={360}>
                  <Leaderboard rows={breaks.rsm.results} showTarget />
                </Panel>
              )}
              {breaks.sales_head?.results?.length > 0 && (
                <Panel title="Head performance" icon={Users}
                  subtitle="Above RSM in the reporting line" delay={420}>
                  <Leaderboard rows={breaks.sales_head.results} showTarget />
                </Panel>
              )}
            </div>

            {!breaks.salesperson?.results?.length
              && !breaks.asm?.results?.length
              && !breaks.rsm?.results?.length
              && !breaks.sales_head?.results?.length && (
              <Panel title="Sales team" icon={Users}>
                <Empty msg="No salesperson, ASM, RSM or Head column in your upload" />
              </Panel>
            )}
          </div>
        )}

        {/* ══ FORECAST ══ */}
        {!loading && hasData && activeTab === 'structure' && (
          <StructureTab org={org} levels={orgLevels} setLevels={setOrgLevels} />
        )}

        {!loading && hasData && activeTab === 'forecast' && forecast && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Kpi icon={Radar} label={`Next ${horizon} months`} value={forecast.forecast_total || 0}
                prefix="₹" accent="from-violet-500 to-fuchsia-600" delay={0}
                sub="projected revenue" />
              <Kpi icon={TrendingUp} label="vs recent" value={forecast.vs_recent?.projected_total || 0}
                prefix="₹" delta={forecast.vs_recent?.change_pct}
                accent="from-indigo-500 to-blue-600" delay={60}
                sub={`vs ₹${shortInr(forecast.vs_recent?.recent_total || 0)} last ${forecast.vs_recent?.months || 0}m`} />
              <Kpi icon={Activity} label="History" value={forecast.history_months} format={inr}
                accent="from-cyan-500 to-teal-600" delay={120} sub="months of data" />
              <Kpi icon={Target} label="Model error" value={forecast.mape || 0}
                format={(n) => `${n.toFixed(1)}%`} accent="from-amber-500 to-orange-600" delay={180}
                sub="mean abs. % error" />
            </div>

            <Panel title="Projection" icon={Radar} delay={240}
              subtitle={`${forecast.method} · ${forecast.confidence} confidence`}
              right={
                <div className="flex items-center gap-1">
                  {[3, 6, 12].map(h => (
                    <button key={h} onClick={() => setHorizon(h)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all
                        ${horizon === h ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                          : 'text-slate-400 hover:bg-slate-100'}`}>{h}M</button>
                  ))}
                </div>
              }>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={fcChart}>
                  <defs>
                    <linearGradient id="gAct" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d946ef" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#d946ef" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={shortInr} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="upper" name="Upper" stroke="none" fill="url(#gBand)" animationDuration={900} />
                  <Area type="monotone" dataKey="lower" name="Lower" stroke="none" fill="#fff" animationDuration={900} />
                  <Area type="monotone" dataKey="actual" name="Actual" stroke="#6366f1" strokeWidth={2.5}
                    fill="url(#gAct)" animationDuration={1100} connectNulls={false} />
                  <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#d946ef" strokeWidth={2.5}
                    strokeDasharray="6 4" dot={{ r: 3, fill: '#d946ef' }} animationDuration={1300} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3">
                <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <b className="text-slate-700">{forecast.method}</b> — {forecast.note} The shaded band is
                  the 95% confidence range and widens further out, because uncertainty compounds with
                  horizon.
                </p>
              </div>
            </Panel>

            <Panel title="Month-by-month projection" icon={BarChart3} delay={300}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-slate-400">
                    <tr>{['Month', 'Forecast', 'Low', 'High', 'Range'].map(h => (
                      <th key={h} className="text-left text-[10px] font-black uppercase tracking-widest px-3 py-2">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(forecast.points || []).map((p: any, i: number) => (
                      <tr key={p.period} className="siq-reveal hover:bg-slate-50" style={{ animationDelay: `${i * 50}ms` }}>
                        <td className="px-3 py-2.5 font-bold text-slate-700">
                          {new Date(p.period).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="px-3 py-2.5 font-black text-indigo-600 tabular-nums">₹{shortInr(p.value)}</td>
                        <td className="px-3 py-2.5 text-slate-400 tabular-nums">₹{shortInr(p.lower)}</td>
                        <td className="px-3 py-2.5 text-slate-400 tabular-nums">₹{shortInr(p.upper)}</td>
                        <td className="px-3 py-2.5 w-1/3">
                          <div className="h-1.5 rounded-full bg-gradient-to-r from-fuchsia-200 via-fuchsia-500 to-fuchsia-200 siq-grow"
                            style={{ width: `${Math.min(100, (p.upper - p.lower) / (p.value || 1) * 100)}%` }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}

        {/* ══ DATA ══ */}
        {!loading && activeTab === 'data' && (
          <DataPanel uploads={uploads} onChanged={loadAll}
            absentDims={filterOpts?.absent_dimensions || []}
            absentDetail={filterOpts?.absent_detail || []} />
        )}
      </div>
    </div>
  );
}

/* ── data / upload tab ──────────────────────────────────────────────────── */
function DataPanel({ uploads, onChanged, absentDims = [], absentDetail = [] }:
  { uploads: any; onChanged: () => void; absentDims?: string[];
    // Why each dark breakdown is dark — 'missing' wants a new column,
    // 'empty' wants the existing one filled in upstream.
    absentDetail?: { dim: string; reason: 'empty' | 'missing' }[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);

  const send = async (f: File) => {
    setBusy(true); setErr(''); setRes(null);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const r = await sqFetch('/upload/', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Upload failed');
      setRes(d); setFile(null); onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed');
    } finally { setBusy(false); }
  };

  // Only the owner uploads or deletes. Everybody else granted SalesIQ in
  // the Admin Console reads: the numbers are the point of the tool, and
  // whoever owns the file is one person. The server enforces this (see
  // views/auth.SalesIQAdminView); hiding the controls is so nobody is
  // offered a button that will refuse them.
  const mayEdit = canEdit();

  const removeUpload = async (id: number | null) => {
    const msg = id
      ? 'Remove this upload and all of its rows?'
      : `Delete ALL sales data (${uploads?.total_rows?.toLocaleString() || 0} rows)? This cannot be undone.`;
    if (!confirm(msg)) return;
    const r = await sqFetch(`/uploads/${id ? `?id=${id}` : ''}`, { method: 'DELETE' });
    const d = await r.json();
    alert(d.message || 'Done');
    onChanged();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <Panel title="Upload primary sales" icon={Upload}
        subtitle={mayEdit
          ? 'Both sheets in one workbook is fine — each tab is read on its own'
          : 'Read-only — the sales data is maintained by the SalesIQ owner'}>
        {!mayEdit && (
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3.5">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[12.5px] font-black text-slate-600">
                You have read access to SalesIQ
              </p>
              <p className="text-[11.5px] text-slate-400 font-semibold mt-0.5">
                Every figure, breakdown and export is open to you. Uploading and
                deleting the underlying files is kept to one person, so the
                numbers everyone is reading cannot change underneath them.
              </p>
            </div>
          </div>
        )}
        {mayEdit && <>
        <button
          onClick={async () => {
            setErr('');
            try {
              await downloadFile(`${API}/template/`, 'SalesIQ_Pre_Sales_Dump_Template.xlsx');
            } catch (e) {
              setErr(e instanceof Error ? e.message : 'Could not download the template');
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-4 rounded-xl border
                     border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all">
          <Download className="w-4 h-4" />Download column template
        </button>

        <label
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => {
            e.preventDefault(); setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) { setFile(f); send(f); }
          }}
          className={`block rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer
            transition-all ${drag ? 'border-indigo-400 bg-indigo-50/60 scale-[1.02]'
              : 'border-slate-300 bg-slate-50/40 hover:border-indigo-300 hover:bg-indigo-50/30'}`}>
          <input type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); send(f); } }} />
          {busy ? (
            <>
              <RefreshCw className="w-9 h-9 mx-auto mb-3 text-indigo-500 animate-spin" />
              <p className="text-sm font-bold text-slate-700">Importing…</p>
            </>
          ) : (
            <>
              <Upload className={`w-9 h-9 mx-auto mb-3 ${drag ? 'text-indigo-500' : 'text-slate-400'}`} />
              <p className="text-sm font-bold text-slate-700">
                {file ? file.name : 'Drop your sales file here, or click to browse'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Pre-Sales Dump and AOP vs ACH — columns matched by name, raw export works
              </p>
            </>
          )}
        </label>

        {err && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
            <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-rose-800">{err}</p>
          </div>
        )}

        {res && (
          <div className="mt-4 siq-reveal">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-sm font-bold text-emerald-800">
                {res.message} · ₹{shortInr(res.total_revenue)}
              </p>
            </div>
            {/* Which tab gave what. Without this a two-sheet workbook reports
                one number and there is no way to tell whether both sheets were
                actually read — which is exactly how a silently skipped tab
                went unnoticed. */}
            {res.sheets && Object.keys(res.sheets).length > 0 && (
              <div className="mb-3 space-y-1.5">
                {Object.entries(res.sheets).map(([name, info]: [string, any]) => (
                  <div key={name}
                    className="flex items-center justify-between gap-3 rounded-lg border
                               border-slate-200 bg-white px-3 py-2">
                    <span className="text-[12px] font-bold text-slate-700 truncate">{name}</span>
                    <span className="text-[11px] font-black text-slate-400 shrink-0">
                      {info.rows?.toLocaleString()} rows
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase text-[9.5px]">
                        {info.kind === 'aop' ? 'AOP vs ACH' : 'Sales dump'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* What was loaded but deliberately left out of the figures.
                Shown as its own line rather than buried in the warnings —
                a cancelled invoice missing from a total is the first thing
                somebody queries when the dashboard disagrees with the ERP. */}
            {(res.cancelled_rows > 0 || res.return_rows > 0) && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {res.cancelled_rows > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                    <p className="text-[18px] font-black text-slate-700 leading-none">
                      {res.cancelled_rows.toLocaleString()}
                    </p>
                    <p className="text-[10.5px] font-bold text-slate-400 mt-1">
                      cancelled — stored, not counted
                    </p>
                  </div>
                )}
                {res.return_rows > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                    <p className="text-[18px] font-black text-amber-700 leading-none">
                      {res.return_rows.toLocaleString()}
                    </p>
                    <p className="text-[10.5px] font-bold text-amber-600 mt-1">
                      credit memos / returns
                    </p>
                  </div>
                )}
              </div>
            )}

            {res.detected_columns?.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  Read from your file · {res.detected_columns.length}
                </p>
                <div className="flex flex-wrap gap-1">
                  {res.detected_columns.map((c: string) => (
                    <span key={c} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Separate from "unrecognised" on purpose. These are columns we
                know about and skip — every percentage is derivable from the
                amount beside it — and calling them failures would have every
                upload look broken. */}
            {res.skipped_columns?.length > 0 && (
              <details className="mb-3 group">
                <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest
                                    text-slate-300 hover:text-slate-500 transition-colors">
                  Skipped on purpose · {res.skipped_columns.length}
                </summary>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {res.skipped_columns.map((c: string) => (
                    <span key={c} className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-400
                                             border border-slate-100 text-[11px] font-semibold">
                      {c}
                    </span>
                  ))}
                </div>
                <p className="text-[10.5px] text-slate-400 mt-1.5 leading-relaxed">
                  Percentages are derivable from the amount beside them, Value in Lakhs
                  restates Taxable Amount, and the GL/TCS code columns are ledger
                  plumbing. Nothing here changes a sales figure.
                </p>
              </details>
            )}
            {/* Amber is for something lost or something needing a decision.
                A note saying the import did exactly what it should is not
                that, and dressing it as one made a clean import of a normal
                ERP export look like seven faults. */}
            {res.warnings?.map((w: string, i: number) => (
              <div key={i} className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-amber-900 leading-relaxed">{w}</p>
              </div>
            ))}
            {res.notes?.length > 0 && (
              <details className="mt-1" open={!res.warnings?.length}>
                <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest
                                    text-slate-300 hover:text-slate-500 transition-colors mb-1.5">
                  What the import did · {res.notes.length}
                </summary>
                <div className="space-y-1.5">
                  {res.notes.map((n: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-slate-50
                                            border border-slate-100 p-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-300 mt-0.5 flex-shrink-0" />
                      <p className="text-[11.5px] text-slate-500 leading-relaxed">{n}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
        </>}
      </Panel>

      {/* One honest list of what the files do not carry, instead of a blank
          panel wherever one of them would have gone. */}
      {absentDims.length > 0 && (() => {
        // Two reasons a breakdown is dark, and they want opposite actions.
        // Area, Region, Territory and Salesperson are in neither file — add
        // the column. Sub Category and Variant ARE columns in the dump; they
        // arrive on every row and are blank on every row, so "add this column
        // and re-upload" sends somebody to add a column that is already there
        // and nothing changes when they do. That one is filled in upstream.
        const by = (r: string) => absentDetail
          .filter(x => x.reason === r).map(x => x.dim);
        // Falls back to the old single list if an older server is answering.
        const missing = absentDetail.length ? by('missing') : absentDims;
        const empty = absentDetail.length ? by('empty') : [];
        const chips = (list: string[], tone: string) => (
          <div className="flex flex-wrap gap-2">
            {list.map((d: string) => (
              <span key={d} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize ${tone}`}>
                {d.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        );
        return (
          <Panel title="Breakdowns that are dark" icon={Info}
            subtitle="What is missing, and what is there but never filled in">
            {missing.length > 0 && (
              <div className="mb-4">
                {chips(missing, 'bg-slate-100 text-slate-500')}
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  <span className="font-black text-slate-500">No column for these.</span>{' '}
                  Add any one to the export and re-upload, and its views turn on by
                  themselves. Nothing else needs changing.
                </p>
              </div>
            )}
            {empty.length > 0 && (
              <div>
                {chips(empty, 'bg-amber-100 text-amber-700')}
                <p className="text-[11px] text-amber-700 mt-2 leading-relaxed">
                  <span className="font-black">The column is already in your file —
                  every row is blank.</span>{' '}
                  Re-uploading will not change this; the values have to be filled in
                  upstream, in the ERP, and then exported.
                </p>
              </div>
            )}
          </Panel>
        );
      })()}

      <Panel title="Uploaded files" icon={FileSpreadsheet}
        subtitle={`${uploads?.total_rows?.toLocaleString() || 0} rows in total`}
        right={mayEdit && uploads?.count > 0 && (
          <button onClick={() => removeUpload(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200
                       text-rose-600 text-[12px] font-bold hover:bg-rose-50 transition-all">
            <Trash2 className="w-3.5 h-3.5" />Clear all
          </button>
        )}>
        {!uploads?.results?.length ? <Empty msg="No uploads yet" /> : (
          <div className="space-y-2">
            {uploads.results.map((u: any, i: number) => (
              <div key={u.id} className="siq-reveal flex items-center gap-3 rounded-xl border
                                         border-slate-200 p-3 hover:border-slate-300 transition-all"
                style={{ animationDelay: `${i * 60}ms` }}>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-slate-800 truncate">{u.filename || 'upload'}</p>
                  <p className="text-[11px] text-slate-400">
                    {u.rows.toLocaleString()} rows · ₹{shortInr(u.revenue)}
                    {u.period_start && ` · ${u.period_start} → ${u.period_end}`}
                  </p>
                  {u.warnings?.length > 0 ? (
                    <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                      {u.warnings.length} warning{u.warnings.length > 1 ? 's' : ''}
                    </p>
                  ) : u.notes?.length > 0 ? (
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                      Imported cleanly
                    </p>
                  ) : null}
                </div>
                {mayEdit && (
                  <button onClick={() => removeUpload(u.id)}
                    className="p-2 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

export default SalesIQPage;


/* ── the selling organisation ─────────────────────────────────────────────
 *
 * Every other view flattens the reporting line, so an ASM could be ranked
 * against another and you would never see whose team either was on. This
 * shows the line itself, with each person's sales rolled up into whoever
 * they report to.
 */
function OrgNode({ node, max, depth = 0 }: { node: any; max: number; depth?: number }) {
  // Deep branches stay closed: an org opened all the way is a wall of names.
  const [open, setOpen] = useState(depth < 1);
  const kids = node.children || [];
  const width = max > 0 ? Math.max(2, (node.revenue / max) * 100) : 0;
  const LEVEL_TONE: Record<string, string> = {
    sales_head: 'from-violet-500 to-fuchsia-600',
    rsm: 'from-indigo-500 to-violet-600',
    asm: 'from-sky-500 to-indigo-500',
    salesperson: 'from-cyan-500 to-sky-500',
  };
  const tone = LEVEL_TONE[node.level] || 'from-slate-400 to-slate-500';

  return (
    <div style={{ marginLeft: depth ? 18 : 0 }}>
      <div className={`relative rounded-xl border border-slate-200 bg-white p-3 mb-2
                       transition-all hover:border-indigo-300 hover:shadow-sm
                       ${depth ? 'border-l-2 border-l-slate-200' : ''}`}>
        <div className="flex items-center gap-3">
          {kids.length > 0 ? (
            <button onClick={() => setOpen(o => !o)}
              className="w-5 h-5 shrink-0 rounded-md bg-slate-100 text-slate-500 hover:bg-indigo-100
                         hover:text-indigo-600 flex items-center justify-center transition-colors"
              title={open ? 'Collapse' : 'Expand'}>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
            </button>
          ) : <span className="w-5 shrink-0" />}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-slate-800 text-[13px] truncate">{node.name}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 text-[9.5px]
                               font-black uppercase tracking-wide">
                {node.level === 'sales_head' ? 'Head' : node.level.toUpperCase()}
              </span>
              {node.reports > 0 && (
                <span className="text-[10.5px] font-bold text-slate-400">
                  {node.reports} direct · {node.team} in team
                </span>
              )}
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${tone} siq-grow`}
                style={{ width: `${width}%` }} />
            </div>
            <div className="flex items-center gap-3 flex-wrap mt-1.5 text-[10.5px] text-slate-400 font-semibold">
              <span>{node.customers} customers</span>
              <span>{node.areas} areas</span>
              <span>{node.skus} SKUs</span>
              {node.field_officers > 0 && <span>{node.field_officers} field officers</span>}
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="font-black text-slate-800 tabular-nums">₹{shortInr(node.revenue)}</p>
            {node.achievement_pct !== null && node.achievement_pct !== undefined && (
              <p className={`text-[10.5px] font-black ${
                node.achievement_pct >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {node.achievement_pct.toFixed(0)}% of plan
              </p>
            )}
          </div>
        </div>
      </div>
      {open && kids.map((k: any) => (
        <OrgNode key={`${k.level}-${k.name}`} node={k} max={max} depth={depth + 1} />
      ))}
    </div>
  );
}


function StructureTab({ org, levels, setLevels }: {
  org: any; levels: string; setLevels: (v: string) => void;
}) {
  const SHAPES: { k: string; label: string }[] = [
    { k: 'sales_head,rsm,asm', label: 'Reporting line' },
    { k: 'zone,subzone,state', label: 'Region & Sub-Region' },
    { k: 'zone,rsm,asm', label: 'Zone → team' },
    { k: 'category,sub_category,brand', label: 'Product' },
    { k: 'channel,business_type,customer_name', label: 'Channel' },
  ];

  if (!org) {
    return <Panel title="Structure" icon={Users}><Empty msg="Loading the organisation…" /></Panel>;
  }
  const max = Math.max(1, ...(org.tree || []).map((n: any) => n.revenue));
  const counts = org.level_counts || [];

  return (
    <div className="space-y-5">
      <Reveal>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Break it down by
          </span>
          {SHAPES.map(sh => (
            <button key={sh.k} onClick={() => setLevels(sh.k)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all
                ${levels === sh.k
                  ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`}>
              {sh.label}
            </button>
          ))}
        </div>
      </Reveal>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {counts.filter((c: any) => c.count > 0).map((c: any, i: number) => (
          <Kpi key={c.level} icon={Users} label={c.level.replace('_', ' ')}
            value={c.count} accent="from-indigo-500 to-violet-600" delay={i * 60}
            sub="in the current selection" />
        ))}
        <Kpi icon={Users} label="Customers" value={org.totals?.customers || 0}
          accent="from-emerald-500 to-teal-600" delay={counts.length * 60}
          sub="covered" />
      </div>

      <Panel title="Who reports to whom" icon={Users}
        subtitle="Sales roll up into whoever they report to — click a row to open its team">
        {(org.tree || []).length ? (
          <div className="max-h-[560px] overflow-y-auto pr-1">
            {org.tree.map((n: any) => (
              <OrgNode key={`${n.level}-${n.name}`} node={n} max={max} />
            ))}
          </div>
        ) : <Empty msg="No reporting columns in your upload" />}
      </Panel>
    </div>
  );
}
