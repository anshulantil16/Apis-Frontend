import { useState, useEffect, useRef } from 'react';
import {
  LayoutGrid, Mail, ShieldCheck, ArrowRight, Loader, AlertTriangle, RotateCcw,
  Headphones, Ticket, Plus,
} from 'lucide-react';
import { API, RP_STYLES } from './RoomPulseShared';
import { onTilt3dMove, onTilt3dLeave } from '../../ui';

/* ── the "raise a ticket" stub — AdminPulse's visual signature, standing in
   for the radar sweep the other panel used before this reskin. A slightly
   tilted stub with a torn/perforated edge reads as "ticket" at a glance. ── */
function TicketArt() {
  return (
    <div className="relative mx-auto" style={{ width: 190 }}>
      <div className="ih-float bg-white rounded-2xl border border-amber-200 shadow-lg shadow-amber-500/10 p-4
                      -rotate-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Ticket className="w-3.5 h-3.5 text-amber-500" />
          </span>
          <p className="text-[11px] font-black text-slate-700 tracking-wide">NEW TICKET</p>
        </div>
        <div className="border-t border-dashed border-amber-200 my-2" />
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-amber-100 w-full" />
          <div className="h-1.5 rounded-full bg-amber-100 w-3/4" />
        </div>
      </div>
      <span className="ih-float absolute -bottom-3 -right-3 w-10 h-10 rounded-full
                       bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center
                       shadow-lg shadow-amber-500/40" style={{ animationDelay: '.6s' }}>
        <Plus className="w-5 h-5 text-white" />
      </span>
    </div>
  );
}

/* ── drifting particle field ────────────────────────────────────────────── */
function Particles() {
  const [pts] = useState(() =>
    Array.from({ length: 20 }, () => ({
      l: Math.random() * 100, s: 2 + Math.random() * 4,
      d: Math.random() * 16, dur: 16 + Math.random() * 18, o: 0.1 + Math.random() * 0.25,
    }))
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {pts.map((p, i) => (
        <span key={i} className="absolute rounded-full bg-amber-400"
          style={{ left: `${p.l}%`, bottom: '-6%', width: p.s, height: p.s, opacity: p.o,
                   boxShadow: '0 0 8px rgba(245,158,11,.5)',
                   animation: `rpFloat ${p.dur}s ease-in-out ${p.d}s infinite alternate` }} />
      ))}
    </div>
  );
}

