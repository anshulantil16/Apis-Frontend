/* How Ask APIS matches a question to its guides and links.
 *
 * 1. normalize(): the question is cleaned up first - Hinglish and everyday
 *    words are mapped to the words the guides use ("chutti" → leave, "net"
 *    → internet, "mail" → email), and a misspelt word is corrected to the
 *    nearest word Ask APIS knows ("printr" → printer, "holliday" → holiday).
 * 2. search() / searchLinks(): then by shared words, after dropping the words
 *    that say nothing (STOP_WORDS) and requiring at least one that says
 *    something (WEAK). A word in a guide's title counts for a little more
 *    than one in its keywords, which settles most ties. */
import { GUIDES, type Guide } from './guides';
import type { QuickLink } from './links';
import { HOLIDAY_WORDS } from './holidays';
import { IT_ISSUES } from './itIssues';
import { PEOPLE_WORDS } from './people';
import { OUR_PRODUCTS } from '../home/IntranetHomeShared';

/* Words that say nothing about which tool is meant - English, and the
   Hindi that people mix in ("leave lena hai", "net nahi chal raha"). */
const STOP_WORDS = new Set(['a', 'an', 'the', 'i', 'my', 'me', 'to', 'do', 'does', 'how', 'what', 'is', 'are',
  'can', 'for', 'of', 'in', 'on', 'and', 'or', 'with', 'please', 'want', 'need', 'should', 'where', 'when',
  'which', 'am', 'be', 'get', 'go', 'from', 'at', 'this', 'that', 'some', 'any', 'you', 'we',
  'hai', 'hain', 'ho', 'raha', 'rahi', 'rahe', 'nahi', 'nhi', 'kar', 'karna', 'karni', 'karo', 'karu', 'chahiye',
  'chaiye', 'lena', 'leni', 'dena', 'deni', 'mujhe', 'mera', 'meri', 'mere', 'ka', 'ki', 'ke', 'ko', 'se', 'mein',
  'kya', 'kaise', 'kab', 'kahan', 'kaha', 'bhai', 'ji', 'abhi', 'aaj', 'chal', 'chalu', 'band', 'hua', 'gaya', 'gayi',
  'plz', 'pls', 'kindly']);

/* Everyday and Hinglish words, as the words the guides use. */
const SYNONYMS: Record<string, string[]> = {
  chutti: ['leave', 'holiday'], chhutti: ['leave', 'holiday'], chuti: ['leave', 'holiday'],
  compoff: ['leave'], wfh: ['attendance', 'leave'], absent: ['attendance'],
  vetan: ['salary'], tankhwah: ['salary'], tankha: ['salary'], pagar: ['salary'], paycheck: ['salary'],
  kharab: ['broken'], broke: ['broken'], dead: ['broken'], damaged: ['broken'],
  shikayat: ['ticket'], complaint: ['ticket'], complain: ['ticket'],
  net: ['internet'], wifi: ['wifi', 'internet'], mail: ['email'], gmail: ['email'], mails: ['email'],
  pc: ['computer'], cpu: ['computer'], system: ['computer'],
  reimburse: ['reimbursement'], reimbursed: ['reimbursement'],
  boardroom: ['meeting', 'room'],
  joinee: ['candidate'], joiner: ['candidate'], fresher: ['candidate'], hire: ['candidate'],
  da: ['da', 'allowance'], itr: ['form16'], register: ['notebook'], registers: ['notebook'],
  bharna: ['fill'], milegi: ['find'], kaam: ['working'], chalna: ['working'],
  photos: ['photo'], pics: ['photo'], pic: ['photo'], images: ['photo'],
};

/* Words whose last "s" isn't a plural. */
const KEEP_S = new Set(['news', 'hrms', 'kpis', 'kras', 'pms', 'sops']);

/* "approving", "approves" and "approve" all find "approv"; "policies"
   finds "policy"; "bookings" finds "book". Crude, but enough for the words
   people type at a help box. */
export function stem(w: string) {
  let s = w;
  if (s.length > 4 && s.endsWith('ies')) s = `${s.slice(0, -3)}y`;
  else if (/(ss|ches|shes|xes)$/.test(s)) s = s.replace(/es$/, '');
  else if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss') && !KEEP_S.has(s)) s = s.slice(0, -1);
  if (s.length > 5 && s.endsWith('ing')) s = s.slice(0, -3);
  else if (s.length > 4 && s.endsWith('ed')) s = s.slice(0, -2);
  if (s.length > 4 && s.endsWith('e')) s = s.slice(0, -1);
  return s || w;
}

