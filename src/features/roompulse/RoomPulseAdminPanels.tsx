/* Approvals, Calendar and Super-Admin management panels for AdminPulse. */
import { useState, useEffect, useCallback } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, Users, Building2, Shield,
  UploadCloud, Download, Trash2, Plus, RefreshCw, TrendingUp, Timer,
  ChevronLeft, ChevronRight, FileSpreadsheet, UserPlus, Percent, BarChart3,
  PackageCheck, Truck, Headphones, PlayCircle, History, Inbox, Paperclip, ClipboardList,
  Search, Gauge,
} from 'lucide-react';
import {
  API, _API_BASE, type Session, Reveal, Panel, Skel, Empty, PURPOSE_LABEL,
  PURPOSE_COLOUR, CATEGORY_LABEL, CATEGORY_COLOUR, URGENCY_LABEL, URGENCY_COLOUR,
  REQUEST_STATUS_BADGE, fmtDate, isoLocal, rpFetch} from './RoomPulseShared';
import { TICKET_CATEGORY_LABEL, ticketPriorityMeta, ticketStatusMeta, fmtTicketWhen } from './RoomPulseTickets';

// What the server treats as the normal working day — see roompulse/worktime.py.
const OFFICE_HOURS = '09:30–18:30';

const inputCls = "w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm " +
  "focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10";

/* ── Approvals — which queue(s) a role sees. Admin reviews room bookings and
   item requests ("Admin Ticket" in the Support Desk popup); IT Support
   reviews IT tickets; Super Admin gets both, matching "super admin has
   access to everything". Each queue's history stays with its own queue —
   Admin never sees IT Support's closed tickets and vice versa. ─────────── */
export function ApprovalsPanel({ session, onChanged }: { session: Session; onChanged: () => void }) {
  const showAdminQueue = session.role === 'admin' || session.role === 'super_admin';
  const showTicketQueue = session.role === 'it_support' || session.role === 'super_admin';
  return (
    <div className="space-y-5">
      {showAdminQueue && <AdminApprovalsSection session={session} onChanged={onChanged} />}
      {showAdminQueue && <AdminTicketHistorySection />}
      {showTicketQueue && <TicketApprovalsSection session={session} onChanged={onChanged} />}
      {showTicketQueue && <LogWorkSection session={session} onChanged={onChanged} />}
      {showTicketQueue && <WorkReportSection />}
      {showTicketQueue && <ItTicketHistorySection />}
    </div>
  );
}

