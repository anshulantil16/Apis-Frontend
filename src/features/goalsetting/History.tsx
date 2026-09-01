/* What changed, who changed it, and what it looked like before.
 *
 * This panel is the reason the product keeps snapshots at all. A manager and
 * an HOD can rewrite an employee's goals, so "this is not what I proposed" has
 * to be answerable with evidence rather than memory.
 */
import { useState } from 'react';
import { History as HistoryIcon, ChevronDown, Plus, Minus, ArrowRight, FileText } from 'lucide-react';
import type { Plan, Version } from './api';
import { ROLE_LABEL, describeChange, dt } from './api';

const ACTION_LABEL: Record<string, string> = {
  submit: 'submitted the goals',
  to_hod: 'sent them to the HOD',
  manager_return: 'sent them back for changes',
  to_employee: 'sent them back to the employee',
  hod_return: 'sent them back for changes',
  accept: 'accepted the goals',
  employee_return: 'asked for changes',
  reopened: 'reopened the sheet',
};

const ROLE_TONE: Record<string, string> = {
  employee: 'bg-sky-100 text-sky-700 border-sky-200',
  manager: 'bg-amber-100 text-amber-700 border-amber-200',
  hod: 'bg-violet-100 text-violet-700 border-violet-200',
  admin: 'bg-rose-100 text-rose-700 border-rose-200',
};

const CHANGE_ICON = {
  kra_added: { Icon: Plus, tone: 'text-emerald-600 bg-emerald-50' },
  kpi_added: { Icon: Plus, tone: 'text-emerald-600 bg-emerald-50' },
  kra_removed: { Icon: Minus, tone: 'text-rose-600 bg-rose-50' },
  kpi_removed: { Icon: Minus, tone: 'text-rose-600 bg-rose-50' },
  kpi_changed: { Icon: ArrowRight, tone: 'text-amber-600 bg-amber-50' },
} as const;

function VersionCard({ v, isFirst, isLatest }: { v: Version; isFirst: boolean; isLatest: boolean }) {
  const [open, setOpen] = useState(isLatest && v.changes.length > 0);

  return (
    <div className="relative pl-8">
      {/* the rail */}
      <span className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-200" aria-hidden />
      <span className={`absolute left-[5px] top-2.5 w-3.5 h-3.5 rounded-full border-2 border-white ring-2 ${
        isLatest ? 'bg-amber-500 ring-amber-200' : 'bg-slate-300 ring-slate-100'}`} aria-hidden />

      <div className="pb-5">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
            ROLE_TONE[v.actor_role] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            {ROLE_LABEL[v.actor_role] || v.actor_role}
          </span>
          <span className="text-[13px] font-bold text-slate-700">
            {v.actor_name || ROLE_LABEL[v.actor_role] || 'Someone'}
          </span>
          <span className="text-[12px] text-slate-500">
            {ACTION_LABEL[v.action] || v.action}
          </span>
          <span className="text-[11px] text-slate-400 font-semibold ml-auto tabular-nums">
            {dt(v.created_at)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
          <span>v{v.version_no}</span>
          <span>·</span>
          <span className={v.total_weightage === 100 ? 'text-emerald-600' : 'text-amber-600'}>
            {v.total_weightage}% weightage
          </span>
          {v.note && (
            <>
              <span>·</span>
              <span className="text-slate-600 italic">“{v.note}”</span>
            </>
          )}
        </div>

        {isFirst ? (
          <p className="mt-2 text-[12px] text-slate-500 font-semibold">
            The original sheet, as first submitted.
          </p>
        ) : v.changes.length === 0 ? (
          <p className="mt-2 text-[12px] text-slate-400 font-semibold">
            Passed on without changing anything.
          </p>
        ) : (
          <>
            <button
              onClick={() => setOpen(o => !o)}
              className="mt-2 flex items-center gap-1.5 text-[11px] font-black text-amber-700 hover:text-amber-800"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
              {v.changes.length} change{v.changes.length === 1 ? '' : 's'}
            </button>
            {open && (
              <ul className="mt-2 space-y-1.5">
                {v.changes.map((c, i) => {
                  const { Icon, tone } = CHANGE_ICON[c.type] ?? CHANGE_ICON.kpi_changed;
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-px ${tone}`}>
                        <Icon className="w-3 h-3" />
                      </span>
                      <span className="text-[12px] text-slate-600 font-semibold leading-5">
                        {describeChange(c)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function PlanHistory({ plan }: { plan: Plan }) {
  const versions = [...(plan.versions || [])].sort((a, b) => b.version_no - a.version_no);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
          <HistoryIcon className="w-4 h-4 text-slate-400" />
        </span>
        <div>
          <h3 className="font-black text-slate-700 text-sm">History</h3>
          <p className="text-[11px] text-slate-400 font-semibold">
            Every hand-off is kept. Nothing here is ever overwritten.
          </p>
        </div>
      </div>

      {versions.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-[12px] text-slate-400 font-semibold">
            Nothing yet — history starts when the sheet is first submitted.
          </p>
        </div>
      ) : (
        <div>
          {versions.map((v, i) => (
            <VersionCard key={v.id} v={v}
              isFirst={v.version_no === 1}
              isLatest={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

/** A compact "what the reviewer changed" strip, for the employee's acceptance
 *  screen — where the only question is "what is different from what I sent?". */
export function ChangesSinceMine({ plan }: { plan: Plan }) {
  const mine = [...(plan.versions || [])]
    .filter(v => v.actor_role === 'employee')
    .sort((a, b) => b.version_no - a.version_no)[0];

  const after = (plan.versions || [])
    .filter(v => !mine || v.version_no > mine.version_no)
    .flatMap(v => v.changes.map(c => ({ ...c, by: v.actor_name || ROLE_LABEL[v.actor_role], role: v.actor_role })));

  if (!mine) return null;

  return (
    <div className={`rounded-2xl border p-4 ${after.length
      ? 'bg-amber-50/60 border-amber-200' : 'bg-emerald-50/60 border-emerald-200'}`}>
      <p className={`font-black text-sm mb-1 ${after.length ? 'text-amber-800' : 'text-emerald-800'}`}>
        {after.length
          ? `${after.length} change${after.length === 1 ? '' : 's'} since you submitted`
          : 'Nothing was changed'}
      </p>
      <p className="text-[12px] font-semibold mb-3 text-slate-600">
        {after.length
          ? 'Read these before you accept — this is what your goals now say.'
          : 'Your sheet came back exactly as you sent it.'}
      </p>
      {after.length > 0 && (
        <ul className="space-y-1.5">
          {after.map((c, i) => {
            const { Icon, tone } = CHANGE_ICON[c.type] ?? CHANGE_ICON.kpi_changed;
            return (
              <li key={i} className="flex items-start gap-2">
                <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-px ${tone}`}>
                  <Icon className="w-3 h-3" />
                </span>
                <span className="text-[12px] text-slate-700 font-semibold leading-5">
                  {describeChange(c)}
                  <span className="text-slate-400 font-bold"> — {c.by}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
