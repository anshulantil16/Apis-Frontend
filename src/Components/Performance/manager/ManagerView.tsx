import { useState, useEffect } from 'react';
import {
  Users, CheckCircle, XCircle, Star, ChevronDown, ChevronUp,
  AlertCircle, Clock, Award, Target, Zap, TrendingUp, Shield,
} from 'lucide-react';
import { PERF_API } from '../../../features/performance/PerformancePage';
import { TOOL_STYLES } from '../../toolStyles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GOAL_COLORS = [
  { border: 'border-l-amber-400',   badge: 'text-amber-600 bg-amber-50 border-amber-200',   glow: 'shadow-amber-500/10' },
  { border: 'border-l-sky-400',     badge: 'text-sky-600 bg-sky-50 border-sky-200',         glow: 'shadow-sky-500/10' },
  { border: 'border-l-violet-400',  badge: 'text-violet-600 bg-violet-50 border-violet-200', glow: 'shadow-violet-500/10' },
  { border: 'border-l-emerald-400', badge: 'text-emerald-600 bg-emerald-50 border-emerald-200', glow: 'shadow-emerald-500/10' },
  { border: 'border-l-rose-400',    badge: 'text-rose-600 bg-rose-50 border-rose-200',      glow: 'shadow-rose-500/10' },
];
const getGoalColor = (i: number) => GOAL_COLORS[i % GOAL_COLORS.length];

