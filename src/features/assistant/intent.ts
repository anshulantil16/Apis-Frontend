/* How Ask APIS opens a particular form inside a tool, e.g. the IT ticket form
 * in Help Desk rather than just the Help Desk page.
 *
 * The assistant names the action ("helpdesk:it-ticket") and navigates; the
 * tool's page picks the action up when it is ready for it - after it has
 * mounted, and after its own sign-in where it has one. An action is used once.
 * If the page is already open, the event reaches it straight away. */
import { useEffect, useRef } from 'react';

const EVENT = 'ask-apis:intent';
/* Long enough to sign in to a tool first; short enough that an action
   someone never reached doesn't fire on a later, unrelated visit. */
const EXPIRES_MS = 5 * 60 * 1000;
let pending: { action: string; at: number } | null = null;

export function sendIntent(action: string) {
  pending = { action, at: Date.now() };
  window.dispatchEvent(new Event(EVENT));
}

function take(tool: string): string | null {
  if (!pending || !pending.action.startsWith(`${tool}:`)) return null;
  const { action, at } = pending;
  pending = null;
  return Date.now() - at > EXPIRES_MS ? null : action.slice(tool.length + 1);
}

/* Run `onAction` with this tool's pending action, if any, once `ready`. */
export function useAssistantIntent(tool: string, onAction: (action: string) => void, ready = true) {
  const handler = useRef(onAction);
  useEffect(() => { handler.current = onAction; });

  useEffect(() => {
    if (!ready) return;
    const run = () => { const a = take(tool); if (a) handler.current(a); };
    run();
    window.addEventListener(EVENT, run);
    return () => window.removeEventListener(EVENT, run);
  }, [tool, ready]);
}
