import { useState, useEffect, useRef } from 'react';
import {
  Upload, Download, Plus, TrendingUp, Users, DollarSign,
  Award, ChevronDown, ChevronUp, Search, X,
  BarChart3, PieChart, Zap, Star, ArrowUpRight, FileSpreadsheet,
  AlertCircle, CheckCircle, Crown,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PMS_API = `${API_BASE}/api/pms`;

// ── Grade Config ──────────────────────────────────────────────────────────────
const GRADES: Record<string, { label: string; color: string; bg: string; border: string; inc_min: number; inc_max: number; promo_pct: number; scoreRange: string }> = {
  'A+': { label: 'Exceptional',      color: '#16a34a', bg: 'bg-emerald-50',  border: 'border-emerald-400', inc_min: 12, inc_max: 15, promo_pct: 10, scoreRange: '≥106%' },
  'A':  { label: 'Outstanding',      color: '#22c55e', bg: 'bg-green-50',    border: 'border-green-400',   inc_min: 10, inc_max: 12, promo_pct: 8,  scoreRange: '95-100%' },
  'B+': { label: 'Exceeds Target',   color: '#eab308', bg: 'bg-yellow-50',   border: 'border-yellow-400',  inc_min: 7,  inc_max: 10, promo_pct: 6,  scoreRange: '85-94%' },
  'B':  { label: 'Meets Target',     color: '#f97316', bg: 'bg-orange-50',   border: 'border-orange-400',  inc_min: 4,  inc_max: 7,  promo_pct: 4,  scoreRange: '65-84%' },
  'C':  { label: 'Near Target',      color: '#ef4444', bg: 'bg-red-50',      border: 'border-red-400',     inc_min: 0,  inc_max: 4,  promo_pct: 0,  scoreRange: '51-64%' },
  'D':  { label: 'Needs Improvement',color: '#991b1b', bg: 'bg-red-100',     border: 'border-red-700',     inc_min: 2,  inc_max: 2,  promo_pct: 0,  scoreRange: '<50%' },
};

const GRADE_ORDER = ['A+', 'A', 'B+', 'B', 'C', 'D'];

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}
function fmtCr(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${fmt(n)}`;
}

// ── Grade Badge ───────────────────────────────────────────────────────────────
function GradeBadge({ grade, size = 'md' }: { grade: string; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = GRADES[grade];
  if (!cfg) return null;
  const sizes = { sm: 'px-2 py-0.5 text-[10px]', md: 'px-3 py-1 text-xs', lg: 'px-4 py-1.5 text-sm' };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-black border ${sizes[size]}`}
      style={{ backgroundColor: cfg.color + '20', borderColor: cfg.color, color: cfg.color }}>
      {grade}
    </span>
  );
}

