import { useState, useEffect } from 'react';
import {
  Users, CheckCircle, Clock, ChevronDown, ChevronUp, AlertCircle,
  Target, MessageSquare, BookOpen, Send, ArrowLeft, User,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PERF_API = `${API_BASE}/api/performance`;

const SELF_REVIEW_QUESTIONS = [
  'What do you consider to be your most important achievement of FY 25-26?',
  'Where did you experience difficulties or constraints which affected your performance in FY 25-26?',
  'List the training programs attended in FY 25-26.',
];

// ─── Score calculation (mirrors employee view) ────────────────────────────────

function calcScoreAchievement(kpi: any): number | null {
  const plan   = parseFloat(kpi.target_value);
  const actual = parseFloat(kpi.actual_achievement);
  if (isNaN(plan) || isNaN(actual) || plan === 0) return null;
  const dir = (kpi.parameter_type || '').toLowerCase();
  if (dir.includes('higher')) return Math.min((actual / plan) * 100, 100);
  if (dir.includes('lower'))  return actual === 0 ? null : Math.min((plan / actual) * 100, 100);
  if (dir.includes('target')) return actual >= plan ? 100 : Math.max(0, (1 - Math.abs(actual - plan) / plan) * 100);
  return null;
}

function calcWeightageSystem(kpi: any): number | null {
  const score = calcScoreAchievement(kpi);
  const wt    = parseFloat(kpi.weightage);
  if (score === null || isNaN(wt) || wt === 0) return null;
  return parseFloat(((score / 100) * wt).toFixed(2));
}

function CalcCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-300 text-xs block text-center">—</span>;
  return (
    <span className="block w-full text-center text-[11px] font-black text-amber-700 bg-amber-50 rounded-lg px-1 py-1.5 border border-amber-200">
      {value.toFixed(1)}%
    </span>
  );
}

const CATEGORY_DOT: Record<string, string> = {
  'Financial':                  'bg-blue-500',
  'Customer Enhancement':       'bg-amber-500',
  'Internal Business Process':  'bg-sky-500',
  'People Development':         'bg-emerald-500',
};

