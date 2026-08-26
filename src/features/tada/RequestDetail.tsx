/* One request in full: trip details, itinerary, the policy/sanctioned/claimed
   breakdown, its bills, the approval trail, and the approve/reject controls for
   whoever's stage it currently sits at. */
import { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, FileText, Receipt, Car, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Wallet,
} from 'lucide-react';
import { API, fmt, HR_LABEL, roleLabel, type User } from './shared';
import { Confetti, Pill, StageTrail, Toast } from './components';
import { PolicyBreakdown } from './PolicyBreakdown';

/** Every journey on this request that is sitting at options_sent — the desk
    found more than one flight or train, and it is this employee's turn to say
    which one to book. A journey with only one obvious answer never reaches
    this state, so nothing shows for it here. */
function openChoices(r: any) {
  const out: { journeyKey: string; label: string; options: any[] }[] = [];
  const push = (journeyKey: string, status: string, label: string) => {
    if (status !== 'options_sent') return;
    const options = (r.booking_options || []).filter((o: any) => o.journey_key === journeyKey);
    if (options.length) out.push({ journeyKey, label, options });
  };
  if ((r.legs || []).length) {
    r.legs.forEach((l: any) => push(String(l.seq), l.booking_status, `Stop ${l.seq + 1} · ${l.destination_city}`));
  } else {
    push('trip', r.booking_status, r.destination_city || 'Your journey');
  }
  push('return', r.return_booking_status, `Return to ${r.hq_city || 'base'}`);
  return out;
}

