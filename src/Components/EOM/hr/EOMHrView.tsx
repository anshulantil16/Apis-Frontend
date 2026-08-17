import { useState, useEffect } from 'react';
import {
  Upload, Trophy, BarChart3, CheckCircle, Calendar,
  Users, TrendingUp, FileText, Award, Clock,
  ChevronDown, ChevronUp, Star, RefreshCw, Trash2, Download,
} from 'lucide-react';
import { EOM_API } from '../../../features/eom/EOMPage';
import { generateEOMCertificate } from '../../../utils/generateEOMCertificate';
import { TOOL_STYLES } from '../../toolStyles';

const MONTH_NAMES = ['','January','February','March','April','May','June',
  'July','August','September','October','November','December'];

const STATUS_BADGE: Record<string, string> = {
  draft:          'bg-slate-100 text-slate-600 border-slate-200',
  submitted:      'bg-blue-50 text-blue-700 border-blue-200',
  hod_approved:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  hod_rejected:   'bg-rose-50 text-rose-700 border-rose-200',
  panel_approved: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  panel_rejected: 'bg-orange-50 text-orange-700 border-orange-200',
  hr_finalized:   'bg-amber-50 text-amber-700 border-amber-200',
};

const SMART_META = [
  { key: 'smart_specific',   letter: 'S', label: 'Specific'   },
  { key: 'smart_measurable', letter: 'M', label: 'Measurable' },
  { key: 'smart_achievable', letter: 'A', label: 'Achievable' },
  { key: 'smart_relevant',   letter: 'R', label: 'Relevant'   },
  { key: 'smart_timebound',  letter: 'T', label: 'Time-Bound' },
] as const;

const HOD_DIMS = [
  { key: 'hod_dim1', label: 'Business Impact & Measurable Outcome', max: 50 },
] as const;

const PANEL_DIMS_RO = [
  { key: 'panel_dim2', label: 'APIS Values (UPLIFT)',                                                                         max: 10 },
  { key: 'panel_dim3', label: 'Survey Participation, Compliance & Conduct, Fun Club Activities Participation',                max: 10 },
  { key: 'panel_dim4', label: 'Initiative & Entrepreneurial Problem-Solving',                                                 max: 10 },
  { key: 'panel_dim5', label: 'Efficiency, Cost & Resource Optimisation',                                                     max: 10 },
  { key: 'panel_dim6', label: 'Teamwork, Collaboration & People Development, Learning & Values Creation',                    max: 10 },
] as const;

interface Props { hrUser: any; }

