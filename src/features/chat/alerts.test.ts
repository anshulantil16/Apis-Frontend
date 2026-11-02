/* What counts as a new message worth interrupting somebody for.
 *
 * The decision is a plain function of "what I saw last time" and "what is
 * there now", kept out of the hook so the cases that go wrong in practice
 * can be checked directly.
 */
import { describe, expect, it } from 'vitest';
import { newArrivals, seenMap } from './alerts';
import type { ConversationRow } from './api';

const row = (id: number, messageId: number, opts: Partial<{
  unread: number; mine: boolean; body: string; name: string;
}> = {}): ConversationRow => ({
  id,
  person: {
    id: id * 10, name: opts.name ?? 'Bhavesh Shah', employee_code: `HO010${id}`,
    email: '', designation: '', department: '',
  },
  last_message: {
    id: messageId, body: opts.body ?? 'hello', deleted: false, edited: false,
    sent_at: new Date().toISOString(), sender_id: 2,
    mine: opts.mine ?? false, sender_name: 'Bhavesh Shah',
  },
  unread: opts.unread ?? 1,
  last_message_at: new Date().toISOString(),
});

describe('deciding what is new', () => {
  it('raises nothing on the first look', () => {
    /* Otherwise signing in pops up every conversation you already knew
       about, and people stop reading the popups. */
    expect(newArrivals(null, [row(1, 5), row(2, 9)])).toEqual([]);
  });

  it('raises a message that arrived since the last look', () => {
    const before = seenMap([row(1, 5)]);
    const fresh = newArrivals(before, [row(1, 6, { body: 'you there?' })]);
    expect(fresh).toHaveLength(1);
    expect(fresh[0].preview).toBe('you there?');
    expect(fresh[0].conversationId).toBe(1);
  });

  it('does not raise the same message twice', () => {
    const rows = [row(1, 6)];
    expect(newArrivals(seenMap(rows), rows)).toEqual([]);
  });

  it('never raises your own message', () => {
    /* Sending from a second tab must not notify you about yourself. */
    const before = seenMap([row(1, 5)]);
    expect(newArrivals(before, [row(1, 6, { mine: true })])).toEqual([]);
  });

  it('does not raise a thread you have already read', () => {
    const before = seenMap([row(1, 5)]);
    expect(newArrivals(before, [row(1, 6, { unread: 0 })])).toEqual([]);
  });

  it('raises a conversation it has never seen before', () => {
    /* Somebody messaging you for the first time has no entry in the map at
       all -- treating "unknown" as "nothing new" would silently drop the
       first message of every new conversation. */
    const before = seenMap([row(1, 5)]);
    const fresh = newArrivals(before, [row(1, 5), row(2, 1, { name: 'Chandra Iyer' })]);
    expect(fresh.map(f => f.name)).toEqual(['Chandra Iyer']);
  });

  it('raises each conversation once when several arrive together', () => {
    const before = seenMap([row(1, 5), row(2, 5)]);
    expect(newArrivals(before, [row(1, 6), row(2, 7)])).toHaveLength(2);
  });

  it('says a message was deleted rather than showing an empty popup', () => {
    const before = seenMap([row(1, 5)]);
    const gone = row(1, 6);
    gone.last_message = { ...gone.last_message!, deleted: true, body: '' };
    expect(newArrivals(before, [gone])[0].preview).toBe('Message deleted');
  });

  it('copes with a conversation that has no messages yet', () => {
    const empty = row(1, 0);
    empty.last_message = null;
    expect(newArrivals(seenMap([]), [empty])).toEqual([]);
  });
});
