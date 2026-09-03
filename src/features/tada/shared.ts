/* Shared contract for the TA/DA portal: the API base, the session user shape,
   the option lists the forms offer, and the small pure helpers. Data and
   arithmetic only — no components — so any screen can import it freely. */

export const API = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/tada`;
/* Dates come off the API two ways, and they need different handling.
 *
 * A bare calendar date ("2026-09-01" — travel dates, leg dates) has no
 * timezone in it, so swapping the pieces around with a regex is exact.
 *
 * A full instant (check-in/check-out, booked_at) is stored and sent in UTC
 * (Django's USE_TZ=True). Pulling digits straight out of that string — which
 * this used to do — is the UTC clock, mislabelled as local: IST is five and a
 * half hours ahead, so every such timestamp was off by 5:30, and anything
 * from 18:30 UTC onward (past midnight IST) showed the wrong CALENDAR DAY,
 * not just the wrong time. new Date() parses the instant correctly and its
 * local getters read it back out in the browser's own timezone (IST here),
 * which is the fix.
 *
 * Rendered as dd-mm-yyyy everywhere it is shown to a person. Anything
 * unparseable is passed through untouched rather than turned into
 * "Invalid Date". */
const pad2 = (n: number) => String(n).padStart(2, '0');

export const d = (v: string | null | undefined): string => {
  if (!v) return '';
  const s = String(v);
  const bare = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (bare) return `${bare[3]}-${bare[2]}-${bare[1]}`;
  const parsed = new Date(s);
  return isNaN(parsed.getTime())
    ? s
    : `${pad2(parsed.getDate())}-${pad2(parsed.getMonth() + 1)}-${parsed.getFullYear()}`;
};

/* Same, for a value that carries a time too (check-in / check-out, booked-at):
   dd-mm-yyyy hh:mm, dropping seconds, converted to the viewer's local time. */
export const dt = (v: string | null | undefined): string => {
  if (!v) return '';
  const s = String(v);
  if (!/[T ]\d{2}:\d{2}/.test(s)) return d(s);
  const parsed = new Date(s);
  if (isNaN(parsed.getTime())) return s;
  const day = `${pad2(parsed.getDate())}-${pad2(parsed.getMonth() + 1)}-${parsed.getFullYear()}`;
  const time = `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
  return `${day} ${time}`;
};

export const fmt = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);

export type User = {
  id: number; employee_id: string; name: string; role: string; level: string;
  designation: string; department: string; hq_city: string; caps: any;
};

/* The department is People & Culture; "HR" stays in brackets because that is
   still what everyone calls it day to day, and a label nobody recognises is
   worse than a slightly long one. One constant so a rename is one edit. */
export const HR_LABEL = 'P&C (HR)';
export const ROLE_LABELS: Record<string, string> = {
  employee: 'Employee', manager: 'Manager', hr: HR_LABEL,
  finance: 'Finance', travel_desk: 'Travel Help Desk', admin: 'Admin',
};
export const roleLabel = (r: string) => ROLE_LABELS[r] || r;

export const STATUS_STYLE: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-700', manager_approved: 'bg-blue-100 text-blue-700',
  hr_approved: 'bg-violet-100 text-violet-700', finance_approved: 'bg-emerald-100 text-emerald-700',
  paid: 'bg-emerald-600 text-white',
  manager_rejected: 'bg-rose-100 text-rose-700', hr_rejected: 'bg-rose-100 text-rose-700',
  finance_rejected: 'bg-rose-100 text-rose-700', draft: 'bg-slate-100 text-slate-600',
};

// ── Shared option lists ───────────────────────────────────────────────────────
/* Modes for reaching another city. No auto rickshaw — that's for getting around
   once you're there, and it stays in LOCAL_MODES below. */
export const TRAVEL_MODES = ['Train', 'Flight', 'Bus', 'Cab / Taxi', 'Own Car', 'Own Two-Wheeler', 'Company Vehicle'];