/* ── Admin queue — room bookings + item requests, merged into one queue ──── */
function AdminApprovalsSection({ session, onChanged }: { session: Session; onChanged: () => void }) {
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
        rpFetch(`${API}/bookings/?status=pending&limit=200`).then(r => r.json()),
        rpFetch(`${API}/resource-requests/?status=pending&limit=200`).then(r => r.json()),
        rpFetch(`${API}/resource-requests/?status=approved&limit=200`).then(r => r.json()),
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
      const r = await rpFetch(url, {
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
      const r = await rpFetch(`${API}/resource-requests/${id}/`, {
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

/* ── IT Support queue — tickets, pending triage + active work ────────────── */
function TicketApprovalsSection({ session, onChanged }: { session: Session; onChanged: () => void }) {
  const [pending, setPending] = useState<any[]>([]);
  const [active, setActive] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, approved, inProgress] = await Promise.all([
        rpFetch(`${API}/tickets/?status=pending&limit=200`).then(r => r.json()),
        rpFetch(`${API}/tickets/?status=approved&limit=200`).then(r => r.json()),
        rpFetch(`${API}/tickets/?status=in_progress&limit=200`).then(r => r.json()),
      ]);
      setPending(p.results || []);
      setActive([...(approved.results || []), ...(inProgress.results || [])]);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // What a close carries besides the status: how long it took, and when. Half
  // the month's work would otherwise have no time against it, and the two
  // kinds of work could not be compared.
  const [timing, setTiming] = useState<Record<number, { m: string; from: string; to: string }>>({});
  const setTime = (id: number, k: 'm' | 'from' | 'to', v: string) =>
    setTiming(t => {
      const prev = t[id] ?? { m: '', from: '', to: '' };
      return { ...t, [id]: { ...prev, [k]: v } };
    });

  const act = async (id: number, action: 'approve' | 'reject' | 'start' | 'close') => {
    setBusyId(id); setErr('');
    const tm = timing[id];
    try {
      const r = await rpFetch(`${API}/tickets/${id}/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action, email: session.email, remarks: remarks[id] || '',
          ...(action === 'close' && tm
            ? { time_spent_minutes: tm.m || null, worked_from: tm.from, worked_to: tm.to }
            : {}),
        }),
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
      <Panel title="Pending Tickets" icon={Headphones} subtitle={`${pending.length} ticket(s) awaiting triage`}
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
        ) : !pending.length ? (
          <Empty msg="Nothing pending — all caught up" icon={CheckCircle2} />
        ) : (
          <div className="space-y-3">
            {pending.map((t, i) => (
              <Reveal key={t.id} delay={i * 60}>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-white
                                         text-slate-500 ring-1 ring-slate-200">
                          {TICKET_CATEGORY_LABEL[t.category] || t.category}
                        </span>
                        <p className="text-[13px] font-black text-slate-800">{t.subject}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1
                                          ring-slate-200 bg-white ${ticketPriorityMeta(t.priority).text}`}>
                          {ticketPriorityMeta(t.priority).label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {t.related_to || '—'} · {fmtTicketWhen(t.created_at)}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {t.requested_by_name} ({t.requested_by_email}){t.department && ` · ${t.department}`}
                      </p>
                      {t.description && (
                        <p className="text-[11px] text-slate-400 mt-1 italic">"{t.description}"</p>
                      )}
                      {t.attachments?.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                          <Paperclip className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          {t.attachments.map((a: { id: number; name: string; url: string }) => (
                            <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                              className="px-1.5 py-0.5 rounded bg-white border border-slate-200
                                        text-[10px] font-bold text-cyan-700 hover:bg-cyan-50 hover:border-cyan-300
                                        underline decoration-dotted transition-colors">
                              {a.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <input value={remarks[t.id] || ''} onChange={e => setRemarks(r => ({ ...r, [t.id]: e.target.value }))}
                    placeholder="Optional remark (shown to the requester)"
                    className={`${inputCls} mb-3 py-2 text-[12px]`} />
                  <div className="flex items-center gap-2">
                    <button onClick={() => act(t.id, 'approve')} disabled={busyId === t.id}
                      className="rp-sheen flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                                 bg-emerald-50 text-emerald-700 text-[12px] font-black
                                 hover:bg-emerald-100 hover:-translate-y-0.5 transition-all disabled:opacity-50">
                      {busyId === t.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}Approve
                    </button>
                    <button onClick={() => act(t.id, 'reject')} disabled={busyId === t.id}
                      className="rp-sheen flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                                 bg-rose-50 text-rose-700 text-[12px] font-black
                                 hover:bg-rose-100 hover:-translate-y-0.5 transition-all disabled:opacity-50">
                      <XCircle className="w-3.5 h-3.5" />Reject
                    </button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </Panel>

      {/* Approving a ticket only means "yes, IT Support will work it" — it
          isn't done until someone starts, then finishes, the actual work. */}
      <Panel title="Active Tickets" icon={PlayCircle}
        subtitle={`${active.length} approved / in-progress ticket(s)`}>
        {!active.length ? (
          <Empty msg="Nothing active right now" icon={Headphones} />
        ) : (
          <div className="space-y-2.5">
            {active.map((t, i) => (
              <Reveal key={t.id} delay={i * 50}>
                <div className="rp-tilt flex items-center gap-3 rounded-xl bg-cyan-50/50 border border-cyan-200 p-3.5">
                  <div className="w-2 h-full min-h-[36px] rounded-full flex-shrink-0" style={{ background: '#f59e0b' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-slate-800 truncate">
                      {t.subject} <span className="text-slate-400 font-semibold">· {TICKET_CATEGORY_LABEL[t.category] || t.category}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      For {t.requested_by_name}{t.department && ` · ${t.department}`} · {t.status_label}
                    </p>
                  </div>
                  {t.status === 'approved' ? (
                    <button onClick={() => act(t.id, 'start')} disabled={busyId === t.id}
                      className="rp-sheen flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 text-white
                                 text-[12px] font-black hover:bg-sky-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 flex-shrink-0">
                      <PlayCircle className="w-3.5 h-3.5" />Start Progress
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Both optional. A time nobody has is worse than none —
                          it would be a guess sitting in a report. */}
                      <input type="time" title="Worked from"
                        value={timing[t.id]?.from || ''}
                        onChange={e => setTime(t.id, 'from', e.target.value)}
                        className="w-[88px] px-1.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600" />
                      <span className="text-[11px] text-slate-300">to</span>
                      <input type="time" title="Worked to"
                        value={timing[t.id]?.to || ''}
                        onChange={e => setTime(t.id, 'to', e.target.value)}
                        className="w-[88px] px-1.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600" />
                      <input type="number" min={0} placeholder="min" title="Minutes spent"
                        value={timing[t.id]?.m || ''}
                        onChange={e => setTime(t.id, 'm', e.target.value)}
                        className="w-[64px] px-1.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600" />
                      <button onClick={() => act(t.id, 'close')} disabled={busyId === t.id}
                        className="rp-sheen flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 text-white
                                   text-[12px] font-black hover:bg-cyan-700 hover:-translate-y-0.5 transition-all disabled:opacity-50">
                        <CheckCircle2 className="w-3.5 h-3.5" />Close
                      </button>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ── IT Ticket History — daily volume/throughput summary + a recent-tickets
   log, at the bottom of the IT Support queue only. ───────────────────────── */
/* ── Logging work nobody raised a ticket for ──────────────────────────────
   A large part of what IT and Admin do never becomes a ticket: a server
   restarted, a laptop rebuilt for a joiner, a printer fixed because somebody
   walked over and asked. Counted only what came through the queue, the
   monthly figure measured how often people used the ticket form rather than
   how much work was done. ───────────────────────────────────────────────── */
function LogWorkSection({ session, onChanged }: { session: Session; onChanged: () => void }) {
  const today = isoLocal(new Date());
  const blank = {
    subject: '', description: '', category: 'other', priority: 'medium',
    logged_for: '', performed_on: today, time_spent_minutes: '', status: 'closed',
    worked_from: '', worked_to: '',
  };
  const [form, setForm] = useState<Record<string, string>>(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.subject.trim()) { setErr('Say what the job was.'); return; }
    if (!form.description.trim()) { setErr('Add a line about what you did.'); return; }
    setBusy(true); setErr(''); setDone('');
    try {
      const r = await rpFetch(`${API}/tickets/`, {
        method: 'POST',
        body: JSON.stringify({
          ...form, origin: 'logged',
          performed_by_name: session.name,
          time_spent_minutes: form.time_spent_minutes || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not log that.');
      setDone(d.message || 'Logged.');
      setForm({ ...blank, performed_on: form.performed_on });   // keep the date, likely the same day
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not log that.');
    } finally { setBusy(false); }
  };

  return (
    <Panel title="Log work you did" icon={ClipboardList}
      subtitle="For jobs nobody raised a ticket for — so the month's count is the real one"
      right={
        <button onClick={() => { setOpen(o => !o); setErr(''); setDone(''); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 text-white
                     text-[12px] font-black hover:bg-cyan-700 transition-colors">
          <Plus className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-45' : ''}`} />
          {open ? 'Close' : 'Log a job'}
        </button>
      }>
      {done && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <p className="text-[12px] text-emerald-700 font-bold">{done}</p>
        </div>
      )}
      {!open ? (
        <p className="text-[12px] text-slate-400">
          Restarted a server, rebuilt a laptop, fixed a printer someone mentioned in passing —
          record it here and it counts in the monthly report like any ticket.
        </p>
      ) : (
        <div className="space-y-3">
          {err && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3">
              <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <p className="text-[12px] text-rose-700">{err}</p>
            </div>
          )}

          <div>
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">What was the job?</label>
            <input className={inputCls} value={form.subject} maxLength={200}
              onChange={e => set('subject', e.target.value)}
              placeholder="Restarted the mail server" />
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">What did you do?</label>
            <textarea className={inputCls + ' min-h-[70px]'} value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Queue was stuck. Restarted the service and cleared the backlog." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Category</label>
              <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
                {Object.entries(TICKET_CATEGORY_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Who was it for?</label>
              <input className={inputCls} value={form.logged_for} maxLength={200}
                onChange={e => set('logged_for', e.target.value)}
                placeholder="A person, a department, or the whole office" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Day it was done</label>
              <input type="date" className={inputCls} value={form.performed_on} max={today}
                onChange={e => set('performed_on', e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Worked from</label>
              <input type="time" className={inputCls} value={form.worked_from}
                onChange={e => set('worked_from', e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Until</label>
              <input type="time" className={inputCls} value={form.worked_to}
                onChange={e => set('worked_to', e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">State</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="closed">Finished</option>
                <option value="in_progress">Still working on it</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">
              Minutes spent <span className="text-slate-300 normal-case font-bold">— only if the hours above don't say it</span>
            </label>
            <input type="number" min={0} className={inputCls} value={form.time_spent_minutes}
              onChange={e => set('time_spent_minutes', e.target.value)}
              placeholder="Worked out from the times above if you leave this blank" />
          </div>

          <p className="text-[11px] text-slate-400">
            Write it up whenever suits — the date above is the day the work happened, which is the
            month it will count in. Giving the hours is what lets a late night show as one: work
            outside {OFFICE_HOURS}, or at any time on a Saturday or Sunday, is counted separately.
          </p>

          <button onClick={submit} disabled={busy}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-black
                       hover:bg-slate-800 disabled:opacity-50 transition-colors">
            {busy ? 'Saving…' : 'Record this job'}
          </button>
        </div>
      )}
    </Panel>
  );
}

/* ── The month's work: tickets closed AND jobs logged ─────────────────── */
function WorkReportSection() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  // A total invites the question "made up of what?" straight back, so the
  // answer is one click away rather than a separate screen.
  const [openPerson, setOpenPerson] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [itemsBusy, setItemsBusy] = useState(false);

  const showPerson = async (email: string) => {
    if (openPerson === email) { setOpenPerson(''); setItems([]); return; }
    setOpenPerson(email); setItems([]); setItemsBusy(true);
    try {
      const r = await rpFetch(`${API}/work-report/?month=${month}&person=${encodeURIComponent(email)}`);
      const d = await r.json();
      if (r.ok) setItems(d.items || []);
    } finally { setItemsBusy(false); }
  };

  const download = () => {
    // Straight to the browser: the session cookie is not what authorises
    // this, so it goes through rpFetch and is handed over as a blob.
    rpFetch(`${API}/work-report/export/?month=${month}`).then(async r => {
      if (!r.ok) { setErr('Could not build the file.'); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `work-done-${month}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });
  };

  useEffect(() => {
    let live = true;
    setData(null); setErr(''); setOpenPerson(''); setItems([]);
    rpFetch(`${API}/work-report/?month=${month}`)
      .then(async r => {
        const body = await r.json().catch(() => ({}));
        if (!live) return;
        if (!r.ok) setErr(body.error || 'Could not load the report.');
        else setData(body);
      })
      .catch(() => { if (live) setErr('Could not reach the server.'); });
    return () => { live = false; };
  }, [month]);

  const hours = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

  return (
    <Panel title="Work this month" icon={History}
      subtitle={data ? `${data.label} · tickets closed and jobs logged` : 'Loading…'}
      right={
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] font-bold text-slate-600" />
          <button onClick={download} title="Download this month as a spreadsheet"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200
                       text-[12px] font-black text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      }>
      {err && <p className="text-[12px] text-rose-600 font-semibold py-4 text-center">{err}</p>}
      {!err && !data && <Skel className="h-40" />}
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { l: 'Jobs done', v: data.total },
              { l: 'From tickets', v: data.from_tickets },
              { l: 'Logged directly', v: data.logged_directly },
              { l: 'Time recorded', v: data.minutes_recorded ? hours(data.minutes_recorded) : '—' },
              { l: 'Outside office hours', v: data.after_hours_minutes ? hours(data.after_hours_minutes) : '—' },
            ].map(s => (
              <div key={s.l} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-xl font-black text-slate-900 tabular-nums">{s.v}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>

          {!data.total ? (
            <Empty msg="Nothing recorded for this month yet" icon={History} />
          ) : (
            <>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">By person</p>
                <div className="space-y-1.5">
                  {data.people.map((p: any) => (
                    <div key={p.email} className="rounded-xl border border-slate-200 overflow-hidden">
                      <button onClick={() => showPerson(p.email)}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left
                                   hover:bg-slate-50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-[12px] font-black text-slate-700 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {p.closed} from tickets · {p.logged} logged
                            {p.minutes ? ` · ${hours(p.minutes)}` : ''}
                            {p.after_hours_minutes
                              ? <span className="text-violet-500 font-bold">
                                  {' · '}{hours(p.after_hours_minutes)} outside hours
                                </span>
                              : ''}
                          </p>
                        </div>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="text-base font-black text-slate-900 tabular-nums">{p.total}</span>
                          <ChevronRight className={`w-3.5 h-3.5 text-slate-300 transition-transform
                            ${openPerson === p.email ? 'rotate-90' : ''}`} />
                        </span>
                      </button>

                      {openPerson === p.email && (
                        <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-2 space-y-1.5">
                          {itemsBusy && <Skel className="h-10" />}
                          {!itemsBusy && !items.length && (
                            <p className="text-[11px] text-slate-400 py-1">Nothing recorded.</p>
                          )}
                          {items.map(it => (
                            <div key={it.id} className="flex items-start gap-2 text-[11px]">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0
                                ${it.origin === 'logged' ? 'bg-violet-100 text-violet-700'
                                                         : 'bg-cyan-100 text-cyan-700'}`}>
                                {it.origin === 'logged' ? 'Logged' : 'Ticket'}
                              </span>
                              <span className="text-slate-400 tabular-nums shrink-0 w-16">
                                {it.date ? fmtDate(it.date) : ''}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="font-bold text-slate-700">{it.subject}</span>
                                <span className="text-slate-400">
                                  {it.for ? ` · for ${it.for}` : ''} · {it.category}
                                  {it.worked_from ? ` · ${it.worked_from}–${it.worked_to}` : ''}
                                  {it.minutes ? ` · ${hours(it.minutes)}` : ''}
                                </span>
                                {it.after_hours_minutes ? (
                                  <span className="ml-1 px-1 py-0.5 rounded bg-violet-100 text-violet-700
                                                   text-[9px] font-black uppercase">
                                    {hours(it.after_hours_minutes)} late
                                  </span>
                                ) : null}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">By category</p>
                <div className="space-y-1.5">
                  {data.by_category.map((c: any) => (
                    <div key={c.category}>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="font-bold text-slate-600">{c.label}</span>
                        <span className="font-black text-slate-800">{c.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="rp-grow h-full rounded-full bg-cyan-500"
                          style={{ width: `${(c.count / (data.by_category[0]?.count || 1)) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
            Counted by the day the work was done, not the day the ticket arrived — a ticket raised
            last month and finished this one belongs to this month. Outside hours means before or
            after {data.office_hours || OFFICE_HOURS}, or any time on a Saturday or Sunday, worked
            out from the hours recorded on each job.
            {data.still_open > 0 && ` ${data.still_open} still open right now.`}
          </p>
        </div>
      )}
    </Panel>
  );
}

function ItTicketHistorySection() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await rpFetch(`${API}/tickets/?limit=500`);
      const d = await r.json();
      setTickets(d.results || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const today = isoLocal(new Date());
  const isToday = (iso: string) => isoLocal(new Date(iso)) === today;

  // "Received" means somebody asked. A job the team logged themselves was
  // never received, so counting it here would inflate incoming volume with
  // the team's own work.
  const receivedToday = tickets.filter(t => t.origin !== 'logged' && isToday(t.created_at)).length;
  // Done today means the work happened today -- `performed_on`, not the row's
  // updated_at, which is today for a job written up this morning that was
  // actually done last Friday.
  const solvedToday = tickets.filter(t => t.status === 'closed'
    && (t.performed_on ? t.performed_on === today : isToday(t.updated_at))).length;
  const loggedToday = tickets.filter(t => t.origin === 'logged' && t.performed_on === today).length;
  const pending = tickets.filter(t => t.status === 'pending').length;
  const inProgress = tickets.filter(t => t.status === 'in_progress').length;

  const STAT_TILES = [
    { label: 'Raised Today', value: receivedToday, icon: Inbox, cls: 'text-cyan-600' },
    { label: 'Done Today', value: solvedToday, icon: CheckCircle2, cls: 'text-emerald-600' },
    { label: 'Logged Today', value: loggedToday, icon: ClipboardList, cls: 'text-violet-600' },
    { label: 'In Progress', value: inProgress, icon: PlayCircle, cls: 'text-sky-600' },
    { label: 'Pending', value: pending, icon: Clock, cls: 'text-amber-600' },
  ];

  const recent = tickets.slice(0, 15);

  return (
    <Panel title="IT Ticket History" icon={History} subtitle="Today's volume, throughput, and the most recent IT tickets"
      right={
        <button onClick={load} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      }>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {STAT_TILES.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
              <Icon className={`w-4 h-4 mb-1.5 ${s.cls}`} />
              <p className="text-xl font-black text-slate-900 tabular-nums">{loading ? '—' : s.value}</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skel key={i} className="h-12" />)}</div>
      ) : !recent.length ? (
        <Empty msg="No IT tickets raised yet" icon={History} />
      ) : (
        <div className="space-y-2">
          {recent.map((t, i) => (
            <Reveal key={t.id} delay={i * 30}>
              <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 p-3">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1 flex-shrink-0
                  ${t.status === 'closed' ? 'bg-emerald-50 text-emerald-600 ring-emerald-200'
                    : t.status === 'in_progress' ? 'bg-sky-50 text-sky-600 ring-sky-200'
                    : t.status === 'rejected' ? 'bg-rose-50 text-rose-600 ring-rose-200'
                    : t.status === 'approved' ? 'bg-emerald-50 text-emerald-600 ring-emerald-200'
                    : 'bg-amber-50 text-amber-600 ring-amber-200'}`}>
                  {t.status_label}
                </span>
                {/* Work the team logged itself reads very differently from a
                    ticket somebody raised — same row, but say which. */}
                {t.origin === 'logged' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1
                                   bg-violet-50 text-violet-600 ring-violet-200 flex-shrink-0">
                    Logged
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-slate-800 truncate">{t.subject}</p>
                  <p className="text-[10.5px] text-slate-400 truncate">
                    {t.origin === 'logged'
                      ? <>{t.performed_by_name || t.requested_by_name}
                          {t.logged_for ? ` · for ${t.logged_for}` : ''}</>
                      : t.requested_by_name}
                    {' · '}{TICKET_CATEGORY_LABEL[t.category] || t.category}
                    {' · '}{fmtTicketWhen(t.created_at)}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ── Admin Ticket History — same shape as IT's, but for item/resource
   requests ("Admin Ticket" in the Support Desk popup), at the bottom of
   the Admin queue only. ResourceRequest already tracks `fulfilled_at`
   separately, so "Fulfilled Today" doesn't need an updated_at field the
   way the IT ticket version does. ────────────────────────────────────── */
function AdminTicketHistorySection() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await rpFetch(`${API}/resource-requests/?limit=500`);
      const d = await r.json();
      setRequests(d.results || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const today = isoLocal(new Date());
  const isToday = (iso: string) => isoLocal(new Date(iso)) === today;

  const receivedToday = requests.filter(r => isToday(r.created_at)).length;
  const fulfilledToday = requests.filter(r => r.status === 'fulfilled' && r.fulfilled_at && isToday(r.fulfilled_at)).length;
  const awaitingFulfilment = requests.filter(r => r.status === 'approved').length;
  const pending = requests.filter(r => r.status === 'pending').length;

  const STAT_TILES = [
    { label: 'Received Today', value: receivedToday, icon: Inbox, cls: 'text-cyan-600' },
    { label: 'Fulfilled Today', value: fulfilledToday, icon: CheckCircle2, cls: 'text-emerald-600' },
    { label: 'Awaiting Fulfilment', value: awaitingFulfilment, icon: PlayCircle, cls: 'text-sky-600' },
    { label: 'Pending', value: pending, icon: Clock, cls: 'text-amber-600' },
  ];

  const recent = requests.slice(0, 15);

  return (
    <Panel title="Admin Ticket History" icon={History} subtitle="Today's volume, throughput, and the most recent item requests"
      right={
        <button onClick={load} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      }>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {STAT_TILES.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
              <Icon className={`w-4 h-4 mb-1.5 ${s.cls}`} />
              <p className="text-xl font-black text-slate-900 tabular-nums">{loading ? '—' : s.value}</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skel key={i} className="h-12" />)}</div>
      ) : !recent.length ? (
        <Empty msg="No item requests raised yet" icon={History} />
      ) : (
        <div className="space-y-2">
          {recent.map((r, i) => (
            <Reveal key={r.id} delay={i * 30}>
              <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 p-3">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1 flex-shrink-0 ${REQUEST_STATUS_BADGE[r.status]}`}>
                  {r.status}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-slate-800 truncate">{r.item_name} × {r.quantity}</p>
                  <p className="text-[10.5px] text-slate-400 truncate">
                    {r.requested_by_name} · {r.category_label} · {fmtDate(r.created_at.slice(0, 10))}
                  </p>
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
  const [date, setDate] = useState(isoLocal(new Date()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (rooms.length && !roomId) setRoomId(rooms[0].id); }, [rooms, roomId]);

  const load = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const r = await rpFetch(`${API}/rooms/${roomId}/calendar/?date=${date}`);
      setData(await r.json());
    } finally { setLoading(false); }
  }, [roomId, date]);
  useEffect(() => { load(); }, [load]);

  const shiftDay = (n: number) => {
    const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + n);
    setDate(isoLocal(d));
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

/* ── The Super Admin's one screen ─────────────────────────────────────────
   All of this was visible somewhere already, across five tabs. That is fine
   for doing a job and useless for noticing one: a ticket nobody has touched
   in nine days does not announce itself from the bottom of a queue. ────── */
function OverviewPanel({ onGoTo }: { onGoTo: (tab: string) => void }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const r = await rpFetch(`${API}/overview/`);
      const body = await r.json().catch(() => ({}));
      if (!r.ok) setErr(body.error || 'Could not load the overview.');
      else setD(body);
    } catch { setErr('Could not reach the server.'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (err) return (
    <Panel title="Overview" icon={Gauge}>
      <p className="text-[13px] text-rose-600 font-semibold py-6 text-center">{err}</p>
    </Panel>
  );
  if (!d) return <Skel className="h-72" />;

  const ago = (iso: string) => {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
    return `${Math.round(mins / 1440)}d ago`;
  };

  return (
    <div className="space-y-5">
      {/* Anything actually wrong goes first and says what to do about it. */}
      {!!d.problems.length && (
        <Panel title="Needs your attention" icon={AlertTriangle}>
          <div className="space-y-2">
            {d.problems.map((p: string, i: number) => (
              <div key={i} className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[12px] text-amber-900 font-semibold">{p}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: 'Waiting on someone', v: d.waiting_total, tone: d.waiting_total ? 'text-amber-600' : 'text-slate-900' },
          { l: `Over ${d.stale_after_days} days old`, v: d.stale_total, tone: d.stale_total ? 'text-rose-600' : 'text-slate-900' },
          { l: 'Rooms in use', v: `${d.rooms_in_use}/${d.rooms_total}` },
          { l: 'Raised today', v: d.today.tickets_raised },
          { l: 'Done today', v: d.today.jobs_done },
        ].map(s => (
          <div key={s.l} className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
            <p className={`text-2xl font-black tabular-nums ${s.tone || 'text-slate-900'}`}>{s.v}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel title="Queues" icon={Inbox} subtitle="With how long the oldest has been waiting">
          <div className="space-y-2">
            {d.waiting.map((w: any) => (
              <button key={w.what} onClick={() => onGoTo(w.where)}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5
                           text-left hover:border-cyan-300 hover:bg-cyan-50/40 transition-colors">
                <span className={`text-lg font-black tabular-nums w-8 shrink-0
                  ${w.stale ? 'text-rose-600' : w.count ? 'text-slate-900' : 'text-slate-300'}`}>
                  {w.count}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-bold text-slate-700">{w.what}</span>
                  <span className="block text-[10.5px] text-slate-400">
                    {w.count
                      ? <>oldest {w.oldest_days === 0 ? 'today' : `${w.oldest_days}d old`}
                          {w.stale ? <span className="text-rose-500 font-bold"> · {w.stale} overdue</span> : null}</>
                      : 'nothing waiting'}
                  </span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Rooms right now" icon={Building2} subtitle={`${d.rooms_in_use} of ${d.rooms_total} in use`}>
          {!d.rooms.length ? (
            <Empty msg="No rooms set up yet" icon={Building2} />
          ) : (
            <div className="space-y-1.5">
              {d.rooms.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    r.status === 'occupied' ? 'bg-rose-500'
                    : r.status === 'upcoming' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-bold text-slate-700 truncate">{r.name}</span>
                    <span className="block text-[10.5px] text-slate-400 truncate">
                      {r.status === 'occupied'
                        ? `Busy until ${r.until}${r.who ? ` · ${r.who}` : ''}`
                        : r.next ? `Free · next at ${r.next}` : 'Free all day'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel title="People" icon={Users}
          subtitle={d.people.last_synced_at
            ? `Directory last synced ${fmtDate(d.people.last_synced_at.slice(0, 10))}`
            : 'Directory never synced'}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { l: 'On the list', v: d.people.total },
              { l: 'Admins', v: d.people.admins },
              { l: 'IT Support', v: d.people.it_support },
              { l: 'Added by hand', v: d.people.added_here },
            ].map(s => (
              <div key={s.l} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-xl font-black text-slate-900 tabular-nums">{s.v}</p>
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
          {d.people.inactive > 0 && (
            <p className="text-[11px] text-slate-400 mt-3">
              {d.people.inactive} marked as left — kept because their name is on past requests.
            </p>
          )}
        </Panel>

        <Panel title="Lately" icon={History} subtitle="Every move on a ticket, newest first">
          {!d.recent.length ? (
            <Empty msg="Nothing has happened yet" icon={History} />
          ) : (
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {d.recent.map((e: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-[11px] border-b border-slate-50 pb-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0
                    ${e.kind === 'Work logged' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                    {e.action}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-bold text-slate-700">{e.subject}</span>
                    <span className="text-slate-400"> · {e.who}</span>
                  </span>
                  <span className="text-slate-300 shrink-0">{ago(e.at)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ── Super Admin: Rooms / Team / Analytics ───────────────────────────────── */
const SUB_TABS = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'rooms', label: 'Rooms', icon: Building2 },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
] as const;

export function SuperAdminPanel({ session, onRoomsChanged, onGoToTab }: {
  session: Session; onRoomsChanged: () => void; onGoToTab?: (tab: string) => void;
}) {
  // Opens on the overview: the point of this seat is noticing, and noticing
  // does not happen inside a tab you have to remember to open.
  const [sub, setSub] = useState<typeof SUB_TABS[number]['id']>('overview');
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
      {sub === 'overview' && <OverviewPanel onGoTo={t => onGoToTab?.(t)} />}
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
    if (!confirm('This permanently deletes ALL bookings, item requests, IT tickets, the employee '
                + 'directory and every admin/IT Support account (except the fixed Super Admin), '
                + 'then restores only the 3 real rooms. This cannot be undone. Continue?')) return;
    setBusy(true); setErr(''); setResult('');
    try {
      const r = await rpFetch(`${API}/reset/`, {
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
          Permanently deletes all bookings, item requests, IT tickets, the employee directory and
          every admin/IT Support account (the fixed Super Admin is unaffected), then restores only
          the 3 real APIS rooms. Cannot be undone.
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
    const r = await rpFetch(`${API}/rooms/`);
    setRooms((await r.json()).results || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const r = await rpFetch(`${API}/rooms/`, {
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
    await rpFetch(`${API}/rooms/${id}/?email=${encodeURIComponent(session.email)}`, { method: 'DELETE' });
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

const SCOPE_LABEL: Record<string, string> = { admin: 'Admin', it_support: 'IT Support' };
const SCOPE_BADGE: Record<string, string> = {
  admin: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  it_support: 'bg-amber-50 text-amber-700 ring-amber-200',
};

/* ── Who handles what ─────────────────────────────────────────────────────
   Assigning the Admin and IT Support roles used to mean typing an email
   address from memory into a box, with no way to see the 665 people on the
   list or check you had the right one. It is a decision about a person, so
   it starts by finding the person. ─────────────────────────────────────── */
const ROLE_META: Record<string, { label: string; cls: string }> = {
  employee:   { label: 'Employee',   cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
  admin:      { label: 'Admin',      cls: 'bg-violet-50 text-violet-700 ring-violet-200' },
  it_support: { label: 'IT Support', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
};

function PeopleDirectory({ onRolesChanged }: { onRolesChanged: () => void }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ count: 0 });
  const [loading, setLoading] = useState(true);
  const [only, setOnly] = useState<'all' | 'staff' | 'manual'>('all');
  const [busyEmail, setBusyEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200', active: '1' });
      if (q.trim()) params.set('search', q.trim());
      if (only === 'manual') params.set('source', 'manual');
      const r = await rpFetch(`${API}/employees/?${params}`);
      if (r.ok) {
        const d = await r.json();
        setRows(d.results || []);
        setMeta(d);
      }
    } finally { setLoading(false); }
  }, [q, only]);

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const setRole = async (person: any, scope: 'employee' | 'admin' | 'it_support') => {
    setBusyEmail(person.email); setErr(''); setMsg('');
    try {
      const r = await rpFetch(`${API}/admins/role/`, {
        method: 'POST',
        body: JSON.stringify({ email: person.email, scope, name: person.name }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not change that.');
      setMsg(d.message);
      setRows(rs => rs.map(x => (x.email === person.email ? { ...x, role: scope } : x)));
      onRolesChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not change that.');
    } finally { setBusyEmail(''); }
  };

  const removePerson = async (person: any) => {
    setBusyEmail(person.email); setErr(''); setMsg('');
    try {
      const r = await rpFetch(`${API}/employees/${person.id}/`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not remove them.');
      setMsg(d.message);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not remove them.');
    } finally { setBusyEmail(''); }
  };

  const shown = only === 'staff' ? rows.filter(r => r.role !== 'employee') : rows;

  return (
    <Panel title="People" icon={Users}
      subtitle={`${meta.count || 0} on the list — search for someone to give them Admin or IT Support`}
      right={
        <button onClick={load} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      }>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)} autoComplete="off"
            placeholder="Search by name, email, department or employee code"
            className={`${inputCls} pl-9`} />
        </div>
        <div className="flex gap-1">
          {([['all', 'Everyone'], ['staff', 'Admin & IT'], ['manual', 'Added here']] as const).map(
            ([k, label]) => (
              <button key={k} onClick={() => setOnly(k)}
                className={`px-3 py-2 rounded-xl text-[11px] font-black whitespace-nowrap transition-colors ${
                  only === k ? 'bg-slate-900 text-white'
                             : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {label}
              </button>
            ))}
        </div>
      </div>

      {msg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-[12px] text-emerald-700 font-bold">{msg}</p>
        </div>
      )}
      {err && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 mb-3">
          <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
          <p className="text-[12px] text-rose-700">{err}</p>
        </div>
      )}

      {loading && !rows.length ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skel key={i} className="h-14" />)}</div>
      ) : !shown.length ? (
        <Empty msg={q ? `Nobody matching "${q}"` : 'Nobody on the list yet — sync the directory'} icon={Users} />
      ) : (
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
          {shown.map(p => {
            const meta2 = ROLE_META[p.role] || ROLE_META.employee;
            const busy = busyEmail === p.email;
            return (
              <div key={p.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 hover:border-slate-300 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[12.5px] font-black text-slate-800 truncate">{p.name}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ring-1 ${meta2.cls}`}>
                      {meta2.label}
                    </span>
                    {p.source === 'manual' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase ring-1
                                       bg-cyan-50 text-cyan-700 ring-cyan-200">
                        Added here
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-400 truncate">
                    {p.email}
                    {p.department ? ` · ${p.department}` : ''}
                    {p.designation ? ` · ${p.designation}` : ''}
                  </p>
                </div>

                {/* The whole decision in one control: what does this person
                    handle? The server does the add, the change and the
                    removal behind it. */}
                <select disabled={busy} value={p.role}
                  onChange={e => setRole(p, e.target.value as any)}
                  className="shrink-0 px-2 py-1.5 rounded-lg border border-slate-200 bg-white
                             text-[11px] font-bold text-slate-600 disabled:opacity-50">
                  <option value="employee">Employee</option>
                  <option value="admin">Admin — room & item requests</option>
                  <option value="it_support">IT Support — tickets</option>
                </select>

                {p.source === 'manual' && (
                  <button disabled={busy} onClick={() => removePerson(p)}
                    title="Remove — only people added here can be removed"
                    className="shrink-0 p-2 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50
                               disabled:opacity-40 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        <b className="text-slate-500">Admin</b> reviews room bookings and item requests.{' '}
        <b className="text-slate-500">IT Support</b> reviews IT tickets and can log work done.
        Both can be held by several people. The Super Admin is fixed and sees everything.
      </p>
    </Panel>
  );
}

function TeamManage({ session }: { session: Session }) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdmin, setNewAdmin] = useState('');
  const [newScope, setNewScope] = useState<'admin' | 'it_support'>('admin');
  const [employees, setEmployees] = useState<any>({ count: 0 });
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [err, setErr] = useState('');
  // The master comes from the company directory now, not a spreadsheet.
  const [dir, setDir] = useState<any>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [person, setPerson] = useState({ email: '', name: '', employee_code: '',
                                         department: '', designation: '' });

  const loadDirectory = useCallback(async () => {
    const r = await rpFetch(`${API}/employees/sync/`);
    if (r.ok) setDir(await r.json());
  }, []);

  const syncDirectory = async () => {
    setSyncBusy(true); setSyncMsg(''); setErr('');
    try {
      const r = await rpFetch(`${API}/employees/sync/`, { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Sync failed.');
      setSyncMsg(d.message);
      loadEmployees(); loadDirectory();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Sync failed.');
    } finally { setSyncBusy(false); }
  };

  const addPerson = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setSyncMsg('');
    try {
      const r = await rpFetch(`${API}/employees/add/`, {
        method: 'POST', body: JSON.stringify(person),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not add them.');
      setSyncMsg(d.message);
      setPerson({ email: '', name: '', employee_code: '', department: '', designation: '' });
      setAddOpen(false);
      loadEmployees(); loadDirectory();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Could not add them.'); }
  };

  const loadAdmins = useCallback(async () => {
    const r = await rpFetch(`${API}/admins/?email=${encodeURIComponent(session.email)}`);
    if (r.ok) setAdmins((await r.json()).results || []);
  }, [session.email]);
  const loadEmployees = useCallback(async () => {
    const r = await rpFetch(`${API}/employees/?limit=1`);
    setEmployees(await r.json());
  }, []);
  useEffect(() => { loadAdmins(); loadEmployees(); loadDirectory(); },
    [loadAdmins, loadEmployees, loadDirectory]);

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try {
      const r = await rpFetch(`${API}/admins/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email, new_admin_email: newAdmin, scope: newScope }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setNewAdmin(''); loadAdmins();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Failed'); }
  };
  const removeAdmin = async (id: number) => {
    await rpFetch(`${API}/admins/?id=${id}&email=${encodeURIComponent(session.email)}`, { method: 'DELETE' });
    loadAdmins();
  };

  const downloadTemplate = async () => {
    const res = await rpFetch(`${API}/employees/template/`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'AdminPulse_Employee_Template.xlsx';
    document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
  };
  const upload = async (file: File) => {
    setUploadBusy(true); setUploadMsg('');
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('email', session.email);
      const r = await rpFetch(`${API}/employees/upload/`, { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Upload failed');
      setUploadMsg(d.message); loadEmployees();
    } catch (e) { setUploadMsg(e instanceof Error ? e.message : 'Upload failed'); }
    finally { setUploadBusy(false); }
  };

  return (
    <div className="space-y-5">
      {/* Finding the person comes first: this is a decision ABOUT somebody,
          and it used to be made by typing an address from memory. */}
      <PeopleDirectory onRolesChanged={loadAdmins} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <Panel title="Admins & IT Support" icon={Shield} subtitle={`${admins.length} on the roster — Super Admin is fixed`}>
        <form onSubmit={addAdmin} className="flex gap-2 mb-4">
          <input value={newAdmin} onChange={e => setNewAdmin(e.target.value)} placeholder="Their email address"
            className={`flex-1 ${inputCls}`} />
          <select value={newScope} onChange={e => setNewScope(e.target.value as 'admin' | 'it_support')}
            className={`${inputCls} w-auto`}>
            <option value="admin">Admin</option>
            <option value="it_support">IT Support</option>
          </select>
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
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-bold text-slate-800 truncate">{a.email}</p>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ring-1 flex-shrink-0 ${SCOPE_BADGE[a.scope] || SCOPE_BADGE.admin}`}>
                    {SCOPE_LABEL[a.scope] || 'Admin'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">added by {a.added_by || '—'}</p>
              </div>
              <button onClick={() => removeAdmin(a.id)}
                className="p-2 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {!admins.length && <Empty msg="No admins or IT Support added yet" icon={Shield} />}
        </div>
      </Panel>

      <Panel title="Employee Directory" icon={FileSpreadsheet}
        subtitle={`${employees.count || 0} on record` +
          (employees.added_here ? ` · ${employees.added_here} added here` : '')}>

        {/* The master is the company directory, kept in step with HRMS.
            Re-uploading a sheet every time somebody joined or left was work
            for no reason, and the two copies disagreed as soon as either
            changed. */}
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 mb-3">
          <p className="text-[12px] font-black text-slate-700">From the company directory</p>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            {dir
              ? <>{dir.available} people on the company directory
                  {dir.no_email ? `, ${dir.no_email} of them without an email address and so not importable` : ''}.
                  {dir.here_from_directory
                    ? ` ${dir.here_from_directory} are here already.`
                    : ' None are here yet.'}
                  {dir.last_synced_at ? ` Last synced ${fmtDate(dir.last_synced_at.slice(0, 10))}.` : ''}</>
              : 'Checking…'}
          </p>
          <button onClick={syncDirectory} disabled={syncBusy}
            className="rp-sheen w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                       bg-cyan-600 text-white text-[12px] font-black hover:bg-cyan-700
                       disabled:opacity-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${syncBusy ? 'animate-spin' : ''}`} />
            {syncBusy ? 'Syncing…' : 'Sync from the directory'}
          </button>
          <p className="text-[10px] text-slate-400 mt-2">
            Safe to run whenever. It refreshes everyone who came from the directory, marks anyone
            who has left as inactive, and never touches somebody you added by hand.
          </p>
        </div>

        {syncMsg && (
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-[12px] text-emerald-700 font-bold">{syncMsg}</p>
          </div>
        )}

        {/* Somebody who is not in HRMS at all — a contractor, a joiner not on
            the system yet. A sync can never bring these people, which is why
            it must never remove them either. */}
        <button onClick={() => { setAddOpen(o => !o); setErr(''); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-3 rounded-xl
                     border border-slate-200 text-slate-600 text-[12px] font-black hover:bg-slate-50
                     transition-colors">
          <UserPlus className={`w-4 h-4 transition-transform ${addOpen ? 'rotate-45' : ''}`} />
          {addOpen ? 'Cancel' : 'Add someone not in the directory'}
        </button>

        {addOpen && (
          <form onSubmit={addPerson} className="space-y-2 mb-4 rounded-2xl border border-slate-200 p-3">
            <input required value={person.email} placeholder="Email — this is how they sign in"
              onChange={e => setPerson(p2 => ({ ...p2, email: e.target.value }))} className={inputCls} />
            <input required value={person.name} placeholder="Full name"
              onChange={e => setPerson(p2 => ({ ...p2, name: e.target.value }))} className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <input value={person.department} placeholder="Department"
                onChange={e => setPerson(p2 => ({ ...p2, department: e.target.value }))} className={inputCls} />
              <input value={person.designation} placeholder="Designation"
                onChange={e => setPerson(p2 => ({ ...p2, designation: e.target.value }))} className={inputCls} />
            </div>
            <button type="submit"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-black
                         hover:bg-slate-800 transition-colors">
              Add them
            </button>
          </form>
        )}

        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
          Or upload a sheet
        </p>
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
          Tip: put <b className="text-slate-500">"Admin"</b> or <b className="text-slate-500">"IT Support"</b> in
          the Role column to grant that access in the same upload — no need to add them separately
          above. A blank or "Employee" cell never removes existing access.
        </p>
        {uploadMsg && <p className="text-[12px] text-cyan-700 mt-3">{uploadMsg}</p>}
      </Panel>
      </div>
    </div>
  );
}

/* ── Analytics ────────────────────────────────────────────────────────────
   Three things used to leave this page looking broken rather than empty:
   a failed request was fed straight to setData, so a 403 rendered as a grid
   of dashes; the window was fixed at 30 days with no way to widen it; and
   the helpdesk — the busiest part of AdminPulse — was not counted at all.
   Zeroes here now mean zero, and say so against the all-time totals. ───── */
const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
];

function AnalyticsPanel({ session }: { session: Session }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => {
    let live = true;
    setData(null);
    setErr('');
    rpFetch(`${API}/analytics/?days=${days}`)
      .then(async r => {
        const body = await r.json().catch(() => ({}));
        if (!live) return;
        // A non-OK body is an error message, not a report. Rendering it as
        // one is what turned "you do not have permission" into a blank page.
        if (!r.ok) setErr(body.error || `Could not load analytics (${r.status}).`);
        else setData(body);
      })
      .catch(() => { if (live) setErr('Could not reach the server.'); });
    return () => { live = false; };
  }, [session.email, days]);

  const rangePicker = (
    <div className="flex gap-1">
      {RANGES.map(r => (
        <button key={r.days} onClick={() => setDays(r.days)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
            days === r.days ? 'bg-cyan-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-500 hover:border-cyan-300'}`}>
          {r.label}
        </button>
      ))}
    </div>
  );

  if (err) return (
    <Panel title="Analytics" icon={BarChart3} right={rangePicker}>
      <div className="flex items-center gap-2 text-[13px] text-rose-600 font-semibold py-6 justify-center">
        <AlertTriangle className="w-4 h-4" /> {err}
      </div>
    </Panel>
  );
  if (!data) return <Skel className="h-64" />;

  const PALETTE = ['#0891b2', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981', '#ef4444'];
  const tickets = data.tickets || {};
  const totals = data.totals || {};
  const purposeData = (data.by_purpose || []).map((p: any) => ({ name: PURPOSE_LABEL[p.purpose] || p.purpose, value: p.n }));
  const categoryData = (data.resource_requests?.by_category || [])
    .map((c: any) => ({ name: CATEGORY_LABEL[c.category] || c.category, value: c.n }));
  const ticketCatData = (tickets.by_category || [])
    .map((c: any) => ({ name: TICKET_CATEGORY_LABEL[c.category] || c.category, value: c.n }));
  const ticketStatus = Object.entries(tickets.by_status || {}) as [string, number][];

  // Nothing in the window, but something on file: that is a range problem,
  // not an empty system, and the difference is the whole question here.
  const inWindow = (data.total_bookings || 0) + (data.resource_requests?.total || 0) + (tickets.total || 0);
  const allTime = (totals.bookings || 0) + (totals.resource_requests || 0) + (totals.tickets || 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
          Last {data.period_days} days{data.since ? ` · since ${fmtDate(data.since)}` : ''}
        </p>
        {rangePicker}
      </div>

      {!inWindow && allTime > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
          Nothing was raised in the last {data.period_days} days. On file all time:{' '}
          <b>{totals.bookings || 0}</b> bookings, <b>{totals.tickets || 0}</b> tickets,{' '}
          <b>{totals.resource_requests || 0}</b> item requests — widen the range above to see them.
        </div>
      )}
      {!allTime && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-500">
          No bookings, tickets or item requests have been raised yet. This page fills in as people use AdminPulse.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        {[
          { l: 'Total Bookings', v: data.total_bookings, icon: Building2 },
          { l: 'Approval Rate', v: data.approval_rate_pct, suffix: '%', icon: Percent },
          { l: 'Avg. Turnaround', v: data.avg_turnaround_minutes, suffix: 'm', icon: Timer },
          { l: 'Busiest Hour', v: data.busiest_hour !== null && data.busiest_hour !== undefined
              ? `${data.busiest_hour}:00` : '—', icon: TrendingUp, raw: true },
          { l: 'Item Requests', v: data.resource_requests?.total ?? 0, icon: PackageCheck, raw: true,
            sub: `${data.resource_requests?.pending ?? 0} pending` },
          { l: 'Tickets Raised', v: tickets.total ?? 0, icon: Headphones, raw: true,
            sub: `${tickets.open ?? 0} open · ${tickets.logged_directly ?? 0} logged` },
          { l: 'Avg. Fix Time', v: tickets.avg_resolution_minutes, suffix: 'm', icon: History },
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
                  {s.raw ? s.v : (s.v ?? '—')}{!s.raw && s.v !== null && s.v !== undefined && s.suffix}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{s.l}</p>
                {s.sub && <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>}
              </div>
            </Reveal>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {!!data.top_rooms?.length && (
          <Panel title="Top Rooms" icon={Building2}>
            <div className="space-y-2.5">
              {data.top_rooms.map((r: any, i: number) => (
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
            </div>
          </Panel>
        )}

        {!!ticketStatus.length && (
          <Panel title="Tickets by Status" icon={Headphones}>
            <div className="space-y-2.5">
              {ticketStatus.map(([status, n], i) => (
                <div key={status}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="font-bold text-slate-600">{ticketStatusMeta(status).label}</span>
                    <span className="font-black text-slate-800">{n}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="rp-grow h-full rounded-full"
                      style={{ width: `${(n / Math.max(...ticketStatus.map(([, c]) => c), 1)) * 100}%`,
                               background: PALETTE[i % PALETTE.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {!!ticketCatData.length && (
          <Panel title="Ticket Categories" icon={Headphones}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ticketCatData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {ticketCatData.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {!!(tickets.by_priority || []).length && (
          <Panel title="Ticket Priority" icon={AlertTriangle}>
            <div className="space-y-2.5">
              {tickets.by_priority.map((p: any) => {
                const meta = ticketPriorityMeta(p.priority);
                const top = Math.max(...tickets.by_priority.map((x: any) => x.n), 1);
                return (
                  <div key={p.priority}>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className={`font-bold ${meta.text}`}>{meta.label}</span>
                      <span className="font-black text-slate-800">{p.n}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`rp-grow h-full rounded-full ${meta.dot}`}
                        style={{ width: `${(p.n / top) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {!!purposeData.length && (
          <Panel title="Purpose Mix" icon={BarChart3}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={purposeData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {purposeData.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {!!categoryData.length && (
          <Panel title="Item Request Categories" icon={PackageCheck}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {categoryData.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Panel>
        )}
      </div>
    </div>
  );
}