/** The employee's turn: pick one of the fares the desk found. */
function TicketChoicePanel({ r, user, onChosen }: { r: any; user: User; onChosen: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null);
  const choices = openChoices(r);
  if (!choices.length) return null;

  const choose = async (journeyKey: string, optionId: number) => {
    setBusy(`${journeyKey}-${optionId}`);
    try {
      const res = await fetch(`${API}/requests/${r.id}/booking/select/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: user.employee_id, journey_key: journeyKey, option_id: optionId }),
      });
      const body = await res.json().catch(() => ({}));
      setToast({ t: res.ok ? 'Choice confirmed — the desk will now book it.' : (body.error || 'Could not record your choice.'), ok: res.ok });
      if (res.ok) onChosen();
    } catch {
      setToast({ t: 'Could not reach the server.', ok: false });
    }
    setBusy(null);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-sky-50 border-2 border-indigo-200 rounded-2xl p-5 space-y-4">
      {toast && <Toast msg={toast.t} ok={toast.ok} onClose={() => setToast(null)} />}
      <div>
        <p className="font-black text-indigo-800 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4" />Choose your ticket
        </p>
        <p className="text-xs text-indigo-600 mt-0.5">
          The Travel Help Desk found more than one option — pick the one you want booked.
        </p>
      </div>
      {choices.map(({ journeyKey, label, options }) => (
        <div key={journeyKey} className="bg-white/70 border border-indigo-100 rounded-xl p-3 space-y-2">
          <p className="text-xs font-black text-slate-600">{label}</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {options.map((o: any) => (
              <div key={o.id} className="border-2 border-slate-200 rounded-lg p-2.5 bg-white flex flex-col gap-1.5">
                <p className="text-xs font-bold text-slate-800">{o.mode} {o.carrier}</p>
                <p className="text-[11px] text-slate-500">{o.detail}</p>
                <p className="text-[11px] text-slate-500">{o.date} {o.time && `· ${o.time}`}</p>
                <p className="text-sm font-black text-indigo-600">₹{fmt(o.amount)}</p>
                {o.remarks && <p className="text-[10px] text-slate-400">{o.remarks}</p>}
                <button onClick={() => choose(journeyKey, o.id)} disabled={busy === `${journeyKey}-${o.id}`}
                  className="mt-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-500 to-sky-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 hover:shadow-lg transition-all">
                  <CheckCircle className="w-3.5 h-3.5" />Book this one
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Detail({ id, user, onBack, onActioned }: { id: number; user: User; onBack: () => void; onActioned?: () => void }) {
  const [r, setR] = useState<any>(null);
  const [remarks, setRemarks] = useState('');
  const [briefing, setBriefing] = useState('');
  const [tourJustification, setTourJustification] = useState('');
  const [advanceRemarks, setAdvanceRemarks] = useState('');
  const [deviation, setDeviation] = useState('');
  const [busy, setBusy] = useState(false);
  const [party, setParty] = useState(false);
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null);
  // employee_id identifies the viewer, which is how the server decides what
  // this user may action on this request.
  const load = () => fetch(`${API}/requests/${id}/?employee_id=${encodeURIComponent(user.employee_id)}`)
    .then(x => x.json()).then(setR);
  useEffect(() => { load(); }, [id]);
  if (!r) return <div className="p-8 text-center text-slate-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>;

  /* Authority comes from the server, which is also what the action endpoint
     enforces — deriving it here from role and status alone offered Approve on
     your own request, and on other teams' requests, only to be refused. */
  const canAct = !!r.permission?.can_approve;
  const canPay = !!r.permission?.can_pay;
  const blockedReason: string | null = r.permission?.reason ?? null;

  /* The two approvers are asked different questions because they are answering
     different ones. The manager briefed the employee and owns the call on any
     deviation from policy; P&C endorses the tour itself. Claims are a simpler
     decision and keep the plain remarks box. */
  const needsDetail = canAct && r.type === 'tour_sanction' && ['manager', 'hr'].includes(user.role);
  const isManagerStage = needsDetail && user.role === 'manager';
  const isPnCStage = needsDetail && user.role === 'hr';
  const hasFlags = (r.policy_flags?.length || 0) > 0;
  const advanceAsked = (r.advance_amount || 0) > 0;
  const isFinalApproval = canAct && r.type === 'tour_sanction' && user.role === 'hr';
  /* A decision recorded with no words behind it is not an audit trail, so the
     remarks box is required on approve and reject alike. Marking a settled
     claim as paid is bookkeeping, not a judgement, and stays exempt. */
  const missing = ([
    isManagerStage && !briefing.trim() && 'the briefing you gave',
    isManagerStage && hasFlags && !deviation.trim() && 'the deviation justification',
    isPnCStage && !tourJustification.trim() && 'your justification for the tour',
    needsDetail && !advanceRemarks.trim() && 'your remarks on the advance',
    canAct && !remarks.trim() && 'your remarks on this decision',
  ].filter(Boolean) as string[]);
  /* The panel heading names the judgement being recorded, not the click. */
  const panelTitle = isManagerStage ? 'Manager Justification'
    : isPnCStage ? `${HR_LABEL} Justification`
    : canAct ? `${roleLabel(user.role)} Decision`
    : 'Release Payment';
  const fieldCls = (empty: boolean) =>
    `w-full rounded-xl px-3 py-2 text-sm border-2 transition-all focus:outline-none ${
      empty ? 'border-slate-200 focus:border-indigo-400' : 'border-emerald-200 bg-emerald-50/30 focus:border-emerald-400'}`;

  const act = async (action: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/requests/${id}/action/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: user.employee_id, action, remarks,
        briefing, tour_justification: tourJustification,
        advance_remarks: advanceRemarks, deviation_justification: deviation }) });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        await load(); if (onActioned) onActioned();
        const label = action === 'reject' ? 'Request rejected' : action === 'paid' ? 'Marked as paid 💰' : 'Approved & forwarded ✓';
        setToast({ t: label, ok: action !== 'reject' });
        if (action !== 'reject') { setParty(true); setTimeout(() => setParty(false), 1600); }
      } else {
        // A refusal used to do nothing at all — the click just vanished.
        setToast({ t: body.error || 'That action could not be completed.', ok: false });
        await load();
      }
    } catch {
      setToast({ t: 'Could not reach the server. Check your connection and try again.', ok: false });
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <Confetti show={party} />
      {toast && <Toast msg={toast.t} ok={toast.ok} onClose={() => setToast(null)} />}
      <button onClick={onBack} className="flex items-center gap-1 text-slate-500 text-sm font-bold hover:text-indigo-600 transition-colors"><ChevronLeft className="w-4 h-4" />Back</button>
      <StageTrail status={r.status} statusLabel={r.status_label} type={r.type} />
      {r.employee_id === user.employee_id && <TicketChoicePanel r={r} user={user} onChosen={load} />}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex justify-between items-start mb-3">
          <div><h3 className="font-black text-slate-800 text-lg">{r.type_label}</h3><p className="text-slate-400 text-sm">{r.employee_name} · {r.employee_id} · {r.department} · Level {r.level}</p></div>
          <Pill s={r.status} label={r.status_label} />
        </div>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          {r.purpose && <div><p className="text-slate-400 text-xs">Purpose</p><p className="font-semibold">{r.purpose}</p></div>}
          {r.destination_city && (
            <div>
              <p className="text-slate-400 text-xs">Route</p>
              <p className="font-semibold">
                {r.from_city ? `${r.from_city} → ` : ''}{r.destination_city} <span className="text-indigo-500">(Grade {r.city_grade})</span>
              </p>
            </div>
          )}
          {(r.from_date || r.to_date) && <div><p className="text-slate-400 text-xs">Dates</p><p className="font-semibold">{r.from_date} → {r.to_date}{r.number_of_days ? <span className="text-indigo-500"> ({r.number_of_days} day{r.number_of_days === 1 ? '' : 's'})</span> : null}</p></div>}
          {r.sanction_number && <div><p className="text-slate-400 text-xs">Sanction No.</p><p className="font-semibold">{r.sanction_number}</p></div>}
          {r.travel_mode && <div><p className="text-slate-400 text-xs">Mode</p><p className="font-semibold">{r.travel_mode}</p></div>}
          {!r.legs?.length && r.type === 'tour_sanction' && (
            <div>
              <p className="text-slate-400 text-xs">Onward Journey</p>
              <p className="font-semibold">
                {r.travel_mode_date || '—'}{r.travel_mode_time_pref_label ? ` · ${r.travel_mode_time_pref_label}` : ''}
              </p>
              {/* Who is actually raising the ticket — an approver needs this
                  as much as the desk does, and it was only ever shown for the
                  return journey before. */}
              <p className={`text-[11px] font-bold mt-0.5 ${r.booking_mode === 'company' ? 'text-indigo-500' : 'text-slate-400'}`}>
                {r.booking_mode === 'company'
                  ? `Booked by the Travel Help Desk${r.booking_reference ? ` · ${r.booking_reference}` : ''}`
                  : 'Self-booked — employee claims the fare'}
              </p>
            </div>
          )}
          {r.type === 'tour_sanction' && r.trip_type_label && <div><p className="text-slate-400 text-xs">Trip</p><p className="font-semibold">{r.trip_type_label}</p></div>}
          {r.trip_type === 'round_trip' && (r.return_mode_date || r.return_travel_mode) && (
            <div>
              <p className="text-slate-400 text-xs">Return Journey</p>
              <p className="font-semibold">
                {r.return_travel_mode || '—'}
                {r.return_mode_date ? ` · ${r.return_mode_date}` : ''}
                {r.return_mode_time_pref_label ? ` · ${r.return_mode_time_pref_label}` : ''}
              </p>
              <p className={`text-[11px] font-bold mt-0.5 ${r.return_booking_mode === 'company' ? 'text-indigo-500' : 'text-slate-400'}`}>
                {r.return_booking_mode === 'company'
                  ? `Booked by the Travel Help Desk${r.return_booking_reference ? ` · ${r.return_booking_reference}` : ''}`
                  : 'Self-booked — employee claims the fare'}
              </p>
            </div>
          )}
          {r.estimate_amount > 0 && <div><p className="text-slate-400 text-xs">Total Estimate</p><p className="font-black text-slate-800">₹{fmt(r.estimate_amount)}</p></div>}
          {r.advance_amount > 0 && <div><p className="text-slate-400 text-xs">Advance Required</p><p className="font-black text-indigo-600">₹{fmt(r.advance_amount)}</p></div>}
          {r.total_claimed > 0 && <div><p className="text-slate-400 text-xs">Total Claimed</p><p className="font-black text-slate-800">₹{fmt(r.total_claimed)}</p></div>}
        </div>

        {/* Shown only when the company is booking — on a self-booked trip
            nobody needs the employee's Aadhaar spelling on screen. */}
        {r.traveller_name && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid md:grid-cols-3 gap-3 text-sm">
            <div className="md:col-span-3">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Traveller details for ticketing</p>
            </div>
            <div><p className="text-slate-400 text-xs">Name as per Aadhaar</p><p className="font-semibold">{r.traveller_name}</p></div>
            {r.traveller_age && <div><p className="text-slate-400 text-xs">Age</p><p className="font-semibold">{r.traveller_age}</p></div>}
            {r.contact_number && <div><p className="text-slate-400 text-xs">Contact while touring</p><p className="font-semibold">{r.contact_number}</p></div>}
          </div>
        )}

        {/* A claim settling a sanction: show it against what was approved, and
            net the advance, so the approver sees the money still to move. */}
        {r.sanction && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-slate-400 text-xs mb-1.5">Settles sanction #{r.sanction.id} · {r.sanction.destination_city}</p>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
              <span className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600">Sanctioned ₹{fmt(r.sanction.estimate_amount)}</span>
              <span className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600">Claimed ₹{fmt(r.total_claimed)}</span>
              {r.advance_adjusted > 0 && <span className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-amber-700">Advance ₹{fmt(r.advance_adjusted)}</span>}
              <span className={`rounded-lg px-2 py-1 border ${r.net_settlement >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                {r.net_settlement >= 0 ? 'Payable' : 'Recover'} ₹{fmt(Math.abs(r.net_settlement))}
              </span>
              {r.total_claimed > r.sanction.estimate_amount && (
                <span className="bg-rose-50 border border-rose-200 rounded-lg px-2 py-1 text-rose-700">
                  Over sanction by ₹{fmt(r.total_claimed - r.sanction.estimate_amount)}
                </span>
              )}
            </div>
          </div>
        )}

        {r.legs?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-slate-400 text-xs mb-1.5">Itinerary · {r.legs.length} stop{r.legs.length === 1 ? '' : 's'}</p>
            <div className="space-y-1.5">
              {r.legs.map((l: any) => (
                <div key={l.seq} className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-black text-slate-700">{l.seq + 1}. {l.from_city ? `${l.from_city} → ` : ''}{l.destination_city}</span>
                    <span className="text-indigo-500 font-semibold">grade {l.city_grade}</span>
                    <span className="text-slate-500">{l.from_date} → {l.to_date} ({l.days}d)</span>
                    {l.travel_mode && <span className="text-slate-500">· by {l.travel_mode}</span>}
                    {l.ticket_date && <span className="text-slate-400">· ticket {l.ticket_date}{l.ticket_time_pref_label ? ` ${l.ticket_time_pref_label}` : ''}</span>}
                  </div>
                  <p className={`mt-0.5 font-bold ${l.booking_mode === 'company' ? 'text-indigo-500' : 'text-slate-400'}`}>
                    {l.booking_mode === 'company'
                      ? `Booked by the Travel Help Desk${l.booking_reference ? ` · ${l.booking_reference}` : ''}`
                      : 'Self-booked — employee claims the fare'}
                  </p>
                  {l.travel_address && <p className="text-slate-500 mt-0.5">{l.travel_address}</p>}
                  {l.purpose && <p className="text-slate-400 mt-0.5">{l.purpose}</p>}
                  {l.mode_exception_reason && <p className="text-amber-700 mt-0.5"><b>Mode exception:</b> {l.mode_exception_reason}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {r.estimate_amount > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-slate-400 text-xs mb-1.5">Estimate breakdown</p>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {[['Travel', r.est_ticket_amount], ['Lodging', r.est_lodging_amount], ['Food / DA', r.est_food_amount],
                ['Conveyance', r.est_local_amount], ['Misc', r.est_misc_amount]].map(([l, v]: any) => v > 0 && (
                <span key={l} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-600">{l} ₹{fmt(v)}</span>
              ))}
            </div>
          </div>
        )}

        {r.mode_exception_reason && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <p className="text-[11px] font-black text-amber-700 uppercase tracking-wide">Reason for travel-mode exception</p>
            <p className="text-xs text-amber-900 mt-0.5">{r.mode_exception_reason}</p>
          </div>
        )}

        {r.policy_flags?.length > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 space-y-1">
            <p className="text-[11px] font-black text-amber-700 uppercase tracking-wide">Policy flags</p>
            {r.policy_flags.map((f: string, i: number) => (
              <p key={i} className="text-xs text-amber-800 font-semibold flex items-start gap-2"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{f}</p>
            ))}
          </div>
        )}
      </div>

      {/* What policy allows, what was sanctioned, what is being claimed — the
          same breakdown the employee saw while filing, so every approver in the
          chain judges the claim against the same figures. */}
      {r.settlement && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h4 className="font-black text-slate-700 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-indigo-500" />Policy · Sanctioned · Claimed
          </h4>
          <PolicyBreakdown settlement={r.settlement} />
        </div>
      )}

      {r.expense_items?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-x-auto">
          <h4 className="font-black text-slate-700 mb-3">Bills</h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b-2 border-slate-200">
                <th className="text-left py-1.5">Head</th>
                <th className="text-left">Particulars</th>
                <th className="text-right">Claimed</th>
                <th className="text-right">Limit</th>
                <th className="text-center">Bill</th>
              </tr>
            </thead>
            <tbody>
              {r.expense_items.map((it: any) => (
                <tr key={it.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 font-bold text-slate-700 whitespace-nowrap">
                    {it.category_label}
                    {it.leg_city && <span className="block text-[10px] font-semibold text-indigo-500">{it.leg_city}</span>}
                  </td>

                  {/* Everything the head recorded, so a query can be settled
                      from this row rather than by ringing the employee. */}
                  <td className="py-2">
                    {it.vendor && <p className="font-bold text-slate-700">{it.vendor}</p>}
                    {it.check_in && it.check_out ? (
                      <p className="text-slate-500">
                        In {it.check_in} → Out {it.check_out}
                        {it.nights ? <span className="text-slate-400"> · {it.nights} night{it.nights === 1 ? '' : 's'}</span> : null}
                        {it.per_night ? <span className="text-slate-400"> · ₹{fmt(it.per_night)}/night</span> : null}
                      </p>
                    ) : (
                      <p className="text-slate-500">
                        {it.date}{it.to_date && it.to_date !== it.date ? ` → ${it.to_date}` : ''}
                        {it.days_covered > 1 ? <span className="text-slate-400"> · {it.days_covered} days</span> : null}
                      </p>
                    )}
                    {(it.from_location || it.to_location) && (
                      <p className="text-slate-500">{it.from_location} → {it.to_location}
                        {it.mode && <span className="text-slate-400"> · {it.mode}</span>}
                        {it.km > 0 && <span className="text-slate-400"> · {it.km} km</span>}
                      </p>
                    )}
                    {it.reference_no && <p className="text-slate-400">Ref: {it.reference_no}</p>}
                    {it.description && <p className="text-slate-500">{it.description}</p>}
                    {it.policy_flag && <p className="text-amber-700 font-semibold mt-0.5">{it.policy_flag}</p>}
                  </td>

                  <td className="py-2 text-right font-black text-slate-800 whitespace-nowrap">₹{fmt(it.claimed_amount)}</td>
                  <td className="py-2 text-right text-slate-500 whitespace-nowrap">
                    {it.policy_cap != null ? `₹${fmt(it.policy_cap)}` : '—'}
                    {/* the working, so the ceiling is never an unexplained total */}
                    {it.cap_explained && <span className="block text-[10px] text-slate-400">{it.cap_explained.replace('Rs ', '₹')}</span>}
                  </td>
                  <td className="py-2 text-center">
                    {it.has_bill
                      ? <a href={`${(import.meta.env.VITE_API_BASE_URL || '')}${it.bill_url}`} target="_blank" rel="noreferrer" className="text-emerald-600 font-bold">View</a>
                      : <span className="text-rose-400 font-bold">None</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {r.local_items?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-x-auto">
          <h4 className="font-black text-slate-700 mb-3">Local Journeys</h4>
          <table className="w-full text-xs"><thead><tr className="text-slate-400 border-b-2"><th className="text-left py-1">Date</th><th className="text-left">Purpose</th><th className="text-left">From→To</th><th className="text-left">Mode</th><th className="text-right">Amount</th><th className="text-left">Policy</th></tr></thead>
            <tbody>{r.local_items.map((it: any) => (<tr key={it.id} className="border-b border-slate-100"><td className="py-1.5">{it.date}</td><td>{it.purpose}</td><td>{it.from_location}→{it.to_location}</td><td>{it.mode}</td><td className="text-right font-bold">₹{fmt(it.amount)}</td><td className="text-amber-600 text-[11px]">{it.policy_flag}</td></tr>))}</tbody></table>
        </div>
      )}

      {/* Approval trail */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h4 className="font-black text-slate-700 mb-3">Approval Trail</h4>
        <div className="space-y-2">
          {(r.logs || []).map((l: any, i: number) => (
            <div key={i} className="border-b border-slate-100 last:border-0 pb-2 last:pb-0">
              <div className="flex items-center gap-3 text-sm flex-wrap">
                {l.action.includes('reject') ? <XCircle className="w-4 h-4 text-rose-500 shrink-0" /> : <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                <span className="font-bold">{roleLabel(l.stage)}</span><span className="text-slate-500 capitalize">{l.action}</span>
                <span className="text-slate-400">by {l.by_name}</span><span className="text-slate-300 ml-auto text-xs">{l.timestamp}</span>
              </div>
              {l.remarks && <p className="text-slate-500 italic text-xs mt-1 ml-7">"{l.remarks}"</p>}
              {/* What the approver actually recorded, not just that they clicked. */}
              {(l.briefing || l.tour_justification || l.advance_remarks || l.deviation_justification) && (
                <div className="ml-7 mt-1.5 space-y-1.5">
                  {l.briefing && (
                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Briefed the employee</p>
                      <p className="text-xs text-slate-600 mt-0.5">{l.briefing}</p>
                    </div>
                  )}
                  {l.tour_justification && (
                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Justification for the tour</p>
                      <p className="text-xs text-slate-600 mt-0.5">{l.tour_justification}</p>
                    </div>
                  )}
                  {l.advance_remarks && (
                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">On the advance</p>
                      <p className="text-xs text-slate-600 mt-0.5">{l.advance_remarks}</p>
                    </div>
                  )}
                  {l.deviation_justification && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Policy deviation justified</p>
                      <p className="text-xs text-amber-900 mt-0.5">{l.deviation_justification}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {(!r.logs || r.logs.length === 0) && <p className="text-slate-300 text-sm">No actions yet.</p>}
        </div>
      </div>

      {/* Say why there is nothing to do here. An approver landing on a request
          with no controls and no explanation assumes the screen is broken. */}
      {!canAct && !canPay && blockedReason && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 font-semibold">{blockedReason}</p>
        </div>
      )}

      {(canAct || canPay) && (
        <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm p-5">
          <h4 className="font-black text-slate-700 mb-1">{panelTitle}</h4>
          {needsDetail && (
            <p className="text-xs text-slate-400 mb-3">
              Approving a tour programme is a judgement, so it is recorded in your own words
              and kept with the request. Rejecting needs a reason.
            </p>
          )}

          {needsDetail && (
            <div className="space-y-3 mb-3">
              {/* The manager is the one who actually briefed the employee, so
                  only the manager is asked what was said. */}
              {isManagerStage && (
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">
                    What did you brief the employee on? <span className="text-rose-500">*</span>
                  </label>
                  <textarea value={briefing} onChange={e => setBriefing(e.target.value)} rows={2}
                    placeholder="Purpose of the programme, what it should achieve, and what you expect back"
                    className={fieldCls(!briefing.trim())} />
                  <p className="text-[11px] text-slate-400 mt-1">The benefit or use of this trip, as you explained it.</p>
                </div>
              )}

              {/* P&C is endorsing the tour itself, not the briefing — one
                  question, answered in their own words. */}
              {isPnCStage && (
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">
                    Justification for this tour <span className="text-rose-500">*</span>
                  </label>
                  <textarea value={tourJustification} onChange={e => setTourJustification(e.target.value)} rows={2}
                    placeholder="Why this tour is justified for the company"
                    className={fieldCls(!tourJustification.trim())} />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {hasFlags
                      ? 'This request departs from policy — please cover that here as well.'
                      : 'Your endorsement of the business case, recorded with the sanction.'}
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">
                  Remarks on the advance{advanceAsked ? ` (${'\u20b9'}${fmt(r.advance_amount)} requested)` : ''} <span className="text-rose-500">*</span>
                </label>
                <textarea value={advanceRemarks} onChange={e => setAdvanceRemarks(e.target.value)} rows={2}
                  placeholder={advanceAsked ? 'Is the amount appropriate for this trip?' : 'No advance requested — note anything relevant'}
                  className={fieldCls(!advanceRemarks.trim())} />
              </div>

              {/* Only the manager is asked to justify a deviation, and only when
                  the request actually breaks a limit — demanding one on a
                  compliant request trains people to type anything to get past
                  it. P&C still sees what was flagged, read-only. */}
              {hasFlags && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-black text-amber-800 flex items-start gap-1.5 mb-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                    {isManagerStage ? 'This request departs from policy — justify it to approve'
                                    : 'This request departs from policy'}
                  </p>
                  <ul className="text-[11px] text-amber-800 space-y-0.5 list-disc list-inside">
                    {r.policy_flags.map((f: string, i: number) => <li key={i}>{f}</li>)}
                  </ul>
                  {isManagerStage && <>
                    <label className="text-xs font-bold text-amber-800 mb-1 mt-2 block">
                      Justification <span className="text-rose-500">*</span>
                    </label>
                    <textarea value={deviation} onChange={e => setDeviation(e.target.value)} rows={2}
                      placeholder="Why is this acceptable despite the deviation?"
                      className={fieldCls(!deviation.trim())} />
                  </>}
                </div>
              )}
            </div>
          )}

          {canAct && (<>
            <label className="text-xs font-bold text-slate-600 mb-1 block">
              Remarks <span className="text-rose-500">*</span>
            </label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
              placeholder="Your reason for this decision — recorded either way"
              className={fieldCls(!remarks.trim()) + ' mb-3'} rows={2} />
          </>)}
          {!canAct && canPay && (<>
            <label className="text-xs font-bold text-slate-600 mb-1 block">
              Remarks <span className="text-slate-300">(optional)</span>
            </label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
              placeholder="Payment reference, mode, anything worth recording"
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm mb-3" rows={2} />
          </>)}

          {canAct && missing.length > 0 && (
            <p className="text-[11px] text-slate-400 mb-2">
              To approve, still needed: {missing.join(', ')}.
            </p>
          )}

          <div className="flex gap-2 flex-wrap">
            {canAct && <>
              <button onClick={() => act('approve')} disabled={busy || missing.length > 0}
                title={missing.length > 0 ? `Still needed: ${missing.join(', ')}` : undefined}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 text-white font-bold px-6 py-2.5 rounded-xl disabled:opacity-50 disabled:hover:scale-100 transition-all"><CheckCircle className="w-4 h-4" />Approve{isFinalApproval ? ' (final)' : ''}</button>
              <button onClick={() => act('reject')} disabled={busy || !remarks.trim()}
                title={!remarks.trim() ? 'Add your remarks — a rejection needs a reason' : undefined}
                className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 hover:shadow-lg hover:shadow-rose-500/30 hover:scale-105 active:scale-95 text-white font-bold px-6 py-2.5 rounded-xl disabled:opacity-50 transition-all"><XCircle className="w-4 h-4" />Reject</button>
            </>}
            {canPay && <button onClick={() => act('paid')} disabled={busy} className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-700 hover:shadow-lg hover:scale-105 active:scale-95 text-white font-bold px-6 py-2.5 rounded-xl disabled:opacity-50 transition-all"><Wallet className="w-4 h-4" />Mark as Paid</button>}
          </div>
          {isFinalApproval && (
            <p className="text-[11px] text-slate-400 mt-2">
              This is the last approval — Finance will be notified for their records, not for sign-off.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Request list card ─────────────────────────────────────────────────────────
export function ReqCard({ r, onClick }: { r: any; onClick: () => void }) {
  const Icon = r.type === 'tour_sanction' ? FileText : r.type === 'travel_expense' ? Receipt : Car;
  const grad = r.type === 'tour_sanction' ? 'from-sky-400 to-blue-500' : r.type === 'travel_expense' ? 'from-violet-400 to-indigo-500' : 'from-emerald-400 to-teal-500';
  const pending = ['submitted', 'manager_approved', 'hr_approved', 'finance_approved'].includes(r.status);
  return (
    <button onClick={onClick} className="hover-lift w-full text-left bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-4 flex items-center gap-3 group">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform`}><Icon className="w-5 h-5" /></div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-800 text-sm truncate">{r.type_label} {r.destination_city && `· ${r.destination_city}`}</p>
        <p className="text-slate-400 text-xs">{r.employee_name} · {r.created_at} {r.total_claimed > 0 && `· ₹${fmt(r.total_claimed)}`}</p>
      </div>
      {pending && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-ring shrink-0" />}
      <Pill s={r.status} label={r.status_label} />
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0" />
    </button>
  );
}

// ── Approver dashboard ────────────────────────────────────────────────────────
