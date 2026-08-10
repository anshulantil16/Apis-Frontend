/* Shared primitives for RoomPulse — formatting, animated components, and the
   "control room" visual language (deep navy/violet/cyan, radar sweeps,
   pulsing live-status dots). Deliberately distinct from SalesIQ's warm honey
   theme — this is a live-ops tool, not a data-analysis one. */
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
  occupied: { label: 'Occupied', dot: 'bg-rose-400', text: 'text-rose-300', bg: 'bg-rose-500/10', ring: 'ring-rose-500/30' },
  upcoming: { label: 'Starting soon', dot: 'bg-amber-400', text: 'text-amber-300', bg: 'bg-amber-500/10', ring: 'ring-amber-500/30' },
  free:     { label: 'Free', dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/30' },
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
      <div className="relative rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08]
                      shadow-xl shadow-black/20 p-5 h-full transition-all duration-300
                      hover:border-white/[0.14] hover:bg-white/[0.05]">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20
                              ring-1 ring-white/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-cyan-300" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white tracking-tight">{title}</h3>
              {subtitle && <p className="text-[11px] text-white/40">{subtitle}</p>}
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
  <div className={`rp-shimmer rounded-xl bg-white/[0.06] ${className}`} />
);

export const Empty = ({ msg, icon: Icon = Users2 }: { msg: string; icon?: any }) => (
  <div className="flex flex-col items-center justify-center py-10 text-white/25">
    <Icon className="w-8 h-8 mb-2" />
    <p className="text-[12px] font-semibold text-white/35 text-center max-w-xs">{msg}</p>
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

export const fmtTime = (t: string) => t; // already HH:MM from the API
export const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/* Shared page-scoped keyframes — one <style> block, imported by every screen
   in this feature so the whole app doesn't carry unused animation CSS. */
export const RP_STYLES = `
  @keyframes rpReveal { from { opacity:0; transform: translateY(14px) scale(.985);} to {opacity:1;transform:none;} }
  .rp-reveal { animation: rpReveal .55s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes rpShimmer { 0%{background-position:-500px 0} 100%{background-position:500px 0} }
  .rp-shimmer { background-image:linear-gradient(90deg,rgba(255,255,255,.03) 0px,rgba(255,255,255,.09) 100px,rgba(255,255,255,.03) 200px);
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
