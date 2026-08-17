import { useState } from 'react';
import { ArrowLeft, Users, Shield, BarChart3, LineChart, Zap, Mail } from 'lucide-react';
import { EmployeeView } from '../../Components/Performance/employee/EmployeeView';
import { ManagerView } from '../../Components/Performance/manager/ManagerView';
import { HRView } from '../../Components/Performance/hr/HRView';
import { ProgressReportDashboard } from '../../Components/ProgressReport/ProgressReportDashboard';
import { TOOL_STYLES } from '../../Components/toolStyles';

interface PerformancePageProps {
  onNavigateBack?: () => void;
}

type Role = 'employee' | 'manager' | 'hr';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const PERF_API = `${API_BASE}/api/performance`;

// ─── Inner hub wrapper ────────────────────────────────────────────────────────

type HubSection = 'goals' | 'progress';

function PerformanceHub({
  employee, role, onLogout,
}: { employee: any; role: Role; onLogout: () => void }) {
  const [section, setSection] = useState<HubSection>('goals');

  const roleConfig = {
    hr:       { label: 'Admin',  badge: 'bg-rose-50 text-rose-600 border-rose-200',   dot: 'bg-rose-500',    glow: 'shadow-rose-500/20' },
    manager:  { label: 'Manager',   badge: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-500',   glow: 'shadow-amber-500/20' },
    employee: { label: 'Employee',  badge: 'bg-violet-50 text-violet-600 border-violet-200', dot: 'bg-violet-500', glow: 'shadow-violet-500/20' },
  }[role];

  const tabs = role === 'employee'
    ? ['Goal Setting & Review', 'Progress & Reports']
    : role === 'manager'
    ? ['Goal Approvals & Ratings', 'Team Progress']
    : ['HR Controls', 'Org Analytics'];

  const initial = (employee.name || 'U')[0].toUpperCase();

  return (
    <div className="min-h-full">
      <style>{TOOL_STYLES}</style>
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl relative z-20">
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onLogout}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all shrink-0 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            </button>
            <div className="min-w-0">
              <p className="text-slate-500 text-xs font-semibold truncate">{employee.name} · {employee.designation}</p>
            </div>
          </div>

          {/* Center tabs */}
          <div className="hidden md:flex gap-1 p-1 bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm rounded-2xl">
            {(['goals', 'progress'] as const).map((s, i) => (
              <button key={s} onClick={() => setSection(s)}
                className={`tp-sheen flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                  section === s
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}>
                {s === 'goals' ? <BarChart3 className="w-4 h-4" /> : <LineChart className="w-4 h-4" />}
                {tabs[i]}
              </button>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 shrink-0">
            <span className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${roleConfig.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${roleConfig.dot} tp-pulse-glow`} />
              {roleConfig.label}
            </span>
            <div className="tp-pop-in w-8 h-8 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600 font-black text-sm">
              {initial}
            </div>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="flex md:hidden gap-1 px-4 pb-2">
          {(['goals', 'progress'] as const).map((s, i) => (
            <button key={s} onClick={() => setSection(s)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                section === s ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'text-slate-500'
              }`}>
              {s === 'goals' ? <BarChart3 className="w-3.5 h-3.5" /> : <LineChart className="w-3.5 h-3.5" />}
              {tabs[i]}
            </button>
          ))}
        </div>
      </header>

      {section === 'goals' ? (
        <>
          {role === 'employee' && <EmployeeView employee={employee} />}
          {role === 'manager' && <ManagerView manager={employee} />}
          {role === 'hr' && <HRView hrUser={employee} />}
        </>
      ) : (
        <ProgressReportDashboard role={role} user={employee} />
      )}
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

type LoginStep = 'id' | 'otp';

const ROLE_CONFIG = [
  {
    id: 'employee' as Role,
    label: 'Employee',
    sub: 'Set goals & self-review',
    icon: Users,
    active: 'from-violet-50 to-violet-100/60 border-violet-300 text-violet-700',
    inactive: 'border-slate-200 text-slate-500 hover:border-violet-300 hover:bg-slate-50',
    iconBg: 'bg-violet-50 text-violet-600',
  },
  {
    id: 'manager' as Role,
    label: 'Manager',
    sub: 'Review & rate team',
    icon: Shield,
    active: 'from-amber-50 to-amber-100/60 border-amber-300 text-amber-700',
    inactive: 'border-slate-200 text-slate-500 hover:border-amber-300 hover:bg-slate-50',
    iconBg: 'bg-amber-50 text-amber-600',
  },
  {
    id: 'hr' as Role,
    label: 'Admin',
    sub: 'Full access & analytics',
    icon: BarChart3,
    active: 'from-rose-50 to-rose-100/60 border-rose-300 text-rose-700',
    inactive: 'border-slate-200 text-slate-500 hover:border-rose-300 hover:bg-slate-50',
    iconBg: 'bg-rose-50 text-rose-600',
  },
] as const;

export function PerformancePage({}: PerformancePageProps) {
  const [role, setRole] = useState<Role | null>(null);
  const [inputId, setInputId] = useState('');
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<LoginStep>('id');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');

  const parseJsonSafe = async (res: Response) => {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    await res.text();
    throw new Error(`Server error (${res.status}). Make sure the backend is running.`);
  };

  const handleSendOtp = async () => {
    if (!inputId.trim() || !role) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${PERF_API}/auth/send-otp/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: inputId.trim() }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP.');
      setMaskedEmail(data.masked_email);
      setStep('otp');
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${PERF_API}/auth/verify-otp/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: inputId.trim(), otp: otpInput.trim() }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data.error || 'OTP verification failed.');
      if (role === 'manager' && data.user_type !== 'manager')
        throw new Error(`${data.name} is not registered as a Manager.`);
      if (role === 'hr' && data.user_type !== 'hr')
        throw new Error(`${data.name} is not registered as an Admin.`);
      setEmployee(data);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const handleBackToId = () => { setStep('id'); setOtpInput(''); setMaskedEmail(''); setError(''); };

  if (employee && role) {
    return (
      <PerformanceHub
        employee={employee} role={role}
        onLogout={() => { setEmployee(null); setRole(null); setInputId(''); setStep('id'); setOtpInput(''); }}
      />
    );
  }

  return (
    <div className="min-h-full py-10 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <style>{TOOL_STYLES}</style>
      {/* Background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.10),transparent)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-300 to-transparent" />
      <div className="tp-drift absolute top-1/3 -left-32 w-96 h-96 bg-violet-300/25 rounded-full blur-[100px] pointer-events-none" />
      <div className="tp-drift absolute bottom-1/4 -right-32 w-80 h-80 bg-indigo-300/20 rounded-full blur-[100px] pointer-events-none" style={{ animationDelay: '3s' }} />
      <div className="tp-drift absolute top-2/3 left-1/3 w-64 h-64 bg-purple-300/20 rounded-full blur-[80px] pointer-events-none" style={{ animationDelay: '6s' }} />

      <div className="w-full max-w-lg relative z-10">
        {/* Brand */}
        <div className="tp-reveal text-center mb-8">
          <div className="relative inline-block mb-2">
            <div className="absolute inset-0 bg-violet-300/30 rounded-2xl blur-2xl scale-150" />
            <div className="tp-border-flow relative w-24 h-24 flex items-center justify-center rounded-2xl p-3 bg-white border border-slate-200 shadow-sm"
              style={{ '--tp-c1': '#8b5cf6', '--tp-c2': '#a855f7' } as any}>
              <img src="/logo.png" alt="APIS India" className="w-full h-full object-contain drop-shadow-2xl" />
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-violet-600 bg-clip-text text-transparent">
              Performance Hub
            </span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Goal setting · Reviews · Rankings · Analytics</p>
        </div>

        {/* Main card */}
        <div className="tp-reveal relative" style={{ animationDelay: '80ms' }}>
          {/* Card glow */}
          <div className="absolute -inset-px bg-gradient-to-br from-violet-200/50 via-transparent to-purple-200/40 rounded-3xl" />
          <div className="relative bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-7 shadow-sm">

            {step === 'id' ? (
              <>
                {/* Step label */}
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-black flex items-center justify-center">1</span>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Select your role</p>
                </div>

                {/* Role cards */}
                <div className="space-y-2.5 mb-6">
                  {ROLE_CONFIG.map(({ id, label, sub, icon: Icon, active, inactive, iconBg }) => (
                    <button key={id} onClick={() => setRole(id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border bg-gradient-to-r transition-all duration-200 ${
                        role === id ? active : inactive
                      }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        role === id ? iconBg : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left flex-1">
                        <p className={`font-bold text-sm ${role === id ? '' : 'text-slate-800'}`}>{label}</p>
                        <p className={`text-xs mt-0.5 ${role === id ? 'opacity-70' : 'text-slate-500'}`}>{sub}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 transition-all ${
                        role === id ? 'border-current bg-current scale-100' : 'border-slate-300 scale-75'
                      }`} />
                    </button>
                  ))}
                </div>

                {/* ID input */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-black flex items-center justify-center">2</span>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Enter your ID</p>
                </div>
                <div className="relative mb-5">
                  <input
                    type="text"
                    placeholder={role === 'hr' ? 'e.g. HR001' : role === 'manager' ? 'e.g. MGR001' : 'e.g. EMP001'}
                    value={inputId}
                    onChange={e => setInputId(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-900 placeholder-slate-400 font-mono font-bold text-sm focus:outline-none focus:border-violet-400 focus:bg-violet-50/40 transition-all"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-3 text-rose-600 text-sm font-semibold mb-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={handleSendOtp}
                  disabled={!role || !inputId.trim() || loading}
                  className="tp-sheen w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending OTP...</>
                  ) : (
                    <><Mail className="w-4 h-4" /> Send OTP to Email</>
                  )}
                </button>

                {/* Setup bypass */}
                <div className="mt-5 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setRole('hr');
                      setEmployee({ name: 'Admin', designation: 'Administrator', employee_id: 'ADMIN', zone: '', reporting_manager_id: '' });
                    }}
                    className="w-full py-3 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    🏢 First-time setup — Enter as Admin
                  </button>
                  <p className="text-slate-400 text-[10px] text-center mt-2">Use this once to import your employee master sheet</p>
                </div>
              </>
            ) : (
              <>
                <button onClick={handleBackToId}
                  className="inline-flex items-center gap-1.5 text-slate-500 hover:text-violet-700 text-xs font-semibold mb-6 transition-colors group">
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
                </button>

                {/* OTP illustration */}
                <div className="text-center mb-7">
                  <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 bg-violet-300/40 rounded-2xl blur-xl" />
                    <div className="relative w-14 h-14 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center">
                      <Mail className="w-7 h-7 text-violet-600" />
                    </div>
                  </div>
                  <h3 className="text-slate-900 font-bold text-base mb-1">Check your inbox</h3>
                  <p className="text-slate-500 text-sm">
                    OTP sent to <span className="text-violet-700 font-semibold">{maskedEmail}</span>
                  </p>
                  <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                    <Zap className="w-3 h-3 text-amber-600" />
                    <span className="text-amber-600 text-[11px] font-bold">Expires in 5 minutes</span>
                  </div>
                </div>

                {/* OTP input */}
                <div className="mb-5">
                  <label className="text-slate-500 text-xs font-bold uppercase tracking-widest block mb-2 text-center">Enter 6-digit OTP</label>
                  <input
                    type="text" inputMode="numeric" placeholder="· · · · · ·" maxLength={6}
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                    autoFocus
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-300 font-mono font-black text-3xl text-center tracking-[0.6em] focus:outline-none focus:border-violet-400 focus:bg-violet-50/40 transition-all"
                  />
                  {/* Progress dots */}
                  <div className="flex justify-center gap-1.5 mt-3">
                    {[0,1,2,3,4,5].map(i => (
                      <div key={i} className={`h-1 rounded-full transition-all duration-200 ${
                        i < otpInput.length ? 'w-5 bg-violet-500' : 'w-3 bg-slate-200'
                      }`} />
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 text-rose-600 text-sm font-semibold mb-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    <span className="shrink-0">⚠️</span><span>{error}</span>
                  </div>
                )}

                <button onClick={handleVerifyOtp} disabled={otpInput.length !== 6 || loading}
                  className="tp-sheen w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-[0.98] flex items-center justify-center gap-2">
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
                  ) : '✓ Verify & Enter Hub'}
                </button>

                <button onClick={handleSendOtp} disabled={loading}
                  className="w-full mt-3 py-2.5 text-slate-500 hover:text-violet-700 text-xs font-semibold transition-colors disabled:opacity-40">
                  Didn't receive it? Resend OTP
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
