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
export function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] || STATUS_META.free;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]
                      font-black uppercase tracking-wide ring-1 ${m.bg} ${m.text} ${m.ring}`}>
      <span className={`relative w-1.5 h-1.5 rounded-full ${m.dot}`}>
        {status === 'occupied' && <span className={`rp-ping absolute inset-0 rounded-full ${m.dot}`} />}
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
      <div className="relative rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200
                      shadow-sm p-5 h-full transition-all duration-300
                      hover:border-slate-300 hover:shadow-lg">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-50 to-violet-50
                              ring-1 ring-slate-200 flex items-center justify-center flex-shrink-0">
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
`;
