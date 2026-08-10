import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Radar, Users, MapPin, X, Plus, Send, Loader, AlertTriangle, CheckCircle2,
  Calendar as CalendarIcon, LogOut, ShieldCheck, LayoutGrid, ListChecks,
  ClipboardList,
} from 'lucide-react';
import {
  API, _API_BASE, RP_STYLES, type Session, loadSession, saveSession, clearSession,
  ROLE_LABEL, Reveal, Panel, Skel, Empty, StatusPill, PURPOSE_LABEL, PURPOSE_COLOUR,
  fmtDate,
} from './RoomPulseShared';
import { RoomPulseLogin } from './RoomPulseLogin';
import { ApprovalsPanel, CalendarPanel, SuperAdminPanel } from './RoomPulseAdminPanels';

type Tab = 'rooms' | 'mine' | 'approvals' | 'calendar' | 'manage';

/* ── room card: the live-status tile that drives the whole dashboard ────── */
function RoomCard({ room, delay, onBook }: { room: any; delay: number; onBook: () => void }) {
  const ring = room.status === 'occupied' ? 'hover:border-rose-300'
             : room.status === 'upcoming' ? 'hover:border-amber-300' : 'hover:border-emerald-300';
  return (
    <Reveal delay={delay}>
      <div className={`group relative rounded-2xl bg-white border border-slate-200 p-5 shadow-sm
                       transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${ring}`}>
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl" style={{ background: room.color }} />
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
              {room.floor}
            </p>
            <h3 className="text-base font-black text-slate-900 truncate">
              {room.label && <span className="text-slate-400">{room.label} </span>}{room.name}
            </h3>
          </div>
          <StatusPill status={room.status} />
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-4">
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{room.capacity} seats</span>
          {room.amenities?.length > 0 && (
            <span className="truncate">· {room.amenities.slice(0, 2).join(', ')}</span>
          )}
        </div>

        {room.status === 'occupied' && room.current_booking && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 mb-3">
            <p className="text-[11px] font-black text-rose-600">
              Until {room.until} · {room.current_booking.requested_by_name}
            </p>
            <p className="text-[10px] text-rose-400 mt-0.5">
              {PURPOSE_LABEL[room.current_booking.purpose]}
            </p>
          </div>
        )}
        {room.status === 'upcoming' && room.next_booking && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-3">
            <p className="text-[11px] font-black text-amber-600">
              Starts in {room.starts_in_min}m · {room.next_booking.requested_by_name}
            </p>
            <p className="text-[10px] text-amber-500 mt-0.5">
              {room.next_booking.start_time}–{room.next_booking.end_time}
            </p>
          </div>
        )}
        {room.status === 'free' && room.next_booking && (
          <p className="text-[11px] text-slate-400 mb-3">
            Next: {room.next_booking.start_time} · {room.next_booking.requested_by_name}
          </p>
        )}
        {room.status === 'free' && !room.next_booking && (
          <p className="text-[11px] text-emerald-600/70 mb-3">Nothing booked today</p>
        )}

        <button onClick={onBook}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl
                     bg-slate-50 border border-slate-200 text-[12px] font-black text-slate-600
                     transition-all group-hover:bg-gradient-to-r group-hover:from-cyan-500
                     group-hover:to-violet-600 group-hover:text-white group-hover:border-transparent">
          <Plus className="w-3.5 h-3.5" />Book this room
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
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
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
      const res = await fetch(`${API}/bookings/`, {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm rp-reveal">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl
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
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center
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
                <input type="date" value={date} min={new Date().toISOString().slice(0, 10)}
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
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl
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

/* ── my bookings ─────────────────────────────────────────────────────────── */
function MyBookingsPanel({ session, refreshKey }: { session: Session; refreshKey: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/bookings/?mine=${encodeURIComponent(session.email)}`);
      const d = await r.json();
      setRows(d.results || []);
    } finally { setLoading(false); }
  }, [session.email]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const cancel = async (id: number) => {
    if (!confirm('Cancel this booking?')) return;
    await fetch(`${API}/bookings/${id}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', email: session.email }),
    });
    load();
  };

  const STATUS_BADGE: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600 ring-amber-200',
    approved: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
    rejected: 'bg-rose-50 text-rose-600 ring-rose-200',
    cancelled: 'bg-slate-50 text-slate-400 ring-slate-200',
  };

  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-16" />)}</div>;
  if (!rows.length) return <Empty msg="No bookings yet — book a room from the grid above" icon={ClipboardList} />;

  return (
    <div className="space-y-2.5">
      {rows.map((b, i) => (
        <Reveal key={b.id} delay={i * 40}>
          <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 p-3.5">
            <div className="w-2 h-full min-h-[40px] rounded-full flex-shrink-0"
              style={{ background: PURPOSE_COLOUR[b.purpose] }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-bold text-slate-800 truncate">{b.room_name}</p>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1 ${STATUS_BADGE[b.status]}`}>
                  {b.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {fmtDate(b.date)} · {b.start_time}–{b.end_time} · {PURPOSE_LABEL[b.purpose]}
              </p>
              {b.admin_remarks && (
                <p className="text-[11px] text-slate-400 mt-0.5">Note: {b.admin_remarks}</p>
              )}
            </div>
            {(b.status === 'pending' || b.status === 'approved') && (
              <button onClick={() => cancel(b.id)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-rose-400
                           hover:text-rose-600 hover:bg-rose-50 transition-all flex-shrink-0">
                Cancel
              </button>
            )}
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
export function RoomPulsePage({ onNavigateBack }: { onNavigateBack?: () => void }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [tab, setTab] = useState<Tab>('rooms');
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookRoom, setBookRoom] = useState<any>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/rooms/`);
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

  if (!session) {
    return (
      <RoomPulseLogin
        onSuccess={s => { const full = { ...s, role: s.role as any }; saveSession(full); setSession({ ...full, ts: Date.now() }); }}
        onBack={onNavigateBack}
      />
    );
  }

  const isStaff = session.role === 'admin' || session.role === 'super_admin';
  const isSuper = session.role === 'super_admin';

  const TABS: { id: Tab; label: string; icon: any; roles?: string[] }[] = [
    { id: 'rooms', label: 'Rooms', icon: LayoutGrid },
    { id: 'mine', label: 'My Bookings', icon: ClipboardList },
    { id: 'approvals', label: 'Approvals', icon: ListChecks, roles: ['admin', 'super_admin'] },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon, roles: ['admin', 'super_admin'] },
    { id: 'manage', label: 'Manage', icon: ShieldCheck, roles: ['super_admin'] },
  ];
  const visibleTabs = TABS.filter(t => !t.roles || t.roles.includes(session.role));

  const stats = useMemo(() => {
    const occ = rooms.filter(r => r.status === 'occupied').length;
    const free = rooms.filter(r => r.status === 'free').length;
    return { total: rooms.length, occ, free };
  }, [rooms]);

  const onBookingDone = () => { setShowBooking(false); setBookRoom(null); setRefreshKey(k => k + 1); loadRooms(); };

  return (
    <div className="min-h-screen bg-[#f5f7fa] relative">
      <style>{RP_STYLES}</style>
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="rp-blob absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-cyan-300/15 blur-[130px]" />
        <div className="rp-blob absolute top-1/2 -right-32 w-[32rem] h-[32rem] rounded-full bg-violet-300/15 blur-[130px]" style={{ animationDelay: '5s' }} />
      </div>

      {/* header */}
      <div className="relative z-20 bg-white/85 backdrop-blur-xl border-b border-slate-200 sticky top-0">
        <div className="max-w-[1500px] mx-auto px-6 py-3 flex items-center gap-4">
          {onNavigateBack && (
            <button onClick={onNavigateBack}
              className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all">
              ← Back
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600
                            flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Radar className="w-5 h-5 text-white" />
              <span className="rp-pulse-glow absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">RoomPulse</h1>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mt-0.5">
                Conference Room Intelligence
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4 pr-4 border-r border-slate-200">
              <div className="text-center">
                <p className="text-sm font-black text-emerald-600 tabular-nums">{stats.free}</p>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Free</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-rose-600 tabular-nums">{stats.occ}</p>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Occupied</p>
              </div>
            </div>
            <button onClick={() => { setBookRoom(null); setShowBooking(true); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-500
                         to-violet-600 text-white text-[12px] font-black shadow-lg shadow-cyan-500/20
                         hover:-translate-y-0.5 transition-all">
              <Plus className="w-3.5 h-3.5" />Book
            </button>
            <div className="flex items-center gap-2 pl-1">
              <div className="hidden sm:block text-right leading-none">
                <p className="text-[11px] font-black text-slate-700">{session.name || session.email.split('@')[0]}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-cyan-600">{ROLE_LABEL[session.role]}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600
                              flex items-center justify-center text-white text-[12px] font-black
                              shadow-md shadow-cyan-500/25">
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
          <Panel title="My Bookings" icon={ClipboardList} subtitle="Requests you've made, and their status">
            <MyBookingsPanel session={session} refreshKey={refreshKey} />
          </Panel>
        )}

        {tab === 'approvals' && isStaff && (
          <ApprovalsPanel session={session} onChanged={() => { setRefreshKey(k => k + 1); loadRooms(); }} />
        )}
        {tab === 'calendar' && isStaff && <CalendarPanel rooms={rooms} />}
        {tab === 'manage' && isSuper && <SuperAdminPanel session={session} onRoomsChanged={loadRooms} />}
      </div>

      {showBooking && (
        <BookingModal room={bookRoom} rooms={rooms.length ? rooms : []} session={session}
          onClose={() => { setShowBooking(false); setBookRoom(null); }} onDone={onBookingDone} />
      )}
    </div>
  );
}

export default RoomPulsePage;
