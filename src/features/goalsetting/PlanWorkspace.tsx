/* One goal sheet, open. Used by the employee, the manager and the HOD.
 *
 * All three do the same two things — edit the table and hand it on — so they
 * share this screen. What differs is which buttons exist, and that is derived
 * from the plan's status rather than from who opened it, so the UI cannot
 * offer an action the server would refuse.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Save, Send, CornerUpLeft, CheckCircle2, AlertCircle, Loader2,
  Info, Lock, ShieldAlert, MoveRight,
} from 'lucide-react';
import {
  ApiError, actOnPlan, getPlan, savePlan, savePlanAsAdmin, setPlanStatus, totalWeight,
} from './api';
import type { KRA, Plan, PlanStatus, Role } from './api';
import { STATUS_TONE, dt } from './api';

/* The stages in workflow order, for the admin's move control. Order matters:
   a dropdown that lists them alphabetically hides the shape of the process. */
const STATUS_ORDER: PlanStatus[] = [
  'draft', 'submitted', 'with_hod', 'awaiting_employee', 'accepted', 'returned',
];
const STATUS_LABEL: Record<PlanStatus, string> = {
  draft: 'Draft with employee',
  submitted: 'Submitted — with manager',
  with_hod: 'With HOD',
  awaiting_employee: 'Awaiting employee acceptance',
  accepted: 'Accepted — goals agreed',
  returned: 'Sent back for changes',
};
import { GoalSheet, WeightMeter } from './GoalSheet';
import { ChangesSinceMine, PlanHistory } from './History';

interface Action {
  key: string;
  label: string;
  hint: string;
  tone: string;
  icon: typeof Send;
  needsNote?: boolean;
}

/* Which buttons a seat gets at each stage. Reads as the workflow itself, which
   is why it is a table rather than a pile of conditionals in the JSX. */
