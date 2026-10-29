/* The quick answers Ask APIS gives beyond its guides: the person's own Help
 * Desk requests and the rooms free now, the tools they used recently,
 * current openings, product details, company facts, today's thought, and an
 * IT ticket filled in for a common problem. This file only decides which of
 * them a question is asking for; LiveAnswers.tsx draws them. */
import { OUR_PRODUCTS, type OurProduct } from '../home/IntranetHomeShared';
import { itIssueFor, type ItIssue } from './itIssues';

export type Extra =
  | { kind: 'my-requests' }
  | { kind: 'rooms' }
  | { kind: 'recent-tools' }
  | { kind: 'vacancies'; terms: string[] }
  | { kind: 'product'; product: OurProduct }
  | { kind: 'company'; topics: CompanyTopic[] }
  | { kind: 'quote' }
  | { kind: 'social' }
  | { kind: 'it-issue'; issue: ItIssue };

export type CompanyTopic = 'founded' | 'vision' | 'mission' | 'milestones' | 'numbers' | 'facts';

const has = (words: string[], ...any: string[]) => any.some(w => words.includes(w));

/* Words that are in product names but say nothing about which product. */
const PRODUCT_NOISE = new Set(['mixed', 'fruit', 'royal', 'paste', 'green', 'shahi', 'misk']);

function productFor(words: string[]): OurProduct | undefined {
  /* Best match first: "misk masala dates" should find Misk Masala Dates,
     not Royal Zahidi Dates. */
  return OUR_PRODUCTS
    .map(p => {
      const name = p.label.toLowerCase().match(/[a-z]+/g) ?? [];
      const hits = name.filter(n => words.includes(n)).length;
      const strong = name.filter(n => words.includes(n) && !PRODUCT_NOISE.has(n)).length;
      return { p, hits, strong };
    })
    .filter(r => r.strong > 0)
    .sort((a, b) => b.hits - a.hits)[0]?.p;
}

function companyTopics(words: string[]): CompanyTopic[] {
  const t: CompanyTopic[] = [];
  const aboutUs = has(words, 'apis', 'company');
  if (has(words, 'founded', 'founder', 'established', 'history') || (aboutUs && has(words, 'old', 'age')))
    t.push('founded');
  if (has(words, 'vision')) t.push('vision');
  if (has(words, 'mission')) t.push('mission');
  if (has(words, 'milestone', 'milestones', 'achievement', 'achievements')) t.push('milestones');
  if (has(words, 'revenue', 'turnover', 'bse', 'listed', 'ticker') || (has(words, 'share') && has(words, 'price', 'apis')))
    t.push('numbers');
  if (has(words, 'facts', 'fact', 'headquarter', 'headquarters', 'hq', 'certified', 'certification', 'iso',
    'brcgs', 'fssai', 'usfda', 'award', 'awards')) t.push('facts');
  /* "about APIS", "tell me about the company" with nothing more specific -
     but not "tell me about the APIS Wall". */
  if (!t.length && aboutUs && has(words, 'about', 'tell') && !has(words, 'wall', 'tree', 'intranet'))
    t.push('founded', 'vision', 'numbers');
  return t;
}

export function extrasFor(query: string): Extra[] {
  const words = query.toLowerCase().replace(/[’'?.,!]/g, ' ').replace(/wi-fi/g, 'wifi').match(/[a-z0-9]+/g) ?? [];
  const out: Extra[] = [];
  /* Not "i": "I want to raise a ticket" is a new ticket, not the old ones. */
  const mine = has(words, 'my', 'mine');

  if (mine && has(words, 'ticket', 'tickets', 'request', 'requests', 'complaint', 'complaints', 'booking', 'bookings'))
    out.push({ kind: 'my-requests' });
  if (has(words, 'room', 'rooms') && has(words, 'free', 'available', 'vacant', 'empty', 'now', 'busy', 'occupied'))
    out.push({ kind: 'rooms' });
  if ((has(words, 'recent', 'recently', 'last') && has(words, 'tool', 'tools', 'used', 'opened'))
    || (mine && has(words, 'tools')))
    out.push({ kind: 'recent-tools' });
  if (has(words, 'vacancy', 'vacancies', 'openings', 'position', 'positions', 'job', 'jobs',
    'hiring', 'refer', 'referral', 'referrals', 'recruitment'))
    out.push({ kind: 'vacancies', terms: words.filter(w => w.length >= 3) });

  const product = productFor(words);
  if (product) out.push({ kind: 'product', product });

  const topics = companyTopics(words);
  if (topics.length) out.push({ kind: 'company', topics });

  if (has(words, 'quote', 'quotes', 'motivate', 'motivation', 'motivational', 'inspire', 'inspiration', 'thought'))
    out.push({ kind: 'quote' });

  if (has(words, 'social', 'socials', 'follow', 'handles', 'handle'))
    out.push({ kind: 'social' });

  /* A problem, not a question about a ticket already raised - nor a
     request for supplies ("need printer paper" is stationery). */
  const issue = itIssueFor(words);
  if (issue && !out.some(e => e.kind === 'my-requests') && !has(words, 'paper', 'a4', 'toner', 'cartridge', 'stationery'))
    out.push({ kind: 'it-issue', issue });

  return out;
}

/* The line the bee answers with when one of these comes first. */
export function leadForExtra(e: Extra): string {
  switch (e.kind) {
    case 'my-requests': return 'Here are your latest Help Desk requests 👇';
    case 'rooms': return 'Here’s how the meeting rooms look right now 👇';
    case 'recent-tools': return 'Here are the tools you opened recently 👇';
    case 'vacancies': return 'Here are the current openings 👇';
    case 'product': return `Here’s what I know about ${e.product.label} 🍯`;
    case 'company': return 'A little about APIS 🐝';
    case 'quote': return 'Here’s today’s thought ✨';
    case 'social': return 'Follow APIS here 👇';
    case 'it-issue': return 'Let’s get that fixed — I can open an IT ticket with the details filled in:';
  }
}
