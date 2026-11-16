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
    { key: 'title', label: 'KRA', ask: () => 'What is the Key Result Area? (e.g. Grow distributor sales)', parse: text(3) },
    { key: 'description', label: 'Description', optional: true,
      ask: () => 'Any context worth recording for it? (optional)', parse: text(2) },
  ];
}

/* `left` is how much weightage the sheet still has to give, before this KPI. */
export function kpiFields(frequencies: string[], left: number): Field[] {
  return [
    { key: 'metric', label: 'KPI / Metric', ask: () => 'Name a KPI that measures it. (e.g. Secondary sales)', parse: text(2) },
    { key: 'weightage', label: 'Weightage',
      ask: () => `Its weightage, in %? The whole sheet must come to 100% — ${left > 0 ? `${left}% is still free` : 'it is already at 100%'}.`,
      chips: () => (left > 0 ? [String(left)] : []),
      parse: t => {
        const n = Number(t.replace(/%/g, '').trim());
        if (!Number.isFinite(n) || n <= 0) return { error: 'Please give the weightage as a number above 0, like 25.' };
        if (n > 100) return { error: 'A weightage can’t be more than 100%.' };
        return { value: String(round2(n)) };
      },
      show: v => `${v}%` },
    { key: 'frequency', label: 'Frequency', ask: () => 'How often is it measured?',
      chips: () => frequencies, parse: oneOf(frequencies) },
    { key: 'unit_of_measurement', label: 'Unit', ask: () => 'Unit of measurement? (₹ / % / nos …)',
      chips: () => UNITS, parse: text(1) },
    { key: 'parameter_type', label: 'Direction', ask: () => 'Which way is good?',
      chips: () => DIRECTIONS, parse: oneOf(DIRECTIONS) },
    { key: 'data_source', label: 'Data source', ask: () => 'Where will the number come from? (data source)', parse: text(2) },
    { key: 'target_value', label: 'Plan / Target', ask: () => 'And the plan / target for it?', parse: text(1) },
  ];
}

export const toKpi = (a: Answers): Kpi => ({
  metric: a.metric, weightage: a.weightage, frequency: a.frequency, unit_of_measurement: a.unit_of_measurement,
  parameter_type: a.parameter_type, data_source: a.data_source, target_value: a.target_value,
});

/* "set my goals", "fill my goal sheet", "add a KRA" ... but not a reviewer's
   "approve my team's goals". */
export function wantsGoalFill(q: string) {
  const s = q.toLowerCase();
  return /\b(goal|goals|goal sheet|kra|kras|kpi|kpis)\b/.test(s)
    && /\b(fill|set|add|create|submit|write|make|start|enter|new|do|put)\b/.test(s)
    && !/\b(approve|review|team|teams|accept|status|send back|return)\b/.test(s);
}
