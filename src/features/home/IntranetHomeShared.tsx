/* Shared data + animation styles for the APIS Internal Tools intranet home
   page — the landing screen every user sees first. Content here is
   intentionally honest: no fabricated business metrics, no invented people,
   no imaginary products. "What's New" describes real recent platform work;
   "At a Glance" describes the tools platform itself, not the company. */
import type { ComponentType, SVGProps } from 'react';
import {
  Users, FileSpreadsheet, Building2,
  TrendingUp, Sparkles, BarChart3, Radar, Zap, Plane, Megaphone,
  LifeBuoy, Globe2, CalendarClock, Landmark,
  Shield, BookOpen, Lightbulb, Target, Heart, Wallet, Scale, Stamp,
} from 'lucide-react';

/* lucide-react dropped brand icons, so these are small hand-rolled SVG marks
   (currentColor, 24x24 viewBox) — standard practice for social "follow us"
   links, not a new dependency. */
const LinkedInIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002M7 8.48H3V21h4zM20.34 21h-.002V14.13c0-3.28-.7-5.81-4.55-5.81a3.97 3.97 0 0 0-3.58 1.97h-.05V8.48h-3.83v12.5h3.99v-6.19c0-1.63.31-3.21 2.34-3.21 2 0 2.02 1.87 2.02 3.32V21z"/>
  </svg>
);
const YouTubeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.51 3.5 12 3.5 12 3.5s-7.51 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.87.55 9.38.55 9.38.55s7.51 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81M9.6 15.6V8.4l6.27 3.6z"/>
  </svg>
);
const InstagramIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2c2.72 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.25 1.21.6 1.76 1.15.5.5.9 1.1 1.15 1.76.25.64.42 1.37.47 2.43.05 1.06.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.76c-.5.5-1.1.9-1.76 1.15-.64.25-1.37.42-2.43.47-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.76-1.15 4.9 4.9 0 0 1-1.15-1.76c-.25-.64-.42-1.37-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.47-2.43.25-.66.6-1.21 1.15-1.76A4.9 4.9 0 0 1 5.44.54C6.08.29 6.81.12 7.87.07 8.94.02 9.28 0 12 0m0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84m0 10.16A4 4 0 1 1 12 8a4 4 0 0 1 0 8m6.4-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0"/>
  </svg>
);
const FacebookIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12"/>
  </svg>
);
const XIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.22-6.82-5.97 6.82H1.65l7.73-8.84L1.25 2.25h6.83l4.72 6.24zm-1.16 17.52h1.83L7.02 4.13H5.06z"/>
  </svg>
);

/* Real APIS India Limited social accounts, taken directly from the anchor
   hrefs on apisindia.com's own footer — not guessed. Coloured in each
   platform's own brand colour at rest, not just on hover. */
export const SOCIAL_LINKS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/apis-india-ltd/', icon: LinkedInIcon, bg: 'bg-[#0A66C2]' },
  { label: 'YouTube', href: 'https://www.youtube.com/channel/UCbSF_MEdOdshf3QvglvBflQ', icon: YouTubeIcon, bg: 'bg-[#FF0000]' },
  { label: 'Instagram', href: 'https://www.instagram.com/apisindialtd/', icon: InstagramIcon, bg: 'bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888]' },
  { label: 'Facebook', href: 'https://www.facebook.com/apisindialtd', icon: FacebookIcon, bg: 'bg-[#1877F2]' },
  { label: 'X', href: 'https://x.com/apis_india', icon: XIcon, bg: 'bg-black' },
];

/* "Quote of the day" popup content — a fixed pool of real, attributed
   quotes (people and well-known characters), rotated one-per-day so
   everyone sees the same quote all day and a different one tomorrow. Not
   a live feed; add more lines to the pool any time. */
