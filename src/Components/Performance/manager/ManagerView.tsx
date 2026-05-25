import { useState, useEffect } from 'react';
import {
  Users, CheckCircle, XCircle, Star, ChevronDown, ChevronUp,
  AlertCircle, Clock, Award, Target,
} from 'lucide-react';
import { PERF_API } from '../../../Pages/PerformancePage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  sales: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  customer: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
  learning: 'text-violet-300 bg-violet-500/10 border-violet-500/20',
  process: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  innovation: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
};

const CAT_BORDER: Record<string, string> = {
  sales: 'border-l-amber-400',
  customer: 'border-l-sky-400',
  learning: 'border-l-violet-400',
  process: 'border-l-emerald-400',
  innovation: 'border-l-rose-400',
};

const STATUS_META: Record<string, { cls: string; dot: string; label: string }> = {
  draft:            { cls: 'text-slate-400',   dot: 'bg-slate-500',              label: 'Draft' },
  submitted:        { cls: 'text-blue-300',    dot: 'bg-blue-400 animate-pulse', label: 'Awaiting Review' },
  manager_approved: { cls: 'text-emerald-300', dot: 'bg-emerald-400',            label: 'Approved' },
  manager_rejected: { cls: 'text-rose-300',    dot: 'bg-rose-400',               label: 'Changes Requested' },
  hr_approved:      { cls: 'text-violet-300',  dot: 'bg-violet-400',             label: 'HR Approved' },
  finalized:        { cls: 'text-amber-300',   dot: 'bg-amber-400',              label: 'Finalized' },
};

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s}
          onClick={() => !readonly && onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => setHover(0)}
          disabled={readonly}
          className={`transition-all ${!readonly ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}>
          <Star className={`w-4 h-4 transition-colors ${
            s <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
          }`} />
        </button>
      ))}
    </div>
  );
}

// ─── Team Member Card ─────────────────────────────────────────────────────────

function MemberCard({ member, manager, onRated }: { member: any; manager: any; onRated: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [reviewMode, setReviewMode] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const gc = member.goal_card;
  const status = gc?.status;
  const sm = STATUS_META[status] || { cls: 'text-slate-500', dot: 'bg-slate-600', label: 'No Goals' };

  const COMPETENCIES = [
    { key: 'ownership',      label: 'Ownership & Accountability' },
    { key: 'communication',  label: 'Communication' },
    { key: 'teamwork',       label: 'Teamwork' },
    { key: 'leadership',     label: 'Leadership' },
    { key: 'compliance',     label: 'Compliance & Discipline' },
    { key: 'problem_solving',label: 'Problem Solving' },
    { key: 'innovation',     label: 'Innovation' },
  ];

  const initRating = () => {
    const ratings: Record<number, { manager_rating: number; manager_comments: string }> = {};
    gc.goals?.forEach((g: any) => {
      ratings[g.id] = { manager_rating: g.manager_rating || 0, manager_comments: g.manager_comments || '' };
    });
    const initCompetencies: Record<string, { marks: number; manager_remarks: string }> = {};
    const existing = gc.competency_ratings || [];
    COMPETENCIES.forEach(c => {
      const found = existing.find((r: any) => r.competency === c.key);
      initCompetencies[c.key] = { marks: found?.marks || 0, manager_remarks: found?.manager_remarks || '' };
    });
    setReviewMode({
      action: 'approved', remarks: '', overall_rating: gc.review_data?.manager_overall_rating || 0,
      goal_ratings: ratings,
      competency_ratings: initCompetencies,
      employee_strengths: '', areas_of_improvement: '', development_plan: '',
      promotion_recommendation: '', increment_recommendation: '',
    });
  };

  const submitGoalReview = async (action: 'approved' | 'rejected') => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${PERF_API}/goal-cards/${gc.id}/manager-review/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remarks: reviewMode.remarks, manager_name: manager.name, goal_adjustments: [] }),
      });
      if (res.ok) {
        setMsg({ text: `Goals ${action === 'approved' ? 'approved' : 'sent back for revision'}!`, ok: true });
        setReviewMode(null);
        onRated();
      }
    } catch { setMsg({ text: 'Failed. Try again.', ok: false }); }
    finally { setSaving(false); }
  };

  const submitRatings = async () => {
    const reviewId = gc.review_data?.id;
    if (!reviewId) {
      setMsg({ text: 'No review submitted by employee yet.', ok: false });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const goal_ratings = Object.entries(reviewMode.goal_ratings || {}).map(([goal_id, r]: any) => ({
        goal_id: Number(goal_id), manager_rating: r.manager_rating, manager_comments: r.manager_comments,
      }));
      const competency_ratings = Object.entries(reviewMode.competency_ratings || {}).map(([competency, r]: any) => ({
        competency, marks: r.marks || null, manager_remarks: r.manager_remarks || '',
      }));
      const res = await fetch(`${PERF_API}/reviews/${reviewId}/manager-rate/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_overall_rating: reviewMode.overall_rating || 0,
          manager_review_comments: reviewMode.remarks,
          employee_strengths: reviewMode.employee_strengths || '',
          areas_of_improvement: reviewMode.areas_of_improvement || '',
          development_plan: reviewMode.development_plan || '',
          promotion_recommendation: reviewMode.promotion_recommendation || '',
          increment_recommendation: reviewMode.increment_recommendation || '',
          manager_name: manager.name,
          goal_ratings,
          competency_ratings,
        }),
      });
      if (res.ok) {
        setMsg({ text: 'Ratings submitted!', ok: true });
        setReviewMode(null);
        onRated();
      }
    } catch { setMsg({ text: 'Failed. Try again.', ok: false }); }
    finally { setSaving(false); }
  };

  return (
    <div className={`bg-white/3 border border-white/8 rounded-2xl overflow-hidden transition-all ${
      status === 'submitted' ? 'border-blue-500/20' : status === 'manager_rejected' ? 'border-rose-500/15' : ''
    }`}>
      {/* Member row */}
      <div
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-white/3 transition-all select-none"
        onClick={() => gc && setExpanded(e => !e)}>
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-600/30 flex items-center justify-center font-black text-amber-300 text-sm shrink-0">
          {member.name?.[0]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">{member.name}</p>
          <p className="text-slate-400 text-xs mt-0.5 truncate">{member.designation} {member.zone && `· ${member.zone}`}</p>
        </div>

        {/* Status */}
        {gc ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className={`flex items-center gap-1.5 text-xs font-bold ${sm.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
              {sm.label}
            </span>
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        ) : (
          <span className="text-xs text-slate-600 font-semibold">No goals set</span>
        )}
      </div>

      {/* Expanded panel */}
      {expanded && gc && (
        <div className="border-t border-white/5 p-5 space-y-4">
          {/* Goals */}
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            {gc.goals?.length || 0} Goals · Total Weight: {gc.total_weightage}%
          </p>

          <div className="space-y-3">
            {gc.goals?.map((g: any) => (
              <div key={g.id} className={`bg-white/3 border border-white/6 rounded-xl overflow-hidden border-l-4 ${CAT_BORDER[g.category] || 'border-l-slate-500'}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${CAT_COLORS[g.category] || 'text-slate-400 bg-white/5 border-white/10'}`}>
                        {g.get_category_display || g.category}
                      </span>
                      <p className="text-slate-200 font-semibold text-sm mt-1.5">{g.title}</p>
                      {g.kpi_metric && <p className="text-slate-500 text-xs mt-0.5">KPI: {g.kpi_metric} · Target: {g.target_value}</p>}
                    </div>
                    <span className="text-xs font-black text-violet-300 shrink-0">{g.weightage}%</span>
                  </div>

                  {/* Self rating row */}
                  {(g.self_rating > 0 || g.self_completion_pct > 0) && (
                    <div className="flex items-center gap-4 flex-wrap mt-2 pt-2 border-t border-white/5 text-xs">
                      {g.self_rating > 0 && (
                        <span className="flex items-center gap-1.5 text-slate-400">
                          Self: <StarRating value={g.self_rating} readonly />
                        </span>
                      )}
                      {g.self_completion_pct > 0 && (
                        <span className="text-slate-400">{g.self_completion_pct}% complete</span>
                      )}
                      {g.achievement_description && (
                        <p className="w-full text-slate-400 italic text-xs">"{g.achievement_description}"</p>
                      )}
                    </div>
                  )}

                  {/* Manager rating input */}
                  {reviewMode && (
                    <div className="mt-3 pt-3 border-t border-white/8 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300">Your Rating</span>
                        <StarRating
                          value={reviewMode.goal_ratings?.[g.id]?.manager_rating || 0}
                          onChange={v => setReviewMode((p: any) => ({
                            ...p,
                            goal_ratings: { ...p.goal_ratings, [g.id]: { ...p.goal_ratings?.[g.id], manager_rating: v } }
                          }))}
                        />
                      </div>
                      <input
                        placeholder="Comment on this goal (optional)"
                        value={reviewMode.goal_ratings?.[g.id]?.manager_comments || ''}
                        onChange={e => setReviewMode((p: any) => ({
                          ...p,
                          goal_ratings: { ...p.goal_ratings, [g.id]: { ...p.goal_ratings?.[g.id], manager_comments: e.target.value } }
                        }))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500/40 placeholder-slate-600"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Review data if exists */}
          {gc.review_data && (
            <div className="bg-white/3 border border-white/8 rounded-xl p-3 flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${gc.review_data.status === 'submitted' ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400'}`} />
              <div>
                <p className="text-xs font-bold text-slate-300">Quarterly Review {gc.review_data.status === 'submitted' ? 'submitted by employee' : gc.review_data.status}</p>
                {gc.review_data.final_weighted_score && (
                  <p className="text-xs text-amber-400 font-bold mt-0.5">Final Score: {gc.review_data.final_weighted_score}</p>
                )}
              </div>
            </div>
          )}

          {/* Remarks input (shared) */}
          {reviewMode && (
            <textarea value={reviewMode.remarks}
              onChange={e => setReviewMode((p: any) => ({ ...p, remarks: e.target.value }))}
              placeholder="Overall remarks to employee (optional)..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/50 resize-none" />
          )}

          {/* Overall rating (for quarterly rating flow) */}
          {reviewMode && gc.review_data?.status === 'submitted' && (
            <div className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3">
              <span className="text-sm font-bold text-slate-300">Overall Rating</span>
              <StarRating
                value={reviewMode.overall_rating || 0}
                onChange={v => setReviewMode((p: any) => ({ ...p, overall_rating: v }))}
              />
            </div>
          )}

          {/* Section C – Competency Evaluation */}
          {reviewMode && gc.review_data?.status === 'submitted' && (
            <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-300 px-4 py-3 border-b border-white/5">
                Section C — Competency Evaluation
              </p>
              <div className="divide-y divide-white/5">
                {COMPETENCIES.map(c => (
                  <div key={c.key} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-xs font-semibold">{c.label}</span>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(n => (
                          <button key={n}
                            onClick={() => setReviewMode((p: any) => ({
                              ...p,
                              competency_ratings: { ...p.competency_ratings, [c.key]: { ...p.competency_ratings?.[c.key], marks: n } }
                            }))}
                            className={`w-7 h-7 rounded-lg text-xs font-black transition-all border ${
                              (reviewMode.competency_ratings?.[c.key]?.marks || 0) >= n
                                ? 'bg-amber-500/30 border-amber-500/50 text-amber-300'
                                : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                            }`}>{n}</button>
                        ))}
                      </div>
                    </div>
                    <input
                      placeholder="Remarks (optional)"
                      value={reviewMode.competency_ratings?.[c.key]?.manager_remarks || ''}
                      onChange={e => setReviewMode((p: any) => ({
                        ...p,
                        competency_ratings: { ...p.competency_ratings, [c.key]: { ...p.competency_ratings?.[c.key], manager_remarks: e.target.value } }
                      }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500/40 placeholder-slate-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section E – Manager Assessment */}
          {reviewMode && gc.review_data?.status === 'submitted' && (
            <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-300 px-4 py-3 border-b border-white/5">
                Section E — Manager Assessment
              </p>
              <div className="p-4 space-y-3">
                {[
                  { field: 'employee_strengths',     label: 'Employee Strengths',       ph: 'Key strengths observed this quarter...' },
                  { field: 'areas_of_improvement',   label: 'Areas of Improvement',     ph: 'Where can this employee improve?' },
                  { field: 'development_plan',       label: 'Development Plan',         ph: 'Suggested actions / training for growth...' },
                  { field: 'promotion_recommendation',label: 'Promotion Recommendation', ph: 'e.g. Recommended / Not Yet / Under Review' },
                  { field: 'increment_recommendation',label: 'Increment Recommendation', ph: 'e.g. 10% / Standard / Exceptional' },
                ].map(({ field, label, ph }) => (
                  <div key={field}>
                    <label className="text-slate-400 text-xs font-bold block mb-1">{label}</label>
                    <input
                      placeholder={ph}
                      value={reviewMode[field] || ''}
                      onChange={e => setReviewMode((p: any) => ({ ...p, [field]: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500/40 placeholder-slate-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons — Goal approval */}
          {status === 'submitted' && !reviewMode && (
            <div className="flex gap-3">
              <button onClick={() => { initRating(); setReviewMode((p: any) => ({ ...p, action: 'approved' })); }}
                className="flex-1 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-sm hover:bg-emerald-500/25 transition-all flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Approve Goals
              </button>
              <button onClick={() => { initRating(); setReviewMode((p: any) => ({ ...p, action: 'rejected' })); }}
                className="flex-1 py-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-sm hover:bg-rose-500/25 transition-all flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> Request Changes
              </button>
            </div>
          )}

          {reviewMode && status === 'submitted' && (
            <button
              onClick={() => submitGoalReview(reviewMode.action)}
              disabled={saving}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 ${
                reviewMode.action === 'approved'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}>
              {saving ? 'Submitting...'
                : reviewMode.action === 'approved' ? '✅ Confirm Approval'
                : '⚠️ Send Back for Revision'}
            </button>
          )}

          {/* Action button — Quarterly rating */}
          {status === 'manager_approved' && gc.review_data?.status === 'submitted' && !reviewMode && (
            <button onClick={initRating}
              className="w-full py-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-sm hover:bg-amber-500/25 transition-all flex items-center justify-center gap-2">
              <Star className="w-4 h-4" /> Rate Quarterly Submission
            </button>
          )}

          {reviewMode && gc.review_data?.status === 'submitted' && (
            <button onClick={submitRatings} disabled={saving}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
              <Award className="w-4 h-4" /> {saving ? 'Submitting...' : 'Submit All Ratings'}
            </button>
          )}

          {/* Cancel */}
          {reviewMode && (
            <button onClick={() => setReviewMode(null)}
              className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm font-semibold transition-colors">
              Cancel
            </button>
          )}

          {/* Feedback msg */}
          {msg && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${
              msg.ok ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-300'
                     : 'bg-rose-500/10 border border-rose-500/25 text-rose-300'
            }`}>
              {msg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {msg.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ManagerView({ manager }: { manager: any }) {
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${PERF_API}/cycles/active/`).then(r => r.json()).then(data => {
      setCycles(data);
    }).catch(() => {});
  }, []);

  const loadTeam = () => {
    if (!selectedCycle) return;
    setLoading(true);
    fetch(`${PERF_API}/manager/${manager.employee_id}/team/?cycle_id=${selectedCycle.id}`)
      .then(r => r.json()).then(setTeam).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTeam(); }, [selectedCycle, manager.employee_id]);

  const stats = {
    total: team.length,
    pending: team.filter(m => m.goal_card?.status === 'submitted').length,
    approved: team.filter(m => m.goal_card?.status === 'manager_approved').length,
    noGoals: team.filter(m => !m.goal_card).length,
    awaitingRating: team.filter(m => m.goal_card?.status === 'manager_approved' && m.goal_card?.review_data?.status === 'submitted').length,
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* ── Manager Header ── */}
        <div className="bg-gradient-to-br from-amber-600/15 to-orange-900/20 border border-amber-500/20 rounded-3xl p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-amber-500/25 shrink-0">
            {manager.name?.[0]}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold text-white">{manager.name}</h2>
            <p className="text-amber-300 text-sm font-semibold mt-0.5">{manager.designation}</p>
            {manager.zone && <p className="text-slate-400 text-xs mt-1">📍 {manager.zone}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-4xl font-black text-white">{team.length}</p>
            <p className="text-amber-300 text-sm font-bold">Direct Reports</p>
          </div>
        </div>

        {/* ── Stats Row ── */}
        {selectedCycle && team.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Pending Review', value: stats.pending, color: 'text-blue-300', bg: 'bg-blue-500/8', icon: Clock },
              { label: 'Approved', value: stats.approved, color: 'text-emerald-300', bg: 'bg-emerald-500/8', icon: CheckCircle },
              { label: 'Awaiting Rating', value: stats.awaitingRating, color: 'text-amber-300', bg: 'bg-amber-500/8', icon: Star },
              { label: 'No Goals Yet', value: stats.noGoals, color: 'text-slate-400', bg: 'bg-white/3', icon: Target },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} className={`${bg} border border-white/8 rounded-2xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider leading-tight">{label}</p>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-3xl font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Cycle selector ── */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Select Quarter</p>
          <div className="flex flex-wrap gap-2">
            {cycles.map(c => (
              <button key={c.id} onClick={() => setSelectedCycle(c)}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                  selectedCycle?.id === c.id
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10'
                    : 'bg-white/3 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Team list ── */}
        {selectedCycle && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-amber-400" />
              <h3 className="text-white font-bold">Team — {selectedCycle.name}</h3>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              </div>
            )}

            {!loading && team.length === 0 && (
              <div className="bg-white/3 border border-white/8 rounded-2xl p-12 text-center text-slate-500">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-bold text-slate-400">No direct reports found</p>
                <p className="text-sm mt-1">Employees must be imported with your Manager ID as their reporting manager.</p>
              </div>
            )}

            {!loading && team.map(member => (
              <MemberCard
                key={member.employee_id}
                member={member}
                manager={manager}
                onRated={loadTeam}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
