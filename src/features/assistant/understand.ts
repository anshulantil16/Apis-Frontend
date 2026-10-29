/* What Ask APIS makes of a message: which guides, links, people, holidays,
 * quick answers and small talk it is about (answerFor), and the line the bee
 * opens its reply with (leadFor). Kept apart from the panel so it can be
 * tried against a list of questions without drawing anything. */
import { GUIDES, type Guide } from './guides';
import type { QuickLink } from './links';
import { normalize, search, searchLinks } from './search';
import { searchPeople, type PersonHit } from './people';
import { isHolidayQuestion } from './holidays';
import { extrasFor, leadForExtra, type Extra } from './extras';
import { replyTo, smallTalkIn, warmUp, type SmallTalk } from './smallTalk';

/* Everything one question found. */
export interface Answer {
  guide?: Guide;
  more: Guide[];
  links: QuickLink[];
  people: PersonHit[];
  holiday: boolean;
  /* Quick answers from live data - see extras.ts. */
  extras: Extra[];
  /* "hi", "thanks", "who are you" - see smallTalk.ts. */
  talk?: SmallTalk | null;
}

const NOTHING = { more: [], links: [], people: [], holiday: false, extras: [] };
const ABOUT_ME = GUIDES.find(g => g.title === 'What Ask APIS can do');

export function answerFor(text: string, links: QuickLink[], forced?: Guide): Answer {
  if (forced) return { ...NOTHING, guide: forced };
  const talk = smallTalkIn(text);
  /* Only small talk: a reply, and for "who are you" / "what can you do"
     the guide to what the bee can do - not guides that share a word. */
  if (talk?.only) return { ...NOTHING, talk, guide: talk.kind === 'help' || talk.kind === 'who' ? ABOUT_ME : undefined };
  /* Typos fixed and everyday words translated - "printr" is a printer,
     "chutti" is leave. */
  const q = normalize(text);
  const guides = search(q);
  return {
    guide: guides[0], more: guides.slice(1, 3), links: searchLinks(q, links),
    people: searchPeople(q), holiday: isHolidayQuestion(q), extras: extrasFor(q), talk,
  };
}

/* The line the bee answers with, above whatever it found. A greeting in
   front of a real question warms the reply up. */
export function leadFor(a: Answer, name?: string): string {
  if (a.talk?.only) return replyTo(a.talk, name);
  const hi = a.talk ? warmUp(a.talk, name) : '';
  const lead = mainLead(a);
  return hi ? `${hi} ${lead.charAt(0).toUpperCase()}${lead.slice(1)}` : lead;
}

function mainLead(a: Answer): string {
  if (a.people.length === 1) return `That’s ${a.people[0].name} — here are the details 👇`;
  if (a.people.length > 1) return `I found ${a.people.length} people who match 👇`;
  if (a.holiday) return 'Here are the holidays for your zone 🗓️';
  if (a.extras.length) return leadForExtra(a.extras[0]);
  if (a.guide) {
    const t = a.guide.title;
    return /^I |not arriving/.test(t)
      ? 'Let’s sort that out — here’s what to do:'
      : `Sure! Here’s how to ${t.charAt(0).toLowerCase()}${t.slice(1).replace(/\bmy\b/g, 'your')}:`;
  }
  if (a.links.length) return 'You can open it right from here 👇';
  return 'Hmm, I don’t have a guide for that yet 🤔';
}
