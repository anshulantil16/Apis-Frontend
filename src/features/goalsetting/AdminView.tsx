/* The admin seat: who is on the product, which cycle is running, and where
 * everybody has got to. Mirrors Appraisal Hub's admin — an employee master
 * uploaded from a sheet, cycles opened and locked by hand — because the two
 * products are run by the same person from the same spreadsheet.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Loader2, Upload, Plus, AlertCircle, CheckCircle2, Users, CalendarDays,
  Search, RotateCcw, Lock, Unlock, Pencil, X, Activity as ActivityIcon,
  ChevronRight, UserPlus, Download, Trash2, ShieldAlert, FileDown,
} from 'lucide-react';
import {
  ApiError, allPlans, createCycle, createEmployee, downloadTemplate, getActivity,
  downloadExport, getOverview, getResetInfo, importEmployees, listEmployees,
  reopenPlan, resetData, updateCycle, updateEmployee,
} from './api';
import type { Activity, Cycle, Employee, PlanSummary, ResetInfo, ResetScope } from './api';
import { ROLE_LABEL, STATUS_TONE, d, dt } from './api';
import { Tile } from './chrome';

type Tab = 'overview' | 'people' | 'cycles' | 'activity';

const CYCLE_TONE: Record<Cycle['status'], string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  locked: 'bg-amber-50 text-amber-700 border-amber-200',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
};

/* Everything about one person, editable. A drawer rather than inline fields:
   these are eleven related values, and changing a reporting line in isolation
   with no sight of the rest is how someone ends up reporting to themselves. */
