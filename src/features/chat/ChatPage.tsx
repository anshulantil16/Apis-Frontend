/* Messages — chat between colleagues, one to one or in a group.
 *
 * Two panes: the threads you have, and the one you are reading. On a phone
 * only one of them is on screen at a time, because a 320px column split in
 * two is two unusable columns.
 */
import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import {
  ArrowLeft, Bell, Check, CheckCheck, CornerUpLeft, Loader, LogOut, MessageSquare, Paperclip,
  Pencil, Search, Send, Trash2, UserPlus, Users, X,
} from 'lucide-react';
import {
  ACCEPT, MAX_BYTES, MAX_FILES, addMember, clearThread, createGroup, deleteMessage, editMessage,
  findPeople, leaveGroup, listConversations, loadMessages, markRead, openWith, readableSize,
  sendMessage,
  type ChatMessage, type ConversationRow, type Person, type ThreadPage,
} from './api';
import { AttachmentList, Pending } from './Attachments';
import { askForDesktopAlerts, desktopAlertState, previewsInAlerts, setPreviewsInAlerts } from './alerts';
import { byDay, clockTime, listStamp } from './dates';
import { merge } from './merge';

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

function Avatar({ name, seed, size = 'md', group = false }: {
  name: string; seed: string; size?: 'md' | 'lg'; group?: boolean;
}) {
  const box = size === 'lg' ? 'w-11 h-11 text-[13px]' : 'w-10 h-10 text-[12px]';
  if (group) {
    return (
      <span className={`${box} rounded-full bg-slate-200 text-slate-600 flex items-center
                        justify-center flex-shrink-0`}>
        <Users className="w-4 h-4" />
      </span>
    );
  }
  return (
    <span className={`${box} rounded-full flex items-center justify-center font-black
                      flex-shrink-0 ${toneFor(seed)}`}>
      {initials(name)}
    </span>
  );
}

/* Files chosen anywhere -- the picker, a drop, a paste -- come through
   here, so the same limits apply however they arrived. */
function acceptFiles(incoming: File[], already: File[]): { files: File[]; error: string } {
  const room = MAX_FILES - already.length;
  if (room <= 0) return { files: already, error: `Up to ${MAX_FILES} files at a time.` };
  const tooBig = incoming.find(f => f.size > MAX_BYTES);
  if (tooBig) {
    return {
      files: already,
      error: `${tooBig.name} is ${readableSize(tooBig.size)}. The limit is ${readableSize(MAX_BYTES)}.`,
    };
  }
  return { files: [...already, ...incoming.slice(0, room)], error: '' };
}

