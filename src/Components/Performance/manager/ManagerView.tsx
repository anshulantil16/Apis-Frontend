import { useState, useEffect } from 'react';
import { Users, CheckCircle, XCircle, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { PERF_API } from '../../../Pages/PerformancePage';

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} onClick={() => !readonly && onChange?.(s)} disabled={readonly}
          className={`transition-transform ${readonly ? '' : 'hover:scale-110'}`}>
          <Star className={`w-4 h-4 ${s <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
        </button>
      ))}
    </div>
  );
}

export function ManagerView({ manager }: { manager: any }) {
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [reviewMode, setReviewMode] = useState<Record<number, any>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [msg, setMsg] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch(`${PERF_API}/cycles/active/`).then(r => r.json()).then(setCycles).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCycle) return;
    fetch(`${PERF_API}/manager/${manager.employee_id}/team/?cycle_id=${selectedCycle.id}`)
      .then(r => r.json()).then(setTeam).catch(() => {});
  }, [selectedCycle, manager.employee_id]);

  const toggle = (id: number) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const initReview = (gc: any) => {
    const ratings: Record<number, { manager_rating: number; manager_comments: string }> = {};
    gc.goals?.forEach((g: any) => { ratings[g.id] = { manager_rating: g.manager_rating || 0, manager_comments: g.manager_comments || '' }; });
    setReviewMode(p => ({ ...p, [gc.id]: { action: 'approved', remarks: '', goal_ratings: ratings } }));
  };

  const submitGoalReview = async (gc: any) => {
    const rv = reviewMode[gc.id];
    if (!rv) return;
    setSaving(p => ({ ...p, [gc.id]: true }));
    try {
      const payload = {
        action: rv.action,
        remarks: rv.remarks,
        manager_name: manager.name,
        goal_adjustments: [],
      };
      const res = await fetch(`${PERF_API}/goal-cards/${gc.id}/manager-review/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMsg(p => ({ ...p, [gc.id]: `✅ Goals ${rv.action}!` }));
        setTeam(prev => prev.map(m => m.goal_card?.id === gc.id
          ? { ...m, goal_card: { ...m.goal_card, status: rv.action === 'approved' ? 'manager_approved' : 'manager_rejected' } }
          : m));
      }
    } catch { setMsg(p => ({ ...p, [gc.id]: '❌ Failed.' })); }
    finally { setSaving(p => ({ ...p, [gc.id]: false })); }
  };

  const submitRatings = async (gc: any) => {
    const rv = reviewMode[gc.id];
    if (!rv) return;
    setSaving(p => ({ ...p, [gc.id]: true }));
    try {
      const goal_ratings = Object.entries(rv.goal_ratings || {}).map(([goal_id, r]: any) => ({
        goal_id: Number(goal_id), manager_rating: r.manager_rating, manager_comments: r.manager_comments,
      }));
      const res = await fetch(`${PERF_API}/reviews/${gc.id}/manager-rate/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_overall_rating: rv.overall_rating || 0, manager_review_comments: rv.remarks, manager_name: manager.name, goal_ratings }),
      });
      if (res.ok) setMsg(p => ({ ...p, [gc.id]: '✅ Ratings submitted!' }));
    } catch { setMsg(p => ({ ...p, [gc.id]: '❌ Failed.' })); }
    finally { setSaving(p => ({ ...p, [gc.id]: false })); }
  };

  const statusColor: Record<string, string> = {
    submitted: 'text-blue-400', manager_approved: 'text-emerald-400',
    manager_rejected: 'text-rose-400', draft: 'text-slate-500',
    hr_approved: 'text-violet-400', finalized: 'text-amber-400',
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-600/20 to-orange-800/20 border border-amber-500/20 rounded-3xl p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl font-black text-white">
            {manager.name?.[0]}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{manager.name}</h2>
            <p className="text-amber-300 text-sm font-semibold">{manager.designation} · Zone: {manager.zone}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-3xl font-black text-white">{team.length}</p>
            <p className="text-amber-300 text-sm font-bold">Direct Reports</p>
          </div>
        </div>

        {/* Cycle Selector */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Select Quarter</p>
          <div className="flex flex-wrap gap-3">
            {cycles.map(c => (
              <button key={c.id} onClick={() => setSelectedCycle(c)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  selectedCycle?.id === c.id ? 'bg-amber-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
                }`}>{c.name}</button>
            ))}
          </div>
        </div>

        {/* Team List */}
        {selectedCycle && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-amber-400" />
              <h3 className="text-white font-bold text-lg">Team — {selectedCycle.name}</h3>
            </div>

            {team.length === 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center text-slate-500 font-semibold">No direct reports found.</div>
            )}

            {team.map((member) => {
              const gc = member.goal_card;
              const isOpen = expanded[gc?.id];
              const rv = reviewMode[gc?.id];

              return (
                <div key={member.employee_id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="p-5 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-all" onClick={() => gc && toggle(gc.id)}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center font-black text-amber-300 text-sm">
                      {member.name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm">{member.name}</p>
                      <p className="text-slate-400 text-xs">{member.designation} · {member.zone}</p>
                    </div>
                    {gc ? (
                      <span className={`text-xs font-bold uppercase ${statusColor[gc.status] || 'text-slate-500'}`}>
                        {gc.status?.replace(/_/g,' ') || 'No Card'}
                      </span>
                    ) : <span className="text-xs text-slate-600 font-semibold">No Goals Set</span>}
                    {gc && (isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
                  </div>

                  {isOpen && gc && (
                    <div className="border-t border-white/5 p-5 space-y-4">
                      {/* Goals list */}
                      <h4 className="text-slate-300 font-bold text-sm">Goals ({gc.goals?.length || 0})</h4>
                      {gc.goals?.map((g: any) => (
                        <div key={g.id} className="bg-white/5 rounded-xl p-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <p className="text-white font-semibold text-sm">{g.title}</p>
                            <span className="text-xs font-bold text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-full">{g.weightage}%</span>
                          </div>
                          <p className="text-slate-400 text-xs">KPI: {g.kpi_metric || '—'} · Target: {g.target_value || '—'}</p>
                          {g.self_rating > 0 && (
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-slate-500 text-xs">Self Rating:</span>
                              <StarRating value={g.self_rating} readonly />
                              <span className="text-slate-400 text-xs">({g.self_completion_pct}% complete)</span>
                            </div>
                          )}
                          {/* Manager rating input */}
                          {rv && (
                            <div className="space-y-2 pt-2 border-t border-white/10">
                              <label className="text-slate-400 text-xs font-bold">Your Rating</label>
                              <StarRating value={rv.goal_ratings?.[g.id]?.manager_rating || 0}
                                onChange={v => setReviewMode(p => ({...p, [gc.id]: {...p[gc.id], goal_ratings: {...p[gc.id].goal_ratings, [g.id]: {...p[gc.id].goal_ratings?.[g.id], manager_rating: v}}}}))} />
                              <input placeholder="Comments..." value={rv.goal_ratings?.[g.id]?.manager_comments || ''}
                                onChange={e => setReviewMode(p => ({...p, [gc.id]: {...p[gc.id], goal_ratings: {...p[gc.id].goal_ratings, [g.id]: {...p[gc.id].goal_ratings?.[g.id], manager_comments: e.target.value}}}}))}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500/50" />
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Action area */}
                      {gc.status === 'submitted' && !rv && (
                        <div className="flex gap-3 pt-2">
                          <button onClick={() => { initReview(gc); setReviewMode(p => ({...p, [gc.id]: {...p[gc.id], action:'approved'}})); }}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 font-bold text-sm hover:bg-emerald-600/30 transition-all flex items-center justify-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Approve Goals
                          </button>
                          <button onClick={() => { initReview(gc); setReviewMode(p => ({...p, [gc.id]: {...p[gc.id], action:'rejected'}})); }}
                            className="flex-1 py-2.5 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-300 font-bold text-sm hover:bg-rose-600/30 transition-all flex items-center justify-center gap-2">
                            <XCircle className="w-4 h-4" /> Request Changes
                          </button>
                        </div>
                      )}

                      {rv && gc.status === 'submitted' && (
                        <div className="space-y-3">
                          <textarea value={rv.remarks} onChange={e => setReviewMode(p => ({...p, [gc.id]: {...p[gc.id], remarks: e.target.value}}))}
                            placeholder="Remarks to employee (optional)..." rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/50 resize-none" />
                          <button onClick={() => submitGoalReview(gc)} disabled={saving[gc.id]}
                            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${rv.action === 'approved' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'}`}>
                            {saving[gc.id] ? 'Submitting...' : rv.action === 'approved' ? '✅ Confirm Approval' : '⚠️ Send Back for Revision'}
                          </button>
                        </div>
                      )}

                      {/* Rate quarterly review */}
                      {gc.status === 'manager_approved' && gc.review?.status === 'submitted' && !rv && (
                        <button onClick={() => initReview(gc)}
                          className="w-full py-3 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-300 font-bold text-sm hover:bg-amber-600/30 flex items-center justify-center gap-2">
                          <Star className="w-4 h-4" /> Rate Quarterly Submission
                        </button>
                      )}
                      {rv && gc.review?.status === 'submitted' && (
                        <div className="space-y-3">
                          <textarea value={rv.remarks} onChange={e => setReviewMode(p => ({...p, [gc.id]: {...p[gc.id], remarks: e.target.value}}))}
                            placeholder="Overall review comments..." rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/50 resize-none" />
                          <button onClick={() => submitRatings(gc)} disabled={saving[gc.id]}
                            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm">
                            {saving[gc.id] ? 'Submitting...' : '⭐ Submit Ratings'}
                          </button>
                        </div>
                      )}

                      {msg[gc.id] && <p className="text-sm font-semibold text-center py-2 bg-white/5 rounded-xl text-slate-300">{msg[gc.id]}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
