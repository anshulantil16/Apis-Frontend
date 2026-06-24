import { useState, useEffect } from 'react';
import {
  Target, Star, CheckCircle, Clock, Plus, Trash2, Send,
  AlertCircle, Award, Lock, Unlock, Download, ChevronDown,
  ChevronRight, ArrowLeft, MessageSquare, BookOpen, X, ThumbsUp, Upload, FileText,
} from 'lucide-react';
import { downloadScorecard } from '../../../utils/downloadScorecard';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PERF_API = `${API_BASE}/api/appraisal`;

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Financial',
  'Customer Enhancement',
  'Internal Business Process',
  'People Development',
];

const CATEGORY_COLORS = [
  {
    header: 'bg-blue-50 border-blue-200',
    title: 'text-blue-700',
    accent: 'border-l-blue-500',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    addBtn: 'text-blue-600 hover:bg-blue-100 border-blue-200',
  },
  {
    header: 'bg-amber-50 border-amber-200',
    title: 'text-amber-700',
    accent: 'border-l-amber-500',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    addBtn: 'text-amber-600 hover:bg-amber-100 border-amber-200',
  },
  {
    header: 'bg-sky-50 border-sky-200',
    title: 'text-sky-700',
    accent: 'border-l-sky-500',
    dot: 'bg-sky-500',
    badge: 'bg-sky-100 text-sky-700 border-sky-200',
    addBtn: 'text-sky-600 hover:bg-sky-100 border-sky-200',
  },
  {
    header: 'bg-emerald-50 border-emerald-200',
    title: 'text-emerald-700',
    accent: 'border-l-emerald-500',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    addBtn: 'text-emerald-600 hover:bg-emerald-100 border-emerald-200',
  },
];

const SELF_REVIEW_QUESTIONS = [
  'What do you consider to be your most important achievement of FY 25-26?',
  'Where did you experience difficulties or constraints which affected your performance in FY 25-26?',
  'List the training programs attended in FY 25-26.',
];

const FREQUENCY_OPTIONS = ['Monthly', 'Quarterly', 'Half-Yearly', 'Annually', 'Weekly', 'Daily', 'One-Time'];
const DIRECTION_OPTIONS = [
  { value: 'higher', label: '↑ Higher is Better' },
  { value: 'lower',  label: '↓ Lower is Better' },
  { value: 'target', label: '◎ Target Based' },
];

// ─── Journey Steps ────────────────────────────────────────────────────────────

const STAR_LABELS = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'];

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            type="button"
            disabled={!onChange}
            onClick={() => onChange?.(s)}
            onMouseEnter={() => onChange && setHovered(s)}
            onMouseLeave={() => onChange && setHovered(0)}
            className="text-2xl transition-transform hover:scale-110 disabled:cursor-default leading-none"
          >
            <span className={s <= active ? 'text-amber-400' : 'text-slate-200'}>★</span>
          </button>
        ))}
      </div>
      {active > 0 && (
        <span className="text-sm font-bold text-slate-600">{STAR_LABELS[active]}</span>
      )}
    </div>
  );
}

const JOURNEY_STEPS = [
  { key: 'goal_setting',   label: 'Set Goals',   icon: Target },
  { key: 'mgr_review',     label: 'Mgr Review',  icon: Clock },
  { key: 'goals_approved', label: 'Approved',    icon: CheckCircle },
  { key: 'mgr_rating',     label: 'Mgr Rating',  icon: Star },
  { key: 'published',      label: 'Published',   icon: Award },
];

function getJourneyStep(gc: any): number {
  if (!gc) return 0;
  const rev = gc.review_data;
  if (rev?.status === 'published') return 4;
  if (rev?.status === 'manager_reviewed' || rev?.status === 'hr_finalized') return 3;
  if (['manager_approved', 'hod_approved', 'hr_approved'].includes(gc.status)) return 2;
  if (gc.status === 'submitted') return 1;
  return 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; dot: string }> = {
    draft:            { cls: 'bg-slate-100 text-slate-600 border-slate-200',          label: 'Draft',             dot: 'bg-slate-400' },
    submitted:        { cls: 'bg-blue-50 text-blue-700 border-blue-200',              label: 'Pending Review',    dot: 'bg-blue-500 animate-pulse' },
    manager_approved: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',     label: 'Manager Approved',  dot: 'bg-emerald-500' },
    manager_rejected: { cls: 'bg-rose-50 text-rose-700 border-rose-200',              label: 'Changes Requested', dot: 'bg-rose-500' },
    hod_approved:     { cls: 'bg-violet-50 text-violet-700 border-violet-200',        label: 'HOD Approved',      dot: 'bg-violet-500' },
    hod_rejected:     { cls: 'bg-orange-50 text-orange-700 border-orange-200',        label: 'HOD Rejected',      dot: 'bg-orange-500' },
    hr_approved:      { cls: 'bg-purple-50 text-purple-700 border-purple-200',        label: 'HR Approved',       dot: 'bg-purple-500' },
    finalized:        { cls: 'bg-amber-50 text-amber-700 border-amber-200',           label: 'Finalized',         dot: 'bg-amber-500' },
  };
  const s = map[status] || { cls: 'bg-slate-100 text-slate-600 border-slate-200', label: status, dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function JourneyStepper({ step, rejected }: { step: number; rejected?: boolean }) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-4 overflow-x-auto">
      <div className="flex items-center min-w-max gap-0">
        {JOURNEY_STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          const isRejected = rejected && i === 1;
          return (
            <div key={s.key} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  isRejected ? 'bg-rose-100 border-2 border-rose-400 shadow-sm shadow-rose-100'
                  : done     ? 'bg-emerald-100 border-2 border-emerald-400 shadow-sm shadow-emerald-100'
                  : active   ? 'bg-blue-100 border-2 border-blue-500 shadow-sm shadow-blue-100'
                  : 'bg-slate-100 border border-slate-200'
                }`}>
                  <Icon className={`w-4 h-4 ${
                    isRejected ? 'text-rose-500' : done ? 'text-emerald-600' : active ? 'text-blue-600' : 'text-slate-400'
                  }`} />
                </div>
                <span className={`text-[10px] font-bold text-center leading-tight ${
                  isRejected ? 'text-rose-500' : done ? 'text-emerald-600' : active ? 'text-blue-600' : 'text-slate-400'
                }`}>{isRejected ? 'Rejected' : s.label}</span>
              </div>
              {i < JOURNEY_STEPS.length - 1 && (
                <div className={`w-10 sm:w-16 h-0.5 mx-1 rounded-full mt-[-14px] transition-all ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeightageBar({ goals }: { goals: any[] }) {
  const total = goals.reduce((s, g) =>
    s + (g.kpis || []).reduce((ks: number, k: any) => ks + Number(k.weightage || 0), 0), 0);
  const isOk = total === 100;
  const isOver = total > 100;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isOk ? 'bg-emerald-500' : isOver ? 'bg-rose-500' : 'bg-blue-500'}`}
          style={{ width: `${Math.min(total, 100)}%` }}
        />
      </div>
      <span className={`text-sm font-black tabular-nums whitespace-nowrap ${isOk ? 'text-emerald-600' : isOver ? 'text-rose-600' : 'text-amber-600'}`}>
        {total}% {isOk ? '✓' : isOver ? '⚠ over' : `/ 100%`}
      </span>
    </div>
  );
}

function Toast({ msg }: { msg: { text: string; type: 'success' | 'error' | 'warn' } | null }) {
  if (!msg) return null;
  const cfg = {
    success: 'bg-emerald-50 border-emerald-300 text-emerald-700',
    error:   'bg-rose-50 border-rose-300 text-rose-700',
    warn:    'bg-amber-50 border-amber-300 text-amber-700',
  }[msg.type];
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border font-semibold text-sm ${cfg}`}>
      <AlertCircle className="w-4 h-4 shrink-0" /> {msg.text}
    </div>
  );
}

