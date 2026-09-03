/* Shared primitives for RoomPulse — formatting, animated components, and the
   "live radar" visual language (cyan/violet accents on a light control-room
   background, radar sweeps, pulsing live-status dots). Deliberately distinct
   from SalesIQ's warm honey theme — this is a live-ops tool, not a
   data-analysis one — while staying light per the house style. */
import { useState, useEffect, useRef } from 'react';
import { Users2 } from 'lucide-react';

export const _API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const API = `${_API_BASE}/api/roompulse`;

export const SESSION_KEY = 'roompulse_session';
export type Role = 'employee' | 'admin' | 'super_admin';
export interface Session { email: string; name: string; role: Role; ts: number; }

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.email || Date.now() - (s.ts || 0) > 12 * 60 * 60 * 1000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch { return null; }
}
export const saveSession = (s: Omit<Session, 'ts'>) =>
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, ts: Date.now() }));
export const clearSession = () => localStorage.removeItem(SESSION_KEY);

export const ROLE_LABEL: Record<Role, string> = {
  employee: 'Employee', admin: 'Admin', super_admin: 'Super Admin',
};

/* ── animated counter ───────────────────────────────────────────────────── */
export function useCountUp(target: number, duration = 800) {
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
export function Counter({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const v = useCountUp(value || 0);
  return <>{v.toFixed(decimals)}</>;
}

/* ── staggered reveal ───────────────────────────────────────────────────── */
export function Reveal({ delay = 0, children, className = '' }:
  { delay?: number; children: any; className?: string }) {
  return (
    <div className={`rp-reveal ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── live status pill ───────────────────────────────────────────────────── */
const STATUS_META: Record<string, { label: string; dot: string; text: string; bg: string; ring: string }> = {
  occupied: { label: 'Occupied', dot: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50', ring: 'ring-rose-200' },
  upcoming: { label: 'Starting soon', dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200' },
  free:     { label: 'Free', dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
};
const STATUS_GLOW: Record<string, string> = {
  occupied: 'rgba(244,63,94,.4)', upcoming: 'rgba(245,158,11,.4)', free: 'rgba(16,185,129,.35)',
};
export function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] || STATUS_META.free;
  return (
    <span className={`rp-pop-in inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]
                      font-black uppercase tracking-wide ring-1 ${m.bg} ${m.text} ${m.ring}`}
      style={{ '--rp-glow': STATUS_GLOW[status] || STATUS_GLOW.free } as any}>
      <span className={`relative w-1.5 h-1.5 rounded-full ${m.dot}`}>
        {status !== 'free' && <span className={`rp-ping absolute inset-0 rounded-full ${m.dot}`} />}
      </span>
      {m.label}
    </span>
  );
}
export { STATUS_META };

/* ── glass panel ────────────────────────────────────────────────────────── */
export function Panel({ title, icon: Icon, subtitle, right, children, delay = 0, className = '' }: any) {
  return (
    <Reveal delay={delay} className={className}>
      <div className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200
                      shadow-sm p-5 h-full transition-all duration-300
                      hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-500/[0.06] hover:-translate-y-0.5">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-50 to-violet-50
                              ring-1 ring-slate-200 flex items-center justify-center flex-shrink-0
                              transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <Icon className="w-4 h-4 text-cyan-600" />
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
  <div className={`rp-shimmer rounded-xl bg-slate-100 ${className}`} />
);

export const Empty = ({ msg, icon: Icon = Users2 }: { msg: string; icon?: any }) => (
  <div className="flex flex-col items-center justify-center py-10 text-slate-300">
    <Icon className="w-8 h-8 mb-2" />
    <p className="text-[12px] font-semibold text-slate-400 text-center max-w-xs">{msg}</p>
  </div>
);

/* ── purpose badge ──────────────────────────────────────────────────────── */
export const PURPOSE_LABEL: Record<string, string> = {
  client_meeting: 'Client Meeting', internal_meeting: 'Internal Team Meeting',
  interview: 'Interview', training: 'Training / Workshop', board_meeting: 'Board Meeting',
  presentation: 'Presentation', vendor_meeting: 'Vendor Meeting', other: 'Other',
};
export const PURPOSE_COLOUR: Record<string, string> = {
  client_meeting: '#f59e0b', internal_meeting: '#6366f1', interview: '#ec4899',
  training: '#10b981', board_meeting: '#ef4444', presentation: '#06b6d4',
  vendor_meeting: '#8b5cf6', other: '#94a3b8',
};

/* ── resource/item request badges ──────────────────────────────────────── */
export const CATEGORY_LABEL: Record<string, string> = {
  stationery: 'Stationery', it_equipment: 'IT Equipment', furniture: 'Furniture',
  pantry: 'Pantry / Housekeeping', printing: 'Printing', other: 'Other',
};
export const CATEGORY_COLOUR: Record<string, string> = {
  stationery: '#0891b2', it_equipment: '#6366f1', furniture: '#b45309',
  pantry: '#10b981', printing: '#8b5cf6', other: '#94a3b8',
};
export const URGENCY_LABEL: Record<string, string> = {
  low: 'Low', normal: 'Normal', urgent: 'Urgent',
};
export const URGENCY_COLOUR: Record<string, string> = {
  low: '#64748b', normal: '#0891b2', urgent: '#e11d48',
};

/* Shared across both request types (room bookings + item requests) — the
   union of every status either can have, so one badge map covers both in
   the unified My Requests / Approvals views. */
export const REQUEST_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
  fulfilled: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  rejected: 'bg-rose-50 text-rose-600 ring-rose-200',
  cancelled: 'bg-slate-50 text-slate-400 ring-slate-200',
};

export const fmtTime = (t: string) => t; // already HH:MM from the API
export const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

// yyyy-mm-dd for a Date, read from its LOCAL fields. toISOString() reads UTC,
// which between midnight and 5:30 AM IST is still yesterday - so "today", and
// day-shifting arithmetic built on it, would silently land a day off.
export const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* Shared page-scoped keyframes — one <style> block, imported by every screen
   in this feature so the whole app doesn't carry unused animation CSS. */
export const RP_STYLES = `
  @keyframes rpReveal { from { opacity:0; transform: translateY(14px) scale(.985);} to {opacity:1;transform:none;} }
  .rp-reveal { animation: rpReveal .55s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes rpShimmer { 0%{background-position:-500px 0} 100%{background-position:500px 0} }
  .rp-shimmer { background-image:linear-gradient(90deg,#f1f5f9 0px,#e2e8f0 100px,#f1f5f9 200px);
                background-size:600px 100%; animation:rpShimmer 1.3s linear infinite; }
  @keyframes rpPing { 75%,100%{ transform: scale(2.4); opacity:0; } }
  .rp-ping { animation: rpPing 1.6s cubic-bezier(0,0,.2,1) infinite; }
  @keyframes rpFloat { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,-24px) scale(1.06)} }
  .rp-blob { animation: rpFloat 18s ease-in-out infinite; }
  @keyframes rpSweep { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  .rp-radar-sweep { animation: rpSweep 4s linear infinite; }
  @keyframes rpGrow { from { width:0 !important; } }
  .rp-grow { animation: rpGrow .8s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes rpPulseGlow{0%,100%{opacity:.5}50%{opacity:1}}
  .rp-pulse-glow{animation:rpPulseGlow 2.4s ease-in-out infinite;}

  /* button/card hover sheen — a light sweep that reads as "alive" on hover */
  .rp-sheen{position:relative;overflow:hidden;}
  @keyframes rpSheenMove{from{transform:translateX(-130%) skewX(-12deg);}to{transform:translateX(230%) skewX(-12deg);}}
  .rp-sheen::after{content:'';position:absolute;top:0;left:0;height:100%;width:35%;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);
    opacity:0;pointer-events:none;}
  .rp-sheen:hover::after{opacity:1;animation:rpSheenMove .9s ease-in-out;}

  /* card lift + tilt on hover — subtle 3D feel without a JS mousemove handler */
  .rp-tilt{transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s;}
  .rp-tilt:hover{transform:translateY(-6px) rotateX(2deg) rotateY(-1.5deg) scale(1.012);}

  /* coloured glow ring — status-aware "this room is live" pulse */
  @keyframes rpGlowRing{0%,100%{box-shadow:0 0 0 0 var(--rp-glow,rgba(239,68,68,.35))}
                         50%{box-shadow:0 0 0 8px transparent}}
  .rp-glow-ring{animation:rpGlowRing 2.6s ease-in-out infinite;}

  /* animated conic-gradient border — used sparingly, on the single most
     "this is live" element per screen so it doesn't become visual noise */
  @keyframes rpBorderSpin{to{--rp-angle:360deg;}}
  @property --rp-angle{syntax:'<angle>';inherits:false;initial-value:0deg;}
  .rp-border-flow{position:relative;}
  .rp-border-flow::before{content:'';position:absolute;inset:-1.5px;border-radius:inherit;
    padding:1.5px;background:conic-gradient(from var(--rp-angle),#22d3ee,#8b5cf6,#22d3ee);
    -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
    -webkit-mask-composite:xor;mask-composite:exclude;
    animation:rpBorderSpin 3.5s linear infinite;pointer-events:none;}

  /* modal entrance — scale+fade reads as "materialising" rather than a flat fade */
  @keyframes rpPop{from{opacity:0;transform:scale(.92) translateY(10px);}to{opacity:1;transform:none;}}
  .rp-pop{animation:rpPop .35s cubic-bezier(.2,.9,.25,1.15) both;}
  @keyframes rpBackdrop{from{opacity:0;}to{opacity:1;}}
  .rp-backdrop{animation:rpBackdrop .25s ease both;}

  /* drifting mesh background for the main dashboard — cheap (CSS only),
     gives the page a sense of motion even when no data is loading */
  @keyframes rpMeshDrift{0%,100%{transform:translate(0,0) rotate(0deg);}
                          33%{transform:translate(3%,-4%) rotate(1.5deg);}
                          66%{transform:translate(-2%,3%) rotate(-1deg);}}
  .rp-mesh{animation:rpMeshDrift 26s ease-in-out infinite;}

  /* slow decorative spin for background icons/rings */
  @keyframes rpSpinSlow{to{transform:rotate(360deg);}}
  .rp-spin-slow{animation:rpSpinSlow 16s linear infinite;}

  /* number/icon pop when a KPI updates */
  @keyframes rpPopIn{0%{transform:scale(.6);opacity:0;}60%{transform:scale(1.08);opacity:1;}100%{transform:scale(1);}}
  .rp-pop-in{animation:rpPopIn .5s cubic-bezier(.2,.9,.25,1.2) both;}
`;
