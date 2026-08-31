/* The door to the whole intranet.
 *
 * Two steps, one screen: your work email, then the six-digit code we send it.
 * No passwords anywhere — the company already trusts its mailboxes, and a
 * password is one more thing to leak, reset and re-use badly.
 *
 * The visual language is the intranet's own (ih-aurora, ih-mesh, ih-glass,
 * ih-orbit from intranetStyles.ts) rather than a bespoke look, so signing in
 * reads as the front of this product and not a gate bolted onto it.
 */
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Loader2, Mail, ShieldCheck, KeyRound, AlertCircle, ChevronLeft, CheckCircle2,
} from 'lucide-react';
import { IH_STYLES } from '../home/IntranetHomeShared';
import { PORTAL_API, setToken, type PortalUser } from './session';

const OTP_LENGTH = 6;
const RESEND_AFTER = 45;   // seconds before "resend" is offered

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

  const emailRef = useRef<HTMLInputElement>(null);
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { emailRef.current?.focus(); }, []);
  useEffect(() => { if (step === 'otp') boxRefs.current[0]?.focus(); }, [step]);

  // Counts the resend cooldown down to zero.
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
      setTimeout(() => onSignedIn(d.user as PortalUser), 700);
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
      // A paste lands in one box but belongs across the row.
      cleaned.split('').forEach((ch, k) => { if (i + k < OTP_LENGTH) next[i + k] = ch; });
      const filled = Math.min(i + cleaned.length, OTP_LENGTH - 1);
      setTimeout(() => boxRefs.current[filled]?.focus(), 0);
      const code = next.join('');
      if (code.length === OTP_LENGTH && !code.includes('')) setTimeout(() => verify(code), 120);
      return next;
    });
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) boxRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) boxRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) boxRefs.current[i + 1]?.focus();
    if (e.key === 'Enter' && otp.length === OTP_LENGTH) verify(otp);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0b0f1a] text-white flex items-center justify-center px-4 py-10">
      <style>{IH_STYLES}</style>

      {/* Ambient depth. Decorative only — aria-hidden so a screen reader is
          not read a paragraph of empty divs before reaching the form. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="ih-mesh absolute inset-0 opacity-[0.45]" />
        <div className="ih-drift absolute -top-40 -left-32 w-[38rem] h-[38rem] rounded-full bg-amber-500/20 blur-[150px]" />
        <div className="ih-aurora absolute top-1/4 -right-40 w-[34rem] h-[34rem] rounded-full bg-indigo-500/20 blur-[150px]" />
        <div className="ih-drift absolute -bottom-40 left-1/3 w-[30rem] h-[30rem] rounded-full bg-amber-400/15 blur-[150px]"
          style={{ animationDelay: '7s' }} />
        {/* faint grid, to give the glass something to sit on */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
          backgroundSize: '54px 54px',
        }} />
      </div>

      <div className="relative w-full max-w-[420px]">
        {/* Brand */}
        <div className="ih-fade text-center mb-7">
          <div className="relative inline-flex items-center justify-center mb-4">
            <span aria-hidden className="ih-orbit absolute w-[86px] h-[86px] rounded-full border border-amber-400/30" />
            <span aria-hidden className="absolute w-[70px] h-[70px] rounded-full bg-amber-400/20 blur-xl ih-breathe" />
            <span className="relative w-16 h-16 rounded-2xl bg-white/95 flex items-center justify-center shadow-2xl shadow-amber-500/20">
              <img src="/logo.png" alt="" className="w-11 h-11 object-contain" />
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            APIS <span className="text-amber-400">Intranet</span>
          </h1>
          <p className="text-white/45 text-xs font-semibold mt-1.5 tracking-wide">
            One sign-in for every internal tool
          </p>
        </div>

        {/* Card */}
        <div className="ih-glass rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-2xl p-6 shadow-2xl shadow-black/40">
          {done ? (
            <div className="py-8 text-center ih-pop-in">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="font-black text-lg">Welcome back</p>
              <p className="text-white/50 text-sm mt-1">Opening your dashboard…</p>
            </div>
          ) : step === 'email' ? (
            <>
              <div className="mb-5">
                <h2 className="font-black text-lg flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />Sign in
                </h2>
                <p className="text-white/45 text-xs mt-1">
                  We'll email you a six-digit code. No password to remember.
                </p>
              </div>

              <label className="block text-[11px] font-black text-white/50 uppercase tracking-widest mb-2">
                Work email
              </label>
              <div className="relative mb-4">
                <Mail className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={emailRef}
                  type="email" autoComplete="email" inputMode="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && !busy && requestCode()}
                  placeholder="you@apisindia.com"
                  className="w-full bg-white/[0.06] border-2 border-white/10 focus:border-amber-400/70 rounded-xl pl-10 pr-3 py-3 text-sm font-semibold placeholder:text-white/25 outline-none transition-colors"
                />
              </div>

              <button
                onClick={() => requestCode()} disabled={busy}
                className="group w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#0b0f1a] font-black py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/25">
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
                      : <>Send me a code<ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setStep('email'); setError(''); setNote(''); }}
                className="text-white/40 hover:text-white/80 text-xs font-bold flex items-center gap-1 mb-4 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />Use a different email
              </button>

              <div className="mb-5">
                <h2 className="font-black text-lg flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-400" />Enter your code
                </h2>
                <p className="text-white/45 text-xs mt-1">
                  Sent to <span className="text-white/80 font-bold">{masked}</span> — valid for 5 minutes.
                </p>
              </div>

              <div className="flex gap-2 justify-between mb-4" onPaste={e => {
                // Catch a paste anywhere in the row, not just the focused box.
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
                    className={`w-full aspect-square text-center text-xl font-black rounded-xl bg-white/[0.06] border-2 outline-none transition-all
                      ${d ? 'border-amber-400/70 text-amber-300' : 'border-white/10 text-white'}
                      focus:border-amber-400 focus:bg-white/[0.1]`}
                  />
                ))}
              </div>

              <button
                onClick={() => verify(otp)} disabled={busy || otp.length !== OTP_LENGTH}
                className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#0b0f1a] font-black py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 transition-all shadow-lg shadow-amber-500/25">
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" />Checking…</> : 'Sign in'}
              </button>

              <div className="text-center mt-4">
                {cooldown > 0 ? (
                  <p className="text-white/30 text-xs font-semibold">
                    Didn't get it? You can ask again in {cooldown}s
                  </p>
                ) : (
                  <button onClick={() => requestCode(true)} disabled={busy}
                    className="text-amber-400 hover:text-amber-300 text-xs font-black transition-colors disabled:opacity-40">
                    Send a new code
                  </button>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="ih-pop-in mt-4 flex items-start gap-2 bg-rose-500/10 border border-rose-400/30 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-px" />
              <p className="text-rose-200 text-xs font-semibold">{error}</p>
            </div>
          )}
          {note && !error && (
            <div className="ih-pop-in mt-4 flex items-start gap-2 bg-emerald-500/10 border border-emerald-400/30 rounded-xl px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-px" />
              <p className="text-emerald-200 text-xs font-semibold">{note}</p>
            </div>
          )}
        </div>

        <p className="text-center text-white/25 text-[11px] font-semibold mt-6">
          APIS India Limited · Internal use only
        </p>
      </div>
    </div>
  );
}