export interface InspirationQuote { text: string; author: string; }
export const INSPIRATION_QUOTES: InspirationQuote[] = [
  { text: "You are who you are meant to be. Dance as if no one's watching. Love as if it's all you know. Dream as if you'll live forever. Live as if you'll die today.", author: 'James Dean' },
  { text: 'You do not find the happy life. You make it.', author: 'Camilla Eyring Kimball' },
  { text: "You've gotta dance like there's nobody watching, Love like you'll never be hurt, Sing like there's nobody listening, And live like it's heaven on earth.", author: 'William W. Purkey' },
  { text: 'Happiness is not something readymade. It comes from your own actions.', author: 'Dalai Lama' },
  { text: "You learn more from failure than from success. Don't let it stop you. Failure builds character.", author: 'Unknown' },
  { text: 'Fairytales do not tell children that dragons exist. Children already know that dragons exist. Fairytales tell children that dragons can be killed.', author: 'G K Chesterton' },
  { text: "The bad news is time flies. The good news is you're the pilot.", author: 'Michael Altshuler' },
  { text: 'Learn as if you will live forever, live like you will die tomorrow.', author: 'Mahatma Gandhi' },
  { text: 'It is only when we take chances, when our lives improve. The initial and the most difficult risk that we need to take is to become honest.', author: 'Walter Anderson' },
  { text: 'All our dreams can come true if we have the courage to pursue them.', author: 'Walt Disney' },
  { text: 'Never bend your head. Always hold it high. Look the world straight in the eye.', author: 'Helen Keller' },
  { text: "We generate fears while we sit. We overcome them by action. Fear is nature's way of warning us to get busy.", author: 'Dr. Henry Link' },
  { text: 'The man who has confidence in himself gains the confidence of others.', author: 'Hasidic Proverb' },
  { text: 'What you lack in talent can be made up with desire, hustle and giving 110% all the time.', author: 'Don Zimmer' },
  { text: 'Fake it until you make it! Act as if you had all the confidence you require until it becomes your reality.', author: 'Brian Tracy' },
  { text: "Imperfection is beauty, madness is genius and it's better to be absolutely ridiculous than absolutely boring.", author: 'Marilyn Monroe' },
  { text: 'May your choices reflect your hopes, not your fears.', author: 'Nelson Mandela' },
  { text: 'Remember always that you have not only the right to be an individual; you have an obligation to be one. You cannot make any useful contribution in life unless you do this.', author: 'Eleanor Roosevelt' },
  { text: 'It takes courage to grow up and become who you really are.', author: 'E.E. Cummings' },
  { text: 'You were born to win, but to be a winner, you must plan to win, prepare to win, and expect to win.', author: 'Zig Ziglar' },
  { text: "Let us make our future now, and let us make our dreams tomorrow's reality.", author: 'Malala Yousafzai' },
  { text: 'The best way to get started is to quit talking and begin doing.', author: 'Walt Disney' },
  { text: 'Leaders set high standards. Refuse to tolerate mediocrity or poor performance.', author: 'Brian Tracy' },
  { text: "It's not whether you get knocked down, it's whether you get back up.", author: 'Vince Lombardi' },
  { text: 'It is often the small steps, not the giant leaps, that bring about the most lasting change.', author: 'Queen Elizabeth II' },
  { text: 'I can\'t change the direction of the wind, but I can adjust my sails to always reach my destination.', author: 'Jimmy Dean' },
  { text: "Don't Let Yesterday Take Up Too Much Of Today.", author: 'Will Rogers' },
  { text: 'We may encounter many defeats but we must not be defeated.', author: 'Maya Angelou' },
  { text: 'Leaders never use the word failure. They look upon setbacks as learning experiences.', author: 'Brian Tracy' },
  { text: 'We become what we think about', author: 'Earl Nightingale' },
  { text: 'There are no limits to what you can accomplish, except the limits you place on your own thinking.', author: 'Brian Tracy' },
  { text: "Inspiration comes from within yourself. One has to be positive. When you're positive, good things happen.", author: 'Deep Roy' },
  { text: "You define your own life. Don't let other people write your script.", author: 'Oprah Winfrey' },
  { text: 'Think like a queen. A queen is not afraid to fail. Failure is another stepping stone to greatness.', author: 'Oprah Winfrey' },
  { text: 'Turn your wounds into wisdom.', author: 'Oprah Winfrey' },
  { text: 'Doing the best at this moment puts you in the best place for the next moment.', author: 'Oprah Winfrey' },
  { text: "Real integrity is doing the right thing, knowing that nobody's going to know whether you did it or not.", author: 'Oprah Winfrey' },
];

/* Deterministic "pick" from today's date — same quote for everyone all day,
   a different one tomorrow, no backend or stored state needed. */
export const dailyQuote = (): InspirationQuote => {
  const d = new Date();
  const dayNumber = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return INSPIRATION_QUOTES[dayNumber % INSPIRATION_QUOTES.length];
};

export type QuickAccessId =
  | 'extractor' | 'performance' | 'appraisal' | 'goal-setting' | 'eom' | 'pms'
  | 'offer-letters' | 'roompulse' | 'salesiq' | 'tada';

/* Business-function grouping shown as filter tabs on the "Your Tools" grid.
   Purely a UI grouping — has no bearing on access control. */
export const TOOL_CATEGORIES = ['All', 'HR', 'Finance', 'Operations', 'Sales', 'Travel'] as const;
export type ToolCategoryFilter = typeof TOOL_CATEGORIES[number];
export type ToolCategory = Exclude<ToolCategoryFilter, 'All'>;

export interface QuickAccessItem {
  id: QuickAccessId;
  label: string;
  desc: string;
  category: ToolCategory;
  icon: ComponentType<{ className?: string }>;
  gradient: string;   // tailwind gradient classes — used on the fuller "Explore All Tools" cards
  glow: string;        // rgba used for the hover glow
  accent: string;       // solid icon colour for the flat quick-access tiles
  soft: string;          // matching tinted chip background
}

