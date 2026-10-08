import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Area, BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceArea, ReferenceLine,
} from 'recharts';
import {
  Upload, Download, TrendingUp, Target, Users, Package, MapPin, Building2, Network, ChevronDown,
  Zap, RefreshCw, Trash2, AlertTriangle, CheckCircle2, Info,
  BarChart3, Globe2, ShoppingCart, Boxes, X, Filter, ArrowUpRight, ArrowDownRight,
  Activity, Layers, FileSpreadsheet, Trophy, Radar, Brain, UserSearch, CalendarDays,
  Eye,
} from 'lucide-react';
import {
  API, _API_BASE, inr, shortInr, colourFor, REVENUE_COLOUR,
  RAG, StatusPill, useCountUp, Counter, Reveal, Panel,
  Skel, Empty, NoData, ChartTip, Leaderboard, Coverage, sqFetch, canEdit,
  dimLabel,
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

/** The filename off Content-Disposition, if the server sent one. Handles
 *  both `filename="x.xlsx"` and the RFC 5987 `filename*=UTF-8''x.xlsx`. */
function serverFilename(res: Response): string {
  const cd = res.headers.get('Content-Disposition') || '';
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (star) { try { return decodeURIComponent(star[1]); } catch { /* fall through */ } }
  const plain = /filename="?([^";]+)"?/i.exec(cd);
  return plain ? plain[1].trim() : '';
}

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
  // The server's own name wins when it sends one. The endpoint changed from
  // CSV to XLSX and this side kept saving it as .csv, so Excel refused to
  // open it -- "the file format and extension don't match". The caller's
  // name is the fallback, not the authority.
  a.download = serverFilename(res) || filename;
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
/** A short bulleted list. The forecast explanations were paragraphs, which
 *  is the one shape nobody can scan while being asked a question about the
 *  number beside them. Accepts a string too, so an older response that still
 *  sends prose renders as a single point rather than as nothing. */
function Bullets({ items, className = '' }:
  { items?: string[] | string; className?: string }) {
  const list = Array.isArray(items) ? items : items ? [items] : [];
  if (!list.length) return null;
  return (
    <ul className={`space-y-1 ${className}`}>
      {list.map((t, i) => (
        <li key={i} className="text-[12px] text-slate-600 leading-relaxed flex gap-2">
          <span className="text-indigo-400 font-black leading-[1.35]">·</span>
          <span className="min-w-0">{t}</span>
        </li>
      ))}
    </ul>
  );
}


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
/** Dropdown options with the coded entries kept together.

 *  The Region list is a mix of two things: nine-odd territory codes
 *  (GTR01 … GTR09, some split A/B) and a handful of named businesses
 *  (E-COM, Govt. Bus., MT). Sorted as plain text they interleave — the
 *  named ones land either side of the codes, so "Govt. Bus." sits above
 *  GTR01 and "MT" below GTR09, and a reader scanning for one of the three
 *  names has to look in two places with nine rows in between.
 *
 *  Codes first, because there are far more of them and they are what gets
 *  picked; names after, as their own block. Within the codes a plain sort
 *  is already right — they are zero-padded, so GTR03 A precedes GTR03 B
 *  precedes GTR04 A. */
const CODE_LIKE = /^[A-Z]{2,}\s?\d/;

export const groupedOptions = (vals: string[] = []): string[] => {
  const codes = vals.filter(v => CODE_LIKE.test(String(v).trim().toUpperCase()));
  const named = vals.filter(v => !CODE_LIKE.test(String(v).trim().toUpperCase()));
  const by = (a: string, b: string) => String(a).localeCompare(String(b), 'en');
  return [...codes.sort(by), ...named.sort(by)];
};


const PIE_LABEL_MIN_PCT = 4;
const pieLabel = (e: any) =>
  (e.share_pct ?? 0) >= PIE_LABEL_MIN_PCT ? `${e.name} ${e.share_pct}%` : '';

