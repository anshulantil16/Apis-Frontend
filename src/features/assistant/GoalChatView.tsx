/* The goal-sheet conversation inside the Ask APIS panel. The screen is the
 * shared SecureChatView; the logic is useGoalChat.ts. */
import { CheckCircle2, Save, Target, Trash2 } from 'lucide-react';
import { SecureChatView } from './SecureChatView';
import type { GoalChat } from './useGoalChat';

export function GoalChatView({ flow, onOpenGoalSetting }: { flow: GoalChat; onOpenGoalSetting: () => void }) {
  return (
    <SecureChatView title="Goal sheet" icon={<Target className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
      flow={{
        msgs: flow.msgs, busy: flow.busy, sending: flow.stage === 'sending', who: flow.who,
        input: flow.stage === 'otp' ? 'code' : flow.stage === 'id' ? 'id' : 'text',
        reply: flow.reply, reset: flow.reset,
      }}
      renderReview={() => <Sheet flow={flow} />}
      portalLabel="Open Goal Setting" onOpenPortal={onOpenGoalSetting} />
  );
}

/* The sheet as it stands: every KRA and KPI, the weightage, and the two ways out. */
function Sheet({ flow }: { flow: GoalChat }) {
  const ready = flow.stage === 'review';
  const exact = flow.total === 100;
  return (
    <div className="rounded-xl bg-white ring-1 ring-amber-200 p-3 space-y-2.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-amber-600 truncate">
          {flow.sheet?.cycle_name ?? 'Goal sheet'}
        </p>
        <span className={`flex-shrink-0 text-[10.5px] font-black px-2 py-0.5 rounded-full
          ${exact ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {flow.total}% / 100%
        </span>
      </div>

      {flow.kras.length === 0 && <p className="text-[11.5px] text-slate-500">No KRAs yet.</p>}
      {flow.kras.map((k, i) => (
        <div key={i} className="rounded-lg bg-amber-50/60 ring-1 ring-amber-100 px-2.5 py-2 space-y-1.5">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">{k.category}</p>
              <p className="text-[12px] font-black text-slate-800 break-words">{k.title}</p>
              {k.description && <p className="text-[11px] text-slate-500 break-words">{k.description}</p>}
            </div>
            {ready && (
              <button type="button" onClick={() => flow.removeKra(i)} title="Remove this KRA"
                className="text-slate-300 hover:text-rose-600"><Trash2 className="w-3 h-3" /></button>
            )}
          </div>
          {k.kpis.map((p, j) => (
            <div key={j} className="flex items-start gap-2 rounded-md bg-white ring-1 ring-amber-100 px-2 py-1.5">
              <div className="flex-1 min-w-0 text-[11px] leading-snug text-slate-600">
                <p className="font-black text-slate-800 break-words">
                  {p.metric} <span className="text-orange-600">· {p.weightage}%</span>
                </p>
                <p className="break-words">
                  Target {p.target_value} {p.unit_of_measurement} · {p.frequency} · {p.parameter_type} · from {p.data_source}
                </p>
              </div>
              {ready && (
                <button type="button" onClick={() => flow.removeKpi(i, j)} title="Remove this KPI"
                  className="text-slate-300 hover:text-rose-600"><Trash2 className="w-3 h-3" /></button>
              )}
            </div>
          ))}
        </div>
      ))}

      {ready && (
        <>
          <button type="button" onClick={flow.addKra}
            className="text-[11.5px] font-black text-amber-700 hover:text-amber-800">+ Add another KRA</button>
          {!exact && (
            <p className="text-[10.5px] font-semibold text-amber-700">
              Submitting needs exactly 100% — {flow.total > 100 ? `remove ${Math.round((flow.total - 100) * 100) / 100}%` : `add ${Math.round((100 - flow.total) * 100) / 100}% more`}.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void flow.save(false)} disabled={!flow.kras.length}
              className="aa-chip inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white ring-1 ring-amber-300
                         text-amber-800 text-[12px] font-black disabled:opacity-40">
              <Save className="w-3.5 h-3.5" />Save as draft
            </button>
            <button type="button" onClick={() => void flow.save(true)} disabled={!exact}
              className="aa-chip inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                         bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[12px] font-black shadow-sm disabled:opacity-40">
              <CheckCircle2 className="w-3.5 h-3.5" />Submit to manager
            </button>
          </div>
        </>
      )}
    </div>
  );
}
