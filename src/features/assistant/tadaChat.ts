/* The TA/DA request, asked one question at a time in the Ask APIS chat.
 *
 * The questions are the portal's New Request form (tada/NewRequest.tsx), in
 * the same order and with the same choices, for the two requests a chat can
 * fill: a Tour Programme for one city, and a Local Travel claim. Travelling
 * Expenses need bills uploaded and a multi-city tour needs the itinerary
 * editor, so those stay in the portal.
 *
 * Nothing here is sent anywhere or kept anywhere: this is the questions and
 * the checks on each answer. The server repeats every check on submit
 * (tada/assistant.py runs the portal's own views), so a rule missed here is
 * still refused there, with the portal's own wording. */
import { LOCAL_MODES, LOCAL_TYPES, TIME_PREFS, TRAVEL_MODES } from '../tada/shared';

export type Kind = 'tour_sanction' | 'local_travel';
export type Answers = Record<string, string>;

export interface Caps {
  mode_options?: { entitled: { mode: string; note: string }[]; exception: { mode: string; note: string }[] };
  approved_travel_mode?: string | null;
  local_conveyance_daily?: number | null;
}

export interface Field {
  key: string;
  /* How it is shown on the summary. */
  label: string;
  ask: (a: Answers, caps: Caps) => string;
  chips?: (a: Answers, caps: Caps, ctx: Ctx) => string[];
  optional?: boolean;
  /* Only asked when this says so. */
  when?: (a: Answers, caps: Caps) => boolean;
  /* -> the stored value, or an error to ask again with. */
  parse?: (text: string, a: Answers, caps: Caps) => Parsed;
  /* How a stored value reads back to the person. */
  show?: (v: string) => string;
}

export interface Ctx { hqCity?: string }

export const SKIP = 'Skip';

type Parsed = { value: string } | { error: string };

/* ── Dates ─────────────────────────────────────────────────────────────── */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* "2026-11-10", "10/11/2026", "10-11-26", "10 Nov", "Nov 10 2026", "today",
   "tomorrow" -> "2026-11-10". Day first, the way dates are written here. */
