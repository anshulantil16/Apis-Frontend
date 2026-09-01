/* The admin seat: who is on the product, which cycle is running, and where
 * everybody has got to. Mirrors Appraisal Hub's admin — an employee master
 * uploaded from a sheet, cycles opened and locked by hand — because the two
 * products are run by the same person from the same spreadsheet.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Loader2, Upload, Plus, AlertCircle, CheckCircle2, Users, CalendarDays,
  Search, RotateCcw, Lock, Unlock,
} from 'lucide-react';
import {
  ApiError, allPlans, createCycle, getOverview, importEmployees, listEmployees,
  reopenPlan, updateCycle,
} from './api';
import type { Cycle, Employee, PlanSummary } from './api';
import { STATUS_TONE, d } from './api';

type Tab = 'overview' | 'people' | 'cycles';

const CYCLE_TONE: Record<Cycle['status'], string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  locked: 'bg-amber-50 text-amber-700 border-amber-200',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function AdminView({ actorName, cycleId }: { actorName: string; cycleId: number | null }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getOverview>> | null>(null);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [people, setPeople] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [newCycle, setNewCycle] = useState({ name: '', fiscal_year: '', submission_deadline: '' });

  const refresh = async () => {
    setLoading(true); setError('');
    try {
      const [o, p] = await Promise.all([
        getOverview(cycleId ?? undefined),
        allPlans(cycleId ?? undefined),
      ]);
      setOverview(o); setPlans(p);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load the admin view.');
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cycleId]);

  useEffect(() => {
    if (tab !== 'people') return;
    listEmployees(q).then(setPeople).catch(() => setPeople([]));
  }, [tab, q]);

  const upload = async (file: File) => {
    setBusy('import'); setError(''); setMsg('');
    try {
      const r = await importEmployees(file);
      setMsg(`${r.created} added, ${r.updated} updated.` +
        (r.error_count ? ` ${r.error_count} row${r.error_count === 1 ? '' : 's'} skipped.` : ''));
      if (r.errors.length) setError(r.errors.slice(0, 5).join(' '));
      await refresh();
      if (tab === 'people') listEmployees(q).then(setPeople);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not read that file.');
    }
    setBusy('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const addCycle = async () => {
    if (!newCycle.name.trim() || !newCycle.fiscal_year.trim()) {
      setError('A cycle needs a name and a fiscal year.'); return;
    }
    setBusy('cycle'); setError(''); setMsg('');
    try {
      await createCycle({ ...newCycle, submission_deadline: newCycle.submission_deadline || null,
                          status: 'draft', created_by: actorName });
      setNewCycle({ name: '', fiscal_year: '', submission_deadline: '' });
      setMsg('Cycle created. Open it when people should start filling goals.');
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create that cycle.');
    }
    setBusy('');
  };

  const setCycleStatus = async (c: Cycle, status: Cycle['status']) => {
    setBusy(`cycle-${c.id}`);
    try { await updateCycle(c.id, { status }); await refresh(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Could not update that cycle.'); }
    setBusy('');
  };

  const reopen = async (p: PlanSummary) => {
    setBusy(`reopen-${p.id}`);
    try {
      await reopenPlan(p.id, actorName, 'Reopened by admin.');
      setMsg(`${p.employee_name}'s sheet is back with them.`);
      await refresh();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not reopen that sheet.'); }
    setBusy('');
  };

  if (loading) {
    return <div className="min-h-[40vh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {(['overview', 'people', 'cycles'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-black capitalize transition-colors ${
              tab === t ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {msg && (
        <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-px shrink-0" />
          <p className="text-[13px] font-bold text-emerald-800">{msg}</p>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-rose-500 mt-px shrink-0" />
          <p className="text-[13px] font-bold text-rose-700">{error}</p>
        </div>
      )}

      {tab === 'overview' && overview && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              { l: 'People', v: overview.employees, sub: `${overview.managers} managers · ${overview.hods} HODs` },
              { l: 'Sheets started', v: overview.plans, sub: `${overview.not_started} not started` },
              { l: 'Agreed', v: overview.accepted, sub: 'goals locked in' },
              { l: 'Waiting on reviewers', v: (overview.by_status.submitted || 0) + (overview.by_status.with_hod || 0),
                sub: 'with manager or HOD' },
            ].map(k => (
              <div key={k.l} className="bg-white border border-slate-200 rounded-xl px-3.5 py-3 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{k.l}</p>
                <p className="text-xl font-black text-slate-800 leading-none mt-0.5">{k.v}</p>
                <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Where everyone is. One measure across stages, so one hue
              light-to-dark rather than a colour per stage. */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="font-black text-slate-700 text-sm mb-0.5">Where the sheets are</p>
            <p className="text-[11px] text-slate-400 font-semibold mb-3">
              Every goal sheet in this cycle, by the stage it is sitting at.
            </p>
            <div className="space-y-1.5">
              {Object.entries(overview.by_status).map(([status, count]) => {
                const total = overview.plans || 1;
                const pct = Math.round((count / total) * 100);
                const tone = STATUS_TONE[status as keyof typeof STATUS_TONE];
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="w-44 shrink-0 text-[11px] font-bold text-slate-600 truncate flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${tone?.dot || 'bg-slate-300'}`} />
                      {status.replace(/_/g, ' ')}
                    </span>
                    <span className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <span className="block h-full rounded-full"
                        style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%`,
                                 backgroundColor: pct >= 66 ? '#b45309' : pct >= 33 ? '#f59e0b' : '#fcd34d' }} />
                    </span>
                    <span className="w-16 shrink-0 text-right text-[11px] font-black text-slate-700 tabular-nums">
                      {count}<span className="text-slate-300"> · {pct}%</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <p className="font-black text-slate-700 text-sm">All goal sheets</p>
              <span className="text-[11px] font-bold text-slate-400">{plans.length}</span>
            </div>
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    {['Person', 'Status', 'Weightage', 'Versions', 'Submitted', ''].map(h => (
                      <th key={h} className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plans.map(p => {
                    const tone = STATUS_TONE[p.status];
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5">
                          <p className="font-bold text-[13px] text-slate-800">{p.employee_name}</p>
                          <p className="text-[11px] text-slate-400 font-semibold">{p.employee_code}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-full border ${tone.chip}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                            {p.status_label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[12px] font-black tabular-nums ${
                            p.total_weightage === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {p.total_weightage}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-[12px] font-bold text-slate-500 tabular-nums">
                          {p.version_count}
                        </td>
                        <td className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 tabular-nums">
                          {d(p.submitted_at)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {p.status === 'accepted' && (
                            <button onClick={() => reopen(p)} disabled={busy === `reopen-${p.id}`}
                              title="Send this agreed sheet back to the employee"
                              className="inline-flex items-center gap-1 text-[11px] font-black text-slate-500 hover:text-rose-600">
                              <RotateCcw className="w-3.5 h-3.5" /> Reopen
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {plans.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-slate-400 font-semibold">
                      No goal sheets yet.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'people' && (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <p className="font-black text-slate-700 text-sm mb-0.5">Employee master</p>
                <p className="text-[11px] text-slate-400 font-semibold">
                  Excel or CSV. Needs at least an Employee ID and a Name; it also reads
                  Email, Designation, Department, Reporting Manager ID, HOD ID and User Type.
                  Uploading again updates the people already here rather than duplicating them.
                </p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
              <button onClick={() => fileRef.current?.click()} disabled={busy === 'import'}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-[13px]">
                {busy === 'import' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload sheet
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search people…"
              className="w-full pl-9 pr-3 py-2 text-[13px] rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
              <table className="w-full min-w-[820px]">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    {['Employee', 'Role', 'Department', 'Reports to', 'HOD', 'Active'].map(h => (
                      <th key={h} className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {people.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5">
                        <p className="font-bold text-[13px] text-slate-800">{p.name}</p>
                        <p className="text-[11px] text-slate-400 font-semibold">{p.employee_id}{p.email && ` · ${p.email}`}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">
                          {p.user_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] font-semibold text-slate-600">{p.department || '—'}</td>
                      <td className="px-4 py-2.5 text-[12px] font-semibold text-slate-600">
                        {p.manager_name || p.reporting_manager_id || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] font-semibold text-slate-600">
                        {p.hod_name || p.hod_id || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
                          p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {p.is_active ? 'Active' : 'Off'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {people.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-slate-400 font-semibold">
                      <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      Nobody here yet — upload the employee sheet to get started.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'cycles' && overview && (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="font-black text-slate-700 text-sm mb-0.5">New cycle</p>
            <p className="text-[11px] text-slate-400 font-semibold mb-3">
              A cycle is the period goals are being set for. Nobody can fill anything in
              until one is <strong>open</strong>.
            </p>
            <div className="flex flex-wrap gap-2">
              <input value={newCycle.name} onChange={e => setNewCycle(c => ({ ...c, name: e.target.value }))}
                placeholder="Name, e.g. Annual Goals"
                className="flex-1 min-w-[180px] px-3 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
              <input value={newCycle.fiscal_year} onChange={e => setNewCycle(c => ({ ...c, fiscal_year: e.target.value }))}
                placeholder="FY, e.g. 2026-27"
                className="w-[140px] px-3 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
              <input type="date" value={newCycle.submission_deadline}
                onChange={e => setNewCycle(c => ({ ...c, submission_deadline: e.target.value }))}
                title="Submission deadline"
                className="w-[170px] px-3 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
              <button onClick={addCycle} disabled={busy === 'cycle'}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-[13px]">
                {busy === 'cycle' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {overview.cycles.map(c => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-sm">
                <CalendarDays className="w-4 h-4 text-slate-300 shrink-0" />
                <div className="flex-1 min-w-[180px]">
                  <p className="font-bold text-[13px] text-slate-800">{c.name}</p>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    {c.fiscal_year} · {c.plan_count} sheet{c.plan_count === 1 ? '' : 's'}
                    {c.submission_deadline && ` · due ${d(c.submission_deadline)}`}
                  </p>
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${CYCLE_TONE[c.status]}`}>
                  {c.status}
                </span>
                {c.status !== 'open' ? (
                  <button onClick={() => setCycleStatus(c, 'open')} disabled={busy === `cycle-${c.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[12px] border border-emerald-200">
                    <Unlock className="w-3.5 h-3.5" /> Open
                  </button>
                ) : (
                  <button onClick={() => setCycleStatus(c, 'locked')} disabled={busy === `cycle-${c.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[12px] border border-amber-200">
                    <Lock className="w-3.5 h-3.5" /> Lock
                  </button>
                )}
              </div>
            ))}
            {overview.cycles.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl py-12 text-center">
                <CalendarDays className="w-9 h-9 text-slate-200 mx-auto mb-3" />
                <p className="font-black text-slate-600 text-sm">No cycles yet</p>
                <p className="text-[12px] text-slate-400 font-semibold mt-1">
                  Create one above, then open it so people can start.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
