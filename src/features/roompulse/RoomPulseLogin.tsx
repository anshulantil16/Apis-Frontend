import { useState, useEffect, useRef } from 'react';
import { Radar, Mail, ShieldCheck, ArrowRight, ArrowLeft, Loader, AlertTriangle, RotateCcw } from 'lucide-react';
import { API, RP_STYLES } from './RoomPulseShared';

/* ── radar sweep: a rotating gradient wedge over concentric rings, standing
   in for "live scanning of every room" — the login's visual signature. ── */
function RadarScope() {
  const rings = [40, 75, 110, 145, 180];
  const dots = useRef(
    Array.from({ length: 7 }, () => ({
      r: 40 + Math.random() * 140, a: Math.random() * 360, d: Math.random() * 3,
    }))
  ).current;
  return (
    <div className="relative w-full max-w-[230px] aspect-square mx-auto">
      <svg viewBox="0 0 400 400" className="w-full h-full">
        <defs>
          <radialGradient id="rp-scope-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="rp-sweep-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="180" fill="url(#rp-scope-bg)" />
        {rings.map(r => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="#0891b2" strokeOpacity="0.18" strokeWidth="1" />
        ))}
        <line x1="20" y1="200" x2="380" y2="200" stroke="#0891b2" strokeOpacity="0.12" />
        <line x1="200" y1="20" x2="200" y2="380" stroke="#0891b2" strokeOpacity="0.12" />
        <g className="rp-radar-sweep" style={{ transformOrigin: '200px 200px' }}>
          <path d="M200,200 L200,20 A180,180 0 0,1 355.9,110 Z" fill="url(#rp-sweep-grad)" />
        </g>
        {dots.map((dt, i) => {
          const rad = (dt.a * Math.PI) / 180;
          const x = 200 + dt.r * Math.cos(rad), y = 200 + dt.r * Math.sin(rad);
          return (
            <circle key={i} cx={x} cy={y} r="4" fill="#0891b2"
              style={{ animation: `rpPulseGlow 2.4s ease-in-out ${dt.d}s infinite` }} />
          );
        })}
        <circle cx="200" cy="200" r="6" fill="#0e7490" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600
                        flex items-center justify-center shadow-2xl shadow-cyan-500/40 rp-pulse-glow">
          <Radar className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );
}

/* ── drifting particle field ────────────────────────────────────────────── */
function Particles() {
  const pts = useRef(
    Array.from({ length: 24 }, () => ({
      l: Math.random() * 100, s: 2 + Math.random() * 4,
      d: Math.random() * 16, dur: 16 + Math.random() * 18, o: 0.12 + Math.random() * 0.28,
    }))
  ).current;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {pts.map((p, i) => (
        <span key={i} className="absolute rounded-full bg-cyan-400"
          style={{ left: `${p.l}%`, bottom: '-6%', width: p.s, height: p.s, opacity: p.o,
                   boxShadow: '0 0 8px #06b6d466',
                   animation: `rpFloat ${p.dur}s ease-in-out ${p.d}s infinite alternate` }} />
      ))}
    </div>
  );
}

