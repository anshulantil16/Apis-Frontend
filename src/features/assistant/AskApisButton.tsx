/* "Ask APIS" — the help assistant, a bee in the bottom-right corner of every
 * page that opens into a chat.
 *
 * A preview for trying the idea out: questions are answered from guides kept
 * here in the browser (guides.ts), the APIS Tree and the holiday list, not a
 * guide library on the server. Matching is by keyword — no AI, nothing sent
 * anywhere — which is how the real one is planned to work too. The short
 * "typing" pause before each answer is only there so the reply reads like a
 * reply; the answer itself is ready straight away. */
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight, BookOpen, Calculator, CalendarDays, ChevronRight, ExternalLink, FileText, Laptop, Lightbulb,
  Minus, Network, Receipt, RotateCcw, SendHorizontal, Sparkles, ThumbsDown, ThumbsUp, TreePalm, UserRound,
  Users, X, Zap,
} from 'lucide-react';
import type { ShellView } from '../home/IntranetShell';
import { GUIDES, SUGGESTIONS, type Guide } from './guides';
import { sendIntent } from './intent';
import { quickLinks, type QuickLink } from './links';
import { searchPeople, type PersonHit } from './people';
import { HolidayAnswer } from './HolidayAnswer';
import { isHolidayQuestion } from './holidays';
import { BeeMascot } from './BeeMascot';
import { ASK_APIS_STYLES } from './askApisStyles';

/* Words that say nothing about which tool is meant. */
const STOP_WORDS = new Set(['a', 'an', 'the', 'i', 'my', 'me', 'to', 'do', 'does', 'how', 'what', 'is', 'are',
  'can', 'for', 'of', 'in', 'on', 'and', 'or', 'with', 'please', 'want', 'need', 'should', 'where', 'when',
  'which', 'am', 'be', 'get', 'go', 'from', 'at', 'this', 'that', 'some', 'any', 'you', 'we']);

/* "bookings" and "booking" both find "book"; "claims" finds "claim". Crude,
   but enough for the words people type at a help box. */
function stem(w: string) {
  return w.replace(/(ings|ing|es|s|ed)$/, '') || w;
}

const INDEX = GUIDES.map(g => ({
  g,
  words: new Set([...g.keywords, ...(g.title.toLowerCase().match(/[a-z0-9]+/g) ?? [])].map(stem)),
}));

