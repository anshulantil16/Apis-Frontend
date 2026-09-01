/* The goal sheet — the one table every seat in this product looks at.
 *
 * Deliberately ONE component rather than an employee copy and a reviewer copy.
 * The whole premise is that a manager and an HOD edit the same sheet the
 * employee wrote; two implementations would drift, and the day they disagreed
 * about what a column means is the day someone's goals get mangled.
 *
 * `canEdit` is the only difference between filling it in and reading it. It
 * comes from the server's view of who holds the sheet, never from which screen
 * happens to be rendering.
 */
import { Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { KPI, KRA } from './api';
import { blankKpi, blankKra, totalWeight } from './api';

const DIRECTIONS = ['Higher is better', 'Lower is better', 'On target'];

/* Category colours. Ordering matters — index 0 is the first category the
   server sends, so the palette stays put even if the category list changes. */
const TONES = [
  { head: 'bg-blue-50 border-blue-200',   title: 'text-blue-700',   edge: 'border-l-blue-500',   chip: 'bg-blue-100 text-blue-700',     btn: 'text-blue-600 hover:bg-blue-100 border-blue-200' },
  { head: 'bg-amber-50 border-amber-200', title: 'text-amber-700',  edge: 'border-l-amber-500',  chip: 'bg-amber-100 text-amber-700',   btn: 'text-amber-600 hover:bg-amber-100 border-amber-200' },
  { head: 'bg-sky-50 border-sky-200',     title: 'text-sky-700',    edge: 'border-l-sky-500',    chip: 'bg-sky-100 text-sky-700',       btn: 'text-sky-600 hover:bg-sky-100 border-sky-200' },
  { head: 'bg-violet-50 border-violet-200', title: 'text-violet-700', edge: 'border-l-violet-500', chip: 'bg-violet-100 text-violet-700', btn: 'text-violet-600 hover:bg-violet-100 border-violet-200' },
];

const COLS = [
  { label: 'KPI / Metric', w: 'w-[20%]' },
  { label: 'Wt %', w: 'w-[7%]' },
  { label: 'Frequency', w: 'w-[12%]' },
  { label: 'Unit', w: 'w-[11%]' },
  { label: 'Direction', w: 'w-[14%]' },
  { label: 'Data Source', w: 'w-[14%]' },
  { label: 'Plan / Target', w: 'w-[12%]' },
];

const cell = 'w-full px-2 py-1.5 text-[12px] rounded-lg border border-slate-200 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 ' +
  'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-default';

function Field({ value, onChange, disabled, placeholder, type = 'text', invalid, className = '' }: {
  value: string | number; onChange: (v: string) => void; disabled: boolean;
  placeholder?: string; type?: string; invalid?: boolean; className?: string;
}) {
  return (
    <input
      type={type} value={value ?? ''} disabled={disabled} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={`${cell} ${invalid ? 'border-rose-300 bg-rose-50/40' : ''} ${className}`}
    />
  );
}

function Choice({ value, onChange, disabled, options, placeholder, invalid }: {
  value: string; onChange: (v: string) => void; disabled: boolean;
  options: string[]; placeholder: string; invalid?: boolean;
}) {
  return (
    <select
      value={value || ''} disabled={disabled} onChange={e => onChange(e.target.value)}
      className={`${cell} ${invalid ? 'border-rose-300 bg-rose-50/40' : ''}`}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/** The weightage meter. Reads as a single number because that is the one rule
 *  people get wrong, and it must be visible without scrolling to the bottom. */
export function WeightMeter({ kras }: { kras: KRA[] }) {
  const total = totalWeight(kras);
  const ok = total === 100;
  const pct = Math.min(total, 100);
  return (
    <div className="flex items-center gap-3 min-w-[220px]">
      <div className="flex-1">
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: ok ? '#059669' : total > 100 ? '#e11d48' : '#f59e0b',
            }}
          />
        </div>
      </div>
      <span className={`text-sm font-black tabular-nums shrink-0 flex items-center gap-1.5 ${
        ok ? 'text-emerald-600' : total > 100 ? 'text-rose-600' : 'text-amber-600'}`}>
        {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
        {total}%
      </span>
    </div>
  );
}

export function GoalSheet({ kras, categories, frequencies, canEdit, onChange }: {
  kras: KRA[];
  categories: string[];
  frequencies: string[];
  canEdit: boolean;
  onChange: (next: KRA[]) => void;
}) {
  /* Edits are addressed by position rather than id, because a row the user has
     just added has no id yet and a reviewer may delete rows freely. */
  const editKra = (i: number, patch: Partial<KRA>) =>
    onChange(kras.map((k, idx) => (idx === i ? { ...k, ...patch } : k)));

  const editKpi = (i: number, j: number, field: keyof KPI, value: string) =>
    onChange(kras.map((k, idx) => idx !== i ? k : {
      ...k, kpis: k.kpis.map((p, jdx) => (jdx === j ? { ...p, [field]: value } : p)),
    }));

  const addKra = (category: string) => onChange([...kras, blankKra(category)]);

  const removeKra = (i: number) => onChange(kras.filter((_, idx) => idx !== i));

  const addKpi = (i: number) =>
    onChange(kras.map((k, idx) => (idx === i ? { ...k, kpis: [...k.kpis, blankKpi()] } : k)));

  const removeKpi = (i: number, j: number) =>
    onChange(kras.map((k, idx) =>
      idx === i ? { ...k, kpis: k.kpis.filter((_, jdx) => jdx !== j) } : k));

  return (
    <div className="space-y-4">
      {categories.map((cat, catIdx) => {
        const tone = TONES[catIdx % TONES.length];
        const rows = kras
          .map((k, i) => ({ k, i }))
          .filter(({ k }) => k.category === cat);

        return (
          <div key={cat}
            style={{ transitionDelay: `${catIdx * 60}ms` }}
            className="ih-inview bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm
              hover:shadow-md transition-shadow">
            <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b ${tone.head}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <h3 className={`font-black text-sm ${tone.title} truncate`}>{cat}</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${tone.chip} shrink-0`}>
                  {rows.length} KRA{rows.length === 1 ? '' : 's'}
                </span>
              </div>
              {canEdit && (
                <button
                  onClick={() => addKra(cat)}
                  className={`ih-sheen group flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5
                    rounded-lg border bg-white/80 shadow-sm transition-all hover:shadow ${tone.btn}`}
                >
                  <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" /> Add KRA
                </button>
              )}
            </div>

            {rows.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-slate-400 font-semibold">
                {canEdit ? `No KRA here yet — use "Add KRA" to create one under ${cat}.`
                         : `Nothing set under ${cat}.`}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {rows.map(({ k, i }, n) => (
                  <div key={k.id ?? k._k ?? n}
                    className={`ih-fade border-l-4 ${tone.edge} px-4 py-3.5 hover:bg-slate-50/50 transition-colors`}>
                    <div className="flex items-start gap-3 mb-2.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2 shrink-0">
                        KRA {n + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-2">
                        <Field
                          value={k.title} disabled={!canEdit} invalid={canEdit && !k.title.trim()}
                          placeholder="What is the Key Result Area?"
                          onChange={v => editKra(i, { title: v })}
                          className="!text-[13px] !font-bold !py-2"
                        />
                        <Field
                          value={k.description} disabled={!canEdit}
                          placeholder="Any context worth recording (optional)"
                          onChange={v => editKra(i, { description: v })}
                        />
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => removeKra(i)} title="Delete this KRA"
                          className="p-2 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[860px] border-separate border-spacing-y-1">
                        <thead>
                          <tr>
                            {COLS.map(c => (
                              <th key={c.label}
                                className={`${c.w} text-left text-[10px] font-black text-slate-400 uppercase tracking-wider px-2 pb-1`}>
                                {c.label}
                              </th>
                            ))}
                            <th className="w-[36px]" />
                          </tr>
                        </thead>
                        <tbody>
                          {k.kpis.map((p, j) => (
                            <tr key={p.id ?? p._k ?? j}>
                              <td className="px-1">
                                <Field value={p.metric} disabled={!canEdit} placeholder="Measure"
                                  invalid={canEdit && !p.metric.trim()}
                                  onChange={v => editKpi(i, j, 'metric', v)} />
                              </td>
                              <td className="px-1">
                                <Field type="number" value={p.weightage} disabled={!canEdit}
                                  invalid={canEdit && !(Number(p.weightage) > 0)}
                                  onChange={v => editKpi(i, j, 'weightage', v)}
                                  className="text-center" />
                              </td>
                              <td className="px-1">
                                <Choice value={p.frequency} disabled={!canEdit} options={frequencies}
                                  placeholder="Select…" invalid={canEdit && !p.frequency}
                                  onChange={v => editKpi(i, j, 'frequency', v)} />
                              </td>
                              <td className="px-1">
                                <Field value={p.unit_of_measurement} disabled={!canEdit}
                                  placeholder="₹ / % / nos"
                                  invalid={canEdit && !p.unit_of_measurement.trim()}
                                  onChange={v => editKpi(i, j, 'unit_of_measurement', v)} />
                              </td>
                              <td className="px-1">
                                <Choice value={p.parameter_type} disabled={!canEdit} options={DIRECTIONS}
                                  placeholder="Direction…" invalid={canEdit && !p.parameter_type}
                                  onChange={v => editKpi(i, j, 'parameter_type', v)} />
                              </td>
                              <td className="px-1">
                                <Field value={p.data_source} disabled={!canEdit} placeholder="Where from?"
                                  invalid={canEdit && !p.data_source.trim()}
                                  onChange={v => editKpi(i, j, 'data_source', v)} />
                              </td>
                              <td className="px-1">
                                <Field value={p.target_value} disabled={!canEdit} placeholder="Target"
                                  invalid={canEdit && !p.target_value.trim()}
                                  onChange={v => editKpi(i, j, 'target_value', v)} />
                              </td>
                              <td className="px-1">
                                {canEdit && k.kpis.length > 1 && (
                                  <button onClick={() => removeKpi(i, j)} title="Remove this KPI"
                                    className="p-1.5 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {canEdit && (
                      <button onClick={() => addKpi(i)}
                        className="group mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-amber-600 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 transition-colors">
                        <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" /> Add KPI
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* KRAs whose category is not in the current list still have to be shown,
          or an old sheet would silently lose rows on screen. */}
      {kras.some(k => !categories.includes(k.category)) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Other
          </p>
          {kras.filter(k => !categories.includes(k.category)).map((k, n) => (
            <p key={n} className="text-[12px] text-slate-600 font-semibold">
              {k.title || '(untitled)'} <span className="text-slate-400">— {k.category || 'no category'}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
