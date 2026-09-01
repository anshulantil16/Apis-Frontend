/* The story of a goal sheet, told forwards.
 *
 * This panel is the reason the product keeps snapshots at all: a manager and an
 * HOD can rewrite an employee's goals, so "this is not what I proposed" has to
 * be answerable with evidence rather than memory.
 *
 * The first version of this screen was accurate and unreadable. It listed
 * newest-first, so you reconstructed the story backwards; it numbered steps
 * "v1..v6", which means nothing to the person reading; it showed the opening
 * submission as a list of "added KRA X, added KRA Y", which is noise rather
 * than news; and it printed one line per changed FIELD, so editing a single
 * KPI's weight and target read as two unrelated events with no clue which KRA
 * they belonged to.
 *
 * It now reads top to bottom in the order things happened, numbers the steps as
 * steps, summarises the opening submission instead of diffing it against
 * nothing, and folds changes back into the shape of the sheet — by KRA, then by
 * KPI, with every field moved on one KPI on a single line.
 */
import { useState } from 'react';
import {
  History as HistoryIcon, ChevronDown, Plus, Minus, PencilLine, FileText,
  CornerUpLeft, CheckCircle2, Send, ShieldAlert,
} from 'lucide-react';
import type { KraChanges, Plan, Version } from './api';
import { ROLE_LABEL, dt, formatMove, groupChanges } from './api';

/* What each step was, as a sentence. The subject is supplied separately, so
   these read as "Arun Mishra sent them to the HOD". */
const DID: Record<string, string> = {
  submit: 'submitted the goals',
  to_hod: 'sent them to the HOD',
  manager_return: 'sent them back for changes',
  to_employee: 'sent them back for the employee to accept',
  hod_return: 'sent them back for changes',
  accept: 'accepted the goals',
  employee_return: 'asked for changes',
  admin_edit: 'edited the sheet directly',
  admin_moved: 'moved the sheet',
  reopened: 'reopened the sheet',
};

const STEP_ICON: Record<string, typeof Send> = {
  submit: Send, to_hod: Send, to_employee: Send,
  manager_return: CornerUpLeft, hod_return: CornerUpLeft, employee_return: CornerUpLeft,
  accept: CheckCircle2,
  admin_edit: ShieldAlert, admin_moved: ShieldAlert, reopened: ShieldAlert,
};

const ROLE_TONE: Record<string, string> = {
  employee: 'bg-sky-50 text-sky-700 border-sky-200',
  manager: 'bg-amber-50 text-amber-700 border-amber-200',
  hod: 'bg-violet-50 text-violet-700 border-violet-200',
  admin: 'bg-rose-50 text-rose-700 border-rose-200',
};

const FIELD_WORD: Record<string, string> = {
  weightage: 'weight', target_value: 'target', frequency: 'frequency',
  unit_of_measurement: 'unit', parameter_type: 'direction', data_source: 'data source',
};

