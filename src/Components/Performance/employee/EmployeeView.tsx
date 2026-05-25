import { useState, useEffect } from 'react';
import {
  Target, Star, CheckCircle, Clock, Plus, Trash2, Send,
  FileText, AlertCircle, ChevronRight, Award, TrendingUp, Lock, Unlock,
} from 'lucide-react';
import { PERF_API } from '../../../Pages/PerformancePage';

// ─── Color palette ─────────────────────────────────────────────────────────────

const GOAL_COLORS = [
  { border: 'border-l-violet-500', bg: 'bg-violet-500/10',   text: 'text-violet-300',   bar: 'bg-violet-500',   glow: 'shadow-violet-500/20' },
  { border: 'border-l-amber-500',  bg: 'bg-amber-500/10',    text: 'text-amber-300',    bar: 'bg-amber-500',    glow: 'shadow-amber-500/20' },
  { border: 'border-l-sky-500',    bg: 'bg-sky-500/10',      text: 'text-sky-300',      bar: 'bg-sky-500',      glow: 'shadow-sky-500/20' },
  { border: 'border-l-emerald-500',bg: 'bg-emerald-500/10',  text: 'text-emerald-300',  bar: 'bg-emerald-500',  glow: 'shadow-emerald-500/20' },
  { border: 'border-l-rose-500',   bg: 'bg-rose-500/10',     text: 'text-rose-300',     bar: 'bg-rose-500',     glow: 'shadow-rose-500/20' },
];
const getGoalColor = (i: number) => GOAL_COLORS[i % GOAL_COLORS.length];

