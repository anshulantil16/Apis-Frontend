/* An Employee of the Month nomination, asked one question at a time in the
 * Ask APIS chat.
 *
 * The questions are the EOM page's own (Components/EOM/employee/
 * EOMEmployeeView.tsx), in its order and words: the track, Part A (at least
 * 150 words), the five SMART questions, up to two pieces of supporting
 * evidence, and the declaration with a typed signature. Document uploads stay
 * in the EOM page - a chat has nowhere to drop a file. The server checks the
 * submitting rules again (eom/assistant.py). */
import { oneOf, text, type Answers, type Field } from './tadaChat';

export const MIN_PART_A_WORDS = 150;
export const words = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

export const DECLARATION =
  'I confirm that all information provided is accurate, verifiable and submitted in good faith. ' +
  'I understand that misrepresentation will result in disqualification of my nomination.';

const TRACKS = [['sales', 'Sales'], ['non_sales', 'HO'], ['plant', 'Plant']] as const;
const SMART = [
  ['smart_specific', 'Specific', 'What exactly did you do? In which area or process?'],
  ['smart_measurable', 'Measurable', 'What are the before and after numbers? What is the unit of measurement? Share pictures, system or process enhancements.'],
  ['smart_achievable', 'Achievable', 'Why was this above your normal job scope? What extra initiative did you take?'],
  ['smart_relevant', 'Relevant', 'How does this connect to APIS goals (growth, quality, cost, customer, safety)?'],
  ['smart_timebound', 'Time-Bound', 'When exactly was this completed? Confirm it was within the nomination month.'],
] as const;

const AGREE = 'I agree';
const has = (a: Answers, k: string) => !!(a[k] || '').trim();

/* `month`: the nomination month, said in the Time-Bound question. `name`:
   offered as the signature. */
export function eomFields(month: string, name: string): Field[] {
  return [
    { key: 'track', label: 'Track', ask: () => 'Which track is your nomination in?',
      chips: () => TRACKS.map(t => t[1]),
      parse: t => { const r = oneOf(TRACKS.map(x => x[1]))(t); return 'value' in r ? { value: TRACKS.find(x => x[1] === r.value)![0] } : r; },
      show: v => TRACKS.find(t => t[0] === v)?.[1] ?? v },
    // Part A is gathered over as many messages as it takes - see useEomChat.
    { key: 'part_a_achievement', label: 'Part A — Achievement',
      ask: () => `Part A — describe your achievement in detail, at least ${MIN_PART_A_WORDS} words. You can send it in more than one message; I’ll add them together.`,
      show: v => `${words(v)} words — ${v.length > 160 ? `${v.slice(0, 160)}…` : v}` },
    ...SMART.map(([key, label, q]): Field => ({
      key, label: `SMART — ${label}`,
      ask: () => `${label}: ${key === 'smart_timebound' ? q.replace('the nomination month', `the nomination month (${month})`) : q}`,
      parse: text(3),
    })),
    { key: 'evidence_1_description', label: 'Evidence 1', optional: true,
      ask: () => 'Supporting evidence (optional but recommended): describe a document or evidence — e.g. Sales report screenshot, Email thread.',
      parse: text(3) },
    { key: 'evidence_1_source', label: 'Evidence 1 — source', when: a => has(a, 'evidence_1_description'),
      ask: () => 'Where is it from? (e.g. CRM, Email, Manager)', parse: text(2) },
    { key: 'evidence_2_description', label: 'Evidence 2', optional: true, when: a => has(a, 'evidence_1_description'),
      ask: () => 'A second piece of evidence? (optional)', parse: text(3) },
    { key: 'evidence_2_source', label: 'Evidence 2 — source', when: a => has(a, 'evidence_2_description'),
      ask: () => 'Where is it from?', parse: text(2) },
    { key: 'declaration_agreed', label: 'Declaration',
      ask: () => `Employee declaration: “${DECLARATION}” Do you agree, and confirm all information is accurate?`,
      chips: () => [AGREE],
      parse: t => (/^(i agree|agree|yes|y|ok|confirm)/i.test(t.trim())
        ? { value: 'yes' } : { error: `You need to agree to the declaration to submit — tap “${AGREE}”.` }),
      show: () => 'Agreed' },
    { key: 'signature_name', label: 'Digital signature', ask: () => 'Type your full name as your digital signature.',
      chips: () => (name ? [name] : []), parse: text(2) },
  ];
}

/* What the server takes, from the chat's answers. */
export function eomPayload(a: Answers) {
  const out: Record<string, string | boolean> = {};
  for (const [k, v] of Object.entries(a)) if (!k.startsWith('_')) out[k] = v;
  out.declaration_agreed = a.declaration_agreed === 'yes';
  return out;
}

/* A saved draft, back into the chat's answers - only what is filled in, so
   the questions carry on from the first one left. */
export function fromDraft(form: Record<string, string | boolean> | null): Answers {
  const a: Answers = {};
  if (!form) return a;
  for (const [k, v] of Object.entries(form)) {
    if (k === 'declaration_agreed') { if (v) a[k] = 'yes'; continue; }
    if (typeof v === 'string' && v.trim()) a[k] = v;
  }
  // A Part A under the minimum is not an answer yet; it is where they left off.
  if (a.part_a_achievement && words(a.part_a_achievement) < MIN_PART_A_WORDS) {
    a._part_a = a.part_a_achievement;
    delete a.part_a_achievement;
  }
  return a;
}

/* "nominate myself for employee of the month", "fill my EOM form" ... */
export function wantsEomFill(q: string) {
  const s = q.toLowerCase();
  return /\b(eom|employee of the month|nomination|nominate|nominating)\b/.test(s)
    && /\b(fill|submit|apply|nominate|nominating|nomination|start|create|do|enter|file|make|self)\b/.test(s)
    && !/\b(winner|who won|result|results|panel|hod|review|approve|score)\b/.test(s);
}
