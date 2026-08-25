/* Multi-city itinerary: one card per stop, each with its own dates, city,
   travel mode and ticket, bounded by the overall trip window. */
import {
  Plus, Trash2,
} from 'lucide-react';
import { TIME_PREFS, blankLeg, journeyNoun } from './shared';
import { BookingModePicker, TravelModePicker } from './TravelModePicker';

export function ItineraryEditor({ legs, setLegs, modeOptions, est, inp, tripFrom, tripTo }: {
  legs: any[]; setLegs: (l: any[]) => void; modeOptions: any; est: any; inp: string;
  tripFrom: string; tripTo: string;
}) {
  const set = (i: number, patch: any) => setLegs(legs.map((l, j) => j === i ? { ...l, ...patch } : l));
  const legEst = (i: number) => est?.legs?.find((l: any) => l.seq === i);
  const money = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const nextDay = (d: string) => {
    if (!d) return '';
    const t = new Date(d); t.setDate(t.getDate() + 1);
    return t.toISOString().slice(0, 10);
  };

  /* Stops can only fall inside the trip window, so the pickers are bounded by
     it rather than letting a date through and flagging it afterwards. A stop
     also cannot end before it starts, nor start before the previous stop ends. */
  const addStop = () => {
    const last = legs[legs.length - 1];
    const start = last?.to_date ? nextDay(last.to_date) : tripFrom;
    setLegs([...legs, { ...blankLeg(), from_date: start && (!tripTo || start <= tripTo) ? start : '' }]);
  };

  if (!tripFrom || !tripTo) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4">
        <p className="text-xs text-slate-500 font-semibold">Set the overall From and To dates first</p>
        <p className="text-[11px] text-slate-400 mt-1">Each stop is picked from within your travel dates, so they need to be set before you can break the trip down.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {legs.map((leg, i) => {
        const e = legEst(i);
        return (
          <div key={i} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                Stop {i + 1}
                {e && <span className="text-indigo-400 font-bold">· grade {e.city_grade} · {e.days}d / {e.nights}n</span>}
              </span>
              {legs.length > 1 && (
                <button onClick={() => setLegs(legs.filter((_, j) => j !== i))}
                  className="text-rose-400 hover:text-rose-600 flex items-center gap-1 text-xs font-bold"><Trash2 className="w-4 h-4" />Remove</button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">Destination City
                {e?.city_grade && <span className="ml-1.5 text-indigo-500">· grade {e.city_grade}</span>}</label>
                <input className={inp} value={leg.destination_city} placeholder="e.g. Mumbai"
                  onChange={e2 => set(i, { destination_city: e2.target.value })} />
                <p className="text-[11px] text-slate-400 mt-1">City only — sets this stop's limits</p></div>
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">Travel Address <span className="text-slate-300">(optional)</span></label>
                <input className={inp} value={leg.travel_address} placeholder="office / site / hotel address"
                  onChange={e2 => set(i, { travel_address: e2.target.value })} /></div>
              <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 mb-1 block">Purpose at this stop <span className="text-slate-300">(optional)</span></label>
                <input className={inp} value={leg.purpose} onChange={e2 => set(i, { purpose: e2.target.value })} /></div>
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">From Date</label>
                <input type="date" className={inp} value={leg.from_date}
                  min={legs[i - 1]?.to_date ? nextDay(legs[i - 1].to_date) : tripFrom} max={tripTo}
                  onChange={e2 => {
                    const v = e2.target.value;
                    // keep the end from falling behind the new start
                    set(i, { from_date: v, ...(leg.to_date && leg.to_date < v ? { to_date: v } : {}) });
                  }} /></div>
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">To Date</label>
                <input type="date" className={inp} value={leg.to_date}
                  min={leg.from_date || tripFrom} max={tripTo}
                  onChange={e2 => set(i, { to_date: e2.target.value })} /></div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500 mb-1 block">How you travel to {leg.destination_city || 'this stop'}</label>
                <TravelModePicker className={inp} value={leg.travel_mode} options={modeOptions}
                  onChange={v => set(i, { travel_mode: v, mode_exception_reason: '' })}
                  reason={leg.mode_exception_reason} onReason={v => set(i, { mode_exception_reason: v })} />
              </div>

              {leg.travel_mode && (
                <>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Who books this ticket?</label>
                    <BookingModePicker value={leg.booking_mode}
                      onChange={v => set(i, { booking_mode: v })} />
                  </div>
                  <div><label className="text-xs font-bold text-slate-500 mb-1 block">{journeyNoun(leg.travel_mode)} Date</label>
                    <input type="date" className={inp} value={leg.ticket_date} min={tripFrom} max={tripTo}
                      onChange={e2 => set(i, { ticket_date: e2.target.value })} /></div>
                  <div><label className="text-xs font-bold text-slate-500 mb-1 block">Preferred Time</label>
                    <select className={inp} value={leg.ticket_time_pref} onChange={e2 => set(i, { ticket_time_pref: e2.target.value })}>
                      <option value="">Select time…</option>
                      {TIME_PREFS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                    </select></div>
                </>
              )}

              <div><label className="text-xs font-bold text-slate-500 mb-1 block">{journeyNoun(leg.travel_mode)} Cost to this stop (₹)</label>
                <input type="number" min="0" className={inp} value={leg.est_ticket_amount} placeholder="0"
                  onChange={e2 => set(i, { est_ticket_amount: e2.target.value })} /></div>

              {e && (
                <div className="flex flex-col justify-end">
                  <p className="text-[11px] text-slate-400 mb-1">Policy for {e.city} (grade {e.city_grade})</p>
                  <div className="flex flex-wrap gap-1 text-[11px] font-semibold">
                    <span className="bg-white border border-slate-200 rounded px-1.5 py-0.5">Stay {money(e.lines.lodging)}</span>
                    <span className="bg-white border border-slate-200 rounded px-1.5 py-0.5">DA {money(e.lines.food)}</span>
                    <span className="bg-white border border-slate-200 rounded px-1.5 py-0.5">Local {money(e.lines.local)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button onClick={addStop}
        className="w-full border-2 border-dashed border-indigo-200 text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-2xl py-3 font-bold text-sm flex items-center justify-center gap-2 transition-all">
        <Plus className="w-4 h-4" />Add another stop
      </button>
    </div>
  );
}

/* ── Settlement: what was sanctioned vs what is being claimed ──────────────────
   An approver looking at a bare claim total has nothing to judge it against.
   Shown side by side, an over-run is visible per head, and the advance already
   paid is netted off so the figure at the bottom is the money that actually
   still has to move. */