export function SalesIQPage(_props: { onNavigateBack?: () => void } = {}) {
  // Auth gate. Session is read once on mount; loadSession() also enforces the
  // 12-hour expiry, so a stale localStorage entry can't grant access.
  const [session, setSession] = useState(() => loadSession());

  const [tab, setTab] = useState<Tab>('overview');
  const [filterList, setFilterList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [trend, setTrend] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [breaks, setBreaks] = useState<Record<string, any>>({});
  const [org, setOrg] = useState<any>(null);
  const [orgLevels, setOrgLevels] = useState('sales_head,rsm,asm');
  const [filterOpts, setFilterOpts] = useState<any>(null);
  const [uploads, setUploads] = useState<any>(null);
  const [review, setReview] = useState<any>(null);
  const [recipients, setRecipients] = useState<any>(null);
  const [uploaders, setUploaders] = useState<any>(null);
  const [intel, setIntel] = useState<any>({});
  const [cust, setCust] = useState<any>({});
  const [intelDim, setIntelDim] = useState('state');
  const [err, setErr] = useState('');

  // The server can end a session before its 12 hours are up — a restart
  // clears the cache it lives in. sqFetch raises this on the first 401 so
  // the page returns to the login instead of showing a wall of dead panels.
  //
  // Declared below the state it resets, not above it. Up there the handler
  // closed over setters still in their temporal dead zone when it was
  // created; it happened to work, because nothing can fire the event until
  // the component body has finished running, and that is too fine a thread
  // to hang a sign-out on.
  useEffect(() => {
    const out = () => {
      setSession(null);
      // Drop what the old session fetched. Without this, signing back in as
      // somebody else showed the previous person’s figures until the first
      // request returned.
      setOverview(null); setTrend(null); setForecast(null);
      setBreaks({}); setOrg(null); setErr('');
    };
    window.addEventListener('salesiq-signed-out', out);
    return () => window.removeEventListener('salesiq-signed-out', out);
  }, []);

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
  const [span, setSpan] = useState<'fy' | 'months'>('months');
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

  /* ── what each tab actually needs ───────────────────────────────────────

     This was one Promise.all of THIRTY-NINE requests, fired again in full on
     every filter change, every tab switch, and every click of the forecast's
     3M/6M buttons. Three things made that slow, and they compounded:

       * A browser opens about six connections to one origin, so thirty-nine
         requests queue into roughly seven rounds.
       * Promise.all resolves on the slowest of them, so nothing at all
         appeared until the last of the thirty-nine came back -- the Overview
         waited on the customer cohort analysis it does not show.
       * Changing the forecast horizon re-fetched the org tree, every
         breakdown and the whole of Intelligence, none of which can change
         when you ask for three months instead of six.

     Now: the overview call alone is the core, because `has_data` gates every
     tab on it, and each tab fetches its own panels the first time it is
     opened under a given set of filters. Opening the dashboard goes from
     thirty-nine requests to seven; switching to Forecast asks for one; and
     changing the horizon asks for that one again rather than for everything.

     Results are kept per tab and per query, so going back to a tab you have
     already looked at under the same filters costs nothing. */
  /* Which tab is really on screen. 'data' is the only conditional one --
     it is not offered to a reader who cannot upload -- so a stored tab of
     'data' falls back to the overview. Computed here rather than below the
     TABS array, because the loaders key their caching off it. */
  const activeTab: Tab = (tab === 'data' && !canEdit()) ? 'overview' : tab;

  const TAB_DIMS: Record<string, string[]> = {
    overview:  ['state', 'channel', 'category'],
    geography: ['state', 'zone', 'area', 'subzone', 'district', 'location', 'customer'],
    products:  ['category', 'product', 'sku', 'channel', 'variant', 'prod_group',
                'business_type', 'warehouse_type'],
    team:      ['salesperson', 'asm', 'rsm', 'sales_head'],
  };

  const get = useCallback(async (path: string) => {
    const q = qs();
    const r = await sqFetch(`/${path}${path.includes('?') ? '&' : '?'}${q}`);
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Failed: ${path}`);
    return r.json();
  }, [qs]);

  /* The filter dropdowns describe what is LOADED, not what is selected, so
     they do not change when a filter does. Fetched once rather than on every
     one of the thirty-nine rounds. */
  useEffect(() => {
    if (!session) return;
    sqFetch('/filters/').then(r => r.json()).then(setFilterOpts).catch(() => {});
  }, [session]);

  const loadCore = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      setOverview(await get('overview/'));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally { setLoading(false); }
  }, [get]);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    loadCore();
  }, [loadCore, session]);

  /* Which slice of a tab's data is already in hand. Keyed by the query plus
     whichever control belongs to that tab, so changing the horizon marks the
     forecast stale and leaves everything else alone. */
  const loadedRef = useRef<Record<string, string>>({});
  const [tabBusy, setTabBusy] = useState(false);

  const tabKey = useCallback((t: Tab) => [
    qs(),
    t === 'forecast' ? horizon : '',
    t === 'intelligence' ? intelDim : '',
    t === 'structure' ? orgLevels : '',
  ].join('|'), [qs, horizon, intelDim, orgLevels]);

  const loadTab = useCallback(async (t: Tab) => {
    const dims = TAB_DIMS[t] || [];
    const bd = dims.map(d => get(`breakdown/?dim=${d}&limit=12`));
    try {
      if (t === 'overview') {
        const [tr, ...bs] = await Promise.all([
          get('trend/'), ...bd]);
        setTrend(tr);
        setBreaks(b => ({ ...b, ...Object.fromEntries(dims.map((d, i) => [d, bs[i]])) }));
      } else if (t === 'intelligence') {
        const [pareto, matrix, movers, anomalies, seasonality, heatmap, pacing, price] =
          await Promise.all([
            get(`pareto/?dim=${intelDim}`), get(`matrix/?dim=${intelDim}`),
            get(`movers/?dim=${intelDim}`), get('anomalies/'), get('seasonality/'),
            get(`heatmap/?dim=${intelDim}`), get('pacing/'), get('price/')]);
        setIntel({ pareto, matrix, movers, anomalies, seasonality, heatmap, pacing, price });
      } else if (t === 'customers') {
        const [rfm, cohorts, newRepeat, paretoCustomer] = await Promise.all([
          get('rfm/'), get('cohorts/'), get('new-repeat/'), get('pareto/?dim=customer')]);
        setCust({ rfm, cohorts, newRepeat, paretoCustomer });
      } else if (t === 'structure') {
        setOrg(await get(`org/?levels=${orgLevels}`));
      } else if (t === 'forecast') {
        setForecast(await get(`forecast/?periods=${horizon}`));
      } else if (t === 'data') {
        /* The review sheet is loaded here rather than with the dashboard:
           nothing on the dashboard reads it, by design. */
        const [up, rev, rcp, upl] = await Promise.all([
          sqFetch('/uploads/').then(r => r.json()),
          sqFetch('/review/').then(r => r.json()).catch(() => null),
          sqFetch('/recipients/').then(r => r.json()).catch(() => null),
          sqFetch('/uploaders/').then(r => r.json()).catch(() => null),
        ]);
        setUploads(up); setReview(rev); setRecipients(rcp); setUploaders(upl);
      } else if (dims.length) {
        const bs = await Promise.all(bd);
        setBreaks(b => ({ ...b, ...Object.fromEntries(dims.map((d, i) => [d, bs[i]])) }));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load this tab');
    }
  }, [get, intelDim, orgLevels, horizon]);

  /* A filter change invalidates every tab, not just the one on screen --
     otherwise going back to Geography after narrowing to one region would
     show the figures for the whole country and look perfectly convincing.

     Declared BEFORE the fetch below, because effects run in source order:
     after it, this wiped the entry the fetch had just recorded, and every
     tab was then refetched once more on the way back to it. */
  useEffect(() => { loadedRef.current = {}; }, [qs]);

  useEffect(() => {
    if (!session) return;
    const key = tabKey(activeTab);
    if (loadedRef.current[activeTab] === key) return;
    loadedRef.current[activeTab] = key;
    setTabBusy(true);
    loadTab(activeTab).finally(() => setTabBusy(false));
  }, [session, activeTab, tabKey, loadTab]);

  /* An explicit refresh, and what runs after an upload. Everything is stale
     then, including the filter dropdowns -- a new file can introduce a region
     or a brand the lists have never seen. */
  const loadAll = useCallback(() => {
    loadedRef.current = {};
    sqFetch('/filters/').then(r => r.json()).then(setFilterOpts).catch(() => {});
    loadCore();
    return loadTab(activeTab);
  }, [loadCore, loadTab, activeTab]);


  /* The month pair opens already filled with the financial year to date.
     Empty, it read as a control nobody had used — "From…" / "To…" beside
     figures that were in fact the year to date, because the server applies
     that window when none is given. Same numbers either way; the difference
     is that the screen now states the window it is showing instead of
     leaving it to be assumed.

     Taken from the window the SERVER reports rather than worked out here, so
     the pair cannot disagree with the figures beside it, and clamped to the
     months the files actually hold so neither box lands on an option that is
     not in its own list. Once only — the reader's own choice must not be
     overwritten by the next response. */
  const pickedWindow = useRef(false);
  useEffect(() => {
    if (pickedWindow.current || mFrom || mTo) return;
    const w = overview?.filters?.window;
    const all: string[] = [...(filterOpts?.months || [])].sort();
    if (!w?.from || !w?.to || !all.length) return;
    pickedWindow.current = true;
    const lo = String(w.from).slice(0, 7), hi = String(w.to).slice(0, 7);
    setMFrom(all.find(m => m >= lo) || all[0]);
    setMTo([...all].reverse().find(m => m <= hi) || all[all.length - 1]);
  }, [overview, filterOpts, mFrom, mTo]);

  const hasData = overview?.has_data;

  /* Whether the tab on screen has its own panels yet.
     A tab now fetches when it is opened, so for a moment it has none -- and
     its panels say things like "No state column in your upload", which is a
     statement about the FILE and is simply false while a request is still in
     flight. Skeletons are shown instead until the first answer lands; after
     that a refetch leaves the old figures up rather than blanking the page. */
  const tabHasData: boolean = ({
    overview: !!trend, intelligence: !!intel?.pareto, customers: !!cust?.rfm,
    geography: !!breaks.state, products: !!breaks.category,
    team: !!breaks.salesperson, structure: !!org, forecast: !!forecast,
    data: !!uploads,
  } as Record<string, boolean>)[activeTab] ?? true;
  const busyFirstLoad = tabBusy && !tabHasData;
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

  /* merged history + forecast for the projection chart.

     Four lines, and they answer different questions, so none of them is
     derived from another: actual is what was invoiced, AOP is what the
     business committed to, forecast is what the model expects, and the low
     and high are how wrong the model has been on months it has already
     seen. The AOP runs the whole way across -- the plan is loaded for the
     full financial year, so it is known for months the history has not
     reached yet, and the distance between it and the forecast is the thing
     the panel exists to show. */
  const fcChart = useMemo(() => {
    if (!forecast) return [];
    const hist = (forecast.history || []).map((h: any) => ({
      label: h.label, actual: h.value, aop: h.aop ?? null,
      forecast: null, lower: null, upper: null, projected: false,
    }));
    // Bridge point: repeat the last actual as the forecast's origin so the two
    // lines visually connect instead of leaving a gap at the seam.
    const bridge = hist.length ? [{ ...hist[hist.length - 1], forecast: hist[hist.length - 1].actual }] : [];
    const fut = (forecast.points || []).map((p: any) => ({
      label: p.label || new Date(p.period).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      actual: null, forecast: p.value, lower: p.lower, upper: p.upper,
      aop: p.aop ?? null,
      // The band is drawn as a stacked pair rather than two overlapping
      // areas: a base that is invisible up to `lower`, and a fill of the
      // height between the two. Overlapping areas had to paint the lower one
      // white, which punched a hole through the gridlines and the AOP bars
      // underneath it.
      bandBase: p.lower,
      bandSpan: Math.max(0, p.upper - p.lower),
      projected: true,
    }));
    return [...hist.slice(0, -1), ...bridge, ...fut];
  }, [forecast]);

  /* Where fact stops and projection starts, for the divider and the shaded
     half. The bridge month is the last real one, so it carries the line. */
  const fcSeam = useMemo(() => {
    const first = fcChart.findIndex((d: any) => d.projected);
    return {
      at: first > 0 ? fcChart[first - 1].label : null,
      from: first >= 0 ? fcChart[first].label : null,
      to: fcChart.length ? fcChart[fcChart.length - 1].label : null,
    };
  }, [fcChart]);

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
              {/* Spins for a tab's own fetch as well as for the core one.
                  A tab now loads its panels when it is opened, so without
                  this the only sign anything was happening was the panels
                  themselves changing a moment later. */}
              <RefreshCw className={`w-3.5 h-3.5 ${loading || tabBusy ? 'animate-spin' : ''}`} />Refresh
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
              {/* Channel, then Region, then Sub-Region, then Category — the
                  order the business narrows in, rather than the order the
                  columns happen to sit in on the sheet. Sub-Region follows
                  Region because it sits inside it. */}
              {(['channel', 'zone', 'subzone', 'category', 'salesperson'] as const).map(k => (
                (filterOpts[k] || []).length > 0 && (
                  <select key={k} value=""
                    onChange={e => e.target.value && toggle(k, e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold
                               text-slate-600 bg-white max-w-[150px]">
                    <option value="">{dimLabel(k)}</option>
                    {groupedOptions(filterOpts[k]).map((v: string) =>
                      <option key={v} value={v}>{v}</option>)}
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

        {/* When these figures were last loaded.
            Every number on this dashboard is as old as the last upload, and
            without saying so the screen looks live when it may be a
            fortnight stale. This product is uploaded to rather than
            connected to a feed, so the upload time IS the refresh time. */}
        {!loading && hasData && overview?.data_refreshed?.at && (
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-4">
            <RefreshCw className="w-3 h-3" />
            Data refreshed {new Date(overview.data_refreshed.at).toLocaleString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
            {overview.data_refreshed.file && <> · {overview.data_refreshed.file}</>}
            {overview.data_refreshed.uploads > 1 &&
              <> · {overview.data_refreshed.uploads} files loaded</>}
          </p>
        )}

        {/* A filter the invoice file has no column for.

            The review sheet carries CHANEL TYPE; the dump's export does not,
            so every invoice row holds a blank channel. Filter to GT and the
            money narrows correctly off the sheet while customers, SKUs,
            categories, cities and order sizes all empty — and an empty panel
            reads as "nothing sold in GT", which is false. The dashboard says
            which filter did it, because the remedy is a column in an export
            rather than anything on this screen. */}
        {!loading && hasData && (overview?.filters_blind_to_invoices?.length > 0) && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl bg-amber-50
                          border-2 border-amber-300 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[13px] font-black text-amber-900">
                The invoice file has no
                {' '}{overview.filters_blind_to_invoices.map(dimLabel).join(' or ')}
                {' '}column, so it cannot be narrowed by it.
              </p>
              <p className="text-[11.5px] text-amber-700 font-semibold mt-0.5">
                Revenue and AOP are correct for this selection — they come off the
                review sheet, which does carry it. Anything counted off invoices —
                customers, SKUs, categories, orders, quantity — is empty here because
                the file cannot answer the question, not because nothing sold. Add the
                column to the export and these fill in.
              </p>
            </div>
          </div>
        )}

        {/* ── loading ── */}
        {(loading || busyFirstLoad) && (
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
        {!loading && !busyFirstLoad && hasData && activeTab === 'overview' && (
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

                Every figure on this strip is drawn from ONE comparison: the
                months that carry both a plan and a result. It previously
                carried three. The percentage was like-for-like, the gap
                beneath it was the window's full revenue less the window's
                full plan, and the bar was a third ratio again -- so the strip
                read "79% of AOP" above a bar sitting at a third, beside
                "behind by Rs 212.73 Cr". All three were arithmetically
                correct and no two were answering the same question.

                The AOP shown is therefore the plan for the months that have
                results, not for the whole window. The full-window plan is
                still here, underneath, where it informs without being
                mistaken for the denominator of the percentage above it. */}
            {(() => {
              const basis = overview.achievement_basis || {};
              const windowPlan = Number(overview.target || 0);
              const tgt = Number(basis.target || 0);
              const rev = Number(basis.revenue ?? overview.revenue ?? 0);
              const pct = overview.achievement_pct;
              // From the server, which computes it off the same basis.
              const gap = Number(overview.gap_to_target ?? (tgt - rev));
              const ahead = gap <= 0;
              // The bar IS the percentage. Clamped, so 140% of plan does not
              // render as a bar running off the end of its own track.
              const fill = pct === null || pct === undefined
                ? 0 : Math.max(0, Math.min(100, pct));
              const growth = overview.vs_last_year?.growth_pct
                           ?? overview.revenue_growth_pct;
              const months = basis.months || 0;
              const cell = 'px-5 py-5 sm:px-6';
              return (
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm
                                overflow-hidden siq-reveal">
                  {/* Three cells rather than two. The pair left half the
                      strip empty on a wide screen, and the thing a review
                      actually asks -- how far off are we -- was relegated to
                      a caption under the bar. */}
                  <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x
                                  divide-slate-100">
                    <div className={cell}>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-500
                                         to-emerald-600 grid place-items-center shrink-0">
                          <TrendingUp className="w-3.5 h-3.5 text-white" />
                        </span>
                        <span className="text-[10.5px] font-black tracking-[0.1em]
                                         text-slate-400 uppercase">Revenue (Sales)</span>
                        {growth !== null && growth !== undefined && (
                          <span className={`ml-auto px-2 py-0.5 rounded-full text-[10.5px] font-black
                            ${growth >= 0 ? 'bg-emerald-50 text-emerald-600'
                                          : 'bg-rose-50 text-rose-600'}`}>
                            {growth >= 0 ? '+' : ''}{growth}%
                          </span>
                        )}
                      </div>
                      <p className="mt-2.5 text-[30px] sm:text-[34px] leading-none font-black
                                    text-slate-900 tabular-nums">
                        ₹{shortInr(rev)}
                      </p>
                      <p className="mt-1.5 text-[11.5px] font-semibold text-slate-500">
                        {/* The GROWTH is kept and last year's rupees are not.
                            The percentage is arithmetic done on data the floor
                            keeps off the screen — which is what that data is
                            loaded for — while printing the figure itself put
                            last year back on the page by another route. */}
                        {overview.vs_last_year
                          ? `on the same ${overview.vs_last_year.months} months last year`
                          : overview.prev_period_has_data
                            ? 'against the period before this'
                            : 'nothing loaded for the period before this'}
                      </p>
                    </div>

                    <div className={cell}>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400
                                         to-orange-500 grid place-items-center shrink-0">
                          <Target className="w-3.5 h-3.5 text-white" />
                        </span>
                        <span className="text-[10.5px] font-black tracking-[0.1em]
                                         text-slate-400 uppercase">AOP</span>
                        <span className="text-[10px] font-semibold text-slate-300 normal-case">
                          Annual Operating Plan
                        </span>
                      </div>
                      <p className="mt-2.5 text-[30px] sm:text-[34px] leading-none font-black
                                    text-slate-900 tabular-nums">
                        {tgt ? `₹${shortInr(tgt)}` : '—'}
                      </p>
                      <p className="mt-1.5 text-[11.5px] font-semibold text-slate-500">
                        {tgt
                          ? `for the ${months} month${months === 1 ? '' : 's'} with results in`
                          : 'no AOP set for this window'}
                        {windowPlan > tgt &&
                          ` · ₹${shortInr(windowPlan)} across the full window`}
                      </p>
                    </div>

                    <div className={cell}>
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg grid place-items-center shrink-0
                          ${ahead ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                  : 'bg-gradient-to-br from-rose-400 to-rose-600'}`}>
                          {ahead ? <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                                 : <ArrowDownRight className="w-3.5 h-3.5 text-white" />}
                        </span>
                        <span className="text-[10.5px] font-black tracking-[0.1em]
                                         text-slate-400 uppercase">
                          {ahead ? 'Ahead by' : 'Behind by'}
                        </span>
                      </div>
                      <p className={`mt-2.5 text-[30px] sm:text-[34px] leading-none font-black
                                     tabular-nums ${ahead ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tgt ? `₹${shortInr(Math.abs(gap))}` : '—'}
                      </p>
                      <p className="mt-1.5 text-[11.5px] font-semibold text-slate-500">
                        {tgt ? 'against the plan for those same months'
                             : 'nothing to measure against'}
                      </p>
                    </div>
                  </div>

                  {tgt > 0 && (
                    <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/70">
                      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                        <p className="text-[13px] font-black text-slate-700 flex items-center gap-2">
                          {pct !== null && pct !== undefined ? `${pct}% of AOP` : 'Against AOP'}
                          <StatusPill status={overview.status?.status}>
                            {overview.status?.label}
                          </StatusPill>
                        </p>
                        <p className="text-[11px] font-semibold text-slate-400">
                          {overview.status?.meaning}
                        </p>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
                        <div className={`h-full rounded-full transition-[width] duration-700
                          ${ahead ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                  : 'bg-gradient-to-r from-rose-400 to-rose-600'}`}
                          style={{ width: `${fill}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Pace. The control tower blueprint's run rate and required
                run rate — what the business has been doing per month, and
                what the months still ahead each have to do to land the AOP.

                Per MONTH, not per working day as the blueprint asks. The
                review sheet is the only file carrying the plan and it has no
                days in it: every row is a month, stored on the 1st. A daily
                rate off it would be a monthly figure divided by a number of
                days nobody measured. */}
            {overview.run_rate && overview.required_run_rate && (
              <Reveal>
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm
                                p-5 sm:p-6">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
                    <p className="text-[13px] font-black text-slate-700">Pace against the AOP</p>
                    <p className="text-[11px] font-semibold text-slate-400">
                      per month — the plan file has no days in it
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Running at
                      </p>
                      <p className="mt-1 text-[26px] leading-none font-black text-slate-900 tabular-nums">
                        ₹{shortInr(overview.run_rate)}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        a month, over {overview.run_rate_basis?.months_elapsed} month
                        {overview.run_rate_basis?.months_elapsed === 1 ? '' : 's'} so far
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Needs
                      </p>
                      <p className="mt-1 text-[26px] leading-none font-black text-amber-600 tabular-nums">
                        ₹{shortInr(overview.required_run_rate)}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        a month, for the {overview.run_rate_basis?.months_ahead} month
                        {overview.run_rate_basis?.months_ahead === 1 ? '' : 's'} still to come
                      </p>
                      {/* The two numbers it is made of. "Needs X a month" is
                          a figure somebody will be challenged on in a review,
                          and it should not have to be taken on trust. */}
                      {overview.run_rate_basis?.full_plan > 0 && (
                        <p className="mt-1 text-[10.5px] text-slate-400 leading-relaxed">
                          ₹{shortInr(overview.run_rate_basis.still_owed)} still owed on a
                          ₹{shortInr(overview.run_rate_basis.full_plan)} plan — the months
                          left, plus what the year is already behind.
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Which means
                      </p>
                      {overview.run_rate_basis?.lift_needed_pct !== null &&
                       overview.run_rate_basis?.lift_needed_pct !== undefined ? (
                        <>
                          <p className={`mt-1 text-[26px] leading-none font-black tabular-nums
                            ${overview.run_rate_basis.lift_needed_pct > 0
                                ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {overview.run_rate_basis.lift_needed_pct > 0 ? '+' : ''}
                            {overview.run_rate_basis.lift_needed_pct}%
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">
                            {overview.run_rate_basis.already_ahead
                              ? 'the plan is already covered at the current pace'
                              : overview.run_rate_basis.lift_needed_pct > 0
                                ? 'faster than the current pace, to land the plan in full'
                                : 'the current pace already clears what is left'}
                          </p>
                        </>
                      ) : (
                        <p className="mt-1 text-[12px] font-semibold text-slate-400">
                          nothing left in the plan for this window
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Reveal>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <Panel title="Revenue trend" subtitle="Monthly sales against AOP" icon={Activity}
                delay={340} className="xl:col-span-2">
                {trend?.results?.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={trend.results}>
                      <defs>
                        {/* Teal for invoiced sales and amber for the AOP,
                            the same two roles the forecast chart uses, so the
                            colours mean one thing across the dashboard. */}
                        <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0d9488" stopOpacity={0.32} />
                          <stop offset="100%" stopColor="#0d9488" stopOpacity={0.01} />
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
                      <Area type="monotone" dataKey="revenue" name="Revenue (Sales)" stroke="#0d9488" strokeWidth={2.5}
                        fill="url(#gRev)" animationDuration={1100} connectNulls={false} />
                      <Line type="monotone" dataKey="target" name="AOP" stroke="#f59e0b" strokeWidth={2}
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
              <Panel title="AOP achievement"
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
                  ) : <Empty msg="Add an AOP column to your upload to see achievement" />}
                </div>
              </Panel>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Panel title="Top states" icon={MapPin} delay={520} right={<Coverage coverage={breaks.state?.coverage} />}>
                {breaks.state?.results?.length ? <Leaderboard rows={breaks.state.results.slice(0, 7)} showTarget />
                  : <NoData empty={breaks.state?.empty} label={dimLabel}
                    fallback="No state data" />}
              </Panel>
              <Panel title="Top categories" icon={Package} delay={560} right={<Coverage coverage={breaks.category?.coverage} />}>
                {breaks.category?.results?.length ? <Leaderboard rows={breaks.category.results.slice(0, 7)} />
                  : <NoData empty={breaks.category?.empty} label={dimLabel}
                    fallback="No category data" />}
              </Panel>
              <Panel title="Channel mix" icon={ShoppingCart} delay={600}>
                {breaks.channel?.results?.length ? (
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie data={breaks.channel.results} dataKey="revenue" nameKey="name"
                        innerRadius={52} outerRadius={90} paddingAngle={3} animationDuration={1000}>
                        {breaks.channel.results.map((r: any, i: number) => (
                          <Cell key={i} fill={colourFor(r.name)} stroke="#fff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <NoData empty={breaks.channel?.empty} label={dimLabel}
                    fallback="No channel data" />}
              </Panel>
            </div>
          </div>
        )}

        {/* The year-on-year chart lived here. It plotted FY25-26 as its
            second series, which is last year on screen -- the one thing
            the display floor exists to prevent. Last year is still loaded
            and still does its job: the growth figure in the headline band
            is computed from it, which is the backend work it is for.
            Bringing the chart back means lifting the floor for it alone,
            which is a decision rather than an oversight. */}

        {!loading && !busyFirstLoad && hasData && activeTab === 'intelligence' && (
          <IntelligencePanel data={intel} dim={intelDim} setDim={setIntelDim} />
        )}

        {/* ══ CUSTOMERS ══ */}
        {!loading && !busyFirstLoad && hasData && activeTab === 'customers' && <CustomersPanel data={cust} />}

        {/* ══ GEOGRAPHY ══ */}
        {!loading && !busyFirstLoad && hasData && activeTab === 'geography' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <Panel title="Revenue by state" icon={MapPin} subtitle="Ranked by contribution" delay={0} right={<Coverage coverage={breaks.state?.coverage} />}>
              {breaks.state?.results?.length ? (
                <ResponsiveContainer width="100%" height={Math.max(280, breaks.state.results.length * 34)}>
                  <BarChart data={breaks.state.results} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tickFormatter={shortInr} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: '#f8fafc' }} />
                    {/* One colour. Ten hues down a ranked list encoded
                        nothing — length is the measure here — and they
                        reshuffled every time a filter reordered the rows. */}
                    <Bar dataKey="revenue" name="Revenue (Sales)" radius={[0, 6, 6, 0]}
                      fill={REVENUE_COLOUR} animationDuration={1000} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <NoData empty={breaks.state?.empty} label={dimLabel}
                    fallback="No state column in your upload" />}
            </Panel>
            <Panel title="Zone performance" icon={Globe2} delay={60} right={<Coverage coverage={breaks.zone?.coverage} />}>
              {breaks.zone?.results?.length ? <Leaderboard rows={breaks.zone.results} showTarget />
                : <NoData empty={breaks.zone?.empty} label={dimLabel}
                    fallback="No zone column in your upload" />}
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
                : <NoData empty={breaks.customer?.empty} label={dimLabel}
                    fallback="No customer column in your upload" />}
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
        {!loading && !busyFirstLoad && hasData && activeTab === 'products' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <Panel title="Category contribution" icon={Package} delay={0} right={<Coverage coverage={breaks.category?.coverage} />}>
              {breaks.category?.results?.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={breaks.category.results} dataKey="revenue" nameKey="name"
                      innerRadius={60} outerRadius={105} paddingAngle={3} animationDuration={1000}
                      label={pieLabel} labelLine={false}>
                      {breaks.category.results.map((r: any, i: number) => (
                        <Cell key={i} fill={colourFor(r.name)} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <NoData empty={breaks.category?.empty} label={dimLabel}
                    fallback="No category column in your upload" />}
            </Panel>
            <Panel title="Top products" icon={Boxes} subtitle="By revenue" delay={60}>
              {breaks.product?.results?.length ? <Leaderboard rows={breaks.product.results.slice(0, 12)} />
                : <NoData empty={breaks.product?.empty} label={dimLabel}
                    fallback="No product column in your upload" />}
            </Panel>
            <Panel title="Top SKUs" icon={Layers} delay={120}>
              {breaks.sku?.results?.length ? <Leaderboard rows={breaks.sku.results.slice(0, 12)} />
                : <NoData empty={breaks.sku?.empty} label={dimLabel}
                    fallback="No SKU column in your upload" />}
            </Panel>
            <Panel title="Channel split" icon={ShoppingCart} delay={180}>
              {breaks.channel?.results?.length ? <Leaderboard rows={breaks.channel.results} showTarget />
                : <NoData empty={breaks.channel?.empty} label={dimLabel}
                    fallback="No channel column in your upload" />}
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
        {!loading && !busyFirstLoad && hasData && activeTab === 'team' && (
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
        {!loading && !busyFirstLoad && hasData && activeTab === 'structure' && (
          <StructureTab org={org} levels={orgLevels} setLevels={setOrgLevels} />
        )}

        {!loading && !busyFirstLoad && hasData && activeTab === 'forecast' && forecast && (
          <div className="space-y-5">
            {/* Four figures, each of which somebody can be asked to account
                for: what we expect, what we promised, and the rate that
                expectation is built on. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Kpi icon={Radar} label={`Next ${horizon} months`} value={forecast.forecast_total || 0}
                prefix="₹" accent="from-violet-500 to-fuchsia-600" delay={0}
                sub="projected revenue (sales)" />
              {forecast.vs_aop ? (
                <Kpi icon={Target} label="vs AOP" value={forecast.vs_aop.aop_total}
                  prefix="₹" delta={forecast.vs_aop.cover_pct !== null
                                      ? Math.round(forecast.vs_aop.cover_pct - 100) : undefined}
                  accent="from-emerald-500 to-teal-600" delay={60}
                  sub={`plan for ${forecast.vs_aop.from}–${forecast.vs_aop.to}`} />
              ) : (
                <Kpi icon={TrendingUp} label="vs recent" value={forecast.vs_recent?.projected_total || 0}
                  prefix="₹" delta={forecast.vs_recent?.change_pct}
                  accent="from-indigo-500 to-blue-600" delay={60}
                  sub={`vs ₹${shortInr(forecast.vs_recent?.recent_total || 0)} last ${forecast.vs_recent?.months || 0}m`} />
              )}
              {forecast.run_rate ? (
                <Kpi icon={Activity} label="Running at" value={forecast.run_rate.rate_pct}
                  format={(n) => `${n.toFixed(1)}%`} accent="from-cyan-500 to-teal-600" delay={120}
                  sub={`of AOP, over ${forecast.run_rate.months} months`} />
              ) : (
                <Kpi icon={Activity} label="Fitted on" value={forecast.history_months} format={inr}
                  accent="from-cyan-500 to-teal-600" delay={120} sub="months of actual sales" />
              )}
              {/* "Past error 44.5%" was here: the mean absolute percentage
                  error, which is how far the model missed on months it had
                  already seen. It is a modelling statistic, not a business
                  one, and on its own it alarms without informing. What it
                  is actually for is sizing the high and low lines, and it
                  is explained in those terms in the band note below, where
                  it has something to be read against. */}
            </div>

            {forecast.vs_aop && (
              <Reveal>
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-5 sm:p-6">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <p className="text-[13px] font-black text-slate-700">
                      {forecast.vs_aop.from} to {forecast.vs_aop.to} — forecast against AOP
                    </p>
                    <p className={`text-[13px] font-black tabular-nums
                      ${forecast.vs_aop.gap >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {forecast.vs_aop.gap >= 0 ? 'ahead by ' : 'short by '}
                      ₹{shortInr(Math.abs(forecast.vs_aop.gap))}
                    </p>
                  </div>
                  <div className="mt-2.5 h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
                    <div className={`h-full rounded-full transition-[width] duration-700
                      ${forecast.vs_aop.gap >= 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                                 : 'bg-gradient-to-r from-amber-500 to-rose-500'}`}
                      style={{ width: `${Math.max(0, Math.min(100, forecast.vs_aop.cover_pct || 0))}%` }} />
                  </div>
                  <p className="mt-2.5 text-[11px] font-semibold text-slate-500">
                    ₹{shortInr(forecast.vs_aop.forecast_total)} projected against an AOP of
                    {' '}₹{shortInr(forecast.vs_aop.aop_total)}
                    {forecast.vs_aop.cover_pct !== null && ` — ${forecast.vs_aop.cover_pct}% of plan`}.
                    {forecast.vs_aop.partial &&
                      ` Totalled over the ${forecast.vs_aop.months} month${forecast.vs_aop.months === 1 ? '' : 's'} the plan reaches, not the full ${horizon}: the AOP runs out before the forecast does.`}
                  </p>
                </div>
              </Reveal>
            )}

            {forecast.window_note && (
              <Reveal>
                <div className="flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <CalendarDays className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-slate-500 leading-relaxed">{forecast.window_note}</p>
                </div>
              </Reveal>
            )}

            {/* The run rate is what the forecast's LEVEL is made of, so it
                is shown with the months it was read from and the best and
                worst of them. A percentage nobody can check is not usable in
                a review. */}
            {forecast.run_rate && (
              <Panel title="The rate this is built on" icon={TrendingUp} delay={220}
                subtitle={`Achievement against AOP across ${forecast.run_rate.months} months that have both figures`}>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <p className="text-[32px] leading-none font-black text-slate-900 tabular-nums">
                    {forecast.run_rate.rate_pct}%
                  </p>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-slate-500">
                      of AOP, recent months weighted heaviest
                    </p>
                    <p className="text-[12px] font-semibold text-slate-500">
                      High and low: {forecast.run_rate.low_pct}% to
                      {' '}{forecast.run_rate.high_pct}% of plan
                      {forecast.run_rate.capped && (
                        <span className="ml-1.5 text-[11px] font-bold text-amber-600">
                          — held at the widest the band is allowed to be
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-end gap-1.5 overflow-x-auto pb-1">
                  {(forecast.run_rate.by_month || []).map((m: any) => (
                    <div key={m.month} className="flex flex-col items-center gap-1 min-w-[56px]">
                      <span className="text-[10px] font-black text-slate-500 tabular-nums">{m.pct}%</span>
                      <div className="w-full h-16 flex items-end">
                        <div className={`w-full rounded-t-md ${
                          m.pct >= 100 ? 'bg-emerald-400' : m.pct >= 80 ? 'bg-amber-400' : 'bg-rose-400'}`}
                          style={{ height: `${Math.max(4, Math.min(100, m.pct))}%` }} />
                      </div>
                      <span className="text-[9.5px] font-bold text-slate-400 whitespace-nowrap">{m.month}</span>
                    </div>
                  ))}
                </div>
                <ul className="mt-3 space-y-1">
                  <li className="text-[11px] text-slate-400 leading-relaxed">
                    Best month: {forecast.run_rate.best.month} at {forecast.run_rate.best.pct}% of plan.
                  </li>
                  <li className="text-[11px] text-slate-400 leading-relaxed">
                    Worst month: {forecast.run_rate.worst.month} at {forecast.run_rate.worst.pct}%.
                  </li>
                  <li className="text-[11px] text-slate-400 leading-relaxed">
                    A month nobody set an AOP for is skipped, not counted as a miss.
                  </li>
                </ul>
              </Panel>
            )}

            <Panel title="Projection" icon={Radar} delay={240}
              subtitle={`${forecast.spec?.name || forecast.method} · fitted on ${forecast.history_months} months`}
              right={
                <div className="flex items-center gap-1">
                  {/* 3 and 6 only. The forecast stops at the end of the AOP
                      whatever is asked for, so a 12M button was a control
                      that changed nothing most of the year. */}
                  {[3, 6].map(h => (
                    <button key={h} onClick={() => setHorizon(h)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all
                        ${horizon === h ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                          : 'text-slate-400 hover:bg-slate-100'}`}>{h}M</button>
                  ))}
                </div>
              }>
              {/* Three series, three KINDS of mark, because they are three
                  kinds of thing and three shades of one colour could not say
                  so. The AOP is a bar -- a plan is the height to clear, and
                  it sits behind everything as the thing being measured
                  against. Invoiced sales are a solid filled line: fact, and
                  the only series with weight under it. The forecast is a
                  dashed line in a different hue entirely, inside its own
                  band, over a shaded half of the chart that says plainly
                  where fact stops. */}
              <ResponsiveContainer width="100%" height={380}>
                <ComposedChart data={fcChart} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fcActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.30} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="fcBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.26} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.10} />
                    </linearGradient>
                  </defs>

                  {/* The projected half, tinted. Without it the dashed line
                      was the only clue that half this chart has not happened. */}
                  {fcSeam.from && fcSeam.to && (
                    <ReferenceArea x1={fcSeam.from} x2={fcSeam.to} fill="#8b5cf6"
                      fillOpacity={0.045} ifOverflow="extendDomain" />
                  )}

                  <CartesianGrid strokeDasharray="2 6" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 700 }}
                    axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tickFormatter={shortInr} tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 700 }}
                    axisLine={false} tickLine={false} width={62} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: '#6366f10d' }} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 10 }}
                    iconType="plainline" iconSize={14} />

                  {/* AOP behind everything: the height to clear. */}
                  <Bar dataKey="aop" name="AOP" fill="#fbbf24" fillOpacity={0.5}
                    radius={[4, 4, 0, 0]} barSize={22} animationDuration={900} />

                  {/* The band, as base + span so nothing is painted over. */}
                  <Area dataKey="bandBase" stackId="band" stroke="none" fill="transparent"
                    legendType="none" tooltipType="none" isAnimationActive={false} />
                  <Area dataKey="bandSpan" stackId="band" name="Range (95%)" stroke="none"
                    fill="url(#fcBand)" legendType="none" tooltipType="none"
                    animationDuration={900} />

                  {/* Fact. The only series carrying fill under it. */}
                  <Area type="monotone" dataKey="actual" name="Revenue (Sales)" stroke="#0d9488"
                    strokeWidth={3} fill="url(#fcActual)" connectNulls={false}
                    dot={false} animationDuration={1100} />

                  {/* Projection, and the edges of its range. */}
                  <Line type="monotone" dataKey="upper" name="High" stroke="#a78bfa" strokeWidth={1.5}
                    strokeDasharray="2 5" dot={false} connectNulls animationDuration={900} />
                  <Line type="monotone" dataKey="lower" name="Low" stroke="#a78bfa" strokeWidth={1.5}
                    strokeDasharray="2 5" dot={false} connectNulls animationDuration={900} />
                  <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#7c3aed"
                    strokeWidth={3} strokeDasharray="7 4" connectNulls animationDuration={1300}
                    dot={{ r: 3.5, fill: '#7c3aed', stroke: '#fff', strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }} />

                  {/* The seam, named. */}
                  {fcSeam.at && (
                    <ReferenceLine x={fcSeam.at} stroke="#94a3b8" strokeDasharray="4 4"
                      label={{ value: 'forecast from here', position: 'insideTopRight',
                               fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>

              {/* How to read it, in one line, rather than leaving the reader
                  to work out why one series is bars and another is dashed. */}
              <div className="mt-2 flex items-center gap-x-4 gap-y-1.5 flex-wrap
                              text-[10.5px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-amber-400/60" />
                  AOP — the height to clear
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-[3px] rounded-full bg-teal-600" />
                  invoiced, actually happened
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-[3px] rounded-full bg-violet-600" />
                  projected, has not happened
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-violet-400/25" />
                  where it could land, 95% of the time
                </span>
              </div>
            </Panel>

            {/* Why these numbers. Somebody will be asked this in a review, so
                the panel answers it rather than leaving them to guess. */}
            {forecast.spec && (
              <Panel title="How this forecast is made" icon={Brain} delay={280}
                subtitle="So the numbers above can be accounted for">
                {/* Short lines throughout. This panel is read by somebody
                    being asked a question in a review, and a paragraph is
                    the one shape nobody can scan under that pressure. */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Model</p>
                    <p className="mt-1.5 text-[14px] font-black text-slate-800">{forecast.spec.name}</p>
                    <Bullets items={forecast.spec.why} className="mt-2" />
                    <p className="mt-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      What it reads
                    </p>
                    <Bullets items={forecast.spec.reads} className="mt-1.5" />
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Seasonality — {forecast.spec.seasonality}
                    </p>
                    <Bullets items={forecast.spec.seasonality_why} className="mt-1.5" />
                    <p className="mt-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      The low and high lines
                    </p>
                    <Bullets items={forecast.spec.band} className="mt-1.5" />
                    <Bullets items={forecast.spec.floor} className="mt-1.5" />
                  </div>
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50/70 border border-amber-100 p-3">
                  <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    {forecast.run_rate ? (
                      <ul className="space-y-1">
                        <li className="text-[11px] text-amber-900/80 leading-relaxed">
                          The forecast is the AOP scaled by the rate above — the plan's
                          month shape, the business's level.
                        </li>
                        <li className="text-[11px] text-amber-900/80 leading-relaxed">
                          It is deliberately <b>not</b> the plan copied back: at
                          {' '}{forecast.run_rate.rate_pct}% of AOP it sits
                          {' '}{forecast.run_rate.rate_pct >= 100 ? 'above' : 'below'} the
                          plan by design, and moves when the achievement rate moves.
                        </li>
                        <li className="text-[11px] text-amber-900/80 leading-relaxed">
                          The notes against each month below are dated calendar events —
                          festivals, the year boundary, the monsoon — and nothing more.
                        </li>
                      </ul>
                    ) : (
                      <p className="text-[11px] text-amber-900/80 leading-relaxed">
                        No AOP reaches these months, so this is an extrapolation of the
                        sales history alone with nothing anchoring it to a plan. Upload the
                        AOP sheet for this period and the forecast will be built on it.
                      </p>
                    )}
                  </div>
                </div>
              </Panel>
            )}

            <Panel title="Month by month" icon={BarChart3} delay={300}
              subtitle="Each month, against its plan, and what is in it">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-slate-400">
                    <tr>{['Month', 'Forecast', 'Low', 'High', 'AOP', 'Gap', 'Also this month'].map(h => (
                      <th key={h} className="text-left text-[10px] font-black uppercase tracking-widest px-3 py-2 whitespace-nowrap">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(forecast.points || []).map((p: any, i: number) => {
                      const gap = p.aop === null || p.aop === undefined ? null : p.value - p.aop;
                      return (
                        <tr key={p.period} className="siq-reveal hover:bg-slate-50 align-top"
                          style={{ animationDelay: `${i * 50}ms` }}>
                          <td className="px-3 py-3 font-bold text-slate-700 whitespace-nowrap">
                            {new Date(p.period).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                          </td>
                          <td className="px-3 py-3 font-black text-indigo-600 tabular-nums whitespace-nowrap">₹{shortInr(p.value)}</td>
                          <td className="px-3 py-3 text-slate-400 tabular-nums whitespace-nowrap">₹{shortInr(p.lower)}</td>
                          <td className="px-3 py-3 text-slate-400 tabular-nums whitespace-nowrap">₹{shortInr(p.upper)}</td>
                          <td className="px-3 py-3 font-bold text-amber-600 tabular-nums whitespace-nowrap">
                            {gap === null ? <span className="text-slate-300">—</span> : `₹${shortInr(p.aop)}`}
                          </td>
                          <td className={`px-3 py-3 font-black tabular-nums whitespace-nowrap
                            ${gap === null ? 'text-slate-300' : gap >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {gap === null ? '—' : `${gap >= 0 ? '+' : '−'}₹${shortInr(Math.abs(gap))}`}
                          </td>
                          <td className="px-3 py-3 min-w-[260px]">
                            {p.seasonal_pct !== undefined && p.seasonal_pct !== null && (
                              <span className={`inline-block mb-1 px-2 py-0.5 rounded-full text-[10px] font-black
                                ${p.seasonal_pct >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                {p.seasonal_pct >= 0 ? '+' : ''}{p.seasonal_pct}% vs an average month
                                <span className="font-semibold"> · measured from APIS invoices</span>
                              </span>
                            )}
                            <ul className="space-y-0.5">
                              {(p.calendar || []).map((c: string) => (
                                <li key={c} className="text-[11px] text-slate-500 leading-relaxed flex gap-1.5">
                                  <CalendarDays className="w-3 h-3 text-slate-300 mt-0.5 flex-shrink-0" />
                                  <span>{c}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
                Gap is forecast minus AOP. A dash means the plan does not reach that month —
                the AOP is loaded to the end of the financial year, and the forecast can run
                past it.
              </p>
            </Panel>
          </div>
        )}

        {/* ══ DATA ══ */}
        {!loading && !busyFirstLoad && activeTab === 'data' && (
          <DataPanel uploads={uploads} review={review} recipients={recipients}
            uploaders={uploaders} onChanged={loadAll}
            absentDims={filterOpts?.absent_dimensions || []}
            absentDetail={filterOpts?.absent_detail || []} />
        )}
      </div>
    </div>
  );
}

/* ── data / upload tab ──────────────────────────────────────────────────── */
function DataPanel({ uploads, review, recipients, uploaders, onChanged,
                    absentDims = [], absentDetail = [] }:
  { uploads: any; review?: any; recipients?: any; uploaders?: any;
    onChanged: () => void; absentDims?: string[];
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

      <ReviewPanel review={review} mayEdit={mayEdit} onChanged={onChanged} />

      <RecipientsPanel data={recipients} mayEdit={mayEdit} onChanged={onChanged} />

      <AccessPanel data={uploaders} onChanged={onChanged} />

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

/* ── the daily GTR-head review sheet ──────────────────────────────────────
 *
 * Kept apart from the uploaded-files list above it, and from every figure on
 * the dashboard, because it is a different KIND of thing. The AOP sheet and
 * the invoice dump are transactions; this is the business's own published
 * statement of where each head stood on a given morning. Its money is the
 * same money, already counted once, so it is read by the per-head report and
 * by nothing else.
 */
function ReviewPanel({ review, mayEdit, onChanged }:
  { review: any; mayEdit: boolean; onChanged: () => void }) {
  // The same bands the rest of SalesIQ uses, so a head reading amber here
  // reads amber on every other screen too.
  const ragOf = (pct: number) => pct >= 100 ? 'green' : pct < 70 ? 'red' : 'amber';

  const snap = review?.snapshot;
  const rows: any[] = review?.rows || [];
  const [open, setOpen] = useState(false);

  const removeSnapshot = async (id: number) => {
    if (!window.confirm('Remove this review sheet? The report built from it '
                        + 'will fall back to the previous one.')) return;
    await sqFetch(`/review/${id}/`, { method: 'DELETE' });
    onChanged();
  };

  // Lakhs, because that is the unit the sheet itself is written and read in.
  // Converting it to crore on screen would mean the person checking this
  // against their own copy has to do arithmetic to agree with it.
  const lakh = (v: number) => (v / 100000).toLocaleString('en-IN',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Panel title="Daily review sheet" icon={CalendarDays}
      subtitle={snap
        ? `${snap.row_count} heads · ${snap.as_of_month_label || 'month not read'}`
        : 'The morning sheet, one row per GTR head'}
      right={snap && mayEdit && (
        <button onClick={() => removeSnapshot(snap.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200
                     text-rose-600 text-[12px] font-bold hover:bg-rose-50 transition-all">
          <Trash2 className="w-3.5 h-3.5" />Remove
        </button>
      )}>
      {!snap ? (
        <Empty msg="No review sheet uploaded yet"
          hint="Upload it the same way as the others. It is recognised by its own
                columns — NO OF SFO, Backlog TGT FTM — and loaded separately from
                the sales figures, because every rupee on it is already counted." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-500">
            <span><b className="text-slate-700">{snap.filename}</b></span>
            {snap.as_of_date && <span>as at {snap.as_of_date}</span>}
            {snap.source_unit && <span>read as {snap.source_unit}</span>}
          </div>

          <Bullets items={snap.notes} className="mt-3" />
          {snap.warnings?.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50/70
                            border border-amber-100 p-3">
              <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <ul className="space-y-1 min-w-0">
                {snap.warnings.map((w: string, i: number) => (
                  <li key={i} className="text-[11px] text-amber-900/80 leading-relaxed">{w}</li>
                ))}
              </ul>
            </div>
          )}

          <button onClick={() => setOpen(o => !o)}
            className="mt-3 text-[12px] font-bold text-indigo-600 hover:text-indigo-700">
            {open ? 'Hide the rows' : `Show all ${rows.length} heads`}
          </button>

          {open && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[11px] border-collapse"
                style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase tracking-widest">
                    <th className="text-left font-black py-2 pr-3">Region</th>
                    <th className="text-left font-black py-2 pr-3">Head</th>
                    <th className="text-right font-black py-2 pr-3">SFO</th>
                    <th className="text-right font-black py-2 pr-3">MTD AOP</th>
                    <th className="text-right font-black py-2 pr-3">MTD Pri</th>
                    <th className="text-right font-black py-2 pr-3">ACH</th>
                    <th className="text-right font-black py-2 pr-3">YTD</th>
                    <th className="text-right font-black py-2">FY</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3 font-bold text-slate-700">{r.region}</td>
                      <td className="py-2 pr-3 text-slate-600 truncate max-w-[180px]">{r.head_name}</td>
                      <td className="py-2 pr-3 text-right text-slate-500">{r.sfo_count || '—'}</td>
                      <td className="py-2 pr-3 text-right text-slate-500">{lakh(r.month_target)}</td>
                      <td className="py-2 pr-3 text-right text-slate-700 font-semibold">{lakh(r.mtd_primary)}</td>
                      {/* No plan is not nought per cent. The handover row on
                          the real sheet bills against a blank AOP. */}
                      <td className="py-2 pr-3 text-right">
                        {r.month_pct === null ? <span className="text-slate-300">no plan</span>
                          : <StatusPill status={ragOf(r.month_pct)}>
                              {Math.round(r.month_pct)}%
                            </StatusPill>}
                      </td>
                      <td className="py-2 pr-3 text-right text-slate-500">
                        {r.ytd_pct === null ? '—' : `${Math.round(r.ytd_pct)}%`}
                      </td>
                      <td className="py-2 text-right text-slate-400">
                        {r.fy_pct === null ? '—' : `${Math.round(r.fy_pct)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <ReportBuilder rows={rows} snap={snap} />

          {review?.snapshots?.length > 1 && (
            <p className="mt-3 text-[11px] text-slate-400">
              {review.snapshots.length} sheets on file. The report is built from
              the most recent.
            </p>
          )}
        </>
      )}
    </Panel>
  );
}

/* ── one report per head ──────────────────────────────────────────────────
 *
 * A file for each person rather than one document with everybody in it. A
 * head who can read the whole sheet is being shown their peers' numbers
 * whether or not that was intended, and these go out individually.
 *
 * The preview and the downloaded file are the same bytes: both come from
 * /review/report/file/, so what is approved on screen is what is sent.
 */
function ReportBuilder({ rows, snap }: { rows: any[]; snap: any }) {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const key = (r: any) => r.head_code || r.region || r.head_name;

  // downloadFile, above: a bare <a href> cannot carry the session header
  // every SalesIQ endpoint wants, and silently does nothing when it fails.
  const save = async (path: string, filename: string, tag: string) => {
    setBusy(tag); setErr('');
    try {
      await downloadFile(path, filename);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not build it');
    } finally { setBusy(''); }
  };

  const preview = async (r: any) => {
    setBusy(`p${r.id}`); setErr('');
    try {
      const res = await sqFetch(`/review/report/file/?snapshot=${snap.id}&head=${encodeURIComponent(key(r))}`);
      if (!res.ok) throw new Error(await res.text() || 'Could not build it');
      const w = window.open('', '_blank');
      if (!w) { setErr('Your browser blocked the preview window.'); return; }
      w.document.write(await res.text());
      w.document.close();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not build it');
    } finally { setBusy(''); }
  };

  const stamp = snap?.as_of_date || 'latest';

  return (
    <div className="mt-5 pt-5 border-t border-slate-200">
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <div className="min-w-0">
          <p className="text-[13px] font-black text-slate-800">Reports for each head</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            One file per person, built from this sheet. Open it to check it, then
            download.
          </p>
        </div>
        <button
          onClick={() => save(`/review/bundle/?snapshot=${snap.id}`,
                              `reports_${stamp}.zip`, 'all')}
          disabled={!!busy}
          className="ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600
                     text-white text-[12px] font-bold hover:bg-indigo-700 disabled:opacity-50
                     transition-all">
          <Download className="w-3.5 h-3.5" />
          {busy === 'all' ? `Building ${rows.length}…` : `Download all ${rows.length}`}
        </button>
      </div>

      {err && (
        <p className="text-[11px] text-rose-600 font-semibold mt-2">{err}</p>
      )}

      <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {rows.map(r => (
          <div key={r.id}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-2.5
                       hover:border-slate-300 transition-all">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-slate-800 truncate">{r.head_name}</p>
              <p className="text-[10.5px] text-slate-400 truncate">
                {r.region}
                {/* Said here rather than only at import: a head with no ID is
                    one whose report cannot be addressed automatically later. */}
                {!r.head_code && <span className="text-amber-600"> · no APIS ID</span>}
              </p>
            </div>
            <button onClick={() => preview(r)} disabled={!!busy}
              title="Open the report"
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600
                         hover:bg-indigo-50 disabled:opacity-40 transition-all">
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => save(
                `/review/report/file/?snapshot=${snap.id}&head=${encodeURIComponent(key(r))}&download=1`,
                `${r.region || r.head_name}_${stamp}.html`.replace(/[^\w.-]/g, '_'),
                `d${r.id}`)}
              disabled={!!busy} title="Download the report"
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600
                         hover:bg-emerald-50 disabled:opacity-40 transition-all">
              <Download className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── who gets which report ────────────────────────────────────────────────
 *
 * Two kinds of recipient, and the difference is what they are allowed to
 * see. A head gets their own territory. A manager gets one rolled-up report
 * across the territories they cover, plus each of those heads' own files.
 *
 * A manager's coverage is stated here, not inferred: the Region Summary tab
 * carries channel, region and head, but not who those heads report to, and
 * guessing a reporting line from a spreadsheet is how somebody receives a
 * territory that is not theirs.
 */
function RecipientsPanel({ data, mayEdit, onChanged }:
  { data: any; mayEdit: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const list: any[] = data?.recipients || [];
  const heads = list.filter(r => r.role === 'head');
  const managers = list.filter(r => r.role === 'manager');
  const missing: any[] = data?.heads_without_a_recipient || [];

  /* The filled-in workbook, sent as a file. There is no paste box: what
     comes out of Excel on a copy is TAB separated, and the importer reads
     commas -- so pasting reported every one of nineteen rows as needing more
     columns. Sending the file itself has no such edge. */
  const upload = async (file: File) => {
    setBusy(true); setResult(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const r = await sqFetch('/recipients/import/', { method: 'POST', body });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not read that file');
      setResult(j);
      if (j.added || j.updated) onChanged();
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : 'Could not read that file' });
    } finally { setBusy(false); }
  };

  /* Fetched and written into the new window rather than linked to: every
     SalesIQ endpoint wants the session header, which a plain link cannot
     carry, so the tab would open on a 401. */
  const previewTeam = async (r: any) => {
    const q = `regions=${encodeURIComponent((r.covers || []).join(','))}`
            + `&name=${encodeURIComponent(r.name || 'Group')}`;
    const res = await sqFetch(`/review/team/file/?${q}`);
    if (!res.ok) { setResult({ error: await res.text() || 'Could not build it' }); return; }
    const w = window.open('', '_blank');
    if (!w) { setResult({ error: 'Your browser blocked the preview window.' }); return; }
    w.document.write(await res.text());
    w.document.close();
  };

  /* Starting over. Nothing here is inferred from the sheet, so a list that
     holds the wrong people is cleared and re-entered rather than corrected
     row by row. */
  const clearAll = async () => {
    if (!window.confirm(`Remove all ${list.length} recipients? Nobody is sent `
                        + `anything until the list is filled in again.`)) return;
    await sqFetch('/recipients/edit/', { method: 'DELETE' });
    onChanged();
  };

  const remove = async (r: any) => {
    if (!window.confirm(`Stop sending to ${r.email}?`)) return;
    await sqFetch(`/recipients/edit/${r.id}/`, { method: 'DELETE' });
    onChanged();
  };

  return (
    <Panel title="Email setup — who gets which report" icon={Users}
      subtitle={list.length
        ? `${heads.length} head${heads.length === 1 ? '' : 's'} · ${managers.length} manager${managers.length === 1 ? '' : 's'}`
        : 'Nobody set up yet — download the list, fill it in, paste it back'}
      right={mayEdit && (
        <div className="flex items-center gap-2">
          {list.length > 0 && (
            <button onClick={clearAll}
              className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600
                         text-[12px] font-bold hover:bg-rose-50 transition-all">
              Clear the list
            </button>
          )}
          <button onClick={() => downloadFile('/recipients/template/',
                                              'report recipients.xlsx')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200
                       text-slate-600 text-[12px] font-bold hover:bg-slate-50 transition-all">
            <Download className="w-3.5 h-3.5" />Download the list
          </button>
          <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600
                            text-white text-[12px] font-bold hover:bg-indigo-700
                            cursor-pointer transition-all">
            <Upload className="w-3.5 h-3.5" />
            {busy ? 'Reading…' : 'Upload the filled list'}
            <input id="recipients-file" type="file" className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={ev => {
                const f = ev.target.files?.[0];
                // Cleared so choosing the same file twice still fires, which
                // it must after a correction in the same spreadsheet.
                ev.target.value = '';
                if (f) upload(f);
              }} />
          </label>
        </div>
      )}>

      {/* Said plainly rather than left to be noticed: a head with nobody
          against them has a report built every morning and sent to no one. */}
      {missing.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50/70 border
                        border-amber-100 p-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11.5px] text-amber-900/80 leading-relaxed min-w-0">
            <b>{missing.length} head{missing.length === 1 ? ' has' : 's have'} no
            email against {missing.length === 1 ? 'them' : 'them'} yet</b> —{' '}
            {missing.slice(0, 6).map(m => m.region).join(', ')}
            {missing.length > 6 && `, and ${missing.length - 6} more`}. Their
            reports are built each morning and go nowhere.
          </p>
        </div>
      )}

      {mayEdit && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
          <p className="text-[12px] text-slate-600 leading-relaxed">
            <b className="text-slate-800">1.</b> Download the list &nbsp;
            <b className="text-slate-800">2.</b> Fill in the <b>email</b> column in
            Excel and save &nbsp;
            <b className="text-slate-800">3.</b> Upload it back with the button above.
          </p>
          <p className="mt-1.5 text-[11.5px] text-slate-500 leading-relaxed">
            Do it in as many sittings as you like — rows already set up are updated,
            not duplicated, and a row with no email is simply not set up yet.
          </p>

          {busy && (
            <p className="mt-2.5 text-[12px] font-bold text-indigo-600">Reading the file…</p>
          )}
          {result && !result.error && !busy && (
            <p className="mt-2.5 text-[12px] font-bold text-emerald-600">
              {result.added} added, {result.updated} updated
            </p>
          )}
          {result?.error && (
            <p className="mt-2.5 text-[12px] font-bold text-rose-600">{result.error}</p>
          )}
          {/* One bad row must not throw away the good ones, so each is
              reported on its own rather than as a failed import. */}
          {result?.skipped?.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {result.skipped.map((m: string, i: number) => (
                <li key={i} className="text-[11px] text-amber-700">{m}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {list.length > 0 && (
        <div className="mt-4 space-y-4">
          {[['Heads — their own territory', heads],
            ['Managers — everyone they cover', managers]].map(([label, rows]: any) =>
            rows.length > 0 && (
              <div key={label}>
                <p className="text-[10px] font-black uppercase tracking-widest
                              text-slate-400 mb-2">{label}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {rows.map((r: any) => (
                    <div key={r.id}
                      className="flex items-center gap-2.5 rounded-xl border
                                 border-slate-200 p-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-slate-800 truncate">
                          {r.name || r.email}
                        </p>
                        <p className="text-[10.5px] text-slate-400 truncate">
                          {r.email}
                          {r.role === 'head'
                            ? (r.matched
                                ? ` · ${r.matched_to}`
                                : <span className="text-amber-600"> · no row on the sheet for "{r.head_key}"</span>)
                            : ` · ${r.covers_all ? 'every region' : (r.covers || []).join(', ') || 'no region yet'}`}
                        </p>
                      </div>
                      {r.role === 'manager' && (
                        <button
                          onClick={() => previewTeam(r)}
                          title="Open their rolled-up report"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600
                                     hover:bg-indigo-50 transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {mayEdit && (
                        <button onClick={() => remove(r)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600
                                     hover:bg-rose-50 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      <p className="mt-4 text-[11px] text-slate-400 leading-relaxed">
        Nothing is sent from this screen. Building the list and emailing sixteen
        people are separate decisions.
      </p>
    </Panel>
  );
}


/* ── who may load the morning file ────────────────────────────────────────
 *
 * Uploading is a daily chore; owning the data is not the same thing. An
 * uploader loads the workbook and builds the reports, and can undo a wrong
 * morning file. Clearing everything, and granting this to somebody else,
 * both stay with the owner — those are the two actions with no way back.
 */
function AccessPanel({ data, onChanged }: { data: any; onChanged: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const isOwner = data?.you?.role === 'super_admin';
  const rows: any[] = data?.uploaders || [];

  const add = async () => {
    setErr('');
    const r = await sqFetch('/uploaders/edit/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), name: name.trim() }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || 'Could not add them'); return; }
    setEmail(''); setName(''); onChanged();
  };

  const revoke = async (g: any) => {
    if (!window.confirm(`Remove upload access for ${g.email}?`)) return;
    await sqFetch(`/uploaders/edit/${g.id}/`, { method: 'DELETE' });
    onChanged();
  };

  return (
    <Panel title="Who may upload" icon={UserSearch}
      subtitle={`${rows.length + 1} ${rows.length === 0 ? 'person' : 'people'} can load the morning file`}>
      <div className="flex items-center gap-2.5 rounded-xl border border-slate-200
                      bg-slate-50/60 p-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-slate-800 truncate">{data?.owner}</p>
          <p className="text-[10.5px] text-slate-400">Owner · can also clear the data</p>
        </div>
      </div>

      {rows.map(g => (
        <div key={g.id}
          className="mt-2 flex items-center gap-2.5 rounded-xl border border-slate-200 p-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-slate-800 truncate">
              {g.name || g.email}
            </p>
            <p className="text-[10.5px] text-slate-400 truncate">
              {g.email} · can upload and build reports
            </p>
          </div>
          {isOwner && (
            <button onClick={() => revoke(g)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600
                         hover:bg-rose-50 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}

      {isOwner ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <input id="uploader-name" value={name} onChange={e => setName(e.target.value)}
              placeholder="Name"
              className="flex-1 min-w-[120px] rounded-lg border border-slate-200 px-3 py-2
                         text-[12px] focus:border-indigo-400 focus:outline-none" />
            <input id="uploader-email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="name@apisindia.com" type="email"
              className="flex-[2] min-w-[180px] rounded-lg border border-slate-200 px-3 py-2
                         text-[12px] focus:border-indigo-400 focus:outline-none" />
            <button onClick={add} disabled={!email.includes('@')}
              className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-[12px]
                         font-bold hover:bg-slate-800 disabled:opacity-40 transition-all">
              Give access
            </button>
          </div>
          {err && <p className="mt-2 text-[11px] text-rose-600 font-semibold">{err}</p>}
          <p className="mt-2.5 text-[11px] text-slate-400 leading-relaxed">
            They can load the daily workbook, build the reports, and undo a file they
            loaded by mistake. They cannot clear the data or give this to anybody else.
          </p>
        </>
      ) : (
        <p className="mt-3 text-[11px] text-slate-400">
          Only the owner can give somebody upload access.
        </p>
      )}
    </Panel>
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
function OrgNode({ node, max, depth = 0, reach }:
  { node: any; max: number; depth?: number; reach?: any }) {
  // Deep branches stay closed: an org opened all the way is a wall of names.
  const [open, setOpen] = useState(depth < 1);
  const kids = node.children || [];
  // No floor under it. A 2% minimum width drew a visible bar under a row
  // reading nought, which is the one case where the bar must say nothing.
  const width = max > 0 ? Math.min(100, (node.revenue / max) * 100) : 0;
  const aopAt = node.target > 0 && max > 0
    ? Math.min(100, (node.target / max) * 100) : null;
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
            {/* A bullet chart, not a progress bar. One track on a scale
                shared by every row, the bar is what was sold, and the notch
                is where this person's own AOP sits on that same scale. So
                the row answers both questions at once -- how big is this
                branch next to the others, and did it clear its own plan --
                and the two are read off one axis instead of a bar for one
                and a number for the other. Bar past the notch is ahead. */}
            <div className="mt-2 relative h-2.5 rounded-full bg-slate-100">
              <div className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${tone} siq-grow`}
                style={{ width: `${width}%` }} />
              {aopAt !== null && (
                <span className="absolute -top-0.5 -bottom-0.5 w-[3px] rounded-sm bg-amber-400
                                 ring-1 ring-white"
                  style={{ left: `calc(${aopAt}% - 1.5px)` }}
                  title={`AOP ₹${shortInr(node.target)}`} />
              )}
            </div>
          </div>

          {/* The percentage is shown with the two numbers it came out of,
              so nobody has to take it on trust: 89% of AOP means nothing
              until you can see it is 12.28 Cr against 13.80 Cr. */}
          <div className="text-right shrink-0">
            <p className="font-black text-slate-800 tabular-nums">₹{shortInr(node.revenue)}</p>
            {node.target > 0 ? (
              <>
                <p className={`text-[10.5px] font-black
                  ${(RAG[node.status] || RAG.amber).text}`}>
                  {(node.achievement_pct ?? 0).toFixed(0)}% of AOP
                </p>
                <p className="text-[10px] font-semibold text-slate-400 tabular-nums">
                  AOP ₹{shortInr(node.target)}
                </p>
              </>
            ) : (
              <p className="text-[10px] font-semibold text-slate-300">no AOP here</p>
            )}
          </div>
        </div>
      </div>
      {open && kids.map((k: any) => (
        <OrgNode key={`${k.level}-${k.name}`} node={k} max={max} depth={depth + 1} reach={reach} />
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
  // The common scale every row is drawn against. It has to hold the AOP
  // marker as well as the bar: a branch a long way behind plan would
  // otherwise push its own tick off the end of the track.
  const max = Math.max(1, ...(org.tree || []).flatMap(
    (n: any) => [n.revenue || 0, n.target || 0]));
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

      {/* These were four big cards across the full width, each holding one
          two-digit number and a caption -- "RSM 23" in a 400px box. The
          number is small, the card was not, and the strip pushed the tree
          itself below the fold on a laptop for no gain. One row of counts
          and the same information reads faster in a sixth of the height. */}
      <Reveal>
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm
                        px-5 py-4 flex items-end gap-x-8 gap-y-4 flex-wrap">
          {counts.filter((c: any) => c.count > 0 || c.vacant > 0).map((c: any) => (
            <div key={c.level}>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {dimLabel(c.level)}
              </p>
              <p className="mt-0.5 text-[26px] leading-none font-black text-slate-900 tabular-nums">
                {inr(c.count)}
              </p>
              {/* Beside the headcount, never inside it. The sheet writes
                  VACANT-TRI where a territory has no manager, and counting
                  those made this the number of territories — a figure that
                  rises as the company leaves more seats open. */}
              {c.vacant > 0 && (
                <p className="mt-0.5 text-[10px] font-bold text-amber-600">
                  +{inr(c.vacant)} vacant
                </p>
              )}
            </div>
          ))}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Customers
            </p>
            <p className="mt-0.5 text-[26px] leading-none font-black text-emerald-600 tabular-nums">
              {inr(org.totals?.customers || 0)}
            </p>
          </div>
          <p className="ml-auto text-[11px] font-semibold text-slate-400 max-w-sm">
            People by APIS ID, falling back to Bizom; customers by customer code.
          </p>
        </div>
      </Reveal>

      {/* How the branches fall across the bands.

          Shown because the bands put most of this organisation in red, and a
          colour that is on almost every row has stopped carrying a signal.
          Said out loud — "19 of 23 under 70% of AOP" — it reads as what it
          probably is, a statement about how the plan was set, rather than as
          nineteen separate accusations. If that is not what it is, the line
          is still the fastest way to notice. */}
      {org.status_tally?.total > 0 && (
        <Reveal>
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm px-5 py-4">
            <div className="flex items-center gap-4 flex-wrap">
              {([['green', 'on or ahead'], ['amber', 'watch'], ['red', 'under the red line']] as const)
                .map(([k, what]) => (
                  org.status_tally[k] > 0 && (
                    <span key={k} className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${RAG[k].dot}`} />
                      <span className="text-[13px] font-black text-slate-800 tabular-nums">
                        {org.status_tally[k]}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">{what}</span>
                    </span>
                  )
              ))}
              {org.status_tally.unrated > 0 && (
                <span className="text-[11px] font-semibold text-slate-400">
                  {org.status_tally.unrated} with no AOP set
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
              Red is under {org.status_thresholds?.red_below}% of AOP, green is
              {' '}{org.status_thresholds?.green_at}% or better
              {org.status_tally.red > org.status_tally.total / 2 && (
                <> — and most of this list is red, which usually says more about how the
                AOP was set than about the people under it. The thresholds are a setting,
                not a fact; they can be moved.</>
              )}.
            </p>
          </div>
        </Reveal>
      )}

      {/* Where these counts come from, once, rather than a footnote per card.
          Somebody asked "why 23 RSMs" and nothing on the page could answer. */}
      <p className="text-[11px] text-slate-400 leading-relaxed">
        One person spelled two ways is one person, and two people sharing a name are
        two — which is why the counts above are made on the ID and only fall back to
        the name where the sheet gives neither.
        {org.detail_reach && org.detail_reach.lines > 0 &&
          org.detail_reach.levels_named.length < (org.levels || []).length && (
          <> The dump names {org.detail_reach.levels_named.map(dimLabel).join(' and ') || 'none of these levels'},
          so rows at the other levels show no customer or SKU figure rather than a nought.</>
        )}
      </p>

      <Panel title="Who reports to whom" icon={Users}
        subtitle="Sales roll up into whoever they report to — click a row to open its team">
        {(org.tree || []).length ? (
          <div className="max-h-[560px] overflow-y-auto pr-1">
            {org.tree.map((n: any) => (
              <OrgNode key={`${n.level}-${n.name}`} node={n} max={max}
                reach={org.detail_reach} />
            ))}
          </div>
        ) : <Empty msg="No reporting columns in your upload" />}
      </Panel>
    </div>
  );
}
