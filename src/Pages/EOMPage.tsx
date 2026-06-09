import { useState, useEffect } from 'react';
import { ArrowLeft, Users, BarChart3, LineChart, Mail, Zap } from 'lucide-react';
import { EOMEmployeeView }  from '../Components/EOM/employee/EOMEmployeeView';
import { EOMHodView }       from '../Components/EOM/hod/EOMHodView';
import { EOMPanelView }     from '../Components/EOM/panel/EOMPanelView';
import { EOMHrView }        from '../Components/EOM/hr/EOMHrView';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const EOM_API = `${API_BASE}/api/eom`;

type Role = 'employee' | 'hod' | 'panel' | 'hr';
type LoginStep = 'id' | 'otp' | 'admin_otp';

interface EOMPageProps { onNavigateBack: () => void; }

const ROLE_CONFIG = [
  {
    id: 'employee' as Role,
    label: 'Employee', sub: 'Submit your EOM nomination',
    active:   'from-emerald-50 to-teal-50 border-emerald-400 text-emerald-700',
    inactive: 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50',
    iconBg:   'bg-emerald-100 text-emerald-600',
    icon: Users,
  },
  {
    id: 'hod' as Role,
    label: 'HOD', sub: 'Review dimension 1 (50 pts)',
    active:   'from-violet-50 to-purple-50 border-violet-400 text-violet-700',
    inactive: 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/50',
    iconBg:   'bg-violet-100 text-violet-600',
    icon: BarChart3,
  },
  {
    id: 'panel' as Role,
    label: 'Panel', sub: 'Review dimensions 2-5 (50 pts)',
    active:   'from-indigo-50 to-blue-50 border-indigo-400 text-indigo-700',
    inactive: 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50',
    iconBg:   'bg-indigo-100 text-indigo-600',
    icon: BarChart3,
  },
  {
    id: 'hr' as Role,
    label: 'Admin', sub: 'Full access & finalize winner',
    active:   'from-rose-50 to-red-50 border-rose-400 text-rose-700',
    inactive: 'border-slate-200 hover:border-rose-300 hover:bg-rose-50/50',
    iconBg:   'bg-rose-100 text-rose-600',
    icon: LineChart,
  },
] as const;

// ─── Hub ──────────────────────────────────────────────────────────────────────

