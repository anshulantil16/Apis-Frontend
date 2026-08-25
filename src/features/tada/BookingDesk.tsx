/* Travel Help Desk: trips awaiting tickets, and recording what was booked.
   Only fully approved trips appear — booking a journey HR later rejects wastes
   a fare and a cancellation charge. */
import { useState, useEffect } from 'react';
import {
  Plane, CheckCircle, XCircle, RefreshCw, Clock, AlertCircle, Ticket,
} from 'lucide-react';
import { API, fmt, type User } from './shared';
import { Toast } from './components';

type Journey = {
  key: string; seq: number | null; city: string; mode: string;
  date: string | null; timePref: string | null; status: string;
  reference: string; carrier: string; fare: number; estimate: number;
};

/** Flatten a request into the journeys the desk actually has to raise. */
function journeysOf(r: any): Journey[] {
  const legs = (r.legs || []).filter((l: any) => l.booking_mode === 'company');
  if (legs.length) {
    return legs.map((l: any) => ({
      key: `${r.id}-${l.seq}`, seq: l.seq, city: l.destination_city, mode: l.travel_mode,
      date: l.ticket_date, timePref: l.ticket_time_pref_label, status: l.booking_status,
      reference: l.booking_reference, carrier: l.booking_carrier, fare: l.booking_fare,
      estimate: l.est_ticket_amount,
    }));
  }
  if (r.booking_mode !== 'company') return [];
  return [{
    key: `${r.id}`, seq: null, city: r.destination_city, mode: r.travel_mode,
    date: r.travel_mode_date, timePref: r.travel_mode_time_pref_label, status: r.booking_status,
    reference: r.booking_reference, carrier: r.booking_carrier, fare: r.booking_fare,
    estimate: r.est_ticket_amount,
  }];
}

function BookingForm({ req, j, onDone }: { req: any; j: Journey; onDone: (msg: string, ok: boolean) => void }) {
  const [ref, setRef] = useState(j.reference || '');
  const [carrier, setCarrier] = useState(j.carrier || '');
  const [fare, setFare] = useState(j.fare ? String(j.fare) : '');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const cell = 'w-full border-2 border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-400 bg-white';
  const missing = !cancelling && (!ref.trim() || !(parseFloat(fare) > 0));

  const send = async (action: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/requests/${req.id}/booking/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: req._me, leg_seq: j.seq, action,
          booking_reference: ref, booking_carrier: carrier, booking_fare: fare,
          booking_remarks: remarks,
        }),
      });
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

      {j.estimate > 0 && parseFloat(fare) > j.estimate && (
        <p className="text-[11px] text-amber-700 font-semibold flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
          ₹{fmt(parseFloat(fare) - j.estimate)} above the ₹{fmt(j.estimate)} estimated for this journey.
        </p>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        <button onClick={() => { setCancelling(false); send('booked'); }} disabled={busy || missing}
          title={missing ? 'A PNR and the fare paid are both needed' : undefined}
          className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-4 py-2 rounded-lg text-xs disabled:opacity-50 hover:shadow-lg transition-all">
          <CheckCircle className="w-3.5 h-3.5" />Record booking
        </button>
        <button onClick={() => { setCancelling(true); send('cancelled'); }} disabled={busy}
          className="flex items-center gap-1.5 bg-white border-2 border-rose-200 text-rose-600 font-bold px-4 py-2 rounded-lg text-xs hover:bg-rose-50 disabled:opacity-50 transition-all">
          <XCircle className="w-3.5 h-3.5" />Could not book
        </button>
        {missing && <span className="text-[11px] text-slate-400">PNR and fare are needed to record a booking.</span>}
      </div>
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
            <p className="text-[11px] text-slate-400">{r.department} · {r.from_date} → {r.to_date} · {r.purpose || 'Tour programme'}</p>
          </div>
          <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">{r.status_label}</span>
        </div>

        {js.map(j => (
          <div key={j.key} className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="bg-slate-50/80 px-3 py-2 flex items-center justify-between gap-2 flex-wrap border-b border-slate-100">
              <p className="font-black text-slate-700 text-xs">
                {j.seq !== null ? `Stop ${j.seq + 1} · ` : ''}{j.city || 'Journey'}
                {j.mode && <span className="text-slate-400 font-semibold"> · by {j.mode}</span>}
              </p>
              <p className="text-[11px] text-slate-500">
                {j.date ? `Travel ${j.date}` : 'No date given'}{j.timePref ? ` · ${j.timePref}` : ''}
                {j.estimate > 0 && <span className="text-slate-400"> · est. ₹{fmt(j.estimate)}</span>}
              </p>
            </div>
            <div className="p-2.5">
              {j.status === 'booked' ? (
                <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5" />
                  {j.carrier ? `${j.carrier} · ` : ''}{j.reference} · ₹{fmt(j.fare)} paid by the company
                </p>
              ) : j.status === 'cancelled' ? (
                <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />Not booked
                </p>
              ) : editable ? (
                <BookingForm req={{ ...r, _me: user.employee_id }} j={j} onDone={done} />
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