export function ChatPage() {
  const [threads, setThreads] = useState<ConversationRow[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [head, setHead] = useState<ThreadPage | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [picking, setPicking] = useState<'direct' | 'group' | 'add' | null>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [find, setFind] = useState('');

  const refreshThreads = useCallback(async () => {
    try {
      setThreads((await listConversations()).conversations);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Messages is not reachable right now.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { void refreshThreads(); }, [refreshThreads]);

  /* The server's clock as of the last answer, which the poll sends back as
     `since`. Held in a ref rather than state so that updating it does not
     re-render the thread four times a minute. */
  const mark = useRef('');
  /* Read inside the interval rather than closed over, so an arriving
     message does not tear down the timer and restart its clock. */
  const seenState = useRef<ChatMessage[]>([]);
  seenState.current = messages;

  const open = useCallback(async (id: number) => {
    setActive(id);
    /* Cleared before the await, not after it.
       
       `active` changes now and the poll restarts against the new thread
       immediately, while this request is still in flight. Leaving the old
       thread's mark in place would let that first tick ask "what changed
       in THIS conversation since I last read THAT one" -- which answers
       with a handful of recent messages and paints them as if they were
       the whole thread. An empty mark makes the poll wait its turn. */
    mark.current = '';
    setMessages([]); setHead(null); setReplyTo(null); setFind(''); setFiles([]);
    try {
      const d = await loadMessages(id);
      mark.current = d.now;
      setHead(d); setMessages(d.messages); setHasMore(d.has_more);
      await markRead(id);
      void refreshThreads();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That conversation could not be opened.');
    }
  }, [refreshThreads]);

  /* Searching replaces what is on screen; clearing the box puts the thread
     back, which is the only way out people look for.
     
     Putting it back has to be done, not just described: without it the
     search results stay on screen and the poll folds live changes into
     them, leaving a thread that is half search hits and half this
     afternoon, in one list, with no way to tell which is which. */
  const wasFinding = useRef(false);
  useEffect(() => {
    if (active === null) return;
    const q = find.trim();
    /* Only a search, or the clearing of one. Without this the effect also
       fires on opening a thread, re-fetching what open() has just read. */
    const restoring = !q && wasFinding.current;
    wasFinding.current = !!q;
    if (!q && !restoring) return;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const d = q ? await loadMessages(active, { q }) : await loadMessages(active);
        if (!alive) return;
        setMessages(d.messages);
        setHasMore(q ? false : d.has_more);
        if (!q) mark.current = d.now;   // live again from this moment
      } catch { /* leave what is on screen */ }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [find, active]);

  /* Everything that changed since the last poll -- arrived, edited or
     deleted -- in one request.
     
     Asking `after: <highest id>` could only ever bring new messages, so a
     message the sender deleted stayed on the reader's screen looking
     normal until they reloaded. Asking by time catches all three.

     The mark is the SERVER's clock, handed back on every answer, so a
     laptop running a minute fast cannot ask about a window that has not
     happened yet and silently miss everything in it. */
  useEffect(() => {
    if (active === null) {
      const t = setInterval(() => void refreshThreads(), POLL_MS * 2);
      return () => clearInterval(t);
    }
    if (find.trim()) return;   // not while reading search results
    const t = setInterval(async () => {
      try {
        if (!mark.current) return;   // the thread has not finished opening
        const fresh = await loadMessages(active, { since: mark.current });
        mark.current = fresh.now;
        if (fresh.truncated) {
          /* More changed than one answer holds -- a tab left open over a
             weekend. The rest cannot be asked for again, so re-read the
             thread rather than carry on from a mark we have not caught
             up to. */
          const page = await loadMessages(active);
          mark.current = page.now;
          setMessages(page.messages); setHasMore(page.has_more);
          await markRead(active);
          void refreshThreads();
          return;
        }
        if (fresh.messages.length) {
          setMessages(prev => merge(prev, fresh.messages));
          if (fresh.messages.some(m => !m.mine && !m.deleted)) await markRead(active);
          void refreshThreads();
          return;
        }
        /* Nothing changed -- but a single tick may have become two, and a
           read mark is not stored on the message, so no `since` can report
           it. Re-read the page only while something of ours is still
           unseen, so a settled thread costs one empty request and no more. */
        if (!seenState.current.some(m => m.mine && !m.seen && !m.deleted)) return;
        const page = await loadMessages(active);
        mark.current = page.now;
        setMessages(prev => (prev.length && page.messages.length
          && prev[prev.length - 1].id === page.messages[page.messages.length - 1].id
          ? page.messages : prev));
      } catch { /* a dropped poll is not worth an error on screen */ }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [active, find, refreshThreads]);

  const send = async () => {
    const body = draft.trim();
    if ((!body && !files.length) || active === null || sending) return;
    const keep = { body, files, replyTo };
    setDraft(''); setFiles([]); setReplyTo(null); setSending(true);
    try {
      const d = await sendMessage(active, body, keep.files, keep.replyTo?.id);
      setMessages(m => (m.some(x => x.id === d.message.id) ? m : [...m, d.message]));
      void refreshThreads();
    } catch (e) {
      // Nothing typed or chosen is lost to a failed send.
      setDraft(keep.body); setFiles(keep.files); setReplyTo(keep.replyTo);
      setError(e instanceof Error ? e.message : 'That message was not sent.');
    } finally {
      setSending(false);
    }
  };

  const startWith = async (p: Person) => {
    setPicking(null);
    try {
      const d = await openWith(p.employee_code);
      await refreshThreads();
      await open(d.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That conversation could not be started.');
    }
  };

  const startGroup = async (title: string, people: Person[]) => {
    setPicking(null);
    try {
      const d = await createGroup(title, people.map(p => p.employee_code));
      await refreshThreads();
      await open(d.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That group could not be created.');
    }
  };

  const replace = (m: ChatMessage) => setMessages(ms => ms.map(x => (x.id === m.id ? m : x)));

  const older = async () => {
    if (active === null || !messages.length) return;
    try {
      const d = await loadMessages(active, { before: messages[0].id });
      setMessages(m => [...d.messages, ...m]);
      setHasMore(d.has_more);
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-full bg-slate-50 px-3 sm:px-5 lg:px-7 py-5">
      <div className="max-w-[1500px] mx-auto">
        <header className="mb-4 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />Messages
            </h1>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Between you and your colleagues. Nobody else can read it, administrators included.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DesktopAlerts />
            <button type="button" onClick={() => setPicking('group')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl ring-1 ring-slate-200
                         bg-white text-[12.5px] font-black text-slate-700 hover:text-amber-700">
              <Users className="w-4 h-4" />New group
            </button>
            <button type="button" onClick={() => setPicking('direct')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r
                         from-amber-400 to-orange-500 text-white text-[12.5px] font-black shadow-sm">
              <UserPlus className="w-4 h-4" />New message
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3 py-2">
            <p className="flex-1 text-[12.5px] font-semibold text-rose-700">{error}</p>
            <button type="button" onClick={() => setError('')} className="text-rose-400 hover:text-rose-700">
              <X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        <div className="grid lg:grid-cols-[22rem_1fr] gap-4 h-[calc(100vh-13rem)] min-h-[30rem]">
          <ThreadList threads={threads} active={active} loaded={loaded}
            className={active !== null ? 'hidden lg:flex' : 'flex'}
            onOpen={open} onNew={() => setPicking('direct')}
            onClear={async id => {
              /* Asked rather than done, because this is now the click that
                 starts a real delete: once everyone in a thread has removed
                 it and nothing new is said, the server destroys it. */
              const t = threads.find(x => x.id === id);
              const who = t?.title || t?.person?.name || 'this conversation';
              if (!window.confirm(
                `Delete your copy of ${who}?\n\n` +
                'It goes from your list, and comes back if they write again. '
                + 'Once everyone in it has deleted it, the messages and files are removed for good.'
              )) return;
              await clearThread(id); if (active === id) setActive(null); void refreshThreads();
            }} />

          <section className={`rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden
            flex-col ${active === null ? 'hidden lg:flex' : 'flex'}`}>
            {active === null || !head ? (
              <Empty onNew={() => setPicking('direct')} loading={active !== null} />
            ) : (
              <Thread
                head={head} messages={messages} hasMore={hasMore} onOlder={older}
                draft={draft} setDraft={setDraft} files={files} setFiles={setFiles}
                replyTo={replyTo} setReplyTo={setReplyTo} sending={sending}
                find={find} setFind={setFind}
                onSend={send} onBack={() => setActive(null)} onError={setError}
                onAddMember={() => setPicking('add')}
                onLeave={async () => {
                  if (!confirm(`Leave "${head.title}"? You will stop seeing new messages.`)) return;
                  await leaveGroup(head.conversation_id);
                  setActive(null); void refreshThreads();
                }}
                onEdit={async (id, body) => replace((await editMessage(head.conversation_id, id, body)).message)}
                onDelete={async id => replace((await deleteMessage(head.conversation_id, id)).message)} />
            )}
          </section>
        </div>
      </div>

      {picking === 'direct' && <PeoplePicker title="New message" onPick={startWith} onClose={() => setPicking(null)} />}
      {picking === 'add' && head && (
        <PeoplePicker title={`Add to ${head.title}`} exclude={head.members.map(m => m.id)}
          onClose={() => setPicking(null)}
          onPick={async p => {
            setPicking(null);
            try {
              await addMember(head.conversation_id, p.employee_code);
              await open(head.conversation_id);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'That person could not be added.');
            }
          }} />
      )}
      {picking === 'group' && <GroupMaker onCreate={startGroup} onClose={() => setPicking(null)} />}
    </div>
  );
}

/* Messages pop up inside the intranet on their own. This is for the case
   that actually matters: the tab sitting in the background while somebody
   works in another one. The browser only ever asks once, so it is offered
   rather than demanded on page load. */
function DesktopAlerts() {
  const [state, setState] = useState(desktopAlertState);
  const [showText, setShowText] = useState(previewsInAlerts);

  if (state !== 'default') {
    /* Once alerts are on, the only thing left to decide is whether a
       desktop notification repeats what was said. It does not by default:
       Windows paints that over a locked or shared screen and keeps it in
       Notification Centre afterwards, where someone who was never given
       Messages can read it. */
    return state === 'granted' ? (
      <span className="hidden sm:inline-flex items-center gap-2.5 text-[11.5px] font-bold text-emerald-600">
        <span className="inline-flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />Desktop alerts on
        </span>
        <label title="Off: the alert says only who wrote. On: it also shows what they said, which Windows will display on a locked or shared screen."
          className="inline-flex items-center gap-1.5 text-slate-500 cursor-pointer font-bold">
          <input type="checkbox" id="chat-alert-previews" checked={showText}
            onChange={e => { setShowText(e.target.checked); setPreviewsInAlerts(e.target.checked); }}
            className="w-3.5 h-3.5 accent-amber-500" />
          Show message text
        </label>
      </span>
    ) : null;
  }
  return (
    <button type="button" onClick={() => void askForDesktopAlerts().then(setState)}
      title="Be told about a message even when this tab is in the background"
      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl ring-1 ring-slate-200
                 bg-white text-[12px] font-black text-slate-600 hover:text-amber-700">
      <Bell className="w-3.5 h-3.5" />Turn on desktop alerts
    </button>
  );
}

function preview(t: ConversationRow) {
  const m = t.last_message;
  if (!m) return 'No messages yet';
  if (m.kind === 'system') return m.body;
  const who = m.mine ? 'You: ' : (t.is_group ? `${m.sender_name.split(' ')[0]}: ` : '');
  if (m.deleted) return `${who}Message deleted`;
  if (!m.body && m.attachments.length) {
    const first = m.attachments[0];
    return `${who}${first.kind === 'image' ? 'Photo' : first.name}`;
  }
  return `${who}${m.body}`;
}

function ThreadList({ threads, active, loaded, className, onOpen, onNew, onClear }: {
  threads: ConversationRow[]; active: number | null; loaded: boolean; className: string;
  onOpen: (id: number) => void; onNew: () => void; onClear: (id: number) => void;
}) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const shown = threads.filter(t => !needle || t.title.toLowerCase().includes(needle));

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
              <Avatar name={t.title} seed={t.person?.employee_code ?? String(t.id)} group={t.is_group} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <b className="truncate text-[13px] text-slate-900">{t.title}</b>
                  <span className="ml-auto text-[10.5px] text-slate-400 flex-shrink-0">
                    {listStamp(t.last_message_at)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className={`truncate text-[12px] ${t.unread ? 'text-slate-700 font-bold' : 'text-slate-400'}`}>
                    {preview(t)}
                  </span>
                  {t.unread > 0 && (
                    <span className="ml-auto flex-shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500
                                     text-white text-[10.5px] font-black flex items-center justify-center">
                      {t.unread}</span>
                  )}
                </span>
              </span>
            </button>
            <button type="button" title="Delete this conversation for me" onClick={() => onClear(t.id)}
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

function Empty({ onNew, loading }: { onNew: () => void; loading: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      {loading ? <Loader className="w-6 h-6 text-amber-400 animate-spin" /> : (
        <>
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
        </>
      )}
    </div>
  );
}

function Thread({
  head, messages, hasMore, onOlder, draft, setDraft, files, setFiles, replyTo, setReplyTo,
  sending, find, setFind, onSend, onBack, onError, onEdit, onDelete, onAddMember, onLeave,
}: {
  head: ThreadPage; messages: ChatMessage[]; hasMore: boolean; onOlder: () => void;
  draft: string; setDraft: (s: string) => void;
  files: File[]; setFiles: (f: File[]) => void;
  replyTo: ChatMessage | null; setReplyTo: (m: ChatMessage | null) => void;
  sending: boolean; find: string; setFind: (s: string) => void;
  onSend: () => void; onBack: () => void; onError: (s: string) => void;
  onEdit: (id: number, body: string) => Promise<void>; onDelete: (id: number) => Promise<void>;
  onAddMember: () => void; onLeave: () => void;
}) {
  const foot = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [dragging, setDragging] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => { if (!find) foot.current?.scrollIntoView({ block: 'end' }); }, [messages.length, find]);

  const take = (incoming: File[]) => {
    const r = acceptFiles(incoming, files);
    setFiles(r.files);
    if (r.error) onError(r.error);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false);
    take(Array.from(e.dataTransfer.files));
  };

  return (
    <>
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <button type="button" onClick={onBack} className="lg:hidden p-1 -ml-1 text-slate-400 hover:text-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Avatar name={head.title} seed={head.person?.employee_code ?? String(head.conversation_id)}
          size="lg" group={head.is_group} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-black text-slate-900">{head.title}</p>
          <button type="button" disabled={!head.is_group} onClick={() => setShowMembers(v => !v)}
            className={`truncate text-[11.5px] text-slate-400 ${head.is_group ? 'hover:text-amber-600' : ''}`}>
            {head.is_group
              ? `${head.members.length} people · see who`
              : ([head.person?.designation, head.person?.department].filter(Boolean).join(' · ')
                 || head.person?.employee_code)}
          </button>
        </div>

        {searching ? (
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 ring-1 ring-amber-300">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input autoFocus value={find} onChange={e => setFind(e.target.value)}
              placeholder="Find in this conversation…"
              className="w-44 bg-transparent text-[12.5px] focus:outline-none" />
            <button type="button" onClick={() => { setFind(''); setSearching(false); }}
              className="text-slate-400 hover:text-slate-700"><X className="w-3.5 h-3.5" /></button>
          </label>
        ) : (
          <button type="button" onClick={() => setSearching(true)} title="Find in this conversation"
            className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50">
            <Search className="w-4 h-4" />
          </button>
        )}
        {head.is_group && (
          <>
            <button type="button" onClick={onAddMember} title="Add somebody"
              className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50">
              <UserPlus className="w-4 h-4" />
            </button>
            <button type="button" onClick={onLeave} title="Leave this group"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50">
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
      </header>

      {showMembers && head.is_group && (
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap gap-1.5">
          {head.members.map(m => (
            <span key={m.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white
                                        ring-1 ring-slate-200 text-[11.5px] font-bold text-slate-600">
              {m.name}
            </span>
          ))}
        </div>
      )}

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#fcfbf8]
          ${dragging ? 'ring-2 ring-inset ring-amber-400 bg-amber-50/60' : ''}`}>
        {dragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <p className="px-4 py-2 rounded-xl bg-white shadow-lg ring-1 ring-amber-200
                          text-[13px] font-black text-amber-700">Drop to attach</p>
          </div>
        )}

        {find.trim() && (
          <p className="text-center text-[11.5px] font-bold text-slate-400">
            {messages.length
              ? `${messages.length} message${messages.length === 1 ? '' : 's'} matching “${find.trim()}”`
              : `Nothing matching “${find.trim()}”`}
          </p>
        )}

        {!find.trim() && hasMore && (
          <div className="flex justify-center">
            <button type="button" onClick={onOlder}
              className="px-3 py-1.5 rounded-full bg-white ring-1 ring-slate-200 text-[11.5px]
                         font-black text-slate-500 hover:text-amber-700">
              Load earlier messages
            </button>
          </div>
        )}

        {byDay(messages).map(group => (
          <div key={`${group.label}-${group.items[0].id}`} className="space-y-1.5">
            {/* One heading per day, which is what makes a long thread
                readable — see dates.ts for why it is worked out here
                rather than stored. */}
            <div className="flex justify-center sticky top-0 z-[5] py-1">
              <span className="px-3 py-1 rounded-full bg-white ring-1 ring-slate-200 text-[10.5px]
                               font-black uppercase tracking-wide text-slate-500 shadow-sm">
                {group.label}
              </span>
            </div>

            {group.items.map(m => m.kind === 'system' ? (
              <p key={m.id} className="text-center text-[11px] font-bold text-slate-400 py-1">{m.body}</p>
            ) : (
              <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`group relative max-w-[min(32rem,85%)] rounded-2xl px-3 py-2 shadow-sm
                  ${m.mine ? 'bg-amber-500 text-white rounded-br-md' : 'bg-white ring-1 ring-slate-200 rounded-bl-md'}`}>

                  {head.is_group && !m.mine && (
                    <p className="text-[11px] font-black text-amber-700 mb-0.5">{m.sender_name}</p>
                  )}

                  {m.reply_to && (
                    <div className={`mb-1.5 rounded-lg px-2 py-1 border-l-2 text-[11.5px]
                      ${m.mine ? 'bg-white/15 border-white/50' : 'bg-slate-50 border-amber-400'}`}>
                      <p className={`font-black ${m.mine ? 'text-white/90' : 'text-amber-700'}`}>
                        {m.reply_to.sender_name}</p>
                      <p className={`truncate ${m.mine ? 'text-white/75' : 'text-slate-500'}`}>
                        {m.reply_to.body}</p>
                    </div>
                  )}

                  {!m.deleted && <AttachmentList items={m.attachments} mine={m.mine} />}

                  {editing === m.id ? (
                    <form onSubmit={e => { e.preventDefault(); void onEdit(m.id, editDraft).then(() => setEditing(null)); }}
                      className="flex items-center gap-1.5">
                      <input autoFocus value={editDraft} onChange={e => setEditDraft(e.target.value)}
                        className="bg-white/90 text-slate-800 text-[13px] rounded-lg px-2 py-1 w-56 focus:outline-none" />
                      <button type="submit" className="p-1 rounded-lg hover:bg-white/20"><Check className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-white/20">
                        <X className="w-4 h-4" /></button>
                    </form>
                  ) : (m.body || m.deleted) ? (
                    <p className={`text-[13.5px] whitespace-pre-wrap break-words
                      ${m.deleted ? 'italic opacity-60' : ''}`}>
                      {m.deleted ? 'This message was deleted' : m.body}
                    </p>
                  ) : null}

                  <p className={`mt-0.5 flex items-center justify-end gap-1 text-[10px]
                    ${m.mine ? 'text-white/70' : 'text-slate-400'}`}>
                    {m.edited && !m.deleted && 'edited · '}{clockTime(m.sent_at)}
                    {m.mine && !m.deleted && (m.seen
                      ? <CheckCheck className="w-3.5 h-3.5" aria-label="Seen" />
                      : <Check className="w-3.5 h-3.5 opacity-70" aria-label="Sent" />)}
                  </p>

                  {!m.deleted && editing !== m.id && (
                    <div className={`absolute top-1 hidden group-hover:flex gap-0.5
                      ${m.mine ? '-left-[4.5rem]' : '-right-[4.5rem]'}`}>
                      <button type="button" title="Reply" onClick={() => setReplyTo(m)}
                        className="p-1.5 rounded-lg bg-white ring-1 ring-slate-200 text-slate-400 hover:text-amber-600">
                        <CornerUpLeft className="w-3 h-3" /></button>
                      {m.mine && (
                        <>
                          <button type="button" title="Edit"
                            onClick={() => { setEditing(m.id); setEditDraft(m.body); }}
                            className="p-1.5 rounded-lg bg-white ring-1 ring-slate-200 text-slate-400 hover:text-slate-700">
                            <Pencil className="w-3 h-3" /></button>
                          <button type="button" title="Delete" onClick={() => void onDelete(m.id)}
                            className="p-1.5 rounded-lg bg-white ring-1 ring-slate-200 text-slate-400 hover:text-rose-600">
                            <Trash2 className="w-3 h-3" /></button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}

        {messages.length === 0 && !find.trim() && (
          <p className="text-center text-[12.5px] text-slate-400 py-10">No messages yet. Say hello.</p>
        )}
        <div ref={foot} />
      </div>

      {replyTo && (
        <div className="flex items-start gap-2 px-3 pt-3">
          <div className="flex-1 min-w-0 rounded-xl bg-slate-50 ring-1 ring-slate-200 border-l-2
                          border-amber-400 px-3 py-1.5">
            <p className="text-[11px] font-black text-amber-700">Replying to {replyTo.sender_name}</p>
            <p className="truncate text-[12px] text-slate-500">
              {replyTo.body || (replyTo.attachments[0]?.name ?? 'Attachment')}</p>
          </div>
          <button type="button" onClick={() => setReplyTo(null)} title="Cancel reply"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      <Pending files={files} onRemove={i => setFiles(files.filter((_, j) => j !== i))} />

      <form onSubmit={e => { e.preventDefault(); onSend(); }}
        className="flex items-end gap-2 p-3 border-t border-slate-100 bg-white">
        <input ref={picker} type="file" multiple accept={ACCEPT} className="hidden"
          onChange={e => { take(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <button type="button" onClick={() => picker.current?.click()} title="Attach a photo or file"
          className="p-2.5 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50">
          <Paperclip className="w-4 h-4" />
        </button>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={1}
          placeholder="Write a message…"
          onPaste={e => {
            /* A screenshot off the clipboard is the commonest attachment in
               a work chat, and nobody saves it to a file first. */
            const pasted = Array.from(e.clipboardData.files);
            if (pasted.length) { e.preventDefault(); take(pasted); }
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
          }}
          className="flex-1 resize-none max-h-32 px-3.5 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200
                     text-[13.5px] text-slate-800 focus:outline-none focus:ring-amber-400" />
        <button type="submit" disabled={(!draft.trim() && !files.length) || sending}
          className="p-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white
                     disabled:opacity-40 shadow-sm">
          {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </>
  );
}

function usePeople(q: string) {
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
  return { people, busy, note };
}

function PeopleRow({ p, onClick, right }: { p: Person; onClick: () => void; right?: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-amber-50">
      <Avatar name={p.name} seed={p.employee_code} />
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[13px] text-slate-900">{p.name}</b>
        <span className="block truncate text-[11.5px] text-slate-400">
          {[p.employee_code, p.designation, p.department].filter(Boolean).join(' · ')}
        </span>
      </span>
      {right}
    </button>
  );
}

function Sheet({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-4 pt-20"
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <p className="flex-1 text-[13px] font-black text-slate-800">{title}</p>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" /></button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}

function PeoplePicker({ title, onPick, onClose, exclude = [] }: {
  title: string; onPick: (p: Person) => void; onClose: () => void; exclude?: number[];
}) {
  const [q, setQ] = useState('');
  const { people, busy, note } = usePeople(q);
  const shown = people.filter(p => !exclude.includes(p.id));

  return (
    <Sheet title={title} onClose={onClose}
      footer={<p className="px-4 py-2 text-[11px] text-slate-400 border-t border-slate-100">
        Only colleagues who have been given Messages are listed — anyone else could not read what you send.
      </p>}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
        <Search className="w-4 h-4 text-slate-400" />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search a name, employee ID or department…"
          className="flex-1 text-[13px] focus:outline-none" />
      </div>
      <div className="max-h-[22rem] overflow-y-auto divide-y divide-slate-50">
        {shown.map(p => <PeopleRow key={p.id} p={p} onClick={() => onPick(p)} />)}
        {!busy && shown.length === 0 && (
          <p className="p-6 text-center text-[12.5px] text-slate-400">
            {note || (q ? 'Nobody matches that, among the people who have Messages.'
                        : 'Nobody else has been given Messages yet.')}
          </p>
        )}
      </div>
    </Sheet>
  );
}

function GroupMaker({ onCreate, onClose }: {
  onCreate: (title: string, people: Person[]) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [q, setQ] = useState('');
  const [chosen, setChosen] = useState<Person[]>([]);
  const { people, busy } = usePeople(q);
  const has = (p: Person) => chosen.some(c => c.id === p.id);

  return (
    <Sheet title="New group" onClose={onClose}
      footer={
        <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100">
          <p className="flex-1 text-[11.5px] text-slate-400">
            {chosen.length ? `${chosen.length} chosen` : 'Pick at least one colleague'}
          </p>
          <button type="button" disabled={!title.trim() || !chosen.length}
            onClick={() => onCreate(title.trim(), chosen)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white
                       text-[12.5px] font-black disabled:opacity-40">
            Create group
          </button>
        </div>
      }>
      <div className="px-4 py-3 border-b border-slate-100 space-y-2">
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
          placeholder="Group name — e.g. Sales Huddle"
          className="w-full px-3 py-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-[13px]
                     focus:outline-none focus:ring-amber-400" />
        {chosen.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chosen.map(p => (
              <button key={p.id} type="button" onClick={() => setChosen(c => c.filter(x => x.id !== p.id))}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-amber-50
                           ring-1 ring-amber-200 text-[11.5px] font-bold text-amber-800">
                {p.name}<X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Add colleagues…"
            className="flex-1 text-[13px] focus:outline-none py-1" />
        </div>
      </div>
      <div className="max-h-[18rem] overflow-y-auto divide-y divide-slate-50">
        {people.map(p => (
          <PeopleRow key={p.id} p={p}
            onClick={() => setChosen(c => (has(p) ? c.filter(x => x.id !== p.id) : [...c, p]))}
            right={has(p)
              ? <Check className="w-4 h-4 text-amber-600 flex-shrink-0" />
              : <span className="w-4 h-4 rounded-full ring-1 ring-slate-300 flex-shrink-0" />} />
        ))}
        {!busy && people.length === 0 && (
          <p className="p-6 text-center text-[12.5px] text-slate-400">Nobody matches that.</p>
        )}
      </div>
    </Sheet>
  );
}

export default ChatPage;
