/* Approvals, Calendar and Super-Admin management panels for AdminPulse. */
import { useState, useEffect, useCallback } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, Users, Building2, Shield,
  UploadCloud, Download, Trash2, Plus, RefreshCw, TrendingUp, Timer,
  ChevronLeft, ChevronRight, FileSpreadsheet, UserPlus, Percent, BarChart3,
  PackageCheck, Truck,
} from 'lucide-react';
import {
  API, _API_BASE, type Session, Reveal, Panel, Skel, Empty, PURPOSE_LABEL,
  PURPOSE_COLOUR, CATEGORY_LABEL, CATEGORY_COLOUR, URGENCY_LABEL, URGENCY_COLOUR,
  fmtDate,
} from './RoomPulseShared';

const inputCls = "w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm " +
  "focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10";

/* ── Approvals — room bookings + item requests, merged into one queue ────── */
export function ApprovalsPanel({ session, onChanged }: { session: Session; onChanged: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [readyToFulfil, setReadyToFulfil] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [br, rr, approved] = await Promise.all([
        fetch(`${API}/bookings/?status=pending&limit=200`).then(r => r.json()),
        fetch(`${API}/resource-requests/?status=pending&limit=200`).then(r => r.json()),
        fetch(`${API}/resource-requests/?status=approved&limit=200`).then(r => r.json()),
      ]);
      const merged = [
        ...(br.results || []).map((b: any) => ({ ...b, kind: 'room' })),
        ...(rr.results || []),   // already kind: 'resource' from the API
      ].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
      setRows(merged);
      setReadyToFulfil(approved.results || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (row: any, action: 'approve' | 'reject') => {
    const key = `${row.kind}-${row.id}`;
    setBusyId(key); setErr('');
    try {
      const url = row.kind === 'room' ? `${API}/bookings/${row.id}/` : `${API}/resource-requests/${row.id}/`;
      const r = await fetch(url, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, email: session.email, remarks: remarks[key] || '' }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Action failed');
      load(); onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Action failed');
    } finally { setBusyId(null); }
  };

  const fulfil = async (id: number) => {
    setBusyId(`resource-${id}`); setErr('');
    try {
      const r = await fetch(`${API}/resource-requests/${id}/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fulfil', email: session.email }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Action failed');
      load(); onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Action failed');
    } finally { setBusyId(null); }
  };

  return (
    <div className="space-y-5">
      <Panel title="Pending Approvals" icon={Clock} subtitle={`${rows.length} request(s) waiting`}
        right={
          <button onClick={load} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }>
        {err && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 mb-4">
            <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-rose-700">{err}</p>
          </div>
        )}
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-24" />)}</div>
        ) : !rows.length ? (
          <Empty msg="Nothing pending — all caught up" icon={CheckCircle2} />
        ) : (
          <div className="space-y-3">
            {rows.map((row, i) => {
              const isRoom = row.kind === 'room';
              const key = `${row.kind}-${row.id}`;
              const accent = isRoom ? PURPOSE_COLOUR[row.purpose] : CATEGORY_COLOUR[row.category];
              const label = isRoom ? PURPOSE_LABEL[row.purpose] : row.category_label;
              return (
                <Reveal key={key} delay={i * 60}>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-white
                                           text-slate-500 ring-1 ring-slate-200">
                            {isRoom ? 'Room' : 'Item'}
                          </span>
                          <p className="text-[13px] font-black text-slate-800">
                            {isRoom ? row.room_name : `${row.item_name} × ${row.quantity}`}
                          </p>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1"
                            style={{ background: `${accent}14`, color: accent, borderColor: `${accent}40` }}>
                            {label}
                          </span>
                          {!isRoom && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1"
                              style={{ background: `${URGENCY_COLOUR[row.urgency]}14`, color: URGENCY_COLOUR[row.urgency],
                                       borderColor: `${URGENCY_COLOUR[row.urgency]}40` }}>
                              {URGENCY_LABEL[row.urgency]}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {isRoom
                            ? <>{fmtDate(row.date)} · {row.start_time}–{row.end_time} · {row.attendees} attendees</>
                            : <>{row.needed_by ? `Needed by ${fmtDate(row.needed_by)}` : 'No deadline given'}</>}
                        </p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          {row.requested_by_name} ({row.requested_by_email}){row.department && ` · ${row.department}`}
                        </p>
                        {(isRoom ? row.purpose_detail : row.reason) && (
                          <p className="text-[11px] text-slate-400 mt-1 italic">
                            "{isRoom ? row.purpose_detail : row.reason}"
                          </p>
                        )}
                      </div>
                    </div>
                    <input value={remarks[key] || ''} onChange={e => setRemarks(r => ({ ...r, [key]: e.target.value }))}
                      placeholder="Optional remark (shown to the requester)"
                      className={`${inputCls} mb-3 py-2 text-[12px]`} />
                    <div className="flex items-center gap-2">
                      <button onClick={() => act(row, 'approve')} disabled={busyId === key}
                        className="rp-sheen flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                                   bg-emerald-50 text-emerald-700 text-[12px] font-black
                                   hover:bg-emerald-100 hover:-translate-y-0.5 transition-all disabled:opacity-50">
                        {busyId === key ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}Approve
                      </button>
                      <button onClick={() => act(row, 'reject')} disabled={busyId === key}
                        className="rp-sheen flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                                   bg-rose-50 text-rose-700 text-[12px] font-black
                                   hover:bg-rose-100 hover:-translate-y-0.5 transition-all disabled:opacity-50">
                        <XCircle className="w-3.5 h-3.5" />Reject
                      </button>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Approving an item request only means "yes" — it isn't done until
          someone actually hands it over. This section is where that happens. */}
      <Panel title="Ready to Fulfil" icon={Truck}
        subtitle={`${readyToFulfil.length} approved item request(s) awaiting hand-over`}>
        {!readyToFulfil.length ? (
          <Empty msg="Nothing waiting to be handed over" icon={PackageCheck} />
        ) : (
          <div className="space-y-2.5">
            {readyToFulfil.map((r, i) => (
              <Reveal key={r.id} delay={i * 50}>
                <div className="rp-tilt flex items-center gap-3 rounded-xl bg-cyan-50/50 border border-cyan-200 p-3.5">
                  <div className="w-2 h-full min-h-[36px] rounded-full flex-shrink-0"
                    style={{ background: CATEGORY_COLOUR[r.category] }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-slate-800 truncate">
                      {r.item_name} × {r.quantity} <span className="text-slate-400 font-semibold">· {r.category_label}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      For {r.requested_by_name}{r.department && ` · ${r.department}`}
                    </p>
                  </div>
                  <button onClick={() => fulfil(r.id)} disabled={busyId === `resource-${r.id}`}
                    className="rp-sheen flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 text-white
                               text-[12px] font-black hover:bg-cyan-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 flex-shrink-0">
                    <PackageCheck className="w-3.5 h-3.5" />Mark Fulfilled
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ── Calendar (per-room day timeline) ─────────────────────────────────────── */
export function CalendarPanel({ rooms }: { rooms: any[] }) {
  const [roomId, setRoomId] = useState<number | null>(rooms[0]?.id || null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (rooms.length && !roomId) setRoomId(rooms[0].id); }, [rooms, roomId]);

  const load = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/rooms/${roomId}/calendar/?date=${date}`);
      setData(await r.json());
    } finally { setLoading(false); }
  }, [roomId, date]);
  useEffect(() => { load(); }, [load]);

  const shiftDay = (n: number) => {
    const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + n);
    setDate(d.toISOString().slice(0, 10));
  };

  const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i); // 8am–8pm
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const dayStart = 8 * 60, dayEnd = 20 * 60, span = dayEnd - dayStart;

  return (
    <Panel title="Room Calendar" icon={Timer} subtitle="Full day timeline — pending and confirmed">
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select value={roomId || ''} onChange={e => setRoomId(Number(e.target.value))}
          className={`${inputCls} w-auto py-2 text-[12px] font-bold`}>
          {rooms.map(r => <option key={r.id} value={r.id}>{r.label} {r.name}</option>)}
        </select>
        <button onClick={() => shiftDay(-1)} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className={`${inputCls} w-auto py-2 text-[12px] font-bold`} />
        <button onClick={() => shiftDay(1)} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {loading || !data ? <Skel className="h-64" /> : (
        <div className="relative rounded-xl bg-slate-50 border border-slate-200 p-4">
          <div className="relative h-64 ml-10">
            {HOURS.map(h => (
              <div key={h} className="absolute inset-x-0 border-t border-slate-200"
                style={{ top: `${((h * 60 - dayStart) / span) * 100}%` }}>
                <span className="absolute -left-10 -top-2 text-[10px] text-slate-400 tabular-nums">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
            {data.bookings.map((b: any) => {
              const top = Math.max(0, ((toMin(b.start_time) - dayStart) / span) * 100);
              const height = Math.max(2, ((toMin(b.end_time) - toMin(b.start_time)) / span) * 100);
              const colour = b.status === 'pending' ? '#f59e0b' : PURPOSE_COLOUR[b.purpose];
              return (
                <div key={b.id} className="absolute left-1 right-1 rounded-lg px-2.5 py-1.5 rp-reveal overflow-hidden"
                  style={{ top: `${top}%`, height: `${height}%`, background: `${colour}18`,
                           borderLeft: `3px solid ${colour}` }}>
                  <p className="text-[11px] font-black text-slate-800 truncate">{b.requested_by_name}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {b.start_time}–{b.end_time} · {b.status === 'pending' ? 'Pending' : PURPOSE_LABEL[b.purpose]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {data && !data.bookings.length && !loading && (
        <p className="text-center text-slate-400 text-[12px] mt-4">Nothing booked this day</p>
      )}
    </Panel>
  );
}

/* ── Super Admin: Rooms / Team / Analytics ───────────────────────────────── */
const SUB_TABS = [
  { id: 'rooms', label: 'Rooms', icon: Building2 },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
] as const;

export function SuperAdminPanel({ session, onRoomsChanged }: { session: Session; onRoomsChanged: () => void }) {
  const [sub, setSub] = useState<typeof SUB_TABS[number]['id']>('rooms');
  return (
    <div className="space-y-5">
      <Reveal>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 w-fit shadow-sm">
          {SUB_TABS.map(t => {
            const Icon = t.icon; const on = sub === t.id;
            return (
              <button key={t.id} onClick={() => setSub(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-black transition-all duration-300
                  ${on ? 'rp-sheen bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/20 scale-105'
                       : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                <Icon className={`w-4 h-4 transition-transform duration-300 ${on ? 'scale-110' : ''}`} />{t.label}
              </button>
            );
          })}
        </div>
      </Reveal>
      {sub === 'rooms' && <RoomsManage session={session} onChanged={onRoomsChanged} />}
      {sub === 'team' && <TeamManage session={session} />}
      {sub === 'analytics' && <AnalyticsPanel session={session} />}
      <DangerZone session={session} />
    </div>
  );
}

/* ── Danger Zone: full database reset ─────────────────────────────────────
   Always visible at the bottom regardless of which sub-tab is open, so it
   is never more than one scroll away, but visually set apart (red border,
   separate heading) so it can't be mistaken for a normal action. */
function DangerZone({ session }: { session: Session }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [err, setErr] = useState('');

  const reset = async () => {
    if (typed !== 'RESET') return;
    if (!confirm('This permanently deletes ALL bookings, item requests, the employee directory '
                + 'and every admin (except the fixed Super Admin), then restores only the 3 real '
                + 'rooms. This cannot be undone. Continue?')) return;
    setBusy(true); setErr(''); setResult('');
    try {
      const r = await fetch(`${API}/reset/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email, confirm: 'RESET' }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Reset failed');
      setResult(d.message);
      setTyped('');
      // A reset touches rooms/employees/admins/bookings across the whole
      // dashboard — a full reload is the simplest way to guarantee every
      // panel (including this session's own admin-derived UI state) reflects
      // the clean database rather than trying to patch a dozen pieces of
      // local state individually.
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Reset failed');
    } finally { setBusy(false); }
  };

  return (
    <Reveal delay={80}>
      <div className="rounded-2xl bg-rose-50/60 border-2 border-rose-200 p-5">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <h3 className="text-sm font-black text-rose-700 tracking-tight">Danger Zone</h3>
        </div>
        <p className="text-[12px] text-rose-600/80 mb-4 ml-[42px]">
          Permanently deletes all bookings, item requests, the employee directory and every admin
          (the fixed Super Admin is unaffected), then restores only the 3 real APIS rooms. Cannot be undone.
        </p>
        <div className="flex flex-wrap items-center gap-2 ml-[42px]">
          <input value={typed} onChange={e => setTyped(e.target.value)}
            placeholder='Type "RESET" to enable'
            className="px-3 py-2 rounded-lg bg-white border border-rose-200 text-slate-800 text-sm
                       focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-400/10" />
          <button onClick={reset} disabled={typed !== 'RESET' || busy}
            className="rp-sheen flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 text-white
                       text-[12px] font-black hover:bg-rose-700 hover:-translate-y-0.5 transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0">
            <Trash2 className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />{busy ? 'Resetting…' : 'Reset Database'}
          </button>
        </div>
        {result && <p className="text-[12px] text-emerald-700 mt-3 ml-[42px]">{result} Reloading…</p>}
        {err && <p className="text-[12px] text-rose-700 mt-3 ml-[42px]">{err}</p>}
      </div>
    </Reveal>
  );
}

function RoomsManage({ session, onChanged }: { session: Session; onChanged: () => void }) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', label: '', floor: '', capacity: 10, color: '#6366f1' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const r = await fetch(`${API}/rooms/`);
    setRooms((await r.json()).results || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const r = await fetch(`${API}/rooms/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, email: session.email }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to create room');
      setForm({ name: '', label: '', floor: '', capacity: 10, color: '#6366f1' });
      load(); onChanged();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Failed'); }
    finally { setBusy(false); }
  };

  const retire = async (id: number, name: string) => {
    if (!confirm(`Retire "${name}"? It will be hidden from the live grid but existing bookings stay.`)) return;
    await fetch(`${API}/rooms/${id}/?email=${encodeURIComponent(session.email)}`, { method: 'DELETE' });
    load(); onChanged();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <Panel title="Add a room" icon={Plus}>
        <form onSubmit={create} className="space-y-3">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Conference Room - 4" required className={inputCls} />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="(Brand) label" className={inputCls} />
            <input value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
              placeholder="3rd Floor" required className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min={1} value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} className={inputCls} />
            <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              className="h-full rounded-xl bg-white border border-slate-200" />
          </div>
          {err && <p className="text-[12px] text-rose-600">{err}</p>}
          <button type="submit" disabled={busy}
            className="rp-sheen w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600
                       text-white text-sm font-black hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/25
                       transition-all disabled:opacity-50">
            {busy ? 'Adding…' : 'Add Room'}
          </button>
        </form>
      </Panel>
      <Panel title="All rooms" icon={Building2} subtitle={`${rooms.length} active`}>
        <div className="space-y-2">
          {rooms.map(r => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3
                                       transition-all duration-300 hover:border-cyan-200 hover:bg-white hover:shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 rp-pulse-glow" style={{ background: r.color }} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-slate-800 truncate">{r.label} {r.name}</p>
                <p className="text-[10px] text-slate-400">{r.floor} · {r.capacity} seats</p>
              </div>
              <button onClick={() => retire(r.id, r.name)}
                className="p-2 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function TeamManage({ session }: { session: Session }) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdmin, setNewAdmin] = useState('');
  const [employees, setEmployees] = useState<{ count: number }>({ count: 0 });
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [err, setErr] = useState('');

  const loadAdmins = useCallback(async () => {
    const r = await fetch(`${API}/admins/?email=${encodeURIComponent(session.email)}`);
    if (r.ok) setAdmins((await r.json()).results || []);
  }, [session.email]);
  const loadEmployees = useCallback(async () => {
    const r = await fetch(`${API}/employees/?limit=1`);
    setEmployees(await r.json());
  }, []);
  useEffect(() => { loadAdmins(); loadEmployees(); }, [loadAdmins, loadEmployees]);

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try {
      const r = await fetch(`${API}/admins/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email, new_admin_email: newAdmin }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setNewAdmin(''); loadAdmins();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Failed'); }
  };
  const removeAdmin = async (id: number) => {
    await fetch(`${API}/admins/?id=${id}&email=${encodeURIComponent(session.email)}`, { method: 'DELETE' });
    loadAdmins();
  };

  const downloadTemplate = async () => {
    const res = await fetch(`${API}/employees/template/`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'AdminPulse_Employee_Template.xlsx';
    document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
  };
  const upload = async (file: File) => {
    setUploadBusy(true); setUploadMsg('');
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('email', session.email);
      const r = await fetch(`${API}/employees/upload/`, { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Upload failed');
      setUploadMsg(d.message); loadEmployees();
    } catch (e) { setUploadMsg(e instanceof Error ? e.message : 'Upload failed'); }
    finally { setUploadBusy(false); }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <Panel title="Admins" icon={Shield} subtitle={`${admins.length} admin(s) — Super Admin is fixed`}>
        <form onSubmit={addAdmin} className="flex gap-2 mb-4">
          <input value={newAdmin} onChange={e => setNewAdmin(e.target.value)} placeholder="name@apisindia.com"
            className={`flex-1 ${inputCls}`} />
          <button type="submit" className="rp-sheen flex items-center gap-1.5 px-4 py-2.5 rounded-xl
                                           bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-[12px] font-black
                                           hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
            <UserPlus className="w-4 h-4" />Add
          </button>
        </form>
        {err && <p className="text-[12px] text-rose-600 mb-3">{err}</p>}
        <div className="space-y-2">
          {admins.map(a => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-slate-800 truncate">{a.email}</p>
                <p className="text-[10px] text-slate-400">added by {a.added_by || '—'}</p>
              </div>
              <button onClick={() => removeAdmin(a.id)}
                className="p-2 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {!admins.length && <Empty msg="No admins added yet" icon={Shield} />}
        </div>
      </Panel>

      <Panel title="Employee Directory" icon={FileSpreadsheet} subtitle={`${employees.count || 0} on record`}>
        <button onClick={downloadTemplate}
          className="rp-sheen w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-3 rounded-xl
                     border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50
                     hover:border-cyan-300 hover:text-cyan-700 transition-all">
          <Download className="w-4 h-4" />Download template
        </button>
        <label className={`group block rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-300
          ${uploadBusy ? 'border-slate-200' : 'border-slate-300 hover:border-cyan-400 hover:bg-cyan-50/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/10'}`}>
          <input type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          <UploadCloud className={`w-7 h-7 mx-auto mb-2 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110
            ${uploadBusy ? 'text-slate-300 animate-pulse' : 'text-cyan-500'}`} />
          <p className="text-[12px] font-bold text-slate-600">
            {uploadBusy ? 'Uploading…' : 'Click to upload the employee sheet'}
          </p>
        </label>
        <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
          Tip: put <b className="text-slate-500">"Admin"</b> in the Role column to grant that person
          Admin access in the same upload — no need to add them separately below. A blank or
          "Employee" cell never removes existing admin access.
        </p>
        {uploadMsg && <p className="text-[12px] text-cyan-700 mt-3">{uploadMsg}</p>}
      </Panel>
    </div>
  );
}

function AnalyticsPanel({ session }: { session: Session }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch(`${API}/analytics/?email=${encodeURIComponent(session.email)}`)
      .then(r => r.json()).then(setData);
  }, [session.email]);

  if (!data) return <Skel className="h-64" />;

  const PALETTE = ['#0891b2', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981', '#ef4444'];
  const purposeData = (data.by_purpose || []).map((p: any) => ({ name: PURPOSE_LABEL[p.purpose] || p.purpose, value: p.n }));
  const categoryData = (data.resource_requests?.by_category || [])
    .map((c: any) => ({ name: CATEGORY_LABEL[c.category] || c.category, value: c.n }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {[
          { l: 'Total Bookings', v: data.total_bookings, icon: Building2 },
          { l: 'Approval Rate', v: data.approval_rate_pct, suffix: '%', icon: Percent },
          { l: 'Avg. Turnaround', v: data.avg_turnaround_minutes, suffix: 'm', icon: Timer },
          { l: 'Busiest Hour', v: data.busiest_hour !== null ? `${data.busiest_hour}:00` : '—', icon: TrendingUp, raw: true },
          { l: 'Item Requests', v: data.resource_requests?.total ?? 0, icon: PackageCheck, raw: true,
            sub: `${data.resource_requests?.pending ?? 0} pending` },
        ].map((s: any, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.l} delay={i * 60}>
              <div className="rp-tilt group relative rounded-2xl bg-white border border-slate-200 shadow-sm p-4
                              overflow-hidden transition-shadow duration-300 hover:shadow-lg hover:shadow-cyan-500/[0.08]">
                <div className="pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full bg-cyan-400/0
                                group-hover:bg-cyan-400/10 blur-xl transition-colors duration-500" />
                <Icon className="w-4 h-4 text-cyan-600 mb-2 transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6" />
                <p className="rp-pop-in text-2xl font-black text-slate-900 tabular-nums">
                  {s.raw ? s.v : (s.v ?? '—')}{!s.raw && s.suffix}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{s.l}</p>
                {s.sub && <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>}
              </div>
            </Reveal>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel title="Top Rooms" icon={Building2}>
          <div className="space-y-2.5">
            {(data.top_rooms || []).map((r: any, i: number) => (
              <div key={r.room}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="font-bold text-slate-600">{r.room}</span>
                  <span className="font-black text-slate-800">{r.bookings}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="rp-grow h-full rounded-full"
                    style={{ width: `${(r.bookings / (data.top_rooms[0]?.bookings || 1)) * 100}%`,
                             background: PALETTE[i % PALETTE.length] }} />
                </div>
              </div>
            ))}
            {!data.top_rooms?.length && <Empty msg="No bookings in this period" />}
          </div>
        </Panel>
        <Panel title="Purpose Mix" icon={BarChart3}>
          {purposeData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={purposeData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {purposeData.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty msg="No data yet" />}
        </Panel>
        <Panel title="Item Request Categories" icon={PackageCheck}>
          {categoryData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {categoryData.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty msg="No item requests in this period" />}
        </Panel>
      </div>
    </div>
  );
}