export function parseDate(text: string): string | null {
  const t = text.trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, '$1').replace(/,/g, ' ');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const plus = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };
  if (t === 'today') return plus(0);
  if (t === 'tomorrow') return plus(1);
  if (t === 'day after tomorrow') return plus(2);
  const build = (y: number, m: number, d: number) => {
    const dt = new Date(y, m, d);
    return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d ? iso(dt) : null;
  };
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return build(+m[1], +m[2] - 1, +m[3]);
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) return build(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]);
  // A month by name, either side of the day; the year defaults to this one.
  m = t.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/) ;
  let day: number | undefined, mon: string | undefined, yr: string | undefined;
  if (m) { day = +m[1]; mon = m[2]; yr = m[3]; } else {
    m = t.match(/^([a-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/);
    if (m) { mon = m[1]; day = +m[2]; yr = m[3]; }
  }
  if (day && mon) {
    const mi = MONTHS.indexOf(mon.slice(0, 3));
    if (mi >= 0) return build(yr ? +yr : today.getFullYear(), mi, day);
  }
  return null;
}

export const showDate = (v: string) => {
  if (!v) return '—';
  const [y, m, d] = v.split('-').map(Number);
  return `${d} ${MONTHS[m - 1][0].toUpperCase()}${MONTHS[m - 1].slice(1)} ${y}`;
};

const date = (opts: { after?: string; afterLabel?: string; within?: [string, string] } = {}) =>
  (text: string, a: Answers): Parsed => {
    const v = parseDate(text);
    if (!v) return { error: 'I couldn’t read that date. Try something like 12/11/2026 or 12 Nov.' };
    const after = opts.after && a[opts.after];
    if (after && v < after) return { error: `That’s before ${opts.afterLabel} (${showDate(after)}). Please give a later date.` };
    if (opts.within) {
      const [f, t] = [a[opts.within[0]], a[opts.within[1]]];
      if (f && t && (v < f || v > t)) return { error: `It has to be within your trip, ${showDate(f)} to ${showDate(t)}.` };
    }
    return { value: v };
  };

/* ── Small parsers ─────────────────────────────────────────────────────── */
export const text = (min = 2) => (t: string) =>
  t.trim().length >= min ? { value: t.trim() } : { error: 'Could you say a little more?' };

const money = (t: string): Parsed => {
  const n = Number(t.replace(/[₹,\s]|rs\.?|inr/gi, ''));
  return Number.isFinite(n) && n >= 0 ? { value: String(Math.round(n * 100) / 100) } : { error: 'Please give an amount in rupees, like 1500.' };
};

const phone = (t: string) => {
  const d = t.replace(/[\s-]/g, '');
  return /^(\+?91)?[6-9]\d{9}$/.test(d) ? { value: d } : { error: 'That doesn’t look like a mobile number. Please give 10 digits.' };
};

/* One of a fixed list, matched loosely, the typed word or the chip. */
export const oneOf = (list: string[], other = false) => (t: string) => {
  const q = t.trim().toLowerCase();
  const hit = list.find(x => x.toLowerCase() === q)
    ?? list.find(x => x.toLowerCase().startsWith(q) || q.includes(x.toLowerCase().split(/[ /]/)[0]));
  if (hit) return { value: hit };
  return other && q.length >= 2 ? { value: t.trim() } : { error: `Please pick one of: ${list.join(', ')}.` };
};

const BOOK_SELF = 'I will book it myself';
const BOOK_DESK = 'Travel Help Desk books it';
const booking = (t: string) => {
  const q = t.toLowerCase();
  if (/desk|company|help|you book|they/.test(q)) return { value: 'company' };
  if (/self|myself|me|i will|i'll|own/.test(q)) return { value: 'self' };
  return { error: `Please choose “${BOOK_SELF}” or “${BOOK_DESK}”.` };
};
const showBooking = (v: string) => (v === 'company' ? BOOK_DESK : BOOK_SELF);

const TRIPS = { round_trip: 'To & Fro', one_way: 'One Way' } as const;
const trip = (t: string) => {
  const q = t.toLowerCase();
  if (/one|single/.test(q)) return { value: 'one_way' };
  if (/fro|round|return|both|back/.test(q)) return { value: 'round_trip' };
  return { error: 'Please choose “To & Fro” or “One Way”.' };
};

const timePref = (t: string) => {
  const q = t.toLowerCase();
  const hit = TIME_PREFS.find(p => p.l.toLowerCase().startsWith(q) || q.startsWith(p.l.toLowerCase().split(' (')[0]));
  return hit ? { value: hit.v } : { error: `Please pick a time of day, or “${SKIP}”.` };
};
const showTime = (v: string) => TIME_PREFS.find(p => p.v === v)?.l ?? '—';

const yesNo = (yes: string, no: string) => (t: string) => {
  const q = t.toLowerCase();
  if (q === yes.toLowerCase() || /^(y|yes|yeah|haan|ha|sure|ok)\b/.test(q)) return { value: 'yes' };
  if (q === no.toLowerCase() || /^(n|no|nope|nahi|na)\b/.test(q)) return { value: 'no' };
  return { error: `Please answer “${yes}” or “${no}”.` };
};

/* ── Travel modes, against the band's entitlement ──────────────────────── */
const allModes = (caps: Caps) => {
  const o = caps.mode_options;
  return o ? [...o.entitled.map(m => m.mode), ...o.exception.map(m => m.mode)] : TRAVEL_MODES;
};
const isException = (caps: Caps, mode?: string) =>
  !!mode && !!caps.mode_options?.exception.some(m => m.mode === mode);

const modeField = (key: string, label: string, ask: string): Field => ({
  key, label,
  ask: (_a, caps) => ask + (caps.approved_travel_mode ? ` Your grade allows ${caps.approved_travel_mode}.` : ''),
  chips: (_a, caps) => allModes(caps),
  parse: (t, _a, caps) => oneOf(allModes(caps))(t),
});

/* ── The Tour Programme ────────────────────────────────────────────────── */
const desk = (a: Answers) =>
  a.booking_mode === 'company' || (a.trip_type === 'round_trip' && a.return_booking_mode === 'company');
const round = (a: Answers) => a.trip_type === 'round_trip';

export const TOUR: Field[] = [
  { key: 'from_city', label: 'From city', ask: () => 'Where does the journey start from? (city)',
    chips: (_a, _c, ctx) => (ctx.hqCity ? [ctx.hqCity] : []), parse: text() },
  { key: 'destination_city', label: 'Destination city',
    ask: () => 'Which city are you travelling to? Just the city — it sets your stay and DA limits.', parse: text() },
  { key: 'travel_address', label: 'Travel address', optional: true,
    ask: () => 'The address you’re visiting there — office, site or hotel? (optional)', parse: text() },
  { key: 'purpose', label: 'Purpose of journey', ask: () => 'What’s the purpose of the journey?', parse: text(3) },
  { key: 'from_date', label: 'From date', ask: () => 'Which date does the trip start?',
    chips: () => ['Today', 'Tomorrow'], parse: date(), show: showDate },
  { key: 'to_date', label: 'To date', ask: () => 'And which date does it end?',
    parse: date({ after: 'from_date', afterLabel: 'the start date' }), show: showDate },
  modeField('travel_mode', 'Travel mode', 'How will you travel there?'),
  { key: 'booking_mode', label: 'Who books the ticket', ask: () => 'Who books the ticket?',
    chips: () => [BOOK_SELF, BOOK_DESK], parse: booking, show: showBooking },
  { key: 'travel_mode_date', label: 'Onward travel date',
    optional: false, when: a => a.booking_mode === 'company',
    ask: () => 'Which date should the Travel Help Desk book the onward journey for?',
    parse: date(), show: showDate },
  { key: 'travel_mode_date', label: 'Onward travel date', optional: true, when: a => a.booking_mode !== 'company',
    ask: () => 'Onward travel date? (optional)', parse: date(), show: showDate },
  { key: 'travel_mode_time_pref', label: 'Onward preferred time', optional: true,
    ask: () => 'Preferred time for the onward journey? (optional)',
    chips: () => TIME_PREFS.map(p => p.l), parse: timePref, show: showTime },
  { key: 'trip_type', label: 'Journey home', ask: () => 'Are you coming back on this programme?',
    chips: () => [TRIPS.round_trip, TRIPS.one_way], parse: trip, show: v => TRIPS[v as keyof typeof TRIPS] ?? v },
  { ...modeField('return_travel_mode', 'Return travel mode', 'How will you travel back?'), when: round },
  { key: 'return_booking_mode', label: 'Who books the return ticket', when: round,
    ask: () => 'Who books the return ticket?', chips: () => [BOOK_SELF, BOOK_DESK], parse: booking, show: showBooking },
  { key: 'return_mode_date', label: 'Return travel date', when: a => round(a) && a.return_booking_mode === 'company',
    ask: () => 'Which date should the return journey be booked for?',
    parse: date({ within: ['from_date', 'to_date'] }), show: showDate },
  { key: 'return_mode_date', label: 'Return travel date', optional: true,
    when: a => round(a) && a.return_booking_mode !== 'company',
    ask: () => 'Return travel date? (optional)', parse: date({ within: ['from_date', 'to_date'] }), show: showDate },
  { key: 'return_mode_time_pref', label: 'Return preferred time', optional: true, when: round,
    ask: () => 'Preferred time for the return journey? (optional)',
    chips: () => TIME_PREFS.map(p => p.l), parse: timePref, show: showTime },
  { key: 'mode_exception_reason', label: 'Reason for the travel mode',
    when: (a, caps) => isException(caps, a.travel_mode) || (round(a) && isException(caps, a.return_travel_mode)),
    ask: (_a, caps) => `That mode is above your travel entitlement${caps.approved_travel_mode ? ` (${caps.approved_travel_mode})` : ''}. ` +
      'What’s the reason for the exception? Your approver will see it.', parse: text(5) },
  { key: 'traveller_name', label: 'Name as per Aadhaar', when: desk,
    ask: () => 'The Travel Help Desk books in your name — what’s your name exactly as printed on your Aadhaar card?',
    parse: text() },
  { key: 'traveller_age', label: 'Age', when: desk, ask: () => 'Your age?',
    parse: t => { const n = parseInt(t, 10); return n >= 14 && n <= 100 ? { value: String(n) } : { error: 'Please give an age between 14 and 100.' }; } },
  { key: 'contact_number', label: 'Contact number', when: desk,
    ask: () => 'A mobile number you can be reached on while travelling?', parse: phone },
  { key: 'contact_number', label: 'Contact number', optional: true, when: a => !desk(a),
    ask: () => 'Contact number while on tour? (optional)', parse: phone },
  { key: 'sanction_number', label: 'Sanction number', optional: true,
    ask: () => 'Sanction number from your manager, if you have one? (optional)', parse: text(1) },
  { key: 'stay', label: 'Hotel / stay', ask: () => 'Will you be staying overnight (hotel / guest house)?',
    chips: () => ['Yes, I’ll stay', 'No overnight stay'], parse: yesNo('Yes, I’ll stay', 'No overnight stay'),
    show: v => (v === 'yes' ? 'Yes' : 'No overnight stay') },
  { key: 'stay_location', label: 'Staying at', when: a => a.stay === 'yes',
    ask: () => 'Where will you stay? (hotel / area)', parse: text() },
  { key: 'stay_check_in', label: 'Check-in', when: a => a.stay === 'yes', ask: () => 'Check-in date?',
    parse: date({ within: ['from_date', 'to_date'] }), show: showDate },
  { key: 'stay_check_out', label: 'Check-out', when: a => a.stay === 'yes', ask: () => 'Check-out date?',
    parse: (t, a) => {
      const r = date({ within: ['from_date', 'to_date'] })(t, a);
      return 'value' in r && a.stay_check_in && r.value < a.stay_check_in
        ? { error: 'Check-out can’t be before check-in.' } : r;
    }, show: showDate },
  { key: 'est_ticket_amount', label: 'Estimated ticket fare', optional: true,
    when: a => a.booking_mode !== 'company' || (round(a) && a.return_booking_mode !== 'company'),
    ask: () => 'Roughly how much will your tickets cost, in ₹? (optional — lodging, DA and conveyance are worked out from policy)',
    parse: money, show: v => `₹${v}` },
  { key: 'advance_amount', label: 'Advance requested', optional: true,
    ask: () => 'Do you need an advance? Give the amount in ₹, or skip. (It can be at most a little over the estimate.)',
    parse: money, show: v => `₹${v}` },
];

/* ── Local Travel ──────────────────────────────────────────────────────── */
export const LOCAL: Field[] = [
  { key: 'local_travel_type', label: 'Travel type', ask: () => 'What kind of local travel was it?',
    chips: () => LOCAL_TYPES, parse: oneOf(LOCAL_TYPES, true) },
  { key: 'from_date', label: 'From', ask: () => 'The claim covers travel from which date?',
    chips: () => ['Today'], parse: date(), show: showDate },
  { key: 'to_date', label: 'To', ask: () => 'Up to which date?', chips: () => ['Same day'],
    parse: (t, a) => (/same/i.test(t) && a.from_date ? { value: a.from_date } : date({ after: 'from_date', afterLabel: 'the start date' })(t, a)),
    show: showDate },
];

/* One trip on the claim, asked again for each "add another". */
export const LOCAL_ITEM: Field[] = [
  { key: 'date', label: 'Date', ask: () => 'Date of this trip?', chips: (a) => (a.from_date ? [showDate(a.from_date)] : []),
    parse: date({ within: ['from_date', 'to_date'] }), show: showDate },
  { key: 'purpose', label: 'Purpose', ask: () => 'Purpose of this trip? (e.g. client meeting)', parse: text(3) },
  { key: 'from_location', label: 'From', ask: () => 'From where?', parse: text() },
  { key: 'to_location', label: 'To', ask: () => 'To where?', parse: text() },
  { key: 'mode', label: 'Mode', ask: () => 'How did you travel?', chips: () => LOCAL_MODES, parse: oneOf(LOCAL_MODES, true) },
  { key: 'km', label: 'Distance', optional: true, ask: () => 'Distance in km? (optional)',
    parse: t => { const n = Number(t.replace(/km|kms/i, '').trim()); return n >= 0 ? { value: String(n) } : { error: 'Please give the distance as a number.' }; },
    show: v => `${v} km` },
  { key: 'amount', label: 'Amount', ask: (_a, caps) => `Amount spent, in ₹?${caps.local_conveyance_daily ? ` (your daily cap is ₹${caps.local_conveyance_daily})` : ''}`,
    parse: t => { const r = money(t); return 'value' in r && +r.value <= 0 ? { error: 'The amount has to be more than ₹0.' } : r; },
    show: v => `₹${v}` },
];

/* The next question not yet answered, or null when the form is complete. */
export function nextField(fields: Field[], a: Answers, caps: Caps): Field | null {
  return fields.find(f => (!f.when || f.when(a, caps)) && !(f.key in a)) ?? null;
}

/* What is on the summary: every question that applies, with its answer. */
export function summary(fields: Field[], a: Answers, caps: Caps) {
  const seen = new Set<string>();
  return fields.filter(f => (!f.when || f.when(a, caps)) && !seen.has(f.key) && seen.add(f.key))
    .map(f => ({ key: f.key, label: f.label, value: a[f.key] ? (f.show ?? String)(a[f.key]) : '—' }));
}

/* An answer to a question: parsed, or "Skip" for an optional one. */
export function answer(f: Field, input: string, a: Answers, caps: Caps): { value: string } | { error: string } {
  if (f.optional && /^(skip|none|no|na|n\/a|-)$/i.test(input.trim())) return { value: '' };
  return f.parse ? f.parse(input, a, caps) : { value: input.trim() };
}

/* What the portal's submit expects, from the chat's answers. */
export function tourPayload(a: Answers) {
  const { stay, stay_location, stay_check_in, stay_check_out, ...rest } = a;
  return {
    ...rest,
    stays: stay === 'yes' ? [{ location: stay_location, check_in: stay_check_in, check_out: stay_check_out }] : [],
    // No stay means no lodging money - the server refuses lodging with no
    // stay behind it, and seeds it from policy when the form says nothing.
    ...(stay === 'yes' ? {} : { est_lodging_amount: '0' }),
  };
}

export function localPayload(a: Answers, items: Answers[]) {
  // The portal's form has no overall purpose box either - each trip has its own.
  return { ...a, purpose: '', items };
}

/* "fill my TA/DA", "apply for a tour programme", "raise local travel" ... */
export function wantsTadaFill(q: string) {
  const s = q.toLowerCase();
  return /\b(ta\s*\/?\s*da|tada|tour\s+(programme|program|sanction)|local\s+travel|conveyance)\b/.test(s)
    && /\b(fill|apply|raise|submit|create|new|start|make|file|do|request)\b/.test(s);
}
