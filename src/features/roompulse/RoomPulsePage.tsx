import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, MapPin, X, Plus, Send, Loader, AlertTriangle, CheckCircle2,
  Calendar as CalendarIcon, LogOut, ShieldCheck, LayoutGrid, ListChecks,
  ClipboardList, Headphones, Paperclip, RotateCcw,
} from 'lucide-react';
import {
  API, _API_BASE, RP_STYLES, type Session, loadSession, saveSession, clearSession,
  ROLE_LABEL, Reveal, Panel, Skel, Empty, StatusPill, PURPOSE_LABEL, PURPOSE_COLOUR,
  CATEGORY_LABEL, CATEGORY_COLOUR, URGENCY_LABEL, REQUEST_STATUS_BADGE, fmtDate, isoLocal, rpFetch} from './RoomPulseShared';
import { RoomPulseLogin } from './RoomPulseLogin';
import { ApprovalsPanel, CalendarPanel, SuperAdminPanel } from './RoomPulseAdminPanels';
import {
  type SupportTicket, type Priority, type TicketEvent,
  TICKET_CATEGORY_LABEL, TICKET_RELATED_TO_OPTIONS, TICKET_PRIORITY_META,
  ticketPriorityMeta, fmtTicketWhen,
} from './RoomPulseTickets';

type Tab = 'rooms' | 'mine' | 'approvals' | 'calendar' | 'manage';

