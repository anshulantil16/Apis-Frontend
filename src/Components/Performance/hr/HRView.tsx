import { useState, useEffect } from 'react';
import { Upload, Plus, Trophy, Star, BarChart3, CheckCircle, Calendar } from 'lucide-react';
import { PERF_API } from '../../../Pages/PerformancePage';

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} onClick={() => !readonly && onChange?.(s)} disabled={readonly} className={`transition-transform ${!readonly && 'hover:scale-110'}`}>
          <Star className={`w-4 h-4 ${s <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
        </button>
      ))}
    </div>
  );
}

const BAND_STYLES: Record<string, string> = {
  outstanding: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  exceeds: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  meets: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  below: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  poor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

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
  const [newCycle, setNewCycle] = useState({ name: '', quarter: 1, fiscal_year: '2025-26', goal_setting_deadline: '', review_start_date: '', review_deadline: '' });
  const [creatingCycle, setCreatingCycle] = useState(false);
  const [cycleMsg, setCycleMsg] = useState('');
  const [finalizingId, setFinalizingId] = useState<number | null>(null);
  const [hrRatings, setHrRatings] = useState<Record<number, any>>({});
  const [finalizeMsg, setFinalizeMsg] = useState<Record<number, string>>({});
  const [resetting, setResetting] = useState(false);

  const handleResetDatabase = async () => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete ALL cycles, employees, goal cards, reviews, and logs from the Performance Hub. This action CANNOT be undone.\n\nAre you sure you want to clear the entire performance database?')) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`${PERF_API}/org/reset/`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert('✅ Performance Database successfully reset! The page will now reload.');
        window.location.reload();
      } else {
        alert('❌ Reset failed: ' + data.error);
      }
    } catch {
      alert('❌ Failed to connect to server for reset.');
    } finally {
      setResetting(false);
    }
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
    const headers = [
      'Employee ID', 'Name', 'Email', 'Phone',
      'Designation', 'Department', 'Zone', 'Sub Zone',
      'Reporting Manager ID', 'User Type', 'Joined Date',
    ];
    const sample = [
      ['EMP001', 'Rahul Sharma', 'rahul@company.com', '9876543210',
       'Sales Executive', 'Sales', 'North Zone', 'Delhi Sub Zone',
       'MGR001', 'field_force', '2024-01-15'],
      ['EMP002', 'Priya Singh', 'priya@company.com', '9876543211',
       'Area Manager', 'Sales', 'South Zone', 'Hyderabad Sub Zone',
       'MGR002', 'manager', '2023-06-01'],
      ['MGR001', 'Amit Verma', 'amit@company.com', '9876543212',
       'Zonal Manager', 'Management', 'North Zone', '',
       '', 'manager', '2022-03-10'],
      ['HR001', 'Sneha Patel', 'sneha@company.com', '9876543213',
       'HR Manager', 'Human Resources', '', '',
       '', 'hr', '2022-01-01'],
    ];
    const csvContent = [
      headers.join(','),
      ...sample.map(row => row.map(v => `"${v}"`).join(','))
    ].join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'APIS_Employee_Master_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCreateCycle = async () => {
    setCreatingCycle(true); setCycleMsg('');
    try {
      const res = await fetch(`${PERF_API}/cycles/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCycle, created_by: hrUser.name }),
      });
      const data = await res.json();
      if (res.ok) { setCycles(p => [data, ...p]); setCycleMsg('✅ Cycle created!'); }
      else setCycleMsg('❌ ' + JSON.stringify(data));
    } catch { setCycleMsg('❌ Failed.'); }
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
        setFinalizeMsg(p => ({ ...p, [review.id]: publish ? '✅ Score published!' : '✅ Saved.' }));
        setReviews(p => p.map(r => r.id === review.id ? { ...r, status: publish ? 'published' : 'hr_finalized' } : r));
      }
    } catch { setFinalizeMsg(p => ({ ...p, [review.id]: '❌ Failed.' })); }
    finally { setFinalizingId(null); }
  };

  const statCard = (label: string, value: any, color: string) => (
    <div className={`bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all`}>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-black mt-2 ${color}`}>{value ?? '—'}</p>
    </div>
  );

  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: BarChart3 },
    { id: 'import', label: '📥 Import', icon: Upload },
    { id: 'cycles', label: '🗓 Cycles', icon: Calendar },
    { id: 'reviews', label: '⭐ Reviews', icon: Star },
    { id: 'leaderboard', label: '🏆 Leaderboard', icon: Trophy },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HR Header */}
        <div className="bg-gradient-to-br from-rose-600/20 to-pink-800/20 border border-rose-500/20 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-2xl font-black text-white">{hrUser.name?.[0]}</div>
            <div>
              <h2 className="text-2xl font-bold text-white">{hrUser.name}</h2>
              <p className="text-rose-300 text-sm font-semibold">HR Admin · Full Access</p>
            </div>
          </div>
          <button 
            onClick={handleResetDatabase} 
            disabled={resetting}
            className="sm:ml-auto px-5 py-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs transition-all hover:shadow-lg active:scale-95 disabled:opacity-40 flex items-center gap-2 self-start sm:self-auto"
          >
            ⚠️ Reset & Clear All Database
          </button>
        </div>

        {/* Cycle Selector */}
        {cycles.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Active Cycle</p>
            <div className="flex flex-wrap gap-3">
              {cycles.map(c => (
                <button key={c.id} onClick={() => setSelectedCycle(c)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${selectedCycle?.id === c.id ? 'bg-rose-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'}`}>
                  {c.name} <span className="text-xs opacity-70 ml-1">({c.status})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Nav */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${tab === t.id ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {overview ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {statCard('Total Employees', overview.total_employees, 'text-white')}
                  {statCard('Avg Score', overview.avg_score, 'text-amber-400')}
                  {statCard('Published', overview.review_status?.published || 0, 'text-emerald-400')}
                  {statCard('Pending Review', overview.review_status?.submitted || 0, 'text-blue-400')}
                </div>
                {/* Goal Card Status */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h4 className="text-white font-bold mb-4">Goal Card Status Distribution</h4>
                  <div className="space-y-3">
                    {Object.entries(overview.goal_card_status || {}).map(([s, count]: any) => (
                      <div key={s} className="flex items-center gap-3">
                        <span className="text-slate-400 text-sm w-40 capitalize">{s.replace(/_/g,' ')}</span>
                        <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${Math.min(100, (count / (overview.total_employees || 1)) * 100)}%` }} />
                        </div>
                        <span className="text-white font-bold text-sm w-8">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Band Distribution */}
                {Object.keys(overview.band_distribution || {}).length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h4 className="text-white font-bold mb-4">Performance Band Distribution</h4>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(overview.band_distribution).map(([band, count]: any) => (
                        <div key={band} className={`px-4 py-3 rounded-2xl border ${BAND_STYLES[band] || 'bg-white/5 border-white/10 text-slate-300'} text-center`}>
                          <p className="text-xl font-black">{count}</p>
                          <p className="text-xs font-bold capitalize mt-0.5">{band}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : <div className="text-slate-500 text-center py-16 font-semibold">Select a cycle to see overview.</div>}
          </div>
        )}

        {/* Import */}
        {tab === 'import' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">
            <div>
              <h3 className="text-white font-bold text-lg mb-1">Import Employee Master Sheet</h3>
              <p className="text-slate-400 text-sm">Upload Excel/CSV with columns: Employee ID, Name, Designation, Zone, Reporting Manager ID, User Type</p>
            </div>

            {/* Download Template */}
            <div className="flex items-center justify-between bg-violet-500/10 border border-violet-500/20 rounded-2xl px-6 py-4">
              <div>
                <p className="text-violet-200 font-bold text-sm">📥 Step 1 — Download the Template</p>
                <p className="text-violet-400 text-xs mt-0.5">Get the pre-formatted CSV with all required columns and sample data</p>
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl transition-all hover:shadow-lg hover:shadow-violet-500/20 active:scale-95 flex-shrink-0 ml-4"
              >
                ⬇ Download Template
              </button>
            </div>

            {/* Column reference */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Required Columns</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  ['Employee ID','EMP001 — unique identifier'],
                  ['Name','Full name of the employee'],
                  ['Designation','Job title / role'],
                  ['Zone','Geographic zone'],
                  ['Sub Zone','Sub-zone or city'],
                  ['Department','Team or department'],
                  ['Reporting Manager ID','Manager\'s Employee ID'],
                  ['User Type','field_force / manager / hr'],
                  ['Joined Date','YYYY-MM-DD format'],
                ].map(([col, desc]) => (
                  <div key={col} className="bg-white/5 rounded-xl p-2.5">
                    <p className="text-white text-xs font-bold">{col}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest text-center">— Step 2: Fill the template and upload below —</p>
            <div className="border-2 border-dashed border-white/10 rounded-2xl p-10 text-center hover:border-rose-500/30 transition-all">
              <Upload className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setImportFile(e.target.files?.[0] || null)}
                className="text-slate-400 text-sm file:mr-3 file:py-2 file:px-5 file:rounded-xl file:border-0 file:bg-rose-600 file:text-white file:font-bold file:cursor-pointer" />
              {importFile && <p className="text-slate-400 text-sm mt-3 font-semibold">{importFile.name}</p>}
            </div>
            <button onClick={handleImport} disabled={!importFile || importing}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2">
              <Upload className="w-5 h-5" /> {importing ? 'Importing...' : 'Import Employees'}
            </button>
            {importMsg && <p className="text-sm font-semibold text-center py-3 bg-white/5 rounded-xl text-slate-300">{importMsg}</p>}
          </div>
        )}

        {/* Cycles */}
        {tab === 'cycles' && (
          <div className="space-y-5">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-bold text-lg">Create New Performance Cycle</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['name','Cycle Name','e.g. Q1 FY2025-26','text'],
                  ['fiscal_year','Fiscal Year','e.g. 2025-26','text'],
                  ['goal_setting_deadline','Goal Deadline','','date'],
                  ['review_start_date','Review Start','','date'],
                  ['review_deadline','Review Deadline','','date'],
                ].map(([field, label, ph, type]) => (
                  <div key={field}>
                    <label className="text-slate-400 text-xs font-bold block mb-1.5">{label}</label>
                    <input type={type} placeholder={ph} value={(newCycle as any)[field]}
                      onChange={e => setNewCycle(p => ({...p, [field]: e.target.value}))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-rose-500/50" />
                  </div>
                ))}
                <div>
                  <label className="text-slate-400 text-xs font-bold block mb-1.5">Quarter</label>
                  <select value={newCycle.quarter} onChange={e => setNewCycle(p => ({...p, quarter: Number(e.target.value)}))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-rose-500/50">
                    {[1,2,3,4].map(q => <option key={q} value={q} className="bg-[#1a1a2e]">Q{q}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleCreateCycle} disabled={creatingCycle || !newCycle.name}
                className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> {creatingCycle ? 'Creating...' : 'Create Cycle'}
              </button>
              {cycleMsg && <p className="text-sm text-center text-slate-300 font-semibold">{cycleMsg}</p>}
            </div>

            {/* Existing cycles with status control */}
            {cycles.map(c => (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-white font-bold">{c.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">Status: <span className="text-rose-300 font-semibold">{c.status}</span></p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    ['goal_setting','Open Goal Setting'],
                    ['goals_locked','Lock Goals'],
                    ['review_open','Open Reviews'],
                    ['closed','Close Cycle'],
                  ].map(([s, label]) => (
                    <button key={s} onClick={() => activateCycle(c.id, s)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-all">
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reviews / Finalize */}
        {tab === 'reviews' && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-lg">Quarterly Reviews — {selectedCycle?.name}</h3>
            {reviews.length === 0 && <div className="text-slate-500 text-center py-16 font-semibold">No reviews submitted yet.</div>}
            {reviews.map(r => {
              const hr = hrRatings[r.id] || {};
              const goals = r.goal_card_goals || [];
              return (
                <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold">{r.employee_name} <span className="text-slate-500 text-xs">#{r.employee_id_str}</span></p>
                      <p className="text-slate-400 text-xs mt-0.5">{r.cycle_name} · Status: <span className="text-amber-300 font-semibold">{r.status}</span></p>
                    </div>
                    {r.final_weighted_score && (
                      <div className="text-right">
                        <p className="text-2xl font-black text-amber-400">{r.final_weighted_score}</p>
                        <p className="text-xs text-slate-400">Final Score</p>
                      </div>
                    )}
                  </div>
                  {r.employee_summary && <p className="text-slate-300 text-sm italic">"{r.employee_summary}"</p>}

                  {/* HR rating inputs — also shown for hr_finalized/published so HR can re-calibrate if score was wrong */}
                  {['submitted','manager_reviewed','hr_finalized','published'].includes(r.status) && (
                    <div className="space-y-3 border-t border-white/10 pt-4">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">HR Calibration</p>
                      <div>
                        <label className="text-slate-400 text-xs font-bold block mb-2">Overall HR Rating</label>
                        <StarRating value={hr.overall || 0} onChange={v => setHrRatings(p => ({...p, [r.id]: {...(p[r.id]||{}), overall: v}}))} />
                      </div>
                      {goals.map((g: any) => (
                        <div key={g.id} className="bg-white/5 rounded-xl p-3 flex items-center gap-4">
                          <p className="flex-1 text-slate-300 text-sm">{g.title}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-xs">Mgr: </span>
                            <StarRating value={g.manager_rating || 0} readonly />
                            <span className="text-slate-500 text-xs ml-2">HR: </span>
                            <StarRating value={hr.goal_ratings?.[g.id] || 0}
                              onChange={v => setHrRatings(p => ({...p, [r.id]: {...(p[r.id]||{}), goal_ratings: {...(p[r.id]?.goal_ratings||{}), [g.id]: v}}}))} />
                          </div>
                        </div>
                      ))}
                      <textarea value={hr.comments || ''} onChange={e => setHrRatings(p => ({...p, [r.id]: {...(p[r.id]||{}), comments: e.target.value}}))}
                        placeholder="HR comments..." rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-rose-500/50 resize-none" />

                      {/* Section F – Functional Head + Management Approval */}
                      <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
                        <p className="text-xs font-bold uppercase tracking-widest text-rose-300 px-4 py-2.5 border-b border-white/5">
                          Section F — HR / Management Review
                        </p>
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-slate-400 text-xs font-bold block mb-1">Functional Head Rating</label>
                              <StarRating value={hr.functional_head_rating || 0}
                                onChange={v => setHrRatings(p => ({...p, [r.id]: {...(p[r.id]||{}), functional_head_rating: v}}))} />
                            </div>
                            <div>
                              <label className="text-slate-400 text-xs font-bold block mb-1">Management Approval Rating</label>
                              <StarRating value={hr.management_approval_rating || 0}
                                onChange={v => setHrRatings(p => ({...p, [r.id]: {...(p[r.id]||{}), management_approval_rating: v}}))} />
                            </div>
                          </div>
                          <input placeholder="Functional Head remarks..."
                            value={hr.functional_head_remarks || ''}
                            onChange={e => setHrRatings(p => ({...p, [r.id]: {...(p[r.id]||{}), functional_head_remarks: e.target.value}}))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-500/40 placeholder-slate-600" />
                          <input placeholder="Management approval remarks..."
                            value={hr.management_approval_remarks || ''}
                            onChange={e => setHrRatings(p => ({...p, [r.id]: {...(p[r.id]||{}), management_approval_remarks: e.target.value}}))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-500/40 placeholder-slate-600" />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button onClick={() => finalizeReview(r, false)} disabled={finalizingId === r.id}
                          className="flex-1 py-2.5 rounded-xl bg-white/10 border border-white/20 text-slate-200 font-bold text-sm hover:bg-white/20">
                          Save Draft
                        </button>
                        <button onClick={() => finalizeReview(r, true)} disabled={finalizingId === r.id}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4" /> Publish Score
                        </button>
                      </div>
                      {finalizeMsg[r.id] && <p className="text-sm text-center text-slate-300 font-semibold">{finalizeMsg[r.id]}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Leaderboard */}
        {tab === 'leaderboard' && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-lg flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /> Leaderboard — {selectedCycle?.name}</h3>
            {leaderboard.length === 0 && <div className="text-slate-500 text-center py-16 font-semibold">No published scores yet. Finalize and publish reviews to see rankings.</div>}
            {leaderboard.map((entry, idx) => (
              <div key={entry.employee_id} className={`flex items-center gap-5 p-5 rounded-2xl border transition-all hover:bg-white/8 ${
                idx === 0 ? 'bg-amber-500/10 border-amber-500/30' : idx === 1 ? 'bg-slate-400/5 border-slate-400/20' : idx === 2 ? 'bg-orange-500/10 border-orange-500/20' : 'bg-white/5 border-white/10'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${idx < 3 ? 'text-2xl' : 'bg-white/5 text-slate-400 text-sm'}`}>
                  {RANK_ICONS[entry.rank] || `#${entry.rank}`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold">{entry.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{entry.designation} · {entry.zone}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-amber-400">{entry.final_score?.toFixed(2)}</p>
                  <p className="text-slate-500 text-xs">/ 5.00</p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${BAND_STYLES[entry.performance_band] || 'bg-white/5 border-white/10 text-slate-400'}`}>
                  {entry.performance_band_display}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