function PersonDrawer({ person, onClose, onSaved }: {
  person: Employee | 'new'; onClose: () => void; onSaved: (msg: string) => void;
}) {
  const isNew = person === 'new';
  const [form, setForm] = useState<Partial<Employee>>(
    isNew ? { employee_id: '', name: '', email: '', designation: '', department: '',
              zone: '', reporting_manager_id: '', hod_id: '', user_type: 'employee',
              is_active: true }
          : { ...(person as Employee) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof Employee, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.employee_id?.trim() || !form.name?.trim()) {
      setError('An Employee ID and a name are both required.'); return;
    }
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createEmployee(form);
        onSaved(`${form.name} added.`);
      } else {
        await updateEmployee((person as Employee).employee_id, form);
        onSaved(`${form.name} updated.`);
      }
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save.');
    }
    setBusy(false);
  };

  const field = (label: string, key: keyof Employee, placeholder = '', locked = false) => (
    <label className="block">
      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
        {label}
      </span>
      <input value={(form[key] as string) ?? ''} disabled={locked} placeholder={placeholder}
        onChange={e => set(key, e.target.value)}
        className="w-full px-3 py-2 text-[13px] rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30" onClick={onClose}>
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-800 text-sm truncate">
              {isNew ? 'Add a person' : (person as Employee).name}
            </p>
            <p className="text-[11px] text-slate-400 font-semibold">
              {isNew ? 'For the joiner who missed the upload'
                     : (person as Employee).employee_id}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {field('Employee ID', 'employee_id', 'APIS1234', !isNew)}
          {!isNew && (
            <p className="text-[10px] text-slate-400 font-semibold -mt-2">
              The ID is how sheets, managers and HODs point at this person, so it is
              not editable here.
            </p>
          )}
          {field('Name', 'name')}
          {field('Email', 'email', 'where the sign-in code goes')}
          {field('Designation', 'designation')}
          {field('Department', 'department')}
          {field('Zone', 'zone')}
          {field('Reporting manager ID', 'reporting_manager_id', 'Employee ID of their manager')}
          {field('HOD ID', 'hod_id', 'Employee ID of their HOD')}

          <label className="block">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Role
            </span>
            <select value={form.user_type ?? 'employee'}
              onChange={e => set('user_type', e.target.value)}
              className="w-full px-3 py-2 text-[13px] rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40">
              {(['employee', 'manager', 'hod', 'admin'] as const).map(r => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
            <span className="block text-[10px] text-slate-400 font-semibold mt-1">
              Admin hands this person the whole console, including the power to edit
              anyone else&apos;s goals.
            </span>
          </label>

          {!isNew && (
            <label className="flex items-center gap-2.5 pt-1">
              <input type="checkbox" checked={!!form.is_active}
                onChange={e => set('is_active', e.target.checked)}
                className="w-4 h-4 accent-amber-500" />
              <span className="text-[12px] font-bold text-slate-600">
                Active &mdash; can sign in and be given goals
              </span>
            </label>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 mt-px shrink-0" />
              <p className="text-[12px] font-bold text-rose-700">{error}</p>
            </div>
          )}

          <button onClick={submit} disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-[14px]">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isNew ? 'Add this person' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Clearing the data.
 *
 * Behind a typed phrase rather than a confirm() dialog: clicking OK on a dialog
 * is muscle memory, and this deletes the version history — the one thing the
 * product promises is permanent. The counts are fetched first so the number
 * being destroyed is on screen before the button is live.
 *
 * Scoped, unlike Appraisal Hub's all-or-nothing wipe. The common case after a
 * trial run is "throw away the sheets but keep the people I just uploaded",
 * and an all-or-nothing reset makes someone re-upload the master to carry on.
 */
function DangerZone({ onDone }: { onDone: (msg: string) => void }) {
  const [info, setInfo] = useState<ResetInfo | null>(null);
  const [scope, setScope] = useState<ResetScope | ''>('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const PHRASE = 'RESET_CONFIRMED';

  useEffect(() => { getResetInfo().then(setInfo).catch(() => setInfo(null)); }, []);

  const run = async () => {
    if (!scope || typed !== PHRASE) return;
    setBusy(true); setError('');
    try {
      const r = await resetData(scope, PHRASE);
      const gone = Object.entries(r.removed)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${n} ${k}`)
        .join(', ');
      onDone(`${r.message}${gone ? ` Removed ${gone}.` : ''}`);
      setScope(''); setTyped('');
      getResetInfo().then(setInfo).catch(() => {});
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not clear the data.');
    }
    setBusy(false);
  };

  if (!info) return null;

  const WHAT: Record<ResetScope, { title: string; detail: string; count: number }> = {
    plans: {
      title: 'Clear the goal sheets',
      detail: 'Every sheet, every version and the whole history. People and cycles stay.',
      count: info.counts.plans,
    },
    people: {
      title: 'Clear the employee list',
      detail: 'Everyone except the administrator. Sheets and cycles stay.',
      count: info.counts.people,
    },
    all: {
      title: 'Clear everything',
      detail: 'Sheets, history, people and cycles. The product goes back to empty.',
      count: info.counts.plans + info.counts.people + info.counts.cycles,
    },
  };

  return (
    <div className="ih-inview bg-white border-2 border-dashed border-rose-200 rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
          <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
        </span>
        <div>
          <p className="font-black text-slate-800 text-sm">Clear the data</p>
          <p className="text-[11px] text-slate-400 font-semibold">
            There is no undo. This deletes the version history too — the record of who
            changed whose goals.
          </p>
        </div>
      </div>

      <p className="text-[11px] font-semibold text-slate-400 mt-3 mb-2">
        Right now: {info.counts.plans} goal sheet{info.counts.plans === 1 ? '' : 's'},{' '}
        {info.counts.versions} version{info.counts.versions === 1 ? '' : 's'},{' '}
        {info.counts.people} {info.counts.people === 1 ? 'person' : 'people'},{' '}
        {info.counts.cycles} cycle{info.counts.cycles === 1 ? '' : 's'}.
      </p>

      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(WHAT) as ResetScope[]).map(k => (
          <button key={k} onClick={() => { setScope(scope === k ? '' : k); setTyped(''); }}
            className={`text-left rounded-xl border px-3.5 py-3 transition-all ${
              scope === k ? 'border-rose-400 bg-rose-50 shadow-md shadow-rose-500/10'
                          : 'border-slate-200 bg-white hover:border-rose-200'}`}>
            <p className="font-black text-[12px] text-slate-800">{WHAT[k].title}</p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5 leading-snug">
              {WHAT[k].detail}
            </p>
          </button>
        ))}
      </div>

      {scope && (
        <div className="ih-fade mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3.5">
          <p className="text-[12px] font-bold text-rose-800 mb-2">
            To confirm, type <code className="font-black bg-white px-1.5 py-0.5 rounded">{PHRASE}</code>
          </p>
          <div className="flex flex-wrap gap-2">
            <input value={typed} onChange={e => setTyped(e.target.value)} autoFocus
              placeholder={PHRASE}
              className="flex-1 min-w-[180px] px-3 py-2 text-[13px] font-mono rounded-xl border border-rose-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400/40" />
            <button onClick={run} disabled={busy || typed !== PHRASE}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-[13px]">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {WHAT[scope].title}
            </button>
          </div>
          {error && <p className="text-[12px] font-bold text-rose-700 mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}

const ACTION_WORDS: Record<string, string> = {
  submit: 'submitted their goals',
  to_hod: 'sent a sheet to the HOD',
  manager_return: 'sent a sheet back',
  to_employee: 'sent a sheet back to the employee',
  hod_return: 'sent a sheet back',
  accept: 'accepted their goals',
  employee_return: 'asked for changes',
  reopened: 'reopened a sheet',
  admin_moved: 'moved a sheet',
  admin_edit: 'edited a sheet',
};

export function AdminView({ actorName, cycleId, onOpenPlan }: {
  actorName: string; cycleId: number | null; onOpenPlan: (employeeId: string) => void;
}) {
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
  const [editing, setEditing] = useState<Employee | 'new' | null>(null);
  const [feed, setFeed] = useState<Activity[]>([]);

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

  const loadPeople = () => listEmployees(q).then(setPeople).catch(() => setPeople([]));

  useEffect(() => {
    if (tab !== 'people') return;
    loadPeople();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [tab, q]);

  useEffect(() => {
    if (tab !== 'activity') return;
    getActivity(cycleId ?? undefined).then(setFeed).catch(() => setFeed([]));
  }, [tab, cycleId]);

  const exportGoals = async (status: 'accepted' | 'all') => {
    setBusy('export'); setError('');
    try { await downloadExport(cycleId ?? undefined, status); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Could not build the export.'); }
    setBusy('');
  };

  const getTemplate = async () => {
    setBusy('template'); setError('');
    try { await downloadTemplate(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Could not build the template.'); }
    setBusy('');
  };

  const upload = async (file: File) => {
    setBusy('import'); setError(''); setMsg('');
    try {
      const r = await importEmployees(file);
      setMsg(`${r.created} added, ${r.updated} updated.`
        + (r.skipped_samples ? ` ${r.skipped_samples} SAMPLE row${r.skipped_samples === 1 ? '' : 's'} ignored.` : '')
        + (r.error_count ? ` ${r.error_count} row${r.error_count === 1 ? '' : 's'} skipped.` : ''));
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
        {(['overview', 'people', 'cycles', 'activity'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`ih-underline px-3.5 py-1.5 rounded-lg text-[12px] font-black capitalize transition-all ${
              tab === t ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25' : 'text-slate-500 hover:bg-slate-50'}`}>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <Tile label="People" value={overview.employees} icon={Users} delay={0}
              sub={`${overview.managers} managers · ${overview.hods} HODs`} />
            <Tile label="Sheets started" value={overview.plans} icon={CalendarDays} delay={70}
              sub={`${overview.not_started} not started`}
              tone={overview.not_started ? 'amber' : 'slate'} />
            <Tile label="Agreed" value={overview.accepted} icon={CheckCircle2} delay={140}
              sub="goals locked in" tone={overview.accepted ? 'emerald' : 'slate'} />
            <Tile label="Waiting on reviewers" icon={ActivityIcon} delay={210}
              value={(overview.by_status.submitted || 0) + (overview.by_status.with_hod || 0)}
              sub="with manager or HOD" tone="violet" />
          </div>

          {/* Where everyone is. One measure across stages, so one hue
              light-to-dark rather than a colour per stage. */}
          <div className="ih-inview bg-white border border-slate-200 rounded-2xl p-4">
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
                                 backgroundColor: pct >= 66 ? '#b45309' : pct >= 33 ? '#f59e0b' : '#fcd34d',
                                 transition: 'width .9s cubic-bezier(.2,.8,.2,1)' }} />
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
            <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-700 text-sm">All goal sheets</p>
                <p className="text-[11px] text-slate-400 font-semibold">
                  {plans.length} in this cycle
                </p>
              </div>
              <button onClick={() => exportGoals('accepted')} disabled={busy === 'export'}
                title="Every agreed sheet, one row per KPI, plus a summary and who is still outstanding"
                className="ih-sheen flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-[12px] shadow-md shadow-amber-500/25">
                {busy === 'export' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Download final goals
              </button>
              <button onClick={() => exportGoals('all')} disabled={busy === 'export'}
                title="Include sheets that are still being reviewed"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 font-bold text-[12px] border border-slate-200">
                <FileDown className="w-4 h-4" /> Everything
              </button>
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
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {p.status === 'accepted' && (
                            <button onClick={() => reopen(p)} disabled={busy === `reopen-${p.id}`}
                              title="Send this agreed sheet back to the employee"
                              className="inline-flex items-center gap-1 text-[11px] font-black text-slate-400 hover:text-rose-600 mr-3">
                              <RotateCcw className="w-3.5 h-3.5" /> Reopen
                            </button>
                          )}
                          <button onClick={() => onOpenPlan(p.employee_code)}
                            title="Open this sheet — you can edit it at any stage"
                            className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 hover:text-amber-800">
                            Open <ChevronRight className="w-3.5 h-3.5" />
                          </button>
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
                  Download the template, fill it in, upload it back. Every heading carries
                  a note explaining what it holds, and the second sheet has a worked example.
                  Uploading again updates the people already here rather than duplicating them.
                </p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
              <div className="flex gap-2">
                <button onClick={getTemplate} disabled={busy === 'template'}
                  className="ih-sheen flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-[13px] border border-slate-200 shadow-sm">
                  {busy === 'template' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Template
                </button>
                <button onClick={() => setEditing('new')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-[13px] border border-slate-200 shadow-sm">
                  <UserPlus className="w-4 h-4" /> Add one
                </button>
                <button onClick={() => fileRef.current?.click()} disabled={busy === 'import'}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-[13px]">
                  {busy === 'import' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload sheet
                </button>
              </div>
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
                    {['Employee', 'Role', 'Department', 'Reports to', 'HOD', 'Active', ''].map(h => (
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
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => setEditing(p)} title="Edit this person"
                          className="inline-flex items-center gap-1 text-[11px] font-black text-slate-400 hover:text-amber-700">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {people.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-[12px] text-slate-400 font-semibold">
                      <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      Nobody here yet — upload the employee sheet, or add someone by hand.
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
                <CalendarDays className="ih-float w-9 h-9 text-slate-200 mx-auto mb-3" />
                <p className="font-black text-slate-600 text-sm">No cycles yet</p>
                <p className="text-[12px] text-slate-400 font-semibold mt-1">
                  Create one above, then open it so people can start.
                </p>
              </div>
            )}
          </div>

          <DangerZone onDone={m => { setMsg(m); refresh(); }} />
        </>
      )}

      {/* Every step anyone has taken, newest first. Per-sheet history answers
          one case; this answers "what has actually been happening?" — the
          manager returning sheets nobody asked them to, the HOD who has not
          touched theirs in a fortnight. */}
      {tab === 'activity' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2.5">
            <ActivityIcon className="w-4 h-4 text-slate-400" />
            <div className="flex-1">
              <p className="font-black text-slate-700 text-sm">Everything that has happened</p>
              <p className="text-[11px] text-slate-400 font-semibold">
                Across every sheet in this cycle, newest first.
              </p>
            </div>
            <span className="text-[11px] font-bold text-slate-400">{feed.length}</span>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
            {feed.map(e => (
              <button key={e.id} onClick={() => onOpenPlan(e.employee_code)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50/70 transition-colors flex items-start gap-3">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 mt-px ${
                  e.actor_role === 'admin' ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : e.actor_role === 'hod' ? 'bg-violet-50 text-violet-700 border-violet-200'
                  : e.actor_role === 'manager' ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
                  {ROLE_LABEL[e.actor_role] || e.actor_role}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] text-slate-700 font-semibold">
                    <strong className="font-black">{e.actor_name || ROLE_LABEL[e.actor_role]}</strong>
                    {' '}{ACTION_WORDS[e.action] || e.action}
                    {' — '}
                    <span className="text-slate-500">{e.employee_name}</span>
                  </span>
                  {e.note && (
                    <span className="block text-[11px] text-slate-400 font-semibold italic truncate">
                      &ldquo;{e.note}&rdquo;
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold tabular-nums shrink-0">
                  {dt(e.created_at)}
                </span>
              </button>
            ))}
            {feed.length === 0 && (
              <p className="px-4 py-12 text-center text-[12px] text-slate-400 font-semibold">
                <ActivityIcon className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                Nothing has happened yet in this cycle.
              </p>
            )}
          </div>
        </div>
      )}

      {editing && (
        <PersonDrawer person={editing} onClose={() => setEditing(null)}
          onSaved={m => { setMsg(m); loadPeople(); refresh(); }} />
      )}
    </div>
  );
}
