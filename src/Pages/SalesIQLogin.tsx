import { useState, useEffect, useRef } from 'react';
import { Zap, Mail, ShieldCheck, ArrowRight, Loader, AlertTriangle, RotateCcw } from 'lucide-react';
import { API } from './SalesIQShared';

const SESSION_KEY = 'salesiq_session';

export function loadSession(): { email: string; ts: number } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // 12-hour session. Sales data is sensitive enough that a browser left open
    // overnight on a shared machine should not still be authenticated.
    if (!s?.email || Date.now() - (s.ts || 0) > 12 * 60 * 60 * 1000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch { return null; }
}
export const saveSession = (email: string) =>
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email, ts: Date.now() }));
export const clearSession = () => localStorage.removeItem(SESSION_KEY);

/* ── honeycomb field ─────────────────────────────────────────────────────
   A hex grid drawn as SVG. Cells pulse on a staggered loop, so the comb
   reads as "alive" without a canvas loop burning CPU on every frame.       */
function Honeycomb() {
  const cells: { x: number; y: number; d: number; o: number }[] = [];
  const W = 9, H = 7, S = 46;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      cells.push({
        x: c * S * 1.5,
        y: r * S * 1.732 + (c % 2 ? S * 0.866 : 0),
        d: (r * W + c) * 0.09,
        o: 0.05 + Math.random() * 0.28,
      });
    }
  }
  const hex = (cx: number, cy: number, s: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 180) * (60 * i);
      return `${cx + s * Math.cos(a)},${cy + s * Math.sin(a)}`;
    }).join(' ');

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 620 560"
      preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="combG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {cells.map((c, i) => (
        <polygon key={i} points={hex(c.x, c.y, S * 0.52)}
          fill="none" stroke="url(#combG)" strokeWidth="1.1"
          style={{ opacity: c.o, animation: `combPulse 5s ease-in-out ${c.d}s infinite` }} />
      ))}
    </svg>
  );
}

/* ── honey drip ──────────────────────────────────────────────────────────
   A dipper with honey stretching and falling from it, then pooling.        */
function HoneyDrip() {
  return (
    <svg viewBox="0 0 120 200" className="w-24 h-40" aria-hidden>
      <defs>
        <linearGradient id="honeyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="honeyGlow">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* dipper */}
      <rect x="55" y="6" width="10" height="30" rx="5" fill="#92400e" />
      {[0, 1, 2, 3].map(i => (
        <ellipse key={i} cx="60" cy={42 + i * 13} rx={20 - i * 1.5} ry="6.5"
          fill="url(#honeyG)" filter="url(#honeyGlow)" />
      ))}
      {/* stretching strand */}
      <path d="M60 96 C 60 118, 60 130, 60 146" stroke="url(#honeyG)" strokeWidth="7"
        strokeLinecap="round" fill="none" filter="url(#honeyGlow)"
        style={{ animation: 'strand 3.4s ease-in-out infinite' }} />
      {/* falling droplet */}
      <circle cx="60" r="7" fill="url(#honeyG)" filter="url(#honeyGlow)"
        style={{ animation: 'drip 3.4s cubic-bezier(.5,0,.9,.5) infinite' }} />
      {/* pool */}
      <ellipse cx="60" cy="182" rx="30" ry="8" fill="url(#honeyG)" opacity="0.85"
        filter="url(#honeyGlow)" style={{ animation: 'pool 3.4s ease-out infinite' }} />
    </svg>
  );
}

/* ── floating motes ──────────────────────────────────────────────────────
   Rendered once with randomised, long, offset durations so the drift never
   visibly loops.                                                            */
