/* A signed-in errand inside the Ask APIS panel - filling in a TA/DA request
 * an IT ticket, a goal sheet or an EOM nomination. Its messages, the summary card (renderReview), and its
 * own input, which takes the sign-in code as a password. The flows' logic is
 * useTadaChat.ts, useTicketChat.ts, useGoalChat.ts and useEomChat.ts. */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, CheckCircle2, Lock, LogOut, RefreshCw, SendHorizontal } from 'lucide-react';
import { BeeMascot } from './BeeMascot';

export interface ChatMsg {
  id: number;
  from: 'user' | 'bot';
  text: string;
  chips?: string[];
  tone?: 'error' | 'ok' | 'note';
  /* Shown with the live summary card under it. */
  review?: boolean;
  /* Offer the full form, for what the chat can't do. */
  portal?: boolean;
}

export interface SecureFlow {
  msgs: ChatMsg[];
  busy: boolean;
  sending: boolean;
  /* Who is signed in, or null. */
  who: string | null;
  /* What the input box is for right now. */
  input: 'code' | 'id' | 'email' | 'text';
  reply: (text: string) => void;
  reset: () => void;
}

export function SecureChatView({ title, icon, flow, renderReview, portalLabel, onOpenPortal }: {
  title: string;
  icon: ReactNode;
  flow: SecureFlow;
  renderReview: () => ReactNode;
  portalLabel: string;
  onOpenPortal: () => void;
}) {
  const [text, setText] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const lastReview = [...flow.msgs].reverse().find(m => m.review)?.id;
  const lastId = flow.msgs[flow.msgs.length - 1]?.id;
  const code = flow.input === 'code';

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [flow.msgs, flow.busy]);
  useEffect(() => { if (!flow.busy) input.current?.focus(); }, [flow.busy, flow.input]);

  const go = (v: string) => { flow.reply(v); setText(''); };
  const onSubmit = (e: FormEvent) => { e.preventDefault(); go(text); };

  return (
    <>
      {/* Whose session this is, and the way out of it. */}
      <div className="flex-shrink-0 mx-4 mb-2 flex items-center gap-2 rounded-xl bg-white/80 ring-1 ring-amber-200 px-3 py-1.5">
        {icon}
        <p className="flex-1 min-w-0 truncate text-[11.5px] font-black text-slate-700">
          {title}
          <span className="font-semibold text-slate-500">
            {flow.who ? <> · <Lock className="inline w-3 h-3 -mt-0.5" /> {flow.who}</> : ' · not signed in'}
          </span>
        </p>
        <button type="button" onClick={flow.reset} title="Leave and clear everything"
          className="inline-flex items-center gap-1 text-[11px] font-black text-slate-500 hover:text-rose-600">
          <LogOut className="w-3.5 h-3.5" />Leave
        </button>
      </div>

      <div ref={scroller} aria-live="polite" className="aa-scroll flex-1 min-h-0 overflow-y-auto px-4 pb-3 space-y-3">
        {flow.msgs.map(m => m.from === 'user' ? (
          <div key={m.id} className="aa-msg-in flex justify-end pt-1">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-amber-400 to-orange-500 px-3.5 py-2
                            text-[12.5px] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(234,88,12,.7)] break-words whitespace-pre-wrap">
              {m.text}
            </div>
          </div>
        ) : (
          <div key={m.id} className="aa-msg-in flex items-start gap-2">
            <span className="w-8 h-8 rounded-full bg-white ring-2 ring-amber-200 flex items-center justify-center flex-shrink-0">
              <BeeMascot size={30} still />
            </span>
            <div className="flex-1 min-w-0 space-y-2">
              <div className={`inline-block rounded-2xl rounded-tl-md px-3.5 py-2 ring-1 shadow-sm text-[12.5px] font-semibold whitespace-pre-line
                ${m.tone === 'error' ? 'bg-rose-50 ring-rose-200 text-rose-700'
                  : m.tone === 'ok' ? 'bg-emerald-50 ring-emerald-200 text-emerald-800'
                  : m.tone === 'note' ? 'bg-sky-50 ring-sky-100 text-sky-900'
                  : 'bg-white ring-amber-100 text-slate-700'}`}>
                {m.tone === 'ok' && <CheckCircle2 className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />}
                {m.text}
              </div>

              {m.review && m.id === lastReview && renderReview()}

              {/* Choices only on the newest message, so an old one can't be answered twice. */}
              {m.id === lastId && !flow.busy && m.chips && m.chips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.chips.map(c => (
                    <button key={c} type="button" onClick={() => go(c)}
                      className="aa-chip px-2.5 py-1.5 rounded-full bg-white ring-1 ring-amber-200 hover:bg-amber-50 text-[11.5px] font-bold text-slate-700">
                      {c}
                    </button>
                  ))}
                </div>
              )}
              {m.portal && (
                <button type="button" onClick={onOpenPortal}
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-black text-orange-600 hover:text-orange-700">
                  {portalLabel}<ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
        {flow.busy && (
          <div className="flex items-center gap-2 pl-10 text-[11.5px] font-bold text-amber-800/70">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />{flow.sending ? 'Submitting…' : 'One moment…'}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex-shrink-0 px-3 pb-3 pt-1">
        <div className="flex items-center gap-2 pl-3.5 pr-1.5 py-1.5 rounded-full bg-white ring-1 ring-amber-200
                        shadow-[0_6px_18px_-10px_rgba(194,120,3,.6)] focus-within:ring-2 focus-within:ring-amber-400 transition-all">
          <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
          {/* The code is typed as a password and never echoed back. */}
          <input ref={input} value={text} onChange={e => setText(e.target.value)} disabled={flow.busy}
            type={code ? 'password' : flow.input === 'email' ? 'email' : 'text'}
            inputMode={code ? 'numeric' : flow.input === 'email' ? 'email' : 'text'}
            autoComplete={code ? 'one-time-code' : 'off'} maxLength={code ? 6 : 1000}
            placeholder={code ? '6-digit code' : flow.input === 'id' ? 'Your Employee ID'
              : flow.input === 'email' ? 'Your work email' : 'Type your answer…'}
            className="flex-1 min-w-0 bg-transparent text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none" />
          <button type="submit" title="Send" disabled={!text.trim() || flow.busy}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center
                       shadow-md shadow-orange-500/30 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 transition-all flex-shrink-0">
            <SendHorizontal className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] font-semibold text-amber-900/45">
          Signed in with an emailed code · nothing is saved in this browser · Leave clears it all
        </p>
      </form>
    </>
  );
}