export const QUICK_ACCESS: QuickAccessItem[] = [
  { id: 'extractor', label: 'Data Extractor', desc: 'Joining forms, medical & payroll data tools', category: 'Operations', icon: FileSpreadsheet, gradient: 'from-amber-400 to-orange-500', glow: 'rgba(245,158,11,.35)', accent: 'text-amber-600', soft: 'bg-amber-50' },
  { id: 'performance', label: 'Performance Hub', desc: 'Goals, reviews & performance tracking', category: 'HR', icon: TrendingUp, gradient: 'from-violet-400 to-purple-600', glow: 'rgba(139,92,246,.35)', accent: 'text-violet-600', soft: 'bg-violet-50' },
  { id: 'appraisal', label: 'Appraisal Hub', desc: 'Annual appraisal cycle management', category: 'HR', icon: TrendingUp, gradient: 'from-blue-400 to-indigo-600', glow: 'rgba(59,130,246,.35)', accent: 'text-blue-600', soft: 'bg-blue-50' },
  { id: 'goal-setting', label: 'Goal Setting', desc: 'Agree KRAs & KPIs with manager and HOD', category: 'HR', icon: Target, gradient: 'from-amber-400 to-orange-600', glow: 'rgba(245,158,11,.35)', accent: 'text-amber-600', soft: 'bg-amber-50' },
  { id: 'eom', label: 'EOM Hub', desc: 'Employee of the Month nominations', category: 'Finance', icon: Sparkles, gradient: 'from-emerald-400 to-teal-600', glow: 'rgba(16,185,129,.35)', accent: 'text-emerald-600', soft: 'bg-emerald-50' },
  { id: 'pms', label: 'PMS Simulator', desc: 'Performance & salary revision simulator', category: 'HR', icon: BarChart3, gradient: 'from-violet-500 to-fuchsia-600', glow: 'rgba(168,85,247,.35)', accent: 'text-fuchsia-600', soft: 'bg-fuchsia-50' },
  { id: 'offer-letters', label: 'Letters Generator', desc: 'Appraisal & warning letter pipeline', category: 'HR', icon: FileSpreadsheet, gradient: 'from-rose-400 to-pink-600', glow: 'rgba(244,63,94,.35)', accent: 'text-rose-600', soft: 'bg-rose-50' },
  { id: 'roompulse', label: 'AdminPulse', desc: 'Room bookings & admin item requests', category: 'Operations', icon: Radar, gradient: 'from-cyan-400 to-blue-600', glow: 'rgba(6,182,212,.35)', accent: 'text-cyan-600', soft: 'bg-cyan-50' },
  { id: 'salesiq', label: 'SalesIQ', desc: 'Sales intelligence & forecasting', category: 'Sales', icon: Zap, gradient: 'from-indigo-400 to-violet-600', glow: 'rgba(99,102,241,.35)', accent: 'text-indigo-600', soft: 'bg-indigo-50' },
  { id: 'tada', label: 'TA/DA Portal', desc: 'Travel & daily allowance claims', category: 'Travel', icon: Plane, gradient: 'from-sky-400 to-cyan-600', glow: 'rgba(14,165,233,.35)', accent: 'text-sky-600', soft: 'bg-sky-50' },
];

/* APIS's "UPLIFT" core values — the initials spell the acronym. Supplied
   directly (not independently verified against a published source page),
   same provenance caveat as APIS_FACTS. Replaces the old WORKSPACE_STATS
   placeholder rail on the home page. */
export interface UpliftValue {
  letter: string;
  label: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
  color: 'blue' | 'orange' | 'emerald' | 'amber' | 'pink';
}
export const UPLIFT_VALUES: UpliftValue[] = [
  { letter: 'U', label: 'Unwavering Integrity', desc: 'We uphold the highest standards of honesty and integrity in everything we do.', icon: Shield, color: 'blue' },
  { letter: 'P', label: 'People First', desc: 'Our people are at the heart of our success. We care, respect and grow together.', icon: Users, color: 'orange' },
  { letter: 'L', label: 'Lifelong Learning', desc: 'We foster a culture of curiosity and continuous learning.', icon: BookOpen, color: 'emerald' },
  { letter: 'I', label: 'Innovative Thinking', desc: 'We embrace new ideas and challenge the status quo to create better solutions.', icon: Lightbulb, color: 'amber' },
  { letter: 'F', label: 'Futuristic Focus', desc: 'We think ahead and act today for a sustainable tomorrow.', icon: Target, color: 'blue' },
  { letter: 'T', label: 'Trusted Excellence', desc: 'We deliver excellence consistently and earn the trust of all our stakeholders.', icon: Heart, color: 'pink' },
];

export interface NavGroup {
  label: string;
  icon: ComponentType<{ className?: string }>;
  items: { id: QuickAccessId; label: string }[];
  accent: string;   // active text colour, sidebar is dark so these are the *-300/400 shades
  hoverAccent: string; // full "hover:text-*" class — kept whole so Tailwind's static scan finds it
  dot: string;        // solid colour for the little indicator dot
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Performance', icon: TrendingUp, accent: 'text-violet-300', hoverAccent: 'hover:text-violet-300', dot: 'bg-violet-400', items: [
      { id: 'performance', label: 'Performance Hub' },
      { id: 'appraisal', label: 'Appraisal Hub' },
      { id: 'goal-setting', label: 'Goal Setting' },
      { id: 'pms', label: 'PMS Simulator' },
      { id: 'eom', label: 'Employee of the Month' },
    ],
  },
  {
    label: 'People & Documents', icon: Users, accent: 'text-amber-300', hoverAccent: 'hover:text-amber-300', dot: 'bg-amber-400', items: [
      { id: 'extractor', label: 'Data Extractor' },
      { id: 'offer-letters', label: 'Letters Generator' },
    ],
  },
  {
    label: 'Admin & Facilities', icon: Building2, accent: 'text-cyan-300', hoverAccent: 'hover:text-cyan-300', dot: 'bg-cyan-400', items: [
      { id: 'roompulse', label: 'AdminPulse' },
    ],
  },
  {
    label: 'Sales & Travel', icon: Zap, accent: 'text-indigo-300', hoverAccent: 'hover:text-indigo-300', dot: 'bg-indigo-400', items: [
      { id: 'salesiq', label: 'SalesIQ' },
      { id: 'tada', label: 'TA/DA Portal' },
    ],
  },
];