export function EOMHrView({ hrUser }: Props) {
  const [tab, setTab] = useState<'overview' | 'import' | 'employees' | 'cycle' | 'nominations'>('overview');

  const [cycles,        setCycles]        = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [overview,      setOverview]      = useState<any>(null);
  const [nominations,   setNominations]   = useState<any[]>([]);
  const [importFile,    setImportFile]    = useState<File | null>(null);
  const [importing,     setImporting]     = useState(false);
  const [importMsg,     setImportMsg]     = useState('');
  const [newCycleName,  setNewCycleName]  = useState('');
  const [newCycleMonth, setNewCycleMonth] = useState<number>(new Date().getMonth() + 1);
  const [newCycleYear,  setNewCycleYear]  = useState<number>(new Date().getFullYear());
  const [creatingCycle, setCreatingCycle] = useState(false);
  const [cycleMsg,      setCycleMsg]      = useState('');
  const [expanded,      setExpanded]      = useState<number | null>(null);
  const [hrRemarks,     setHrRemarks]     = useState<Record<number, string>>({});
  const [isWinner,      setIsWinner]      = useState<Record<number, boolean>>({});
  const [finalizing,    setFinalizing]    = useState<Record<number, boolean>>({});
  const [finalMsg,      setFinalMsg]      = useState<Record<number, string>>({});
  const [refreshing,    setRefreshing]    = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [resetting,     setResetting]     = useState(false);
  const [employees,     setEmployees]     = useState<any[]>([]);
  const [empSearch,     setEmpSearch]     = useState('');
  const [editingEmp,    setEditingEmp]    = useState<any | null>(null);
  const [empSaving,     setEmpSaving]     = useState(false);
  const [showAddEmp,    setShowAddEmp]    = useState(false);
  const [newEmp,        setNewEmp]        = useState({ employee_id:'', name:'', email:'', designation:'', department:'', zone:'', hod_id:'', user_type:'employee', is_panel_member: false, is_hr: false });
  const [statusFilter,  setStatusFilter]  = useState<string>('all');
  const [panelMembers,  setPanelMembers]  = useState<string[]>(['', '', '']);
  const [panelSaving,   setPanelSaving]   = useState(false);
  const [panelMsg,      setPanelMsg]      = useState('');

  useEffect(() => {
    fetch(`${EOM_API}/cycles/`)
      .then(r => r.json())
      .then(data => { setCycles(data); if (data.length > 0) setSelectedCycle(data[0]); })
      .catch(() => {});
    fetch(`${EOM_API}/employees/`).then(r => r.json()).then(setEmployees).catch(() => {});
  }, []);

  const fetchEmployees = () =>
    fetch(`${EOM_API}/employees/`).then(r => r.json()).then(setEmployees).catch(() => {});

  const handleSaveEmp = async (emp: any) => {
    setEmpSaving(true);
    await fetch(`${EOM_API}/employees/${emp.employee_id}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emp),
    });
    setEditingEmp(null); setEmpSaving(false); fetchEmployees();
  };

  const handleDeactivateEmp = async (employee_id: string, name: string) => {
    if (!window.confirm(`Deactivate ${name}? They won't be able to log in or submit nominations.`)) return;
    await fetch(`${EOM_API}/employees/${employee_id}/`, { method: 'DELETE' });
    fetchEmployees();
  };

  const handleAddEmp = async () => {
    if (!newEmp.employee_id || !newEmp.name) return;
    setEmpSaving(true);
    await fetch(`${EOM_API}/employees/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmp),
    });
    setNewEmp({ employee_id:'', name:'', email:'', designation:'', department:'', zone:'', hod_id:'', user_type:'employee', is_panel_member: false, is_hr: false });
    setShowAddEmp(false); setEmpSaving(false); fetchEmployees();
  };

  const handleSavePanelMembers = async () => {
    if (!selectedCycle || panelMembers.every(m => !m)) {
      setPanelMsg('❌ Please select at least one panel member');
      setTimeout(() => setPanelMsg(''), 4000);
      return;
    }

    setPanelSaving(true);
    setPanelMsg('');
    try {
      const res = await fetch(`${EOM_API}/cycles/${selectedCycle.id}/panel-members/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panel_members: panelMembers.filter(m => m) }),
      });
      if (res.ok) {
        setPanelMsg('✅ Panel members saved successfully!');
        setTimeout(() => setPanelMsg(''), 4000);
      } else {
        setPanelMsg('❌ Failed to save panel members');
      }
    } catch (e) {
      setPanelMsg('❌ Error saving panel members');
    } finally {
      setPanelSaving(false);
    }
  };

  const fetchCycleData = (cycle: any, silent = false) => {
    if (!silent) setRefreshing(true);
    const h = { headers: { 'Cache-Control': 'no-cache' } };
    Promise.all([
      fetch(`${EOM_API}/org/overview/?cycle_id=${cycle.id}`, h).then(r => r.json()).then(setOverview),
      fetch(`${EOM_API}/all-nominations/?cycle_id=${cycle.id}`, h).then(r => r.json()).then((data: any[]) => {
        setNominations(data);
        const rem: Record<number,string>  = {};
        const win: Record<number,boolean> = {};
        data.forEach(n => { rem[n.id] = n.hr_remarks || ''; win[n.id] = n.is_winner || false; });
        setHrRemarks(rem); setIsWinner(win);
      }),
    ]).catch(() => {}).finally(() => {
      setRefreshing(false);
      setLastRefreshed(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    });
  };

  useEffect(() => {
    if (!selectedCycle) return;
    fetchCycleData(selectedCycle);
    const interval = setInterval(() => fetchCycleData(selectedCycle, true), 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCycle]);

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true); setImportMsg('');
    const fd = new FormData(); fd.append('file', importFile);
    try {
      const res  = await fetch(`${EOM_API}/employees/import/`, { method: 'POST', body: fd });
      const data = await res.json();
      setImportMsg(`✅ ${data.message}${data.errors?.length ? ` · ${data.errors.length} error(s)` : ''}`);
      setImportFile(null);
    } catch { setImportMsg('❌ Import failed.'); }
    finally { setImporting(false); }
  };

  const downloadTemplate = () => {
    const headers = ['Employee ID', 'Name', 'Email', 'Designation', 'Department', 'Zone/Location', 'HOD ID'];
    const sample = [
      ['EMP001', 'Rahul Sharma', 'rahul@company.com', 'Sales Executive', 'Sales', 'North Zone', 'HOD001'],
      ['EMP002', 'Priya Singh', 'priya@company.com', 'Sr Executive', 'Sales', 'South Zone', 'HOD001'],
      ['EMP003', 'Amit Verma', 'amit@company.com', 'Area Manager', 'Operations', 'East Zone', 'HOD002'],
      ['EMP004', 'Neha Gupta', 'neha@company.com', 'Executive', 'HR', 'HO', 'HOD002'],
      ['HOD001', 'Ravi Kumar', 'ravi@company.com', 'Zonal Head', 'Sales', 'North Zone', ''],
      ['HOD002', 'Meena Joshi', 'meena@company.com', 'Head of Dept', 'Operations', 'HO', ''],
    ];
    const csv = [headers.join(','), ...sample.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'EOM_Employee_Master_Template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleCreateCycle = async () => {
    const name = newCycleName.trim() || `Employee of the Month — ${MONTH_NAMES[newCycleMonth]} ${newCycleYear}`;
    setCreatingCycle(true); setCycleMsg('');
    try {
      const res  = await fetch(`${EOM_API}/cycles/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, month: newCycleMonth, year: newCycleYear, status: 'open', created_by: hrUser.name }),
      });
      const data = await res.json();
      if (res.ok) { setCycles(p => [data, ...p]); setSelectedCycle(data); setCycleMsg('✅ Cycle created!'); setNewCycleName(''); }
      else setCycleMsg('❌ ' + (data.detail || JSON.stringify(data)));
    } catch { setCycleMsg('❌ Failed.'); }
    finally { setCreatingCycle(false); }
  };

  const toggleCycle = async (c: any) => {
    const s = c.status === 'open' ? 'closed' : 'open';
    await fetch(`${EOM_API}/cycles/${c.id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }) });
    setCycles(p => p.map(x => x.id === c.id ? { ...x, status: s } : x));
    if (selectedCycle?.id === c.id) setSelectedCycle((p: any) => ({ ...p, status: s }));
  };

  const handleFinalize = async (nomId: number) => {
    setFinalizing(p => ({ ...p, [nomId]: true }));
    setFinalMsg(p => ({ ...p, [nomId]: '' }));
    try {
      const res  = await fetch(`${EOM_API}/nominations/${nomId}/hr-finalize/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hr_remarks: hrRemarks[nomId] || '', is_winner: isWinner[nomId] || false }),
      });
      const data = await res.json();
      if (res.ok) { setNominations(p => p.map(n => n.id === nomId ? data : n)); setFinalMsg(p => ({ ...p, [nomId]: '✅ Finalized.' })); }
      else setFinalMsg(p => ({ ...p, [nomId]: '❌ ' + (data.error || 'Failed.') }));
    } catch { setFinalMsg(p => ({ ...p, [nomId]: '❌ Error.' })); }
    finally { setFinalizing(p => ({ ...p, [nomId]: false })); }
  };

  const TABS = [
    { id: 'overview'    as const, label: 'Overview',         icon: BarChart3 },
    { id: 'import'      as const, label: 'Import Data',      icon: Upload    },
    { id: 'employees'   as const, label: 'Manage Employees', icon: Users     },
    { id: 'cycle'       as const, label: 'Manage Cycles',    icon: Calendar  },
    { id: 'nominations' as const, label: 'All Nominations',  icon: Award     },
  ];

  const statCards = [
    { label: 'Total Employees', value: overview?.total_employees, icon: Users,       color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200'    },
    { label: 'Submitted',       value: overview?.submitted,       icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'HOD Approved',    value: overview?.hod_approved,    icon: TrendingUp,  color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-200' },
    { label: 'Panel Approved',  value: overview?.panel_approved,  icon: CheckCircle, color: 'text-indigo-600',  bg: 'bg-indigo-50 border-indigo-200' },
    { label: 'HR Finalized',    value: overview?.hr_finalized,    icon: CheckCircle, color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200'    },
    { label: 'Winners',         value: overview?.winners,         icon: Trophy,      color: 'text-yellow-600',  bg: 'bg-yellow-50 border-yellow-200' },
    { label: 'Pending',         value: overview?.pending,         icon: Clock,       color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200'  },
  ];

  return (
    <div className="min-h-full bg-[#f5f7fa] p-4 lg:p-6">
      <style>{TOOL_STYLES}</style>
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden tp-reveal">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />
          <div className="px-6 py-4 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-emerald-200 shrink-0 tp-pop-in tp-border-flow" style={{ '--tp-c1': '#10b981', '--tp-c2': '#14b8a6' } as any}>
              {hrUser.name?.[0] || 'A'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 uppercase tracking-widest">Admin</span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900">{hrUser.name || 'Administrator'}</h2>
              <p className="text-emerald-600 text-xs font-semibold">EOM Hub — Admin Panel</p>
            </div>
            {selectedCycle && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold
                ${selectedCycle.status === 'open' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                <Calendar className="w-3.5 h-3.5" />{selectedCycle.name}
                <span className="opacity-60">· {selectedCycle.status}</span>
              </div>
            )}
            <a href={`${EOM_API}/export/${selectedCycle ? `?cycle_id=${selectedCycle.id}` : ''}`}
              target="_blank" rel="noreferrer"
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-all tp-tilt tp-sheen">
              <Download className="w-3.5 h-3.5" />
              Export Excel
            </a>
            <button
              onClick={async () => {
                if (!window.confirm('⚠️ WARNING: This will permanently delete ALL EOM data (employees, cycles, nominations). This CANNOT be undone.\n\nAre you sure?')) return;
                setResetting(true);
                try {
                  const res = await fetch(`${EOM_API}/admin/reset-database/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'RESET_EOM_DATABASE' }) });
                  if (res.ok) { alert('✅ Database reset successfully!'); window.location.reload(); }
                  else alert('❌ Reset failed.');
                } catch { alert('❌ Failed to connect.'); }
                finally { setResetting(false); }
              }}
              disabled={resetting}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-all disabled:opacity-40">
              <Trash2 className="w-3.5 h-3.5" />
              {resetting ? 'Resetting…' : 'Reset DB'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-white border border-slate-200 shadow-sm rounded-2xl p-1.5 overflow-x-auto tp-reveal">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap tp-tilt
                ${tab === t.id ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-200 tp-sheen' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-5">
            {/* Refresh button */}
            <div className="flex items-center justify-end gap-3">
              {lastRefreshed && (
                <span className="text-[11px] text-slate-400">Last updated: {lastRefreshed} · auto-refreshes every 30s</span>
              )}
              <button
                onClick={() => selectedCycle && fetchCycleData(selectedCycle)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all disabled:opacity-50 tp-tilt">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing…' : 'Refresh Now'}
              </button>
            </div>
            {cycles.length > 1 && (
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-5 py-3 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0">Cycle</span>
                {cycles.map(c => (
                  <button key={c.id} onClick={() => setSelectedCycle(c)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all
                      ${selectedCycle?.id === c.id ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600'}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            {overview ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {statCards.map((s, i) => (
                    <div key={s.label} style={{ animationDelay: `${i * 50}ms` }} className={`bg-white border shadow-sm rounded-2xl p-4 flex flex-col gap-2 tp-reveal tp-tilt ${s.bg}`}>
                      <s.icon className={`w-4 h-4 ${s.color} tp-pop-in`} />
                      <p className={`text-2xl font-black ${s.color}`}>{s.value ?? 0}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 tp-reveal">
                  <div className="flex items-center gap-3 mb-5">
                    <BarChart3 className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-slate-900 font-extrabold">Nomination Funnel — {selectedCycle?.name}</h4>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Submitted',      v: overview.submitted      },
                      { label: 'HOD Approved',   v: overview.hod_approved   },
                      { label: 'Panel Approved', v: overview.panel_approved },
                      { label: 'HR Finalized',   v: overview.hr_finalized   },
                      { label: 'Pending',        v: overview.pending        },
                    ].map(({ label, v }) => (
                      <div key={label} className="flex items-center gap-4">
                        <span className="text-slate-600 text-sm w-32 font-semibold shrink-0">{label}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                            style={{ width: `${Math.min(100,((v||0)/(overview.total_employees||1))*100)}%` }} />
                        </div>
                        <span className="text-slate-800 font-black text-sm w-8 text-right">{v ?? 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-16 text-center">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-bold">No cycle data found.</p>
                <p className="text-slate-400 text-sm mt-1">Go to <strong>Import Data</strong> first, then <strong>Manage Cycles</strong>.</p>
              </div>
            )}
          </div>
        )}

        {/* Import */}
        {tab === 'import' && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 space-y-7 tp-reveal">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 tp-pop-in">
                <Upload className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-slate-900 font-extrabold text-base">Import EOM Eligible Employees</h3>
                <p className="text-slate-500 text-sm mt-0.5">This list is separate from the appraisal employees. Only 3 roles: employee, hod, hr.</p>
              </div>
            </div>
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-2xl px-6 py-4 gap-4">
              <div>
                <p className="text-indigo-800 font-bold text-sm">Step 1 — Download the Template</p>
                <p className="text-indigo-500 text-xs mt-0.5">Pre-formatted CSV with sample rows</p>
              </div>
              <button onClick={downloadTemplate}
                className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all tp-tilt tp-sheen">
                <FileText className="w-4 h-4" /> Download Template
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Column Guide</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  ['Employee ID',     'Unique code e.g. EMP001'],
                  ['Name',            'Full name'],
                  ['Email',           'OTP login email'],
                  ['Designation',     'Job title'],
                  ['Department',      'Team / department'],
                  ['Zone / Location', 'Zone, region or HO'],
                  ['HOD ID',          'HOD\'s Employee ID (blank for HOD/Panel/HR)'],
                  ['User Type',       'employee · hod · panel · hr'],
                ].map(([col, desc]) => (
                  <div key={col} className="bg-white border border-slate-200 rounded-xl p-3">
                    <p className="text-slate-800 text-xs font-bold">{col}</p>
                    <p className="text-slate-400 text-[10px] mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5 text-xs">
                <p className="font-black text-amber-700 uppercase tracking-widest text-[10px] mb-2">Multi-Role Support</p>
                {[
                  ['Employee + HOD',   'Set HOD ID of other employees to this person\'s code — HOD role is auto-detected'],
                  ['Employee + HOD',   'User Type = employee, others list them as their HOD ID'],
                  ['HOD + Panel',      'User Type = hod+panel'],
                  ['Employee +HOD +Panel', 'User Type = employee, others list as HOD ID (gives HOD), then manually change to hod+panel if needed for panel access'],
                ].map(([combo, desc]) => (
                  <div key={combo} className="flex gap-2">
                    <span className="font-black text-amber-800 w-36 shrink-0">{combo}</span>
                    <span className="text-amber-700">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Step 2 — Upload Filled Sheet</p>
              <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-emerald-400 transition-all cursor-pointer group">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 group-hover:bg-emerald-50 transition-colors">
                  <Upload className="w-7 h-7 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </div>
                <p className="text-slate-600 font-semibold text-sm mb-1">
                  {importFile ? <span className="text-emerald-600 font-bold">{importFile.name}</span> : 'Click to choose file'}
                </p>
                <p className="text-slate-400 text-xs">Excel (.xlsx) or CSV</p>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setImportFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>
            <button onClick={handleImport} disabled={!importFile || importing}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2 transition-all tp-tilt tp-sheen">
              {importing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing...</> : <><Upload className="w-4 h-4" /> Import Employees</>}
            </button>
            {importMsg && (
              <div className={`text-sm font-semibold text-center py-3.5 px-5 rounded-xl border
                ${importMsg.startsWith('✅') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                {importMsg}
              </div>
            )}
          </div>
        )}

        {/* Manage Employees */}
        {tab === 'employees' && (
          <div className="space-y-4">
            {/* Panel Members Selection for Current Cycle */}
            {selectedCycle && (
              <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6 tp-reveal">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 tp-pop-in">
                    <span className="text-blue-700 font-black text-sm">👥</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-slate-800">Panel Members for {selectedCycle.name}</h3>
                    <p className="text-sm text-slate-400 mt-0.5">Select up to 3 employees to review all nominations for this cycle.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {[0, 1, 2].map(idx => (
                    <div key={idx}>
                      <label className="text-xs font-bold text-slate-500 block mb-2">Panel Member {idx + 1}</label>
                      <select
                        value={panelMembers[idx] || ''}
                        onChange={e => {
                          const newPanel = [...panelMembers];
                          newPanel[idx] = e.target.value;
                          setPanelMembers(newPanel);
                        }}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white">
                        <option value="">-- Select Employee --</option>
                        {employees.map(e => (
                          <option key={e.employee_id} value={e.employee_id}>{e.name} ({e.employee_id})</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                {panelMsg && (
                  <div className={`mb-4 p-3 rounded-lg border text-sm font-semibold ${
                    panelMsg.includes('✅')
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}>
                    {panelMsg}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePanelMembers}
                    disabled={panelSaving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-sm rounded-lg transition-all tp-tilt tp-sheen">
                    {panelSaving ? 'Saving...' : '✓ Save Panel Members'}
                  </button>
                  <span className="text-xs text-slate-400 py-2">
                    {panelMembers.filter(m => m).length} member{panelMembers.filter(m => m).length !== 1 ? 's' : ''} selected
                  </span>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 tp-reveal">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-black text-slate-800">Employee Directory</h3>
                  <p className="text-sm text-slate-400 mt-0.5">Add individual employees, edit details, or deactivate. Import Excel for bulk changes.</p>
                </div>
                <button onClick={() => setShowAddEmp(v => !v)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all tp-tilt tp-sheen">
                  + Add Employee
                </button>
              </div>

              {showAddEmp && (
                <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                  <p className="font-bold text-emerald-800 text-sm">New Employee</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[['employee_id','Employee Code*'],['name','Name*'],['email','Email'],['designation','Designation'],['department','Department'],['zone','Zone'],['hod_id','HOD Code']].map(([k,l]) => (
                      <div key={k}>
                        <label className="text-xs font-bold text-slate-500 block mb-1">{l}</label>
                        <input value={(newEmp as any)[k]} onChange={e => setNewEmp(p => ({...p,[k]:e.target.value}))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">User Type</label>
                      <select value={newEmp.user_type} onChange={e => setNewEmp(p => ({...p,user_type:e.target.value}))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400">
                        <option value="employee">Employee — Can fill form</option>
                        <option value="hod">HOD Only — Reviews HOD</option>
                        <option value="panel">Panel Only — Reviews Panel</option>
                        <option value="hod+panel">HOD + Panel — Reviews both</option>
                        <option value="hr">HR Admin — Manages all</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleAddEmp} disabled={empSaving || !newEmp.employee_id || !newEmp.name}
                      className="px-4 py-2 bg-emerald-600 text-white font-bold text-sm rounded-xl disabled:opacity-40">
                      {empSaving ? 'Saving…' : 'Save Employee'}
                    </button>
                    <button onClick={() => setShowAddEmp(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">Cancel</button>
                  </div>
                </div>
              )}

              <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="Search by name, code, department..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-blue-400" />

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      {['Code','Name','Email','Designation','Department','Zone','HOD Code','Actions'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.filter(e =>
                      !empSearch || `${e.employee_id} ${e.name} ${e.department} ${e.zone}`.toLowerCase().includes(empSearch.toLowerCase())
                    ).map(emp => (
                      <tr key={emp.employee_id} className="hover:bg-slate-50">
                        {editingEmp?.employee_id === emp.employee_id ? (
                          <>
                            <td className="px-3 py-2 font-mono text-xs text-slate-500">{emp.employee_id}</td>
                            {['name','email','designation','department','zone','hod_id'].map(f => (
                              <td key={f} className="px-2 py-1">
                                <input value={editingEmp[f]||''} onChange={e => setEditingEmp((p:any) => ({...p,[f]:e.target.value}))}
                                  className="w-full border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none" />
                              </td>
                            ))}
                            <td className="px-2 py-1">
                              <select value={editingEmp.user_type} onChange={e => setEditingEmp((p:any) => ({...p,user_type:e.target.value}))}
                                className="border border-blue-300 rounded px-2 py-1 text-xs">
                                <option value="employee">Employee</option>
                                <option value="hod">HOD</option>
                                <option value="panel">Panel</option>
                                <option value="hr">HR</option>
                              </select>
                            </td>
                            <td className="px-3 py-2 flex gap-1">
                              <button onClick={() => handleSaveEmp(editingEmp)} disabled={empSaving}
                                className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded">Save</button>
                              <button onClick={() => setEditingEmp(null)} className="px-2 py-1 text-slate-500 text-xs font-bold">Cancel</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 font-mono text-xs text-slate-600">{emp.employee_id}</td>
                            <td className="px-3 py-2 font-semibold text-slate-800">{emp.name}</td>
                            <td className="px-3 py-2 text-slate-500 text-xs">{emp.email}</td>
                            <td className="px-3 py-2 text-slate-500 text-xs">{emp.designation}</td>
                            <td className="px-3 py-2 text-slate-500 text-xs">{emp.department}</td>
                            <td className="px-3 py-2 text-slate-500 text-xs">{emp.zone}</td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-400">{emp.hod_id}</td>
                            <td className="px-3 py-2 flex gap-1">
                              <button onClick={() => setEditingEmp({...emp})}
                                className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded hover:bg-blue-100">Edit</button>
                              <button onClick={() => handleDeactivateEmp(emp.employee_id, emp.name)}
                                className="px-2 py-1 bg-rose-50 text-rose-600 text-xs font-bold rounded hover:bg-rose-100">Remove</button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {employees.length === 0 && (
                  <p className="text-center text-slate-400 py-8 text-sm">No employees imported yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Manage Cycles */}
        {tab === 'cycle' && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 space-y-5 tp-reveal">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 tp-pop-in">
                  <Calendar className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-slate-900 font-extrabold text-base">Create Nomination Cycle</h3>
                  <p className="text-slate-500 text-sm mt-0.5">Open a new EOM cycle for a specific month.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Month</label>
                  <select value={newCycleMonth} onChange={e => setNewCycleMonth(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold text-sm focus:outline-none focus:border-emerald-400">
                    {MONTH_NAMES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Year</label>
                  <input type="number" value={newCycleYear} onChange={e => setNewCycleYear(Number(e.target.value))} min={2024} max={2030}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Cycle Name (optional)</label>
                  <input type="text" value={newCycleName} onChange={e => setNewCycleName(e.target.value)}
                    placeholder={`EOM — ${MONTH_NAMES[newCycleMonth]} ${newCycleYear}`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold text-sm focus:outline-none focus:border-emerald-400 placeholder-slate-300" />
                </div>
              </div>
              <button onClick={handleCreateCycle} disabled={creatingCycle}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2 transition-all tp-tilt tp-sheen">
                {creatingCycle ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</> : <><Calendar className="w-4 h-4" /> Create &amp; Open Cycle</>}
              </button>
              {cycleMsg && (
                <div className={`text-sm font-semibold text-center py-3 px-5 rounded-xl border
                  ${cycleMsg.startsWith('✅') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                  {cycleMsg}
                </div>
              )}
            </div>
            {cycles.map((c, i) => (
              <div key={c.id} style={{ animationDelay: `${i * 60}ms` }} className="bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-4 flex items-center gap-4 tp-reveal tp-tilt">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-900 font-extrabold">{c.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{MONTH_NAMES[c.month]} {c.year}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold border
                  ${c.status === 'open' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {c.status === 'open' ? '● Open' : '○ Closed'}
                </span>
                <button onClick={() => toggleCycle(c)}
                  className={`px-4 py-2 rounded-xl border font-bold text-xs transition-all tp-tilt
                    ${c.status === 'open' ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'}`}>
                  {c.status === 'open' ? 'Close' : 'Reopen'}
                </button>
              </div>
            ))}

          </div>
        )}

        {/* All Nominations */}
        {tab === 'nominations' && (() => {
          const STATUS_FILTERS = [
            { key: 'all',           label: 'All',            style: 'bg-slate-700 text-white border-slate-700',            inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-400' },
            { key: 'submitted',     label: 'Submitted',      style: 'bg-blue-600 text-white border-blue-600',              inactive: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400' },
            { key: 'hod_approved',  label: 'HOD Approved',   style: 'bg-emerald-600 text-white border-emerald-600',        inactive: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400' },
            { key: 'hod_rejected',  label: 'HOD Rejected',   style: 'bg-rose-600 text-white border-rose-600',              inactive: 'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-400' },
            { key: 'panel_approved',label: 'Panel Approved', style: 'bg-indigo-600 text-white border-indigo-600',          inactive: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-400' },
            { key: 'panel_rejected',label: 'Panel Rejected', style: 'bg-orange-600 text-white border-orange-600',          inactive: 'bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400' },
            { key: 'hr_finalized',  label: 'HR Finalized',   style: 'bg-amber-500 text-white border-amber-500',            inactive: 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400' },
          ];

          // Cumulative stage membership — a nomination appears in every stage it passed through
          const stageMatch = (status: string, filter: string): boolean => {
            const order = ['submitted','hod_approved','hod_rejected','panel_approved','panel_rejected','hr_finalized'];
            if (!order.includes(status)) return false;
            switch (filter) {
              case 'submitted':      return true; // any non-draft = was submitted
              case 'hod_approved':   return ['hod_approved','panel_approved','panel_rejected','hr_finalized'].includes(status);
              case 'hod_rejected':   return status === 'hod_rejected';
              case 'panel_approved': return ['panel_approved','hr_finalized'].includes(status);
              case 'panel_rejected': return status === 'panel_rejected';
              case 'hr_finalized':   return status === 'hr_finalized';
              default: return false;
            }
          };

          const counts: Record<string, number> = { all: nominations.length };
          ['submitted','hod_approved','hod_rejected','panel_approved','panel_rejected','hr_finalized'].forEach(f => {
            counts[f] = nominations.filter(n => stageMatch(n.status, f)).length;
          });

          const scored = [...nominations]
            .map(n => ({
              ...n,
              _total: (n.hod_dim1_score||0) +
                      (n.panel_dim2_score||0)+(n.panel_dim3_score||0)+
                      (n.panel_dim4_score||0)+(n.panel_dim5_score||0)+(n.panel_dim6_score||0)+
                      (n.panel_sustainability_bonus||0),
            }))
            .sort((a, b) => b._total - a._total);

          const visible = statusFilter === 'all'
            ? scored
            : scored.filter(n => stageMatch(n.status, statusFilter));

          return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Award className="w-4 h-4 text-emerald-500" />
              <h3 className="text-slate-900 font-extrabold">All Nominations — {selectedCycle?.name}</h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">{nominations.length} total</span>
            </div>

            {/* Cycle selector */}
            {cycles.length > 1 && (
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-5 py-3 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0">Month</span>
                {cycles.map(c => (
                  <button key={c.id} onClick={() => { setSelectedCycle(c); setStatusFilter('all'); }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all
                      ${selectedCycle?.id === c.id ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-300'}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {/* Status filter chips */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-5 py-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0 mr-1">Filter</span>
                {STATUS_FILTERS.map(f => {
                  const count = counts[f.key] ?? 0;
                  const isActive = statusFilter === f.key;
                  return (
                    <button key={f.key} onClick={() => setStatusFilter(f.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition-all
                        ${isActive ? f.style : f.inactive}`}>
                      {f.label}
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full
                        ${isActive ? 'bg-white/30' : 'bg-slate-900/10'}`}>
                        {f.key === 'all' ? nominations.length : count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-12 text-center">
                <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-bold">No nominations with status "{statusFilter.replace(/_/g,' ')}".</p>
              </div>
            ) : visible.map((nom: any, rank: number) => {
              const isExp = expanded === nom.id;
              const hodTotal = nom._total;
              const isTopScorer = rank === 0 && hodTotal > 0;
              return (
                <div key={nom.id} style={{ animationDelay: `${Math.min(rank, 10) * 40}ms` }} className={`bg-white shadow-sm rounded-2xl overflow-hidden border tp-reveal tp-tilt ${isTopScorer ? 'border-yellow-300' : 'border-slate-200'}`}>
                  {isTopScorer && (
                    <div className="h-1 bg-gradient-to-r from-yellow-400 to-amber-400" />
                  )}
                  <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-all" onClick={() => setExpanded(isExp ? null : nom.id)}>
                    {/* Rank badge */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 tp-pop-in
                      ${rank === 0 && hodTotal > 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                        rank === 1 && hodTotal > 0 ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                        rank === 2 && hodTotal > 0 ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                        'bg-slate-50 text-slate-400 border border-slate-100 text-xs'}`}>
                      {hodTotal > 0 ? (rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank+1}`) : '—'}
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center font-black text-emerald-700 text-sm shrink-0 tp-pop-in">
                      {(nom.employee_name||'E')?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 font-bold text-sm">
                        {nom.employee_name}
                        <span className="text-slate-400 text-xs font-normal ml-2">#{nom.employee_id_str}</span>
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {nom.employee_designation} · {nom.employee_department}
                        {nom.track && <span className="ml-1 text-emerald-600 font-semibold">· {nom.track.replace('_','-')}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {hodTotal > 0 && (
                        <span className={`text-xs font-black px-2.5 py-1 rounded-full border
                          ${isTopScorer ? 'bg-yellow-50 border-yellow-300 text-yellow-800' : 'bg-violet-50 border-violet-200 text-violet-700'}`}>
                          {hodTotal}/100{nom.panel_sustainability_bonus ? ` +${nom.panel_sustainability_bonus}⭐` : ''}
                        </span>
                      )}
                      {nom.is_winner && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700 text-[11px] font-bold tp-pop-in">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> Winner
                        </span>
                      )}
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_BADGE[nom.status]||STATUS_BADGE.draft}`}>
                        {nom.status.replace(/_/g,' ')}
                      </span>
                      {hodTotal > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); generateEOMCertificate(nom, selectedCycle); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-700 text-[11px] font-bold hover:bg-amber-100 transition-all shrink-0 tp-tilt tp-sheen">
                          <Award className="w-3 h-3" /> Certificate
                        </button>
                      )}
                      {isExp ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {isExp && (
                    <div className="border-t border-slate-100 px-5 py-5 space-y-5">

                      {/* Supporting Document */}
                      {nom.support_document_name && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 text-sm">📄</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supporting Document</p>
                            <p className="text-sm font-semibold text-blue-800 truncate">{nom.support_document_name}</p>
                          </div>
                          {nom.support_document_url && (
                            <a href={nom.support_document_url} target="_blank" rel="noreferrer"
                              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all">
                              ↓ Download
                            </a>
                          )}
                        </div>
                      )}

                      {/* Employee form summary */}
                      {nom.part_a_achievement && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Part A — Achievement Summary</p>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{nom.part_a_achievement}</div>
                        </div>
                      )}
                      {SMART_META.some(m => nom[m.key]) && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Part B — SMART Evidence</p>
                          <div className="space-y-1.5">
                            {SMART_META.map(m => nom[m.key] ? (
                              <div key={m.key} className="rounded-lg border border-slate-200 overflow-hidden flex">
                                <div className="w-7 bg-emerald-500 flex items-center justify-center shrink-0">
                                  <span className="text-white font-black text-[11px]">{m.letter}</span>
                                </div>
                                <p className="px-3 py-2 text-sm text-slate-700">{nom[m.key]}</p>
                              </div>
                            ) : null)}
                          </div>
                        </div>
                      )}

                      {/* HOD scorecard */}
                      {nom.hod_dim1_score != null && (
                        <div className="space-y-3">
                          {/* HOD Section */}
                          <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest">HOD Scorecard (Annexure B)</p>
                          <div className="rounded-xl border border-violet-200 overflow-hidden">
                            <div className="grid grid-cols-[2rem_1fr_4rem_1fr] bg-violet-50 border-b border-violet-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <div className="px-3 py-2">#</div>
                              <div className="px-3 py-2">Dimension</div>
                              <div className="px-3 py-2 text-center">Score</div>
                              <div className="px-3 py-2">Comments</div>
                            </div>
                            {HOD_DIMS.map((d, i) => (
                              <div key={d.key} className="grid grid-cols-[2rem_1fr_4rem_1fr] border-b border-slate-100 bg-white">
                                <div className="px-3 py-2.5 text-xs font-black text-slate-400">{i+1}</div>
                                <div className="px-3 py-2.5 text-xs text-slate-700 font-medium">{d.label} <span className="text-slate-400 font-normal">(max {d.max})</span></div>
                                <div className="px-3 py-2.5 text-center font-black text-violet-700">{nom[`${d.key}_score`] ?? '—'}</div>
                                <div className="px-3 py-2.5 text-xs text-slate-600">{nom[`${d.key}_comments`] || <span className="text-slate-300 italic">—</span>}</div>
                              </div>
                            ))}
                            <div className="grid grid-cols-[2rem_1fr_4rem_1fr] bg-violet-50 border-t-2 border-violet-200">
                              <div className="px-3 py-2.5" />
                              <div className="px-3 py-2.5 text-xs font-black text-slate-700">HOD Total</div>
                              <div className="px-3 py-2.5 text-center font-black text-violet-700 text-base">{nom.hod_dim1_score ?? '—'}</div>
                              <div className="px-3 py-2.5 text-xs text-slate-500">
                                {nom.hod_recommendation === 'recommend' ? '✅ Recommended' : nom.hod_recommendation === 'not_recommend' ? '❌ Not Recommended' : ''}
                              </div>
                            </div>
                          </div>
                          {nom.hod_remarks && (
                            <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
                              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-1">HOD Remarks</p>
                              <p className="text-sm text-slate-700">{nom.hod_remarks}</p>
                            </div>
                          )}

                          {/* Panel Section */}
                          {nom.panel_dim2_score != null && (
                            <>
                              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest pt-1">Panel Scorecard (Annexure C)</p>
                              <div className="rounded-xl border border-indigo-200 overflow-hidden">
                                <div className="grid grid-cols-[2rem_1fr_4rem_1fr] bg-indigo-50 border-b border-indigo-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  <div className="px-3 py-2">#</div>
                                  <div className="px-3 py-2">Dimension</div>
                                  <div className="px-3 py-2 text-center">Score</div>
                                  <div className="px-3 py-2">Comments</div>
                                </div>
                                {PANEL_DIMS_RO.map((d, i) => (
                                  <div key={d.key} className={`grid grid-cols-[2rem_1fr_4rem_1fr] border-b border-slate-100 last:border-0 ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                                    <div className="px-3 py-2.5 text-xs font-black text-slate-400">{i+1}</div>
                                    <div className="px-3 py-2.5 text-xs text-slate-700 font-medium">{d.label} <span className="text-slate-400 font-normal">(max {d.max})</span></div>
                                    <div className="px-3 py-2.5 text-center font-black text-indigo-700">{nom[`${d.key}_score`] ?? '—'}</div>
                                    <div className="px-3 py-2.5 text-xs text-slate-600">{nom[`${d.key}_comments`] || <span className="text-slate-300 italic">—</span>}</div>
                                  </div>
                                ))}
                                {nom.panel_sustainability_bonus != null && nom.panel_sustainability_bonus > 0 && (
                                  <div className="grid grid-cols-[2rem_1fr_4rem_1fr] border-b border-slate-100 bg-amber-50">
                                    <div className="px-3 py-2.5 text-xs font-black text-slate-400">★</div>
                                    <div className="px-3 py-2.5 text-xs text-slate-700 font-medium">Sustainability Bonus</div>
                                    <div className="px-3 py-2.5 text-center font-black text-amber-600">+{nom.panel_sustainability_bonus}</div>
                                    <div className="px-3 py-2.5 text-xs text-slate-600">{nom.panel_sustainability_desc || <span className="text-slate-300 italic">—</span>}</div>
                                  </div>
                                )}
                                <div className="grid grid-cols-[2rem_1fr_4rem_1fr] bg-indigo-50 border-t-2 border-indigo-200">
                                  <div className="px-3 py-2.5" />
                                  <div className="px-3 py-2.5 text-xs font-black text-slate-700">Panel Total</div>
                                  <div className="px-3 py-2.5 text-center font-black text-indigo-700 text-base">
                                    {(nom.panel_dim2_score||0)+(nom.panel_dim3_score||0)+(nom.panel_dim4_score||0)+(nom.panel_dim5_score||0)+(nom.panel_dim6_score||0)+(nom.panel_sustainability_bonus||0)}
                                  </div>
                                  <div className="px-3 py-2.5 text-xs text-slate-500">
                                    {nom.panel_recommendation === 'recommend' ? '✅ Recommended' : nom.panel_recommendation === 'not_recommend' ? '❌ Not Recommended' : ''}
                                  </div>
                                </div>
                              </div>
                              {nom.panel_remarks && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Panel Remarks</p>
                                  <p className="text-sm text-slate-700">{nom.panel_remarks}</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* HR Finalize */}
                      <div className={`rounded-xl border p-5 space-y-4
                        ${nom.status === 'hr_finalized' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                          {nom.status === 'hr_finalized' ? 'HR Decision (Finalized)' : 'HR — Finalize This Nomination'}
                        </p>
                        <textarea rows={3} value={hrRemarks[nom.id] ?? nom.hr_remarks ?? ''}
                          onChange={e => setHrRemarks(p => ({ ...p, [nom.id]: e.target.value }))}
                          disabled={nom.status === 'hr_finalized'}
                          placeholder="Add HR remarks..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none disabled:bg-slate-50 bg-white" />
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox"
                            checked={isWinner[nom.id] ?? nom.is_winner ?? false}
                            onChange={e => setIsWinner(p => ({ ...p, [nom.id]: e.target.checked }))}
                            disabled={nom.status === 'hr_finalized'}
                            className="w-4 h-4 accent-yellow-500" />
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-400 tp-pop-in" /> Mark as Employee of the Month Winner
                          </span>
                        </label>
                        {nom.status !== 'hr_finalized' && (
                          <button onClick={() => handleFinalize(nom.id)}
                            disabled={finalizing[nom.id] || !['hod_approved','panel_approved','submitted'].includes(nom.status)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed tp-tilt tp-sheen">
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
                        {nom.status === 'hr_finalized' && nom.hr_finalized_at && (
                          <p className="text-xs text-amber-700 font-semibold">
                            Finalized on {new Date(nom.hr_finalized_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })()}
      </div>
    </div>
  );
}

