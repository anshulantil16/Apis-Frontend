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
  boardroom: ['meeting', 'room'], cabin: ['room'],
  joinee: ['candidate'], joiner: ['candidate'], fresher: ['candidate'],
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
function correct(w: string): string {
  if (w.length < 4 || VOCAB.has(w) || STOP_WORDS.has(w) || /\d/.test(w)) return w;
  const max = w.length >= 8 ? 2 : 1;
  let best = w, bestD = max + 1;
  for (const v of VOCAB) {
    if (v[0] !== w[0] || (w.length < 5 && NAMES.has(v))) continue;
    const d = distance(w, v, max);
    if (d < bestD) { best = v; bestD = d; }
  }
  return bestD <= max ? best : w;
}

/* The question in the words Ask APIS knows. Unchanged words keep their
   place; a corrected or translated one is swapped in. */
export function normalize(query: string): string {
  return wordsIn(query.replace(/[’']/g, ''))
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
  'company', 'team', 'people', 'data', 'form'].map(stem));

const INDEX = GUIDES.map(g => ({
  g,
  words: new Set([...g.keywords, ...wordsIn(g.title)].map(stem)),
  title: new Set(wordsIn(g.title).map(stem)),
}));

/* A few questions whose words point two ways - "where is my ticket" shares
   "ticket" with raising one, but is about one already raised. */
const BOOSTS: { when: (words: string[]) => boolean; title: string }[] = [
  { when: w => w.includes('my') && w.some(x => /^(tickets?|requests?|bookings?|complaints?)$/.test(x))
      && !w.some(x => /^(raise|new|create|approve|approving)$/.test(x)),
    title: 'Check the status of my requests' },
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
    .map(({ g, words, title }) => ({
      g,
      score: terms.filter(t => words.has(t)).length
        + 0.5 * terms.filter(t => title.has(t) && !WEAK.has(t)).length
        + (BOOSTS.some(b => b.title === g.title && b.when(all)) ? 2 : 0),
      strong: terms.some(t => !WEAK.has(t) && words.has(t)),
    }))
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