function FormStepBar({ step }: { step: 1 | 2 | 3 | 4 }) {
  const steps = [
    { n: 1, label: 'Goal Setting',          sub: 'KRA / KPI details',       icon: Target },
    { n: 2, label: 'Self-Review',           sub: 'Answer 3 questions',       icon: MessageSquare },
    { n: 3, label: 'Training & Skills',     sub: 'Skills & training needs',  icon: BookOpen },
    { n: 4, label: 'Feedback',              sub: 'Manager & Org review',     icon: ThumbsUp },
  ];
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-4">
      <div className="flex items-center gap-0">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const done   = s.n < step;
          const active = s.n === step;
          return (
            <div key={s.n} className="flex items-center flex-1">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  done   ? 'bg-emerald-100 border-2 border-emerald-400'
                  : active && s.n === 1 ? 'bg-blue-600 border-2 border-blue-600 shadow-md shadow-blue-100'
                  : active && s.n === 2 ? 'bg-indigo-600 border-2 border-indigo-600 shadow-md shadow-indigo-100'
                  : active && s.n === 3 ? 'bg-teal-600 border-2 border-teal-600 shadow-md shadow-teal-100'
                  : active && s.n === 4 ? 'bg-rose-600 border-2 border-rose-600 shadow-md shadow-rose-100'
                  : 'bg-slate-100 border border-slate-200'
                }`}>
                  {done
                    ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                    : <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />}
                </div>
                <div>
                  <p className={`text-xs font-black uppercase tracking-wider ${
                    done ? 'text-emerald-600'
                    : active && s.n === 1 ? 'text-blue-700'
                    : active && s.n === 2 ? 'text-indigo-700'
                    : active && s.n === 3 ? 'text-teal-700'
                    : active ? 'text-rose-700'
                    : 'text-slate-400'
                  }`}>
                    Step {s.n}
                  </p>
                  <p className={`text-sm font-bold ${done ? 'text-slate-600' : active ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</p>
                  <p className={`text-[11px] ${done ? 'text-slate-400' : active ? 'text-slate-500' : 'text-slate-300'}`}>{s.sub}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className={`w-5 h-5 mx-4 shrink-0 ${step > s.n ? 'text-emerald-400' : 'text-slate-300'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Inline select helper ─────────────────────────────────────────────────────

function TableSelect({ value, onChange, options, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string; disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 text-xs font-semibold focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400 transition-all pr-6 cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
    </div>
  );
}

function TableInput({ value, onChange, placeholder, disabled, type = 'text', className = '' }: {
  value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean; type?: string; className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 text-xs font-semibold focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 placeholder-slate-300 disabled:bg-slate-50 disabled:text-slate-400 transition-all ${className}`}
    />
  );
}

// ─── Score calculation formulas ───────────────────────────────────────────────

function calcScoreAchievement(kpi: any): number | null {
  const plan   = parseFloat(kpi.target_value);
  const actual = parseFloat(kpi.actual_achievement);
  if (isNaN(plan) || isNaN(actual) || plan === 0) return null;
  const dir = (kpi.parameter_type || '').toLowerCase();
  if (dir.includes('higher'))
    return (actual / plan) * 100;
  if (dir.includes('lower'))
    return actual === 0 ? null : (plan / actual) * 100;
  if (dir.includes('target'))
    return Math.max(0, (actual / plan) * 100);
  return null;
}

function calcWeightageSystem(kpi: any): number | null {
  const score = calcScoreAchievement(kpi);
  const wt    = parseFloat(kpi.weightage);
  if (score === null || isNaN(wt) || wt === 0) return null;
  return parseFloat(((score / 100) * wt).toFixed(2));
}

function CalcCell({ value, unit = '%' }: { value: number | null; unit?: string }) {
  if (value === null) return <span className="text-slate-300 text-xs block text-center">—</span>;
  return (
    <span className="block w-full text-center text-[11px] font-black text-amber-700 bg-amber-50 rounded-lg px-1 py-1.5 border border-amber-200">
      {value.toFixed(1)}{unit}
    </span>
  );
}

const REQUIRED_KPI_FIELDS: (keyof any)[] = [
  'metric', 'weightage', 'frequency', 'unit_of_measurement',
  'parameter_type', 'data_source', 'target_value',
  // actual_achievement is NOT required at goal-setting stage — filled later during review
];

// ─── KPI Table ────────────────────────────────────────────────────────────────

