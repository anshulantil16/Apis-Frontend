/* The cards for Ask APIS's quick answers (see extras.ts), drawn inside the
 * chat in the same white cards as the guides.
 *
 * The Help Desk ones read the person's own requests and the rooms, using
 * the Help Desk sign-in this browser already has - the same token Help Desk
 * itself sends. Without one, they say so and offer to open Help Desk, which
 * asks for the OTP and then lands on the right screen. They call the server
 * directly rather than through Help Desk's rpFetch, which reloads the whole
 * page when a sign-in has expired - fine inside Help Desk, not from a chat. */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight, BarChart3, Briefcase, DoorOpen, Headphones, History, Loader2, Package, Quote,
  Sparkles, UserPlus, Wrench,
} from 'lucide-react';
import type { ShellView } from '../home/IntranetShell';
import {
  APIS_FACTS, APIS_GLANCE, APIS_MISSION_POINTS, APIS_VISION, COMPANY_MILESTONES, PACK_SIZES, QUICK_ACCESS,
  SOCIAL_LINKS, dailyQuote, formatRelativeTime, getRecentToolsWithTime, useVacancies, type OurProduct,
} from '../home/IntranetHomeShared';
import { API, REQUEST_STATUS_BADGE, loadSession, type Session } from '../helpdesk/HelpDeskShared';
import type { CompanyTopic, Extra } from './extras';
import type { ItIssue } from './itIssues';
import { AMBITIONBOX_HREF } from './links';

/* Open a tool, optionally on a particular screen inside it. */
export type Go = (view: ShellView, intent?: string) => void;

export function ExtraAnswer({ extra: e, query, go, onAsk }: {
  extra: Extra; query: string; go: Go;
  /* Ask the bee something, as if typed. */
  onAsk: (text: string) => void;
}) {
  switch (e.kind) {
    case 'social': return <Social onQuote={() => onAsk('Quote of the day')} />;
    case 'my-requests': return <MyRequests go={go} />;
    case 'rooms': return <Rooms go={go} />;
    case 'recent-tools': return <RecentTools go={go} />;
    case 'vacancies': return <Vacancies terms={e.terms} go={go} />;
    case 'product': return <Product product={e.product} go={go} />;
    case 'company': return <Company topics={e.topics} query={query} />;
    case 'quote': return <TodaysQuote />;
    case 'it-issue': return <ItIssueCard issue={e.issue} go={go} />;
  }
}

/* ── APIS's social pages ───────────────────────────────────────────────── */

/* The icon row from the home page header: the five social accounts,
   AmbitionBox, and the quote of the day (which `onQuote` asks for). */
export function SocialRow({ onQuote }: { onQuote: () => void }) {
  const ring = 'w-7 h-7 rounded-full flex items-center justify-center text-white ring-1 ring-amber-300/50 shadow-sm ' +
    'transition-all duration-300 hover:-translate-y-0.5 hover:scale-110';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {SOCIAL_LINKS.map(s => {
        const Icon = s.icon;
        return (
          <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" title={`APIS on ${s.label}`}
            className={`${ring} ${s.bg}`}>
            <Icon className="w-3.5 h-3.5" />
          </a>
        );
      })}
      <a href={AMBITIONBOX_HREF} target="_blank" rel="noopener noreferrer" title="APIS India reviews on AmbitionBox"
        className="w-7 h-7 flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5 hover:scale-110">
        <img src="/AmbitionBox.png" alt="AmbitionBox" className="w-7 h-7 max-w-none object-contain drop-shadow-sm" />
      </a>
      <button type="button" onClick={onQuote} title="Quote of the Day"
        className={`${ring} bg-gradient-to-br from-amber-400 to-orange-500`}>
        <Quote className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function Social({ onQuote }: { onQuote: () => void }) {
  return (
    <Card icon={<Sparkles className="w-3 h-3" />} title="Follow APIS">
      <SocialRow onQuote={onQuote} />
      <Muted>LinkedIn, YouTube, Instagram, Facebook, X and employee reviews on AmbitionBox.</Muted>
    </Card>
  );
}

/* ── shared pieces ─────────────────────────────────────────────────────── */

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-white ring-1 ring-amber-200 p-3 space-y-2 shadow-sm">
      <p className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wide text-amber-600">{icon}{title}</p>
      {children}
    </div>
  );
}

