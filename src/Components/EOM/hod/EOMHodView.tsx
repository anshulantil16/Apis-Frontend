import { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown, ChevronUp, CheckCircle2,
  Loader2, AlertCircle, Users, Clock, CheckCircle, Award,
} from 'lucide-react';
import { EOM_API } from '../../../features/eom/EOMPage';
import { TOOL_STYLES } from '../../toolStyles';

const MONTH_NAMES = ['','January','February','March','April','May','June',
  'July','August','September','October','November','December'];

const SMART_META = [
  { key: 'smart_specific',   letter: 'S', label: 'Specific'   },
  { key: 'smart_measurable', letter: 'M', label: 'Measurable' },
  { key: 'smart_achievable', letter: 'A', label: 'Achievable' },
  { key: 'smart_relevant',   letter: 'R', label: 'Relevant'   },
  { key: 'smart_timebound',  letter: 'T', label: 'Time-Bound' },
] as const;

const STATUS_BADGE: Record<string, string> = {
  draft:          'bg-slate-100 text-slate-500 border-slate-200',
  submitted:      'bg-blue-50 text-blue-700 border-blue-200',
  hod_approved:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  hod_rejected:   'bg-rose-50 text-rose-700 border-rose-200',
  panel_approved: 'bg-violet-50 text-violet-700 border-violet-200',
  panel_rejected: 'bg-orange-50 text-orange-700 border-orange-200',
  hr_finalized:   'bg-amber-50 text-amber-700 border-amber-200',
};

interface ScoreState {
  dim1_score: string;
  dim1_comments: string;
  recommendation: string;
  panel_name: string;
}

function initScore(nom: any): ScoreState {
  return {
    dim1_score:     nom?.hod_dim1_score != null ? String(nom.hod_dim1_score) : '',
    dim1_comments:  nom?.hod_dim1_comments || '',
    recommendation: nom?.hod_recommendation || '',
    panel_name:     nom?.hod_panel_name || '',
  };
}

function SectionTitle({ title }: { title: string }) {
  return <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">{title}</p>;
}

// ─── Nomination card ───────────────────────────────────────────────────────────