const wordsIn = (text: string) => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/* Every word Ask APIS knows, for correcting typos against. */
const VOCAB = new Set<string>([
  ...GUIDES.flatMap(g => [...g.keywords, ...wordsIn(g.title)]),
  ...IT_ISSUES.flatMap(i => i.words),
  ...HOLIDAY_WORDS,
  ...PEOPLE_WORDS,
  ...OUR_PRODUCTS.flatMap(p => wordsIn(p.label)),
  ...Object.keys(SYNONYMS),
  /* The words extras.ts answers to. */
  'vacancy', 'vacancies', 'openings', 'position', 'positions', 'job', 'jobs', 'hiring', 'referral', 'refer',
  'founded', 'vision', 'mission', 'milestones', 'revenue', 'turnover', 'quote', 'motivate', 'social', 'follow',
  'room', 'rooms', 'free', 'available', 'recent', 'tools', 'ticket', 'tickets', 'request', 'requests',
  'pocket', 'hrms', 'bizom', 'erp', 'linkedin', 'youtube', 'instagram', 'facebook', 'twitter', 'ambitionbox',
  'insurance', 'hospital', 'mediclaim', 'products', 'product', 'price', 'pack', 'sizes',
].filter(w => w.length >= 3));

/* Optimal string alignment distance - a swapped pair of letters counts as
   one slip, the way it does when typing. */
function distance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

const NAMES = new Set(PEOPLE_WORDS);

/* The known word a misspelling is closest to, if it is close enough: one
   slip in a short word, two in a long one, and never in the first letter -
   people rarely slip there, and allowing it turns "lunch" into "punch" and
   "cricket" into "ticket". Words of three letters or fewer are left alone,
   and only longer ones are corrected to a name ("asdf" is not Asif). */
/* Everyday English that is a letter away from a word Ask APIS knows, and
   must stay itself: "next" isn't "net" (internet), "show" isn't "slow". */
const COMMON = new Set(('next week weeks month year years today tomorrow yesterday time times show shows give gave tell '
  + 'take took make made come came went goes going done back much many more most also just only very than then them '
  + 'they their there here your mine ours ourself about after before every each other others same such sure what when '
  + 'where which while will would could should shall must might have having been being does doing said says want wants '
  + 'need needs like look looks keep kept left right still yet ever never always often again once soon late early last '
  + 'first second third best good great nice fine okay sorry thanks thank hello please kindly dear team staff office '
  + 'black white work works worked working word words line lines page pages part parts side sides hand head home house '
  + 'name names date dates days hours hour minute minutes money price cost costs paid pays pay call calls mail meet '
  + 'item items list lists form forms file files data note notes plan plans rule rules fact facts post posts sent send').split(' '));

/* Known words by their base form - "printed" is "print", a word Ask APIS
   knows, so it isn't a typo for "printer". Filled on first use, since
   stem() is defined below. */
let VOCAB_STEMS: Set<string> | null = null;

function correct(w: string): string {
  if (w.length < 4 || VOCAB.has(w) || STOP_WORDS.has(w) || COMMON.has(w) || /\d/.test(w)) return w;
  VOCAB_STEMS ??= new Set([...VOCAB].map(stem));
  if (VOCAB_STEMS.has(stem(w))) return w;
  const max = w.length >= 8 ? 2 : 1;
  let best = w, bestD = max + 1;
  for (const v of VOCAB) {
    /* Never the first letter; never a name for a short word; and a short
       word only grows into its fix ("aply" → "apply"), it doesn't shrink
       into a shorter word ("next" → "net"). */
    if (v[0] !== w[0] || (w.length < 5 && NAMES.has(v)) || (w.length < 6 && v.length < w.length)) continue;
    const d = distance(w, v, max);
    if (d < bestD) { best = v; bestD = d; }
  }
  return bestD <= max ? best : w;
}

/* The question in the words Ask APIS knows. Unchanged words keep their
   place; a corrected or translated one is swapped in. */
