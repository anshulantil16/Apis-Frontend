/* OTP login for the TA/DA portal - employee ID, then a six-digit code. */
import { useState } from 'react';
import {
  Plane, CheckCircle, Clock, AlertCircle, RefreshCw, ChevronRight, Shield, KeyRound, ArrowRight, MapPin,
  Paperclip, Activity, FileCheck, User as UserIcon,
} from 'lucide-react';
import { API, HR_LABEL, type User } from './shared';
import { onTilt3dMove, onTilt3dLeave } from '../../ui';

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
    { i: Paperclip, t: 'Bill attachments', d: 'Upload proofs straight onto each claim' },
    { i: Activity, t: 'Live status', d: 'Track a claim from raised to reimbursed' },
    { i: FileCheck, t: 'Audit-ready trail', d: 'Every approval logged, nothing goes missing' },
  ];

  return (
    <div className="min-h-full relative overflow-hidden bg-[#fdf6e3] py-10 px-4 sm:px-6 flex items-center justify-center">
      {/* The illustration is the page, the way Goal Setting's sign-in is — not
          a decorative strip pinned above a form. */}
      <img src="/Tada_bg.png" alt="" aria-hidden decoding="async"
        className="absolute inset-0 w-full h-full object-cover" />

      <div className="relative z-10 w-full max-w-5xl">
        {/* Same tilt + spotlight + gentle float the Goal Setting card uses,
            so every OTP sign-in screen in the intranet reads as one family. */}
        <div onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
          className="ih-tilt3d ih-spotlight ih-float flex rounded-[32px] overflow-hidden border border-amber-100
            shadow-[0_45px_90px_-25px_rgba(217,119,6,.45)] bg-white">

          {/* ── Brand panel ── */}
          <div className="hidden lg:flex flex-col justify-between w-1/2 xl:w-[52%] p-10 xl:p-12 relative overflow-hidden bg-amber-50/60">
            <div className="relative flex items-center gap-3">
              <span className="ih-float ih-halo w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500
                flex items-center justify-center shadow-lg shadow-amber-500/30"
                style={{ ['--ih-halo' as string]: 'rgba(245,158,11,.45)' }}>
                <Plane className="w-7 h-7 text-white" />
              </span>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">APIS TA/DA Portal</h1>
                <p className="text-slate-500 text-[12.5px] font-semibold">Travel &amp; Daily Allowance</p>
              </div>
            </div>

            <div className="relative space-y-6">
              <div>
                <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider
                  bg-white text-amber-700 px-3 py-1.5 rounded-full border border-amber-200 mb-4">
                  <MapPin className="w-3.5 h-3.5" /> Apis India Limited
                </p>
                <h2 className="text-3xl xl:text-4xl font-black leading-[1.15] text-slate-900">
                  Travel claims,<br />made simple &amp;<br />
                  <span className="text-orange-500">policy-perfect.</span>
                </h2>
                <p className="text-slate-500 max-w-md mt-4 text-[14px] leading-relaxed font-medium">
                  Raise tour sanctions &amp; expense claims, attach bills, and watch them flow through
                  approvals — all within your allowance limits, automatically.
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black text-amber-600/80 uppercase tracking-[0.14em] mb-2">
                  Approval workflow
                </p>
                <div className="flex items-center gap-1.5 flex-wrap bg-white/70 border border-amber-100 rounded-xl px-2.5 py-2">
                  {steps.map((s, i) => (
                    <div key={s} className="flex items-center gap-1.5">
                      <div className={`px-3 py-1.5 rounded-lg text-[12px] font-black ${
                        i === 0 ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
                        {s}
                      </div>
                      {i < 3 && <ChevronRight className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative pt-5 border-t border-amber-200/50">
              <p className="text-[10px] font-black text-amber-600/80 uppercase tracking-[0.14em] mb-2.5">
                Why teams trust it
              </p>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
                {features.map(f => (
                  <div key={f.t} className="bg-white/80 backdrop-blur-sm rounded-xl p-2.5 border border-amber-100 flex items-start gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-px">
                      <f.i className="w-3.5 h-3.5 text-amber-500" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-slate-800 leading-tight">{f.t}</p>
                      <p className="text-[9.5px] text-slate-400 font-semibold mt-0.5 leading-snug">{f.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Form panel ── */}
          <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white relative overflow-hidden">
            <div className="w-full max-w-md relative">
              <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg"><Plane className="w-6 h-6 text-white" /></div>
                <div><h1 className="font-black text-slate-900 text-lg">APIS TA/DA Portal</h1><p className="text-slate-500 text-xs">Travel &amp; Daily Allowance</p></div>
              </div>

              {mode === 'admin' && (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 px-3 py-1 rounded-full mb-4">
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
                      className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15 transition-all font-semibold text-slate-800" />
                  </div>
                  <button onClick={() => send(false)} disabled={busy || !empId.trim()} className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:shadow-lg hover:shadow-slate-900/30 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                    {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <>Send OTP <ArrowRight className="w-4 h-4" /></>}
                  </button>
                  <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                    <button onClick={() => send(true)} disabled={busy} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-amber-700 text-xs font-bold transition-colors">
                      <Shield className="w-3.5 h-3.5" /> Admin Login (import users &amp; setup)
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-5 text-sm text-amber-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" /> Code sent to <b>{masked}</b>
                  </div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">One-Time Password</label>
                  <div className="relative mb-4">
                    <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input value={otp} onChange={e => setOtp(e.target.value)} onKeyDown={e => e.key === 'Enter' && verify()} placeholder="000000" maxLength={6} autoFocus
                      className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-center text-2xl tracking-[0.4em] font-black focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15 transition-all text-slate-800" />
                  </div>
                  <button onClick={verify} disabled={busy || otp.length < 4} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                    {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Verify &amp; Login</>}
                  </button>
                  <button onClick={() => { setStep('id'); setMode('user'); setOtp(''); setMsg(''); }} className="w-full text-slate-500 hover:text-slate-800 text-xs mt-3 font-semibold transition-colors">← Use a different ID</button>
                </>
              )}
              {msg && <p className="text-rose-500 text-sm mt-4 flex items-center gap-1.5 bg-rose-50 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4 shrink-0" />{msg}</p>}
              <p className="text-center text-slate-400 text-[11px] font-semibold mt-6">Secured by email OTP · Apis India Limited</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Caps banner (shows the employee their policy limits) ──────────────────────