const KPI_COLS = [
  { label: 'KPI / Metric',           width: 'w-[14%]' },
  { label: 'Wt %',                   width: 'w-[5%]' },
  { label: 'Frequency',              width: 'w-[8%]' },
  { label: 'Unit of Measurement',    width: 'w-[8%]' },
  { label: 'Parameter Direction',    width: 'w-[10%]' },
  { label: 'Data Source',            width: 'w-[10%]' },
  { label: 'Plan (Budgeted/Target)', width: 'w-[9%]' },
  { label: 'Actual Achievement',     width: 'w-[9%]' },
  { label: 'Score Ach%',            width: 'w-[7%]', calc: true },
  { label: 'Wt% (System)',          width: 'w-[7%]', calc: true },
  { label: '',                       width: 'w-[36px]' },
];

function KpiTableRow({ kpi, j, canEdit, onChange, onRemove, showRemove }: {
  kpi: any; j: number; canEdit: boolean;
  onChange: (field: string, val: any) => void;
  onRemove: () => void;
  showRemove: boolean;
}) {
  const scoreAch = calcScoreAchievement(kpi);
  const wtSys    = calcWeightageSystem(kpi);

  // Only highlight incomplete fields if the row has been started
  const kpiHasAnyData = REQUIRED_KPI_FIELDS.some(f => kpi[f] !== '' && kpi[f] !== undefined && kpi[f] !== null);
  const missing = canEdit && kpiHasAnyData
    ? REQUIRED_KPI_FIELDS.filter(f => kpi[f] === '' || kpi[f] === undefined || kpi[f] === null)
    : [];
  const rowHasError = missing.length > 0;

  return (
    <tr className={`border-b border-slate-100 last:border-0 transition-colors group ${rowHasError ? 'bg-rose-50/30' : 'hover:bg-blue-50/40'}`}>
      <td className="px-3 py-2.5 text-[10px] font-black text-slate-400 w-[36px]">{j + 1}</td>
      <td className="px-2 py-2">
        <TableInput value={kpi.metric || ''} onChange={v => onChange('metric', v)}
          placeholder="e.g. Revenue Growth" disabled={!canEdit}
          className={!kpi.metric && canEdit ? '!border-rose-300' : ''} />
      </td>
      <td className="px-2 py-2">
        <TableInput type="number" value={kpi.weightage || ''}
          onChange={v => {
            const num = Math.max(0, Math.min(100, Number(v) || 0));
            onChange('weightage', num || '');
          }}
          placeholder="%" disabled={!canEdit}
          className={`text-center${!kpi.weightage && canEdit ? ' !border-rose-300' : ''}`} />
      </td>
      <td className="px-2 py-2">
        <TableSelect value={kpi.frequency || ''} onChange={v => onChange('frequency', v)}
          options={FREQUENCY_OPTIONS} placeholder="Select…" disabled={!canEdit} />
      </td>
      <td className="px-2 py-2">
        <TableInput value={kpi.unit_of_measurement || ''} onChange={v => onChange('unit_of_measurement', v)}
          placeholder="%, INR, Nos…" disabled={!canEdit} />
      </td>
      <td className="px-2 py-2">
        <TableSelect value={kpi.parameter_type || ''} onChange={v => onChange('parameter_type', v)}
          options={DIRECTION_OPTIONS.map(d => d.label)} placeholder="Direction…" disabled={!canEdit} />
      </td>
      <td className="px-2 py-2">
        <TableInput value={kpi.data_source || ''} onChange={v => onChange('data_source', v)}
          placeholder="System / Report…" disabled={!canEdit} />
      </td>
      <td className="px-2 py-2">
        <TableInput type="number" value={kpi.target_value || ''} onChange={v => onChange('target_value', v)}
          placeholder="Plan value" disabled={!canEdit}
          className={!kpi.target_value && kpiHasAnyData && canEdit ? '!border-rose-300' : ''} />
      </td>
      <td className="px-2 py-2">
        <TableInput type="number" value={kpi.actual_achievement || ''} onChange={v => onChange('actual_achievement', v)}
          placeholder="Actual" disabled={!canEdit}
          className={!kpi.actual_achievement && kpiHasAnyData && canEdit ? '!border-rose-300' : ''} />
      </td>
      {/* Auto-calculated columns */}
      <td className="px-2 py-2 bg-amber-50/60">
        <CalcCell value={scoreAch} />
      </td>
      <td className="px-2 py-2 bg-amber-50/60">
        <CalcCell value={wtSys} />
      </td>
      <td className="px-2 py-2 text-center">
        {canEdit && showRemove && (
          <button onClick={onRemove}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AppraisalEmployeeView({ employee }: { employee: any }) {
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [goalCard, setGoalCard] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | 'warn' } | null>(null);
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4>(1);
  const [selfAnswers, setSelfAnswers] = useState<string[][]>([[''], [''], ['']]);
  const [keySkills, setKeySkills] = useState<string[]>(['', '', '', '', '']);
  const [trainingPrograms, setTrainingPrograms] = useState('');
  const [feedbackManager, setFeedbackManager] = useState('');
  const [feedbackManagerRating, setFeedbackManagerRating] = useState<number>(0);
  const [feedbackOrganization, setFeedbackOrganization] = useState('');
  const [feedbackOrganizationRating, setFeedbackOrganizationRating] = useState<number>(0);

  const showMsg = (text: string, type: 'success' | 'error' | 'warn' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4500);
  };

  useEffect(() => {
    fetch(`${PERF_API}/cycles/active/`)
      .then(r => r.json())
      .then(data => {
        setCycles(data);
        if (data.length > 0) setSelectedCycle(data[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCycle) return;
    fetch(`${PERF_API}/goal-cards/${employee.employee_id}/${selectedCycle.id}/?t=${Date.now()}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setGoalCard(data);
          setGoals(data.goals || []);
          // Normalize existing self_review_answers: old format is string[], new is string[][]
          const raw: any[] = data.self_review_answers || [];
          setSelfAnswers([0, 1, 2].map(i => {
            const v = raw[i];
            if (Array.isArray(v)) return v.length ? v : [''];
            if (typeof v === 'string' && v.trim()) return [v];
            return [''];
          }));
          setKeySkills(
            Array.isArray(data.key_skills) && data.key_skills.length
              ? data.key_skills.concat(Array(Math.max(0, 5 - data.key_skills.length)).fill(''))
              : ['', '', '', '', '']
          );
          setTrainingPrograms(data.training_programs || '');
          setFeedbackManager(data.feedback_manager || '');
          setFeedbackManagerRating(data.feedback_manager_rating || 0);
          setFeedbackOrganization(data.feedback_organization || '');
          setFeedbackOrganizationRating(data.feedback_organization_rating || 0);
        } else { setGoalCard(null); setGoals([]); }
      }).catch(() => {});
  }, [selectedCycle, employee.employee_id]);

  // Auto-save every 30 seconds while form is in draft mode
  // Auto-save: fires 5 seconds after user STOPS editing (debounced)
  useEffect(() => {
    if (!selectedCycle || !goalCard || goalCard.status !== 'draft' || saving) return;
    const timer = setTimeout(async () => {
      try {
        const autoPayload: any = {
          self_review_answers: selfAnswers,
          key_skills: keySkills.filter(s => s.trim()),
          training_programs: trainingPrograms,
          feedback_manager: feedbackManager,
          feedback_manager_rating: feedbackManagerRating || null,
          feedback_organization: feedbackOrganization,
          feedback_organization_rating: feedbackOrganizationRating || null,
        };
        if (formStep === 1) autoPayload.goals = goals;
        const res = await fetch(`${PERF_API}/goal-cards/${employee.employee_id}/${selectedCycle.id}/`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(autoPayload),
        });
        if (res.ok) {
          const data = await res.json();
          setGoalCard(data);
          // Only update goals IDs without disrupting user input — merge IDs only
          if (data.goals && formStep === 1) {
            setGoals((prev: any[]) => {
              if (prev.length !== data.goals.length) return data.goals;
              return prev.map((g: any, gi: number) => {
                const saved = data.goals[gi];
                if (!saved) return g;
                return {
                  ...g,
                  id: saved.id, // update real DB id
                  kpis: (g.kpis || []).map((k: any, ki: number) => {
                    const savedKpi = saved.kpis?.[ki];
                    return savedKpi ? { ...k, id: savedKpi.id } : k;
                  }),
                };
              });
            });
          }
        }
      } catch { /* silent */ }
    }, 5000); // 5 seconds after last change
    return () => clearTimeout(timer);
  }, [selectedCycle, goalCard?.id, saving, goals, selfAnswers, keySkills, trainingPrograms, feedbackManager, feedbackManagerRating, feedbackOrganization, feedbackOrganizationRating]);

  const addGoal = (category: string) => {
    setGoals(prev => [...prev, {
      _id: Date.now(), category, title: '',
      kpis: [{
        _id: Date.now() + 1, metric: '', target_value: '', weightage: '',
        frequency: '', unit_of_measurement: '', parameter_type: '', data_source: '',
        actual_achievement: '',
      }],
    }]);
  };

  const updateGoal = (idx: number, field: string, val: any) =>
    setGoals(prev => prev.map((g, i) => i === idx ? { ...g, [field]: val } : g));

  const addKPI = (goalIdx: number) =>
    setGoals(prev => prev.map((g, i) => i === goalIdx
      ? { ...g, kpis: [...(g.kpis || []), {
          _id: Date.now(), metric: '', target_value: '', weightage: '',
          frequency: '', unit_of_measurement: '', parameter_type: '', data_source: '',
          actual_achievement: '',
        }] }
      : g));

  const updateKPI = (goalIdx: number, kpiIdx: number, field: string, val: any) =>
    setGoals(prev => prev.map((g, i) => i === goalIdx
      ? { ...g, kpis: g.kpis.map((k: any, j: number) => j === kpiIdx ? { ...k, [field]: val } : k) }
      : g));

  const removeKPI = (goalIdx: number, kpiIdx: number) =>
    setGoals(prev => prev.map((g, i) => i === goalIdx
      ? { ...g, kpis: g.kpis.filter((_: any, j: number) => j !== kpiIdx) }
      : g));

  const removeGoal = (idx: number) => setGoals(prev => prev.filter((_, i) => i !== idx));

  const totalWeight = Math.round(
    goals.reduce((s, g) =>
      s + (g.kpis || []).reduce((ks: number, k: any) => ks + Number(k.weightage || 0), 0), 0)
    * 100) / 100;

  const SCORECARD_STATUSES = ['hod_approved', 'hr_approved', 'finalized'];

  const handleDownloadScorecard = () => {
    if (!goalCard) return;
    downloadScorecard(goalCard, selectedCycle?.name);
  };

  const saveDraftGoals = async (): Promise<any | null> => {
    if (!selectedCycle) return null;

    // Only send goals on Step 1 — other steps only save their own data
    // This prevents stale goal state from accidentally overwriting saved goals
    const payload: any = {
      self_review_answers: selfAnswers,
      key_skills: keySkills.filter(s => s.trim()),
      training_programs: trainingPrograms,
      feedback_manager: feedbackManager,
      feedback_manager_rating: feedbackManagerRating || null,
      feedback_organization: feedbackOrganization,
      feedback_organization_rating: feedbackOrganizationRating || null,
    };
    if (formStep === 1) {
      payload.goals = goals;
    }

    const res = await fetch(`${PERF_API}/goal-cards/${employee.employee_id}/${selectedCycle.id}/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      showMsg(data?.error || 'Failed to save. Please try again.', 'error');
      throw new Error(data?.error || 'Save failed');
    }
    setGoalCard(data);
    if (data.goals) setGoals(data.goals);
    return data;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await saveDraftGoals();
      showMsg('Draft saved successfully!');
    } catch {
      // error already shown inside saveDraftGoals
    } finally { setSaving(false); }
  };

  const handleNextStep = async () => {
    if (goals.length === 0) {
      showMsg('Please add at least one KRA before proceeding.', 'warn');
      return;
    }
    const incompleteKpi = goals.some(g =>
      (g.kpis || []).some((k: any) => {
        const hasData = REQUIRED_KPI_FIELDS.some(f => k[f] !== '' && k[f] !== undefined && k[f] !== null);
        if (!hasData) return false;
        return REQUIRED_KPI_FIELDS.some(f => k[f] === '' || k[f] === undefined || k[f] === null);
      })
    );
    if (incompleteKpi) {
      showMsg('Please fill all required fields for every KPI you have started.', 'warn');
      return;
    }
    if (Math.abs(totalWeight - 100) > 0.01) {
      showMsg(`Total weightage is ${totalWeight}%. Must equal 100% before proceeding.`, 'warn');
      return;
    }
    setSaving(true);
    try {
      // Save first — even if something fails after, data is in DB
      const saved = await saveDraftGoals();
      if (!saved) return;
      setFormStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // error already shown inside saveDraftGoals
    } finally { setSaving(false); }
  };

  const handleNextFromStep2 = async () => {
    const unanswered = SELF_REVIEW_QUESTIONS.findIndex((_, qi) =>
      !selfAnswers[qi].some(p => p.trim())
    );
    if (unanswered !== -1) {
      showMsg(`Please add at least one point for Question ${unanswered + 1} before proceeding.`, 'warn');
      return;
    }
    setSaving(true);
    try {
      await saveDraftGoals();
      setFormStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // error already shown inside saveDraftGoals
    } finally { setSaving(false); }
  };

  const handleNextFromStep3 = async () => {
    if (!keySkills.some(s => s.trim())) {
      showMsg('Please fill at least 1 key skill before proceeding.', 'warn');
      return;
    }
    if (!trainingPrograms.trim()) {
      showMsg('Please fill in the Technical Training Programs field before proceeding.', 'warn');
      return;
    }
    setSaving(true);
    try {
      await saveDraftGoals();
      setFormStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // error already shown inside saveDraftGoals
    } finally { setSaving(false); }
  };

  const handleSubmitToManager = async () => {
    if (!feedbackManagerRating) {
      showMsg('Please give a star rating for your Manager before submitting.', 'warn');
      return;
    }
    if (!feedbackManager.trim()) {
      showMsg('Please fill in your Feedback about Manager before submitting.', 'warn');
      return;
    }
    if (!feedbackOrganizationRating) {
      showMsg('Please give a star rating for the Organization before submitting.', 'warn');
      return;
    }
    if (!feedbackOrganization.trim()) {
      showMsg('Please fill in your Feedback about Organization before submitting.', 'warn');
      return;
    }
    setSaving(true);
    try {
      const data = await saveDraftGoals();
      if (!data) return;
      await fetch(`${PERF_API}/goal-cards/${data.id}/submit/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: 'Submitted for manager review.' }),
      });
      showMsg('Appraisal submitted for manager review!');
      setGoalCard((p: any) => ({ ...p, status: 'submitted' }));
    } catch { showMsg('Failed to submit. Please try again.', 'error'); }
    finally { setSaving(false); }
  };

  const refreshData = () => {
    if (!selectedCycle) return;
    fetch(`${PERF_API}/goal-cards/${employee.employee_id}/${selectedCycle.id}/?t=${Date.now()}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setGoalCard(data);
          setGoals(data.goals || []);
          showMsg('Data refreshed', 'success');
        }
      })
      .catch(() => showMsg('Failed to refresh', 'error'));
  };

  const cycleStatus = selectedCycle?.status;
  const canEdit = cycleStatus === 'goal_setting' &&
    (!goalCard || goalCard.status === 'draft' || goalCard.status === 'manager_rejected');
  // Steps 2-4: always editable — employee fills everything in one session before submitting
  const canEditFreeText = true;
  const journeyStep = getJourneyStep(goalCard);
  const isRejected = goalCard?.status === 'manager_rejected';

  return (
    <div className="min-h-screen bg-slate-100 p-4 lg:p-6">
      <div className="max-w-[1400px] mx-auto space-y-4">

        {/* ── Profile Card ── */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400" />
          <div className="px-6 py-4 flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-blue-200">
                {employee.name?.[0] || 'E'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{employee.name}</h2>
              <p className="text-blue-600 text-sm font-semibold">{employee.designation}</p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {employee.department && <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-medium">{employee.department}</span>}
                {employee.zone && <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-medium">📍 {employee.zone}</span>}
                {employee.employee_id && <span className="text-[11px] text-slate-400 font-mono">#{employee.employee_id}</span>}
                {employee.reporting_manager_id && <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-medium">Reports to: {employee.manager_name || employee.reporting_manager_id}</span>}
              </div>
            </div>
            {goalCard && (
              <div className="shrink-0 flex flex-col items-end gap-2">
                <StatusBadge status={goalCard.status} />
                <button onClick={refreshData}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">
                  🔄 Refresh
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Journey (shown only after submission) ── */}
        {goalCard && goalCard.status !== 'draft' && <JourneyStepper step={journeyStep} rejected={isRejected} />}

        {/* ── Form Step Progress ── */}
        {selectedCycle && <FormStepBar step={formStep} />}

        {/* ── Alerts ── */}
        {isRejected && goalCard?.manager_remarks && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-rose-700 font-bold text-sm">Manager requested changes</p>
              <p className="text-slate-600 text-sm mt-0.5">{goalCard.manager_remarks}</p>
            </div>
          </div>
        )}
        {goalCard?.status === 'manager_approved' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3 items-center shadow-sm">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="text-emerald-700 font-bold text-sm">Appraisal goals approved by manager</p>
          </div>
        )}

        {/* ── Cycle + Phase row ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Cycle selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2.5">
            <span className="text-slate-400 text-[11px] font-black uppercase tracking-widest shrink-0">Cycle</span>
            {cycles.length === 0 ? (
              <span className="text-slate-400 text-sm flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> No active cycles</span>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {cycles.map(c => (
                  <button key={c.id} onClick={() => setSelectedCycle(c)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all border ${
                      selectedCycle?.id === c.id
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                    }`}>
                    {c.name}
                    <span className="ml-1.5 text-[9px] opacity-70">{c.status.replace(/_/g,' ')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phase tag */}
          {selectedCycle && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold shadow-sm ${
              cycleStatus === 'goal_setting' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : cycleStatus === 'review_open' ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              {cycleStatus === 'goal_setting' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {cycleStatus === 'goal_setting' ? 'Goal Setting Open' : cycleStatus === 'goals_locked' ? 'Goals Locked' : cycleStatus?.replace(/_/g, ' ') || ''}
            </div>
          )}

          {/* Weightage total */}
          {goals.length > 0 && (
            <div className="flex-1 min-w-[200px]">
              <WeightageBar goals={goals} />
            </div>
          )}

          {goalCard && !canEdit && <StatusBadge status={goalCard.status} />}
        </div>

        {/* ── Main Form ── */}
        {selectedCycle ? (
          formStep === 1 ? (
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">

            {/* Section header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Performance Appraisal Form FY 25-26</h3>
                  <p className="text-blue-100 text-xs mt-0.5 opacity-80">Step 1 of 4 · Fill all KRA/KPI details across 4 goal categories · Total weightage must equal 100%</p>
                </div>
              </div>
            </div>

            {/* 4 category blocks */}
            {CATEGORIES.map((cat, catIdx) => {
              const col = CATEGORY_COLORS[catIdx];
              const catGoals = goals
                .map((g: any, i: number) => ({ g, i }))
                .filter(({ g }) => g.category === cat);

              return (
                <div key={cat} className="border-b border-slate-100 last:border-0">

                  {/* Category row */}
                  <div className={`flex items-center justify-between px-6 py-3 border-b ${col.header}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                      <span className={`text-sm font-black ${col.title}`}>{cat}</span>
                      {catGoals.length > 0 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${col.badge}`}>
                          {catGoals.length} KRA{catGoals.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {canEdit && (
                      <button onClick={() => addGoal(cat)}
                        className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl bg-white border-2 shadow-sm hover:shadow-md transition-all ${col.addBtn}`}>
                        <Plus className="w-4 h-4" /> Add KRA
                      </button>
                    )}
                  </div>

                  {catGoals.length === 0 ? (
                    <div className="px-6 py-5 text-slate-400 text-xs font-medium">
                      {canEdit ? `Click "+ Add KRA" to add a Key Result Area under ${cat}.` : 'No KRAs set for this category.'}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {catGoals.map(({ g, i }, catIdx2) => (
                        <div key={g._id || g.id || i} className={`border-l-4 ${col.accent} bg-white`}>

                          {/* KRA header row */}
                          <div className="flex items-center gap-3 px-6 py-3 bg-slate-50/70 border-b border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 w-12">
                              KRA {catIdx2 + 1}
                            </span>
                            <input
                              disabled={!canEdit}
                              value={g.title}
                              onChange={e => updateGoal(i, 'title', e.target.value)}
                              placeholder="Key Result Area — e.g. Achieve Regional Sales Target"
                              className="flex-1 bg-transparent border-0 text-slate-800 text-sm font-bold focus:outline-none placeholder-slate-300 disabled:opacity-60"
                            />
                            {canEdit && (
                              <button onClick={() => removeGoal(i)}
                                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* KPI table */}
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px]">
                              <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                  <th className="px-3 py-2.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-wider w-[36px]">#</th>
                                  {KPI_COLS.map((col, ci) => col.label ? (
                                    <th key={ci} className={`px-2 py-2.5 text-left text-[9px] font-black text-slate-500 uppercase tracking-wider ${col.width}`}>
                                      {col.label}
                                    </th>
                                  ) : <th key={ci} className="w-[36px]" />)}
                                </tr>
                              </thead>
                              <tbody>
                                {(g.kpis || []).map((kpi: any, j: number) => (
                                  <KpiTableRow
                                    key={kpi._id || kpi.id || j}
                                    kpi={kpi} j={j}
                                    canEdit={canEdit}
                                    onChange={(field, val) => updateKPI(i, j, field, val)}
                                    onRemove={() => removeKPI(i, j)}
                                    showRemove={g.kpis.length > 1}
                                  />
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Add KPI row */}
                          {canEdit && (
                            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
                              <button onClick={() => addKPI(i)}
                                className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 px-4 py-2 rounded-xl border-2 border-blue-200 hover:border-blue-400 bg-white hover:bg-blue-50 shadow-sm hover:shadow-md transition-all">
                                <Plus className="w-4 h-4" /> Add KPI Row
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Totals + Step 1 footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6 text-sm">
                <span className="text-slate-500">
                  Total KRAs: <span className="text-slate-800 font-bold">{goals.length}</span>
                </span>
                <span className="text-slate-500">
                  Total KPIs: <span className="text-slate-800 font-bold">
                    {goals.reduce((s, g) => s + (g.kpis || []).length, 0)}
                  </span>
                </span>
                <span className={`font-bold ${Math.abs(totalWeight - 100) <= 0.01 ? 'text-emerald-600' : totalWeight > 100 ? 'text-rose-600' : 'text-amber-600'}`}>
                  Total Weightage: {totalWeight}% {Math.abs(totalWeight - 100) <= 0.01 ? '✓' : totalWeight > 100 ? '⚠ OVER 100%' : ''}
                </span>
              </div>

              {totalWeight > 100 && (
                <div className="flex items-start gap-3 bg-rose-50 border border-rose-300 rounded-xl px-4 py-3 text-sm text-rose-700 font-medium">
                  <span className="text-rose-500 text-base shrink-0">⚠</span>
                  <span>
                    <strong>Total weightage is {totalWeight}% — must be exactly 100%.</strong> Please reduce some KPI weights.
                    Each individual KPI weight is capped at 100. Check for any row with an unusually high value.
                  </span>
                </div>
              )}

              <Toast msg={msg} />

              {canEdit && (
                <div className="flex gap-3">
                  <button onClick={handleSaveDraft} disabled={saving}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white font-bold text-sm hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-50 shadow-sm">
                    {saving ? 'Saving…' : '💾 Save Draft'}
                  </button>
                  <button onClick={handleNextStep} disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center gap-2 shadow-md shadow-blue-200 active:scale-[0.98]">
                    {saving ? 'Saving…' : 'Next: Self Review'}
                    {!saving && <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>
          ) : formStep === 2 ? (
          /* ── Step 2: Self-Review Questions ── */
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-700 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Self-Review Questions</h3>
                <p className="text-indigo-100 text-xs mt-0.5 opacity-80">Step 2 of 4 · Answer all 3 questions before submitting to your manager</p>
              </div>
            </div>

            {/* Questions */}
            <div className="divide-y divide-slate-100">
              {SELF_REVIEW_QUESTIONS.map((question, qi) => (
                <div key={qi} className="px-8 py-6">
                  <div className="flex gap-4">
                    <div className="shrink-0 w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                      <span className="text-indigo-700 font-black text-sm">{qi + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-800 font-semibold text-sm mb-4">{question}</p>

                      {/* Bullet point inputs */}
                      <div className="space-y-2.5">
                        {selfAnswers[qi].map((point, pi) => (
                          <div key={pi} className="flex items-center gap-2.5">
                            <div className="shrink-0 w-5 h-5 rounded-md bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                              <span className="text-[10px] font-black text-indigo-500">{pi + 1}</span>
                            </div>
                            <input
                              type="text"
                              disabled={!canEditFreeText}
                              value={point}
                              onChange={e => {
                                const updated = selfAnswers.map((arr, i) =>
                                  i === qi ? arr.map((p, j) => j === pi ? e.target.value : p) : arr
                                );
                                setSelfAnswers(updated);
                              }}
                              placeholder={`Point ${pi + 1}…`}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm font-medium focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder-slate-300 disabled:opacity-60 transition-all"
                            />
                            {canEditFreeText && selfAnswers[qi].length > 1 && (
                              <button
                                onClick={() => {
                                  const updated = selfAnswers.map((arr, i) =>
                                    i === qi ? arr.filter((_, j) => j !== pi) : arr
                                  );
                                  setSelfAnswers(updated);
                                }}
                                className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {canEditFreeText && (
                        <button
                          onClick={() => {
                            const updated = selfAnswers.map((arr, i) =>
                              i === qi ? [...arr, ''] : arr
                            );
                            setSelfAnswers(updated);
                          }}
                          className="mt-3 flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-all">
                          <span className="w-5 h-5 rounded-md bg-indigo-100 border border-indigo-200 flex items-center justify-center text-base leading-none">+</span>
                          Add point
                        </button>
                      )}

                      <p className="text-[11px] text-slate-400 font-medium mt-2">
                        {selfAnswers[qi].filter(p => p.trim()).length} point{selfAnswers[qi].filter(p => p.trim()).length !== 1 ? 's' : ''} filled
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Support Document Upload */}
            {canEditFreeText && (
              <div className="px-8 py-6 border-t border-slate-100 bg-blue-50">
                <div className="flex gap-3 mb-4">
                  <div className="shrink-0 w-8 h-8 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-slate-800 font-bold text-sm">Supporting Evidence Document</p>
                    <p className="text-slate-500 text-xs mt-1">Upload any supporting document (PDF, Word, Excel) as evidence for your self-review answers</p>
                  </div>
                </div>
                <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-100/30 transition-all cursor-pointer group"
                  onClick={() => document.getElementById('appraisal-doc-input')?.click()}>
                  <input id="appraisal-doc-input" type="file" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !goalCard) return;
                    setUploading(true);
                    try {
                      const fd = new FormData();
                      fd.append('document', file);
                      const res = await fetch(`${PERF_API}/goal-cards/${goalCard.id}/upload-document/`, {
                        method: 'POST', body: fd,
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Upload failed');
                      setGoalCard(data);
                      showMsg('Document uploaded successfully', 'success');
                    } catch (err: any) {
                      showMsg(err.message, 'error');
                    } finally {
                      setUploading(false);
                    }
                  }} />
                  <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-slate-700 font-semibold text-sm">{uploading ? 'Uploading...' : goalCard?.support_document_name ? 'Click to replace document' : 'Click to upload document'}</p>
                  <p className="text-slate-500 text-xs mt-1">PDF, Word, Excel (Max 10MB)</p>
                </div>
                {goalCard?.support_document_name && (
                  <div className="mt-3 flex items-center gap-3 p-3 bg-white rounded-xl border border-blue-200">
                    <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-blue-800 truncate">{goalCard.support_document_name}</p>
                      <p className="text-xs text-slate-500">Uploaded · click above to replace</p>
                    </div>
                    {goalCard.support_document_url && (
                      <a href={goalCard.support_document_url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs font-bold shrink-0">View</a>
                    )}
                    {!uploading && (
                      <button onClick={async () => {
                        if (!goalCard) return;
                        setUploading(true);
                        try {
                          const res = await fetch(`${PERF_API}/goal-cards/${goalCard.id}/upload-document/`, { method: 'DELETE' });
                          if (!res.ok) throw new Error('Delete failed');
                          setGoalCard((prev: any) => prev ? { ...prev, support_document_name: '', support_document_url: null } : null);
                          showMsg('Document removed', 'success');
                        } catch (err: any) {
                          showMsg(err.message, 'error');
                        } finally {
                          setUploading(false);
                        }
                      }} className="text-rose-500 hover:text-rose-700 text-xs font-bold shrink-0">Remove</button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-4">
              <button
                onClick={() => { setFormStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white font-bold text-sm hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm">
                <ArrowLeft className="w-4 h-4" /> Back to Goals
              </button>

              <Toast msg={msg} />

              {canEditFreeText && (
                <button onClick={handleNextFromStep2} disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center gap-2 shadow-md shadow-indigo-200 active:scale-[0.98]">
                  {saving ? 'Saving…' : 'Next: Training & Capability'}
                  {!saving && <ChevronRight className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
          ) : formStep === 3 ? (
          /* ── Step 3: Training & Capability Requirements ── */
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Training & Capability Requirements</h3>
                <p className="text-emerald-100 text-xs mt-0.5 opacity-80">Step 3 of 4 · Identify your key skills and training needs</p>
              </div>
            </div>

            {/* Section 1 – Key Skills */}
            <div className="px-8 py-6 border-b border-slate-100">
              <div className="flex gap-3 mb-5">
                <div className="shrink-0 w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                  <span className="text-emerald-700 font-black text-sm">A</span>
                </div>
                <div>
                  <p className="text-slate-800 font-bold text-sm">Key Skills Required for Your Role</p>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                    Based on the performance expectations of your role, list up to <span className="font-bold text-slate-700">5 key skills</span> required to perform your role effectively.
                    Keep them specific and relevant. <span className="text-slate-400">e.g. Customer relationship management, Budgeting & forecasting, Negotiation skills, Market analysis, Digital Marketing</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3 ml-11">
                {keySkills.map((skill, si) => (
                  <div key={si} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-black text-slate-500">{si + 1}</span>
                    </div>
                    <input
                      type="text"
                      disabled={!canEditFreeText}
                      value={skill}
                      onChange={e => {
                        const updated = [...keySkills];
                        updated[si] = e.target.value;
                        setKeySkills(updated);
                      }}
                      placeholder={`Skill ${si + 1} — e.g. ${['Customer relationship management', 'Budgeting & forecasting', 'Negotiation skills', 'Market analysis', 'Digital Marketing (SEO, Social Media)'][si]}`}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm font-medium focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 placeholder-slate-300 disabled:opacity-60 transition-all"
                    />
                    {canEditFreeText && skill.trim() && (
                      <button onClick={() => {
                        const updated = [...keySkills];
                        updated[si] = '';
                        setKeySkills(updated);
                      }} className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <p className="text-[11px] text-slate-400 font-medium ml-9">
                  {keySkills.filter(s => s.trim()).length} of 5 skills filled
                </p>
              </div>
            </div>

            {/* Section 2 – Technical Training Programs */}
            <div className="px-8 py-6">
              <div className="flex gap-3 mb-5">
                <div className="shrink-0 w-8 h-8 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center">
                  <span className="text-teal-700 font-black text-sm">B</span>
                </div>
                <div>
                  <p className="text-slate-800 font-bold text-sm">Technical Training Programs</p>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                    What are the technical training programs you would like to attend to enhance your technical expertise?
                    Please refer to the areas where you need training or support.
                    Write <span className="font-bold text-slate-600">'NA'</span> if not applicable to you/team.
                  </p>
                </div>
              </div>

              <div className="ml-11">
                <textarea
                  rows={6}
                  disabled={!canEditFreeText}
                  value={trainingPrograms}
                  onChange={e => setTrainingPrograms(e.target.value)}
                  placeholder="e.g. Advanced Excel & Data Analytics, Leadership Development, Salesforce CRM, Project Management (PMP)…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm font-medium focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 placeholder-slate-300 disabled:opacity-60 resize-none transition-all leading-relaxed"
                />
                <div className="flex justify-end mt-1">
                  <span className="text-[11px] text-slate-400 font-medium">{trainingPrograms.length} characters</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-4">
              <button
                onClick={() => { setFormStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white font-bold text-sm hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm">
                <ArrowLeft className="w-4 h-4" /> Back to Self-Review
              </button>

              <Toast msg={msg} />

              {canEditFreeText && (
                <button onClick={handleNextFromStep3} disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center gap-2 shadow-md shadow-teal-200 active:scale-[0.98]">
                  {saving ? 'Saving…' : 'Next: Feedback'}
                  {!saving && <ChevronRight className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
          ) : (
          /* ── Step 4: Feedback ── */
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-rose-500 to-pink-600 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
                <ThumbsUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Feedback</h3>
                <p className="text-rose-100 text-xs mt-0.5 opacity-80">Step 4 of 4 · Share your honest feedback before final submission</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">

              {/* Feedback about Manager */}
              <div className="px-8 py-7">
                <div className="flex gap-4">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center">
                    <span className="text-rose-600 font-black text-sm">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-800 font-bold text-sm mb-0.5">Feedback about Manager</p>
                    <p className="text-slate-400 text-xs mb-4">Share your thoughts on your manager's leadership, support, and communication during this appraisal period.</p>

                    {/* Star Rating */}
                    <div className="mb-4">
                      <p className="text-slate-600 text-xs font-semibold mb-2">Overall Rating <span className="text-rose-500">*</span></p>
                      <StarRating value={feedbackManagerRating} onChange={canEditFreeText ? setFeedbackManagerRating : undefined} />
                    </div>

                    <textarea
                      rows={5}
                      disabled={!canEditFreeText}
                      value={feedbackManager}
                      onChange={e => setFeedbackManager(e.target.value)}
                      placeholder="e.g. My manager provided clear direction and was always available for guidance. Regular feedback helped me stay on track with my goals…"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm font-medium focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 placeholder-slate-300 disabled:opacity-60 resize-none transition-all leading-relaxed"
                    />
                    <div className="flex justify-end mt-1">
                      <span className="text-[11px] text-slate-400 font-medium">{feedbackManager.length} characters</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback about Organization */}
              <div className="px-8 py-7">
                <div className="flex gap-4">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-pink-100 border border-pink-200 flex items-center justify-center">
                    <span className="text-pink-600 font-black text-sm">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-800 font-bold text-sm mb-0.5">Feedback about Organization</p>
                    <p className="text-slate-400 text-xs mb-4">Share your thoughts on the organization's culture, processes, work environment, and overall support provided to you.</p>

                    {/* Star Rating */}
                    <div className="mb-4">
                      <p className="text-slate-600 text-xs font-semibold mb-2">Overall Rating <span className="text-rose-500">*</span></p>
                      <StarRating value={feedbackOrganizationRating} onChange={canEditFreeText ? setFeedbackOrganizationRating : undefined} />
                    </div>

                    <textarea
                      rows={5}
                      disabled={!canEditFreeText}
                      value={feedbackOrganization}
                      onChange={e => setFeedbackOrganization(e.target.value)}
                      placeholder="e.g. The organization provides a great learning environment. Better communication of company goals across teams would help align individual efforts more effectively…"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm font-medium focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 placeholder-slate-300 disabled:opacity-60 resize-none transition-all leading-relaxed"
                    />
                    <div className="flex justify-end mt-1">
                      <span className="text-[11px] text-slate-400 font-medium">{feedbackOrganization.length} characters</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer — Final Submit */}
            <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-4">
              <button
                onClick={() => { setFormStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white font-bold text-sm hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm">
                <ArrowLeft className="w-4 h-4" /> Back to Training
              </button>

              <Toast msg={msg} />

              {canEditFreeText && (
                <div className="flex items-center gap-3">
                  <button onClick={handleSaveDraft} disabled={saving}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50 shadow-sm">
                    {saving ? 'Saving…' : '💾 Save Draft'}
                  </button>
                  <button onClick={handleSubmitToManager} disabled={saving}
                    className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center gap-2 shadow-md shadow-rose-200 active:scale-[0.98]">
                    <Send className="w-4 h-4" />
                    {saving ? 'Submitting…' : 'Submit to Manager'}
                  </button>
                </div>
              )}
            </div>
          </div>
          )
        ) : (
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-slate-700 font-bold text-base">Select an appraisal cycle above to begin</p>
            <p className="text-slate-400 text-sm mt-1">Contact HR if no cycles appear.</p>
          </div>
        )}
      </div>
    </div>
  );
}
