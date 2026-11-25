/* Birthday and work-anniversary wishes.
 *
 * The dashboard has always shown whose birthday is coming up. This is the
 * other half: a button on each of those rows, and the wish landing on the
 * person's own dashboard on the day.
 *
 * Everything about WHEN a wish is visible is decided by the server, which
 * files it against the day it is for and only ever returns rows dated today
 * (see accounts/wishes.py). Nothing in here holds a wish back or expires one
 * — this file polls and renders. That matters: if the UI also had an opinion
 * about dates, a tab left open overnight would be showing yesterday's
 * greetings against today's.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Cake, Check, Gift, PartyPopper, Send, Sparkles, X } from 'lucide-react';
import { portalFetch } from '../portal/session';

export type Occasion = 'birthday' | 'anniversary';

export interface Wish {
  id: number;
  from: string;
  department: string;
  occasion: Occasion;
  message: string;
  has_message: boolean;
  seen: boolean;
}

export interface MyOccasion {
  occasion: Occasion;
  /* Only ever set on an anniversary — "5 years today" is the point of one. */
  years: number | null;
}

/* Who a wish can be addressed to. The celebrations feed carries `id` for
   exactly this; it deliberately does not carry employee codes. */
export interface Wishable {
  id?: number;
  name: string;
  wished?: boolean;
  is_me?: boolean;
}

/* Three minutes. A wish is not a message — nobody is waiting on a reply — but
   on your own birthday the count going up through the morning is most of the
   pleasure of it, so this is faster than it strictly needs to be. */
const POLL_MS = 180_000;

export async function sendWish(to: number, occasion: Occasion, message: string) {
  const r = await portalFetch('/wishes/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, occasion, message }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'That did not send. Try again.');
  return d as { arrives_on: string; arrives_today: boolean; to: string };
}

/* What has arrived for me, and whether today is my own day.
 *
 * Polls rather than subscribing, like the chat alerts beside it in the shell.
 * Also re-asks when the tab is brought back to the front, so somebody opening
 * the intranet at 9am on their birthday does not wait for the next tick. */
export function useMyWishes(enabled = true) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [unseen, setUnseen] = useState(0);
  const [mine, setMine] = useState<MyOccasion[]>([]);
  const running = useRef(false);

  const load = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const r = await portalFetch('/wishes/');
      if (!r.ok) return;
      const d = await r.json();
      setWishes(d.wishes || []);
      setUnseen(d.unseen || 0);
      setMine(d.my_occasions || []);
    } catch {
      /* A dropped poll is not worth telling anybody about; the next one runs. */
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) { setWishes([]); setUnseen(0); setMine([]); return; }
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    const wake = () => { if (!document.hidden) void load(); };
    document.addEventListener('visibilitychange', wake);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', wake); };
  }, [enabled, load]);

  /* Clears the dot on the bell. It does NOT hide the wishes — they are yours
     for the rest of the day. */
  const markSeen = useCallback(async () => {
    if (!unseen) return;
    setUnseen(0);
    setWishes(w => w.map(x => ({ ...x, seen: true })));
    try {
      await portalFetch('/wishes/seen/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
    } catch { /* the dot comes back on the next poll; nothing is lost */ }
  }, [unseen]);

  return { wishes, unseen, myOccasions: mine, markSeen, refresh: load };
}

const LABEL: Record<Occasion, string> = {
  birthday: 'birthday',
  anniversary: 'work anniversary',
};

/* A few openers, so sending something personal is one tap more than sending
   nothing. Deliberately short and plain — a suggestion nobody would be
   embarrassed to have sent under their own name. */
const SUGGESTIONS: Record<Occasion, string[]> = {
  birthday: [
    'Happy birthday! Have a great year ahead.',
    'Many happy returns of the day!',
    'Wishing you a wonderful birthday.',
  ],
  anniversary: [
    'Congratulations on the milestone!',
    'Happy work anniversary — here is to many more.',
    'Great to have you on the team.',
  ],
};

