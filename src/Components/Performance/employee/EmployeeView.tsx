import { useState, useEffect, type ReactNode } from 'react';
import {
  Target, Star, CheckCircle, Clock, Plus, Trash2, Send,
  FileText, AlertCircle, ChevronRight, Award, TrendingUp, Lock, Unlock, Download,
} from 'lucide-react';
import { PERF_API } from '../../../features/performance/PerformancePage';
import { TOOL_STYLES } from '../../toolStyles';

// ─── Color palette ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Financial',
  'Customer Enhancement',
  'Internal Business Process',
  'People Development',
];

const GOAL_COLORS = [
  { border: 'border-l-violet-500', bg: 'bg-violet-50',   text: 'text-violet-600',   bar: 'bg-violet-500',   glow: 'shadow-violet-500/20' },
  { border: 'border-l-amber-500',  bg: 'bg-amber-50',    text: 'text-amber-600',    bar: 'bg-amber-500',    glow: 'shadow-amber-500/20' },
  { border: 'border-l-sky-500',    bg: 'bg-sky-50',      text: 'text-sky-600',      bar: 'bg-sky-500',      glow: 'shadow-sky-500/20' },
  { border: 'border-l-emerald-500',bg: 'bg-emerald-50',  text: 'text-emerald-600',  bar: 'bg-emerald-500',  glow: 'shadow-emerald-500/20' },
  { border: 'border-l-rose-500',   bg: 'bg-rose-50',     text: 'text-rose-600',     bar: 'bg-rose-500',     glow: 'shadow-rose-500/20' },
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
          <Star className={`${sz} transition-colors ${s <= (hover || value) ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; dot: string }> = {
    draft:            { cls: 'bg-slate-100 text-slate-500 border-slate-200',          label: 'Draft',             dot: 'bg-slate-400' },
    submitted:        { cls: 'bg-blue-50 text-blue-600 border-blue-200',       label: 'Pending Review',    dot: 'bg-blue-500 animate-pulse' },
    manager_approved: { cls: 'bg-emerald-50 text-emerald-600 border-emerald-200', label: 'Manager Approved', dot: 'bg-emerald-500' },
    manager_rejected: { cls: 'bg-rose-50 text-rose-600 border-rose-200',       label: 'Changes Requested', dot: 'bg-rose-500' },
    hr_approved:      { cls: 'bg-violet-50 text-violet-600 border-violet-200', label: 'HR Approved',       dot: 'bg-violet-500' },
    finalized:        { cls: 'bg-amber-50 text-amber-600 border-amber-200',    label: 'Finalized',         dot: 'bg-amber-500' },
  };
  const s = map[status] || { cls: 'bg-slate-100 text-slate-500 border-slate-200', label: status, dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border tp-pop-in ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full tp-pulse-glow ${s.dot}`} />
      {s.label}
    </span>
  );
}

