/* Travel Help Desk: trips awaiting tickets, and recording what was booked.
   Only fully approved trips appear — booking a journey P&C (HR) later rejects wastes
   a fare and a cancellation charge.

   When more than one flight or train is worth taking, the desk should not be
   the one guessing which the employee wants — so a journey can pass through an
   extra step: the desk lists what it found, the employee confirms one, and
   only then does the desk actually buy it and upload the ticket as proof. A
   journey with one obvious answer can still skip straight to booking it. */
import { useState, useEffect } from 'react';
import {
  Plane, CheckCircle, XCircle, RefreshCw, Clock, AlertCircle, Ticket, ListPlus, Plus, Trash2, Paperclip, Mail,
} from 'lucide-react';
import { API, d, fmt, type User } from './shared';
import { Toast } from './components';

type Journey = {
  key: string; journeyKey: string; seq: number | 'return' | null; from: string; city: string; mode: string;
  date: string | null; timePref: string | null; status: string;
  reference: string; carrier: string; fare: number; estimate: number;
  ticketUrl: string | null; options: any[];
};

/** Flatten a request into the journeys the desk actually has to raise. */
function journeysOf(r: any): Journey[] {
  const ret = returnJourneyOf(r);
  return [...outboundJourneysOf(r), ...(ret ? [ret] : [])];
}

const optionsFor = (r: any, journeyKey: string) =>
  (r.booking_options || []).filter((o: any) => o.journey_key === journeyKey);

function outboundJourneysOf(r: any): Journey[] {
  const legs = (r.legs || []).filter((l: any) => l.booking_mode === 'company');
  if (legs.length) {
    return legs.map((l: any) => ({
      key: `${r.id}-${l.seq}`, journeyKey: String(l.seq), seq: l.seq, from: l.from_city, city: l.destination_city, mode: l.travel_mode,
      date: l.ticket_date, timePref: l.ticket_time_pref_label, status: l.booking_status,
      reference: l.booking_reference, carrier: l.booking_carrier, fare: l.booking_fare,
      estimate: l.est_ticket_amount, ticketUrl: l.ticket_url, options: optionsFor(r, String(l.seq)),
    }));
  }
  if (r.booking_mode !== 'company') return [];
  return [{
    key: `${r.id}`, journeyKey: 'trip', seq: null, from: r.from_city, city: r.destination_city, mode: r.travel_mode,
    date: r.travel_mode_date, timePref: r.travel_mode_time_pref_label, status: r.booking_status,
    reference: r.booking_reference, carrier: r.booking_carrier, fare: r.booking_fare,
    estimate: r.est_ticket_amount, ticketUrl: r.ticket_url, options: optionsFor(r, 'trip'),
  }];
}

/** The way home, if the desk is raising it. Its own ticket, its own PNR. */
function returnJourneyOf(r: any): Journey | null {
  if (r.trip_type !== 'round_trip' || r.return_booking_mode !== 'company') return null;
  // Where the return actually starts: the last stop on a multi-city trip, or
  // the single destination otherwise — not the trip's own from_city, which is
  // where the OUTBOUND began.
  const lastLeg = (r.legs || [])[r.legs?.length - 1];
  const startsFrom = lastLeg ? lastLeg.destination_city : r.destination_city;
  return {
    key: `${r.id}-return`, journeyKey: 'return', seq: 'return', from: startsFrom, city: r.hq_city || 'base',
    mode: r.return_travel_mode, date: r.return_mode_date,
    timePref: r.return_mode_time_pref_label, status: r.return_booking_status,
    reference: r.return_booking_reference, carrier: r.return_booking_carrier,
    fare: r.return_booking_fare, estimate: 0,
    ticketUrl: r.return_ticket_url, options: optionsFor(r, 'return'),
  };
}

const cell = 'w-full border-2 border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-400 bg-white';
const blankOption = () => ({ mode: '', carrier: '', detail: '', date: '', time: '', amount: '', remarks: '' });

/* The desk quotes what it found — two to six rows, not the one it has already
   decided on — and the employee picks from these, so the fields it asks for
   are exactly what a person compares fares by. */
