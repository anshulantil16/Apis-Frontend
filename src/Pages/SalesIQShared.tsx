/* Shared primitives for the SalesIQ dashboard — formatting, animated
   components and chart chrome used by every tab. */
import { useState, useEffect, useRef } from 'react';
import { Boxes } from 'lucide-react';

export const _API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const API = `${_API_BASE}/api/sales`;

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

export const Skel = ({ className = '' }: { className?: string }) => (
  <div className={`siq-shimmer rounded-xl bg-slate-100 ${className}`} />
);

export const Empty = ({ msg }: { msg: string }) => (
  <div className="flex flex-col items-center justify-center py-10 text-slate-300">
    <Boxes className="w-8 h-8 mb-2" />
    <p className="text-[12px] font-semibold text-slate-400 text-center max-w-xs">{msg}</p>
  </div>
);

export function ChartTip({ active, payload, label, money = true }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-slate-900/95 backdrop-blur px-3 py-2 shadow-2xl border border-white/10">
      <p className="text-[11px] font-black text-white mb-1">{label}</p>
      {payload.filter((p: any) => p.value !== null && p.value !== undefined).map((p: any, i: number) => (
        <p key={i} className="text-[11px] font-bold flex items-center gap-2" style={{ color: p.color || p.fill }}>
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          {p.name}: <span className="text-white">{money ? `₹${shortInr(p.value)}` : inr(p.value)}</span>
        </p>
      ))}
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
              {showTarget && r.achievement_pct !== null && r.achievement_pct !== undefined && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded
                  ${r.achievement_pct >= 100 ? 'bg-emerald-50 text-emerald-600'
                    : r.achievement_pct >= 80 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                  {r.achievement_pct.toFixed(0)}%
                </span>
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