const STATUS_META: Record<string, { cls: string; dot: string; label: string; bg: string }> = {
  draft:            { cls: 'text-slate-500',   dot: 'bg-slate-400',              label: 'Draft',              bg: 'bg-slate-100' },
  submitted:        { cls: 'text-blue-600',    dot: 'bg-blue-500 animate-pulse', label: 'Awaiting Review',    bg: 'bg-blue-50' },
  manager_approved: { cls: 'text-emerald-600', dot: 'bg-emerald-500',            label: 'Approved',           bg: 'bg-emerald-50' },
  manager_rejected: { cls: 'text-rose-600',    dot: 'bg-rose-500',               label: 'Changes Requested',  bg: 'bg-rose-50' },
  hr_approved:      { cls: 'text-violet-600',  dot: 'bg-violet-500',             label: 'HR Approved',        bg: 'bg-violet-50' },
  finalized:        { cls: 'text-amber-600',   dot: 'bg-amber-500',              label: 'Finalized',          bg: 'bg-amber-50' },
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
            s <= (hover || value) ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
          }`} />
        </button>
      ))}
    </div>
  );
}

// ─── Team Member Card ─────────────────────────────────────────────────────────

function MemberCard({ member, manager, onRated, delay = 0 }: { member: any; manager: any; onRated: () => void; delay?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [reviewMode, setReviewMode] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const gc = member.goal_card;
  const status = gc?.status;
  const sm = STATUS_META[status] || { cls: 'text-slate-500', dot: 'bg-slate-400', label: 'No Goals', bg: 'bg-slate-100' };

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
    <div className={`relative rounded-2xl overflow-hidden border shadow-sm transition-all duration-300 ih-inview tp-tilt ${
      status === 'submitted'
        ? 'border-blue-200 shadow-lg shadow-blue-500/5'
        : status === 'manager_rejected'
        ? 'border-rose-200'
        : 'border-slate-200'
    }`} style={{ animationDelay: `${delay}ms` }}>
      {/* Subtle background */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl" />

      {/* Member row */}
      <div
        className="relative flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-all select-none"
        onClick={() => gc && setExpanded(e => !e)}>

        {/* Avatar */}
        <div className="relative shrink-0 tp-pop-in">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center font-black text-white text-base shadow-lg`}>
            {member.name?.[0]}
          </div>
          {status === 'submitted' && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white tp-pulse-glow" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-slate-900 font-bold text-sm">{member.name}</p>
          <p className="text-slate-500 text-xs mt-0.5 truncate">{member.designation}{member.zone && ` · ${member.zone}`}</p>
        </div>

        {/* Status badge */}
        {gc ? (
          <div className="flex items-center gap-3 shrink-0">
            <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border tp-pop-in ${sm.bg} ${sm.cls} border-current/20`}>
              <span className={`w-1.5 h-1.5 rounded-full tp-pulse-glow ${sm.dot}`} />
              {sm.label}
            </span>
            {expanded
              ? <ChevronUp className="w-4 h-4 text-slate-500" />
              : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-semibold italic">No goals set</span>
        )}
      </div>

      {/* Expanded panel */}
      {expanded && gc && (
        <div className="relative border-t border-slate-200 px-5 py-5 space-y-5">

          {/* Goals header */}
          <div className="flex items-center gap-3">
            <Target className="w-4 h-4 text-amber-600" />
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">
              {gc.goals?.length || 0} Goals · Total Weight {gc.total_weightage}%
            </span>
          </div>

          {/* Goals list */}
          <div className="space-y-3">
            {gc.goals?.map((g: any, gi: number) => (
              <div key={g.id} className={`bg-slate-50 border border-slate-200 rounded-xl overflow-hidden border-l-4 ih-inview ${getGoalColor(gi).border} shadow-sm ${getGoalColor(gi).glow}`} style={{ animationDelay: `${gi * 60}ms` }}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      {g.category && (
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${getGoalColor(gi).badge}`}>
                          {g.category}
                        </span>
                      )}
                      <p className="text-slate-800 font-semibold text-sm mt-1.5">{g.title}</p>
                      {g.kpi_metric && (
                        <p className="text-slate-500 text-xs mt-0.5">KPI: {g.kpi_metric} · Target: {g.target_value}</p>
                      )}
                    </div>
                    <span className="text-xs font-black text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md shrink-0">
                      {g.weightage}%
                    </span>
                  </div>

                  {/* Self assessment */}
                  {(g.self_rating > 0 || g.self_completion_pct > 0) && (
                    <div className="flex items-center gap-4 flex-wrap mt-3 pt-3 border-t border-slate-200 text-xs">
                      {g.self_rating > 0 && (
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <span className="text-slate-400">Self:</span>
                          <StarRating value={g.self_rating} readonly size="sm" />
                        </span>
                      )}
                      {g.self_completion_pct > 0 && (
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <span className="text-slate-400">Done:</span>
                          <span className="font-bold text-slate-700">{g.self_completion_pct}%</span>
                        </span>
                      )}
                      {g.achievement_description && (
                        <p className="w-full text-slate-500 italic text-xs mt-1">"{g.achievement_description}"</p>
                      )}
                    </div>
                  )}

                  {/* Manager rating input */}
                  {reviewMode && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-600">Your Rating</span>
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
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-amber-400 placeholder-slate-400 transition-colors"
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
                ? 'bg-blue-50 border-blue-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${gc.review_data.status === 'submitted' ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
              <div>
                <p className="text-xs font-bold text-slate-700">
                  Quarterly Review {gc.review_data.status === 'submitted' ? 'submitted — awaiting your rating' : gc.review_data.status_display}
                </p>
                {gc.review_data.final_weighted_score && (
                  <p className="text-xs text-amber-600 font-black mt-0.5">Final Score: {gc.review_data.final_weighted_score} / 5.00</p>
                )}
              </div>
            </div>
          )}

          {/* Overall remarks */}
          {reviewMode && (
            <div>
              <label className="text-slate-500 text-xs font-bold block mb-2 uppercase tracking-widest">Overall Remarks</label>
              <textarea
                value={reviewMode.remarks}
                onChange={e => setReviewMode((p: any) => ({ ...p, remarks: e.target.value }))}
                placeholder="Overall remarks to employee (optional)..."
                rows={2}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-amber-400 resize-none transition-colors placeholder-slate-400"
              />
            </div>
          )}

          {/* Overall rating */}
          {reviewMode && gc.review_data?.status === 'submitted' && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5">
              <div>
                <p className="text-sm font-bold text-slate-800">Overall Rating</p>
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
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-transparent flex items-center gap-3">
                <Shield className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Section C — Competency Evaluation</p>
              </div>
              <div className="divide-y divide-slate-200">
                {COMPETENCIES.map((c, ci) => (
                  <div key={c.key} className="px-5 py-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-700 text-xs font-semibold flex-1">{c.label}</span>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map(n => {
                          const colors = ['border-sky-200 bg-sky-50 text-sky-600', 'border-blue-200 bg-blue-50 text-blue-600', 'border-violet-200 bg-violet-50 text-violet-600', 'border-amber-200 bg-amber-50 text-amber-600', 'border-emerald-200 bg-emerald-50 text-emerald-600'];
                          const active = (reviewMode.competency_ratings?.[c.key]?.marks || 0) >= n;
                          return (
                            <button key={n}
                              onClick={() => setReviewMode((p: any) => ({
                                ...p,
                                competency_ratings: { ...p.competency_ratings, [c.key]: { ...p.competency_ratings?.[c.key], marks: n } }
                              }))}
                              className={`w-8 h-8 rounded-lg text-xs font-black transition-all border ${
                                active ? colors[ci % colors.length] : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
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
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-amber-400 placeholder-slate-400 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section E – Manager Assessment */}
          {reviewMode && gc.review_data?.status === 'submitted' && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-transparent flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-violet-600" />
                <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Section E — Manager Assessment</p>
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
                    <label className="text-slate-500 text-xs font-bold block mb-1.5">{label}</label>
                    <input
                      placeholder={ph}
                      value={reviewMode[field] || ''}
                      onChange={e => setReviewMode((p: any) => ({ ...p, [field]: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-violet-400 placeholder-slate-400 transition-colors"
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
                className="tp-sheen flex-1 py-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm hover:bg-emerald-100 hover:border-emerald-300 transition-all flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Approve Goals
              </button>
              <button
                onClick={() => { initRating(); setReviewMode((p: any) => ({ ...p, action: 'rejected' })); }}
                className="tp-sheen flex-1 py-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-sm hover:bg-rose-100 hover:border-rose-300 transition-all flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> Request Changes
              </button>
            </div>
          )}

          {reviewMode && status === 'submitted' && (
            <button
              onClick={() => submitGoalReview(reviewMode.action)}
              disabled={saving}
              className={`tp-sheen w-full py-4 rounded-xl font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg ${
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
              className="tp-sheen w-full py-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-700 font-bold text-sm hover:from-amber-100 hover:to-orange-100 hover:border-amber-300 transition-all flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" /> Rate Quarterly Submission
            </button>
          )}

          {reviewMode && gc.review_data?.status === 'submitted' && (
            <button onClick={submitRatings} disabled={saving}
              className="tp-sheen w-full py-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25">
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                : <><Award className="w-4 h-4" /> Submit All Ratings</>
              }
            </button>
          )}

          {reviewMode && (
            <button onClick={() => setReviewMode(null)}
              className="w-full py-2.5 text-slate-500 hover:text-slate-800 text-sm font-semibold transition-colors">
              Cancel
            </button>
          )}

          {msg && (
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold ${
              msg.ok
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border border-rose-200 text-rose-700'
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
    <div className="relative min-h-full overflow-hidden">
      <style>{TOOL_STYLES}</style>
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-amber-300/25 rounded-full blur-[120px] tp-drift" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-300/20 rounded-full blur-[100px] tp-drift" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative p-4 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* ── Manager Header ── */}
          <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-white/80 backdrop-blur-xl ih-inview">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-100/70 via-orange-50/50 to-transparent" />
            <div className="absolute top-0 right-0 w-64 h-32 bg-amber-200/40 rounded-full blur-3xl" />
            <div className="relative p-6 flex items-center gap-5">
              {/* Avatar */}
              <div className="relative shrink-0 tp-pop-in">
                <div className="absolute inset-0 bg-amber-300/50 rounded-2xl blur-xl scale-110" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-2xl font-black text-white shadow-2xl shadow-amber-500/30">
                  {manager.name?.[0]}
                </div>
              </div>
              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 uppercase tracking-widest">Manager</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">{manager.name}</h2>
                <p className="text-amber-600 text-sm font-semibold mt-0.5">{manager.designation}</p>
                {manager.zone && <p className="text-slate-500 text-xs mt-1">{manager.zone}</p>}
              </div>
              {/* Team count */}
              <div className="text-right shrink-0">
                <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-500 to-orange-600">{team.length}</p>
                <p className="text-amber-600 text-xs font-bold uppercase tracking-widest mt-1">Direct Reports</p>
              </div>
            </div>
          </div>

          {/* ── Stats Row ── */}
          {selectedCycle && team.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Pending Review',  value: stats.pending,        color: 'text-blue-600',    bg: 'from-blue-50 to-transparent',    border: 'border-blue-200',    icon: Clock },
                { label: 'Approved',        value: stats.approved,       color: 'text-emerald-600', bg: 'from-emerald-50 to-transparent', border: 'border-emerald-200', icon: CheckCircle },
                { label: 'Awaiting Rating', value: stats.awaitingRating, color: 'text-amber-600',   bg: 'from-amber-50 to-transparent',   border: 'border-amber-200',   icon: Star },
                { label: 'No Goals Yet',    value: stats.noGoals,        color: 'text-slate-500',   bg: 'from-slate-50 to-transparent',   border: 'border-slate-200',   icon: Target },
              ].map(({ label, value, color, bg, border, icon: Icon }, si) => (
                <div key={label} className={`relative rounded-2xl overflow-hidden border bg-white/80 backdrop-blur-xl shadow-sm ih-inview tp-tilt ${border} p-4`} style={{ animationDelay: `${si * 70}ms` }}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${bg}`} />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider leading-tight">{label}</p>
                      <Icon className={`w-3.5 h-3.5 ${color} opacity-70`} />
                    </div>
                    <p className={`text-3xl font-black ${color} tp-pop-in`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Cycle selector ── */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm rounded-2xl p-5 ih-inview">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">Select Quarter</p>
            <div className="flex flex-wrap gap-2">
              {cycles.length === 0 && (
                <p className="text-slate-500 text-sm font-semibold">No active cycles found.</p>
              )}
              {cycles.map(c => (
                <button key={c.id} onClick={() => setSelectedCycle(c)}
                  className={`tp-tilt px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                    selectedCycle?.id === c.id
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-700 shadow-sm shadow-amber-500/10'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-700'
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
                <Users className="w-4 h-4 text-amber-600" />
                <h3 className="text-slate-900 font-extrabold">Team — {selectedCycle.name}</h3>
                {!loading && team.length > 0 && (
                  <span className="text-xs text-slate-500 font-semibold">
                    ({stats.pending} need attention)
                  </span>
                )}
              </div>

              {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
                  <p className="text-slate-500 text-sm font-semibold">Loading team data...</p>
                </div>
              )}

              {!loading && team.length === 0 && (
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm rounded-2xl p-14 text-center ih-inview">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="font-bold text-slate-700 text-base">No direct reports found</p>
                  <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
                    Employees must be imported with your Employee ID as their Reporting Manager ID.
                  </p>
                </div>
              )}

              {!loading && team.map((member, mi) => (
                <MemberCard
                  key={member.employee_id}
                  member={member}
                  manager={manager}
                  onRated={loadTeam}
                  delay={Math.min(mi, 8) * 50}
                />
              ))}
            </div>
          )}

          {!selectedCycle && (
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm rounded-2xl p-14 text-center ih-inview">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
                <Target className="w-7 h-7 text-amber-600" />
              </div>
              <p className="text-slate-600 font-bold">Select a quarter above to view your team</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
