/* Approvals, Calendar and Super-Admin management panels for RoomPulse. */
import { useState, useEffect, useCallback } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, Users, Building2, Shield,
  UploadCloud, Download, Trash2, Plus, RefreshCw, TrendingUp, Timer,
  ChevronLeft, ChevronRight, FileSpreadsheet, UserPlus, Percent, BarChart3,
} from 'lucide-react';
import {
  API, _API_BASE, type Session, Reveal, Panel, Skel, Empty, PURPOSE_LABEL,
  PURPOSE_COLOUR, fmtDate,
} from './RoomPulseShared';

/* ── Approvals ──────────────────────────────────────────────────────────── */
export function ApprovalsPanel({ session, onChanged }: { session: Session; onChanged: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/bookings/?status=pending&limit=200`);
      const d = await r.json();
      setRows(d.results || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (id: number, action: 'approve' | 'reject') => {
    setBusyId(id); setErr('');
    try {
      const r = await fetch(`${API}/bookings/${id}/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, email: session.email, remarks: remarks[id] || '' }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Action failed');
      load(); onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Action failed');
    } finally { setBusyId(null); }
  };

  return (
    <Panel title="Pending Approvals" icon={Clock} subtitle={`${rows.length} request(s) waiting`}
      right={
        <button onClick={load} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      }>
      {err && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
          <p className="text-[12px] text-rose-200">{err}</p>
        </div>
      )}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-24" />)}</div>
      ) : !rows.length ? (
        <Empty msg="Nothing pending — all caught up" icon={CheckCircle2} />
      ) : (
        <div className="space-y-3">
          {rows.map((b, i) => (
            <Reveal key={b.id} delay={i * 60}>
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-black text-white">{b.room_name}</p>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1"
                        style={{ background: `${PURPOSE_COLOUR[b.purpose]}1a`, color: PURPOSE_COLOUR[b.purpose],
                                 borderColor: `${PURPOSE_COLOUR[b.purpose]}55` }}>
                        {PURPOSE_LABEL[b.purpose]}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      {fmtDate(b.date)} · {b.start_time}–{b.end_time} · {b.attendees} attendees
                    </p>
                    <p className="text-[11px] text-white/50 mt-1">
                      {b.requested_by_name} ({b.requested_by_email}){b.department && ` · ${b.department}`}
                    </p>
                    {b.purpose_detail && <p className="text-[11px] text-white/30 mt-1 italic">"{b.purpose_detail}"</p>}
                  </div>
                </div>
                <input value={remarks[b.id] || ''} onChange={e => setRemarks(r => ({ ...r, [b.id]: e.target.value }))}
                  placeholder="Optional remark (shown to the requester)"
                  className="w-full mb-3 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-[12px]" />
                <div className="flex items-center gap-2">
                  <button onClick={() => act(b.id, 'approve')} disabled={busyId === b.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                               bg-emerald-500/15 text-emerald-300 text-[12px] font-black
                               hover:bg-emerald-500/25 transition-all disabled:opacity-50">
                    <CheckCircle2 className="w-3.5 h-3.5" />Approve
                  </button>
                  <button onClick={() => act(b.id, 'reject')} disabled={busyId === b.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                               bg-rose-500/15 text-rose-300 text-[12px] font-black
                               hover:bg-rose-500/25 transition-all disabled:opacity-50">
                    <XCircle className="w-3.5 h-3.5" />Reject
                  </button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </Panel>
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
          className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-[12px] font-bold">
          {rooms.map(r => <option key={r.id} value={r.id} className="bg-[#0a0f1c]">{r.label} {r.name}</option>)}
        </select>
        <button onClick={() => shiftDay(-1)} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-[12px] font-bold" />
        <button onClick={() => shiftDay(1)} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {loading || !data ? <Skel className="h-64" /> : (
        <div className="relative rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
          <div className="relative h-64 ml-10">
            {HOURS.map(h => (
              <div key={h} className="absolute inset-x-0 border-t border-white/[0.05]"
                style={{ top: `${((h * 60 - dayStart) / span) * 100}%` }}>
                <span className="absolute -left-10 -top-2 text-[10px] text-white/25 tabular-nums">
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
                  style={{ top: `${top}%`, height: `${height}%`, background: `${colour}22`,
                           borderLeft: `3px solid ${colour}` }}>
                  <p className="text-[11px] font-black text-white truncate">{b.requested_by_name}</p>
                  <p className="text-[10px] text-white/50 truncate">
                    {b.start_time}–{b.end_time} · {b.status === 'pending' ? 'Pending' : PURPOSE_LABEL[b.purpose]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {data && !data.bookings.length && !loading && (
        <p className="text-center text-white/30 text-[12px] mt-4">Nothing booked this day</p>
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
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-2xl p-1.5 w-fit">
          {SUB_TABS.map(t => {
            const Icon = t.icon; const on = sub === t.id;
            return (
              <button key={t.id} onClick={() => setSub(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-black transition-all
                  ${on ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/20'
                       : 'text-white/40 hover:text-white/70'}`}>
                <Icon className="w-4 h-4" />{t.label}
              </button>
            );
          })}
        </div>
      </Reveal>
      {sub === 'rooms' && <RoomsManage session={session} onChanged={onRoomsChanged} />}
      {sub === 'team' && <TeamManage session={session} />}
      {sub === 'analytics' && <AnalyticsPanel session={session} />}
    </div>
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
            placeholder="Conference Room - 4" required
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="(Brand) label"
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm" />
            <input value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
              placeholder="3rd Floor" required
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min={1} value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm" />
            <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              className="h-full rounded-xl bg-white/[0.04] border border-white/10" />
          </div>
          {err && <p className="text-[12px] text-rose-300">{err}</p>}
          <button type="submit" disabled={busy}
            className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600
                       text-white text-sm font-black hover:-translate-y-0.5 transition-all disabled:opacity-50">
            {busy ? 'Adding…' : 'Add Room'}
          </button>
        </form>
      </Panel>
      <Panel title="All rooms" icon={Building2} subtitle={`${rooms.length} active`}>
        <div className="space-y-2">
          {rooms.map(r => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.07] p-3">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-white truncate">{r.label} {r.name}</p>
                <p className="text-[10px] text-white/40">{r.floor} · {r.capacity} seats</p>
              </div>
              <button onClick={() => retire(r.id, r.name)}
                className="p-2 rounded-lg text-white/25 hover:text-rose-300 hover:bg-rose-500/10 transition-all">
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
    const a = document.createElement('a'); a.href = url; a.download = 'RoomPulse_Employee_Template.xlsx';
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
            className="flex-1 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm" />
          <button type="submit" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl
                                           bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-[12px] font-black">
            <UserPlus className="w-4 h-4" />Add
          </button>
        </form>
        {err && <p className="text-[12px] text-rose-300 mb-3">{err}</p>}
        <div className="space-y-2">
          {admins.map(a => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.07] p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-white truncate">{a.email}</p>
                <p className="text-[10px] text-white/35">added by {a.added_by || '—'}</p>
              </div>
              <button onClick={() => removeAdmin(a.id)}
                className="p-2 rounded-lg text-white/25 hover:text-rose-300 hover:bg-rose-500/10 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {!admins.length && <Empty msg="No admins added yet" icon={Shield} />}
        </div>
      </Panel>

      <Panel title="Employee Directory" icon={FileSpreadsheet} subtitle={`${employees.count || 0} on record`}>
        <button onClick={downloadTemplate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-3 rounded-xl
                     border border-white/10 text-white/70 text-sm font-bold hover:bg-white/[0.05]">
          <Download className="w-4 h-4" />Download template
        </button>
        <label className={`block rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all
          ${uploadBusy ? 'border-white/10' : 'border-white/15 hover:border-cyan-400/40 hover:bg-cyan-500/5'}`}>
          <input type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          <UploadCloud className={`w-7 h-7 mx-auto mb-2 ${uploadBusy ? 'text-white/20 animate-pulse' : 'text-cyan-300/60'}`} />
          <p className="text-[12px] font-bold text-white/60">
            {uploadBusy ? 'Uploading…' : 'Click to upload the employee sheet'}
          </p>
        </label>
        {uploadMsg && <p className="text-[12px] text-cyan-300 mt-3">{uploadMsg}</p>}
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

  const PALETTE = ['#22d3ee', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981', '#ef4444'];
  const purposeData = (data.by_purpose || []).map((p: any) => ({ name: PURPOSE_LABEL[p.purpose] || p.purpose, value: p.n }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: 'Total Bookings', v: data.total_bookings, icon: Building2 },
          { l: 'Approval Rate', v: data.approval_rate_pct, suffix: '%', icon: Percent },
          { l: 'Avg. Turnaround', v: data.avg_turnaround_minutes, suffix: 'm', icon: Timer },
          { l: 'Busiest Hour', v: data.busiest_hour !== null ? `${data.busiest_hour}:00` : '—', icon: TrendingUp, raw: true },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.l} delay={i * 60}>
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4">
                <Icon className="w-4 h-4 text-cyan-300 mb-2" />
                <p className="text-2xl font-black text-white tabular-nums">
                  {s.raw ? s.v : (s.v ?? '—')}{!s.raw && s.suffix}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/35 mt-1">{s.l}</p>
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
                  <span className="font-bold text-white/70">{r.room}</span>
                  <span className="font-black text-white">{r.bookings}</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
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
                <Tooltip contentStyle={{ background: '#0a0f1c', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty msg="No data yet" />}
        </Panel>
      </div>
    </div>
  );
}
