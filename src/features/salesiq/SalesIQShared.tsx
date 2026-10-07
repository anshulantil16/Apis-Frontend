/* Shared primitives for the SalesIQ dashboard — formatting, animated
   components and chart chrome used by every tab. */
import { useState, useEffect, useRef } from 'react';
import { Boxes } from 'lucide-react';
import { apiBase } from '../../apiBase';

export const _API_BASE = apiBase();
export const API = `${_API_BASE}/api/sales`;

/* ── The session, and every request that carries it ───────────────────────
   SalesIQ used to sign somebody in by writing their address into
   localStorage; the API itself had no idea who was calling, because there
   was no token and no check. A page is not a gate. The server now issues a
   token on verify and requires it, so every call goes through here. */
const SESSION_KEY = 'salesiq_session';

export type SalesIQSession = {
  email: string; ts: number; token?: string;
  role?: 'super_admin' | 'viewer'; can_edit?: boolean;
};

export function readSession(): SalesIQSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    // 12 hours, matching the server's own TTL. A browser left open overnight
    // on a shared machine should not still be signed in to revenue.
    if (!s?.email || Date.now() - (s.ts || 0) > 12 * 60 * 60 * 1000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch { return null; }
}

/** Only the owner uploads or deletes. Everyone else granted SalesIQ in the
 *  Admin Console reads: the numbers are the point of the tool. */
export const canEdit = () => readSession()?.can_edit === true;

export async function sqFetch(path: string, init: RequestInit = {}) {
  const t = readSession()?.token;
  const headers: Record<string, string> = { ...(init.headers as any) };
  if (t) headers['X-SalesIQ-Session'] = t;
  const r = await fetch(path.startsWith('http') ? path : `${API}${path}`,
                        { ...init, headers });
  // The session died or was never valid — drop it so the page shows the
  // login rather than an endless wall of failed panels.
  if (r.status === 401) {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event('salesiq-signed-out'));
  }
  return r;
}

/* ── formatting ─────────────────────────────────────────────────────────── */
export const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);

