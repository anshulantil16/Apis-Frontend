import { useState, useEffect } from 'react';
import { Target, Star, CheckCircle, Clock, Plus, Trash2, Send, FileText } from 'lucide-react';
import { PERF_API } from '../../../Pages/PerformancePage';

const CATEGORIES = [
  { id: 'sales', label: '💰 Sales & Revenue' },
  { id: 'customer', label: '🤝 Customer Relations' },
  { id: 'learning', label: '📚 Learning & Growth' },
  { id: 'process', label: '⚙️ Process Excellence' },
  { id: 'innovation', label: '🚀 Innovation' },
];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} onClick={() => onChange(s)} className="transition-transform hover:scale-110">
          <Star className={`w-5 h-5 ${s <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-slate-700 text-slate-300',
    submitted: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    manager_approved: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    manager_rejected: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    hr_approved: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
    finalized: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  };
  const labels: Record<string, string> = {
    draft: 'Draft', submitted: 'Pending Review', manager_approved: 'Manager Approved',
    manager_rejected: 'Rejected', hr_approved: 'HR Approved', finalized: 'Finalized',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${map[status] || 'bg-slate-700 text-slate-300'}`}>
      {labels[status] || status}
    </span>
  );
}

export function EmployeeView({ employee }: { employee: any }) {
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [goalCard, setGoalCard] = useState<any>(null);
  const [tab, setTab] = useState<'goals' | 'review'>('goals');
  const [goals, setGoals] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Review form state
  const [reviewForm, setReviewForm] = useState({
    employee_summary: '', key_achievements: '', challenges_faced: '',
    learning_outcomes: '', next_quarter_plans: '', overall_self_rating: 0,
  });
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  useEffect(() => {
    fetch(`${PERF_API}/cycles/active/`)
      .then(r => r.json()).then(setCycles).catch(() => {});
  }, []);

  useEffect(() => { 
    if (!selectedCycle) return;
    fetch(`${PERF_API}/goal-cards/${employee.employee_id}/${selectedCycle.id}/`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) { setGoalCard(data); setGoals(data.goals || []); }
        else { setGoalCard(null); setGoals([]); }
      }).catch(() => {});
  }, [selectedCycle, employee.employee_id]);

  const addGoal = () => setGoals(prev => [...prev, {
    _id: Date.now(), category: 'sales', title: '', description: '',
    kpi_metric: '', target_value: '', weightage: 20,
    self_rating: 0, self_completion_pct: 0, self_comments: '', achievement_description: '',
  }]);

  const updateGoal = (idx: number, field: string, val: any) => {
    setGoals(prev => prev.map((g, i) => i === idx ? { ...g, [field]: val } : g));
  };

  const removeGoal = (idx: number) => setGoals(prev => prev.filter((_, i) => i !== idx));

  const totalWeight = goals.reduce((s, g) => s + Number(g.weightage || 0), 0);

  const saveGoals = async (submit = false) => {
    if (!selectedCycle) return;
    setSaving(true); setMsg('');
    try {
      const res = await fetch(`${PERF_API}/goal-cards/${employee.employee_id}/${selectedCycle.id}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals }),
      });
      const data = await res.json();
      setGoalCard(data);
      if (submit) {
        await fetch(`${PERF_API}/goal-cards/${data.id}/submit/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: 'Submitted for manager review.' }),
        });
        setMsg('✅ Goals submitted for manager review!');
        setGoalCard((p: any) => ({ ...p, status: 'submitted' }));
      } else {
        setMsg('✅ Draft saved.');
      }
    } catch { setMsg('❌ Save failed.'); }
    finally { setSaving(false); }
  };

  const submitReview = async () => {
    if (!goalCard) return;
    setSaving(true); setMsg('');
    try {
      const formData = new FormData();
      Object.entries(reviewForm).forEach(([k, v]) => formData.append(k, String(v)));
      goals.forEach((g, i) => {
        formData.append(`goal_ratings[${i}][goal_id]`, g.id);
        formData.append(`goal_ratings[${i}][self_rating]`, g.self_rating);
        formData.append(`goal_ratings[${i}][self_completion_pct]`, g.self_completion_pct);
        formData.append(`goal_ratings[${i}][self_comments]`, g.self_comments || '');
        formData.append(`goal_ratings[${i}][achievement_description]`, g.achievement_description || '');
      });
      if (evidenceFile) formData.append('evidence_file', evidenceFile);
      const res = await fetch(`${PERF_API}/reviews/${goalCard.id}/`, { method: 'POST', body: formData });
      if (res.ok) setMsg('✅ Quarterly review submitted!');
      else setMsg('❌ Submission failed.');
    } catch { setMsg('❌ Error submitting review.'); }
    finally { setSaving(false); }
  };

  const canEdit = !goalCard || goalCard.status === 'draft' || goalCard.status === 'manager_rejected';
  const canReview = goalCard?.status === 'manager_approved' || goalCard?.status === 'hr_approved';

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-6 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Employee Card */}
        <div className="bg-gradient-to-br from-violet-600/20 to-purple-800/20 border border-violet-500/20 rounded-3xl p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white shadow-lg">
            {employee.name?.[0] || 'E'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{employee.name}</h2>
            <p className="text-violet-300 text-sm font-semibold mt-0.5">{employee.designation} · {employee.zone}</p>
            <p className="text-slate-400 text-xs mt-1">Reports to: {employee.reporting_manager_id || 'N/A'}</p>
          </div>
          {goalCard && <div className="ml-auto"><StatusBadge status={goalCard.status} /></div>}
        </div>

        {/* Cycle Selector */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Select Quarter</p>
          {cycles.length === 0 ? (
            <p className="text-slate-500 text-sm">No active cycles. Please contact HR.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {cycles.map(c => (
                <button key={c.id} onClick={() => setSelectedCycle(c)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    selectedCycle?.id === c.id
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
                  }`}>{c.name}</button>
              ))}
            </div>
          )}
        </div>

        {selectedCycle && (
          <>
            {/* Tabs */} 
            <div className="flex gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
              {[{id:'goals', label:'🎯 Set Goals', icon: Target}, {id:'review', label:'📋 Self Review', icon: FileText}].map(t => (
                <button key={t.id} onClick={() => setTab(t.id as any)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    tab === t.id ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}>{t.label}</button>
              ))}
            </div>

            {/* Goals Tab */}
            {tab === 'goals' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold text-lg">Your Goals for {selectedCycle.name}</h3>
                    <p className={`text-sm font-semibold mt-0.5 ${totalWeight === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      Total Weightage: {totalWeight}% {totalWeight !== 100 && '(must equal 100%)'}
                    </p>
                  </div>
                  {canEdit && (
                    <button onClick={addGoal}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-sm transition-all">
                      <Plus className="w-4 h-4" /> Add Goal
                    </button>
                  )}
                </div>

                {goals.map((g, i) => (
                  <div key={g._id || g.id || i} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Goal {i+1}</span>
                      {canEdit && <button onClick={() => removeGoal(i)} className="text-slate-600 hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-400 text-xs font-bold block mb-1.5">Category</label>
                        <select disabled={!canEdit} value={g.category} onChange={e => updateGoal(i,'category',e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-violet-500/50 disabled:opacity-60">
                          {CATEGORIES.map(c => <option key={c.id} value={c.id} className="bg-[#1a1a2e]">{c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs font-bold block mb-1.5">Weightage (%)</label>
                        <input disabled={!canEdit} type="number" min={5} max={100} value={g.weightage}
                          onChange={e => updateGoal(i,'weightage',Number(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-violet-500/50 disabled:opacity-60" />
                      </div>
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs font-bold block mb-1.5">Goal Title *</label>
                      <input disabled={!canEdit} value={g.title} onChange={e => updateGoal(i,'title',e.target.value)}
                        placeholder="e.g. Achieve ₹50L revenue in Q1"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-violet-500/50 placeholder-slate-600 disabled:opacity-60" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-400 text-xs font-bold block mb-1.5">KPI / Metric</label>
                        <input disabled={!canEdit} value={g.kpi_metric} onChange={e => updateGoal(i,'kpi_metric',e.target.value)}
                          placeholder="e.g. ₹50L revenue"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-violet-500/50 placeholder-slate-600 disabled:opacity-60" />
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs font-bold block mb-1.5">Target / Success Criteria</label>
                        <input disabled={!canEdit} value={g.target_value} onChange={e => updateGoal(i,'target_value',e.target.value)}
                          placeholder="e.g. 100% target achieved"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-violet-500/50 placeholder-slate-600 disabled:opacity-60" />
                      </div>
                    </div>
                  </div>
                ))}

                {goals.length === 0 && canEdit && (
                  <div onClick={addGoal} className="border-2 border-dashed border-white/10 rounded-2xl p-10 text-center cursor-pointer hover:border-violet-500/40 transition-all group">
                    <Plus className="w-8 h-8 text-slate-600 group-hover:text-violet-400 mx-auto mb-3 transition-colors" />
                    <p className="text-slate-500 font-semibold group-hover:text-slate-300">Click to add your first goal</p>
                  </div>
                )}
 
                {msg && <p className="text-sm font-semibold text-center py-3 bg-white/5 rounded-xl text-slate-300">{msg}</p>}

                {canEdit && goals.length > 0 && (
                  <div className="flex gap-3">
                    <button onClick={() => saveGoals(false)} disabled={saving}
                      className="flex-1 py-3.5 rounded-2xl border border-white/10 text-slate-300 font-bold text-sm hover:bg-white/5 transition-all disabled:opacity-50">
                      {saving ? 'Saving...' : '💾 Save Draft'}
                    </button>
                    <button 
                      onClick={() => {
                        if (totalWeight !== 100) {
                          setMsg(`⚠️ Cannot submit: Total weightage must equal exactly 100%. Currently, it is ${totalWeight}%. Please adjust your goal weightages.`);
                          return;
                        }
                        saveGoals(true);
                      }}
                      disabled={saving}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" /> {saving ? 'Submitting...' : 'Submit to Manager'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Self Review Tab */}
            {tab === 'review' && (
              <div className="space-y-5">
                {!canReview ? (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                    <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-semibold">Self-review opens after your manager approves your goals.</p>
                    {goalCard && <div className="mt-3"><StatusBadge status={goalCard.status} /></div>}
                  </div>
                ) : (
                  <>
                    <h3 className="text-white font-bold text-lg">Quarter-End Self Assessment</h3>
                    {/* Goal-level self ratings */}
                    {goals.map((g, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                        <p className="text-white font-bold text-sm">{g.title || `Goal ${i+1}`}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-slate-400 text-xs font-bold block mb-2">Self Rating</label>
                            <StarRating value={g.self_rating || 0} onChange={v => updateGoal(i,'self_rating',v)} />
                          </div>
                          <div>
                            <label className="text-slate-400 text-xs font-bold block mb-1.5">Completion %</label>
                            <input type="number" min={0} max={100} value={g.self_completion_pct || 0}
                              onChange={e => updateGoal(i,'self_completion_pct',Number(e.target.value))}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-semibold focus:outline-none focus:border-violet-500/50" />
                          </div>
                        </div>
                        <textarea value={g.achievement_description || ''} onChange={e => updateGoal(i,'achievement_description',e.target.value)}
                          placeholder="Describe what you achieved for this goal..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-violet-500/50 placeholder-slate-600 resize-none" rows={2} />
                      </div>
                    ))}
 
                    {[
                      ['employee_summary','Overall Summary','Summarize your quarter performance...'],
                      ['key_achievements','Key Achievements','List your top achievements this quarter...'],
                      ['challenges_faced','Challenges Faced','What obstacles did you encounter?'],
                      ['learning_outcomes','Learning Outcomes','What did you learn?'],
                      ['next_quarter_plans','Next Quarter Plans','What are your plans for next quarter?'],
                    ].map(([field, label, ph]) => (
                      <div key={field}>
                        <label className="text-slate-400 text-xs font-bold block mb-1.5">{label}</label>
                        <textarea value={(reviewForm as any)[field]} onChange={e => setReviewForm(p => ({...p, [field]: e.target.value}))}
                          placeholder={ph} rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-violet-500/50 placeholder-slate-600 resize-none" />
                      </div>
                    ))}

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                      <div>
                        <label className="text-slate-400 text-xs font-bold block mb-2">Overall Self Rating</label>
                        <StarRating value={reviewForm.overall_self_rating} onChange={v => setReviewForm(p => ({...p, overall_self_rating: v}))} />
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs font-bold block mb-2">Evidence File (optional)</label>
                        <input type="file" onChange={e => setEvidenceFile(e.target.files?.[0] || null)}
                          className="text-slate-400 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-violet-600 file:text-white file:font-bold file:cursor-pointer" />
                      </div>
                    </div>

                    {msg && <p className="text-sm font-semibold text-center py-3 bg-white/5 rounded-xl text-slate-300">{msg}</p>}

                    <button onClick={submitReview} disabled={saving}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" /> {saving ? 'Submitting...' : 'Submit Quarterly Review'}
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