// ── Mini Bar ─────────────────────────────────────────────────────────────────
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <div className="text-slate-400 text-sm text-center py-8">No data</div>;

  let cumulative = 0;
  const segments = GRADE_ORDER.filter(g => data[g] > 0).map(g => {
    const pct = (data[g] / total) * 100;
    const startAngle = (cumulative / 100) * 360;
    const endAngle = ((cumulative + pct) / 100) * 360;
    cumulative += pct;
    return { grade: g, pct, startAngle, endAngle, color: GRADES[g]?.color || '#94a3b8', count: data[g] };
  });

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = (angle - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (cx: number, cy: number, r: number, start: number, end: number) => {
    const s = polarToCartesian(cx, cy, r, start);
    const e = polarToCartesian(cx, cy, r, end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
  };

  return (
    <div className="flex items-center gap-6">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="55" fill="white" />
        {segments.map((seg, i) => (
          <path key={i} d={describeArc(70, 70, 55, seg.startAngle, seg.endAngle - 0.5)}
            fill={seg.color} opacity="0.9"
            className="hover:opacity-100 transition-opacity cursor-pointer">
            <title>{seg.grade}: {seg.count} ({seg.pct.toFixed(1)}%)</title>
          </path>
        ))}
        <circle cx="70" cy="70" r="35" fill="white" />
        <text x="70" y="67" textAnchor="middle" fontSize="20" fontWeight="900" fill="#0f172a">{total}</text>
        <text x="70" y="82" textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">EMPLOYEES</text>
      </svg>
      <div className="space-y-1.5 flex-1">
        {segments.map(seg => (
          <div key={seg.grade} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-xs font-bold text-slate-700 w-6">{seg.grade}</span>
            <div className="flex-1">
              <MiniBar value={seg.count} max={total} color={seg.color} />
            </div>
            <span className="text-xs font-bold text-slate-500 w-8 text-right">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Payroll Bar Chart ─────────────────────────────────────────────────────────
function PayrollBars({ departments }: { departments: any[] }) {
  if (!departments?.length) return <div className="text-slate-400 text-sm text-center py-8">No data</div>;
  const maxVal = Math.max(...departments.map(d => d.new_ctc));
  return (
    <div className="space-y-3">
      {departments.map((dept, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{dept.department}</span>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400">{fmtCr(dept.current_ctc)}</span>
              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-600 font-bold">{fmtCr(dept.new_ctc)}</span>
            </div>
          </div>
          <div className="relative h-5 bg-slate-100 rounded-lg overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-slate-200 rounded-lg transition-all duration-500"
              style={{ width: `${(dept.current_ctc / maxVal) * 100}%` }} />
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-lg opacity-80 transition-all duration-700"
              style={{ width: `${(dept.new_ctc / maxVal) * 100}%` }} />
            <span className="absolute right-2 inset-y-0 flex items-center text-[10px] font-black text-white">
              +{dept.count} emp
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const grade = score >= 106 ? 'A+' : score >= 95 ? 'A' : score >= 85 ? 'B+' : score >= 65 ? 'B' : score >= 51 ? 'C' : 'D';
  const color = GRADES[grade]?.color || '#94a3b8';
  const pct = Math.min(100, score);
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <span className="absolute text-[10px] font-black" style={{ color }}>{score.toFixed(0)}</span>
    </div>
  );
}

// ── Increment Slider ─────────────────────────────────────────────────────────
function IncrementSlider({ emp, onUpdate }: { emp: any; onUpdate: (id: number, data: any) => void }) {
  const cfg = GRADES[emp.effective_grade];
  const [val, setVal] = useState<number>(emp.effective_increment_pct);
  const [saving, setSaving] = useState(false);

  const handleChange = async (newVal: number) => {
    setVal(newVal);
    setSaving(true);
    await onUpdate(emp.id, { override_increment_pct: newVal });
    setSaving(false);
  };

  const min = cfg?.inc_min ?? 0;
  const max = cfg?.inc_max ?? 15;
  const step = 0.5;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400">{min}%</span>
        <span className={`text-sm font-black transition-all ${saving ? 'opacity-50' : ''}`}
          style={{ color: cfg?.color }}>{val.toFixed(1)}%</span>
        <span className="text-[10px] text-slate-400">{max}%</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={e => handleChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, ${cfg?.color} 0%, ${cfg?.color} ${((val - min) / (max - min)) * 100}%, #e2e8f0 ${((val - min) / (max - min)) * 100}%, #e2e8f0 100%)` }}
      />
    </div>
  );
}

// ── Main PMS Page ─────────────────────────────────────────────────────────────
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
    setNewSessionName('');
    setShowNewSession(false);
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
      // Refresh summary
      loadSession(activeSession.id);
    }
  };

  const downloadTemplate = () => {
    window.open(`${PMS_API}/template/`, '_blank');
  };

  const exportResults = () => {
    if (!activeSession) return;
    window.open(`${PMS_API}/sessions/${activeSession.id}/export/`, '_blank');
  };

  const employees: any[] = activeSession?.employees || [];
  const summary = activeSession?.summary || {};

  const filtered = employees.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.employee_id.toLowerCase().includes(search.toLowerCase());
    const matchGrade = !filterGrade || e.effective_grade === filterGrade;
    const matchDept = !filterDept || e.department === filterDept;
    return matchSearch && matchGrade && matchDept;
  });

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  const totalCurrentCTC = summary.total_current_ctc || 0;
  const totalNewCTC = summary.total_new_ctc || 0;
  const totalIncrement = summary.total_increment || 0;
  const incrementPct = summary.increment_pct || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">

      {/* ── Header ── */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-black text-lg tracking-tight">PMS Simulator</h1>
              <p className="text-slate-400 text-xs">Performance Management & Salary Simulation</p>
            </div>
          </div>

          {/* Session Selector */}
          <div className="flex items-center gap-2 ml-6">
            {sessions.map(s => (
              <button key={s.id} onClick={() => loadSession(s.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  activeSession?.id === s.id
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white'
                }`}>
                {s.name}
                <span className="ml-1.5 opacity-60">({s.employee_count})</span>
              </button>
            ))}
            {showNewSession ? (
              <div className="flex items-center gap-2">
                <input value={newSessionName} onChange={e => setNewSessionName(e.target.value)}
                  placeholder="Session name…" onKeyDown={e => e.key === 'Enter' && createSession()}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500 w-40" />
                <button onClick={createSession} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold">Create</button>
                <button onClick={() => setShowNewSession(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => setShowNewSession(true)}
                className="px-3 py-1.5 border border-dashed border-slate-600 rounded-lg text-slate-500 hover:border-indigo-500 hover:text-indigo-400 transition-all text-xs font-bold flex items-center gap-1">
                <Plus className="w-3 h-3" /> New
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={downloadTemplate}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Template
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-900">
              <Upload className="w-3.5 h-3.5" /> Import Data
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            <button onClick={exportResults}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-900">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>
      </div>

      {importMsg && (
        <div className={`mx-6 mt-3 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold border ${importMsg.ok ? 'bg-emerald-900/30 border-emerald-700 text-emerald-300' : 'bg-rose-900/30 border-rose-700 text-rose-300'}`}>
          {importMsg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {importMsg.text}
          <button onClick={() => setImportMsg(null)} className="ml-auto opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-6 py-4 space-y-4">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Employees', value: fmt(summary.total_employees || 0), sub: `${summary.promoted_count || 0} promoted`, icon: Users, color: 'from-blue-600 to-indigo-600', glow: 'shadow-indigo-900' },
            { label: 'Current Payroll', value: fmtCr(totalCurrentCTC), sub: 'Annual CTC', icon: DollarSign, color: 'from-slate-600 to-slate-700', glow: 'shadow-slate-900' },
            { label: 'New Payroll', value: fmtCr(totalNewCTC), sub: `+${fmtCr(totalIncrement)} increment`, icon: TrendingUp, color: 'from-emerald-600 to-teal-600', glow: 'shadow-emerald-900' },
            { label: 'Avg Increment', value: `${incrementPct.toFixed(2)}%`, sub: `₹${fmt(totalIncrement / (summary.total_employees || 1))} per employee`, icon: Award, color: 'from-violet-600 to-purple-700', glow: 'shadow-purple-900' },
          ].map((kpi, i) => (
            <div key={i} className={`bg-gradient-to-br ${kpi.color} rounded-2xl p-5 shadow-xl ${kpi.glow} relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white" />
              </div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">{kpi.label}</p>
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <kpi.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-white font-black text-2xl">{kpi.value}</p>
                <p className="text-white/60 text-xs mt-1">{kpi.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800 w-fit">
          {[
            { id: 'simulator', label: 'Simulator', icon: Zap },
            { id: 'charts', label: 'Analytics', icon: PieChart },
            { id: 'grade-guide', label: 'Grade Guide', icon: Star },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                tab === t.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900'
                  : 'text-slate-400 hover:text-white'
              }`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* ── Simulator Tab ── */}
        {tab === 'simulator' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search employee…"
                  className="bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 w-52" />
              </div>
              <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-indigo-500">
                <option value="">All Grades</option>
                {GRADE_ORDER.map(g => <option key={g} value={g}>Grade {g} — {GRADES[g]?.label}</option>)}
              </select>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-indigo-500">
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {(search || filterGrade || filterDept) && (
                <button onClick={() => { setSearch(''); setFilterGrade(''); setFilterDept(''); }}
                  className="flex items-center gap-1 text-slate-400 hover:text-white text-xs font-bold px-2 py-2">
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
              <span className="text-slate-500 text-xs ml-auto">{filtered.length} of {employees.length} employees</span>
            </div>

            {/* Employee Cards */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center">
                <BarChart3 className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 font-bold text-lg">No employees yet</p>
                <p className="text-slate-600 text-sm mt-1">Download the template and import your employee data</p>
                <button onClick={downloadTemplate}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold">
                  Download Template
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(emp => {
                  const isExpanded = expandedEmp === emp.id;
                  const cfg = GRADES[emp.effective_grade];
                  return (
                    <div key={emp.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all">

                      {/* Main Row */}
                      <div className="grid grid-cols-12 gap-3 p-4 items-center cursor-pointer"
                        onClick={() => setExpandedEmp(isExpanded ? null : emp.id)}>

                        {/* Employee Info */}
                        <div className="col-span-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0"
                            style={{ background: `linear-gradient(135deg, ${cfg?.color}40, ${cfg?.color}80)`, border: `1px solid ${cfg?.color}60` }}>
                            {emp.name[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-bold text-sm truncate">{emp.name}</p>
                            <p className="text-slate-500 text-xs truncate">{emp.designation}</p>
                            <p className="text-slate-600 text-[10px]">#{emp.employee_id} · {emp.department}</p>
                          </div>
                        </div>

                        {/* Scores */}
                        <div className="col-span-2 flex items-center gap-3">
                          <ScoreRing score={emp.final_score} size={44} />
                          <div>
                            <div className="text-[10px] text-slate-500 space-y-0.5">
                              <div>Mgr: <span className="text-slate-300 font-bold">{emp.manager_score ?? '—'}</span></div>
                              <div>HOD: <span className="text-slate-300 font-bold">{emp.hod_score ?? '—'}</span></div>
                              <div>Mgt: <span className="text-slate-300 font-bold">{emp.management_score ?? '—'}</span></div>
                            </div>
                          </div>
                        </div>

                        {/* Grade */}
                        <div className="col-span-1 flex flex-col items-center gap-1">
                          <GradeBadge grade={emp.effective_grade} size="lg" />
                          <span className="text-[10px] text-slate-500">{cfg?.label}</span>
                        </div>

                        {/* Increment Slider */}
                        <div className="col-span-2">
                          <div onClick={e => e.stopPropagation()}>
                            <IncrementSlider emp={emp} onUpdate={updateEmployee} />
                          </div>
                        </div>

                        {/* CTC Impact */}
                        <div className="col-span-3">
                          <div className="bg-slate-800 rounded-xl p-3 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Current</span>
                              <span className="text-slate-300 font-bold">₹{fmt(emp.current_ctc)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Increment</span>
                              <span className="text-emerald-400 font-bold">+₹{fmt(emp.increment_amount)}</span>
                            </div>
                            <div className="h-px bg-slate-700 my-1" />
                            <div className="flex justify-between text-xs">
                              <span className="text-white font-bold">New CTC</span>
                              <span className="text-white font-black">₹{fmt(emp.new_ctc)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Flags + Expand */}
                        <div className="col-span-1 flex flex-col items-end gap-1">
                          <div className="flex gap-1">
                            {emp.promoted && <span title="Promoted" className="w-5 h-5 bg-violet-500/20 border border-violet-500/40 rounded-md flex items-center justify-center"><Crown className="w-3 h-3 text-violet-400" /></span>}
                            {emp.on_time_reward && <span title="On-Time Reward" className="w-5 h-5 bg-amber-500/20 border border-amber-500/40 rounded-md flex items-center justify-center"><Star className="w-3 h-3 text-amber-400" /></span>}
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500 mt-auto" /> : <ChevronDown className="w-4 h-4 text-slate-500 mt-auto" />}
                        </div>
                      </div>

                      {/* Expanded Panel */}
                      {isExpanded && (
                        <div className="border-t border-slate-800 bg-slate-900/50 p-5 grid grid-cols-3 gap-5">
                          {/* Scores Detail */}
                          <div className="space-y-3">
                            <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Score Breakdown</p>
                            {[
                              { label: 'Manager Score', value: emp.manager_score, weight: 35, color: '#6366f1' },
                              { label: 'HOD Score', value: emp.hod_score, weight: 35, color: '#8b5cf6' },
                              { label: 'Management Score', value: emp.management_score, weight: 30, color: '#a78bfa' },
                            ].map(s => (
                              <div key={s.label}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-slate-400">{s.label} <span className="text-slate-600">({s.weight}%)</span></span>
                                  <span className="font-bold" style={{ color: s.color }}>{s.value ?? '—'}/100</span>
                                </div>
                                <MiniBar value={s.value ?? 0} max={100} color={s.color} />
                              </div>
                            ))}
                            <div className="pt-2 border-t border-slate-800">
                              <div className="flex justify-between text-xs">
                                <span className="text-white font-bold">Final Score</span>
                                <span className="font-black text-indigo-400">{emp.final_score}/100</span>
                              </div>
                            </div>
                          </div>

                          {/* Override Controls */}
                          <div className="space-y-3">
                            <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Override Controls</p>
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">Override Grade</label>
                              <select value={emp.override_grade || ''}
                                onChange={e => updateEmployee(emp.id, { override_grade: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500">
                                <option value="">Auto ({emp.auto_grade})</option>
                                {GRADE_ORDER.map(g => <option key={g} value={g}>Grade {g} — {GRADES[g]?.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">Management Score Override</label>
                              <input type="number" min="0" max="100"
                                defaultValue={emp.management_score ?? ''}
                                onBlur={e => updateEmployee(emp.id, { management_score: e.target.value || null })}
                                placeholder="0-100"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500" />
                            </div>
                            <div className="flex gap-3 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <div onClick={() => updateEmployee(emp.id, { promoted: !emp.promoted })}
                                  className={`w-9 h-5 rounded-full transition-all ${emp.promoted ? 'bg-violet-600' : 'bg-slate-700'} relative`}>
                                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${emp.promoted ? 'left-4' : 'left-0.5'}`} />
                                </div>
                                <span className="text-xs text-slate-400">Promoted</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <div onClick={() => updateEmployee(emp.id, { on_time_reward: !emp.on_time_reward })}
                                  className={`w-9 h-5 rounded-full transition-all ${emp.on_time_reward ? 'bg-amber-500' : 'bg-slate-700'} relative`}>
                                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${emp.on_time_reward ? 'left-4' : 'left-0.5'}`} />
                                </div>
                                <span className="text-xs text-slate-400">Reward</span>
                              </label>
                            </div>
                          </div>

                          {/* Remarks */}
                          <div className="space-y-3">
                            <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Remarks</p>
                            {emp.manager_remarks && (
                              <div>
                                <p className="text-[10px] text-slate-600 uppercase font-bold mb-1">Manager</p>
                                <p className="text-slate-400 text-xs bg-slate-800 rounded-lg p-2.5 leading-relaxed">{emp.manager_remarks}</p>
                              </div>
                            )}
                            {emp.hod_remarks && (
                              <div>
                                <p className="text-[10px] text-slate-600 uppercase font-bold mb-1">HOD</p>
                                <p className="text-slate-400 text-xs bg-slate-800 rounded-lg p-2.5 leading-relaxed">{emp.hod_remarks}</p>
                              </div>
                            )}
                            <textarea placeholder="Add notes…" defaultValue={emp.notes}
                              onBlur={e => updateEmployee(emp.id, { notes: e.target.value })}
                              rows={2}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 resize-none placeholder-slate-600" />
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
            {/* Grade Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-4 h-4 text-indigo-400" />
                <h3 className="text-white font-bold">Grade Distribution</h3>
                <span className="text-slate-500 text-xs ml-auto">{employees.length} employees</span>
              </div>
              <DonutChart data={summary.grade_distribution || {}} />
            </div>

            {/* Payroll Impact */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-white font-bold">Department Payroll Impact</h3>
              </div>
              <PayrollBars departments={summary.department_breakdown || []} />
            </div>

            {/* Grade-wise Cost Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-violet-400" />
                <h3 className="text-white font-bold">Grade-wise Increment Cost</h3>
              </div>
              <div className="space-y-3">
                {GRADE_ORDER.map(grade => {
                  const gradeEmps = employees.filter(e => e.effective_grade === grade);
                  if (gradeEmps.length === 0) return null;
                  const totalInc = gradeEmps.reduce((s, e) => s + e.increment_amount, 0);
                  const cfg = GRADES[grade];
                  return (
                    <div key={grade} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0"
                        style={{ backgroundColor: cfg.color }}>
                        {grade}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">{cfg.label} <span className="text-slate-600">({gradeEmps.length} emp)</span></span>
                          <span className="text-white font-bold">{fmtCr(totalInc)}</span>
                        </div>
                        <MiniBar value={totalInc} max={totalIncrement} color={cfg.color} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payroll Summary Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <h3 className="text-white font-bold">Payroll Summary</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-800 rounded-xl p-4 space-y-3">
                  {[
                    { label: 'Total Employees', value: fmt(summary.total_employees || 0), color: 'text-blue-400' },
                    { label: 'Employees Promoted', value: fmt(summary.promoted_count || 0), color: 'text-violet-400' },
                    { label: 'On-Time Rewards', value: fmt(summary.reward_count || 0), color: 'text-amber-400' },
                  ].map(s => (
                    <div key={s.label} className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">{s.label}</span>
                      <span className={`font-black text-lg ${s.color}`}>{s.value}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-800/50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Before Increment</span>
                    <span className="text-white font-bold">{fmtCr(totalCurrentCTC)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">After Increment</span>
                    <span className="text-emerald-300 font-black text-lg">{fmtCr(totalNewCTC)}</span>
                  </div>
                  <div className="h-px bg-emerald-800/50" />
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Total Cost ↑</span>
                    <span className="text-emerald-400 font-bold">+{fmtCr(totalIncrement)} ({incrementPct.toFixed(1)}%)</span>
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
                  <div key={grade} className="bg-slate-900 border rounded-2xl p-5 relative overflow-hidden"
                    style={{ borderColor: cfg.color + '40' }}>
                    <div className="absolute inset-0 opacity-5"
                      style={{ background: `radial-gradient(circle at top right, ${cfg.color}, transparent 60%)` }} />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl"
                          style={{ backgroundColor: cfg.color }}>
                          {grade}
                        </div>
                        <div className="text-right">
                          <p className="text-white font-black text-2xl">{gradeEmps.length}</p>
                          <p className="text-slate-500 text-xs">employees</p>
                        </div>
                      </div>
                      <h3 className="text-white font-black text-lg">{cfg.label}</h3>
                      <p className="text-slate-400 text-sm mt-1">Score Range: <span className="font-bold" style={{ color: cfg.color }}>{cfg.scoreRange}</span></p>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Increment Range</span>
                          <span className="font-bold" style={{ color: cfg.color }}>{cfg.inc_min}% – {cfg.inc_max}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Promotion %</span>
                          <span className="font-bold text-violet-400">{cfg.promo_pct}%</span>
                        </div>
                        {gradeEmps.length > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Total Increment</span>
                            <span className="font-bold text-emerald-400">
                              {fmtCr(gradeEmps.reduce((s, e) => s + e.increment_amount, 0))}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <MiniBar value={gradeEmps.length} max={employees.length || 1} color={cfg.color} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notes */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" /> Policy Notes
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  'Salary/Market Correction as per Management Discretion if employee falls in A+, A, B+, B grade only.',
                  'Upto 10% of total employees can be promoted. Promotion to next Cadre is subject to Role Change.',
                  'No Salary correction to be provided in case promotion is given to any employee.',
                  'All cases of Redesignation shall be without promotional %age benefit.',
                ].map((note, i) => (
                  <div key={i} className="flex gap-3 bg-slate-800 rounded-xl p-3">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-amber-400 font-black text-[10px]">{i + 1}</span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">{note}</p>
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
