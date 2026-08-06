import { useState, useEffect } from 'react';
import {
  Users, CheckCircle, XCircle, Star, ChevronDown, ChevronUp,
  AlertCircle, Clock, Award, Target, Zap, TrendingUp, Shield,
} from 'lucide-react';
import { PERF_API } from '../../../features/performance/PerformancePage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GOAL_COLORS = [
  { border: 'border-l-amber-400',   badge: 'text-amber-300 bg-amber-500/10 border-amber-500/20',   glow: 'shadow-amber-500/10' },
  { border: 'border-l-sky-400',     badge: 'text-sky-300 bg-sky-500/10 border-sky-500/20',         glow: 'shadow-sky-500/10' },
  { border: 'border-l-violet-400',  badge: 'text-violet-300 bg-violet-500/10 border-violet-500/20', glow: 'shadow-violet-500/10' },
  { border: 'border-l-emerald-400', badge: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20', glow: 'shadow-emerald-500/10' },
  { border: 'border-l-rose-400',    badge: 'text-rose-300 bg-rose-500/10 border-rose-500/20',      glow: 'shadow-rose-500/10' },
];
const getGoalColor = (i: number) => GOAL_COLORS[i % GOAL_COLORS.length];

const STATUS_META: Record<string, { cls: string; dot: string; label: string; bg: string }> = {
  draft:            { cls: 'text-slate-400',   dot: 'bg-slate-500',              label: 'Draft',              bg: 'bg-slate-500/10' },
  submitted:        { cls: 'text-blue-300',    dot: 'bg-blue-400 animate-pulse', label: 'Awaiting Review',    bg: 'bg-blue-500/10' },
  manager_approved: { cls: 'text-emerald-300', dot: 'bg-emerald-400',            label: 'Approved',           bg: 'bg-emerald-500/10' },
  manager_rejected: { cls: 'text-rose-300',    dot: 'bg-rose-400',               label: 'Changes Requested',  bg: 'bg-rose-500/10' },
  hr_approved:      { cls: 'text-violet-300',  dot: 'bg-violet-400',             label: 'HR Approved',        bg: 'bg-violet-500/10' },
  finalized:        { cls: 'text-amber-300',   dot: 'bg-amber-400',              label: 'Finalized',          bg: 'bg-amber-500/10' },
};

const COMPETENCIES = [
  { key: 'ownership',       label: 'Ownership & Accountability' },
  { key: 'communication',   label: 'Communication' },
  { key: 'teamwork',        label: 'Teamwork' },
  { key: 'leadership',      label: 'Leadership' },
  { key: 'compliance',      label: 'Compliance & Discipline' },
  { key: 'problem_solving', label: 'Problem Solving' },
  { key: 'innovation',      label: 'Innovation' },
];