/* ── room card: the live-status tile that drives the whole dashboard ────── */
const ROOM_GLOW: Record<string, string> = {
  occupied: 'rgba(244,63,94,.30)', upcoming: 'rgba(245,158,11,.28)', free: 'rgba(16,185,129,.22)',
};
function RoomCard({ room, delay, onBook }: { room: any; delay: number; onBook: () => void }) {
  const ring = room.status === 'occupied' ? 'hover:border-rose-300'
             : room.status === 'upcoming' ? 'hover:border-amber-300' : 'hover:border-emerald-300';
  return (
    <Reveal delay={delay}>
      <div className={`rp-tilt group relative rounded-2xl bg-white border border-slate-200 p-5
                       shadow-sm overflow-hidden ${ring}`}
        style={{ '--rp-glow': ROOM_GLOW[room.status] || ROOM_GLOW.free,
                 boxShadow: room.status !== 'free' ? `0 0 0 1px transparent` : undefined } as any}>
        {/* animated top accent bar in the room's own colour */}
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl" style={{ background: room.color }} />
        {/* faint radial glow that intensifies on hover, colour-matched to status */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full
                        opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
          style={{ background: ROOM_GLOW[room.status] || ROOM_GLOW.free }} />

        <div className="relative flex items-start justify-between mb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
              {room.floor}
            </p>
            <h3 className="text-base font-black text-slate-900 truncate">
              {room.label && <span className="text-slate-400">{room.label} </span>}{room.name}
            </h3>
          </div>
          <div className={room.status === 'occupied' ? 'rp-glow-ring rounded-full' : ''}>
            <StatusPill status={room.status} />
          </div>
        </div>

        <div className="relative flex items-center gap-3 text-[11px] text-slate-400 mb-4">
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{room.capacity} seats</span>
          {room.amenities?.length > 0 && (
            <span className="truncate">· {room.amenities.slice(0, 2).join(', ')}</span>
          )}
        </div>

        {room.status === 'occupied' && room.current_booking && (
          <div className="relative rounded-xl bg-rose-50 border border-rose-200 p-3 mb-3 overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-0.5 bg-rose-400" />
            <p className="text-[11px] font-black text-rose-600">
              Until {room.until} · {room.current_booking.requested_by_name}
            </p>
            <p className="text-[10px] text-rose-400 mt-0.5">
              {PURPOSE_LABEL[room.current_booking.purpose]}
            </p>
          </div>
        )}
        {room.status === 'upcoming' && room.next_booking && (
          <div className="relative rounded-xl bg-amber-50 border border-amber-200 p-3 mb-3 overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-0.5 bg-amber-400" />
            <p className="text-[11px] font-black text-amber-600">
              Starts in {room.starts_in_min}m · {room.next_booking.requested_by_name}
            </p>
            <p className="text-[10px] text-amber-500 mt-0.5">
              {room.next_booking.start_time}–{room.next_booking.end_time}
            </p>
          </div>
        )}
        {room.status === 'free' && room.next_booking && (
          <p className="relative text-[11px] text-slate-400 mb-3">
            Next: {room.next_booking.start_time} · {room.next_booking.requested_by_name}
          </p>
        )}
        {room.status === 'free' && !room.next_booking && (
          <p className="relative text-[11px] text-emerald-600/70 mb-3 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-emerald-400 rp-pulse-glow" />
            Nothing booked today
          </p>
        )}

        <button onClick={onBook}
          className="rp-sheen relative w-full flex items-center justify-center gap-1.5 px-3 py-2.5
                     rounded-xl bg-slate-50 border border-slate-200 text-[12px] font-black text-slate-600
                     transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-cyan-500
                     group-hover:to-violet-600 group-hover:text-white group-hover:border-transparent
                     group-hover:shadow-lg group-hover:shadow-cyan-500/25">
          <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90 duration-300" />
          Book this room
        </button>
      </div>
    </Reveal>
  );
}

/* ── booking modal ───────────────────────────────────────────────────────── */
function BookingModal({ room, rooms, session, onClose, onDone }: {
  room: any; rooms: any[]; session: Session; onClose: () => void; onDone: () => void;
}) {
  const [roomId, setRoomId] = useState(room?.id || rooms[0]?.id);
  const [date, setDate] = useState(isoLocal(new Date()));
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('11:00');
  const [purpose, setPurpose] = useState('internal_meeting');
  const [detail, setDetail] = useState('');
  const [attendees, setAttendees] = useState(2);
  const [department, setDepartment] = useState('');
  const [name, setName] = useState(session.name || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [conflict, setConflict] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  const isStaff = session.role === 'admin' || session.role === 'super_admin';
  const inputCls = "w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm " +
    "focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(''); setConflict(null);
    try {
      const res = await rpFetch(`${API}/bookings/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.email, requested_by_name: name, room_id: roomId, date,
          start_time: start, end_time: end, purpose, purpose_detail: detail,
          attendees, department,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (d.conflict) setConflict(d.conflict);
        throw new Error(d.error || 'Booking failed');
      }
      setResult(d);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Booking failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="rp-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="rp-pop w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl
                      max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-cyan-600" />
            {result ? 'Booking submitted' : 'Book a room'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {result ? (
          <div className="p-6 text-center">
            <div className={`rp-pop-in w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center
              ${result.status === 'approved' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <CheckCircle2 className={`w-8 h-8 ${result.status === 'approved' ? 'text-emerald-500' : 'text-amber-500'}`} />
            </div>
            <p className="text-slate-900 font-black text-lg mb-1">{result.message}</p>
            <StatusPillWrap status={result.status} />
            <button onClick={onDone}
              className="mt-6 w-full px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600
                         text-white font-black shadow-lg shadow-cyan-500/25 hover:-translate-y-0.5 transition-all">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-cyan-700/70 mb-1.5">Room</label>
              <select value={roomId} onChange={e => setRoomId(Number(e.target.value))} className={inputCls}>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.label} {r.name} · {r.capacity} seats</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-cyan-700/70 mb-1.5">Date</label>
                <input type="date" value={date} min={isoLocal(new Date())}
                  onChange={e => setDate(e.target.value)} className={`${inputCls} px-2.5 text-xs`} />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-cyan-700/70 mb-1.5">Start</label>
                <input type="time" value={start} onChange={e => setStart(e.target.value)}
                  className={`${inputCls} px-2.5 text-xs`} />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-cyan-700/70 mb-1.5">End</label>
                <input type="time" value={end} onChange={e => setEnd(e.target.value)}
                  className={`${inputCls} px-2.5 text-xs`} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-cyan-700/70 mb-1.5">Your name</label>
                <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-cyan-700/70 mb-1.5">Department</label>
                <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Sales" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-cyan-700/70 mb-1.5">Purpose</label>
              <select value={purpose} onChange={e => setPurpose(e.target.value)} className={inputCls}>
                {Object.entries(PURPOSE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-cyan-700/70 mb-1.5">Details (optional)</label>
              <input value={detail} onChange={e => setDetail(e.target.value)} placeholder="What's this meeting about?" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-cyan-700/70 mb-1.5">
                Attendees
              </label>
              <input type="number" min={1} value={attendees} onChange={e => setAttendees(Number(e.target.value))} className={inputCls} />
            </div>

            {err && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-rose-700">{err}</p>
                </div>
                {conflict && (
                  <p className="text-[11px] text-rose-500 mt-2 pl-6">
                    Conflicting: {conflict.start_time}–{conflict.end_time} · {conflict.requested_by_name}
                  </p>
                )}
              </div>
            )}

            <button type="submit" disabled={busy}
              className="rp-sheen w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl
                         bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-black
                         shadow-lg shadow-cyan-500/25 hover:-translate-y-0.5 transition-all
                         disabled:opacity-50 disabled:translate-y-0">
              {busy ? <><Loader className="w-4 h-4 animate-spin" />Submitting…</>
                : <><Send className="w-4 h-4" />{isStaff ? 'Book (instant)' : 'Send request'}</>}
            </button>
            {!isStaff && (
              <p className="text-[11px] text-slate-400 text-center">
                Your request goes to an admin for approval before it's confirmed.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
function StatusPillWrap({ status }: { status: string }) {
  return <div className="flex justify-center"><StatusPill status={status === 'approved' ? 'free' : 'upcoming'} /></div>;
}

/* ── Support Desk popup: "Admin Ticket" (item/resource requests — stationery,
   IT equipment, furniture, pantry, printing...) and "IT Tickets" (technical
   support tickets, formerly their own "Ticket+" tab) share one entry point
   now, since both are just different flavours of "something Admin needs to
   action for you". Each tab keeps its own form/submit logic; the popup only
   owns which tab is showing. ────────────────────────────────────────────── */
const deskInputCls = "w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm " +
  "focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10";
const deskLabelCls = "block text-[10px] font-black uppercase tracking-widest text-cyan-700/70 mb-1.5";

function AdminTicketForm({ session, onDone }: { session: Session; onDone: () => void }) {
  const [category, setCategory] = useState('stationery_office_supplies');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [urgency, setUrgency] = useState('normal');
  const [reason, setReason] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [department, setDepartment] = useState('');
  const [name, setName] = useState(session.name || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<any>(null);

  const isStaff = session.role === 'admin' || session.role === 'super_admin';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) { setErr('What do you need?'); return; }
    setBusy(true); setErr('');
    try {
      const res = await rpFetch(`${API}/resource-requests/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.email, requested_by_name: name, category, item_name: itemName,
          quantity, urgency, reason, needed_by: neededBy || null, department,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Request failed');
      setResult(d);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Request failed');
    } finally { setBusy(false); }
  };

  if (result) {
    return (
      <div className="p-5 text-center py-8">
        <div className={`rp-pop-in w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center
          ${result.status === 'approved' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
          <CheckCircle2 className={`w-8 h-8 ${result.status === 'approved' ? 'text-emerald-500' : 'text-amber-500'}`} />
        </div>
        <p className="text-slate-900 font-black text-lg mb-1">{result.message}</p>
        <button onClick={onDone}
          className="mt-6 w-full px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600
                     text-white font-black shadow-lg shadow-cyan-500/25 hover:-translate-y-0.5 transition-all">
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="p-5 space-y-4">
      <div>
        <label className={deskLabelCls}>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)} className={deskInputCls}>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className={deskLabelCls}>What do you need?</label>
        <input value={itemName} onChange={e => setItemName(e.target.value)}
          placeholder="e.g. A4 paper, wireless mouse, whiteboard markers" className={deskInputCls} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={deskLabelCls}>Quantity</label>
          <input type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))}
            className={`${deskInputCls} px-2.5 text-xs`} />
        </div>
        <div className="col-span-2">
          <label className={deskLabelCls}>Urgency</label>
          <select value={urgency} onChange={e => setUrgency(e.target.value)} className={deskInputCls}>
            {Object.entries(URGENCY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={deskLabelCls}>Your name</label>
          <input value={name} onChange={e => setName(e.target.value)} className={deskInputCls} />
        </div>
        <div>
          <label className={deskLabelCls}>Department</label>
          <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Sales" className={deskInputCls} />
        </div>
      </div>
      <div>
        <label className={deskLabelCls}>Needed by (optional)</label>
        <input type="date" value={neededBy} onChange={e => setNeededBy(e.target.value)} className={deskInputCls} />
      </div>
      <div>
        <label className={deskLabelCls}>Reason / notes (optional)</label>
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why do you need this?" className={deskInputCls} />
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3">
          <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
          <p className="text-[12px] text-rose-700">{err}</p>
        </div>
      )}

      <button type="submit" disabled={busy}
        className="rp-sheen w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl
                   bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-black
                   shadow-lg shadow-cyan-500/25 hover:-translate-y-0.5 transition-all
                   disabled:opacity-50 disabled:translate-y-0">
        {busy ? <><Loader className="w-4 h-4 animate-spin" />Submitting…</>
          : <><Send className="w-4 h-4" />{isStaff ? 'Record (instant)' : 'Send request'}</>}
      </button>
      {!isStaff && (
        <p className="text-[11px] text-slate-400 text-center">
          Your request goes to an admin for approval, then fulfilment.
        </p>
      )}
    </form>
  );
}

/* ── IT ticket form — same fields/format the standalone "Ticket+" page used
   to offer, now living as the popup's second tab and backed by the real
   /tickets/ endpoints (see Apis-Backend/roompulse/views/tickets.py). Raised
   by an Employee it lands Pending for IT Support to triage; raised by IT
   Support/Super Admin it's auto-approved, same convention rooms and item
   requests already use. ────────────────────────────────────────────────── */
function ItTicketForm({ session, onDone }: { session: Session; onDone: () => void }) {
  const TICKET_CATEGORY_OPTIONS = Object.keys(TICKET_CATEGORY_LABEL);
  const blank = { category: TICKET_CATEGORY_OPTIONS[0], priority: 'medium' as Priority, subject: '', description: '', relatedTo: TICKET_RELATED_TO_OPTIONS[0] };
  const [form, setForm] = useState(blank);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<{ status: string; message: string; ticket: SupportTicket } | null>(null);

  const isItStaff = session.role === 'it_support' || session.role === 'super_admin';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) { setErr('Subject and description are required.'); return; }
    setBusy(true); setErr('');
    try {
      // multipart, not JSON — attachments are real files now (see
      // TicketAttachment on the backend), not just filenames.
      const fd = new FormData();
      fd.append('email', session.email);
      fd.append('requested_by_name', session.name);
      fd.append('category', form.category);
      fd.append('priority', form.priority);
      fd.append('subject', form.subject);
      fd.append('description', form.description);
      fd.append('related_to', form.relatedTo);
      files.forEach(f => fd.append('attachments', f));
      const res = await rpFetch(`${API}/tickets/`, { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Ticket submission failed');
      setResult(d);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Ticket submission failed');
    } finally { setBusy(false); }
  };

  if (result) {
    return (
      <div className="p-5 text-center py-8">
        <div className={`rp-pop-in w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center
          ${result.status === 'approved' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
          <CheckCircle2 className={`w-8 h-8 ${result.status === 'approved' ? 'text-emerald-500' : 'text-amber-500'}`} />
        </div>
        <p className="text-slate-900 font-black text-lg mb-1">Ticket #{result.ticket.id} submitted</p>
        <p className="text-[12.5px] text-slate-400">{result.message}</p>
        <button onClick={onDone}
          className="mt-6 w-full px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600
                     text-white font-black shadow-lg shadow-cyan-500/25 hover:-translate-y-0.5 transition-all">
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={deskLabelCls}>Issue Category</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={deskInputCls}>
            {TICKET_CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{TICKET_CATEGORY_LABEL[c]}</option>)}
          </select>
        </div>
        <div>
          <label className={deskLabelCls}>Priority</label>
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))} className={deskInputCls}>
            {Object.entries(TICKET_PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={deskLabelCls}>Subject</label>
        <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
          placeholder="Enter a short and clear subject" className={deskInputCls} />
      </div>
      <div>
        <label className={deskLabelCls}>Description</label>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Describe your issue in detail (what happened, any error messages, etc.)"
          rows={4} className={`${deskInputCls} resize-none`} />
      </div>
      <div>
        <label className={deskLabelCls}>Related to</label>
        <select value={form.relatedTo} onChange={e => setForm(f => ({ ...f, relatedTo: e.target.value }))} className={deskInputCls}>
          {TICKET_RELATED_TO_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className={deskLabelCls}>Attachments <span className="text-slate-400 normal-case font-semibold">(optional)</span></label>
        <label className="flex flex-col items-center justify-center gap-1.5 px-4 py-4 rounded-xl border-2 border-dashed
                          border-slate-200 bg-slate-50/60 hover:bg-cyan-50/40 hover:border-cyan-300
                          cursor-pointer transition-all text-center">
          <Paperclip className="w-4 h-4 text-cyan-500" />
          <p className="text-[11.5px] font-bold text-slate-600">Click to attach files</p>
          <p className="text-[10px] text-slate-400">(Max 5MB per file)</p>
          <input type="file" multiple className="hidden"
            onChange={e => setFiles(f => [...f, ...Array.from(e.target.files || [])])} />
        </label>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {files.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg bg-cyan-50
                                       border border-cyan-200 text-[10.5px] font-bold text-cyan-700">
                {f.name}
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="p-0.5 rounded hover:bg-cyan-200/60 text-cyan-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3">
          <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
          <p className="text-[12px] text-rose-700">{err}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={() => { setForm(blank); setFiles([]); setErr(''); }}
          className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-slate-200 text-slate-500
                     text-[12.5px] font-black hover:bg-slate-50 transition-all flex-shrink-0">
          <RotateCcw className="w-3.5 h-3.5" />Reset
        </button>
        <button type="submit" disabled={busy}
          className="rp-sheen flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                     bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-black
                     shadow-lg shadow-cyan-500/25 hover:-translate-y-0.5 transition-all
                     disabled:opacity-50 disabled:translate-y-0">
          {busy ? <><Loader className="w-4 h-4 animate-spin" />Submitting…</>
            : <><Send className="w-3.5 h-3.5" />{isItStaff ? 'Record (instant)' : 'Submit Ticket'}</>}
        </button>
      </div>
      {!isItStaff && (
        <p className="text-[11px] text-slate-400 text-center">
          Your ticket goes to IT Support for review before work starts.
        </p>
      )}
    </form>
  );
}

/* ── the popup itself: two tabs sharing one header — but each reviewing
   role only raises the OTHER kind here, not its own: an Admin approves item
   requests for everyone else, so raising one for themselves through this
   same popup would be reviewing their own request; same reasoning keeps
   the IT Tickets tab away from IT Support. Employee and Super Admin see
   both, same as always. ─────────────────────────────────────────────────── */
function SupportDeskModal({ session, onClose, onDone }: {
  session: Session; onClose: () => void; onDone: () => void;
}) {
  const canAdminTicket = session.role !== 'admin';
  const canItTicket = session.role !== 'it_support';
  const showTabs = canAdminTicket && canItTicket;
  const [deskTab, setDeskTab] = useState<'admin' | 'it'>(canAdminTicket ? 'admin' : 'it');

  return (
    <div className="rp-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="rp-pop w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl
                      max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className={`flex items-start justify-between gap-3 ${showTabs ? 'mb-4' : ''}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600
                              flex items-center justify-center shadow-md shadow-cyan-500/25 flex-shrink-0">
                <Headphones className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900">Help Desk</h3>
                <p className="text-[11.5px] text-slate-400">
                  {showTabs ? 'Create a support ticket or view your existing tickets.'
                    : deskTab === 'admin' ? 'Request stationery, IT equipment, or anything else Admin provides.'
                    : 'Raise an IT support ticket.'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {showTabs && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100">
              <button type="button" onClick={() => setDeskTab('admin')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px]
                           font-black transition-all ${deskTab === 'admin'
                             ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <ClipboardList className="w-3.5 h-3.5" />Admin Ticket
              </button>
              <button type="button" onClick={() => setDeskTab('it')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px]
                           font-black transition-all ${deskTab === 'it'
                             ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Headphones className="w-3.5 h-3.5" />IT Tickets
              </button>
            </div>
          )}
        </div>

        {deskTab === 'admin'
          ? <AdminTicketForm session={session} onDone={onDone} />
          : <ItTicketForm session={session} onDone={onDone} />}
      </div>
    </div>
  );
}

/* ── my requests: room bookings + item requests + IT tickets, merged into
   one timeline ───────────────────────────────────────────────────────── */
function MyRequestsPanel({ session, refreshKey }: { session: Session; refreshKey: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // All three request types are backend-backed now — one Promise.all, one
    // catch, so a failed fetch never leaves the list half-populated.
    let bookingRows: any[] = [];
    let resourceRows: any[] = [];
    let ticketRows: any[] = [];
    try {
      const email = encodeURIComponent(session.email);
      const [br, rr, tr] = await Promise.all([
        rpFetch(`${API}/bookings/?mine=${email}`).then(r => r.json()),
        rpFetch(`${API}/resource-requests/?mine=${email}`).then(r => r.json()),
        rpFetch(`${API}/tickets/?mine=${email}`).then(r => r.json()),
      ]);
      // `kind` distinguishes each row for rendering; bookings don't carry
      // `kind` from the API (unlike resource requests/tickets) so it's
      // tagged on here.
      bookingRows = (br.results || []).map((b: any) => ({ ...b, kind: 'room', sortKey: b.created_at }));
      resourceRows = (rr.results || []).map((r: any) => ({ ...r, sortKey: r.created_at }));
      ticketRows = (tr.results || []).map((t: SupportTicket) => ({ ...t, sortKey: t.created_at }));
    } catch {
      // Backend unreachable right now — show an empty list rather than a
      // half-merged one; the Retry is just switching tabs back to this one.
    } finally {
      const merged = [...bookingRows, ...resourceRows, ...ticketRows]
        .sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));
      setRows(merged);
      setLoading(false);
    }
  }, [session.email]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const cancel = async (row: any) => {
    const label = row.kind === 'room' ? 'this booking' : row.kind === 'ticket' ? 'this ticket' : 'this request';
    if (!confirm(`Cancel ${label}?`)) return;
    const url = row.kind === 'room' ? `${API}/bookings/${row.id}/`
              : row.kind === 'ticket' ? `${API}/tickets/${row.id}/`
              : `${API}/resource-requests/${row.id}/`;
    await rpFetch(url, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', email: session.email }),
    });
    load();
  };

  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-16" />)}</div>;
  if (!rows.length) return <Empty msg="No requests yet — book a room, request an item, or raise a ticket above" icon={ClipboardList} />;

  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => {
        const isRoom = row.kind === 'room';
        const isTicket = row.kind === 'ticket';
        const accent = isRoom ? PURPOSE_COLOUR[row.purpose] : isTicket ? '#f59e0b' : CATEGORY_COLOUR[row.category];
        // Tickets share the same pending/approved/rejected badge set as
        // every other request type here, plus in_progress/closed of their
        // own — see REQUEST_STATUS_BADGE in RoomPulseShared.tsx. Only
        // cancellable while still pending (once IT Support triages it,
        // only they drive it forward — same rule the backend enforces).
        const cancellable = isTicket ? row.status === 'pending' : (row.status === 'pending' || row.status === 'approved');
        return (
          <Reveal key={`${row.kind}-${row.id}`} delay={i * 40}>
            <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 p-3.5">
              <div className="w-2 h-full min-h-[40px] rounded-full flex-shrink-0" style={{ background: accent }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-500">
                    {isRoom ? 'Room' : isTicket ? 'IT Ticket' : row.category_label}
                  </span>
                  <p className="text-[13px] font-bold text-slate-800 truncate">
                    {isRoom ? row.room_name : isTicket ? row.subject : `${row.item_name} × ${row.quantity}`}
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1 ${REQUEST_STATUS_BADGE[row.status]}`}>
                    {isTicket ? row.status_label : row.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isRoom
                    ? <>{fmtDate(row.date)} · {row.start_time}–{row.end_time} · {PURPOSE_LABEL[row.purpose]}</>
                    : isTicket
                    ? <>{ticketPriorityMeta(row.priority).label} priority · {row.related_to} · {fmtTicketWhen(row.created_at)}</>
                    : <>{URGENCY_LABEL[row.urgency]} urgency{row.needed_by ? ` · needed by ${fmtDate(row.needed_by)}` : ''}</>}
                </p>
                {row.admin_remarks && (
                  <p className="text-[11px] text-slate-400 mt-0.5">Note: {row.admin_remarks}</p>
                )}
                {/* What actually happened to this ticket, in order. The row
                    itself only carries the most recent review, so before this
                    existed, a closed ticket no longer showed who had approved
                    it — the thing you most want when the ticket is the
                    record. */}
                {isTicket && row.history?.length > 1 && (
                  <TicketTrail history={row.history} />
                )}
              </div>
              {cancellable && (
                <button onClick={() => cancel(row)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-rose-400
                             hover:text-rose-600 hover:bg-rose-50 transition-all flex-shrink-0">
                  Cancel
                </button>
              )}
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

/* A ticket's history, read left to right. Deliberately plain text rather
   than a timeline graphic: it is evidence, and it should be as easy to read
   out loud on a call as it is to glance at. */
function TicketTrail({ history }: { history: TicketEvent[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {history.map((h, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-[10.5px] text-slate-400">
          {i > 0 && <span className="text-slate-300">→</span>}
          <span className="font-bold text-slate-500">{h.label}</span>
          {h.actor_email && <span>by {h.actor_email.split('@')[0]}</span>}
          <span className="text-slate-300">{fmtTicketWhen(h.at)}</span>
        </span>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
export function RoomPulsePage(_props: { onNavigateBack?: () => void } = {}) {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [tab, setTab] = useState<Tab>('rooms');
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookRoom, setBookRoom] = useState<any>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [showSupportDesk, setShowSupportDesk] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const r = await rpFetch(`${API}/rooms/`);
      const d = await r.json();
      setRooms(d.results || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!session) return;
    loadRooms();
    const iv = setInterval(loadRooms, 30000); // live grid — refresh every 30s
    return () => clearInterval(iv);
  }, [session, loadRooms]);

  // Every hook must run unconditionally, on every render, in the same order —
  // this useMemo used to sit AFTER the `if (!session) return <Login/>` early
  // return below. That meant the logged-out render called one fewer hook
  // than the logged-in render, which is a Rules-of-Hooks violation: React
  // detects the mismatched hook count on the very next render (i.e. the
  // instant login/logout flips `session`), throws, and — with no error
  // boundary — silently unmounts the whole tree. That is exactly the "blank
  // screen after login/logout, fixed only by a full reload" symptom. Hooks
  // must never move relative to a conditional return; only their computed
  // VALUE may depend on session-dependent state like `rooms`.
  const stats = useMemo(() => {
    const occ = rooms.filter(r => r.status === 'occupied').length;
    const free = rooms.filter(r => r.status === 'free').length;
    return { total: rooms.length, occ, free };
  }, [rooms]);

  if (!session) {
    return (
      <RoomPulseLogin
        onSuccess={s => { const full = { ...s, role: s.role as any }; saveSession(full); setSession({ ...full, ts: Date.now() }); }}
      />
    );
  }

  const isStaff = session.role === 'admin' || session.role === 'super_admin';
  const canApprove = session.role === 'admin' || session.role === 'it_support' || session.role === 'super_admin';
  const isSuper = session.role === 'super_admin';

  const TABS: { id: Tab; label: string; icon: any; roles?: string[] }[] = [
    { id: 'rooms', label: 'Rooms', icon: LayoutGrid },
    { id: 'mine', label: 'My Requests', icon: ClipboardList },
    { id: 'approvals', label: 'Approvals', icon: ListChecks, roles: ['admin', 'it_support', 'super_admin'] },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon, roles: ['admin', 'super_admin'] },
    { id: 'manage', label: 'Manage', icon: ShieldCheck, roles: ['super_admin'] },
  ];
  const visibleTabs = TABS.filter(t => !t.roles || t.roles.includes(session.role));

  const onBookingDone = () => { setShowBooking(false); setBookRoom(null); setRefreshKey(k => k + 1); loadRooms(); };
  const onSupportDeskDone = () => { setShowSupportDesk(false); setRefreshKey(k => k + 1); };

  return (
    <div className="min-h-full bg-[#f5f7fa] relative">
      <style>{RP_STYLES}</style>
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="rp-mesh absolute inset-0">
          <div className="rp-blob absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-cyan-300/15 blur-[130px]" />
          <div className="rp-blob absolute top-1/2 -right-32 w-[32rem] h-[32rem] rounded-full bg-violet-300/15 blur-[130px]" style={{ animationDelay: '5s' }} />
          <div className="rp-blob absolute bottom-0 left-1/3 w-[26rem] h-[26rem] rounded-full bg-emerald-300/10 blur-[130px]" style={{ animationDelay: '2.5s' }} />
        </div>
      </div>

      {/* header */}
      <div className="relative z-20 bg-white/85 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-[1500px] mx-auto px-6 py-3 flex items-center gap-4">
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4 pr-4 border-r border-slate-200">
              <div className="text-center">
                <p key={stats.free} className="rp-pop-in text-sm font-black text-emerald-600 tabular-nums">{stats.free}</p>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Free</p>
              </div>
              <div className="text-center">
                <p key={stats.occ} className="rp-pop-in text-sm font-black text-rose-600 tabular-nums">{stats.occ}</p>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Occupied</p>
              </div>
            </div>
            <button onClick={() => { setBookRoom(null); setShowBooking(true); }}
              className="rp-sheen flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-500
                         to-violet-600 text-white text-[12px] font-black shadow-lg shadow-cyan-500/20
                         hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/30 transition-all">
              <Plus className="w-3.5 h-3.5" />Book Room
            </button>
            <button onClick={() => setShowSupportDesk(true)}
              className="rp-sheen flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200
                         text-slate-600 text-[12px] font-black hover:border-cyan-300 hover:text-cyan-700
                         hover:-translate-y-0.5 transition-all">
              <Headphones className="w-3.5 h-3.5" />Support Ticket
            </button>
            <div className="flex items-center gap-2 pl-1">
              <div className="hidden sm:block text-right leading-none">
                <p className="text-[11px] font-black text-slate-700">{session.name || session.email.split('@')[0]}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-cyan-600">{ROLE_LABEL[session.role]}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600
                              flex items-center justify-center text-white text-[12px] font-black
                              shadow-md shadow-cyan-500/25 transition-transform duration-300 hover:scale-110 hover:rotate-6">
                {session.email[0].toUpperCase()}
              </div>
              <button onClick={() => { clearSession(); setSession(null); }} title="Sign out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[1500px] mx-auto px-6 flex items-center gap-1 overflow-x-auto">
          {visibleTabs.map(t => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold whitespace-nowrap
                  ${on ? 'text-cyan-700' : 'text-slate-400 hover:text-slate-600'}`}>
                <Icon className="w-4 h-4" />{t.label}
                {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 rp-reveal" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 max-w-[1500px] mx-auto px-6 py-6">
        {tab === 'rooms' && (
          loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-56" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {rooms.map((r, i) => (
                <RoomCard key={r.id} room={r} delay={i * 80}
                  onBook={() => { setBookRoom(r); setShowBooking(true); }} />
              ))}
              {!rooms.length && (
                <div className="col-span-full">
                  <Empty msg="No conference rooms configured yet" icon={MapPin} />
                </div>
              )}
            </div>
          )
        )}

        {tab === 'mine' && (
          <Panel title="My Requests" icon={ClipboardList} subtitle="Room bookings, item requests, and IT tickets you've made, and their status">
            <MyRequestsPanel session={session} refreshKey={refreshKey} />
          </Panel>
        )}

        {tab === 'approvals' && canApprove && (
          <ApprovalsPanel session={session} onChanged={() => { setRefreshKey(k => k + 1); loadRooms(); }} />
        )}
        {tab === 'calendar' && isStaff && <CalendarPanel rooms={rooms} />}
        {tab === 'manage' && isSuper && <SuperAdminPanel session={session} onRoomsChanged={loadRooms} />}
      </div>

      {showBooking && (
        <BookingModal room={bookRoom} rooms={rooms.length ? rooms : []} session={session}
          onClose={() => { setShowBooking(false); setBookRoom(null); }} onDone={onBookingDone} />
      )}
      {showSupportDesk && (
        <SupportDeskModal session={session}
          onClose={() => setShowSupportDesk(false)} onDone={onSupportDeskDone} />
      )}
    </div>
  );
}

export default RoomPulsePage;
