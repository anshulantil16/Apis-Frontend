import { useState } from 'react';
import { ArrowLeft, TrendingUp, Users, Shield, BarChart3, LineChart } from 'lucide-react';
import { EmployeeView } from '../Components/Performance/employee/EmployeeView';
import { ManagerView } from '../Components/Performance/manager/ManagerView';
import { HRView } from '../Components/Performance/hr/HRView';
import { ProgressReportDashboard } from '../Components/ProgressReport/ProgressReportDashboard';

interface PerformancePageProps {
  onNavigateBack: () => void;
}

type Role = 'employee' | 'manager' | 'hr';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const PERF_API = `${API_BASE}/api/performance`;

// ─── Inner hub wrapper (shown after login) ────────────────────────────────────

type HubSection = 'goals' | 'progress';

function PerformanceHub({
  employee, role, onLogout, onNavigateBack,
}: { employee: any; role: Role; onLogout: () => void; onNavigateBack: () => void }) {
  const [section, setSection] = useState<HubSection>('goals');

  const roleLabel = role === 'hr' ? '🏢 HR Admin' : role === 'manager' ? '👔 Manager' : '👤 Employee';
  const roleBadge = role === 'hr'
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    : role === 'manager'
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    : 'bg-violet-500/20 text-violet-300 border-violet-500/30';

  const sectionLabel = role === 'employee'
    ? ['Goal Setting & Review', 'Progress & Reports']
    : role === 'manager'
    ? ['Goal Approvals & Ratings', 'Team Progress & Reports']
    : ['HR Admin Controls', 'Org Analytics & Reports'];

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      {/* ── Sticky header ── */}
      <header className="border-b border-white/5 bg-[#0f0f1a]/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: logo + name */}
          <div className="flex items-center gap-4">
            <button onClick={onLogout} className="text-slate-400 hover:text-white transition p-2 hover:bg-white/5 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">APIS Performance Hub</p>
                <p className="text-slate-400 text-xs mt-0.5">{employee.name} · {employee.designation}</p>
              </div>
            </div>
          </div>

          {/* Center: section tabs */}
          <div className="hidden md:flex gap-1 p-1 bg-white/3 rounded-2xl">
            {(['goals', 'progress'] as const).map((s, i) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                  section === s ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s === 'goals'
                  ? <BarChart3 className="w-4 h-4" />
                  : <LineChart className="w-4 h-4" />
                }
                {sectionLabel[i]}
              </button>
            ))}
          </div>

          {/* Right: role badge + back */}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${roleBadge}`}>
              {roleLabel}
            </span>
            <button onClick={onNavigateBack} className="text-slate-500 hover:text-slate-300 text-xs font-semibold transition hidden sm:block">
              ← Data Tools
            </button>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="flex md:hidden gap-1 mt-3">
          {(['goals', 'progress'] as const).map((s, i) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                section === s ? 'bg-white/10 text-white' : 'text-slate-400'
              }`}
            >
              {s === 'goals' ? <BarChart3 className="w-3.5 h-3.5" /> : <LineChart className="w-3.5 h-3.5" />}
              {sectionLabel[i]}
            </button>
          ))}
        </div>
      </header>

      {/* ── Content ── */}
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

// ─── Login / Role Selection ───────────────────────────────────────────────────

type LoginStep = 'id' | 'otp';