function Motes() {
  const motes = useRef(
    Array.from({ length: 26 }, () => ({
      l: Math.random() * 100,
      s: 2 + Math.random() * 5,
      d: Math.random() * 14,
      dur: 13 + Math.random() * 16,
      o: 0.15 + Math.random() * 0.5,
    }))
  ).current;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {motes.map((m, i) => (
        <span key={i} className="absolute rounded-full"
          style={{
            left: `${m.l}%`, bottom: '-8%', width: m.s, height: m.s,
            background: 'radial-gradient(circle,#fde68a,#f59e0b)',
            opacity: m.o, filter: 'blur(.4px)',
            boxShadow: '0 0 8px #fbbf2488',
            animation: `mote ${m.dur}s linear ${m.d}s infinite`,
          }} />
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
export function SalesIQLogin({ onSuccess }: { onSuccess: (email: string) => void }) {
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
      saveSession(d.email);
      onSuccess(d.email);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Verification failed');
      setOtp(['', '', '', '', '', '']);
      boxes.current[0]?.focus();
    } finally { setBusy(false); }
  };

  const setDigit = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) boxes.current[i + 1]?.focus();
    if (next.every(d => d)) verify(next.join(''));
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const txt = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (txt.length === 6) {
      e.preventDefault();
      setOtp(txt.split(''));
      verify(txt);
    }
  };

  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[#0a0705] relative overflow-hidden flex items-center justify-center p-6">
      <style>{`
        @keyframes combPulse{0%,100%{opacity:.06}50%{opacity:.42}}
        @keyframes drip{
          0%{cy:100px;opacity:0;r:3}
          22%{cy:112px;opacity:1;r:7}
          62%{cy:172px;opacity:1;r:8}
          72%{cy:180px;opacity:.5;r:10}
          78%,100%{cy:180px;opacity:0;r:3}
        }
        @keyframes strand{
          0%,100%{d:path("M60 96 C 60 112, 60 118, 60 124")}
          45%{d:path("M60 96 C 60 126, 60 142, 60 158")}
        }
        @keyframes pool{0%,60%{ry:6;opacity:.65}75%{ry:9.5;opacity:.95}100%{ry:8;opacity:.8}}
        @keyframes mote{
          0%{transform:translateY(0) translateX(0) scale(1);opacity:0}
          10%{opacity:.7}
          90%{opacity:.5}
          100%{transform:translateY(-108vh) translateX(38px) scale(.5);opacity:0}
        }
        @keyframes auroraShift{
          0%,100%{transform:translate(0,0) scale(1)}
          33%{transform:translate(42px,-32px) scale(1.14)}
          66%{transform:translate(-32px,26px) scale(.92)}
        }
        .aurora{animation:auroraShift 20s ease-in-out infinite}
        @keyframes riseIn{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
        .rise{animation:riseIn .8s cubic-bezier(.2,.8,.2,1) both}
        @keyframes sweep{from{transform:translateX(-140%)}to{transform:translateX(240%)}}
        .sweep::after{content:'';position:absolute;inset:0;width:38%;
          background:linear-gradient(90deg,transparent,rgba(255,214,120,.28),transparent);
          animation:sweep 3.4s ease-in-out infinite}
        @keyframes ringSpin{to{transform:rotate(360deg)}}
        .ring-spin{animation:ringSpin 22s linear infinite}
        @keyframes glowPulse{0%,100%{opacity:.5}50%{opacity:1}}
        .glow-pulse{animation:glowPulse 3s ease-in-out infinite}
        @keyframes typeIn{from{width:0}to{width:100%}}
      `}</style>

      {/* aurora wash */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="aurora absolute -top-1/4 -left-1/4 w-[46rem] h-[46rem] rounded-full
                        bg-amber-500/20 blur-[130px]" />
        <div className="aurora absolute -bottom-1/4 -right-1/4 w-[46rem] h-[46rem] rounded-full
                        bg-orange-600/20 blur-[130px]" style={{ animationDelay: '7s' }} />
        <div className="aurora absolute top-1/3 left-1/2 w-[32rem] h-[32rem] rounded-full
                        bg-yellow-400/10 blur-[120px]" style={{ animationDelay: '13s' }} />
      </div>
      <div className="absolute inset-0 opacity-40"><Honeycomb /></div>
      <Motes />
      {/* vignette keeps the centre readable over all the motion */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 45%,transparent 25%,rgba(10,7,5,.82) 100%)' }} />

      {/* ── card ── */}
      <div className="relative z-10 w-full max-w-4xl grid md:grid-cols-2 rounded-3xl overflow-hidden
                      border border-amber-500/20 shadow-[0_30px_90px_-20px_rgba(245,158,11,.35)]
                      bg-white/[0.035] backdrop-blur-2xl rise">
        {/* left: brand */}
        <div className="relative p-10 flex flex-col justify-between border-b md:border-b-0
                        md:border-r border-amber-500/15 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.09] to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-8">
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400
                              to-orange-600 flex items-center justify-center
                              shadow-lg shadow-amber-500/40">
                <Zap className="w-6 h-6 text-white" />
                <span className="glow-pulse absolute -inset-2 rounded-2xl border border-amber-400/40" />
              </div>
              <div>
                <p className="text-white font-black text-xl tracking-tight leading-none">SalesIQ</p>
                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-amber-500/80 mt-1">
                  APIS India Limited
                </p>
              </div>
            </div>

            <h1 className="text-4xl font-black leading-[1.1] mb-4
                           bg-gradient-to-br from-amber-100 via-amber-300 to-orange-500
                           bg-clip-text text-transparent">
              Every drop<br />of your sales,<br />measured.
            </h1>
            <p className="text-amber-100/45 text-sm leading-relaxed max-w-xs">
              Revenue, geography, products, customers and forecasts — one place, updated the
              moment you upload.
            </p>
          </div>

          <div className="relative flex items-end justify-between mt-10">
            <div className="space-y-2">
              {['Forecasting to 12 months', 'RFM & cohort intelligence', 'Live target pacing'].map((t, i) => (
                <div key={t} className="flex items-center gap-2 rise"
                  style={{ animationDelay: `${400 + i * 130}ms` }}>
                  <span className="w-1 h-1 rounded-full bg-amber-400" />
                  <span className="text-[11px] font-semibold text-amber-100/50">{t}</span>
                </div>
              ))}
            </div>
            <div className="opacity-90"><HoneyDrip /></div>
          </div>
        </div>

        {/* right: form */}
        <div className="relative p-10 flex flex-col justify-center">
          <div className="absolute top-6 right-6 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 glow-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/70">
              Secure
            </span>
          </div>

          {step === 'email' ? (
            <form onSubmit={sendOtp} className="rise">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25
                              flex items-center justify-center mb-5">
                <Mail className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-2xl font-black text-white mb-1.5">Sign in</h2>
              <p className="text-[13px] text-amber-100/40 mb-7 leading-relaxed">
                SalesIQ is restricted. Enter your authorised email and we'll send a one-time code.
              </p>

              <label className="block text-[10px] font-black uppercase tracking-widest
                                text-amber-500/70 mb-2">Email address</label>
              <input type="email" value={email} autoFocus autoComplete="email"
                onChange={e => setEmail(e.target.value)}
                placeholder="you@apisindia.com"
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-amber-500/20
                           text-white placeholder:text-amber-100/20 text-sm font-semibold
                           transition-all focus:outline-none focus:border-amber-400/60
                           focus:bg-white/[0.07] focus:ring-4 focus:ring-amber-500/10" />

              {err && (
                <div className="flex items-start gap-2 mt-4 rounded-xl bg-rose-500/10
                                border border-rose-500/25 p-3 rise">
                  <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-rose-200 leading-relaxed">{err}</p>
                </div>
              )}

              <button type="submit" disabled={busy}
                className="sweep relative overflow-hidden w-full mt-6 flex items-center justify-center
                           gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500
                           text-[#3b1f00] font-black shadow-lg shadow-amber-500/30 transition-all
                           hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/40
                           disabled:opacity-50 disabled:translate-y-0">
                {busy ? <><Loader className="w-4 h-4 animate-spin" />Sending…</>
                      : <>Send login code<ArrowRight className="w-4 h-4" /></>}
              </button>

              <p className="text-[11px] text-amber-100/25 mt-5 text-center leading-relaxed">
                Access is limited to the SalesIQ super admin. Contact the administrator if you
                need to be added.
              </p>
            </form>
          ) : (
            <div className="rise">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25
                              flex items-center justify-center mb-5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-white mb-1.5">Enter your code</h2>
              <p className="text-[13px] text-amber-100/40 mb-7 leading-relaxed">
                We sent a 6-digit code to <b className="text-amber-300">{masked}</b>.
                It expires in <b className="text-amber-300 tabular-nums">{mmss}</b>.
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
                    className={`w-full aspect-square rounded-xl bg-white/[0.04] border text-center
                                text-2xl font-black text-white transition-all
                                focus:outline-none focus:ring-4 focus:ring-amber-500/15
                                ${d ? 'border-amber-400/70 bg-amber-500/10' : 'border-amber-500/20'}
                                focus:border-amber-400`} />
                ))}
              </div>

              {err && (
                <div className="flex items-start gap-2 mt-4 rounded-xl bg-rose-500/10
                                border border-rose-500/25 p-3 rise">
                  <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-rose-200 leading-relaxed">{err}</p>
                </div>
              )}

              {busy && (
                <div className="flex items-center justify-center gap-2 mt-5 text-amber-300">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-[12px] font-bold">Verifying…</span>
                </div>
              )}

              <div className="flex items-center justify-between mt-6">
                <button onClick={() => { setStep('email'); setErr(''); }}
                  className="text-[12px] font-bold text-amber-100/40 hover:text-amber-300 transition-colors">
                  ← Change email
                </button>
                <button onClick={() => sendOtp()} disabled={busy || left > 240}
                  className="flex items-center gap-1.5 text-[12px] font-bold text-amber-400
                             hover:text-amber-300 disabled:text-amber-100/20 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                  {left > 240 ? `Resend in ${left - 240}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="absolute bottom-5 text-[10px] font-bold uppercase tracking-[0.2em]
                    text-amber-100/15 z-10">
        APIS India Limited · Sales Intelligence
      </p>
    </div>
  );
}

export default SalesIQLogin;
