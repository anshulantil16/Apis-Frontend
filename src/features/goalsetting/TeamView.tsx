/* A reviewer's list of people, and where each one's goals have got to.
 *
 * Shared by managers and HODs: both answer the same question ("who is waiting
 * on me, and who has not started?"), so only the endpoint differs. People with
 * no sheet at all are listed too — the gaps are usually what a reviewer is
 * actually chasing.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Users, AlertCircle, ChevronRight, Inbox } from 'lucide-react';
import { ApiError, hodTeam, managerTeam } from './api';
import type { Role, TeamRow } from './api';
import { STATUS_TONE, d } from './api';
import { Tile } from './chrome';

export function TeamView({ actorId, role, cycleId, cycleName, onOpen }: {
  actorId: string;
  role: Extract<Role, 'manager' | 'hod'>;
  cycleId: number | null;
  cycleName: string;
  onOpen: (employeeId: string) => void;
}) {
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [only, setOnly] = useState<'all' | 'mine' | 'none'>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    (role === 'manager' ? managerTeam : hodTeam)(actorId, cycleId ?? undefined)
      .then(r => { if (!cancelled) { setRows(r); setLoading(false); } })
      .catch(e => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : 'Could not load your team.');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [actorId, role, cycleId]);

  // "With me" means the stage this reviewer is meant to act on.
  const mineStatus = role === 'manager' ? 'submitted' : 'with_hod';

  const shown = useMemo(() => rows.filter(r => {
    if (only === 'mine' && r.plan?.status !== mineStatus) return false;
    if (only === 'none' && r.plan) return false;
    if (!q.trim()) return true;
    const hay = `${r.name} ${r.employee_id} ${r.designation} ${r.department}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  }), [rows, q, only, mineStatus]);

  const waiting = rows.filter(r => r.plan?.status === mineStatus).length;
  const notStarted = rows.filter(r => !r.plan).length;

  if (loading) {
    return <div className="min-h-[40vh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
    </div>;
  }

  if (error) {
    return <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
      <AlertCircle className="w-4 h-4 text-rose-500 mt-px shrink-0" />
      <p className="text-[13px] font-bold text-rose-700">{error}</p>
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Tile label="In your team" value={rows.length} sub={cycleName} icon={Users} delay={0} />
        <Tile label="Waiting on you" value={waiting} sub="ready to review" icon={Inbox}
          tone={waiting ? 'amber' : 'slate'} delay={70}
          onClick={() => setOnly(only === 'mine' ? 'all' : 'mine')} />
        <Tile label="Not started" value={notStarted} sub="no sheet yet" icon={AlertCircle}
          tone={notStarted ? 'rose' : 'slate'} delay={140}
          onClick={() => setOnly(only === 'none' ? 'all' : 'none')} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search by name, ID, department…"
            className="w-full pl-9 pr-3 py-2 text-[13px] rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          />
        </div>
        {([['all', 'Everyone'], ['mine', 'Waiting on me'], ['none', 'Not started']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setOnly(k)}
            className={`ih-underline px-3.5 py-2 rounded-xl text-[12px] font-bold border transition-all ${
              only === k ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/25'
                         : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="ih-inview bg-white border border-slate-200 rounded-2xl py-16 text-center">
          <Inbox className="ih-float w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="font-black text-slate-600 text-sm">Nothing here</p>
          <p className="text-[12px] text-slate-400 font-semibold mt-1">
            {only === 'mine' ? 'No sheets are waiting on you right now.'
              : only === 'none' ? 'Everyone has started.'
              : 'No one matches that search.'}
          </p>
        </div>
      ) : (
        <div className="ih-inview bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Person', 'Status', 'KRAs', 'Weightage', 'Submitted', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-2.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map(r => {
                  const p = r.plan;
                  const tone = p ? STATUS_TONE[p.status] : null;
                  return (
                    <tr key={r.employee_id}
                      className="hover:bg-amber-50/40 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="font-bold text-[13px] text-slate-800">{r.name}</p>
                        <p className="text-[11px] text-slate-400 font-semibold">
                          {r.employee_id}{r.designation && ` · ${r.designation}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {p && tone ? (
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-full border ${tone.chip}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                            {p.status_label}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">Not started</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-bold text-slate-600 tabular-nums">
                        {p ? `${p.kra_count} / ${p.kpi_count} KPIs` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {p ? (
                          <span className={`text-[12px] font-black tabular-nums ${
                            p.total_weightage === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {p.total_weightage}%
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-semibold text-slate-500 tabular-nums">
                        {p ? d(p.submitted_at) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => onOpen(r.employee_id)}
                          className="inline-flex items-center gap-1 text-[12px] font-black text-amber-700 hover:text-amber-800">
                          {p?.status === mineStatus ? 'Review' : 'Open'}
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
        <Users className="w-3.5 h-3.5" />
        People appear here from the employee master, by who reports to you.
      </p>
    </div>
  );
}
