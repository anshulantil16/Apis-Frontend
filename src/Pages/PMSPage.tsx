import { useState, useEffect, useRef } from 'react';
import {
  Upload, Download, Plus, TrendingUp, Users, DollarSign,
  Award, ChevronDown, ChevronUp, Search, X,
  BarChart3, PieChart, Zap, Star, ArrowUpRight, FileSpreadsheet,
  AlertCircle, CheckCircle, Crown,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PMS_API = `${API_BASE}/api/pms`;

const GRADES: Record<string, { label: string; color: string; light: string; inc_min: number; inc_max: number; promo_pct: number; scoreRange: string }> = {
  'A+': { label: 'Exceptional',       color: '#16a34a', light: '#dcfce7', inc_min: 12, inc_max: 15, promo_pct: 10, scoreRange: '≥106%' },
  'A':  { label: 'Outstanding',       color: '#15803d', light: '#bbf7d0', inc_min: 10, inc_max: 12, promo_pct: 8,  scoreRange: '95–100%' },
  'B+': { label: 'Exceeds Target',    color: '#ca8a04', light: '#fef9c3', inc_min: 7,  inc_max: 10, promo_pct: 6,  scoreRange: '85–94%' },
  'B':  { label: 'Meets Target',      color: '#ea580c', light: '#ffedd5', inc_min: 4,  inc_max: 7,  promo_pct: 4,  scoreRange: '65–84%' },
  'C':  { label: 'Near Target',       color: '#dc2626', light: '#fee2e2', inc_min: 0,  inc_max: 4,  promo_pct: 0,  scoreRange: '51–64%' },
  'D':  { label: 'Needs Improvement', color: '#7f1d1d', light: '#fecaca', inc_min: 2,  inc_max: 2,  promo_pct: 0,  scoreRange: '<50%' },
};
const GRADE_ORDER = ['A+', 'A', 'B+', 'B', 'C', 'D'];

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
const fmtCr = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${fmt(n)}`;
};

function GradeBadge({ grade, size = 'md' }: { grade: string; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = GRADES[grade];
  if (!cfg) return null;
  const sizes = { sm: 'px-2 py-0.5 text-[10px]', md: 'px-2.5 py-0.5 text-xs', lg: 'px-3 py-1 text-sm' };
  return (
    <span className={`inline-flex items-center font-black rounded-full border ${sizes[size]}`}
      style={{ background: cfg.light, borderColor: cfg.color + '60', color: cfg.color }}>
      {grade}
    </span>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function DonutChart({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <div className="text-slate-400 text-sm text-center py-8">No data yet</div>;
  let cumulative = 0;
  const segments = GRADE_ORDER.filter(g => data[g] > 0).map(g => {
    const pct = (data[g] / total) * 100;
    const startAngle = (cumulative / 100) * 360;
    const endAngle = ((cumulative + pct) / 100) * 360;
    cumulative += pct;
    return { grade: g, pct, startAngle, endAngle, color: GRADES[g]?.color, count: data[g] };
  });
  const polar = (cx: number, cy: number, r: number, angle: number) => {
    const rad = (angle - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arc = (cx: number, cy: number, r: number, s: number, e: number) => {
    const sp = polar(cx, cy, r, s);
    const ep = polar(cx, cy, r, e);
    return `M ${cx} ${cy} L ${sp.x} ${sp.y} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${ep.x} ${ep.y} Z`;
  };
  return (
    <div className="flex items-center gap-5">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r="52" fill="white" stroke="#f1f5f9" strokeWidth="1" />
        {segments.map((seg, i) => (
          <path key={i} d={arc(65, 65, 52, seg.startAngle, seg.endAngle - 0.5)}
            fill={seg.color} opacity="0.85">
            <title>{seg.grade}: {seg.count} ({seg.pct.toFixed(1)}%)</title>
          </path>
        ))}
        <circle cx="65" cy="65" r="32" fill="white" />
        <text x="65" y="62" textAnchor="middle" fontSize="20" fontWeight="900" fill="#0f172a">{total}</text>
        <text x="65" y="76" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="700" letterSpacing="1">EMP</text>
      </svg>
      <div className="space-y-2 flex-1">
        {segments.map(seg => (
          <div key={seg.grade} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-xs font-bold text-slate-600 w-5">{seg.grade}</span>
            <div className="flex-1"><MiniBar value={seg.count} max={total} color={seg.color} /></div>
            <span className="text-xs font-bold text-slate-500 w-5 text-right">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PayrollBars({ departments }: { departments: any[] }) {
  if (!departments?.length) return <div className="text-slate-400 text-sm text-center py-8">No data yet</div>;
  const maxVal = Math.max(...departments.map(d => d.new_ctc));
  return (
    <div className="space-y-3">
      {departments.map((dept, i) => (
        <div key={i}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-slate-700 truncate max-w-[130px]">{dept.department}</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">{fmtCr(dept.current_ctc)}</span>
              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-600 font-bold">{fmtCr(dept.new_ctc)}</span>
            </div>
          </div>
          <div className="relative h-5 bg-slate-100 rounded-lg overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-slate-200 rounded-lg transition-all"
              style={{ width: `${(dept.current_ctc / maxVal) * 100}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-emerald-400 to-teal-500 opacity-80 transition-all"
              style={{ width: `${(dept.new_ctc / maxVal) * 100}%` }} />
            <span className="absolute right-2 inset-y-0 flex items-center text-[10px] font-black text-white">
              {dept.count} emp
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const grade = score >= 106 ? 'A+' : score >= 95 ? 'A' : score >= 85 ? 'B+' : score >= 65 ? 'B' : score >= 51 ? 'C' : 'D';
  const color = GRADES[grade]?.color || '#94a3b8';
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(score, 100) / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[10px] font-black" style={{ color }}>{score.toFixed(0)}</span>
    </div>
  );
}

