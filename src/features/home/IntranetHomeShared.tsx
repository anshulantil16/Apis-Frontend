/* Shared data + animation styles for the APIS Internal Tools intranet home
   page — the landing screen every user sees first. Content here is
   intentionally honest: no fabricated business metrics, no invented people,
   no imaginary products. "What's New" describes real recent platform work;
   "At a Glance" describes the tools platform itself, not the company. */
import type { ComponentType, SVGProps } from 'react';
import {
  Users, FileSpreadsheet, Building2,
  TrendingUp, Sparkles, BarChart3, Radar, Zap, Plane, Megaphone,
  ShieldCheck, LifeBuoy, Globe2, CalendarClock, Landmark,
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

export type QuickAccessId =
  | 'extractor' | 'performance' | 'appraisal' | 'eom' | 'pms'
  | 'offer-letters' | 'roompulse' | 'salesiq' | 'tada';

export interface QuickAccessItem {
  id: QuickAccessId;
  label: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
  gradient: string;   // tailwind gradient classes — used on the fuller "Explore All Tools" cards
  glow: string;        // rgba used for the hover glow
  accent: string;       // solid icon colour for the flat quick-access tiles
  soft: string;          // matching tinted chip background
}

export const QUICK_ACCESS: QuickAccessItem[] = [
  { id: 'extractor', label: 'Data Extractor', desc: 'Joining forms, medical & payroll data tools', icon: FileSpreadsheet, gradient: 'from-amber-400 to-orange-500', glow: 'rgba(245,158,11,.35)', accent: 'text-amber-600', soft: 'bg-amber-50' },
  { id: 'performance', label: 'Performance Hub', desc: 'Goals, reviews & performance tracking', icon: TrendingUp, gradient: 'from-violet-400 to-purple-600', glow: 'rgba(139,92,246,.35)', accent: 'text-violet-600', soft: 'bg-violet-50' },
  { id: 'appraisal', label: 'Appraisal Hub', desc: 'Annual appraisal cycle management', icon: TrendingUp, gradient: 'from-blue-400 to-indigo-600', glow: 'rgba(59,130,246,.35)', accent: 'text-blue-600', soft: 'bg-blue-50' },
  { id: 'eom', label: 'EOM Hub', desc: 'Employee of the Month nominations', icon: Sparkles, gradient: 'from-emerald-400 to-teal-600', glow: 'rgba(16,185,129,.35)', accent: 'text-emerald-600', soft: 'bg-emerald-50' },
  { id: 'pms', label: 'PMS Simulator', desc: 'Performance & salary revision simulator', icon: BarChart3, gradient: 'from-violet-500 to-fuchsia-600', glow: 'rgba(168,85,247,.35)', accent: 'text-fuchsia-600', soft: 'bg-fuchsia-50' },
  { id: 'offer-letters', label: 'Letters Generator', desc: 'Appraisal & warning letter pipeline', icon: FileSpreadsheet, gradient: 'from-rose-400 to-pink-600', glow: 'rgba(244,63,94,.35)', accent: 'text-rose-600', soft: 'bg-rose-50' },
  { id: 'roompulse', label: 'AdminPulse', desc: 'Room bookings & admin item requests', icon: Radar, gradient: 'from-cyan-400 to-blue-600', glow: 'rgba(6,182,212,.35)', accent: 'text-cyan-600', soft: 'bg-cyan-50' },
  { id: 'salesiq', label: 'SalesIQ', desc: 'Sales intelligence & forecasting', icon: Zap, gradient: 'from-indigo-400 to-violet-600', glow: 'rgba(99,102,241,.35)', accent: 'text-indigo-600', soft: 'bg-indigo-50' },
  { id: 'tada', label: 'TA/DA Portal', desc: 'Travel & daily allowance claims', icon: Plane, gradient: 'from-sky-400 to-cyan-600', glow: 'rgba(14,165,233,.35)', accent: 'text-sky-600', soft: 'bg-sky-50' },
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

export const COMING_SOON = [
  { label: 'Announcements', icon: Megaphone, soft: 'bg-amber-50', accent: 'text-amber-500' },
  { label: 'Policies & Guidelines', icon: ShieldCheck, soft: 'bg-emerald-50', accent: 'text-emerald-500' },
  { label: 'Help & Support', icon: LifeBuoy, soft: 'bg-sky-50', accent: 'text-sky-500' },
];

/* Real APIS India Limited product photography, sourced from apisindia.com —
   same images used in the hero carousel. Linked from the sidebar's "About
   APIS" group so the two aren't disconnected. */
export const OUR_PRODUCTS = [
  { label: 'Organic Honey', image: '/products/organic-honey.png', desc: 'Sourced from the Kashmir Valley, organic-certified' },
  { label: 'Premium Dates', image: '/products/fruit.png', desc: 'Hand-picked and packed for freshness' },
];

export interface NewsItem { title: string; body: string; tag: string; tagColour: string; bar: string; dot: string; }

export const WHATS_NEW: NewsItem[] = [
  { title: 'AdminPulse now handles item requests', body: 'Stationery, IT equipment, furniture and more — not just room bookings — with its own approval → fulfilment queue.', tag: 'AdminPulse', tagColour: 'text-cyan-600 bg-cyan-50 ring-cyan-200', bar: 'from-cyan-400 to-blue-500', dot: 'bg-cyan-500' },
  { title: 'PMS Simulator: Current CTC is now editable', body: 'You can now edit an employee’s Current CTC after the master upload, without re-uploading the whole sheet.', tag: 'PMS', tagColour: 'text-violet-600 bg-violet-50 ring-violet-200', bar: 'from-violet-400 to-fuchsia-500', dot: 'bg-violet-500' },
  { title: 'Warning Letters launched', body: 'A full disciplinary letter pipeline — upload, generate, track history — now lives inside Letters Generator.', tag: 'Letters Generator', tagColour: 'text-rose-600 bg-rose-50 ring-rose-200', bar: 'from-rose-400 to-pink-500', dot: 'bg-rose-500' },
  { title: 'AdminPulse visual refresh', body: 'Glow rings, animated borders and live particles across the whole booking & requests experience.', tag: 'AdminPulse', tagColour: 'text-cyan-600 bg-cyan-50 ring-cyan-200', bar: 'from-cyan-400 to-blue-500', dot: 'bg-cyan-500' },
];

export const PLATFORM_STATS = [
  { label: 'Tools Live', value: 9, dot: 'bg-cyan-400' },
  { label: 'Unified Platform', value: 1, dot: 'bg-violet-400' },
  { label: 'Built In-house', value: 100, suffix: '%', dot: 'bg-emerald-400' },
  { label: 'Environment', value: 0, display: 'QA', dot: 'bg-amber-400' },
];

/* No real leadership content exists for this internal-tools dashboard, so
   this stays unattributed rather than inventing a name, photo or quote. */
export const LEADERSHIP_NOTE = {
  heading: 'A note on this platform',
  body: 'This dashboard brings every internal tool the team has built — PMS, appraisals, letters, room bookings, sales intelligence and more — onto one screen. It keeps growing as new tools ship.',
};

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
  { label: 'Revenue (FY25-26)', value: '₹390.51 Cr', sub: 'Highest-ever turnover', trend: '+11.5% YoY', trendUp: true, icon: TrendingUp, ring: 'ring-amber-200', soft: 'bg-amber-50', accent: 'text-amber-600' },
  { label: 'Net Profit (FY25-26)', value: '₹25.32 Cr', sub: 'Consolidated', trend: '~flat YoY', trendUp: null, icon: BarChart3, ring: 'ring-emerald-200', soft: 'bg-emerald-50', accent: 'text-emerald-600' },
  { label: 'Manufacturing Units', value: '13 + Dubai', sub: 'Across India & UAE', trend: null, trendUp: null, icon: Building2, ring: 'ring-violet-200', soft: 'bg-violet-50', accent: 'text-violet-600' },
  { label: 'Years in Business', value: '100+', sub: 'Since 1924', trend: null, trendUp: null, icon: CalendarClock, ring: 'ring-sky-200', soft: 'bg-sky-50', accent: 'text-sky-600' },
  { label: 'Global Presence', value: '6 Regions', sub: 'EU · USA · Canada · SEA · Africa · ME', trend: null, trendUp: null, icon: Globe2, ring: 'ring-cyan-200', soft: 'bg-cyan-50', accent: 'text-cyan-600' },
  { label: 'Publicly Listed', value: 'BSE 506166', sub: 'Ticker: APIS', trend: null, trendUp: null, icon: Landmark, ring: 'ring-indigo-200', soft: 'bg-indigo-50', accent: 'text-indigo-600' },
];

/* Real recent company milestones, same sourcing as APIS_GLANCE above. */
export const COMPANY_MILESTONES = [
  { year: '1924', label: 'APIS founded', body: 'A century-long journey begins in pure, natural honey.' },
  { year: 'FY25-26', label: 'Highest-ever turnover', body: '₹390.51 Cr consolidated revenue, up 11.5% year-on-year.' },
  { year: 'FY25-26', label: 'MISK Masala Dates launched', body: 'A new flavoured line expands the dates portfolio.' },
  { year: 'FY25-26', label: 'Roorkee jam facility approved', body: '₹1.66 Cr government-approved subsidy for a new 2,400 MT/year jam line.' },
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
   needed for something this low-stakes). Newest first, capped at 4. */
const RECENT_KEY = 'apis_recent_tools';

export function pushRecentTool(id: QuickAccessId) {
  try {
    const cur: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const next = [id, ...cur.filter(x => x !== id)].slice(0, 4);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* localStorage unavailable — recents just won't persist */ }
}

export function getRecentTools(): QuickAccessId[] {
  try {
    const raw: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const valid = new Set(QUICK_ACCESS.map(t => t.id));
    return raw.filter((id): id is QuickAccessId => valid.has(id as QuickAccessId));
  } catch { return []; }
}


/* Animation toolkit lives in its own module; re-exported so existing
   `from "./IntranetHomeShared"` imports keep working. */
export { IH_STYLES } from "./intranetStyles";