/* ── the button that sits on every celebration row ──────────────────────── */
export function WishButton({ person, occasion, size = 'sm' }: {
  person: Wishable; occasion: Occasion; size?: 'sm' | 'md';
}) {
  /* Seeded from the server's `wished`, then owned here: the celebrations feed
     is fetched once and shared by four render sites, so re-fetching it to flip
     one button would reload all four. The server is asked again on the next
     page load and is the authority. */
  const [sent, setSent] = useState(!!person.wished);
  const [open, setOpen] = useState(false);

  /* Your own row. You are on the card too, and a button offering to wish
     yourself reads as a bug. */
  if (person.is_me || !person.id) return null;

  const pad = size === 'md' ? 'px-3 py-1.5 text-[11.5px]' : 'px-2 py-1 text-[10px]';

  if (sent) {
    return (
      <span title="You have already wished them"
        className={`${pad} inline-flex items-center gap-1 rounded-lg font-black
                    bg-emerald-50 text-emerald-600 flex-shrink-0 cursor-default`}>
        <Check className={size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />Wished
      </span>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        title={`Send ${person.name} a ${LABEL[occasion]} wish`}
        className={`${pad} inline-flex items-center gap-1 rounded-lg font-black flex-shrink-0
                    bg-amber-500 text-white hover:bg-amber-600 active:scale-95 transition-all`}>
        <Gift className={size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />Wish
      </button>
      {open && (
        <WishComposer person={person} occasion={occasion}
          onClose={() => setOpen(false)} onSent={() => { setSent(true); setOpen(false); }} />
      )}
    </>
  );
}

/* ── the compose box ────────────────────────────────────────────────────── */
function WishComposer({ person, occasion, onClose, onSent }: {
  person: Wishable; occasion: Occasion; onClose: () => void; onSent: () => void;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await sendWish(person.id!, occasion, message);
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not send.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label={`Send ${person.name} a wish`}
        className="ih-palette-in w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-full bg-amber-50 text-amber-500 flex items-center
                             justify-center flex-shrink-0">
              {occasion === 'birthday' ? <Cake className="w-4 h-4" /> : <PartyPopper className="w-4 h-4" />}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-black text-slate-800 truncate">{person.name}</p>
              <p className="text-[10.5px] text-slate-400 capitalize">{LABEL[occasion]} wish</p>
            </div>
          </div>
          <button onClick={onClose} title="Close"
            className="p-1 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-4">
          {SUGGESTIONS[occasion].map(s => (
            <button key={s} type="button" onClick={() => setMessage(s)}
              className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 bg-slate-100
                         hover:bg-amber-50 hover:text-amber-600 transition-colors text-left">
              {s.length > 34 ? `${s.slice(0, 32)}…` : s}
            </button>
          ))}
        </div>

        <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 280))}
          rows={3} maxLength={280} autoFocus
          placeholder="Add a line of your own (optional)"
          className="mt-2.5 w-full rounded-xl border border-slate-200 p-3 text-[12.5px] text-slate-700
                     placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-200
                     focus:border-amber-300 resize-none" />

        <div className="flex items-center justify-between mt-1">
          {/* Said plainly, because it is the one surprising thing about the
              feature: an early wish waits for the day rather than arriving now. */}
          <p className="text-[10px] text-slate-400">
            Arrives on their {LABEL[occasion]}.
          </p>
          <p className="text-[10px] text-slate-300 tabular-nums">{message.length}/280</p>
        </div>

        {error && <p className="mt-2 text-[11px] font-bold text-rose-600">{error}</p>}

        <button type="button" onClick={submit} disabled={busy}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500
                     px-4 py-2.5 text-[12.5px] font-black text-white hover:bg-amber-600
                     disabled:opacity-60 transition-all">
          <Send className="w-3.5 h-3.5" />{busy ? 'Sending…' : message.trim() ? 'Send wish' : 'Send wish without a note'}
        </button>
      </div>
    </div>
  );
}

