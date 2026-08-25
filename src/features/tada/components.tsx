/* Small presentational pieces shared across the TA/DA screens: counters,
   confetti, toasts, gauges, status pills and the policy-caps banner. Together
   because none is big enough for its own file. */
import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle, AlertCircle, XCircle, FileText, Shield, Wallet, UserCheck, BadgeCheck, Mail,
} from 'lucide-react';
import { STATUS_STYLE } from './shared';

// ── Animated helpers ──────────────────────────────────────────────────────────
export function useCountUp(target: number, ms = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now(); const from = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
export function Count({ n, prefix = '', decimals = 0 }: { n: number; prefix?: string; decimals?: number }) {
  const v = useCountUp(n || 0);
  const s = decimals ? v.toFixed(decimals) : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(v));
  return <>{prefix}{s}</>;
}
export function Confetti({ show }: { show: boolean }) {
  const colors = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#06b6d4', '#8b5cf6'];
  const bits = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    left: Math.random() * 100, top: -10 - Math.random() * 20,
    size: 8 + Math.random() * 6, color: colors[i % colors.length],
    round: Math.random() > 0.5, delay: Math.random() * 0.4, dur: 0.9 + Math.random() * 0.8,
  })), []);
  if (!show) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {bits.map((b, i) => (
        <span key={i} className="absolute animate-confetti" style={{
          left: `${b.left}%`, top: `${b.top}%`, width: b.size, height: b.size,
          background: b.color, borderRadius: b.round ? '50%' : '2px',
          animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`,
        }} />
      ))}
    </div>
  );
}
export function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [msg, onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-[101] animate-slide-down">
      <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white font-bold ${ok ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-rose-500 to-red-600'}`}>
        {ok ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
        <span>{msg}</span>
      </div>
    </div>
  );
}

// ── Mini charts ───────────────────────────────────────────────────────────────
export function Ring({ pct, label, color = '#fff' }: { pct: number; label: string; color?: string }) {
  const r = 30, c = 2 * Math.PI * r, dash = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: 78, height: 78 }}>
      <svg width={78} height={78} className="-rotate-90">
        <circle cx={39} cy={39} r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={7} />
        <circle cx={39} cy={39} r={r} fill="none" stroke={color} strokeWidth={7} strokeDasharray={`${dash} ${c}`} strokeLinecap="round" />
      </svg>
      <div className="absolute text-center"><p className="text-lg font-black leading-none">{pct.toFixed(0)}%</p><p className="text-[8px] opacity-80">{label}</p></div>
    </div>
  );
}
export function PBar({ value, max, grad }: { value: number; max: number; grad: string }) {
  return <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r ${grad} transition-all duration-700`} style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} /></div>;
}

export function CapsBanner({ caps }: { caps: any }) {
  if (!caps?.band) return <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">No policy band mapped for your level ({caps?.level || '—'}). Contact HR.</div>;
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-sky-50 border border-indigo-100 rounded-2xl p-4">
      <p className="text-xs font-black text-indigo-600 uppercase tracking-wide mb-2">Your Policy Limits · Band {caps.band}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div><p className="text-slate-400">Daily Conveyance</p><p className="font-black text-slate-700">₹{caps.local_conveyance_daily ?? '—'}</p></div>
        <div><p className="text-slate-400">Phone/Internet (mo)</p><p className="font-black text-slate-700">₹{caps.phone_monthly ?? '—'}</p></div>
        <div className="col-span-2"><p className="text-slate-400">Approved Mode</p><p className="font-black text-slate-700">{caps.approved_travel_mode || '—'}</p></div>
      </div>
      {caps.da_matrix && caps.da_matrix.A && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
          {['A', 'B', 'C'].map(g => caps.da_matrix[g] && (
            <div key={g} className="bg-white rounded-lg px-2 py-1 border border-indigo-100">
              <span className="font-bold text-indigo-500">City {g}:</span> Stay ₹{caps.da_matrix[g][0]} · DA ₹{caps.da_matrix[g][1]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
/* Where a request has reached, as a pipeline rather than a status word.
   "Submitted · Pending Manager" tells you the stage; this tells you the shape
   of the whole journey — what has cleared, what is live now, what is still
   ahead — which is the question someone actually opens a request to answer. */
/* A tour programme is finally approved by HR — Finance is told, not asked — so
   its pipeline ends differently from a claim, where Finance approves and pays. */
const CLAIM_STAGES = [
  { k: 'employee', l: 'Submitted', icon: FileText },
  { k: 'manager', l: 'Manager', icon: UserCheck },
  { k: 'hr', l: 'HR', icon: Shield },
  { k: 'finance', l: 'Finance', icon: Wallet },
  { k: 'paid', l: 'Paid', icon: BadgeCheck },
];
const TOUR_STAGES = [
  { k: 'employee', l: 'Submitted', icon: FileText },
  { k: 'manager', l: 'Manager', icon: UserCheck },
  { k: 'hr', l: 'HR', icon: Shield },
  { k: 'finance', l: 'Finance notified', icon: Mail },
];

/** index of the stage a status has *cleared* up to, and whether it died there */
function stageState(status: string) {
  const done: Record<string, number> = {
    submitted: 0, manager_approved: 1, hr_approved: 2, finance_approved: 3, paid: 4,
    manager_rejected: 0, hr_rejected: 1, finance_rejected: 2,
  };
  const rejectedAt: Record<string, number> = {
    manager_rejected: 1, hr_rejected: 2, finance_rejected: 3,
  };
  return { cleared: done[status] ?? 0, rejectedAt: rejectedAt[status] ?? null };
}

export function StageTrail({ status, statusLabel, type }: {
  status: string; statusLabel?: string; type?: string;
}) {
  const isTour = type === 'tour_sanction';
  const STAGES = isTour ? TOUR_STAGES : CLAIM_STAGES;
  const { cleared, rejectedAt } = stageState(status);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Progress</p>
        {statusLabel && (
          <p className={`text-[11px] font-black ${rejectedAt !== null ? 'text-rose-600' : 'text-indigo-600'}`}>{statusLabel}</p>
        )}
      </div>
      <div className="flex items-start">
        {STAGES.map((st, i) => {
          const isRejected = rejectedAt === i;
          // HR approval finishes a tour programme, including its "Finance
          // notified" end-cap — nothing is left pending after it.
          const done = isTour && status === 'hr_approved' ? STAGES.length - 1 : cleared;
          const isDone = !isRejected && i <= done && rejectedAt === null;
          const isCurrent = !isRejected && rejectedAt === null && i === done + 1;
          const Icon = isRejected ? XCircle : st.icon;
          const ring = isRejected ? 'bg-rose-500 text-white'
            : isDone ? 'bg-emerald-500 text-white'
            : isCurrent ? 'bg-indigo-500 text-white ih-breathe'
            : 'bg-slate-100 text-slate-300';
          return (
            <div key={st.k} className="flex-1 flex flex-col items-center relative min-w-0">
              {/* connector to the previous node, coloured by what has cleared */}
              {i > 0 && (
                <span className={`absolute top-4 right-1/2 left-0 h-0.5 -translate-y-1/2 ${
                  rejectedAt !== null && i > rejectedAt ? 'bg-slate-100'
                    : i <= (isTour && status === 'hr_approved' ? STAGES.length - 1 : cleared)
                      || rejectedAt === i ? 'bg-emerald-400' : 'bg-slate-100'}`} />
              )}
              <span style={{ ['--ih-ring' as string]: 'rgba(99,102,241,.45)' }}
                className={`relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${ring}`}>
                <Icon className="w-4 h-4" />
              </span>
              <p className={`text-[10px] font-black mt-1.5 text-center truncate w-full px-0.5 ${
                isRejected ? 'text-rose-600' : isDone ? 'text-emerald-600' : isCurrent ? 'text-indigo-600' : 'text-slate-300'}`}>
                {isRejected ? 'Rejected' : st.l}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const Pill = ({ s, label }: { s: string; label: string }) => (
  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_STYLE[s] || 'bg-slate-100 text-slate-600'}`}>{label}</span>
);

/* ── Multi-city itinerary ──────────────────────────────────────────────────────
   A 13-day tour is rarely 13 days in one place. Each stop carries its own dates,
   city and the mode used to reach it — which matters for money, not just
   tidiness: allowances are set per city grade, so costing a Delhi (A) + Kanpur
   (C) trip against a single destination gets the entitlement wrong either way.
   The journey home stays on the request as the return ticket. */
