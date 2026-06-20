import { useState, useEffect, useRef } from 'react';
import {
  Upload, Download, TrendingUp, Users, DollarSign, Award, ChevronDown,
  ChevronUp, Search, X, BarChart3, PieChart, Zap, Star, ArrowUpRight, ArrowLeft,
  FileSpreadsheet, AlertCircle, CheckCircle, Crown, Sparkles, Flame,
  Target, RefreshCw, Trash2,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PMS = `${API_BASE}/api/pms`;

const GRADES: Record<string, { label: string; color: string; gradient: string; glow: string; text: string; light: string; inc_min: number; inc_max: number; promo_pct: number; range: string }> = {
  'A+': { label: 'Exceptional',       color: '#059669', gradient: 'from-emerald-400 to-teal-500',  glow: 'shadow-emerald-200', text: 'text-emerald-600', light: 'bg-emerald-50 border-emerald-200', inc_min: 12, inc_max: 15, promo_pct: 10, range: '≥106%' },
  'A':  { label: 'Outstanding',       color: '#0284c7', gradient: 'from-sky-400 to-blue-600',      glow: 'shadow-sky-200',     text: 'text-sky-600',     light: 'bg-sky-50 border-sky-200',         inc_min: 10, inc_max: 12, promo_pct: 8,  range: '95–100%' },
  'B+': { label: 'Exceeds Target',    color: '#7c3aed', gradient: 'from-violet-400 to-purple-600', glow: 'shadow-violet-200',  text: 'text-violet-600',  light: 'bg-violet-50 border-violet-200',   inc_min: 7,  inc_max: 10, promo_pct: 6,  range: '85–94%' },
  'B':  { label: 'Meets Target',      color: '#d97706', gradient: 'from-amber-400 to-orange-500',  glow: 'shadow-amber-200',   text: 'text-amber-600',   light: 'bg-amber-50 border-amber-200',     inc_min: 4,  inc_max: 7,  promo_pct: 4,  range: '65–84%' },
  'C':  { label: 'Near Target',       color: '#ea580c', gradient: 'from-orange-400 to-red-500',    glow: 'shadow-orange-200',  text: 'text-orange-600',  light: 'bg-orange-50 border-orange-200',   inc_min: 0,  inc_max: 4,  promo_pct: 0,  range: '51–64%' },
  'D':  { label: 'Needs Improvement', color: '#dc2626', gradient: 'from-rose-500 to-red-700',      glow: 'shadow-rose-200',    text: 'text-rose-600',    light: 'bg-rose-50 border-rose-200',       inc_min: 2,  inc_max: 2,  promo_pct: 0,  range: '<50%' },
};
const GO = ['A+', 'A', 'B+', 'B', 'C', 'D'];

const fmt   = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
const fmtCr = (n: number) => n >= 10000000 ? `₹${(n/10000000).toFixed(2)}Cr` : n >= 100000 ? `₹${(n/100000).toFixed(2)}L` : `₹${fmt(n)}`;

// ── Small reusable components ─────────────────────────────────────────────────
function GradePill({ grade, size = 'md' }: { grade: string; size?: 'sm'|'md'|'lg' }) {
  const c = GRADES[grade]; if (!c) return null;
  const s = { sm: 'px-2 py-0.5 text-[10px]', md: 'px-3 py-1 text-xs', lg: 'px-4 py-1.5 text-sm' }[size];
  return <span className={`inline-flex font-black rounded-full text-white bg-gradient-to-r ${c.gradient} shadow-md ${c.glow} ${s}`}>{grade}</span>;
}

function Bar({ value, max, gradient }: { value: number; max: number; gradient: string }) {
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`} style={{ width: `${max > 0 ? Math.min(100, (value/max)*100) : 0}%` }} />
    </div>
  );
}

function ScoreRing({ score, size = 50 }: { score: number; size?: number }) {
  const g = score >= 106 ? 'A+' : score >= 95 ? 'A' : score >= 85 ? 'B+' : score >= 65 ? 'B' : score >= 51 ? 'C' : 'D';
  const color = GRADES[g]?.color || '#94a3b8';
  const r = size/2 - 5; const circ = 2*Math.PI*r; const dash = (Math.min(score,100)/100)*circ;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 3px ${color}60)` }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[11px] font-black" style={{ color }}>{score.toFixed(0)}</span>
        <span className="text-[8px] text-slate-300">/100</span>
      </div>
    </div>
  );
}

function Slider({ emp, onUpdate }: { emp: any; onUpdate: (id: number, d: any) => void }) {
  const cfg = GRADES[emp.effective_grade];
  const [val, setVal] = useState<number>(emp.effective_increment_pct);
  const min = cfg?.inc_min ?? 0, max = cfg?.inc_max ?? 15;
  const pct = max > min ? ((val-min)/(max-min))*100 : 100;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-slate-400">{min}%</span>
        <span className={`text-base font-black bg-gradient-to-r ${cfg?.gradient} bg-clip-text text-transparent`}>{val.toFixed(1)}%</span>
        <span className="text-[10px] text-slate-400">{max}%</span>
      </div>
      <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden">
        <div className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${cfg?.gradient} transition-all duration-100`} style={{ width: `${pct}%` }} />
        <input type="range" min={min} max={max} step={0.5} value={val}
          onChange={e => { const v = parseFloat(e.target.value); setVal(v); onUpdate(emp.id, { override_increment_pct: v }); }}
          className="absolute inset-0 w-full opacity-0 cursor-pointer" />
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, gradient, glow }: any) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${gradient} shadow-xl ${glow} text-white`}>
      <div className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-white/10" />
      <div className="relative">
        <div className="flex justify-between items-start mb-3">
          <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest">{label}</p>
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center"><Icon className="w-4 h-4 text-white" /></div>
        </div>
        <p className="text-3xl font-black">{value}</p>
        <p className="text-white/60 text-xs mt-1.5">{sub}</p>
      </div>
    </div>
  );
}