function EOMHub({ user, role, onLogout, onNavigateBack }: {
  user: any; role: Role; onLogout: () => void; onNavigateBack: () => void;
}) {
  const roleLabel = { employee: 'Employee', hod: 'HOD', panel: 'Panel Member', hr: 'Admin' }[role];
  const roleBadge = {
    employee: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    hod:      'bg-violet-50 text-violet-700 border-violet-200',
    panel:    'bg-indigo-50 text-indigo-700 border-indigo-200',
    hr:       'bg-rose-50 text-rose-700 border-rose-200',
  }[role];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => history.back()}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 flex items-center justify-center shrink-0">
                <img src="/logo.png" alt="APIS" className="w-full h-full object-contain drop-shadow-sm" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-900 font-bold text-sm leading-none truncate">Employee of the Month</p>
                <p className="text-slate-500 text-[11px] mt-0.5 truncate">{user.name} · {user.designation}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${roleBadge}`}>
              {roleLabel}
            </span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-black text-sm">
              {(user.name || 'U')[0].toUpperCase()}
            </div>
            <button onClick={onLogout}
              className="text-slate-400 hover:text-rose-500 text-xs font-semibold transition-colors px-2 py-1 rounded-lg hover:bg-rose-50">
              Sign Out
            </button>
            <button onClick={onNavigateBack}
              className="hidden lg:block text-slate-400 hover:text-slate-700 text-xs font-semibold transition-colors">
              ← Home
            </button>
          </div>
        </div>
      </header>
      {role === 'employee' && <EOMEmployeeView employee={user} />}
      {role === 'hod'      && <EOMHodView      hod={user}      />}
      {role === 'panel'    && <EOMPanelView    panelUser={user} />}
      {role === 'hr'       && <EOMHrView       hrUser={user}   />}
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

export function EOMPage({ onNavigateBack }: EOMPageProps) {
  const VALID_ROLES: Role[] = ['employee', 'hod', 'panel', 'hr'];

  const [role, setRole]     = useState<Role | null>(() => {
    const saved = localStorage.getItem('eom_role') as Role | null;
    return saved && VALID_ROLES.includes(saved) ? saved : null;
  });
  const [user, setUser]     = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('eom_user') || 'null'); } catch { return null; }
  });
  const [inputId, setInputId]         = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [step, setStep]               = useState<LoginStep>('id');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpInput, setOtpInput]       = useState('');

  useEffect(() => {
    if (user) localStorage.setItem('eom_user', JSON.stringify(user));
    else localStorage.removeItem('eom_user');
  }, [user]);

  useEffect(() => {
    if (role && user) localStorage.setItem('eom_role', role);
    else if (!user) localStorage.removeItem('eom_role');
  }, [role, user]);

  const parseJson = async (res: Response) => {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    await res.text();
    throw new Error(`Server error (${res.status}). Make sure the backend is running.`);
  };

  const handleSendOtp = async () => {
    if (!inputId.trim() || !role) return;
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${EOM_API}/auth/send-otp/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: inputId.trim() }),
      });
      const data = await parseJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP.');
      setMaskedEmail(data.masked_email);
      setStep('otp');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput.trim()) return;
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${EOM_API}/auth/verify-otp/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: inputId.trim(), otp: otpInput.trim() }),
      });
      const data = await parseJson(res);
      if (!res.ok) throw new Error(data.error || 'OTP verification failed.');
      if (role === 'hod'   && data.user_type !== 'hod')   throw new Error(`${data.name} is not registered as a HOD.`);
      if (role === 'panel' && data.user_type !== 'panel') throw new Error(`${data.name} is not registered as a Panel Member.`);
      if (role === 'hr'    && data.user_type !== 'hr')    throw new Error(`${data.name} is not registered as an Admin.`);
      setUser(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleAdminOtp = async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${EOM_API}/auth/admin-otp/`, { method: 'POST' });
      const data = await parseJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP.');
      setMaskedEmail(data.masked_email);
      setStep('admin_otp');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleAdminVerify = async () => {
    if (!otpInput.trim()) return;
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${EOM_API}/auth/admin-verify/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpInput.trim() }),
      });
      const data = await parseJson(res);
      if (!res.ok) throw new Error(data.error || 'OTP verification failed.');
      setRole('hr');
      setUser(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleBackToId = () => {
    history.back(); // let popstate handle the state change
  };

  const reset = () => {
    setUser(null); setRole(null); setInputId(''); setStep('id'); setOtpInput(''); setError('');
    localStorage.removeItem('eom_user');
    localStorage.removeItem('eom_role');
  };

  // ── History API: push state on every navigation ──────────────────────────────
  // On mount, anchor the history so back-button has something to pop to
  useEffect(() => {
    history.replaceState({ eom: 'start' }, '');
  }, []);

  // Push when login step changes
  useEffect(() => {
    if (step === 'otp')       history.pushState({ eom: 'otp' }, '');
    else if (step === 'admin_otp') history.pushState({ eom: 'admin_otp' }, '');
    // 'id' is always the base — no push (handled by popstate returning to 'start')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Push when user logs in (hub)
  useEffect(() => {
    if (user && role) history.pushState({ eom: 'hub', role }, '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user]);

  // Listen for browser back/forward
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const s = e.state as any;
      if (!s || s.eom === 'start') {
        // Went all the way back — reset to role/id selection
        setUser(null);
        setRole(null);
        setStep('id');
        setOtpInput('');
        setError('');
        localStorage.removeItem('eom_user');
        localStorage.removeItem('eom_role');
      } else if (s.eom === 'otp') {
        setUser(null);
        setStep('otp');
        setError('');
      } else if (s.eom === 'admin_otp') {
        setUser(null);
        setStep('admin_otp');
        setError('');
      } else if (s.eom === 'hub') {
        // Popping back from within the hub (employee form going back past step 1)
        // restore the logged-in state — user is still in localStorage
        const savedUser = (() => { try { return JSON.parse(localStorage.getItem('eom_user') || 'null'); } catch { return null; } })();
        const savedRole = localStorage.getItem('eom_role') as Role | null;
        if (savedUser && savedRole) {
          setUser(savedUser);
          setRole(savedRole);
        } else {
          setStep('id');
          setUser(null);
        }
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (user && role) {
    return <EOMHub user={user} role={role} onLogout={reset} onNavigateBack={onNavigateBack} />;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-100 via-emerald-50 to-teal-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-200/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-teal-200/40 rounded-full blur-[100px] pointer-events-none" />

      <button onClick={onNavigateBack}
        className="absolute top-4 left-4 flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Data Tools
      </button>

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="text-center mb-4">
          <div className="w-14 h-14 flex items-center justify-center mx-auto mb-2 drop-shadow-lg">
            <img src="/logo.png" alt="APIS" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Employee of the Month</h1>
          <p className="text-slate-500 mt-1 text-xs font-medium">APIS Recognition Hub · Self-Nomination · Panel Evaluation</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl shadow-slate-200/60">

          {/* ── Admin OTP step ── */}
          {step === 'admin_otp' && (
            <>
              <button onClick={handleBackToId}
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-xs font-semibold mb-6 transition-colors group">
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
              </button>
              <div className="text-center mb-7">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-rose-600" />
                </div>
                <h3 className="text-slate-900 font-bold text-base mb-1">Admin verification</h3>
                <p className="text-slate-500 text-sm">
                  OTP sent to <span className="text-rose-600 font-semibold">{maskedEmail}</span>
                </p>
                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span className="text-amber-600 text-[11px] font-bold">Expires in 5 minutes</span>
                </div>
              </div>
              <div className="mb-5">
                <label className="text-slate-500 text-xs font-bold uppercase tracking-widest block mb-2 text-center">Enter 6-digit OTP</label>
                <input type="text" inputMode="numeric" placeholder="· · · · · ·" maxLength={6}
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleAdminVerify()}
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-300 font-mono font-black text-3xl text-center tracking-[0.6em] focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                />
                <div className="flex justify-center gap-1.5 mt-3">
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} className={`h-1 rounded-full transition-all duration-200 ${i < otpInput.length ? 'w-5 bg-rose-500' : 'w-3 bg-slate-200'}`} />
                  ))}
                </div>
              </div>
              {error && (
                <div className="flex items-start gap-3 text-rose-600 text-sm font-semibold mb-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                  <span className="shrink-0">⚠️</span><span>{error}</span>
                </div>
              )}
              <button onClick={handleAdminVerify} disabled={otpInput.length !== 6 || loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-rose-200 flex items-center justify-center gap-2">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Verifying...</>
                  : '🏢 Enter as Admin'}
              </button>
              <button onClick={handleAdminOtp} disabled={loading}
                className="w-full mt-3 py-2.5 text-slate-400 hover:text-slate-600 text-xs font-semibold transition-colors disabled:opacity-40">
                Didn't receive it? Resend OTP
              </button>
            </>
          )}

          {/* ── Regular OTP step ── */}
          {step === 'otp' && (
            <>
              <button onClick={handleBackToId}
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-xs font-semibold mb-6 transition-colors group">
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
              </button>
              <div className="text-center mb-7">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="text-slate-900 font-bold text-base mb-1">Check your inbox</h3>
                <p className="text-slate-500 text-sm">
                  OTP sent to <span className="text-emerald-600 font-semibold">{maskedEmail}</span>
                </p>
                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span className="text-amber-600 text-[11px] font-bold">Expires in 5 minutes</span>
                </div>
              </div>
              <div className="mb-5">
                <label className="text-slate-500 text-xs font-bold uppercase tracking-widest block mb-2 text-center">Enter 6-digit OTP</label>
                <input type="text" inputMode="numeric" placeholder="· · · · · ·" maxLength={6}
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-300 font-mono font-black text-3xl text-center tracking-[0.6em] focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
                <div className="flex justify-center gap-1.5 mt-3">
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} className={`h-1 rounded-full transition-all duration-200 ${i < otpInput.length ? 'w-5 bg-emerald-500' : 'w-3 bg-slate-200'}`} />
                  ))}
                </div>
              </div>
              {error && (
                <div className="flex items-start gap-3 text-rose-600 text-sm font-semibold mb-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                  <span className="shrink-0">⚠️</span><span>{error}</span>
                </div>
              )}
              <button onClick={handleVerifyOtp} disabled={otpInput.length !== 6 || loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Verifying...</>
                  : '✓ Verify & Enter Hub'}
              </button>
              <button onClick={handleSendOtp} disabled={loading}
                className="w-full mt-3 py-2.5 text-slate-400 hover:text-slate-600 text-xs font-semibold transition-colors disabled:opacity-40">
                Didn't receive it? Resend OTP
              </button>
            </>
          )}

          {/* ── Role + ID step ── */}
          {step === 'id' && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">1</span>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Select your role</p>
              </div>

              <div className="space-y-2 mb-4">
                {ROLE_CONFIG.map(({ id, label, sub, icon: Icon, active, inactive, iconBg }) => (
                  <button key={id} onClick={() => setRole(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border bg-gradient-to-r transition-all duration-200 ${role === id ? active : inactive}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${role === id ? iconBg : 'bg-slate-100 text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1">
                      <p className={`font-bold text-sm leading-none ${role === id ? '' : 'text-slate-700'}`}>{label}</p>
                      <p className={`text-[11px] mt-0.5 ${role === id ? 'opacity-70' : 'text-slate-400'}`}>{sub}</p>
                    </div>
                    <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-all ${role === id ? 'border-current bg-current scale-100' : 'border-slate-300 scale-75'}`} />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">2</span>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Enter your ID</p>
              </div>
              <div className="relative mb-4">
                <input type="text"
                  placeholder={role === 'hr' ? 'e.g. HR001' : role === 'hod' ? 'e.g. HOD001' : role === 'panel' ? 'e.g. PANEL001' : 'e.g. EMP001'}
                  value={inputId}
                  onChange={e => setInputId(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 placeholder-slate-300 font-mono font-bold text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
              </div>

              {error && (
                <div className="flex items-start gap-3 text-rose-600 text-sm font-semibold mb-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                  <span className="shrink-0 mt-0.5">⚠️</span><span>{error}</span>
                </div>
              )}

              <button onClick={handleSendOtp} disabled={!role || !inputId.trim() || loading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending OTP...</>
                  : <><Mail className="w-4 h-4" /> Send OTP to Email</>}
              </button>

              {/* Admin bootstrap — always visible */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <button onClick={handleAdminOtp} disabled={loading}
                  className="w-full py-2.5 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading
                    ? <span className="w-3.5 h-3.5 border-2 border-rose-400/40 border-t-rose-500 rounded-full animate-spin" />
                    : '🏢'}
                  First-time setup — Admin OTP Login
                </button>
                <p className="text-slate-400 text-[10px] text-center mt-1.5">OTP will be sent to the registered admin email</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