export function RoomPulseLogin({ onSuccess }: {
  onSuccess: (s: { email: string; name: string; role: string }) => void;
}) {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [masked, setMasked] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [left, setLeft] = useState(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setLeft(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [left]);
  useEffect(() => { if (step === 'otp') boxes.current[0]?.focus(); }, [step]);

  const post = async (body: any) => {
    const r = await fetch(`${API}/login/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Something went wrong');
    return d;
  };

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) { setErr('Enter your email address'); return; }
    setBusy(true); setErr('');
    try {
      const d = await post({ action: 'send_otp', email: email.trim().toLowerCase() });
      setMasked(d.masked_email || email);
      setStep('otp'); setOtp(['', '', '', '', '', '']); setLeft(d.expires_in || 300);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not send the code');
    } finally { setBusy(false); }
  };

  const verify = async (code: string) => {
    setBusy(true); setErr('');
    try {
      const d = await post({ action: 'verify_otp', email: email.trim().toLowerCase(), otp: code });
      onSuccess({ email: d.email, name: d.name, role: d.role });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Verification failed');
      setOtp(['', '', '', '', '', '']);
      boxes.current[0]?.focus();
    } finally { setBusy(false); }
  };

  const setDigit = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const next = [...otp]; next[i] = digit; setOtp(next);
    if (digit && i < 5) boxes.current[i + 1]?.focus();
    if (next.every(d => d)) verify(next.join(''));
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const txt = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (txt.length === 6) { e.preventDefault(); setOtp(txt.split('')); verify(txt); }
  };
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;

  return (
    // min-h-full (not h-screen): this login renders inside the shared app
    // shell's content area, so full-viewport sizing would double-count the
    // shell header. The card centres in whatever height the shell gives it.
    <div className="min-h-full relative overflow-hidden flex items-center justify-center px-4 py-10 bg-[#fdf6e3]">
      <style>{RP_STYLES}</style>

      {/* The support-desk illustration is the page, the way every other
          OTP sign-in screen in the intranet works now. */}
      <img src="/Admin_pulse_bg.png" alt="" aria-hidden decoding="async"
        className="absolute inset-0 w-full h-full object-cover" />
      <Particles />

      <div className="relative z-10 w-full max-w-5xl">
        <div onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
          className="ih-tilt3d ih-spotlight ih-float flex rounded-[32px] overflow-hidden border border-amber-100
                        bg-white shadow-[0_45px_90px_-25px_rgba(217,119,6,.45)]">

          <div className="hidden lg:flex flex-col justify-between w-1/2 xl:w-[52%] p-10 xl:p-12 relative overflow-hidden bg-amber-50/60">
            <div className="relative">
              <div className="flex items-center gap-3 mb-5">
                <span className="ih-float ih-halo w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500
                                flex items-center justify-center shadow-lg shadow-amber-500/30"
                  style={{ ['--ih-halo' as string]: 'rgba(245,158,11,.45)' }}>
                  <LayoutGrid className="w-7 h-7 text-white" />
                </span>
                <div>
                  <p className="text-slate-900 font-black text-xl tracking-tight leading-none">AdminPulse</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-700/70 mt-1.5">
                    APIS India Limited
                  </p>
                </div>
              </div>
              <h1 className="text-3xl xl:text-4xl leading-[1.15] font-black mb-4 text-slate-900">
                Everything from<br />Admin, on one<br />screen.
              </h1>
              <p className="text-slate-500 text-[14px] leading-relaxed max-w-xs">
                Book a room or request supplies and equipment — see it live, and let
                admins approve in seconds. No more email chains.
              </p>
            </div>
            <TicketArt />
          </div>

          <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white relative overflow-hidden">
            <div className="w-full max-w-md relative">
              <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg"><LayoutGrid className="w-6 h-6 text-white" /></div>
                <div><h1 className="font-black text-slate-900 text-lg">AdminPulse</h1><p className="text-slate-500 text-xs">Admin Requests &amp; Facilities</p></div>
              </div>

              <div className="absolute top-0 right-0 flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-emerald-500" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 rp-pulse-glow" />
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Live Support</span>
              </div>

              {step === 'email' ? (
            <form onSubmit={sendOtp} className="rp-reveal">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200
                              flex items-center justify-center mb-4">
                <Mail className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-1.5">Sign in</h2>
              <p className="text-[13px] text-slate-500 mb-5 leading-relaxed">
                Use your APIS email — we'll send a one-time code. Your role
                (Employee / Admin / Super Admin) is detected automatically.
              </p>
              <label className="block text-[10px] font-black uppercase tracking-widest text-amber-700/70 mb-2">
                Email address
              </label>
              <input type="email" value={email} autoFocus autoComplete="email"
                onChange={e => setEmail(e.target.value)} placeholder="you@apisindia.com"
                className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200
                           text-slate-800 placeholder:text-slate-300 text-sm font-semibold transition-all
                           focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15" />
              {err && (
                <div className="flex items-start gap-2 mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 rp-reveal">
                  <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-rose-700 leading-relaxed">{err}</p>
                </div>
              )}
              <button type="submit" disabled={busy}
                className="rp-sheen relative overflow-hidden w-full mt-5 flex items-center justify-center gap-2
                           px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white
                           font-black shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-0.5
                           hover:shadow-xl hover:shadow-amber-500/40 disabled:opacity-50 disabled:translate-y-0
                           group">
                {busy ? <><Loader className="w-4 h-4 animate-spin" />Sending…</>
                  : <>Send login code<ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" /></>}
              </button>
              <p className="text-[11px] text-slate-400 mt-4 text-center leading-relaxed">
                Any @apisindia.com address can sign in as an Employee. Admin access is
                granted by a Super Admin.
              </p>
            </form>
          ) : (
            <div className="rp-reveal">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200
                              flex items-center justify-center mb-4">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-1.5">Enter your code</h2>
              <p className="text-[13px] text-slate-500 mb-5 leading-relaxed">
                Sent to <b className="text-amber-700">{masked}</b>. Expires in{' '}
                <b className="text-amber-700 tabular-nums">{mmss}</b>.
              </p>
              <div className="flex gap-2 justify-between" onPaste={onPaste}>
                {otp.map((d, i) => (
                  <input key={i} ref={el => { boxes.current[i] = el; }}
                    value={d} inputMode="numeric" maxLength={1}
                    onChange={e => setDigit(i, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Backspace' && !otp[i] && i > 0) boxes.current[i - 1]?.focus();
                      if (e.key === 'ArrowLeft' && i > 0) boxes.current[i - 1]?.focus();
                      if (e.key === 'ArrowRight' && i < 5) boxes.current[i + 1]?.focus();
                    }}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className={`rp-reveal w-full aspect-square rounded-xl bg-white border text-center
                                text-2xl font-black text-slate-800 transition-all duration-200 focus:outline-none
                                focus:ring-4 focus:ring-amber-400/15 focus:scale-105
                                ${d ? 'rp-pop-in border-amber-400 bg-amber-50 shadow-md shadow-amber-500/20' : 'border-slate-200'} focus:border-amber-400`} />
                ))}
              </div>
              {err && (
                <div className="flex items-start gap-2 mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 rp-reveal">
                  <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-rose-700 leading-relaxed">{err}</p>
                </div>
              )}
              {busy && (
                <div className="flex items-center justify-center gap-2 mt-5 text-amber-600">
                  <Loader className="w-4 h-4 animate-spin" /><span className="text-[12px] font-bold">Verifying…</span>
                </div>
              )}
              <div className="flex items-center justify-between mt-6">
                <button onClick={() => { setStep('email'); setErr(''); }}
                  className="text-[12px] font-bold text-slate-400 hover:text-amber-700 transition-colors">
                  ← Change email
                </button>
                <button onClick={() => sendOtp()} disabled={busy || left > 240}
                  className="flex items-center gap-1.5 text-[12px] font-bold text-amber-600
                             hover:text-amber-700 disabled:text-slate-300 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                  {left > 240 ? `Resend in ${left - 240}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
      <p className="absolute bottom-5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-700/70 z-10">
        APIS India Limited · Admin Requests &amp; Facilities
      </p>
    </div>
  );
}

export default RoomPulseLogin;
