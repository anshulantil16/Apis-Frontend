import { useState, useEffect } from 'react';
import {
  Users, CheckCircle, Clock, ChevronDown, ChevronUp, AlertCircle,
  Target, MessageSquare, BookOpen, Send, ArrowLeft, FileText, Download,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PERF_API = `${API_BASE}/api/appraisal`;

const SELF_REVIEW_QUESTIONS = [
  'What do you consider to be your most important achievement of FY 25-26?',
  'Where did you experience difficulties or constraints which affected your performance in FY 25-26?',
  'List the training programs attended in FY 25-26.',
];

// ─── Score calc (read-only display) ──────────────────────────────────────────

function calcScoreAchievement(kpi: any): number | null {
  const plan   = parseFloat(kpi.target_value);
  const actual = parseFloat(kpi.actual_achievement);
  if (isNaN(plan) || isNaN(actual) || plan === 0) return null;
  const dir = (kpi.parameter_type || '').toLowerCase();
  if (dir.includes('higher')) return (actual / plan) * 100;
  if (dir.includes('lower'))  return actual === 0 ? null : (plan / actual) * 100;
  if (dir.includes('target')) return Math.max(0, (actual / plan) * 100);
  return null;
}

function calcWeightageSystem(kpi: any): number | null {
  const score = calcScoreAchievement(kpi);
  const wt    = parseFloat(kpi.weightage);
  if (score === null || isNaN(wt) || wt === 0) return null;
  return parseFloat(((score / 100) * wt).toFixed(2));
}

function CalcCell({ value, accent = 'amber' }: { value: number | null; accent?: 'amber' | 'blue' }) {
  if (value === null) return <span className="text-slate-300 text-xs block text-center">—</span>;
  const cls = accent === 'blue'
    ? 'text-blue-700 bg-blue-50 border-blue-200'
    : 'text-amber-700 bg-amber-50 border-amber-200';
  return (
    <span className={`block w-full text-center text-[11px] font-black rounded-lg px-1 py-1.5 border ${cls}`}>
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
  draft:            { badge: 'bg-slate-100 text-slate-600 border-slate-200',           dot: 'bg-slate-400',                label: 'Draft' },
  submitted:        { badge: 'bg-blue-50 text-blue-700 border-blue-200',               dot: 'bg-blue-500 animate-pulse',   label: 'Awaiting Manager' },
  manager_approved: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',      dot: 'bg-emerald-500 animate-pulse', label: 'Awaiting HOD Review' },
  manager_rejected: { badge: 'bg-rose-50 text-rose-700 border-rose-200',               dot: 'bg-rose-500',                 label: 'Manager Rejected' },
  hod_approved:     { badge: 'bg-violet-50 text-violet-700 border-violet-200',         dot: 'bg-violet-500',               label: 'HOD Approved' },
  hod_rejected:     { badge: 'bg-orange-50 text-orange-700 border-orange-200',         dot: 'bg-orange-500',               label: 'HOD Rejected' },
  hr_approved:      { badge: 'bg-purple-50 text-purple-700 border-purple-200',         dot: 'bg-purple-500',               label: 'HR Approved' },
  finalized:        { badge: 'bg-amber-50 text-amber-700 border-amber-200',            dot: 'bg-amber-500',                label: 'Finalized' },
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

function EmployeeAppraisalDetail({ card, hod, onBack, onRefresh }: {
  card: any; hod: any; onBack: () => void; onRefresh: () => void;
}) {
  const gc = card.goal_card || card;
  const goals: any[] = gc.goals || [];
  const selfAnswers: string[] = gc.self_review_answers || [];
  const keySkills: string[] = gc.key_skills || [];
  const trainingPrograms: string = gc.training_programs || '';

  // HOD per-KPI scores
  const buildInitialHODScores = () => {
    const s: Record<string, string> = {};
    goals.forEach((g: any, gi: number) => {
      (g.kpis || []).forEach((k: any, ki: number) => {
        s[`${gi}_${ki}`] = k.hod_score != null ? String(k.hod_score) : '';
      });
    });
    return s;
  };
  const [hodScores, setHodScores] = useState<Record<string, string>>(buildInitialHODScores);
  const setHodScore = (gi: number, ki: number, val: string) =>
    setHodScores(prev => ({ ...prev, [`${gi}_${ki}`]: val }));

  const [hodManagerSkills, setHodManagerSkills] = useState<string[]>(
    gc.manager_suggested_skills?.length ? gc.manager_suggested_skills : ['']
  );
  const [hodSpecialAch, setHodSpecialAch] = useState(gc.hod_special_achievements || '');
  const [hodPromoted, setHodPromoted] = useState<'Yes' | 'No' | ''>(gc.hod_promoted || '');
  const [hodPromotedJust, setHodPromotedJust] = useState(gc.hod_promoted_justification || '');
  const [hodSalary, setHodSalary] = useState(gc.hod_salary_correction || '');
  const [hodCompetencyRatings, setHodCompetencyRatings] = useState<Record<string, string>>(gc.hod_competency_ratings || {});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const totalHODScore = goals.reduce((s: number, g: any, gi: number) =>
    s + (g.kpis || []).reduce((ks: number, _: any, ki: number) =>
      ks + Number(hodScores[`${gi}_${ki}`] || 0), 0), 0);
  const allHODScoresFilled = goals.every((g: any, gi: number) =>
    (g.kpis || []).every((_: any, ki: number) => {
      const v = hodScores[`${gi}_${ki}`];
      return v !== '' && v !== null && v !== undefined;
    }));

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const submitHODReview = async () => {
    if (!allHODScoresFilled) {
      showMsg('Please fill Wt% (HOD) for all KPIs before submitting.', false);
      return;
    }
    const COMP_KEYS = ['1', '2', '3', '4', '5', '6', '7'];
    const missingComp = COMP_KEYS.some(k => !hodCompetencyRatings[k]);
    if (missingComp) {
      showMsg('Please rate all 7 competencies before submitting.', false);
      return;
    }
    if (!hodPromotedJust.trim()) {
      showMsg('Promotion justification is mandatory. Please fill it in.', false);
      return;
    }
    setSaving(true);
    try {
      // Save per-KPI HOD scores first
      const kpiScores: any[] = [];
      goals.forEach((g: any, gi: number) => {
        (g.kpis || []).forEach((k: any, ki: number) => {
          if (k.id) {
            const v = hodScores[`${gi}_${ki}`];
            kpiScores.push({ kpi_id: k.id, hod_score: v !== '' ? parseFloat(v) : null });
          }
        });
      });
      await fetch(`${PERF_API}/goal-cards/${gc.id}/hod-kpi-scores/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpi_scores: kpiScores }),
      });

      const res = await fetch(`${PERF_API}/goal-cards/${gc.id}/hod-review/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hod_name: hod.name,
          manager_suggested_skills: hodManagerSkills.filter(s => s.trim()),
          hod_special_achievements: hodSpecialAch,
          hod_promoted: hodPromoted,
          hod_promoted_justification: hodPromotedJust,
          hod_salary_correction: hodSalary,
          hod_competency_ratings: hodCompetencyRatings,
        }),
      });
      if (res.ok) {
        showMsg('HOD review submitted successfully!', true);
        setTimeout(() => onRefresh(), 1500);
      } else {
        const err = await res.json();
        showMsg(err.error || 'Failed to submit HOD review.', false);
      }
    } catch { showMsg('Error submitting. Try again.', false); }
    finally { setSaving(false); }
  };

  const emp = card;

  return (
    <div className="space-y-4">

      {/* Back + Employee Profile */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-violet-400" />
        <div className="px-5 py-4 flex items-center gap-4">
          <button onClick={onBack}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-violet-200 shrink-0">
            {emp.name?.[0] || 'E'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-extrabold text-slate-900">{emp.name}</h2>
            <p className="text-violet-600 text-sm font-semibold">{emp.designation}</p>
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

      {/* ── Section 1: Goals & KPI Table (fully read-only for HOD) ── */}
      <SectionCard title="Goals & KPI Setting (Employee Submission)" icon={Target} color="bg-blue-50 text-blue-700">
        {goals.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">No goals submitted.</p>
        ) : (
          <div className="space-y-5">
            {goals.map((g: any, gi: number) => (
              <div key={gi} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${CATEGORY_DOT[g.category] || 'bg-slate-400'}`} />
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">{g.category}</span>
                  <span className="mx-1 text-slate-300">·</span>
                  <span className="text-sm font-bold text-slate-800">{g.title || <span className="italic text-slate-400">No KRA title</span>}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[1200px]">
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
                        <th className="px-3 py-2.5 text-left text-[9px] font-black text-slate-500 uppercase tracking-wider w-[9%] bg-slate-100 border-l-2 border-slate-300">Actual (EMP)</th>
                        <th className="px-3 py-2.5 text-center text-[9px] font-black text-amber-700 uppercase tracking-wider w-[7%] bg-amber-50 border-l border-amber-200">Score Ach%</th>
                        <th className="px-3 py-2.5 text-center text-[9px] font-black text-amber-700 uppercase tracking-wider w-[7%] bg-amber-50">Wt% (System)</th>
                        <th className="px-3 py-2.5 text-center text-[9px] font-black text-blue-700 uppercase tracking-wider w-[7%] bg-blue-50 border-l-2 border-blue-200">Wt% (Mgr)</th>
                        <th className="px-3 py-2.5 text-center text-[9px] font-black text-violet-700 uppercase tracking-wider w-[7%] bg-violet-50 border-l-2 border-violet-200">Wt% (HOD) *</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(g.kpis || []).map((kpi: any, ki: number) => {
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
                            <td className="px-3 py-2.5 text-slate-700 font-semibold bg-slate-50 border-l-2 border-slate-200">
                              {kpi.actual_achievement || <span className="text-slate-300 italic text-[11px]">Not filled</span>}
                            </td>
                            <td className="px-2 py-2 bg-amber-50/60 border-l border-amber-100"><CalcCell value={scoreAch} /></td>
                            <td className="px-2 py-2 bg-amber-50/60"><CalcCell value={wtSys} /></td>
                            <td className="px-2 py-2 bg-blue-50/60 border-l-2 border-blue-100">
                              <CalcCell value={kpi.manager_score !== null && kpi.manager_score !== undefined ? parseFloat(kpi.manager_score) : null} accent="blue" />
                            </td>
                            {/* HOD editable score */}
                            <td className="px-2 py-2 bg-violet-50/60 border-l-2 border-violet-100">
                              {gc.status === 'manager_approved' ? (
                                <input
                                  type="number"
                                  value={hodScores[`${gi}_${ki}`] || ''}
                                  onChange={e => setHodScore(gi, ki, e.target.value)}
                                  placeholder="%"
                                  className={`w-full bg-white border rounded-lg px-2 py-1.5 text-slate-800 text-xs font-bold text-center focus:outline-none focus:ring-1 placeholder-slate-300 transition-all ${hodScores[`${gi}_${ki}`] === '' || hodScores[`${gi}_${ki}`] === undefined ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-violet-300 focus:border-violet-400 focus:ring-violet-100'}`}
                                />
                              ) : (
                                <CalcCell value={kpi.hod_score != null ? parseFloat(kpi.hod_score) : null} accent="blue" />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          {/* HOD total score */}
          {gc.status === 'manager_approved' && goals.length > 0 && (
            <div className="flex items-center justify-end gap-4 px-2 mt-2">
              {!allHODScoresFilled && (
                <span className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                  Fill Wt% (HOD) for all KPIs
                </span>
              )}
              <span className="text-sm text-slate-500">Total Wt% (HOD):</span>
              <span className={`text-base font-black ${totalHODScore === 100 ? 'text-emerald-600' : totalHODScore > 100 ? 'text-rose-600' : 'text-violet-600'}`}>
                {totalHODScore}% {totalHODScore === 100 ? '✓' : ''}
              </span>
            </div>
          )}
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

      {/* ── Section 4: Supporting Documents ── */}
      {gc.support_documents && gc.support_documents.length > 0 && (
        <SectionCard title={`Supporting Documents (${gc.support_documents.length})`} icon={FileText} color="bg-purple-50 text-purple-700">
          <div className="space-y-3">
            {gc.support_documents.map((doc: any, idx: number) => (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0 text-purple-600 font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{doc.file_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Uploaded by employee</p>
                  </div>
                </div>
                <a href={doc.document_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm whitespace-nowrap">
                  <Download className="w-3.5 h-3.5" />
                  View
                </a>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Manager Remarks (read-only for HOD) ── */}
      {(gc.manager_special_achievements || gc.manager_promoted || gc.manager_salary_correction) && (
        <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2.5">
            <span className="text-amber-600 font-black text-sm">📋</span>
            <span className="font-bold text-sm text-amber-800">Manager Remarks</span>
            <span className="ml-auto text-[10px] font-bold text-amber-500 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Read Only</span>
          </div>
          <div className="p-5 space-y-4">
            {gc.manager_special_achievements && (
              <ReadonlyField label="Special Achievements (mention in Rs & in Lacs)" value={gc.manager_special_achievements} />
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gc.manager_promoted && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Promoted</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${gc.manager_promoted === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {gc.manager_promoted}
                  </span>
                  {gc.manager_promoted_justification && (
                    <p className="text-slate-600 text-sm mt-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">{gc.manager_promoted_justification}</p>
                  )}
                </div>
              )}
              {gc.manager_salary_correction && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Salary / Market Correction</p>
                  <p className="text-slate-800 text-sm bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">{gc.manager_salary_correction}</p>
                  {gc.manager_salary_justification && (
                    <p className="text-slate-600 text-sm mt-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">{gc.manager_salary_justification}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HOD Remarks (editable when status is manager_approved) ── */}
      {gc.status === 'manager_approved' && (
        <div className="bg-white border border-violet-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-violet-50 border-b border-violet-200 flex items-center gap-2.5">
            <span className="text-violet-600 font-black text-sm">📝</span>
            <span className="font-bold text-sm text-violet-800">HOD Remarks</span>
            <span className="ml-auto text-[10px] font-bold text-violet-500 bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Fill before submitting</span>
          </div>
          <div className="p-5 space-y-5">

            {/* Manager-Suggested Skills (editable by HOD too) */}
            <div>
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1">
                Training / Skill Recommendations
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Employee's filled skills shown below. Add or update skill recommendations.
              </p>
              {keySkills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {keySkills.map((s, i) => s.trim() && (
                    <span key={i} className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600">{s}</span>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                {hodManagerSkills.map((skill, si) => (
                  <div key={si} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-violet-50 border border-violet-200 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-black text-violet-500">{si + 1}</span>
                    </div>
                    <input
                      type="text"
                      value={skill}
                      onChange={e => {
                        const updated = [...hodManagerSkills];
                        updated[si] = e.target.value;
                        setHodManagerSkills(updated);
                      }}
                      placeholder={`Additional recommendation ${si + 1}…`}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm font-medium focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder-slate-300 transition-all"
                    />
                    {hodManagerSkills.length > 1 && (
                      <button onClick={() => setHodManagerSkills(hodManagerSkills.filter((_, j) => j !== si))}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all text-sm">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => setHodManagerSkills([...hodManagerSkills, ''])}
                className="mt-2 flex items-center gap-1.5 text-violet-600 hover:text-violet-800 text-xs font-bold transition-all">
                <span className="w-5 h-5 rounded-md bg-violet-100 border border-violet-200 flex items-center justify-center text-base leading-none">+</span>
                Add recommendation
              </button>
            </div>

            {/* Special Achievements */}
            <div>
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1.5">
                Special Achievements
                <span className="ml-1 text-slate-400 normal-case font-medium">(measurable and quantifiable task performed by the appraisee)</span>
              </label>
              <textarea
                rows={3}
                value={hodSpecialAch}
                onChange={e => setHodSpecialAch(e.target.value)}
                placeholder="e.g. Achieved Rs. 12 Lacs additional revenue from new client acquisition…"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm font-medium focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder-slate-300 resize-none transition-all leading-relaxed"
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
                    <button key={opt} onClick={() => setHodPromoted(opt)}
                      className={`flex-1 py-2.5 rounded-xl border font-bold text-sm transition-all ${
                        hodPromoted === opt
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
                  value={hodPromotedJust}
                  onChange={e => setHodPromotedJust(e.target.value)}
                  placeholder="Justify the promotion decision…"
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 placeholder-slate-300 resize-none transition-all leading-relaxed ${
                    !hodPromotedJust.trim() ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100'
                  }`}
                />
              </div>
            </div>

            {/* Salary / Market Correction */}
            <div>
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-0.5">
                Salary / Market Correction
              </label>
              <p className="text-[11px] text-slate-400 mb-2">Recommendation, if any</p>
              <textarea
                rows={3}
                value={hodSalary}
                onChange={e => setHodSalary(e.target.value)}
                placeholder="e.g. 10% increment recommended based on market benchmarking and performance rating…"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm font-medium focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder-slate-300 resize-none transition-all leading-relaxed"
              />
            </div>

          </div>
        </div>
      )}

      {/* ── HOD Remarks read-only once submitted ── */}
      {gc.status === 'hod_approved' && (gc.hod_special_achievements || gc.hod_promoted) && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
            <span className="font-bold text-sm text-slate-700">📝 HOD Remarks (Submitted)</span>
          </div>
          <div className="p-5 space-y-4">
            {gc.hod_special_achievements && <ReadonlyField label="Special Achievements" value={gc.hod_special_achievements} />}
            <div className="grid grid-cols-2 gap-4">
              {gc.hod_promoted && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Promoted</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${gc.hod_promoted === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {gc.hod_promoted}
                  </span>
                  {gc.hod_promoted_justification && <p className="text-slate-600 text-sm mt-1">{gc.hod_promoted_justification}</p>}
                </div>
              )}
              {gc.hod_salary_correction && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Salary/Market Correction</p>
                  <p className="text-slate-800 text-sm">{gc.hod_salary_correction}</p>
                  {gc.hod_salary_justification && <p className="text-slate-600 text-sm mt-1">{gc.hod_salary_justification}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HOD Competencies Assessment ── */}
      {gc.status === 'manager_approved' && (() => {
        const COMPETENCIES = [
          { key: '1', label: 'STRATEGIC BUSINESS ORIENTATION',           desc: 'The courage to think beyond… Ability of an individual to create breakthrough business impact.' },
          { key: '2', label: 'LEADERSHIP THROUGH SUSTAINABILITY',         desc: 'Focus on triple bottom line (People, profit and planet). Ability to leverage the forces of economic growth and viability in order to apply them to the business environment.' },
          { key: '3', label: 'BUSINESS FOCUS / CUSTOMER SATISFACTION',   desc: 'Business at the core… Co-creates and continuously enhances value for customers in order to create business continuity.' },
          { key: '4', label: 'INNOVATION LED TRANSFORMATION',            desc: 'Using a "whole brain" approach… Ability of an individual to use new paradigms to create sustained and exponential growth.' },
          { key: '5', label: 'RESULT ORIENTATION WITH EXECUTION EXCELLENCE', desc: 'First time right, every time. Delivers results with sustained commitment to quality and on-time performance, leading to the next level of stakeholder delight.' },
          { key: '6', label: 'LEVERAGING HUMAN CAPITAL',                 desc: 'Transforming potential to performance… Builds on capabilities, capacities and diversity of people to create a multiplier effect.' },
          { key: '7', label: 'WEAVING PASSION AND ENERGY AT WORK',       desc: 'Joy of work… The ability to transform the work environment by blending passion & fun at work, creating synergy towards employer branding & sustainability goals achievement.' },
        ];
        const OPTS = ['Always', 'Most Often', 'Sometimes', 'Seldom', 'Never'];
        return (
          <div className="bg-white border border-violet-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="bg-violet-50 border-b border-violet-200 px-5 py-3.5">
              <p className="font-bold text-violet-800 text-sm">Competencies Assessment by HOD</p>
              <p className="text-violet-600 text-[11px] mt-0.5">Please rate the employee on the following competencies</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[680px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-2.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-wider w-8">#</th>
                    <th className="px-3 py-2.5 text-left text-[9px] font-black text-slate-500 uppercase tracking-wider">Competency</th>
                    {OPTS.map(o => (
                      <th key={o} className="px-2 py-2.5 text-center text-[9px] font-black text-slate-500 uppercase tracking-wider w-20">{o}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPETENCIES.map(({ key, label, desc }, idx) => (
                    <tr key={key} className={`border-b border-slate-100 ${idx % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <td className="px-3 py-3 text-slate-400 font-bold text-center">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <p className="font-bold text-slate-800 text-[11px]">{label}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5 leading-relaxed">{desc}</p>
                      </td>
                      {OPTS.map(o => (
                        <td key={o} className="px-2 py-3 text-center">
                          <input
                            type="radio"
                            name={`hod_comp_${key}`}
                            checked={hodCompetencyRatings[key] === o}
                            onChange={() => setHodCompetencyRatings(prev => ({ ...prev, [key]: o }))}
                            className="w-4 h-4 accent-violet-600 cursor-pointer"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── Submit HOD Review ── */}
      {gc.status === 'manager_approved' && (
        <div className="bg-white border border-violet-200 shadow-sm rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
              <Send className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-slate-900 font-bold text-sm">Submit HOD Review</p>
              <p className="text-slate-400 text-xs mt-0.5">Fill the HOD Remarks section above, then submit to proceed to HR.</p>
            </div>
          </div>

          {msg && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
              {msg.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {msg.text}
            </div>
          )}

          <button onClick={submitHODReview} disabled={saving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-md shadow-violet-200 active:scale-[0.98]">
            <Send className="w-4 h-4" />
            {saving ? 'Submitting…' : 'Submit HOD Review'}
          </button>
        </div>
      )}

      {gc.status === 'hod_approved' && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-violet-600 shrink-0" />
          <p className="text-violet-700 font-bold text-sm">HOD review submitted. Appraisal is proceeding to HR for final review.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main HOD View ────────────────────────────────────────────────────────────

export function AppraisalHODView({ hod }: { hod: any }) {
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
    fetch(`${PERF_API}/hod/${hod.employee_id}/team/?cycle_id=${selectedCycle.id}`)
      .then(r => r.json())
      .then(data => {
        const cards = Array.isArray(data) ? data : (data.results || data.team || []);
        setTeamCards(cards);
      })
      .catch(() => setTeamCards([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTeam(); }, [selectedCycle, hod.employee_id]);

  if (selectedCard) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 lg:p-6">
        <div className="max-w-[1400px] mx-auto">
          <EmployeeAppraisalDetail
            card={selectedCard}
            hod={hod}
            onBack={() => setSelectedCard(null)}
            onRefresh={() => { fetchTeam(); setSelectedCard(null); }}
          />
        </div>
      </div>
    );
  }

  const pending   = teamCards.filter(m => (m.goal_card || m)?.status === 'manager_approved');
  const reviewed  = teamCards.filter(m => ['hod_approved', 'hr_approved', 'finalized'].includes((m.goal_card || m)?.status));
  const others    = teamCards.filter(m => !['manager_approved', 'hod_approved', 'hr_approved', 'finalized'].includes((m.goal_card || m)?.status));

  const renderCard = (member: any) => {
    const gc = member.goal_card;
    const st = gc?.status || 'none';
    return (
      <div key={member.employee_id}
        onClick={() => gc ? setSelectedCard(member) : undefined}
        className={`bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm transition-all ${gc ? 'hover:border-violet-300 hover:shadow-md cursor-pointer' : 'opacity-60'}`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-black shrink-0">
          {member.name?.[0] || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm truncate">{member.name}</p>
          <p className="text-violet-600 text-xs font-medium truncate">{member.designation}</p>
          {member.zone && <p className="text-slate-400 text-[11px] mt-0.5">📍 {member.zone}</p>}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          {gc
            ? <StatusBadge status={st} />
            : <span className="text-slate-400 text-xs font-medium">No submission</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 lg:p-6">
      <div className="max-w-[1200px] mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-violet-400" />
          <div className="px-6 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-violet-200">
              {hod.name?.[0] || 'H'}
            </div>
            <div className="flex-1">
              <h1 className="text-slate-900 font-extrabold text-lg">{hod.name}</h1>
              <p className="text-violet-600 font-semibold text-sm">{hod.designation} · HOD Review</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
              <span className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Cycle</span>
              {cycles.length === 0
                ? <span className="text-slate-400 text-sm flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> No active cycles</span>
                : cycles.map(c => (
                    <button key={c.id} onClick={() => setSelectedCycle(c)}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-all border ${
                        selectedCycle?.id === c.id
                          ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600'
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
              { label: 'Pending HOD Review', count: pending.length,  color: 'bg-violet-50 border-violet-200 text-violet-700',   dot: 'bg-violet-500 animate-pulse' },
              { label: 'HOD Approved',       count: reviewed.length, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
              { label: 'Not Ready',          count: others.length,   color: 'bg-slate-50 border-slate-200 text-slate-600',       dot: 'bg-slate-400' },
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
              <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">Loading team appraisals…</p>
            </div>
          ) : teamCards.length === 0 ? (
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-16 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold text-sm">No team members found.</p>
              <p className="text-slate-400 text-xs mt-1">Ensure employees have their HOD ID set to <span className="font-mono font-bold">{hod.employee_id}</span> in the employee master sheet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.length > 0 && (
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    Pending HOD Review ({pending.length})
                  </p>
                  <div className="space-y-2">{pending.map(renderCard)}</div>
                </div>
              )}
              {reviewed.length > 0 && (
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    HOD Approved ({reviewed.length})
                  </p>
                  <div className="space-y-2">{reviewed.map(renderCard)}</div>
                </div>
              )}
              {others.length > 0 && (
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    Not Yet at HOD Stage ({others.length})
                  </p>
                  <div className="space-y-2">{others.map(renderCard)}</div>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-12 text-center">
            <p className="text-slate-400 text-sm font-medium">No active appraisal cycle found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
