import { useState, useEffect } from 'react';
import {
  Upload, Trophy, BarChart3, CheckCircle, Calendar,
  Users, TrendingUp, FileText, Award, Clock,
  ChevronDown, ChevronUp, Star,
} from 'lucide-react';
import { EOM_API } from '../../../Pages/EOMPage';

// ─── Constants ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['','January','February','March','April','May','June',
  'July','August','September','October','November','December'];

const STATUS_BADGE: Record<string, string> = {
  draft:            'bg-slate-100 text-slate-600 border-slate-200',
  submitted:        'bg-blue-50 text-blue-700 border-blue-200',
  manager_approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  manager_rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  hod_approved:     'bg-violet-50 text-violet-700 border-violet-200',
  hod_rejected:     'bg-orange-50 text-orange-700 border-orange-200',
  hr_finalized:     'bg-amber-50 text-amber-700 border-amber-200',
};

const SMART_LABELS = [
  { key: 'smart_specific',   letter: 'S', label: 'Specific'   },
  { key: 'smart_measurable', letter: 'M', label: 'Measurable' },
  { key: 'smart_achievable', letter: 'A', label: 'Achievable' },
  { key: 'smart_relevant',   letter: 'R', label: 'Relevant'   },
  { key: 'smart_timebound',  letter: 'T', label: 'Time-Bound' },
] as const;

// ─── Main HR View ─────────────────────────────────────────────────────────────

interface Props { hrUser: any; }

