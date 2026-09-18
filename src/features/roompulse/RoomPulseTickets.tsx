/* Support ticket raising screen — a lightweight IT helpdesk bolted onto
   AdminPulse per the reference mockup supplied. Deliberately its own amber/
   gold palette (matching the mockup, and the rest of the intranet's default
   theme) rather than RoomPulse's usual cyan/violet — this reads as "IT
   support", a different kind of request than a room or a stapler, and the
   warmer palette signals that at a glance.

   No dedicated backend exists for this yet, so tickets are kept in
   localStorage per signed-in email (same pattern as the RoomPulse session
   itself) — real enough to submit, list and refer back to across a reload,
   without inventing server endpoints nobody asked for. */
import { useEffect, useState, type DragEvent } from 'react';
import {
  Headphones, Ticket as TicketIcon, History, ChevronRight, Paperclip,
  RotateCcw, Send, CheckCircle2, Plus, Sparkles, Wifi, X, Clock,
} from 'lucide-react';
import { Reveal, type Session } from './RoomPulseShared';

type Priority = 'low' | 'medium' | 'high' | 'critical';
type TicketStatus = 'open' | 'in_progress' | 'solved';

interface SupportTicket {
  id: string;
  category: string;
  priority: Priority;
  subject: string;
  description: string;
  relatedTo: string;
  attachmentNames: string[];
  status: TicketStatus;
  createdAt: number;
}

const CATEGORY_OPTIONS = [
  'Technical Issue', 'Account / Login Access', 'Bug Report', 'Feature Request', 'Other',
];
const RELATED_TO_OPTIONS = [
  'LAN / Network', 'WiFi', 'Laptop / Desktop', 'Printer / Scanner', 'Email / Outlook',
  'VPN / Remote Access', 'Software Installation', 'Peripherals (Mouse, Keyboard, etc.)', 'Other',
];
const PRIORITY_META: Record<Priority, { label: string; dot: string; text: string }> = {
  low:      { label: 'Low',      dot: 'bg-emerald-500', text: 'text-emerald-600' },
  medium:   { label: 'Medium',   dot: 'bg-amber-500',   text: 'text-amber-600' },
  high:     { label: 'High',     dot: 'bg-orange-500',  text: 'text-orange-600' },
  critical: { label: 'Critical', dot: 'bg-rose-500',    text: 'text-rose-600' },
};
const STATUS_META: Record<TicketStatus, { label: string; cls: string }> = {
  open:        { label: 'Open',        cls: 'bg-amber-50 text-amber-600 ring-amber-200' },
  in_progress: { label: 'In Progress', cls: 'bg-sky-50 text-sky-600 ring-sky-200' },
  solved:      { label: 'Solved',      cls: 'bg-emerald-50 text-emerald-600 ring-emerald-200' },
};