/* "Ticket Date" only makes sense for something you buy a ticket for. Driving
   yourself has a departure, not a ticket, so the wording follows the mode. */
export const journeyNoun = (mode: string) =>
  /train|flight|air|bus/i.test(mode || '') ? 'Ticket' : 'Departure';
export const LOCAL_MODES = ['Cab / Taxi', 'Auto Rickshaw', 'Bus', 'Metro', 'Own Car', 'Own Two-Wheeler', 'Bike Taxi', 'E-Rickshaw'];
export const LOCAL_TYPES = ['Outdoor Duty', 'Office Work', 'Client Visit', 'Bank / Govt Work', 'Site Visit', 'Vendor Meeting'];
/* Who raises the ticket. A company booking is paid to the carrier directly, so
   its fare never enters the employee's claim. */
export const TRIP_TYPES = [
  { v: 'round_trip', l: 'To & Fro', hint: 'You travel out and come back' },
  { v: 'one_way', l: 'One Way', hint: 'No return journey on this programme' },
];

export const BOOKING_MODES = [
  { v: 'self', l: 'I will book it myself', hint: 'You pay and claim the fare back with your bills' },
  { v: 'company', l: 'Company books it (Travel Help Desk)', hint: 'The desk books and pays — nothing for you to claim' },
];

export const TIME_PREFS = [
  { v: 'early_morning', l: 'Early Morning (12 AM – 6 AM)' },
  { v: 'morning', l: 'Morning (6 AM – 12 PM)' },
  { v: 'afternoon', l: 'Afternoon (12 PM – 4 PM)' },
  { v: 'evening', l: 'Evening (4 PM – 8 PM)' },
  { v: 'night', l: 'Night (8 PM – 12 AM)' },
];

export const TOUR_BLANK = {
  travel_address: '', purpose: '', from_city: '', destination_city: '', from_date: '', to_date: '',
  contact_number: '', sanction_number: '', travel_mode: '',
  travel_mode_date: '', travel_mode_time_pref: '', return_mode_date: '', return_mode_time_pref: '',
  // The way home is its own journey: its own mode, its own date, and its own
  // answer to who is raising the ticket. Most tours come back, so that is the
  // default and a one-way trip has to say so.
  trip_type: 'round_trip', return_travel_mode: '', return_booking_mode: 'self',
  // What a carrier asks for, and only the employee knows.
  traveller_name: '', traveller_age: '',
  // Where the employee plans to stay, night by night.
  stays: [] as any[],
  // estimate: ticket/misc are typed by the employee, lodging/food/local seed
  // from policy and stay '' until the server sends the policy figure.
  est_ticket_amount: '', est_lodging_amount: '', est_food_amount: '', est_local_amount: '',
  est_misc_amount: '', advance_amount: '', mode_exception_reason: '', booking_mode: 'self',
};

/* One planned stay. Pre-travel and separate from the lodging bill filed
   afterwards: this is what the approver judges the lodging estimate against. */
export const blankStay = (legSeq: number | null = null) => ({
  location: '', check_in: '', check_out: '', leg_seq: legSeq,
});

export const blankLeg = (fromCity: string = '') => ({
  from_date: '', to_date: '', from_city: fromCity, destination_city: '', travel_address: '', purpose: '',
  travel_mode: '', ticket_date: '', ticket_time_pref: '', booking_mode: 'self',
  mode_exception_reason: '', est_ticket_amount: '',
});

// inclusive day count between two yyyy-mm-dd strings; null if either is missing/invalid
export function tripDays(fromDate: string, toDate: string): number | null {
  if (!fromDate || !toDate) return null;
  const from = new Date(fromDate), to = new Date(toDate);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;
  const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  return days > 0 ? days : null;
}

/* Travel-mode picker.
   Leads with the modes the employee's grade actually entitles them to, and
   keeps the rest available under a separate group — travel plans break, and a
   sanction that cannot express "no train was available" is a sanction people
   work around. Choosing from the second group is allowed but must carry a
   reason, which the approver sees. */
