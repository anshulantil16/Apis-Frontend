import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plane, LogOut, Plus, Trash2, Upload, CheckCircle, XCircle, Clock, FileText,
  Receipt, Car, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Paperclip, Users, Shield,
  BarChart3, TrendingUp, Wallet, Activity, User, KeyRound, ArrowRight, Sparkles,
} from 'lucide-react';

// ── Animated helpers ──────────────────────────────────────────────────────────
function useCountUp(target: number, ms = 1100) {
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
function Count({ n, prefix = '', decimals = 0 }: { n: number; prefix?: string; decimals?: number }) {
  const v = useCountUp(n || 0);
  const s = decimals ? v.toFixed(decimals) : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(v));
  return <>{prefix}{s}</>;
}
function Confetti({ show }: { show: boolean }) {
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
function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
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
function Ring({ pct, label, color = '#fff' }: { pct: number; label: string; color?: string }) {
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
function PBar({ value, max, grad }: { value: number; max: number; grad: string }) {
  return <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r ${grad} transition-all duration-700`} style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} /></div>;
}

const API = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/tada`;
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);

type User = {
  id: number; employee_id: string; name: string; role: string; level: string;
  designation: string; department: string; hq_city: string; caps: any;
};

const STATUS_STYLE: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-700', manager_approved: 'bg-blue-100 text-blue-700',
  hr_approved: 'bg-violet-100 text-violet-700', finance_approved: 'bg-emerald-100 text-emerald-700',
  paid: 'bg-emerald-600 text-white',
  manager_rejected: 'bg-rose-100 text-rose-700', hr_rejected: 'bg-rose-100 text-rose-700',
  finance_rejected: 'bg-rose-100 text-rose-700', draft: 'bg-slate-100 text-slate-600',
};

// ── Shared option lists ───────────────────────────────────────────────────────
/* Modes for reaching another city. No auto rickshaw — that's for getting around
   once you're there, and it stays in LOCAL_MODES below. */
const TRAVEL_MODES = ['Train', 'Flight', 'Bus', 'Cab / Taxi', 'Own Car', 'Own Two-Wheeler', 'Company Vehicle'];

/* "Ticket Date" only makes sense for something you buy a ticket for. Driving
   yourself has a departure, not a ticket, so the wording follows the mode. */
const journeyNoun = (mode: string) =>
  /train|flight|air|bus/i.test(mode || '') ? 'Ticket' : 'Departure';
const LOCAL_MODES = ['Cab / Taxi', 'Auto Rickshaw', 'Bus', 'Metro', 'Own Car', 'Own Two-Wheeler', 'Bike Taxi', 'E-Rickshaw'];
const LOCAL_TYPES = ['Outdoor Duty', 'Office Work', 'Client Visit', 'Bank / Govt Work', 'Site Visit', 'Vendor Meeting'];
const TIME_PREFS = [
  { v: 'early_morning', l: 'Early Morning (12 AM – 6 AM)' },
  { v: 'morning', l: 'Morning (6 AM – 12 PM)' },
  { v: 'afternoon', l: 'Afternoon (12 PM – 4 PM)' },
  { v: 'evening', l: 'Evening (4 PM – 8 PM)' },
  { v: 'night', l: 'Night (8 PM – 12 AM)' },
];

const TOUR_BLANK = {
  travel_address: '', purpose: '', destination_city: '', from_date: '', to_date: '',
  contact_number: '', sanction_number: '', travel_mode: '',
  travel_mode_date: '', travel_mode_time_pref: '', return_mode_date: '', return_mode_time_pref: '',
  // estimate: ticket/misc are typed by the employee, lodging/food/local seed
  // from policy and stay '' until the server sends the policy figure.
  est_ticket_amount: '', est_lodging_amount: '', est_food_amount: '', est_local_amount: '',
  est_misc_amount: '', advance_amount: '', mode_exception_reason: '',
};

const blankLeg = () => ({
  from_date: '', to_date: '', destination_city: '', travel_address: '', purpose: '',
  travel_mode: '', ticket_date: '', ticket_time_pref: '',
  mode_exception_reason: '', est_ticket_amount: '',
});

// inclusive day count between two yyyy-mm-dd strings; null if either is missing/invalid
function tripDays(fromDate: string, toDate: string): number | null {
  if (!fromDate || !toDate) return null;
  const from = new Date(fromDate), to = new Date(toDate);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;
  const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  return days > 0 ? days : null;
}

/* Travel-mode picker.
   Leads with the modes the employee's grade actually entitles them to, and
   keeps the rest available under a separate group — travel plans break, and a
   sanction that cannot express "no train was available" is a sanction people
   work around. Choosing from the second group is allowed but must carry a
   reason, which the approver sees. */
function TravelModePicker({ value, onChange, options, reason, onReason, className }: {
  value: string; onChange: (v: string) => void; options: any;
  reason: string; onReason: (v: string) => void; className: string;
}) {
  /* Sessions predating the entitlement grouping have a cached caps object with
     no mode_options. Fall back to the plain list rather than rendering an empty
     dropdown — an unusable form is far worse than an ungrouped one. */
  const hasGroups = !!(options?.entitled?.length || options?.exception?.length);
  const entitled: any[] = hasGroups ? options.entitled || [] : TRAVEL_MODES.map(m => ({ mode: m, note: '' }));
  const exception: any[] = hasGroups ? options.exception || [] : [];
  const isException = exception.some(o => o.mode === value);
  const picked = [...entitled, ...exception].find(o => o.mode === value);

  return (
    <div className="space-y-2">
      <select className={className} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select mode…</option>
        {entitled.length > 0 && (
          <optgroup label="✓ As per your grade">
            {entitled.map(o => <option key={o.mode} value={o.mode}>{o.mode}</option>)}
          </optgroup>
        )}
        {exception.length > 0 && (
          <optgroup label="⚠ Needs approval — emergency / exception">
            {exception.map(o => <option key={o.mode} value={o.mode}>{o.mode}</option>)}
          </optgroup>
        )}
      </select>

      {picked?.note && !isException && (
        <p className="text-[11px] text-slate-500 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px text-slate-400" />{picked.note}</p>
      )}

      {isException && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
          <p className="text-xs text-amber-800 font-bold flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
            {picked?.note || `${value} is outside your grade's entitlement.`}
          </p>
          <div>
            <label className="text-xs font-bold text-amber-700 mb-1 block">Reason for exception <span className="text-rose-500">*</span></label>
            <textarea rows={2} className={className} value={reason} onChange={e => onReason(e.target.value)}
              placeholder="e.g. no train available at short notice, medical emergency, client meeting moved up" />
          </div>
        </div>
      )}
    </div>
  );
}

