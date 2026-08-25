/* OTP login for the TA/DA portal - employee ID, then a six-digit code. */
import { useState } from 'react';
import {
  Plane, CheckCircle, Clock, AlertCircle, RefreshCw, ChevronRight, Shield, KeyRound, ArrowRight, Sparkles,
  User as UserIcon,
} from 'lucide-react';
import { API, HR_LABEL, type User } from './shared';

export function Login({ onLogin }: { onLogin: (u: User) => void }) {
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

  const steps = ['Employee', 'Manager', HR_LABEL, 'Finance'];
  const features = [
    { i: Shield, t: 'Policy-checked', d: 'Every claim auto-validated against your band limits' },
    { i: Clock, t: '60-day tracking', d: 'Deadline flags so nothing lapses' },
    { i: CheckCircle, t: 'Multi-level approval', d: `Manager → ${HR_LABEL} → Finance, fully audited` },
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
                  <UserIcon className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
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
