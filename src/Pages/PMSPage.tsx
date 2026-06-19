import { useState, useEffect, useRef } from 'react';
import {
  Upload, Download, Plus, TrendingUp, Users, DollarSign,
  Award, ChevronDown, ChevronUp, Search, X,
  BarChart3, PieChart, Zap, Star, ArrowUpRight, FileSpreadsheet,
  AlertCircle, CheckCircle, Crown, Sparkles, Flame, Target,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PMS_API = `${API_BASE}/api/pms`;

const GRADES: Record<string, {
  label: string; color: string; gradient: string; glow: string; text: string; light: string;
  inc_min: number; inc_max: number; promo_pct: number; scoreRange: string;
}> = {
  'A+': { label: 'Exceptional',       color: '#059669', gradient: 'from-emerald-400 to-teal-500',     glow: 'shadow-emerald-200', text: 'text-emerald-600', light: 'bg-emerald-50 border-emerald-200', inc_min: 12, inc_max: 15, promo_pct: 10, scoreRange: '≥106%' },
  'A':  { label: 'Outstanding',       color: '#0284c7', gradient: 'from-sky-400 to-blue-600',         glow: 'shadow-sky-200',     text: 'text-sky-600',     light: 'bg-sky-50 border-sky-200',         inc_min: 10, inc_max: 12, promo_pct: 8,  scoreRange: '95–100%' },
  'B+': { label: 'Exceeds Target',    color: '#7c3aed', gradient: 'from-violet-400 to-purple-600',    glow: 'shadow-violet-200',  text: 'text-violet-600',  light: 'bg-violet-50 border-violet-200',   inc_min: 7,  inc_max: 10, promo_pct: 6,  scoreRange: '85–94%' },
  'B':  { label: 'Meets Target',      color: '#d97706', gradient: 'from-amber-400 to-orange-500',     glow: 'shadow-amber-200',   text: 'text-amber-600',   light: 'bg-amber-50 border-amber-200',     inc_min: 4,  inc_max: 7,  promo_pct: 4,  scoreRange: '65–84%' },
  'C':  { label: 'Near Target',       color: '#ea580c', gradient: 'from-orange-400 to-red-500',       glow: 'shadow-orange-200',  text: 'text-orange-600',  light: 'bg-orange-50 border-orange-200',   inc_min: 0,  inc_max: 4,  promo_pct: 0,  scoreRange: '51–64%' },
  'D':  { label: 'Needs Improvement', color: '#dc2626', gradient: 'from-rose-500 to-red-700',         glow: 'shadow-rose-200',    text: 'text-rose-600',    light: 'bg-rose-50 border-rose-200',       inc_min: 2,  inc_max: 2,  promo_pct: 0,  scoreRange: '<50%' },
};
const GRADE_ORDER = ['A+', 'A', 'B+', 'B', 'C', 'D'];

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
const fmtCr = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${fmt(n)}`;
};

function GradePill({ grade, size = 'md' }: { grade: string; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = GRADES[grade];
  if (!cfg) return null;
  const s = { sm: 'px-2 py-0.5 text-[10px]', md: 'px-3 py-1 text-xs', lg: 'px-4 py-1.5 text-sm' }[size];
  return (
    <span className={`inline-flex items-center font-black rounded-full text-white bg-gradient-to-r ${cfg.gradient} shadow-md ${cfg.glow} ${s}`}>
      {grade}
    </span>
  );
}

function MiniBar({ value, max, gradient }: { value: number; max: number; gradient: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function DonutChart({ data, total }: { data: Record<string, number>; total: number }) {
  if (!total) return (
    <div className="flex flex-col items-center py-10 text-slate-300">
      <PieChart className="w-10 h-10 mb-2" />
      <p className="text-sm font-medium">Import data to see distribution</p>
    </div>
  );
  let cumulative = 0;
  const segments = GRADE_ORDER.filter(g => data[g] > 0).map(g => {
    const pct = (data[g] / total) * 100;
    const s = (cumulative / 100) * 360, e = ((cumulative + pct) / 100) * 360;
    cumulative += pct;
    return { grade: g, pct, s, e, color: GRADES[g]?.color, count: data[g] };
  });
  const polar = (cx: number, cy: number, r: number, a: number) => {
    const rad = (a - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arc = (cx: number, cy: number, r: number, s: number, e: number) => {
    const sp = polar(cx, cy, r, s), ep = polar(cx, cy, r, e);
    return `M ${cx} ${cy} L ${sp.x} ${sp.y} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${ep.x} ${ep.y} Z`;
  };
  return (
    <div className="flex items-center gap-6">
      <svg width="150" height="150" viewBox="0 0 150 150">
        {segments.map((seg, i) => (
          <path key={i} d={arc(75, 75, 62, seg.s, seg.e - 0.8)} fill={seg.color} opacity="0.9">
            <title>{seg.grade}: {seg.count} ({seg.pct.toFixed(1)}%)</title>
          </path>
        ))}
        <circle cx="75" cy="75" r="40" fill="white" />
        <text x="75" y="70" textAnchor="middle" fontSize="22" fontWeight="900" fill="#1e293b">{total}</text>
        <text x="75" y="86" textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="700" letterSpacing="1.5">TOTAL EMP</text>
      </svg>
      <div className="space-y-2 flex-1">
        {segments.map(seg => {
          const cfg = GRADES[seg.grade];
          return (
            <div key={seg.grade} className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black bg-gradient-to-br ${cfg?.gradient} shadow-sm shrink-0`}>
                {seg.grade}
              </span>
              <div className="flex-1"><MiniBar value={seg.count} max={total} gradient={cfg?.gradient || ''} /></div>
              <span className="text-xs font-black text-slate-500 w-5 text-right">{seg.count}</span>
              <span className="text-[10px] text-slate-300 w-9 text-right">{seg.pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const grade = score >= 106 ? 'A+' : score >= 95 ? 'A' : score >= 85 ? 'B+' : score >= 65 ? 'B' : score >= 51 ? 'C' : 'D';
  const color = GRADES[grade]?.color || '#94a3b8';
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(score, 100) / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}60)` }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[11px] font-black leading-none" style={{ color }}>{score.toFixed(0)}</span>
        <span className="text-[8px] text-slate-300 font-semibold">/ 100</span>
      </div>
    </div>
  );
}

function IncrementSlider({ emp, onUpdate }: { emp: any; onUpdate: (id: number, data: any) => void }) {
  const cfg = GRADES[emp.effective_grade];
  const [val, setVal] = useState<number>(emp.effective_increment_pct);
  const min = cfg?.inc_min ?? 0, max = cfg?.inc_max ?? 15;
  const pct = max > min ? ((val - min) / (max - min)) * 100 : 100;
  const handleChange = async (v: number) => { setVal(v); await onUpdate(emp.id, { override_increment_pct: v }); };
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-slate-400 font-semibold">{min}%</span>
        <span className={`text-base font-black bg-gradient-to-r ${cfg?.gradient} bg-clip-text text-transparent`}>{val.toFixed(1)}%</span>
        <span className="text-[10px] text-slate-400 font-semibold">{max}%</span>
      </div>
      <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden">
        <div className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${cfg?.gradient} shadow-sm transition-all duration-100`}
          style={{ width: `${pct}%` }} />
        <input type="range" min={min} max={max} step={0.5} value={val}
          onChange={e => handleChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, gradient, glow }: any) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${gradient} shadow-xl ${glow} text-white`}>
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
      <div className="absolute right-4 -bottom-8 w-24 h-24 rounded-full bg-white/5" />
      <div className="relative">
        <div className="flex justify-between items-start mb-3">
          <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest">{label}</p>
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Icon className="w-4.5 h-4.5 text-white" />
          </div>
        </div>
        <p className="text-3xl font-black tracking-tight">{value}</p>
        <p className="text-white/60 text-xs mt-1.5 font-medium">{sub}</p>
      </div>
    </div>
  );
}

export default function PMSPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'simulator' | 'charts' | 'grade-guide'>('simulator');
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [showNewSession, setShowNewSession] = useState(false);
  const [expandedEmp, setExpandedEmp] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadSession = async (id: number) => {
    setLoading(true);
    const res = await fetch(`${PMS_API}/sessions/${id}/`);
    const data = await res.json();
    setActiveSession(data);
    setLoading(false);
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${PMS_API}/sessions/`);
      const data = await res.json();
      setSessions(data);
      if (data.length > 0 && !activeSession) loadSession(data[0].id);
    } catch {}
  };

  useEffect(() => { fetchSessions(); }, []);

  const createSession = async () => {
    if (!newSessionName.trim()) return;
    const res = await fetch(`${PMS_API}/sessions/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSessionName, fiscal_year: '2025-26' }),
    });
    const data = await res.json();
    setNewSessionName(''); setShowNewSession(false);
    await fetchSessions();
    loadSession(data.id);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSession) return;
    const fd = new FormData();
    fd.append('file', file);
    setImportMsg(null);
    try {
      const res = await fetch(`${PMS_API}/sessions/${activeSession.id}/import/`, { method: 'POST', body: fd });
      const data = await res.json();
      setImportMsg({ text: data.message || data.error, ok: res.ok });
      if (res.ok) loadSession(activeSession.id);
    } catch {
      setImportMsg({ text: 'Import failed. Check file format and try again.', ok: false });
    }
    e.target.value = '';
  };

  const updateEmployee = async (empId: number, updates: any) => {
    const res = await fetch(`${PMS_API}/employees/${empId}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setActiveSession((prev: any) => ({
        ...prev,
        employees: prev.employees.map((e: any) => e.id === empId ? updated : e),
      }));
      fetch(`${PMS_API}/sessions/${activeSession.id}/`).then(r => r.json()).then(d =>
        setActiveSession((prev: any) => ({ ...prev, summary: d.summary }))
      );
    }
  };

  const employees: any[] = activeSession?.employees || [];
  const summary = activeSession?.summary || {};
  const totalCurrentCTC = summary.total_current_ctc || 0;
  const totalNewCTC = summary.total_new_ctc || 0;
  const totalIncrement = summary.total_increment || 0;
  const incrementPct = summary.increment_pct || 0;

  const filtered = employees.filter(e => {
    const s = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.employee_id.toLowerCase().includes(search.toLowerCase());
    const g = !filterGrade || e.effective_grade === filterGrade;
    const d = !filterDept || e.department === filterDept;
    return s && g && d;
  });

  const departments = [...new Set(employees.map((e: any) => e.department).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50/30">

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-white/60 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-slate-900 font-black text-lg tracking-tight">PMS Simulator</h1>
              <p className="text-slate-400 text-[11px] font-medium">Performance · Salary · Analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4 flex-wrap">
            {sessions.map(s => (
              <button key={s.id} onClick={() => loadSession(s.id)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                  activeSession?.id === s.id
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-600 border-transparent text-white shadow-md shadow-indigo-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                }`}>
                {s.name} <span className={`ml-1 text-[10px] ${activeSession?.id === s.id ? 'text-white/60' : 'text-slate-400'}`}>({s.employee_count})</span>
              </button>
            ))}
            {showNewSession ? (
              <div className="flex items-center gap-2">
                <input value={newSessionName} onChange={e => setNewSessionName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createSession()} placeholder="Session name…" autoFocus
                  className="border-2 border-indigo-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 w-36" />
                <button onClick={createSession} className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-xs font-bold">Create</button>
                <button onClick={() => setShowNewSession(false)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
            ) : (
              <button onClick={() => setShowNewSession(true)}
                className="px-3 py-1.5 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-400 hover:border-indigo-400 hover:text-indigo-600 text-xs font-bold flex items-center gap-1 transition-all hover:bg-indigo-50">
                <Plus className="w-3.5 h-3.5" /> New Session
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <a href={`${PMS_API}/template/`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-white border-2 border-slate-200 hover:border-violet-300 text-slate-600 hover:text-violet-600 rounded-xl text-xs font-bold transition-all">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Template
            </a>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5">
              <Upload className="w-3.5 h-3.5" /> Import Data
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            {activeSession && (
              <a href={`${PMS_API}/sessions/${activeSession.id}/export/`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all hover:-translate-y-0.5">
                <Download className="w-3.5 h-3.5" /> Export
              </a>
            )}
          </div>
        </div>
      </div>

      {importMsg && (
        <div className={`mx-6 mt-3 px-5 py-3 rounded-2xl flex items-center gap-3 text-sm font-semibold border-2 shadow-sm ${importMsg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          {importMsg.ok ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {importMsg.text}
          <button onClick={() => setImportMsg(null)} className="ml-auto opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-6 py-5 space-y-5">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Employees" value={fmt(summary.total_employees || 0)}  sub={`${summary.promoted_count || 0} promoted · ${summary.reward_count || 0} rewarded`} icon={Users}     gradient="from-blue-500 to-indigo-600"   glow="shadow-blue-200" />
          <KpiCard label="Current Payroll" value={fmtCr(totalCurrentCTC)}             sub="Annual CTC before increment"                                                       icon={DollarSign} gradient="from-slate-500 to-slate-700"   glow="shadow-slate-200" />
          <KpiCard label="New Payroll"     value={fmtCr(totalNewCTC)}                 sub={`+${fmtCr(totalIncrement)} additional cost`}                                       icon={TrendingUp} gradient="from-emerald-400 to-teal-600"  glow="shadow-emerald-200" />
          <KpiCard label="Avg Increment"   value={`${incrementPct.toFixed(1)}%`}      sub={`₹${fmt(totalIncrement / Math.max(summary.total_employees || 1, 1))} per employee`} icon={Award}      gradient="from-violet-500 to-purple-700" glow="shadow-violet-200" />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm w-fit">
          {[
            { id: 'simulator',   label: 'Live Simulator', icon: Zap,     grad: 'from-indigo-500 to-violet-600' },
            { id: 'charts',      label: 'Analytics',      icon: PieChart, grad: 'from-pink-500 to-rose-600' },
            { id: 'grade-guide', label: 'Grade Guide',    icon: Star,     grad: 'from-amber-400 to-orange-500' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t.id ? `bg-gradient-to-r ${t.grad} text-white shadow-md` : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* ── SIMULATOR ── */}
        {tab === 'simulator' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap bg-white rounded-2xl px-4 py-3 border border-slate-200 shadow-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…"
                  className="border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-400 w-52 bg-slate-50" />
              </div>
              <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 focus:outline-none focus:border-indigo-400 bg-slate-50">
                <option value="">All Grades</option>
                {GRADE_ORDER.map(g => <option key={g} value={g}>Grade {g} — {GRADES[g]?.label}</option>)}
              </select>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 focus:outline-none focus:border-indigo-400 bg-slate-50">
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {(search || filterGrade || filterDept) && (
                <button onClick={() => { setSearch(''); setFilterGrade(''); setFilterDept(''); }}
                  className="flex items-center gap-1 px-3 py-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all">
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
              <span className="ml-auto text-slate-400 text-xs">{filtered.length} of {employees.length} employees</span>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-20 flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
                <p className="text-slate-400 font-medium">Loading simulation…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-indigo-200 p-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
                  <Sparkles className="w-10 h-10 text-indigo-400" />
                </div>
                <p className="text-slate-800 font-black text-2xl">Ready to Simulate!</p>
                <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed">Download the template, fill in employee data with scores, and import to start your live salary simulation.</p>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <a href={`${PMS_API}/template/`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-indigo-300 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all">
                    <Download className="w-4 h-4" /> Download Template
                  </a>
                  <button onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200">
                    <Upload className="w-4 h-4" /> Import Data
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filtered.map(emp => {
                  const isExpanded = expandedEmp === emp.id;
                  const cfg = GRADES[emp.effective_grade];
                  return (
                    <div key={emp.id} className={`bg-white rounded-2xl border-2 shadow-sm hover:shadow-lg transition-all overflow-hidden ${isExpanded ? 'border-indigo-200 shadow-indigo-50' : 'border-slate-100 hover:border-indigo-200'}`}>
                      <div className="grid grid-cols-12 gap-3 px-4 py-3.5 items-center cursor-pointer"
                        onClick={() => setExpandedEmp(isExpanded ? null : emp.id)}>

                        <div className="col-span-3 flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${cfg?.gradient} flex items-center justify-center text-white font-black text-lg shadow-lg ${cfg?.glow} shrink-0`}>
                            {emp.name[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-slate-800 font-bold text-sm truncate">{emp.name}</p>
                            <p className="text-slate-400 text-xs truncate">{emp.designation}</p>
                            <p className="text-slate-300 text-[10px]">#{emp.employee_id} · {emp.department}</p>
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center gap-3">
                          <ScoreRing score={emp.final_score} size={50} />
                          <div className="space-y-0.5 text-[10px] text-slate-400">
                            <div>Mgr: <span className="font-black text-slate-600">{emp.manager_score ?? '—'}</span></div>
                            <div>HOD: <span className="font-black text-slate-600">{emp.hod_score ?? '—'}</span></div>
                            <div>Mgt: <span className="font-black text-slate-600">{emp.management_score ?? '—'}</span></div>
                          </div>
                        </div>

                        <div className="col-span-1 flex flex-col items-center gap-1">
                          <GradePill grade={emp.effective_grade} size="lg" />
                          <span className="text-[9px] text-slate-400 text-center">{cfg?.label}</span>
                        </div>

                        <div className="col-span-2" onClick={e => e.stopPropagation()}>
                          <IncrementSlider emp={emp} onUpdate={updateEmployee} />
                        </div>

                        <div className="col-span-3">
                          <div className={`rounded-2xl p-3 border-2 ${cfg?.light}`}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-400">Current CTC</span>
                              <span className="text-slate-600 font-bold">₹{fmt(emp.current_ctc)}</span>
                            </div>
                            <div className="flex justify-between text-xs mb-2">
                              <span className="text-slate-400">Increment</span>
                              <span className="font-bold text-emerald-500">+₹{fmt(emp.increment_amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="font-bold text-slate-700">New CTC</span>
                              <span className={`font-black bg-gradient-to-r ${cfg?.gradient} bg-clip-text text-transparent`}>₹{fmt(emp.new_ctc)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="col-span-1 flex flex-col items-end gap-1.5">
                          {emp.promoted && <span className="w-7 h-7 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-200" title="Promoted"><Crown className="w-3.5 h-3.5 text-white" /></span>}
                          {emp.on_time_reward && <span className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-amber-200" title="On-Time Reward"><Star className="w-3.5 h-3.5 text-white" /></span>}
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center mt-auto ${isExpanded ? 'bg-indigo-100 text-indigo-500' : 'bg-slate-100 text-slate-400'}`}>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className={`border-t-2 ${cfg?.light} bg-gradient-to-br from-slate-50 to-white p-5 grid grid-cols-3 gap-5`}>
                          <div className="space-y-3">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-indigo-400" /> Score Breakdown</p>
                            {[
                              { label: 'Manager Score', value: emp.manager_score,    weight: 35, gradient: 'from-blue-400 to-indigo-500' },
                              { label: 'HOD Score',     value: emp.hod_score,        weight: 35, gradient: 'from-violet-400 to-purple-500' },
                              { label: 'Mgmt Score',    value: emp.management_score, weight: 30, gradient: 'from-pink-400 to-rose-500' },
                            ].map(s => (
                              <div key={s.label}>
                                <div className="flex justify-between text-xs mb-1.5">
                                  <span className="text-slate-500">{s.label} <span className="text-slate-300">({s.weight}%)</span></span>
                                  <span className={`font-black bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent`}>{s.value ?? '—'}/100</span>
                                </div>
                                <MiniBar value={s.value ?? 0} max={100} gradient={s.gradient} />
                              </div>
                            ))}
                            <div className={`pt-2 border-t-2 ${cfg?.light} flex justify-between`}>
                              <span className="font-bold text-slate-700 text-sm">Final Score</span>
                              <span className={`font-black text-lg bg-gradient-to-r ${cfg?.gradient} bg-clip-text text-transparent`}>{emp.final_score}</span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-400" /> Override Controls</p>
                            <div>
                              <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Override Grade</label>
                              <select value={emp.override_grade || ''} onChange={e => updateEmployee(emp.id, { override_grade: e.target.value })}
                                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400 font-semibold">
                                <option value="">Auto — Grade {emp.auto_grade}</option>
                                {GRADE_ORDER.map(g => <option key={g} value={g}>Grade {g} — {GRADES[g]?.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Management Score Override</label>
                              <input type="number" min="0" max="100" defaultValue={emp.management_score ?? ''}
                                onBlur={e => updateEmployee(emp.id, { management_score: e.target.value || null })}
                                placeholder="0–100"
                                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400" />
                            </div>
                            <div className="flex gap-3">
                              {[
                                { key: 'promoted', label: 'Promoted', val: emp.promoted, grad: 'from-violet-500 to-purple-600', icon: Crown },
                                { key: 'on_time_reward', label: 'Reward', val: emp.on_time_reward, grad: 'from-amber-400 to-orange-500', icon: Star },
                              ].map(t => (
                                <button key={t.key} onClick={() => updateEmployee(emp.id, { [t.key]: !t.val })}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${t.val ? `bg-gradient-to-r ${t.grad} text-white border-transparent shadow-md` : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Remarks</p>
                            {emp.manager_remarks && (
                              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                                <p className="text-[10px] text-blue-400 font-black uppercase mb-1">Manager</p>
                                <p className="text-slate-600 text-xs leading-relaxed">{emp.manager_remarks}</p>
                              </div>
                            )}
                            {emp.hod_remarks && (
                              <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                                <p className="text-[10px] text-violet-400 font-black uppercase mb-1">HOD</p>
                                <p className="text-slate-600 text-xs leading-relaxed">{emp.hod_remarks}</p>
                              </div>
                            )}
                            <textarea placeholder="Add notes…" defaultValue={emp.notes}
                              onBlur={e => updateEmployee(emp.id, { notes: e.target.value })} rows={2}
                              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400 resize-none placeholder-slate-300" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab === 'charts' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200"><PieChart className="w-4 h-4 text-white" /></div>
                <h3 className="text-slate-800 font-black">Grade Distribution</h3>
              </div>
              <DonutChart data={summary.grade_distribution || {}} total={summary.total_employees || 0} />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-200"><BarChart3 className="w-4 h-4 text-white" /></div>
                <h3 className="text-slate-800 font-black">Department Payroll Impact</h3>
              </div>
              <div className="space-y-3">
                {(summary.department_breakdown || []).map((dept: any, i: number) => {
                  const maxVal = Math.max(...(summary.department_breakdown || [{ new_ctc: 1 }]).map((d: any) => d.new_ctc));
                  return (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[140px]">{dept.department}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400">{fmtCr(dept.current_ctc)}</span>
                          <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600 font-bold">{fmtCr(dept.new_ctc)}</span>
                        </div>
                      </div>
                      <div className="relative h-5 bg-slate-100 rounded-xl overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-slate-200 rounded-xl" style={{ width: `${(dept.current_ctc / maxVal) * 100}%` }} />
                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl opacity-90 transition-all duration-700" style={{ width: `${(dept.new_ctc / maxVal) * 100}%` }} />
                        <span className="absolute right-2 inset-y-0 flex items-center text-[10px] font-black text-white">{dept.count} emp</span>
                      </div>
                    </div>
                  );
                })}
                {!summary.department_breakdown?.length && <p className="text-slate-300 text-sm text-center py-8">No data yet</p>}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center shadow-md shadow-violet-200"><TrendingUp className="w-4 h-4 text-white" /></div>
                <h3 className="text-slate-800 font-black">Grade-wise Increment Cost</h3>
              </div>
              <div className="space-y-3">
                {GRADE_ORDER.map(grade => {
                  const gradeEmps = employees.filter(e => e.effective_grade === grade);
                  if (!gradeEmps.length) return null;
                  const totalInc = gradeEmps.reduce((s: number, e: any) => s + e.increment_amount, 0);
                  const cfg = GRADES[grade];
                  return (
                    <div key={grade} className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white font-black text-sm shadow-md ${cfg.glow} shrink-0`}>{grade}</div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-500">{cfg.label} <span className="text-slate-300">({gradeEmps.length})</span></span>
                          <span className="text-slate-800 font-black">{fmtCr(totalInc)}</span>
                        </div>
                        <MiniBar value={totalInc} max={totalIncrement || 1} gradient={cfg.gradient} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-amber-200"><DollarSign className="w-4 h-4 text-white" /></div>
                <h3 className="text-slate-800 font-black">Payroll Summary</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { l: 'Employees', v: summary.total_employees || 0, g: 'from-blue-500 to-indigo-600',    gl: 'shadow-blue-200' },
                  { l: 'Promoted',  v: summary.promoted_count || 0,  g: 'from-violet-500 to-purple-700',  gl: 'shadow-violet-200' },
                  { l: 'Rewarded',  v: summary.reward_count || 0,    g: 'from-amber-400 to-orange-600',   gl: 'shadow-amber-200' },
                ].map(s => (
                  <div key={s.l} className={`bg-gradient-to-br ${s.g} rounded-2xl p-4 text-center text-white shadow-lg ${s.gl}`}>
                    <p className="text-3xl font-black">{s.v}</p>
                    <p className="text-white/70 text-xs font-bold mt-1">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-100 rounded-2xl p-4 space-y-2.5">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Before Increment</span><span className="text-slate-700 font-bold">{fmtCr(totalCurrentCTC)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">After Increment</span><span className="text-emerald-600 font-black text-base">{fmtCr(totalNewCTC)}</span></div>
                <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full opacity-30" />
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Additional Cost</span>
                  <span className="font-black text-emerald-600 flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5" />{fmtCr(totalIncrement)} ({incrementPct.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── GRADE GUIDE ── */}
        {tab === 'grade-guide' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {GRADE_ORDER.map(grade => {
                const cfg = GRADES[grade];
                const gradeEmps = employees.filter(e => e.effective_grade === grade);
                return (
                  <div key={grade} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className={`bg-gradient-to-r ${cfg.gradient} p-5`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Grade</span>
                          <p className="text-white font-black text-5xl mt-0.5">{grade}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-black text-4xl">{gradeEmps.length}</p>
                          <p className="text-white/60 text-xs font-semibold">employees</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <p className={`font-black text-base ${cfg.text}`}>{cfg.label}</p>
                      <p className="text-slate-400 text-xs">Score Range: <span className={`font-black ${cfg.text}`}>{cfg.scoreRange}</span></p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Increment</span><span className={`font-black ${cfg.text}`}>{cfg.inc_min}–{cfg.inc_max}%</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Promotion</span><span className="font-bold text-violet-600">{cfg.promo_pct}%</span></div>
                        {gradeEmps.length > 0 && <div className="flex justify-between"><span className="text-slate-500">Total Increment</span><span className="font-bold text-emerald-600">{fmtCr(gradeEmps.reduce((s: number, e: any) => s + e.increment_amount, 0))}</span></div>}
                      </div>
                      <MiniBar value={gradeEmps.length} max={employees.length || 1} gradient={cfg.gradient} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md"><Zap className="w-4 h-4 text-white" /></div>
                <h3 className="text-slate-800 font-black">Score Calculation Formula</h3>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-indigo-100 text-center">
                <p className="text-slate-500 text-sm mb-3 font-medium">Final Score =</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {[
                    { label: 'Manager Score', weight: '35%', gradient: 'from-blue-400 to-indigo-500' },
                    { label: 'HOD Score',     weight: '35%', gradient: 'from-violet-400 to-purple-500' },
                    { label: 'Mgmt Score',    weight: '30%', gradient: 'from-pink-400 to-rose-500' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {i > 0 && <span className="text-slate-400 font-black text-2xl">+</span>}
                      <div className={`bg-gradient-to-r ${s.gradient} text-white rounded-2xl px-5 py-3 text-sm font-black shadow-lg`}>
                        {s.label} × {s.weight}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-amber-200"><AlertCircle className="w-4 h-4 text-white" /></div>
                <h3 className="text-slate-800 font-black">Policy Notes</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  'Salary/Market Correction as per Management Discretion if employee falls in A+, A, B+, B grade only.',
                  'Upto 10% of total employees can be promoted. Promotion to next Cadre is subject to Role Change.',
                  'No Salary correction to be provided in case promotion is given to any employee.',
                  'All cases of Redesignation shall be without promotional %age benefit.',
                ].map((note, i) => (
                  <div key={i} className="flex gap-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4">
                    <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-white font-black text-[10px]">{i + 1}</span>
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
