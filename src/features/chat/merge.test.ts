/* Folding a poll's answer into the thread on screen.
 *
 * The poll now asks "what changed since", which can return a message the
 * screen already holds -- so this is a replace-or-append, and getting it
 * wrong shows the same message twice or loses the change.
 */
import { describe, expect, it } from 'vitest';
import { merge } from './merge';
import type { ChatMessage } from './api';

const msg = (id: number, over: Partial<ChatMessage> = {}): ChatMessage => ({
  id, body: `message ${id}`, kind: 'text', deleted: false, edited: false,
  seen: false, sent_at: new Date().toISOString(), sender_id: 2, mine: false,
  sender_name: 'Bhavesh Shah', attachments: [], reply_to: null, ...over,
});

describe('folding in what changed', () => {
  it('replaces a message that was deleted rather than adding a second copy', () => {
    /* The bug this whole change exists for: the reader kept looking at a
       message the sender had deleted. */
    const screen = [msg(1), msg(2)];
    const out = merge(screen, [msg(2, { deleted: true, body: '' })]);
    expect(out).toHaveLength(2);
    expect(out[1].deleted).toBe(true);
    expect(out[1].body).toBe('');
  });

  it('replaces an edited message in place', () => {
    const out = merge([msg(1), msg(2)], [msg(1, { body: 'twelve lakh', edited: true })]);
    expect(out.map(m => m.id)).toEqual([1, 2]);
    expect(out[0].body).toBe('twelve lakh');
  });

  it('appends a message that is new', () => {
    expect(merge([msg(1)], [msg(2)]).map(m => m.id)).toEqual([1, 2]);
  });

  it('handles a delete and an arrival in the same answer', () => {
    const out = merge([msg(1), msg(2)], [msg(2, { deleted: true }), msg(3)]);
    expect(out.map(m => m.id)).toEqual([1, 2, 3]);
    expect(out[1].deleted).toBe(true);
  });

  it('keeps an edited message where it was written, not at the bottom', () => {
    /* Sorted by id, which is the server's order. Sorting by anything that
       moves on an edit would jump an hour-old message to the end of the
       thread the moment somebody fixed a typo in it. */
    const out = merge([msg(1), msg(2), msg(3)], [msg(1, { body: 'fixed', edited: true })]);
    expect(out.map(m => m.id)).toEqual([1, 2, 3]);
  });

  it('leaves the thread untouched when nothing changed', () => {
    /* The common case by far -- it runs every four seconds for everyone
       with a thread open, and returning a new array each time would
       re-render the whole thread for nothing. */
    const screen = [msg(1), msg(2)];
    expect(merge(screen, [])).toBe(screen);
  });

  it('copes with a first answer into an empty thread', () => {
    expect(merge([], [msg(1), msg(2)]).map(m => m.id)).toEqual([1, 2]);
  });
});