function DonutChart({ data, total }: { data: Record<string,number>; total: number }) {
  if (!total) return <div className="flex flex-col items-center py-8 text-slate-300"><PieChart className="w-8 h-8 mb-2"/><p className="text-xs">No data yet</p></div>;
  let cum = 0;
  const segs = GO.filter(g => data[g] > 0).map(g => {
    const pct = (data[g]/total)*100; const s = (cum/100)*360; const e = ((cum+pct)/100)*360; cum += pct;
    return { g, pct, s, e, color: GRADES[g].color, count: data[g] };
  });
  const pol = (cx:number,cy:number,r:number,a:number) => { const rad=(a-90)*Math.PI/180; return {x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)}; };
  const arc = (cx:number,cy:number,r:number,s:number,e:number) => { const sp=pol(cx,cy,r,s),ep=pol(cx,cy,r,e); return `M ${cx} ${cy} L ${sp.x} ${sp.y} A ${r} ${r} 0 ${e-s>180?1:0} 1 ${ep.x} ${ep.y} Z`; };
  return (
    <div className="flex items-center gap-5">
      <svg width="140" height="140" viewBox="0 0 140 140">
        {segs.map((s,i) => <path key={i} d={arc(70,70,58,s.s,s.e-0.5)} fill={s.color} opacity="0.9"><title>{s.g}: {s.count}</title></path>)}
        <circle cx="70" cy="70" r="36" fill="white"/>
        <text x="70" y="65" textAnchor="middle" fontSize="20" fontWeight="900" fill="#1e293b">{total}</text>
        <text x="70" y="80" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="700" letterSpacing="1">EMPLOYEES</text>
      </svg>
      <div className="space-y-2 flex-1">
        {segs.map(s => (
          <div key={s.g} className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black bg-gradient-to-br ${GRADES[s.g].gradient} shrink-0`}>{s.g}</span>
            <div className="flex-1"><Bar value={s.count} max={total} gradient={GRADES[s.g].gradient}/></div>
            <span className="text-xs font-black text-slate-500 w-5 text-right">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function PMSPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [loginStep, setLoginStep] = useState<'email'|'otp'>('email');
  const [otp, setOtp] = useState('');

  const [data, setData]         = useState<any>({ employees: [], summary: {} });
  const [importing, setImporting] = useState(false);
  const [msg, setMsg]         = useState<{text:string;ok:boolean}|null>(null);
  const [tab, setTab]         = useState<'simulator'|'org'|'salary'|'leadership'|'guide'>('simulator');
  const [search, setSearch]   = useState('');
  const [fGrade, setFGrade]   = useState('');
  const [fDept, setFDept]     = useState('');
  const [expanded, setExpanded] = useState<number|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await fetch(`${PMS}/employees/`);
      const d = await res.json();
      setData(d);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true); setMsg(null);
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await fetch(`${PMS}/import/`, { method: 'POST', body: fd });
      const d = await res.json();
      setMsg({ text: d.message || d.error, ok: res.ok });
      if (res.ok) { setData({ employees: d.employees || [], summary: d.summary || {} }); load(); }
    } catch { setMsg({ text: 'Import failed. Check file format.', ok: false }); }
    setImporting(false); e.target.value = '';
  };

  const update = async (empId: number, updates: any) => {
    const res = await fetch(`${PMS}/employees/${empId}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setData((prev: any) => ({ ...prev, employees: prev.employees.map((e: any) => e.id === empId ? updated : e) }));
      // refresh summary
      setTimeout(load, 300);
    }
  };

  const clearAll = async () => {
    if (!confirm('Clear all PMS data? This cannot be undone.')) return;
    await fetch(`${PMS}/employees/`, { method: 'DELETE' });
    setData({ employees: [], summary: {} });
    setMsg({ text: 'All data cleared.', ok: true });
  };

  const handleEmailSubmit = () => {
    if (!adminEmail.includes('@')) {
      setMsg({ text: 'Please enter a valid email', ok: false });
      return;
    }
    // For now, auto-accept if it's the admin email
    if (adminEmail.toLowerCase() === 'anshul@apisindia.com') {
      setLoginStep('otp');
      setMsg({ text: 'OTP sent to your email (for demo: enter any 4 digits)', ok: true });
    } else {
      setMsg({ text: 'Only admin email allowed for PMS Simulator', ok: false });
    }
  };

  const handleOtpSubmit = () => {
    if (otp.length === 4 && /^\d+$/.test(otp)) {
      setLoggedIn(true);
      setMsg(null);
    } else {
      setMsg({ text: 'Please enter a valid 4-digit OTP', ok: false });
    }
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setAdminEmail('');
    setOtp('');
    setLoginStep('email');
    setMsg(null);
  };

  const emps: any[] = data.employees || [];
  const sum         = data.summary || {};
  const totalCTC    = sum.total_current_ctc || 0;
  const newCTC      = sum.total_new_ctc || 0;
  const totalInc    = sum.total_increment || 0;
  const incPct      = sum.increment_pct || 0;
  const depts       = [...new Set(emps.map((e:any) => e.department).filter(Boolean))];

  const filtered = emps.filter(e => {
    const s = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.employee_id.toLowerCase().includes(search.toLowerCase());
    return s && (!fGrade || e.effective_grade === fGrade) && (!fDept || e.department === fDept);
  });

  const TABS = [
    { id: 'simulator',  label: 'Live Simulator', icon: Zap,       grad: 'from-indigo-500 to-violet-600' },
    { id: 'org',        label: 'Org Dashboard',  icon: BarChart3,  grad: 'from-pink-500 to-rose-600' },
    { id: 'salary',     label: 'Salary Impact',  icon: DollarSign, grad: 'from-emerald-500 to-teal-600' },
    { id: 'leadership', label: 'Leadership View', icon: Crown,      grad: 'from-amber-500 to-orange-600' },
    { id: 'guide',      label: 'Grade Guide',     icon: Star,       grad: 'from-violet-500 to-purple-700' },
  ];

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 overflow-hidden">
        {/* Animated floating shapes */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-indigo-200/40 to-blue-200/40 rounded-full blur-2xl animate-bounce" style={{ animationDuration: '3s' }} />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-br from-violet-200/40 to-indigo-200/40 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-10 w-28 h-28 bg-gradient-to-br from-blue-300/30 to-cyan-300/30 rounded-full blur-2xl" style={{ animation: 'float 6s ease-in-out infinite' }} />

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
        `}</style>

        <div className="relative z-10 w-full max-w-2xl">
          {/* Main Container */}
          <div className="grid grid-cols-2 gap-8 items-center">

            {/* Left Side - Visual */}
            <div className="hidden lg:block space-y-6">
              <div className="space-y-2">
                <h1 className="text-5xl font-black bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  Performance Simulator
                </h1>
                <p className="text-lg text-slate-600 font-bold">
                  Advanced Salary & Grading Engine
                </p>
              </div>

              {/* Feature Cards */}
              <div className="space-y-3">
                {[
                  { icon: '📊', label: 'Real-time Analytics', desc: 'Track performance metrics' },
                  { icon: '💰', label: 'Salary Simulation', desc: 'Calculate increments & promotions' },
                  { icon: '🎯', label: 'Grade Modeling', desc: 'Predict performance outcomes' },
                  { icon: '⚡', label: 'Instant Reports', desc: 'Generate insights on demand' },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group">
                    <span className="text-2xl group-hover:scale-110 transition-transform">{f.icon}</span>
                    <div>
                      <p className="font-bold text-slate-900">{f.label}</p>
                      <p className="text-xs text-slate-500">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Login */}
            <div className="w-full max-w-sm mx-auto">
              <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-xl overflow-hidden">

                {/* Header */}
                <div className="relative bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 px-8 py-10 text-white text-center">
                  <div className="absolute top-3 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h2 className="text-3xl font-black mb-1">Welcome</h2>
                  <p className="text-white/90 text-sm">Admin Access Portal</p>
                </div>

                {/* Content */}
                <div className="px-8 py-8">
                  {loginStep === 'email' ? (
                    <div className="space-y-6 animate-fadeIn">
                      <div>
                        <label className="block text-slate-700 text-sm font-black mb-3">Email Address</label>
                        <input
                          type="email"
                          placeholder="Enter your email"
                          value={adminEmail}
                          onChange={e => setAdminEmail(e.target.value)}
                          onKeyPress={e => e.key === 'Enter' && handleEmailSubmit()}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all font-semibold"
                        />
                      </div>
                      <button
                        onClick={handleEmailSubmit}
                        className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Continue
                      </button>
                      <p className="text-center text-xs text-slate-500">
                        Enter your admin email to proceed
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="text-center">
                        <p className="text-slate-600 text-sm font-semibold mb-2">Verification Code</p>
                        <p className="text-xs text-slate-500 mb-4">For demo, enter any 4 digits</p>
                        <input
                          type="text"
                          placeholder="0000"
                          value={otp}
                          onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          onKeyPress={e => e.key === 'Enter' && handleOtpSubmit()}
                          maxLength={4}
                          className="w-24 h-24 mx-auto text-center text-5xl font-black border-3 border-indigo-300 rounded-2xl text-indigo-600 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all tracking-widest"
                        />
                      </div>
                      <button
                        onClick={handleOtpSubmit}
                        className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Verify & Enter
                      </button>
                      <button
                        onClick={() => { setLoginStep('email'); setOtp(''); setMsg(null); setAdminEmail(''); }}
                        className="w-full px-6 py-2 text-indigo-600 hover:text-indigo-700 font-bold text-sm transition-colors bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                      >
                        ← Try Another Email
                      </button>
                    </div>
                  )}

                  {/* Message */}
                  {msg && (
                    <div className={`mt-6 flex items-center gap-3 px-4 py-3 rounded-lg border-2 animate-slideDown ${msg.ok ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-rose-50 border-rose-300 text-rose-700'}`}>
                      {msg.ok ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                      <p className="text-sm font-bold">{msg.text}</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-gradient-to-r from-indigo-50 to-violet-50 border-t-2 border-indigo-100 text-center">
                  <p className="text-slate-600 text-xs font-semibold">
                    🔒 Secure Admin Portal • Authorized Access Only
                  </p>
                </div>
              </div>

              {/* Bottom Stats */}
              <div className="mt-6 text-center text-slate-600 text-xs font-semibold">
                <p>⚡ Powering Real-time Performance Management</p>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
          .animate-slideDown { animation: slideDown 0.3s ease-out; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50/30">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-white/60 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-slate-900 font-black text-lg">PMS Simulator</h1>
              <p className="text-slate-400 text-[11px]">{emps.length} employees loaded · FY 2025-26</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border-2 border-slate-200 hover:border-rose-300 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-bold transition-all">
              <ArrowLeft className="w-3.5 h-3.5" /> Logout
            </button>
            <a href={`${PMS}/template/`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-white border-2 border-slate-200 hover:border-violet-300 text-slate-600 hover:text-violet-600 rounded-xl text-xs font-bold transition-all">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Template
            </a>
            <button onClick={() => fileRef.current?.click()} disabled={importing}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all disabled:opacity-60">
              {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {importing ? 'Importing…' : 'Import Data'}
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            {emps.length > 0 && (
              <a href={`${PMS}/export/`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200">
                <Download className="w-3.5 h-3.5" /> Export
              </a>
            )}
            {emps.length > 0 && (
              <button onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {msg && (
        <div className={`mx-6 mt-3 px-5 py-3 rounded-2xl flex items-center gap-3 text-sm font-semibold border-2 ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          {msg.ok ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-6 py-5 space-y-5">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Employees" value={fmt(sum.total_employees||0)}    sub={`Avg Score: ${sum.avg_score||0}`}                                          icon={Users}     gradient="from-blue-500 to-indigo-600"   glow="shadow-blue-200" />
          <KpiCard label="Current Payroll" value={fmtCr(totalCTC)}               sub="Annual total before increment"                                              icon={DollarSign} gradient="from-slate-500 to-slate-700"   glow="shadow-slate-200" />
          <KpiCard label="New Payroll"     value={fmtCr(newCTC)}                 sub={`+${fmtCr(totalInc)} total increment`}                                      icon={TrendingUp} gradient="from-emerald-400 to-teal-600"  glow="shadow-emerald-200" />
          <KpiCard label="Avg Increment"   value={`${incPct.toFixed(1)}%`}       sub={`${sum.promoted_count||0} promoted · ${sum.reward_count||0} rewarded`}     icon={Award}      gradient="from-violet-500 to-purple-700" glow="shadow-violet-200" />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${tab===t.id ? `bg-gradient-to-r ${t.grad} text-white shadow-md` : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {emps.length === 0 && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-indigo-200 p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-10 h-10 text-indigo-400" />
            </div>
            <p className="text-slate-800 font-black text-2xl">Ready to Simulate!</p>
            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">Download the template → fill employee data with scores → Import to start live simulation</p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <a href={`${PMS}/template/`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 border-2 border-indigo-300 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50">
                <Download className="w-4 h-4" /> Download Template
              </a>
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200">
                <Upload className="w-4 h-4" /> Import Data
              </button>
            </div>
          </div>
        )}

        {/* ═══ SIMULATOR TAB ═══ */}
        {tab === 'simulator' && emps.length > 0 && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap bg-white rounded-2xl px-4 py-3 border border-slate-200 shadow-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                  className="border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-400 w-48 bg-slate-50" />
              </div>
              <select value={fGrade} onChange={e => setFGrade(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400">
                <option value="">All Grades</option>
                {GO.map(g => <option key={g} value={g}>Grade {g} — {GRADES[g].label}</option>)}
              </select>
              <select value={fDept} onChange={e => setFDept(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400">
                <option value="">All Departments</option>
                {depts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {(search||fGrade||fDept) && <button onClick={() => {setSearch('');setFGrade('');setFDept('');}} className="flex items-center gap-1 px-3 py-2 bg-rose-50 text-rose-500 rounded-xl text-xs font-bold"><X className="w-3.5 h-3.5"/>Clear</button>}
              <span className="ml-auto text-slate-400 text-xs">{filtered.length} of {emps.length}</span>
            </div>

            {filtered.map(emp => {
              const isExp = expanded === emp.id;
              const cfg = GRADES[emp.effective_grade];
              return (
                <div key={emp.id} className={`bg-white rounded-2xl border-2 shadow-sm hover:shadow-lg transition-all overflow-hidden ${isExp ? 'border-indigo-200' : 'border-slate-100 hover:border-indigo-200'}`}>
                  <div className="grid grid-cols-12 gap-3 px-4 py-3.5 items-center cursor-pointer" onClick={() => setExpanded(isExp ? null : emp.id)}>
                    {/* Employee */}
                    <div className="col-span-3 flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white font-black text-lg shadow-lg ${cfg.glow} shrink-0`}>{emp.name[0]}</div>
                      <div className="min-w-0">
                        <p className="text-slate-800 font-bold text-sm truncate">{emp.name}</p>
                        <p className="text-slate-400 text-xs truncate">{emp.designation}</p>
                        <p className="text-slate-300 text-[10px]">#{emp.employee_id} · {emp.department}</p>
                      </div>
                    </div>
                    {/* Score */}
                    <div className="col-span-2 flex items-center gap-3">
                      <ScoreRing score={emp.final_score} />
                      <div className="text-[10px] text-slate-400 space-y-0.5">
                        <div>Mgr: <span className="font-black text-slate-600">{emp.manager_score??'—'}</span></div>
                        <div>HOD: <span className="font-black text-slate-600">{emp.hod_score??'—'}</span></div>
                        <div>Mgt: <span className="font-black text-slate-600">{emp.management_score??'—'}</span></div>
                      </div>
                    </div>
                    {/* Grade */}
                    <div className="col-span-1 flex flex-col items-center gap-1">
                      <GradePill grade={emp.effective_grade} size="lg"/>
                      <span className="text-[9px] text-slate-400 text-center">{cfg.label}</span>
                    </div>
                    {/* Slider */}
                    <div className="col-span-2" onClick={e => e.stopPropagation()}>
                      <Slider emp={emp} onUpdate={update}/>
                    </div>
                    {/* CTC */}
                    <div className="col-span-3">
                      <div className={`rounded-2xl p-3 border-2 ${cfg.light}`}>
                        <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">Current</span><span className="text-slate-600 font-bold">₹{fmt(emp.current_ctc)}</span></div>
                        <div className="flex justify-between text-xs mb-2"><span className="text-slate-400">Increment</span><span className="text-emerald-500 font-bold">+₹{fmt(emp.increment_amount)}</span></div>
                        <div className="flex justify-between text-sm"><span className="font-bold text-slate-700">New CTC</span><span className={`font-black bg-gradient-to-r ${cfg.gradient} bg-clip-text text-transparent`}>₹{fmt(emp.new_ctc)}</span></div>
                      </div>
                    </div>
                    {/* Flags */}
                    <div className="col-span-1 flex flex-col items-end gap-1.5">
                      {emp.promoted && <span className="w-7 h-7 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md" title="Promoted"><Crown className="w-3.5 h-3.5 text-white"/></span>}
                      {emp.on_time_reward && <span className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md" title="Reward"><Star className="w-3.5 h-3.5 text-white"/></span>}
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center mt-auto ${isExp ? 'bg-indigo-100 text-indigo-500' : 'bg-slate-100 text-slate-400'}`}>
                        {isExp ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
                      </div>
                    </div>
                  </div>

                  {isExp && (
                    <div className={`border-t-2 ${cfg.light} bg-gradient-to-br from-slate-50 to-white p-5 grid grid-cols-3 gap-5`}>
                      {/* Score breakdown */}
                      <div className="space-y-3">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-indigo-400"/>Score Breakdown</p>
                        {[
                          { l: 'Manager Score', v: emp.manager_score,    w: 35, g: 'from-blue-400 to-indigo-500' },
                          { l: 'HOD Score',     v: emp.hod_score,        w: 35, g: 'from-violet-400 to-purple-500' },
                          { l: 'Mgmt Score',    v: emp.management_score, w: 30, g: 'from-pink-400 to-rose-500' },
                        ].map(s => (
                          <div key={s.l}>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-slate-500">{s.l} <span className="text-slate-300">({s.w}%)</span></span>
                              <span className={`font-black bg-gradient-to-r ${s.g} bg-clip-text text-transparent`}>{s.v??'—'}/100</span>
                            </div>
                            <Bar value={s.v??0} max={100} gradient={s.g}/>
                          </div>
                        ))}
                        {(emp.fy_prev1_score || emp.fy_prev2_score) && (
                          <div className="pt-2 border-t border-slate-200">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1.5">Performance Trend</p>
                            <div className="flex items-center gap-3 text-xs">
                              {emp.fy_prev2_score && <div className="text-center"><p className="text-slate-400">FY-2</p><p className="font-black text-slate-600">{emp.fy_prev2_score}</p></div>}
                              {emp.fy_prev1_score && <><ArrowUpRight className="w-3 h-3 text-slate-300"/><div className="text-center"><p className="text-slate-400">FY-1</p><p className="font-black text-slate-600">{emp.fy_prev1_score}</p></div></>}
                              <ArrowUpRight className="w-3 h-3 text-emerald-400"/>
                              <div className="text-center"><p className="text-slate-400">Now</p><p className={`font-black bg-gradient-to-r ${cfg.gradient} bg-clip-text text-transparent`}>{emp.final_score}</p></div>
                            </div>
                          </div>
                        )}
                        <div className={`pt-2 border-t-2 ${cfg.light} flex justify-between`}>
                          <span className="font-bold text-slate-700 text-sm">Final Score</span>
                          <span className={`font-black text-lg bg-gradient-to-r ${cfg.gradient} bg-clip-text text-transparent`}>{emp.final_score}</span>
                        </div>
                      </div>

                      {/* Overrides */}
                      <div className="space-y-3">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-400"/>Override Controls</p>
                        <div>
                          <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Override Grade</label>
                          <select value={emp.override_grade||''} onChange={e => update(emp.id, { override_grade: e.target.value })}
                            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400">
                            <option value="">Auto — Grade {emp.auto_grade}</option>
                            {GO.map(g => <option key={g} value={g}>Grade {g} — {GRADES[g].label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Management Score Override</label>
                          <input type="number" min="0" max="100" defaultValue={emp.management_score??''}
                            onBlur={e => update(emp.id, { management_score: e.target.value||null })} placeholder="0–100"
                            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400"/>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Promotion Readiness</label>
                          <select value={emp.promotion_readiness||''} onChange={e => update(emp.id, { promotion_readiness: e.target.value })}
                            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400">
                            <option value="">Not Set</option>
                            <option value="ready_now">Ready Now</option>
                            <option value="1_year">Ready in 1 Year</option>
                            <option value="2_years">Ready in 2 Years</option>
                            <option value="not_ready">Not Ready</option>
                          </select>
                        </div>
                        <div className="flex gap-3">
                          {[
                            { k: 'promoted', l: 'Promoted', v: emp.promoted, g: 'from-violet-500 to-purple-600', I: Crown },
                            { k: 'on_time_reward', l: 'Reward', v: emp.on_time_reward, g: 'from-amber-400 to-orange-500', I: Star },
                          ].map(t => (
                            <button key={t.k} onClick={() => update(emp.id, { [t.k]: !t.v })}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${t.v ? `bg-gradient-to-r ${t.g} text-white border-transparent shadow-md` : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                              <t.I className="w-3.5 h-3.5"/> {t.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Remarks */}
                      <div className="space-y-3">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Remarks</p>
                        {emp.manager_remarks && <div className="bg-blue-50 border border-blue-100 rounded-xl p-3"><p className="text-[10px] text-blue-400 font-black uppercase mb-1">Manager</p><p className="text-slate-600 text-xs leading-relaxed">{emp.manager_remarks}</p></div>}
                        {emp.hod_remarks && <div className="bg-violet-50 border border-violet-100 rounded-xl p-3"><p className="text-[10px] text-violet-400 font-black uppercase mb-1">HOD</p><p className="text-slate-600 text-xs leading-relaxed">{emp.hod_remarks}</p></div>}
                        <textarea placeholder="Add notes…" defaultValue={emp.notes}
                          onBlur={e => update(emp.id, { notes: e.target.value })} rows={2}
                          className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400 resize-none placeholder-slate-300"/>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ ORG DASHBOARD ═══ */}
        {tab === 'org' && emps.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {/* Grade Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md"><PieChart className="w-4 h-4 text-white"/></div>
                <h3 className="font-black text-slate-800">Grade Distribution</h3>
              </div>
              <DonutChart data={sum.grade_distribution||{}} total={sum.total_employees||0}/>
            </div>

            {/* Dept Heat Map */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md"><BarChart3 className="w-4 h-4 text-white"/></div>
                <h3 className="font-black text-slate-800">Department Heat Map</h3>
              </div>
              <div className="space-y-2">
                {(sum.department_breakdown||[]).map((d:any,i:number) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-slate-700 truncate">{d.department}</span>
                        <span className="text-slate-400 shrink-0 ml-2">{d.count} emp</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-400">Avg Score: <span className="font-black text-slate-600">{d.avg_score}</span></span>
                        <span className="text-violet-500 font-bold">{d.promotion_cases} promotions</span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-xs font-black text-white ${d.avg_score >= 95 ? 'bg-emerald-500' : d.avg_score >= 85 ? 'bg-sky-500' : d.avg_score >= 65 ? 'bg-amber-500' : 'bg-rose-500'}`}>
                      {d.avg_score >= 95 ? 'A+' : d.avg_score >= 85 ? 'B+' : d.avg_score >= 65 ? 'B' : 'C'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance vs Salary Quadrant */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-md"><Target className="w-4 h-4 text-white"/></div>
                <h3 className="font-black text-slate-800">Performance vs Salary Matrix</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'high_perf_high_pay', label: 'Star Performers',  sub: 'High Score · High Pay',  grad: 'from-emerald-400 to-teal-500',  icon: '⭐' },
                  { key: 'high_perf_low_pay',  label: 'Future Bets',      sub: 'High Score · Low Pay',   grad: 'from-sky-400 to-blue-600',       icon: '🚀' },
                  { key: 'low_perf_high_pay',  label: 'Cost Burden',      sub: 'Low Score · High Pay',   grad: 'from-rose-400 to-red-600',       icon: '⚠️' },
                  { key: 'low_perf_low_pay',   label: 'Stable Workforce', sub: 'Low Score · Low Pay',    grad: 'from-slate-400 to-slate-600',    icon: '📊' },
                ].map(q => (
                  <div key={q.key} className={`bg-gradient-to-br ${q.grad} rounded-2xl p-4 text-white`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-2xl">{q.icon}</span>
                      <span className="text-3xl font-black">{(sum.performance_vs_salary||{})[q.key]||0}</span>
                    </div>
                    <p className="font-black text-sm">{q.label}</p>
                    <p className="text-white/70 text-xs">{q.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Promotion Readiness */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center shadow-md"><Crown className="w-4 h-4 text-white"/></div>
                <h3 className="font-black text-slate-800">Promotion Readiness Pipeline</h3>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'ready_now', label: 'Ready Now',       grad: 'from-emerald-400 to-teal-500' },
                  { key: '1_year',   label: 'Ready in 1 Year', grad: 'from-sky-400 to-blue-600' },
                  { key: '2_years',  label: 'Ready in 2 Years',grad: 'from-amber-400 to-orange-500' },
                  { key: 'not_ready',label: 'Not Ready',       grad: 'from-slate-400 to-slate-600' },
                ].map(r => {
                  const count = (sum.promotion_readiness||{})[r.key]||0;
                  return (
                    <div key={r.key} className="flex items-center gap-3">
                      <div className={`w-32 text-xs font-bold text-slate-600`}>{r.label}</div>
                      <div className="flex-1"><Bar value={count} max={emps.length} gradient={r.grad}/></div>
                      <span className="text-sm font-black text-slate-700 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {(sum.gender_breakdown||[]).map((g:any,i:number) => (
                  <div key={i} className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-3">
                    <p className="text-slate-500 text-xs font-semibold">{g.gender}</p>
                    <p className="text-slate-900 font-black text-xl">{g.count}</p>
                    <p className="text-indigo-500 text-xs font-bold">Avg: {g.avg_score}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ SALARY TAB ═══ */}
        {tab === 'salary' && emps.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {/* Payroll summary */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center shadow-md"><DollarSign className="w-4 h-4 text-white"/></div>
                <h3 className="font-black text-slate-800">Salary Impact Dashboard</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Current Payroll Cost', value: fmtCr(totalCTC), color: 'text-slate-700' },
                  { label: 'Total Increment Cost', value: fmtCr(totalInc), color: 'text-emerald-600' },
                  { label: 'Promotion Cost',       value: fmtCr(emps.filter(e=>e.promoted).reduce((s:number,e:any)=>s+e.increment_amount,0)), color: 'text-violet-600' },
                  { label: 'New Payroll Cost',     value: fmtCr(newCTC), color: 'text-indigo-700' },
                  { label: 'Budget Variance',      value: `${incPct.toFixed(2)}% increase`, color: 'text-rose-600' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                    <span className="text-slate-500 text-sm">{r.label}</span>
                    <span className={`font-black text-lg ${r.color}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grade-wise increment */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center shadow-md"><TrendingUp className="w-4 h-4 text-white"/></div>
                <h3 className="font-black text-slate-800">Grade-wise Increment Budget</h3>
              </div>
              <div className="space-y-3">
                {GO.map(grade => {
                  const d = (sum.grade_increment_breakdown||{})[grade]; if (!d?.count) return null;
                  const cfg = GRADES[grade];
                  return (
                    <div key={grade} className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white font-black text-sm shadow-md ${cfg.glow} shrink-0`}>{grade}</div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-500">{d.count} emp · avg {d.avg_increment_pct?.toFixed(1)}%</span>
                          <span className="font-black text-slate-800">{fmtCr(d.total_increment)}</span>
                        </div>
                        <Bar value={d.total_increment} max={totalInc||1} gradient={cfg.gradient}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dept payroll */}
            <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md"><BarChart3 className="w-4 h-4 text-white"/></div>
                <h3 className="font-black text-slate-800">Department-wise Payroll Impact</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(sum.department_breakdown||[]).map((d:any,i:number) => {
                  const incPctD = d.current_ctc > 0 ? ((d.increment/d.current_ctc)*100).toFixed(1) : '0';
                  return (
                    <div key={i} className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-black text-slate-800">{d.department}</p>
                          <p className="text-slate-400 text-xs">{d.count} employees</p>
                        </div>
                        <span className="text-emerald-600 font-black text-sm">+{incPctD}%</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-slate-400">Before</span><span className="text-slate-600 font-bold">{fmtCr(d.current_ctc)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">After</span><span className="text-emerald-600 font-bold">{fmtCr(d.new_ctc)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ LEADERSHIP TAB ═══ */}
        {tab === 'leadership' && emps.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {/* Top 10 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-md"><Star className="w-4 h-4 text-white"/></div>
                <h3 className="font-black text-slate-800">Top 10 Performers</h3>
              </div>
              <div className="space-y-2">
                {(sum.top10_performers||[]).map((e:any,i:number) => (
                  <div key={e.id} className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-3">
                    <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-sm">{i+1}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 text-sm truncate">{e.name}</p>
                      <p className="text-slate-400 text-xs truncate">{e.designation} · {e.department}</p>
                    </div>
                    <GradePill grade={e.effective_grade} size="sm"/>
                    <span className="text-amber-600 font-black text-sm">{e.final_score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom 10 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-red-700 rounded-xl flex items-center justify-center shadow-md"><AlertCircle className="w-4 h-4 text-white"/></div>
                <h3 className="font-black text-slate-800">Bottom 10 Performers</h3>
              </div>
              <div className="space-y-2">
                {(sum.bottom10_performers||[]).reverse().map((e:any,i:number) => (
                  <div key={e.id} className="flex items-center gap-3 bg-gradient-to-r from-rose-50 to-red-50 border border-rose-100 rounded-xl p-3">
                    <div className="w-7 h-7 bg-gradient-to-br from-rose-400 to-red-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-sm">{i+1}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 text-sm truncate">{e.name}</p>
                      <p className="text-slate-400 text-xs truncate">{e.designation} · {e.department}</p>
                    </div>
                    <GradePill grade={e.effective_grade} size="sm"/>
                    <span className="text-rose-600 font-black text-sm">{e.final_score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Metrics Summary */}
            <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md"><BarChart3 className="w-4 h-4 text-white"/></div>
                <h3 className="font-black text-slate-800 text-lg">Performance Summary</h3>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Total Headcount',    value: sum.total_employees||0,    bg: 'from-blue-50 to-indigo-50' },
                  { label: 'Avg Score',          value: `${sum.avg_score||0}`,     bg: 'from-sky-50 to-blue-50' },
                  { label: 'Grade A+ & A',       value: ((sum.grade_distribution||{})['A+']||0) + ((sum.grade_distribution||{})['A']||0), bg: 'from-emerald-50 to-teal-50' },
                  { label: 'Grade C & D',        value: ((sum.grade_distribution||{})['C']||0) + ((sum.grade_distribution||{})['D']||0),  bg: 'from-amber-50 to-orange-50' },
                  { label: 'Total Increment',    value: fmtCr(totalInc),           bg: 'from-violet-50 to-purple-50' },
                  { label: 'Promotions',         value: sum.promoted_count||0,     bg: 'from-pink-50 to-rose-50' },
                  { label: 'Ready to Promote',   value: (sum.promotion_readiness||{}).ready_now||0, bg: 'from-indigo-50 to-violet-50' },
                  { label: 'On-Time Rewards',    value: sum.reward_count||0,       bg: 'from-slate-50 to-slate-100' },
                ].map((m,i) => (
                  <div key={i} className={`bg-gradient-to-br ${m.bg} border border-slate-200 rounded-2xl p-4`}>
                    <p className="text-slate-700 font-black text-2xl mb-2">{m.value}</p>
                    <p className="text-slate-600 text-xs font-semibold">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ GRADE GUIDE TAB ═══ */}
        {tab === 'guide' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {GO.map(grade => {
                const cfg = GRADES[grade];
                const gradeEmps = emps.filter(e => e.effective_grade === grade);
                return (
                  <div key={grade} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all">
                    <div className={`bg-gradient-to-r ${cfg.gradient} p-5`}>
                      <div className="flex justify-between">
                        <div><span className="text-white/60 text-[10px] font-bold uppercase">Grade</span><p className="text-white font-black text-5xl">{grade}</p></div>
                        <div className="text-right"><p className="text-white font-black text-4xl">{gradeEmps.length}</p><p className="text-white/60 text-xs">employees</p></div>
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <p className={`font-black ${cfg.text}`}>{cfg.label}</p>
                      <p className="text-slate-400 text-xs">Score: <span className={`font-black ${cfg.text}`}>{cfg.range}</span></p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Increment</span><span className={`font-black ${cfg.text}`}>{cfg.inc_min}–{cfg.inc_max}%</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Promotion %</span><span className="font-bold text-violet-600">{cfg.promo_pct}%</span></div>
                        {gradeEmps.length > 0 && <div className="flex justify-between"><span className="text-slate-500">Total Inc</span><span className="font-bold text-emerald-600">{fmtCr(gradeEmps.reduce((s:number,e:any)=>s+e.increment_amount,0))}</span></div>}
                      </div>
                      <Bar value={gradeEmps.length} max={emps.length||1} gradient={cfg.gradient}/>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              {/* Score Formula */}
              <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md"><Zap className="w-4 h-4 text-white"/></div>
                  <h3 className="font-black text-slate-800">Performance Score Formula</h3>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-indigo-100 text-center">
                  <p className="text-slate-500 text-sm mb-3 font-semibold">Final Score =</p>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    {[
                      { l: 'Manager Score × 35%', g: 'from-blue-400 to-indigo-500' },
                      { l: 'HOD Score × 35%',     g: 'from-violet-400 to-purple-500' },
                      { l: 'Mgmt Score × 30%',    g: 'from-pink-400 to-rose-500' },
                    ].map((s,i) => (
                      <div key={i} className="flex items-center gap-3">
                        {i > 0 && <span className="text-slate-400 font-black text-2xl">+</span>}
                        <div className={`bg-gradient-to-r ${s.g} text-white rounded-2xl px-5 py-3 text-sm font-black shadow-lg`}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTC Formula */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md"><DollarSign className="w-4 h-4 text-white"/></div>
                  <h3 className="font-black text-slate-800">New CTC Calculation Formula</h3>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-emerald-100 text-center space-y-3">
                  <div>
                    <p className="text-slate-500 text-sm mb-3 font-semibold">Revised CTC =</p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <div className="bg-gradient-to-r from-slate-400 to-slate-600 text-white rounded-2xl px-5 py-3 text-sm font-black shadow-lg">Current CTC</div>
                      <span className="text-slate-400 font-black text-2xl">×</span>
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-slate-600 font-semibold">(1 +</span>
                          <div className="bg-gradient-to-r from-sky-400 to-blue-500 text-white rounded-xl px-3 py-2 text-xs font-black shadow-lg">Inc%</div>
                          <span className="text-slate-600 font-semibold">+</span>
                          <div className="bg-gradient-to-r from-violet-400 to-purple-500 text-white rounded-xl px-3 py-2 text-xs font-black shadow-lg">Promo%</div>
                          <span className="text-slate-600 font-semibold">+</span>
                          <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl px-3 py-2 text-xs font-black shadow-lg">Mgmt%</div>
                          <span className="text-slate-600 font-semibold">)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 pt-2 border-t border-emerald-100">
                    <p><strong>Inc%:</strong> Increment based on grade (4%–15%)</p>
                    <p><strong>Promo%:</strong> Additional % if promoted (varies by grade)</p>
                    <p><strong>Mgmt%:</strong> Management discretion added directly (%)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md"><AlertCircle className="w-4 h-4 text-white"/></div>
                <h3 className="font-black text-slate-800">Policy Notes</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  'Salary/Market Correction as per Management Discretion if employee falls in A+, A, B+, B grade only.',
                  'Upto 10% of total employees can be promoted. Promotion to next Cadre is subject to Role Change.',
                  'No Salary correction to be provided in case promotion is given to any employee.',
                  'All cases of Redesignation shall be without promotional %age benefit.',
                ].map((note,i) => (
                  <div key={i} className="flex gap-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4">
                    <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-white font-black text-[10px]">{i+1}</span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
