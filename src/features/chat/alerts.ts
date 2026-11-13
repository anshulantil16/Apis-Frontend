/* Knowing a message arrived without having Messages open.
 *
 * Polled from the shell, so it runs on every screen in the intranet.
 *
 * Three things decide whether this feels instant or feels broken, and the
 * first version got two of them wrong:
 *
 *   * It skipped the poll entirely while the tab was in the background --
 *     which is exactly when somebody is waiting to be told something. The
 *     tab a message arrives in is almost never the tab you are looking at.
 *   * Browsers throttle timers in a background tab to about once a minute,
 *     so even without that skip, a backgrounded tab is slow. The fix is to
 *     poll the moment the tab is looked at again, rather than to wait for
 *     the next tick.
 *   * The first poll must raise nothing. Otherwise signing in pops up every
 *     conversation you already knew about, and people learn to dismiss
 *     popups without reading them within a day of that happening.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { listConversations, type ConversationRow } from './api';

const POLL_MS = 5000;
const TOAST_MS = 8000;

export interface ChatAlert {
  conversationId: number;
  name: string;
  preview: string;
  at: string;
}

/* What a message says, in one line, for a popup and for the bell.
 *
 * A photo sent with no words has no body at all, and showing the empty
 * string gives a popup with a name and nothing under it. Saying "Photo" is
 * both true and the thing the reader needs to decide whether to look. */
function previewOf(c: ConversationRow): string {
  const m = c.last_message;
  if (!m) return '';
  if (m.deleted) return 'Message deleted';
  if (m.body) return m.body;
  const first = m.attachments?.[0];
  if (!first) return '';
  const more = (m.attachments?.length ?? 0) - 1;
  const one = first.kind === 'image' ? 'Photo' : first.name;
  return more > 0 ? `${one} and ${more} more` : one;
}

export const alertOf = (c: ConversationRow): ChatAlert => ({
  conversationId: c.id,
  // A group has a name; a direct conversation is named after the person.
  name: c.title || c.person?.name || 'Someone',
  preview: previewOf(c),
  at: c.last_message_at,
});

/* What is new since the last look, as a plain function of the two states.
 *
 * `before` maps a conversation id to the newest message id already
 * accounted for. A null `before` means this is the first look and nothing
 * counts as new -- see the note about the baseline above.
 */
export function newArrivals(
  before: Map<number, number> | null,
  rows: ConversationRow[],
): ChatAlert[] {
  if (!before) return [];
  return rows
    .filter(c => c.unread > 0 && c.last_message && !c.last_message.mine
      && c.last_message.id > (before.get(c.id) ?? 0))
    .map(alertOf);
}

export const seenMap = (rows: ConversationRow[]) =>
  new Map(rows.map(c => [c.id, c.last_message?.id ?? 0]));

/* A notification outside the browser tab, for the case this is really
   about: the intranet open in a tab nobody is looking at. Silent unless
   the person has allowed it -- asking is a separate, deliberate act, see
   askForDesktopAlerts. */
function desktopAlert(a: ChatAlert) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(`${a.name} sent you a message`, {
      body: a.preview.slice(0, 180),
      // One notification per conversation: five messages from the same
      // person replace each other rather than stacking five deep.
      tag: `apis-chat-${a.conversationId}`,
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch { /* some browsers refuse outright; the in-page popup still runs */ }
}

export async function askForDesktopAlerts(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export const desktopAlertState = (): NotificationPermission | 'unsupported' =>
  (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

/* The unread count in the tab title, which is how somebody notices while
   looking at another tab entirely. */
function setTitleBadge(n: number) {
  const base = document.title.replace(/^\(\d+\)\s*/, '');
  document.title = n > 0 ? `(${n}) ${base}` : base;
}

export function useChatAlerts(enabled: boolean, muted: boolean) {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<ChatAlert[]>([]);
  const [toasts, setToasts] = useState<ChatAlert[]>([]);
  const seen = useRef<Map<number, number> | null>(null);
  /* Read inside the poll rather than closed over, so changing screens does
     not tear down the interval and restart its clock. */
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const dismiss = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.conversationId !== id));
  }, []);

  useEffect(() => {
    if (!enabled) {
      setUnread(0); setItems([]); setToasts([]); setTitleBadge(0);
      return;
    }
    let alive = true;
    let running = false;

    const poll = async () => {
      // Polls keep running in a hidden tab -- that is the case this exists
      // for. Only overlapping requests are skipped.
      if (running) return;
      running = true;
      let rows: ConversationRow[];
      try {
        rows = (await listConversations()).conversations;
      } catch {
        return;   // a dropped poll is not worth telling anybody about
      } finally {
        running = false;
      }
      if (!alive) return;

      const count = rows.reduce((n, c) => n + c.unread, 0);
      setUnread(count);
      setTitleBadge(count);
      setItems(rows.filter(c => c.unread > 0).map(alertOf));

      const fresh = newArrivals(seen.current, rows);
      seen.current = seenMap(rows);
      if (!fresh.length || mutedRef.current) return;

      setToasts(t => [
        ...t.filter(x => !fresh.some(f => f.conversationId === x.conversationId)),
        ...fresh,
      ].slice(-3));   // three at once is a stack; more is a wall
      for (const a of fresh) desktopAlert(a);
    };

    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    /* Coming back to the tab asks straight away rather than waiting for the
       next tick, which a background tab may have had throttled to a minute. */
    const wake = () => { if (!document.hidden) void poll(); };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
      setTitleBadge(0);
    };
  }, [enabled]);

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts(x => x.slice(1)), TOAST_MS);
    return () => clearTimeout(t);
  }, [toasts]);

  return { unread, items, toasts, dismiss };
}
