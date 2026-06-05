import { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown, ChevronUp, CheckCircle2, XCircle,
  Loader2, AlertCircle, Users, Clock, CheckCircle, Award,
} from 'lucide-react';
import { EOM_API } from '../../../Pages/EOMPage';

// ─── Constants ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['','January','February','March','April','May','June',
  'July','August','September','October','November','December'];

const DIMS = [
  { key: 'dim1', label: 'Business Impact & Measurable Outcome',                                                                   max: 50 },
  { key: 'dim2', label: 'APIS Values, Survey Participation, Compliance & Conduct, Fun Club Activities Participation',             max: 20 },
  { key: 'dim3', label: 'Initiative & Entrepreneurial Problem-Solving',                                                           max: 10 },
  { key: 'dim4', label: 'Efficiency, Cost & Resource Optimisation',                                                               max: 10 },
] as const;

const SMART_META = [
  { key: 'smart_specific',   letter: 'S', label: 'Specific'   },
  { key: 'smart_measurable', letter: 'M', label: 'Measurable' },
  { key: 'smart_achievable', letter: 'A', label: 'Achievable' },
  { key: 'smart_relevant',   letter: 'R', label: 'Relevant'   },
  { key: 'smart_timebound',  letter: 'T', label: 'Time-Bound' },
] as const;

const STATUS_BADGE: Record<string, string> = {
  draft:            'bg-slate-100 text-slate-500 border-slate-200',
  submitted:        'bg-blue-50 text-blue-700 border-blue-200',
  manager_approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  manager_rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  hod_approved:     'bg-violet-50 text-violet-700 border-violet-200',
  hod_rejected:     'bg-orange-50 text-orange-700 border-orange-200',
  hr_finalized:     'bg-amber-50 text-amber-700 border-amber-200',
};

// ─── Score state type ──────────────────────────────────────────────────────────

interface ScoreState {
  dim1_score: string; dim1_comments: string;
  dim2_score: string; dim2_comments: string;
  dim3_score: string; dim3_comments: string;
  dim4_score: string; dim4_comments: string;
  sustainability_desc: string;
  sustainability_bonus: string;
  sustainability_just: string;
  recommendation: string;   // 'recommend' | 'not_recommend'
  panel_name: string;
}

