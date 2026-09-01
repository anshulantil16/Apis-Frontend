/* The door to the whole intranet.
 *
 * Two steps, one screen: your work email, then the six-digit code we send it.
 * No passwords anywhere — the company already trusts its mailboxes, and a
 * password is one more thing to leak, reset and re-use badly.
 *
 * Visual language borrowed from SignInPage (features/auth) rather than the
 * dashboard's glass/aurora look: the full-bleed honey-jar photo, the
 * icon tile peeking above the card, the rounded-[36px] white card and pill
 * button. The credential flow underneath is unchanged — email then OTP,
 * not SignInPage's email/password — only the frontend moved.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, Mail, ShieldCheck, AlertCircle, ChevronLeft,
  CheckCircle2, Sparkles, Lock, Zap, Droplet, HelpCircle,
} from 'lucide-react';
import { IH_STYLES } from '../home/IntranetHomeShared';
import { PORTAL_API, setToken, type PortalUser } from './session';

const OTP_LENGTH = 6;
const RESEND_AFTER = 45;   // seconds before "resend" is offered

/* Rising motes over the honey-jar photo — same technique and palette as
   SignInPage's own Particles, kept local to this file rather than shared
   across features. */
function ParticleField() {
  const pts = useMemo(() =>
    Array.from({ length: 26 }, () => ({
      l: Math.random() * 100, s: 2 + Math.random() * 4,
      d: Math.random() * 16, dur: 14 + Math.random() * 18, o: 0.2 + Math.random() * 0.35,
    })), []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {pts.map((p, i) => (
        <span key={i} className="absolute rounded-full bg-amber-200"
          style={{ left: `${p.l}%`, bottom: '-6%', width: p.s, height: p.s, opacity: p.o,
                   boxShadow: '0 0 10px rgba(245,158,11,.6)',
                   animation: `ihLoginFloat ${p.dur}s ease-in-out ${p.d}s infinite alternate` }} />
      ))}
    </div>
  );
}

/* Three lines that rotate under the card. The screen is otherwise static
   while someone waits for an email, and a portal that says nothing while you
   wait feels like one that has stopped working. */
const ASSURANCES = [
  { icon: Lock, text: 'No passwords — a fresh code each time you sign in' },
  { icon: ShieldCheck, text: 'Codes expire in five minutes and work only once' },
  { icon: Zap, text: 'One sign-in opens every tool you have access to' },
];

