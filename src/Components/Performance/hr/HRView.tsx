import { useState, useEffect } from 'react';
import {
  Upload, Trophy, BarChart3, CheckCircle, Calendar,
  Users, AlertTriangle, TrendingUp, FileText, Settings,
  ChevronDown, ChevronUp, Award, Clock, Lock, Unlock, Download,
} from 'lucide-react';
import { PERF_API } from '../../../Pages/PerformancePage';
import { downloadScorecard } from '../../../utils/downloadScorecard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CYCLE_PHASES = [
  { value: 'goal_setting', label: 'Open Goal Setting', icon: Unlock, color: 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100' },
  { value: 'goals_locked', label: 'Lock Goals',        icon: Lock,   color: 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100' },
  { value: 'review_open',  label: 'Open Reviews',      icon: Clock,  color: 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100' },
  { value: 'closed',       label: 'Close Cycle',       icon: Lock,   color: 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100' },
];

const PHASE_BADGE: Record<string, string> = {
  goal_setting: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  goals_locked: 'bg-amber-50 text-amber-700 border-amber-200',
  review_open:  'bg-blue-50 text-blue-700 border-blue-200',
  closed:       'bg-rose-50 text-rose-700 border-rose-200',
  draft:        'bg-slate-100 text-slate-600 border-slate-200',
};

// ─── Main HR View ─────────────────────────────────────────────────────────────

export function HRView({ hrUser }: { hrUser: any }) {
  const [tab, setTab] = useState<'overview' | 'import' | 'cycle' | 'appraisals' | 'leaderboard'>('overview');
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [allCards, setAllCards] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [resetting, setResetting] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [cycleName, setCycleName] = useState(`Annual Appraisal FY ${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}`);
  const [creatingCycle, setCreatingCycle] = useState(false);
  const [cycleMsg, setCycleMsg] = useState('');

  // Load all cycles
  useEffect(() => {
    fetch(`${PERF_API}/cycles/`)
      .then(r => r.json())
      .then(data => {
        setCycles(data);
        if (data.length > 0) setSelectedCycle(data[0]);
      }).catch(() => {});
  }, []);

  // Load cycle data when selected
  useEffect(() => {
    if (!selectedCycle) return;
    fetch(`${PERF_API}/org/overview/?cycle_id=${selectedCycle.id}`).then(r => r.json()).then(setOverview).catch(() => {});
    fetch(`${PERF_API}/all-goal-cards/?cycle_id=${selectedCycle.id}`).then(r => r.json()).then(setAllCards).catch(() => {});
    fetch(`${PERF_API}/leaderboard/?cycle_id=${selectedCycle.id}`).then(r => r.json()).then(setLeaderboard).catch(() => {});
  }, [selectedCycle]);

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true); setImportMsg('');
    const fd = new FormData(); fd.append('file', importFile);
    try {
      const res = await fetch(`${PERF_API}/employees/import/`, { method: 'POST', body: fd });
      const data = await res.json();
      setImportMsg(`✅ ${data.message}${data.errors?.length ? ` · ${data.errors.length} errors` : ''}`);
      setImportFile(null);
    } catch { setImportMsg('❌ Import failed. Check the file format and try again.'); }
    finally { setImporting(false); }
  };

  const downloadTemplate = () => {
    const headers = ['Employee ID','Name','Email','Phone','Designation','Department','Zone','Sub Zone','Reporting Manager ID','HOD ID','User Type','Joined Date'];
    const sample = [
      ['EMP001','Rahul Sharma','rahul@company.com','9876543210','Sales Executive','Sales','North Zone','Delhi Sub Zone','MGR001','HOD001','field_force','2024-01-15'],
      ['EMP002','Priya Singh','priya@company.com','9876543211','Area Manager','Sales','South Zone','Hyderabad Sub Zone','MGR002','HOD001','manager','2023-06-01'],
      ['MGR001','Amit Verma','amit@company.com','9876543212','Zonal Manager','Management','North Zone','','','HOD001','manager','2022-03-10'],
      ['HOD001','Ravi Kumar','ravi@company.com','9876543214','Head of Department','Management','North Zone','','','','hod','2021-06-01'],
      ['HR001','Sneha Patel','sneha@company.com','9876543213','HR Manager','Human Resources','','','','','hr','2022-01-01'],
    ];
    const csv = [headers.join(','), ...sample.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'APIS_Employee_Master_Template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleCreateCycle = async () => {
    if (!cycleName.trim()) return;
    setCreatingCycle(true); setCycleMsg('');
    try {
      const res = await fetch(`${PERF_API}/cycles/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cycleName.trim(),
          quarter: 4,
          fiscal_year: `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}`,
          goal_setting_deadline: `${new Date().getFullYear() + 1}-03-31`,
          review_start_date: `${new Date().getFullYear() + 1}-03-01`,
          review_deadline: `${new Date().getFullYear() + 1}-03-31`,
          status: 'goal_setting',
          created_by: hrUser.name,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCycles(p => [data, ...p]);
        setSelectedCycle(data);
        setCycleMsg('✅ Appraisal cycle initialized! Employees can now start filling their appraisal forms.');
      } else {
        setCycleMsg('❌ ' + (data.detail || JSON.stringify(data)));
      }
    } catch { setCycleMsg('❌ Failed to create cycle.'); }
    finally { setCreatingCycle(false); }
  };

  const updateCyclePhase = async (id: number, status: string) => {
    await fetch(`${PERF_API}/cycles/${id}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setCycles(p => p.map(c => c.id === id ? { ...c, status } : c));
    if (selectedCycle?.id === id) setSelectedCycle((p: any) => ({ ...p, status }));
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete ALL data (employees, cycles, appraisals). This CANNOT be undone.\n\nAre you sure?')) return;
    setResetting(true);
    try {
      const res = await fetch(`${PERF_API}/org/reset/`, { method: 'POST' });
      if (res.ok) { alert('✅ Database reset successfully!'); window.location.reload(); }
      else alert('❌ Reset failed.');
    } catch { alert('❌ Failed to connect.'); }
    finally { setResetting(false); }
  };

  const TABS = [
    { id: 'overview'    as const, label: 'Overview',    icon: BarChart3 },
    { id: 'import'      as const, label: 'Import Data', icon: Upload },
    { id: 'cycle'       as const, label: 'Appraisal Cycle', icon: Calendar },
    { id: 'appraisals'  as const, label: 'All Appraisals', icon: Award },
    { id: 'leaderboard' as const, label: 'Leaderboard', icon: Trophy },
  ];

  const statCards = [
    { label: 'Total Employees', value: overview?.total_employees,                    icon: Users,       color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200' },
    { label: 'Submitted',       value: overview?.goal_card_status?.submitted,        icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Mgr Approved',    value: overview?.goal_card_status?.manager_approved, icon: TrendingUp,  color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
    { label: 'HOD Approved',    value: overview?.goal_card_status?.hod_approved,     icon: Award,       color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-200' },
    { label: 'Pending',         value: overview?.goal_card_status?.draft,            icon: Clock,       color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* ── HR Header ── */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400" />
          <div className="px-6 py-4 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-rose-200 shrink-0">
              {hrUser.name?.[0] || 'H'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 uppercase tracking-widest">Admin</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 uppercase tracking-widest">Full Access</span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900">{hrUser.name || 'HR Administrator'}</h2>
              <p className="text-rose-500 text-xs font-semibold">Appraisal Hub — Admin Panel</p>
            </div>
            {selectedCycle && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${PHASE_BADGE[selectedCycle.status] || PHASE_BADGE.draft}`}>
                <Calendar className="w-3.5 h-3.5" />
                {selectedCycle.name}
                <span className="opacity-60">· {selectedCycle.status.replace(/_/g, ' ')}</span>
              </div>
            )}
            <button onClick={handleResetDatabase} disabled={resetting}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-all disabled:opacity-40">
              <AlertTriangle className="w-3.5 h-3.5" />
              {resetting ? 'Resetting…' : 'Reset DB'}
            </button>
          </div>
        </div>

        {/* ── Tab Nav ── */}
        <div className="flex gap-1.5 bg-white border border-slate-200 shadow-sm rounded-2xl p-1.5 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="space-y-5">
            {/* Cycle selector */}
            {cycles.length > 1 && (
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-5 py-3 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0">Cycle</span>
                {cycles.map(c => (
                  <button key={c.id} onClick={() => setSelectedCycle(c)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all border ${
                      selectedCycle?.id === c.id
                        ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600'
                    }`}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {overview ? (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {statCards.map(s => (
                    <div key={s.label} className={`bg-white border shadow-sm rounded-2xl p-5 flex items-center gap-4 ${s.bg}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                        <s.icon className={`w-5 h-5 ${s.color}`} />
                      </div>
                      <div>
                        <p className={`text-2xl font-black ${s.color}`}>{s.value ?? 0}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Goal Card Status bar */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <BarChart3 className="w-4 h-4 text-rose-500" />
                    <h4 className="text-slate-900 font-extrabold">Submission Status — {selectedCycle?.name}</h4>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(overview.goal_card_status || {}).map(([s, count]: any) => (
                      <div key={s} className="flex items-center gap-4">
                        <span className="text-slate-600 text-sm w-44 capitalize font-semibold">{s.replace(/_/g, ' ')}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-700"
                            style={{ width: `${Math.min(100, (count / (overview.total_employees || 1)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-slate-800 font-black text-sm w-8 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-16 text-center">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-bold">No appraisal cycle found.</p>
                <p className="text-slate-400 text-sm mt-1">Go to <strong>Import Data</strong> to upload employees, then <strong>Appraisal Cycle</strong> to initialize.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Import Data ── */}
        {tab === 'import' && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 space-y-7">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <Upload className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-slate-900 font-extrabold text-base">Import Employee Database</h3>
                <p className="text-slate-500 text-sm mt-0.5">Upload your employee master sheet — managers, field staff, and HR all in one file.</p>
              </div>
            </div>

            {/* Step 1 */}
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-2xl px-6 py-4 gap-4">
              <div>
                <p className="text-indigo-800 font-bold text-sm">Step 1 — Download the Template</p>
                <p className="text-indigo-500 text-xs mt-0.5">Pre-formatted CSV with all required columns and sample rows</p>
              </div>
              <button onClick={downloadTemplate}
                className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-200">
                <FileText className="w-4 h-4" /> Download Template
              </button>
            </div>

            {/* Columns reference */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Required Columns</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  ['Employee ID', 'e.g. EMP001 — unique ID'],
                  ['Name', 'Full name'],
                  ['Designation', 'Job title / role'],
                  ['Zone', 'Geographic zone'],
                  ['Sub Zone', 'Sub-zone or city'],
                  ['Department', 'Team or department'],
                  ['Reporting Manager ID', 'Manager\'s Employee ID'],
                  ['User Type', 'field_force / manager / hr'],
                  ['Joined Date', 'YYYY-MM-DD'],
                ].map(([col, desc]) => (
                  <div key={col} className="bg-white border border-slate-200 rounded-xl p-3">
                    <p className="text-slate-800 text-xs font-bold">{col}</p>
                    <p className="text-slate-400 text-[10px] mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2 — Upload */}
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Step 2 — Upload Filled Sheet</p>
              <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-rose-400 transition-all cursor-pointer group">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 group-hover:bg-rose-50 transition-colors">
                  <Upload className="w-7 h-7 text-slate-400 group-hover:text-rose-500 transition-colors" />
                </div>
                <p className="text-slate-600 font-semibold text-sm mb-1">
                  {importFile ? <span className="text-rose-600 font-bold">{importFile.name}</span> : 'Click to choose file'}
                </p>
                <p className="text-slate-400 text-xs">Excel (.xlsx, .xls) or CSV</p>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setImportFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>

            <button onClick={handleImport} disabled={!importFile || importing}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2 shadow-md shadow-rose-200 transition-all active:scale-[0.99]">
              {importing
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing...</>
                : <><Upload className="w-4 h-4" /> Import Employees</>
              }
            </button>

            {importMsg && (
              <div className={`text-sm font-semibold text-center py-3.5 px-5 rounded-xl border ${
                importMsg.startsWith('✅')
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}>
                {importMsg}
              </div>
            )}
          </div>
        )}

        {/* ── Appraisal Cycle ── */}
        {tab === 'cycle' && (
          <div className="space-y-5">

            {/* No cycle yet — initialize */}
            {cycles.length === 0 ? (
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-extrabold text-base">Initialize Annual Appraisal Cycle</h3>
                    <p className="text-slate-500 text-sm mt-0.5">Create the appraisal cycle for this financial year. Do this once — employees can immediately start filling their forms.</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Appraisal Cycle Name</label>
                  <input
                    type="text"
                    value={cycleName}
                    onChange={e => setCycleName(e.target.value)}
                    placeholder="e.g. Annual Appraisal FY 2025-26"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 placeholder-slate-300 transition-all"
                  />
                </div>
                <button onClick={handleCreateCycle} disabled={creatingCycle || !cycleName.trim()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2 shadow-md shadow-emerald-200 transition-all">
                  {creatingCycle
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Initializing...</>
                    : <><Calendar className="w-4 h-4" /> Initialize Cycle</>
                  }
                </button>
                {cycleMsg && (
                  <div className={`text-sm font-semibold text-center py-3 px-5 rounded-xl border ${cycleMsg.startsWith('✅') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                    {cycleMsg}
                  </div>
                )}
              </div>
            ) : (
              /* Existing cycles — manage phase */
              cycles.map(c => (
                <div key={c.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 flex items-center gap-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-900 font-extrabold text-base">{c.name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">Annual Appraisal Cycle · FY {c.fiscal_year}</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${PHASE_BADGE[c.status] || PHASE_BADGE.draft}`}>
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="px-6 py-5">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5" /> Manage Phase
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {CYCLE_PHASES.map(({ value, label, icon: Icon, color }) => (
                        <button key={value} onClick={() => updateCyclePhase(c.id, value)}
                          className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border font-bold text-xs transition-all ${
                            c.status === value
                              ? color + ' ring-2 ring-offset-1 ring-current'
                              : color
                          }`}>
                          <Icon className="w-4 h-4" />
                          {label}
                          {c.status === value && <span className="text-[9px] opacity-70">● Active</span>}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-4">
                      <strong className="text-slate-600">Current phase:</strong> {c.status === 'goal_setting' ? 'Employees can fill and submit their appraisal forms.' : c.status === 'goals_locked' ? 'Goal forms are locked. No more submissions.' : c.status === 'review_open' ? 'Review phase is open.' : 'Cycle is closed.'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── All Appraisals ── */}
        {tab === 'appraisals' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Award className="w-4 h-4 text-rose-500" />
              <h3 className="text-slate-900 font-extrabold">All Appraisals — {selectedCycle?.name}</h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">{allCards.length} total</span>
            </div>

            {allCards.length === 0 ? (
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-16 text-center">
                <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-bold">No appraisals yet.</p>
                <p className="text-slate-400 text-sm mt-1">Employees will appear here once they start their appraisal forms.</p>
              </div>
            ) : (
              allCards.map((card: any) => {
                const gc = card.goal_card || card;
                const statusCfg: Record<string, string> = {
                  draft:            'bg-slate-100 text-slate-600 border-slate-200',
                  submitted:        'bg-blue-50 text-blue-700 border-blue-200',
                  manager_approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  manager_rejected: 'bg-rose-50 text-rose-700 border-rose-200',
                  hod_approved:     'bg-violet-50 text-violet-700 border-violet-200',
                  hod_rejected:     'bg-orange-50 text-orange-700 border-orange-200',
                  hr_approved:      'bg-purple-50 text-purple-700 border-purple-200',
                  finalized:        'bg-amber-50 text-amber-700 border-amber-200',
                };
                const canDownload = ['hod_approved', 'hr_approved', 'finalized'].includes(gc?.status);
                const isExp = expandedCard === gc?.id;
                const goals = gc?.goals || [];
                const selfAnswers = gc?.self_review_answers || [];

                return (
                  <div key={gc?.id || card.employee_id} className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                    <div
                      className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-all"
                      onClick={() => setExpandedCard(isExp ? null : gc?.id)}>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 border border-rose-200 flex items-center justify-center font-black text-rose-600 text-sm shrink-0">
                        {(card.name || gc?.employee_name || 'E')?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 font-bold text-sm">
                          {card.name || gc?.employee_name}
                          <span className="text-slate-400 text-xs font-normal ml-2">#{card.employee_id || gc?.employee_id_str}</span>
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">{card.designation || gc?.employee_designation}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {gc?.status && (
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusCfg[gc.status] || statusCfg.draft}`}>
                            {gc.status.replace(/_/g, ' ')}
                          </span>
                        )}
                        {canDownload && (
                          <button
                            onClick={e => { e.stopPropagation(); downloadScorecard(gc, selectedCycle?.name); }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-all shadow-sm">
                            <Download className="w-3 h-3" /> Scorecard
                          </button>
                        )}
                        {isExp ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {isExp && (
                      <div className="border-t border-slate-100 px-5 py-5 space-y-5">

                        {/* KPIs summary */}
                        {goals.length > 0 && (
                          <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Goals & KPIs</p>
                            {goals.map((g: any, gi: number) => (
                              <div key={gi} className="mb-3 rounded-xl border border-slate-200 overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                                  <span className="text-xs font-black text-slate-500 uppercase">{g.category}</span>
                                  <span className="mx-1 text-slate-300">·</span>
                                  <span className="text-sm font-bold text-slate-800">{g.title || '—'}</span>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs min-w-[600px]">
                                    <thead>
                                      <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-wider">KPI</th>
                                        <th className="px-3 py-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-wider">Wt%</th>
                                        <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-wider">Direction</th>
                                        <th className="px-3 py-2 text-right text-[9px] font-black text-slate-400 uppercase tracking-wider">Plan</th>
                                        <th className="px-3 py-2 text-right text-[9px] font-black text-slate-400 uppercase tracking-wider">Actual</th>
                                        <th className="px-3 py-2 text-right text-[9px] font-black text-amber-600 uppercase tracking-wider">Wt% (Mgr)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(g.kpis || []).map((k: any, ki: number) => (
                                        <tr key={ki} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                                          <td className="px-3 py-2.5 text-slate-700 font-semibold">{k.metric || '—'}</td>
                                          <td className="px-3 py-2.5 text-center text-slate-600 font-bold">{k.weightage || '—'}</td>
                                          <td className="px-3 py-2.5 text-slate-500">{k.parameter_type || '—'}</td>
                                          <td className="px-3 py-2.5 text-right text-slate-700 font-semibold">{k.target_value || '—'}</td>
                                          <td className="px-3 py-2.5 text-right text-slate-700 font-semibold">{k.actual_achievement || '—'}</td>
                                          <td className="px-3 py-2.5 text-right text-amber-700 font-black">{k.manager_score ?? '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Self Review */}
                        {selfAnswers.length > 0 && (
                          <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Self-Review Answers</p>
                            <div className="space-y-2">
                              {selfAnswers.map((ans: string, qi: number) => ans && (
                                <div key={qi} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                  <p className="text-[10px] font-bold text-slate-400 mb-1">Q{qi + 1}</p>
                                  <p className="text-slate-700 text-sm">{ans}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Manager Remarks */}
                        {gc?.manager_special_achievements && (
                          <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Manager Remarks</p>
                            <div className="grid grid-cols-3 gap-3">
                              {gc.manager_special_achievements && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                  <p className="text-[10px] font-bold text-slate-400 mb-1">Special Achievements</p>
                                  <p className="text-slate-700 text-sm">{gc.manager_special_achievements}</p>
                                </div>
                              )}
                              {gc.manager_promoted && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                  <p className="text-[10px] font-bold text-slate-400 mb-1">Promoted</p>
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${gc.manager_promoted === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{gc.manager_promoted}</span>
                                  {gc.manager_promoted_justification && <p className="text-slate-500 text-xs mt-1">{gc.manager_promoted_justification}</p>}
                                </div>
                              )}
                              {gc.manager_salary_correction && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                  <p className="text-[10px] font-bold text-slate-400 mb-1">Salary/Market Correction</p>
                                  <p className="text-slate-700 text-sm">{gc.manager_salary_correction}</p>
                                  {gc.manager_salary_justification && <p className="text-slate-500 text-xs mt-1">{gc.manager_salary_justification}</p>}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Leaderboard ── */}
        {tab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="text-slate-900 font-extrabold text-lg">Leaderboard — {selectedCycle?.name}</h3>
            </div>

            {leaderboard.length === 0 ? (
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-16 text-center">
                <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-bold">No published scores yet.</p>
                <p className="text-slate-400 text-sm mt-1">Scores will appear here after the appraisal cycle is finalized.</p>
              </div>
            ) : leaderboard.map((entry, idx) => (
              <div key={entry.employee_id}
                className={`bg-white border shadow-sm rounded-2xl flex items-center gap-5 p-5 ${idx === 0 ? 'border-amber-300' : idx === 1 ? 'border-slate-300' : idx === 2 ? 'border-orange-300' : 'border-slate-200'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black shrink-0 text-2xl ${idx === 0 ? 'bg-amber-50 border border-amber-200' : idx === 1 ? 'bg-slate-100 border border-slate-200' : idx === 2 ? 'bg-orange-50 border border-orange-200' : 'bg-slate-50 border border-slate-200 text-sm text-slate-500'}`}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-extrabold">{entry.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{entry.designation} · {entry.zone}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-black text-amber-500">{entry.review_score?.toFixed(2) ?? '—'}</p>
                  <p className="text-slate-400 text-xs">score</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
