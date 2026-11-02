/* Knowing a message arrived without having Messages open.
 *
 * Polled from the shell, so it runs on every screen in the intranet. The
 * first poll only takes a baseline and raises nothing: otherwise signing in
 * would pop up every conversation you already knew about, and people learn
 * to dismiss popups without reading them within a day of that happening.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { listConversations, type ConversationRow } from './api';

/* Slower than the thread's own poll. This one runs on every page for
   everybody who has Messages, and a badge being ten seconds stale costs
   nobody anything. */
const POLL_MS = 10000;
const TOAST_MS = 8000;

export interface ChatAlert {
  conversationId: number;
  name: string;
  preview: string;
  at: string;
}

const alertOf = (c: ConversationRow): ChatAlert => ({
  conversationId: c.id,
  name: c.person?.name ?? 'Someone',
  preview: c.last_message?.deleted ? 'Message deleted' : (c.last_message?.body ?? ''),
  at: c.last_message_at,
});

export function useChatAlerts(enabled: boolean, muted: boolean) {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<ChatAlert[]>([]);
  const [toasts, setToasts] = useState<ChatAlert[]>([]);
  /* conversation id -> the newest message id already accounted for. null
     until the first poll, which is what makes that poll silent. */
  const seen = useRef<Map<number, number> | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.conversationId !== id));
  }, []);

  useEffect(() => {
    if (!enabled) { setUnread(0); setItems([]); setToasts([]); return; }
    let alive = true;

    const poll = async () => {
      if (document.hidden) return;
      let rows: ConversationRow[];
      try {
        rows = (await listConversations()).conversations;
      } catch {
        return;   // a dropped poll is not worth telling anybody about
      }
      if (!alive) return;

      setUnread(rows.reduce((n, c) => n + c.unread, 0));
      setItems(rows.filter(c => c.unread > 0).map(alertOf));

      const before = seen.current;
      const now = new Map(rows.map(c => [c.id, c.last_message?.id ?? 0]));
      seen.current = now;
      if (!before) return;   // the baseline pass stays quiet

      if (muted) return;     // already reading Messages; the page shows it
      const fresh = rows.filter(c =>
        c.unread > 0 && c.last_message && !c.last_message.mine
        && c.last_message.id > (before.get(c.id) ?? 0));
      if (fresh.length) {
        setToasts(t => [
          ...t.filter(x => !fresh.some(c => c.id === x.conversationId)),
          ...fresh.map(alertOf),
        ].slice(-3));   // three at once is a stack; more is a wall
      }
    };

    void poll();
    const t = setInterval(() => void poll(), POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [enabled, muted]);

  /* Each popup clears itself. They are a nudge, not something to tidy up. */
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts(x => x.slice(1)), TOAST_MS);
    return () => clearTimeout(t);
  }, [toasts]);

  return { unread, items, toasts, dismiss };
}
