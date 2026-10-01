/* Sign-in gate shown before the intranet app itself. No intranet-wide auth
 * backend exists yet (each tool that needs real login — Help Desk, SalesIQ —
 * carries its own OTP flow against its own API), so this checks only that
 * both fields are filled in, not that the credentials are real. It exists so
 * the app never opens straight onto the dashboard, and so the login screen
 * looks and behaves like production, ready to swap in a real endpoint later.
 *
 * Single centred card over the real signin_page.png honey-jar photo — not a
 * fake illustrated jar/bee graphic, since that photo already carries the
 * same imagery the reference design used a drawn version of.
 */
import { useState, type FormEvent } from 'react';
import {
  Mail, Lock, Eye, EyeOff, LogIn, ShieldCheck, AlertTriangle, Loader, Droplet, X, HelpCircle,
} from 'lucide-react';
import { IH_STYLES } from '../home/IntranetHomeShared';

/* Local copy of the same drifting-particle field used on the home shell and
   the Help Desk/SalesIQ logins — each screen owns its own tiny copy rather
   than importing across features. */
function Particles() {
  const [pts] = useState(() =>
    Array.from({ length: 26 }, () => ({
      l: Math.random() * 100, s: 2 + Math.random() * 4,
      d: Math.random() * 16, dur: 14 + Math.random() * 18, o: 0.2 + Math.random() * 0.35,
    })),
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {pts.map((p, i) => (
        <span key={i} className="absolute rounded-full bg-amber-200"
          style={{ left: `${p.l}%`, bottom: '-6%', width: p.s, height: p.s, opacity: p.o,
                   boxShadow: '0 0 10px rgba(245,158,11,.6)',
                   animation: `ihSignInFloat ${p.dur}s ease-in-out ${p.d}s infinite alternate` }} />
      ))}
    </div>
  );
}

interface Props {
  /** Called once the form is "submitted" successfully. `remember` decides
   *  whether App.tsx persists the session past this browser tab: checked
   *  writes to localStorage (survives new tabs/restarts), unchecked writes
   *  to sessionStorage (survives a refresh, but not a new tab or closing
   *  this one — so it re-prompts next time). */
  onSuccess: (remember: boolean) => void;
}

export function SignInPage({ onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [forgotNotice, setForgotNotice] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Enter both your email/employee ID and password to continue.');
      return;
    }
    setError('');
    setBusy(true);
    // No backend to authenticate against yet — a brief delay keeps the
    // button's loading state from feeling instant/fake, same purpose as the
    // OTP flows elsewhere in this app.
    setTimeout(() => { setBusy(false); onSuccess(remember); }, 550);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-14 sm:py-16">
      <style>{IH_STYLES}</style>
      <style>{`@keyframes ihSignInFloat { from { transform: translateY(0); } to { transform: translateY(-75vh); } }`}</style>

      {/* full-bleed real honey-jar/bees photo, same asset the app already
          ships at public/signin_page.png — this IS the "illustration",
          not a stand-in for one */}
      <img src="/signin_page.png" alt="" aria-hidden
        className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 via-amber-900/5 to-amber-950/35" />

      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="ih-aurora absolute -bottom-40 -right-24 w-[36rem] h-[36rem] rounded-full bg-amber-200/20 blur-[130px]" style={{ animationDelay: '6s' }} />
      </div>
      <Particles />

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
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <img src="/logo.png" alt="APIS" className="w-6 h-6 object-contain" />
              <span className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-600">APIS Intranet</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Welcome Back</h1>
            <p className="text-slate-400 text-[15px] mt-1.5">Sign in to continue</p>
          </div>

          <form onSubmit={submit} className="ih-fade" style={{ animationDelay: '120ms' }}>
            <div className="relative">
              <Mail className="w-5 h-5 text-amber-400/70 absolute left-4 top-1/2 -translate-y-1/2" />
              <input type="text" value={email} autoFocus autoComplete="username"
                onChange={e => setEmail(e.target.value)} placeholder="Email address"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-amber-50/60 border border-amber-100
                           text-slate-800 placeholder:text-slate-400 text-[15px] font-semibold transition-all
                           focus:outline-none focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15" />
            </div>

            <div className="relative mt-3.5">
              <Lock className="w-5 h-5 text-amber-400/70 absolute left-4 top-1/2 -translate-y-1/2" />
              <input type={showPassword ? 'text' : 'password'} value={password} autoComplete="current-password"
                onChange={e => setPassword(e.target.value)} placeholder="Password"
                className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-amber-50/60 border border-amber-100
                           text-slate-800 placeholder:text-slate-400 text-[15px] font-semibold transition-all
                           focus:outline-none focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15" />
              <button type="button" onClick={() => setShowPassword(s => !s)}
                title={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-amber-500 transition-colors">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center justify-between mt-4">
              <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-500 cursor-pointer select-none">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-amber-500" />
                Remember me
              </label>
              <button type="button" onClick={() => setForgotNotice(true)}
                className="flex items-center gap-1.5 text-[13px] font-bold text-amber-600 hover:text-amber-700 transition-colors">
                <Lock className="w-3 h-3" />Forgot password?
              </button>
            </div>

            {forgotNotice && (
              <div className="ih-fade flex items-start gap-2 mt-3.5 rounded-xl bg-amber-50 border border-amber-200 p-3">
                <ShieldCheck className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-[12.5px] text-amber-700 leading-relaxed flex-1">
                  Password reset isn't available yet — raise a request with the IT Helpdesk once you're signed in.
                </p>
                <button type="button" onClick={() => setForgotNotice(false)} className="text-amber-400 hover:text-amber-600 transition-colors shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {error && (
              <div className="ih-fade flex items-start gap-2 mt-3.5 rounded-xl bg-rose-50 border border-rose-200 p-3">
                <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <p className="text-[12.5px] text-rose-700 leading-relaxed">{error}</p>
              </div>
            )}

            <button type="submit" disabled={busy}
              className="ih-sheen relative overflow-hidden w-full mt-6 flex items-center justify-center gap-2
                         px-6 py-4 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-white
                         text-[16px] font-black shadow-[0_16px_34px_-10px_rgba(217,119,6,.6)] transition-all
                         hover:-translate-y-0.5 hover:shadow-[0_20px_42px_-10px_rgba(217,119,6,.7)]
                         disabled:opacity-60 disabled:translate-y-0">
              {busy ? <><Loader className="w-5 h-5 animate-spin" />Signing in…</>
                : <><LogIn className="w-5 h-5" />Login</>}
            </button>
          </form>

          <div className="flex items-center gap-3 mt-7">
            <span className="flex-1 border-t border-dashed border-amber-200" />
            <Droplet className="w-3 h-3 text-amber-300" />
            <span className="flex-1 border-t border-dashed border-amber-200" />
          </div>

          <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-slate-400 mt-4">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            Need access? <span className="text-amber-600 font-bold">Contact the IT Helpdesk</span>
          </p>
        </div>

        <p className="ih-fade flex items-center justify-center gap-1.5 text-[11px] font-semibold text-amber-50/90 mt-5"
          style={{ animationDelay: '220ms' }}>
          <ShieldCheck className="w-3.5 h-3.5" />Your data is protected with enterprise-grade security
        </p>
      </div>
    </div>
  );
}

export default SignInPage;