export function PerformancePage({ onNavigateBack }: PerformancePageProps) {
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
    throw new Error(`Server returned an unexpected response (${res.status}). Make sure the backend server is running and restarted.`);
  };

  const handleSendOtp = async () => {
    if (!inputId.trim() || !role) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${PERF_API}/auth/send-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: inputId.trim() }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP.');

      // Validate role before proceeding to OTP step
      // (we get role info from employee lookup implicitly; we'll re-check at verify)
      setMaskedEmail(data.masked_email);
      setStep('otp');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${PERF_API}/auth/verify-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: inputId.trim(), otp: otpInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OTP verification failed.');

      // Validate role matches
      if (role === 'manager' && data.user_type !== 'manager') {
        throw new Error(`${data.name} is registered as an Employee (${data.designation || 'Field Force'}), not a Manager.`);
      }
      if (role === 'hr' && data.user_type !== 'hr') {
        throw new Error(`${data.name} is registered as an Employee (${data.designation || 'Field Force'}), not an HR Admin.`);
      }

      setEmployee(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToId = () => {
    setStep('id');
    setOtpInput('');
    setMaskedEmail('');
    setError('');
  };

  // Logged in — show role view
  if (employee && role) {
    return (
      <PerformanceHub
        employee={employee}
        role={role}
        onLogout={() => { setEmployee(null); setRole(null); setInputId(''); setStep('id'); setOtpInput(''); }}
        onNavigateBack={onNavigateBack}
      />
    );
  }

  // Login / Role Selection Screen
  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      <button onClick={onNavigateBack} className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold">
        <ArrowLeft className="w-4 h-4" /> Back to Data Tools
      </button>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 mb-5 shadow-lg shadow-violet-500/30">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Performance Hub</h1>
          <p className="text-slate-400 mt-2 text-sm">Goal setting, reviews & quarterly rankings</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">

          {step === 'id' ? (
            <>
              {/* Role picker */}
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">I am a...</p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {([
                  { id: 'employee', label: 'Employee', icon: Users, color: 'violet' },
                  { id: 'manager', label: 'Manager', icon: Shield, color: 'amber' },
                  { id: 'hr', label: 'HR Admin', icon: BarChart3, color: 'rose' },
                ] as const).map(({ id, label, icon: Icon, color }) => (
                  <button
                    key={id}
                    onClick={() => setRole(id)}
                    className={`flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all font-semibold text-sm ${
                      role === id
                        ? color === 'violet' ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                          : color === 'amber' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                        : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Employee ID input */}
              <div className="mb-5">
                <label className="text-slate-400 text-xs font-bold uppercase tracking-widest block mb-2">
                  {role === 'hr' ? 'HR Admin ID' : role === 'manager' ? 'Manager ID' : 'Employee ID'}
                </label>
                <input
                  type="text"
                  placeholder={role === 'hr' ? 'e.g. HR001' : role === 'manager' ? 'e.g. MGR001' : 'e.g. EMP001'}
                  value={inputId}
                  onChange={e => setInputId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-500 font-semibold text-sm focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/5 transition-all"
                />
              </div>

              {error && (
                <p className="text-rose-400 text-sm font-semibold mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                  ⚠️ {error}
                </p>
              )}

              <button
                onClick={handleSendOtp}
                disabled={!role || !inputId.trim() || loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-violet-500/30 active:scale-95"
              >
                {loading ? 'Sending OTP...' : 'Send OTP →'}
              </button>

              {/* First-time setup bypass */}
              <div className="pt-4 border-t border-white/10 mt-4">
                <p className="text-slate-500 text-xs text-center mb-3">
                  First time? No employees imported yet?
                </p>
                <button
                  onClick={() => {
                    setRole('hr');
                    setEmployee({ name: 'HR Admin', designation: 'Administrator', employee_id: 'ADMIN', zone: '', reporting_manager_id: '' });
                  }}
                  className="w-full py-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  🏢 Enter as HR Admin (First-Time Setup)
                </button>
                <p className="text-slate-600 text-[10px] text-center mt-2">
                  Use this to import your employee master sheet, then log in normally.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* OTP step */}
              <button
                onClick={handleBackToId}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold mb-5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Change ID
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 mb-3">
                  <Shield className="w-6 h-6 text-violet-300" />
                </div>
                <p className="text-white font-bold text-sm">Check your email</p>
                <p className="text-slate-400 text-xs mt-1">
                  We sent a 6-digit OTP to <span className="text-violet-300 font-semibold">{maskedEmail}</span>
                </p>
                <p className="text-slate-500 text-[11px] mt-1">Expires in 5 minutes</p>
              </div>

              <div className="mb-5">
                <label className="text-slate-400 text-xs font-bold uppercase tracking-widest block mb-2">
                  Enter OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-600 font-mono font-bold text-2xl text-center tracking-[0.5em] focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/5 transition-all"
                />
              </div>

              {error && (
                <p className="text-rose-400 text-sm font-semibold mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                  ⚠️ {error}
                </p>
              )}

              <button
                onClick={handleVerifyOtp}
                disabled={otpInput.length !== 6 || loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-violet-500/30 active:scale-95"
              >
                {loading ? 'Verifying...' : 'Verify & Enter Hub →'}
              </button>

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full mt-3 py-2.5 rounded-2xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 font-semibold text-xs transition-all disabled:opacity-40"
              >
                Resend OTP
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