function StarRating({ value, onChange, readonly, size = 'md' }: {
  value: number; onChange?: (v: number) => void; readonly?: boolean; size?: 'sm' | 'md' | 'lg';
}) {
  const [hover, setHover] = useState(0);
  const sz = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s}
          onClick={() => !readonly && onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => setHover(0)}
          disabled={readonly}
          className={`transition-all ${!readonly ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}>
          <Star className={`${sz} transition-colors ${
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
  const sm = STATUS_META[status] || { cls: 'text-slate-500', dot: 'bg-slate-600', label: 'No Goals', bg: 'bg-slate-500/10' };

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
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${PERF_API}/goal-cards/${gc.id}/manager-review/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remarks: reviewMode.remarks, manager_name: manager.name, goal_adjustments: [] }),
      });
      if (res.ok) {
        setMsg({ text: `Goals ${action === 'approved' ? 'approved' : 'sent back for revision'}!`, ok: true });
        setReviewMode(null); onRated();
      }
    } catch { setMsg({ text: 'Failed. Try again.', ok: false }); }
    finally { setSaving(false); }
  };

  const submitRatings = async () => {
    const reviewId = gc.review_data?.id;
    if (!reviewId) { setMsg({ text: 'No review submitted by employee yet.', ok: false }); return; }
    setSaving(true); setMsg(null);
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
          goal_ratings, competency_ratings,
        }),
      });
      if (res.ok) {
        setMsg({ text: 'Ratings submitted successfully!', ok: true });
        setReviewMode(null); onRated();
      }
    } catch { setMsg({ text: 'Failed. Try again.', ok: false }); }
    finally { setSaving(false); }
  };

  const avatarColors = [
    'from-amber-500 to-orange-600',
    'from-sky-500 to-blue-600',
    'from-violet-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
  ];
  const avatarGrad = avatarColors[(member.name?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <div className={`relative rounded-2xl overflow-hidden border transition-all duration-300 ${
      status === 'submitted'
        ? 'border-blue-500/30 shadow-lg shadow-blue-500/5'
        : status === 'manager_rejected'
        ? 'border-rose-500/20'
        : 'border-white/8'
    }`}>
      {/* Subtle background */}
      <div className="absolute inset-0 bg-white/[0.02]" />

      {/* Member row */}
      <div
        className="relative flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.03] transition-all select-none"
        onClick={() => gc && setExpanded(e => !e)}>

        {/* Avatar */}
        <div className="relative shrink-0">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center font-black text-white text-base shadow-lg`}>
            {member.name?.[0]}
          </div>
          {status === 'submitted' && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full border-2 border-[#080818] animate-pulse" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">{member.name}</p>
          <p className="text-slate-500 text-xs mt-0.5 truncate">{member.designation}{member.zone && ` · ${member.zone}`}</p>
        </div>

        {/* Status badge */}
        {gc ? (
          <div className="flex items-center gap-3 shrink-0">
            <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${sm.bg} ${sm.cls} border-current/20`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
              {sm.label}
            </span>
            {expanded
              ? <ChevronUp className="w-4 h-4 text-slate-500" />
              : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>
        ) : (
          <span className="text-xs text-slate-600 font-semibold italic">No goals set</span>
        )}
      </div>

      {/* Expanded panel */}
      {expanded && gc && (
        <div className="relative border-t border-white/5 px-5 py-5 space-y-5">

          {/* Goals header */}
          <div className="flex items-center gap-3">
            <Target className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              {gc.goals?.length || 0} Goals · Total Weight {gc.total_weightage}%
            </span>
          </div>

          {/* Goals list */}
          <div className="space-y-3">
            {gc.goals?.map((g: any, gi: number) => (
              <div key={g.id} className={`bg-black/20 border border-white/6 rounded-xl overflow-hidden border-l-4 ${getGoalColor(gi).border} shadow-lg ${getGoalColor(gi).glow}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      {g.category && (
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${getGoalColor(gi).badge}`}>
                          {g.category}
                        </span>
                      )}
                      <p className="text-slate-200 font-semibold text-sm mt-1.5">{g.title}</p>
                      {g.kpi_metric && (
                        <p className="text-slate-500 text-xs mt-0.5">KPI: {g.kpi_metric} · Target: {g.target_value}</p>
                      )}
                    </div>
                    <span className="text-xs font-black text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-md shrink-0">
                      {g.weightage}%
                    </span>
                  </div>

                  {/* Self assessment */}
                  {(g.self_rating > 0 || g.self_completion_pct > 0) && (
                    <div className="flex items-center gap-4 flex-wrap mt-3 pt-3 border-t border-white/5 text-xs">
                      {g.self_rating > 0 && (
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <span className="text-slate-600">Self:</span>
                          <StarRating value={g.self_rating} readonly size="sm" />
                        </span>
                      )}
                      {g.self_completion_pct > 0 && (
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <span className="text-slate-600">Done:</span>
                          <span className="font-bold text-slate-300">{g.self_completion_pct}%</span>
                        </span>
                      )}
                      {g.achievement_description && (
                        <p className="w-full text-slate-500 italic text-xs mt-1">"{g.achievement_description}"</p>
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
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500/50 placeholder-slate-600 transition-colors"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Review submitted notice */}
          {gc.review_data && (
            <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
              gc.review_data.status === 'submitted'
                ? 'bg-blue-500/8 border-blue-500/20'
                : 'bg-emerald-500/8 border-emerald-500/20'
            }`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${gc.review_data.status === 'submitted' ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400'}`} />
              <div>
                <p className="text-xs font-bold text-slate-300">
                  Quarterly Review {gc.review_data.status === 'submitted' ? 'submitted — awaiting your rating' : gc.review_data.status_display}
                </p>
                {gc.review_data.final_weighted_score && (
                  <p className="text-xs text-amber-400 font-black mt-0.5">Final Score: {gc.review_data.final_weighted_score} / 5.00</p>
                )}
              </div>
            </div>
          )}

          {/* Overall remarks */}
          {reviewMode && (
            <div>
              <label className="text-slate-400 text-xs font-bold block mb-2 uppercase tracking-widest">Overall Remarks</label>
              <textarea
                value={reviewMode.remarks}
                onChange={e => setReviewMode((p: any) => ({ ...p, remarks: e.target.value }))}
                placeholder="Overall remarks to employee (optional)..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/50 resize-none transition-colors placeholder-slate-600"
              />
            </div>
          )}

          {/* Overall rating */}
          {reviewMode && gc.review_data?.status === 'submitted' && (
            <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/15 rounded-xl px-5 py-3.5">
              <div>
                <p className="text-sm font-bold text-slate-200">Overall Rating</p>
                <p className="text-xs text-slate-500 mt-0.5">Your holistic view of this employee</p>
              </div>
              <StarRating
                value={reviewMode.overall_rating || 0}
                onChange={v => setReviewMode((p: any) => ({ ...p, overall_rating: v }))}
                size="lg"
              />
            </div>
          )}

          {/* Section C – Competency Evaluation */}
          {reviewMode && gc.review_data?.status === 'submitted' && (
            <div className="rounded-2xl overflow-hidden border border-white/8">
              <div className="px-5 py-3.5 border-b border-white/8 bg-gradient-to-r from-amber-500/8 to-transparent flex items-center gap-3">
                <Shield className="w-4 h-4 text-amber-400" />
                <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Section C — Competency Evaluation</p>
              </div>
              <div className="divide-y divide-white/5">
                {COMPETENCIES.map((c, ci) => (
                  <div key={c.key} className="px-5 py-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-300 text-xs font-semibold flex-1">{c.label}</span>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map(n => {
                          const colors = ['border-sky-500/50 bg-sky-500/20 text-sky-300', 'border-blue-500/50 bg-blue-500/20 text-blue-300', 'border-violet-500/50 bg-violet-500/20 text-violet-300', 'border-amber-500/50 bg-amber-500/20 text-amber-300', 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'];
                          const active = (reviewMode.competency_ratings?.[c.key]?.marks || 0) >= n;
                          return (
                            <button key={n}
                              onClick={() => setReviewMode((p: any) => ({
                                ...p,
                                competency_ratings: { ...p.competency_ratings, [c.key]: { ...p.competency_ratings?.[c.key], marks: n } }
                              }))}
                              className={`w-8 h-8 rounded-lg text-xs font-black transition-all border ${
                                active ? colors[ci % colors.length] : 'bg-white/5 border-white/10 text-slate-600 hover:border-white/20 hover:text-slate-400'
                              }`}>
                              {n}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <input
                      placeholder="Remarks (optional)"
                      value={reviewMode.competency_ratings?.[c.key]?.manager_remarks || ''}
                      onChange={e => setReviewMode((p: any) => ({
                        ...p,
                        competency_ratings: { ...p.competency_ratings, [c.key]: { ...p.competency_ratings?.[c.key], manager_remarks: e.target.value } }
                      }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500/40 placeholder-slate-600 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section E – Manager Assessment */}
          {reviewMode && gc.review_data?.status === 'submitted' && (
            <div className="rounded-2xl overflow-hidden border border-white/8">
              <div className="px-5 py-3.5 border-b border-white/8 bg-gradient-to-r from-violet-500/8 to-transparent flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-violet-400" />
                <p className="text-xs font-bold uppercase tracking-widest text-violet-300">Section E — Manager Assessment</p>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { field: 'employee_strengths',      label: 'Employee Strengths',        ph: 'Key strengths observed this quarter...' },
                  { field: 'areas_of_improvement',    label: 'Areas of Improvement',      ph: 'Where can this employee grow further?' },
                  { field: 'development_plan',        label: 'Development Plan',          ph: 'Suggested actions / training for growth...' },
                  { field: 'promotion_recommendation',label: 'Promotion Recommendation',  ph: 'e.g. Recommended / Not Yet / Under Review' },
                  { field: 'increment_recommendation',label: 'Increment Recommendation',  ph: 'e.g. 10% / Standard / Exceptional' },
                ].map(({ field, label, ph }) => (
                  <div key={field}>
                    <label className="text-slate-400 text-xs font-bold block mb-1.5">{label}</label>
                    <input
                      placeholder={ph}
                      value={reviewMode[field] || ''}
                      onChange={e => setReviewMode((p: any) => ({ ...p, [field]: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder-slate-600 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons — Goal approval */}
          {status === 'submitted' && !reviewMode && (
            <div className="flex gap-3">
              <button
                onClick={() => { initRating(); setReviewMode((p: any) => ({ ...p, action: 'approved' })); }}
                className="flex-1 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-bold text-sm hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Approve Goals
              </button>
              <button
                onClick={() => { initRating(); setReviewMode((p: any) => ({ ...p, action: 'rejected' })); }}
                className="flex-1 py-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 font-bold text-sm hover:bg-rose-500/20 hover:border-rose-500/40 transition-all flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> Request Changes
              </button>
            </div>
          )}

          {reviewMode && status === 'submitted' && (
            <button
              onClick={() => submitGoalReview(reviewMode.action)}
              disabled={saving}
              className={`w-full py-4 rounded-xl font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg ${
                reviewMode.action === 'approved'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-500/20'
              }`}>
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                : reviewMode.action === 'approved'
                ? <><CheckCircle className="w-4 h-4" /> Confirm Approval</>
                : <><XCircle className="w-4 h-4" /> Send Back for Revision</>
              }
            </button>
          )}

          {/* Action button — Quarterly rating */}
          {status === 'manager_approved' && gc.review_data?.status === 'submitted' && !reviewMode && (
            <button onClick={initRating}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-amber-300 font-bold text-sm hover:from-amber-500/25 hover:to-orange-500/25 hover:border-amber-500/50 transition-all flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" /> Rate Quarterly Submission
            </button>
          )}

          {reviewMode && gc.review_data?.status === 'submitted' && (
            <button onClick={submitRatings} disabled={saving}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25">
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                : <><Award className="w-4 h-4" /> Submit All Ratings</>
              }
            </button>
          )}

          {reviewMode && (
            <button onClick={() => setReviewMode(null)}
              className="w-full py-2.5 text-slate-500 hover:text-slate-300 text-sm font-semibold transition-colors">
              Cancel
            </button>
          )}

          {msg && (
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold ${
              msg.ok
                ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/25 text-rose-300'
            }`}>
              {msg.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
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
    fetch(`${PERF_API}/cycles/active/`).then(r => r.json()).then(setCycles).catch(() => {});
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
    awaitingRating: team.filter(m =>
      m.goal_card?.status === 'manager_approved' && m.goal_card?.review_data?.status === 'submitted'
    ).length,
  };

  return (
    <div className="relative min-h-screen bg-[#080818] overflow-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-amber-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-700/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative p-4 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* ── Manager Header ── */}
          <div className="relative rounded-3xl overflow-hidden border border-amber-500/15">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 via-orange-900/8 to-transparent" />
            <div className="absolute top-0 right-0 w-64 h-32 bg-amber-500/5 rounded-full blur-3xl" />
            <div className="relative p-6 flex items-center gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-amber-500/40 rounded-2xl blur-xl scale-110" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-2xl font-black text-white shadow-2xl shadow-amber-500/30">
                  {manager.name?.[0]}
                </div>
              </div>
              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 uppercase tracking-widest">Manager</span>
                </div>
                <h2 className="text-xl font-extrabold text-white">{manager.name}</h2>
                <p className="text-amber-400/80 text-sm font-semibold mt-0.5">{manager.designation}</p>
                {manager.zone && <p className="text-slate-500 text-xs mt-1">{manager.zone}</p>}
              </div>
              {/* Team count */}
              <div className="text-right shrink-0">
                <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-amber-200">{team.length}</p>
                <p className="text-amber-400/80 text-xs font-bold uppercase tracking-widest mt-1">Direct Reports</p>
              </div>
            </div>
          </div>

          {/* ── Stats Row ── */}
          {selectedCycle && team.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Pending Review',  value: stats.pending,        color: 'text-blue-300',    bg: 'from-blue-500/8 to-transparent',    border: 'border-blue-500/15',    icon: Clock },
                { label: 'Approved',        value: stats.approved,       color: 'text-emerald-300', bg: 'from-emerald-500/8 to-transparent', border: 'border-emerald-500/15', icon: CheckCircle },
                { label: 'Awaiting Rating', value: stats.awaitingRating, color: 'text-amber-300',   bg: 'from-amber-500/8 to-transparent',   border: 'border-amber-500/15',   icon: Star },
                { label: 'No Goals Yet',    value: stats.noGoals,        color: 'text-slate-400',   bg: 'from-white/3 to-transparent',       border: 'border-white/8',        icon: Target },
              ].map(({ label, value, color, bg, border, icon: Icon }) => (
                <div key={label} className={`relative rounded-2xl overflow-hidden border ${border} p-4`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${bg}`} />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider leading-tight">{label}</p>
                      <Icon className={`w-3.5 h-3.5 ${color} opacity-60`} />
                    </div>
                    <p className={`text-3xl font-black ${color}`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Cycle selector ── */}
          <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-5">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">Select Quarter</p>
            <div className="flex flex-wrap gap-2">
              {cycles.length === 0 && (
                <p className="text-slate-600 text-sm font-semibold">No active cycles found.</p>
              )}
              {cycles.map(c => (
                <button key={c.id} onClick={() => setSelectedCycle(c)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                    selectedCycle?.id === c.id
                      ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/15 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10'
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
                <h3 className="text-white font-extrabold">Team — {selectedCycle.name}</h3>
                {!loading && team.length > 0 && (
                  <span className="text-xs text-slate-500 font-semibold">
                    ({stats.pending} need attention)
                  </span>
                )}
              </div>

              {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                  <p className="text-slate-500 text-sm font-semibold">Loading team data...</p>
                </div>
              )}

              {!loading && team.length === 0 && (
                <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-14 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="font-bold text-slate-400 text-base">No direct reports found</p>
                  <p className="text-slate-600 text-sm mt-2 max-w-xs mx-auto">
                    Employees must be imported with your Employee ID as their Reporting Manager ID.
                  </p>
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

          {!selectedCycle && (
            <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Target className="w-7 h-7 text-amber-400" />
              </div>
              <p className="text-slate-400 font-bold">Select a quarter above to view your team</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
