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

/* ── Realistic honey pour ─────────────────────────────────────────────────
   Liquid realism comes from three things, none of which are the shapes
   themselves:

   1. A "gooey" filter (heavy blur, then a huge alpha contrast boost). Blurred
      neighbouring shapes bleed into one another and the contrast step snaps
      the result back to a hard edge — so a falling droplet visibly stretches
      away from the stream and merges into the pool as ONE body of fluid
      instead of separate sprites. This is what stops it reading as an emoji.
   2. A multi-stop gradient plus a specular highlight running down one side,
      which is what makes a surface read as glossy and three-dimensional.
   3. Viscous timing — honey accelerates slowly and settles slowly, so every
      easing curve here is deliberately soft rather than linear.               */
function HoneyPour({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 420" className={className} aria-hidden>
      <defs>
        {/* body of the honey — light crown, saturated core, deep amber edge */}
        <linearGradient id="hp-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#b45309" />
          <stop offset="18%"  stopColor="#f59e0b" />
          <stop offset="42%"  stopColor="#fcd34d" />
          <stop offset="58%"  stopColor="#fbbf24" />
          <stop offset="85%"  stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="hp-pool" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#fde68a" />
          <stop offset="35%"  stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="hp-jar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#78350f" />
          <stop offset="30%"  stopColor="#d97706" />
          <stop offset="55%"  stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>

        {/* THE key effect: blur, then crush alpha contrast so shapes fuse */}
        <filter id="hp-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
          <feColorMatrix in="blur" mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12" result="goo" />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>

        {/* warm bloom so the honey glows rather than sitting flat */}
        <filter id="hp-glow" x="-60%" y="-30%" width="220%" height="180%">
          <feGaussianBlur stdDeviation="9" result="b" />
          <feColorMatrix in="b" type="matrix"
            values="1 0 0 0 0  0 .82 0 0 0  0 0 .25 0 0  0 0 0 .75 0" result="warm" />
          <feMerge><feMergeNode in="warm" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── ambient glow behind everything ── */}
      <ellipse cx="130" cy="360" rx="105" ry="34" fill="#f59e0b" opacity=".16"
        style={{ filter: 'blur(26px)' }} />

      {/* ── the fluid group: all of it fuses under the goo filter ── */}
      <g filter="url(#hp-goo)">
        {/* pool */}
        <ellipse cx="130" cy="356" rx="74" ry="20" fill="url(#hp-pool)"
          className="hp-pool" />
        <ellipse cx="130" cy="352" rx="52" ry="13" fill="#fcd34d" opacity=".55"
          className="hp-pool2" />

        {/* the falling stream — scales down from the spout */}
        <g className="hp-stream-wrap">
          <path d="M126 118 C 122 190, 138 250, 130 330 L 130 356 L 126 356 Z"
            fill="url(#hp-body)" className="hp-stream" />
        </g>

        {/* droplets: stretch on the way down, squash on impact */}
        <ellipse cx="130" cy="0" rx="13" ry="15" fill="url(#hp-body)" className="hp-drop hp-drop-a" />
        <ellipse cx="130" cy="0" rx="10" ry="12" fill="url(#hp-body)" className="hp-drop hp-drop-b" />

        {/* the mass gathering at the spout before it lets go */}
        <ellipse cx="130" cy="112" rx="20" ry="16" fill="url(#hp-body)" className="hp-bulb" />
      </g>

      {/* ── specular highlight: NOT gooed, so it stays crisp like wet gloss ── */}
      <path d="M121 130 C 118 195, 132 255, 125 330" stroke="#fffbeb" strokeWidth="3.2"
        strokeLinecap="round" fill="none" opacity=".62" className="hp-shine" />
      <ellipse cx="120" cy="108" rx="5" ry="3.4" fill="#fffbeb" opacity=".7" />
      <ellipse cx="106" cy="352" rx="17" ry="4.6" fill="#fffbeb" opacity=".42" className="hp-pool-shine" />

      {/* ── APIS honey jar, tilted and pouring ──
           Drawn with its MOUTH at the group origin, then translated to the
           pour point and rotated. Doing it that way means the spout stays
           locked to where the stream begins no matter how the tilt is tuned. */}
      <g transform="translate(128 112) rotate(34)">
        {/* glass body */}
        <path d="M-27 0 L-27 -20 C-27 -30, -41 -36, -41 -52 L-41 -104
                 C-41 -112, -35 -117, -27 -117 L27 -117
                 C35 -117, 41 -112, 41 -104 L41 -52
                 C41 -36, 27 -30, 27 -20 L27 0 Z"
          fill="#fffaf0" opacity=".55" stroke="#d97706" strokeWidth="1.6" strokeOpacity=".5" />

        {/* honey inside — clipped to the jar, and counter-rotated so its
            surface stays LEVEL with the world while the jar is tilted */}
        <clipPath id="hp-jarclip">
          <path d="M-26 0 L-26 -20 C-26 -30, -40 -36, -40 -52 L-40 -104
                   C-40 -111, -34 -116, -26 -116 L26 -116
                   C34 -116, 40 -111, 40 -104 L40 -52
                   C40 -36, 26 -30, 26 -20 L26 0 Z" />
        </clipPath>
        <g clipPath="url(#hp-jarclip)">
          <g transform="rotate(-34)">
            <rect x="-120" y="-46" width="240" height="200" fill="url(#hp-pool)" />
            <rect x="-120" y="-49" width="240" height="5" fill="#fde68a" opacity=".85" />
          </g>
        </g>

        {/* label */}
        <g transform="rotate(0)">
          <rect x="-34" y="-92" width="68" height="34" rx="5"
            fill="#fffbeb" stroke="#d97706" strokeWidth="1.2" strokeOpacity=".55" />
          <text x="0" y="-74" textAnchor="middle"
            style={{ fontSize: 15, fontWeight: 900, fill: '#b45309', letterSpacing: '1.5px' }}>
            APIS
          </text>
          <text x="0" y="-64" textAnchor="middle"
            style={{ fontSize: 6.5, fontWeight: 700, fill: '#d97706', letterSpacing: '.8px' }}>
            PURE HONEY
          </text>
        </g>

        {/* glass highlight down one side */}
        <path d="M-33 -108 C-36 -92, -36 -66, -33 -46" stroke="#ffffff" strokeWidth="4"
          strokeLinecap="round" fill="none" opacity=".65" />

        {/* neck ring + rim */}
        <rect x="-28" y="-22" width="56" height="9" rx="4" fill="#b45309" opacity=".85" />
        <ellipse cx="0" cy="0" rx="27" ry="8" fill="#92400e" />
        <ellipse cx="0" cy="-1.5" rx="23" ry="6" fill="url(#hp-jar)" />
      </g>

      {/* ── ripples on the pool ── */}
      {[0, 1, 2].map(i => (
        <ellipse key={i} cx="130" cy="356" rx="30" ry="8" fill="none"
          stroke="#fbbf24" strokeWidth="1.6" className="hp-ripple"
          style={{ animationDelay: `${i * 1.35}s` }} />
      ))}
    </svg>
  );
}

