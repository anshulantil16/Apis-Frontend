/* Ask APIS and the goal sheet: questions about it get the right guide,
 * "fill my goals" still starts the chat, and the weightage can't pass 100%. */
import { describe, expect, it } from 'vitest';
import { search, normalize } from './search';
import { isHelp, kpiFields, wantsGoalFill } from './goalChat';

const top = (q: string) => search(normalize(q))[0]?.title;
const WEIGHT = 'Make my goal sheet weightage add up to 100%';
const EXAMPLES = 'Write good KRAs and KPIs for my goal sheet (examples)';
const COLUMNS = 'What each column of the goal sheet means';

describe('goal sheet questions', () => {
  it.each([
    'how to make it 100% of kra and kpis',
    'how do i make weightage 100',
    'kpi weightage total not coming 100 percent',
    'how to divide weightage between kras',
  ])('"%s" → weightage guide', q => {
    expect(wantsGoalFill(q)).toBe(false);
    expect(top(q)).toBe(WEIGHT);
  });

  it.each([
    'example of kra for sales',
    'how to write good kpis',
    'give me kpi examples for hr',
  ])('"%s" → examples guide', q => {
    expect(wantsGoalFill(q)).toBe(false);
    expect(top(q)).toBe(EXAMPLES);
  });

  it.each([
    'what is direction in kpi',
    'meaning of data source in goal sheet',
  ])('"%s" → columns guide', q => {
    expect(wantsGoalFill(q)).toBe(false);
    expect(top(q)).toBe(COLUMNS);
  });

  it('still starts the chat for "fill my goal sheet"', () => {
    expect(wantsGoalFill('fill my goal sheet')).toBe(true);
    expect(wantsGoalFill('set my kras')).toBe(true);
  });
});

describe('in the goal chat', () => {
  const weight = (left: number) => kpiFields([], left).find(f => f.key === 'weightage')!;

  it('refuses a weightage that would take the sheet past 100%', () => {
    expect(weight(30).parse!('40', {}, {})).toHaveProperty('error');
    expect(weight(30).parse!('30', {}, {})).toEqual({ value: '30' });
  });

  it('offers what is free first, then round shares below it', () => {
    expect(weight(30).chips!({}, {}, {})).toEqual(['30', '5', '10', '15', '20', '25']);
  });

  it('knows a request for help', () => {
    for (const t of ['help', '?', 'example', 'not sure', 'what does this mean']) expect(isHelp(t)).toBe(true);
    expect(isHelp('Secondary sales')).toBe(false);
  });
});
