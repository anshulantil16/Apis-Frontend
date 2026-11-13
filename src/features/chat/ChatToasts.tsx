/* The popup when a message arrives.
 *
 * Bottom-right, above everything, and it closes itself. Clicking it opens
 * the conversation, because a notification you cannot act on is just an
 * interruption.
 */
import { MessageSquare, X } from 'lucide-react';
import type { ChatAlert } from './alerts';

export function ChatToasts({ toasts, onOpen, onDismiss }: {
  toasts: ChatAlert[];
  onOpen: (conversationId: number) => void;
  onDismiss: (conversationId: number) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 w-[min(21rem,calc(100vw-2.5rem))]">
      {toasts.map(t => (
        <div key={t.conversationId}
          className="ih-pop-in relative rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
          <button type="button" onClick={() => onOpen(t.conversationId)}
            className="w-full flex items-start gap-3 p-3.5 text-left hover:bg-amber-50/60 transition-colors">
            <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center
                             justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-black text-slate-900">{t.name}</span>
              <span className="block truncate text-[12px] text-slate-500">{t.preview}</span>
              <span className="block text-[10.5px] font-bold text-amber-600 mt-0.5">Tap to reply</span>
            </span>
          </button>
          <button type="button" title="Dismiss" onClick={() => onDismiss(t.conversationId)}
            className="absolute right-1.5 top-1.5 p-1 rounded-lg text-slate-300 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
