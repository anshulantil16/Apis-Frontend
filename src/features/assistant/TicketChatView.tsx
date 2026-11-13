/* The Help Desk conversation - an IT ticket or an Admin request - inside the
 * Ask APIS panel. The screen is the shared SecureChatView; the logic is
 * useTicketChat.ts. */
import { CheckCircle2, Laptop, Pencil } from 'lucide-react';
import { SecureChatView } from './SecureChatView';
import type { TicketChat } from './useTicketChat';

export function TicketChatView({ flow, onOpenHelpDesk }: { flow: TicketChat; onOpenHelpDesk: () => void }) {
  return (
    <SecureChatView title={flow.desk === 'admin' ? 'Admin request' : flow.desk === 'it' ? 'IT ticket' : 'Help Desk request'}
      icon={<Laptop className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
      flow={{
        msgs: flow.msgs, busy: flow.busy, sending: flow.stage === 'sending', who: flow.who,
        input: flow.stage === 'otp' ? 'code' : flow.stage === 'email' ? 'email' : 'text',
        reply: flow.reply, reset: flow.reset,
      }}
      renderReview={() => <Review flow={flow} />}
      portalLabel="Open the Help Desk" onOpenPortal={onOpenHelpDesk} />
  );
}

/* The ticket so far, each answer changeable, and the submit. */
function Review({ flow }: { flow: TicketChat }) {
  const ready = flow.stage === 'review';
  return (
    <div className="rounded-xl bg-white ring-1 ring-amber-200 p-3 space-y-2.5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-wide text-amber-600">
        {flow.desk === 'admin' ? 'Admin request' : 'IT ticket'}
      </p>
      <dl className="space-y-1">
        {flow.rows.map(r => (
          <div key={r.key} className="flex items-start gap-2 text-[11.5px]">
            <dt className="w-[34%] flex-shrink-0 text-slate-500 font-semibold">{r.label}</dt>
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
          {flow.desk !== 'admin' && (
            <p className="text-[10.5px] text-slate-400">Need to attach a screenshot? Raise it from the Help Desk form instead.</p>
          )}
          <button type="button" onClick={() => void flow.submit()}
            className="aa-chip w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                       bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[12px] font-black shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />{flow.desk === 'admin' ? 'Send request' : 'Raise ticket'}
          </button>
        </>
      )}
    </div>
  );
}
