/* A goal sheet, asked one question at a time in the Ask APIS chat.
 *
 * The questions are Goal Setting's sheet (goalsetting/GoalSheet.tsx): each
 * KRA has a category, a title and an optional description, and one or more
 * KPIs, each with the same seven columns - metric, weightage, frequency,
 * unit, direction, data source and target. Weightage across the whole sheet
 * must come to exactly 100% before it can be submitted, as in the portal;
 * the server checks all of it again (goalsetting/assistant.py runs the
 * portal's own save and submit). */
import { oneOf, text, type Answers, type Field } from './tadaChat';

export interface Kpi {
  metric: string; weightage: string; frequency: string; unit_of_measurement: string;
  parameter_type: string; data_source: string; target_value: string;
}
export interface Kra { category: string; title: string; description: string; kpis: Kpi[] }

export const DIRECTIONS = ['Higher is better', 'Lower is better', 'On target'];
const UNITS = ['%', '₹', '₹ lakh', 'Nos', 'Days'];

const round2 = (n: number) => Math.round(n * 100) / 100;
export const totalOf = (kras: Kra[]) =>
  round2(kras.reduce((s, k) => s + k.kpis.reduce((t, p) => t + (Number(p.weightage) || 0), 0), 0));

export function kraFields(categories: string[]): Field[] {
  return [
    { key: 'category', label: 'Category', ask: () => 'Which category is this KRA under?',
      chips: () => categories, parse: oneOf(categories) },
    { key: 'title', label: 'KRA', ask: () => 'What is the Key Result Area — the big area you are responsible for? (e.g. Grow distributor sales)', parse: text(3) },
    { key: 'description', label: 'Description', optional: true,
      ask: () => 'Any context worth recording for it? (optional)', parse: text(2) },
  ];
}

/* `left` is how much weightage the sheet still has to give, before this KPI. */
export function kpiFields(frequencies: string[], left: number): Field[] {
  return [
    { key: 'metric', label: 'KPI / Metric', ask: () => 'Name a KPI — the number that shows how well you did. (e.g. Secondary sales, Complaints closed, Training hours)', parse: text(2) },
    { key: 'weightage', label: 'Weightage',
      ask: () => `How much does this KPI count, in %? All KPIs on the sheet together must make exactly 100% — ${left > 0 ? `${left}% is still free` : 'it is already at 100%'}. Give more to what matters most in your role.`,
      chips: () => weightChips(left),
      parse: t => {
        const n = Number(t.replace(/%/g, '').trim());
        if (!Number.isFinite(n) || n <= 0) return { error: 'Please give the weightage as a number above 0, like 25.' };
        if (n > 100) return { error: 'A weightage can’t be more than 100%.' };
        if (n > left) return { error: `Only ${left}% is still free — the whole sheet can’t go over 100%. Give ${left} or less.` };
        return { value: String(round2(n)) };
      },
      show: v => `${v}%` },
    { key: 'frequency', label: 'Frequency', ask: () => 'How often is it measured?',
      chips: () => frequencies, parse: oneOf(frequencies) },
    { key: 'unit_of_measurement', label: 'Unit', ask: () => 'Unit of measurement? (₹ / % / nos …)',
      chips: () => UNITS, parse: text(1) },
    { key: 'parameter_type', label: 'Direction', ask: () => 'Which way is good? Higher (sales), lower (complaints, days taken) or exactly on target (a budget)?',
      chips: () => DIRECTIONS, parse: oneOf(DIRECTIONS) },
    { key: 'data_source', label: 'Data source', ask: () => 'Where will the real number come from? (e.g. Bizom, ERP, HRMS, a monthly report)',
      chips: () => ['Bizom', 'ERP', 'HRMS', 'Monthly report'], parse: text(2) },
    { key: 'target_value', label: 'Plan / Target',
      ask: a => `And the target you commit to for the year${a.unit_of_measurement ? `, in ${a.unit_of_measurement}` : ''}? (e.g. 120)`, parse: text(1) },
  ];
}

/* Weightage to offer: what is still free, and a few round shares below it. */
function weightChips(left: number) {
  if (left <= 0) return [];
  return [String(left), ...[5, 10, 15, 20, 25, 30, 40].filter(x => x < left).map(String)].slice(0, 6);
}

/* What "help" says at each question - a plain explanation and an example. */
export const FIELD_HELP: Record<string, string> = {
  category: 'Pick the area this KRA belongs to:\n• Financial — sales, revenue, cost, collection\n• Customer Enhancement — customers, distributors, complaints\n• Internal Business Process — quality, timelines, reports, systems\n• People Development — training, team, skills',
  title: 'A KRA is a big area you are responsible for, in a few words.\nExamples: “Grow sales in my territory”, “Timely books closure”, “Hiring on time”, “Product quality”, “Reliable IT systems”.',
  description: 'Optional — a line of context for your manager, like which products or region it covers. Tap Skip if there is nothing to add.',
  metric: 'A KPI is the number that shows how well you did in the KRA.\nExamples: “Secondary sales”, “Monthly closing done in”, “Positions closed within 45 days”, “Batch rejection rate”, “ERP uptime”.\nAvoid vague ones like “Work hard” — it must be something you can count.',
  weightage: 'Weightage is how much this KPI counts. All KPIs on your sheet together must be exactly 100%.\nEasy way: first share 100% across your KRAs (e.g. 40 + 30 + 20 + 10), then split each KRA’s share across its KPIs (a 40% KRA with two KPIs → 25 + 15).\nKeep each KPI at 5% or more.',
  frequency: 'How often the number is checked — Monthly for most sales and operations KPIs, Quarterly or Half-Yearly for bigger ones, Annually or One-Time for a project.',
  unit_of_measurement: 'What the number is in: % (rates), ₹ or ₹ lakh (money), Nos (a count, like outlets or trainings), Days (time taken).',
  parameter_type: '• Higher is better — sales, uptime, outlets added\n• Lower is better — complaints, rejections, days taken, cost\n• On target — hit the number exactly, like a budget',
  data_source: 'Where the real number will come from at review time, so nobody has to guess — Bizom, ERP, HRMS, a monthly MIS report, a QC register …',
  target_value: 'The number you commit to for the year, in the unit you chose. Examples: 120 (₹ lakh), 5 (days), 90 (%), 1 (% rejection).',
};
export const isHelp = (t: string) =>
  /^(help|\?|hint|tips?|eg|e\.g\.?|examples?|explain|meaning|what is this|what does (this|it) mean|i don.?t know|dont know|not sure|confused)\??$/i.test(t.trim());

export const toKpi = (a: Answers): Kpi => ({
  metric: a.metric, weightage: a.weightage, frequency: a.frequency, unit_of_measurement: a.unit_of_measurement,
  parameter_type: a.parameter_type, data_source: a.data_source, target_value: a.target_value,
});

/* "set my goals", "fill my goal sheet", "add a KRA" ... but not a reviewer's
   "approve my team's goals". */
export function wantsGoalFill(q: string) {
  const s = q.toLowerCase();
  /* "how to make it 100%", "example of a KPI": a question, answered by the guides. */
  if (/\b(weightage|weight|100|percent|percentage|examples?|samples?|meaning|means?|explain|tips?|difference|good|ideas?|suggest\w*|what is|what are|why)\b/.test(s)) return false;
  return /\b(goal|goals|goal sheet|kra|kras|kpi|kpis)\b/.test(s)
    && /\b(fill|set|add|create|submit|write|make|start|enter|new|do|put)\b/.test(s)
    && !/\b(approve|review|team|teams|accept|status|send back|return)\b/.test(s);
}
