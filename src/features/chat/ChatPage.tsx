/* Messages — one-to-one chat between colleagues.
 *
 * Two panes: the threads you have, and the one you are reading. On a phone
 * only one of them is on screen at a time, because a 320px column split in
 * two is two unusable columns.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check, MessageSquare, Pencil, Search, Send, Trash2, UserPlus, X,
} from 'lucide-react';
import {
  clearThread, deleteMessage, editMessage, findPeople, listConversations, loadMessages,
  markRead, openWith, sendMessage,
  type ChatMessage, type ConversationRow, type Person,
} from './api';
import { byDay, clockTime, listStamp } from './dates';

/* How often to ask for new messages. Four seconds reads as live without
   making 700 people poll a second apart; the browser pauses timers on a
   hidden tab anyway, so an open-but-ignored tab costs nothing. */
const POLL_MS = 4000;

const initials = (name: string) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

/* A stable colour per person, so the same colleague is the same colour on
   every screen and the list is scannable without reading it. */
const TONES = [
  'bg-amber-100 text-amber-700', 'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-teal-100 text-teal-700',
];
const toneFor = (seed: string) => {
  let n = 0;
  for (const ch of seed || '') n = (n * 31 + ch.charCodeAt(0)) % 997;
  return TONES[n % TONES.length];
};

function Avatar({ name, seed, size = 'md' }: { name: string; seed: string; size?: 'md' | 'lg' }) {
  return (
    <span className={`${size === 'lg' ? 'w-11 h-11 text-[13px]' : 'w-10 h-10 text-[12px]'}
      rounded-full flex items-center justify-center font-black flex-shrink-0 ${toneFor(seed)}`}>
      {initials(name)}
    </span>
  );
}