export function LoginPortal({ onSignedIn }: { onSignedIn: (u: PortalUser) => void }) {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [masked, setMasked] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [done, setDone] = useState(false);
  const [tip, setTip] = useState(0);

  const emailRef = useRef<HTMLInputElement>(null);
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { emailRef.current?.focus(); }, []);
  useEffect(() => { if (step === 'otp') boxRefs.current[0]?.focus(); }, [step]);

  useEffect(() => {
    const iv = setInterval(() => setTip(t => (t + 1) % ASSURANCES.length), 4200);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const otp = digits.join('');

  const requestCode = async (resend = false) => {
    const addr = email.trim().toLowerCase();
    if (!addr || !addr.includes('@')) { setError('Enter your work email address.'); return; }
    setBusy(true); setError(''); setNote('');
    try {
      const r = await fetch(`${PORTAL_API}/request-otp/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addr }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || 'Could not send the code. Try again.'); setBusy(false); return; }
      setMasked(d.masked_email || addr);
      setStep('otp');
      setCooldown(RESEND_AFTER);
      if (resend) { setDigits(Array(OTP_LENGTH).fill('')); setNote('A new code is on its way.'); }
      /* Local development only. The server sends dev_otp back instead of
         emailing it when PORTAL_DEV_LOGIN=1, because a developer machine has
         no SMTP credentials — so fill the boxes in rather than making them
         read the code out of a terminal. Never present on a deployed server. */
      if (typeof d.dev_otp === 'string') {
        setDigits(d.dev_otp.padEnd(OTP_LENGTH, ' ').slice(0, OTP_LENGTH).split(''));
        setNote('Development sign-in — code filled in for you.');
      }
    } catch {
      setError('Could not reach the server. Check your connection.');
    }
    setBusy(false);
  };

  const verify = async (code: string) => {
    setBusy(true); setError(''); setNote('');
    try {
      const r = await fetch(`${PORTAL_API}/verify-otp/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: code }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error || 'That code is not right.');
        setDigits(Array(OTP_LENGTH).fill(''));
        boxRefs.current[0]?.focus();
        setBusy(false);
        return;
      }
      setToken(d.token);
      // A beat on the success state before handing over, so the sign-in reads
      // as completed rather than as the screen vanishing.
      setDone(true);
      setTimeout(() => onSignedIn(d.user as PortalUser), 900);
    } catch {
      setError('Could not reach the server. Check your connection.');
      setBusy(false);
    }
  };

  /* One box per digit. Typing advances, backspace on an empty box steps back,
     and a pasted code fills the row — people paste codes out of their mail
     client far more often than they type them. */
  const setDigit = (i: number, v: string) => {
    const cleaned = v.replace(/\D/g, '');
    if (!cleaned) { setDigits(d => d.map((x, j) => (j === i ? '' : x))); return; }
    setDigits(prev => {
      const next = [...prev];
      cleaned.split('').forEach((ch, k) => { if (i + k < OTP_LENGTH) next[i + k] = ch; });
      const filled = Math.min(i + cleaned.length, OTP_LENGTH - 1);
      setTimeout(() => boxRefs.current[filled]?.focus(), 0);
      const code = next.join('');
      if (code.length === OTP_LENGTH && !code.includes('')) setTimeout(() => verify(code), 140);
      return next;
    });
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) boxRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) boxRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) boxRefs.current[i + 1]?.focus();
    if (e.key === 'Enter' && otp.length === OTP_LENGTH) verify(otp);
  };

  const Tip = ASSURANCES[tip].icon;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-14 sm:py-16">
      <style>{IH_STYLES}</style>
      <style>{`@keyframes ihLoginFloat { from { transform: translateY(0); } to { transform: translateY(-75vh); } }`}</style>

      {/* Full-bleed honey-jar/bees photo — the illustration itself, not a
          stand-in. Stored as JPEG, not the PNG it arrived as: PNG is lossless
          and a photograph has no flat colour to compress, so it was shipping
          2.0 MB — six times the whole JavaScript bundle, on the first screen
          anyone sees. At quality 85 it is 225 kB and, scaled to cover behind a
          card and a gradient wash, looks the same.
          decoding=async keeps it off the critical path so the card and the
          email field paint without waiting for the photo. */}
      <img src="/signin_page.jpg" alt="" aria-hidden
        decoding="async" fetchPriority="high"
        className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 via-amber-900/5 to-amber-950/35" />

      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="ih-aurora absolute -bottom-40 -right-24 w-[36rem] h-[36rem] rounded-full bg-amber-200/20 blur-[130px]" style={{ animationDelay: '6s' }} />
      </div>
      <ParticleField />

      {/* centred card, decorative icon tile "peeking" above its top edge */}
      <div className="relative z-10 w-full max-w-lg">
        <div className="flex justify-center relative z-20" style={{ marginBottom: '-2.75rem' }}>
          <div className="ih-pop-in ih-float ih-border-flow w-20 h-20 sm:w-24 sm:h-24 rounded-3xl
                          bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500
                          shadow-[0_18px_40px_-10px_rgba(217,119,6,.6)] flex items-center justify-center p-3.5 sm:p-4">
            <span className="ih-pulse-glow absolute -inset-2 rounded-3xl border-2 border-amber-300/40" />
            <img src="/logo.png" alt="APIS" className="w-full h-full object-contain drop-shadow" />
          </div>
        </div>

        <div className="ih-reveal rounded-[36px] bg-white/95 backdrop-blur-xl border border-amber-100
                        shadow-[0_40px_100px_-20px_rgba(120,53,15,.45)] pt-14 sm:pt-16 px-7 sm:px-11 pb-9 sm:pb-11">
          {done ? (
            <div className="py-6 text-center ih-pop-in">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-600">Apis India Limited</span>
              </div>
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-2" />
              <p className="font-black text-lg text-slate-900">Welcome back</p>
              <p className="text-slate-400 text-[15px] mt-1.5">Opening your dashboard…</p>
            </div>
          ) : step === 'email' ? (
            <div className="ih-stagger">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-600">Apis India Limited</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Sign In</h1>
                <p className="text-slate-400 text-[15px] mt-1.5">We'll email you a six-digit code</p>
              </div>

              <div className="relative">
                <Mail className="w-5 h-5 text-amber-400/70 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  ref={emailRef}
                  type="email" autoComplete="email" inputMode="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && !busy && requestCode()}
                  placeholder="you@apisindia.com"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-amber-50/60 border border-amber-100
                             text-slate-800 placeholder:text-slate-400 text-[15px] font-semibold transition-all
                             focus:outline-none focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15" />
              </div>

              <button
                onClick={() => requestCode()} disabled={busy}
                className="ih-sheen relative overflow-hidden w-full mt-6 flex items-center justify-center gap-2
                           px-6 py-4 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-white
                           text-[16px] font-black shadow-[0_16px_34px_-10px_rgba(217,119,6,.6)] transition-all
                           hover:-translate-y-0.5 hover:shadow-[0_20px_42px_-10px_rgba(217,119,6,.7)]
                           disabled:opacity-60 disabled:translate-y-0">
                {busy ? 'Sending…' : <>Send me a code<ArrowRight className="w-5 h-5" /></>}
              </button>
            </div>
          ) : (
            <div className="ih-fade">
              <button onClick={() => { setStep('email'); setError(''); setNote(''); }}
                className="text-slate-400 hover:text-slate-700 text-xs font-black flex items-center gap-1 mb-4 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />Use a different email
              </button>

              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-600">Apis India Limited</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Enter Your Code</h1>
                <p className="text-slate-400 text-[15px] mt-1.5">
                  Sent to <span className="text-slate-700 font-black">{masked}</span> — valid for 5 minutes
                </p>
              </div>

              <div className="flex gap-2 justify-between" onPaste={e => {
                const text = e.clipboardData.getData('text').replace(/\D/g, '');
                if (text) { e.preventDefault(); setDigit(0, text.slice(0, OTP_LENGTH)); }
              }}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { boxRefs.current[i] = el; }}
                    value={d}
                    onChange={e => { setDigit(i, e.target.value); setError(''); }}
                    onKeyDown={e => onKey(i, e)}
                    inputMode="numeric" autoComplete="one-time-code" maxLength={1}
                    aria-label={`Digit ${i + 1}`}
                    style={{ animationDelay: `${i * 45}ms` }}
                    className={`ih-pop-in w-full aspect-square text-center text-xl font-black rounded-2xl
                      border outline-none transition-all
                      ${d ? 'bg-white border-amber-400 text-amber-600 ring-4 ring-amber-400/15'
                          : 'bg-amber-50/60 border-amber-100 text-slate-800'}
                      focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15`}
                  />
                ))}
              </div>

              <button
                onClick={() => verify(otp)} disabled={busy || otp.length !== OTP_LENGTH}
                className="ih-sheen relative overflow-hidden w-full mt-6 flex items-center justify-center gap-2
                           px-6 py-4 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-white
                           text-[16px] font-black shadow-[0_16px_34px_-10px_rgba(217,119,6,.6)] transition-all
                           hover:-translate-y-0.5 hover:shadow-[0_20px_42px_-10px_rgba(217,119,6,.7)]
                           disabled:opacity-60 disabled:translate-y-0">
                {busy ? 'Checking…' : <>Sign in<Sparkles className="w-5 h-5" /></>}
              </button>

              <div className="text-center mt-4">
                {cooldown > 0 ? (
                  <p className="text-slate-300 text-xs font-bold">
                    Didn't get it? You can ask again in {cooldown}s
                  </p>
                ) : (
                  <button onClick={() => requestCode(true)} disabled={busy}
                    className="text-amber-600 hover:text-amber-700 text-xs font-black transition-colors disabled:opacity-40">
                    Send a new code
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="ih-fade flex items-start gap-2 mt-3.5 rounded-xl bg-rose-50 border border-rose-200 p-3">
              <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
              <p className="text-[12.5px] text-rose-700 leading-relaxed">{error}</p>
            </div>
          )}
          {note && !error && (
            <div className="ih-fade flex items-start gap-2 mt-3.5 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-[12.5px] text-emerald-700 leading-relaxed">{note}</p>
            </div>
          )}

          {!done && (
            <>
              <div className="flex items-center gap-3 mt-7">
                <span className="flex-1 border-t border-dashed border-amber-200" />
                <Droplet className="w-3 h-3 text-amber-300" />
                <span className="flex-1 border-t border-dashed border-amber-200" />
              </div>

              {/* Rotating assurance — the screen would otherwise sit dead
                  still while someone waits on an email. */}
              <div key={tip} className="ih-pop-in flex items-center justify-center gap-1.5 text-[12.5px] text-slate-400 mt-4">
                <Tip className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {ASSURANCES[tip].text}
              </div>

              <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-slate-400 mt-2">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                Trouble signing in? <span className="text-amber-600 font-bold">Contact the IT Helpdesk</span>
              </p>
            </>
          )}
        </div>

        <p className="ih-fade flex items-center justify-center gap-1.5 text-[11px] font-semibold text-amber-50/90 mt-5"
          style={{ animationDelay: '220ms' }}>
          <ShieldCheck className="w-3.5 h-3.5" />Your data is protected with enterprise-grade security
        </p>
      </div>
    </div>
  );
}