function IncrementSlider({ emp, onUpdate }: { emp: any; onUpdate: (id: number, data: any) => void }) {
  const cfg = GRADES[emp.effective_grade];
  const [val, setVal] = useState<number>(emp.effective_increment_pct);
  const min = cfg?.inc_min ?? 0;
  const max = cfg?.inc_max ?? 15;

  const handleChange = async (newVal: number) => {
    setVal(newVal);
    await onUpdate(emp.id, { override_increment_pct: newVal });
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-slate-400">{min}%</span>
        <span className="text-sm font-black" style={{ color: cfg?.color }}>{val.toFixed(1)}%</span>
        <span className="text-[10px] text-slate-400">{max}%</span>
      </div>
      <input type="range" min={min} max={max} step={0.5} value={val}
        onChange={e => handleChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-600"
        style={{
          background: `linear-gradient(to right, ${cfg?.color} 0%, ${cfg?.color} ${((val - min) / (max - min)) * 100}%, #e2e8f0 ${((val - min) / (max - min)) * 100}%, #e2e8f0 100%)`
        }}
      />
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

  const fetchSessions = async () => {
    const res = await fetch(`${PMS_API}/sessions/`);
    const data = await res.json();
    setSessions(data);
    if (data.length > 0 && !activeSession) loadSession(data[0].id);
  };

  const loadSession = async (id: number) => {
    setLoading(true);
    const res = await fetch(`${PMS_API}/sessions/${id}/`);
    const data = await res.json();
    setActiveSession(data);
    setLoading(false);
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
    const res = await fetch(`${PMS_API}/sessions/${activeSession.id}/import/`, { method: 'POST', body: fd });
    const data = await res.json();
    setImportMsg({ text: data.message || data.error, ok: res.ok });
    if (res.ok) loadSession(activeSession.id);
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
      loadSession(activeSession.id);
    }
  };

  const employees: any[] = activeSession?.employees || [];
  const summary = activeSession?.summary || {};
  const totalCurrentCTC = summary.total_current_ctc || 0;
  const totalNewCTC = summary.total_new_ctc || 0;
  const totalIncrement = summary.total_increment || 0;
  const incrementPct = summary.increment_pct || 0;

  const filtered = employees.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.employee_id.toLowerCase().includes(search.toLowerCase());
    const matchGrade = !filterGrade || e.effective_grade === filterGrade;
    const matchDept = !filterDept || e.department === filterDept;
    return matchSearch && matchGrade && matchDept;
  });

  const departments = [...new Set(employees.map((e: any) => e.department).filter(Boolean))];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-slate-900 font-black text-lg">PMS Simulator</h1>
              <p className="text-slate-400 text-xs">Performance Management & Salary Simulation</p>
            </div>
          </div>

          {/* Sessions */}
          <div className="flex items-center gap-2 ml-4 flex-wrap">
            {sessions.map(s => (
              <button key={s.id} onClick={() => loadSession(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  activeSession?.id === s.id
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                }`}>
                {s.name} <span className="opacity-50">({s.employee_count})</span>
              </button>
            ))}
            {showNewSession ? (
              <div className="flex items-center gap-2">
                <input value={newSessionName} onChange={e => setNewSessionName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createSession()}
                  placeholder="Session name…"
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400 w-36" />
                <button onClick={createSession} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">Create</button>
                <button onClick={() => setShowNewSession(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => setShowNewSession(true)}
                className="px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-slate-400 hover:border-indigo-400 hover:text-indigo-500 text-xs font-bold flex items-center gap-1 transition-all">
                <Plus className="w-3 h-3" /> New
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <a href={`${PMS_API}/template/`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-bold transition-all">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Template
            </a>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-200 transition-all">
              <Upload className="w-3.5 h-3.5" /> Import Data
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            {activeSession && (
              <a href={`${PMS_API}/sessions/${activeSession.id}/export/`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-emerald-200 transition-all">
                <Download className="w-3.5 h-3.5" /> Export
              </a>
            )}
          </div>
        </div>
      </div>

      {importMsg && (
        <div className={`mx-6 mt-3 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold border ${importMsg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          {importMsg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {importMsg.text}
          <button onClick={() => setImportMsg(null)} className="ml-auto opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-6 py-5 space-y-5">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Employees', value: fmt(summary.total_employees || 0), sub: `${summary.promoted_count || 0} promoted · ${summary.reward_count || 0} rewarded`, icon: Users, color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
            { label: 'Current Payroll', value: fmtCr(totalCurrentCTC), sub: 'Annual total CTC', icon: DollarSign, color: 'bg-slate-500', bg: 'bg-slate-50', text: 'text-slate-600' },
            { label: 'New Payroll', value: fmtCr(totalNewCTC), sub: `+${fmtCr(totalIncrement)} total increment`, icon: TrendingUp, color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
            { label: 'Avg Increment', value: `${incrementPct.toFixed(2)}%`, sub: `₹${fmt(totalIncrement / Math.max(summary.total_employees || 1, 1))} per employee`, icon: Award, color: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-600' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                <div className={`w-8 h-8 ${kpi.bg} rounded-lg flex items-center justify-center`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.text}`} />
                </div>
              </div>
              <p className="text-slate-900 font-black text-2xl">{kpi.value}</p>
              <p className="text-slate-400 text-xs mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
          {[
            { id: 'simulator', label: 'Simulator', icon: Zap },
            { id: 'charts',    label: 'Analytics', icon: PieChart },
            { id: 'grade-guide', label: 'Grade Guide', icon: Star },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                tab === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* ── Simulator Tab ── */}
        {tab === 'simulator' && (
          <div className="space-y-3">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…"
                  className="border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-400 w-52 bg-white" />
              </div>
              <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:border-indigo-400 bg-white">
                <option value="">All Grades</option>
                {GRADE_ORDER.map(g => <option key={g} value={g}>Grade {g} — {GRADES[g]?.label}</option>)}
              </select>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:border-indigo-400 bg-white">
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {(search || filterGrade || filterDept) && (
                <button onClick={() => { setSearch(''); setFilterGrade(''); setFilterDept(''); }}
                  className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-xs font-bold">
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
              <span className="text-slate-400 text-xs ml-auto">{filtered.length} of {employees.length} employees</span>
            </div>

            {/* Table Header */}
            {filtered.length > 0 && (
              <div className="bg-slate-100 rounded-xl px-4 py-2 grid grid-cols-12 gap-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <div className="col-span-3">Employee</div>
                <div className="col-span-2">Scores</div>
                <div className="col-span-1 text-center">Grade</div>
                <div className="col-span-2">Increment %</div>
                <div className="col-span-3">CTC Impact</div>
                <div className="col-span-1 text-right">Flags</div>
              </div>
            )}

            {loading ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Loading simulation data…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-700 font-bold text-lg">No employees yet</p>
                <p className="text-slate-400 text-sm mt-1">Download the template, fill data, and import</p>
                <a href={`${PMS_API}/template/`} target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold">
                  <Download className="w-4 h-4" /> Download Template
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(emp => {
                  const isExpanded = expandedEmp === emp.id;
                  const cfg = GRADES[emp.effective_grade];
                  return (
                    <div key={emp.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:border-indigo-200">
                      <div className="grid grid-cols-12 gap-3 px-4 py-3 items-center cursor-pointer"
                        onClick={() => setExpandedEmp(isExpanded ? null : emp.id)}>

                        {/* Employee */}
                        <div className="col-span-3 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0"
                            style={{ backgroundColor: cfg?.color + 'dd' }}>
                            {emp.name[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-slate-800 font-bold text-sm truncate">{emp.name}</p>
                            <p className="text-slate-400 text-xs truncate">{emp.designation}</p>
                            <p className="text-slate-300 text-[10px]">#{emp.employee_id} · {emp.department}</p>
                          </div>
                        </div>

                        {/* Scores */}
                        <div className="col-span-2 flex items-center gap-2">
                          <ScoreRing score={emp.final_score} size={42} />
                          <div className="text-[10px] text-slate-400 space-y-0.5">
                            <div>Mgr: <span className="text-slate-600 font-bold">{emp.manager_score ?? '—'}</span></div>
                            <div>HOD: <span className="text-slate-600 font-bold">{emp.hod_score ?? '—'}</span></div>
                            <div>Mgt: <span className="text-slate-600 font-bold">{emp.management_score ?? '—'}</span></div>
                          </div>
                        </div>

                        {/* Grade */}
                        <div className="col-span-1 flex flex-col items-center gap-1">
                          <GradeBadge grade={emp.effective_grade} size="lg" />
                          <span className="text-[9px] text-slate-400 text-center leading-tight">{cfg?.label}</span>
                        </div>

                        {/* Slider */}
                        <div className="col-span-2" onClick={e => e.stopPropagation()}>
                          <IncrementSlider emp={emp} onUpdate={updateEmployee} />
                        </div>

                        {/* CTC */}
                        <div className="col-span-3">
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Current</span>
                              <span className="text-slate-600 font-bold">₹{fmt(emp.current_ctc)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Increment</span>
                              <span className="text-emerald-500 font-bold">+₹{fmt(emp.increment_amount)}</span>
                            </div>
                            <div className="h-px bg-slate-200" />
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-700 font-bold">New CTC</span>
                              <span className="text-slate-900 font-black">₹{fmt(emp.new_ctc)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Flags */}
                        <div className="col-span-1 flex flex-col items-end gap-1.5">
                          {emp.promoted && (
                            <span title="Promoted" className="w-6 h-6 bg-violet-100 border border-violet-200 rounded-lg flex items-center justify-center">
                              <Crown className="w-3 h-3 text-violet-500" />
                            </span>
                          )}
                          {emp.on_time_reward && (
                            <span title="On-Time Reward" className="w-6 h-6 bg-amber-100 border border-amber-200 rounded-lg flex items-center justify-center">
                              <Star className="w-3 h-3 text-amber-500" />
                            </span>
                          )}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-300 mt-auto" /> : <ChevronDown className="w-4 h-4 text-slate-300 mt-auto" />}
                        </div>
                      </div>

                      {/* Expanded */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50 p-5 grid grid-cols-3 gap-5">
                          {/* Score Breakdown */}
                          <div className="space-y-3">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Score Breakdown</p>
                            {[
                              { label: 'Manager Score', value: emp.manager_score, weight: 35, color: '#6366f1' },
                              { label: 'HOD Score',     value: emp.hod_score,     weight: 35, color: '#8b5cf6' },
                              { label: 'Mgmt Score',    value: emp.management_score, weight: 30, color: '#a78bfa' },
                            ].map(s => (
                              <div key={s.label}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-slate-500">{s.label} <span className="text-slate-300">({s.weight}%)</span></span>
                                  <span className="font-bold" style={{ color: s.color }}>{s.value ?? '—'}/100</span>
                                </div>
                                <MiniBar value={s.value ?? 0} max={100} color={s.color} />
                              </div>
                            ))}
                            <div className="pt-2 border-t border-slate-200">
                              <div className="flex justify-between text-sm">
                                <span className="font-bold text-slate-700">Final Score</span>
                                <span className="font-black text-indigo-600">{emp.final_score}/100</span>
                              </div>
                            </div>
                          </div>

                          {/* Override Controls */}
                          <div className="space-y-3">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Override Controls</p>
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">Override Grade</label>
                              <select value={emp.override_grade || ''}
                                onChange={e => updateEmployee(emp.id, { override_grade: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400">
                                <option value="">Auto (Grade {emp.auto_grade})</option>
                                {GRADE_ORDER.map(g => <option key={g} value={g}>Grade {g} — {GRADES[g]?.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">Management Score Override</label>
                              <input type="number" min="0" max="100"
                                defaultValue={emp.management_score ?? ''}
                                onBlur={e => updateEmployee(emp.id, { management_score: e.target.value || null })}
                                placeholder="0–100"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400" />
                            </div>
                            <div className="flex gap-4 pt-1">
                              {[
                                { key: 'promoted', label: 'Promoted', val: emp.promoted, color: 'bg-violet-500' },
                                { key: 'on_time_reward', label: 'Reward', val: emp.on_time_reward, color: 'bg-amber-500' },
                              ].map(tog => (
                                <label key={tog.key} className="flex items-center gap-2 cursor-pointer">
                                  <div onClick={() => updateEmployee(emp.id, { [tog.key]: !tog.val })}
                                    className={`w-9 h-5 rounded-full relative transition-all ${tog.val ? tog.color : 'bg-slate-200'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${tog.val ? 'left-4' : 'left-0.5'}`} />
                                  </div>
                                  <span className="text-xs text-slate-600 font-medium">{tog.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Remarks */}
                          <div className="space-y-3">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Remarks</p>
                            {emp.manager_remarks && (
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">Manager</p>
                                <p className="text-slate-600 text-xs bg-white border border-slate-200 rounded-lg p-2.5 leading-relaxed">{emp.manager_remarks}</p>
                              </div>
                            )}
                            {emp.hod_remarks && (
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">HOD</p>
                                <p className="text-slate-600 text-xs bg-white border border-slate-200 rounded-lg p-2.5 leading-relaxed">{emp.hod_remarks}</p>
                              </div>
                            )}
                            <textarea placeholder="Add notes…" defaultValue={emp.notes}
                              onBlur={e => updateEmployee(emp.id, { notes: e.target.value })} rows={2}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400 resize-none placeholder-slate-300" />
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

        {/* ── Analytics Tab ── */}
        {tab === 'charts' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-4 h-4 text-indigo-500" />
                <h3 className="text-slate-800 font-bold">Grade Distribution</h3>
              </div>
              <DonutChart data={summary.grade_distribution || {}} />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <h3 className="text-slate-800 font-bold">Department Payroll Impact</h3>
              </div>
              <PayrollBars departments={summary.department_breakdown || []} />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-violet-500" />
                <h3 className="text-slate-800 font-bold">Grade-wise Increment Cost</h3>
              </div>
              <div className="space-y-3">
                {GRADE_ORDER.map(grade => {
                  const gradeEmps = employees.filter(e => e.effective_grade === grade);
                  if (!gradeEmps.length) return null;
                  const totalInc = gradeEmps.reduce((s: number, e: any) => s + e.increment_amount, 0);
                  const cfg = GRADES[grade];
                  return (
                    <div key={grade} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0"
                        style={{ backgroundColor: cfg.color }}>
                        {grade}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500">{cfg.label} <span className="text-slate-300">({gradeEmps.length})</span></span>
                          <span className="text-slate-800 font-bold">{fmtCr(totalInc)}</span>
                        </div>
                        <MiniBar value={totalInc} max={totalIncrement || 1} color={cfg.color} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-amber-500" />
                <h3 className="text-slate-800 font-bold">Payroll Summary</h3>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Employees', value: summary.total_employees || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Promoted', value: summary.promoted_count || 0, color: 'text-violet-600', bg: 'bg-violet-50' },
                    { label: 'Rewarded', value: summary.reward_count || 0, color: 'text-amber-600', bg: 'bg-amber-50' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Before Increment</span>
                    <span className="text-slate-700 font-bold">{fmtCr(totalCurrentCTC)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">After Increment</span>
                    <span className="text-emerald-600 font-black text-base">{fmtCr(totalNewCTC)}</span>
                  </div>
                  <div className="h-px bg-emerald-100" />
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Additional Cost</span>
                    <span className="text-emerald-600 font-bold">+{fmtCr(totalIncrement)} ({incrementPct.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Grade Guide Tab ── */}
        {tab === 'grade-guide' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {GRADE_ORDER.map(grade => {
                const cfg = GRADES[grade];
                const gradeEmps = employees.filter(e => e.effective_grade === grade);
                return (
                  <div key={grade} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
                    style={{ borderLeftColor: cfg.color, borderLeftWidth: 4 }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl"
                        style={{ backgroundColor: cfg.color }}>
                        {grade}
                      </div>
                      <div className="text-right">
                        <p className="text-slate-900 font-black text-2xl">{gradeEmps.length}</p>
                        <p className="text-slate-400 text-xs">employees</p>
                      </div>
                    </div>
                    <h3 className="text-slate-800 font-black">{cfg.label}</h3>
                    <p className="text-slate-400 text-xs mt-1">Score: <span className="font-bold" style={{ color: cfg.color }}>{cfg.scoreRange}</span></p>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Increment</span>
                        <span className="font-bold" style={{ color: cfg.color }}>{cfg.inc_min}% – {cfg.inc_max}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Promotion %</span>
                        <span className="font-bold text-violet-600">{cfg.promo_pct}%</span>
                      </div>
                      {gradeEmps.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Total Increment</span>
                          <span className="font-bold text-emerald-600">
                            {fmtCr(gradeEmps.reduce((s: number, e: any) => s + e.increment_amount, 0))}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <MiniBar value={gradeEmps.length} max={employees.length || 1} color={cfg.color} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Policy Notes */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-slate-800 font-bold mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" /> Policy Notes
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  'Salary/Market Correction as per Management Discretion if employee falls in A+, A, B+, B grade only.',
                  'Upto 10% of total employees can be promoted. Promotion to next Cadre is subject to Role Change.',
                  'No Salary correction to be provided in case promotion is given to any employee.',
                  'All cases of Redesignation shall be without promotional %age benefit.',
                ].map((note, i) => (
                  <div key={i} className="flex gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-white font-black text-[9px]">{i + 1}</span>
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
