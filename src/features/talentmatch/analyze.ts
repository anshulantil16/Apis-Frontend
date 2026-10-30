/* How TalentMatch reads a JD and a resume and compares them.
 *
 * Rule-based, not a language model: skills come from the dictionary in
 * skills.ts, sections from their headings, experience from stated years or
 * the dates in the work history, education by level. Every point of a
 * score can be traced to something found (or not found) in the text - the
 * point being to help HR shortlist, with reasons, not to decide for them. */
import { CERTIFICATIONS, EDUCATION, SKILLS, type SkillCategory } from './skills';
import {
  cityByName, cityIn, distanceKm, fieldsIn, industriesIn, industryByName, locationScore, type City,
} from './places';

// ── text helpers ──────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* One matcher per alias: case-sensitive for "=CA"-style acronyms, and
   bounded so "java" isn't found in "javascript" nor "sap" in "sapling". */
function matcher(aliases: string[]) {
  const loose = aliases.filter(a => !a.startsWith('=')).map(a => esc(a.toLowerCase()));
  const strict = aliases.filter(a => a.startsWith('=')).map(a => esc(a.slice(1)));
  const lo = loose.length ? new RegExp(`(?<![a-z0-9])(?:${loose.join('|')})(?![a-z0-9])`, 'g') : null;
  const st = strict.length ? new RegExp(`(?<![A-Za-z0-9])(?:${strict.join('|')})(?![A-Za-z0-9])`, 'g') : null;
  return (text: string, lower: string) => (lo ? lower.match(lo)?.length ?? 0 : 0) + (st ? text.match(st)?.length ?? 0 : 0);
}

const SKILL_MATCHERS = SKILLS.map(s => ({ ...s, count: matcher(s.aliases) }));
const CERT_MATCHERS = CERTIFICATIONS.map(c => ({ ...c, count: matcher(c.aliases) }));
const SKILL_BY_NAME = new Map(SKILLS.map(s => [s.name.toLowerCase(), s]));

/* A skill typed in by HR that isn't in the dictionary is still looked for,
   as the words typed. */
export function skillMatcher(name: string) {
  const def = SKILL_BY_NAME.get(name.toLowerCase());
  return matcher(def ? def.aliases : [name.toLowerCase()]);
}

export function categoryOf(name: string): SkillCategory | 'Other' {
  return SKILL_BY_NAME.get(name.toLowerCase())?.category ?? 'Other';
}

const lines = (text: string) => text.split(/\n+/).map(l => l.replace(/^[\s•▪◦●○■□➢➤►\-–—*·>]+/, '').trim()).filter(Boolean);

// ── sections ──────────────────────────────────────────────────────────────

type Section = 'required' | 'preferred' | 'responsibilities' | 'education' | 'experience' | 'skills'
  | 'projects' | 'certifications' | 'achievements' | 'summary' | 'other';