function termsOf(query: string) {
  return (query.toLowerCase().replace(/[’']/g, '').match(/[a-z0-9]+/g) ?? [])
    .filter(w => !STOP_WORDS.has(w)).map(stem);
}

function search(query: string): Guide[] {
  const terms = termsOf(query);
  if (terms.length === 0) return [];
  return INDEX
    .map(({ g, words }) => ({ g, score: terms.filter(t => words.has(t)).length }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.g);
}

/* Links whose name (or another name for it) is in the question, best first. */
function searchLinks(query: string, links: QuickLink[]): QuickLink[] {
  const terms = termsOf(query);
  if (terms.length === 0) return [];
  return links
    .map(l => {
      const words = new Set([...(l.label.toLowerCase().match(/[a-z0-9]+/g) ?? []), ...l.also].map(stem));
      return { l, score: terms.filter(t => words.has(t)).length };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(r => r.l);
}

const GROUPS = Array.from(new Set(GUIDES.map(g => g.group)));

/* Everything one question found. */
interface Answer {
  guide?: Guide;
  more: Guide[];
  links: QuickLink[];
  people: PersonHit[];
  holiday: boolean;
}

function answerFor(text: string, links: QuickLink[], forced?: Guide): Answer {
  if (forced) return { guide: forced, more: [], links: [], people: [], holiday: false };
  const guides = search(text);
  return {
    guide: guides[0], more: guides.slice(1, 3), links: searchLinks(text, links),
    people: searchPeople(text), holiday: isHolidayQuestion(text),
  };
}

/* The line the bee answers with, above whatever it found. */
function leadFor(a: Answer): string {
  if (a.people.length === 1) return `That’s ${a.people[0].name} — here are the details 👇`;
  if (a.people.length > 1) return `I found ${a.people.length} people who match 👇`;
  if (a.holiday) return 'Here are the holidays for your zone 🗓️';
  if (a.guide) {
    const t = a.guide.title;
    return /^I |not arriving/.test(t)
      ? 'Let’s sort that out — here’s what to do:'
      : `Sure! Here’s how to ${t.charAt(0).toLowerCase()}${t.slice(1).replace(/\bmy\b/g, 'your')}:`;
  }
  if (a.links.length) return 'You can open it right from here 👇';
  return 'Hmm, I don’t have a guide for that yet 🤔';
}

interface Message {
  id: number;
  from: 'user' | 'bot';
  text: string;
  at: number;
  /* Bot messages: still "typing" until the answer is shown. */
  typing?: boolean;
  query?: string;
  answer?: Answer;
}

/* Icons for the starting suggestions, by their text in guides.ts. */
const SUGGESTION_LOOK: Record<string, { icon: ReactNode; tile: string }> = {
  'My laptop is not working': { icon: <Laptop className="w-4 h-4" />, tile: 'bg-amber-100 text-amber-700' },
  'Book a meeting room': { icon: <Users className="w-4 h-4" />, tile: 'bg-teal-100 text-teal-700' },
  'Claim travel expenses': { icon: <Receipt className="w-4 h-4" />, tile: 'bg-violet-100 text-violet-700' },
  'Read the leave policy': { icon: <FileText className="w-4 h-4" />, tile: 'bg-sky-100 text-sky-700' },
  'Apply for leave': { icon: <CalendarDays className="w-4 h-4" />, tile: 'bg-emerald-100 text-emerald-700' },
  'Make a CTC break-up': { icon: <Calculator className="w-4 h-4" />, tile: 'bg-purple-100 text-purple-700' },
  'Who is the HR head?': { icon: <UserRound className="w-4 h-4" />, tile: 'bg-rose-100 text-rose-700' },
  'Next holiday': { icon: <TreePalm className="w-4 h-4" />, tile: 'bg-orange-100 text-orange-700' },
};
const DEFAULT_LOOK = { icon: <Sparkles className="w-4 h-4" />, tile: 'bg-amber-100 text-amber-700' };

const NUDGE_KEY = 'ask_apis_nudged';

function greetingWord() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const clock = (at: number) => new Date(at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/* Only ever called from click handlers; kept out of the component so the
   linter doesn't take it for a clock read during render. */
const stamp = () => Date.now();

/* Types `text` out a few letters at a time, the way the bee "says" it.
   It starts over each time it is shown, by being mounted again. */
function TypedText({ text }: { text: string }) {
  const [shown, setShown] = useState(() =>
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? text.length : 0));
  useEffect(() => {
    const t = window.setInterval(() => setShown(n => {
      if (n >= text.length) { window.clearInterval(t); return n; }
      return n + 2;
    }), 28);
    return () => window.clearInterval(t);
  }, [text]);
  return <>{text.slice(0, shown)}{shown < text.length && <span className="aa-caret" />}</>;
}

export function AskApisButton({ onNavigate, canOpen = () => true, userName }: {
  onNavigate?: (view: ShellView) => void;
  /* The sidebar's access check, so only tools this person can open are offered. */
  canOpen?: (id: string) => boolean;
  /* For the greeting; the bee says plain "Hi there" without it. */
  userName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [browsing, setBrowsing] = useState(false);
  const [feedback, setFeedback] = useState<Record<number, 'up' | 'down'>>({});
  const [nudge, setNudge] = useState(false);
  const allLinks = useMemo(() => quickLinks(canOpen), [canOpen]);
  const timers = useRef<number[]>([]);
  const nextId = useRef(1);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const firstName = userName?.trim().split(/\s+/)[0];
  const greeting = `${firstName ? `${greetingWord()}, ${firstName}!` : 'Hi there!'} 👋`;
  const intro = 'I’m your APIS intranet assistant. Ask me anything about the intranet…';
  const atStart = messages.length === 0 && !browsing;
  const busy = messages.some(m => m.typing);

  /* What the box would find for the words typed so far - links open
     straight away, the rest becomes a question. */
  const live = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return null;
    return {
      links: searchLinks(q, allLinks).slice(0, 2),
      people: searchPeople(q).slice(0, 2),
      guides: search(q).slice(0, 3),
    };
  }, [query, allLinks]);
  const liveCount = live ? live.links.length + live.people.length + live.guides.length : 0;

  const clearTimers = () => { timers.current.forEach(t => window.clearTimeout(t)); timers.current = []; };
  useEffect(() => clearTimers, []);

  /* Once a session, a little "need a hand?" from the bee a few seconds in. */
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(NUDGE_KEY) === '1'; } catch { /* show it anyway */ }
    if (seen) return;
    const show = window.setTimeout(() => setNudge(true), 4000);
    const hide = window.setTimeout(() => setNudge(false), 13000);
    try { sessionStorage.setItem(NUDGE_KEY, '1'); } catch { /* not remembered */ }
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, []);

  /* Keep the newest message in view. */
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  /* Esc tucks the panel away, keeping the conversation. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = (text: string, forced?: Guide) => {
    const q = text.trim();
    if (!q) return;
    const now = stamp();
    const userId = nextId.current++, botId = nextId.current++;
    setBrowsing(false);
    setQuery('');
    setMessages(ms => [...ms,
      { id: userId, from: 'user', text: q, at: now },
      { id: botId, from: 'bot', text: '', at: now, typing: true, query: q },
    ]);
    const answer = answerFor(q, allLinks, forced);
    const delay = 550 + Math.min(q.length * 12, 600);
    timers.current.push(window.setTimeout(() => {
      setMessages(ms => ms.map(m => (m.id === botId
        ? { ...m, typing: false, text: leadFor(answer), answer, at: stamp() } : m)));
    }, delay));
    input.current?.focus();
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); send(query); };
  const newChat = () => { clearTimers(); setMessages([]); setQuery(''); setBrowsing(false); setFeedback({}); };
  /* The cross ends the conversation, so the panel reopens on its starting
     view; minimise keeps it. */
  const close = () => { setOpen(false); newChat(); };
  const openTool = (view: ShellView) => { onNavigate?.(view); setOpen(false); };
  /* Open the tool on the exact form the guide is about. The action is queued
     first, so the page finds it waiting when it opens. */
  const runAction = (g: Guide) => {
    if (g.action) sendIntent(g.action.intent);
    openTool(g.tool);
  };
  const openLink = (l: QuickLink) => {
    if (l.href) window.open(l.href, '_blank', 'noopener,noreferrer');
    else if (l.view) openTool(l.view);
  };
  const toggle = () => { setNudge(false); setOpen(o => !o); };

  return (
    <div className="fixed bottom-5 right-5 z-[90] flex flex-col items-end gap-4">
      <style>{ASK_APIS_STYLES}</style>

      {open && (
        <div className="aa-panel-in relative w-[min(25.5rem,calc(100vw-2.5rem))] mt-12">
          {/* The bee, peeking over the top-left corner. */}
          <div className="absolute -top-14 -left-3 z-20 pointer-events-none drop-shadow-[0_6px_10px_rgba(180,110,0,.35)]">
            <BeeMascot size={112} waving={atStart} busy={busy} />
          </div>
          {/* A second, tiny bee buzzing about on the right edge. */}
          <div className="aa-buzz absolute top-44 -right-4 z-20 pointer-events-none">
            <BeeMascot size={30} />
          </div>
          {/* Honeycomb cells on the bottom-left corner. */}
          <svg aria-hidden viewBox="0 0 60 52" className="absolute -left-4 bottom-16 w-14 z-20 pointer-events-none">
            {[[15, 13], [37, 13], [26, 32]].map(([x, y], i) => (
              <path key={i} d={`M${x} ${y - 11}l10 5.5v11l-10 5.5l-10-5.5v-11z`}
                fill={i === 2 ? '#FFC83D' : '#FFD970'} stroke="#E8A400" strokeWidth="1.5" opacity=".95" />
            ))}
          </svg>

          <div className={`aa-card relative flex flex-col rounded-[28px] ring-1 ring-amber-200/80 overflow-hidden
                           shadow-[0_24px_60px_-20px_rgba(194,120,3,.55)]
                           ${atStart ? 'max-h-[min(40rem,calc(100vh-8rem))]' : 'h-[min(40rem,calc(100vh-8rem))]'}`}>
            {/* Header: the APIS logo on the right, the bee's corner on the left. */}
            <div className="flex-shrink-0 flex items-start justify-end gap-2 pl-28 pr-3 pt-3 pb-2">
              <div className="flex-1 min-w-0 text-right pr-1">
                <img src="/logo.png" alt="APIS" className="inline-block h-8 w-auto drop-shadow-sm" />
                <p className="text-[10.5px] font-bold text-amber-800/80 -mt-0.5">Your Guide to the Intranet</p>
              </div>
              <div className="flex items-center gap-0.5 pt-0.5">
                {!atStart && (
                  <button type="button" onClick={newChat} title="New chat"
                    className="w-7 h-7 rounded-lg text-amber-900/60 hover:bg-amber-200/50 hover:text-amber-900 flex items-center justify-center transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)} title="Minimise"
                  className="w-7 h-7 rounded-lg text-amber-900/60 hover:bg-amber-200/50 hover:text-amber-900 flex items-center justify-center transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <button type="button" onClick={close} title="Close"
                  className="w-7 h-7 rounded-lg text-amber-900/60 hover:bg-amber-200/50 hover:text-amber-900 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div ref={scroller} aria-live="polite" className="aa-scroll flex-1 min-h-0 overflow-y-auto px-4 pb-3 space-y-3">
              {atStart && (
                <>
                  {/* The bee's hello, typed out, with a handwritten note beside it. */}
                  <div className="flex items-start gap-2 pt-3">
                    <div className="relative flex-1 rounded-2xl bg-white px-3.5 py-3 shadow-[0_6px_18px_-10px_rgba(194,120,3,.6)] ring-1 ring-amber-100">
                      <span aria-hidden className="absolute -top-2 left-6 w-4 h-4 rotate-45 bg-white ring-1 ring-amber-100 [clip-path:polygon(0_0,100%_0,0_100%)]" />
                      <p className="text-[15px] font-black text-slate-900">{greeting}</p>
                      <p className="text-[12.5px] font-semibold text-slate-600 leading-snug min-h-[2.5em]">
                        <TypedText text={intro} />
                      </p>
                    </div>
                    <p className="aa-hand w-[5.6rem] flex-shrink-0 -rotate-6 pt-2 text-[13px] leading-tight text-slate-700">
                      Here to help you always! <span className="text-rose-500">♡</span>
                    </p>
                  </div>

                  <p className="flex items-center gap-1.5 pt-1 text-[13px] font-black text-slate-800">
                    <Sparkles className="w-4 h-4 text-amber-500" />Try asking
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {SUGGESTIONS.map((s, i) => {
                      const look = SUGGESTION_LOOK[s] ?? DEFAULT_LOOK;
                      return (
                        <button key={s} type="button" onClick={() => send(s)}
                          style={{ animationDelay: `${120 + i * 45}ms` }}
                          className="aa-msg-in aa-chip group flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-xl bg-white/90
                                     ring-1 ring-amber-100 hover:bg-white text-left">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${look.tile}`}>{look.icon}</span>
                          <span className="flex-1 min-w-0 text-[11.5px] font-bold text-slate-700 leading-tight">{s}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" onClick={() => setBrowsing(true)}
                    className="aa-chip w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-100/70
                               ring-1 ring-amber-200 hover:bg-amber-100 text-[12px] font-black text-slate-700">
                    <BookOpen className="w-4 h-4 text-amber-700" />Browse all {GUIDES.length} topics<ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {browsing && (
                <div className="aa-msg-in space-y-3 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-black text-slate-800">All topics</p>
                    <button type="button" onClick={() => setBrowsing(false)}
                      className="text-[11.5px] font-bold text-amber-700 hover:text-amber-800">Done</button>
                  </div>
                  {GROUPS.map(group => (
                    <div key={group} className="rounded-xl bg-white/80 ring-1 ring-amber-100 p-2 space-y-0.5">
                      <p className="px-1.5 text-[10.5px] font-black uppercase tracking-wide text-amber-700">{group}</p>
                      {GUIDES.filter(g => g.group === group).map(g => (
                        <button key={g.title} type="button" onClick={() => send(g.title, g)}
                          className="w-full flex items-center gap-1 text-left px-1.5 py-1.5 rounded-lg hover:bg-amber-50
                                     text-[12px] font-bold text-slate-700 transition-colors">
                          <span className="flex-1">{g.title}</span><ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {!browsing && messages.map(m => m.from === 'user' ? (
                <div key={m.id} className="aa-msg-in flex flex-col items-end pt-1">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-amber-400 to-orange-500 px-3.5 py-2
                                  text-[12.5px] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(234,88,12,.7)]">
                    {m.text}
                  </div>
                  <span className="mt-0.5 text-[10px] font-semibold text-amber-900/40">{clock(m.at)}</span>
                </div>
              ) : (
                <div key={m.id} className="aa-msg-in flex items-start gap-2">
                  <span className="w-8 h-8 rounded-full bg-white ring-2 ring-amber-200 flex items-center justify-center flex-shrink-0">
                    <BeeMascot size={30} still />
                  </span>
                  <div className="flex-1 min-w-0 space-y-2">
                    {m.typing ? (
                      <div className="inline-flex items-center gap-1 rounded-2xl rounded-tl-md bg-white px-3.5 py-3 ring-1 ring-amber-100 shadow-sm">
                        <span className="aa-dot w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="aa-dot w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="aa-dot w-1.5 h-1.5 rounded-full bg-amber-500" />
                      </div>
                    ) : (
                      <>
                        <div className="inline-block rounded-2xl rounded-tl-md bg-white px-3.5 py-2 ring-1 ring-amber-100 shadow-sm
                                        text-[12.5px] font-semibold text-slate-700">
                          {m.text}
                        </div>
                        {m.answer && (
                          <AnswerBlocks answer={m.answer} query={m.query ?? ''}
                            onAsk={send} onOpenTool={openTool} onRunAction={runAction} onOpenLink={openLink}
                            onBrowse={() => setBrowsing(true)} />
                        )}
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-amber-900/40">
                          <span>Ask APIS · {clock(m.at)}</span>
                          {feedback[m.id] ? (
                            <span className="text-emerald-600">Thanks for the feedback!</span>
                          ) : (
                            <>
                              <button type="button" title="Helpful" onClick={() => setFeedback(f => ({ ...f, [m.id]: 'up' }))}
                                className="hover:text-emerald-600"><ThumbsUp className="w-3 h-3" /></button>
                              <button type="button" title="Not helpful" onClick={() => setFeedback(f => ({ ...f, [m.id]: 'down' }))}
                                className="hover:text-rose-600"><ThumbsDown className="w-3 h-3" /></button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={onSubmit} className="relative flex-shrink-0 px-3 pb-3 pt-1">
              {/* What the words typed so far would find. */}
              {live && liveCount > 0 && (
                <div className="aa-msg-in absolute left-3 right-3 bottom-full mb-1 rounded-2xl bg-white ring-1 ring-amber-200
                                shadow-[0_-10px_30px_-14px_rgba(194,120,3,.6)] p-1.5 space-y-0.5 z-10">
                  <p className="px-2 pt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-400">Suggestions</p>
                  {live.links.map(l => (
                    <button key={`l-${l.label}`} type="button" onClick={() => { setQuery(''); openLink(l); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-amber-50 text-left">
                      {l.href ? <ExternalLink className="w-3.5 h-3.5 text-amber-600" /> : <ArrowRight className="w-3.5 h-3.5 text-amber-600" />}
                      <span className="flex-1 min-w-0 truncate text-[12px] font-bold text-slate-800">Open {l.label}</span>
                      <span className="text-[10px] font-bold text-slate-400">{l.href ? 'link' : 'tool'}</span>
                    </button>
                  ))}
                  {live.people.map(p => (
                    <button key={`p-${p.name}|${p.role}`} type="button" onClick={() => send(`Who is ${p.name}?`)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-amber-50 text-left">
                      <UserRound className="w-3.5 h-3.5 text-violet-500" />
                      <span className="flex-1 min-w-0 truncate text-[12px] font-bold text-slate-800">{p.name}</span>
                      <span className="max-w-[45%] truncate text-[10px] font-bold text-slate-400">{p.department}</span>
                    </button>
                  ))}
                  {live.guides.map(g => (
                    <button key={`g-${g.title}`} type="button" onClick={() => send(g.title, g)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-amber-50 text-left">
                      <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                      <span className="flex-1 min-w-0 truncate text-[12px] font-bold text-slate-800">{g.title}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 pl-3.5 pr-1.5 py-1.5 rounded-full bg-white ring-1 ring-amber-200
                              shadow-[0_6px_18px_-10px_rgba(194,120,3,.6)] focus-within:ring-2 focus-within:ring-amber-400 transition-all">
                <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <input ref={input} value={query} onChange={e => setQuery(e.target.value)} autoFocus
                  placeholder="Ask anything about the intranet…"
                  className="flex-1 min-w-0 bg-transparent text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none" />
                <button type="submit" title="Send" disabled={!query.trim() || busy}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center
                             shadow-md shadow-orange-500/30 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 transition-all flex-shrink-0">
                  <SendHorizontal className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] font-semibold text-amber-900/45">
                Preview · answers from {GUIDES.length} guides, the APIS Tree and the holiday list. Nothing leaves the intranet.
              </p>
            </form>
          </div>

          {/* Honey dripping off the bottom edge. */}
          <svg aria-hidden viewBox="0 0 200 30" preserveAspectRatio="none"
            className="absolute left-5 -bottom-[18px] w-44 h-6 z-10 pointer-events-none">
            <path className="aa-drip" fill="#FFC83D"
              d="M0 0h200v4c-8 0-10 4-12 10s-8 6-9 0-3-10-12-10h-40c-9 0-10 6-11 14s-9 9-10 0-4-14-14-14H52c-8 0-9 3-10 8s-8 5-8 0-4-8-12-8H0z" />
            <circle cx="183" cy="24" r="3" fill="#FFC83D" className="aa-drip" />
          </svg>
        </div>
      )}

      {/* The bee's "need a hand?" - once a session, until opened. */}
      {nudge && !open && (
        <button type="button" onClick={toggle}
          className="aa-msg-in relative mr-2 rounded-2xl rounded-br-md bg-white px-3.5 py-2 text-left ring-1 ring-amber-200
                     shadow-[0_10px_30px_-12px_rgba(194,120,3,.6)]">
          <p className="text-[12.5px] font-black text-slate-800">Need a hand? 🐝</p>
          <p className="text-[11px] font-semibold text-slate-500">Ask me anything about the intranet</p>
        </button>
      )}

      <button type="button" onClick={toggle} aria-expanded={open} title={open ? 'Minimise Ask APIS' : 'Ask APIS'}
        className={`group relative w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500
                    ring-4 ring-white shadow-xl shadow-amber-500/40 hover:-translate-y-0.5 hover:shadow-2xl transition-all
                    ${open ? '' : 'aa-pulse'}`}>
        <span className="absolute inset-0 flex items-center justify-center">
          <BeeMascot size={56} waving={!open && nudge} />
        </span>
        <Sparkles aria-hidden className="aa-twinkle absolute -top-2 -left-1 w-4 h-4 text-amber-400" />
        <Sparkles aria-hidden className="aa-twinkle absolute -top-1 -right-2 w-3 h-3 text-orange-400 [animation-delay:.8s]" />
        <span className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full
                         bg-slate-900/85 px-2.5 py-1 text-[11px] font-black text-white opacity-0 group-hover:opacity-100 transition-opacity">
          {open ? 'Minimise' : 'Ask APIS'}
        </span>
      </button>
    </div>
  );
}

/* Everything one answer found: people, holidays, links, the guide itself
   and other guides that might be meant. */
function AnswerBlocks({ answer: a, query, onAsk, onOpenTool, onRunAction, onOpenLink, onBrowse }: {
  answer: Answer;
  query: string;
  onAsk: (text: string, forced?: Guide) => void;
  onOpenTool: (view: ShellView) => void;
  onRunAction: (g: Guide) => void;
  onOpenLink: (l: QuickLink) => void;
  onBrowse: () => void;
}) {
  const g = a.guide;
  const nothing = !g && !a.links.length && !a.people.length && !a.holiday;
  return (
    <div className="space-y-2">
      {a.people.length > 0 && (
        <div className="space-y-1.5">
          {a.people.map(p => (
            <div key={`${p.name}|${p.role}`} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white ring-1 ring-violet-200 shadow-sm">
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white text-[12px] font-black
                               flex items-center justify-center flex-shrink-0">
                {p.name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-black text-slate-800">{p.name}</p>
                <p className="text-[11px] text-slate-600 leading-snug">{p.role}</p>
                <p className="text-[10.5px] text-slate-500">
                  {p.department}{p.reportsTo && <> · reports to <span className="font-bold">{p.reportsTo}</span></>}
                </p>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => onOpenTool('apis-tree')}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-black text-violet-600 hover:text-violet-700">
            <Network className="w-3.5 h-3.5" />See them on the APIS Tree<ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {a.holiday && <HolidayAnswer query={query} />}

      {a.links.length > 0 && (
        <div className="space-y-1.5">
          {a.links.map(l => (
            <button key={l.label} type="button" onClick={() => onOpenLink(l)}
              className="aa-chip w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white ring-1 ring-amber-200 hover:bg-amber-50 text-left">
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-black text-slate-800 truncate">Open {l.label}</p>
                <p className="text-[11px] text-slate-500 truncate">{l.sub}</p>
              </div>
              {l.href
                ? <ExternalLink className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                : <ArrowRight className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {g && (
        <div className="rounded-xl bg-white ring-1 ring-amber-200 p-3 space-y-2.5 shadow-sm">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-600">{g.group}</p>
            <p className="text-[13px] font-black text-slate-900">{g.title}</p>
          </div>
          <ol className="space-y-1.5">
            {g.steps.map((s, i) => (
              <li key={i} className="flex gap-2 text-[12px] text-slate-600 leading-snug">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10.5px] font-black
                                 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {g.tips && g.tips.length > 0 && (
            <div className="rounded-lg bg-sky-50 px-2.5 py-2 space-y-1">
              <p className="flex items-center gap-1 text-[10.5px] font-black uppercase tracking-wide text-sky-700">
                <Lightbulb className="w-3 h-3" />Good to know
              </p>
              {g.tips.map((t, i) => <p key={i} className="text-[11.5px] text-sky-900/80 leading-snug">{t}</p>)}
            </div>
          )}
          {g.action ? (
            <div className="space-y-1.5">
              <button type="button" onClick={() => onRunAction(g)}
                className="aa-chip w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                           bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[12px] font-black shadow-sm">
                <Zap className="w-3.5 h-3.5" />{g.action.label}
              </button>
              <button type="button" onClick={() => onOpenTool(g.tool)}
                className="w-full inline-flex items-center justify-center gap-1 text-[11.5px] font-bold text-slate-500 hover:text-amber-600">
                or just open {g.toolLabel}<ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => onOpenTool(g.tool)}
              className="aa-chip w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                         bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[12px] font-black shadow-sm">
              Open {g.toolLabel}<ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {a.more.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="w-full text-[10.5px] font-black uppercase tracking-wide text-amber-900/50">Also see</span>
          {a.more.map(m => (
            <button key={m.title} type="button" onClick={() => onAsk(m.title, m)}
              className="aa-chip px-2.5 py-1.5 rounded-full bg-white ring-1 ring-amber-200 hover:bg-amber-50 text-[11.5px] font-bold text-slate-700">
              {m.title}
            </button>
          ))}
        </div>
      )}

      {nothing && (
        <div className="rounded-xl bg-white ring-1 ring-amber-200 p-3 space-y-2">
          <p className="text-[11.5px] text-slate-500">Try other words, browse all topics, or raise a request and the team will help.</p>
          <div className="flex items-center gap-4">
            <button type="button" onClick={onBrowse}
              className="inline-flex items-center gap-1.5 text-[12px] font-black text-slate-600 hover:text-amber-600">
              <BookOpen className="w-3.5 h-3.5" />Browse topics
            </button>
            <button type="button" onClick={() => { sendIntent('helpdesk:admin-ticket'); onOpenTool('helpdesk'); }}
              className="inline-flex items-center gap-1.5 text-[12px] font-black text-amber-600 hover:text-amber-700">
              Ask the team<ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AskApisButton;