export function ChatPage() {
  const [threads, setThreads] = useState<ConversationRow[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const refreshThreads = useCallback(async () => {
    try {
      const d = await listConversations();
      setThreads(d.conversations);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Messages is not reachable right now.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { void refreshThreads(); }, [refreshThreads]);

  /* Opening a thread: the newest page, then marked read. */
  const open = useCallback(async (id: number) => {
    setActive(id);
    setMessages([]);
    try {
      const d = await loadMessages(id);
      setMessages(d.messages);
      setPerson(d.person);
      await markRead(id);
      void refreshThreads();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That conversation could not be opened.');
    }
  }, [refreshThreads]);

  /* The poll. Asks only for messages newer than the last one on screen, so
     a quiet thread costs an empty array rather than its whole history. */
  const lastId = messages.length ? messages[messages.length - 1].id : 0;
  useEffect(() => {
    if (active === null) {
      const t = setInterval(() => void refreshThreads(), POLL_MS * 2);
      return () => clearInterval(t);
    }
    const t = setInterval(async () => {
      if (document.hidden) return;
      try {
        const d = await loadMessages(active, lastId);
        if (d.messages.length) {
          setMessages(m => [...m, ...d.messages.filter(x => !m.some(y => y.id === x.id))]);
          await markRead(active);
          void refreshThreads();
        }
      } catch { /* a dropped poll is not worth an error on screen */ }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [active, lastId, refreshThreads]);

  const send = async () => {
    const body = draft.trim();
    if (!body || active === null) return;
    setDraft('');
    try {
      const d = await sendMessage(active, body);
      setMessages(m => (m.some(x => x.id === d.message.id) ? m : [...m, d.message]));
      void refreshThreads();
    } catch (e) {
      setDraft(body);   // nothing typed is ever lost to a failed send
      setError(e instanceof Error ? e.message : 'That message was not sent.');
    }
  };

  const startWith = async (p: Person) => {
    setPicking(false);
    try {
      const d = await openWith(p.employee_code);
      await refreshThreads();
      await open(d.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That conversation could not be started.');
    }
  };

  const onDeleted = (m: ChatMessage) => setMessages(ms => ms.map(x => (x.id === m.id ? m : x)));

  return (
    <div className="min-h-full bg-slate-50 px-3 sm:px-5 lg:px-7 py-5">
      <div className="max-w-[1500px] mx-auto">
        <header className="mb-4 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />Messages
            </h1>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Between you and one colleague. Nobody else can read it, administrators included.
            </p>
          </div>
          <button type="button" onClick={() => setPicking(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r
                       from-amber-400 to-orange-500 text-white text-[12.5px] font-black shadow-sm">
            <UserPlus className="w-4 h-4" />New message
          </button>
        </header>

        {error && (
          <p className="mb-3 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3 py-2 text-[12.5px] font-semibold text-rose-700">
            {error}
          </p>
        )}

        <div className="grid lg:grid-cols-[22rem_1fr] gap-4 h-[calc(100vh-13rem)] min-h-[30rem]">
          {/* On a phone the list hides once a thread is open. */}
          <ThreadList threads={threads} active={active} loaded={loaded}
            className={active !== null ? 'hidden lg:flex' : 'flex'}
            onOpen={open} onNew={() => setPicking(true)}
            onClear={async id => { await clearThread(id); if (active === id) setActive(null); void refreshThreads(); }} />

          <section className={`rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden
            flex-col ${active === null ? 'hidden lg:flex' : 'flex'}`}>
            {active === null ? (
              <Empty onNew={() => setPicking(true)} />
            ) : (
              <Thread person={person} messages={messages} draft={draft} setDraft={setDraft}
                onSend={send} onBack={() => setActive(null)}
                onEdit={async (id, body) => { const d = await editMessage(active, id, body); onDeleted(d.message); }}
                onDelete={async id => { const d = await deleteMessage(active, id); onDeleted(d.message); }} />
            )}
          </section>
        </div>
      </div>

      {picking && <PeoplePicker onPick={startWith} onClose={() => setPicking(false)} />}
    </div>
  );
}

function ThreadList({ threads, active, loaded, className, onOpen, onNew, onClear }: {
  threads: ConversationRow[]; active: number | null; loaded: boolean; className: string;
  onOpen: (id: number) => void; onNew: () => void; onClear: (id: number) => void;
}) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const shown = threads.filter(t => !needle || (t.person?.name ?? '').toLowerCase().includes(needle));

  return (
    <aside className={`rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden flex-col ${className}`}>
      <div className="p-3 border-b border-slate-100">
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 ring-1 ring-slate-200
                          focus-within:ring-amber-400">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search your conversations…"
            className="flex-1 bg-transparent text-[12.5px] focus:outline-none" />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {shown.map(t => (
          <div key={t.id} className="group relative">
            <button type="button" onClick={() => onOpen(t.id)}
              className={`w-full flex items-start gap-3 px-3 py-3 text-left transition-colors
                ${active === t.id ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
              <Avatar name={t.person?.name ?? '?'} seed={t.person?.employee_code ?? ''} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <b className="truncate text-[13px] text-slate-900">{t.person?.name ?? 'Unknown'}</b>
                  <span className="ml-auto text-[10.5px] text-slate-400 flex-shrink-0">
                    {listStamp(t.last_message_at)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className={`truncate text-[12px] ${t.unread ? 'text-slate-700 font-bold' : 'text-slate-400'}`}>
                    {t.last_message
                      ? `${t.last_message.mine ? 'You: ' : ''}${t.last_message.deleted ? 'Message deleted' : t.last_message.body}`
                      : 'No messages yet'}
                  </span>
                  {t.unread > 0 && (
                    <span className="ml-auto flex-shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500
                                     text-white text-[10.5px] font-black flex items-center justify-center">
                      {t.unread}</span>
                  )}
                </span>
              </span>
            </button>
            <button type="button" title="Remove from your list" onClick={() => onClear(t.id)}
              className="absolute right-1 top-1 p-1 rounded-lg text-slate-300 opacity-0 group-hover:opacity-100
                         hover:text-rose-500 hover:bg-white transition-opacity">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {loaded && shown.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-[13px] font-bold text-slate-500">
              {threads.length ? 'Nobody matches that.' : 'No conversations yet.'}</p>
            {!threads.length && (
              <button type="button" onClick={onNew}
                className="mt-2 text-[12.5px] font-black text-amber-600 hover:underline">
                Message a colleague
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function Empty({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
        <MessageSquare className="w-8 h-8 text-amber-400" />
      </div>
      <p className="font-black text-slate-600">Pick a conversation</p>
      <p className="text-[12.5px] text-slate-400 mt-1 max-w-xs">
        Or start a new one — you can message any colleague who has been given Messages.
      </p>
      <button type="button" onClick={onNew}
        className="mt-3 px-4 py-2 rounded-xl ring-1 ring-slate-200 text-[12.5px] font-black text-slate-700">
        New message
      </button>
    </div>
  );
}

function Thread({ person, messages, draft, setDraft, onSend, onBack, onEdit, onDelete }: {
  person: Person | null; messages: ChatMessage[]; draft: string; setDraft: (s: string) => void;
  onSend: () => void; onBack: () => void;
  onEdit: (id: number, body: string) => Promise<void>; onDelete: (id: number) => Promise<void>;
}) {
  const foot = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');

  /* Follow the conversation down as it grows, the way every messenger does. */
  useEffect(() => { foot.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);

  return (
    <>
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <button type="button" onClick={onBack} className="lg:hidden p-1 -ml-1 text-slate-400 hover:text-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Avatar name={person?.name ?? '?'} seed={person?.employee_code ?? ''} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-black text-slate-900">{person?.name ?? 'Unknown'}</p>
          <p className="truncate text-[11.5px] text-slate-400">
            {[person?.designation, person?.department].filter(Boolean).join(' · ') || person?.employee_code}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#fcfbf8]">
        {byDay(messages).map(group => (
          <div key={group.label} className="space-y-1.5">
            {/* One heading per day, which is what makes a long thread
                readable at all — see dates.ts for why it is worked out here
                rather than stored. */}
            <div className="flex justify-center sticky top-0 z-10 py-1">
              <span className="px-3 py-1 rounded-full bg-white ring-1 ring-slate-200 text-[10.5px]
                               font-black uppercase tracking-wide text-slate-500 shadow-sm">
                {group.label}
              </span>
            </div>
            {group.items.map(m => (
              <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`group relative max-w-[min(32rem,85%)] rounded-2xl px-3.5 py-2 shadow-sm
                  ${m.mine ? 'bg-amber-500 text-white rounded-br-md' : 'bg-white ring-1 ring-slate-200 rounded-bl-md'}`}>
                  {editing === m.id ? (
                    <form onSubmit={e => { e.preventDefault(); void onEdit(m.id, editDraft).then(() => setEditing(null)); }}
                      className="flex items-center gap-1.5">
                      <input autoFocus value={editDraft} onChange={e => setEditDraft(e.target.value)}
                        className="bg-white/90 text-slate-800 text-[13px] rounded-lg px-2 py-1 w-56 focus:outline-none" />
                      <button type="submit" className="p-1 rounded-lg hover:bg-white/20"><Check className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-white/20">
                        <X className="w-4 h-4" /></button>
                    </form>
                  ) : (
                    <p className={`text-[13.5px] whitespace-pre-wrap break-words
                      ${m.deleted ? 'italic opacity-60' : ''}`}>
                      {m.deleted ? 'This message was deleted' : m.body}
                    </p>
                  )}
                  <p className={`mt-0.5 text-[10px] text-right ${m.mine ? 'text-white/70' : 'text-slate-400'}`}>
                    {m.edited && !m.deleted && 'edited · '}{clockTime(m.sent_at)}
                  </p>

                  {m.mine && !m.deleted && editing !== m.id && (
                    <div className="absolute -left-14 top-1 hidden group-hover:flex gap-0.5">
                      <button type="button" title="Edit"
                        onClick={() => { setEditing(m.id); setEditDraft(m.body); }}
                        className="p-1.5 rounded-lg bg-white ring-1 ring-slate-200 text-slate-400 hover:text-slate-700">
                        <Pencil className="w-3 h-3" /></button>
                      <button type="button" title="Delete" onClick={() => void onDelete(m.id)}
                        className="p-1.5 rounded-lg bg-white ring-1 ring-slate-200 text-slate-400 hover:text-rose-600">
                        <Trash2 className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-center text-[12.5px] text-slate-400 py-10">
            No messages yet. Say hello.
          </p>
        )}
        <div ref={foot} />
      </div>

      <form onSubmit={e => { e.preventDefault(); onSend(); }}
        className="flex items-end gap-2 p-3 border-t border-slate-100 bg-white">
        <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={1}
          placeholder="Write a message…"
          onKeyDown={e => {
            /* Enter sends, Shift+Enter makes a new line — what everybody
               already has in their fingers from every other messenger. */
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
          }}
          className="flex-1 resize-none max-h-32 px-3.5 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200
                     text-[13.5px] text-slate-800 focus:outline-none focus:ring-amber-400" />
        <button type="submit" disabled={!draft.trim()}
          className="p-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white
                     disabled:opacity-40 shadow-sm">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </>
  );
}

function PeoplePicker({ onPick, onClose }: { onPick: (p: Person) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [busy, setBusy] = useState(true);
  const [note, setNote] = useState('');

  useEffect(() => {
    let alive = true;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const d = await findPeople(q);
        if (alive) { setPeople(d.people); setNote(''); }
      } catch (e) {
        if (alive) setNote(e instanceof Error ? e.message : 'Could not load the directory.');
      } finally {
        if (alive) setBusy(false);
      }
    }, 200);   // a beat, so typing a name is not one request per letter
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-4 pt-20"
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search a name, employee ID or department…"
            className="flex-1 text-[13px] focus:outline-none" />
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" /></button>
        </div>
        <div className="max-h-[22rem] overflow-y-auto divide-y divide-slate-50">
          {people.map(p => (
            <button key={p.id} type="button" onClick={() => onPick(p)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-amber-50">
              <Avatar name={p.name} seed={p.employee_code} />
              <span className="min-w-0">
                <b className="block truncate text-[13px] text-slate-900">{p.name}</b>
                <span className="block truncate text-[11.5px] text-slate-400">
                  {[p.employee_code, p.designation, p.department].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          ))}
          {!busy && people.length === 0 && (
            <p className="p-6 text-center text-[12.5px] text-slate-400">
              {note || (q
                ? 'Nobody matches that, among the people who have Messages.'
                : 'Nobody else has been given Messages yet.')}
            </p>
          )}
        </div>
        <p className="px-4 py-2 text-[11px] text-slate-400 border-t border-slate-100">
          Only colleagues who have been given Messages are listed — anyone else could not read what you send.
        </p>
      </div>
    </div>
  );
}

export default ChatPage;
