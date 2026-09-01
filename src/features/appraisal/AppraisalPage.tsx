import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Shield, BarChart3, LineChart, Zap, Mail } from 'lucide-react';
import { AppraisalEmployeeView } from '../../Components/Appraisal/employee/AppraisalEmployeeView';
import { AppraisalManagerView } from '../../Components/Appraisal/manager/AppraisalManagerView';
import { AppraisalHODView } from '../../Components/Appraisal/hod/AppraisalHODView';
import { HRView } from '../../Components/Performance/hr/HRView';
import { ProgressReportDashboard } from '../../Components/ProgressReport/ProgressReportDashboard';
import { TOOL_STYLES } from '../../Components/toolStyles';
interface AppraisalPageProps {
  onNavigateBack?: () => void;
}

type Role = 'employee' | 'manager' | 'hod' | 'hr';

const _API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const APPRAISAL_API = `${_API_BASE}/api/appraisal`;

/* Pointer handlers come from the shared kit: it measures once per
   hover and batches its writes, where this file's old private copy
   measured inside every mousemove and forced a synchronous layout. */
import { onTilt3dMove, onTilt3dLeave } from '../../ui';

// ─── Inner hub wrapper ────────────────────────────────────────────────────────

type HubSection = 'goals' | 'progress';

function AppraisalHub({
  employee, role, onLogout,
}: { employee: any; role: Role; onLogout: () => void }) {
  const [section, setSection] = useState<HubSection>('goals');

  const roleConfig = {
    hr:       { label: 'Admin',    badge: 'bg-rose-50 text-rose-600 border-rose-200',       dot: 'bg-rose-500' },
    hod:      { label: 'HOD',      badge: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
    manager:  { label: 'Manager',  badge: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-500' },
    employee: { label: 'Employee', badge: 'bg-blue-50 text-blue-700 border-blue-200',       dot: 'bg-blue-500' },
  }[role];

  const tabs = role === 'employee'
    ? ['Appraisal Form', 'Progress & Reports']
    : role === 'manager'
    ? ['Goal Approvals & Ratings', 'Team Progress']
    : role === 'hod'
    ? ['HOD Review', 'Team Analytics']
    : ['HR Controls', 'Org Analytics'];

  const initial = (employee.name || 'U')[0].toUpperCase();

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      <style>{TOOL_STYLES}</style>
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl shadow-sm relative z-20">
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onLogout}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all shrink-0 group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            </button>
            <div className="min-w-0">
              <p className="text-slate-600 text-xs font-semibold truncate">{employee.name} · {employee.designation}</p>
            </div>
          </div>

          {/* Center tabs — employee sees only the form; manager/hr see both */}
          <div className="hidden md:flex gap-1 p-1 bg-slate-100 border border-slate-200 rounded-2xl">
            {(role === 'employee'
              ? [{ s: 'goals' as const, label: 'Appraisal Form', icon: BarChart3 }]
              : [
                  { s: 'goals'    as const, label: tabs[0], icon: BarChart3 },
                  { s: 'progress' as const, label: tabs[1], icon: LineChart },
                ]
            ).map(({ s, label, icon: Icon }) => (
              <button key={s} onClick={() => setSection(s)}
                className={`tp-sheen ih-sheen flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 ${
                  section === s
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-200 scale-[1.02] hover:shadow-lg'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                }`}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 shrink-0">
            <span className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${roleConfig.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${roleConfig.dot} tp-pulse-glow ih-pulse-glow`} />
              {roleConfig.label}
            </span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-sm">
              {initial}
            </div>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="flex md:hidden gap-1 px-4 pb-2">
          {(role === 'employee' ? ['goals'] : ['goals', 'progress']).map((s, i) => (
            <button key={s} onClick={() => setSection(s as HubSection)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                section === s ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {s === 'goals' ? <BarChart3 className="w-3.5 h-3.5" /> : <LineChart className="w-3.5 h-3.5" />}
              {tabs[i]}
            </button>
          ))}
        </div>
      </header>

      {section === 'goals' ? (
        <>
          {role === 'employee' && <AppraisalEmployeeView employee={employee} />}
          {role === 'manager' && <AppraisalManagerView manager={employee} />}
          {role === 'hod' && <AppraisalHODView hod={employee} />}
          {role === 'hr' && <HRView hrUser={employee} apiBase={APPRAISAL_API} />}
        </>
      ) : (
        <ProgressReportDashboard role={role} user={employee} />
      )}
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

type LoginStep = 'id' | 'otp' | 'admin_otp';

const ROLE_CONFIG = [
  {
    id: 'employee' as Role,
    label: 'Employee',
    sub: 'Submit appraisal form',
    icon: Users,
    active: 'from-blue-50 to-indigo-50 border-blue-400 text-blue-700',
    inactive: 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50',
    iconBg: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'manager' as Role,
    label: 'Manager',
    sub: 'Review & rate team',
    icon: Shield,
    active: 'from-amber-50 to-orange-50 border-amber-400 text-amber-700',
    inactive: 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/50',
    iconBg: 'bg-amber-100 text-amber-600',
  },
  {
    id: 'hod' as Role,
    label: 'HOD',
    sub: 'Department head review',
    icon: BarChart3,
    active: 'from-violet-50 to-purple-50 border-violet-400 text-violet-700',
    inactive: 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/50',
    iconBg: 'bg-violet-100 text-violet-600',
  },
  {
    id: 'hr' as Role,
    label: 'Admin',
    sub: 'Full access & analytics',
    icon: LineChart,
    active: 'from-rose-50 to-red-50 border-rose-400 text-rose-700',
    inactive: 'border-slate-200 hover:border-rose-300 hover:bg-rose-50/50',
    iconBg: 'bg-rose-100 text-rose-600',
  },
] as const;

export function AppraisalPage({}: AppraisalPageProps) {
  const [role, setRole] = useState<Role | null>(() =>
    localStorage.getItem('appraisal_role') as Role | null
  );
  const [inputId, setInputId] = useState('');
  const [employee, setEmployee] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('appraisal_employee') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<LoginStep>('id');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');

  useEffect(() => {
    if (employee) localStorage.setItem('appraisal_employee', JSON.stringify(employee));
    else localStorage.removeItem('appraisal_employee');
  }, [employee]);

  useEffect(() => {
    if (role && employee) localStorage.setItem('appraisal_role', role);
    else if (!employee) localStorage.removeItem('appraisal_role');
  }, [role, employee]);


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
      const res = await fetch(`${APPRAISAL_API}/auth/send-otp/`, {
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
      const res = await fetch(`${APPRAISAL_API}/auth/verify-otp/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: inputId.trim(), otp: otpInput.trim() }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data.error || 'OTP verification failed.');

      const detected: string[] = data.detected_roles || [data.user_type || 'employee'];

      // If user selected a role, verify they actually have access to it
      if (role === 'manager' && !detected.includes('manager'))
        throw new Error(`${data.name} is not a reporting manager for any employee.`);
      if (role === 'hod' && !detected.includes('hod'))
        throw new Error(`${data.name} is not an HOD for any employee.`);
      if (role === 'hr' && !detected.includes('hr'))
        throw new Error(`${data.name} is not registered as an Admin.`);

      setEmployee(data);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const handleBackToId = () => { setStep('id'); setOtpInput(''); setMaskedEmail(''); setError(''); };

  const handleAdminOtp = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${APPRAISAL_API}/auth/admin-otp/`, { method: 'POST' });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP.');
      setMaskedEmail(data.masked_email);
      setStep('admin_otp');
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const handleAdminVerify = async () => {
    if (!otpInput.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${APPRAISAL_API}/auth/admin-verify/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpInput.trim() }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data.error || 'OTP verification failed.');
      setRole('hr');
      setEmployee(data);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  if (employee && role) {
    return (
      <AppraisalHub
        employee={employee} role={role}
        onLogout={() => {
          setEmployee(null); setRole(null); setInputId(''); setStep('id'); setOtpInput('');
          localStorage.removeItem('appraisal_employee');
          localStorage.removeItem('appraisal_role');
        }}
      />
    );
  }

  return (
    <div className="min-h-full py-10 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <style>{TOOL_STYLES}</style>
      {/* Background decoration */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400" />
      <div className="ih-aurora absolute top-1/4 -left-32 w-96 h-96 bg-blue-200/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="ih-drift absolute bottom-1/4 -right-32 w-80 h-80 bg-indigo-200/40 rounded-full blur-[100px] pointer-events-none" style={{ animationDelay: '4s' }} />
      <div className="ih-aurora absolute top-1/2 left-1/3 w-72 h-72 bg-indigo-300/25 rounded-full blur-[110px] pointer-events-none" style={{ animationDelay: '7s' }} />

      {/* Instructions panel — bottom-left */}
      <div className="absolute bottom-5 left-5 max-w-[260px] z-10">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Instructions</p>
        <div className="space-y-2">
          {[
            { n: 1, text: 'The performance review booklet consists of 2 Sections — Section I: Performance Assessment, Section II: Development Action Plan.' },
            { n: 2, text: 'Section I is based on achievement against KRA formulated at the beginning of the financial year, forming the basis of performance review.' },
            { n: 3, text: 'Section II focuses on the development action plan — a summary of strengths, areas of improvement, commitment to learning and ability to take on additional responsibilities.' },
          ].map(({ n, text }) => (
            <div key={n} className="flex gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-100 border border-blue-200 text-blue-600 text-[9px] font-black flex items-center justify-center shrink-0 mt-px">{n}</span>
              <p className="text-[10px] text-slate-500 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="tp-reveal text-center mb-4">
          <div className="tp-border-flow ih-float w-14 h-14 flex items-center justify-center mx-auto mb-2 rounded-2xl p-1.5 bg-white shadow-lg"
            style={{ '--tp-c1': '#3b82f6', '--tp-c2': '#6366f1' } as any}>
            <img src="/logo.png" alt="APIS India" className="w-full h-full object-contain" />
          </div>
          <h1 className="ih-grad-text text-2xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-blue-600 to-indigo-600">Appraisal Hub</h1>
          <p className="text-slate-500 mt-1 text-xs font-medium">Annual Appraisal · KRA/KPI Setting · Final Assessment</p>
        </div>

        {/* Card */}
        <div className="tp-reveal ih-inview relative" style={{ animationDelay: '80ms' }}>
          <div
            onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
            className="ih-tilt3d ih-spotlight bg-white border border-slate-200 rounded-3xl p-5 shadow-xl shadow-slate-200/60">

            {step === 'admin_otp' ? (
              <>
                <button onClick={handleBackToId}
                  className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-xs font-semibold mb-6 transition-colors group">
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
                </button>

                <div className="text-center mb-7">
                  <div className="ih-float w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4">
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
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 text-center">Enter 6-digit OTP</label>
                  <input
                    type="text" inputMode="numeric" placeholder="· · · · · ·" maxLength={6}
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
                  className="ih-sheen w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-rose-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Verifying...</>
                    : '🏢 Enter as Admin'}
                </button>

                <button onClick={handleAdminOtp} disabled={loading}
                  className="w-full mt-3 py-2.5 text-slate-400 hover:text-slate-600 text-xs font-semibold transition-colors disabled:opacity-40">
                  Didn't receive it? Resend OTP
                </button>
              </>
            ) : step === 'id' ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">1</span>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Select your role</p>
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
                        <p className={`text-[11px] mt-0.5 ${role === id ? 'opacity-70' : 'text-slate-500'}`}>{sub}</p>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-all ${role === id ? 'border-current bg-current scale-100' : 'border-slate-300 scale-75'}`} />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">2</span>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Enter your Employee Code</p>
                </div>
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder={role === 'hr' ? 'e.g. HR001' : role === 'manager' ? 'e.g. MGR001' : role === 'hod' ? 'e.g. HOD001' : 'e.g. EMP001'}
                    value={inputId}
                    onChange={e => setInputId(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 placeholder-slate-300 font-mono font-bold text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-3 text-rose-600 text-sm font-semibold mb-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    <span className="shrink-0 mt-0.5">⚠️</span><span>{error}</span>
                  </div>
                )}

                <button onClick={handleSendOtp} disabled={!role || !inputId.trim() || loading}
                  className="ih-sheen w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-blue-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending OTP...</>
                    : <><Mail className="w-4 h-4" /> Send OTP to Email</>}
                </button>

                <div className="mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={handleAdminOtp}
                    disabled={loading}
                    className="w-full py-2.5 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading ? <span className="w-3.5 h-3.5 border-2 border-rose-400/40 border-t-rose-500 rounded-full animate-spin" /> : '🏢'}
                    First-time setup — Admin OTP Login
                  </button>
                  <p className="text-slate-500 text-[10px] text-center mt-1.5">OTP will be sent to the registered admin email</p>
                </div>
              </>
            ) : (
              <>
                <button onClick={handleBackToId}
                  className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-xs font-semibold mb-6 transition-colors group">
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
                </button>

                <div className="text-center mb-7">
                  <div className="ih-float w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-slate-900 font-bold text-base mb-1">Check your inbox</h3>
                  <p className="text-slate-500 text-sm">
                    OTP sent to <span className="text-blue-600 font-semibold">{maskedEmail}</span>
                  </p>
                  <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span className="text-amber-600 text-[11px] font-bold">Expires in 5 minutes</span>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 text-center">Enter 6-digit OTP</label>
                  <input
                    type="text" inputMode="numeric" placeholder="· · · · · ·" maxLength={6}
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-300 font-mono font-black text-3xl text-center tracking-[0.6em] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <div className="flex justify-center gap-1.5 mt-3">
                    {[0,1,2,3,4,5].map(i => (
                      <div key={i} className={`h-1 rounded-full transition-all duration-200 ${i < otpInput.length ? 'w-5 bg-blue-500' : 'w-3 bg-slate-200'}`} />
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 text-rose-600 text-sm font-semibold mb-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    <span className="shrink-0">⚠️</span><span>{error}</span>
                  </div>
                )}

                <button onClick={handleVerifyOtp} disabled={otpInput.length !== 6 || loading}
                  className="ih-sheen w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-blue-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2">
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
          </div>
        </div>
      </div>
    </div>
  );
}