/** One KRA's worth of changes, indented under its name. */
export function KraChangeBlock({ g }: { g: KraChanges }) {
  if (g.added) {
    return (
      <li className="flex items-start gap-2">
        <Plus className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
        <span className="text-[12px] text-slate-700 font-semibold">
          Added the KRA <strong className="font-black">{g.kra}</strong>
          {g.category && <span className="text-slate-400"> under {g.category}</span>}
        </span>
      </li>
    );
  }
  if (g.removed) {
    return (
      <li className="flex items-start gap-2">
        <Minus className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />
        <span className="text-[12px] text-slate-700 font-semibold">
          Removed the KRA <strong className="font-black">{g.kra}</strong>
        </span>
      </li>
    );
  }

  return (
    <li>
      <p className="flex items-start gap-2 text-[12px] font-semibold text-slate-500">
        <PencilLine className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
        <span>Under <strong className="font-black text-slate-700">{g.kra}</strong></span>
      </p>
      <ul className="ml-5 mt-1 space-y-1 border-l-2 border-slate-100 pl-3">
        {g.kpisAdded.map(k => (
          <li key={`a${k}`} className="text-[12px] text-slate-600 font-semibold">
            <span className="text-emerald-600 font-black">added</span> the KPI &ldquo;{k}&rdquo;
          </li>
        ))}
        {g.kpisRemoved.map(k => (
          <li key={`r${k}`} className="text-[12px] text-slate-600 font-semibold">
            <span className="text-rose-600 font-black">removed</span> the KPI &ldquo;{k}&rdquo;
          </li>
        ))}
        {g.kpisChanged.map(k => (
          <li key={`c${k.kpi}`} className="text-[12px] text-slate-600 font-semibold">
            &ldquo;{k.kpi}&rdquo; &mdash;{' '}
            {k.fields.map((f, i) => (
              <span key={f.field}>
                {i > 0 && ', '}
                {FIELD_WORD[f.field] || f.field}{' '}
                <span className="text-slate-800 font-black tabular-nums">
                  {formatMove(f.field, f.from, f.to)}
                </span>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </li>
  );
}

function Step({ v, n, isFirst, isLatest, isLast }: {
  v: Version; n: number; isFirst: boolean; isLatest: boolean; isLast: boolean;
}) {
  const groups = groupChanges(v.changes);
  const [open, setOpen] = useState(isLatest && groups.length > 0);
  const tone = ROLE_TONE[v.actor_role] ?? ROLE_TONE.employee;
  const Icon = STEP_ICON[v.action] ?? Send;

  const kraCount = v.kras.length;
  const kpiCount = v.kras.reduce((s, k) => s + (k.kpis?.length ?? 0), 0);

  return (
    <li className="relative pl-11">
      {!isLast && <span className="absolute left-[15px] top-10 bottom-0 w-px bg-slate-200" aria-hidden />}
      <span className={`absolute left-0 top-0.5 w-8 h-8 rounded-xl flex items-center justify-center
        border shadow-sm ${isLatest ? 'ih-pulse-glow' : ''} ${tone}`}>
        <Icon className="w-3.5 h-3.5" />
      </span>

      <div className="pb-6">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
            Step {n}
          </span>
          <span className="text-[13px] font-black text-slate-800">
            {v.actor_name || ROLE_LABEL[v.actor_role] || 'Someone'}
          </span>
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${tone}`}>
            {ROLE_LABEL[v.actor_role] || v.actor_role}
          </span>
          <span className="text-[12px] text-slate-500 font-semibold">
            {DID[v.action] || v.action}
          </span>
          <span className="text-[11px] text-slate-400 font-semibold ml-auto tabular-nums shrink-0">
            {dt(v.created_at)}
          </span>
        </div>

        {v.note && (
          <p className="mt-1.5 text-[12px] text-slate-600 font-semibold bg-slate-50 border-l-2 border-slate-300 pl-2.5 py-1 rounded-r">
            &ldquo;{v.note}&rdquo;
          </p>
        )}

        {isFirst ? (
          /* Diffing the opening submission against nothing yields "added X" for
             every KRA on the sheet, which is noise. What a reader wants at the
             start is its shape. */
          <p className="mt-1.5 text-[12px] text-slate-500 font-semibold">
            The original sheet &mdash; {kraCount} KRA{kraCount === 1 ? '' : 's'},{' '}
            {kpiCount} KPI{kpiCount === 1 ? '' : 's'}, {v.total_weightage}% weightage.
          </p>
        ) : groups.length === 0 ? (
          <p className="mt-1.5 text-[12px] text-slate-400 font-semibold">
            Passed on without changing anything.
          </p>
        ) : (
          <>
            <button onClick={() => setOpen(o => !o)}
              className="mt-2 flex items-center gap-1.5 text-[11px] font-black text-amber-700 hover:text-amber-800">
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
              Changed {groups.length} {groups.length === 1 ? 'thing' : 'things'}
            </button>
            {open && (
              <ul className="ih-fade mt-2 space-y-2">
                {groups.map((g, i) => <KraChangeBlock key={i} g={g} />)}
              </ul>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export function PlanHistory({ plan }: { plan: Plan }) {
  // Forwards. The sheet's life reads as a story, not as a stack.
  const versions = [...(plan.versions || [])].sort((a, b) => a.version_no - b.version_no);
  const lastNo = versions[versions.length - 1]?.version_no;

  return (
    <div className="ih-inview bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-5">
        <span className="ih-float w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
          <HistoryIcon className="w-4 h-4 text-amber-500" />
        </span>
        <div>
          <h3 className="font-black text-slate-800 text-sm">What has happened to this sheet</h3>
          <p className="text-[11px] text-slate-400 font-semibold">
            In order, oldest first. Nothing here is ever overwritten.
          </p>
        </div>
      </div>

      {versions.length === 0 ? (
        <div className="text-center py-10">
          <FileText className="w-9 h-9 text-slate-200 mx-auto mb-2" />
          <p className="text-[12px] text-slate-400 font-semibold">
            Nothing yet &mdash; the story starts when the sheet is first submitted.
          </p>
        </div>
      ) : (
        <ol>
          {versions.map((v, i) => (
            <Step key={v.id} v={v} n={i + 1}
              isFirst={i === 0}
              isLatest={v.version_no === lastNo}
              isLast={i === versions.length - 1} />
          ))}
        </ol>
      )}
    </div>
  );
}

/** The employee's acceptance screen: only what moved since THEY submitted. */
export function ChangesSinceMine({ plan }: { plan: Plan }) {
  const versions = plan.versions || [];
  const mine = [...versions].filter(v => v.actor_role === 'employee')
    .sort((a, b) => b.version_no - a.version_no)[0];
  if (!mine) return null;

  const since = versions.filter(v => v.version_no > mine.version_no);
  const groups = groupChanges(since.flatMap(v => v.changes));
  const who = [...new Set(since.filter(v => v.changes.length)
    .map(v => v.actor_name || ROLE_LABEL[v.actor_role]))];

  return (
    <div className={`ih-pop-in ih-halo relative rounded-2xl border p-5 ${groups.length
      ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/70 border-emerald-200'}`}
      style={{ ['--ih-halo' as string]: groups.length ? 'rgba(245,158,11,.25)' : 'rgba(16,185,129,.25)' }}>
      <div className="flex items-start gap-3">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          groups.length ? 'bg-amber-100' : 'bg-emerald-100'}`}>
          {groups.length
            ? <PencilLine className="w-4 h-4 text-amber-700" />
            : <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
        </span>
        <div className="min-w-0">
          <p className={`font-black text-[14px] ${groups.length ? 'text-amber-900' : 'text-emerald-900'}`}>
            {groups.length
              ? `${groups.length} ${groups.length === 1 ? 'thing was' : 'things were'} changed after you submitted`
              : 'Nothing was changed'}
          </p>
          <p className="text-[12px] font-semibold text-slate-600 mt-0.5">
            {groups.length
              ? `Changed by ${who.join(' and ')}. Read these before you accept — this is what your goals now say.`
              : 'Your sheet came back exactly as you sent it.'}
          </p>
        </div>
      </div>

      {groups.length > 0 && (
        <ul className="mt-4 space-y-2 bg-white/70 rounded-xl p-3.5">
          {groups.map((g, i) => <KraChangeBlock key={i} g={g} />)}
        </ul>
      )}
    </div>
  );
}