function Action({ onClick, children, primary = false }: { onClick: () => void; children: ReactNode; primary?: boolean }) {
  return primary ? (
    <button type="button" onClick={onClick}
      className="aa-chip w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[12px] font-black shadow-sm">
      {children}
    </button>
  ) : (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1 text-[11.5px] font-bold text-slate-500 hover:text-amber-600">
      {children}
    </button>
  );
}

const Muted = ({ children }: { children: ReactNode }) => <p className="text-[11.5px] text-slate-500 leading-snug">{children}</p>;
const Loading = () => <p className="flex items-center gap-1.5 text-[11.5px] text-slate-500"><Loader2 className="w-3.5 h-3.5 animate-spin" />Checking…</p>;

/* ── Help Desk: my requests, rooms ─────────────────────────────────────── */

type Load<T> = { state: 'loading' } | { state: 'signin' } | { state: 'down' } | { state: 'ok'; data: T };

class SignInNeeded extends Error {}

async function deskGet(session: Session, path: string) {
  const r = await fetch(`${API}${path}`, { headers: { 'X-AdminPulse-Session': session.token } });
  if (r.status === 401 || r.status === 403) throw new SignInNeeded();
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

/* Reads from Help Desk once, on mount. */
function useDesk<T>(read: (s: Session) => Promise<T>): Load<T> {
  const [session] = useState(loadSession);
  const [load, setLoad] = useState<Load<T>>(session ? { state: 'loading' } : { state: 'signin' });
  useEffect(() => {
    if (!session) return;
    let alive = true;
    read(session)
      .then(data => { if (alive) setLoad({ state: 'ok', data }); })
      .catch(err => { if (alive) setLoad({ state: err instanceof SignInNeeded ? 'signin' : 'down' }); });
    return () => { alive = false; };
    // Once per answer: `read` is a fresh function each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  return load;
}

function DeskSignIn({ go, intent, what }: { go: Go; intent: string; what: string }) {
  return (
    <>
      <Muted>Sign in to Help Desk once (your email and an OTP) and I can show {what} right here.</Muted>
      <Action primary onClick={() => go('helpdesk', intent)}>Open Help Desk<ArrowRight className="w-3.5 h-3.5" /></Action>
    </>
  );
}

interface RequestRow { key: string; kind: string; title: string; status: string; statusLabel: string; created: string; }

const OPEN = new Set(['pending', 'approved', 'in_progress']);

const pretty = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

function MyRequests({ go }: { go: Go }) {
  const load = useDesk(async s => {
    const mine = encodeURIComponent(s.email);
    const [b, r, t] = await Promise.all([
      deskGet(s, `/bookings/?mine=${mine}`), deskGet(s, `/resource-requests/?mine=${mine}`), deskGet(s, `/tickets/?mine=${mine}`),
    ]);
    /* eslint-disable @typescript-eslint/no-explicit-any -- Help Desk's own rows are untyped too. */
    const rows: RequestRow[] = [
      ...(b.results ?? []).map((x: any) => ({ key: `b${x.id}`, kind: 'Room booking', title: x.room_name, status: x.status, statusLabel: pretty(x.status), created: x.created_at })),
      ...(r.results ?? []).map((x: any) => ({ key: `r${x.id}`, kind: 'Admin request', title: `${x.item_name} × ${x.quantity}`, status: x.status, statusLabel: pretty(x.status), created: x.created_at })),
      ...(t.results ?? []).map((x: any) => ({ key: `t${x.id}`, kind: 'IT ticket', title: x.subject, status: x.status, statusLabel: x.status_label || pretty(x.status), created: x.created_at })),
    ];
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return rows.sort((a, c) => (a.created < c.created ? 1 : -1));
  });

  return (
    <Card icon={<Headphones className="w-3 h-3" />} title="My Help Desk requests">
      {load.state === 'loading' && <Loading />}
      {load.state === 'signin' && <DeskSignIn go={go} intent="helpdesk:my-requests" what="your tickets and requests" />}
      {load.state === 'down' && <Muted>Help Desk isn’t answering right now — try again in a moment.</Muted>}
      {load.state === 'ok' && (load.data.length === 0 ? <Muted>You haven’t raised anything on Help Desk yet.</Muted> : (
        <>
          <Muted>{load.data.filter(r => OPEN.has(r.status)).length} still open, {load.data.length} in all.</Muted>
          <div className="space-y-1">
            {load.data.slice(0, 5).map(r => (
              <div key={r.key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold text-slate-800">{r.title}</p>
                  <p className="text-[10.5px] text-slate-400">{r.kind} · {new Date(r.created).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase ring-1 ${REQUEST_STATUS_BADGE[r.status] ?? 'bg-slate-50 text-slate-500 ring-slate-200'}`}>
                  {r.statusLabel}
                </span>
              </div>
            ))}
          </div>
        </>
      ))}
      {load.state === 'ok' && (
        <Action onClick={() => go('helpdesk', 'helpdesk:my-requests')}>Open My Requests<ArrowRight className="w-3 h-3" /></Action>
      )}
    </Card>
  );
}

interface RoomRow { id: number; name: string; label?: string; status: string; capacity?: number; until?: string; next?: string; }

function Rooms({ go }: { go: Go }) {
  const load = useDesk(async (s): Promise<RoomRow[]> => {
    const d = await deskGet(s, '/rooms/');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (d.results ?? []).map((x: any): RoomRow => ({
      id: x.id, name: x.name, label: x.label, status: x.status, capacity: x.capacity, until: x.until, next: x.next_booking?.start_time,
    }));
  });

  const chip = (r: RoomRow) =>
    r.status === 'occupied' ? { text: r.until ? `Busy until ${r.until}` : 'Busy', cls: 'bg-rose-50 text-rose-600 ring-rose-200' }
    : r.status === 'upcoming' ? { text: 'Starting soon', cls: 'bg-amber-50 text-amber-600 ring-amber-200' }
    : { text: r.next ? `Free · next ${r.next}` : 'Free', cls: 'bg-emerald-50 text-emerald-600 ring-emerald-200' };

  return (
    <Card icon={<DoorOpen className="w-3 h-3" />} title="Meeting rooms now">
      {load.state === 'loading' && <Loading />}
      {load.state === 'signin' && <DeskSignIn go={go} intent="helpdesk:book-room" what="which rooms are free" />}
      {load.state === 'down' && <Muted>Help Desk isn’t answering right now — try again in a moment.</Muted>}
      {load.state === 'ok' && (load.data.length === 0 ? <Muted>No meeting rooms have been set up in Help Desk yet.</Muted> : (
        <>
          <Muted>{load.data.filter(r => r.status === 'free').length} of {load.data.length} free right now.</Muted>
          <div className="space-y-1">
            {load.data.slice(0, 6).map(r => {
              const c = chip(r);
              return (
                <div key={r.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold text-slate-800">{r.label ? `${r.label} ` : ''}{r.name}</p>
                    {r.capacity ? <p className="text-[10.5px] text-slate-400">{r.capacity} seats</p> : null}
                  </div>
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[9.5px] font-black ring-1 ${c.cls}`}>{c.text}</span>
                </div>
              );
            })}
          </div>
          <Action primary onClick={() => go('helpdesk', 'helpdesk:book-room')}>Book a room<ArrowRight className="w-3.5 h-3.5" /></Action>
        </>
      ))}
    </Card>
  );
}

/* ── recent tools ──────────────────────────────────────────────────────── */

function RecentTools({ go }: { go: Go }) {
  /* Tracked in this browser by the tools themselves (pushRecentTool). */
  const [recent] = useState(getRecentToolsWithTime);
  const rows = recent
    .map(r => ({ ...r, tool: QUICK_ACCESS.find(t => t.id === r.id) }))
    .filter(r => r.tool);
  return (
    <Card icon={<History className="w-3 h-3" />} title="Recently used">
      {rows.length === 0 ? <Muted>You haven’t opened any tools on this browser yet.</Muted> : (
        <div className="space-y-1">
          {rows.map(r => (
            <button key={r.id} type="button" onClick={() => go(r.id)}
              className="aa-chip w-full flex items-center gap-2 rounded-lg bg-slate-50 hover:bg-amber-50 px-2.5 py-1.5 text-left">
              <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-slate-800">{r.tool!.label}</span>
              <span className="text-[10.5px] text-slate-400">{formatRelativeTime(r.ts)}</span>
              <ArrowRight className="w-3 h-3 text-amber-600" />
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── openings and referrals ────────────────────────────────────────────── */

/* Words in "any vacancy in sales" that aren't about which vacancy. */
const VACANCY_NOISE = new Set(['vacancy', 'vacancies', 'opening', 'openings', 'position', 'positions', 'job', 'jobs',
  'hiring', 'refer', 'referral', 'referrals', 'recruitment', 'any', 'open', 'current', 'the', 'for', 'are', 'there',
  'what', 'show', 'list', 'all', 'new', 'how', 'can', 'someone', 'friend']);

function Vacancies({ terms, go }: { terms: string[]; go: Go }) {
  const { vacancies, loading } = useVacancies();
  const { rows, filtered } = useMemo(() => {
    const live = vacancies.filter(v => v.status === 'Active' && v.moderationStatus === 'approved');
    const want = terms.filter(t => !VACANCY_NOISE.has(t));
    const hits = want.length ? live.filter(v => {
      const words = `${v.title} ${v.department} ${v.function} ${v.location} ${v.state}`.toLowerCase();
      return want.some(t => words.includes(t));
    }) : [];
    return hits.length ? { rows: hits, filtered: true } : { rows: live, filtered: false };
  }, [vacancies, terms]);

  return (
    <Card icon={<Briefcase className="w-3 h-3" />} title="Current openings">
      {loading ? <Loading /> : rows.length === 0 ? <Muted>There are no open positions listed right now.</Muted> : (
        <>
          <Muted>{filtered ? `${rows.length} matching` : `${rows.length} open`} position{rows.length === 1 ? '' : 's'}.</Muted>
          <div className="space-y-1">
            {rows.slice(0, 5).map(v => (
              <div key={v.id} className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                <p className="truncate text-[12px] font-bold text-slate-800">{v.title}</p>
                <p className="truncate text-[10.5px] text-slate-400">{[v.department, v.location, v.experience].filter(Boolean).join(' · ')}</p>
              </div>
            ))}
          </div>
        </>
      )}
      <Action primary onClick={() => go('home', 'home:refer')}><UserPlus className="w-3.5 h-3.5" />Refer someone</Action>
      <Action onClick={() => go('home', 'home:vacancies')}>See all openings<ArrowRight className="w-3 h-3" /></Action>
    </Card>
  );
}

/* ── products ──────────────────────────────────────────────────────────── */

function Product({ product: p, go }: { product: OurProduct; go: Go }) {
  const packs = PACK_SIZES[p.label] ?? [];
  const cols = {
    variant: packs.some(x => x.variant), weight: packs.some(x => x.weight),
    price: packs.some(x => x.price), units: packs.some(x => x.unitsPerCase),
  };
  return (
    <Card icon={<Package className="w-3 h-3" />} title="Our products">
      <div className="flex items-center gap-2.5">
        <img src={p.image} alt="" className="w-12 h-12 object-contain flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-[13px] font-black text-slate-900">{p.label}</p>
          <p className="text-[11.5px] text-slate-600 leading-snug">{p.desc}</p>
        </div>
      </div>
      <div className="text-[11px] text-slate-500 space-y-0.5">
        {p.category && <p><span className="font-bold text-slate-600">Category:</span> {p.category}</p>}
        {p.shelfLife && <p><span className="font-bold text-slate-600">Shelf life:</span> {p.shelfLife}</p>}
        {p.storage && <p><span className="font-bold text-slate-600">Storage:</span> {p.storage}</p>}
      </div>
      {packs.length > 0 && (
        <div className="overflow-x-auto rounded-lg ring-1 ring-slate-200">
          <table className="w-full text-[10.5px]">
            <thead className="bg-amber-50 text-amber-800">
              <tr>
                {cols.variant && <th className="px-2 py-1 text-left font-black">Variant</th>}
                {cols.weight && <th className="px-2 py-1 text-left font-black">Pack</th>}
                {cols.price && <th className="px-2 py-1 text-left font-black">Price</th>}
                {cols.units && <th className="px-2 py-1 text-left font-black">Per case</th>}
              </tr>
            </thead>
            <tbody>
              {packs.slice(0, 8).map((x, i) => (
                <tr key={i} className="border-t border-slate-100 text-slate-600">
                  {cols.variant && <td className="px-2 py-1">{x.variant}</td>}
                  {cols.weight && <td className="px-2 py-1">{x.weight}</td>}
                  {cols.price && <td className="px-2 py-1">{x.price}</td>}
                  {cols.units && <td className="px-2 py-1">{x.unitsPerCase}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {packs.length > 8 && <Muted>…and {packs.length - 8} more packs.</Muted>}
      <Action onClick={() => go('home', 'home:products')}>See all products<ArrowRight className="w-3 h-3" /></Action>
    </Card>
  );
}

/* ── company ───────────────────────────────────────────────────────────── */

const FACT_NOISE = new Set(['apis', 'company', 'facts', 'fact', 'about', 'tell', 'the', 'and', 'what', 'our', 'are', 'its']);

function Company({ topics, query }: { topics: CompanyTopic[]; query: string }) {
  const facts = useMemo(() => {
    const words = (query.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(w => w.length >= 3 && !FACT_NOISE.has(w));
    const hits = APIS_FACTS.filter(f => words.some(w => f.toLowerCase().includes(w)));
    return (hits.length ? hits : APIS_FACTS).slice(0, 6);
  }, [query]);

  return (
    <Card icon={<Sparkles className="w-3 h-3" />} title="About APIS">
      {topics.includes('founded') && (
        <p className="text-[12px] text-slate-700 leading-snug">
          APIS was <b>founded in 1924</b> and is headquartered in <b>New Delhi</b> — over 100 years in business.
        </p>
      )}
      {topics.includes('vision') && (
        <div><p className="text-[10.5px] font-black uppercase text-slate-400">Our vision</p>
          <p className="text-[12px] text-slate-700 leading-snug">{APIS_VISION}</p></div>
      )}
      {topics.includes('mission') && (
        <div><p className="text-[10.5px] font-black uppercase text-slate-400">Our mission</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {APIS_MISSION_POINTS.map(m => <li key={m} className="text-[11.5px] text-slate-700 leading-snug">{m}</li>)}
          </ul></div>
      )}
      {topics.includes('milestones') && (
        <div className="space-y-1">
          <p className="text-[10.5px] font-black uppercase text-slate-400">Milestones</p>
          {COMPANY_MILESTONES.filter(m => m.year !== 'TBD').map(m => (
            <div key={m.label} className="flex gap-2 text-[11.5px]">
              <span className="w-14 flex-shrink-0 font-black text-amber-600">{m.year}</span>
              <span className="text-slate-700"><b>{m.label}.</b> {m.body}</span>
            </div>
          ))}
        </div>
      )}
      {topics.includes('numbers') && (
        <div className="grid grid-cols-2 gap-1.5">
          {APIS_GLANCE.map(g => (
            <div key={g.label} className="rounded-lg bg-slate-50 px-2 py-1.5">
              <p className="flex items-center gap-1 text-[9.5px] font-black uppercase text-slate-400"><BarChart3 className="w-2.5 h-2.5" />{g.label}</p>
              <p className="text-[12.5px] font-black text-slate-800">{g.value}</p>
              <p className="text-[10px] text-slate-500 truncate">{g.sub}</p>
            </div>
          ))}
        </div>
      )}
      {topics.includes('facts') && (
        <ul className="list-disc pl-4 space-y-0.5">
          {facts.map(f => <li key={f} className="text-[11.5px] text-slate-700 leading-snug">{f}</li>)}
        </ul>
      )}
    </Card>
  );
}

/* ── today's thought ───────────────────────────────────────────────────── */

function TodaysQuote() {
  /* The same quote as the home page, for everyone, all day. */
  const [q] = useState(dailyQuote);
  return (
    <Card icon={<Quote className="w-3 h-3" />} title="Thought of the day">
      <p className="text-[12.5px] font-semibold italic text-slate-700 leading-snug">“{q.text}”</p>
      <p className="text-[11px] font-bold text-slate-400">— {q.author}</p>
    </Card>
  );
}

/* ── an IT ticket, filled in ───────────────────────────────────────────── */

function ItIssueCard({ issue, go }: { issue: ItIssue; go: Go }) {
  return (
    <Card icon={<Wrench className="w-3 h-3" />} title={`IT ticket · ${issue.label}`}>
      <div className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11.5px] text-slate-600 space-y-0.5">
        <p><span className="font-bold text-slate-700">Subject:</span> {issue.subject}</p>
        <p><span className="font-bold text-slate-700">Related to:</span> {issue.relatedTo}</p>
      </div>
      <Muted>I’ll fill these in — you just describe what’s happening and send.</Muted>
      <Action primary onClick={() => go('helpdesk', `helpdesk:it-ticket|${issue.key}`)}>
        Raise this IT ticket<ArrowRight className="w-3.5 h-3.5" />
      </Action>
    </Card>
  );
}