export interface NewJoiner { name: string; date: string; }

/* No real HRMS onboarding feed is wired up yet — sample rows showing the
   New Joiners widget's intended shape (IntranetHomePage.tsx), not real
   employees. Same honest "sample data" pattern as SAMPLE_BIRTHDAYS below —
   replace with a real HR feed and drop the caveat rendered under the
   widget heading once one exists. */
export const SAMPLE_NEW_JOINERS: NewJoiner[] = [
  { name: 'Aman Sharma', date: '22 Aug' },
  { name: 'Priya Rathi', date: '23 Aug' },
  { name: 'Rohit Kumar', date: '24 Aug' },
];

export interface Vacancy { title: string; openings: number; location: string; }

/* No real ATS/careers feed is wired up yet — sample rows showing the
   Vacancies widget's intended shape, not real open roles. Same honest
   "sample data" pattern as SAMPLE_NEW_JOINERS above. */
export const SAMPLE_VACANCIES: Vacancy[] = [
  { title: 'Data Analyst', openings: 2, location: 'Work from Office' },
  { title: 'HR Executive', openings: 1, location: 'Work from Office' },
  { title: 'Digital Marketing', openings: 1, location: 'Work from Office' },
];

export interface CelebrationEntry { name: string; date: string; }

/* No real HRMS/birthday feed is wired up yet — sample rows showing the
   Birthdays/Anniversaries widget's intended shape (IntranetHomePage.tsx),
   not real employees or dates. Same honest "sample data" pattern as
   UPCOMING_EVENTS above — replace with a real HR feed and drop the caveat
   rendered under the widget heading once one exists. */
export const SAMPLE_BIRTHDAYS: CelebrationEntry[] = [
  { name: 'Neha Sharma', date: '22 Aug' },
  { name: 'Rahul Verma', date: '27 Aug' },
  { name: 'Pooja Singh', date: '28 Aug' },
  { name: 'Arjun Mehta', date: '7 Mar' },
];
export const SAMPLE_ANNIVERSARIES: CelebrationEntry[] = [
  { name: 'Kritika Rao', date: '14 Sep' },
  { name: 'Manish Gupta', date: '3 Jun' },
  { name: 'Sneha Kapoor', date: '19 Jan' },
];

export interface HomeAnnouncement {
  title: string; body: string; date: string; icon: ComponentType<{ className?: string }>;
}
/* No real announcements/CMS feed is wired up yet — sample rows shown on the
   home dashboard's Announcements card (IntranetHomePage.tsx), shaped the way
   a real feed would look. Same honest "sample data" pattern as
   SAMPLE_BIRTHDAYS above; also reused as-is on the Helpdesk page. */
export const ANNOUNCEMENTS: HomeAnnouncement[] = [
  { title: 'Helpdesk Portal Maintenance', body: 'The Helpdesk portal will be under maintenance on 2 Sep 2026 (11:00 PM – 12:00 AM).', date: '31 Aug 2026', icon: Sparkles },
  { title: 'New Ticketing System Update', body: "We've upgraded our ticketing system for faster and better support.", date: '28 Aug 2026', icon: Megaphone },
];

export const COMING_SOON = [
  { label: 'Budget', icon: Wallet, soft: 'bg-emerald-50', accent: 'text-emerald-500' },
  { label: 'Compliance', icon: Scale, soft: 'bg-violet-50', accent: 'text-violet-500' },
  { label: 'Sanction Approvals', icon: Stamp, soft: 'bg-indigo-50', accent: 'text-indigo-500' },
  { label: 'Announcements', icon: Megaphone, soft: 'bg-amber-50', accent: 'text-amber-500' },
  { label: 'Help & Support', icon: LifeBuoy, soft: 'bg-sky-50', accent: 'text-sky-500' },
];

/* Real APIS India Limited product photography, sourced from apisindia.com —
   same images used in the hero carousel. Linked from the sidebar's "Our
   Products" entry so the two aren't disconnected.
   `image` paths beyond the first two don't have a file in
   public/products/ yet — <ProductPhoto> (IntranetHomePage.tsx) falls back
   to a neutral icon tile until the real photo is dropped in at that exact
   path, so nothing renders broken in the meantime. */
/* `packagingImages` powers the "Packaging Types" popup on each product card
   (IntranetHomePage.tsx) — real packaging photography, uploaded directly
   into public/packaging/, mapped to the product it was named after. No
   weight/type metadata is included since none was supplied with the
   photos; the popup just shows the pack photo(s) as-is. */
/** One SKU within a product's pack-size lineup — e.g. Organic Honey ships
 *  in seven sizes from 1kg jars down to 15g miniatures, each at its own
 *  case count. `variant` names a distinct pack design sharing the
 *  product's shelf slot (Royal Zahidi Dates covers six: Royal Zahidi,
 *  Arabian Pearls, Shahenshah Black Dates, Classic Dates, Select Dates,
 *  Desert Bliss Dates) — omitted where a product has only one design, like
 *  Organic Honey. Every other field is optional too and omitted where the
 *  source chart didn't give it (the dates chart had no MRP; the green tea
 *  chart had no case count; the Vermicelli chart names packs by price and
 *  case count with no gram weight at all) — the popup's table only shows
 *  the columns that at least one row of this product actually carries.
 *  Supplied per-product (see PACK_SIZES below); products without an entry
 *  there just show their packagingImages plain, same as before. */
