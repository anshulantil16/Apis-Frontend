/* Bill collection for an expense claim, laid out the way the trip was
   sanctioned: a section per stop, and within it a row per head carrying what
   that head was sanctioned and what policy allows. */
import {
  Plus, Trash2, Paperclip,
} from 'lucide-react';

export const SETTLE_HEADS: { k: string; l: string }[] = [
  { k: 'travel', l: 'Travel' }, { k: 'lodging', l: 'Lodging' }, { k: 'food', l: 'Food / DA' },
  { k: 'local_transport', l: 'Conveyance' }, { k: 'misc', l: 'Miscellaneous' },
];

/* ── Bills, collected the way the trip was sanctioned ──────────────────────────
   One flat list with a category dropdown made the employee re-derive the
   structure the sanction already describes. Bills are gathered per stop and per
   head instead, each showing what that head was sanctioned for at that stop, so
   filing is a matter of matching receipts to lines that are already laid out —
   and an over-run is attributable to the leg that caused it. */
export function BillCollector({ stops, heads, items, setItems }: {
  stops: { seq: number | null; label: string; sub: string;
           heads: Record<string, number>; policy: Record<string, number | null> }[];
  heads: { k: string; l: string }[];
  items: any[]; setItems: (i: any[]) => void;
}) {
  const money = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
  const rowsFor = (seq: number | null, cat: string) =>
    items.map((it, idx) => ({ it, idx })).filter(({ it }) => (it.leg_seq ?? null) === seq && it.category === cat);
  const sumFor = (seq: number | null, cat: string) =>
    rowsFor(seq, cat).reduce((s, { it }) => s + (parseFloat(it.claimed_amount) || 0), 0);
  const patch = (idx: number, p: any) => setItems(items.map((x, j) => j === idx ? { ...x, ...p } : x));
  const addRow = (seq: number | null, cat: string) => setItems([...items, {
    category: cat, leg_seq: seq, date: '', description: '', from_location: '', to_location: '',
    mode: '', km: '', claimed_amount: '', bill: null,
  }]);

  return (
    <div className="space-y-3">
      {stops.map(stop => {
        const stopClaimed = heads.reduce((s, h) => s + sumFor(stop.seq, h.k), 0);
        const stopEst = heads.reduce((s, h) => s + (stop.heads[h.k] || 0), 0);
        const stopPol = heads.reduce((s, h) => s + (stop.policy?.[h.k] || 0), 0);
        return (
          <div key={String(stop.seq)} className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-50/80 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap border-b border-slate-200">
              <div>
                <p className="font-black text-slate-800 text-sm">{stop.label}</p>
                <p className="text-[11px] text-slate-400">{stop.sub}</p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <span className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-500">Policy {money(stopPol)}</span>
                <span className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-500">Sanctioned {money(stopEst)}</span>
                <span className={`rounded-lg px-2 py-1 border ${stopClaimed > stopEst && stopEst > 0
                  ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  Claimed {money(stopClaimed)}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {heads.map(h => {
                const est = stop.heads[h.k] || 0;
                const pol = stop.policy?.[h.k] ?? null;   // null = no ceiling for this head
                const act = sumFor(stop.seq, h.k);
                const rows = rowsFor(stop.seq, h.k);
                const overPol = pol != null && act > pol;
                return (
                  <div key={h.k} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <p className="font-bold text-slate-700 text-xs">{h.l}</p>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold flex-wrap">
                        {pol != null && <span className="text-slate-400">Policy {money(pol)}</span>}
                        {est > 0 && <span className="text-slate-400">Sanctioned {money(est)}</span>}
                        {act > 0 && <span className={overPol ? 'text-rose-600' : 'text-slate-600'}>Claimed {money(act)}</span>}
                        {overPol ? <span className="text-rose-600">{money(act - (pol as number))} over policy</span>
                          : act > 0 && pol != null ? <span className="text-emerald-600">within policy</span> : null}
                      </div>
                    </div>

                    {rows.length === 0 ? (
                      <button type="button" onClick={() => addRow(stop.seq, h.k)}
                        className="w-full border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-400 hover:text-indigo-600 rounded-xl py-2 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" />Add {h.l.toLowerCase()} bill
                      </button>
                    ) : (
                      <div className="space-y-2">
                        {rows.map(({ it, idx }) => (
                          <BillRow key={idx} head={h.k} it={it}
                            onPatch={(patchObj: any) => patch(idx, patchObj)}
                            onRemove={() => setItems(items.filter((_, j) => j !== idx))} />
                        ))}
                        <button type="button" onClick={() => addRow(stop.seq, h.k)}
                          className="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 inline-flex items-center gap-1">
                          <Plus className="w-3 h-3" />Add another {h.l.toLowerCase()} bill
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Policy vs sanctioned vs claimed ───────────────────────────────────────────
   Three different numbers, and a claim can only be judged with all three in
   view: the policy entitlement (the hard ceiling from the matrices), what was
   sanctioned before the trip (seeded from policy but editable, so it may sit
   above or below it), and what is actually being claimed.

   The employee sees this while filing and every approver sees the same
   component afterwards — the server computes the arithmetic once so the two
   can never drift apart. */

/* What a bill needs depends entirely on the head.
   A hotel folio is judged per night, so it needs the actual check-in and
   check-out — including the times, since checking out at 06:00 is not another
   night. A journey needs its route, mode and ticket reference. Own-vehicle
   conveyance is priced on kilometres. Asking every head for the same four
   boxes left the employee guessing and the approver short of the one detail
   that would have settled the question. */

const cell = 'w-full border-2 border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-400 transition-all bg-white';

function Field({ label, children, span = '' }: { label: string; children: any; span?: string }) {
  return (
    <div className={span}>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5 block">{label}</label>
      {children}
    </div>
  );
}

function BillRow({ head, it, onPatch, onRemove }: {
  head: string; it: any; onPatch: (p: any) => void; onRemove: () => void;
}) {
  const set = (k: string, v: any) => onPatch({ [k]: v });
  const amount = parseFloat(it.claimed_amount) || 0;

  // Nights come from the stay itself, which is what the ceiling is applied to.
  const nights = (() => {
    if (!it.check_in || !it.check_out) return null;
    const a = new Date(it.check_in), b = new Date(it.check_out);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    const n = Math.round((new Date(b.toDateString()).getTime() - new Date(a.toDateString()).getTime()) / 86400000);
    return n > 0 ? n : 1;
  })();
  const perNight = nights && amount ? Math.round(amount / nights) : null;

  const days = (() => {
    if (!it.date || !it.to_date) return null;
    const n = Math.round((new Date(it.to_date).getTime() - new Date(it.date).getTime()) / 86400000) + 1;
    return n > 0 ? n : null;
  })();

  const ownVehicle = /own|bike|scooter|car/i.test(it.mode || '');

  return (
    <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-2.5 space-y-2">
      <div className="grid grid-cols-2 lg:grid-cols-12 gap-2">

        {head === 'lodging' && (<>
          <Field label="Hotel / Guest house" span="col-span-2 lg:col-span-4">
            <input className={cell} placeholder="Name of the property" value={it.vendor || ''}
              onChange={e => set('vendor', e.target.value)} />
          </Field>
          <Field label="Check-in" span="lg:col-span-3">
            <input type="datetime-local" className={cell} value={it.check_in || ''}
              onChange={e => set('check_in', e.target.value)} />
          </Field>
          <Field label="Check-out" span="lg:col-span-3">
            <input type="datetime-local" className={cell} value={it.check_out || ''}
              onChange={e => set('check_out', e.target.value)} />
          </Field>
          <Field label="Invoice no." span="lg:col-span-2">
            <input className={cell} placeholder="GST invoice" value={it.reference_no || ''}
              onChange={e => set('reference_no', e.target.value)} />
          </Field>
        </>)}

        {head === 'travel' && (<>
          <Field label="Date of journey" span="lg:col-span-3">
            <input type="date" className={cell} value={it.date || ''} onChange={e => set('date', e.target.value)} />
          </Field>
          <Field label="From" span="lg:col-span-2">
            <input className={cell} placeholder="Origin" value={it.from_location || ''}
              onChange={e => set('from_location', e.target.value)} />
          </Field>
          <Field label="To" span="lg:col-span-2">
            <input className={cell} placeholder="Destination" value={it.to_location || ''}
              onChange={e => set('to_location', e.target.value)} />
          </Field>
          <Field label="Mode" span="lg:col-span-2">
            <select className={cell} value={it.mode || ''} onChange={e => set('mode', e.target.value)}>
              <option value="">Select…</option>
              {['Train', 'Flight', 'Bus', 'Cab / Taxi', 'Own Car', 'Own Two-Wheeler', 'Company Vehicle']
                .map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="PNR / Ticket no." span="lg:col-span-3">
            <input className={cell} placeholder="Booking reference" value={it.reference_no || ''}
              onChange={e => set('reference_no', e.target.value)} />
          </Field>
          {ownVehicle && (
            <Field label="Distance (km)" span="lg:col-span-2">
              <input type="number" min="0" className={cell} placeholder="km" value={it.km || ''}
                onChange={e => set('km', e.target.value)} />
            </Field>
          )}
        </>)}

        {head === 'food' && (<>
          <Field label="From date" span="lg:col-span-3">
            <input type="date" className={cell} value={it.date || ''} onChange={e => set('date', e.target.value)} />
          </Field>
          <Field label="To date" span="lg:col-span-3">
            <input type="date" className={cell} min={it.date || undefined} value={it.to_date || ''}
              onChange={e => set('to_date', e.target.value)} />
          </Field>
          <Field label="Restaurant / vendor" span="col-span-2 lg:col-span-4">
            <input className={cell} placeholder="Optional" value={it.vendor || ''}
              onChange={e => set('vendor', e.target.value)} />
          </Field>
        </>)}

        {head === 'local_transport' && (<>
          <Field label="Date" span="lg:col-span-2">
            <input type="date" className={cell} value={it.date || ''} onChange={e => set('date', e.target.value)} />
          </Field>
          <Field label="From" span="lg:col-span-2">
            <input className={cell} placeholder="Origin" value={it.from_location || ''}
              onChange={e => set('from_location', e.target.value)} />
          </Field>
          <Field label="To" span="lg:col-span-2">
            <input className={cell} placeholder="Destination" value={it.to_location || ''}
              onChange={e => set('to_location', e.target.value)} />
          </Field>
          <Field label="Mode" span="lg:col-span-3">
            <select className={cell} value={it.mode || ''} onChange={e => set('mode', e.target.value)}>
              <option value="">Select…</option>
              {['Cab / Taxi', 'Auto Rickshaw', 'Bus', 'Metro', 'Own Car', 'Own Two-Wheeler', 'Bike Taxi', 'E-Rickshaw']
                .map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          {ownVehicle && (
            <Field label="Distance (km)" span="lg:col-span-3">
              <input type="number" min="0" className={cell} placeholder="km" value={it.km || ''}
                onChange={e => set('km', e.target.value)} />
            </Field>
          )}
        </>)}

        {head === 'misc' && (<>
          <Field label="Date" span="lg:col-span-3">
            <input type="date" className={cell} value={it.date || ''} onChange={e => set('date', e.target.value)} />
          </Field>
          <Field label="Paid to" span="lg:col-span-4">
            <input className={cell} placeholder="Vendor" value={it.vendor || ''}
              onChange={e => set('vendor', e.target.value)} />
          </Field>
          <Field label="Invoice no." span="lg:col-span-5">
            <input className={cell} placeholder="Optional" value={it.reference_no || ''}
              onChange={e => set('reference_no', e.target.value)} />
          </Field>
        </>)}
      </div>

      {/* Amount, purpose and the bill itself are common to every head. */}
      <div className="grid grid-cols-2 lg:grid-cols-12 gap-2 items-end">
        <Field label="Amount" span="lg:col-span-3">
          <input type="number" min="0" className={cell} placeholder="0"
            value={it.claimed_amount} onChange={e => set('claimed_amount', e.target.value)} />
        </Field>
        <Field label={head === 'misc' ? 'What was this for, and why' : 'Remarks'} span="col-span-2 lg:col-span-7">
          <input className={cell} placeholder={head === 'misc' ? 'Required — justify the expense' : 'Optional'}
            value={it.description} onChange={e => set('description', e.target.value)} />
        </Field>
        <div className="col-span-2 lg:col-span-2 flex items-center gap-1.5">
          <label className={`flex-1 cursor-pointer text-[11px] font-bold rounded-lg px-2 py-2 text-center border-2 transition-all truncate ${
            it.bill ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-dashed border-slate-300 text-slate-400 hover:border-indigo-300 hover:text-indigo-600'}`}>
            <input type="file" accept="image/*,application/pdf" className="hidden"
              onChange={e => set('bill', e.target.files?.[0] || null)} />
            {it.bill ? <span className="inline-flex items-center gap-1"><Paperclip className="w-3 h-3" />Attached</span> : 'Bill'}
          </label>
          <button type="button" onClick={onRemove}
            className="text-rose-300 hover:text-rose-600 shrink-0" title="Remove this bill">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* The derived figure the ceiling is actually applied to — shown here so
          the employee sees it before an approver queries it. */}
      {(nights || days) && (
        <p className="text-[11px] text-slate-500 font-semibold">
          {nights && <>{nights} night{nights === 1 ? '' : 's'}{perNight ? ` · ₹${perNight.toLocaleString('en-IN')} per night` : ''}</>}
          {days && <>{days} day{days === 1 ? '' : 's'} covered</>}
        </p>
      )}
    </div>
  );
}