/* ── the banner on your own day ─────────────────────────────────────────── */
/* The bell is easy to miss, and being wished is the entire point of the
   feature. On the one or two days a year this renders, it is the first thing
   on the dashboard. */
export function MyCelebrationBanner({ occasions, wishes, name, onOpen }: {
  occasions: MyOccasion[]; wishes: Wish[]; name: string; onOpen: () => void;
}) {
  if (occasions.length === 0) return null;

  const first = occasions[0];
  const anniversary = occasions.find(o => o.occasion === 'anniversary');
  const birthday = occasions.find(o => o.occasion === 'birthday');

  /* Both on one day happens, and "Happy Birthday" alone would be throwing
     away the better half of it. */
  const heading = birthday && anniversary
    ? `Happy birthday, and ${anniversary.years} years with us!`
    : birthday
      ? `Happy birthday, ${name.split(' ')[0]}!`
      : `${anniversary?.years} ${anniversary?.years === 1 ? 'year' : 'years'} with APIS today!`;

  const n = wishes.length;

  return (
    <div className="ih-reveal relative overflow-hidden rounded-2xl p-5
                    bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 shadow-lg">
      <Sparkles className="absolute -right-4 -top-4 w-28 h-28 text-white/15" aria-hidden />
      <div className="relative flex items-center gap-4 flex-wrap">
        <span className="w-11 h-11 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
          {first.occasion === 'birthday'
            ? <Cake className="w-5 h-5 text-white" />
            : <PartyPopper className="w-5 h-5 text-white" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-black text-white leading-tight">{heading}</p>
          <p className="text-[12px] text-white/85 mt-0.5">
            {n === 0
              ? 'Wishes from your colleagues will appear here through the day.'
              : `${n} ${n === 1 ? 'colleague has' : 'colleagues have'} wished you today.`}
          </p>
        </div>
        {n > 0 && (
          <button type="button" onClick={onOpen}
            className="px-3.5 py-2 rounded-xl bg-white text-amber-600 text-[11.5px] font-black
                       hover:bg-amber-50 active:scale-95 transition-all flex-shrink-0">
            Read {n === 1 ? 'it' : 'them'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── the list of what arrived, behind the banner's button ───────────────── */
export function MyWishesPopup({ wishes, onClose }: { wishes: Wish[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label="Your wishes"
        className="ih-palette-in w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white
                   shadow-2xl ring-1 ring-black/5">
        <div className="sticky top-0 flex items-center justify-between gap-3 px-6 py-4 border-b
                        border-slate-100 bg-white/95 backdrop-blur-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5" />Your wishes today
          </p>
          <button onClick={onClose} title="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="p-6 pt-4 space-y-2">
          {wishes.length === 0 && (
            <p className="text-sm text-slate-400 py-6 text-center">Nothing yet today.</p>
          )}
          {wishes.map(w => (
            <div key={w.id} className="flex items-start gap-3 rounded-xl bg-slate-50/70 p-3">
              <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center
                               justify-center flex-shrink-0 text-[11px] font-black">
                {w.from.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-black text-slate-800 truncate">{w.from}</p>
                {w.department && <p className="text-[10px] text-slate-400 truncate">{w.department}</p>}
                <p className="text-[12.5px] text-slate-600 mt-1 break-words">{w.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── rows for the bell dropdown in the shell ────────────────────────────── */
export function WishNotifications({ wishes }: { wishes: Wish[] }) {
  if (wishes.length === 0) return null;
  return (
    <div className="-mx-1 mt-1 divide-y divide-slate-50">
      {wishes.map(w => (
        <div key={w.id} className="flex items-start gap-2.5 px-2 py-2.5">
          <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center
                           justify-center flex-shrink-0">
            {w.occasion === 'birthday' ? <Cake className="w-3.5 h-3.5" /> : <PartyPopper className="w-3.5 h-3.5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-black text-slate-800">
              {w.from} wished you
            </span>
            <span className="block text-[11.5px] text-slate-500 line-clamp-2">{w.message}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
