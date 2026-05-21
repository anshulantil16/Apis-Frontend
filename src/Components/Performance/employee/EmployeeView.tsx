import { useState, useEffect } from 'react';
import {
  Target, Star, CheckCircle, Clock, Plus, Trash2, Send,
  FileText, AlertCircle, ChevronRight, Award,
} from 'lucide-react';
import { PERF_API } from '../../../Pages/PerformancePage';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'sales',      label: '💰 Sales & Revenue',    color: 'amber',   border: 'border-l-amber-400',   bg: 'bg-amber-400/10',   text: 'text-amber-300' },
  { id: 'customer',   label: '🤝 Customer Relations',  color: 'sky',     border: 'border-l-sky-400',     bg: 'bg-sky-400/10',     text: 'text-sky-300' },
  { id: 'learning',   label: '📚 Learning & Growth',   color: 'violet',  border: 'border-l-violet-400',  bg: 'bg-violet-400/10',  text: 'text-violet-300' },
  { id: 'process',    label: '⚙️ Process Excellence',  color: 'emerald', border: 'border-l-emerald-400', bg: 'bg-emerald-400/10', text: 'text-emerald-300' },
  { id: 'innovation', label: '🚀 Innovation',          color: 'rose',    border: 'border-l-rose-400',    bg: 'bg-rose-400/10',    text: 'text-rose-300' },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

const JOURNEY_STEPS = [
  { key: 'goal_setting',   label: 'Set Goals',       icon: Target },
  { key: 'mgr_review',     label: 'Manager Review',  icon: Clock },
  { key: 'goals_approved', label: 'Goals Approved',  icon: CheckCircle },
  { key: 'self_review',    label: 'Self Review',     icon: FileText },
  { key: 'mgr_rating',     label: 'Manager Rating',  icon: Star },
  { key: 'published',      label: 'Published',       icon: Award },
];

