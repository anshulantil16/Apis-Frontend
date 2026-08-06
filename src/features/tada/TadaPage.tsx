import { useState, useEffect, useMemo } from 'react';
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
const TRAVEL_MODES = ['Train', 'Flight', 'Bus', 'Cab / Taxi', 'Own Car', 'Own Two-Wheeler', 'Auto Rickshaw', 'Company Vehicle'];
const LOCAL_MODES = ['Cab / Taxi', 'Auto Rickshaw', 'Bus', 'Metro', 'Own Car', 'Own Two-Wheeler', 'Bike Taxi', 'E-Rickshaw'];
const LOCAL_TYPES = ['Outdoor Duty', 'Office Work', 'Client Visit', 'Bank / Govt Work', 'Site Visit', 'Vendor Meeting'];

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
function Login({ onLogin, onBack }: { onLogin: (u: User) => void; onBack?: () => void }) {
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
    <div className="min-h-screen flex bg-slate-900">
      {onBack && (
        <button onClick={onBack}
          className="fixed top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-2 bg-slate-900/70 hover:bg-slate-900/90 backdrop-blur border border-white/15 text-white rounded-xl text-xs font-bold shadow-lg transition-all">
          <ChevronLeft className="w-4 h-4" /> Back to Apps
        </button>
      )}
      {/* ── Brand panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 xl:w-[55%] p-12 xl:p-16 text-white relative overflow-hidden sheen bg-gradient-to-br from-sky-600 via-indigo-600 to-violet-700 bg-[length:200%_200%] animate-gradient">
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
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-indigo-50 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-indigo-200/40 blur-3xl lg:hidden" />
        <div className="w-full max-w-md relative">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><Plane className="w-6 h-6 text-white" /></div>
            <div><h1 className="font-black text-slate-800 text-lg">APIS TA/DA Portal</h1><p className="text-slate-400 text-xs">Travel &amp; Daily Allowance</p></div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-indigo-500/10 p-8 border border-slate-100 animate-pop">
            {mode === 'admin' && (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full mb-4">
                <Shield className="w-3 h-3" /> Admin access
              </div>
            )}
            <h2 className="text-2xl font-black text-slate-800">{step === 'id' ? 'Welcome back' : 'Check your inbox'}</h2>
            <p className="text-slate-400 text-sm mb-6">{step === 'id' ? 'Sign in with your Employee ID to continue.' : `We emailed a 6-digit code to your registered address.`}</p>

            {step === 'id' ? (
              <>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Employee ID</label>
                <div className="relative mb-4">
                  <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input value={empId} onChange={e => setEmpId(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="e.g. E1001"
                    className="w-full border-2 border-slate-200 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all font-semibold text-slate-700" />
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
                    className="w-full border-2 border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-center text-2xl tracking-[0.4em] font-black focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all text-slate-700" />
                </div>
                <button onClick={verify} disabled={busy || otp.length < 4} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Verify &amp; Login</>}
                </button>
                <button onClick={() => { setStep('id'); setMode('user'); setOtp(''); setMsg(''); }} className="w-full text-slate-400 hover:text-slate-600 text-xs mt-3 font-semibold transition-colors">← Use a different ID</button>
              </>
            )}
            {msg && <p className="text-rose-500 text-sm mt-4 flex items-center gap-1.5 bg-rose-50 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4 shrink-0" />{msg}</p>}
          </div>
          <p className="text-center text-slate-400 text-xs mt-6">Secured by email OTP · Apis India Limited</p>
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

// ── Employee: New Request forms ───────────────────────────────────────────────
function NewRequest({ user, onDone }: { user: User; onDone: () => void }) {
  const [type, setType] = useState<'tour_sanction' | 'travel_expense' | 'local_travel'>('tour_sanction');
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
  const [tour, setTour] = useState<any>({ travel_address: '', purpose: '', destination_city: '', from_date: '', to_date: '', contact_number: '', sanction_number: '', estimate_amount: '', travel_mode: '' });
  // travel expense
  const [texp, setTexp] = useState<any>({ destination_city: '', from_date: '', to_date: '', purpose: '', sanction_number: '' });
  const [items, setItems] = useState<any[]>([{ category: 'travel', date: '', description: '', from_location: '', to_location: '', mode: '', km: '', claimed_amount: '', bill: null }]);
  // local travel
  const [local, setLocal] = useState<any>({ local_travel_type: 'Outdoor Duty', from_date: '', to_date: '', purpose: '' });
  const [lrows, setLrows] = useState<any[]>([{ date: '', purpose: '', from_location: '', to_location: '', mode: 'Cab', km: '', amount: '' }]);

  const submitTour = async () => {
    setBusy(true); setMsg(null);
    const r = await fetch(`${API}/requests/tour-sanction/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...tour, employee_id: user.employee_id }) });
    const d = await r.json(); setMsg({ t: d.message || d.error, ok: r.ok }); setBusy(false);
    if (r.ok) { setTour({ travel_address: '', purpose: '', destination_city: '', from_date: '', to_date: '', contact_number: '', sanction_number: '', estimate_amount: '', travel_mode: '' }); cheer(d.message); }
  };
  const submitTexp = async () => {
    setBusy(true); setMsg(null);
    const fd = new FormData();
    const payload = { ...texp, employee_id: user.employee_id, items: items.map(({ bill, ...i }) => i) };
    fd.append('payload', JSON.stringify(payload));
    fd.append('employee_id', user.employee_id);
    items.forEach((it, i) => { if (it.bill) fd.append(`bill_${i}`, it.bill); });
    const r = await fetch(`${API}/requests/travel-expense/`, { method: 'POST', body: fd });
    const d = await r.json(); setMsg({ t: d.message || d.error, ok: r.ok }); setBusy(false);
    if (r.ok) { setItems([{ category: 'travel', date: '', description: '', from_location: '', to_location: '', mode: '', km: '', claimed_amount: '', bill: null }]); cheer(d.message); }
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
      <CapsBanner caps={user.caps} />
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
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Travel Address</label><input className={inp} value={tour.travel_address} onChange={e => setTour({ ...tour, travel_address: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Destination City</label><input className={inp} value={tour.destination_city} onChange={e => setTour({ ...tour, destination_city: e.target.value })} placeholder="e.g. Mumbai" /></div>
            <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 mb-1 block">Purpose of Journey</label><input className={inp} value={tour.purpose} onChange={e => setTour({ ...tour, purpose: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">From Date</label><input type="date" className={inp} value={tour.from_date} onChange={e => setTour({ ...tour, from_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">To Date</label><input type="date" className={inp} value={tour.to_date} onChange={e => setTour({ ...tour, to_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Contact Number</label><input className={inp} value={tour.contact_number} onChange={e => setTour({ ...tour, contact_number: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Sanction Number <span className="text-slate-300">(from manager)</span></label><input className={inp} value={tour.sanction_number} onChange={e => setTour({ ...tour, sanction_number: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Estimate of Expenses (₹)</label><input type="number" className={inp} value={tour.estimate_amount} onChange={e => setTour({ ...tour, estimate_amount: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Travel Mode</label><SelectOther key={formKey} className={inp} value={tour.travel_mode} onChange={v => setTour({ ...tour, travel_mode: v })} options={TRAVEL_MODES} placeholder="Select mode…" /></div>
          </div>
          <button onClick={submitTour} disabled={busy} className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all">{busy ? <><RefreshCw className="w-4 h-4 animate-spin" />Submitting…</> : <><CheckCircle className="w-4 h-4" />Submit for Approval</>}</button>
        </div>
      )}

      {type === 'travel_expense' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-rise">
          {formHead(active)}
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
          {(r.from_date || r.to_date) && <div><p className="text-slate-400 text-xs">Dates</p><p className="font-semibold">{r.from_date} → {r.to_date}</p></div>}
          {r.sanction_number && <div><p className="text-slate-400 text-xs">Sanction No.</p><p className="font-semibold">{r.sanction_number}</p></div>}
          {r.travel_mode && <div><p className="text-slate-400 text-xs">Mode</p><p className="font-semibold">{r.travel_mode}</p></div>}
          {r.estimate_amount > 0 && <div><p className="text-slate-400 text-xs">Estimate</p><p className="font-semibold">₹{fmt(r.estimate_amount)}</p></div>}
          {r.total_claimed > 0 && <div><p className="text-slate-400 text-xs">Total Claimed</p><p className="font-black text-slate-800">₹{fmt(r.total_claimed)}</p></div>}
        </div>
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
function Portal({ user, onLogout, onNavigateBack }: { user: User; onLogout: () => void; onNavigateBack?: () => void }) {
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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-700 text-white sticky top-0 z-40 shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-3 relative">
          {onNavigateBack && <button onClick={onNavigateBack} className="text-white/70 hover:text-white"><ChevronLeft className="w-5 h-5" /></button>}
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center border border-white/20"><Plane className="w-5 h-5" /></div>
          <div className="flex-1"><h1 className="font-black leading-tight">APIS TA/DA Portal{isAdmin && ' · Super Admin'}</h1><p className="text-white/70 text-xs">{user.name} · {user.designation} · {isAdmin ? 'Oversight & Setup' : `Level ${user.level}`}</p></div>
          <span className="hidden sm:inline-flex items-center gap-1.5 bg-white/15 backdrop-blur border border-white/20 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide">{user.role}</span>
          <div className="w-9 h-9 rounded-full bg-white text-indigo-600 flex items-center justify-center font-black text-sm shadow-inner">{(user.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div>
          <button onClick={onLogout} className="flex items-center gap-1 text-white/80 hover:text-white text-sm"><LogOut className="w-4 h-4" /><span className="hidden md:inline">Logout</span></button>
        </div>
        {!isAdmin && (
          <div className="max-w-6xl mx-auto px-5 flex gap-1">
            {tabs.map(t => <button key={t.k} onClick={() => { setTab(t.k); setSel(null); }} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${tab === t.k ? 'border-white text-white' : 'border-transparent text-white/60 hover:text-white'}`}><t.i className="w-4 h-4" />{t.l}</button>)}
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

export function TadaPage({ onNavigateBack }: { onNavigateBack?: () => void }) {
  const [user, setUser] = useState<User | null>(() => { try { return JSON.parse(localStorage.getItem('tada_user') || 'null'); } catch { return null; } });
  const logout = () => { localStorage.removeItem('tada_user'); setUser(null); };
  if (!user) return <Login onLogin={setUser} onBack={onNavigateBack} />;
  return <Portal user={user} onLogout={logout} onNavigateBack={onNavigateBack} />;
}

export default TadaPage;