function OptionsForm({ req, j, onDone, onCancel }: {
  req: any; j: Journey; onDone: (msg: string, ok: boolean) => void; onCancel: () => void;
}) {
  const [rows, setRows] = useState<any[]>([blankOption(), blankOption()]);
  const [busy, setBusy] = useState(false);

  const set = (i: number, k: string, v: string) =>
    setRows(rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const ready = rows.filter(r => r.carrier.trim() && parseFloat(r.amount) > 0);
  const missing = ready.length < 2;

  const send = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/requests/${req.id}/booking/options/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: req._me, journey_key: j.journeyKey, options: ready }),
      });
      const body = await res.json().catch(() => ({}));
      onDone(res.ok ? 'Options sent — waiting on the employee.' : (body.error || 'Could not send those options.'), res.ok);
    } catch {
      onDone('Could not reach the server.', false);
    }
    setBusy(false);
  };

  return (
    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 space-y-2">
      <p className="text-[11px] font-bold text-indigo-700">What did you find? Add at least two so the employee has a real choice.</p>
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-1.5 items-end bg-white border border-slate-100 rounded-lg p-2">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block">Mode</label>
            <input className={cell} value={row.mode} onChange={e => set(i, 'mode', e.target.value)} placeholder="Flight / Train" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block">Airline / Train</label>
            <input className={cell} value={row.carrier} onChange={e => set(i, 'carrier', e.target.value)} placeholder="Required" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block">Flight / Train No.</label>
            <input className={cell} value={row.detail} onChange={e => set(i, 'detail', e.target.value)} />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block">Date</label>
            <input type="date" className={cell} value={row.date} onChange={e => set(i, 'date', e.target.value)} />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block">Time</label>
            <input className={cell} value={row.time} onChange={e => set(i, 'time', e.target.value)} placeholder="14:30" />
          </div>
          <div className="flex items-end gap-1">
            <div className="flex-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase block">Amount ₹</label>
              <input type="number" min="0" className={cell} value={row.amount} onChange={e => set(i, 'amount', e.target.value)} placeholder="Required" />
            </div>
            {rows.length > 2 && (
              <button type="button" onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                className="text-rose-300 hover:text-rose-600 shrink-0 pb-1.5" title="Remove this option">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {rows.length < 6 && (
          <button type="button" onClick={() => setRows([...rows, blankOption()])}
            className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800">
            <Plus className="w-3.5 h-3.5" />Add another option
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          <button type="button" onClick={onCancel} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 px-2">Cancel</button>
          <button onClick={send} disabled={busy || missing}
            title={missing ? 'At least two options need an airline/train and a fare' : undefined}
            className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-sky-600 text-white font-bold px-4 py-2 rounded-lg text-xs disabled:opacity-50 hover:shadow-lg transition-all">
            <Mail className="w-3.5 h-3.5" />Send to employee
          </button>
        </div>
      </div>
    </div>
  );
}

/* Book what was actually chosen (or, for a journey with one obvious answer,
   book it directly) and upload the ticket — the upload is the record, so it
   is not optional the way the other fields once were. */
function TicketForm({ req, j, chosen, onDone }: {
  req: any; j: Journey; chosen: any | null; onDone: (msg: string, ok: boolean) => void;
}) {
  const [ref, setRef] = useState(j.reference || '');
  const [carrier, setCarrier] = useState(j.carrier || chosen?.carrier || '');
  const [fare, setFare] = useState(j.fare ? String(j.fare) : (chosen?.amount ? String(chosen.amount) : ''));
  const [remarks, setRemarks] = useState('');
  const [ticket, setTicket] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const missing = !cancelling && (!ref.trim() || !(parseFloat(fare) > 0) || !ticket);

  const send = async (action: string) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('employee_id', req._me); fd.append('journey_key', j.journeyKey); fd.append('action', action);
      fd.append('booking_reference', ref); fd.append('booking_carrier', carrier);
      fd.append('booking_fare', fare); fd.append('booking_remarks', remarks);
      if (ticket) fd.append('ticket', ticket);
      const res = await fetch(`${API}/requests/${req.id}/booking/`, { method: 'POST', body: fd });
      const body = await res.json().catch(() => ({}));
      onDone(res.ok ? (action === 'booked' ? 'Booking recorded' : 'Marked as not booked')
                    : (body.error || 'Could not record that.'), res.ok);
    } catch {
      onDone('Could not reach the server.', false);
    }
    setBusy(false);
  };

  return (
    <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 space-y-2">
      {chosen && (
        <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1">
          Employee chose: {chosen.mode} {chosen.carrier} {chosen.detail} · {d(chosen.date)} {chosen.time} · ₹{fmt(chosen.amount)}
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5 block">PNR / Ticket no.</label>
          <input className={cell} value={ref} onChange={e => setRef(e.target.value)} placeholder="Required" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5 block">Operator</label>
          <input className={cell} value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="Airline / railway" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5 block">Fare paid ₹</label>
          <input type="number" min="0" className={cell} value={fare} onChange={e => setFare(e.target.value)} placeholder="Required" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5 block">Remarks</label>
          <input className={cell} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      <div>
        <label className={`flex items-center gap-1.5 cursor-pointer text-[11px] font-bold rounded-lg px-3 py-2 border-2 transition-all w-fit ${
          ticket ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-dashed border-slate-300 text-slate-400 hover:border-indigo-300 hover:text-indigo-600'}`}>
          <input type="file" accept="image/*,application/pdf" className="hidden"
            onChange={e => setTicket(e.target.files?.[0] || null)} />
          <Paperclip className="w-3.5 h-3.5" />
          {ticket ? ticket.name : 'Upload the ticket — this is the record'}
        </label>
      </div>

      {j.estimate > 0 && parseFloat(fare) > j.estimate && (
        <p className="text-[11px] text-amber-700 font-semibold flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
          ₹{fmt(parseFloat(fare) - j.estimate)} above the ₹{fmt(j.estimate)} estimated for this journey.
        </p>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        <button onClick={() => { setCancelling(false); send('booked'); }} disabled={busy || missing}
          title={missing ? 'A PNR, the fare paid and the ticket file are all needed' : undefined}
          className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-4 py-2 rounded-lg text-xs disabled:opacity-50 hover:shadow-lg transition-all">
          <CheckCircle className="w-3.5 h-3.5" />Record booking
        </button>
        <button onClick={() => { setCancelling(true); send('cancelled'); }} disabled={busy}
          className="flex items-center gap-1.5 bg-white border-2 border-rose-200 text-rose-600 font-bold px-4 py-2 rounded-lg text-xs hover:bg-rose-50 disabled:opacity-50 transition-all">
          <XCircle className="w-3.5 h-3.5" />Could not book
        </button>
      </div>
    </div>
  );
}

/** The middle state of a journey: pick between quoting options or booking
    outright, show what was already sent, or show what the employee chose. */
function JourneyBody({ req, j, onDone }: { req: any; j: Journey; onDone: (msg: string, ok: boolean) => void }) {
  const [mode, setMode] = useState<'choose' | 'options' | 'direct'>('choose');

  if (j.status === 'options_sent') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
        <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />Waiting on the employee to choose
        </p>
        {j.options.map((o: any) => (
          <p key={o.id} className="text-[11px] text-amber-700 pl-5">
            {o.mode} {o.carrier} {o.detail} · {d(o.date)} {o.time} · ₹{fmt(o.amount)}
          </p>
        ))}
      </div>
    );
  }

  if (j.status === 'confirmed') {
    const chosen = j.options.find((o: any) => o.is_selected) || null;
    return <TicketForm req={req} j={j} chosen={chosen} onDone={onDone} />;
  }

  // status === 'pending'
  if (mode === 'options') return <OptionsForm req={req} j={j} onDone={onDone} onCancel={() => setMode('choose')} />;
  if (mode === 'direct') return <TicketForm req={req} j={j} chosen={null} onDone={onDone} />;
  return (
    <div className="flex gap-2 flex-wrap">
      <button onClick={() => setMode('options')}
        className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-sky-600 text-white font-bold px-4 py-2 rounded-lg text-xs hover:shadow-lg transition-all">
        <ListPlus className="w-3.5 h-3.5" />Found more than one option
      </button>
      <button onClick={() => setMode('direct')}
        className="flex items-center gap-1.5 bg-white border-2 border-slate-200 text-slate-600 font-bold px-4 py-2 rounded-lg text-xs hover:border-indigo-300 transition-all">
        <Ticket className="w-3.5 h-3.5" />Only one — book it directly
      </button>
    </div>
  );
}

export function BookingDesk({ user }: { user: User }) {
  const [data, setData] = useState<any>({ pending: [], booked: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null);

  const load = () => fetch(`${API}/bookings/?employee_id=${encodeURIComponent(user.employee_id)}`)
    .then(r => r.json()).then(d => { setData(d); setLoading(false); })
    .catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const done = (msg: string, ok: boolean) => { setToast({ t: msg, ok }); if (ok) load(); };

  const card = (r: any, editable: boolean) => {
    const js = journeysOf(r);
    return (
      <div key={r.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 tp-reveal">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="font-black text-slate-800 text-sm">{r.employee_name} <span className="text-slate-400 font-semibold">· {r.employee_id}</span></p>
            <p className="text-[11px] text-slate-400">{r.department} · {d(r.from_date)} → {d(r.to_date)} · {r.purpose || 'Tour programme'}</p>
            {r.traveller_name && (
              <p className="text-[11px] text-indigo-500 font-semibold mt-0.5">
                Book as: {r.traveller_name}{r.traveller_age ? `, ${r.traveller_age}y` : ''}{r.contact_number ? ` · ${r.contact_number}` : ''}
              </p>
            )}
          </div>
          <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">{r.status_label}</span>
        </div>

        {js.map(j => (
          <div key={j.key} className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="bg-slate-50/80 px-3 py-2 flex items-center justify-between gap-2 flex-wrap border-b border-slate-100">
              <p className="font-black text-slate-700 text-xs">
                {typeof j.seq === 'number' ? `Stop ${j.seq + 1} · ` : ''}
                {j.seq === 'return' && 'Return · '}
                {j.from ? `${j.from} → ` : ''}{j.city || 'Journey'}
                {j.mode && <span className="text-slate-400 font-semibold"> · by {j.mode}</span>}
              </p>
              <p className="text-[11px] text-slate-500">
                {j.date ? `Travel ${d(j.date)}` : 'No date given'}{j.timePref ? ` · ${j.timePref}` : ''}
                {j.estimate > 0 && <span className="text-slate-400"> · est. ₹{fmt(j.estimate)}</span>}
              </p>
            </div>
            <div className="p-2.5">
              {j.status === 'booked' ? (
                <p className="text-xs text-emerald-700 font-semibold flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5" />
                    {j.carrier ? `${j.carrier} · ` : ''}{j.reference} · ₹{fmt(j.fare)} paid by the company
                  </span>
                  {j.ticketUrl && (
                    <a href={`${API}${j.ticketUrl}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold text-[11px] underline">
                      <Paperclip className="w-3 h-3" />View ticket
                    </a>
                  )}
                </p>
              ) : j.status === 'cancelled' ? (
                <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />Not booked
                </p>
              ) : editable ? (
                <JourneyBody req={{ ...r, _me: user.employee_id }} j={j} onDone={done} />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center text-slate-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.t} ok={toast.ok} onClose={() => setToast(null)} />}

      <div className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white p-5 flex items-center gap-4 shadow-lg sheen">
        <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shrink-0"><Plane className="w-6 h-6" /></div>
        <div>
          <p className="text-white/80 text-sm font-semibold">Tickets to raise</p>
          <p className="text-3xl font-black leading-none">{data.pending.length} trip{data.pending.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div>
        <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />Awaiting booking ({data.pending.length})
        </h3>
        <div className="space-y-3">
          {data.pending.map((r: any) => card(r, true))}
          {data.pending.length === 0 && (
            <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-3 animate-float">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="font-bold text-slate-500">Nothing waiting</p>
              <p className="text-slate-400 text-sm mt-1">Approved trips needing a company booking will appear here.</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-black text-slate-800 mb-3">Recently booked</h3>
        <div className="space-y-3">
          {data.booked.map((r: any) => card(r, false))}
          {data.booked.length === 0 && <p className="text-slate-300 text-sm">None yet.</p>}
        </div>
      </div>
    </div>
  );
}