const JOURNEY_STEPS = [
  { key: 'goal_setting',   label: 'Set Goals',     icon: Target },
  { key: 'mgr_review',     label: 'Mgr Review',    icon: Clock },
  { key: 'goals_approved', label: 'Approved',      icon: CheckCircle },
  { key: 'self_review',    label: 'Self Review',   icon: FileText },
  { key: 'mgr_rating',     label: 'Mgr Rating',    icon: Star },
  { key: 'published',      label: 'Published',     icon: Award },
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

function StarRating({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md' | 'lg' }) {
  const [hover, setHover] = useState(0);
  const sz = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} onClick={() => onChange?.(s)}
          onMouseEnter={() => onChange && setHover(s)}
          onMouseLeave={() => setHover(0)}
          disabled={!onChange}
          className={`transition-all ${onChange ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}>
          <Star className={`${sz} transition-colors ${s <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; dot: string }> = {
    draft:            { cls: 'bg-slate-800 text-slate-400 border-slate-700',          label: 'Draft',             dot: 'bg-slate-500' },
    submitted:        { cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30',       label: 'Pending Review',    dot: 'bg-blue-400 animate-pulse' },
    manager_approved: { cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', label: 'Manager Approved', dot: 'bg-emerald-400' },
    manager_rejected: { cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30',       label: 'Changes Requested', dot: 'bg-rose-400' },
    hr_approved:      { cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30', label: 'HR Approved',       dot: 'bg-violet-400' },
    finalized:        { cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',    label: 'Finalized',         dot: 'bg-amber-400' },
  };
  const s = map[status] || { cls: 'bg-slate-800 text-slate-400 border-slate-700', label: status, dot: 'bg-slate-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function JourneyStepper({ step, rejected }: { step: number; rejected?: boolean }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-4 overflow-x-auto">
      <div className="flex items-center min-w-max mx-auto justify-between">
        {JOURNEY_STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          const isRejected = rejected && i === 1;
          return (
            <div key={s.key} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5 min-w-[60px]">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  isRejected ? 'bg-rose-500/20 border-2 border-rose-500/50 shadow-lg shadow-rose-500/20'
                  : done     ? 'bg-emerald-500/20 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20'
                  : active   ? 'bg-violet-500/20 border-2 border-violet-500/60 shadow-lg shadow-violet-500/30'
                  : 'bg-white/[0.04] border border-white/[0.08]'
                }`}>
                  <Icon className={`w-4 h-4 ${
                    isRejected ? 'text-rose-400'
                    : done     ? 'text-emerald-400'
                    : active   ? 'text-violet-300'
                    : 'text-slate-600'
                  }`} />
                </div>
                <span className={`text-[10px] font-bold text-center leading-tight ${
                  isRejected ? 'text-rose-400'
                  : done     ? 'text-emerald-400'
                  : active   ? 'text-violet-300'
                  : 'text-slate-600'
                }`}>{isRejected ? 'Rejected' : s.label}</span>
              </div>
              {i < JOURNEY_STEPS.length - 1 && (
                <div className={`w-8 sm:w-14 h-0.5 mx-2 rounded-full mt-[-14px] transition-all ${done ? 'bg-gradient-to-r from-emerald-500/60 to-emerald-500/20' : 'bg-white/[0.06]'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeightageBar({ goals }: { goals: any[] }) {
  const total = goals.reduce((s, g) => s + Number(g.weightage || 0), 0);
  const remaining = 100 - total;
  const isOk = total === 100;
  const isOver = total > 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Weightage Allocation</span>
        <div className="flex items-center gap-2">
          <span className={`text-base font-black ${isOk ? 'text-emerald-400' : isOver ? 'text-rose-400' : 'text-amber-400'}`}>
            {total}%
          </span>
          <span className="text-slate-600 text-xs">/ 100%</span>
          {isOk && <span className="text-emerald-400 text-xs font-bold">✓ Perfect</span>}
        </div>
      </div>
      <div className="h-2.5 bg-white/[0.04] rounded-full overflow-hidden flex gap-px">
        {goals.map((g, i) => (
          <div key={i}
            className={`${getGoalColor(i).bar} transition-all duration-500 rounded-full`}
            style={{ width: `${Math.min(Number(g.weightage || 0), 100)}%` }}
            title={`Goal ${i+1}: ${g.weightage}%`} />
        ))}
        {remaining > 0 && <div className="bg-white/[0.04] flex-1 rounded-full" />}
      </div>
      <div className="flex gap-4 mt-2.5 flex-wrap">
        {goals.map((g, i) => (
          <span key={i} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className={`w-2 h-2 rounded-full ${getGoalColor(i).bar}`} />
            G{i + 1} <span className="font-bold text-slate-400">{g.weightage || 0}%</span>
          </span>
        ))}
        {remaining > 0 && (
          <span className="flex items-center gap-1.5 text-[11px] text-amber-500/70">
            <span className="w-2 h-2 rounded-full bg-white/10 border border-white/20" />
            Remaining <span className="font-bold">{remaining}%</span>
          </span>
        )}
      </div>
    </div>
  );
}

function Toast({ msg }: { msg: { text: string; type: 'success' | 'error' | 'warn' } | null }) {
  if (!msg) return null;
  const cfg = {
    success: { cls: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300', icon: <CheckCircle className="w-4 h-4 shrink-0" /> },
    error:   { cls: 'bg-rose-500/10 border-rose-500/25 text-rose-300',         icon: <AlertCircle className="w-4 h-4 shrink-0" /> },
    warn:    { cls: 'bg-amber-500/10 border-amber-500/25 text-amber-300',       icon: <AlertCircle className="w-4 h-4 shrink-0" /> },
  }[msg.type];
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border font-semibold text-sm ${cfg.cls}`}>
      {cfg.icon} {msg.text}
    </div>
  );
}

// ─── Cycle Phase Banner ───────────────────────────────────────────────────────

const PHASE_INFO: Record<string, {
  icon: JSX.Element; title: string; desc: string;
  cls: string; border: string; locked: boolean;
}> = {
  draft: {
    icon: <Clock className="w-4 h-4" />,
    title: 'Cycle Not Yet Open',
    desc: 'This cycle has not been opened for goal setting. Contact HR.',
    cls: 'text-slate-400 bg-slate-500/8', border: 'border-slate-500/20', locked: true,
  },
  goal_setting: {
    icon: <Unlock className="w-4 h-4" />,
    title: 'Goal Setting Open',
    desc: 'You can add, edit, and submit your goals for manager approval.',
    cls: 'text-emerald-300 bg-emerald-500/8', border: 'border-emerald-500/20', locked: false,
  },
  goals_locked: {
    icon: <Lock className="w-4 h-4" />,
    title: 'Goals Locked',
    desc: 'Goal setting is closed. Wait for HR to open the review phase.',
    cls: 'text-amber-300 bg-amber-500/8', border: 'border-amber-500/20', locked: true,
  },
  review_open: {
    icon: <FileText className="w-4 h-4" />,
    title: 'Review Phase Open',
    desc: 'Goals are locked. Submit your quarterly self-review and evidence now.',
    cls: 'text-blue-300 bg-blue-500/8', border: 'border-blue-500/20', locked: false,
  },
  closed: {
    icon: <Lock className="w-4 h-4" />,
    title: 'Cycle Closed',
    desc: 'This performance cycle has been closed by HR.',
    cls: 'text-slate-400 bg-slate-500/8', border: 'border-slate-500/20', locked: true,
  },
};

function CyclePhaseBanner({ cycle }: { cycle: any }) {
  const info = PHASE_INFO[cycle.status] || PHASE_INFO['draft'];
  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <div className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border ${info.cls} ${info.border}`}>
      <span className="mt-0.5 shrink-0">{info.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">{info.title}</p>
        <p className="text-xs opacity-70 mt-0.5">{info.desc}</p>
        {/* Deadlines */}
        <div className="flex flex-wrap gap-3 mt-2">
          {cycle.goal_setting_deadline && (
            <span className="text-[11px] opacity-60">
              Goal deadline: <strong>{fmt(cycle.goal_setting_deadline)}</strong>
            </span>
          )}
          {cycle.review_deadline && (
            <span className="text-[11px] opacity-60">
              Review deadline: <strong>{fmt(cycle.review_deadline)}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
    support_required: '', training_needs: '', career_aspirations: '',
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
    _id: Date.now(), category: '', title: '', description: '',
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goals }),
      });
      const data = await res.json();
      setGoalCard(data);
      if (submit) {
        await fetch(`${PERF_API}/goal-cards/${data.id}/submit/`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: 'Submitted for manager review.' }),
        });
        showMsg('Goals submitted for manager review!');
        setGoalCard((p: any) => ({ ...p, status: 'submitted' }));
      } else {
        showMsg('Draft saved.');
      }
    } catch { showMsg('Failed to save. Please try again.', 'error'); }
    finally { setSaving(false); }
  };

  const submitReview = async () => {
    if (!goalCard) return;
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(reviewForm).forEach(([k, v]) => fd.append(k, String(v)));
      goals.forEach((g, i) => {
        fd.append(`goal_ratings[${i}][goal_id]`, g.id);
        fd.append(`goal_ratings[${i}][self_rating]`, g.self_rating);
        fd.append(`goal_ratings[${i}][self_completion_pct]`, g.self_completion_pct);
        fd.append(`goal_ratings[${i}][self_comments]`, g.self_comments || '');
        fd.append(`goal_ratings[${i}][achievement_description]`, g.achievement_description || '');
      });
      if (evidenceFile) fd.append('evidence_file', evidenceFile);
      const res = await fetch(`${PERF_API}/reviews/${goalCard.id}/`, { method: 'POST', body: fd });
      if (res.ok) showMsg('Quarterly review submitted!');
      else showMsg('Submission failed.', 'error');
    } catch { showMsg('Error submitting review.', 'error'); }
    finally { setSaving(false); }
  };

  const cycleStatus = selectedCycle?.status;
  // Goal editing is only allowed when the cycle is in goal_setting phase
  const canEdit = cycleStatus === 'goal_setting' &&
    (!goalCard || goalCard.status === 'draft' || goalCard.status === 'manager_rejected');
  // Quarterly review can only be submitted during review_open phase
  const canReview = cycleStatus === 'review_open' &&
    (goalCard?.status === 'manager_approved' || goalCard?.status === 'hr_approved');
  const journeyStep = getJourneyStep(goalCard);
  const isRejected = goalCard?.status === 'manager_rejected';
  const goalsLocked = cycleStatus && cycleStatus !== 'goal_setting';

  return (
    <div className="min-h-screen bg-[#080818] p-4 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* ── Profile Card ── */}
        <div className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/25 via-violet-900/15 to-transparent" />
          <div className="absolute inset-0 border border-violet-500/20 rounded-3xl" />
          <div className="relative p-6 flex items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-violet-500/40 rounded-2xl blur-md scale-110" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-700 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-violet-500/30">
                {employee.name?.[0] || 'E'}
              </div>
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold text-white tracking-tight truncate">{employee.name}</h2>
              <p className="text-violet-300 text-sm font-semibold mt-0.5">{employee.designation}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {employee.department && (
                  <span className="text-[11px] text-slate-400 bg-white/[0.06] px-2.5 py-1 rounded-lg border border-white/[0.08]">
                    {employee.department}
                  </span>
                )}
                {employee.zone && (
                  <span className="text-[11px] text-slate-400 bg-white/[0.06] px-2.5 py-1 rounded-lg border border-white/[0.08]">
                    📍 {employee.zone}
                  </span>
                )}
                {employee.employee_id && (
                  <span className="text-[11px] text-slate-500 font-mono">#{employee.employee_id}</span>
                )}
                {employee.reporting_manager_id && (
                  <span className="text-[11px] text-slate-400 bg-white/[0.06] px-2.5 py-1 rounded-lg border border-white/[0.08]">
                    Reports to: {employee.manager_name || employee.reporting_manager_id}
                  </span>
                )}
                {employee.joined_date && (
                  <span className="text-[11px] text-slate-400 bg-white/[0.06] px-2.5 py-1 rounded-lg border border-white/[0.08]">
                    Joined: {new Date(employee.joined_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            </div>
            {goalCard && <div className="shrink-0"><StatusBadge status={goalCard.status} /></div>}
          </div>
        </div>

        {/* ── Journey ── */}
        {goalCard && <JourneyStepper step={journeyStep} rejected={isRejected} />}

        {/* ── Alerts ── */}
        {isRejected && goalCard?.manager_remarks && (
          <div className="bg-rose-500/[0.07] border border-rose-500/20 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-rose-300 font-bold text-sm">Manager requested changes</p>
              <p className="text-slate-300 text-sm mt-1">{goalCard.manager_remarks}</p>
            </div>
          </div>
        )}
        {goalCard?.status === 'manager_approved' && (
          <div className="bg-emerald-500/[0.07] border border-emerald-500/20 rounded-2xl p-4 flex gap-3 items-center">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="text-emerald-300 font-bold text-sm">Goals approved — you can now do your self-review</p>
              {goalCard.manager_remarks && <p className="text-slate-400 text-xs mt-0.5">{goalCard.manager_remarks}</p>}
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-600" />
          </div>
        )}

        {/* ── Cycle selector ── */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-3">Select Quarter</p>
          {cycles.length === 0 ? (
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <Clock className="w-4 h-4" /> No active cycles. Contact HR.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {cycles.map(c => (
                <button key={c.id} onClick={() => setSelectedCycle(c)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border ${
                    selectedCycle?.id === c.id
                      ? 'bg-violet-600/30 border-violet-500/50 text-violet-200 shadow-lg shadow-violet-500/10'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}>
                  {c.name}
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    selectedCycle?.id === c.id ? 'bg-violet-500/30 text-violet-200' : 'bg-white/5 text-slate-600'
                  }`}>{c.status.replace(/_/g,' ')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedCycle && (
          <>
            {/* ── Phase Banner ── */}
            <CyclePhaseBanner cycle={selectedCycle} />

            {/* ── Tabs ── */}
            <div className="flex gap-1 bg-white/[0.03] p-1 rounded-2xl border border-white/[0.06]">
              {([
                { id: 'goals',  label: 'KRA / Goal Setting', icon: cycleStatus === 'goal_setting' ? Target : Lock },
                { id: 'review', label: 'Self Review',        icon: cycleStatus === 'review_open'  ? FileText : Lock },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                    tab === t.id
                      ? 'bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-lg shadow-violet-500/20'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}>
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* ═══════════════ GOALS TAB ═══════════════ */}
            {tab === 'goals' && (
              <div className="space-y-4">

                {canEdit ? (
                  /* ── EDITING MODE (goal_setting phase, draft/rejected status) ── */
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-bold text-lg">{selectedCycle.name} — KRA Goals</h3>
                        <p className="text-slate-500 text-xs mt-0.5">Up to 5 goals · total weightage must equal 100%</p>
                      </div>
                      <button onClick={addGoal} disabled={goals.length >= 5}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-500/20 active:scale-95">
                        <Plus className="w-4 h-4" /> Add Goal
                      </button>
                    </div>

                    {goals.length > 0 && (
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                        <WeightageBar goals={goals} />
                      </div>
                    )}

                    {goals.length === 0 && (
                      <button onClick={addGoal}
                        className="w-full border-2 border-dashed border-white/[0.08] rounded-2xl p-12 text-center hover:border-violet-500/30 hover:bg-violet-500/[0.03] transition-all group">
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] group-hover:bg-violet-500/15 flex items-center justify-center mx-auto mb-4 transition-all">
                          <Plus className="w-7 h-7 text-slate-600 group-hover:text-violet-400 transition-colors" />
                        </div>
                        <p className="text-slate-400 font-bold group-hover:text-slate-200 transition-colors">Add your first goal</p>
                        <p className="text-slate-600 text-sm mt-1">Click to get started for {selectedCycle.name}</p>
                      </button>
                    )}
                  </>
                ) : (
                  /* ── READ-ONLY / LOCKED MODE ── */
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold text-lg">{selectedCycle.name} — KRA Goals</h3>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {goalCard
                          ? `${goals.length} goal${goals.length !== 1 ? 's' : ''} · read-only`
                          : 'No goals on record'}
                      </p>
                    </div>
                    {goalCard && <StatusBadge status={goalCard.status} />}
                  </div>
                )}

                {/* Goals list — shown in both edit and read-only mode when goals exist */}
                {goals.map((g, i) => {
                  const col = getGoalColor(i);
                  return (
                    <div key={g._id || g.id || i}
                      className={`relative bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden border-l-[3px] ${col.border} transition-all hover:bg-white/[0.05]`}>
                      <div className="p-5 space-y-4">
                        {/* Header row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${col.bg} ${col.text}`}>
                              Goal {i + 1}
                            </span>
                            {g.category && (
                              <span className={`text-xs font-semibold ${col.text} opacity-80`}>{g.category}</span>
                            )}
                          </div>
                          {canEdit && (
                            <button onClick={() => removeGoal(i)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Category + Weightage */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1.5">Category</label>
                            <input disabled={!canEdit} value={g.category}
                              onChange={e => updateGoal(i, 'category', e.target.value)}
                              placeholder="e.g. Sales, Collections…"
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-violet-500/50 placeholder-slate-700 disabled:opacity-50 transition-all" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Weightage</label>
                              <span className={`text-base font-black ${col.text}`}>{g.weightage || 0}%</span>
                            </div>
                            <input disabled={!canEdit} type="range" min={5} max={100} step={5}
                              value={g.weightage || 0}
                              onChange={e => updateGoal(i, 'weightage', Number(e.target.value))}
                              className="w-full accent-violet-500 disabled:opacity-50 cursor-pointer mt-1" />
                          </div>
                        </div>

                        {/* KRA Title */}
                        <div>
                          <label className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1.5">
                            KRA — Key Result Area {canEdit && <span className="text-rose-500">*</span>}
                          </label>
                          <input disabled={!canEdit} value={g.title}
                            onChange={e => updateGoal(i, 'title', e.target.value)}
                            placeholder="e.g. Achieve ₹50L revenue in Q1…"
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-violet-500/50 placeholder-slate-700 disabled:opacity-50 transition-all" />
                        </div>

                        {/* KPI + Target */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1.5">KPI / Metric</label>
                            <input disabled={!canEdit} value={g.kpi_metric}
                              onChange={e => updateGoal(i, 'kpi_metric', e.target.value)}
                              placeholder="e.g. ₹50L revenue"
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder-slate-700 disabled:opacity-50 transition-all" />
                          </div>
                          <div>
                            <label className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1.5">Target</label>
                            <input disabled={!canEdit} value={g.target_value}
                              onChange={e => updateGoal(i, 'target_value', e.target.value)}
                              placeholder="e.g. 100% target achieved"
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder-slate-700 disabled:opacity-50 transition-all" />
                          </div>
                        </div>

                        {/* Ratings (read-only) */}
                        {(g.manager_rating || g.final_score) && (
                          <div className="flex items-center gap-4 pt-3 border-t border-white/[0.05] flex-wrap">
                            {g.manager_rating && (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-500 font-semibold">Manager:</span>
                                <StarRating value={g.manager_rating} size="sm" />
                              </div>
                            )}
                            {g.final_score && (
                              <span className={`ml-auto text-sm font-black ${col.text}`}>
                                Score: {Number(g.final_score).toFixed(2)}/5
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* No goals set and phase is locked — can't do anything */}
                {goals.length === 0 && !canEdit && goalCard && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-10 text-center">
                    <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-500/40" />
                    <p className="font-bold text-slate-400">Goals submitted</p>
                    <p className="text-slate-600 text-sm mt-1">Your goals are under review.</p>
                  </div>
                )}

                {goals.length === 0 && !canEdit && !goalCard && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-10 text-center">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                    <p className="font-bold text-slate-500">No goals were set for this cycle.</p>
                  </div>
                )}

                <Toast msg={msg} />

                {canEdit && goals.length > 0 && (
                  <div className="flex gap-3">
                    <button onClick={() => saveGoals(false)} disabled={saving}
                      className="flex-1 py-3.5 rounded-2xl border border-white/[0.1] text-slate-300 font-bold text-sm hover:bg-white/[0.04] hover:border-white/20 transition-all disabled:opacity-50">
                      {saving ? 'Saving…' : '💾 Save Draft'}
                    </button>
                    <button onClick={() => saveGoals(true)} disabled={saving}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 active:scale-[0.98]">
                      <Send className="w-4 h-4" />
                      {saving ? 'Submitting…' : 'Submit to Manager'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════ SELF REVIEW TAB ═══════════════ */}
            {tab === 'review' && (
              <div className="space-y-4">
                {/* Phase-locked: reviews not open yet */}
                {cycleStatus !== 'review_open' ? (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-14 text-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                      cycleStatus === 'goal_setting' ? 'bg-violet-500/10' : 'bg-amber-500/10'
                    }`}>
                      <Lock className={`w-8 h-8 ${cycleStatus === 'goal_setting' ? 'text-violet-500' : 'text-amber-500'}`} />
                    </div>
                    <p className="text-white font-bold mb-1">
                      {cycleStatus === 'goal_setting' ? 'Review Phase Not Open Yet' : PHASE_INFO[cycleStatus!]?.title || 'Review Locked'}
                    </p>
                    <p className="text-slate-500 text-sm mt-1">
                      {cycleStatus === 'goal_setting'
                        ? 'Complete and submit your goals first. Reviews open once goals are locked and HR opens the review window.'
                        : PHASE_INFO[cycleStatus!]?.desc}
                    </p>
                    {goalCard && <div className="mt-5 flex justify-center"><StatusBadge status={goalCard.status} /></div>}
                  </div>
                ) : !canReview ? (
                  /* Review phase IS open but goals aren't approved yet */
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-14 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="text-white font-bold mb-1">Waiting for manager to approve your goals</p>
                    <p className="text-slate-500 text-sm mt-1">Review phase is open, but you need manager-approved goals before submitting your self-assessment.</p>
                    {goalCard && <div className="mt-5 flex justify-center"><StatusBadge status={goalCard.status} /></div>}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-bold text-lg">Quarter-End Self Assessment</h3>
                      <span className="text-[11px] text-slate-500 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/[0.07]">{selectedCycle.name}</span>
                    </div>

                    {/* Per-goal self rating */}
                    {goals.map((g, i) => {
                      const col = getGoalColor(i);
                      return (
                        <div key={i} className={`bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden border-l-[3px] ${col.border}`}>
                          <div className="p-5 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                {g.category && <span className={`text-[10px] font-black uppercase tracking-wider ${col.text}`}>{g.category}</span>}
                                <p className="text-white font-bold text-sm mt-0.5">{g.title || `Goal ${i + 1}`}</p>
                                {g.kpi_metric && <p className="text-slate-500 text-xs mt-0.5">KPI: {g.kpi_metric} · Target: {g.target_value}</p>}
                              </div>
                              <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-black ${col.bg} ${col.text}`}>
                                {g.weightage}%
                              </span>
                            </div>

                            {/* Completion */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Completion</label>
                                <span className={`text-lg font-black ${
                                  (g.self_completion_pct || 0) >= 80 ? 'text-emerald-400'
                                  : (g.self_completion_pct || 0) >= 50 ? 'text-violet-400' : 'text-amber-400'
                                }`}>{g.self_completion_pct || 0}%</span>
                              </div>
                              <input type="range" min={0} max={100} step={5}
                                value={g.self_completion_pct || 0}
                                onChange={e => updateGoal(i, 'self_completion_pct', Number(e.target.value))}
                                className="w-full accent-violet-500" />
                              <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mt-1.5">
                                <div className={`h-full rounded-full transition-all duration-500 ${
                                  (g.self_completion_pct || 0) >= 80 ? 'bg-emerald-500'
                                  : (g.self_completion_pct || 0) >= 50 ? 'bg-violet-500' : 'bg-amber-500'
                                }`} style={{ width: `${g.self_completion_pct || 0}%` }} />
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <label className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Self Rating</label>
                              <StarRating value={g.self_rating || 0} onChange={v => updateGoal(i, 'self_rating', v)} />
                            </div>

                            <textarea value={g.achievement_description || ''}
                              onChange={e => updateGoal(i, 'achievement_description', e.target.value)}
                              placeholder="What did you achieve on this goal? Be specific."
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder-slate-700 resize-none transition-all"
                              rows={2} />
                          </div>
                        </div>
                      );
                    })}

                    {/* Section D – Self remarks */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-white/[0.05] flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-violet-400" />
                        <p className="text-slate-300 text-sm font-bold">Section D — Employee Self Remarks</p>
                      </div>
                      <div className="p-5 space-y-4">
                        {[
                          { field: 'key_achievements',   label: 'Key Achievements',   ph: 'List your top wins this quarter…' },
                          { field: 'challenges_faced',   label: 'Challenges Faced',   ph: 'What obstacles did you face?' },
                          { field: 'support_required',   label: 'Support Required',   ph: 'What support do you need from the organisation?' },
                          { field: 'training_needs',     label: 'Training Needs',     ph: 'What skills or training would help you grow?' },
                          { field: 'career_aspirations', label: 'Career Aspirations', ph: 'Where do you see yourself in 1-2 years?' },
                          { field: 'employee_summary',   label: 'Overall Summary',    ph: 'Summarise your overall quarter performance…' },
                          { field: 'next_quarter_plans', label: 'Next Quarter Plans',  ph: 'What are your plans for next quarter?' },
                        ].map(({ field, label, ph }) => (
                          <div key={field}>
                            <label className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1.5">{label}</label>
                            <textarea value={(reviewForm as any)[field]}
                              onChange={e => setReviewForm(p => ({ ...p, [field]: e.target.value }))}
                              placeholder={ph} rows={2}
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder-slate-700 resize-none transition-all" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Overall rating + evidence */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-300 text-sm font-bold">Overall Self Rating</p>
                          <p className="text-slate-600 text-xs mt-0.5">How would you rate your overall quarter?</p>
                        </div>
                        <StarRating value={reviewForm.overall_self_rating} size="lg"
                          onChange={v => setReviewForm(p => ({ ...p, overall_self_rating: v }))} />
                      </div>
                      <div className="border-t border-white/[0.05] pt-4">
                        <p className="text-slate-300 text-sm font-bold mb-1">Evidence File <span className="text-slate-600 font-normal text-xs">(optional)</span></p>
                        <p className="text-slate-600 text-xs mb-3">Upload base sheet, report, or supporting document</p>
                        <label className="flex items-center gap-3 px-4 py-3 bg-white/[0.04] border border-white/[0.08] hover:border-violet-500/30 rounded-xl cursor-pointer transition-all group">
                          <div className="w-9 h-9 rounded-xl bg-violet-500/15 group-hover:bg-violet-500/25 flex items-center justify-center transition-all">
                            <FileText className="w-4 h-4 text-violet-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-300 text-sm font-semibold">{evidenceFile ? evidenceFile.name : 'Choose file to upload'}</p>
                            <p className="text-slate-600 text-xs mt-0.5">{evidenceFile ? `${(evidenceFile.size / 1024).toFixed(1)} KB` : 'Excel, PDF, or any document'}</p>
                          </div>
                          <input type="file" className="hidden" onChange={e => setEvidenceFile(e.target.files?.[0] || null)} />
                        </label>
                      </div>
                    </div>

                    <Toast msg={msg} />

                    <button onClick={submitReview} disabled={saving}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 active:scale-[0.98]">
                      <CheckCircle className="w-5 h-5" />
                      {saving ? 'Submitting…' : 'Submit Quarterly Review'}
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
