import { useState, useEffect } from 'react';
import {
  Upload, Plus, Trophy, Star, BarChart3, CheckCircle, Calendar,
  Users, AlertTriangle, TrendingUp, Shield, Award, Zap, FileText,
} from 'lucide-react';
import { PERF_API } from '../../../Pages/PerformancePage';

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s}
          onClick={() => !readonly && onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => setHover(0)}
          disabled={readonly}
          className={`transition-all ${!readonly ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}>
          <Star className={`w-4 h-4 transition-colors ${s <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
        </button>
      ))}
    </div>
  );
}

const BAND_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  outstanding: { bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   text: 'text-amber-300',   icon: '🏆' },
  exceeds:     { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-300', icon: '⭐' },
  meets:       { bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    text: 'text-blue-300',    icon: '✅' },
  below:       { bg: 'bg-orange-500/15',  border: 'border-orange-500/30',  text: 'text-orange-300',  icon: '⚠️' },
  poor:        { bg: 'bg-rose-500/15',    border: 'border-rose-500/30',    text: 'text-rose-300',    icon: '❌' },
};

const RANK_MEDAL: Record<number, { emoji: string; bg: string; border: string }> = {
  1: { emoji: '🥇', bg: 'bg-amber-500/15',  border: 'border-amber-500/30' },
  2: { emoji: '🥈', bg: 'bg-slate-400/10',  border: 'border-slate-400/20' },
  3: { emoji: '🥉', bg: 'bg-orange-600/15', border: 'border-orange-600/25' },
};

