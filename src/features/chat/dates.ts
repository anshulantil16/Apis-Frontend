/* Where the day headings in a thread come from.
 *
 * The server sends only the moment a message was sent. The heading is worked
 * out here, in the reader's own timezone, because "Today" is a different day
 * for somebody reading at 11pm in Delhi and 1am the next morning, and a
 * label stored at send time would still say "Today" a week later.
 */

const DAY = 24 * 60 * 60 * 1000;

/* Midnight that starts the day this moment falls in, locally. */
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function dayLabel(iso: string, now = new Date()): string {
  const sent = new Date(iso);
  if (Number.isNaN(sent.getTime())) return '';
  const days = Math.round((startOfDay(now) - startOfDay(sent)) / DAY);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  /* Inside the last week people think in weekday names; past that a date
     is clearer than "6 days ago", which nobody counts back from. */
  if (days > 1 && days < 7) return sent.toLocaleDateString('en-IN', { weekday: 'long' });
  return sent.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long',
    ...(sent.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
}

export const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

/* When a conversation was last active, for the list down the side: a time
   today, "Yesterday", a weekday this week, then a date. */
export function listStamp(iso: string, now = new Date()): string {
  const label = dayLabel(iso, now);
  return label === 'Today' ? clockTime(iso) : label;
}

export interface Dated { sent_at: string }

/* A thread broken into days, so the screen renders one heading per day
   rather than deciding per message whether to draw one. */
export function byDay<T extends Dated>(messages: T[], now = new Date()): { label: string; items: T[] }[] {
  const out: { label: string; items: T[] }[] = [];
  for (const m of messages) {
    const label = dayLabel(m.sent_at, now);
    const last = out[out.length - 1];
    if (last && last.label === label) last.items.push(m);
    else out.push({ label, items: [m] });
  }
  return out;
}
