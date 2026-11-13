/* The Employee of the Month conversation inside the Ask APIS panel. The screen
 * is the shared SecureChatView; the logic is useEomChat.ts. */
import { CheckCircle2, Pencil, Save, Star } from 'lucide-react';
import { SecureChatView } from './SecureChatView';
import type { EomChat } from './useEomChat';

export function EomChatView({ flow, onOpenEom }: { flow: EomChat; onOpenEom: () => void }) {
  return (
    <SecureChatView title="EOM nomination" icon={<Star className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
      flow={{
        msgs: flow.msgs, busy: flow.busy, sending: flow.stage === 'sending', who: flow.profile?.name ?? null,
        input: flow.stage === 'otp' ? 'code' : flow.stage === 'id' ? 'id' : 'text',
        reply: flow.reply, reset: flow.reset,
      }}
      renderReview={() => <Review flow={flow} />}
      portalLabel="Open Employee of the Month" onOpenPortal={onOpenEom} />
  );
}

/* The nomination as it stands: who it is for (not editable - it comes from
   EOM), every answer, and the two ways out. */
function Review({ flow }: { flow: EomChat }) {
  const ready = flow.stage === 'review';
  const p = flow.profile;
  return (
    <div className="rounded-xl bg-white ring-1 ring-amber-200 p-3 space-y-2.5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-wide text-amber-600">
        {flow.cycle?.name ?? 'Nomination'}
      </p>
      {p && (
        <p className="text-[11px] text-slate-500 leading-snug">
          {p.name} · {p.employee_id}{p.designation && ` · ${p.designation}`}{p.department && ` · ${p.department}`}{p.zone && ` · ${p.zone}`}
        </p>
      )}
      <dl className="space-y-1.5">
        {flow.rows.map(r => (
          <div key={r.key} className="flex items-start gap-2 text-[11.5px]">
            <dt className="w-[36%] flex-shrink-0 text-slate-500 font-semibold">{r.label}</dt>
            <dd className="flex-1 min-w-0 font-bold text-slate-800 break-words whitespace-pre-wrap">{r.value}</dd>
            {ready && (
              <button type="button" onClick={() => flow.edit(r.key)} title={`Change ${r.label.toLowerCase()}`}
                className="text-slate-300 hover:text-amber-600"><Pencil className="w-3 h-3" /></button>
            )}
          </div>
        ))}
      </dl>
      {ready && (
        <>
          <p className="text-[10.5px] text-slate-400">Documents to attach? Add them in Employee of the Month after submitting.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void flow.save(false)}
              className="aa-chip inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white ring-1 ring-amber-300
                         text-amber-800 text-[12px] font-black">
              <Save className="w-3.5 h-3.5" />Save as draft
            </button>
            <button type="button" onClick={() => void flow.save(true)}
              className="aa-chip inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                         bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[12px] font-black shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />Submit for review
            </button>
          </div>
        </>
      )}
    </div>
  );
}