function NominationCard({ entry, cycle, onUpdate }: {
  entry: any; cycle: any; onUpdate: (nom: any) => void;
}) {
  const nom = entry.nomination;
  const [open,       setOpen]       = useState(false);
  const [scores,     setScores]     = useState<ScoreState>(() => initScore(nom));
  const [saving,     setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg,        setMsg]        = useState<{ text: string; ok: boolean } | null>(null);

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const set = (k: keyof ScoreState, v: string) => setScores(p => ({ ...p, [k]: v }));

  const buildPayload = useCallback((action?: string) => {
    const p: Record<string, any> = {
      hod_dim1_score:    scores.dim1_score !== '' ? Number(scores.dim1_score) : null,
      hod_dim1_comments: scores.dim1_comments,
      hod_recommendation: scores.recommendation,
      hod_panel_name:    scores.panel_name,
    };
    if (action) p.action = action;
    return p;
  }, [scores]);

  const validate = () => {
    if (scores.dim1_score === '') return 'Please enter the Business Impact score.';
    const s = Number(scores.dim1_score);
    if (s > 50) return `Score ${s} exceeds max 50.`;
    if (!scores.recommendation) return 'Please select a recommendation.';
    if (!scores.panel_name.trim()) return 'Please enter your name as HOD Signature.';
    return null;
  };

  const save = async (action?: string) => {
    action ? setSubmitting(true) : setSaving(true);
    try {
      const res  = await fetch(`${EOM_API}/nominations/${nom.id}/hod-review/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(action)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed.');
      onUpdate(data);
      showMsg(action ? (action === 'approved' ? 'Nomination forwarded to Panel!' : 'Nomination not recommended.') : 'Draft saved.', true);
      if (action) setOpen(false);
    } catch (e: any) { showMsg(e.message, false); }
    finally { setSaving(false); setSubmitting(false); }
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { showMsg(err, false); return; }
    await save(scores.recommendation === 'recommend' ? 'approved' : 'rejected');
  };

  const isReviewed = nom?.status && nom.status !== 'submitted';
  const canReview  = nom?.status === 'submitted';
  const s1 = Number(scores.dim1_score) || 0;

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden tp-reveal tp-tilt">
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-all"
        onClick={() => setOpen(o => !o)}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200 flex items-center justify-center font-black text-violet-700 text-sm shrink-0 tp-pop-in">
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
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-slate-100 text-slate-400 border-slate-200">Not Submitted</span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {msg && (
        <div className={`mx-5 mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
          ${msg.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {open && nom && (
        <div className="border-t border-slate-100 px-5 py-5 space-y-6">

          {/* Employee details */}
          <div>
            <SectionTitle title="Nominee Details" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Name',        entry.name],
                ['Employee ID', nom.employee_id_str],
                ['Designation', nom.employee_designation],
                ['Department',  nom.employee_department],
                ['Zone',        nom.employee_zone],
                ['Track',       (nom.track||'—').replace('_','-')],
                ['Cycle',       cycle?.name],
                ['Submitted',   nom.submitted_at ? new Date(nom.submitted_at).toLocaleDateString('en-IN') : '—'],
              ].map(([l,v]) => (
                <div key={l}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{l}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{v||'—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Supporting Document */}
          {nom.support_document_name && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
              <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                <span className="text-blue-600 text-sm font-black">📄</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Supporting Document</p>
                <p className="text-sm font-semibold text-blue-800 truncate">{nom.support_document_name}</p>
              </div>
              {nom.support_document_url && (
                <a href={nom.support_document_url} target="_blank" rel="noreferrer"
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all">
                  ↓ Download
                </a>
              )}
            </div>
          )}

          {/* Part A */}
          {nom.part_a_achievement && (
            <div>
              <SectionTitle title="Part A — Achievement Summary" />
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {nom.part_a_achievement}
              </div>
            </div>
          )}

          {/* Part B SMART */}
          {SMART_META.some(m => nom[m.key]) && (
            <div>
              <SectionTitle title="Part B — SMART Evidence" />
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
              <SectionTitle title="Part C — Supporting Evidence" />
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

          {/* HOD Scorecard — Dimension 1 only */}
          <div>
            <SectionTitle title="HOD Evaluation — Dimension 1 (Business Impact)" />

            <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
              <div className="grid grid-cols-[2rem_1fr_3rem_7rem_1fr] bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="px-3 py-2.5">#</div>
                <div className="px-3 py-2.5">Evaluation Dimension</div>
                <div className="px-3 py-2.5 text-center">Max</div>
                <div className="px-3 py-2.5 text-center">Score</div>
                <div className="px-3 py-2.5">Comments</div>
              </div>

              {/* Row 1 */}
              <div className="grid grid-cols-[2rem_1fr_3rem_7rem_1fr] bg-white">
                <div className="px-3 pt-3.5 text-sm font-black text-slate-400">1</div>
                <div className="px-3 py-3 text-sm text-slate-700 font-medium leading-snug">Business Impact &amp; Measurable Outcome</div>
                <div className="px-3 pt-3.5 text-sm font-black text-slate-600 text-center">50</div>
                <div className="px-3 py-2.5">
                  <input type="number" min={0} max={50}
                    value={scores.dim1_score}
                    onChange={e => set('dim1_score', e.target.value)}
                    disabled={!!isReviewed} placeholder="0"
                    className={`w-full h-9 rounded-lg border px-3 text-sm font-bold text-center focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500
                      ${Number(scores.dim1_score) > 50 ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 focus:ring-violet-300 focus:border-violet-400'}`}
                  />
                </div>
                <div className="px-3 py-2.5">
                  <textarea rows={2} value={scores.dim1_comments}
                    onChange={e => set('dim1_comments', e.target.value)}
                    disabled={!!isReviewed} placeholder="Comments..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* HOD Score total */}
              <div className="grid grid-cols-[2rem_1fr_3rem_7rem_1fr] bg-violet-50 border-t-2 border-violet-200">
                <div className="px-3 py-3" />
                <div className="px-3 py-3 text-sm font-black text-slate-700">HOD SCORE</div>
                <div className="px-3 py-3 text-sm font-black text-slate-600 text-center">50</div>
                <div className="px-3 py-3 text-center">
                  <span className={`text-xl font-black ${s1 > 50 ? 'text-rose-600' : s1 >= 40 ? 'text-emerald-600' : 'text-slate-600'}`}>{s1}</span>
                  {s1 > 50 && <p className="text-[10px] text-rose-500 font-bold">Exceeds 50!</p>}
                </div>
                <div className="px-3 py-3 text-xs text-slate-400 flex items-center">
                  Panel will score the remaining 50 pts (Dims 2–5)
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="rounded-xl border border-slate-200 px-5 py-4 mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">HOD Recommendation</p>
              <div className="flex gap-6">
                {[
                  { value: 'recommend',     label: 'Forward to Panel for Award Consideration' },
                  { value: 'not_recommend', label: 'Do Not Forward (Reject)'                  },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name={`rec_${nom.id}`} value={opt.value}
                      checked={scores.recommendation === opt.value}
                      onChange={() => set('recommendation', opt.value)}
                      disabled={!!isReviewed}
                      className="accent-violet-600 w-4 h-4" />
                    <span className="text-sm font-semibold text-slate-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* HOD Signature */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">HOD Name / Signature <span className="text-rose-500">*</span></p>
                <input value={scores.panel_name} onChange={e => set('panel_name', e.target.value)}
                  disabled={!!isReviewed} placeholder="Type your full name"
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm italic text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:bg-slate-50" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Evaluation Date</p>
                <div className="h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 flex items-center text-sm text-slate-600 font-medium">
                  {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Already reviewed */}
            {isReviewed && (
              <div className={`rounded-xl border px-4 py-3 mb-4
                ${nom.status === 'hod_approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <p className="text-sm font-bold">
                  {nom.status === 'hod_approved' ? '✅ Forwarded to Panel for evaluation.' :
                   nom.status === 'hod_rejected'  ? '❌ Nomination rejected — will not go to Panel.' :
                   `Status: ${nom.status.replace(/_/g,' ')}`}
                </p>
                {nom.hod_reviewed_at && (
                  <p className="text-[11px] mt-0.5 opacity-70">
                    Reviewed on {new Date(nom.hod_reviewed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            {canReview && (
              <div className="flex items-center gap-3">
                <button onClick={() => save()} disabled={saving || submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all tp-tilt">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
                <button onClick={handleSubmit} disabled={saving || submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-all disabled:opacity-40 shadow-sm shadow-violet-200 tp-tilt tp-sheen">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {submitting ? 'Submitting…' : 'Submit HOD Evaluation'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main HOD View ─────────────────────────────────────────────────────────────

export function EOMHodView({ hod }: { hod: any }) {
  const [cycles,        setCycles]        = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [team,          setTeam]          = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    fetch(`${EOM_API}/cycles/active/`)
      .then(r => r.json())
      .then(data => { setCycles(data); if (data.length === 1) setSelectedCycle(data[0]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCycle) return;
    fetch(`${EOM_API}/hod/${hod.employee_id}/team/?cycle_id=${selectedCycle.id}`)
      .then(r => r.json()).then(setTeam).catch(() => {});
  }, [selectedCycle, hod.employee_id]);

  const updateNom = (nomData: any) =>
    setTeam(prev => prev.map(e =>
      e.nomination?.id === nomData.id ? { ...e, nomination: nomData } : e
    ));

  const awaiting     = team.filter(e => e.nomination?.status === 'submitted');
  const reviewed     = team.filter(e => e.nomination?.status && !['submitted','draft'].includes(e.nomination.status));
  const notSubmitted = team.filter(e => !e.nomination || e.nomination.status === 'draft');

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
    </div>
  );

  if (cycles.length === 0) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <style>{TOOL_STYLES}</style>
      <Award className="w-14 h-14 text-slate-300 mx-auto mb-4 tp-pop-in" />
      <h2 className="text-base font-bold text-slate-700 mb-1">No Active Nomination Cycle</h2>
      <p className="text-sm text-slate-400">HR will open a cycle soon.</p>
    </div>
  );

  if (!selectedCycle) return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <style>{TOOL_STYLES}</style>
      <h2 className="text-base font-bold text-slate-800 mb-4">Select Cycle</h2>
      <div className="space-y-3">
        {cycles.map((c, i) => (
          <button key={c.id} onClick={() => setSelectedCycle(c)}
            style={{ animationDelay: `${i * 80}ms` }}
            className="w-full text-left px-4 py-3 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 transition-all tp-reveal tp-tilt tp-sheen">
            <p className="font-semibold text-violet-800 text-sm">{c.name}</p>
            <p className="text-xs text-violet-600 mt-0.5">{MONTH_NAMES[c.month]} {c.year}</p>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <style>{TOOL_STYLES}</style>

      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-4 flex items-center gap-4 tp-reveal">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200 flex items-center justify-center font-black text-violet-700 text-lg shrink-0 tp-pop-in">
          {hod.name?.[0]}
        </div>
        <div className="flex-1">
          <h2 className="text-base font-extrabold text-slate-900">{hod.name}</h2>
          <p className="text-violet-600 text-xs font-semibold mt-0.5">HOD · Dim 1 Evaluation (50 pts) — {selectedCycle.name}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
            <Clock className="w-3 h-3" /> {awaiting.length} Pending Review
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
            <CheckCircle className="w-3 h-3" /> {reviewed.length} Reviewed
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-400">
            <Clock className="w-3 h-3" /> {notSubmitted.length} Not Submitted
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-200 text-violet-700">
            <Users className="w-3 h-3" /> {team.length} Total
          </div>
        </div>
      </div>

      {cycles.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Cycle:</span>
          {cycles.map(c => (
            <button key={c.id} onClick={() => setSelectedCycle(c)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all
                ${selectedCycle?.id === c.id ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {awaiting.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 tp-pulse-glow" />
            <p className="text-sm font-black text-slate-700 uppercase tracking-wide">Awaiting Your Review ({awaiting.length})</p>
          </div>
          {awaiting.map((e, i) => (
            <div key={e.employee_id} style={{ animationDelay: `${i * 60}ms` }} className="tp-reveal">
              <NominationCard entry={e} cycle={selectedCycle} onUpdate={updateNom} />
            </div>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <p className="text-sm font-black text-slate-700 uppercase tracking-wide">Reviewed ({reviewed.length})</p>
          </div>
          {reviewed.map((e, i) => (
            <div key={e.employee_id} style={{ animationDelay: `${i * 60}ms` }} className="tp-reveal">
              <NominationCard entry={e} cycle={selectedCycle} onUpdate={updateNom} />
            </div>
          ))}
        </div>
      )}

      {notSubmitted.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-wide">Not Submitted ({notSubmitted.length})</p>
          </div>
          {notSubmitted.map((e, i) => (
            <div key={e.employee_id} style={{ animationDelay: `${i * 60}ms` }} className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4 opacity-60 tp-reveal">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-sm shrink-0">{e.name?.[0]}</div>
              <div className="flex-1">
                <p className="text-slate-700 font-semibold text-sm">{e.name}</p>
                <p className="text-slate-400 text-xs">{e.designation} · {e.department}</p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-slate-100 text-slate-400 border-slate-200">Not Submitted</span>
            </div>
          ))}
        </div>
      )}

      {team.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-bold">No team members found.</p>
          <p className="text-slate-400 text-sm mt-1">Ensure the EOM employee list has your ID ({hod.employee_id}) in the HOD ID column.</p>
        </div>
      )}
    </div>
  );
}
