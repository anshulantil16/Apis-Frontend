/* Pre-travel cost estimate on the tour sanction: policy-derived lodging, food
   and conveyance, employee-entered travel and misc, and the advance. */
import {
  AlertCircle, Shield, Wallet,
} from 'lucide-react';

export function EstimateBlock({ est, tour, setTour, total, warnings, inp, maxAdvance, advanceOver }: {
  est: any; tour: any; setTour: (t: any) => void; total: number; warnings: string[]; inp: string;
  maxAdvance: number; advanceOver: boolean;
}) {
  const money = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const rate = (v: any, unit: string) =>
    v == null ? 'not set in policy' : v === 'actual' ? 'as per actuals' : `${money(v)} ${unit}`;

  // A multi-stop estimate carries a legs[] array; a single-destination one carries rates/days.
  const multi = Array.isArray(est?.legs) && est.legs.length > 0;
  const days = multi ? est.total_days : est?.days;
  const nights = multi ? est.total_nights : est?.nights;

  /* The policy figures need a destination (for city grade) and both dates (for
     nights/days). Until then show the section greyed out and say what's missing,
     rather than hiding it — an invisible section reads as a missing feature. */
  if (!est) {
    const missing = [
      !tour.destination_city && 'destination city',
      !tour.from_date && 'from date',
      !tour.to_date && 'to date',
    ].filter(Boolean);
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4">
        <h4 className="font-black text-slate-500 text-sm flex items-center gap-2"><Wallet className="w-4 h-4 text-slate-400" />Estimated Cost of Travel</h4>
        <p className="text-xs text-slate-400 mt-1.5">Fill in the {missing.join(' and ')} above — your hotel, food and conveyance limits are then worked out from the travel policy for your level.</p>
      </div>
    );
  }

  const field = (key: string, label: string, hint: string, locked?: boolean) => (
    <div>
      <label className="text-xs font-bold text-slate-500 mb-1 block">{label}</label>
      <input type="number" min="0" className={inp} value={tour[key]}
        onChange={e => setTour({ ...tour, [key]: e.target.value })} placeholder="0" />
      <p className={`text-[11px] mt-1 ${locked ? 'text-slate-400' : 'text-indigo-500'}`}>{hint}</p>
    </div>
  );

  const advance = parseFloat(tour.advance_amount) || 0;
  return (
    <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-indigo-100 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="font-black text-slate-700 text-sm flex items-center gap-2"><Wallet className="w-4 h-4 text-indigo-500" />Estimated Cost of Travel</h4>
        <div className="flex items-center gap-2 text-[11px] font-bold">
          {multi
            ? <span className="bg-white border border-indigo-100 text-indigo-600 px-2.5 py-1 rounded-lg">{est.legs.length} stop{est.legs.length === 1 ? '' : 's'}</span>
            : <span className="bg-white border border-indigo-100 text-indigo-600 px-2.5 py-1 rounded-lg">Grade {est.city_grade} city</span>}
          <span className="bg-white border border-indigo-100 text-indigo-600 px-2.5 py-1 rounded-lg">{days} day{days === 1 ? '' : 's'} · {nights} night{nights === 1 ? '' : 's'}</span>
          {est.band && <span className="bg-white border border-indigo-100 text-indigo-600 px-2.5 py-1 rounded-lg">Band {est.band}</span>}
        </div>
      </div>

      {est.entitled_mode && (
        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 flex items-start gap-2">
          <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>Approved travel class for your level: <b className="text-slate-800">{est.entitled_mode}</b></span>
        </div>
      )}

      {multi && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-400">
                <tr>{['Stop', 'Grade', 'Days', 'Ticket', 'Stay', 'DA', 'Local', 'Subtotal'].map(h => (
                  <th key={h} className={`px-2.5 py-1.5 font-bold ${h === 'Stop' ? 'text-left' : 'text-right'}`}>{h}</th>))}</tr>
              </thead>
              <tbody>
                {est.legs.map((l: any) => (
                  <tr key={l.seq} className="border-t border-slate-100">
                    <td className="px-2.5 py-1.5 font-bold text-slate-700">{l.city || `Stop ${l.seq + 1}`}</td>
                    <td className="px-2.5 py-1.5 text-right text-slate-500">{l.city_grade}</td>
                    <td className="px-2.5 py-1.5 text-right text-slate-500">{l.days}d / {l.nights}n</td>
                    <td className="px-2.5 py-1.5 text-right text-slate-600">{money(l.lines.ticket)}</td>
                    <td className="px-2.5 py-1.5 text-right text-slate-600">{money(l.lines.lodging)}</td>
                    <td className="px-2.5 py-1.5 text-right text-slate-600">{money(l.lines.food)}</td>
                    <td className="px-2.5 py-1.5 text-right text-slate-600">{money(l.lines.local)}</td>
                    <td className="px-2.5 py-1.5 text-right font-black text-slate-800">{money(l.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 px-2.5 py-1.5 border-t border-slate-100">Each stop is costed at its own city grade. Nights follow where you sleep — the last stop drops one night for the journey home.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {multi
          ? <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Travel Cost (₹)</label>
              <div className="w-full border-2 border-slate-100 bg-slate-100 rounded-xl px-3 py-2.5 text-sm font-black text-slate-600">{money(est.lines.ticket)}</div>
              <p className="text-[11px] text-slate-400 mt-1">Total of the per-stop costs above</p>
            </div>
          : field('est_ticket_amount', 'Travel Cost (₹)', 'Onward + return, as per approved class')}
        {field('est_lodging_amount', 'Hotel / Lodging (₹)', multi ? 'Sum across all stops, at each stop’s grade' : `Policy: ${rate(est.rates.stay_per_night, 'per night')} × ${est.nights}`)}
        {field('est_food_amount', 'Food / DA (₹)', multi ? 'Sum across all stops, at each stop’s grade' : `Policy: ${rate(est.rates.da_per_day, 'per day')} × ${est.days}`)}
        {field('est_local_amount', 'Conveyance (₹)', multi ? `Policy rate × ${days} days` : `Policy: ${rate(est.rates.local_per_day, 'per day')} × ${est.days}`)}
        {field('est_misc_amount', 'Miscellaneous (₹)', 'Bills mandatory for reimbursement', true)}
      </div>

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-800 font-semibold flex items-start gap-2"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w}</p>
          ))}
          <p className="text-[11px] text-amber-600 pt-0.5">You can still submit — these are shown to your approver.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3 pt-1 border-t border-indigo-100">
        <div className="pt-3">
          <label className="text-xs font-bold text-slate-500 mb-1 block">Advance Required (₹)</label>
          <input type="number" min="0" max={maxAdvance || undefined} value={tour.advance_amount}
            onChange={e => setTour({ ...tour, advance_amount: e.target.value })} placeholder="0"
            className={advanceOver
              ? 'w-full border-2 border-rose-300 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-700 bg-rose-50/60 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all'
              : inp} />
          {advanceOver ? (
            <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
              Most you can draw is {money(maxAdvance)} — the {money(total)} estimate plus 10%. Lower this to submit.
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">
              Paid before departure · adjusted against your final claim
              {total > 0 && <> · up to {money(maxAdvance)}</>}
            </p>
          )}
        </div>
        <div className="pt-3 flex flex-col justify-center bg-white rounded-xl border border-indigo-100 px-4 py-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Total Estimated Expense</p>
          <p className="text-2xl font-black text-slate-800 leading-tight">{money(total)}</p>
          {advance > 0 && (
            <p className="text-[11px] text-slate-500 mt-0.5">Advance {money(advance)} · balance on claim {money(Math.max(0, total - advance))}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Employee: New Request forms ───────────────────────────────────────────────
