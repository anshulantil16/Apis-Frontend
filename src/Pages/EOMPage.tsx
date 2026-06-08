import { useState, useEffect } from 'react';
import { ArrowLeft, Users, BarChart3, LineChart, Mail, Zap, Award } from 'lucide-react';
import { EOMEmployeeView }  from '../Components/EOM/employee/EOMEmployeeView';
import { EOMHodView }       from '../Components/EOM/hod/EOMHodView';
import { EOMHrView }        from '../Components/EOM/hr/EOMHrView';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const EOM_API = `${API_BASE}/api/eom`;

type Role = 'employee' | 'hod' | 'hr';
type LoginStep = 'id' | 'otp' | 'admin_otp';

interface EOMPageProps {
  onNavigateBack: () => void;
}

// ─── Role config ───────────────────────────────────────────────────────────────

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
    label: 'HOD', sub: 'Review & score nominations',
    active:   'from-violet-50 to-purple-50 border-violet-400 text-violet-700',
    inactive: 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/50',
    iconBg:   'bg-violet-100 text-violet-600',
    icon: BarChart3,
  },
  {
    id: 'hr' as Role,
    label: 'Admin', sub: 'Full access & finalise winner',
    active:   'from-rose-50 to-red-50 border-rose-400 text-rose-700',
    inactive: 'border-slate-200 hover:border-rose-300 hover:bg-rose-50/50',
    iconBg:   'bg-rose-100 text-rose-600',
    icon: LineChart,
  },
] as const;

// ─── Hub (post-login shell) ────────────────────────────────────────────────────

function EOMHub({ user, role, onLogout, onNavigateBack }: {
  user: any; role: Role; onLogout: () => void; onNavigateBack: () => void;
}) {
  const roleLabel = { employee: 'Employee', hod: 'HOD', hr: 'Admin' }[role];
  const roleBadge = {
    employee: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    hod:      'bg-violet-50 text-violet-700 border-violet-200',
    hr:       'bg-rose-50 text-rose-700 border-rose-200',
  }[role];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onLogout}
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
            <button onClick={onNavigateBack}
              className="hidden lg:block text-slate-400 hover:text-slate-700 text-xs font-semibold transition-colors">
              ← Home
            </button>
          </div>
        </div>
      </header>

      {role === 'employee' && <EOMEmployeeView employee={user} />}
      {role === 'hod'      && <EOMHodView      hod={user}      />}
      {role === 'hr'       && <EOMHrView       hrUser={user}   />}
    </div>
  );
}

// ─── Login screen ──────────────────────────────────────────────────────────────

export function EOMPage({ onNavigateBack }: EOMPageProps) {
  const [role, setRole]             = useState<Role | null>(() =>
    localStorage.getItem('eom_role') as Role | null
  );
  const [inputId, setInputId]       = useState('');
  const [user, setUser]             = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('eom_user') || 'null'); } catch { return null; }
  });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [step, setStep]             = useState<LoginStep>('id');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpInput, setOtpInput]     = useState('');

  const parseJson = async (res: Response) => {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    throw new Error(`Server error (${res.status})`);
  };

  useEffect(() => {
    if (user) localStorage.setItem('eom_user', JSON.stringify(user));
    else localStorage.removeItem('eom_user');
  }, [user]);

  useEffect(() => {
    if (role && user) localStorage.setItem('eom_role', role);
    else if (!user) localStorage.removeItem('eom_role');
  }, [role, user]);

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
      if (role === 'hod' && data.user_type !== 'hod') throw new Error(`${data.name} is not registered as a HOD.`);
      if (role === 'hr'  && data.user_type !== 'hr')  throw new Error(`${data.name} is not registered as an Admin.`);
      setUser(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleAdminOtp = async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${EOM_API}/auth/admin-otp/`, { method: 'POST' });
      const data = await parseJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed.');
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

  const reset = () => {
    setUser(null); setRole(null); setInputId(''); setStep('id'); setOtpInput(''); setError('');
    localStorage.removeItem('eom_user');
    localStorage.removeItem('eom_role');
  };
  const backToId = () => { setStep('id'); setOtpInput(''); setMaskedEmail(''); setError(''); };

  if (user && role) {
    return <EOMHub user={user} role={role} onLogout={reset} onNavigateBack={onNavigateBack} />;
  }

  // ── Login UI ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <img src="/logo.png" alt="APIS" className="w-full h-full object-contain drop-shadow-sm" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Employee of the Month</h1>
          <p className="text-slate-500 text-sm mt-1">APIS Recognition Hub</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Role selector */}
          {step === 'id' && (
            <div className="p-6 space-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Select your role</p>
                <div className="space-y-2">
                  {ROLE_CONFIG.map(({ id, label, sub, icon: Icon, active, inactive, iconBg }) => (
                    <button key={id} onClick={() => setRole(id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border bg-gradient-to-r transition-all duration-200 ${role === id ? active : inactive}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm">{label}</p>
                        <p className="text-[11px] opacity-70">{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {role && role !== 'hr' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee ID</p>
                  <div className="flex gap-2">
                    <input
                      value={inputId} onChange={e => setInputId(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                      placeholder="e.g. EMP001"
                      className="flex-1 h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                    />
                    <button onClick={handleSendOtp} disabled={!inputId.trim() || loading}
                      className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm disabled:opacity-40 flex items-center gap-2 transition-all">
                      {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Mail className="w-4 h-4" />}
                      Send OTP
                    </button>
                  </div>
                </div>
              )}

              {role === 'hr' && (
                <div className="pt-2 border-t border-slate-100">
                  <button onClick={handleAdminOtp} disabled={loading}
                    className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
                    Send Admin OTP
                  </button>
                </div>
              )}

              {error && <p className="text-rose-600 text-sm font-semibold text-center">{error}</p>}
            </div>
          )}

          {/* OTP entry */}
          {(step === 'otp' || step === 'admin_otp') && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={backToId} className="text-slate-400 hover:text-slate-700">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <p className="text-sm font-bold text-slate-900">Enter OTP</p>
                  <p className="text-xs text-slate-500 mt-0.5">Sent to <span className="font-semibold">{maskedEmail}</span></p>
                </div>
              </div>
              <input
                value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && (step === 'otp' ? handleVerifyOtp() : handleAdminVerify())}
                placeholder="6-digit OTP"
                maxLength={6}
                className="w-full h-12 rounded-xl border border-slate-200 px-4 text-center text-xl font-black tracking-[0.3em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                onClick={step === 'otp' ? handleVerifyOtp : handleAdminVerify}
                disabled={otpInput.length < 6 || loading}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Award className="w-4 h-4" />}
                Verify & Login
              </button>
              {error && <p className="text-rose-600 text-sm font-semibold text-center">{error}</p>}
            </div>
          )}
        </div>

        <button onClick={onNavigateBack} className="w-full text-center text-slate-400 hover:text-slate-600 text-xs font-semibold transition-colors">
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
