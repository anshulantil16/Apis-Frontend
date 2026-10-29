/* Greetings and small talk for Ask APIS - "hi", "gud mrng", "thanks",
 * "bye", "who are you" - however they are spelled. A message that is only
 * small talk gets a friendly reply; small talk in front of a real question
 * ("hi, printer not working") just warms up the reply to the question. */

export type TalkKind = 'hello' | 'morning' | 'afternoon' | 'evening' | 'night' | 'thanks' | 'bye' | 'how' | 'who' | 'help' | 'nope' | 'ok';

export interface SmallTalk {
  kind: TalkKind;
  /* Nothing in the message but small talk. */
  only: boolean;
}

/* Each kind, by the words (or word shapes) people type for it. Checked in
   order, so "good morning" is a morning before it is a hello. */
const KINDS: { kind: TalkKind; test: (w: string, all: string[]) => boolean }[] = [
  { kind: 'morning', test: w => /^(m+o+r+n+i*n*g*|mrn+g*|mrng|morng|mornin|gm|gud+m+o*r*n*i*n*g*)$/.test(w) },
  { kind: 'afternoon', test: w => /^(a+f+t+e*r+n+o+n+|aftrnoon|afternun|noon)$/.test(w) },
  { kind: 'evening', test: w => /^(e+v+e+n+i*n*g*|evng|evning|eve)$/.test(w) },
  { kind: 'night', test: w => /^(n+i+g+h+t+|nite|gn|gudnight|goodnight)$/.test(w) },
  { kind: 'thanks', test: w => /^(t+h+a+n+k+s*|thanku|thankyou|thx|thnx|thnks|tq|ty|tysm|dhanyavad|dhanyawad|shukriya)$/.test(w) },
  { kind: 'bye', test: w => /^(b+y+e+|goodbye|cya|tata|ttyl)$/.test(w) },
  { kind: 'how', test: (w, all) => (w === 'how' || w === 'hw') && all.some(x => /^(are|r|ru|doing|is)$/.test(x)) && all.some(x => /^(you|u|ya|ru|going|life)$/.test(x)) },
  { kind: 'who', test: (w, all) => /^(who|what)$/.test(w) && all.some(x => /^(you|u|ur|your)$/.test(x)) && all.some(x => /^(are|r|name|is)$/.test(x)) },
  { kind: 'help', test: (w, all) => (w === 'what' && all.includes('can') && all.some(x => /^(you|u)$/.test(x)))
    || (w === 'help' && all.every(x => /^(help|me|pls|please|plz)$/.test(x))) },
  /* "not this", "wrong", "no" - the last answer missed. */
  { kind: 'nope', test: (w, all) => /^(no+|nope|nah|wrong|incorrect|useless)$/.test(w)
    || (w === 'not' && all.some(x => /^(this|that|it|helpful|right|correct|useful|what|meant|wanted|relevant)$/.test(x))) },
  { kind: 'hello', test: w => /^(h+i+|h+e+y+|h+e+l+o+|h+l+o+|hallo|hola|namaste|namaskar|namaskaar|yo|sup|wassup|whatsup|greetings|howdy|hy)$/.test(w) },
  { kind: 'ok', test: w => /^(o+k+|okay|okk|cool|great|nice|awesome|perfect|fine|alright)$/.test(w) },
];

/* Words that go along with small talk without being a question. */
const FILLER = /^(good|gud|gd|very|a|an|the|to|you|u|too|ya|ye|there|apis|bee|ask|dear|bro|sir|mam|maam|ji|all|team|so|much|lot|again|it|that|is|are|r|ru|how|who|what|can|do|your|ur|name|doing|going|morning|afternoon|evening|night|day|and|me|my|friend|buddy|im|i|am|just|ok|okay|thanks|thank|hey|hi|hello|not|this|s|one|else|something|helpful|right|correct|useful|answer|question|asked|meant|mean|wanted|want|relevant|at|was|wasnt|isnt)$/;

export function smallTalkIn(query: string): SmallTalk | null {
  const words = query.toLowerCase().replace(/[’'?.,!]/g, ' ').match(/[a-z]+/g) ?? [];
  if (!words.length || words.length > 8) return null;
  for (const { kind, test } of KINDS) {
    if (words.some(w => test(w, words))) {
      const only = words.every(w => FILLER.test(w) || KINDS.some(k => k.test(w, words)));
      return { kind, only };
    }
  }
  return null;
}

function nowPart() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

/* The bee's reply to small talk on its own. */
export function replyTo(t: SmallTalk, name?: string): string {
  const you = name ? `, ${name}` : '';
  const part = nowPart();
  switch (t.kind) {
    case 'hello': return `Hello${you}! 👋 Good ${part}. What can I help you with today?`;
    case 'morning':
      return part === 'morning'
        ? `Good morning${you}! ☀️ Hope your day’s off to a great start. What can I do for you?`
        : `Good morning to you too${you}! ☀️ (It’s ${part} here already.) What can I help with?`;
    case 'afternoon':
      return part === 'afternoon'
        ? `Good afternoon${you}! 🌤️ How can I help?`
        : `Good afternoon${you}! 🌤️ (It’s ${part} here, but hello all the same.) How can I help?`;
    case 'evening': return `Good evening${you}! 🌙 What can I help you with?`;
    case 'night': return `Good night${you}! 🌙 Rest well — I’ll be right here tomorrow. 🐝`;
    case 'thanks': return `You’re welcome${you}! 🍯 Anything else I can help with?`;
    case 'bye': return `Bye${you}! 👋 Have a lovely ${part}. Come back any time.`;
    case 'how': return `I’m buzzing along nicely, thanks for asking${you}! 🐝 How can I help you today?`;
    case 'who': return 'I’m Ask APIS 🐝 — your guide to the intranet. I can find tools, people, policies and holidays, and open the right form for you.';
    case 'help': return `Happy to help${you}! Here’s what I can do 👇`;
    case 'nope': return `Sorry${you}, that wasn’t what you needed 😅 Could you say it another way — which tool, or what you’re trying to do?`;
    case 'ok': return 'Great! 👍 Let me know if there’s anything else.';
  }
}

/* A short hello in front of an answer to a real question. */
export function warmUp(t: SmallTalk, name?: string): string {
  const you = name ? ` ${name}` : '';
  switch (t.kind) {
    case 'morning': return `Good morning${you}! ☀️`;
    case 'afternoon': return `Good afternoon${you}! 🌤️`;
    case 'evening': return `Good evening${you}! 🌙`;
    case 'thanks': return 'Sure!';
    case 'hello': case 'how': return `Hi${you}! 👋`;
    default: return '';
  }
}