export function RoomPulseLogin({ onSuccess, onBack }: {
  onSuccess: (s: { email: string; name: string; role: string }) => void;
  onBack?: () => void;
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
    // h-screen (not min-h-screen) + overflow-hidden: a login page must never
    // scroll. Every size below (padding, headline, radar) is tuned to fit
    // inside 100vh on a typical laptop viewport rather than growing past it.
    <div className="h-screen relative overflow-hidden flex items-center justify-center p-4
                    bg-gradient-to-br from-slate-50 via-cyan-50/40 to-violet-50/40">
      <style>{RP_STYLES}</style>

      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="rp-blob absolute -top-40 -left-32 w-[36rem] h-[36rem] rounded-full bg-cyan-300/25 blur-[130px]" />
        <div className="rp-blob absolute -bottom-40 -right-24 w-[36rem] h-[36rem] rounded-full bg-violet-300/25 blur-[130px]" style={{ animationDelay: '6s' }} />
        <div className="absolute inset-0 opacity-[0.5]"
          style={{ backgroundImage: 'linear-gradient(rgba(15,23,42,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,.035) 1px,transparent 1px)',
                   backgroundSize: '48px 48px' }} />
      </div>
      <Particles />

      {onBack && (
        <button onClick={onBack}
          className="group absolute top-6 left-6 z-20 flex items-center gap-2 pl-3 pr-4 py-2.5
                     rounded-full bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm
                     transition-all duration-300 hover:bg-white hover:shadow-md hover:-translate-x-0.5">
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-violet-600
                           flex items-center justify-center transition-transform duration-300 group-hover:-translate-x-0.5">
            <ArrowLeft className="w-3.5 h-3.5 text-white" />
          </span>
          <span className="text-[12px] font-black text-slate-500 group-hover:text-slate-800">Back to Hub</span>
        </button>
      )}

      <div className="relative z-10 w-full max-w-5xl max-h-[94vh] grid md:grid-cols-2 rounded-[28px]
                      overflow-hidden border border-slate-200 bg-white/80 backdrop-blur-2xl rp-reveal
                      shadow-[0_30px_90px_-24px_rgba(6,182,212,.25)]">

        <div className="relative p-6 md:p-8 flex flex-col justify-between overflow-hidden
                        bg-gradient-to-br from-cyan-50/80 via-white to-violet-50/60
                        border-b md:border-b-0 md:border-r border-slate-200">
          <div className="relative">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600
                              flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Radar className="w-5 h-5 text-white" />
                <span className="rp-pulse-glow absolute -inset-2 rounded-2xl border-2 border-cyan-400/30" />
              </div>
              <div>
                <p className="text-slate-900 font-black text-lg tracking-tight leading-none">RoomPulse</p>
                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-700/70 mt-1">
                  APIS India Limited
                </p>
              </div>
            </div>
            <h1 className="text-[1.85rem] leading-[1.15] font-black mb-3
                           bg-gradient-to-br from-slate-900 via-cyan-700 to-violet-700 bg-clip-text text-transparent">
              Every room,<br />live on one<br />screen.
            </h1>
            <p className="text-slate-500 text-[13px] leading-relaxed max-w-xs">
              See what's free, book instantly, and let admins approve in seconds —
              no more email chains to check a room.
            </p>
          </div>
          <RadarScope />
        </div>

        <div className="relative p-6 md:p-8 flex flex-col justify-center bg-white/60 overflow-y-auto">
          <div className="absolute top-4 right-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 rp-pulse-glow" />
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Live</span>
          </div>

          {step === 'email' ? (
            <form onSubmit={sendOtp} className="rp-reveal">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200
                              flex items-center justify-center mb-4">
                <Mail className="w-4.5 h-4.5 text-cyan-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-1.5">Sign in</h2>
              <p className="text-[13px] text-slate-500 mb-5 leading-relaxed">
                Use your APIS email — we'll send a one-time code. Your role
                (Employee / Admin / Super Admin) is detected automatically.
              </p>
              <label className="block text-[10px] font-black uppercase tracking-widest text-cyan-700/70 mb-2">
                Email address
              </label>
              <input type="email" value={email} autoFocus autoComplete="email"
                onChange={e => setEmail(e.target.value)} placeholder="you@apisindia.com"
                className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200
                           text-slate-800 placeholder:text-slate-300 text-sm font-semibold transition-all
                           focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/15" />
              {err && (
                <div className="flex items-start gap-2 mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 rp-reveal">
                  <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-rose-700 leading-relaxed">{err}</p>
                </div>
              )}
              <button type="submit" disabled={busy}
                className="relative overflow-hidden w-full mt-5 flex items-center justify-center gap-2
                           px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white
                           font-black shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5
                           hover:shadow-xl hover:shadow-cyan-500/40 disabled:opacity-50 disabled:translate-y-0">
                {busy ? <><Loader className="w-4 h-4 animate-spin" />Sending…</> : <>Send login code<ArrowRight className="w-4 h-4" /></>}
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
                Sent to <b className="text-cyan-700">{masked}</b>. Expires in{' '}
                <b className="text-cyan-700 tabular-nums">{mmss}</b>.
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
                    className={`w-full aspect-square rounded-xl bg-white border text-center
                                text-2xl font-black text-slate-800 transition-all focus:outline-none
                                focus:ring-4 focus:ring-cyan-400/15
                                ${d ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200'} focus:border-cyan-400`} />
                ))}
              </div>
              {err && (
                <div className="flex items-start gap-2 mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 rp-reveal">
                  <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-rose-700 leading-relaxed">{err}</p>
                </div>
              )}
              {busy && (
                <div className="flex items-center justify-center gap-2 mt-5 text-cyan-600">
                  <Loader className="w-4 h-4 animate-spin" /><span className="text-[12px] font-bold">Verifying…</span>
                </div>
              )}
              <div className="flex items-center justify-between mt-6">
                <button onClick={() => { setStep('email'); setErr(''); }}
                  className="text-[12px] font-bold text-slate-400 hover:text-cyan-700 transition-colors">
                  ← Change email
                </button>
                <button onClick={() => sendOtp()} disabled={busy || left > 240}
                  className="flex items-center gap-1.5 text-[12px] font-bold text-cyan-600
                             hover:text-cyan-700 disabled:text-slate-300 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                  {left > 240 ? `Resend in ${left - 240}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="absolute bottom-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400/60 z-10">
        APIS India Limited · Conference Room Intelligence
      </p>
    </div>
  );
}

export default RoomPulseLogin;