function actionsFor(role: Role, status: Plan['status']): Action[] {
  const send = (key: string, label: string, hint: string): Action =>
    ({ key, label, hint, tone: 'bg-amber-500 hover:bg-amber-600 text-white', icon: Send });
  const back = (key: string, label: string, hint: string): Action =>
    ({ key, label, hint, tone: 'bg-white hover:bg-rose-50 text-rose-600 border border-rose-200',
       icon: CornerUpLeft, needsNote: true });

  if (role === 'employee') {
    if (status === 'draft' || status === 'returned')
      return [send('submit', 'Submit to Manager', 'Sends your goals on. You will not be able to edit until they come back.')];
    if (status === 'awaiting_employee')
      return [
        { key: 'accept', label: 'Accept these goals', icon: CheckCircle2,
          hint: 'Agrees the goals as they now stand. This locks the sheet.',
          tone: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
        back('employee_return', 'Request changes',
             'Sends the sheet back to your manager with your note, so they can discuss it.'),
      ];
    return [];
  }
  if (role === 'manager' && status === 'submitted')
    return [send('to_hod', 'Send to HOD', 'Passes the sheet, including your edits, to the HOD.'),
            back('manager_return', 'Send back to employee', 'Returns it for the employee to redo.')];
  if (role === 'hod' && status === 'with_hod')
    return [send('to_employee', 'Send to employee to accept', 'Returns the sheet, with your edits, for the employee to agree.'),
            back('hod_return', 'Send back to employee', 'Returns it for the employee to redo.')];
  return [];
}

const WAITING_ON: Record<Plan['status'], string> = {
  draft: 'the employee to fill it in',
  submitted: 'the manager to review',
  with_hod: 'the HOD to review',
  awaiting_employee: 'the employee to accept',
  accepted: 'nobody — the goals are agreed',
  returned: 'the employee to make changes',
};

export function PlanWorkspace({
  employeeId, cycleId, role, actorName, categories, frequencies, onBack, backLabel,
}: {
  employeeId: string;
  cycleId: number;
  role: Role;
  actorName: string;
  categories: string[];
  frequencies: string[];
  onBack: () => void;
  backLabel: string;
}) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [kras, setKras] = useState<KRA[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [noteFor, setNoteFor] = useState<Action | null>(null);
  const [saved, setSaved] = useState('');
  const [dirty, setDirty] = useState(false);
  const [notStarted, setNotStarted] = useState(false);
  const [moveTo, setMoveTo] = useState<PlanStatus | ''>('');
  const [moveNote, setMoveNote] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const p = await getPlan(employeeId, cycleId, role);
      setPlan(p);
      setKras(p.kras);
      setDirty(false);
      setNotStarted(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this goal sheet.');
      setNotStarted(e instanceof ApiError && e.status === 404);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [employeeId, cycleId]);

  const canEdit = useMemo(() => {
    if (!plan) return false;
    // The admin seat edits at any stage and regardless of the cycle being
    // locked. Every such save is versioned server-side, so the power is
    // visible in the history rather than silent.
    if (role === 'admin') return true;
    if (plan.cycle_status !== 'open') return false;
    const editors: Record<Plan['status'], Role[]> = {
      draft: ['employee'], returned: ['employee'], submitted: ['manager'],
      with_hod: ['hod'], awaiting_employee: [], accepted: [],
    };
    return editors[plan.status].includes(role);
  }, [plan, role]);

  const actions = plan ? actionsFor(role, plan.status) : [];

  const edit = (next: KRA[]) => { setKras(next); setDirty(true); setSaved(''); };

  const save = async () => {
    if (!plan) return;
    setBusy('save'); setError(''); setProblems([]);
    try {
      const p = role === 'admin'
        ? await savePlanAsAdmin(employeeId, cycleId, kras, actorName)
        : await savePlan(employeeId, cycleId, role, kras);
      setPlan(p); setKras(p.kras); setDirty(false);
      setProblems(p.problems || []);
      setSaved(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save.');
    }
    setBusy('');
  };

  const run = async (action: Action) => {
    if (!plan) return;
    if (action.needsNote && !note.trim()) { setNoteFor(action); return; }
    setBusy(action.key); setError(''); setProblems([]);
    try {
      const p = await actOnPlan(plan.id, {
        role, action: action.key, note: note.trim(),
        actor_name: actorName, actor_employee_id: employeeId,
        ...(canEdit ? { kras } : {}),
      });
      setPlan(p); setKras(p.kras); setDirty(false); setNote(''); setNoteFor(null);
      setSaved('');
    } catch (e) {
      if (e instanceof ApiError) { setError(e.message); setProblems(e.problems); }
      else setError('Could not complete that.');
    }
    setBusy('');
  };

  const move = async () => {
    if (!plan || !moveTo) return;
    setBusy('move'); setError('');
    try {
      const p = await setPlanStatus(plan.id, moveTo, actorName, moveNote.trim());
      setPlan(p); setKras(p.kras); setMoveTo(''); setMoveNote(''); setDirty(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not move this sheet.');
    }
    setBusy('');
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <AlertCircle className={`w-10 h-10 mx-auto mb-3 ${
          notStarted ? 'text-slate-200' : 'text-rose-300'}`} />
        <p className="font-black text-slate-700 mb-1">
          {notStarted ? 'Not started yet' : 'This goal sheet could not be opened'}
        </p>
        <p className="text-sm text-slate-500 mb-5">
          {error || 'It may have been removed.'}
        </p>
        <button onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-sm">
          {backLabel}
        </button>
      </div>
    );
  }

  const tone = STATUS_TONE[plan.status];
  const weight = totalWeight(kras);

  return (
    <div className="space-y-4">
      {/* Always a visible way out. */}
      <button onClick={onBack}
        className="flex items-center gap-2 text-[13px] font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </button>

      {/* Who it is, where it sits. */}
      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-black text-lg text-slate-800 truncate">{plan.employee_name}</h2>
              <span className={`text-[10px] font-black px-2 py-1 rounded-full border flex items-center gap-1.5 ${tone.chip}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                {plan.status_label}
              </span>
            </div>
            <p className="text-[12px] text-slate-500 font-semibold mt-0.5">
              {plan.employee_code}
              {plan.designation && ` · ${plan.designation}`}
              {plan.department && ` · ${plan.department}`}
              {' · '}{plan.cycle_name}
            </p>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">
              Waiting on {WAITING_ON[plan.status]}.
            </p>
          </div>
          <div className="shrink-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Total weightage
            </p>
            <WeightMeter kras={kras} />
          </div>
        </div>
      </div>

      {/* The employee's acceptance step leads with what changed. */}
      {role === 'employee' && plan.status === 'awaiting_employee' && (
        <ChangesSinceMine plan={plan} />
      )}

      {/* Notes left by whoever handled it. */}
      {[['Employee', plan.employee_note], ['Manager', plan.manager_note],
        ['HOD', plan.hod_note]].filter(([, v]) => v).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 space-y-2">
          {([['Employee', plan.employee_note], ['Manager', plan.manager_note],
             ['HOD', plan.hod_note]] as [string, string][])
            .filter(([, v]) => v)
            .map(([who, text]) => (
              <p key={who} className="text-[12px] text-slate-600">
                <span className="font-black text-slate-400 uppercase tracking-widest text-[10px] mr-2">
                  {who}
                </span>
                {text}
              </p>
            ))}
        </div>
      )}

      {!canEdit && plan.cycle_status === 'open' && (
        <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Lock className="w-4 h-4 text-slate-400 mt-px shrink-0" />
          <p className="text-[12px] text-slate-600 font-semibold">
            {plan.status === 'accepted'
              ? 'These goals are agreed, so the sheet is now read-only for everyone.'
              : `This sheet is with ${WAITING_ON[plan.status]}, so it is read-only for you right now.`}
          </p>
        </div>
      )}

      {plan.cycle_status !== 'open' && (
        <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-slate-400 mt-px shrink-0" />
          <p className="text-[12px] text-slate-600 font-semibold">
            The {plan.cycle_name} cycle is not open, so nothing can be changed. Contact the admin.
          </p>
        </div>
      )}

      <GoalSheet kras={kras} categories={categories} frequencies={frequencies}
        canEdit={canEdit} onChange={edit} />

      {error && (
        <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-rose-500 mt-px shrink-0" />
          <div>
            <p className="text-[13px] font-bold text-rose-700">{error}</p>
            {problems.length > 0 && (
              <ul className="mt-1.5 space-y-1">
                {problems.map((p, i) => (
                  <li key={i} className="text-[12px] text-rose-600 font-semibold">• {p}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Problems found on save, before anyone has tried to send it on. */}
      {!error && problems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-[13px] font-bold text-amber-800 mb-1.5">
            Still to do before this can be sent on
          </p>
          <ul className="space-y-1">
            {problems.map((p, i) => (
              <li key={i} className="text-[12px] text-amber-700 font-semibold">• {p}</li>
            ))}
          </ul>
        </div>
      )}

      {noteFor && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
            Why are you sending it back? (required)
          </label>
          <textarea
            value={note} onChange={e => setNote(e.target.value)} rows={3} autoFocus
            placeholder="Say what needs to change, so it comes back right the first time."
            className="w-full px-3 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={() => run(noteFor)} disabled={!note.trim() || !!busy}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-[13px]">
              {noteFor.label}
            </button>
            <button onClick={() => { setNoteFor(null); setNote(''); }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[13px]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {(canEdit || actions.length > 0) && !noteFor && (
        <div className="sticky bottom-4 z-10">
          <div className="bg-white/95 border border-slate-200 rounded-2xl px-4 py-3 shadow-lg flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[180px]">
              {dirty ? (
                <p className="text-[12px] font-bold text-amber-600">Unsaved changes</p>
              ) : saved ? (
                <p className="text-[12px] font-bold text-emerald-600">{saved}</p>
              ) : (
                <p className="text-[12px] font-semibold text-slate-400">
                  {weight === 100 ? 'Weightage adds up.' : `Weightage is ${weight}% — needs to be 100%.`}
                </p>
              )}
            </div>

            {canEdit && (
              <button onClick={save} disabled={!!busy || !dirty}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-[13px]">
                {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save draft
              </button>
            )}

            {actions.map(a => {
              const Icon = a.icon;
              return (
                <button key={a.key} onClick={() => run(a)} disabled={!!busy} title={a.hint}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[13px] disabled:opacity-40 transition-colors ${a.tone}`}>
                  {busy === a.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {plan.status === 'accepted' && (
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-[13px] font-bold text-emerald-800">
            Goals agreed on {dt(plan.accepted_at)}.
          </p>
        </div>
      )}

      {role === 'admin' && (
        <div className="bg-white border-2 border-dashed border-rose-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <p className="font-black text-slate-700 text-sm">Administrator controls</p>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold mb-3">
            You can edit this sheet at any stage, and move it to any stage — including
            after it has been agreed. Every change you make is written into the history
            below with your name on it, so an overridden sheet always says so.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={moveTo} onChange={e => setMoveTo(e.target.value as PlanStatus)}
              className="px-3 py-2 text-[12px] font-bold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400/40">
              <option value="">Move this sheet to…</option>
              {STATUS_ORDER.filter(v => v !== plan.status).map(v => (
                <option key={v} value={v}>{STATUS_LABEL[v]}</option>
              ))}
            </select>
            <input value={moveNote} onChange={e => setMoveNote(e.target.value)}
              placeholder="Why? (recorded in the history)"
              className="flex-1 min-w-[200px] px-3 py-2 text-[12px] rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400/40" />
            <button onClick={move} disabled={!moveTo || !!busy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-[13px]">
              {busy === 'move' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoveRight className="w-4 h-4" />}
              Move
            </button>
          </div>
        </div>
      )}

      <PlanHistory plan={plan} />
    </div>
  );
}