const STATUS_CFG: Record<string, { badge: string; dot: string; label: string }> = {
  draft:            { badge: 'bg-slate-100 text-slate-600 border-slate-200',         dot: 'bg-slate-400',                label: 'Draft' },
  submitted:        { badge: 'bg-blue-50 text-blue-700 border-blue-200',             dot: 'bg-blue-500 animate-pulse',   label: 'Awaiting Review' },
  manager_approved: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',    dot: 'bg-emerald-500',              label: 'Mgr Approved' },
  manager_rejected: { badge: 'bg-rose-50 text-rose-700 border-rose-200',             dot: 'bg-rose-500',                 label: 'Changes Requested' },
  hod_approved:     { badge: 'bg-violet-50 text-violet-700 border-violet-200',       dot: 'bg-violet-500',               label: 'HOD Approved' },
  hod_rejected:     { badge: 'bg-orange-50 text-orange-700 border-orange-200',       dot: 'bg-orange-500',               label: 'HOD Rejected' },
  hr_approved:      { badge: 'bg-purple-50 text-purple-700 border-purple-200',       dot: 'bg-purple-500',               label: 'HR Approved' },
  finalized:        { badge: 'bg-amber-50 text-amber-700 border-amber-200',          dot: 'bg-amber-500',                label: 'Finalized' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function SectionCard({ title, icon: Icon, color, children }: {
  title: string; icon: any; color: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-3.5 ${color} border-b border-slate-200`}>
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4" />
          <span className="font-bold text-sm">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 opacity-60" /> : <ChevronDown className="w-4 h-4 opacity-60" />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-slate-800 text-sm font-medium bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 whitespace-pre-wrap leading-relaxed min-h-[44px]">
        {value || <span className="text-slate-300 italic">Not answered</span>}
      </p>
    </div>
  );
}

// ─── Employee Detail Panel ────────────────────────────────────────────────────

function EmployeeAppraisalDetail({ card, manager, onBack, onRefresh }: {
  card: any; manager: any; onBack: () => void; onRefresh: () => void;
}) {
  const gc = card.goal_card || card;
  const goals: any[] = gc.goals || [];
  const selfAnswers: string[] = gc.self_review_answers || [];
  const keySkills: string[] = gc.key_skills || [];
  const trainingPrograms: string = gc.training_programs || '';

  // Manager rating state per KPI: { [goalIdx_kpiIdx]: manager_score / manager_comments }
  const buildInitialRatings = () => {
    const scores: Record<string, string> = {};
    const comments: Record<string, string> = {};
    goals.forEach((g: any, gi: number) => {
      (g.kpis || []).forEach((k: any, ki: number) => {
        scores[`${gi}_${ki}`]   = k.manager_score    != null ? String(k.manager_score) : '';
        comments[`${gi}_${ki}`] = k.manager_comments || '';
      });
    });
    return { scores, comments };
  };

  const initial = buildInitialRatings();
  const [ratings,  setRatings]  = useState<Record<string, string>>(initial.scores);
  const [comments, setComments] = useState<Record<string, string>>(initial.comments);
  const [specialAchievements, setSpecialAchievements] = useState(gc.manager_special_achievements || '');
  const [promoted, setPromoted] = useState<'Yes' | 'No' | ''>(gc.manager_promoted || '');
  const [promotedJustification, setPromotedJustification] = useState(gc.manager_promoted_justification || '');
  const [salaryCorrection, setSalaryCorrection] = useState(gc.manager_salary_correction || '');
  const [salaryJustification, setSalaryJustification] = useState(gc.manager_salary_justification || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const setRating  = (gi: number, ki: number, val: string) =>
    setRatings(prev  => ({ ...prev, [`${gi}_${ki}`]: val }));
  const setComment = (gi: number, ki: number, val: string) =>
    setComments(prev => ({ ...prev, [`${gi}_${ki}`]: val }));

  const saveRatings = async (): Promise<boolean> => {
    const kpiScores: any[] = [];
    goals.forEach((g: any, gi: number) => {
      (g.kpis || []).forEach((k: any, ki: number) => {
        if (k.id) {
          const scoreVal = ratings[`${gi}_${ki}`];
          kpiScores.push({
            kpi_id: k.id,
            manager_score: scoreVal !== '' ? parseFloat(scoreVal) : null,
            manager_comments: comments[`${gi}_${ki}`] || '',
          });
        }
      });
    });
    try {
      const res = await fetch(`${PERF_API}/goal-cards/${gc.id}/manager-kpi-scores/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpi_scores: kpiScores }),
      });
      return res.ok;
    } catch { return false; }
  };

  const submitManagerRating = async () => {
    // Validate all KPI scores are filled
    const missingScore = goals.some((g: any, gi: number) =>
      (g.kpis || []).some((_: any, ki: number) => {
        const v = ratings[`${gi}_${ki}`];
        return v === '' || v === null || v === undefined;
      })
    );
    if (missingScore) {
      showMsg('Please fill Wt% (Manager) for all KPIs before approving.', false);
      return;
    }
    if (!promotedJustification.trim()) {
      showMsg('Promotion justification is mandatory. Please fill it in.', false);
      return;
    }
    if (!salaryJustification.trim()) {
      showMsg('Salary/market correction justification is mandatory. Please fill it in.', false);
      return;
    }
    setSaving(true);
    try {
      const saved = await saveRatings();
      if (!saved) { showMsg('Failed to save KPI scores. Try again.', false); setSaving(false); return; }
      const res = await fetch(`${PERF_API}/goal-cards/${gc.id}/manager-review/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approved',
          remarks: '',
          manager_name: manager.name,
          manager_special_achievements: specialAchievements,
          manager_promoted: promoted,
          manager_promoted_justification: promotedJustification,
          manager_salary_correction: salaryCorrection,
          manager_salary_justification: salaryJustification,
        }),
      });
      if (res.ok) {
        showMsg('Manager rating submitted successfully!', true);
        setTimeout(() => onRefresh(), 1500);
      } else { showMsg('Failed to submit rating.', false); }
    } catch { showMsg('Error submitting. Try again.', false); }
    finally { setSaving(false); }
  };

  const emp = card;
  const totalManagerScore = goals.reduce((s: number, g: any, gi: number) =>
    s + (g.kpis || []).reduce((ks: number, _: any, ki: number) =>
      ks + Number(ratings[`${gi}_${ki}`] || 0), 0), 0);
  const allScoresFilled = goals.every((g: any, gi: number) =>
    (g.kpis || []).every((_: any, ki: number) => ratings[`${gi}_${ki}`] !== '' && ratings[`${gi}_${ki}`] !== undefined));

  return (
    <div className="space-y-4">

      {/* Back + Employee Profile */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400" />
        <div className="px-5 py-4 flex items-center gap-4">
          <button onClick={onBack}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-200 shrink-0">
            {emp.name?.[0] || 'E'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-extrabold text-slate-900">{emp.name}</h2>
            <p className="text-blue-600 text-sm font-semibold">{emp.designation}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {emp.department && <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{emp.department}</span>}
              {emp.zone && <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">📍 {emp.zone}</span>}
              {emp.employee_id && <span className="text-[11px] text-slate-400 font-mono">#{emp.employee_id}</span>}
            </div>
          </div>
          <div className="shrink-0">
            <StatusBadge status={gc.status} />
          </div>
        </div>
      </div>

      {/* ── Section 1: Goals & KPI Table with Manager Ratings ── */}
      <SectionCard title="Goals & KPI Setting" icon={Target} color="bg-blue-50 text-blue-700">
        {goals.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">No goals submitted.</p>
        ) : (
          <div className="space-y-5">
            {goals.map((g: any, gi: number) => (
              <div key={gi} className="rounded-xl border border-slate-200 overflow-hidden">
                {/* KRA Header */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${CATEGORY_DOT[g.category] || 'bg-slate-400'}`} />
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">{g.category}</span>
                  <span className="mx-1 text-slate-300">·</span>
                  <span className="text-sm font-bold text-slate-800">{g.title || <span className="italic text-slate-400">No KRA title</span>}</span>
                </div>

                {/* KPI Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[1300px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-wider w-[28px]">#</th>
                        <th className="px-3 py-2.5 text-left text-[9px] font-black text-slate-500 uppercase tracking-wider w-[14%]">KPI / Metric</th>
                        <th className="px-3 py-2.5 text-left text-[9px] font-black text-slate-500 uppercase tracking-wider w-[5%]">Wt%</th>
                        <th className="px-3 py-2.5 text-left text-[9px] font-black text-slate-500 uppercase tracking-wider w-[8%]">Frequency</th>
                        <th className="px-3 py-2.5 text-left text-[9px] font-black text-slate-500 uppercase tracking-wider w-[8%]">Unit</th>
                        <th className="px-3 py-2.5 text-left text-[9px] font-black text-slate-500 uppercase tracking-wider w-[10%]">Direction</th>
                        <th className="px-3 py-2.5 text-left text-[9px] font-black text-slate-500 uppercase tracking-wider w-[9%]">Data Source</th>
                        <th className="px-3 py-2.5 text-left text-[9px] font-black text-slate-500 uppercase tracking-wider w-[8%]">Plan (Target)</th>
                        {/* Employee-filled (read-only) */}
                        <th className="px-3 py-2.5 text-left text-[9px] font-black text-slate-500 uppercase tracking-wider w-[9%] bg-slate-100 border-l-2 border-slate-300">Actual (EMP)</th>
                        {/* System-calculated */}
                        <th className="px-3 py-2.5 text-center text-[9px] font-black text-amber-700 uppercase tracking-wider w-[7%] bg-amber-50 border-l border-amber-200">Score Ach%</th>
                        <th className="px-3 py-2.5 text-center text-[9px] font-black text-amber-700 uppercase tracking-wider w-[7%] bg-amber-50">Wt% (System)</th>
                        {/* Manager columns */}
                        <th className="px-3 py-2.5 text-center text-[9px] font-black text-blue-700 uppercase tracking-wider w-[7%] bg-blue-50 border-l-2 border-blue-200">Wt% (Manager)</th>
                        <th className="px-3 py-2.5 text-left text-[9px] font-black text-blue-700 uppercase tracking-wider w-[14%] bg-blue-50">Manager Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(g.kpis || []).map((kpi: any, ki: number) => {
                        const managerScore = ratings[`${gi}_${ki}`] ?? '';
                        const scoreAch = calcScoreAchievement(kpi);
                        const wtSys    = calcWeightageSystem(kpi);
                        return (
                          <tr key={ki} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                            <td className="px-3 py-2.5 text-[10px] font-black text-slate-400">{ki + 1}</td>
                            <td className="px-3 py-2.5 text-slate-700 font-semibold">{kpi.metric || '—'}</td>
                            <td className="px-3 py-2.5 text-slate-600 font-bold text-center">{kpi.weightage || '—'}</td>
                            <td className="px-3 py-2.5 text-slate-600">{kpi.frequency || '—'}</td>
                            <td className="px-3 py-2.5 text-slate-600">{kpi.unit_of_measurement || '—'}</td>
                            <td className="px-3 py-2.5 text-slate-600">{kpi.parameter_type || '—'}</td>
                            <td className="px-3 py-2.5 text-slate-600">{kpi.data_source || '—'}</td>
                            <td className="px-3 py-2.5 text-slate-700 font-semibold">{kpi.target_value || '—'}</td>
                            {/* Employee-filled actual (read-only) */}
                            <td className="px-3 py-2.5 text-slate-700 font-semibold bg-slate-50 border-l-2 border-slate-200">
                              {kpi.actual_achievement || <span className="text-slate-300 italic text-[11px]">Not filled</span>}
                            </td>
                            {/* System calculated */}
                            <td className="px-2 py-2 bg-amber-50/60 border-l border-amber-100">
                              <CalcCell value={scoreAch} />
                            </td>
                            <td className="px-2 py-2 bg-amber-50/60">
                              <CalcCell value={wtSys} />
                            </td>
                            {/* Manager score editable */}
                            <td className="px-2 py-2 bg-blue-50/60 border-l-2 border-blue-100">
                              <input
                                type="number"
                                value={managerScore}
                                onChange={e => setRating(gi, ki, e.target.value)}
                                placeholder="%"
                                className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-slate-800 text-xs font-bold text-center focus:outline-none focus:ring-1 placeholder-slate-300 transition-all ${managerScore === '' ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-blue-200 focus:border-blue-400 focus:ring-blue-100'}`}
                              />
                            </td>
                            {/* Manager comments editable */}
                            <td className="px-2 py-2 bg-blue-50/40">
                              <textarea
                                rows={2}
                                value={comments[`${gi}_${ki}`] || ''}
                                onChange={e => setComment(gi, ki, e.target.value)}
                                placeholder="Comment on this KPI…"
                                className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-slate-700 text-xs font-medium focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 placeholder-slate-300 resize-none transition-all leading-snug"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Total manager score */}
            <div className="flex items-center justify-end gap-4 px-2">
              {!allScoresFilled && (
                <span className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                  Fill Wt% (Manager) for all KPIs before approving
                </span>
              )}
              <span className="text-sm text-slate-500">Total Wt% (Manager):</span>
              <span className={`text-base font-black ${totalManagerScore === 100 ? 'text-emerald-600' : totalManagerScore > 100 ? 'text-rose-600' : 'text-blue-600'}`}>
                {totalManagerScore}% {totalManagerScore === 100 ? '✓' : ''}
              </span>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Section 2: Self-Review ── */}
      <SectionCard title="Self-Review Questions" icon={MessageSquare} color="bg-indigo-50 text-indigo-700">
        <div className="space-y-4">
          {SELF_REVIEW_QUESTIONS.map((q, qi) => (
            <div key={qi} className="flex gap-3">
              <div className="shrink-0 w-7 h-7 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                <span className="text-indigo-700 font-black text-xs">{qi + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-slate-600 text-xs font-semibold mb-1.5">{q}</p>
                <p className="text-slate-800 text-sm font-medium bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 leading-relaxed min-h-[52px]">
                  {selfAnswers[qi] || <span className="text-slate-300 italic text-xs">Not answered</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Section 3: Training & Capability ── */}
      <SectionCard title="Training & Capability Requirements" icon={BookOpen} color="bg-teal-50 text-teal-700">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Key Skills for Role</p>
            <div className="space-y-2">
              {keySkills.filter(s => s.trim()).length > 0
                ? keySkills.filter(s => s.trim()).map((skill, si) => (
                    <div key={si} className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-teal-100 border border-teal-200 flex items-center justify-center text-[10px] font-black text-teal-600 shrink-0">{si + 1}</span>
                      <span className="text-slate-800 text-sm font-medium bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-200 flex-1">{skill}</span>
                    </div>
                  ))
                : <p className="text-slate-400 text-sm italic">No skills listed.</p>
              }
            </div>
          </div>
          <ReadonlyField label="Technical Training Programs" value={trainingPrograms} />
        </div>
      </SectionCard>

      {/* Feedback section intentionally hidden from manager — it's the employee's private feedback */}

      {/* ── Manager Remarks ── */}
      {gc.status === 'submitted' && (
        <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2.5">
            <span className="text-amber-600 font-black text-sm">📝</span>
            <span className="font-bold text-sm text-amber-800">Manager Remarks</span>
            <span className="ml-auto text-[10px] font-bold text-amber-500 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Fill before submitting</span>
          </div>
          <div className="p-5 space-y-5">

            {/* Special Achievements */}
            <div>
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1.5">
                Special Achievements
                <span className="ml-1 text-slate-400 normal-case font-medium">(mention in Rs &amp; in Lacs)</span>
              </label>
              <textarea
                rows={3}
                value={specialAchievements}
                onChange={e => setSpecialAchievements(e.target.value)}
                placeholder="e.g. Achieved Rs. 12 Lacs additional revenue from new client acquisition…"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 placeholder-slate-300 resize-none transition-all leading-relaxed"
              />
            </div>

            {/* Promoted */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1.5">
                  Promoted <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-3">
                  {(['Yes', 'No'] as const).map(opt => (
                    <button key={opt} onClick={() => setPromoted(opt)}
                      className={`flex-1 py-2.5 rounded-xl border font-bold text-sm transition-all ${
                        promoted === opt
                          ? opt === 'Yes'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                            : 'bg-rose-500 border-rose-500 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1.5">
                  Promotion Justification <span className="text-rose-500">* Mandatory</span>
                </label>
                <textarea
                  rows={2}
                  value={promotedJustification}
                  onChange={e => setPromotedJustification(e.target.value)}
                  placeholder="Justify the promotion decision…"
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 placeholder-slate-300 resize-none transition-all leading-relaxed ${
                    !promotedJustification.trim() ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-amber-400 focus:ring-amber-100'
                  }`}
                />
              </div>
            </div>

            {/* Salary / Market Correction */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1.5">
                  Salary / Market Correction
                </label>
                <input
                  type="text"
                  value={salaryCorrection}
                  onChange={e => setSalaryCorrection(e.target.value)}
                  placeholder="e.g. 10% increment, market correction…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 placeholder-slate-300 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1.5">
                  Justification <span className="text-rose-500">* Mandatory</span>
                </label>
                <textarea
                  rows={2}
                  value={salaryJustification}
                  onChange={e => setSalaryJustification(e.target.value)}
                  placeholder="Justify the salary/market correction recommendation…"
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 placeholder-slate-300 resize-none transition-all leading-relaxed ${
                    !salaryJustification.trim() ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-amber-400 focus:ring-amber-100'
                  }`}
                />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Submitted — show manager remarks read-only */}
      {gc.status === 'manager_approved' && (gc.manager_special_achievements || gc.manager_promoted) && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
            <span className="font-bold text-sm text-slate-700">📝 Manager Remarks (Submitted)</span>
          </div>
          <div className="p-5 space-y-4">
            {gc.manager_special_achievements && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Special Achievements</p>
                <p className="text-slate-800 text-sm bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">{gc.manager_special_achievements}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {gc.manager_promoted && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Promoted</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${gc.manager_promoted === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{gc.manager_promoted}</span>
                  {gc.manager_promoted_justification && <p className="text-slate-600 text-sm mt-1">{gc.manager_promoted_justification}</p>}
                </div>
              )}
              {gc.manager_salary_correction && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Salary/Market Correction</p>
                  <p className="text-slate-800 text-sm">{gc.manager_salary_correction}</p>
                  {gc.manager_salary_justification && <p className="text-slate-600 text-sm mt-1">{gc.manager_salary_justification}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Submit Manager Rating ── */}
      {gc.status === 'submitted' && (
        <div className="bg-white border border-blue-200 shadow-sm rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
              <Send className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-slate-900 font-bold text-sm">Submit Manager Rating</p>
              <p className="text-slate-400 text-xs mt-0.5">Fill the Wt% (Manager) column above for each KPI, then submit to proceed.</p>
            </div>
          </div>

          {msg && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
              {msg.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {msg.text}
            </div>
          )}

          <button onClick={submitManagerRating} disabled={saving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-md shadow-blue-200 active:scale-[0.98]">
            <Send className="w-4 h-4" />
            {saving ? 'Submitting…' : 'Submit Manager Rating'}
          </button>
        </div>
      )}

      {gc.status === 'manager_approved' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-emerald-700 font-bold text-sm">Manager rating submitted. Appraisal is proceeding to the next stage.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Manager View ────────────────────────────────────────────────────────

export function AppraisalManagerView({ manager }: { manager: any }) {
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [teamCards, setTeamCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any>(null);

  useEffect(() => {
    fetch(`${PERF_API}/cycles/active/`)
      .then(r => r.json())
      .then(data => {
        setCycles(data);
        if (data.length > 0) setSelectedCycle(data[0]);
      })
      .catch(() => {});
  }, []);

  const fetchTeam = () => {
    if (!selectedCycle) return;
    setLoading(true);
    fetch(`${PERF_API}/manager/${manager.employee_id}/team/?cycle_id=${selectedCycle.id}`)
      .then(r => r.json())
      .then(data => {
        // Normalize: backend may return array of members with goal_card embedded
        const cards = Array.isArray(data) ? data : (data.results || data.team || []);
        setTeamCards(cards);
      })
      .catch(() => setTeamCards([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTeam(); }, [selectedCycle, manager.employee_id]);

  if (selectedCard) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 lg:p-6">
        <div className="max-w-[1400px] mx-auto">
          <EmployeeAppraisalDetail
            card={selectedCard}
            manager={manager}
            onBack={() => setSelectedCard(null)}
            onRefresh={() => { fetchTeam(); setSelectedCard(null); }}
          />
        </div>
      </div>
    );
  }

  const submitted  = teamCards.filter(m => (m.goal_card || m)?.status === 'submitted');
  const approved   = teamCards.filter(m => ['manager_approved','hod_approved','hod_rejected','hr_approved','finalized'].includes((m.goal_card || m)?.status));
  const others     = teamCards.filter(m => !['submitted','manager_approved','hod_approved','hod_rejected','hr_approved','finalized'].includes((m.goal_card || m)?.status));

  return (
    <div className="min-h-screen bg-slate-100 p-4 lg:p-6">
      <div className="max-w-[1200px] mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400" />
          <div className="px-6 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-amber-200">
              {manager.name?.[0] || 'M'}
            </div>
            <div className="flex-1">
              <h1 className="text-slate-900 font-extrabold text-lg">{manager.name}</h1>
              <p className="text-amber-600 font-semibold text-sm">{manager.designation} · Manager Review</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
              <span className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Cycle</span>
              {cycles.length === 0
                ? <span className="text-slate-400 text-sm flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> No active cycles</span>
                : cycles.map(c => (
                    <button key={c.id} onClick={() => setSelectedCycle(c)}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-all border ${
                        selectedCycle?.id === c.id
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                      }`}>
                      {c.name}
                    </button>
                  ))
              }
            </div>
          </div>
        </div>

        {/* Stats */}
        {selectedCycle && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Awaiting Review', count: submitted.length,  color: 'bg-blue-50 border-blue-200 text-blue-700',    dot: 'bg-blue-500 animate-pulse' },
              { label: 'Approved',        count: approved.length,   color: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
              { label: 'Not Submitted',   count: others.length,     color: 'bg-slate-50 border-slate-200 text-slate-600',  dot: 'bg-slate-400' },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl border p-4 flex items-center gap-3 ${s.color}`}>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
                <div>
                  <p className="text-2xl font-black">{s.count}</p>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-70">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Employee List */}
        {selectedCycle ? (
          loading ? (
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-16 text-center">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">Loading team appraisals…</p>
            </div>
          ) : teamCards.length === 0 ? (
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-16 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-bold">No team members found for this cycle.</p>
              <p className="text-slate-400 text-sm mt-1">Team members appear here once they start their appraisal.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Submitted (Awaiting Review) first */}
              {[...submitted, ...others, ...approved].map((member, mi) => {
                const gc = member.goal_card || member;
                const status = gc?.status;
                const avatarColors = ['from-blue-500 to-indigo-600', 'from-amber-500 to-orange-600', 'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600', 'from-purple-500 to-violet-600'];
                const avatarGrad = avatarColors[(member.name?.charCodeAt(0) || mi) % avatarColors.length];
                const canReview = status === 'submitted';

                return (
                  <div key={mi}
                    className={`bg-white border rounded-2xl shadow-sm transition-all ${canReview ? 'border-blue-200 hover:border-blue-400 cursor-pointer' : 'border-slate-200 hover:border-slate-300 cursor-pointer'}`}
                    onClick={() => gc && setSelectedCard({ ...member, goal_card: gc, cycle_id: selectedCycle.id })}>
                    <div className="px-5 py-4 flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center font-black text-white text-base shadow-sm shrink-0`}>
                        {member.name?.[0] || <User className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 font-bold text-sm">{member.name}</p>
                        <p className="text-slate-500 text-xs">{member.designation}{member.zone && ` · ${member.zone}`}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={status || 'draft'} />
                        {canReview && (
                          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <Send className="w-3 h-3" /> Give Rating
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-16 text-center">
            <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-bold">Select a cycle above to see team appraisals</p>
          </div>
        )}
      </div>
    </div>
  );
}
