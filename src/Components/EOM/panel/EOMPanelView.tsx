import { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown, ChevronUp, CheckCircle2,
  Loader2, AlertCircle, Clock, CheckCircle, Award,
} from 'lucide-react';
import { EOM_API } from '../../../Pages/EOMPage';

const MONTH_NAMES = ['','January','February','March','April','May','June',
  'July','August','September','October','November','December'];

const PANEL_DIMS = [
  { key: 'dim2', label: 'APIS Values (UPLIFT)',                                                                          max: 10 },
  { key: 'dim3', label: 'Survey Participation, Compliance & Conduct, Fun Club Activities Participation',                max: 10 },
  { key: 'dim4', label: 'Initiative & Entrepreneurial Problem-Solving',                                                  max: 10 },
  { key: 'dim5', label: 'Efficiency, Cost & Resource Optimisation',                                                     max: 10 },
  { key: 'dim6', label: 'Teamwork, Collaboration & People Development, Learning & Values Creation',                    max: 10 },
] as const;

const SMART_META = [
  { key: 'smart_specific',   letter: 'S', label: 'Specific'   },
  { key: 'smart_measurable', letter: 'M', label: 'Measurable' },
  { key: 'smart_achievable', letter: 'A', label: 'Achievable' },
  { key: 'smart_relevant',   letter: 'R', label: 'Relevant'   },
  { key: 'smart_timebound',  letter: 'T', label: 'Time-Bound' },
] as const;

const STATUS_BADGE: Record<string, string> = {
  hod_approved:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  panel_approved: 'bg-violet-50 text-violet-700 border-violet-200',
  panel_rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  hr_finalized:   'bg-amber-50 text-amber-700 border-amber-200',
};

interface ScoreState {
  dim2_score: string; dim2_comments: string;
  dim3_score: string; dim3_comments: string;
  dim4_score: string; dim4_comments: string;
  dim5_score: string; dim5_comments: string;
  dim6_score: string; dim6_comments: string;
  sustainability_desc: string;
  sustainability_bonus: string;
  sustainability_just: string;
  recommendation: string;
  panel_name: string;
}

function initScore(nom: any): ScoreState {
  return {
    dim2_score:          nom?.panel_dim2_score != null ? String(nom.panel_dim2_score) : '',
    dim2_comments:       nom?.panel_dim2_comments || '',
    dim3_score:          nom?.panel_dim3_score != null ? String(nom.panel_dim3_score) : '',
    dim3_comments:       nom?.panel_dim3_comments || '',
    dim4_score:          nom?.panel_dim4_score != null ? String(nom.panel_dim4_score) : '',
    dim4_comments:       nom?.panel_dim4_comments || '',
    dim5_score:          nom?.panel_dim5_score != null ? String(nom.panel_dim5_score) : '',
    dim5_comments:       nom?.panel_dim5_comments || '',
    dim6_score:          nom?.panel_dim6_score != null ? String(nom.panel_dim6_score) : '',
    dim6_comments:       nom?.panel_dim6_comments || '',
    sustainability_desc:  nom?.panel_sustainability_desc  || '',
    sustainability_bonus: nom?.panel_sustainability_bonus != null ? String(nom.panel_sustainability_bonus) : '',
    sustainability_just:  nom?.panel_sustainability_just  || '',
    recommendation:       nom?.panel_recommendation || '',
    panel_name:           nom?.panel_panel_name    || '',
  };
}

const panelTotal = (s: ScoreState) =>
  (Number(s.dim2_score)||0)+(Number(s.dim3_score)||0)+
  (Number(s.dim4_score)||0)+(Number(s.dim5_score)||0)+
  (Number(s.dim6_score)||0);

// ─── Nomination card ───────────────────────────────────────────────────────────