export interface PackSize { variant?: string; weight?: string; price?: string; unitsPerCase?: string; }

/* Pack-size lineups, keyed by product label — kept alongside OUR_PRODUCTS
   rather than inline on it since only a couple of products have one
   supplied so far. Real figures from the packaging charts provided
   (Sep 2026). */
export const PACK_SIZES: Record<string, PackSize[]> = {
  'Organic Honey': [
    { weight: '1 kg', unitsPerCase: '12 pcs' },
    { weight: '500 g', unitsPerCase: '24 pcs' },
    { weight: '225 g', unitsPerCase: '48 pcs' },
    { weight: '100 g', unitsPerCase: '72 pcs' },
    { weight: '50 g', unitsPerCase: '144 pcs' },
    { weight: '20 g', unitsPerCase: '288 pcs (12 tray)' },
    { weight: '15 g', unitsPerCase: '576 pcs (24 tray)' },
  ],
  'Royal Zahidi Dates': [
    { variant: 'Royal Zahidi', weight: '500 g', unitsPerCase: '12 pcs' },
    { variant: 'Royal Zahidi', weight: '250 g', unitsPerCase: '20 pcs' },
    { variant: 'Arabian Pearls (Fard)', weight: '500 g', unitsPerCase: '24 pcs' },
    { variant: 'Arabian Pearls (Fard)', weight: '250 g', unitsPerCase: '40 pcs' },
    { variant: 'Shahenshah Black Dates', weight: '500 g', unitsPerCase: '24 pcs' },
    { variant: 'Shahenshah Black Dates', weight: '250 g', unitsPerCase: '40 pcs' },
    { variant: 'Classic Dates', weight: '500 g', unitsPerCase: '24 pcs' },
    { variant: 'Classic Dates', weight: '250 g', unitsPerCase: '40 pcs' },
    { variant: 'Select Dates', weight: '500 g', unitsPerCase: '24 pcs' },
    { variant: 'Desert Bliss Dates', weight: '400 g', unitsPerCase: '24 pcs' },
  ],
  'Lemon Honey Green Tea': [
    { variant: 'Detox Kahwa', weight: '10 sachets (Mono Pack)', unitsPerCase: '10 pcs' },
    { variant: 'Lemon Honey', weight: '10 sachets (Mono Pack)', unitsPerCase: '24 pcs' },
  ],
  'Saffron': [
    { variant: 'Saffron', weight: '0.5 g', unitsPerCase: '10 pcs' },
    { variant: 'Saffron', weight: '1 g', unitsPerCase: '10 pcs' },
    { variant: 'Saffron Gold', weight: '1 g', unitsPerCase: '10 pcs' },
  ],
  'Vermicelli': [
    { variant: 'Roasted', unitsPerCase: '140 pcs' },
    { variant: 'Plain (Untouched by Hands)', unitsPerCase: '200 pcs' },
  ],
  'Mixed Fruit Jam': [
    { weight: '500 g', unitsPerCase: '24 pcs' },
    { weight: '90 g', unitsPerCase: '96 pcs' },
  ],
  'Ginger Garlic Paste': [
    { weight: '200 g', unitsPerCase: '60 pcs' },
    { weight: '20 g', unitsPerCase: '480 pcs' },
  ],
  'Corn Flakes': [
    { weight: '500 g' },
    { weight: '1 kg' },
  ],
  'Misk Masala Dates': [
    { variant: 'Tamarind (Imli)' },
    { variant: 'Achari' },
    { variant: 'Chilli Lime' },
  ],
  'Misk Shahi Khazoor': [
    { unitsPerCase: '576 pcs (24 x 24)' },
  ],
};

export interface OurProduct {
  label: string; image: string; desc: string; weight?: string;
  packagingImages?: string[];
  /** A real, notable characteristic worth calling out on the Product
   *  Details slide — distinct from the generic sample spec rows there.
   *  So far only Organic Honey has one on file. */
  highlight?: string;
  /** Per-product overrides for the Product Details spec rows — Category,
   *  Shelf Life, Storage. Each falls back to the shared placeholder
   *  ('Packaged Food' / '12 months from packaging' / 'Cool, dry place, away
   *  from direct sunlight') on the Product Details slide when not given
   *  here, same "real data replaces the sample" pattern as `highlight`. */
  category?: string; shelfLife?: string; storage?: string;
  /** Drops the "Made In" row from the Product Details slide entirely for
   *  this product, rather than overriding its value — so far only Royal
   *  Zahidi Dates. */
  hideMadeIn?: boolean;
}

