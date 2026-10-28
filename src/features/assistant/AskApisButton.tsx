/* "Ask APIS" — the help assistant's button, fixed in the bottom-right corner
 * of every page.
 *
 * A preview for trying the idea out: the question box works, but it searches
 * guides kept here in the browser (guides.ts), not a guide library on the
 * server. Matching is by keyword — no AI, nothing sent anywhere — which is how
 * the real one is planned to work too. */
import { useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, Lightbulb, Network, Search, Sparkles, X, Zap } from 'lucide-react';
import type { ShellView } from '../home/IntranetShell';
import { GUIDES, SUGGESTIONS, type Guide } from './guides';
import { sendIntent } from './intent';
import { quickLinks, type QuickLink } from './links';
import { searchPeople } from './people';
import { HolidayAnswer } from './HolidayAnswer';
import { isHolidayQuestion } from './holidays';

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

export function AskApisButton({ onNavigate, canOpen = () => true }: {
  onNavigate?: (view: ShellView) => void;
  /* The sidebar's access check, so only tools this person can open are offered. */
  canOpen?: (id: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [asked, setAsked] = useState('');
  /* A guide picked from "Browse all topics" or "Also see", shown on its own. */
  const [picked, setPicked] = useState<Guide | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const results = useMemo(() => (asked ? search(asked) : []), [asked]);
  const allLinks = useMemo(() => quickLinks(canOpen), [canOpen]);
  const linkHits = useMemo(() => (asked ? searchLinks(asked, allLinks) : []), [asked, allLinks]);
  const peopleHits = useMemo(() => (asked ? searchPeople(asked) : []), [asked]);
  const aboutHolidays = !!asked && isHolidayQuestion(asked);

  const reset = () => { setQuery(''); setAsked(''); setPicked(null); setBrowsing(false); };
  const ask = (text: string) => { reset(); setQuery(text); setAsked(text.trim()); };
  const pick = (g: Guide) => { setPicked(g); setBrowsing(false); };
  const onSubmit = (e: FormEvent) => { e.preventDefault(); ask(query); };
  /* Results follow the typing - nobody should have to know to press Enter
     to see that "pocket hrms" is a link. */
  const onType = (text: string) => { setQuery(text); setAsked(text.trim()); setPicked(null); setBrowsing(false); };
  /* Closing however it happens clears everything, so the panel always
     reopens on its starting view. */
  const close = () => { setOpen(false); reset(); };
  const openTool = (view: ShellView) => { onNavigate?.(view); close(); };
  /* Open the tool on the exact form the guide is about. The action is queued
     first, so the page finds it waiting when it opens. */
  const runAction = (g: Guide) => {
    if (g.action) sendIntent(g.action.intent);
    openTool(g.tool);
  };

  const openLink = (l: QuickLink) => {
    if (l.href) { window.open(l.href, '_blank', 'noopener,noreferrer'); close(); }
    else if (l.view) openTool(l.view);
  };

  const shown = picked ?? results[0];
  const more = picked ? [] : results.slice(1, 3);
  const atStart = !asked && !picked && !browsing;

  return (
    <div className="fixed bottom-5 right-5 z-[90] flex flex-col items-end gap-3">
      {open && (
        <div className="ih-pop-in w-[min(23rem,calc(100vw-2.5rem))] max-h-[min(36rem,calc(100vh-7rem))] flex flex-col
                        rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
          <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white">
            <span className="text-xl leading-none" aria-hidden>🐝</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-black">Ask APIS</p>
              <p className="text-[10.5px] font-bold text-white/80">Your guide to the intranet · preview</p>
            </div>
            <button type="button" onClick={close} title="Close"
              className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="flex-shrink-0 p-3 border-b border-slate-100">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 ring-1 ring-slate-200
                            focus-within:ring-amber-400 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input value={query} onChange={e => onType(e.target.value)} autoFocus
                placeholder="Ask anything about the intranet…"
                className="flex-1 min-w-0 bg-transparent text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none" />
              <button type="submit" title="Ask" disabled={!query.trim()}
                className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center
                           disabled:opacity-40 transition-opacity flex-shrink-0">
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            {!atStart && (
              <button type="button" onClick={reset}
                className="inline-flex items-center gap-1 text-[11.5px] font-bold text-slate-500 hover:text-amber-600">
                <ArrowLeft className="w-3.5 h-3.5" />Start over
              </button>
            )}

            {atStart && (
              <>
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Try asking</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map(s => (
                    <button key={s} type="button" onClick={() => ask(s)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 ring-1 ring-amber-200
                                 hover:bg-amber-100 text-[11.5px] font-bold transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setBrowsing(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl ring-1 ring-slate-200
                             hover:bg-slate-50 text-[12px] font-black text-slate-600 transition-colors">
                  <BookOpen className="w-3.5 h-3.5" />Browse all {GUIDES.length} topics
                </button>
              </>
            )}

            {browsing && (
              <div className="space-y-3">
                {GROUPS.map(group => (
                  <div key={group} className="space-y-1">
                    <p className="text-[10.5px] font-black uppercase tracking-wide text-slate-400">{group}</p>
                    {GUIDES.filter(g => g.group === group).map(g => (
                      <button key={g.title} type="button" onClick={() => pick(g)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50
                                   text-[12px] font-bold text-slate-700 transition-colors">
                        {g.title}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {asked && !picked && peopleHits.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">People</p>
                {peopleHits.map(p => (
                  <div key={`${p.name}|${p.role}`} className="px-3 py-2 rounded-xl ring-1 ring-violet-200 bg-violet-50/50">
                    <p className="text-[12.5px] font-black text-slate-800">{p.name}</p>
                    <p className="text-[11px] text-slate-600 leading-snug">{p.role}</p>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">
                      {p.department}{p.reportsTo && <> · reports to <span className="font-bold">{p.reportsTo}</span></>}
                    </p>
                  </div>
                ))}
                <button type="button" onClick={() => openTool('apis-tree')}
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-black text-violet-600 hover:text-violet-700">
                  <Network className="w-3.5 h-3.5" />See them on the APIS Tree<ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {aboutHolidays && !picked && <HolidayAnswer query={asked} />}

            {asked && !picked && linkHits.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Open directly</p>
                {linkHits.map(l => (
                  <button key={l.label} type="button" onClick={() => openLink(l)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl ring-1 ring-amber-200 bg-amber-50/60
                               hover:bg-amber-100 text-left transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-black text-slate-800 truncate">{l.label}</p>
                      <p className="text-[11px] text-slate-500 truncate">{l.sub}</p>
                    </div>
                    {l.href
                      ? <ExternalLink className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      : <ArrowRight className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {shown && !browsing && (
              <div className="rounded-xl ring-1 ring-slate-200 p-3 space-y-2.5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-amber-600">{shown.group}</p>
                  <p className="text-[13px] font-black text-slate-900">{shown.title}</p>
                </div>
                <ol className="space-y-1.5">
                  {shown.steps.map((s, i) => (
                    <li key={i} className="flex gap-2 text-[12px] text-slate-600 leading-snug">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10.5px] font-black
                                       flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
                {shown.tips && shown.tips.length > 0 && (
                  <div className="rounded-lg bg-sky-50 px-2.5 py-2 space-y-1">
                    <p className="flex items-center gap-1 text-[10.5px] font-black uppercase tracking-wide text-sky-700">
                      <Lightbulb className="w-3 h-3" />Good to know
                    </p>
                    {shown.tips.map((t, i) => (
                      <p key={i} className="text-[11.5px] text-sky-900/80 leading-snug">{t}</p>
                    ))}
                  </div>
                )}
                {shown.action ? (
                  <div className="space-y-1.5">
                    <button type="button" onClick={() => runAction(shown)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                                 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[12px] font-black shadow-sm">
                      <Zap className="w-3.5 h-3.5" />{shown.action.label}
                    </button>
                    <button type="button" onClick={() => openTool(shown.tool)}
                      className="w-full inline-flex items-center justify-center gap-1 text-[11.5px] font-bold text-slate-500 hover:text-amber-600">
                      or just open {shown.toolLabel}<ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => openTool(shown.tool)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                               bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[12px] font-black shadow-sm">
                    Open {shown.toolLabel}<ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {more.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Also see</p>
                {more.map(g => (
                  <button key={g.title} type="button" onClick={() => pick(g)}
                    className="w-full text-left px-3 py-2 rounded-lg ring-1 ring-slate-200 hover:bg-slate-50
                               text-[12px] font-bold text-slate-700 transition-colors">
                    {g.title}
                  </button>
                ))}
              </div>
            )}

            {asked && !picked && !results.length && !linkHits.length && !peopleHits.length && !aboutHolidays && (
              <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 space-y-2">
                <p className="text-[12.5px] font-bold text-slate-700">I couldn’t find a guide for that yet.</p>
                <p className="text-[11.5px] text-slate-500">Try other words, browse all topics, or raise a request and the team will help.</p>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => { reset(); setBrowsing(true); }}
                    className="inline-flex items-center gap-1.5 text-[12px] font-black text-slate-600 hover:text-amber-600">
                    <BookOpen className="w-3.5 h-3.5" />Browse topics
                  </button>
                  <button type="button" onClick={() => { sendIntent('helpdesk:admin-ticket'); openTool('helpdesk'); }}
                    className="inline-flex items-center gap-1.5 text-[12px] font-black text-amber-600 hover:text-amber-700">
                    Ask the team<ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-400">
              <Sparkles className="w-3 h-3" />Preview — {GUIDES.length} guides, the APIS Tree and the holiday list. Nothing leaves the intranet.
            </p>
          </div>
        </div>
      )}

      <button type="button" onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open} title="Ask APIS"
        className="ih-sheen group flex items-center gap-2 pl-2 pr-4 h-12 rounded-full
                   bg-gradient-to-r from-amber-400 to-orange-500 text-white
                   shadow-lg shadow-amber-500/40 ring-2 ring-white
                   hover:shadow-xl hover:shadow-amber-500/50 hover:-translate-y-0.5 transition-all">
        <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-lg leading-none shadow-sm" aria-hidden>
          🐝
        </span>
        <span className="text-[13px] font-black tracking-tight">Ask APIS</span>
      </button>
    </div>
  );
}

export default AskApisButton;