function getJourneyStep(gc: any): number {
  if (!gc) return 0;
  const rev = gc.review_data;
  if (rev?.status === 'published') return 5;
  if (rev?.status === 'manager_reviewed' || rev?.status === 'hr_finalized') return 4;
  if (rev?.status === 'submitted') return 3;
  if (gc.status === 'manager_approved' || gc.status === 'hr_approved') return 2;
  if (gc.status === 'submitted') return 1;
  return 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md' }) {
  const [hover, setHover] = useState(0);
  const sz = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          onClick={() => onChange?.(s)}
          onMouseEnter={() => onChange && setHover(s)}
          onMouseLeave={() => setHover(0)}
          disabled={!onChange}
          className={`transition-all ${onChange ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}
        >
          <Star className={`${sz} transition-colors ${
            s <= (hover || value)
              ? 'text-amber-400 fill-amber-400'
              : 'text-slate-600'
          }`} />
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; dot?: string }> = {
    draft:            { cls: 'bg-slate-700/60 text-slate-300 border-slate-600/40', label: 'Draft', dot: 'bg-slate-400' },
    submitted:        { cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30', label: 'Pending Review', dot: 'bg-blue-400 animate-pulse' },
    manager_approved: { cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', label: 'Manager Approved', dot: 'bg-emerald-400' },
    manager_rejected: { cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30', label: 'Changes Requested', dot: 'bg-rose-400' },
    hr_approved:      { cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30', label: 'HR Approved', dot: 'bg-violet-400' },
    finalized:        { cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', label: 'Finalized', dot: 'bg-amber-400' },
  };
  const s = map[status] || { cls: 'bg-slate-700/60 text-slate-300 border-slate-600/40', label: status, dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ─── Journey Stepper ──────────────────────────────────────────────────────────

function JourneyStepper({ step, rejected }: { step: number; rejected?: boolean }) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-4 overflow-x-auto">
      <div className="flex items-center min-w-max mx-auto w-full justify-between px-2">
        {JOURNEY_STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          const isRejected = rejected && i === 1;
          return (
            <div key={s.key} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  isRejected  ? 'bg-rose-500/20 border border-rose-500/40'
                  : done      ? 'bg-emerald-500/20 border border-emerald-500/40'
                  : active    ? 'bg-violet-500/20 border border-violet-500/50 shadow-lg shadow-violet-500/20'
                  : 'bg-white/5 border border-white/10'
                }`}>
                  <Icon className={`w-4 h-4 ${
                    isRejected ? 'text-rose-400'
                    : done     ? 'text-emerald-400'
                    : active   ? 'text-violet-400'
                    : 'text-slate-500'
                  }`} />
                </div>
                <span className={`text-[10px] font-bold whitespace-nowrap ${
                  isRejected ? 'text-rose-400'
                  : done     ? 'text-emerald-400'
                  : active   ? 'text-violet-300'
                  : 'text-slate-500'
                }`}>{isRejected ? 'Rejected' : s.label}</span>
              </div>
              {i < JOURNEY_STEPS.length - 1 && (
                <div className={`w-10 sm:w-16 h-px mx-2 mt-[-12px] ${done ? 'bg-emerald-500/50' : 'bg-white/8'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Weightage Bar ────────────────────────────────────────────────────────────

function WeightageBar({ goals }: { goals: any[] }) {
  const total = goals.reduce((s, g) => s + Number(g.weightage || 0), 0);
  const remaining = 100 - total;
  const colorMap: Record<string, string> = {
    sales: 'bg-amber-400', customer: 'bg-sky-400',
    learning: 'bg-violet-400', process: 'bg-emerald-400', innovation: 'bg-rose-400',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Weightage Allocation</span>
        <span className={`text-sm font-black ${total === 100 ? 'text-emerald-400' : total > 100 ? 'text-rose-400' : 'text-amber-400'}`}>
          {total}% / 100%
        </span>
      </div>
      <div className="h-3 bg-white/5 rounded-full overflow-hidden flex gap-px">
        {goals.map((g, i) => (
          <div
            key={i}
            className={`${colorMap[g.category] || 'bg-slate-400'} transition-all duration-300`}
            style={{ width: `${Math.min(Number(g.weightage || 0), 100)}%` }}
            title={`${g.title || `Goal ${i + 1}`}: ${g.weightage}%`}
          />
        ))}
        {remaining > 0 && <div className="bg-white/5 flex-1" />}
      </div>
      <div className="flex gap-3 mt-2 flex-wrap">
        {goals.map((g, i) => {
          const cat = CAT_MAP[g.category];
          return (
            <span key={i} className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className={`w-2 h-2 rounded-full ${colorMap[g.category] || 'bg-slate-400'}`} />
              G{i + 1}: {g.weightage || 0}%
            </span>
          );
        })}
        {remaining > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400">
            <span className="w-2 h-2 rounded-full bg-white/10" />
            Unallocated: {remaining}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EmployeeView({ employee }: { employee: any }) {
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [goalCard, setGoalCard] = useState<any>(null);
  const [tab, setTab] = useState<'goals' | 'review'>('goals');
  const [goals, setGoals] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | 'warn' } | null>(null);

  const [reviewForm, setReviewForm] = useState({
    employee_summary: '', key_achievements: '', challenges_faced: '',
    learning_outcomes: '', next_quarter_plans: '', overall_self_rating: 0,
  });
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' | 'warn' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  useEffect(() => {
    fetch(`${PERF_API}/cycles/active/`).then(r => r.json()).then(setCycles).catch(() => {});
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

  const updateGoal = (idx: number, field: string, val: any) =>
    setGoals(prev => prev.map((g, i) => i === idx ? { ...g, [field]: val } : g));

  const removeGoal = (idx: number) => setGoals(prev => prev.filter((_, i) => i !== idx));

  const totalWeight = goals.reduce((s, g) => s + Number(g.weightage || 0), 0);

  const saveGoals = async (submit = false) => {
    if (!selectedCycle) return;
    if (submit && totalWeight !== 100) {
      showMsg(`Total weightage is ${totalWeight}%. It must equal exactly 100% before submitting.`, 'warn');
      return;
    }
    setSaving(true);
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
        showMsg('Goals submitted for manager review!', 'success');
        setGoalCard((p: any) => ({ ...p, status: 'submitted' }));
      } else {
        showMsg('Draft saved successfully.', 'success');
      }
    } catch {
      showMsg('Failed to save. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async () => {
    if (!goalCard) return;
    setSaving(true);
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
      if (res.ok) showMsg('Quarterly review submitted successfully!', 'success');
      else showMsg('Submission failed. Please try again.', 'error');
    } catch {
      showMsg('Error submitting review.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const canEdit = !goalCard || goalCard.status === 'draft' || goalCard.status === 'manager_rejected';
  const canReview = goalCard?.status === 'manager_approved' || goalCard?.status === 'hr_approved';
  const journeyStep = getJourneyStep(goalCard);
  const isRejected = goalCard?.status === 'manager_rejected';

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── Profile Header ── */}
        <div className="bg-gradient-to-br from-violet-600/15 to-purple-900/20 border border-violet-500/20 rounded-3xl p-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-violet-500/30 shrink-0">
              {employee.name?.[0] || 'E'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold text-white tracking-tight">{employee.name}</h2>
              <p className="text-violet-300 text-sm font-semibold mt-0.5">{employee.designation}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {employee.department && (
                  <span className="text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/8">
                    {employee.department}
                  </span>
                )}
                {employee.zone && (
                  <span className="text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/8">
                    📍 {employee.zone}
                  </span>
                )}
                {employee.employee_id && (
                  <span className="text-xs text-slate-500">ID: {employee.employee_id}</span>
                )}
              </div>
            </div>
            {goalCard && <div className="shrink-0"><StatusBadge status={goalCard.status} /></div>}
          </div>
        </div>

        {/* ── Journey Stepper ── */}
        {goalCard && <JourneyStepper step={journeyStep} rejected={isRejected} />}

        {/* ── Manager Rejection Feedback ── */}
        {isRejected && goalCard?.manager_remarks && (
          <div className="bg-rose-500/8 border border-rose-500/25 rounded-2xl p-5 flex gap-4">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-rose-300 font-bold text-sm mb-1">Manager requested changes</p>
              <p className="text-slate-300 text-sm">{goalCard.manager_remarks}</p>
            </div>
          </div>
        )}

        {/* ── Manager Approval Message ── */}
        {goalCard?.status === 'manager_approved' && (
          <div className="bg-emerald-500/8 border border-emerald-500/25 rounded-2xl p-4 flex gap-3 items-center">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="text-emerald-300 font-bold text-sm">Goals approved by your manager!</p>
              {goalCard.manager_remarks && <p className="text-slate-400 text-xs mt-0.5">{goalCard.manager_remarks}</p>}
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-500" />
          </div>
        )}

        {/* ── Cycle Selector ── */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Select Quarter</p>
          {cycles.length === 0 ? (
            <div className="flex items-center gap-3 text-slate-500">
              <Clock className="w-4 h-4" />
              <p className="text-sm">No active cycles. Please contact HR.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {cycles.map(c => (
                <button key={c.id} onClick={() => setSelectedCycle(c)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                    selectedCycle?.id === c.id
                      ? 'bg-violet-500/20 border-violet-500/50 text-violet-300 shadow-lg shadow-violet-500/10'
                      : 'bg-white/3 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}>
                  {c.name}
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-md ${
                    selectedCycle?.id === c.id ? 'bg-violet-500/30 text-violet-200' : 'bg-white/5 text-slate-500'
                  }`}>{c.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedCycle && (
          <>
            {/* ── Tabs ── */}
            <div className="flex gap-1 bg-white/3 p-1 rounded-2xl border border-white/8">
              {([
                { id: 'goals', label: 'Set Goals', icon: Target },
                { id: 'review', label: 'Self Review', icon: FileText },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                    tab === t.id
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}>
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* ─────────────── GOALS TAB ─────────────── */}
            {tab === 'goals' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold text-lg">Your Goals — {selectedCycle.name}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Define up to 5 goals that add up to 100% weightage</p>
                  </div>
                  {canEdit && (
                    <button onClick={addGoal} disabled={goals.length >= 5}
                      className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-500/20">
                      <Plus className="w-4 h-4" /> Add Goal
                    </button>
                  )}
                </div>

                {/* Weightage bar */}
                {goals.length > 0 && (
                  <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
                    <WeightageBar goals={goals} />
                  </div>
                )}

                {/* Goal cards */}
                {goals.map((g, i) => {
                  const cat = CAT_MAP[g.category] || CAT_MAP.sales;
                  return (
                    <div key={g._id || g.id || i}
                      className={`bg-white/3 border border-white/8 rounded-2xl overflow-hidden border-l-4 ${cat.border} transition-all hover:border-l-[5px]`}>
                      <div className="p-5 space-y-4">
                        {/* Goal header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${cat.bg} ${cat.text} border-current/20`}>
                              Goal {i + 1}
                            </span>
                            <span className={`text-xs font-semibold ${cat.text}`}>{cat.label}</span>
                          </div>
                          {canEdit && (
                            <button onClick={() => removeGoal(i)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Category + Weightage row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-slate-400 text-xs font-bold block mb-1.5">Category</label>
                            <select disabled={!canEdit} value={g.category}
                              onChange={e => updateGoal(i, 'category', e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-violet-500/50 disabled:opacity-60 cursor-pointer">
                              {CATEGORIES.map(c => <option key={c.id} value={c.id} className="bg-[#1a1a2e]">{c.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-slate-400 text-xs font-bold block mb-1.5">
                              Weightage
                              <span className={`ml-2 font-black ${Number(g.weightage) > 0 ? cat.text : 'text-slate-500'}`}>
                                {g.weightage || 0}%
                              </span>
                            </label>
                            <input disabled={!canEdit} type="range" min={5} max={100} step={5}
                              value={g.weightage || 0}
                              onChange={e => updateGoal(i, 'weightage', Number(e.target.value))}
                              className="w-full accent-violet-500 disabled:opacity-60 cursor-pointer" />
                          </div>
                        </div>

                        {/* Title */}
                        <div>
                          <label className="text-slate-400 text-xs font-bold block mb-1.5">Goal Title <span className="text-rose-400">*</span></label>
                          <input disabled={!canEdit} value={g.title}
                            onChange={e => updateGoal(i, 'title', e.target.value)}
                            placeholder="e.g. Achieve ₹50L revenue in Q1"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-violet-500/50 placeholder-slate-600 disabled:opacity-60 transition" />
                        </div>

                        {/* KPI + Target */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-slate-400 text-xs font-bold block mb-1.5">KPI / Metric</label>
                            <input disabled={!canEdit} value={g.kpi_metric}
                              onChange={e => updateGoal(i, 'kpi_metric', e.target.value)}
                              placeholder="e.g. ₹50L revenue"
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-violet-500/50 placeholder-slate-600 disabled:opacity-60 transition" />
                          </div>
                          <div>
                            <label className="text-slate-400 text-xs font-bold block mb-1.5">Target / Success Criteria</label>
                            <input disabled={!canEdit} value={g.target_value}
                              onChange={e => updateGoal(i, 'target_value', e.target.value)}
                              placeholder="e.g. 100% target achieved"
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-violet-500/50 placeholder-slate-600 disabled:opacity-60 transition" />
                          </div>
                        </div>

                        {/* Ratings row (read-only, if manager has rated) */}
                        {(g.manager_rating || g.final_score) && (
                          <div className="flex items-center gap-4 pt-2 border-t border-white/5 flex-wrap">
                            {g.manager_rating && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Manager:</span>
                                <StarRating value={g.manager_rating} size="sm" />
                              </div>
                            )}
                            {g.final_score && (
                              <span className="ml-auto text-amber-400 font-black text-sm">
                                Score: {Number(g.final_score).toFixed(2)} / 5
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Empty state */}
                {goals.length === 0 && canEdit && (
                  <button onClick={addGoal}
                    className="w-full border-2 border-dashed border-white/10 rounded-2xl p-12 text-center hover:border-violet-500/30 hover:bg-violet-500/3 transition-all group">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 group-hover:bg-violet-500/15 flex items-center justify-center mx-auto mb-4 transition-all">
                      <Plus className="w-7 h-7 text-slate-500 group-hover:text-violet-400 transition-colors" />
                    </div>
                    <p className="text-slate-400 font-bold group-hover:text-slate-200 transition-colors">Add your first goal</p>
                    <p className="text-slate-600 text-sm mt-1">Click to get started for {selectedCycle.name}</p>
                  </button>
                )}

                {/* Submitted read-only state */}
                {goals.length === 0 && !canEdit && (
                  <div className="text-center py-12 text-slate-500">
                    <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-500/40" />
                    <p className="font-bold text-slate-300">Goals submitted</p>
                    <p className="text-sm mt-1">Awaiting manager review</p>
                  </div>
                )}

                {/* Toast */}
                {msg && (
                  <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border font-semibold text-sm ${
                    msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                    : msg.type === 'error'  ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                    : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                  }`}>
                    {msg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" />
                      : msg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" />
                      : <AlertCircle className="w-4 h-4 shrink-0" />}
                    {msg.text}
                  </div>
                )}

                {/* Save / Submit buttons */}
                {canEdit && goals.length > 0 && (
                  <div className="flex gap-3">
                    <button onClick={() => saveGoals(false)} disabled={saving}
                      className="flex-1 py-3.5 rounded-2xl border border-white/10 text-slate-300 font-bold text-sm hover:bg-white/5 hover:border-white/20 transition-all disabled:opacity-50">
                      {saving ? 'Saving...' : '💾 Save Draft'}
                    </button>
                    <button onClick={() => saveGoals(true)} disabled={saving}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
                      <Send className="w-4 h-4" />
                      {saving ? 'Submitting...' : 'Submit to Manager'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ─────────────── SELF REVIEW TAB ─────────────── */}
            {tab === 'review' && (
              <div className="space-y-5">
                {!canReview ? (
                  <div className="bg-white/3 border border-white/8 rounded-2xl p-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-7 h-7 text-slate-500" />
                    </div>
                    <p className="text-white font-bold mb-1">Self-review not available yet</p>
                    <p className="text-slate-400 text-sm">Opens after your manager approves your goals.</p>
                    {goalCard && <div className="mt-4 flex justify-center"><StatusBadge status={goalCard.status} /></div>}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-bold text-lg">Quarter-End Self Assessment</h3>
                      <span className="text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/8">{selectedCycle.name}</span>
                    </div>

                    {/* Per-goal self rating */}
                    {goals.map((g, i) => {
                      const cat = CAT_MAP[g.category] || CAT_MAP.sales;
                      return (
                        <div key={i} className={`bg-white/3 border border-white/8 rounded-2xl overflow-hidden border-l-4 ${cat.border}`}>
                          <div className="p-5 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className={`text-[10px] font-black uppercase tracking-wider ${cat.text}`}>{cat.label}</span>
                                <p className="text-white font-bold text-sm mt-0.5">{g.title || `Goal ${i + 1}`}</p>
                                {g.kpi_metric && <p className="text-slate-500 text-xs mt-0.5">KPI: {g.kpi_metric}</p>}
                              </div>
                              <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-black border ${cat.bg} ${cat.text}`}>
                                {g.weightage}%
                              </span>
                            </div>

                            {/* Completion slider */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-slate-400 text-xs font-bold">Completion</label>
                                <span className={`text-lg font-black ${
                                  (g.self_completion_pct || 0) >= 80 ? 'text-emerald-400'
                                  : (g.self_completion_pct || 0) >= 50 ? 'text-violet-400'
                                  : 'text-amber-400'
                                }`}>{g.self_completion_pct || 0}%</span>
                              </div>
                              <input type="range" min={0} max={100} step={5}
                                value={g.self_completion_pct || 0}
                                onChange={e => updateGoal(i, 'self_completion_pct', Number(e.target.value))}
                                className="w-full accent-violet-500" />
                              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-1.5">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    (g.self_completion_pct || 0) >= 80 ? 'bg-emerald-400'
                                    : (g.self_completion_pct || 0) >= 50 ? 'bg-violet-400'
                                    : 'bg-amber-400'
                                  }`}
                                  style={{ width: `${g.self_completion_pct || 0}%` }}
                                />
                              </div>
                            </div>

                            {/* Self rating */}
                            <div className="flex items-center justify-between">
                              <label className="text-slate-400 text-xs font-bold">Self Rating</label>
                              <StarRating value={g.self_rating || 0} onChange={v => updateGoal(i, 'self_rating', v)} />
                            </div>

                            {/* Achievement */}
                            <textarea value={g.achievement_description || ''}
                              onChange={e => updateGoal(i, 'achievement_description', e.target.value)}
                              placeholder="What did you achieve on this goal?"
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder-slate-600 resize-none transition"
                              rows={2} />
                          </div>
                        </div>
                      );
                    })}

                    {/* Review text fields */}
                    {[
                      { field: 'employee_summary', label: 'Overall Summary', icon: '📋', ph: 'Summarize your quarter performance...' },
                      { field: 'key_achievements', label: 'Key Achievements', icon: '🏆', ph: 'List your top wins this quarter...' },
                      { field: 'challenges_faced', label: 'Challenges Faced', icon: '⚡', ph: 'What obstacles did you face?' },
                      { field: 'learning_outcomes', label: 'Learning Outcomes', icon: '📚', ph: 'What new skills or insights did you gain?' },
                      { field: 'next_quarter_plans', label: 'Next Quarter Plans', icon: '🎯', ph: 'What are your plans for next quarter?' },
                    ].map(({ field, label, icon, ph }) => (
                      <div key={field} className="bg-white/3 border border-white/8 rounded-2xl p-5">
                        <label className="flex items-center gap-2 text-slate-300 text-sm font-bold mb-3">
                          <span>{icon}</span> {label}
                        </label>
                        <textarea value={(reviewForm as any)[field]}
                          onChange={e => setReviewForm(p => ({ ...p, [field]: e.target.value }))}
                          placeholder={ph} rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder-slate-600 resize-none transition" />
                      </div>
                    ))}

                    {/* Overall rating + evidence */}
                    <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-slate-300 text-sm font-bold block mb-1">⭐ Overall Self Rating</label>
                          <p className="text-slate-500 text-xs">How would you rate your overall quarter?</p>
                        </div>
                        <StarRating value={reviewForm.overall_self_rating}
                          onChange={v => setReviewForm(p => ({ ...p, overall_self_rating: v }))} />
                      </div>
                      <div className="border-t border-white/5 pt-4">
                        <label className="text-slate-300 text-sm font-bold block mb-2">📎 Evidence File <span className="text-slate-500 font-normal">(optional)</span></label>
                        <p className="text-slate-500 text-xs mb-3">Upload your base sheet, report, or supporting document</p>
                        <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 hover:border-violet-500/30 rounded-xl cursor-pointer transition-all group">
                          <div className="w-9 h-9 rounded-xl bg-violet-500/15 group-hover:bg-violet-500/25 flex items-center justify-center transition-all">
                            <FileText className="w-4 h-4 text-violet-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-300 text-sm font-semibold">{evidenceFile ? evidenceFile.name : 'Choose file to upload'}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{evidenceFile ? `${(evidenceFile.size / 1024).toFixed(1)} KB` : 'Excel, PDF, or any document'}</p>
                          </div>
                          <input type="file" className="hidden" onChange={e => setEvidenceFile(e.target.files?.[0] || null)} />
                        </label>
                      </div>
                    </div>

                    {msg && (
                      <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border font-semibold text-sm ${
                        msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                        : msg.type === 'error'  ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                        : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                      }`}>
                        {msg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                        {msg.text}
                      </div>
                    )}

                    <button onClick={submitReview} disabled={saving}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
                      <CheckCircle className="w-5 h-5" />
                      {saving ? 'Submitting...' : 'Submit Quarterly Review'}
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