export function normalize(query: string): string {
  /* "form 16" is one thing - the tax form - not a form and a number. */
  return wordsIn(query.replace(/[’']/g, '').replace(/\bform[\s-]*16\b/gi, 'form16'))
    .flatMap(w => SYNONYMS[w] ?? [correct(w)])
    .flatMap(w => SYNONYMS[w] ?? [w])
    .join(' ');
}

export function termsOf(query: string) {
  return wordsIn(query.replace(/[’']/g, '')).filter(w => !STOP_WORDS.has(w)).map(stem);
}

/* Words that help rank guides but can't choose one alone - several guides
   have them, and "not this" or "see" on its own says nothing about which
   task is meant. A guide is found only when it shares a stronger word too. */
const WEAK = new Set(['not', 'no', 'see', 'my', 'open', 'check', 'add', 'find', 'someone', 'work', 'working',
  'issue', 'problem', 'need', 'other', 'new', 'get', 'done', 'yet', 'can', 'cant', 'cannot', 'out', 'up', 's',
  't', 'won', 'that', 'this', 'look', 'at', 'from', 'during', 'after', 'before', 'within', 'any', 'quick',
  'quickly', 'put', 'fill', 'wrong', 'fix', 'best', 'it', 'apis', 'ask', 'what', 'do', 'i', 'an', 'help',
  'thing', 'something', 'else', 'one', 'right', 'answer', 'menu', 'salary', 'who', 'k', 'ctrl',
  'month', 'week', 'day', 'today', 'year', 'show', 'option', 'showing',
  'company', 'team', 'people', 'data', 'form'].map(stem));

const INDEX = GUIDES.map(g => ({
  g,
  words: new Set([...g.keywords, ...wordsIn(g.title)].map(stem)),
  title: new Set(wordsIn(g.title).map(stem)),
}));

/* A few questions whose words point two ways - "where is my ticket" shares
   "ticket" with raising one, but is about one already raised. */
const BOOSTS: { when: (words: string[]) => boolean; title: string }[] = [
  { when: w => (w.includes('my') && w.some(x => /^(tickets?|requests?|bookings?|complaints?)$/.test(x))
      /* "tickets", "my bookings" on their own - the ones already raised. */
      || (w.length <= 2 && w.some(x => /^(tickets|requests|bookings|complaints)$/.test(x))))
      && !w.some(x => /^(raise|new|create|approve|approving)$/.test(x)),
    title: 'Check the status of my requests' },
  /* "a projector for the meeting": equipment, not a room. */
  { when: w => w.some(x => /^(projectors?|whiteboards?|speakers?|mics?|microphones?|extension|cables?|lcd|screens?)$/.test(x))
      && w.some(x => /^(arrange|need|want|request|provide|send|get|order)$/.test(x)),
    title: 'Request stationery, equipment or other admin items' },
  /* "cancel the room I booked": a booking already made. */
  { when: w => w.some(x => /^(cancel|cancell?ed|reschedule|change|modify)$/.test(x)) && w.some(x => /^(booked|booking|bookings|reservation)$/.test(x)),
    title: 'Check the status of my requests' },
  /* "AC not working in our cabin", "send a cleaner": the office itself -
     an Admin request, whatever room it is in. */
  { when: w => w.some(x => /^(ac|aircon|cooling|cleaner|cleaning|housekeeping|washroom|toilet|fan|lights?|electricity|plumbing|leakage|pest|courier|parcel|visiting)$/.test(x)),
    title: 'Request stationery, equipment or other admin items' },
  /* A device or account problem is IT, even when a new joiner or a CTC
     word comes along with it - unless it is paper or toner for it. */
  { when: w => w.some(x => /^(laptops?|desktops?|computers?|pc|monitors?|mouse|keyboards?|wifi|internet|vpn|outlook|email|software|password|locked)$/.test(x))
      && !w.some(x => /^(paper|a4|toner|cartridges?|ctc|breakup|salary|otp|code|status|complaint|shortcut|shortcuts|ctrl)$/.test(x)),
    title: 'Raise an IT ticket' },
  /* "Help Desk is not showing in my menu": a missing tool. */
  { when: w => w.some(x => /^(not|cant|cannot|missing|disappeared|gone|unable)$/.test(x))
      && w.some(x => /^(showing|visible|appear|appearing|menu|sidebar|option|options|listed)$/.test(x)),
    title: 'I can’t see a tool in my menu' },
  /* "travel policy", "leave rules": a policy, not a travel claim. */
  { when: w => w.some(x => /^(policy|policies|sops?|rules?|guidelines?|handbook)$/.test(x))
      && !w.some(x => /^(upload|add|new|publish|create)$/.test(x)),
    title: 'Read a company policy' },
  /* "share photos from the event": putting one up, not looking. */
  { when: w => w.some(x => /^(upload|share|post|add|put)$/.test(x)) && w.some(x => /^(photos?|pictures?|pics?|images?)$/.test(x)),
    title: 'Put a photo on the APIS Wall' },
];

export function search(query: string): Guide[] {
  const terms = termsOf(query);
  if (!terms.some(t => !WEAK.has(t))) return [];
  const all = wordsIn(query);
  return INDEX
    .map(({ g, words, title }) => {
      const boosted = BOOSTS.some(b => b.title === g.title && b.when(all));
      return {
        g,
        score: terms.filter(t => words.has(t)).length
          + 0.5 * terms.filter(t => title.has(t) && !WEAK.has(t)).length
          + (boosted ? 3 : 0),
        /* A rule that recognised the question counts as a strong word -
           "not showing in my menu" is all weak words, and still clear. */
        strong: boosted || terms.some(t => !WEAK.has(t) && words.has(t)),
      };
    })
    .filter(r => r.strong)
    .sort((a, b) => b.score - a.score)
    .map(r => r.g);
}

/* Links whose name (or another name for it) is in the question, best first. */
export function searchLinks(query: string, links: QuickLink[]): QuickLink[] {
  const terms = termsOf(query);
  if (!terms.some(t => !WEAK.has(t))) return [];
  return links
    .map(l => {
      const words = new Set([...wordsIn(l.label), ...l.also].map(stem));
      return { l, score: terms.filter(t => words.has(t)).length, strong: terms.some(t => !WEAK.has(t) && words.has(t)) };
    })
    .filter(r => r.strong)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(r => r.l);
}