const storeKey = (email: string) => `roompulse_tickets_${email}`;
function loadTickets(email: string): SupportTicket[] {
  try { return JSON.parse(localStorage.getItem(storeKey(email)) || '[]'); } catch { return []; }
}
function saveTickets(email: string, tickets: SupportTicket[]) {
  localStorage.setItem(storeKey(email), JSON.stringify(tickets));
}
function nextTicketId(tickets: SupportTicket[]) {
  const nums = tickets.map(t => Number(t.id.replace('#TKT-', ''))).filter(n => !isNaN(n));
  return `#TKT-${(nums.length ? Math.max(...nums) : 1000) + 1}`;
}
function fmtWhen(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const fieldCls = 'w-full px-3.5 py-2.5 rounded-xl bg-white border border-amber-200/70 text-slate-800 text-sm ' +
  'placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all';
const labelCls = 'block text-[11.5px] font-bold text-slate-600 mb-1.5';

/* ── the drag-and-drop attachment well ──────────────────────────────────── */
function AttachmentWell({ files, onFiles }: { files: File[]; onFiles: (f: File[]) => void }) {
  const [over, setOver] = useState(false);
  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); setOver(false);
    onFiles([...files, ...Array.from(e.dataTransfer.files)]);
  };
  return (
    <div>
      <label className={labelCls}>Attachments <span className="text-slate-400 font-semibold">(optional)</span></label>
      <label
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-1.5 px-4 py-4 rounded-xl border-2 border-dashed
                   cursor-pointer transition-all text-center
                   ${over ? 'border-amber-400 bg-amber-50' : 'border-amber-200/70 bg-amber-50/40 hover:bg-amber-50'}`}>
        <Paperclip className="w-4 h-4 text-amber-500" />
        <p className="text-[11.5px] font-bold text-slate-600">Drag & drop files here or click to upload</p>
        <p className="text-[10px] text-slate-400">(Max 5MB per file)</p>
        <input type="file" multiple className="hidden"
          onChange={e => onFiles([...files, ...Array.from(e.target.files || [])])} />
      </label>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {files.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg bg-amber-50
                                     border border-amber-200 text-[10.5px] font-bold text-amber-700">
              {f.name}
              <button type="button" onClick={() => onFiles(files.filter((_, j) => j !== i))}
                className="p-0.5 rounded hover:bg-amber-200/60 text-amber-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── the create-ticket form itself ──────────────────────────────────────── */
function CreateTicketForm({ session, onSubmitted }: { session: Session; onSubmitted: (t: SupportTicket) => void }) {
  const blank = { category: CATEGORY_OPTIONS[0], priority: 'medium' as Priority, subject: '', description: '', relatedTo: RELATED_TO_OPTIONS[0] };
  const [form, setForm] = useState(blank);
  const [files, setFiles] = useState<File[]>([]);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const reset = () => { setForm(blank); setFiles([]); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) return;
    const tickets = loadTickets(session.email);
    const ticket: SupportTicket = {
      id: nextTicketId(tickets), ...form, attachmentNames: files.map(f => f.name),
      status: 'open', createdAt: Date.now(),
    };
    saveTickets(session.email, [ticket, ...tickets]);
    onSubmitted(ticket);
    reset();
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 3500);
  };

  return (
    <div className="rp-border-flow relative rounded-3xl">
      <div className="relative rounded-3xl bg-gradient-to-br from-amber-50 via-white to-orange-50/60
                      border border-amber-100 shadow-sm p-6 md:p-7 overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full
                                    bg-amber-300/20 blur-[90px]" />
        <div className="relative flex items-start gap-3.5 mb-6">
          <div className="rp-pop-in w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500
                          flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
            <Headphones className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-900">Create a Support Ticket</h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5 leading-relaxed">
              Facing an issue? Let us know! Our IT support team is here to help you resolve it quickly and get you back on track.
            </p>
          </div>
        </div>

        {justSubmitted && (
          <div className="rp-pop-in relative flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200
                          px-4 py-3 mb-5">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" />
            <p className="text-[12.5px] font-bold text-emerald-700">
              Ticket submitted — our team will get back to you shortly.
            </p>
          </div>
        )}

        <form onSubmit={submit} className="relative space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Issue Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={fieldCls}>
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))} className={fieldCls}>
                {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Subject</label>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Enter a short and clear subject" className={fieldCls} />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Please describe your issue in detail (e.g. what you were trying to do, what happened, any error messages, etc.)"
              rows={4} className={`${fieldCls} resize-none`} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Related to</label>
              <div className="relative">
                <Wifi className="w-3.5 h-3.5 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select value={form.relatedTo} onChange={e => setForm(f => ({ ...f, relatedTo: e.target.value }))}
                  className={`${fieldCls} pl-9`}>
                  {RELATED_TO_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <AttachmentWell files={files} onFiles={setFiles} />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button type="button" onClick={reset}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-200 text-amber-700
                         text-[12.5px] font-black hover:bg-amber-50 transition-all">
              <RotateCcw className="w-3.5 h-3.5" />Reset
            </button>
            <button type="submit"
              className="rp-sheen flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r
                         from-amber-500 to-orange-500 text-white text-[12.5px] font-black shadow-lg
                         shadow-amber-500/30 hover:-translate-y-0.5 hover:shadow-xl transition-all">
              <Send className="w-3.5 h-3.5" />Submit Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── right rail: quick help / tracking / history ────────────────────────── */
function SideCard({ icon: Icon, title, children }: { icon: any; title: string; children: any }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-50 via-white to-white border border-amber-100
                    shadow-sm p-5">
      <div className="flex items-center gap-2.5 mb-3.5">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-amber-600" />
        </div>
        <h3 className="text-[13px] font-black text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ── ticket detail — opened by clicking any row in Ticket History / the
   full "view all" list. There's no assigned-agent backend behind this yet,
   so "solving" a ticket just means the signed-in user moving its own status
   along themselves, same as cancelling a room booking or item request
   elsewhere in RoomPulse is self-service rather than routed to someone
   else. */
function TicketDetailModal({ ticket, onClose, onUpdate }: {
  ticket: SupportTicket; onClose: () => void; onUpdate: (t: SupportTicket) => void;
}) {
  const p = PRIORITY_META[ticket.priority];
  return (
    <div className="rp-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}>
      <div className="rp-pop w-full max-w-lg rounded-3xl bg-white border border-amber-100 shadow-2xl
                      max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-amber-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500
                            flex items-center justify-center shadow-md shadow-amber-500/25 flex-shrink-0">
              <Headphones className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900 truncate">{ticket.id}</h3>
              <p className="text-[11px] text-slate-400">{fmtWhen(ticket.createdAt)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ring-1 ${STATUS_META[ticket.status].cls}`}>
              {STATUS_META[ticket.status].label}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 ring-1 ring-slate-200 text-[10px] font-black uppercase text-slate-500">
              <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />{p.label} priority
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 ring-1 ring-amber-200 text-[10px] font-black uppercase text-amber-700">
              {ticket.category}
            </span>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700/70 mb-1">Subject</p>
            <p className="text-sm font-bold text-slate-800">{ticket.subject}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700/70 mb-1">Description</p>
            <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700/70 mb-1">Related to</p>
              <p className="text-[13px] font-bold text-slate-700">{ticket.relatedTo}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700/70 mb-1">Attachments</p>
              {ticket.attachmentNames.length ? (
                <div className="flex flex-wrap gap-1">
                  {ticket.attachmentNames.map(n => (
                    <span key={n} className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700">
                      {n}
                    </span>
                  ))}
                </div>
              ) : <p className="text-[12px] text-slate-400">None</p>}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Update status</p>
            <div className="flex items-center gap-2 flex-wrap">
              {(Object.keys(STATUS_META) as TicketStatus[]).map(st => {
                const meta = STATUS_META[st];
                const active = ticket.status === st;
                return (
                  <button key={st} type="button" onClick={() => onUpdate({ ...ticket, status: st })}
                    className={`px-3.5 py-2 rounded-xl text-[11.5px] font-black transition-all ring-1 ${
                      active ? `${meta.cls} ring-2` : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50'}`}>
                    {st === 'solved' && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TicketsPanel({ session }: { session: Session }) {
  const [tickets, setTickets] = useState<SupportTicket[]>(() => loadTickets(session.email));
  const [viewAll, setViewAll] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  useEffect(() => { setTickets(loadTickets(session.email)); }, [session.email]);

  const updateTicket = (updated: SupportTicket) => {
    setTickets(prev => {
      const next = prev.map(t => (t.id === updated.id ? updated : t));
      saveTickets(session.email, next);
      return next;
    });
    setSelected(updated);
  };

  const onSubmitted = (t: SupportTicket) => setTickets(prev => [t, ...prev]);
  const solvedTickets = tickets.filter(t => t.status === 'solved');
  const recentSolved = solvedTickets.slice(0, historyExpanded ? solvedTickets.length : 3);
  const statusCounts = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    solved: solvedTickets.length,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Reveal className="lg:col-span-2">
        <CreateTicketForm session={session} onSubmitted={onSubmitted} />
      </Reveal>

      <div className="space-y-5">
        <Reveal delay={80}>
          <SideCard icon={History} title="Ticket History">
            <div className="flex items-center justify-between mb-3 -mt-1">
              <p className="text-[12px] text-slate-500 leading-relaxed">
                View your recently solved tickets.
              </p>
              {solvedTickets.length > 3 && (
                <button type="button" onClick={() => setHistoryExpanded(v => !v)}
                  className="text-[11px] font-black text-amber-600 hover:text-amber-700 flex-shrink-0 ml-2">
                  {historyExpanded ? 'Less' : 'View All'}
                </button>
              )}
            </div>
            {!recentSolved.length ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Sparkles className="w-6 h-6 text-amber-200 mb-2" />
                <p className="text-[11.5px] font-semibold text-slate-400">
                  No solved tickets yet — they'll show up here once resolved.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {recentSolved.map(t => (
                  <li key={t.id}>
                    <button type="button" onClick={() => setSelected(t)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg
                                 hover:bg-amber-50 transition-all text-left group">
                      <div className="min-w-0">
                        <span className="text-[11.5px] font-black text-slate-700 truncate">{t.id}</span>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{t.subject}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-500 flex-shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SideCard>
        </Reveal>

        <Reveal delay={140}>
          <SideCard icon={TicketIcon} title="Ticket Tracking">
            <p className="text-[12px] text-slate-500 leading-relaxed mb-3">
              Check the status of your existing tickets.
            </p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(Object.keys(STATUS_META) as TicketStatus[]).map(st => {
                const meta = STATUS_META[st];
                return (
                  <div key={st} className={`rounded-xl px-2 py-2.5 text-center ring-1 ${meta.cls}`}>
                    <p className="text-base font-black tabular-nums">{statusCounts[st]}</p>
                    <p className="text-[9px] font-black uppercase tracking-wide">{meta.label}</p>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={() => setViewAll(v => !v)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-50
                         border border-amber-200 text-amber-700 text-[12px] font-black hover:bg-amber-100 transition-all">
              {viewAll ? 'Hide tickets' : 'View My Tickets'}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </SideCard>
        </Reveal>
      </div>

      {viewAll && (
        <div className="rp-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setViewAll(false)}>
          <div className="rp-pop w-full max-w-2xl max-h-[85vh] rounded-3xl bg-white border border-amber-100
                          shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-amber-100 flex-shrink-0">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-amber-500" />All my tickets
              </h3>
              <button type="button" onClick={() => setViewAll(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              {!tickets.length ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Sparkles className="w-6 h-6 text-amber-200 mb-2" />
                  <p className="text-[12px] font-semibold text-slate-400">
                    No tickets raised yet — submit one and it'll show up here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tickets.map((t, i) => {
                    const s = STATUS_META[t.status];
                    const p = PRIORITY_META[t.priority];
                    return (
                      <Reveal key={t.id} delay={i * 40}>
                        <button type="button" onClick={() => { setSelected(t); setViewAll(false); }}
                          className="w-full flex items-center gap-3 rounded-xl bg-amber-50/40 border border-amber-100 p-3.5
                                     text-left hover:bg-amber-50 hover:border-amber-200 transition-all group">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.dot}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[12px] font-black text-slate-800">{t.id}</span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-black uppercase">{t.category}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1 ${s.cls}`}>{s.label}</span>
                            </div>
                            <p className="text-[12px] font-bold text-slate-700 truncate mt-0.5">{t.subject}</p>
                            <p className="text-[10.5px] text-slate-400 mt-0.5">
                              {t.relatedTo} · <span className={p.text}>{p.label} priority</span> · {fmtWhen(t.createdAt)}
                            </p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-500 flex-shrink-0" />
                        </button>
                      </Reveal>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selected && (
        <TicketDetailModal ticket={selected} onClose={() => setSelected(null)} onUpdate={updateTicket} />
      )}
    </div>
  );
}