/** Indian short-form: 1.2 Cr / 45.3 L / 12.5 K — reads better than 9 digits. */
export const shortInr = (n: number) => {
  const v = Math.abs(n || 0);
  if (v >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
  if (v >= 1e3) return `${(n / 1e3).toFixed(1)} K`;
  return inr(n);
};

export const PALETTE = ['#6366f1', '#06b6d4', '#f59e0b', '#ec4899', '#10b981',
                        '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#3b82f6'];

/** A stable colour for a named thing — the same hue every time it is drawn.
 *
 *  Taking the colour from the row's POSITION meant a category changed colour
 *  whenever the list reordered: filter one region out, and the slice that was
 *  teal a moment ago is pink, while the pink one is now something else. On a
 *  pie read against a legend that is not a cosmetic problem — the reader
 *  carries the colour across from the last screen and reads the wrong slice.
 *  Derived from the name instead, General Trade is one colour for good. */
export function colourFor(name: string): string {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** The one colour that means invoiced sales across this dashboard. */
export const REVENUE_COLOUR = '#0d9488';

/* ── Red / Amber / Green ─────────────────────────────────────────────────
   The server decides the band (sales/status.py, from the control tower
   blueprint's section 7) and the screen only dresses it. Deciding it here
   as well would mean two rules, and the day they drift the tree and the
   leaderboard colour the same person differently.

   Status colour is kept apart from the series colours above on purpose:
   teal means invoiced sales wherever it appears and must not also mean
   "doing well", or a chart and a badge contradict each other. */
export const RAG: Record<string, { dot: string; chip: string; text: string }> = {
  red:   { dot: 'bg-rose-500',    chip: 'bg-rose-50 text-rose-700 ring-rose-200',
           text: 'text-rose-600' },
  amber: { dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-700 ring-amber-200',
           text: 'text-amber-600' },
  green: { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
           text: 'text-emerald-600' },
};

/** A status pill. Renders nothing without a status — a branch with no AOP
 *  against it has not passed and has not failed, and a grey "unknown" chip
 *  on every such row is noise, not information. */
export function StatusPill({ status, children }:
  { status?: string | null; children?: any }) {
  const tone = status ? RAG[status] : null;
  if (!tone) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full
                      text-[10px] font-black ring-1 ${tone.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
      {children}
    </span>
  );
}

/* ── animated counter ───────────────────────────────────────────────────── */
export function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) { setVal(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      // easeOutExpo — fast start, gentle settle; reads as counting, not sliding
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setVal(from + delta * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export function Counter({ value, format = shortInr, prefix = '' }:
  { value: number; format?: (n: number) => string; prefix?: string }) {
  const v = useCountUp(value || 0);
  return <>{prefix}{format(v)}</>;
}

/* ── staggered reveal ───────────────────────────────────────────────────── */
export function Reveal({ delay = 0, children, className = '' }:
  { delay?: number; children: any; className?: string }) {
  return (
    <div className={`siq-reveal ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── panel ──────────────────────────────────────────────────────────────── */
export function Panel({ title, icon: Icon, subtitle, right, children, delay = 0, className = '' }: any) {
  return (
    <Reveal delay={delay} className={className}>
      <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/80 shadow-sm
                      p-5 h-full transition-all duration-300 hover:shadow-xl hover:border-slate-300">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200
                              flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-slate-600" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">{title}</h3>
              {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {right}
        </div>
        {children}
      </div>
    </Reveal>
  );
}

/* ── how much of the business a breakdown can actually speak for ──────────
 *
 * Neither primary-sales file carries every column. The monthly review sheet
 * has no customer and no SKU; the ERP dump has no brand and no sales head;
 * and the national accounts — Amazon, D-Mart, export — belong to no state at
 * all. So a category chart can be perfectly correct and still add up to a
 * fraction of the headline, and there was nothing on screen to say so: it
 * simply looked as though Rs 258 crore had gone missing.
 */
export function Coverage({ coverage }: { coverage?: any }) {
  if (!coverage || coverage.pct === null || coverage.pct === undefined) return null;
  if (coverage.pct >= 99.5) return null;
  const tone = coverage.pct >= 75
    ? 'bg-slate-100 text-slate-500'
    : 'bg-amber-50 text-amber-700 border border-amber-200';
  return (
    <span className={`px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap ${tone}`}
      title={`Rs ${Math.round(coverage.unattributed).toLocaleString('en-IN')} of sales `
           + `has nothing in this column, so it cannot appear here. `
           + `The figure is right — it just does not cover the whole business.`}>
      covers {coverage.pct}% of sales
    </span>
  );
}

export const Skel = ({ className = '' }: { className?: string }) => (
  <div className={`siq-shimmer rounded-xl bg-slate-100 ${className}`} />
);

export const Empty = ({ msg }: { msg: string }) => (
  <div className="flex flex-col items-center justify-center py-10 text-slate-300">
    <Boxes className="w-8 h-8 mb-2" />
    <p className="text-[12px] font-semibold text-slate-400 text-center max-w-xs">{msg}</p>
  </div>
);

/* Series that exist only to draw a shape, and have no business being read
   as a figure. The forecast band is a stacked base plus span: the base is an
   invisible riser up to the low line and the span is the height between the
   two, so neither is a number anybody asked for -- and they were appearing
   in the tooltip as an unnamed row and as a "Range" that was really the two
   added together, beside the High and Low that say the same thing properly. */
const TIP_HIDDEN = new Set(['bandBase', 'bandSpan']);

/** A series' colour, or nothing if it has none worth using.
 *
 *  An area filled with a gradient reports its fill as `url(#someId)`, which
 *  is not a colour at all: set as a CSS colour it resolves to nothing and
 *  the browser falls back to black — on a near-black tooltip card, an
 *  invisible row. Stroke is tried first for exactly that reason. */
const seriesColor = (p: any): string | undefined => {
  for (const c of [p?.stroke, p?.color, p?.fill, p?.payload?.fill]) {
    if (typeof c === 'string' && c && !c.startsWith('url(')) return c;
  }
  return undefined;
};

export function ChartTip({ active, payload, label, money = true }: any) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p: any) =>
    p.value !== null && p.value !== undefined && !TIP_HIDDEN.has(p.dataKey) && p.name);
  if (!rows.length) return null;
  return (
    <div className="rounded-xl bg-slate-900/95 backdrop-blur px-3 py-2 shadow-2xl border border-white/10">
      <p className="text-[11px] font-black text-white mb-1.5">{label}</p>
      <div className="space-y-1">
        {rows.map((p: any, i: number) => {
          const c = seriesColor(p);
          return (
            /* The colour identifies the series through the dot and nowhere
               else. Written INTO the text it had to stay legible against a
               near-black card as well as against a white chart, which no
               single palette manages — pale series came out unreadable and
               gradient-filled ones came out black on black. Text wears text
               colours; the dot carries identity. */
            <p key={i} className="text-[11px] font-bold flex items-baseline gap-2 text-slate-300">
              <span className="w-2 h-2 rounded-full shrink-0 translate-y-[1px]"
                style={{ background: c || '#94a3b8' }} />
              <span className="flex-1">{p.name}</span>
              <span className="text-white font-black tabular-nums">
                {money ? `₹${shortInr(p.value)}` : inr(p.value)}
              </span>
            </p>
          );
        })}
      </div>
    </div>
  );
}

/* ── leaderboard ────────────────────────────────────────────────────────── */
export function Leaderboard({ rows, showTarget = false }: { rows: any[]; showTarget?: boolean }) {
  const max = Math.max(...rows.map(r => r.revenue), 1);
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={r.name} className="siq-reveal group" style={{ animationDelay: `${i * 55}ms` }}>
          <div className="flex items-center justify-between mb-1 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0
                ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600'
                  : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}`}>
                {i + 1}
              </span>
              <span className="text-[12px] font-bold text-slate-700 truncate">{r.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* The band comes from the server. This row used to decide
                  it here with its own threshold -- amber from 80% -- while
                  the headline used 100% and the org tree used something else
                  again, so one person could be amber on one screen and red
                  on the next. */}
              {showTarget && r.achievement_pct !== null && r.achievement_pct !== undefined && (
                <StatusPill status={r.status}>
                  {r.achievement_pct.toFixed(0)}% of AOP
                </StatusPill>
              )}
              <span className="text-[12px] font-black text-slate-800 tabular-nums">₹{shortInr(r.revenue)}</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="siq-grow h-full rounded-full transition-all duration-700 group-hover:brightness-110"
              style={{
                width: `${(r.revenue / max) * 100}%`,
                background: `linear-gradient(90deg, ${PALETTE[i % PALETTE.length]}, ${PALETTE[(i + 3) % PALETTE.length]})`,
              }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── radial gauge (target pacing) ───────────────────────────────────────── */
export function Gauge({ value, label, sublabel, max = 150 }: {
  value: number; label: string; sublabel?: string; max?: number;
}) {
  const v = useCountUp(value || 0, 1200);
  const R = 70, C = Math.PI * R;                    // semicircle
  const frac = Math.min(Math.max(v, 0), max) / max;
  const off = C - frac * C;
  const colour = value >= 100 ? '#10b981' : value >= 80 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 100" className="w-full max-w-[220px]">
        <defs>
          <linearGradient id="gaugeG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="55%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="#f1f5f9" strokeWidth="14" strokeLinecap="round" />
        <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="url(#gaugeG)" strokeWidth="14"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off}
          style={{ filter: `drop-shadow(0 0 6px ${colour}55)`, transition: 'stroke-dashoffset .3s' }} />
        <text x="90" y="78" textAnchor="middle" className="tabular-nums"
          style={{ fontSize: 26, fontWeight: 900, fill: colour }}>{v.toFixed(0)}%</text>
      </svg>
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 -mt-1">{label}</p>
      {sublabel && <p className="text-[11px] text-slate-400 mt-0.5 text-center">{sublabel}</p>}
    </div>
  );
}

/* ── heat grid (dimension x month) ──────────────────────────────────────── */
export function HeatGrid({ data }: { data: any }) {
  if (!data?.rows?.length) return <Empty msg="Not enough data for a heatmap" />;
  const colour = (t: number) => {
    if (t <= 0) return '#f8fafc';
    // indigo ramp — light at low intensity, saturated at peak
    const a = 0.08 + t * 0.92;
    return `rgba(99,102,241,${a.toFixed(3)})`;
  };
  return (
    <div className="overflow-x-auto">
      <table className="border-separate" style={{ borderSpacing: '3px' }}>
        <thead>
          <tr>
            <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 pr-2 sticky left-0 bg-white">
              &nbsp;
            </th>
            {data.periods.map((p: any) => (
              <th key={p.period} className="text-[9px] font-bold text-slate-400 px-1 whitespace-nowrap">
                {p.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row: any, ri: number) => (
            <tr key={row.name} className="siq-reveal" style={{ animationDelay: `${ri * 45}ms` }}>
              <td className="text-[11px] font-bold text-slate-600 pr-3 whitespace-nowrap sticky left-0 bg-white max-w-[140px] truncate">
                {row.name}
              </td>
              {row.cells.map((c: any) => (
                <td key={c.period}
                  title={`${row.name} · ${c.period}: ₹${shortInr(c.value)}`}
                  className="w-9 h-8 rounded-md transition-transform hover:scale-125 hover:z-10 cursor-default"
                  style={{ background: colour(c.intensity), minWidth: 34 }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] font-bold text-slate-400">Low</span>
        {[0, .25, .5, .75, 1].map(t => (
          <span key={t} className="w-6 h-3 rounded" style={{ background: colour(t) }} />
        ))}
        <span className="text-[10px] font-bold text-slate-400">
          High · peak ₹{shortInr(data.peak)}
        </span>
      </div>
    </div>
  );
}

/* ── cohort retention grid ──────────────────────────────────────────────── */
export function CohortGrid({ data }: { data: any }) {
  if (!data?.cohorts?.length) return <Empty msg={data?.note || 'No cohort data'} />;
  const months = data.max_months || 12;
  const colour = (p: number) => p <= 0 ? '#f8fafc' : `rgba(16,185,129,${(0.1 + p / 100 * 0.85).toFixed(3)})`;
  return (
    <div className="overflow-x-auto">
      <table className="border-separate" style={{ borderSpacing: '3px' }}>
        <thead>
          <tr>
            <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 pr-2">Cohort</th>
            <th className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Size</th>
            {Array.from({ length: months }).map((_, i) => (
              <th key={i} className="text-[9px] font-bold text-slate-400 px-1">M{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.cohorts.map((c: any, ri: number) => (
            <tr key={c.cohort} className="siq-reveal" style={{ animationDelay: `${ri * 45}ms` }}>
              <td className="text-[11px] font-bold text-slate-600 pr-3 whitespace-nowrap">{c.label}</td>
              <td className="text-[11px] font-black text-slate-800 text-center px-1">{c.size}</td>
              {c.cells.map((cell: any) => (
                <td key={cell.offset}
                  title={`${cell.customers} of ${c.size} customers active`}
                  className="w-10 h-8 rounded-md text-[9px] font-black text-center align-middle
                             transition-transform hover:scale-110 cursor-default"
                  style={{
                    background: colour(cell.pct),
                    color: cell.pct > 55 ? '#065f46' : '#94a3b8',
                    minWidth: 38,
                  }}>
                  {cell.pct > 0 ? `${cell.pct.toFixed(0)}` : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-slate-400 mt-3">
        Each row is the customers won in that month. M0 is always 100% — the cells after it show
        how many came back, so a row fading fast means acquisition is not sticking.
      </p>
    </div>
  );
}