function NominationCard({ nom, cycle, onUpdate }: {
  nom: any; cycle: any; onUpdate: (updated: any) => void;
}) {
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
      panel_dim2_score:           scores.dim2_score !== '' ? Number(scores.dim2_score) : null,
      panel_dim2_comments:        scores.dim2_comments,
      panel_dim3_score:           scores.dim3_score !== '' ? Number(scores.dim3_score) : null,
      panel_dim3_comments:        scores.dim3_comments,
      panel_dim4_score:           scores.dim4_score !== '' ? Number(scores.dim4_score) : null,
      panel_dim4_comments:        scores.dim4_comments,
      panel_dim5_score:           scores.dim5_score !== '' ? Number(scores.dim5_score) : null,
      panel_dim5_comments:        scores.dim5_comments,
      panel_dim6_score:           scores.dim6_score !== '' ? Number(scores.dim6_score) : null,
      panel_dim6_comments:        scores.dim6_comments,
      panel_sustainability_desc:  scores.sustainability_desc,
      panel_sustainability_bonus: scores.sustainability_bonus !== '' ? Number(scores.sustainability_bonus) : null,
      panel_sustainability_just:  scores.sustainability_just,
      panel_recommendation:       scores.recommendation,
      panel_panel_name:           scores.panel_name,
    };
    if (action) p.action = action;
    return p;
  }, [scores]);

  const validate = () => {
    if (PANEL_DIMS.some(d => scores[`${d.key}_score` as keyof ScoreState] === '')) return 'Please fill all 5 dimension scores.';
    const t = panelTotal(scores);
    if (t > 50) return `Panel total ${t} exceeds 50.`;
    if (!scores.recommendation) return 'Please select a recommendation.';
    if (!scores.panel_name.trim()) return 'Please enter your name as Panel Member.';
    return null;
  };

  const save = async (action?: string) => {
    action ? setSubmitting(true) : setSaving(true);
    try {
      const res  = await fetch(`${EOM_API}/nominations/${nom.id}/panel-review/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(action)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed.');
      onUpdate(data);
      showMsg(action ? (action === 'approved' ? 'Nomination endorsed!' : 'Nomination not recommended.') : 'Draft saved.', true);
      if (action) setOpen(false);
    } catch (e: any) { showMsg(e.message, false); }
    finally { setSaving(false); setSubmitting(false); }
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { showMsg(err, false); return; }
    await save(scores.recommendation === 'recommend' ? 'approved' : 'rejected');
  };

  const isReviewed = !['hod_approved'].includes(nom.status);
  const canReview  = nom.status === 'hod_approved';
  const ts = panelTotal(scores);
  const hodScore = nom.hod_dim1_score ?? null;
  const grandTotal = (hodScore ?? 0) + ts + (Number(scores.sustainability_bonus) || 0);

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-all"
        onClick={() => setOpen(o => !o)}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 border border-indigo-200 flex items-center justify-center font-black text-indigo-700 text-sm shrink-0">
          {nom.employee_name?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-900 font-bold text-sm">
            {nom.employee_name}
            <span className="text-slate-400 text-xs font-normal ml-2">#{nom.employee_id_str}</span>
          </p>
          <p className="text-slate-500 text-xs mt-0.5">
            {nom.employee_designation} · {nom.employee_department}
            {nom.track && <span className="ml-1 text-emerald-600 font-semibold">· {nom.track.replace('_','-')}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {hodScore != null && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700">
              HOD: {hodScore}/50
            </span>
          )}
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_BADGE[nom.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            {nom.status.replace(/_/g,' ')}
          </span>
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

      {open && (
        <div className="border-t border-slate-100 px-5 py-5 space-y-6">

          {/* Employee form (read-only) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[['Name',nom.employee_name],['ID',nom.employee_id_str],['Designation',nom.employee_designation],
              ['Department',nom.employee_department],['Zone',nom.employee_zone],['Track',(nom.track||'—').replace('_','-')],
              ['Cycle',cycle?.name],['Submitted',nom.submitted_at ? new Date(nom.submitted_at).toLocaleDateString('en-IN') : '—']
            ].map(([l,v]) => (
              <div key={l}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{l}</p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">{v||'—'}</p>
              </div>
            ))}
          </div>

          {nom.part_a_achievement && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Part A — Achievement Summary</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{nom.part_a_achievement}</div>
            </div>
          )}

          {SMART_META.some(m => nom[m.key]) && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Part B — SMART Evidence</p>
              <div className="space-y-1.5">
                {SMART_META.map(m => nom[m.key] ? (
                  <div key={m.key} className="rounded-lg border border-slate-200 overflow-hidden flex">
                    <div className="w-7 bg-emerald-500 flex items-center justify-center shrink-0">
                      <span className="text-white font-black text-[11px]">{m.letter}</span>
                    </div>
                    <p className="px-3 py-2 text-sm text-slate-700">{nom[m.key]}</p>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          {/* HOD Dim 1 — read-only */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-5 py-4">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">HOD Evaluation — Dimension 1 (Read-Only)</p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-slate-600 font-medium">Business Impact &amp; Measurable Outcome</p>
                <p className="text-xs text-slate-400 mt-0.5">Max 50 pts</p>
              </div>
              <div className="ml-auto text-right">
                <span className="text-2xl font-black text-emerald-700">{hodScore ?? '—'}</span>
                <span className="text-sm text-emerald-500">/50</span>
              </div>
            </div>
            {nom.hod_dim1_comments && (
              <p className="text-xs text-slate-600 mt-2 italic">HOD comments: {nom.hod_dim1_comments}</p>
            )}
            {nom.hod_remarks && (
              <p className="text-xs text-slate-600 mt-1 italic">HOD remarks: {nom.hod_remarks}</p>
            )}
          </div>

          {/* Panel scorecard — Dims 2-5 */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Annexure B — Panel Evaluation (Dimensions 2-5)</p>

            <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
              <div className="grid grid-cols-[2rem_1fr_3rem_7rem_1fr] bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="px-3 py-2.5">#</div>
                <div className="px-3 py-2.5">Evaluation Dimension</div>
                <div className="px-3 py-2.5 text-center">Max</div>
                <div className="px-3 py-2.5 text-center">Score</div>
                <div className="px-3 py-2.5">Comments</div>
              </div>
              {PANEL_DIMS.map((d, i) => {
                const sk = `${d.key}_score`   as keyof ScoreState;
                const ck = `${d.key}_comments` as keyof ScoreState;
                const sv = scores[sk];
                const over = sv !== '' && Number(sv) > d.max;
                return (
                  <div key={d.key} className={`grid grid-cols-[2rem_1fr_3rem_7rem_1fr] border-b border-slate-100 last:border-0 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                    <div className="px-3 pt-3.5 text-sm font-black text-slate-400">{i+2}</div>
                    <div className="px-3 py-3 text-sm text-slate-700 font-medium leading-snug">{d.label}</div>
                    <div className="px-3 pt-3.5 text-sm font-black text-slate-600 text-center">{d.max}</div>
                    <div className="px-3 py-2.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min={0} max={d.max}
                        value={sv}
                        onChange={e => set(sk, e.target.value.replace(/[^0-9]/g, ''))}
                        onKeyDown={e => {
                          const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Enter'];
                          if (!/^[0-9]$/.test(e.key) && !allowed.includes(e.key)) e.preventDefault();
                        }}
                        disabled={isReviewed} placeholder="0"
                        className={`w-full h-9 rounded-lg border px-3 text-sm font-bold text-center focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500
                          ${over ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 focus:ring-indigo-300 focus:border-indigo-400'}`}
                      />
                    </div>
                    <div className="px-3 py-2.5">
                      <textarea rows={2} value={scores[ck]} onChange={e => set(ck, e.target.value)}
                        disabled={isReviewed} placeholder="Comments..."
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                );
              })}
              <div className="grid grid-cols-[2rem_1fr_3rem_7rem_1fr] bg-indigo-50 border-t-2 border-indigo-200">
                <div className="px-3 py-3" />
                <div className="px-3 py-3 text-sm font-black text-slate-700">PANEL TOTAL</div>
                <div className="px-3 py-3 text-sm font-black text-slate-600 text-center">50</div>
                <div className="px-3 py-3 text-center">
                  <span className={`text-xl font-black ${ts>50?'text-rose-600':ts>=40?'text-emerald-600':'text-slate-600'}`}>{ts}</span>
                  {ts > 50 && <p className="text-[10px] text-rose-500 font-bold">Exceeds 50!</p>}
                </div>
                <div className="px-3 py-3 text-xs text-slate-500 flex items-center">
                  Grand total (HOD+Panel): <span className="ml-1 font-black text-slate-800">{grandTotal}/100</span>
                </div>
              </div>
            </div>

            {/* Sustainability */}
            <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sustainability Bonus (if applicable)</p>
              </div>
              <div className="grid grid-cols-3 gap-4 px-4 py-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">ESG / Sustainability / CSR Contribution</p>
                  <textarea rows={3} value={scores.sustainability_desc}
                    onChange={e => set('sustainability_desc', e.target.value)}
                    disabled={isReviewed} placeholder="Describe..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none disabled:bg-slate-50" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Bonus Stars (0–5 pts)
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    {[1,2,3,4,5].map(star => {
                      const current = Number(scores.sustainability_bonus) || 0;
                      const filled  = star <= current;
                      return (
                        <button
                          key={star}
                          type="button"
                          disabled={isReviewed}
                          onClick={() => set('sustainability_bonus', current === star ? '0' : String(star))}
                          className={`text-3xl leading-none transition-all select-none
                            ${isReviewed ? 'cursor-default' : 'cursor-pointer hover:scale-125 active:scale-110'}
                            ${filled ? 'text-amber-400 drop-shadow-sm' : 'text-slate-300 hover:text-amber-300'}`}
                          title={`${star} star${star > 1 ? 's' : ''} = ${star} bonus pt${star > 1 ? 's' : ''}`}
                        >
                          {filled ? '★' : '☆'}
                        </button>
                      );
                    })}
                    <span className="ml-2 text-sm font-black text-amber-600">
                      {Number(scores.sustainability_bonus) || 0} pts
                    </span>
                    {!isReviewed && Number(scores.sustainability_bonus) > 0 && (
                      <button
                        type="button"
                        onClick={() => set('sustainability_bonus', '0')}
                        className="ml-1 text-[10px] text-slate-400 hover:text-rose-500 underline"
                      >
                        clear
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Justification</p>
                  <textarea rows={3} value={scores.sustainability_just}
                    onChange={e => set('sustainability_just', e.target.value)}
                    disabled={isReviewed} placeholder="Justification..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none disabled:bg-slate-50" />
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="rounded-xl border border-slate-200 px-5 py-4 mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Recommendation</p>
              <div className="flex gap-6">
                {[
                  { value: 'recommend',     label: 'Recommend for Award' },
                  { value: 'not_recommend', label: 'Do Not Recommend'    },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name={`panelrec_${nom.id}`} value={opt.value}
                      checked={scores.recommendation === opt.value}
                      onChange={() => set('recommendation', opt.value)}
                      disabled={isReviewed} className="accent-indigo-600 w-4 h-4" />
                    <span className="text-sm font-semibold text-slate-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Signature */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Panel Member Name / Signature <span className="text-rose-500">*</span></p>
                <input value={scores.panel_name} onChange={e => set('panel_name', e.target.value)}
                  disabled={isReviewed} placeholder="Type your full name"
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm italic text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-50" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Evaluation Date</p>
                <div className="h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 flex items-center text-sm text-slate-600 font-medium">
                  {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

            {isReviewed && (
              <div className={`rounded-xl border px-4 py-3 mb-4
                ${nom.status === 'panel_approved' ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <p className="text-sm font-bold">
                  {nom.status === 'panel_approved' ? '✅ Panel has endorsed this nomination.' :
                   nom.status === 'panel_rejected'  ? '❌ Panel has not recommended this nomination.' :
                   `Status: ${nom.status.replace(/_/g,' ')}`}
                </p>
                {nom.panel_reviewed_at && (
                  <p className="text-[11px] mt-0.5 opacity-70">
                    Reviewed on {new Date(nom.panel_reviewed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}

            {canReview && (
              <div className="flex items-center gap-3">
                <button onClick={() => save()} disabled={saving || submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
                <button onClick={handleSubmit} disabled={saving || submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all disabled:opacity-40 shadow-sm shadow-indigo-200">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {submitting ? 'Submitting…' : 'Submit Panel Evaluation'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel View ───────────────────────────────────────────────────────────

export function EOMPanelView({ panelUser }: { panelUser: any }) {
  const [cycles,        setCycles]        = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [nominations,   setNominations]   = useState<any[]>([]);
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
    fetch(`${EOM_API}/panel/nominations/?cycle_id=${selectedCycle.id}`)
      .then(r => r.json()).then(setNominations).catch(() => {});
  }, [selectedCycle]);

  const updateNom = (updated: any) =>
    setNominations(prev => prev.map(n => n.id === updated.id ? updated : n));

  const awaiting = nominations.filter(n => n.status === 'hod_approved');
  const reviewed = nominations.filter(n => ['panel_approved','panel_rejected','hr_finalized'].includes(n.status));

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
    </div>
  );

  if (cycles.length === 0) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <Award className="w-14 h-14 text-slate-300 mx-auto mb-4" />
      <h2 className="text-base font-bold text-slate-700 mb-1">No Active Nomination Cycle</h2>
      <p className="text-sm text-slate-400">HR will open a cycle soon.</p>
    </div>
  );

  if (!selectedCycle) return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h2 className="text-base font-bold text-slate-800 mb-4">Select Cycle</h2>
      <div className="space-y-3">
        {cycles.map(c => (
          <button key={c.id} onClick={() => setSelectedCycle(c)}
            className="w-full text-left px-4 py-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-all">
            <p className="font-semibold text-indigo-800 text-sm">{c.name}</p>
            <p className="text-xs text-indigo-600 mt-0.5">{MONTH_NAMES[c.month]} {c.year}</p>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 border border-indigo-200 flex items-center justify-center font-black text-indigo-700 text-lg shrink-0">
          {panelUser.name?.[0]}
        </div>
        <div className="flex-1">
          <h2 className="text-base font-extrabold text-slate-900">{panelUser.name}</h2>
          <p className="text-indigo-600 text-xs font-semibold mt-0.5">Panel Member · EOM Panel Evaluation — {selectedCycle.name}</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
            <Clock className="w-3 h-3" /> {awaiting.length} Pending
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-200 text-violet-700">
            <CheckCircle className="w-3 h-3" /> {reviewed.length} Reviewed
          </div>
        </div>
      </div>

      {cycles.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Cycle:</span>
          {cycles.map(c => (
            <button key={c.id} onClick={() => setSelectedCycle(c)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all
                ${selectedCycle?.id === c.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {awaiting.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-sm font-black text-slate-700 uppercase tracking-wide">Awaiting Panel Review ({awaiting.length})</p>
          </div>
          {awaiting.map(n => <NominationCard key={n.id} nom={n} cycle={selectedCycle} onUpdate={updateNom} />)}
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-500" />
            <p className="text-sm font-black text-slate-700 uppercase tracking-wide">Reviewed by Panel ({reviewed.length})</p>
          </div>
          {reviewed.map(n => <NominationCard key={n.id} nom={n} cycle={selectedCycle} onUpdate={updateNom} />)}
        </div>
      )}

      {nominations.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-bold">No HOD-approved nominations yet.</p>
          <p className="text-slate-400 text-sm mt-1">Once the HOD reviews and approves nominations, they will appear here for panel evaluation.</p>
        </div>
      )}
    </div>
  );
}
