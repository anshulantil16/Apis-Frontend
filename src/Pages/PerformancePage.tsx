import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Users, Shield, BarChart3 } from 'lucide-react';
import { EmployeeView } from '../Components/Performance/employee/EmployeeView';
import { ManagerView } from '../Components/Performance/manager/ManagerView';
import { HRView } from '../Components/Performance/hr/HRView';

interface PerformancePageProps {
  onNavigateBack: () => void;
}

type Role = 'employee' | 'manager' | 'hr';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const PERF_API = `${API_BASE}/api/performance`;

export function PerformancePage({ onNavigateBack }: PerformancePageProps) {
  const [role, setRole] = useState<Role | null>(null);
  const [inputId, setInputId] = useState('');
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${PERF_API}/employees/`)
      .then(r => r.ok ? r.json() : [])
      .then(setDbEmployees)
      .catch(() => {});
  }, [employee]);

  const handleLogin = async () => {
    if (!inputId.trim() || !role) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${PERF_API}/employee/${inputId.trim()}/`);
      if (!res.ok) throw new Error('Employee ID not found. Please check and try again.');
      const data = await res.json();
      setEmployee(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Logged in — show role view
  if (employee && role) {
    return (
      <div className="min-h-screen bg-[#0f0f1a]">
        <header className="border-b border-white/5 bg-[#0f0f1a]/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => { setEmployee(null); setRole(null); setInputId(''); }} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl">
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
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              role === 'hr' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : role === 'manager' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
            }`}>
              {role === 'hr' ? '🏢 HR Admin' : role === 'manager' ? '👔 Manager' : '👤 Employee'}
            </span>
            <button onClick={onNavigateBack} className="text-slate-500 hover:text-slate-300 text-xs font-semibold transition-colors">
              ← Data Tools
            </button>
          </div>
        </header>

        {role === 'employee' && <EmployeeView employee={employee} />}
        {role === 'manager' && <ManagerView manager={employee} />}
        {role === 'hr' && <HRView hrUser={employee} />}
      </div>
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

          {/* Quick Select testing accounts */}
          {dbEmployees.length > 0 && (
            <div className="mb-5">
              <label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-2">
                ⚡ Testing & Demo Accounts (Click to autofill)
              </label>
              <div className="max-h-32 overflow-y-auto bg-white/5 border border-white/10 rounded-2xl p-2 space-y-1 scrollbar-thin">
                {dbEmployees.map(emp => (
                  <button
                    key={emp.employee_id}
                    onClick={() => {
                      setInputId(emp.employee_id);
                      setRole(emp.user_type === 'hr' ? 'hr' : emp.user_type === 'manager' ? 'manager' : 'employee');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-violet-500/10 hover:border-violet-500/20 border border-transparent text-xs text-slate-300 font-semibold transition-all flex justify-between items-center"
                  >
                    <div>
                      <p className="text-white font-bold">{emp.name}</p>
                      <p className="text-[10px] text-slate-400">ID: {emp.employee_id} · Mgr: {emp.reporting_manager_id || 'None'}</p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      emp.user_type === 'hr' ? 'bg-rose-500/20 text-rose-300'
                      : emp.user_type === 'manager' ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-violet-500/20 text-violet-300'
                    }`}>
                      {emp.user_type === 'hr' ? 'HR' : emp.user_type === 'manager' ? 'Mgr' : 'Emp'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Employee ID input */}
          <div className="mb-5">
            <label className="text-slate-400 text-xs font-bold uppercase tracking-widest block mb-2">Or type Employee ID</label>
            <input
              type="text"
              placeholder="e.g. EMP001"
              value={inputId}
              onChange={e => setInputId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-500 font-semibold text-sm focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/5 transition-all"
            />
          </div>

          {error && (
            <p className="text-rose-400 text-sm font-semibold mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
              ⚠️ {error}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={!role || !inputId.trim() || loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-violet-500/30 active:scale-95"
          >
            {loading ? 'Verifying...' : 'Enter Performance Hub →'}
          </button>

          {/* First-time setup bypass */}
          <div className="pt-4 border-t border-white/10">
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
        </div>

      </div>
    </div>
  );
}