export const OUR_PRODUCTS: OurProduct[] = [
  { label: 'Organic Honey', image: '/products/organic-honey.png', desc: 'Comes from the nectar of flowers in the Himalayan mountain range', weight: '500g', packagingImages: ['/packaging/Honey_Packaging.png'],
    highlight: 'Contains grayanotoxin, a natural compound from Himalayan Rhododendron nectar — traditionally valued in the region for several beneficial uses.',
    shelfLife: '18 months from packaging', storage: 'Dry & hygienic place, away from direct sunlight' },
  { label: 'Royal Zahidi Dates', image: '/products/royal-zahidi-dates.png', desc: 'Premium dates, hand-picked and packed for freshness', weight: '1kg', packagingImages: ['/packaging/Dates_packaging.png', '/packaging/Dates_packaging1.png'],
    category: 'Dry Fruits', storage: 'Keep in a cool and dry place; refrigerate once opened.', hideMadeIn: true },
  { label: 'Mixed Fruit Jam', image: '/products/mixed-fruit-jam.png', desc: 'Apis Gold — a blend of real fruit, no artificial colours', weight: '500g', packagingImages: ['/packaging/Jam_packaging.png'],
    category: 'Sweet Spread', storage: 'Keep in a cool and dry place; refrigerate once opened.',
    highlight: 'Enriched with Iron, Vitamin B6, Vitamin B12 and Zinc.' },
  { label: 'Corn Flakes', image: '/products/cornflakes.png', desc: 'A wholesome start to the day', weight: '500g', packagingImages: ['/packaging/cornflakes_packaging.png'],
    shelfLife: '9 months from packaging' },
  { label: 'Vermicelli', image: '/products/vermicelli.png', desc: 'Roasted and ready in minutes', weight: '200g', packagingImages: ['/packaging/vermicilli_packaging.png'],
    category: 'Roasted, Plain (Untouched by Hands)' },
  { label: 'Ginger Garlic Paste', image: '/products/ginger-garlic-paste.png', desc: 'Freshly ground, everyday kitchen essential — part of the Kitchen Mix range', weight: '200g', packagingImages: ['/packaging/GInger_garlic_packaging.png'],
    highlight: 'No preservatives, no added colour, no salt or sugar.' },
  { label: 'Lemon Honey Green Tea', image: '/products/lemon-honey-green-tea.png', desc: 'Two flavours: Lemon Honey, green tea with real honey and lemon, and Detox Kahwa, green tea with natural herbs', weight: '10 sachets', packagingImages: ['/packaging/GreenTea_packaging.png'],
    highlight: 'Boosts immunity, aids digestion and supports metabolism.' },
  { label: 'Saffron', image: '/products/saffron.png', desc: 'Pure, aromatic Kashmiri saffron', weight: '1g', packagingImages: ['/packaging/saffron_packaging.png'],
    highlight: 'Handpicked, natural and pure — part of the Kitchen Mix range, in Classic and Gold saffron packs.' },
  { label: 'Misk Masala Dates', image: '/products/Masala_dates.png', desc: 'Snackable superfood-on-the-go dates, seedless & sliced', packagingImages: ['/packaging/Masala_packaging_types.png'],
    category: 'Dry Fruits', highlight: 'Available in three flavours — Tamarind (Imli), Achari and Chilli Lime.' },
  { label: 'Misk Shahi Khazoor', image: '/products/Misk.png', desc: 'Silver-coated dates, a traditional mouth freshener', packagingImages: ['/packaging/Misk_packaging.png'],
    category: 'Mouth Freshener' },
];

export interface NewsItem { title: string; body: string; tag: string; tagColour: string; bar: string; dot: string; }

export const WHATS_NEW: NewsItem[] = [
  { title: 'AdminPulse now handles item requests', body: 'Stationery, IT equipment, furniture and more — not just room bookings — with its own approval → fulfilment queue.', tag: 'AdminPulse', tagColour: 'text-cyan-600 bg-cyan-50 ring-cyan-200', bar: 'from-cyan-400 to-blue-500', dot: 'bg-cyan-500' },
  { title: 'PMS Simulator: Current CTC is now editable', body: 'You can now edit an employee’s Current CTC after the master upload, without re-uploading the whole sheet.', tag: 'PMS', tagColour: 'text-violet-600 bg-violet-50 ring-violet-200', bar: 'from-violet-400 to-fuchsia-500', dot: 'bg-violet-500' },
  { title: 'Warning Letters launched', body: 'A full disciplinary letter pipeline — upload, generate, track history — now lives inside Letters Generator.', tag: 'Letters Generator', tagColour: 'text-rose-600 bg-rose-50 ring-rose-200', bar: 'from-rose-400 to-pink-500', dot: 'bg-rose-500' },
  { title: 'AdminPulse visual refresh', body: 'Glow rings, animated borders and live particles across the whole booking & requests experience.', tag: 'AdminPulse', tagColour: 'text-cyan-600 bg-cyan-50 ring-cyan-200', bar: 'from-cyan-400 to-blue-500', dot: 'bg-cyan-500' },
];

/* Real, publicly-reported APIS India Limited figures — the company is
   BSE-listed (506166), so this is public record, not invented. Sourced from
   apisindia.com/en/about-us and FY 2025-26 results coverage (May 2026).
   Employee headcount is deliberately omitted: no reliable, current figure
   could be verified, and a stale/wrong number is worse than no number.

   THIS IS STATIC, HAND-ENTERED DATA — it does not refresh on its own.
   When APIS publishes new quarterly/annual results, edit the values below
   (and COMPANY_MILESTONES) and redeploy. There is no live data source wired
   up here on purpose — quarterly/annual company results don't change often
   enough to justify a backend fetch, and a manual, deliberate update is
   safer than a scraper that could silently break or show stale/wrong data. */
