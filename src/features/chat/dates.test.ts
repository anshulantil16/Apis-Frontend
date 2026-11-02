/* The day headings in a thread.
 *
 * Worth testing because every case here is a boundary, and a wrong heading
 * is the kind of thing nobody reports as a bug -- they just stop trusting
 * the timestamps.
 */
import { describe, expect, it } from 'vitest';
import { byDay, dayLabel, listStamp } from './dates';

/* A fixed "now": 2026-11-02 is a Monday, mid-afternoon. */
const now = new Date(2026, 10, 2, 15, 30);
const at = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m, d, h, min).toISOString();

describe('the heading above a day of messages', () => {
  it('calls today Today and yesterday Yesterday', () => {
    expect(dayLabel(at(2026, 10, 2, 9), now)).toBe('Today');
    expect(dayLabel(at(2026, 10, 1, 23), now)).toBe('Yesterday');
  });

  it('counts whole days, not 24-hour blocks', () => {
    /* 11:50pm last night is Yesterday, not Today, even though it is under
       16 hours ago -- which is what comparing elapsed time would say. */
    expect(dayLabel(at(2026, 10, 1, 23, 50), now)).toBe('Yesterday');
    /* And 00:10 this morning is Today, though it is over 15 hours ago. */
    expect(dayLabel(at(2026, 10, 2, 0, 10), now)).toBe('Today');
  });

  it('names the weekday inside the last week', () => {
    expect(dayLabel(at(2026, 10, 1 - 2), now)).toBe('Friday');
    expect(dayLabel(at(2026, 9, 28), now)).toBe('Wednesday');
  });

  it('gives a date once a week has passed', () => {
    /* "6 days ago" is a number nobody counts back from. */
    expect(dayLabel(at(2026, 9, 20), now)).toMatch(/20 October/);
  });

  it('adds the year only when it is not this one', () => {
    expect(dayLabel(at(2026, 0, 15), now)).not.toMatch(/2026/);
    expect(dayLabel(at(2025, 11, 15), now)).toMatch(/2025/);
  });

  it('says nothing rather than "Invalid Date" for a broken timestamp', () => {
    expect(dayLabel('not a date', now)).toBe('');
  });
});

describe('the stamp beside a conversation in the list', () => {
  it('shows a time for today and a day for anything older', () => {
    expect(listStamp(at(2026, 10, 2, 9, 5), now)).toMatch(/9:05/);
    expect(listStamp(at(2026, 10, 1), now)).toBe('Yesterday');
  });
});

describe('grouping a thread by day', () => {
  const msg = (id: number, iso: string) => ({ id, sent_at: iso });

  it('puts one heading over a run of messages from the same day', () => {
    const groups = byDay([
      msg(1, at(2026, 9, 20, 10)), msg(2, at(2026, 9, 20, 11)),
      msg(3, at(2026, 10, 1, 9)), msg(4, at(2026, 10, 2, 8)),
    ], now);
    expect(groups.map(g => g.label)).toEqual(['20 October', 'Yesterday', 'Today']);
    expect(groups[0].items.map(m => m.id)).toEqual([1, 2]);
  });

  it('keeps the messages in the order it was given them', () => {
    const groups = byDay([msg(9, at(2026, 10, 2, 8)), msg(10, at(2026, 10, 2, 9))], now);
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map(m => m.id)).toEqual([9, 10]);
  });

  it('starts a new group when the day changes back and forth', () => {
    /* Out-of-order messages should not collapse into one heading that
       covers two different days. */
    const groups = byDay([
      msg(1, at(2026, 10, 2, 8)), msg(2, at(2026, 10, 1, 9)), msg(3, at(2026, 10, 2, 10)),
    ], now);
    expect(groups.map(g => g.label)).toEqual(['Today', 'Yesterday', 'Today']);
  });

  it('handles an empty thread', () => {
    expect(byDay([], now)).toEqual([]);
  });
});
