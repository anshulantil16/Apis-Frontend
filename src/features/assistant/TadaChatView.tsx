/* The TA/DA conversation inside the Ask APIS panel. The screen is the shared
 * SecureChatView; the logic is useTadaChat.ts. */
import { CheckCircle2, Pencil, Plane, Trash2 } from 'lucide-react';
import { SecureChatView } from './SecureChatView';
import type { TadaChat } from './useTadaChat';

export function TadaChatView({ flow, onOpenPortal }: { flow: TadaChat; onOpenPortal: () => void }) {
  return (
    <SecureChatView title="TA/DA request" icon={<Plane className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
      flow={{
        msgs: flow.msgs, busy: flow.busy, sending: flow.stage === 'sending', who: flow.who?.name ?? null,
        input: flow.stage === 'otp' ? 'code' : flow.stage === 'id' ? 'id' : 'text',
        reply: flow.reply, reset: flow.reset,
      }}
      renderReview={() => (flow.kind ? <Review flow={flow} /> : null)}
      portalLabel="Open the TA/DA Portal" onOpenPortal={onOpenPortal} />
  );
}

/* The answers so far, each one changeable, and the submit. */
function Review({ flow }: { flow: TadaChat }) {
  const local = flow.kind === 'local_travel';
  const ready = flow.stage === 'review';
  return (
    <div className="rounded-xl bg-white ring-1 ring-amber-200 p-3 space-y-2.5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-wide text-amber-600">
        {local ? 'Local Travel' : 'Tour Programme Sanction'}
      </p>
      <dl className="space-y-1">
        {flow.rows.map(r => (
          <div key={r.key} className="group flex items-start gap-2 text-[11.5px]">
            <dt className="w-[42%] flex-shrink-0 text-slate-500 font-semibold">{r.label}</dt>
            <dd className="flex-1 min-w-0 font-bold text-slate-800 break-words">{r.value}</dd>
            {ready && (
              <button type="button" onClick={() => flow.edit(r.key)} title={`Change ${r.label.toLowerCase()}`}
                className="text-slate-300 hover:text-amber-600"><Pencil className="w-3 h-3" /></button>
            )}
          </div>
        ))}
      </dl>
      {local && (
        <div className="space-y-1.5">
          {flow.itemRows.map((it, i) => (
            <div key={i} className="rounded-lg bg-amber-50/70 ring-1 ring-amber-100 px-2.5 py-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10.5px] font-black text-amber-700">Trip {i + 1}</p>
                {ready && flow.itemRows.length > 1 && (
                  <button type="button" onClick={() => flow.removeItem(i)} title="Remove this trip"
                    className="text-slate-300 hover:text-rose-600"><Trash2 className="w-3 h-3" /></button>
                )}
              </div>
              <p className="text-[11.5px] text-slate-700 leading-snug">
                {it.map(r => r.value).filter(v => v !== '—').join(' · ')}
              </p>
            </div>
          ))}
          {ready && (
            <button type="button" onClick={flow.addItem}
              className="text-[11.5px] font-black text-amber-700 hover:text-amber-800">+ Add another trip</button>
          )}
        </div>
      )}
      {ready && (
        <button type="button" onClick={() => void flow.submit()}
          className="aa-chip w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                     bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[12px] font-black shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5" />Submit for approval
        </button>
      )}
    </div>
  );
}