/* ── honeycomb backdrop ─────────────────────────────────────────────────── */
function Honeycomb() {
  const cells: { x: number; y: number; d: number; o: number }[] = [];
  const W = 11, H = 9, S = 44;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      cells.push({
        x: c * S * 1.5,
        y: r * S * 1.732 + (c % 2 ? S * 0.866 : 0),
        d: (r * W + c) * 0.08,
        o: 0.14 + Math.random() * 0.3,
      });
    }
  }
  const hex = (cx: number, cy: number, s: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 180) * (60 * i);
      return `${cx + s * Math.cos(a)},${cy + s * Math.sin(a)}`;
    }).join(' ');
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 720 660"
      preserveAspectRatio="xMidYMid slice" aria-hidden>
      {cells.map((c, i) => (
        <polygon key={i} points={hex(c.x, c.y, S * 0.52)} fill="none"
          stroke="#d97706" strokeWidth="1"
          style={{ opacity: c.o, animation: `combPulse 6s ease-in-out ${c.d}s infinite` }} />
      ))}
    </svg>
  );
}

/* ── drifting pollen motes ──────────────────────────────────────────────── */
function Motes() {
  const motes = useRef(
    Array.from({ length: 22 }, () => ({
      l: Math.random() * 100, s: 3 + Math.random() * 6,
      d: Math.random() * 16, dur: 16 + Math.random() * 18,
      o: 0.2 + Math.random() * 0.4,
    }))
  ).current;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {motes.map((m, i) => (
        <span key={i} className="absolute rounded-full"
          style={{
            left: `${m.l}%`, bottom: '-8%', width: m.s, height: m.s,
            background: 'radial-gradient(circle at 35% 35%,#fef3c7,#f59e0b)',
            opacity: m.o, boxShadow: '0 0 10px #fbbf2470',
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
    if (txt.length === 6) { e.preventDefault(); setOtp(txt.split('')); verify(txt); }
  };

  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6
                    bg-gradient-to-br from-[#fffdf7] via-[#fff7e6] to-[#ffedd5]">
      <style>{`
        @keyframes combPulse{0%,100%{opacity:.10}50%{opacity:.4}}

        /* ── honey physics ──
           One 4.2s cycle shared by every part of the pour so the bulb swells,
           the strand thins, the drop falls and the pool ripples in sequence. */
        @keyframes hpBulb{
          0%{transform:translateY(0) scale(.72,.62)}
          30%{transform:translateY(3px) scale(1.05,1.02)}
          52%{transform:translateY(7px) scale(1.16,1.24)}
          62%{transform:translateY(2px) scale(.82,.72)}
          100%{transform:translateY(0) scale(.72,.62)}
        }
        .hp-bulb{transform-origin:130px 112px;animation:hpBulb 4.2s cubic-bezier(.45,.05,.3,1) infinite}

        @keyframes hpStream{
          0%{transform:scaleY(.06);opacity:0}
          22%{transform:scaleY(.3);opacity:.85}
          55%{transform:scaleY(1);opacity:1}
          88%{transform:scaleY(1);opacity:1}
          100%{transform:scaleY(.06);opacity:0}
        }
        .hp-stream-wrap{transform-origin:130px 118px;animation:hpStream 4.2s cubic-bezier(.5,0,.4,1) infinite}

        /* stretch while falling, squash on impact — the classic fluid tell */
        @keyframes hpDrop{
          0%{transform:translateY(112px) scaleY(.7) scaleX(1.1);opacity:0}
          14%{opacity:1}
          30%{transform:translateY(190px) scaleY(1.5) scaleX(.78);opacity:1}
          60%{transform:translateY(300px) scaleY(1.8) scaleX(.7);opacity:1}
          74%{transform:translateY(348px) scaleY(.62) scaleX(1.45);opacity:1}
          84%{transform:translateY(354px) scaleY(.3) scaleX(1.7);opacity:.35}
          100%{transform:translateY(356px) scaleY(.2) scaleX(1.8);opacity:0}
        }
        .hp-drop{transform-origin:130px 0px;animation:hpDrop 4.2s cubic-bezier(.55,0,.75,.55) infinite}
        .hp-drop-b{animation-delay:2.1s;animation-duration:4.2s}

        @keyframes hpPool{
          0%,55%{transform:scale(.9,.85)}
          78%{transform:scale(1.06,1.12)}
          100%{transform:scale(.9,.85)}
        }
        .hp-pool{transform-origin:130px 356px;animation:hpPool 4.2s ease-out infinite}
        .hp-pool2{transform-origin:130px 352px;animation:hpPool 4.2s ease-out .12s infinite}
        .hp-pool-shine{transform-origin:130px 352px;animation:hpPool 4.2s ease-out .12s infinite}

        @keyframes hpRipple{
          0%,62%{transform:scale(.35);opacity:0}
          74%{opacity:.55}
          100%{transform:scale(1.9);opacity:0}
        }
        .hp-ripple{transform-origin:130px 356px;animation:hpRipple 4.05s ease-out infinite}

        /* highlight slides down the stream like light on a wet surface */
        @keyframes hpShine{
          0%,20%{opacity:0;stroke-dashoffset:260}
          45%{opacity:.62}
          85%{opacity:.5;stroke-dashoffset:0}
          100%{opacity:0;stroke-dashoffset:0}
        }
        .hp-shine{stroke-dasharray:260;animation:hpShine 4.2s ease-in-out infinite}

        @keyframes mote{
          0%{transform:translateY(0) translateX(0) scale(1);opacity:0}
          12%{opacity:.75}
          88%{opacity:.5}
          100%{transform:translateY(-110vh) translateX(44px) scale(.45);opacity:0}
        }
        @keyframes auroraShift{
          0%,100%{transform:translate(0,0) scale(1)}
          33%{transform:translate(46px,-34px) scale(1.15)}
          66%{transform:translate(-34px,28px) scale(.9)}
        }
        .aurora{animation:auroraShift 22s ease-in-out infinite}
        @keyframes riseIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        .rise{animation:riseIn .8s cubic-bezier(.2,.8,.2,1) both}
        @keyframes sweep{from{transform:translateX(-140%)}to{transform:translateX(240%)}}
        .sweep::after{content:'';position:absolute;inset:0;width:38%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);
          animation:sweep 3.4s ease-in-out infinite}
        @keyframes glowPulse{0%,100%{opacity:.45}50%{opacity:1}}
        .glow-pulse{animation:glowPulse 3s ease-in-out infinite}
      `}</style>

      {/* warm ambient wash */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="aurora absolute -top-1/4 -left-1/4 w-[46rem] h-[46rem] rounded-full
                        bg-amber-300/40 blur-[130px]" />
        <div className="aurora absolute -bottom-1/4 -right-1/4 w-[46rem] h-[46rem] rounded-full
                        bg-orange-300/35 blur-[130px]" style={{ animationDelay: '8s' }} />
        <div className="aurora absolute top-1/3 left-1/2 w-[30rem] h-[30rem] rounded-full
                        bg-yellow-200/40 blur-[110px]" style={{ animationDelay: '14s' }} />
      </div>
      <div className="absolute inset-0 opacity-[0.55]"><Honeycomb /></div>
      <Motes />

      {/* ── card ── */}
      <div className="relative z-10 w-full max-w-5xl grid md:grid-cols-2 rounded-[28px] overflow-hidden
                      border border-amber-200/70 bg-white/70 backdrop-blur-2xl rise
                      shadow-[0_30px_90px_-24px_rgba(180,83,9,.35)]">

        {/* left: brand + pour */}
        <div className="relative p-10 flex flex-col justify-between overflow-hidden
                        bg-gradient-to-br from-amber-50/90 via-orange-50/70 to-amber-100/60
                        border-b md:border-b-0 md:border-r border-amber-200/60">
          <div className="relative">
            <div className="flex items-center gap-3 mb-7">
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400
                              to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/40">
                <Zap className="w-6 h-6 text-white" />
                <span className="glow-pulse absolute -inset-2 rounded-2xl border-2 border-amber-400/40" />
              </div>
              <div>
                <p className="text-slate-900 font-black text-xl tracking-tight leading-none">SalesIQ</p>
                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-amber-700/80 mt-1">
                  APIS India Limited
                </p>
              </div>
            </div>

            <h1 className="text-[2.6rem] leading-[1.08] font-black mb-4
                           bg-gradient-to-br from-amber-700 via-orange-600 to-amber-500
                           bg-clip-text text-transparent">
              Every drop<br />of your sales,<br />measured.
            </h1>
            <p className="text-amber-900/55 text-sm leading-relaxed max-w-xs">
              Revenue, geography, products, customers and forecasts — one place, updated the
              moment you upload.
            </p>
          </div>

          {/* the pour */}
          <div className="relative flex items-end justify-between mt-6">
            <div className="space-y-2 pb-4">
              {['Forecasting to 12 months', 'RFM & cohort intelligence', 'Live target pacing'].map((t, i) => (
                <div key={t} className="flex items-center gap-2 rise"
                  style={{ animationDelay: `${420 + i * 130}ms` }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-[11px] font-bold text-amber-900/55">{t}</span>
                </div>
              ))}
            </div>
            <HoneyPour className="w-[150px] h-[240px] -mb-2 -mr-2 flex-shrink-0" />
          </div>
        </div>

        {/* right: form */}
        <div className="relative p-10 flex flex-col justify-center bg-white/60">
          <div className="absolute top-6 right-6 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 glow-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
              Secure
            </span>
          </div>

          {step === 'email' ? (
            <form onSubmit={sendOtp} className="rise">
              <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-200
                              flex items-center justify-center mb-5">
                <Mail className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-1.5">Sign in</h2>
              <p className="text-[13px] text-slate-500 mb-7 leading-relaxed">
                SalesIQ is restricted. Enter your authorised email and we'll send a one-time code.
              </p>

              <label className="block text-[10px] font-black uppercase tracking-widest
                                text-amber-700/70 mb-2">Email address</label>
              <input type="email" value={email} autoFocus autoComplete="email"
                onChange={e => setEmail(e.target.value)}
                placeholder="you@apisindia.com"
                className="w-full px-4 py-3.5 rounded-xl bg-white border border-amber-200
                           text-slate-800 placeholder:text-slate-300 text-sm font-semibold
                           transition-all focus:outline-none focus:border-amber-400
                           focus:ring-4 focus:ring-amber-400/15" />

              {err && (
                <div className="flex items-start gap-2 mt-4 rounded-xl bg-rose-50
                                border border-rose-200 p-3 rise">
                  <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-rose-700 leading-relaxed">{err}</p>
                </div>
              )}

              <button type="submit" disabled={busy}
                className="sweep relative overflow-hidden w-full mt-6 flex items-center justify-center
                           gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500
                           text-white font-black shadow-lg shadow-amber-500/35 transition-all
                           hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/45
                           disabled:opacity-50 disabled:translate-y-0">
                {busy ? <><Loader className="w-4 h-4 animate-spin" />Sending…</>
                      : <>Send login code<ArrowRight className="w-4 h-4" /></>}
              </button>

              <p className="text-[11px] text-slate-400 mt-5 text-center leading-relaxed">
                Access is limited to the SalesIQ super admin. Contact the administrator if you
                need to be added.
              </p>
            </form>
          ) : (
            <div className="rise">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200
                              flex items-center justify-center mb-5">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-1.5">Enter your code</h2>
              <p className="text-[13px] text-slate-500 mb-7 leading-relaxed">
                We sent a 6-digit code to <b className="text-amber-700">{masked}</b>.
                It expires in <b className="text-amber-700 tabular-nums">{mmss}</b>.
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
                                text-2xl font-black text-slate-800 transition-all
                                focus:outline-none focus:ring-4 focus:ring-amber-400/15
                                ${d ? 'border-amber-400 bg-amber-50' : 'border-amber-200'}
                                focus:border-amber-400`} />
                ))}
              </div>

              {err && (
                <div className="flex items-start gap-2 mt-4 rounded-xl bg-rose-50
                                border border-rose-200 p-3 rise">
                  <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-rose-700 leading-relaxed">{err}</p>
                </div>
              )}

              {busy && (
                <div className="flex items-center justify-center gap-2 mt-5 text-amber-600">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-[12px] font-bold">Verifying…</span>
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

      <p className="absolute bottom-5 text-[10px] font-black uppercase tracking-[0.2em]
                    text-amber-800/30 z-10">
        APIS India Limited · Sales Intelligence
      </p>
    </div>
  );
}

export default SalesIQLogin;