// Dropdown that always includes an "Other…" option → reveals a free-text input
function SelectOther({ value, onChange, options, className, placeholder = 'Select…' }: {
  value: string; onChange: (v: string) => void; options: string[]; className?: string; placeholder?: string;
}) {
  const [other, setOther] = useState(!!value && !options.includes(value));
  return (
    <div className="space-y-2">
      <select className={className} value={other ? '__other__' : value}
        onChange={e => {
          if (e.target.value === '__other__') { setOther(true); onChange(''); }
          else { setOther(false); onChange(e.target.value); }
        }}>
        <option value="" disabled>{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__other__">Other…</option>
      </select>
      {other && <input className={className} placeholder="Please specify" value={value} onChange={e => onChange(e.target.value)} autoFocus />}
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [mode, setMode] = useState<'user' | 'admin'>('user');
  const [empId, setEmpId] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'id' | 'otp'>('id');
  const [msg, setMsg] = useState('');
  const [masked, setMasked] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (asAdmin = false) => {
    setBusy(true); setMsg('');
    try {
      const url = asAdmin ? `${API}/auth/admin-otp/` : `${API}/auth/send-otp/`;
      const body = asAdmin ? {} : { employee_id: empId.trim() };
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (r.ok) { setMode(asAdmin ? 'admin' : 'user'); setStep('otp'); setMasked(d.masked_email); } else setMsg(d.error || 'Failed');
    } catch { setMsg('Network error'); }
    setBusy(false);
  };
  const verify = async () => {
    setBusy(true); setMsg('');
    try {
      const url = mode === 'admin' ? `${API}/auth/admin-verify/` : `${API}/auth/verify-otp/`;
      const body = mode === 'admin' ? { otp: otp.trim() } : { employee_id: empId.trim(), otp: otp.trim() };
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (r.ok) { localStorage.setItem('tada_user', JSON.stringify(d.user)); onLogin(d.user); } else setMsg(d.error || 'Failed');
    } catch { setMsg('Network error'); }
    setBusy(false);
  };

  const steps = ['Employee', 'Manager', 'HR', 'Finance'];
  const features = [
    { i: Shield, t: 'Policy-checked', d: 'Every claim auto-validated against your band limits' },
    { i: Clock, t: '60-day tracking', d: 'Deadline flags so nothing lapses' },
    { i: CheckCircle, t: 'Multi-level approval', d: 'Manager → HR → Finance, fully audited' },
  ];

  return (
    <div className="min-h-full py-10 px-4 sm:px-6">
      {/* The split sits inside one card so it reads as a panel on the light
          shell rather than a full-bleed takeover. */}
      <div className="max-w-5xl mx-auto flex rounded-3xl overflow-hidden border border-slate-200 shadow-xl">
      {/* ── Brand panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 xl:w-[55%] p-10 xl:p-12 text-white relative overflow-hidden sheen bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-600 bg-[length:200%_200%] animate-gradient">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-white/10 blur-3xl animate-float-slow" />
        <div className="absolute -left-20 bottom-0 w-80 h-80 rounded-full bg-fuchsia-400/20 blur-3xl animate-float" />
        <div className="absolute right-1/3 top-1/2 w-64 h-64 rounded-full bg-cyan-300/10 blur-3xl animate-float-slow" />

        <div className="relative flex items-center gap-3 animate-slide-down">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20 animate-float"><Plane className="w-8 h-8" /></div>
          <div><h1 className="text-2xl font-black tracking-tight">APIS TA/DA Portal</h1><p className="text-white/70 text-sm">Travel &amp; Daily Allowance</p></div>
        </div>

        <div className="relative space-y-8">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/15 backdrop-blur px-3 py-1.5 rounded-full border border-white/20 mb-5">
              <Sparkles className="w-3.5 h-3.5" /> Apis India Limited
            </p>
            <h2 className="text-4xl xl:text-5xl font-black leading-[1.1]">Travel claims,<br />made simple &amp;<br /><span className="text-cyan-200">policy-perfect.</span></h2>
            <p className="text-white/75 max-w-md mt-5 text-[15px] leading-relaxed">Raise tour sanctions &amp; expense claims, attach bills, and watch them flow through approvals — all within your allowance limits, automatically.</p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className="px-3.5 py-2 bg-white/15 backdrop-blur rounded-xl text-sm font-bold border border-white/20">{s}</div>
                {i < 3 && <ChevronRight className="w-4 h-4 text-white/40" />}
              </div>
            ))}
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4 stagger">
          {features.map(f => (
            <div key={f.t} className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15 hover-lift">
              <f.i className="w-5 h-5 mb-2 text-cyan-200" />
              <p className="text-sm font-bold">{f.t}</p>
              <p className="text-[11px] text-white/60 mt-0.5 leading-snug">{f.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-indigo-100/50 blur-3xl lg:hidden" />
        <div className="w-full max-w-md relative">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><Plane className="w-6 h-6 text-white" /></div>
            <div><h1 className="font-black text-slate-900 text-lg">APIS TA/DA Portal</h1><p className="text-slate-500 text-xs">Travel &amp; Daily Allowance</p></div>
          </div>

          <div className="bg-white rounded-3xl p-8 animate-pop">
            {mode === 'admin' && (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full mb-4">
                <Shield className="w-3 h-3" /> Admin access
              </div>
            )}
            <h2 className="text-2xl font-black text-slate-900">{step === 'id' ? 'Welcome back' : 'Check your inbox'}</h2>
            <p className="text-slate-500 text-sm mb-6">{step === 'id' ? 'Sign in with your Employee ID to continue.' : `We emailed a 6-digit code to your registered address.`}</p>

            {step === 'id' ? (
              <>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Employee ID</label>
                <div className="relative mb-4">
                  <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input value={empId} onChange={e => setEmpId(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="e.g. E1001"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 transition-all font-semibold text-slate-800" />
                </div>
                <button onClick={() => send(false)} disabled={busy || !empId.trim()} className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <>Send OTP <ArrowRight className="w-4 h-4" /></>}
                </button>
                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                  <button onClick={() => send(true)} disabled={busy} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 text-xs font-bold transition-colors">
                    <Shield className="w-3.5 h-3.5" /> Admin Login (import users &amp; setup)
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-5 text-sm text-indigo-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" /> Code sent to <b>{masked}</b>
                </div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">One-Time Password</label>
                <div className="relative mb-4">
                  <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input value={otp} onChange={e => setOtp(e.target.value)} onKeyDown={e => e.key === 'Enter' && verify()} placeholder="000000" maxLength={6} autoFocus
                    className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-center text-2xl tracking-[0.4em] font-black focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 transition-all text-slate-800" />
                </div>
                <button onClick={verify} disabled={busy || otp.length < 4} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Verify &amp; Login</>}
                </button>
                <button onClick={() => { setStep('id'); setMode('user'); setOtp(''); setMsg(''); }} className="w-full text-slate-500 hover:text-slate-800 text-xs mt-3 font-semibold transition-colors">← Use a different ID</button>
              </>
            )}
            {msg && <p className="text-rose-500 text-sm mt-4 flex items-center gap-1.5 bg-rose-50 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4 shrink-0" />{msg}</p>}
          </div>
          <p className="text-center text-slate-500 text-xs mt-6">Secured by email OTP · Apis India Limited</p>
        </div>
      </div>
      </div>
    </div>
  );
}

// ── Caps banner (shows the employee their policy limits) ──────────────────────
function CapsBanner({ caps }: { caps: any }) {
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
const Pill = ({ s, label }: { s: string; label: string }) => (
  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_STYLE[s] || 'bg-slate-100 text-slate-600'}`}>{label}</span>
);

/* ── Multi-city itinerary ──────────────────────────────────────────────────────
   A 13-day tour is rarely 13 days in one place. Each stop carries its own dates,
   city and the mode used to reach it — which matters for money, not just
   tidiness: allowances are set per city grade, so costing a Delhi (A) + Kanpur
   (C) trip against a single destination gets the entitlement wrong either way.
   The journey home stays on the request as the return ticket. */
function ItineraryEditor({ legs, setLegs, modeOptions, est, inp, tripFrom, tripTo }: {
  legs: any[]; setLegs: (l: any[]) => void; modeOptions: any; est: any; inp: string;
  tripFrom: string; tripTo: string;
}) {
  const set = (i: number, patch: any) => setLegs(legs.map((l, j) => j === i ? { ...l, ...patch } : l));
  const legEst = (i: number) => est?.legs?.find((l: any) => l.seq === i);
  const money = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const nextDay = (d: string) => {
    if (!d) return '';
    const t = new Date(d); t.setDate(t.getDate() + 1);
    return t.toISOString().slice(0, 10);
  };

  /* Stops can only fall inside the trip window, so the pickers are bounded by
     it rather than letting a date through and flagging it afterwards. A stop
     also cannot end before it starts, nor start before the previous stop ends. */
  const addStop = () => {
    const last = legs[legs.length - 1];
    const start = last?.to_date ? nextDay(last.to_date) : tripFrom;
    setLegs([...legs, { ...blankLeg(), from_date: start && (!tripTo || start <= tripTo) ? start : '' }]);
  };

  if (!tripFrom || !tripTo) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4">
        <p className="text-xs text-slate-500 font-semibold">Set the overall From and To dates first</p>
        <p className="text-[11px] text-slate-400 mt-1">Each stop is picked from within your travel dates, so they need to be set before you can break the trip down.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {legs.map((leg, i) => {
        const e = legEst(i);
        return (
          <div key={i} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                Stop {i + 1}
                {e && <span className="text-indigo-400 font-bold">· grade {e.city_grade} · {e.days}d / {e.nights}n</span>}
              </span>
              {legs.length > 1 && (
                <button onClick={() => setLegs(legs.filter((_, j) => j !== i))}
                  className="text-rose-400 hover:text-rose-600 flex items-center gap-1 text-xs font-bold"><Trash2 className="w-4 h-4" />Remove</button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">Destination City
                {e?.city_grade && <span className="ml-1.5 text-indigo-500">· grade {e.city_grade}</span>}</label>
                <input className={inp} value={leg.destination_city} placeholder="e.g. Mumbai"
                  onChange={e2 => set(i, { destination_city: e2.target.value })} />
                <p className="text-[11px] text-slate-400 mt-1">City only — sets this stop's limits</p></div>
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">Travel Address <span className="text-slate-300">(optional)</span></label>
                <input className={inp} value={leg.travel_address} placeholder="office / site / hotel address"
                  onChange={e2 => set(i, { travel_address: e2.target.value })} /></div>
              <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 mb-1 block">Purpose at this stop <span className="text-slate-300">(optional)</span></label>
                <input className={inp} value={leg.purpose} onChange={e2 => set(i, { purpose: e2.target.value })} /></div>
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">From Date</label>
                <input type="date" className={inp} value={leg.from_date}
                  min={legs[i - 1]?.to_date ? nextDay(legs[i - 1].to_date) : tripFrom} max={tripTo}
                  onChange={e2 => {
                    const v = e2.target.value;
                    // keep the end from falling behind the new start
                    set(i, { from_date: v, ...(leg.to_date && leg.to_date < v ? { to_date: v } : {}) });
                  }} /></div>
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">To Date</label>
                <input type="date" className={inp} value={leg.to_date}
                  min={leg.from_date || tripFrom} max={tripTo}
                  onChange={e2 => set(i, { to_date: e2.target.value })} /></div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500 mb-1 block">How you travel to {leg.destination_city || 'this stop'}</label>
                <TravelModePicker className={inp} value={leg.travel_mode} options={modeOptions}
                  onChange={v => set(i, { travel_mode: v, mode_exception_reason: '' })}
                  reason={leg.mode_exception_reason} onReason={v => set(i, { mode_exception_reason: v })} />
              </div>

              {leg.travel_mode && (
                <>
                  <div><label className="text-xs font-bold text-slate-500 mb-1 block">{journeyNoun(leg.travel_mode)} Date</label>
                    <input type="date" className={inp} value={leg.ticket_date} min={tripFrom} max={tripTo}
                      onChange={e2 => set(i, { ticket_date: e2.target.value })} /></div>
                  <div><label className="text-xs font-bold text-slate-500 mb-1 block">Preferred Time</label>
                    <select className={inp} value={leg.ticket_time_pref} onChange={e2 => set(i, { ticket_time_pref: e2.target.value })}>
                      <option value="">Select time…</option>
                      {TIME_PREFS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                    </select></div>
                </>
              )}

              <div><label className="text-xs font-bold text-slate-500 mb-1 block">{journeyNoun(leg.travel_mode)} Cost to this stop (₹)</label>
                <input type="number" min="0" className={inp} value={leg.est_ticket_amount} placeholder="0"
                  onChange={e2 => set(i, { est_ticket_amount: e2.target.value })} /></div>

              {e && (
                <div className="flex flex-col justify-end">
                  <p className="text-[11px] text-slate-400 mb-1">Policy for {e.city} (grade {e.city_grade})</p>
                  <div className="flex flex-wrap gap-1 text-[11px] font-semibold">
                    <span className="bg-white border border-slate-200 rounded px-1.5 py-0.5">Stay {money(e.lines.lodging)}</span>
                    <span className="bg-white border border-slate-200 rounded px-1.5 py-0.5">DA {money(e.lines.food)}</span>
                    <span className="bg-white border border-slate-200 rounded px-1.5 py-0.5">Local {money(e.lines.local)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button onClick={addStop}
        className="w-full border-2 border-dashed border-indigo-200 text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-2xl py-3 font-bold text-sm flex items-center justify-center gap-2 transition-all">
        <Plus className="w-4 h-4" />Add another stop
      </button>
    </div>
  );
}

/* ── Settlement: what was sanctioned vs what is being claimed ──────────────────
   An approver looking at a bare claim total has nothing to judge it against.
   Shown side by side, an over-run is visible per head, and the advance already
   paid is netted off so the figure at the bottom is the money that actually
   still has to move. */
const SETTLE_HEADS: { k: string; l: string }[] = [
  { k: 'travel', l: 'Travel' }, { k: 'lodging', l: 'Lodging' }, { k: 'food', l: 'Food / DA' },
  { k: 'local_transport', l: 'Conveyance' }, { k: 'misc', l: 'Miscellaneous' },
];

function SettlementTable({ sanction, claimedByCat, claimTotal }: {
  sanction: any; claimedByCat: Record<string, number>; claimTotal: number;
}) {
  const money = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
  const heads = sanction.heads || {};
  const advance = sanction.advance_amount || 0;
  const net = claimTotal - advance;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-indigo-100 rounded-2xl p-4 space-y-3">
      <h4 className="font-black text-slate-700 text-sm flex items-center gap-2">
        <Wallet className="w-4 h-4 text-indigo-500" />Sanctioned vs Claimed
      </h4>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-400">
              <tr>{['Head', 'Sanctioned', 'Claimed', 'Difference'].map((h, i) => (
                <th key={h} className={`px-3 py-1.5 font-black uppercase tracking-widest ${i ? 'text-right' : 'text-left'}`}>{h}</th>))}</tr>
            </thead>
            <tbody>
              {SETTLE_HEADS.map(({ k, l }) => {
                const est = heads[k] || 0, act = claimedByCat[k] || 0;
                if (!est && !act) return null;
                const diff = act - est;
                return (
                  <tr key={k} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 font-bold text-slate-700">{l}</td>
                    <td className="px-3 py-1.5 text-right text-slate-500">{money(est)}</td>
                    <td className="px-3 py-1.5 text-right font-bold text-slate-800">{money(act)}</td>
                    <td className={`px-3 py-1.5 text-right font-bold ${diff > 0 ? 'text-rose-600' : diff < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {diff === 0 ? '—' : `${diff > 0 ? '+' : '−'}${money(Math.abs(diff))}`}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-slate-200 bg-slate-50/60">
                <td className="px-3 py-2 font-black text-slate-700">Total</td>
                <td className="px-3 py-2 text-right font-bold text-slate-600">{money(sanction.estimate_amount)}</td>
                <td className="px-3 py-2 text-right font-black text-slate-900">{money(claimTotal)}</td>
                <td className={`px-3 py-2 text-right font-black ${claimTotal > sanction.estimate_amount ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {claimTotal === sanction.estimate_amount ? '—' : `${claimTotal > sanction.estimate_amount ? '+' : '−'}${money(Math.abs(claimTotal - sanction.estimate_amount))}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {claimTotal > sanction.estimate_amount && (
        <p className="text-xs text-amber-800 font-semibold bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Claim is {money(claimTotal - sanction.estimate_amount)} over what was sanctioned — expect your approver to ask why.
        </p>
      )}

      <div className="grid sm:grid-cols-3 gap-2">
        <div className="bg-white rounded-xl border border-slate-200 px-3 py-2">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Claimed</p>
          <p className="text-lg font-black text-slate-800">{money(claimTotal)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-3 py-2">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Advance Taken</p>
          <p className="text-lg font-black text-amber-600">− {money(advance)}</p>
        </div>
        <div className={`rounded-xl border px-3 py-2 ${net >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{net >= 0 ? 'Payable to you' : 'You must return'}</p>
          <p className={`text-lg font-black ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(Math.abs(net))}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Pre-travel cost estimate ──────────────────────────────────────────────────
   Lodging / food / local conveyance are seeded from the policy matrices for the
   employee's band × city grade × trip length. Ticket fare and miscellaneous are
   entered by the employee — the policy defines an entitled travel *class*, not
   rupee fares. Everything stays editable; over-ceiling values are flagged for
   the approver rather than blocked. */
function EstimateBlock({ est, tour, setTour, total, warnings, inp, maxAdvance, advanceOver }: {
  est: any; tour: any; setTour: (t: any) => void; total: number; warnings: string[]; inp: string;
  maxAdvance: number; advanceOver: boolean;
}) {
  const money = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const rate = (v: any, unit: string) =>
    v == null ? 'not set in policy' : v === 'actual' ? 'as per actuals' : `${money(v)} ${unit}`;

  // A multi-stop estimate carries a legs[] array; a single-destination one carries rates/days.
  const multi = Array.isArray(est?.legs) && est.legs.length > 0;
  const days = multi ? est.total_days : est?.days;
  const nights = multi ? est.total_nights : est?.nights;

  /* The policy figures need a destination (for city grade) and both dates (for
     nights/days). Until then show the section greyed out and say what's missing,
     rather than hiding it — an invisible section reads as a missing feature. */
  if (!est) {
    const missing = [
      !tour.destination_city && 'destination city',
      !tour.from_date && 'from date',
      !tour.to_date && 'to date',
    ].filter(Boolean);
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4">
        <h4 className="font-black text-slate-500 text-sm flex items-center gap-2"><Wallet className="w-4 h-4 text-slate-400" />Estimated Cost of Travel</h4>
        <p className="text-xs text-slate-400 mt-1.5">Fill in the {missing.join(' and ')} above — your hotel, food and conveyance limits are then worked out from the travel policy for your level.</p>
      </div>
    );
  }

  const field = (key: string, label: string, hint: string, locked?: boolean) => (
    <div>
      <label className="text-xs font-bold text-slate-500 mb-1 block">{label}</label>
      <input type="number" min="0" className={inp} value={tour[key]}
        onChange={e => setTour({ ...tour, [key]: e.target.value })} placeholder="0" />
      <p className={`text-[11px] mt-1 ${locked ? 'text-slate-400' : 'text-indigo-500'}`}>{hint}</p>
    </div>
  );

  const advance = parseFloat(tour.advance_amount) || 0;
  return (
    <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-indigo-100 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="font-black text-slate-700 text-sm flex items-center gap-2"><Wallet className="w-4 h-4 text-indigo-500" />Estimated Cost of Travel</h4>
        <div className="flex items-center gap-2 text-[11px] font-bold">
          {multi
            ? <span className="bg-white border border-indigo-100 text-indigo-600 px-2.5 py-1 rounded-lg">{est.legs.length} stop{est.legs.length === 1 ? '' : 's'}</span>
            : <span className="bg-white border border-indigo-100 text-indigo-600 px-2.5 py-1 rounded-lg">Grade {est.city_grade} city</span>}
          <span className="bg-white border border-indigo-100 text-indigo-600 px-2.5 py-1 rounded-lg">{days} day{days === 1 ? '' : 's'} · {nights} night{nights === 1 ? '' : 's'}</span>
          {est.band && <span className="bg-white border border-indigo-100 text-indigo-600 px-2.5 py-1 rounded-lg">Band {est.band}</span>}
        </div>
      </div>

      {est.entitled_mode && (
        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 flex items-start gap-2">
          <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>Approved travel class for your level: <b className="text-slate-800">{est.entitled_mode}</b></span>
        </div>
      )}

      {multi && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-400">
                <tr>{['Stop', 'Grade', 'Days', 'Ticket', 'Stay', 'DA', 'Local', 'Subtotal'].map(h => (
                  <th key={h} className={`px-2.5 py-1.5 font-bold ${h === 'Stop' ? 'text-left' : 'text-right'}`}>{h}</th>))}</tr>
              </thead>
              <tbody>
                {est.legs.map((l: any) => (
                  <tr key={l.seq} className="border-t border-slate-100">
                    <td className="px-2.5 py-1.5 font-bold text-slate-700">{l.city || `Stop ${l.seq + 1}`}</td>
                    <td className="px-2.5 py-1.5 text-right text-slate-500">{l.city_grade}</td>
                    <td className="px-2.5 py-1.5 text-right text-slate-500">{l.days}d / {l.nights}n</td>
                    <td className="px-2.5 py-1.5 text-right text-slate-600">{money(l.lines.ticket)}</td>
                    <td className="px-2.5 py-1.5 text-right text-slate-600">{money(l.lines.lodging)}</td>
                    <td className="px-2.5 py-1.5 text-right text-slate-600">{money(l.lines.food)}</td>
                    <td className="px-2.5 py-1.5 text-right text-slate-600">{money(l.lines.local)}</td>
                    <td className="px-2.5 py-1.5 text-right font-black text-slate-800">{money(l.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 px-2.5 py-1.5 border-t border-slate-100">Each stop is costed at its own city grade. Nights follow where you sleep — the last stop drops one night for the journey home.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {multi
          ? <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Travel Cost (₹)</label>
              <div className="w-full border-2 border-slate-100 bg-slate-100 rounded-xl px-3 py-2.5 text-sm font-black text-slate-600">{money(est.lines.ticket)}</div>
              <p className="text-[11px] text-slate-400 mt-1">Total of the per-stop costs above</p>
            </div>
          : field('est_ticket_amount', 'Travel Cost (₹)', 'Onward + return, as per approved class')}
        {field('est_lodging_amount', 'Hotel / Lodging (₹)', multi ? 'Sum across all stops, at each stop’s grade' : `Policy: ${rate(est.rates.stay_per_night, 'per night')} × ${est.nights}`)}
        {field('est_food_amount', 'Food / DA (₹)', multi ? 'Sum across all stops, at each stop’s grade' : `Policy: ${rate(est.rates.da_per_day, 'per day')} × ${est.days}`)}
        {field('est_local_amount', 'Conveyance (₹)', multi ? `Policy rate × ${days} days` : `Policy: ${rate(est.rates.local_per_day, 'per day')} × ${est.days}`)}
        {field('est_misc_amount', 'Miscellaneous (₹)', 'Bills mandatory for reimbursement', true)}
      </div>

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-800 font-semibold flex items-start gap-2"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w}</p>
          ))}
          <p className="text-[11px] text-amber-600 pt-0.5">You can still submit — these are shown to your approver.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3 pt-1 border-t border-indigo-100">
        <div className="pt-3">
          <label className="text-xs font-bold text-slate-500 mb-1 block">Advance Required (₹)</label>
          <input type="number" min="0" max={maxAdvance || undefined} value={tour.advance_amount}
            onChange={e => setTour({ ...tour, advance_amount: e.target.value })} placeholder="0"
            className={advanceOver
              ? 'w-full border-2 border-rose-300 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-700 bg-rose-50/60 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all'
              : inp} />
          {advanceOver ? (
            <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
              Most you can draw is {money(maxAdvance)} — the {money(total)} estimate plus 10%. Lower this to submit.
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">
              Paid before departure · adjusted against your final claim
              {total > 0 && <> · up to {money(maxAdvance)}</>}
            </p>
          )}
        </div>
        <div className="pt-3 flex flex-col justify-center bg-white rounded-xl border border-indigo-100 px-4 py-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Total Estimated Expense</p>
          <p className="text-2xl font-black text-slate-800 leading-tight">{money(total)}</p>
          {advance > 0 && (
            <p className="text-[11px] text-slate-500 mt-0.5">Advance {money(advance)} · balance on claim {money(Math.max(0, total - advance))}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Employee: New Request forms ───────────────────────────────────────────────
function NewRequest({ user, onDone }: { user: User; onDone: () => void }) {
  const [type, setType] = useState<'tour_sanction' | 'travel_expense' | 'local_travel'>('tour_sanction');
  /* Refresh the policy caps on mount. The user object is cached in
     localStorage at login, so a session opened before a policy change would
     otherwise keep showing stale limits and mode entitlements. */
  const [caps, setCaps] = useState<any>(user.caps);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/caps/?level=${encodeURIComponent(user.level || '')}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !cancelled) setCaps(d); })
      .catch(() => { /* keep the cached caps */ });
    return () => { cancelled = true; };
  }, [user.level]);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null);
  const [formKey, setFormKey] = useState(0); // bump to remount SelectOther dropdowns after reset

  // celebrate on success → confetti + toast, then hand off after a beat
  const cheer = (message: string) => {
    setToast({ t: message || 'Submitted for approval 🎉', ok: true });
    setCelebrate(true); setFormKey(k => k + 1);
    setTimeout(() => setCelebrate(false), 1600);
    setTimeout(() => onDone(), 1500);
  };

  // tour sanction
  const [tour, setTour] = useState<any>(TOUR_BLANK);
  const [est, setEst] = useState<any>(null);      // policy estimate from the server
  const [multiCity, setMultiCity] = useState(false);
  const [legs, setLegs] = useState<any[]>([blankLeg()]);
  const seededRef = useRef<any>({});   // last policy figures written into the form
  // travel expense
  const [texp, setTexp] = useState<any>({ destination_city: '', from_date: '', to_date: '', purpose: '', sanction_number: '' });
  /* Approved trips still waiting on their bills. A claim filed against one is
     settled line by line against what was sanctioned, and the advance already
     drawn is netted off — so the claim form leads with picking that trip. */
  const [claimable, setClaimable] = useState<any[]>([]);
  const [sanctionId, setSanctionId] = useState<number | null>(null);
  const sanction = useMemo(() => claimable.find(s => s.id === sanctionId) || null, [claimable, sanctionId]);

  useEffect(() => {
    if (type !== 'travel_expense') return;
    let cancelled = false;
    fetch(`${API}/requests/claimable/?employee_id=${encodeURIComponent(user.employee_id)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !cancelled) setClaimable(d.sanctions || []); })
      .catch(() => { /* claiming without a sanction stays possible */ });
    return () => { cancelled = true; };
  }, [type, user.employee_id, formKey]);   // formKey bumps after a submit, refetching the list

  // Picking a trip fills in its details so they aren't retyped.
  const pickSanction = (s: any | null) => {
    setSanctionId(s ? s.id : null);
    setTexp((p: any) => ({
      ...p,
      destination_city: s ? s.destination_city : '',
      from_date: s ? s.from_date || '' : '',
      to_date: s ? s.to_date || '' : '',
      sanction_number: s ? s.sanction_number || '' : '',
      purpose: s ? s.purpose || '' : '',
    }));
  };

  const [items, setItems] = useState<any[]>([{ category: 'travel', date: '', description: '', from_location: '', to_location: '', mode: '', km: '', claimed_amount: '', bill: null }]);
  // local travel
  const [local, setLocal] = useState<any>({ local_travel_type: 'Outdoor Duty', from_date: '', to_date: '', purpose: '' });
  const [lrows, setLrows] = useState<any[]>([{ date: '', purpose: '', from_location: '', to_location: '', mode: 'Cab', km: '', amount: '' }]);

  // Claimed so far per category, for the sanctioned-vs-claimed table.
  const claimedByCat = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) m[it.category] = (m[it.category] || 0) + (parseFloat(it.claimed_amount) || 0);
    return m;
  }, [items]);
  const claimTotal = useMemo(
    () => items.reduce((s: number, it: any) => s + (parseFloat(it.claimed_amount) || 0), 0), [items]);

  /* Pull the policy estimate whenever destination / dates / mode change, and
     seed the lodging-food-local fields with the policy figure. The employee can
     override them; anything above the ceiling is flagged (here and again on the
     server, which recomputes rather than trusting what the browser posts). */
  /* Carry each leg's own index so the server can hand costs back to the right
     stop — it sorts legs by date internally, and incomplete legs are filtered
     out here, so position in this array is not a stable identity. */
  const readyLegs = useMemo(
    () => legs.map((l, i) => ({ ...l, seq: i }))
              .filter(l => l.destination_city && l.from_date && l.to_date),
    [legs]);

  useEffect(() => {
    if (type !== 'tour_sanction') return;
    const { destination_city, from_date, to_date, travel_mode } = tour;
    // Multi-city costs the itinerary; single-destination costs the one city.
    if (multiCity ? readyLegs.length === 0 : (!destination_city || !from_date || !to_date)) {
      setEst(null); return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = multiCity
          ? await fetch(`${API}/estimate/`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ employee_id: user.employee_id, from_date, to_date, legs: readyLegs }),
            })
          : await fetch(`${API}/estimate/?` + new URLSearchParams({
              employee_id: user.employee_id, city: destination_city,
              from_date, to_date, mode: travel_mode || '',
            }));
        if (!r.ok) return;
        const d = await r.json();
        if (cancelled) return;
        setEst(d);
        /* Re-seed the policy-driven heads. A field counts as untouched if it is
           still empty or still holds exactly what we last seeded into it — only
           then do we overwrite. Comparing against the previous seed (rather than
           just "is it empty") is what makes the figures follow a change of dates
           or destination; keying off empty alone left the first seeded number
           frozen in place while the policy hint beside it moved on. */
        setTour((prev: any) => {
          const next = { ...prev };
          const seeded = seededRef.current;
          for (const [key, val] of [
            ['est_lodging_amount', d.lines.lodging],
            ['est_food_amount', d.lines.food],
            ['est_local_amount', d.lines.local],
          ] as [string, number][]) {
            if (prev[key] === '' || prev[key] === seeded[key]) next[key] = String(val);
          }
          // In multi-city the fare is the sum of the per-stop fares, not an input.
          if (multiCity) next.est_ticket_amount = String(d.lines.ticket);
          seededRef.current = {
            est_lodging_amount: String(d.lines.lodging),
            est_food_amount: String(d.lines.food),
            est_local_amount: String(d.lines.local),
          };
          return next;
        });
      } catch { /* estimate is advisory — a failed fetch must not block the form */ }
    }, 300);   // debounce: cities are typed character by character
    return () => { cancelled = true; clearTimeout(t); };
  }, [type, multiCity, readyLegs, tour.destination_city, tour.from_date, tour.to_date, tour.travel_mode, user.employee_id]);

  // Running total of the estimate heads — what actually goes for approval.
  const estTotal = useMemo(() => {
    const n = (v: any) => parseFloat(v) || 0;
    return n(tour.est_ticket_amount) + n(tour.est_lodging_amount) + n(tour.est_food_amount)
         + n(tour.est_local_amount) + n(tour.est_misc_amount);
  }, [tour.est_ticket_amount, tour.est_lodging_amount, tour.est_food_amount, tour.est_local_amount, tour.est_misc_amount]);

  /* An advance may run a little over the estimate — trips do — but not
     unboundedly, since this is cash released before departure. Over the
     ceiling the form blocks submission rather than warning, matching the
     server, which refuses it outright. */
  const advanceTolerance = est?.advance_tolerance ?? 0.10;
  const maxAdvance = useMemo(() => Math.round(estTotal * (1 + advanceTolerance)), [estTotal, advanceTolerance]);
  const advanceOver = estTotal > 0 && (parseFloat(tour.advance_amount) || 0) > maxAdvance;

  // Client-side mirror of policy.validate_estimate — instant feedback only.
  const estWarnings = useMemo(() => {
    if (!est) return [];
    const out: string[] = [];
    const over = (val: any, cap: number | null, label: string) => {
      if (cap != null && (parseFloat(val) || 0) > cap) out.push(`${label} is above the policy ceiling of ₹${cap.toLocaleString('en-IN')}`);
    };
    over(tour.est_lodging_amount, est.caps?.lodging, 'Lodging');
    over(tour.est_food_amount, est.caps?.food, 'Food / DA');
    over(tour.est_local_amount, est.caps?.local, 'Conveyance');
    const legFlags = (est.legs || []).flatMap((l: any) =>
      (l.mode_flags || []).map((f: string) => `${l.city || `Stop ${l.seq + 1}`}: ${f}`));
    return [...out, ...(est.itinerary_flags || []), ...legFlags, ...(est.mode_flags || [])];
  }, [est, tour.est_lodging_amount, tour.est_food_amount, tour.est_local_amount]);

  const submitTour = async () => {
    setBusy(true); setMsg(null);
    const payload: any = { ...tour, employee_id: user.employee_id };
    if (multiCity) payload.legs = readyLegs;
    const r = await fetch(`${API}/requests/tour-sanction/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await r.json(); setMsg({ t: d.message || d.error, ok: r.ok }); setBusy(false);
    if (r.ok) { setTour(TOUR_BLANK); setEst(null); setLegs([blankLeg()]); setMultiCity(false); cheer(d.message); }
  };
  const submitTexp = async () => {
    setBusy(true); setMsg(null);
    const fd = new FormData();
    const payload = { ...texp, employee_id: user.employee_id, sanction_id: sanctionId,
                      items: items.map(({ bill, ...i }) => i) };
    fd.append('payload', JSON.stringify(payload));
    fd.append('employee_id', user.employee_id);
    items.forEach((it, i) => { if (it.bill) fd.append(`bill_${i}`, it.bill); });
    const r = await fetch(`${API}/requests/travel-expense/`, { method: 'POST', body: fd });
    const d = await r.json(); setMsg({ t: d.message || d.error, ok: r.ok }); setBusy(false);
    if (r.ok) { setItems([{ category: 'travel', date: '', description: '', from_location: '', to_location: '', mode: '', km: '', claimed_amount: '', bill: null }]); pickSanction(null); cheer(d.message); }
  };
  const submitLocal = async () => {
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.append('payload', JSON.stringify({ ...local, employee_id: user.employee_id, items: lrows }));
    fd.append('employee_id', user.employee_id);
    const r = await fetch(`${API}/requests/local-travel/`, { method: 'POST', body: fd });
    const d = await r.json(); setMsg({ t: d.message || d.error, ok: r.ok }); setBusy(false);
    if (r.ok) { setLrows([{ date: '', purpose: '', from_location: '', to_location: '', mode: 'Cab', km: '', amount: '' }]); cheer(d.message); }
  };

  const inp = 'w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all bg-slate-50/50 focus:bg-white';
  const CATS = [{ k: 'travel', l: 'Travel Details' }, { k: 'lodging', l: 'Lodging' }, { k: 'food', l: 'Food / DA' }, { k: 'local_transport', l: 'Local Transport' }, { k: 'misc', l: 'Miscellaneous' }];

  const TYPES = [
    { k: 'tour_sanction', l: 'Tour Programme Sanction', d: 'Pre-travel approval', i: FileText, grad: 'from-sky-500 to-blue-600' },
    { k: 'travel_expense', l: 'Travelling Expenses', d: 'Post-travel claim + bills', i: Receipt, grad: 'from-violet-500 to-indigo-600' },
    { k: 'local_travel', l: 'Local Travel', d: 'City conveyance', i: Car, grad: 'from-emerald-500 to-teal-600' },
  ];
  const active = TYPES.find(t => t.k === type)!;
  const formHead = (t: typeof TYPES[number]) => (
    <div className={`bg-gradient-to-r ${t.grad} rounded-2xl p-5 flex items-center gap-4 text-white relative overflow-hidden`}>
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shrink-0"><t.i className="w-6 h-6" /></div>
      <div className="relative"><h3 className="font-black text-lg leading-tight">{t.l}</h3><p className="text-white/80 text-sm">{t.d}</p></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Confetti show={celebrate} />
      {toast && <Toast msg={toast.t} ok={toast.ok} onClose={() => setToast(null)} />}
      <CapsBanner caps={caps} />
      <div className="grid sm:grid-cols-3 gap-3 stagger">
        {TYPES.map(t => (
          <button key={t.k} onClick={() => { setType(t.k as any); setMsg(null); }}
            className={`hover-lift text-left p-4 rounded-2xl border-2 transition-all ${type === t.k ? 'border-transparent bg-gradient-to-br ' + t.grad + ' text-white shadow-lg scale-[1.03]' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${type === t.k ? 'bg-white/20' : 'bg-slate-100'}`}><t.i className={`w-5 h-5 ${type === t.k ? 'text-white' : 'text-indigo-500'}`} /></div>
            <p className="font-black text-sm leading-tight">{t.l}</p>
            <p className={`text-xs mt-0.5 ${type === t.k ? 'text-white/80' : 'text-slate-400'}`}>{t.d}</p>
          </button>
        ))}
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>{msg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg.t}</div>}

      {type === 'tour_sanction' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-rise">
          {formHead(active)}
          <div className="grid md:grid-cols-2 gap-3">
            {/* Address and city belong to a destination, so in a multi-city trip
                they live on each stop instead of once on the request. */}
            {!multiCity && <div><label className="text-xs font-bold text-slate-500 mb-1 block">Destination City{est?.city_grade && <span className="ml-1.5 text-indigo-500">· grade {est.city_grade}</span>}</label><input className={inp} value={tour.destination_city} onChange={e => setTour({ ...tour, destination_city: e.target.value })} placeholder="e.g. Mumbai" /><p className="text-[11px] text-slate-400 mt-1">City only — this sets your stay and DA limits</p></div>}
            {!multiCity && <div><label className="text-xs font-bold text-slate-500 mb-1 block">Travel Address <span className="text-slate-300">(optional)</span></label><input className={inp} value={tour.travel_address} onChange={e => setTour({ ...tour, travel_address: e.target.value })} placeholder="office / site / hotel address" /></div>}
            <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 mb-1 block">Purpose of Journey <span className="text-slate-300">{multiCity ? '(overall — each stop can add its own)' : ''}</span></label><input className={inp} value={tour.purpose} onChange={e => setTour({ ...tour, purpose: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">From Date</label><input type="date" className={inp} value={tour.from_date} onChange={e => setTour({ ...tour, from_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">To Date</label><input type="date" className={inp} value={tour.to_date} onChange={e => setTour({ ...tour, to_date: e.target.value })} /></div>
            {tripDays(tour.from_date, tour.to_date) !== null && (
              <div className="md:col-span-2 -mt-1 flex items-center justify-between flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">{tripDays(tour.from_date, tour.to_date)} day{tripDays(tour.from_date, tour.to_date) === 1 ? '' : 's'} of travel</span>
                {est && multiCity && (
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${est.total_days === tripDays(tour.from_date, tour.to_date) ? 'text-emerald-600 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                    {est.total_days} of {tripDays(tour.from_date, tour.to_date)} days assigned to a city
                  </span>
                )}
              </div>
            )}
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Contact Number</label><input className={inp} value={tour.contact_number} onChange={e => setTour({ ...tour, contact_number: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Sanction Number <span className="text-slate-300">(from manager)</span></label><input className={inp} value={tour.sanction_number} onChange={e => setTour({ ...tour, sanction_number: e.target.value })} /></div>
            <div className="md:col-span-2 pt-1">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-bold text-slate-600">Travelling to more than one city?</p>
                  <p className="text-[11px] text-slate-400">Break the trip into stops — each is costed at its own city grade.</p>
                </div>
                <button type="button" onClick={() => {
                  const on = !multiCity;
                  setMultiCity(on);
                  // Drop the fields that belong to the mode being left, so a
                  // leftover single-city destination can't shadow the itinerary.
                  setTour((p: any) => ({ ...p,
                    destination_city: on ? '' : p.destination_city,
                    travel_address: on ? '' : p.travel_address,
                    travel_mode: on ? '' : p.travel_mode, mode_exception_reason: '' }));
                  // first stop starts when the trip does — one less thing to retype
                  if (on) setLegs(ls => ls.map((l, i) => i === 0 && !l.from_date ? { ...l, from_date: tour.from_date } : l));
                  setEst(null);
                }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${multiCity ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                  {multiCity ? '✓ Multi-city trip' : 'Add stops'}
                </button>
              </div>
            </div>

            {!multiCity && (
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 mb-1 block">Travel Mode
                {caps?.approved_travel_mode && <span className="text-slate-300 font-semibold"> · your grade allows {caps.approved_travel_mode}</span>}
              </label>
              <TravelModePicker key={formKey} className={inp} value={tour.travel_mode}
                onChange={v => setTour({ ...tour, travel_mode: v, mode_exception_reason: '' })}
                options={caps?.mode_options}
                reason={tour.mode_exception_reason}
                onReason={v => setTour({ ...tour, mode_exception_reason: v })} />
            </div>
            )}
            {!multiCity && tour.travel_mode && (
              <>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Onward {journeyNoun(tour.travel_mode)} Date <span className="text-slate-300">({tour.travel_mode})</span></label><input type="date" className={inp} value={tour.travel_mode_date} onChange={e => setTour({ ...tour, travel_mode_date: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Onward Preferred Time</label>
                  <select className={inp} value={tour.travel_mode_time_pref} onChange={e => setTour({ ...tour, travel_mode_time_pref: e.target.value })}>
                    <option value="">Select time…</option>
                    {TIME_PREFS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Return {journeyNoun(tour.travel_mode)} Date <span className="text-slate-300">({tour.travel_mode})</span></label><input type="date" className={inp} value={tour.return_mode_date} onChange={e => setTour({ ...tour, return_mode_date: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Return Preferred Time</label>
                  <select className={inp} value={tour.return_mode_time_pref} onChange={e => setTour({ ...tour, return_mode_time_pref: e.target.value })}>
                    <option value="">Select time…</option>
                    {TIME_PREFS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          {multiCity && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-black text-slate-700 text-sm">Itinerary</h4>
                <span className="text-[11px] text-slate-400">in the order you travel</span>
              </div>
              <ItineraryEditor legs={legs} setLegs={setLegs} modeOptions={caps?.mode_options} est={est} inp={inp}
                tripFrom={tour.from_date} tripTo={tour.to_date} />

              <div className="grid md:grid-cols-2 gap-3 bg-slate-50/70 border border-slate-200 rounded-2xl p-4">
                <div className="md:col-span-2"><p className="text-xs font-bold text-slate-600">Journey home</p><p className="text-[11px] text-slate-400">Your return from the last stop</p></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Return {journeyNoun(legs[legs.length - 1]?.travel_mode)} Date</label><input type="date" className={inp} value={tour.return_mode_date} min={tour.from_date} max={tour.to_date} onChange={e => setTour({ ...tour, return_mode_date: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Return Preferred Time</label>
                  <select className={inp} value={tour.return_mode_time_pref} onChange={e => setTour({ ...tour, return_mode_time_pref: e.target.value })}>
                    <option value="">Select time…</option>
                    {TIME_PREFS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          <EstimateBlock est={est} tour={tour} setTour={setTour} total={estTotal} warnings={estWarnings} inp={inp}
            maxAdvance={maxAdvance} advanceOver={advanceOver} />

          <button onClick={submitTour} disabled={busy || advanceOver} className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all">{busy ? <><RefreshCw className="w-4 h-4 animate-spin" />Submitting…</> : <><CheckCircle className="w-4 h-4" />Submit for Approval</>}</button>
        </div>
      )}

      {type === 'travel_expense' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-rise">
          {formHead(active)}

          {/* Which approved trip these bills belong to. Filing against the
              sanction is what lets the approver see estimate vs actual and
              net off the advance already paid. */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-black text-slate-600">Which trip are you claiming for?</p>
              {claimable.length > 0 && <span className="text-[11px] font-bold text-indigo-500">{claimable.length} approved trip{claimable.length === 1 ? '' : 's'} awaiting bills</span>}
            </div>

            {claimable.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl px-3 py-2.5">
                <p className="text-xs text-slate-500 font-semibold">No approved trips waiting on bills</p>
                <p className="text-[11px] text-slate-400 mt-0.5">You can still file a standalone claim below for travel that wasn't pre-sanctioned.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {claimable.map(s => {
                  const on = s.id === sanctionId;
                  return (
                    <button key={s.id} type="button" onClick={() => pickSanction(on ? null : s)}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${on
                        ? 'border-indigo-500 bg-indigo-50/60 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black text-sm text-slate-800 truncate">{s.destination_city || 'Trip'}</p>
                        {on && <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{s.from_date} → {s.to_date}{s.number_of_days ? ` · ${s.number_of_days}d` : ''}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5 text-[11px] font-bold">
                        <span className="bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">Est ₹{fmt(s.estimate_amount)}</span>
                        {s.advance_amount > 0 && <span className="bg-amber-50 text-amber-700 rounded px-1.5 py-0.5">Advance ₹{fmt(s.advance_amount)}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-4 gap-3">
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Destination City</label><input className={inp} value={texp.destination_city} onChange={e => setTexp({ ...texp, destination_city: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">From</label><input type="date" className={inp} value={texp.from_date} onChange={e => setTexp({ ...texp, from_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">To</label><input type="date" className={inp} value={texp.to_date} onChange={e => setTexp({ ...texp, to_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Sanction No.</label><input className={inp} value={texp.sanction_number} onChange={e => setTexp({ ...texp, sanction_number: e.target.value })} /></div>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-xs text-rose-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><b>ATTENTION:</b>&nbsp;Attaching bills/invoices is mandatory. Bills must show <b>Apis India Ltd</b> &amp; GSTIN <b>05AAACM0656K1ZL</b>. No bill → no approval.</div>
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">Expense Line {i + 1}</span>
                  {items.length > 1 && <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-rose-400 hover:text-rose-600 flex items-center gap-1 text-xs font-bold"><Trash2 className="w-4 h-4" />Remove</button>}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="col-span-2 lg:col-span-2"><label className="text-xs font-bold text-slate-500 mb-1 block">Category</label>
                    <select className={inp} value={it.category} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}>{CATS.map(c => <option key={c.k} value={c.k}>{c.l}</option>)}</select></div>
                  <div className="lg:col-span-2"><label className="text-xs font-bold text-slate-500 mb-1 block">Date</label><input type="date" className={inp} value={it.date} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} /></div>
                  <div className="lg:col-span-2"><label className="text-xs font-bold text-slate-500 mb-1 block">Amount ₹</label><input type="number" className={inp} value={it.claimed_amount} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, claimed_amount: e.target.value } : x))} placeholder="0" /></div>
                  <div className="col-span-2 lg:col-span-3"><label className="text-xs font-bold text-slate-500 mb-1 block">Description</label><input className={inp} value={it.description} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="What was this expense for?" /></div>
                  <div className="lg:col-span-1"><label className="text-xs font-bold text-slate-500 mb-1 block">Mode</label><SelectOther key={formKey} className={inp} value={it.mode} onChange={v => setItems(items.map((x, j) => j === i ? { ...x, mode: v } : x))} options={TRAVEL_MODES} placeholder="Mode…" /></div>
                  <div className="lg:col-span-1"><label className="text-xs font-bold text-slate-500 mb-1 block">From</label><input className={inp} value={it.from_location} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, from_location: e.target.value } : x))} /></div>
                  <div className="lg:col-span-1"><label className="text-xs font-bold text-slate-500 mb-1 block">To</label><input className={inp} value={it.to_location} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, to_location: e.target.value } : x))} /></div>
                </div>
                <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed text-sm font-bold cursor-pointer transition-all ${it.bill ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-slate-300 text-slate-400 hover:border-indigo-300 hover:text-indigo-500'}`}>
                  <Paperclip className="w-4 h-4" />{it.bill ? `Bill attached — ${it.bill.name}` : 'Attach Bill / Invoice (mandatory)'}
                  <input type="file" className="hidden" onChange={e => setItems(items.map((x, j) => j === i ? { ...x, bill: e.target.files?.[0] || null } : x))} />
                </label>
              </div>
            ))}
            <button onClick={() => setItems([...items, { category: 'travel', date: '', description: '', from_location: '', to_location: '', mode: '', km: '', claimed_amount: '', bill: null }])} className="flex items-center justify-center gap-1.5 w-full border-2 border-dashed border-indigo-200 text-indigo-500 hover:bg-indigo-50 rounded-xl py-2.5 text-sm font-bold transition-all"><Plus className="w-4 h-4" />Add Expense Line</button>
          </div>
          {sanction && <SettlementTable sanction={sanction} claimedByCat={claimedByCat} claimTotal={claimTotal} />}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="font-black text-slate-700 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">Total Claim: ₹{fmt(items.reduce((s, i) => s + (Number(i.claimed_amount) || 0), 0))}</span>
            <button onClick={submitTexp} disabled={busy} className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all">{busy ? <><RefreshCw className="w-4 h-4 animate-spin" />Submitting…</> : <><CheckCircle className="w-4 h-4" />Save &amp; Submit</>}</button>
          </div>
        </div>
      )}

      {type === 'local_travel' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-rise">
          {formHead(active)}
          <div className="grid md:grid-cols-4 gap-3">
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Travel Type</label>
              <SelectOther key={formKey} className={inp} value={local.local_travel_type} onChange={v => setLocal({ ...local, local_travel_type: v })} options={LOCAL_TYPES} placeholder="Select type…" /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">From</label><input type="date" className={inp} value={local.from_date} onChange={e => setLocal({ ...local, from_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">To</label><input type="date" className={inp} value={local.to_date} onChange={e => setLocal({ ...local, to_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Daily Cap</label><div className="w-full border-2 border-emerald-100 bg-emerald-50 rounded-xl px-3 py-2.5 text-sm font-black text-emerald-700">₹{user.caps?.local_conveyance_daily ?? '—'} <span className="font-medium text-emerald-500 text-xs">/ day</span></div></div>
          </div>
          <div className="space-y-3">
            {lrows.map((it, i) => (
              <div key={i} className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">Journey {i + 1}</span>
                  {lrows.length > 1 && <button onClick={() => setLrows(lrows.filter((_, j) => j !== i))} className="text-rose-400 hover:text-rose-600 flex items-center gap-1 text-xs font-bold"><Trash2 className="w-4 h-4" />Remove</button>}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="lg:col-span-1"><label className="text-xs font-bold text-slate-500 mb-1 block">Date</label><input type="date" className={inp} value={it.date} onChange={e => setLrows(lrows.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} /></div>
                  <div className="col-span-2 lg:col-span-2"><label className="text-xs font-bold text-slate-500 mb-1 block">Purpose</label><input className={inp} value={it.purpose} onChange={e => setLrows(lrows.map((x, j) => j === i ? { ...x, purpose: e.target.value } : x))} placeholder="e.g. Client meeting" /></div>
                  <div className="lg:col-span-1"><label className="text-xs font-bold text-slate-500 mb-1 block">From</label><input className={inp} value={it.from_location} onChange={e => setLrows(lrows.map((x, j) => j === i ? { ...x, from_location: e.target.value } : x))} /></div>
                  <div className="lg:col-span-1"><label className="text-xs font-bold text-slate-500 mb-1 block">To</label><input className={inp} value={it.to_location} onChange={e => setLrows(lrows.map((x, j) => j === i ? { ...x, to_location: e.target.value } : x))} /></div>
                  <div className="lg:col-span-1"><label className="text-xs font-bold text-slate-500 mb-1 block">Mode</label><SelectOther key={formKey} className={inp} value={it.mode} onChange={v => setLrows(lrows.map((x, j) => j === i ? { ...x, mode: v } : x))} options={LOCAL_MODES} placeholder="Mode…" /></div>
                  <div className="col-span-2 lg:col-span-2"><label className="text-xs font-bold text-slate-500 mb-1 block">Amount ₹</label><input type="number" className={inp} value={it.amount} onChange={e => setLrows(lrows.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} placeholder="0" /></div>
                </div>
              </div>
            ))}
            <button onClick={() => setLrows([...lrows, { date: '', purpose: '', from_location: '', to_location: '', mode: 'Cab', km: '', amount: '' }])} className="flex items-center justify-center gap-1.5 w-full border-2 border-dashed border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-xl py-2.5 text-sm font-bold transition-all"><Plus className="w-4 h-4" />Add Journey</button>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="font-black text-slate-700 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">Total: ₹{fmt(lrows.reduce((s, i) => s + (Number(i.amount) || 0), 0))}</span>
            <button onClick={submitLocal} disabled={busy} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all">{busy ? <><RefreshCw className="w-4 h-4 animate-spin" />Submitting…</> : <><CheckCircle className="w-4 h-4" />Save &amp; Submit</>}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Request detail (shared) ───────────────────────────────────────────────────
function Detail({ id, user, onBack, onActioned }: { id: number; user: User; onBack: () => void; onActioned?: () => void }) {
  const [r, setR] = useState<any>(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [party, setParty] = useState(false);
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null);
  const load = () => fetch(`${API}/requests/${id}/`).then(x => x.json()).then(setR);
  useEffect(() => { load(); }, [id]);
  if (!r) return <div className="p-8 text-center text-slate-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>;

  const canAct = (user.role === 'manager' && r.status === 'submitted') || (user.role === 'hr' && r.status === 'manager_approved') || (user.role === 'finance' && r.status === 'hr_approved');
  const canPay = user.role === 'finance' && r.status === 'finance_approved';
  const act = async (action: string) => {
    setBusy(true);
    const res = await fetch(`${API}/requests/${id}/action/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: user.employee_id, action, remarks }) });
    if (res.ok) {
      await load(); if (onActioned) onActioned();
      const label = action === 'reject' ? 'Request rejected' : action === 'paid' ? 'Marked as paid 💰' : 'Approved & forwarded ✓';
      setToast({ t: label, ok: action !== 'reject' });
      if (action !== 'reject') { setParty(true); setTimeout(() => setParty(false), 1600); }
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <Confetti show={party} />
      {toast && <Toast msg={toast.t} ok={toast.ok} onClose={() => setToast(null)} />}
      <button onClick={onBack} className="flex items-center gap-1 text-slate-500 text-sm font-bold hover:text-indigo-600 transition-colors"><ChevronLeft className="w-4 h-4" />Back</button>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex justify-between items-start mb-3">
          <div><h3 className="font-black text-slate-800 text-lg">{r.type_label}</h3><p className="text-slate-400 text-sm">{r.employee_name} · {r.employee_id} · {r.department} · Level {r.level}</p></div>
          <Pill s={r.status} label={r.status_label} />
        </div>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          {r.purpose && <div><p className="text-slate-400 text-xs">Purpose</p><p className="font-semibold">{r.purpose}</p></div>}
          {r.destination_city && <div><p className="text-slate-400 text-xs">Destination</p><p className="font-semibold">{r.destination_city} <span className="text-indigo-500">(Grade {r.city_grade})</span></p></div>}
          {(r.from_date || r.to_date) && <div><p className="text-slate-400 text-xs">Dates</p><p className="font-semibold">{r.from_date} → {r.to_date}{r.number_of_days ? <span className="text-indigo-500"> ({r.number_of_days} day{r.number_of_days === 1 ? '' : 's'})</span> : null}</p></div>}
          {r.sanction_number && <div><p className="text-slate-400 text-xs">Sanction No.</p><p className="font-semibold">{r.sanction_number}</p></div>}
          {r.travel_mode && <div><p className="text-slate-400 text-xs">Mode</p><p className="font-semibold">{r.travel_mode}</p></div>}
          {r.travel_mode_date && <div><p className="text-slate-400 text-xs">Onward Journey</p><p className="font-semibold">{r.travel_mode_date}{r.travel_mode_time_pref_label ? ` · ${r.travel_mode_time_pref_label}` : ''}</p></div>}
          {r.return_mode_date && <div><p className="text-slate-400 text-xs">Return Journey</p><p className="font-semibold">{r.return_mode_date}{r.return_mode_time_pref_label ? ` · ${r.return_mode_time_pref_label}` : ''}</p></div>}
          {r.estimate_amount > 0 && <div><p className="text-slate-400 text-xs">Total Estimate</p><p className="font-black text-slate-800">₹{fmt(r.estimate_amount)}</p></div>}
          {r.advance_amount > 0 && <div><p className="text-slate-400 text-xs">Advance Required</p><p className="font-black text-indigo-600">₹{fmt(r.advance_amount)}</p></div>}
          {r.total_claimed > 0 && <div><p className="text-slate-400 text-xs">Total Claimed</p><p className="font-black text-slate-800">₹{fmt(r.total_claimed)}</p></div>}
        </div>

        {/* A claim settling a sanction: show it against what was approved, and
            net the advance, so the approver sees the money still to move. */}
        {r.sanction && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-slate-400 text-xs mb-1.5">Settles sanction #{r.sanction.id} · {r.sanction.destination_city}</p>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
              <span className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600">Sanctioned ₹{fmt(r.sanction.estimate_amount)}</span>
              <span className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600">Claimed ₹{fmt(r.total_claimed)}</span>
              {r.advance_adjusted > 0 && <span className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-amber-700">Advance ₹{fmt(r.advance_adjusted)}</span>}
              <span className={`rounded-lg px-2 py-1 border ${r.net_settlement >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                {r.net_settlement >= 0 ? 'Payable' : 'Recover'} ₹{fmt(Math.abs(r.net_settlement))}
              </span>
              {r.total_claimed > r.sanction.estimate_amount && (
                <span className="bg-rose-50 border border-rose-200 rounded-lg px-2 py-1 text-rose-700">
                  Over sanction by ₹{fmt(r.total_claimed - r.sanction.estimate_amount)}
                </span>
              )}
            </div>
          </div>
        )}

        {r.legs?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-slate-400 text-xs mb-1.5">Itinerary · {r.legs.length} stop{r.legs.length === 1 ? '' : 's'}</p>
            <div className="space-y-1.5">
              {r.legs.map((l: any) => (
                <div key={l.seq} className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-black text-slate-700">{l.seq + 1}. {l.destination_city}</span>
                    <span className="text-indigo-500 font-semibold">grade {l.city_grade}</span>
                    <span className="text-slate-500">{l.from_date} → {l.to_date} ({l.days}d)</span>
                    {l.travel_mode && <span className="text-slate-500">· by {l.travel_mode}</span>}
                    {l.ticket_date && <span className="text-slate-400">· ticket {l.ticket_date}{l.ticket_time_pref_label ? ` ${l.ticket_time_pref_label}` : ''}</span>}
                  </div>
                  {l.travel_address && <p className="text-slate-500 mt-0.5">{l.travel_address}</p>}
                  {l.purpose && <p className="text-slate-400 mt-0.5">{l.purpose}</p>}
                  {l.mode_exception_reason && <p className="text-amber-700 mt-0.5"><b>Mode exception:</b> {l.mode_exception_reason}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {r.estimate_amount > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-slate-400 text-xs mb-1.5">Estimate breakdown</p>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {[['Ticket', r.est_ticket_amount], ['Lodging', r.est_lodging_amount], ['Food / DA', r.est_food_amount],
                ['Local', r.est_local_amount], ['Misc', r.est_misc_amount]].map(([l, v]: any) => v > 0 && (
                <span key={l} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-600">{l} ₹{fmt(v)}</span>
              ))}
            </div>
          </div>
        )}

        {r.mode_exception_reason && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <p className="text-[11px] font-black text-amber-700 uppercase tracking-wide">Reason for travel-mode exception</p>
            <p className="text-xs text-amber-900 mt-0.5">{r.mode_exception_reason}</p>
          </div>
        )}

        {r.policy_flags?.length > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 space-y-1">
            <p className="text-[11px] font-black text-amber-700 uppercase tracking-wide">Policy flags</p>
            {r.policy_flags.map((f: string, i: number) => (
              <p key={i} className="text-xs text-amber-800 font-semibold flex items-start gap-2"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{f}</p>
            ))}
          </div>
        )}
      </div>

      {r.expense_items?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-x-auto">
          <h4 className="font-black text-slate-700 mb-3">Expense Items</h4>
          <table className="w-full text-xs"><thead><tr className="text-slate-400 border-b-2"><th className="text-left py-1">Category</th><th className="text-left">Date</th><th className="text-left">Detail</th><th className="text-right">Claimed</th><th className="text-right">Cap</th><th className="text-center">Bill</th><th className="text-left">Policy</th></tr></thead>
            <tbody>{r.expense_items.map((it: any) => (
              <tr key={it.id} className="border-b border-slate-100">
                <td className="py-1.5 font-bold">{it.category_label}</td><td>{it.date}</td>
                <td>{it.description || `${it.from_location}→${it.to_location}`} {it.mode && <span className="text-slate-400">({it.mode})</span>}</td>
                <td className="text-right font-bold">₹{fmt(it.claimed_amount)}</td>
                <td className="text-right text-slate-500">{it.policy_cap != null ? `₹${fmt(it.policy_cap)}` : '—'}</td>
                <td className="text-center">{it.has_bill ? <a href={`${(import.meta.env.VITE_API_BASE_URL || '')}${it.bill_url}`} target="_blank" className="text-emerald-600 font-bold">View</a> : <span className="text-rose-400">None</span>}</td>
                <td className="text-amber-600 text-[11px]">{it.policy_flag}</td>
              </tr>))}</tbody></table>
        </div>
      )}
      {r.local_items?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-x-auto">
          <h4 className="font-black text-slate-700 mb-3">Local Journeys</h4>
          <table className="w-full text-xs"><thead><tr className="text-slate-400 border-b-2"><th className="text-left py-1">Date</th><th className="text-left">Purpose</th><th className="text-left">From→To</th><th className="text-left">Mode</th><th className="text-right">Amount</th><th className="text-left">Policy</th></tr></thead>
            <tbody>{r.local_items.map((it: any) => (<tr key={it.id} className="border-b border-slate-100"><td className="py-1.5">{it.date}</td><td>{it.purpose}</td><td>{it.from_location}→{it.to_location}</td><td>{it.mode}</td><td className="text-right font-bold">₹{fmt(it.amount)}</td><td className="text-amber-600 text-[11px]">{it.policy_flag}</td></tr>))}</tbody></table>
        </div>
      )}

      {/* Approval trail */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h4 className="font-black text-slate-700 mb-3">Approval Trail</h4>
        <div className="space-y-2">
          {(r.logs || []).map((l: any, i: number) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              {l.action.includes('reject') ? <XCircle className="w-4 h-4 text-rose-500" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
              <span className="font-bold capitalize">{l.stage}</span><span className="text-slate-500 capitalize">{l.action}</span>
              <span className="text-slate-400">by {l.by_name}</span><span className="text-slate-300 ml-auto text-xs">{l.timestamp}</span>
              {l.remarks && <span className="text-slate-400 italic text-xs">"{l.remarks}"</span>}
            </div>
          ))}
          {(!r.logs || r.logs.length === 0) && <p className="text-slate-300 text-sm">No actions yet.</p>}
        </div>
      </div>

      {(canAct || canPay) && (
        <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm p-5">
          <h4 className="font-black text-slate-700 mb-2">Your Decision ({user.role.toUpperCase()})</h4>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Remarks (optional)" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm mb-3" rows={2} />
          <div className="flex gap-2">
            {canAct && <>
              <button onClick={() => act('approve')} disabled={busy} className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 text-white font-bold px-6 py-2.5 rounded-xl disabled:opacity-50 transition-all"><CheckCircle className="w-4 h-4" />Approve</button>
              <button onClick={() => act('reject')} disabled={busy} className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 hover:shadow-lg hover:shadow-rose-500/30 hover:scale-105 active:scale-95 text-white font-bold px-6 py-2.5 rounded-xl disabled:opacity-50 transition-all"><XCircle className="w-4 h-4" />Reject</button>
            </>}
            {canPay && <button onClick={() => act('paid')} disabled={busy} className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-700 hover:shadow-lg hover:scale-105 active:scale-95 text-white font-bold px-6 py-2.5 rounded-xl disabled:opacity-50 transition-all"><Wallet className="w-4 h-4" />Mark as Paid</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Request list card ─────────────────────────────────────────────────────────
function ReqCard({ r, onClick }: { r: any; onClick: () => void }) {
  const Icon = r.type === 'tour_sanction' ? FileText : r.type === 'travel_expense' ? Receipt : Car;
  const grad = r.type === 'tour_sanction' ? 'from-sky-400 to-blue-500' : r.type === 'travel_expense' ? 'from-violet-400 to-indigo-500' : 'from-emerald-400 to-teal-500';
  const pending = ['submitted', 'manager_approved', 'hr_approved', 'finance_approved'].includes(r.status);
  return (
    <button onClick={onClick} className="hover-lift w-full text-left bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-4 flex items-center gap-3 group">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform`}><Icon className="w-5 h-5" /></div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-800 text-sm truncate">{r.type_label} {r.destination_city && `· ${r.destination_city}`}</p>
        <p className="text-slate-400 text-xs">{r.employee_name} · {r.created_at} {r.total_claimed > 0 && `· ₹${fmt(r.total_claimed)}`}</p>
      </div>
      {pending && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-ring shrink-0" />}
      <Pill s={r.status} label={r.status_label} />
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0" />
    </button>
  );
}

// ── Approver dashboard ────────────────────────────────────────────────────────
function ApproverBoard({ user }: { user: User }) {
  const [data, setData] = useState<any>({ pending: [], processed: [] });
  const [sel, setSel] = useState<number | null>(null);
  const load = () => fetch(`${API}/queue/?employee_id=${user.employee_id}`).then(r => r.json()).then(setData);
  useEffect(() => { load(); }, []);
  if (sel) return <Detail id={sel} user={user} onBack={() => { setSel(null); load(); }} onActioned={load} />;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 bg-[length:200%_200%] animate-gradient text-white p-5 flex items-center gap-4 shadow-lg sheen">
        <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shrink-0"><Clock className="w-6 h-6" /></div>
        <div>
          <p className="text-white/80 text-sm font-semibold">Awaiting your review</p>
          <p className="text-3xl font-black leading-none"><Count n={data.pending.length} /> request{data.pending.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div>
        <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500" />Pending Your Action ({data.pending.length})</h3>
        <div className="space-y-2 stagger">{data.pending.map((r: any) => <ReqCard key={r.id} r={r} onClick={() => setSel(r.id)} />)}
          {data.pending.length === 0 && (
            <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-slate-200 animate-pop">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-3 animate-float"><CheckCircle className="w-8 h-8 text-emerald-400" /></div>
              <p className="font-bold text-slate-500">All caught up! 🎉</p>
              <p className="text-slate-400 text-sm mt-1">Nothing is pending your action right now.</p>
            </div>
          )}</div>
      </div>
      <div>
        <h3 className="font-black text-slate-800 mb-3">Processed</h3>
        <div className="space-y-2 stagger">{data.processed.map((r: any) => <ReqCard key={r.id} r={r} onClick={() => setSel(r.id)} />)}
          {data.processed.length === 0 && <p className="text-slate-300 text-sm">None yet.</p>}</div>
      </div>
    </div>
  );
}

// ── Admin: user import ────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  submitted: 'Pending Manager', manager_approved: 'Pending HR', hr_approved: 'Pending Finance',
  finance_approved: 'Finance Approved', paid: 'Paid', manager_rejected: 'Rejected · Manager',
  hr_rejected: 'Rejected · HR', finance_rejected: 'Rejected · Finance',
};

function AdminDashboard({ user }: { user: User }) {
  const [sub, setSub] = useState('overview');
  const [ov, setOv] = useState<any>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');
  const load = () => fetch(`${API}/admin/overview/`).then(r => r.json()).then(setOv);
  useEffect(() => { load(); }, []);

  const imp = async (e: any) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append('file', f);
    const r = await fetch(`${API}/users/import/`, { method: 'POST', body: fd });
    const d = await r.json(); setMsg(d.message || d.error); load(); e.target.value = '';
  };
  const reset = async (what: string) => {
    if (!confirm(what === 'all' ? 'Clear ALL requests AND users? This cannot be undone.' : 'Clear ALL travel requests? This cannot be undone.')) return;
    const r = await fetch(`${API}/admin/reset/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ what }) });
    const d = await r.json(); setMsg(d.message); load();
  };

  if (sel) return <Detail id={sel} user={user} onBack={() => setSel(null)} />;
  const reqs = (ov?.requests || []).filter((r: any) => !filter || r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        {[{ k: 'overview', l: 'Overview', i: BarChart3 }, { k: 'requests', l: 'All Requests', i: FileText }, { k: 'users', l: 'Users', i: Users }, { k: 'danger', l: 'Danger Zone', i: Trash2 }].map(t => (
          <button key={t.k} onClick={() => setSub(t.k)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${sub === t.k ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md scale-105' : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-500'}`}><t.i className="w-4 h-4" />{t.l}</button>
        ))}
        <button onClick={load} className="ml-auto flex items-center gap-1 text-slate-400 hover:text-indigo-500 text-sm transition-colors active:rotate-180 duration-500"><RefreshCw className="w-4 h-4" />Refresh</button>
      </div>
      {msg && <p className="text-emerald-600 text-sm font-semibold bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{msg}</p>}

      {sub === 'overview' && ov && (() => {
        const processed = ov.approved + ov.paid + ov.rejected;
        const approvalRate = processed ? ((ov.approved + ov.paid) / processed) * 100 : 0;
        const pendingTotal = ov.pending_manager + ov.pending_hr + ov.pending_finance;
        const pipeline = [
          { l: 'Submitted', v: ov.by_status?.submitted || 0, c: '#f59e0b' },
          { l: 'Manager ✓', v: ov.by_status?.manager_approved || 0, c: '#3b82f6' },
          { l: 'HR ✓', v: ov.by_status?.hr_approved || 0, c: '#8b5cf6' },
          { l: 'Finance ✓', v: ov.by_status?.finance_approved || 0, c: '#10b981' },
          { l: 'Paid', v: ov.by_status?.paid || 0, c: '#0d9488' },
        ];
        const typeMeta: any = {
          tour_sanction: { l: 'Tour Sanction', i: FileText, g: 'from-sky-400 to-blue-500' },
          travel_expense: { l: 'Travel Expenses', i: Receipt, g: 'from-violet-400 to-purple-500' },
          local_travel: { l: 'Local Travel', i: Car, g: 'from-amber-400 to-orange-500' },
        };
        return (
          <div className="space-y-4 stagger">
            {/* Hero */}
            <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-600 bg-[length:200%_200%] animate-gradient p-6 text-white shadow-xl relative overflow-hidden sheen">
              <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10 animate-float-slow" />
              <div className="absolute right-24 -bottom-8 w-28 h-28 rounded-full bg-white/5 animate-float" />
              <div className="relative flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-white/70 text-sm font-semibold flex items-center gap-1.5"><Activity className="w-4 h-4" />Total Travel Requests</p>
                  <p className="text-6xl font-black leading-none mt-1"><Count n={ov.total_requests} /></p>
                  <p className="text-white/80 text-sm mt-2">{ov.total_users} users · <span className="text-amber-200 font-bold">{pendingTotal} pending</span> · <span className="text-rose-200 font-bold">{ov.rejected} rejected</span></p>
                </div>
                <div className="flex gap-6 ml-auto items-center flex-wrap">
                  <div className="text-center"><p className="text-white/70 text-xs flex items-center gap-1 justify-center"><Wallet className="w-3 h-3" />Claimed</p><p className="text-2xl font-black"><Count n={ov.total_claimed} prefix="₹" /></p></div>
                  <div className="text-center"><p className="text-white/70 text-xs flex items-center gap-1 justify-center"><CheckCircle className="w-3 h-3" />Approved</p><p className="text-2xl font-black"><Count n={ov.total_approved} prefix="₹" /></p></div>
                  <div className="bg-white/15 rounded-2xl px-3 py-2 backdrop-blur"><Ring pct={approvalRate} label="Approval" /></div>
                </div>
              </div>
            </div>

            {/* Pipeline funnel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-500" />Approval Pipeline</h3>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {pipeline.map((p, i) => (
                  <div key={p.l} className="flex items-center gap-1 flex-1 min-w-[110px]">
                    <div className="hover-lift flex-1 rounded-2xl p-4 text-center text-white shadow-md" style={{ background: `linear-gradient(135deg, ${p.c}, ${p.c}bb)` }}>
                      <p className="text-3xl font-black leading-none"><Count n={p.v} /></p>
                      <p className="text-[11px] font-semibold text-white/90 mt-1">{p.l}</p>
                    </div>
                    {i < pipeline.length - 1 && <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 animate-pulse" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Type cards + Financial + Approval */}
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(typeMeta).map(([k, m]: any) => (
                <div key={k} className={`hover-lift rounded-2xl p-5 text-white bg-gradient-to-br ${m.g} shadow-md relative overflow-hidden`}>
                  <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 animate-float-slow" />
                  <m.i className="w-6 h-6 mb-3 opacity-90" />
                  <p className="text-4xl font-black"><Count n={ov.by_type?.[k] || 0} /></p>
                  <p className="text-sm text-white/85 font-semibold">{m.l}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Status distribution */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-violet-500" />Status Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(STATUS_LABELS).map(([s, l]) => { const v = ov.by_status?.[s] || 0; return (
                    <div key={s} className="flex items-center gap-3 text-sm">
                      <span className="w-32 text-slate-500 text-xs shrink-0">{l}</span>
                      <div className="flex-1"><PBar value={v} max={ov.total_requests} grad={s.includes('reject') ? 'from-rose-400 to-red-500' : s === 'paid' ? 'from-teal-500 to-emerald-600' : s.includes('approved') ? 'from-emerald-400 to-teal-500' : 'from-amber-400 to-orange-500'} /></div>
                      <span className="w-8 text-right font-black text-slate-700">{v}</span>
                    </div>
                  ); })}
                </div>
              </div>
              {/* Financial summary */}
              <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-2xl border-2 border-emerald-100 shadow-sm p-5">
                <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" />Financial Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center"><span className="text-slate-500 text-sm">Total Claimed</span><span className="font-black text-amber-600 text-lg">₹{fmt(ov.total_claimed)}</span></div>
                  <PBar value={ov.total_claimed} max={ov.total_claimed || 1} grad="from-amber-400 to-orange-500" />
                  <div className="flex justify-between items-center"><span className="text-slate-500 text-sm">Total Approved</span><span className="font-black text-emerald-600 text-lg">₹{fmt(ov.total_approved)}</span></div>
                  <PBar value={ov.total_approved} max={ov.total_claimed || 1} grad="from-emerald-400 to-teal-500" />
                  <div className="flex justify-between items-center pt-2 border-t-2 border-emerald-100"><span className="text-slate-600 font-bold text-sm">Overall Approval Rate</span><span className="font-black text-indigo-600 text-xl">{approvalRate.toFixed(1)}%</span></div>
                </div>
              </div>
            </div>

            {/* Dept + roles */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-pink-500" />Requests by Department</h3>
                <div className="space-y-2">
                  {Object.entries(ov.by_department || {}).slice(0, 8).map(([k, v]: any) => (
                    <div key={k} className="flex items-center gap-3 text-sm"><span className="w-28 text-slate-500 text-xs truncate shrink-0">{k}</span><div className="flex-1"><PBar value={v} max={ov.total_requests} grad="from-pink-400 to-rose-500" /></div><span className="w-8 text-right font-black text-slate-700">{v as number}</span></div>
                  ))}
                  {Object.keys(ov.by_department || {}).length === 0 && <span className="text-xs text-slate-300">No data</span>}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-500" />Users by Role</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['employee', 'manager', 'hr', 'finance', 'admin'].filter(r => ov.users_by_role?.[r]).map((k) => {
                    const grads: any = { employee: 'from-blue-500 to-indigo-600', manager: 'from-violet-500 to-purple-600', hr: 'from-pink-500 to-rose-600', finance: 'from-emerald-500 to-teal-600', admin: 'from-slate-600 to-slate-800' };
                    return <div key={k} className={`hover-lift bg-gradient-to-br ${grads[k]} rounded-2xl p-3 text-center text-white shadow-md`}><p className="text-2xl font-black"><Count n={ov.users_by_role[k]} /></p><p className="text-[11px] text-white/80 capitalize">{k}</p></div>;
                  })}
                  {Object.keys(ov.users_by_role || {}).length === 0 && <span className="text-xs text-slate-300 col-span-2">No users yet</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {sub === 'requests' && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filter} onChange={e => setFilter(e.target.value)} className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
              <option value="">All statuses ({ov?.requests?.length || 0})</option>
              {Object.keys(STATUS_LABELS).map(s => <option key={s} value={s}>{STATUS_LABELS[s]} ({ov?.by_status?.[s] || 0})</option>)}
            </select>
            <span className="text-slate-400 text-sm">{reqs.length} shown</span>
          </div>
          <div className="space-y-2 stagger">
            {reqs.map((r: any) => <ReqCard key={r.id} r={r} onClick={() => setSel(r.id)} />)}
            {reqs.length === 0 && <p className="text-slate-300 text-center py-10">No requests.</p>}
          </div>
        </>
      )}

      {sub === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
          <h3 className="font-black text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" />User Directory ({ov?.total_users ?? 0})</h3>
          <p className="text-slate-500 text-sm">Import users: Employee ID, Name, Email, Level (M1-M7/E1-E4), Role (employee/manager/hr/finance), Reporting Manager ID.</p>
          <div className="flex gap-2">
            <a href={`${API}/users/template/`} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold"><FileText className="w-4 h-4" />Download Template</a>
            <label className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm font-bold cursor-pointer"><Upload className="w-4 h-4" />Import Users<input type="file" accept=".xlsx" className="hidden" onChange={imp} /></label>
          </div>
          {ov?.users_by_role && <div className="flex gap-2 flex-wrap pt-2">{Object.entries(ov.users_by_role).map(([k, v]: any) => <span key={k} className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600 capitalize">{k}: {v as number}</span>)}</div>}
        </div>
      )}

      {sub === 'danger' && (
        <div className="bg-rose-50 rounded-2xl border-2 border-rose-200 p-6 space-y-3">
          <h3 className="font-black text-rose-700 flex items-center gap-2"><AlertCircle className="w-5 h-5" />Danger Zone</h3>
          <p className="text-rose-600 text-sm">These actions permanently delete data. Use with care.</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => reset('requests')} className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-rose-300 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-100"><Trash2 className="w-4 h-4" />Clear All Requests</button>
            <button onClick={() => reset('all')} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700"><Trash2 className="w-4 h-4" />Clear Requests + Users</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Portal shell ──────────────────────────────────────────────────────────────
function Portal({ user, onLogout }: { user: User; onLogout: () => void }) {
  const isApprover = ['manager', 'hr', 'finance'].includes(user.role);
  const [tab, setTab] = useState<string>(isApprover ? 'approvals' : 'new');
  const [refresh, setRefresh] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [mine, setMine] = useState<any[]>([]);
  useEffect(() => { if (tab === 'mine') fetch(`${API}/requests/mine/?employee_id=${user.employee_id}`).then(r => r.json()).then(d => setMine(d.requests || [])); }, [tab, refresh]);

  const isAdmin = user.role === 'admin';
  const tabs = isApprover
    ? [{ k: 'approvals', l: 'Approvals', i: Shield }, { k: 'new', l: 'My New Request', i: Plus }, { k: 'mine', l: 'My Requests', i: FileText }]
    : [{ k: 'new', l: 'New Request', i: Plus }, { k: 'mine', l: 'My Requests', i: FileText }];

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      <header className="bg-white border-b border-slate-200 text-slate-800 relative z-20">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-3 relative">
          <div className="flex-1"><p className="font-black leading-tight text-slate-900">{user.name}</p><p className="text-slate-500 text-xs">{user.designation} · {isAdmin ? 'Oversight & Setup' : `Level ${user.level}`}</p></div>
          <span className="hidden sm:inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide">{user.role}</span>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm">{(user.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div>
          <button onClick={onLogout} className="flex items-center gap-1 text-slate-500 hover:text-slate-900 text-sm transition-colors"><LogOut className="w-4 h-4" /><span className="hidden md:inline">Logout</span></button>
        </div>
        {!isAdmin && (
          <div className="max-w-6xl mx-auto px-5 flex gap-1">
            {tabs.map(t => <button key={t.k} onClick={() => { setTab(t.k); setSel(null); }} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${tab === t.k ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><t.i className="w-4 h-4" />{t.l}</button>)}
          </div>
        )}
      </header>
      <main className="max-w-6xl mx-auto px-5 py-6">
        {isAdmin && <AdminDashboard user={user} />}
        {tab === 'approvals' && !isAdmin && <ApproverBoard user={user} />}
        {tab === 'new' && !isAdmin && <NewRequest user={user} onDone={() => { setRefresh(x => x + 1); setTab('mine'); }} />}
        {tab === 'mine' && !isAdmin && (sel ? <Detail id={sel} user={user} onBack={() => setSel(null)} /> : (
          <div className="space-y-4">
            {mine.length > 0 && (() => {
              const isPending = (s: string) => ['submitted', 'manager_approved', 'hr_approved', 'finance_approved'].includes(s);
              const stats = [
                { l: 'Total', v: mine.length, i: FileText, g: 'from-sky-500 to-indigo-600' },
                { l: 'In Progress', v: mine.filter(r => isPending(r.status)).length, i: Clock, g: 'from-amber-500 to-orange-600' },
                { l: 'Paid', v: mine.filter(r => r.status === 'paid').length, i: Wallet, g: 'from-emerald-500 to-teal-600' },
                { l: 'Claimed ₹', v: mine.reduce((s, r) => s + (Number(r.total_claimed) || 0), 0), i: TrendingUp, g: 'from-violet-500 to-purple-600', money: true },
              ];
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
                  {stats.map(s => (
                    <div key={s.l} className={`hover-lift rounded-2xl p-4 text-white bg-gradient-to-br ${s.g} shadow-md relative overflow-hidden`}>
                      <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/10" />
                      <s.i className="w-5 h-5 opacity-90 mb-2" />
                      <p className="text-3xl font-black leading-none"><Count n={s.v} prefix={s.money ? '₹' : ''} /></p>
                      <p className="text-xs text-white/85 font-semibold mt-1">{s.l}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="space-y-2 stagger">
              {mine.map(r => <ReqCard key={r.id} r={r} onClick={() => setSel(r.id)} />)}
            </div>
            {mine.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 animate-pop">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center mb-3 animate-float"><FileText className="w-8 h-8 text-indigo-400" /></div>
                <p className="font-bold text-slate-500">No requests yet</p>
                <p className="text-slate-400 text-sm mt-1">Head to <b>New Request</b> to raise a tour sanction or expense claim.</p>
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}

export function TadaPage(_props: { onNavigateBack?: () => void } = {}) {
  const [user, setUser] = useState<User | null>(() => { try { return JSON.parse(localStorage.getItem('tada_user') || 'null'); } catch { return null; } });
  const logout = () => { localStorage.removeItem('tada_user'); setUser(null); };
  if (!user) return <Login onLogin={setUser} />;
  return <Portal user={user} onLogout={logout} />;
}

export default TadaPage;