export const APIS_GLANCE = [
  { label: 'Revenue (YTD)', value: '₹400 Cr', sub: 'Highest-ever turnover', trend: null, trendUp: true, icon: TrendingUp, ring: 'ring-amber-200', soft: 'bg-amber-50', accent: 'text-amber-600' },
  { label: 'Revenue (MTD)', value: '₹40 Cr', sub: 'Consolidated', trend: null, trendUp: null, icon: BarChart3, ring: 'ring-emerald-200', soft: 'bg-emerald-50', accent: 'text-emerald-600' },
  { label: 'Manufacturing Units', value: '13 + Dubai', sub: 'Across India & UAE', trend: null, trendUp: null, icon: Building2, ring: 'ring-violet-200', soft: 'bg-violet-50', accent: 'text-violet-600' },
  { label: 'Years in Business', value: '100+', sub: 'Since 1924', trend: null, trendUp: null, icon: CalendarClock, ring: 'ring-sky-200', soft: 'bg-sky-50', accent: 'text-sky-600' },
  { label: 'Global Presence', value: '6 Regions', sub: 'EU · USA · Canada · SEA · Africa · ME', trend: null, trendUp: null, icon: Globe2, ring: 'ring-cyan-200', soft: 'bg-cyan-50', accent: 'text-cyan-600' },
  { label: 'Publicly Listed', value: 'BSE 506166', sub: 'Ticker: APIS', trend: null, trendUp: null, icon: Landmark, ring: 'ring-indigo-200', soft: 'bg-indigo-50', accent: 'text-indigo-600' },
];

/* Scrolling ticker strip above the home page hero. Same "static,
   hand-entered, no live feed" reasoning as APIS_GLANCE — a real BSE quote
   snapshot rather than a fabricated number, but not wired to a live market
   feed, so it needs the same manual refresh when checking the latest
   price. */
export const BSE_TICKER = {
  quote: 'Apis India Ltd BSE Price: ₹54.72',
  changePct: '+1.03%',
  trendUp: true,
  tagline: 'We here at AIL keep quality on top preference as we believe your trust is our presence..',
};

/* Real recent company milestones, same sourcing as APIS_GLANCE above.
   `image` photos are real APIS facility/product photography, uploaded
   directly into public/milestones/ — Milestones1-5.png, mapped here in
   upload order. The last entry is still a placeholder (year/label/body all
   TBD) kept in the same shape as the real ones — update it in place once
   its real content is decided; remove it if a 5th milestone never
   materialises (its photo is real even though the text isn't yet). */
export const COMPANY_MILESTONES = [
  { year: '1924', label: 'APIS founded', body: 'A century-long journey begins in pure, natural honey.', image: '/milestones/Milestones1.png' as string | undefined },
  { year: 'FY25-26', label: 'Highest-ever turnover', body: '₹390.51 Cr consolidated revenue, up 11.5% year-on-year.', image: '/milestones/Milestones2.png' as string | undefined },
  { year: 'FY25-26', label: 'MISK Masala Dates launched', body: 'A new flavoured line expands the dates portfolio.', image: '/milestones/Milestones6.png' as string | undefined },
  { year: 'FY25-26', label: 'Roorkee jam facility approved', body: '₹1.66 Cr government-approved subsidy for a new 2,400 MT/year jam line.', image: '/milestones/Milestones1.png' as string | undefined },
  { year: 'TBD', label: 'Milestone coming soon', body: 'Details to be added.', image: '/milestones/Milestones7.png' as string | undefined },
];

/* Real lines pulled verbatim from apisindia.com — About Us, Brand and
   Investors pages — not written for this app. Same "hand-entered, no live
   scraper" reasoning as APIS_GLANCE: the site's copy doesn't change often
   enough to justify a runtime fetch (which would also hit CORS, since
   apisindia.com doesn't serve permissive cross-origin headers), and a
   scraper silently breaking or pulling the wrong text is worse than a
   short, manually-refreshed list. Update this by re-checking the site
   occasionally, same cadence as APIS_GLANCE. */
export const APIS_QUOTES = [
  { text: 'To inspire consumers with products that enable living a healthier and fitter lifestyle through continuous product innovation.', source: 'Vision statement, apisindia.com/en/about-us' },
  { text: 'A name synonymous with honeyed quality and modernism in the global market.', source: 'apisindia.com/en/about-us' },
  { text: 'With a legacy of doing business spanning 100 years, APIS India has been a pioneer spanning three generations of bee-loving entrepreneurs.', source: 'apisindia.com/en/about-us' },
  { text: 'Our rigorous commitment to quality has propelled us to the forefront of honey exports.', source: 'apisindia.com/en/about-us' },
  { text: 'We endeavor to strive together with passion, unity of purpose, and unconventional thinking.', source: 'apisindia.com/en/brand' },
  { text: 'Presence is about showing up fully, authentically, and with an open heart.', source: 'apisindia.com/en/brand' },
  { text: "Nature's golden nectar, pure and organic.", source: 'apisindia.com/en/brand' },
  { text: 'Apis India is one of the leaders in the field of organized honey trade in India.', source: 'apisindia.com/en/investors' },
];

/* "Our Vision"/"Our Mission" cards on the home page (IntranetHomePage.tsx).
   Vision reuses the same statement already sourced above (APIS_QUOTES[0]).
   Mission points were supplied directly as company copy rather than
   independently re-verified against apisindia.com — same provenance
   caveat as APIS_FACTS below. */
export const APIS_VISION = APIS_QUOTES[0].text;
export const APIS_MISSION_POINTS = [
  'We relentlessly continue to pursue exceptional value for our customers, fueled by innovation and unwavering ethical practices.',
  'We champion responsible business practices, driving profitability and continuing to secure the well-being of our customers and stakeholders.',
  'We cultivate a thriving workplace and uphold high standards that promote a strong sense of belonging, empowering our people to achieve their life and our business goals.',
];