const HEADINGS: [Section, RegExp][] = [
  ['preferred', /^(preferred|desired|desirable|good to have|nice to have|bonus|added advantage|plus points?|additional skills)/i],
  ['required', /^(required|requirements?|must[- ]have|mandatory|key skills|skills required|required skills|technical skills|skill ?set|what we('| a)re looking for|who you are|candidate profile|eligibility|qualifications? (and|&) skills)/i],
  ['responsibilities', /^(key )?(responsibilit|duties|role (and|&) responsibilities|job responsibilities|what you('ll| will) do|job description|role overview|key result areas|kras?\b)/i],
  ['education', /^(education(al)?( qualifications?| background| details)?|academic|qualifications?)\b/i],
  ['experience', /^(work |professional |employment |career )?(experience|history|employment)/i],
  ['skills', /^(skills|core competencies|competencies|key skills|technical skills|areas of expertise|expertise|tools)/i],
  ['projects', /^(projects?|key projects|academic projects|personal projects)/i],
  ['certifications', /^(certifications?|certificates?|licen[cs]es|courses|trainings?)/i],
  ['achievements', /^(achievements?|awards?|accomplishments|honou?rs|recognition)/i],
  ['summary', /^(summary|profile|objective|career objective|about( me)?|professional summary)/i],
];

/* A heading is a short line that starts like one. */
function headingLabel(line: string): Section | null {
  const l = line.replace(/[:\-–|]+$/, '').trim();
  if (!l || l.split(/\s+/).length > 6 || l.length > 50) return null;
  for (const [s, re] of HEADINGS) if (re.test(l)) return s;
  return null;
}

/* ...or a short label with its content after a colon on the same line.
   Without this second test, "Qualification: Graduate in any discipline; MBA
   in Marketing preferred" is nine words, so it is not read as a heading --
   and every line after it stays in whatever section came before. In a JD
   with a "Preferred:" block above it, that silently moved the skills from
   the rest of the document into "preferred", where a candidate is barely
   marked down for missing them. */
function headingOf(line: string): Section | null {
  const direct = headingLabel(line);
  if (direct) return direct;
  const colon = line.indexOf(':');
  return colon > 0 && colon <= 40 ? headingLabel(line.slice(0, colon)) : null;
}

function sectioned(text: string) {
  const out: { section: Section; line: string }[] = [];
  let current: Section = 'other';
  for (const line of lines(text)) {
    const h = headingOf(line);
    if (h) {
      current = h;
      /* "Skills: Python, SQL" - a heading with its content on the same line. */
      const rest = line.split(/:\s*/).slice(1).join(': ').trim();
      if (rest) out.push({ section: h, line: rest });
      continue;
    }
    out.push({ section: current, line });
  }
  return out;
}

// ── experience and education ──────────────────────────────────────────────

const YEARS = /(\d{1,2}(?:\.\d)?)\s*(?:\+|plus)?\s*(?:(?:-|–|to)\s*(\d{1,2}(?:\.\d)?)\s*\+?\s*)?(?:years?|yrs?)/i;

/* "3-5 years of experience", "minimum 4+ yrs", "experience: 2 years". */
function jdExperience(text: string): { min: number | null; max: number | null } {
  for (const l of lines(text)) {
    if (!/exp/i.test(l)) continue;
    const m = l.match(YEARS);
    if (m) return { min: Number(m[1]), max: m[2] ? Number(m[2]) : null };
  }
  const m = text.match(YEARS);
  return m && /exp/i.test(text.slice(Math.max(0, (m.index ?? 0) - 60), (m.index ?? 0) + 80))
    ? { min: Number(m[1]), max: m[2] ? Number(m[2]) : null } : { min: null, max: null };
}

const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec';
const RANGE = new RegExp(
  `(?:(${MONTHS})[a-z]*\\.?\\s*,?\\s*|(\\d{1,2})[/.-])?((?:19|20)\\d{2})\\s*(?:-|–|—|to|till|until)\\s*`
  + `(?:(?:(${MONTHS})[a-z]*\\.?\\s*,?\\s*|(\\d{1,2})[/.-])?((?:19|20)\\d{2})|(present|current|till date|date|now|ongoing|today))`, 'gi');
const monthIdx = (m?: string) => (m ? MONTHS.split('|').indexOf(m.toLowerCase().slice(0, 3)) : -1);
/* Whole words - "mba" is inside "Mumbai". */
const EDU_WORDS = /universit|college|school|institute|\bb\.?tech\b|\bm\.?tech\b|\bmba\b|\bdegree\b|\bc?gpa\b|percentage|graduat|bachelor|\bmasters?\b|\b1[02]th\b|\bhsc\b|\bssc\b|\bclass\b/i;

/* Years of work: stated outright ("6+ years of experience"), or added up
   from the date ranges in the work history - overlaps counted once, and
   lines about education left out so a 2015-2019 degree isn't a job. */
function resumeExperience(parts: { section: Section; line: string }[], text: string): number | null {
  let stated: number | null = null;
  for (const m of text.matchAll(/(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)(?:\s+(?:and\s+)?\d{1,2}\s*months?)?\s+(?:of\s+)?(?:[a-z&/-]+\s+){0,4}?(?:experience|exp\b)/gi)) {
    stated = Math.max(stated ?? 0, Number(m[1]));
  }
  for (const m of text.matchAll(/(?:total\s+)?experience\s*[:\-–]?\s*(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)/gi)) {
    stated = Math.max(stated ?? 0, Number(m[1]));
  }

  const hasWorkSection = parts.some(p => p.section === 'experience');
  const now = new Date();
  const spans: [number, number][] = [];
  for (const { section, line } of parts) {
    if (hasWorkSection ? section !== 'experience' : (section === 'education' || EDU_WORDS.test(line))) continue;
    for (const m of line.matchAll(RANGE)) {
      const sm = m[1] ? monthIdx(m[1]) : m[2] ? Number(m[2]) - 1 : 0;
      const start = Number(m[3]) * 12 + Math.max(0, sm);
      const end = m[7]
        ? now.getFullYear() * 12 + now.getMonth()
        : Number(m[6]) * 12 + (m[4] ? monthIdx(m[4]) : m[5] ? Number(m[5]) - 1 : 11);
      if (end > start && end - start < 12 * 45) spans.push([start, end]);
    }
  }
  spans.sort((a, b) => a[0] - b[0]);
  let months = 0, cur: [number, number] | null = null;
  for (const s of spans) {
    if (!cur || s[0] > cur[1]) { if (cur) months += cur[1] - cur[0]; cur = [...s]; }
    else cur[1] = Math.max(cur[1], s[1]);
  }
  if (cur) months += cur[1] - cur[0];
  const computed = months ? Math.round((months / 12) * 10) / 10 : null;
  if (stated === null) return computed;
  return computed === null ? stated : Math.max(stated, computed);
}

/* The degrees mentioned, most specific first. A resume's level is its
   highest degree; a JD's is the lowest it names - "Graduate; MBA
   preferred" asks for a graduate, and the MBA is a bonus, not a bar. */
function educationIn(text: string, level: 'highest' | 'lowest' = 'highest') {
  const found = EDUCATION.filter(e => e.pattern.test(text));
  /* "Graduate" only when nothing more specific says so. */
  const specific = found.filter(e => e.label !== 'Graduate' && e.label !== 'Postgraduate');
  const labels = (specific.length ? [...specific, ...found.filter(e => !specific.some(s => s.level === e.level))] : found)
    .map(e => e.label);
  const levels = found.map(e => e.level);
  return {
    level: levels.length ? (level === 'highest' ? Math.max(...levels) : Math.min(...levels)) : 0,
    labels: Array.from(new Set(labels)),
  };
}

function certsIn(text: string, lower: string) {
  return CERT_MATCHERS.filter(c => c.count(text, lower) > 0).map(c => c.name);
}

// ── the JD ────────────────────────────────────────────────────────────────

export interface JobProfile {
  title: string;
  required: string[];
  preferred: string[];
  minExp: number | null;
  maxExp: number | null;
  education: { level: number; labels: string[] };
  certifications: string[];
  responsibilities: string[];
  /* Words the JD keeps returning to, for "other requirements". */
  keywords: string[];
  /* What the degree should be in - "MBA in Marketing", "Food Technology". */
  fields: string[];
  /* The industries a candidate should come from. */
  industries: string[];
  /* Where the job is - a city in places.ts. */
  location: string | null;
}

const STOP = new Set(('a an the and or of to in on for with by at from as is are be will you your our we this that these those '
  + 'have has having can should must may able ability strong good excellent work working team role job candidate candidates '
  + 'experience years year including etc using within across ensure ensuring other all any such well also into per new').split(' '));
const contentWords = (s: string) => (s.toLowerCase().match(/[a-z][a-z+#.]{2,}/g) ?? [])
  .map(w => w.replace(/(ing|ed|es|s)$/, '')).filter(w => w.length > 2 && !STOP.has(w));

function jobTitle(text: string, fileName: string) {
  const ls = lines(text);
  for (const l of ls.slice(0, 25)) {
    const m = l.match(/^(job title|position|designation|role|post|title)\s*[:\-–]\s*(.+)$/i);
    if (m) return m[2].trim().slice(0, 80);
  }
  const first = ls.find(l => l.split(/\s+/).length <= 9 && !headingOf(l) && !/@|\d{6,}|www\.|http/i.test(l)
    && !/^(job description|jd|about (us|the company|apis))\b/i.test(l));
  return (first ?? fileName.replace(/\.[^.]+$/, '')).slice(0, 80);
}

export function profileJob(text: string, fileName: string): JobProfile {
  const lower = text.toLowerCase();
  const parts = sectioned(text);
  const required = new Set<string>(), preferred = new Set<string>();
  /* Skills seen only in the "About us" blurb. A JD opening "we are a
     leading FMCG company running SAP" is describing itself, not listing
     what the candidate must have, and counting those as requirements
     marks down every applicant for missing them. A skill the JD asks for
     somewhere else as well still counts, because the section that asks for
     it adds it on its own pass. */
  for (const { section, line } of parts) {
    const lo = line.toLowerCase();
    /* "Knowledge of SAP (preferred)" - preferred inline, too. */
    const pref = section === 'preferred' || /\b(preferred|good to have|nice to have|desirable|an advantage|a plus|added advantage)\b/i.test(line);
    for (const s of SKILL_MATCHERS) {
      if (s.count(line, lo) === 0) continue;
      if (section === 'summary' && !pref) continue;
      (pref ? preferred : required).add(s.name);
    }
  }
  for (const p of preferred) required.delete(p);
  const responsibilities = parts.filter(p => p.section === 'responsibilities' && p.line.split(/\s+/).length >= 4).map(p => p.line).slice(0, 14);
  const freq = new Map<string, number>();
  for (const w of contentWords(text)) freq.set(w, (freq.get(w) ?? 0) + 1);
  return {
    title: jobTitle(text, fileName),
    required: [...required],
    preferred: [...preferred],
    ...(() => { const e = jdExperience(text); return { minExp: e.min, maxExp: e.max }; })(),
    education: educationIn(parts.filter(p => p.section === 'education' || p.section === 'required' || /qualif|degree|graduat|educat/i.test(p.line)).map(p => p.line).join('\n') || text, 'lowest'),
    certifications: certsIn(text, lower),
    responsibilities,
    keywords: [...freq.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([w]) => w),
    fields: fieldsIn(parts.map(p => p.line).filter(l => DEGREE_LINE.test(l)).join('\n')),
    /* Whatever industry the JD itself is about - the one or two it names
       most. A JD that names none ranks without industry; HR can still pick
       one on the page. */
    industries: jdIndustries(text),
    location: jdLocation(text)?.name ?? null,
  };
}

export const HOME_INDUSTRY = 'FMCG & Food';

function jdIndustries(text: string): string[] {
  const found = industriesIn(text);
  const top = found[0]?.count ?? 0;
  return found.filter(i => i.count >= Math.max(1, top * 0.5)).slice(0, 2).map(i => i.name);
}

/* A line about a degree - where the JD says what it should be in. */
const DEGREE_LINE = /qualif|degree|graduat|educat|post ?grad|bachelor|master|\bmba\b|\bpgdm\b|b\.?\s?tech|m\.?\s?tech|b\.?\s?sc|m\.?\s?sc|b\.?\s?com|m\.?\s?com|\bbba\b|\bbca\b|\bmca\b|diploma|\bph\.?d/i;

/* "Location: Delhi NCR", or the first city near the top. */
function jdLocation(text: string): City | null {
  for (const l of lines(text).slice(0, 40)) {
    const m = l.match(/^(?:job\s+)?(?:location|work location|place of posting|posting|based (?:in|at)|city|base)\s*[:\-–]\s*(.+)$/i);
    if (m) { const city = cityIn(m[1]); if (city) return city; }
  }
  return cityIn(lines(text).slice(0, 12).join('\n')) ?? cityIn(text);
}

// ── a resume ──────────────────────────────────────────────────────────────

export interface Candidate {
  id: string;
  fileName: string;
  name: string;
  email: string;
  phone: string;
  /* Every skill found, with how often it comes up. */
  skills: Map<string, number>;
  experience: number | null;
  education: { level: number; labels: string[] };
  certifications: string[];
  projects: string[];
  achievements: string[];
  /* What their degrees are in. */
  fields: string[];
  /* Industries worked in, most first - read from the work history. */
  industries: { name: string; count: number }[];
  /* Where they are, and how that was worked out. */
  location: string | null;
  locationFrom: 'address' | 'header' | 'latest job' | null;
  relocate: boolean;
  text: string;
}

/* Where a candidate is: an address or location line, a city in the header,
   or the latest job's city - in that order of trust. */
function resumeLocation(text: string, parts: { section: Section; line: string }[]): { city: City | null; from: Candidate['locationFrom'] } {
  const ls = lines(text);
  for (const l of ls) {
    const m = l.match(/^(?:current\s+|present\s+|permanent\s+)?(?:location|address|city|residence|based (?:in|at)|lives in|place)\s*[:\-–]\s*(.+)$/i);
    if (m) { const city = cityIn(m[1]); if (city) return { city, from: 'address' }; }
  }
  /* The header: the lines above the first section heading - where people
     put where they live - not a city from the work history below it. */
  const firstHeading = ls.findIndex(l => headingOf(l));
  const header = ls.slice(0, Math.min(8, firstHeading < 0 ? 8 : firstHeading)).filter(l => !EDU_WORDS.test(l)).join('\n');
  const inHeader = cityIn(header);
  if (inHeader) return { city: inHeader, from: 'header' };
  const work = parts.filter(p => p.section === 'experience').map(p => p.line).join('\n');
  const inWork = work ? cityIn(work) : null;
  return inWork ? { city: inWork, from: 'latest job' } : { city: null, from: null };
}

/* Words that make a line a heading or a job title, not a person's name -
   "Work Experience", "Assistant Quality Assurance", "Sales Manager". */
const NOT_NAME = new RegExp('\\b(' + [
  'resume', 'curriculum', 'vitae', 'cv', 'bio', 'data', 'profile', 'summary', 'objective', 'address', 'contact', 'details',
  'personal', 'information', 'experience', 'work', 'employment', 'professional', 'career', 'education', 'qualification',
  'qualifications', 'skills', 'skill', 'projects', 'project', 'certifications', 'achievements', 'awards', 'references',
  'declaration', 'languages', 'hobbies', 'interests', 'strengths', 'key', 'core', 'competencies', 'technical', 'history',
  'manager', 'management', 'assistant', 'associate', 'executive', 'officer', 'engineer', 'engineering', 'developer',
  'analyst', 'consultant', 'specialist', 'coordinator', 'supervisor', 'head', 'lead', 'leader', 'director', 'president',
  'intern', 'trainee', 'senior', 'junior', 'sr', 'jr', 'chief', 'deputy', 'general', 'area', 'regional', 'zonal', 'national',
  'quality', 'assurance', 'control', 'sales', 'marketing', 'finance', 'accounts', 'accountant', 'hr', 'human', 'resources',
  'operations', 'production', 'plant', 'supply', 'chain', 'logistics', 'software', 'full', 'stack', 'business', 'development',
  'customer', 'service', 'support', 'admin', 'administration', 'team', 'member', 'technician', 'operator', 'chemist',
  'microbiologist', 'food', 'technologist', 'scientist', 'designer', 'architect', 'administrator', 'representative',
  'india', 'limited', 'ltd', 'pvt', 'private', 'company', 'university', 'college', 'school', 'institute', 'mobile', 'phone',
  'email', 'linkedin', 'github', 'date', 'birth', 'dob', 'nationality', 'gender', 'married', 'single', 'present', 'current',
].join('|') + ')\\b', 'i');

function candidateName(text: string, fileName: string) {
  const ls = lines(text);
  for (const l of ls.slice(0, 20)) {
    const m = l.match(/^(?:full\s+)?name\s*[:\-–]\s*(.+)$/i);
    if (m && !NOT_NAME.test(m[1])) return titleCase(m[1].replace(/[,|].*$/, '').trim());
  }
  const email = text.match(/([\w.+-]+)@[\w-]+\.[\w.]+/)?.[1].toLowerCase() ?? '';
  const emailParts = email.split(/[._\-+\d]+/).filter(p => p.length >= 3);

  /* A name: two to four words of letters, no heading or job-title words.
     The best is near the top, and best of all agrees with the email. */
  const tidy = (l: string) => l.replace(/[,|•·].*$/, '').replace(/\s+/g, ' ').trim();
  const looksLikeName = (l: string) => {
    const w = tidy(l).split(' ');
    return w.length >= 2 && w.length <= 4 && w.every(x => /^[A-Za-z][A-Za-z.'-]*$/.test(x) && x.length <= 20)
      && !NOT_NAME.test(l) && !headingOf(l);
  };
  const candidates = ls.slice(0, 25).map((l, i) => ({ l: tidy(l), i })).filter(({ l }) => looksLikeName(l));
  const agrees = (l: string) => emailParts.some(p => l.toLowerCase().split(' ').some(w => w.replace(/[^a-z]/g, '') === p));
  const best = candidates.find(c => agrees(c.l)) ?? candidates.find(c => c.i < 10);
  if (best) return titleCase(best.l);

  /* rahul.verma@… → Rahul Verma */
  if (emailParts.length >= 2 && emailParts.every(p => /^[a-z]+$/.test(p) && !NOT_NAME.test(p))) {
    return titleCase(emailParts.slice(0, 3).join(' '));
  }
  const fromFile = fileName.replace(/\.[^.]+$/, '').replace(/[_\-.()]+/g, ' ')
    .replace(/\b(resume|cv|updated|final|new|latest|copy|profile|biodata|\d+)\b/gi, '').replace(/\s+/g, ' ').trim();
  return fromFile ? titleCase(fromFile) : fileName;
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s.'-])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());

const ACHIEVE = /(achiev|award|recogni[sz]|top performer|best (employee|performer)|rank(ed)?\b|increas|grew|growth of|improv|reduc|sav(ed|ing)|exceed|won\b|promoted|record|\d+\s?%|₹\s?\d|rs\.?\s?\d|\d+\s?(cr|crore|lakh|lac)s?\b)/i;

export function profileResume(id: string, text: string, fileName: string): Candidate {
  const lower = text.toLowerCase();
  const parts = sectioned(text);
  const skills = new Map<string, number>();
  for (const s of SKILL_MATCHERS) { const n = s.count(text, lower); if (n) skills.set(s.name, n); }
  const sectionLines = (s: Section) => parts.filter(p => p.section === s).map(p => p.line);
  const projects = sectionLines('projects').filter(l => l.split(/\s+/).length >= 3).slice(0, 6);
  const achieved = sectionLines('achievements');
  const achievements = (achieved.length ? achieved : parts.map(p => p.line).filter(l => ACHIEVE.test(l)))
    .filter(l => l.length <= 240 && l.split(/\s+/).length >= 4).slice(0, 6);
  return {
    id, fileName, text,
    name: candidateName(text, fileName),
    email: text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? '',
    phone: text.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/)?.[0] ?? '',
    skills,
    experience: resumeExperience(parts, text),
    education: educationIn(sectionLines('education').join('\n') || text),
    certifications: certsIn(text, lower),
    projects,
    achievements,
    fields: fieldsIn((sectionLines('education').join('\n') || parts.map(p => p.line).filter(l => DEGREE_LINE.test(l)).join('\n'))),
    /* From the jobs, not the whole resume - "handled the Amazon account"
       in an FMCG job doesn't make someone an e-commerce person. */
    industries: industriesIn([...sectionLines('experience'), ...sectionLines('summary')].join('\n') || text),
    ...(() => { const l = resumeLocation(text, parts); return { location: l.city?.name ?? null, locationFrom: l.from }; })(),
    relocate: /willing to relocate|open to relocat|ready to relocate|can relocate|flexible (to|with) relocat/i.test(text),
  };
}

// ── the comparison ────────────────────────────────────────────────────────

export interface Weights {
  required: number; preferred: number; experience: number; education: number; industry: number; location: number;
  certifications: number; responsibilities: number;
}
/* HR's order of preference: industry first, then skills, education and
   location; experience, responsibilities and certifications after. The
   labels are in the same order, so the weights panel and the score
   breakdown read top to bottom by importance. */
export const DEFAULT_WEIGHTS: Weights = {
  industry: 30, required: 22, preferred: 6, education: 16, location: 12, experience: 8, responsibilities: 4, certifications: 2,
};
export const WEIGHT_LABELS: Record<keyof Weights, string> = {
  industry: 'Industry', required: 'Required skills', preferred: 'Preferred skills', education: 'Education',
  location: 'Location', experience: 'Experience', responsibilities: 'Responsibilities fit', certifications: 'Certifications',
};
/* Equal scores are settled by the same order. */
const TIE_ORDER: (keyof Weights)[] = ['industry', 'required', 'education', 'location'];

export interface Part { key: keyof Weights; label: string; weight: number; score: number; note: string }

export interface Match {
  candidate: Candidate;
  score: number;
  band: 'Strong match' | 'Good match' | 'Partial match' | 'Low match';
  parts: Part[];
  matchedRequired: string[];
  missingRequired: string[];
  matchedPreferred: string[];
  missingPreferred: string[];
  /* Skills the resume shows that the JD didn't ask for. */
  otherSkills: string[];
  matchedCerts: string[];
  responsibilities: { line: string; covered: boolean }[];
  meetsExperience: boolean | null;
  meetsEducation: boolean | null;
  /* The JD's field of study, if it names one, and whether it matches. */
  fieldMatch: boolean | null;
  /* Same industry as the JD asks, a related one, another, or unknown. */
  industryFit: 'same' | 'related' | 'other' | null;
  /* Kilometres from the job; null when either city isn't known. */
  distance: number | null;
}

export function bandOf(score: number): Match['band'] {
  return score >= 75 ? 'Strong match' : score >= 55 ? 'Good match' : score >= 35 ? 'Partial match' : 'Low match';
}

/* Score one resume against the JD. A part the JD says nothing about (no
   certifications asked for, say) drops out, and the rest are scaled up to
   100 - a candidate isn't marked down for what nobody asked. */
export function compare(job: JobProfile, c: Candidate, weights: Weights): Match {
  const lower = c.text.toLowerCase();
  const has = (skill: string) => c.skills.has(skill) || skillMatcher(skill)(c.text, lower) > 0;
  const matchedRequired = job.required.filter(has), missingRequired = job.required.filter(s => !has(s));
  const matchedPreferred = job.preferred.filter(has), missingPreferred = job.preferred.filter(s => !has(s));
  const asked = new Set([...job.required, ...job.preferred]);
  const otherSkills = [...c.skills.keys()].filter(s => !asked.has(s));
  const matchedCerts = job.certifications.filter(x => c.certifications.includes(x));

  const resumeWords = new Set(contentWords(c.text));
  const responsibilities = job.responsibilities.map(line => {
    const words = Array.from(new Set(contentWords(line)));
    const hit = words.filter(w => resumeWords.has(w)).length;
    return { line, covered: words.length > 0 && hit >= Math.min(2, words.length) && hit / words.length >= 0.35 };
  });

  let meetsExperience: boolean | null = null, expScore: number | null = null, expNote = 'Not stated in JD';
  if (job.minExp !== null) {
    if (c.experience === null) { expScore = 0.3; expNote = `JD asks ${job.minExp}+ yrs · not found in resume`; meetsExperience = false; }
    else {
      meetsExperience = c.experience >= job.minExp;
      /* Past the top of a stated range is often a different level of
         role: said plainly and deducted a little, further past it
         deducted more. Neither is a rejection -- an over-qualified
         candidate is a decision for a person, and scoring them a
         silent 100 hid the question. */
      const over = job.maxExp !== null ? c.experience - job.maxExp : 0;
      expScore = !meetsExperience ? Math.max(0, c.experience / Math.max(job.minExp, 0.5))
        : over > 3 ? 0.8 : over > 0 ? 0.92 : 1;
      expNote = `${c.experience} yrs vs ${job.minExp}${job.maxExp ? `–${job.maxExp}` : '+'} yrs asked`
        + (over > 3 ? ' · well above the range' : over > 0 ? ' · above the range' : '');
    }
  }

  /* Education as the JD puts it: the level (graduate, postgraduate…) and,
     when the JD names one, the field it should be in. */
  let meetsEducation: boolean | null = null, eduScore: number | null = null, eduNote = 'Not stated in JD';
  const fieldMatch = job.fields.length ? job.fields.some(f => c.fields.includes(f)) : null;
  if (job.education.level > 0 || job.fields.length) {
    const level = job.education.level > 0
      ? (c.education.level >= job.education.level ? 1 : c.education.level > 0 ? c.education.level / job.education.level * 0.7 : 0)
      : null;
    meetsEducation = level === null ? fieldMatch : level === 1 && fieldMatch !== false;
    eduScore = level === null ? (fieldMatch ? 1 : 0.3)
      : fieldMatch === null ? level : level * 0.7 + (fieldMatch ? 0.3 : 0);
    const asked = EDUCATION.find(e => job.education.labels.includes(e.label) && e.level === job.education.level)?.label;
    const theirs = `${c.education.labels[0] ?? 'Not found'}${c.fields.length ? ` (${c.fields.slice(0, 2).join(', ')})` : ''}`;
    eduNote = `${theirs} vs ${[asked, job.fields.length ? `in ${job.fields.join(' / ')}` : ''].filter(Boolean).join(' ')} asked`;
  }

  /* Industry: the JD's (ours, by default) - full marks; a related one,
     part; anything else, a little; not clear from the resume, a little more. */
  let industryFit: Match['industryFit'] = null, indScore: number | null = null, indNote = 'No industry set';
  if (job.industries.length) {
    const top = c.industries[0]?.count ?? 0;
    const strong = c.industries.filter(i => i.count >= Math.max(1, top * 0.5)).map(i => i.name);
    const related = new Set(job.industries.flatMap(n => industryByName(n)?.related ?? []));
    industryFit = !c.industries.length ? null
      : strong.some(n => job.industries.includes(n)) || c.industries.some(i => job.industries.includes(i.name) && i.count >= 2) ? 'same'
      : c.industries.some(i => job.industries.includes(i.name) || related.has(i.name)) ? 'related' : 'other';
    indScore = industryFit === 'same' ? 1 : industryFit === 'related' ? 0.6 : industryFit === 'other' ? 0.15 : 0.35;
    indNote = c.industries.length
      ? `${c.industries.slice(0, 2).map(i => i.name).join(', ')} vs ${job.industries.join(' / ')}`
      : `Not clear from the resume · ${job.industries.join(' / ')} wanted`;
  }

  /* Location: distance from the job, nearer is better; willing to
     relocate counts for something. */
  let distance: number | null = null, locScore: number | null = null, locNote = 'No job location set';
  const jobCity = job.location ? cityByName(job.location) : undefined;
  if (jobCity) {
    const theirs = c.location ? cityByName(c.location) : undefined;
    if (theirs) {
      distance = distanceKm(jobCity, theirs);
      locScore = locationScore(distance);
      if (c.relocate) locScore = Math.max(locScore, 0.7);
      locNote = distance <= 40 ? `${theirs.name} · same area as ${jobCity.name}` : `${theirs.name} · ~${distance} km from ${jobCity.name}`;
    } else {
      locScore = c.relocate ? 0.7 : 0.35;
      locNote = `Location not found in resume${c.relocate ? ' · willing to relocate' : ''}`;
    }
    if (c.relocate && theirs) locNote += ' · willing to relocate';
  }

  const ratio = (a: number, b: number) => (b ? a / b : null);
  const raw: [keyof Weights, number | null, string][] = [
    ['industry', indScore, indNote],
    ['required', ratio(matchedRequired.length, job.required.length), `${matchedRequired.length} of ${job.required.length}`],
    ['preferred', ratio(matchedPreferred.length, job.preferred.length), `${matchedPreferred.length} of ${job.preferred.length}`],
    ['education', eduScore, eduNote],
    ['location', locScore, locNote],
    ['experience', expScore, expNote],
    ['responsibilities', ratio(responsibilities.filter(r => r.covered).length, responsibilities.length),
      `${responsibilities.filter(r => r.covered).length} of ${responsibilities.length} covered`],
    ['certifications', ratio(matchedCerts.length, job.certifications.length), `${matchedCerts.length} of ${job.certifications.length}`],
  ];
  const parts: Part[] = raw.filter(([, s]) => s !== null).map(([key, s, note]) => ({
    key, label: WEIGHT_LABELS[key], weight: weights[key], score: Math.round((s as number) * 100), note,
  }));
  const total = parts.reduce((t, p) => t + p.weight, 0);
  const score = total ? Math.round(parts.reduce((t, p) => t + p.weight * p.score, 0) / total) : 0;

  return {
    candidate: c, score, band: bandOf(score), parts,
    matchedRequired, missingRequired, matchedPreferred, missingPreferred, otherSkills, matchedCerts,
    responsibilities, meetsExperience, meetsEducation, fieldMatch, industryFit, distance,
  };
}

/* Why this person, in words.
 *
 * The score answers "how much" and the eight bars answer "out of what",
 * but neither answers the question somebody actually opens a shortlist
 * with: why is this one above that one. The strongest two things and the
 * worst two, named, so a row can be read without expanding it.
 *
 * Everything here is drawn from the same parts the score is, so the words
 * and the number can never say different things.
 */
export interface Verdict { strengths: string[]; concerns: string[]; headline: string }

function phrase(m: Match, job: JobProfile, p: Part, good: boolean): string | null {
  const c = m.candidate;
  switch (p.key) {
    case 'industry':
      return m.industryFit === 'same' ? `right industry (${c.industries[0]?.name ?? job.industries[0]})`
        : m.industryFit === 'related' ? 'a related industry'
        : m.industryFit === 'other' ? `not from ${job.industries.join(' / ')}`
        : 'industry not clear from the resume';
    case 'required':
      return good ? `${m.matchedRequired.length} of ${job.required.length} required skills`
        : `missing ${m.missingRequired.slice(0, 3).join(', ')}`;
    case 'preferred':
      return good && m.matchedPreferred.length ? `has ${m.matchedPreferred.join(', ')}` : null;
    case 'experience':
      return c.experience === null ? 'no years of experience stated'
        : m.meetsExperience === false ? `${c.experience} yrs against ${job.minExp} asked`
        : `${c.experience} yrs${job.maxExp !== null && c.experience > job.maxExp ? ', above the range' : ''}`;
    case 'education':
      return good ? `education fits${job.fields.length && m.fieldMatch ? ` (${job.fields[0]})` : ''}`
        : m.fieldMatch === false && job.fields.length ? `degree is not in ${job.fields.join(' / ')}`
        : 'education below what the JD asks';
    case 'location':
      return m.distance === null ? (c.relocate ? 'location unknown, will relocate' : 'location not found')
        : m.distance <= 40 ? `in ${c.location}`
        : `${c.location}, ~${m.distance} km away${c.relocate ? ', will relocate' : ''}`;
    case 'certifications':
      return good ? `holds ${m.matchedCerts.join(', ')}` : `no ${job.certifications.join(' / ')}`;
    case 'responsibilities': {
      const n = m.responsibilities.filter(r => r.covered).length;
      return good ? `covers ${n} of ${m.responsibilities.length} responsibilities`
        : `touches only ${n} of ${m.responsibilities.length} responsibilities`;
    }
    default:
      return null;
  }
}

export function verdict(m: Match, job: JobProfile): Verdict {
  /* Ranked by what each part actually did to the score, not by its own
     percentage: 100% on a 2%-weighted part is not a reason to hire. */
  const byGain = [...m.parts].sort((a, b) => b.weight * b.score - a.weight * a.score);
  const byLoss = [...m.parts].sort((a, b) => b.weight * (100 - b.score) - a.weight * (100 - a.score));

  const strengths = byGain.filter(p => p.score >= 70)
    .map(p => phrase(m, job, p, true)).filter(Boolean).slice(0, 3) as string[];
  const concerns = byLoss.filter(p => p.score < 60)
    .map(p => phrase(m, job, p, false)).filter(Boolean).slice(0, 3) as string[];

  const headline = strengths.length
    ? strengths.slice(0, 2).join(' · ') + (concerns.length ? ` · but ${concerns[0]}` : '')
    : concerns.length ? concerns.slice(0, 2).join(' · ') : 'Nothing in the JD to compare against';
  return { strengths, concerns, headline: headline.charAt(0).toUpperCase() + headline.slice(1) };
}

export function rank(job: JobProfile, candidates: Candidate[], weights: Weights): Match[] {
  const part = (m: Match, key: keyof Weights) => m.parts.find(p => p.key === key)?.score ?? 0;
  return candidates.map(c => compare(job, c, weights))
    .sort((a, b) => b.score - a.score
      || TIE_ORDER.reduce((d, k) => d || part(b, k) - part(a, k), 0)
      || (b.candidate.experience ?? 0) - (a.candidate.experience ?? 0));
}