function initScore(nom: any): ScoreState {
  return {
    dim1_score:          nom?.manager_dim1_score  != null ? String(nom.manager_dim1_score)  : '',
    dim1_comments:       nom?.manager_dim1_comments  || '',
    dim2_score:          nom?.manager_dim2_score  != null ? String(nom.manager_dim2_score)  : '',
    dim2_comments:       nom?.manager_dim2_comments  || '',
    dim3_score:          nom?.manager_dim3_score  != null ? String(nom.manager_dim3_score)  : '',
    dim3_comments:       nom?.manager_dim3_comments  || '',
    dim4_score:          nom?.manager_dim4_score  != null ? String(nom.manager_dim4_score)  : '',
    dim4_comments:       nom?.manager_dim4_comments  || '',
    sustainability_desc:  nom?.manager_sustainability_desc  || '',
    sustainability_bonus: nom?.manager_sustainability_bonus != null ? String(nom.manager_sustainability_bonus) : '',
    sustainability_just:  nom?.manager_sustainability_just  || '',
    recommendation:       nom?.manager_recommendation  || '',
    panel_name:           nom?.manager_panel_name  || '',
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function totalScore(s: ScoreState): number {
  return (Number(s.dim1_score) || 0) + (Number(s.dim2_score) || 0) +
         (Number(s.dim3_score) || 0) + (Number(s.dim4_score) || 0);
}

function Section({ title }: { title: string }) {
  return <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">{title}</p>;
}

// ─── Nomination card ───────────────────────────────────────────────────────────

function NominationCard({ entry, manager, cycle, onUpdate }: {
  entry: any; manager: any; cycle: any; onUpdate: (nom: any) => void;
}) {
  const nom  = entry.nomination;
  const [open,     setOpen]     = useState(false);
  const [scores,   setScores]   = useState<ScoreState>(() => initScore(nom));
  const [saving,   setSaving]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg,      setMsg]      = useState<{ text: string; ok: boolean } | null>(null);

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const setScore = (k: keyof ScoreState, v: string) =>
    setScores(p => ({ ...p, [k]: v }));

  const buildPayload = useCallback((action?: string) => {
    const p: Record<string, any> = {
      manager_dim1_score:           scores.dim1_score   !== '' ? Number(scores.dim1_score)   : null,
      manager_dim1_comments:        scores.dim1_comments,
      manager_dim2_score:           scores.dim2_score   !== '' ? Number(scores.dim2_score)   : null,
      manager_dim2_comments:        scores.dim2_comments,
      manager_dim3_score:           scores.dim3_score   !== '' ? Number(scores.dim3_score)   : null,
      manager_dim3_comments:        scores.dim3_comments,
      manager_dim4_score:           scores.dim4_score   !== '' ? Number(scores.dim4_score)   : null,
      manager_dim4_comments:        scores.dim4_comments,
      manager_sustainability_desc:  scores.sustainability_desc,
      manager_sustainability_bonus: scores.sustainability_bonus !== '' ? Number(scores.sustainability_bonus) : null,
      manager_sustainability_just:  scores.sustainability_just,
      manager_recommendation:       scores.recommendation,
      manager_panel_name:           scores.panel_name,
    };
    if (action) p.action = action;
    return p;
  }, [scores]);

  const validate = () => {
    const filled = DIMS.every(d => scores[`${d.key}_score` as keyof ScoreState] !== '');
    if (!filled) return 'Please fill all 4 dimension scores.';
    const t = totalScore(scores);
    if (t > 100) return `Total score ${t} exceeds 100.`;
    if (!scores.recommendation) return 'Please select a recommendation.';
    if (!scores.panel_name.trim()) return 'Please enter your name as Panel Member.';
    return null;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`${EOM_API}/nominations/${nom.id}/manager-review/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed.');
      onUpdate(data);
      showMsg('Draft saved.', true);
    } catch (e: any) { showMsg(e.message, false); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { showMsg(err, false); return; }
    const action = scores.recommendation === 'recommend' ? 'approved' : 'rejected';
    setSubmitting(true);
    try {
      const res  = await fetch(`${EOM_API}/nominations/${nom.id}/manager-review/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(action)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed.');
      onUpdate(data);
      showMsg(action === 'approved' ? 'Nomination endorsed!' : 'Nomination not recommended.', true);
      setOpen(false);
    } catch (e: any) { showMsg(e.message, false); }
    finally { setSubmitting(false); }
  };

  const isReviewed = nom?.status && !['submitted'].includes(nom.status);
  const canReview  = nom?.status === 'submitted';
  const ts = totalScore(scores);

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      {/* Row header */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-all"
        onClick={() => setOpen(o => !o)}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 flex items-center justify-center font-black text-amber-700 text-sm shrink-0">
          {entry.name?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-900 font-bold text-sm">
            {entry.name}
            <span className="text-slate-400 text-xs font-normal ml-2">#{entry.employee_id}</span>
          </p>
          <p className="text-slate-500 text-xs mt-0.5">{entry.designation} · {entry.department}</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {nom ? (
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_BADGE[nom.status] || STATUS_BADGE.draft}`}>
              {nom.status.replace(/_/g, ' ')}
            </span>
          ) : (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-slate-100 text-slate-400 border-slate-200">
              Not Submitted
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div className={`mx-5 mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
          ${msg.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {open && nom && (
        <div className="border-t border-slate-100 px-5 py-5 space-y-6">

          {/* ── Employee form review ── */}
          <div>
            <Section title="Nominee Details" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {[
                ['Name',        entry.name],
                ['Employee ID', nom.employee_id_str],
                ['Designation', nom.employee_designation],
                ['Department',  nom.employee_department],
                ['Zone',        nom.employee_zone],
                ['Track',       nom.track?.replace('_', '-') || '—'],
                ['Cycle',       cycle?.name],
                ['Submitted',   nom.submitted_at ? new Date(nom.submitted_at).toLocaleDateString('en-IN') : '—'],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{l}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{v || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Part A */}
          {nom.part_a_achievement && (
            <div>
              <Section title="Part A — Achievement Summary" />
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {nom.part_a_achievement}
              </div>
            </div>
          )}

          {/* Part B SMART */}
          {SMART_META.some(m => nom[m.key]) && (
            <div>
              <Section title="Part B — SMART Evidence" />
              <div className="space-y-2">
                {SMART_META.map(m => nom[m.key] ? (
                  <div key={m.key} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                      <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
                        <span className="text-white font-black text-[11px]">{m.letter}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700">{m.label}</span>
                    </div>
                    <p className="px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{nom[m.key]}</p>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          {/* Part C */}
          {(nom.evidence_1_description || nom.evidence_2_description) && (
            <div>
              <Section title="Part C — Supporting Evidence" />
              <div className="space-y-2">
                {[
                  { desc: nom.evidence_1_description, source: nom.evidence_1_source, n: 1 },
                  { desc: nom.evidence_2_description, source: nom.evidence_2_source, n: 2 },
                ].filter(e => e.desc).map(e => (
                  <div key={e.n} className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">{e.n}</span>
                    <div>
                      <p className="text-sm text-slate-700">{e.desc}</p>
                      {e.source && <p className="text-[11px] text-slate-400 mt-1">Source: {e.source}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Scorecard ── */}
          <div>
            <Section title="Annexure B — Panel Evaluation Scorecard (HR-EOM-PS-01)" />

            {/* Scoring table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
              <div className="grid grid-cols-[auto_1fr_auto_28%_28%] bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="px-3 py-2.5">#</div>
                <div className="px-3 py-2.5">Evaluation Dimension</div>
                <div className="px-3 py-2.5 text-center">Max</div>
                <div className="px-3 py-2.5 text-center">Score</div>
                <div className="px-3 py-2.5">Comments</div>
              </div>

              {DIMS.map((d, i) => {
                const scoreKey   = `${d.key}_score`   as keyof ScoreState;
                const commentKey = `${d.key}_comments` as keyof ScoreState;
                const scoreVal   = scores[scoreKey];
                const over       = scoreVal !== '' && Number(scoreVal) > d.max;
                return (
                  <div key={d.key} className={`grid grid-cols-[auto_1fr_auto_28%_28%] border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <div className="px-3 py-3 text-sm font-black text-slate-400 flex items-start pt-3.5">{i + 1}</div>
                    <div className="px-3 py-3 text-sm text-slate-700 font-medium leading-snug">{d.label}</div>
                    <div className="px-3 py-3 text-sm font-black text-slate-600 text-center flex items-start pt-3.5">{d.max}</div>
                    <div className="px-3 py-2 flex items-start pt-3">
                      <input
                        type="number" min={0} max={d.max}
                        value={scoreVal}
                        onChange={e => setScore(scoreKey, e.target.value)}
                        disabled={isReviewed}
                        placeholder="0"
                        className={`w-full h-9 rounded-lg border px-3 text-sm font-bold text-center focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 transition-all
                          ${over
                            ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-300'
                            : 'border-slate-200 focus:ring-amber-300 focus:border-amber-400'}`}
                      />
                      {over && <span className="text-rose-500 text-[10px] font-bold ml-1 mt-2.5">max {d.max}</span>}
                    </div>
                    <div className="px-3 py-2 flex items-start pt-3">
                      <textarea
                        rows={2}
                        value={scores[commentKey]}
                        onChange={e => setScore(commentKey, e.target.value)}
                        disabled={isReviewed}
                        placeholder="Comments..."
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none disabled:bg-slate-50 disabled:text-slate-500"
                      />
                    </div>
                  </div>
                );
              })}

              {/* Total row */}
              <div className="grid grid-cols-[auto_1fr_auto_28%_28%] bg-amber-50 border-t-2 border-amber-200">
                <div className="px-3 py-3" />
                <div className="px-3 py-3 text-sm font-black text-slate-700">TOTAL SCORE</div>
                <div className="px-3 py-3 text-sm font-black text-slate-700 text-center">100</div>
                <div className="px-3 py-3 text-center">
                  <span className={`text-xl font-black ${ts > 100 ? 'text-rose-600' : ts >= 80 ? 'text-emerald-600' : ts >= 60 ? 'text-amber-600' : 'text-slate-600'}`}>
                    {ts}
                  </span>
                  {ts > 100 && <p className="text-[10px] text-rose-500 font-bold">Exceeds 100!</p>}
                </div>
                <div className="px-3 py-3" />
              </div>
            </div>

            {/* Sustainability bonus */}
            <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sustainability Bonus (if applicable)</p>
              </div>
              <div className="grid grid-cols-3 gap-4 px-4 py-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">ESG / Sustainability / CSR Contribution</p>
                  <textarea rows={3} value={scores.sustainability_desc}
                    onChange={e => setScore('sustainability_desc', e.target.value)}
                    disabled={isReviewed}
                    placeholder="Describe contribution..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none disabled:bg-slate-50" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Bonus (0 or 5)</p>
                  <div className="flex gap-3 mt-1">
                    {['0', '5'].map(v => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name={`bonus_${nom.id}`} value={v}
                          checked={scores.sustainability_bonus === v}
                          onChange={() => setScore('sustainability_bonus', v)}
                          disabled={isReviewed}
                          className="accent-amber-500 w-4 h-4" />
                        <span className="text-sm font-bold text-slate-700">{v}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Justification</p>
                  <textarea rows={3} value={scores.sustainability_just}
                    onChange={e => setScore('sustainability_just', e.target.value)}
                    disabled={isReviewed}
                    placeholder="Justification..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none disabled:bg-slate-50" />
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="rounded-xl border border-slate-200 px-5 py-4 mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Recommendation</p>
              <div className="flex gap-6">
                {[
                  { value: 'recommend',     label: 'Recommend for Award',  color: 'accent-emerald-600' },
                  { value: 'not_recommend', label: 'Do Not Recommend',     color: 'accent-rose-600'    },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name={`rec_${nom.id}`} value={opt.value}
                      checked={scores.recommendation === opt.value}
                      onChange={() => setScore('recommendation', opt.value)}
                      disabled={isReviewed}
                      className={`${opt.color} w-4 h-4`} />
                    <span className="text-sm font-semibold text-slate-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Panel member signature */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Panel Member Name / Signature <span className="text-rose-500">*</span></p>
                <input value={scores.panel_name}
                  onChange={e => setScore('panel_name', e.target.value)}
                  disabled={isReviewed}
                  placeholder="Type your full name"
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm italic text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:bg-slate-50" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Evaluation Date</p>
                <div className="h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 flex items-center text-sm text-slate-600 font-medium">
                  {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Status info if already reviewed */}
            {isReviewed && (
              <div className={`rounded-xl border px-4 py-3 mb-4
                ${nom.status === 'manager_approved'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <p className="text-sm font-bold">
                  {nom.status === 'manager_approved' ? '✅ You have endorsed this nomination.' :
                   nom.status === 'manager_rejected'  ? '❌ You marked this as not recommended.' :
                   `Status: ${nom.status.replace(/_/g, ' ')}`}
                </p>
                {nom.manager_reviewed_at && (
                  <p className="text-[11px] mt-0.5 opacity-70">
                    Reviewed on {new Date(nom.manager_reviewed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            {canReview && (
              <div className="flex items-center gap-3">
                <button onClick={handleSave} disabled={saving || submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
                <button onClick={handleSubmit} disabled={saving || submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-all disabled:opacity-40 shadow-sm shadow-amber-200">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {submitting ? 'Submitting…' : 'Submit Evaluation'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Manager View ─────────────────────────────────────────────────────────

interface Props { manager: any; }

export function EOMManagerView({ manager }: Props) {
  const [cycles,       setCycles]       = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [team,         setTeam]         = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    fetch(`${EOM_API}/cycles/active/`)
      .then(r => r.json())
      .then(data => {
        setCycles(data);
        if (data.length === 1) setSelectedCycle(data[0]);
      }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCycle) return;
    fetch(`${EOM_API}/manager/${manager.employee_id}/team/?cycle_id=${selectedCycle.id}`)
      .then(r => r.json())
      .then(setTeam)
      .catch(() => {});
  }, [selectedCycle, manager.employee_id]);

  const updateNom = (nomData: any) => {
    setTeam(prev => prev.map(entry => {
      if (entry.nomination?.id === nomData.id) return { ...entry, nomination: nomData };
      return entry;
    }));
  };

  const awaiting   = team.filter(e => e.nomination?.status === 'submitted');
  const reviewed   = team.filter(e => e.nomination?.status && !['submitted', 'draft'].includes(e.nomination.status));
  const notSubmitted = team.filter(e => !e.nomination || e.nomination.status === 'draft');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
      </div>
    );
  }

  if (cycles.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Award className="w-14 h-14 text-slate-300 mx-auto mb-4" />
        <h2 className="text-base font-bold text-slate-700 mb-1">No Active Nomination Cycle</h2>
        <p className="text-sm text-slate-400">HR will open a cycle soon.</p>
      </div>
    );
  }

  if (!selectedCycle) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <h2 className="text-base font-bold text-slate-800 mb-4">Select Cycle</h2>
        <div className="space-y-3">
          {cycles.map(c => (
            <button key={c.id} onClick={() => setSelectedCycle(c)}
              className="w-full text-left px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-all">
              <p className="font-semibold text-amber-800 text-sm">{c.name}</p>
              <p className="text-xs text-amber-600 mt-0.5">{MONTH_NAMES[c.month]} {c.year}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 flex items-center justify-center font-black text-amber-700 text-lg shrink-0">
          {manager.name?.[0]}
        </div>
        <div className="flex-1">
          <h2 className="text-base font-extrabold text-slate-900">{manager.name}</h2>
          <p className="text-amber-600 text-xs font-semibold mt-0.5">Manager · EOM Panel Review — {selectedCycle.name}</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
            <Clock className="w-3 h-3" /> {awaiting.length} Pending
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
            <CheckCircle className="w-3 h-3" /> {reviewed.length} Reviewed
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500">
            <Users className="w-3 h-3" /> {team.length} Total
          </div>
        </div>
      </div>

      {/* Cycle switcher */}
      {cycles.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Cycle:</span>
          {cycles.map(c => (
            <button key={c.id} onClick={() => setSelectedCycle(c)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all
                ${selectedCycle?.id === c.id
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Awaiting Review */}
      {awaiting.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-sm font-black text-slate-700 uppercase tracking-wide">Awaiting Your Review ({awaiting.length})</p>
          </div>
          {awaiting.map(e => (
            <NominationCard key={e.employee_id} entry={e} manager={manager} cycle={selectedCycle} onUpdate={updateNom} />
          ))}
        </div>
      )}

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <p className="text-sm font-black text-slate-700 uppercase tracking-wide">Reviewed ({reviewed.length})</p>
          </div>
          {reviewed.map(e => (
            <NominationCard key={e.employee_id} entry={e} manager={manager} cycle={selectedCycle} onUpdate={updateNom} />
          ))}
        </div>
      )}

      {/* Not submitted */}
      {notSubmitted.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-wide">Not Submitted ({notSubmitted.length})</p>
          </div>
          {notSubmitted.map(e => (
            <div key={e.employee_id} className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4 opacity-60">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-sm shrink-0">
                {e.name?.[0]}
              </div>
              <div className="flex-1">
                <p className="text-slate-700 font-semibold text-sm">{e.name}</p>
                <p className="text-slate-400 text-xs">{e.designation} · {e.department}</p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-slate-100 text-slate-400 border-slate-200">
                Not Submitted
              </span>
            </div>
          ))}
        </div>
      )}

      {team.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-bold">No team members found.</p>
          <p className="text-slate-400 text-sm mt-1">Make sure the EOM employee list has your ID ({manager.employee_id}) as Reporting Manager ID.</p>
        </div>
      )}
    </div>
  );
}