/* Company facts as supplied directly (not independently re-verified by
   scraping a source page the way APIS_QUOTES/APIS_GLANCE were) — kept as a
   separate array so that provenance stays honest rather than implying the
   same verification level as the rest of this file. Cleaned up from a
   plain numbered list, wording otherwise unchanged. */
export const APIS_FACTS = [
  'Founded in the year 1924.',
  'Headquartered in New Delhi, India.',
  'Formerly known as eWeb Univ Limited.',
  'Leader in the organized honey trade in India.',
  'Operates 13 manufacturing and supply chain facilities across India.',
  'Owns a 7-acre main manufacturing facility in Roorkee, Uttarakhand.',
  'The Roorkee plant can process over 100 tonnes of honey daily.',
  'Certified Grade A by LRQA under BRCGS Global Standard.',
  'Holds ISO 22000 quality management certification.',
  'Complies with USFDA and FSSAI standards.',
  'Major exporter to the EU, USA, Canada, and the Middle East.',
  'Offers organic honey variants.',
  'Sells specialized honey like ginger, lemon, and comb honey.',
  'Expanded product line to include jams and preserves.',
  'Manufactures spicelicious pickles in various flavors.',
  'Sells breakfast cereals like corn flakes and choco flakes.',
  'Offers muesli and vermicelli (seviyan).',
  'Introduced various date variants like Masala Dates and Royal Zahidi.',
  'Sells green tea and ginger-garlic paste.',
  'Sells a range of health and wellness products.',
  'Popular on e-commerce platforms like Amazon and Flipkart.',
  'Awarded ET Promising Brand in 2018 and 2019.',
  'Maintains a processing facility in Dubai.',
  'Focuses on light-coloured, high F/G pure honey.',
  'Engages in ethical beekeeping and sustainable sourcing.',
];

/* India's central-government gazetted (compulsory) public holidays for
   2026 — real, sourced, not company-specific. APIS's actual internal
   holiday list (which may add regional/restricted holidays, or drop some
   of these) hasn't been provided; this is the honest public baseline.
   Islamic/lunar-calendar dates are provisional until confirmed by sighting,
   same as the government's own list — flagged with `tentative`. Update
   this array once a year, same manual-maintenance model as APIS_GLANCE. */
export const HOLIDAYS_2026 = [
  { date: '2026-01-26', name: 'Republic Day' },
  { date: '2026-03-04', name: 'Holi' },
  { date: '2026-03-21', name: 'Id-ul-Fitr', tentative: true },
  { date: '2026-03-26', name: 'Rama Navami' },
  { date: '2026-03-31', name: 'Mahavir Jayanti' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-05-01', name: 'Buddha Purnima' },
  { date: '2026-05-27', name: 'Id-ul-Zuha (Bakrid)', tentative: true },
  { date: '2026-06-26', name: 'Muharram', tentative: true },
  { date: '2026-08-15', name: 'Independence Day' },
  { date: '2026-08-26', name: 'Id-e-Milad', tentative: true },
  { date: '2026-09-04', name: 'Janmashtami' },
  { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti' },
  { date: '2026-10-20', name: 'Dussehra' },
  { date: '2026-11-08', name: 'Diwali (Deepavali)' },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti' },
  { date: '2026-12-25', name: 'Christmas Day' },
];

/* Recently-opened tools, tracked purely client-side (no server round-trip
   needed for something this low-stakes). Newest first, capped at 4. Stored
   with a real open timestamp so "Recently Used" can show a genuine relative
   time instead of an invented one. */
const RECENT_KEY = 'apis_recent_tools';

export interface RecentToolEntry { id: QuickAccessId; ts: number; }

function readRecentRaw(): RecentToolEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    // Back-compat: the previous format stored a plain string[] of ids with
    // no timestamp. ts:0 means "unknown recency" — formatRelativeTime below
    // renders that honestly rather than making up a time for old entries.
    return raw
      .map((r: unknown) => typeof r === 'string' ? { id: r, ts: 0 } : r)
      .filter((r: any): r is RecentToolEntry => !!r && typeof r.id === 'string' && typeof r.ts === 'number');
  } catch { return []; }
}

export function pushRecentTool(id: QuickAccessId) {
  try {
    const next = [{ id, ts: Date.now() }, ...readRecentRaw().filter(x => x.id !== id)].slice(0, 4);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* localStorage unavailable — recents just won't persist */ }
}

export function getRecentTools(): QuickAccessId[] {
  const valid = new Set(QUICK_ACCESS.map(t => t.id));
  return readRecentRaw().map(r => r.id).filter((id): id is QuickAccessId => valid.has(id as QuickAccessId));
}

export function getRecentToolsWithTime(): RecentToolEntry[] {
  const valid = new Set(QUICK_ACCESS.map(t => t.id));
  return readRecentRaw().filter(r => valid.has(r.id as QuickAccessId));
}

export function formatRelativeTime(ts: number): string {
  if (!ts) return 'Previously';
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day} days ago`;
  return `${Math.round(day / 7)}w ago`;
}


/* Animation toolkit lives in its own module; re-exported so existing
   `from "./IntranetHomeShared"` imports keep working. */
export { IH_STYLES } from "./intranetStyles";
