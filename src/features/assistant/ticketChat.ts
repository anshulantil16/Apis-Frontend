/* An IT ticket or an Admin request, asked one question at a time in the
 * Ask APIS chat.
 *
 * The questions are the Help Desk's "Raise IT Ticket" form
 * (helpdesk/HelpDeskPage.tsx) with the same choices: subject, description,
 * category, who in IT handles it, priority, and what it is related to.
 * Attachments are the one thing left to the form - a chat has nowhere to
 * drop a screenshot. An Admin request is the "Request an item" form: what is
 * needed, category, quantity, urgency, when by, why, and which admin.
 * The server checks it all again on submit (roompulse/assistant.py runs the
 * Help Desk's own views). */
import { TICKET_CATEGORY_LABEL, TICKET_RELATED_TO_OPTIONS } from '../helpdesk/HelpDeskTickets';
import { CATEGORY_LABEL, URGENCY_LABEL } from '../helpdesk/HelpDeskShared';
import { oneOf, parseDate, showDate, text, type Field } from './tadaChat';

export interface Staff { email: string; name: string }
export type Desk = 'it' | 'admin';

const CATEGORIES = Object.entries(TICKET_CATEGORY_LABEL);
const PRIORITIES = [
  ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['critical', 'Critical'],
] as const;

/* A label typed or tapped -> its key, through the loose matching oneOf does. */
const byLabel = (pairs: readonly (readonly [string, string])[]) => (t: string) => {
  const r = oneOf(pairs.map(p => p[1]))(t);
  return 'value' in r ? { value: pairs.find(p => p[1] === r.value)![0] } : r;
};
const label = (pairs: readonly (readonly [string, string])[]) => (v: string) =>
  pairs.find(p => p[0] === v)?.[1] ?? v;

export function ticketFields(staff: Staff[]): Field[] {
  const people = staff.map(s => [s.email, s.name] as const);
  return [
    { key: 'subject', label: 'Subject', ask: () => 'In one line, what’s the problem? (this becomes the ticket’s subject)',
      parse: text(5) },
    { key: 'description', label: 'Description',
      ask: () => 'Now describe it in detail — what happened, since when, any error message you see.', parse: text(10) },
    { key: 'category', label: 'Issue category', ask: () => 'Which category fits best?',
      chips: () => CATEGORIES.map(c => c[1]), parse: byLabel(CATEGORIES), show: label(CATEGORIES) },
    { key: 'related_to', label: 'Related to', ask: () => 'What is it related to?',
      chips: () => TICKET_RELATED_TO_OPTIONS, parse: oneOf(TICKET_RELATED_TO_OPTIONS) },
    { key: 'priority', label: 'Priority',
      ask: () => 'How urgent is it? Critical is for work stopped entirely.',
      chips: () => PRIORITIES.map(p => p[1]), parse: byLabel(PRIORITIES), show: label(PRIORITIES) },
    { key: 'assigned_to_email', label: 'Handled by', ask: () => 'Who in IT should handle it?',
      chips: () => people.map(p => p[1]),
      parse: t => {
        const r = byLabel(people)(t);
        if ('value' in r) return r;
        const hit = people.find(p => p[0].toLowerCase() === t.trim().toLowerCase());
        return hit ? { value: hit[0] } : { error: `Please pick someone from IT: ${people.map(p => p[1]).join(', ')}.` };
      },
      show: label(people) },
  ];
}

/* The Admin request form, for the other desk. */
export function adminFields(staff: Staff[]): Field[] {
  const people = staff.map(s => [s.email, s.name] as const);
  const categories = Object.entries(CATEGORY_LABEL);
  const urgencies = Object.entries(URGENCY_LABEL);
  return [
    { key: 'item_name', label: 'What you need', ask: () => 'What do you need? (e.g. Office chair, A4 paper, AC repair)',
      parse: text(2) },
    { key: 'category', label: 'Category', ask: () => 'Which category is it?',
      chips: () => categories.map(c => c[1]), parse: byLabel(categories), show: label(categories) },
    { key: 'quantity', label: 'Quantity', ask: () => 'How many?', chips: () => ['1', '2', '5'],
      parse: t => { const n = parseInt(t, 10); return n >= 1 && n <= 1000 ? { value: String(n) } : { error: 'Please give a number, 1 or more.' }; } },
    { key: 'urgency', label: 'Urgency', ask: () => 'How urgent is it?',
      chips: () => urgencies.map(u => u[1]), parse: byLabel(urgencies), show: label(urgencies) },
    { key: 'needed_by', label: 'Needed by', optional: true, ask: () => 'Needed by when? (optional)',
      chips: () => ['Today', 'Tomorrow'],
      parse: t => {
        const v = parseDate(t);
        if (!v) return { error: 'I couldn’t read that date. Try 12/11/2026 or 12 Nov.' };
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return new Date(v) < today ? { error: 'That date has already passed.' } : { value: v };
      },
      show: showDate },
    { key: 'reason', label: 'Reason', optional: true, ask: () => 'Why do you need it? (optional)', parse: text(2) },
    { key: 'department', label: 'Department', optional: true, ask: () => 'Your department? (optional)', parse: text(2) },
    { key: 'assigned_to_email', label: 'Handled by', ask: () => 'Which admin should handle it?',
      chips: () => people.map(p => p[1]),
      parse: t => {
        const r = byLabel(people)(t);
        if ('value' in r) return r;
        const hit = people.find(p => p[0].toLowerCase() === t.trim().toLowerCase());
        return hit ? { value: hit[0] } : { error: `Please pick someone from Admin: ${people.map(p => p[1]).join(', ')}.` };
      },
      show: label(people) },
  ];
}

/* Whether a message asks to raise something at the Help Desk, and which desk.
 * "raise an IT ticket" -> it; "raise an admin ticket", "request a chair" ->
 * admin; "raise a ticket" -> ask; "show my tickets" -> null. */
export function ticketDesk(q: string): Desk | 'ask' | null {
  const s = q.toLowerCase();
  if (/\b(my|status|track|pending|approve|close|closed)\s+(ticket|tickets|request|requests)\b/.test(s)) return null;
  const verb = /\b(raise|create|new|open|submit|file|log|fill|make|lodge|register|request|book|need)\b/.test(s);
  const ticket = /\b(ticket|tickets|it support|help ?desk|complaint)\b/.test(s);
  const admin = /\b(admin|item|items|chair|chairs|table|furniture|stationery|pantry|housekeeping|cleaning|courier|id card|badge|plumbing|electricity|electrical|light|bulb|repair|ac|water)\b/.test(s);
  const it = /\b(it|laptop|computer|desktop|vpn|email|outlook|printer|scanner|wifi|internet|network|software|password|login|teams)\b/.test(s);
  if (!verb || !(ticket || (admin && !it))) return null;
  if (admin && !it) return 'admin';
  if (it && !admin) return 'it';
  return 'ask';
}

/* Kept for anything still asking the old question. */
export const wantsTicketFill = (q: string) => ticketDesk(q) !== null;
