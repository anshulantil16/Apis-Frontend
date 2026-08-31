/* The door to the whole intranet.
 *
 * Two steps, one screen: your work email, then the six-digit code we send it.
 * No passwords anywhere — the company already trusts its mailboxes, and a
 * password is one more thing to leak, reset and re-use badly.
 *
 * Deliberately built from the dashboard's own vocabulary rather than a
 * bespoke look: the same #f5f7fa ground as IntranetShell, the same three
 * aurora blobs as the home page (cyan / violet / amber), the same ih-glass
 * panel, ih-particle field and ih-orbit ring used elsewhere. Signing in
 * should read as the front of this product, not a gate bolted onto it.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, Loader2, Mail, ShieldCheck, KeyRound, AlertCircle, ChevronLeft,
  CheckCircle2, Sparkles, Lock, Zap,
} from 'lucide-react';
import { IH_STYLES } from '../home/IntranetHomeShared';
import { PORTAL_API, setToken, type PortalUser } from './session';

const OTP_LENGTH = 6;
const RESEND_AFTER = 45;   // seconds before "resend" is offered

/* Rising motes, same technique as the dashboard hero. Amber rather than white
   because this sits on a light ground, where white is invisible. */
function ParticleField() {
  const pts = useMemo(() =>
    Array.from({ length: 22 }, () => ({
      l: Math.random() * 100, s: 2 + Math.random() * 4,
      d: Math.random() * 16, dur: 16 + Math.random() * 18, o: 0.12 + Math.random() * 0.25,
    })), []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {pts.map((p, i) => (
        <span key={i} className="ih-particle absolute rounded-full bg-amber-400"
          style={{ left: `${p.l}%`, bottom: '-6%', width: p.s, height: p.s, opacity: p.o,
                   boxShadow: '0 0 10px rgba(245,158,11,.55)',
                   animationDuration: `${p.dur}s`, animationDelay: `${p.d}s` }} />
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
    <div className="min-h-screen relative overflow-hidden bg-[#f5f7fa] flex items-center justify-center px-4 py-10">
      <style>{IH_STYLES}</style>

      {/* Ambient wash — the same three blobs, blur and drift as the dashboard,
          so the two screens read as one product. Decorative only. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ih-aurora absolute -top-40 -left-40 w-[38rem] h-[38rem] rounded-full bg-cyan-300/25 blur-[130px]" />
        <div className="ih-aurora absolute top-1/3 -right-40 w-[34rem] h-[34rem] rounded-full bg-violet-300/25 blur-[130px]" style={{ animationDelay: '6s' }} />
        <div className="ih-aurora absolute -bottom-40 left-1/3 w-[32rem] h-[32rem] rounded-full bg-amber-300/30 blur-[130px]" style={{ animationDelay: '12s' }} />
        <div className="ih-drift absolute top-1/4 left-1/4 w-[24rem] h-[24rem] rounded-full bg-orange-200/25 blur-[120px]" style={{ animationDelay: '3s' }} />
        {/* faint grid, for the glass to sit on rather than float in nothing */}
        <div className="absolute inset-0 opacity-[0.5]" style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.16) 1px, transparent 1px)',
          backgroundSize: '58px 58px',
          maskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 78%)',
        }} />
        <ParticleField />
      </div>

      <div className="relative w-full max-w-[430px]">
        {/* Brand */}
        <div className="ih-reveal text-center mb-7">
          <div className="relative inline-flex items-center justify-center mb-4">
            <span aria-hidden className="ih-orbit absolute w-[88px] h-[88px] rounded-full"
              style={{ ['--ih-orbit' as any]: '#f59e0b' }} />
            <span className="ih-halo ih-float relative w-[68px] h-[68px] rounded-2xl bg-white flex items-center
                             justify-center shadow-xl shadow-amber-500/15 ring-1 ring-amber-100"
              style={{ ['--ih-halo' as any]: 'rgba(245,158,11,.35)' }}>
              <img src="/logo.png" alt="" className="w-11 h-11 object-contain" />
            </span>
          </div>
          <h1 className="text-[26px] font-black tracking-tight text-slate-900 leading-none">
            APIS{' '}
            <span className="ih-grad-text bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600">
              Intranet
            </span>
          </h1>
          <p className="text-slate-400 text-xs font-bold mt-2 tracking-wide">
            One sign-in for every internal tool
          </p>
        </div>

        {/* Card */}
        <div className="ih-glass ih-scan relative rounded-3xl border border-white/70 p-6 shadow-2xl shadow-slate-900/[0.07]">
          {done ? (
            <div className="py-10 text-center ih-pop-in">
              <div className="ih-halo relative inline-flex mb-4"
                style={{ ['--ih-halo' as any]: 'rgba(16,185,129,.4)' }}>
                <CheckCircle2 className="w-14 h-14 text-emerald-500" />
              </div>
              <p className="font-black text-lg text-slate-900">Welcome back</p>
              <p className="text-slate-400 text-sm mt-1 font-semibold">Opening your dashboard…</p>
            </div>
          ) : step === 'email' ? (
            <div className="ih-stagger">
              <div className="mb-5">
                <h2 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                  </span>
                  Sign in
                </h2>
                <p className="text-slate-400 text-xs mt-1.5 font-semibold">
                  We'll email you a six-digit code. Nothing to remember.
                </p>
              </div>

              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Work email
              </label>
              <div className="relative mb-4 group">
                <Mail className="w-4 h-4 text-slate-300 group-focus-within:text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                <input
                  ref={emailRef}
                  type="email" autoComplete="email" inputMode="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && !busy && requestCode()}
                  placeholder="you@apisindia.com"
                  className="w-full bg-white/80 border-2 border-slate-200 focus:border-amber-400 rounded-xl
                             pl-10 pr-3 py-3 text-sm font-semibold text-slate-800 placeholder:text-slate-300
                             outline-none transition-all focus:shadow-lg focus:shadow-amber-500/10"
                />
              </div>

              <button
                onClick={() => requestCode()} disabled={busy}
                className="ih-sweep group w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500
                           text-white font-black py-3 rounded-xl flex items-center justify-center gap-2
                           disabled:opacity-50 transition-all shadow-lg shadow-amber-500/30
                           hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0">
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
                      : <>Send me a code<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
              </button>
            </div>
          ) : (
            <div className="ih-fade">
              <button onClick={() => { setStep('email'); setError(''); setNote(''); }}
                className="text-slate-400 hover:text-slate-700 text-xs font-black flex items-center gap-1 mb-4 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />Use a different email
              </button>

              <div className="mb-5">
                <h2 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center ih-breathe">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                  </span>
                  Enter your code
                </h2>
                <p className="text-slate-400 text-xs mt-1.5 font-semibold">
                  Sent to <span className="text-slate-700 font-black">{masked}</span> — valid for 5 minutes.
                </p>
              </div>

              <div className="flex gap-2 justify-between mb-4" onPaste={e => {
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
                    className={`ih-pop-in w-full aspect-square text-center text-xl font-black rounded-xl
                      bg-white/80 border-2 outline-none transition-all
                      ${d ? 'border-amber-400 text-amber-600 shadow-lg shadow-amber-500/15 scale-[1.03]'
                          : 'border-slate-200 text-slate-800'}
                      focus:border-amber-500 focus:shadow-lg focus:shadow-amber-500/20`}
                  />
                ))}
              </div>

              <button
                onClick={() => verify(otp)} disabled={busy || otp.length !== OTP_LENGTH}
                className="ih-sweep w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500
                           text-white font-black py-3 rounded-xl flex items-center justify-center gap-2
                           disabled:opacity-40 disabled:shadow-none transition-all shadow-lg shadow-amber-500/30
                           hover:shadow-xl hover:shadow-amber-500/40">
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" />Checking…</>
                      : <>Sign in<Sparkles className="w-4 h-4" /></>}
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
            <div className="ih-pop-in mt-4 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-px" />
              <p className="text-rose-700 text-xs font-bold">{error}</p>
            </div>
          )}
          {note && !error && (
            <div className="ih-pop-in mt-4 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-px" />
              <p className="text-emerald-700 text-xs font-bold">{note}</p>
            </div>
          )}
        </div>

        {/* Rotating assurance — the screen would otherwise sit dead still while
            someone waits on an email. */}
        {!done && (
          <div className="mt-5 h-9 flex items-center justify-center overflow-hidden">
            <div key={tip} className="ih-pop-in flex items-center gap-2 bg-white/60 backdrop-blur
                                      border border-white/80 rounded-full px-3.5 py-2 shadow-sm">
              <Tip className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <p className="text-[11px] font-bold text-slate-500">{ASSURANCES[tip].text}</p>
            </div>
          </div>
        )}

        <p className="text-center text-slate-300 text-[11px] font-bold mt-5">
          APIS India Limited · Internal use only
        </p>
      </div>
    </div>
  );
}