export function HRView({ hrUser }: { hrUser: any }) {
  const [tab, setTab] = useState<'overview' | 'import' | 'cycles' | 'reviews' | 'leaderboard'>('overview');
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [newCycle, setNewCycle] = useState({
    name: '', quarter: 1, fiscal_year: '2025-26',
    goal_setting_deadline: '', review_start_date: '', review_deadline: '',
  });
  const [creatingCycle, setCreatingCycle] = useState(false);
  const [cycleMsg, setCycleMsg] = useState('');
  const [finalizingId, setFinalizingId] = useState<number | null>(null);
  const [hrRatings, setHrRatings] = useState<Record<number, any>>({});
  const [finalizeMsg, setFinalizeMsg] = useState<Record<number, string>>({});
  const [resetting, setResetting] = useState(false);
  const [expandedReview, setExpandedReview] = useState<number | null>(null);

  const handleResetDatabase = async () => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete ALL cycles, employees, goal cards, reviews, and logs from the Performance Hub. This action CANNOT be undone.\n\nAre you sure you want to clear the entire performance database?')) return;
    setResetting(true);
    try {
      const res = await fetch(`${PERF_API}/org/reset/`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) { alert('✅ Performance Database successfully reset! The page will now reload.'); window.location.reload(); }
      else alert('❌ Reset failed: ' + data.error);
    } catch { alert('❌ Failed to connect to server for reset.'); }
    finally { setResetting(false); }
  };

  useEffect(() => {
    fetch(`${PERF_API}/cycles/`).then(r => r.json()).then(data => {
      setCycles(data);
      if (data.length > 0) setSelectedCycle(data[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCycle) return;
    fetch(`${PERF_API}/org/overview/?cycle_id=${selectedCycle.id}`).then(r => r.json()).then(setOverview).catch(() => {});
    fetch(`${PERF_API}/leaderboard/?cycle_id=${selectedCycle.id}`).then(r => r.json()).then(setLeaderboard).catch(() => {});
    fetch(`${PERF_API}/all-reviews/?cycle_id=${selectedCycle.id}`).then(r => r.json()).then(setReviews).catch(() => {});
  }, [selectedCycle]);

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true); setImportMsg('');
    const fd = new FormData(); fd.append('file', importFile);
    try {
      const res = await fetch(`${PERF_API}/employees/import/`, { method: 'POST', body: fd });
      const data = await res.json();
      setImportMsg(`✅ ${data.message}${data.errors?.length ? ` · ${data.errors.length} errors` : ''}`);
    } catch { setImportMsg('❌ Import failed.'); }
    finally { setImporting(false); }
  };

  const downloadTemplate = () => {
    const headers = ['Employee ID','Name','Email','Phone','Designation','Department','Zone','Sub Zone','Reporting Manager ID','User Type','Joined Date'];
    const sample = [
      ['EMP001','Rahul Sharma','rahul@company.com','9876543210','Sales Executive','Sales','North Zone','Delhi Sub Zone','MGR001','field_force','2024-01-15'],
      ['EMP002','Priya Singh','priya@company.com','9876543211','Area Manager','Sales','South Zone','Hyderabad Sub Zone','MGR002','manager','2023-06-01'],
      ['MGR001','Amit Verma','amit@company.com','9876543212','Zonal Manager','Management','North Zone','','','manager','2022-03-10'],
      ['HR001','Sneha Patel','sneha@company.com','9876543213','HR Manager','Human Resources','','','','hr','2022-01-01'],
    ];
    const csv = [headers.join(','), ...sample.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'APIS_Employee_Master_Template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleCreateCycle = async () => {
    setCreatingCycle(true); setCycleMsg('');
    try {
      const res = await fetch(`${PERF_API}/cycles/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCycle, created_by: hrUser.name }),
      });
      const data = await res.json();
      if (res.ok) { setCycles(p => [data, ...p]); setCycleMsg('✅ Cycle created successfully!'); }
      else setCycleMsg('❌ ' + JSON.stringify(data));
    } catch { setCycleMsg('❌ Failed to create cycle.'); }
    finally { setCreatingCycle(false); }
  };

  const activateCycle = async (id: number, status: string) => {
    await fetch(`${PERF_API}/cycles/${id}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    setCycles(p => p.map(c => c.id === id ? { ...c, status } : c));
    if (selectedCycle?.id === id) setSelectedCycle((p: any) => ({ ...p, status }));
  };

  const finalizeReview = async (review: any, publish: boolean) => {
    const rv = hrRatings[review.id] || {};
    setFinalizingId(review.id);
    try {
      const goal_ratings = (review.goal_card_goals || []).map((g: any) => ({
        goal_id: g.id,
        hr_rating: rv.goal_ratings?.[g.id] ?? g.manager_rating ?? 3,
        hr_comments: rv.goal_comments?.[g.id] || '',
      }));
      const res = await fetch(`${PERF_API}/reviews/${review.id}/hr-finalize/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hr_final_rating: rv.overall || 3,
          hr_comments: rv.comments || '',
          functional_head_remarks: rv.functional_head_remarks || '',
          functional_head_rating: rv.functional_head_rating || null,
          management_approval_remarks: rv.management_approval_remarks || '',
          management_approval_rating: rv.management_approval_rating || null,
          publish, hr_name: hrUser.name, goal_ratings,
        }),
      });
      if (res.ok) {
        setFinalizeMsg(p => ({ ...p, [review.id]: publish ? '✅ Score published to employee!' : '✅ Draft saved.' }));
        setReviews(p => p.map(r => r.id === review.id ? { ...r, status: publish ? 'published' : 'hr_finalized' } : r));
      }
    } catch { setFinalizeMsg(p => ({ ...p, [review.id]: '❌ Failed to finalize.' })); }
    finally { setFinalizingId(null); }
  };

  const CYCLE_STATUS_STEPS = [
    { value: 'goal_setting', label: 'Open Goal Setting', color: 'text-blue-300 bg-blue-500/10 border-blue-500/25' },
    { value: 'goals_locked', label: 'Lock Goals',        color: 'text-amber-300 bg-amber-500/10 border-amber-500/25' },
    { value: 'review_open',  label: 'Open Reviews',      color: 'text-violet-300 bg-violet-500/10 border-violet-500/25' },
    { value: 'closed',       label: 'Close Cycle',       color: 'text-rose-300 bg-rose-500/10 border-rose-500/25' },
  ];

  const tabs = [
    { id: 'overview',    label: 'Overview',    icon: BarChart3 },
    { id: 'import',      label: 'Import',      icon: Upload },
    { id: 'cycles',      label: 'Cycles',      icon: Calendar },
    { id: 'reviews',     label: 'Reviews',     icon: Star },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ] as const;

  return (
    <div className="relative min-h-screen bg-[#080818] overflow-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[600px] h-[400px] bg-rose-700/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-pink-800/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-5">

          {/* ── HR Header ── */}
          <div className="relative rounded-3xl overflow-hidden border border-rose-500/15">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-600/10 via-pink-900/8 to-transparent" />
            <div className="absolute top-0 left-0 w-64 h-32 bg-rose-500/5 rounded-full blur-3xl" />
            <div className="relative p-6 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-rose-500/40 rounded-2xl blur-xl scale-110" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center text-2xl font-black text-white shadow-2xl shadow-rose-500/30">
                    {hrUser.name?.[0]}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/25 text-rose-400 uppercase tracking-widest">HR Admin</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 uppercase tracking-widest">Full Access</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-white">{hrUser.name}</h2>
                  <p className="text-rose-400/70 text-sm font-semibold mt-0.5">Performance Hub Administrator</p>
                </div>
              </div>
              <button
                onClick={handleResetDatabase}
                disabled={resetting}
                className="sm:ml-auto flex items-center gap-2 px-5 py-3 rounded-2xl border border-rose-500/25 bg-rose-500/8 hover:bg-rose-500/15 text-rose-300 font-bold text-xs transition-all disabled:opacity-40 self-start sm:self-auto">
                <AlertTriangle className="w-3.5 h-3.5" />
                {resetting ? 'Resetting...' : 'Reset All Database'}
              </button>
            </div>
          </div>

          {/* ── Cycle Selector ── */}
          {cycles.length > 0 && (
            <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-5">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">Active Cycle</p>
              <div className="flex flex-wrap gap-2">
                {cycles.map(c => (
                  <button key={c.id} onClick={() => setSelectedCycle(c)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                      selectedCycle?.id === c.id
                        ? 'bg-gradient-to-r from-rose-500/20 to-pink-500/15 border-rose-500/40 text-rose-300 shadow-lg shadow-rose-500/10'
                        : 'bg-white/3 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                    }`}>
                    {c.name}
                    <span className="text-xs opacity-50 ml-2">({c.status})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab Navigation ── */}
          <div className="flex gap-1 bg-white/[0.02] border border-white/8 p-1.5 rounded-2xl overflow-x-auto">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-500/20'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Overview ── */}
          {tab === 'overview' && (
            <div className="space-y-5">
              {overview ? (
                <>
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Employees', value: overview.total_employees,           color: 'text-white',       bg: 'from-white/5 to-transparent',       border: 'border-white/8',        icon: Users },
                      { label: 'Avg Score',        value: overview.avg_score,                color: 'text-amber-400',   bg: 'from-amber-500/8 to-transparent',   border: 'border-amber-500/15',   icon: TrendingUp },
                      { label: 'Published',        value: overview.review_status?.published || 0, color: 'text-emerald-400', bg: 'from-emerald-500/8 to-transparent', border: 'border-emerald-500/15', icon: CheckCircle },
                      { label: 'Pending Review',   value: overview.review_status?.submitted || 0, color: 'text-blue-400',    bg: 'from-blue-500/8 to-transparent',    border: 'border-blue-500/15',    icon: Zap },
                    ].map(({ label, value, color, bg, border, icon: Icon }) => (
                      <div key={label} className={`relative rounded-2xl overflow-hidden border ${border} p-5`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${bg}`} />
                        <div className="relative">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{label}</p>
                            <Icon className={`w-4 h-4 ${color} opacity-50`} />
                          </div>
                          <p className={`text-3xl font-black ${color}`}>{value ?? '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Goal Card Status */}
                  <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <BarChart3 className="w-4 h-4 text-rose-400" />
                      <h4 className="text-white font-extrabold">Goal Card Status Distribution</h4>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(overview.goal_card_status || {}).map(([s, count]: any) => (
                        <div key={s} className="flex items-center gap-4">
                          <span className="text-slate-400 text-sm w-44 capitalize font-semibold">{s.replace(/_/g, ' ')}</span>
                          <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-700"
                              style={{ width: `${Math.min(100, (count / (overview.total_employees || 1)) * 100)}%` }}
                            />
                          </div>
                          <span className="text-white font-black text-sm w-8 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Band Distribution */}
                  {Object.keys(overview.band_distribution || {}).length > 0 && (
                    <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-5">
                        <Award className="w-4 h-4 text-amber-400" />
                        <h4 className="text-white font-extrabold">Performance Band Distribution</h4>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(overview.band_distribution).map(([band, count]: any) => {
                          const bs = BAND_STYLES[band] || { bg: 'bg-white/5', border: 'border-white/10', text: 'text-slate-300', icon: '📊' };
                          return (
                            <div key={band} className={`px-5 py-4 rounded-2xl border ${bs.bg} ${bs.border} text-center min-w-[90px]`}>
                              <p className="text-2xl mb-1">{bs.icon}</p>
                              <p className={`text-2xl font-black ${bs.text}`}>{count}</p>
                              <p className={`text-xs font-bold capitalize mt-1 ${bs.text} opacity-70`}>{band}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-16 text-center">
                  <BarChart3 className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold">Select a cycle above to see overview.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Import ── */}
          {tab === 'import' && (
            <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-white font-extrabold text-base">Import Employee Master Sheet</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Upload Excel/CSV with all employee data</p>
                </div>
              </div>

              {/* Step 1 — Template */}
              <div className="flex items-center justify-between bg-violet-500/8 border border-violet-500/20 rounded-2xl px-6 py-4">
                <div>
                  <p className="text-violet-200 font-bold text-sm">Step 1 — Download the Template</p>
                  <p className="text-violet-400/70 text-xs mt-0.5">Pre-formatted CSV with all required columns and sample data</p>
                </div>
                <button onClick={downloadTemplate}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-violet-500/20 shrink-0 ml-4">
                  <FileText className="w-4 h-4" /> Download Template
                </button>
              </div>

              {/* Column reference */}
              <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-5">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">Required Columns</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    ['Employee ID', 'EMP001 — unique identifier'],
                    ['Name', 'Full name of the employee'],
                    ['Designation', 'Job title / role'],
                    ['Zone', 'Geographic zone'],
                    ['Sub Zone', 'Sub-zone or city'],
                    ['Department', 'Team or department'],
                    ['Reporting Manager ID', "Manager's Employee ID"],
                    ['User Type', 'field_force / manager / hr'],
                    ['Joined Date', 'YYYY-MM-DD format'],
                  ].map(([col, desc]) => (
                    <div key={col} className="bg-white/[0.03] border border-white/8 rounded-xl p-3">
                      <p className="text-white text-xs font-bold">{col}</p>
                      <p className="text-slate-600 text-[10px] mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload area */}
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">Step 2 — Upload Filled Sheet</p>
                <label className="block border-2 border-dashed border-white/10 rounded-2xl p-10 text-center hover:border-rose-500/30 transition-all cursor-pointer group">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3 group-hover:bg-rose-500/10 transition-colors">
                    <Upload className="w-7 h-7 text-slate-600 group-hover:text-rose-400 transition-colors" />
                  </div>
                  <p className="text-slate-400 font-semibold text-sm mb-1">
                    {importFile ? importFile.name : 'Click to choose file'}
                  </p>
                  <p className="text-slate-600 text-xs">Excel (.xlsx, .xls) or CSV</p>
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setImportFile(e.target.files?.[0] || null)} className="hidden" />
                </label>
              </div>

              <button onClick={handleImport} disabled={!importFile || importing}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all">
                {importing
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing...</>
                  : <><Upload className="w-4 h-4" /> Import Employees</>
                }
              </button>

              {importMsg && (
                <div className={`text-sm font-semibold text-center py-3.5 px-5 rounded-xl border ${
                  importMsg.startsWith('✅')
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                }`}>
                  {importMsg}
                </div>
              )}
            </div>
          )}

          {/* ── Cycles ── */}
          {tab === 'cycles' && (
            <div className="space-y-5">
              {/* Create new */}
              <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-rose-400" />
                  </div>
                  <h3 className="text-white font-extrabold">Create New Performance Cycle</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['name', 'Cycle Name', 'e.g. Q1 FY2025-26', 'text'],
                    ['fiscal_year', 'Fiscal Year', 'e.g. 2025-26', 'text'],
                    ['goal_setting_deadline', 'Goal Deadline', '', 'date'],
                    ['review_start_date', 'Review Start', '', 'date'],
                    ['review_deadline', 'Review Deadline', '', 'date'],
                  ].map(([field, label, ph, type]) => (
                    <div key={field}>
                      <label className="text-slate-500 text-xs font-bold block mb-1.5 uppercase tracking-wider">{label}</label>
                      <input
                        type={type} placeholder={ph} value={(newCycle as any)[field]}
                        onChange={e => setNewCycle(p => ({ ...p, [field]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-rose-500/50 transition-colors placeholder-slate-700"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-slate-500 text-xs font-bold block mb-1.5 uppercase tracking-wider">Quarter</label>
                    <select value={newCycle.quarter} onChange={e => setNewCycle(p => ({ ...p, quarter: Number(e.target.value) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-rose-500/50 transition-colors">
                      {[1, 2, 3, 4].map(q => <option key={q} value={q} className="bg-[#0f0f1a]">Q{q}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={handleCreateCycle} disabled={creatingCycle || !newCycle.name}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all">
                  {creatingCycle
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                    : <><Plus className="w-4 h-4" /> Create Cycle</>
                  }
                </button>
                {cycleMsg && (
                  <p className={`text-sm text-center font-semibold py-2.5 rounded-xl ${
                    cycleMsg.startsWith('✅')
                      ? 'text-emerald-300 bg-emerald-500/10'
                      : 'text-rose-300 bg-rose-500/10'
                  }`}>{cycleMsg}</p>
                )}
              </div>

              {/* Existing cycles */}
              {cycles.map(c => (
                <div key={c.id} className="bg-white/[0.02] border border-white/8 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-white font-extrabold text-base">{c.name}</p>
                      <p className="text-slate-500 text-xs mt-1">
                        Status: <span className="text-rose-300 font-bold">{c.status}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CYCLE_STATUS_STEPS.map(({ value, label, color }) => (
                      <button key={value} onClick={() => activateCycle(c.id, value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all hover:scale-105 ${color}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Reviews ── */}
          {tab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Star className="w-4 h-4 text-rose-400" />
                <h3 className="text-white font-extrabold">Quarterly Reviews — {selectedCycle?.name}</h3>
              </div>

              {reviews.length === 0 && (
                <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-16 text-center">
                  <Star className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold">No reviews submitted yet.</p>
                  <p className="text-slate-600 text-sm mt-1">Reviews appear here once employees submit their quarterly self-assessment.</p>
                </div>
              )}

              {reviews.map(r => {
                const hr = hrRatings[r.id] || {};
                const goals = r.goal_card_goals || [];
                const isExp = expandedReview === r.id;
                const canFinalize = ['submitted', 'manager_reviewed', 'hr_finalized', 'published'].includes(r.status);

                return (
                  <div key={r.id} className="bg-white/[0.02] border border-white/8 rounded-2xl overflow-hidden">
                    {/* Review header */}
                    <div
                      className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.03] transition-all"
                      onClick={() => setExpandedReview(isExp ? null : r.id)}>
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/30 to-pink-600/30 flex items-center justify-center font-black text-rose-300 text-sm shrink-0">
                        {r.employee_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm">
                          {r.employee_name}
                          <span className="text-slate-600 text-xs font-normal ml-2">#{r.employee_id_str}</span>
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">{r.cycle_name}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {r.final_weighted_score && (
                          <div className="text-right">
                            <p className="text-lg font-black text-amber-400">{r.final_weighted_score}</p>
                            <p className="text-[10px] text-slate-600">/ 5.00</p>
                          </div>
                        )}
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                          r.status === 'published'
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                            : r.status === 'submitted'
                            ? 'bg-blue-500/10 border-blue-500/25 text-blue-300'
                            : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                        }`}>
                          {r.status_display || r.status}
                        </span>
                        {isExp
                          ? <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                          : <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        }
                      </div>
                    </div>

                    {/* Expanded panel */}
                    {isExp && (
                      <div className="border-t border-white/5 px-5 py-5 space-y-5">
                        {r.employee_summary && (
                          <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Employee Summary</p>
                            <p className="text-slate-300 text-sm italic">"{r.employee_summary}"</p>
                          </div>
                        )}

                        {canFinalize && (
                          <div className="space-y-5">
                            {/* HR Calibration header */}
                            <div className="flex items-center gap-3">
                              <Shield className="w-4 h-4 text-rose-400" />
                              <p className="text-xs font-bold text-rose-300 uppercase tracking-widest">HR Calibration</p>
                            </div>

                            {/* Overall HR rating */}
                            <div className="flex items-center justify-between bg-rose-500/5 border border-rose-500/15 rounded-xl px-5 py-3.5">
                              <div>
                                <p className="text-sm font-bold text-slate-200">Overall HR Rating</p>
                                <p className="text-xs text-slate-600 mt-0.5">Your holistic calibration score</p>
                              </div>
                              <StarRating
                                value={hr.overall || 0}
                                onChange={v => setHrRatings(p => ({ ...p, [r.id]: { ...(p[r.id] || {}), overall: v } }))}
                              />
                            </div>

                            {/* Per-goal calibration */}
                            <div className="space-y-2">
                              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Per-Goal Calibration</p>
                              {goals.map((g: any) => (
                                <div key={g.id} className="bg-white/3 border border-white/8 rounded-xl p-3.5 flex items-center gap-4">
                                  <p className="flex-1 text-slate-300 text-sm font-semibold">{g.title}</p>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-slate-600 text-xs">Mgr</span>
                                    <StarRating value={g.manager_rating || 0} readonly />
                                    <span className="text-slate-700">·</span>
                                    <span className="text-slate-500 text-xs">HR</span>
                                    <StarRating
                                      value={hr.goal_ratings?.[g.id] || 0}
                                      onChange={v => setHrRatings(p => ({
                                        ...p, [r.id]: { ...(p[r.id] || {}), goal_ratings: { ...(p[r.id]?.goal_ratings || {}), [g.id]: v } }
                                      }))}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* HR Comments */}
                            <textarea
                              value={hr.comments || ''}
                              onChange={e => setHrRatings(p => ({ ...p, [r.id]: { ...(p[r.id] || {}), comments: e.target.value } }))}
                              placeholder="HR comments and calibration notes..."
                              rows={2}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-rose-500/50 resize-none transition-colors placeholder-slate-600"
                            />

                            {/* Section F */}
                            <div className="rounded-2xl overflow-hidden border border-white/8">
                              <div className="px-5 py-3.5 border-b border-white/8 bg-gradient-to-r from-rose-500/8 to-transparent flex items-center gap-3">
                                <Award className="w-4 h-4 text-rose-400" />
                                <p className="text-xs font-bold uppercase tracking-widest text-rose-300">Section F — HR / Management Review</p>
                              </div>
                              <div className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-5">
                                  <div>
                                    <label className="text-slate-500 text-xs font-bold block mb-2 uppercase tracking-widest">Functional Head Rating</label>
                                    <StarRating
                                      value={hr.functional_head_rating || 0}
                                      onChange={v => setHrRatings(p => ({ ...p, [r.id]: { ...(p[r.id] || {}), functional_head_rating: v } }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-slate-500 text-xs font-bold block mb-2 uppercase tracking-widest">Management Approval Rating</label>
                                    <StarRating
                                      value={hr.management_approval_rating || 0}
                                      onChange={v => setHrRatings(p => ({ ...p, [r.id]: { ...(p[r.id] || {}), management_approval_rating: v } }))}
                                    />
                                  </div>
                                </div>
                                <input
                                  placeholder="Functional Head remarks..."
                                  value={hr.functional_head_remarks || ''}
                                  onChange={e => setHrRatings(p => ({ ...p, [r.id]: { ...(p[r.id] || {}), functional_head_remarks: e.target.value } }))}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/40 placeholder-slate-600 transition-colors"
                                />
                                <input
                                  placeholder="Management approval remarks..."
                                  value={hr.management_approval_remarks || ''}
                                  onChange={e => setHrRatings(p => ({ ...p, [r.id]: { ...(p[r.id] || {}), management_approval_remarks: e.target.value } }))}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/40 placeholder-slate-600 transition-colors"
                                />
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3">
                              <button onClick={() => finalizeReview(r, false)} disabled={finalizingId === r.id}
                                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/15 text-slate-200 font-bold text-sm hover:bg-white/10 transition-all disabled:opacity-40">
                                Save Draft
                              </button>
                              <button onClick={() => finalizeReview(r, true)} disabled={finalizingId === r.id}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40">
                                {finalizingId === r.id
                                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publishing...</>
                                  : <><CheckCircle className="w-4 h-4" /> Publish Score</>
                                }
                              </button>
                            </div>

                            {finalizeMsg[r.id] && (
                              <p className={`text-sm text-center font-semibold py-2.5 rounded-xl ${
                                finalizeMsg[r.id].startsWith('✅')
                                  ? 'text-emerald-300 bg-emerald-500/10'
                                  : 'text-rose-300 bg-rose-500/10'
                              }`}>{finalizeMsg[r.id]}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Leaderboard ── */}
          {tab === 'leaderboard' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-white font-extrabold text-lg">Leaderboard — {selectedCycle?.name}</h3>
              </div>

              {leaderboard.length === 0 && (
                <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-16 text-center">
                  <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold">No published scores yet.</p>
                  <p className="text-slate-600 text-sm mt-1">Finalize and publish reviews to see rankings appear here.</p>
                </div>
              )}

              {leaderboard.map((entry) => {
                const rank = entry.rank as number;
                const medal = RANK_MEDAL[rank];
                const bs = BAND_STYLES[entry.performance_band] || { bg: 'bg-white/5', border: 'border-white/10', text: 'text-slate-400', icon: '📊' };
                return (
                  <div key={entry.employee_id}
                    className={`relative flex items-center gap-5 p-5 rounded-2xl border transition-all ${
                      medal ? `${medal.bg} ${medal.border}` : 'bg-white/[0.02] border-white/8'
                    }`}>
                    {rank <= 3 && (
                      <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl opacity-20 ${
                        rank === 1 ? 'bg-amber-400' : rank === 2 ? 'bg-slate-300' : 'bg-orange-500'
                      }`} />
                    )}
                    {/* Rank */}
                    <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0 ${
                      medal ? `${medal.bg} ${medal.border} border text-2xl` : 'bg-white/5 border border-white/10 text-slate-500 text-sm'
                    }`}>
                      {medal ? medal.emoji : `#${rank}`}
                    </div>
                    {/* Info */}
                    <div className="relative flex-1 min-w-0">
                      <p className="text-white font-extrabold">{entry.name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{entry.designation} · {entry.zone}</p>
                    </div>
                    {/* Score */}
                    <div className="relative text-right shrink-0">
                      <p className="text-2xl font-black text-amber-400">{entry.review_score?.toFixed(2) ?? '—'}</p>
                      <p className="text-slate-600 text-xs">/ 5.00</p>
                    </div>
                    {/* Band */}
                    <span className={`relative px-3 py-1.5 rounded-full text-xs font-bold border ${bs.bg} ${bs.border} ${bs.text} shrink-0`}>
                      {bs.icon} {entry.performance_band}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