function JourneyStepper({ step, rejected }: { step: number; rejected?: boolean }) {
  return (
    <div className="ih-inview bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm rounded-2xl px-4 py-4 overflow-x-auto">
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
                  isRejected ? 'bg-rose-50 border-2 border-rose-300 shadow-sm shadow-rose-500/20'
                  : done     ? 'bg-emerald-50 border-2 border-emerald-300 shadow-sm shadow-emerald-500/20'
                  : active   ? 'bg-violet-50 border-2 border-violet-400 shadow-sm shadow-violet-500/20'
                  : 'bg-slate-50 border border-slate-200'
                }`}>
                  <Icon className={`w-4 h-4 ${
                    isRejected ? 'text-rose-600'
                    : done     ? 'text-emerald-600'
                    : active   ? 'text-violet-600'
                    : 'text-slate-400'
                  }`} />
                </div>
                <span className={`text-[10px] font-bold text-center leading-tight ${
                  isRejected ? 'text-rose-600'
                  : done     ? 'text-emerald-600'
                  : active   ? 'text-violet-700'
                  : 'text-slate-400'
                }`}>{isRejected ? 'Rejected' : s.label}</span>
              </div>
              {i < JOURNEY_STEPS.length - 1 && (
                <div className={`w-8 sm:w-14 h-0.5 mx-2 rounded-full mt-[-14px] transition-all ${done ? 'bg-gradient-to-r from-emerald-500 to-emerald-200' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeightageBar({ goals }: { goals: any[] }) {
  const goalWeights = goals.map(g => (g.kpis || []).reduce((s: number, k: any) => s + Number(k.weightage || 0), 0));
  const total = goalWeights.reduce((s, w) => s + w, 0);
  const remaining = 100 - total;
  const isOk = total === 100;
  const isOver = total > 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Weightage Allocation</span>
        <div className="flex items-center gap-2">
          <span className={`text-base font-black ${isOk ? 'text-emerald-600' : isOver ? 'text-rose-600' : 'text-amber-600'}`}>
            {total}%
          </span>
          <span className="text-slate-400 text-xs">/ 100%</span>
          {isOk && <span className="text-emerald-600 text-xs font-bold">✓ Perfect</span>}
        </div>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex gap-px">
        {goalWeights.map((w, i) => (
          <div key={i}
            className={`${getGoalColor(i).bar} transition-all duration-500 rounded-full`}
            style={{ width: `${Math.min(w, 100)}%` }}
            title={`Goal ${i+1}: ${w}%`} />
        ))}
        {remaining > 0 && <div className="bg-slate-100 flex-1 rounded-full" />}
      </div>
      <div className="flex gap-4 mt-2.5 flex-wrap">
        {goals.map((_, i) => (
          <span key={i} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className={`w-2 h-2 rounded-full ${getGoalColor(i).bar}`} />
            G{i + 1} <span className="font-bold text-slate-600">{goalWeights[i]}%</span>
          </span>
        ))}
        {remaining > 0 && (
          <span className="flex items-center gap-1.5 text-[11px] text-amber-600">
            <span className="w-2 h-2 rounded-full bg-slate-100 border border-slate-300" />
            Remaining <span className="font-bold">{remaining}%</span>
          </span>
        )}
        {isOver && (
          <span className="flex items-center gap-1.5 text-[11px] text-rose-600 font-bold ml-auto">
            ⚠ Over by {total - 100}%
          </span>
        )}
      </div>
    </div>
  );
}

function Toast({ msg }: { msg: { text: string; type: 'success' | 'error' | 'warn' } | null }) {
  if (!msg) return null;
  const cfg = {
    success: { cls: 'bg-emerald-50 border-emerald-200 text-emerald-600', icon: <CheckCircle className="w-4 h-4 shrink-0" /> },
    error:   { cls: 'bg-rose-50 border-rose-200 text-rose-600',         icon: <AlertCircle className="w-4 h-4 shrink-0" /> },
    warn:    { cls: 'bg-amber-50 border-amber-200 text-amber-600',       icon: <AlertCircle className="w-4 h-4 shrink-0" /> },
  }[msg.type];
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border font-semibold text-sm ${cfg.cls}`}>
      {cfg.icon} {msg.text}
    </div>
  );
}

// ─── Cycle Phase Banner ───────────────────────────────────────────────────────

const PHASE_INFO: Record<string, {
  icon: ReactNode; title: string; desc: string;
  cls: string; border: string; locked: boolean;
}> = {
  draft: {
    icon: <Clock className="w-4 h-4" />,
    title: 'Cycle Not Yet Open',
    desc: 'This cycle has not been opened for goal setting. Contact HR.',
    cls: 'text-slate-600 bg-slate-50', border: 'border-slate-200', locked: true,
  },
  goal_setting: {
    icon: <Unlock className="w-4 h-4" />,
    title: 'Goal Setting Open',
    desc: 'You can add, edit, and submit your goals for manager approval.',
    cls: 'text-emerald-700 bg-emerald-50', border: 'border-emerald-200', locked: false,
  },
  goals_locked: {
    icon: <Lock className="w-4 h-4" />,
    title: 'Goals Locked',
    desc: 'Goal setting is closed. Wait for HR to open the review phase.',
    cls: 'text-amber-700 bg-amber-50', border: 'border-amber-200', locked: true,
  },
  review_open: {
    icon: <FileText className="w-4 h-4" />,
    title: 'Review Phase Open',
    desc: 'Goals are locked. Submit your quarterly self-review and evidence now.',
    cls: 'text-blue-700 bg-blue-50', border: 'border-blue-200', locked: false,
  },
  closed: {
    icon: <Lock className="w-4 h-4" />,
    title: 'Cycle Closed',
    desc: 'This performance cycle has been closed by HR.',
    cls: 'text-slate-600 bg-slate-50', border: 'border-slate-200', locked: true,
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
        <p className="text-xs opacity-80 mt-0.5">{info.desc}</p>
        {/* Deadlines */}
        <div className="flex flex-wrap gap-3 mt-2">
          {cycle.goal_setting_deadline && (
            <span className="text-[11px] opacity-75">
              Goal deadline: <strong>{fmt(cycle.goal_setting_deadline)}</strong>
            </span>
          )}
          {cycle.review_deadline && (
            <span className="text-[11px] opacity-75">
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

  const addGoal = (category: string = CATEGORIES[0]) => {
    setGoals((prev: any[]) => [...prev, {
      _id: Date.now(), category, title: '', description: '',
      kpis: [{ _id: Date.now() + 1, metric: '', target_value: '', weightage: '' }],
    }]);
  };

  const updateGoal = (idx: number, field: string, val: any) =>
    setGoals((prev: any[]) => prev.map((g, i) => i === idx ? { ...g, [field]: val } : g));

  const addKPI = (goalIdx: number) =>
    setGoals((prev: any[]) => prev.map((g, i) => i === goalIdx
      ? { ...g, kpis: [...(g.kpis || []), { _id: Date.now(), metric: '', target_value: '', weightage: '' }] }
      : g));

  const updateKPI = (goalIdx: number, kpiIdx: number, field: string, val: any) =>
    setGoals((prev: any[]) => prev.map((g, i) => i === goalIdx
      ? { ...g, kpis: g.kpis.map((k: any, j: number) => j === kpiIdx ? { ...k, [field]: val } : k) }
      : g));

  const removeKPI = (goalIdx: number, kpiIdx: number) =>
    setGoals((prev: any[]) => prev.map((g, i) => i === goalIdx
      ? { ...g, kpis: g.kpis.filter((_: any, j: number) => j !== kpiIdx) }
      : g));

  const removeGoal = (idx: number) => setGoals(prev => prev.filter((_, i) => i !== idx));

  const totalWeight = goals.reduce((s, g) =>
    s + (g.kpis || []).reduce((ks: number, k: any) => ks + Number(k.weightage || 0), 0), 0);

  const downloadReport = async () => {
    if (!goalCard || !selectedCycle) return;
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

    // ── Sheet 1: KPI Performance Table ──────────────────────────────────────
    const aoa: any[][] = [
      [`Performance Report — ${selectedCycle.name}`],
      [`Employee: ${employee.name}  |  ID: ${employee.employee_id}  |  Designation: ${employee.designation || '—'}`],
      [`Department: ${employee.department || '—'}  |  Zone: ${employee.zone || '—'}  |  Manager: ${employee.manager_name || employee.reporting_manager_id || '—'}`],
      [`Goal Card Status: ${goalCard.status_display || goalCard.status}  |  Generated: ${fmt(new Date().toISOString())}`],
      [],
      ['Goal', 'KRA (Strategic Focus Area)', 'KPI / Metric', 'Weightage %', 'Plan (Budgeted / Target)',
       'Self Completion %', 'Self Rating (/5)', 'Achievement Description', 'Self Comments',
       'Manager Rating (/5)', 'Manager Comments', 'HR Rating (/5)', 'HR Comments', 'Final Score (/5)'],
    ];

    goals.forEach((g: any) => {
      (g.kpis || []).forEach((kpi: any, j: number) => {
        aoa.push([
          j === 0 ? g.category : '',
          j === 0 ? (g.title || '') : '',
          kpi.metric || '',
          kpi.weightage ?? '',
          kpi.target_value || '',
          kpi.self_completion_pct ?? '',
          kpi.self_rating ?? '',
          kpi.achievement_description || '',
          kpi.self_comments || '',
          kpi.manager_rating ?? '',
          kpi.manager_comments || '',
          kpi.hr_rating ?? '',
          kpi.hr_comments || '',
          kpi.final_score ? Number(kpi.final_score).toFixed(2) : '',
        ]);
      });
    });

    aoa.push([]);
    aoa.push(['', '', 'TOTAL WEIGHTAGE', `${totalWeight}%`]);
    const rev = goalCard.review_data;
    if (rev?.final_weighted_score) {
      aoa.push(['', '', 'FINAL WEIGHTED SCORE', rev.final_weighted_score]);
      aoa.push(['', '', 'PERFORMANCE BAND', rev.performance_band || '—']);
    }

    const ws1 = XLSX.utils.aoa_to_sheet(aoa);
    ws1['!cols'] = [
      { wch: 24 }, { wch: 32 }, { wch: 30 }, { wch: 13 }, { wch: 24 },
      { wch: 16 }, { wch: 15 }, { wch: 35 }, { wch: 30 },
      { wch: 16 }, { wch: 30 }, { wch: 13 }, { wch: 30 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'KPI Performance');

    // ── Sheet 2: Remarks & Summary ───────────────────────────────────────────
    const r2: any[][] = [
      [`Summary & Remarks — ${employee.name} — ${selectedCycle.name}`],
      [],
      ['Section', 'Field', 'Content'],
      ['GOAL SETTING', 'Goal Card Status', goalCard.status_display || goalCard.status],
      ['GOAL SETTING', 'Submitted On', fmt(goalCard.submitted_at)],
      ['GOAL SETTING', 'Manager Reviewed On', fmt(goalCard.manager_reviewed_at)],
      ['GOAL SETTING', 'Manager Remarks', goalCard.manager_remarks || '—'],
      ['GOAL SETTING', 'HR Remarks', goalCard.hr_remarks || '—'],
      [],
    ];

    if (rev) {
      r2.push(
        ['QUARTERLY REVIEW', 'Review Status', rev.status_display || rev.status || '—'],
        ['QUARTERLY REVIEW', 'Submitted On', fmt(rev.submitted_at)],
        ['QUARTERLY REVIEW', 'Manager Overall Rating', rev.manager_overall_rating ?? '—'],
        ['QUARTERLY REVIEW', 'HR Final Rating', rev.hr_final_rating ?? '—'],
        ['QUARTERLY REVIEW', 'Final Weighted Score', rev.final_weighted_score ?? '—'],
        ['QUARTERLY REVIEW', 'Performance Band', rev.performance_band || '—'],
      );
    }

    const ws2 = XLSX.utils.aoa_to_sheet(r2);
    ws2['!cols'] = [{ wch: 20 }, { wch: 28 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Remarks & Summary');

    XLSX.writeFile(wb, `${employee.name}_${selectedCycle.name}_Performance.xlsx`);
  };

  const saveGoals = async (submit = false) => {
    if (!selectedCycle) return;
    if (submit && totalWeight !== 100) {
      showMsg(`Total weightage is ${totalWeight}%. It must equal exactly 100% to submit.`, 'warn');
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
      const kpiRatings: any[] = [];
      goals.forEach(g => {
        (g.kpis || []).forEach((kpi: any) => {
          if (kpi.id) {
            kpiRatings.push({
              kpi_id: kpi.id,
              self_rating: kpi.self_rating || null,
              self_completion_pct: kpi.self_completion_pct || null,
              self_comments: kpi.self_comments || '',
              achievement_description: kpi.achievement_description || '',
            });
          }
        });
      });
      const fd = new FormData();
      Object.entries(reviewForm).forEach(([k, v]) => fd.append(k, String(v)));
      fd.append('kpi_ratings', JSON.stringify(kpiRatings));
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

  return (
    <div className="min-h-full p-4 lg:p-8">
      <style>{TOOL_STYLES}</style>
      <div className="max-w-3xl mx-auto space-y-4">

        {/* ── Profile Card ── */}
        <div className="relative overflow-hidden rounded-3xl ih-inview tp-tilt bg-white/80 backdrop-blur-xl shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-100/70 via-violet-50/50 to-transparent" />
          <div className="absolute inset-0 border border-slate-200 rounded-3xl" />
          <div className="relative p-6 flex items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0 tp-pop-in">
              <div className="absolute inset-0 bg-violet-300/50 rounded-2xl blur-md scale-110" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-700 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-violet-500/30">
                {employee.name?.[0] || 'E'}
              </div>
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight truncate">{employee.name}</h2>
              <p className="text-violet-600 text-sm font-semibold mt-0.5">{employee.designation}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {employee.department && (
                  <span className="text-[11px] text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {employee.department}
                  </span>
                )}
                {employee.zone && (
                  <span className="text-[11px] text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    📍 {employee.zone}
                  </span>
                )}
                {employee.employee_id && (
                  <span className="text-[11px] text-slate-500 font-mono">#{employee.employee_id}</span>
                )}
                {employee.reporting_manager_id && (
                  <span className="text-[11px] text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    Reports to: {employee.manager_name || employee.reporting_manager_id}
                  </span>
                )}
                {employee.joined_date && (
                  <span className="text-[11px] text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    Joined: {new Date(employee.joined_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            </div>
            {goalCard && (
              <div className="shrink-0 flex flex-col items-end gap-2">
                <StatusBadge status={goalCard.status} />
                <button onClick={downloadReport}
                  className="tp-sheen flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-violet-300 text-slate-600 hover:text-violet-700 text-[11px] font-bold transition-all">
                  <Download className="w-3.5 h-3.5" /> Download Report
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Journey ── */}
        {goalCard && <div><JourneyStepper step={journeyStep} rejected={isRejected} /></div>}

        {/* ── Alerts ── */}
        {isRejected && goalCard?.manager_remarks && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-3 ih-inview">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-rose-600 font-bold text-sm">Manager requested changes</p>
              <p className="text-slate-600 text-sm mt-1">{goalCard.manager_remarks}</p>
            </div>
          </div>
        )}
        {goalCard?.status === 'manager_approved' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-3 items-center ih-inview">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <p className="text-emerald-700 font-bold text-sm">Goals approved — you can now do your self-review</p>
              {goalCard.manager_remarks && <p className="text-slate-500 text-xs mt-0.5">{goalCard.manager_remarks}</p>}
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-600" />
          </div>
        )}

        {/* ── Cycle selector ── */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm rounded-2xl p-4 ih-inview">
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-3">Select Quarter</p>
          {cycles.length === 0 ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Clock className="w-4 h-4" /> No active cycles. Contact HR.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {cycles.map(c => (
                <button key={c.id} onClick={() => setSelectedCycle(c)}
                  className={`tp-tilt px-4 py-2 rounded-xl font-bold text-sm transition-all border ${
                    selectedCycle?.id === c.id
                      ? 'bg-violet-50 border-violet-300 text-violet-700 shadow-sm shadow-violet-500/10'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-700'
                  }`}>
                  {c.name}
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    selectedCycle?.id === c.id ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'
                  }`}>{c.status.replace(/_/g,' ')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedCycle && (
          <>
            {/* ── Phase Banner ── */}
            <div className="ih-inview"><CyclePhaseBanner cycle={selectedCycle} /></div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 bg-white/80 backdrop-blur-xl p-1 rounded-2xl border border-slate-200 shadow-sm ih-inview">
              {([
                { id: 'goals',  label: 'KRA / Goal Setting', icon: cycleStatus === 'goal_setting' ? Target : Lock },
                { id: 'review', label: 'Self Review',        icon: cycleStatus === 'review_open'  ? FileText : Lock },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                    tab === t.id
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25'
                      : 'text-slate-500 hover:text-violet-700'
                  }`}>
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* ═══════════════ GOALS TAB ═══════════════ */}
            {tab === 'goals' && (
              <div className="space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-slate-900 font-bold text-lg">{selectedCycle.name} — Goals</h3>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {canEdit
                        ? '4 categories · multiple KRAs per category · total KPI weightage must equal 100%'
                        : goalCard ? `${goals.length} KRA${goals.length !== 1 ? 's' : ''} across 4 categories` : 'No goals on record'}
                    </p>
                  </div>
                  {!canEdit && goalCard && <StatusBadge status={goalCard.status} />}
                </div>

                {/* Weightage bar */}
                {goals.length > 0 && (
                  <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm rounded-2xl p-4 ih-inview">
                    <WeightageBar goals={goals} />
                  </div>
                )}

                {/* 4 fixed category blocks */}
                {CATEGORIES.map((cat, catColorIdx) => {
                  const col = getGoalColor(catColorIdx);
                  const catGoals = goals
                    .map((g: any, i: number) => ({ g, i }))
                    .filter(({ g }) => g.category === cat);

                  return (
                    <div key={cat} className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm rounded-2xl overflow-hidden ih-inview tp-tilt" style={{ animationDelay: `${catColorIdx * 80}ms` }}>

                      {/* Category header */}
                      <div className={`flex items-center justify-between px-5 py-3 ${col.bg} border-b border-slate-200`}>
                        <div className="flex items-center gap-2.5">
                          <span className={`text-xs font-black ${col.text}`}>{cat}</span>
                          {catGoals.length > 0 && (
                            <span className="text-[10px] text-slate-500">{catGoals.length} KRA{catGoals.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                        {canEdit && (
                          <button onClick={() => addGoal(cat)}
                            className={`tp-sheen flex items-center gap-1 text-[11px] font-bold ${col.text} hover:opacity-70 px-2.5 py-1 rounded-lg hover:bg-white transition-all`}>
                            <Plus className="w-3 h-3" /> Add KRA
                          </button>
                        )}
                      </div>

                      {/* KRA list for this category */}
                      <div className="divide-y divide-slate-200">
                        {catGoals.map(({ g, i }, catIdx) => (
                          <div key={g._id || g.id || i} className="p-4 space-y-3">

                            {/* KRA header */}
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-black uppercase tracking-wider ${col.text}`}>KRA {catIdx + 1}</span>
                              {canEdit && (
                                <button onClick={() => removeGoal(i)}
                                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* KRA Title */}
                            <input disabled={!canEdit} value={g.title}
                              onChange={e => updateGoal(i, 'title', e.target.value)}
                              placeholder="Key Result Area title…"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-semibold focus:outline-none focus:border-violet-400 placeholder-slate-400 disabled:opacity-60 disabled:bg-slate-50 transition-all" />

                            {/* KPIs */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">KPIs</label>
                                {canEdit && (
                                  <button onClick={() => addKPI(i)}
                                    className="flex items-center gap-1 text-[10px] font-bold text-violet-600 hover:text-violet-700 px-2 py-1 rounded-lg hover:bg-violet-50 transition-all">
                                    <Plus className="w-2.5 h-2.5" /> Add KPI
                                  </button>
                                )}
                              </div>
                              {(g.kpis || []).map((kpi: any, j: number) => (
                                <div key={kpi._id || kpi.id || j} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">KPI {j + 1}</span>
                                    {canEdit && g.kpis.length > 1 && (
                                      <button onClick={() => removeKPI(i, j)}
                                        className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-all">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <input disabled={!canEdit} value={kpi.metric || ''}
                                      onChange={e => updateKPI(i, j, 'metric', e.target.value)}
                                      placeholder="KPI / Metric"
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-900 text-xs font-semibold focus:outline-none focus:border-violet-400 placeholder-slate-400 disabled:opacity-60 disabled:bg-slate-50 transition-all" />
                                    <input disabled={!canEdit} value={kpi.target_value || ''}
                                      onChange={e => updateKPI(i, j, 'target_value', e.target.value)}
                                      placeholder="Target"
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-900 text-xs font-semibold focus:outline-none focus:border-violet-400 placeholder-slate-400 disabled:opacity-60 disabled:bg-slate-50 transition-all" />
                                    <input disabled={!canEdit} type="number" min={1} max={100}
                                      value={kpi.weightage || ''}
                                      onChange={e => updateKPI(i, j, 'weightage', Number(e.target.value))}
                                      placeholder="Weightage %"
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-900 text-xs font-semibold focus:outline-none focus:border-violet-400 placeholder-slate-400 disabled:opacity-60 disabled:bg-slate-50 transition-all" />
                                  </div>
                                  {(kpi.manager_rating || kpi.final_score) && (
                                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                                      {kpi.manager_rating && (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] text-slate-500 font-semibold">Manager:</span>
                                          <StarRating value={kpi.manager_rating} size="sm" />
                                        </div>
                                      )}
                                      {kpi.final_score && (
                                        <span className={`ml-auto text-xs font-black ${col.text}`}>
                                          Score: {Number(kpi.final_score).toFixed(2)}/5
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {catGoals.length === 0 && (
                          <p className="px-5 py-3 text-slate-400 text-xs">
                            {canEdit ? `Click "+ Add KRA" to add a KRA under ${cat}.` : 'No KRAs set for this category.'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                <Toast msg={msg} />

                {canEdit && (
                  <div className="flex gap-3">
                    <button onClick={() => saveGoals(false)} disabled={saving}
                      className="tp-sheen flex-1 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-violet-300 hover:text-violet-700 transition-all disabled:opacity-50">
                      {saving ? 'Saving…' : '💾 Save Draft'}
                    </button>
                    <button onClick={() => saveGoals(true)} disabled={saving}
                      className="tp-sheen flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 active:scale-[0.98]">
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
                  <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm rounded-2xl p-14 text-center ih-inview">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                      cycleStatus === 'goal_setting' ? 'bg-violet-50' : 'bg-amber-50'
                    }`}>
                      <Lock className={`w-8 h-8 ${cycleStatus === 'goal_setting' ? 'text-violet-600' : 'text-amber-600'}`} />
                    </div>
                    <p className="text-slate-900 font-bold mb-1">
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
                  <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm rounded-2xl p-14 text-center ih-inview">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-900 font-bold mb-1">Waiting for manager to approve your goals</p>
                    <p className="text-slate-500 text-sm mt-1">Review phase is open, but you need manager-approved goals before submitting your self-assessment.</p>
                    {goalCard && <div className="mt-5 flex justify-center"><StatusBadge status={goalCard.status} /></div>}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-slate-900 font-bold text-lg">Quarter-End Self Assessment</h3>
                      <span className="text-[11px] text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">{selectedCycle.name}</span>
                    </div>

                    {/* Per-KPI self rating */}
                    {goals.map((g, i) => {
                      const col = getGoalColor(i);
                      return (
                        <div key={i} className={`bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm rounded-2xl overflow-hidden border-l-[3px] ih-inview ${col.border}`} style={{ animationDelay: `${i * 70}ms` }}>
                          <div className="px-5 py-3 border-b border-slate-200">
                            {g.category && <span className={`text-[10px] font-black uppercase tracking-wider ${col.text}`}>{g.category}</span>}
                            <p className="text-slate-900 font-bold text-sm mt-0.5">{g.title || `Goal ${i + 1}`}</p>
                          </div>
                          {(g.kpis || []).map((kpi: any, j: number) => (
                            <div key={kpi.id || j} className="p-4 border-b border-slate-200 last:border-0 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-slate-800 text-sm font-semibold">{kpi.metric || `KPI ${j + 1}`}</p>
                                  {kpi.target_value && <p className="text-slate-500 text-xs mt-0.5">Target: {kpi.target_value}</p>}
                                </div>
                                <span className={`shrink-0 px-2 py-1 rounded-lg text-xs font-black ${col.bg} ${col.text}`}>{kpi.weightage}%</span>
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Completion</label>
                                  <span className={`text-base font-black ${
                                    (kpi.self_completion_pct || 0) >= 80 ? 'text-emerald-600'
                                    : (kpi.self_completion_pct || 0) >= 50 ? 'text-violet-600' : 'text-amber-600'
                                  }`}>{kpi.self_completion_pct || 0}%</span>
                                </div>
                                <input type="range" min={0} max={100} step={5}
                                  value={kpi.self_completion_pct || 0}
                                  onChange={e => updateKPI(i, j, 'self_completion_pct', Number(e.target.value))}
                                  className="w-full accent-violet-500" />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Self Rating</label>
                                <StarRating value={kpi.self_rating || 0} onChange={v => updateKPI(i, j, 'self_rating', v)} />
                              </div>
                              <textarea value={kpi.achievement_description || ''}
                                onChange={e => updateKPI(i, j, 'achievement_description', e.target.value)}
                                placeholder="What did you achieve on this KPI? Be specific."
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-violet-400 placeholder-slate-400 resize-none transition-all"
                                rows={2} />
                            </div>
                          ))}
                        </div>
                      );
                    })}

                    {/* Section D – Self remarks */}
                    <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm rounded-2xl overflow-hidden ih-inview">
                      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-violet-600" />
                        <p className="text-slate-800 text-sm font-bold">Section D — Employee Self Remarks</p>
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
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-violet-400 placeholder-slate-400 resize-none transition-all" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Overall rating + evidence */}
                    <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm rounded-2xl p-5 space-y-5 ih-inview">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-800 text-sm font-bold">Overall Self Rating</p>
                          <p className="text-slate-500 text-xs mt-0.5">How would you rate your overall quarter?</p>
                        </div>
                        <StarRating value={reviewForm.overall_self_rating} size="lg"
                          onChange={v => setReviewForm(p => ({ ...p, overall_self_rating: v }))} />
                      </div>
                      <div className="border-t border-slate-200 pt-4">
                        <p className="text-slate-800 text-sm font-bold mb-1">Evidence File <span className="text-slate-400 font-normal text-xs">(optional)</span></p>
                        <p className="text-slate-500 text-xs mb-3">Upload base sheet, report, or supporting document</p>
                        <label className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 hover:border-violet-300 rounded-xl cursor-pointer transition-all group">
                          <div className="w-9 h-9 rounded-xl bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center transition-all">
                            <FileText className="w-4 h-4 text-violet-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-800 text-sm font-semibold">{evidenceFile ? evidenceFile.name : 'Choose file to upload'}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{evidenceFile ? `${(evidenceFile.size / 1024).toFixed(1)} KB` : 'Excel, PDF, or any document'}</p>
                          </div>
                          <input type="file" className="hidden" onChange={e => setEvidenceFile(e.target.files?.[0] || null)} />
                        </label>
                      </div>
                    </div>

                    <Toast msg={msg} />

                    <button onClick={submitReview} disabled={saving}
                      className="tp-sheen w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 active:scale-[0.98]">
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