export function EOMHrView({ hrUser }: Props) {
  const [tab, setTab] = useState<'overview' | 'import' | 'cycle' | 'nominations'>('overview');

  // Data
  const [cycles,        setCycles]        = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [overview,      setOverview]      = useState<any>(null);
  const [nominations,   setNominations]   = useState<any[]>([]);

  // Import
  const [importFile,    setImportFile]    = useState<File | null>(null);
  const [importing,     setImporting]     = useState(false);
  const [importMsg,     setImportMsg]     = useState('');

  // Cycle creation
  const [newCycleName,    setNewCycleName]    = useState('');
  const [newCycleMonth,   setNewCycleMonth]   = useState<number>(new Date().getMonth() + 1);
  const [newCycleYear,    setNewCycleYear]    = useState<number>(new Date().getFullYear());
  const [creatingCycle,   setCreatingCycle]   = useState(false);
  const [cycleMsg,        setCycleMsg]        = useState('');

  // Nominations expand + finalize
  const [expanded,        setExpanded]        = useState<number | null>(null);
  const [hrRemarks,       setHrRemarks]       = useState<Record<number, string>>({});
  const [isWinner,        setIsWinner]        = useState<Record<number, boolean>>({});
  const [finalizing,      setFinalizing]      = useState<Record<number, boolean>>({});
  const [finalMsg,        setFinalMsg]        = useState<Record<number, string>>({});

  // ── Load cycles on mount ──
  useEffect(() => {
    fetch(`${EOM_API}/cycles/`)
      .then(r => r.json())
      .then(data => {
        setCycles(data);
        if (data.length > 0) setSelectedCycle(data[0]);
      }).catch(() => {});
  }, []);

  // ── Load cycle data when cycle changes ──
  useEffect(() => {
    if (!selectedCycle) return;
    fetch(`${EOM_API}/org/overview/?cycle_id=${selectedCycle.id}`)
      .then(r => r.json()).then(setOverview).catch(() => {});
    fetch(`${EOM_API}/all-nominations/?cycle_id=${selectedCycle.id}`)
      .then(r => r.json())
      .then((data: any[]) => {
        setNominations(data);
        const rem: Record<number, string>  = {};
        const win: Record<number, boolean> = {};
        data.forEach(n => { rem[n.id] = n.hr_remarks || ''; win[n.id] = n.is_winner || false; });
        setHrRemarks(rem);
        setIsWinner(win);
      }).catch(() => {});
  }, [selectedCycle]);

  // ── Employee import ──
  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true); setImportMsg('');
    const fd = new FormData(); fd.append('file', importFile);
    try {
      const res  = await fetch(`${EOM_API}/employees/import/`, { method: 'POST', body: fd });
      const data = await res.json();
      setImportMsg(`✅ ${data.message}${data.errors?.length ? ` · ${data.errors.length} error(s)` : ''}`);
      setImportFile(null);
    } catch { setImportMsg('❌ Import failed. Check the file format and try again.'); }
    finally { setImporting(false); }
  };

  const downloadTemplate = () => {
    const headers = ['Employee ID','Name','Email','Designation','Department','Zone / Location','Reporting Manager ID','HOD ID','User Type'];
    const sample = [
      ['EMP001','Rahul Sharma','rahul@company.com','Sales Executive','Sales','North Zone','MGR001','HOD001','employee'],
      ['EMP002','Priya Singh','priya@company.com','Area Manager','Sales','South Zone','MGR002','HOD001','employee'],
      ['MGR001','Amit Verma','amit@company.com','Zonal Manager','Sales','North Zone','','HOD001','manager'],
      ['HOD001','Ravi Kumar','ravi@company.com','Head of Department','Sales','','','','hod'],
      ['HR001','Sneha Patel','sneha@company.com','HR Manager','HR','','','','hr'],
    ];
    const csv = [headers.join(','), ...sample.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'EOM_Employee_Template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Create cycle ──
  const handleCreateCycle = async () => {
    if (!newCycleName.trim()) return;
    setCreatingCycle(true); setCycleMsg('');
    try {
      const res  = await fetch(`${EOM_API}/cycles/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCycleName.trim(),
          month: newCycleMonth,
          year:  newCycleYear,
          status: 'open',
          created_by: hrUser.name,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCycles(p => [data, ...p]);
        setSelectedCycle(data);
        setCycleMsg('✅ Cycle created! Employees can now submit nominations.');
        setNewCycleName('');
      } else {
        setCycleMsg('❌ ' + (data.detail || JSON.stringify(data)));
      }
    } catch { setCycleMsg('❌ Failed to create cycle.'); }
    finally { setCreatingCycle(false); }
  };

  const toggleCycleStatus = async (c: any) => {
    const newStatus = c.status === 'open' ? 'closed' : 'open';
    await fetch(`${EOM_API}/cycles/${c.id}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setCycles(p => p.map(x => x.id === c.id ? { ...x, status: newStatus } : x));
    if (selectedCycle?.id === c.id) setSelectedCycle((p: any) => ({ ...p, status: newStatus }));
  };

  // ── Finalize nomination ──
  const handleFinalize = async (nomId: number) => {
    setFinalizing(p => ({ ...p, [nomId]: true }));
    setFinalMsg(p => ({ ...p, [nomId]: '' }));
    try {
      const res  = await fetch(`${EOM_API}/nominations/${nomId}/hr-finalize/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hr_remarks: hrRemarks[nomId] || '', is_winner: isWinner[nomId] || false }),
      });
      const data = await res.json();
      if (res.ok) {
        setNominations(p => p.map(n => n.id === nomId ? data : n));
        setFinalMsg(p => ({ ...p, [nomId]: '✅ Finalized.' }));
      } else {
        setFinalMsg(p => ({ ...p, [nomId]: '❌ ' + (data.error || 'Failed.') }));
      }
    } catch { setFinalMsg(p => ({ ...p, [nomId]: '❌ Error. Try again.' })); }
    finally { setFinalizing(p => ({ ...p, [nomId]: false })); }
  };

  // ── Tabs ──
  const TABS = [
    { id: 'overview'     as const, label: 'Overview',    icon: BarChart3 },
    { id: 'import'       as const, label: 'Import Data', icon: Upload    },
    { id: 'cycle'        as const, label: 'Manage Cycles', icon: Calendar },
    { id: 'nominations'  as const, label: 'All Nominations', icon: Award },
  ];

  const statCards = [
    { label: 'Total Employees', value: overview?.total_employees, icon: Users,       color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200'    },
    { label: 'Submitted',       value: overview?.submitted,       icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Mgr Approved',    value: overview?.mgr_approved,    icon: TrendingUp,  color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200'  },
    { label: 'HOD Approved',    value: overview?.hod_approved,    icon: Award,       color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-200' },
    { label: 'HR Finalized',    value: overview?.hr_finalized,    icon: CheckCircle, color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200'    },
    { label: 'Winners',         value: overview?.winners,         icon: Trophy,      color: 'text-yellow-600',  bg: 'bg-yellow-50 border-yellow-200' },
    { label: 'Pending',         value: overview?.pending,         icon: Clock,       color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200'  },
  ];

  const barData = overview ? [
    { label: 'Submitted',    count: overview.submitted    },
    { label: 'Mgr Approved', count: overview.mgr_approved },
    { label: 'HOD Approved', count: overview.hod_approved },
    { label: 'HR Finalized', count: overview.hr_finalized },
    { label: 'Pending',      count: overview.pending      },
  ] : [];

  return (
    <div className="min-h-screen bg-slate-100 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />
          <div className="px-6 py-4 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-emerald-200 shrink-0">
              {hrUser.name?.[0] || 'A'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 uppercase tracking-widest">Admin</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 uppercase tracking-widest">Full Access</span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900">{hrUser.name || 'Administrator'}</h2>
              <p className="text-emerald-600 text-xs font-semibold">EOM Hub — Admin Panel</p>
            </div>
            {selectedCycle && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold
                ${selectedCycle.status === 'open'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                <Calendar className="w-3.5 h-3.5" />
                {selectedCycle.name}
                <span className="opacity-60">· {selectedCycle.status}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Tab Nav ── */}
        <div className="flex gap-1.5 bg-white border border-slate-200 shadow-sm rounded-2xl p-1.5 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap
                ${tab === t.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
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
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all border
                      ${selectedCycle?.id === c.id
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600'}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {overview ? (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {statCards.map(s => (
                    <div key={s.label} className={`bg-white border shadow-sm rounded-2xl p-4 flex flex-col gap-2 ${s.bg}`}>
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                      <p className={`text-2xl font-black ${s.color}`}>{s.value ?? 0}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bars */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <BarChart3 className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-slate-900 font-extrabold">Nomination Funnel — {selectedCycle?.name}</h4>
                  </div>
                  <div className="space-y-3">
                    {barData.map(({ label, count }) => (
                      <div key={label} className="flex items-center gap-4">
                        <span className="text-slate-600 text-sm w-36 font-semibold shrink-0">{label}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                            style={{ width: `${Math.min(100, ((count || 0) / (overview.total_employees || 1)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-slate-800 font-black text-sm w-8 text-right">{count ?? 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-16 text-center">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-bold">No cycle data found.</p>
                <p className="text-slate-400 text-sm mt-1">Go to <strong>Import Data</strong> to upload employees, then <strong>Manage Cycles</strong> to create a cycle.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Import Data ── */}
        {tab === 'import' && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 space-y-7">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Upload className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-slate-900 font-extrabold text-base">Import EOM Eligible Employees</h3>
                <p className="text-slate-500 text-sm mt-0.5">Upload the list of employees eligible for Employee of the Month. This is separate from the appraisal employee list.</p>
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

            {/* Column reference */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Columns in Template</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  ['Employee ID',          'Unique ID — e.g. EMP001'],
                  ['Name',                 'Full name'],
                  ['Email',                'For OTP login'],
                  ['Designation',          'Job title'],
                  ['Department',           'Team / department'],
                  ['Zone / Location',      'Location or unit'],
                  ['Reporting Manager ID', 'Manager\'s Employee ID'],
                  ['HOD ID',               'HOD\'s Employee ID'],
                  ['User Type',            'employee / manager / hod / hr'],
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
              <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-emerald-400 transition-all cursor-pointer group">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 group-hover:bg-emerald-50 transition-colors">
                  <Upload className="w-7 h-7 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </div>
                <p className="text-slate-600 font-semibold text-sm mb-1">
                  {importFile
                    ? <span className="text-emerald-600 font-bold">{importFile.name}</span>
                    : 'Click to choose file'}
                </p>
                <p className="text-slate-400 text-xs">Excel (.xlsx, .xls) or CSV</p>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setImportFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>

            <button onClick={handleImport} disabled={!importFile || importing}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2 shadow-md shadow-emerald-200 transition-all active:scale-[0.99]">
              {importing
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing...</>
                : <><Upload className="w-4 h-4" /> Import Employees</>}
            </button>

            {importMsg && (
              <div className={`text-sm font-semibold text-center py-3.5 px-5 rounded-xl border
                ${importMsg.startsWith('✅')
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                {importMsg}
              </div>
            )}
          </div>
        )}

        {/* ── Manage Cycles ── */}
        {tab === 'cycle' && (
          <div className="space-y-5">
            {/* Create new cycle */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-slate-900 font-extrabold text-base">Create Nomination Cycle</h3>
                  <p className="text-slate-500 text-sm mt-0.5">Open a new EOM cycle for a specific month. Employees can then submit their nominations.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Month</label>
                  <select value={newCycleMonth} onChange={e => setNewCycleMonth(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100">
                    {MONTH_NAMES.slice(1).map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Year</label>
                  <input type="number" value={newCycleYear} onChange={e => setNewCycleYear(Number(e.target.value))}
                    min={2024} max={2030}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Cycle Name</label>
                  <input type="text" value={newCycleName} onChange={e => setNewCycleName(e.target.value)}
                    placeholder={`EOM — ${MONTH_NAMES[newCycleMonth]} ${newCycleYear}`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 placeholder-slate-300" />
                </div>
              </div>

              <button
                onClick={() => {
                  if (!newCycleName.trim()) {
                    setNewCycleName(`Employee of the Month — ${MONTH_NAMES[newCycleMonth]} ${newCycleYear}`);
                  }
                  handleCreateCycle();
                }}
                disabled={creatingCycle}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2 shadow-md shadow-emerald-200 transition-all">
                {creatingCycle
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                  : <><Calendar className="w-4 h-4" /> Create &amp; Open Cycle</>}
              </button>
              {cycleMsg && (
                <div className={`text-sm font-semibold text-center py-3 px-5 rounded-xl border
                  ${cycleMsg.startsWith('✅') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                  {cycleMsg}
                </div>
              )}
            </div>

            {/* Existing cycles */}
            {cycles.map(c => (
              <div key={c.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <div className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-900 font-extrabold">{c.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{MONTH_NAMES[c.month]} {c.year}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold border
                    ${c.status === 'open'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {c.status === 'open' ? '● Open' : '○ Closed'}
                  </span>
                  <button onClick={() => toggleCycleStatus(c)}
                    className={`px-4 py-2 rounded-xl border font-bold text-xs transition-all
                      ${c.status === 'open'
                        ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'}`}>
                    {c.status === 'open' ? 'Close Cycle' : 'Reopen Cycle'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── All Nominations ── */}
        {tab === 'nominations' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Award className="w-4 h-4 text-emerald-500" />
              <h3 className="text-slate-900 font-extrabold">All Nominations — {selectedCycle?.name}</h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                {nominations.length} total
              </span>
            </div>

            {/* Cycle selector */}
            {cycles.length > 1 && (
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-5 py-3 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0">Cycle</span>
                {cycles.map(c => (
                  <button key={c.id} onClick={() => setSelectedCycle(c)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all border
                      ${selectedCycle?.id === c.id
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600'}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {nominations.length === 0 ? (
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-16 text-center">
                <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-bold">No nominations yet.</p>
                <p className="text-slate-400 text-sm mt-1">Employees will appear here once they start their nomination forms.</p>
              </div>
            ) : nominations.map((nom: any) => {
              const isExp = expanded === nom.id;
              return (
                <div key={nom.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                  {/* Row header */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-all"
                    onClick={() => setExpanded(isExp ? null : nom.id)}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center font-black text-emerald-700 text-sm shrink-0">
                      {(nom.employee_name || 'E')?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 font-bold text-sm">
                        {nom.employee_name}
                        <span className="text-slate-400 text-xs font-normal ml-2">#{nom.employee_id_str}</span>
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {nom.employee_designation} · {nom.employee_department}
                        {nom.track && <span className="ml-1 text-emerald-600 font-semibold">· {nom.track.replace('_', '-')}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {nom.is_winner && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700 text-[11px] font-bold">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> Winner
                        </span>
                      )}
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_BADGE[nom.status] || STATUS_BADGE.draft}`}>
                        {nom.status.replace(/_/g, ' ')}
                      </span>
                      {isExp ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded body */}
                  {isExp && (
                    <div className="border-t border-slate-100 px-5 py-5 space-y-5">

                      {/* Part A */}
                      {nom.part_a_achievement && (
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Part A — Achievement Summary</p>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {nom.part_a_achievement}
                          </div>
                        </div>
                      )}

                      {/* Part B — SMART */}
                      {SMART_LABELS.some(m => nom[m.key]) && (
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Part B — SMART Evidence</p>
                          <div className="space-y-2">
                            {SMART_LABELS.map(m => nom[m.key] ? (
                              <div key={m.key} className="rounded-xl border border-slate-200 overflow-hidden">
                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                                  <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
                                    <span className="text-white font-black text-[11px]">{m.letter}</span>
                                  </div>
                                  <span className="text-xs font-bold text-slate-700">{m.label}</span>
                                </div>
                                <p className="px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{nom[m.key]}</p>
                              </div>
                            ) : null)}
                          </div>
                        </div>
                      )}

                      {/* Part C — Evidence */}
                      {(nom.evidence_1_description || nom.evidence_2_description) && (
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Part C — Supporting Evidence</p>
                          <div className="space-y-2">
                            {[
                              { desc: nom.evidence_1_description, source: nom.evidence_1_source, n: 1 },
                              { desc: nom.evidence_2_description, source: nom.evidence_2_source, n: 2 },
                            ].filter(e => e.desc).map(e => (
                              <div key={e.n} className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                <span className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">{e.n}</span>
                                <div className="flex-1">
                                  <p className="text-sm text-slate-700">{e.desc}</p>
                                  {e.source && <p className="text-[11px] text-slate-400 mt-1">Source: {e.source}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Manager & HOD remarks */}
                      {(nom.manager_remarks || nom.hod_remarks) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {nom.manager_remarks && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Manager Remarks</p>
                              <p className="text-sm text-slate-700">{nom.manager_remarks}</p>
                            </div>
                          )}
                          {nom.hod_remarks && (
                            <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
                              <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-1">HOD Remarks</p>
                              <p className="text-sm text-slate-700">{nom.hod_remarks}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* HR Finalize section */}
                      <div className={`rounded-xl border p-5 space-y-4
                        ${nom.status === 'hr_finalized'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-emerald-50 border-emerald-200'}`}>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                          {nom.status === 'hr_finalized' ? 'HR Decision (Finalized)' : 'HR — Finalize This Nomination'}
                        </p>

                        <textarea
                          rows={3}
                          value={hrRemarks[nom.id] ?? nom.hr_remarks ?? ''}
                          onChange={e => setHrRemarks(p => ({ ...p, [nom.id]: e.target.value }))}
                          disabled={nom.status === 'hr_finalized'}
                          placeholder="Add HR remarks or feedback..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none disabled:bg-slate-50 disabled:text-slate-500 bg-white"
                        />

                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isWinner[nom.id] ?? nom.is_winner ?? false}
                            onChange={e => setIsWinner(p => ({ ...p, [nom.id]: e.target.checked }))}
                            disabled={nom.status === 'hr_finalized'}
                            className="w-4 h-4 accent-yellow-500"
                          />
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                            Mark as Employee of the Month Winner
                          </span>
                        </label>

                        {nom.status !== 'hr_finalized' && (
                          <button
                            onClick={() => handleFinalize(nom.id)}
                            disabled={finalizing[nom.id] || !['hod_approved', 'manager_approved', 'submitted'].includes(nom.status)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                            {finalizing[nom.id]
                              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Finalizing...</>
                              : <><CheckCircle className="w-4 h-4" /> Finalize Nomination</>}
                          </button>
                        )}

                        {finalMsg[nom.id] && (
                          <p className={`text-sm font-semibold ${finalMsg[nom.id].startsWith('✅') ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {finalMsg[nom.id]}
                          </p>
                        )}

                        {nom.status === 'hr_finalized' && (
                          <p className="text-xs text-amber-700 font-semibold">
                            Finalized on {nom.hr_finalized_at ? new Date(nom.hr_finalized_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                          </p>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
