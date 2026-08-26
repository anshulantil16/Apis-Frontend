import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  ArrowRight, LayoutGrid, Sparkles, Link2, Building2, History, Lightbulb,
  ArrowUpRight, Minus, CalendarDays, CalendarClock, ChevronLeft, ChevronRight, PartyPopper,
  X, Trophy, Eye, Flag, CheckCircle2,
} from 'lucide-react';
import {
  QUICK_ACCESS, TOOL_CATEGORIES, UPLIFT_VALUES, UPCOMING_EVENTS, WHATS_NEW,
  OUR_PRODUCTS, APIS_GLANCE, COMPANY_MILESTONES, APIS_QUOTES, APIS_FACTS, APIS_VISION, APIS_MISSION_POINTS, SOCIAL_LINKS, HOLIDAYS_2026,
  getRecentToolsWithTime, formatRelativeTime,
  type QuickAccessId, type ToolCategoryFilter, type OurProduct, type UpliftValue,
} from './IntranetHomeShared';
import amitAnandPhoto from '../../assets/hierarchy/amit-anand.jpeg';

/* Leadership hero slides — real APIS India leadership. Amit Anand's photo
   reuses the same asset imported on the APIS Tree page; Vimal Anand's is
   the real photo uploaded into public/hierarchy/. LeaderPhoto below still
   falls back to initials on a broken/missing image, same pattern as
   ProductPhoto/PersonAvatar elsewhere in this app. */
interface LeadershipSlide { name: string; role: string; photo: string; bio: string; }
const LEADERSHIP_SLIDES: LeadershipSlide[] = [
  {
    name: 'Mr Amit Anand', role: 'Managing Director', photo: amitAnandPhoto,
    bio: 'A Delhi University graduate from Kirori Mal College in Commerce, he spearheads key functions of overall plant management, human resources, and finance. The Managing Director of the company and the younger of the two siblings, he has played the perfect foil to the elder in initiating the Green Field initiative of the factory in Roorkee — leading from the front in all factory operations with hands-on expertise in executing every detail at the plant level.',
  },
  {
    name: 'Mr Vimal Anand', role: 'Director – Global Business', photo: '/hierarchy/VImal_Anand1.png',
    bio: 'Driven by his passion and conviction, Mr. Vimal Anand received formal training in beekeeping and honey processing from the University of Warmia, Poland. He gradually built a global presence and a robust structure supported by a state-of-the-art production factory to cater to global markets — his undeterred leadership and vision have led the company to reach its heights today, becoming a leading player in the world\'s organized honey trade.',
  },
];

const HOLIDAY_COLOURS = ['text-amber-500 bg-amber-50', 'text-amber-500 bg-amber-50', 'text-amber-500 bg-amber-50', 'text-amber-500 bg-amber-50', 'text-amber-500 bg-amber-50'];

// Full class strings (not template-interpolated) so Tailwind's static scan
// actually finds them — see the similar note on NavGroup.hoverAccent.
const UPLIFT_COLOURS: Record<UpliftValue['color'], { soft: string; text: string; solid: string }> = {
  blue: { soft: 'bg-blue-50', text: 'text-blue-600', solid: 'bg-blue-500' },
  orange: { soft: 'bg-orange-50', text: 'text-orange-600', solid: 'bg-orange-500' },
  emerald: { soft: 'bg-emerald-50', text: 'text-emerald-600', solid: 'bg-emerald-500' },
  amber: { soft: 'bg-amber-50', text: 'text-amber-600', solid: 'bg-amber-500' },
  pink: { soft: 'bg-pink-50', text: 'text-pink-600', solid: 'bg-pink-500' },
};

/* Deterministic PRNG (mulberry32) seeded from today's date — same "random"
   order for everyone all day, a different order tomorrow. Not real
   cryptographic randomness, just enough to reshuffle daily without a
   backend or stored state. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededShuffle<T>(items: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const todaySeed = () => {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

/* Rotates through real content — quotes sourced from apisindia.com, company
   facts, and verified milestones/stats — pure motion/discovery filler for
   the rail, no invented content. The full pool is bigger than what's
   comfortable to cycle through in one sitting, so each day picks a random
   10 of it (reseeded once a day, see todaySeed) rather than all of it —
   still real content, just a different sample every day instead of a live
   fetch (see the sourcing note on APIS_QUOTES for why not). */
const DID_YOU_KNOW_POOL = [
  ...APIS_QUOTES.map(q => `“${q.text}”`),
  ...APIS_FACTS,
  ...COMPANY_MILESTONES.map(m => `${m.label} — ${m.body}`),
  ...APIS_GLANCE.map(s => `${s.label}: ${s.value} (${s.sub})`),
];
const DID_YOU_KNOW = seededShuffle(DID_YOU_KNOW_POOL, todaySeed()).slice(0, 10);

interface IntranetHomePageProps {
  onNavigate: (id: QuickAccessId) => void;
}

/* Cursor-follow spotlight: write pointer position into CSS vars the
   .ih-spotlight rule reads, so the glow tracks the mouse with no re-render. */
function onSpotlightMove(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

/* Real 3D tilt — same trick, but feeding a perspective transform. Writing to
   CSS vars (rather than React state) keeps this at zero re-renders. */
function onTilt3dMove(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width - 0.5;
  const py = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty('--ry', `${px * 12}deg`);
  el.style.setProperty('--rx', `${-py * 12}deg`);
  onSpotlightMove(e);
}
function onTilt3dLeave(e: MouseEvent<HTMLElement>) {
  e.currentTarget.style.setProperty('--rx', '0deg');
  e.currentTarget.style.setProperty('--ry', '0deg');
}

/* Counts up to `target` once the element is on screen. Static numbers read as
   dead; a number that ticks up reads as live data. */
function useCountUp(target: number, run: boolean, durationMs = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0; const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, durationMs]);
  return v;
}

/* Splits "₹390.51 Cr" into prefix/number/suffix so only the numeric part
   animates. Returns null when there's no number to count (e.g. "BSE 506166"
   is an identifier, not a quantity — animating it would be nonsense). */
function splitNumeric(value: string): { pre: string; num: number; post: string; decimals: number } | null {
  const m = value.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const raw = m[2].replace(/,/g, '');
  const num = parseFloat(raw);
  if (!isFinite(num)) return null;
  return { pre: m[1], num, post: m[3], decimals: (raw.split('.')[1] || '').length };
}

function AnimatedValue({ value, run }: { value: string; run: boolean }) {
  const parts = splitNumeric(value);
  const live = useCountUp(parts?.num ?? 0, run && !!parts);
  if (!parts) return <>{value}</>;
  return <>{parts.pre}{live.toFixed(parts.decimals)}{parts.post}</>;
}

/* Small pine-tree silhouette, scattered along the foreground ridge. */
function PineTree({ x, scale = 1, fill }: { x: number; scale?: number; fill: string }) {
  return (
    <g transform={`translate(${x},0) scale(${scale})`} fill={fill} opacity="0.8">
      <polygon points="0,-34 -11,-14 -5,-14 -15,2 -7,2 -18,20 18,20 7,2 15,2 5,-14 11,-14" />
      <rect x="-2.5" y="20" width="5" height="7" />
    </g>
  );
}

/* Illustrated mountain scene behind the Vision/Mission cards — layered
   ridges, a soft sun/moon glow, foreground pine trees, and one
   variant-specific flourish: a target ring for Vision (the "aim"), a
   winding summit path for Mission (the "journey"). Pure inline SVG, no
   external image asset needed. No sky fill of its own — it sits directly
   on the card's own bright mustard gradient, which shows through behind
   it, so the whole card reads as one continuous colour wash rather than a
   white block with an illustration bolted underneath. Sits in its own
   flexible band at the bottom of the card (not layered over the text
   above), so it never risks obscuring the copy regardless of how long
   that copy runs. */
function MountainScape({ variant }: { variant: 'vision' | 'mission' }) {
  const ridges = ['#fde68a', '#f59e0b', '#b45309'];
  return (
    <div className="relative w-full flex-1 min-h-[150px] overflow-hidden">
      <svg aria-hidden viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
        <circle cx="300" cy="42" r="30" fill="#fff" opacity="0.18" />
        <circle cx="300" cy="42" r="16" fill="#fff" opacity="0.28" />

        {variant === 'vision' ? (
          <g stroke="#fff" opacity="0.28" fill="none" strokeWidth="1.5">
            <circle cx="120" cy="70" r="26" />
            <circle cx="120" cy="70" r="14" />
            <circle cx="120" cy="70" r="3" fill="#fff" stroke="none" />
          </g>
        ) : (
          <path d="M40,160 C70,120 40,100 70,70 C95,46 80,30 100,10" stroke="#fff" opacity="0.38" strokeWidth="4" strokeDasharray="1 10" strokeLinecap="round" fill="none" />
        )}

        <polygon points="0,160 0,100 70,50 150,95 215,32 285,88 340,58 400,105 400,160" fill={ridges[0]} opacity="0.55" />
        <polygon points="0,160 0,122 60,78 145,115 200,68 270,110 330,72 400,118 400,160" fill={ridges[1]} opacity="0.75" />
        <polygon points="0,160 0,140 75,102 165,132 235,96 305,132 365,104 400,128 400,160" fill={ridges[2]} opacity="0.9" />

        <PineTree x={34} scale={0.85} fill={ridges[2]} />
        <PineTree x={64} scale={1.15} fill={ridges[2]} />
        <PineTree x={340} scale={0.9} fill={ridges[2]} />
        <PineTree x={368} scale={1.05} fill={ridges[2]} />
      </svg>
    </div>
  );
}

/* Not every OUR_PRODUCTS entry has a real photo checked into
   public/products/ yet (see the comment on OUR_PRODUCTS). Rather than a
   broken-image icon, missing files fall back to a neutral tile — and the
   moment the real file lands at that path, this just renders it, no code
   change needed. */
function ProductPhoto({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className={`${className} flex items-center justify-center bg-amber-50 rounded-xl`}>
        <Building2 className="w-1/3 h-1/3 text-amber-300" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setBroken(true)} />;
}

/* Leadership hero photo — same broken-image fallback pattern as
   ProductPhoto above, but an initials tile (matches PersonAvatar on the
   APIS Tree page) since this is a person, not a product. */
function LeaderPhoto({ src, name, className }: { src: string; name: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className={`${className} flex items-center justify-center bg-amber-500/20 text-amber-200 font-black text-2xl`}>
        {name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return <img src={src} alt={name} className={className} onError={() => setBroken(true)} />;
}

/* Packaging-types popup — opened by clicking a product card in Our Products.
   `packagingImages` holds real pack photography uploaded into
   public/packaging/ (see the comment on OurProduct); this renders those
   photos in a grid, falling back to an honest empty state for any product
   that doesn't have one yet. */
function PackagingPopup({ product, onClose }: { product: OurProduct; onClose: () => void }) {
  const images = product.packagingImages ?? [];
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="ih-palette-in w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
          <p className="text-base font-black text-slate-900">{product.label} – Packaging Types</p>
          <button onClick={onClose} title="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {images.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-6">Packaging details coming soon.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {images.map((src, i) => (
                <ProductPhoto key={i} src={src} alt={`${product.label} packaging ${i + 1}`}
                  className={`w-full h-80 object-contain rounded-xl bg-amber-50 ring-1 ring-black/5 p-3 ${images.length === 1 ? 'sm:col-span-2' : ''}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── drifting particle field, same technique as the AdminPulse login ─────
   Lazy useState initialiser (not useRef(expr)) so the random positions are
   generated exactly once — useRef's argument is re-evaluated on every render
   even though only the first value is ever kept. */
function Particles() {
  const [pts] = useState(() =>
    Array.from({ length: 20 }, () => ({
      l: Math.random() * 100, s: 2 + Math.random() * 3,
      d: Math.random() * 14, dur: 14 + Math.random() * 16, o: 0.1 + Math.random() * 0.25,
    }))
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {pts.map((p, i) => (
        <span key={i} className="ih-particle absolute rounded-full bg-white"
          style={{ left: `${p.l}%`, bottom: '-6%', width: p.s, height: p.s, opacity: p.o,
                   boxShadow: '0 0 8px rgba(255,255,255,.7)',
                   animationDuration: `${p.dur}s`, animationDelay: `${p.d}s` }} />
      ))}
    </div>
  );
}

// Product cards shown 4-at-a-time in the hero showcase below.
const HERO_PAGE_SIZE = 4;

export function IntranetHomePage({ onNavigate }: IntranetHomePageProps) {
  const heroPageCount = Math.ceil(OUR_PRODUCTS.length / HERO_PAGE_SIZE);
  const [heroPage, setHeroPage] = useState(0);

  // Top-level hero carousel: slide 0 is the existing "Our Products"
  // showcase (untouched, including its own internal heroPage pagination
  // above); slides 1+ are the leadership profiles.
  const heroSlideCount = 1 + LEADERSHIP_SLIDES.length;
  const [heroSlide, setHeroSlide] = useState(0);

  const recentEntries = useMemo(() => getRecentToolsWithTime(), []);
  const recentTools = recentEntries
    .map(r => ({ tool: QUICK_ACCESS.find(t => t.id === r.id), ts: r.ts }))
    .filter((x): x is { tool: typeof QUICK_ACCESS[number]; ts: number } => !!x.tool);

  const [category, setCategory] = useState<ToolCategoryFilter>('All');
  const [dense, setDense] = useState(true);
  const [openProduct, setOpenProduct] = useState<OurProduct | null>(null);
  const filteredTools = category === 'All' ? QUICK_ACCESS : QUICK_ACCESS.filter(t => t.category === category);

  const upcomingHolidays = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return HOLIDAYS_2026
      .map(h => ({ ...h, date: new Date(`${h.date}T00:00:00`) }))
      .filter(h => h.date >= today)
      .slice(0, 4)
      .map(h => ({
        ...h,
        daysAway: Math.round((h.date.getTime() - today.getTime()) / 86400000),
      }));
  }, []);
  const [holidayIndex, setHolidayIndex] = useState(0);


  const [factIndex, setFactIndex] = useState(0);
  const [milestoneIndex, setMilestoneIndex] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);


  // Only start the stat count-up once the strip is actually on screen.
  useEffect(() => {
    const el = statsRef.current;
    if (!el || !('IntersectionObserver' in window)) { setStatsVisible(true); return; }
    const io = new IntersectionObserver(
      ([en]) => { if (en.isIntersecting) { setStatsVisible(true); io.disconnect(); } },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (heroPageCount < 2) return;
    const iv = setInterval(() => setHeroPage(p => (p + 1) % heroPageCount), 6000);
    return () => clearInterval(iv);
  }, [heroPageCount]);
  useEffect(() => {
    if (heroSlideCount < 2) return;
    const iv = setInterval(() => setHeroSlide(s => (s + 1) % heroSlideCount), 7000);
    return () => clearInterval(iv);
  }, [heroSlideCount]);
  useEffect(() => {
    const iv = setInterval(() => setFactIndex(i => (i + 1) % DID_YOU_KNOW.length), 5000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    if (upcomingHolidays.length < 2) return;
    const iv = setInterval(() => setHolidayIndex(i => (i + 1) % upcomingHolidays.length), 7000);
    return () => clearInterval(iv);
  }, [upcomingHolidays.length]);
  useEffect(() => {
    if (COMPANY_MILESTONES.length < 2) return;
    const iv = setInterval(() => setMilestoneIndex(i => (i + 1) % COMPANY_MILESTONES.length), 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="contents">
        {/* Ambient aurora wash behind the whole dashboard — the page is never
            completely static, even when nothing is loading or hovered. */}
        <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="ih-aurora absolute -top-40 -left-40 w-[38rem] h-[38rem] rounded-full bg-cyan-300/25 blur-[130px]" />
          <div className="ih-aurora absolute top-1/3 -right-40 w-[34rem] h-[34rem] rounded-full bg-violet-300/25 blur-[130px]" style={{ animationDelay: '6s' }} />
          <div className="ih-aurora absolute -bottom-40 left-1/3 w-[30rem] h-[30rem] rounded-full bg-amber-300/20 blur-[130px]" style={{ animationDelay: '12s' }} />
        </div>

        <div className="relative max-w-[1600px] mx-auto px-6 py-5 flex gap-5 items-start">
          {/* ── Center column ──────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Hero product showcase — real APIS India product photography
                (sourced from apisindia.com); see OUR_PRODUCTS for which
                photos are still pending. */}
            <div className="relative rounded-[28px] overflow-hidden ih-reveal bg-slate-950" style={{ minHeight: 240 }}>
              <div className="ih-drift absolute -right-24 top-1/2 -translate-y-1/2 w-[42rem] h-[42rem] rounded-full bg-amber-500/25 blur-[110px]" />
              <div className="ih-aurora absolute -left-24 -bottom-24 w-[26rem] h-[26rem] rounded-full bg-orange-500/15 blur-[110px]" />
              <Particles />
              <div className="absolute inset-0 opacity-[0.06] z-[1]"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)',
                         backgroundSize: '44px 44px' }} />

              {heroSlide === 0 ? (
                <div className="relative z-10 p-6 md:p-8 flex flex-col xl:flex-row xl:items-center gap-6">
                  {/* left: pitch + CTA */}
                  <div className="ih-fade xl:w-72 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md
                                     ring-1 ring-white/20 text-[10px] font-black uppercase tracking-widest text-amber-300 mb-3">
                      <Building2 className="w-3 h-3" />Our Products
                    </span>
                    <h1 className="text-2xl md:text-[28px] font-black text-white leading-[1.15] mb-2.5">
                      Quality products,<br />trusted by millions.
                    </h1>
                    <p className="text-slate-300 text-[13px] leading-relaxed mb-5">Discover the goodness of the APIS range.</p>
                    <button onClick={() => document.getElementById('our-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="ih-sheen group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-900
                                 font-black text-sm shadow-xl transition-all hover:-translate-y-0.5">
                      View All Products
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>

                  {/* right: paginated product card strip */}
                  <div className="relative flex-1 min-w-0">
                    <div className="overflow-hidden">
                      <div className="flex transition-transform duration-500 ease-out"
                        style={{ transform: `translateX(-${heroPage * 100}%)` }}>
                        {Array.from({ length: heroPageCount }, (_, pageIdx) => (
                          <div key={pageIdx} className="w-full shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {OUR_PRODUCTS.slice(pageIdx * HERO_PAGE_SIZE, pageIdx * HERO_PAGE_SIZE + HERO_PAGE_SIZE).map((p, i) => (
                              <div key={p.label}
                                className="ih-pop-in ih-tilt3d ih-spotlight rounded-2xl p-3"
                                style={{ animationDelay: `${i * 80}ms` }} onMouseMove={onSpotlightMove}>
                                <div className="aspect-square flex items-center justify-center overflow-hidden">
                                  <ProductPhoto src={p.image} alt={p.label} className="w-4/5 h-4/5 object-contain" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    {heroPageCount > 1 && (
                      <>
                        <button onClick={() => setHeroPage(p => (p - 1 + heroPageCount) % heroPageCount)} title="Previous product page"
                          className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90
                                     items-center justify-center text-slate-600 shadow-lg hover:bg-white transition-all z-10">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => setHeroPage(p => (p + 1) % heroPageCount)} title="Next product page"
                          className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90
                                     items-center justify-center text-slate-600 shadow-lg hover:bg-white transition-all z-10">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* Leadership profile slides — same dark hero shell/glow/particles
                   as the products slide above, just different content, so the
                   whole carousel reads as one consistent hero, not a bolt-on. */
                (() => {
                  const leader = LEADERSHIP_SLIDES[heroSlide - 1];
                  return (
                    <div key={leader.name} className="ih-fade relative z-10 p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6 md:gap-10 min-h-[240px]">
                      <LeaderPhoto src={leader.photo} name={leader.name}
                        className="w-32 h-32 md:w-40 md:h-40 shrink-0 rounded-full object-cover object-top
                                   ring-4 ring-white/10 shadow-2xl mx-auto md:mx-0" />
                      <div className="min-w-0 text-center md:text-left">
                        <h1 className="text-xl md:text-2xl font-black text-amber-300 uppercase tracking-wide mb-1">
                          {leader.name}
                        </h1>
                        <p className="text-sm font-bold text-slate-300 mb-3">{leader.role}</p>
                        <div className="w-12 h-1 rounded-full bg-amber-500 mb-3 mx-auto md:mx-0" />
                        <p className="text-slate-300 text-[13px] leading-relaxed max-w-xl">{leader.bio}</p>
                      </div>
                    </div>
                  );
                })()
              )}

              {heroSlideCount > 1 && (
                <>
                  <button onClick={() => setHeroSlide(s => (s - 1 + heroSlideCount) % heroSlideCount)} title="Previous slide"
                    className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 backdrop-blur-md
                               ring-1 ring-white/20 items-center justify-center text-white hover:bg-white/20 transition-all z-20">
                    <ChevronLeft className="w-4.5 h-4.5" />
                  </button>
                  <button onClick={() => setHeroSlide(s => (s + 1) % heroSlideCount)} title="Next slide"
                    className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 backdrop-blur-md
                               ring-1 ring-white/20 items-center justify-center text-white hover:bg-white/20 transition-all z-20">
                    <ChevronRight className="w-4.5 h-4.5" />
                  </button>

                  <div className="relative z-10 flex items-center gap-2 px-6 md:px-8 pb-5">
                    {Array.from({ length: heroSlideCount }, (_, i) => (
                      <button key={i} onClick={() => setHeroSlide(i)} title={`Slide ${i + 1}`}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === heroSlide ? 'w-8 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/50'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* APIS at a glance — real, publicly-reported figures (BSE: 506166) */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">APIS at a Glance</h2>
                <span className="text-[10px] font-bold text-slate-300">Public filings · FY 2025-26</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {APIS_GLANCE.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
                      className="ih-inview ih-tilt3d ih-spotlight ih-sweep relative rounded-2xl bg-white border border-slate-200 p-4 shadow-sm overflow-hidden text-center"
                      style={{ transitionDelay: `${i * 60}ms` }}>
                      <div className="ih-float mx-auto w-11 h-11 rounded-full bg-amber-50 ring-4 ring-amber-50 flex items-center justify-center mb-2.5"
                        style={{ animationDelay: `${i * 300}ms` }}>
                        <Icon className="w-5 h-5 text-amber-500" />
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                      <p className="text-base font-black text-slate-900 leading-tight mt-1 tabular-nums">
                        <AnimatedValue value={s.value} run={statsVisible} />
                      </p>
                      {s.trend ? (
                        <p className={`inline-flex items-center gap-0.5 text-[10px] font-bold mt-1.5 ${
                          s.trendUp === true ? 'text-emerald-600' : s.trendUp === false ? 'text-rose-600' : 'text-slate-400'}`}>
                          {s.trendUp === true ? <ArrowUpRight className="w-3 h-3" /> : s.trendUp === false ? null : <Minus className="w-3 h-3" />}
                          {s.trend}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-1.5">{s.sub}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Uplift Values — APIS's UPLIFT core values, shown as a static grid. */}
            <section>
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />Uplift Values
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {UPLIFT_VALUES.map(v => {
                  const Icon = v.icon;
                  const c = UPLIFT_COLOURS[v.color];
                  return (
                    <div key={v.letter}
                      className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm
                                 flex flex-col items-center text-center">
                      <div className={`w-14 h-14 rounded-2xl ${c.soft} flex items-center justify-center mb-3`}>
                        <Icon className={`w-6 h-6 ${c.text}`} />
                      </div>
                      <p className={`text-[11px] font-black uppercase leading-snug mb-3 ${c.text}`}>
                        {v.label}
                      </p>
                      <div className={`w-9 h-9 rounded-full ${c.solid} flex items-center justify-center text-white text-sm font-black`}>
                        {v.letter}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            {/* What's Happening (scannable list) + Our Vision / Our Mission —
                real recent platform activity alongside APIS's own published
                vision and mission statements (see APIS_VISION/APIS_MISSION
                in IntranetHomeShared.tsx for sourcing). */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />What's Happening
                  </h2>
                  <span className="text-[11px] font-bold text-amber-500 cursor-default">View all activity →</span>
                </div>
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {WHATS_NEW.map((n, i) => (
                    <div key={i} className="ih-reveal ih-tilt flex items-start gap-3 rounded-xl bg-white border border-slate-100 p-3 hover:bg-white hover:shadow-sm transition-all"
                      style={{ animationDelay: `${i * 80}ms` }}>
                      <span className={`ih-pulse-glow w-1.5 h-1.5 rounded-full ${n.dot} flex-shrink-0 mt-1.5`} />
                      <div className="min-w-0">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1 mb-1 ${n.tagColour}`}>
                          {n.tag}
                        </span>
                        <p className="text-[12.5px] font-bold text-slate-800 leading-snug">{n.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Our Vision — fully-coloured, but a light pastel mustard
                  wash rather than the saturated amber→orange used on the
                  sidebar/hero — dark text for contrast against the lighter
                  fill. Cursor-follow spotlight + 3D tilt for the same
                  "alive" interaction every other card in this app has. */}
              <div onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
                className="ih-reveal ih-tilt3d ih-spotlight relative overflow-hidden rounded-2xl
                           bg-gradient-to-br from-amber-100 via-amber-200 to-orange-200 shadow-lg flex flex-col">
                <div className="ih-drift pointer-events-none absolute -top-14 -right-14 w-48 h-48 rounded-full bg-white/40 blur-3xl" />
                <div className="relative z-10 p-5 pb-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="ih-float w-9 h-9 rounded-full bg-white/70 backdrop-blur-md ring-2 ring-white/70 text-amber-600 flex items-center justify-center shrink-0">
                      <Eye className="w-4 h-4" />
                    </div>
                    <h2 className="text-[13px] font-black text-amber-900 uppercase tracking-wide">Our Vision</h2>
                  </div>
                  <p className="text-amber-950/90 text-[16px] leading-relaxed font-medium">{APIS_VISION}</p>
                </div>
                <MountainScape variant="vision" />
              </div>

              {/* Our Mission — same light mustard treatment as Vision (one
                  unified colour, not a warm/cool split), with the mission
                  broken into scannable bullet points rather than one dense
                  paragraph. */}
              <div onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
                className="ih-reveal ih-tilt3d ih-spotlight relative overflow-hidden rounded-2xl
                           bg-gradient-to-br from-amber-100 via-amber-200 to-orange-200 shadow-lg flex flex-col" style={{ animationDelay: '80ms' }}>
                <div className="ih-drift pointer-events-none absolute -top-14 -left-14 w-48 h-48 rounded-full bg-white/40 blur-3xl" />
                <div className="relative z-10 p-5 pb-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="ih-float w-9 h-9 rounded-full bg-white/70 backdrop-blur-md ring-2 ring-white/70 text-amber-600 flex items-center justify-center shrink-0">
                      <Flag className="w-4 h-4" />
                    </div>
                    <h2 className="text-[13px] font-black text-amber-900 uppercase tracking-wide">Our Mission</h2>
                  </div>
                  <ul className="space-y-2">
                    {APIS_MISSION_POINTS.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span className="text-amber-950/70 text-[12px] leading-relaxed">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <MountainScape variant="mission" />
              </div>
            </section>

            {/* Our Products — real APIS India Limited product photography */}
            <section id="our-products" className="scroll-mt-20">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />Our Products
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {OUR_PRODUCTS.map((p, i) => (
                  <button key={p.label} onClick={() => setOpenProduct(p)}
                    className="ih-inview ih-tilt3d ih-sweep relative rounded-2xl overflow-hidden bg-[#3d2b18] p-5 flex items-center justify-center shadow-sm aspect-square text-left"
                    style={{ animationDelay: `${i * 80}ms` }}>
                    <ProductPhoto src={p.image} alt={p.label} className="relative w-4/5 h-4/5 object-contain" />
                  </button>
                ))}
              </div>
            </section>

            {openProduct && <PackagingPopup product={openProduct} onClose={() => setOpenProduct(null)} />}

            {/* Your Tools — filterable launcher grid, the intranet's app hub */}
            <section id="all-tools" className="scroll-mt-20">
              <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Your Tools</h2>
                  <p className="text-[12px] text-slate-400 mt-0.5">Everything you need, one click away.</p>
                </div>
                <button onClick={() => setDense(d => !d)} title={dense ? 'Wider cards' : 'Denser grid'}
                  className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-300 transition-all">
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-4 mb-4">
                {TOOL_CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-black transition-all ${
                      category === c
                        ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                        : 'bg-white border border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600'}`}>
                    {c}
                  </button>
                ))}
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 ${dense ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
                {filteredTools.map((t, i) => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => onNavigate(t.id)} onMouseMove={onSpotlightMove}
                      className="ih-inview ih-tilt3d ih-spotlight ih-neon group relative text-left rounded-xl bg-white border
                                 border-slate-200 p-4 shadow-sm overflow-hidden"
                      style={{ transitionDelay: `${i * 40}ms`, '--ih-neon': t.glow } as any}>
                      <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full
                                      opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
                        style={{ background: t.glow }} />
                      <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center
                                       justify-center shadow-md mb-3 transition-transform duration-300
                                       group-hover:scale-110 group-hover:-rotate-6">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <p className="relative text-[14px] font-black text-slate-900">{t.label}</p>
                      <p className="relative text-[12px] text-slate-400 mt-1 leading-relaxed">{t.desc}</p>
                    </button>
                  );
                })}
              </div>
              {filteredTools.length === 0 && (
                <p className="text-center text-[12px] text-slate-400 py-8">No tools in this category yet.</p>
              )}
            </section>

            {/* Our Journey / Milestones — same real COMPANY_MILESTONES data as
                before, redesigned as a fan carousel (one entry enlarged and
                highlighted at a time) instead of a plain vertical timeline. */}
            <section>
              <div className="ih-reveal relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm p-5 md:p-6">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                  <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />Our Journey / Milestones
                  </h2>
                  <span title="Not available yet" className="text-[11px] font-bold text-slate-300 cursor-not-allowed">
                    View Full History
                  </span>
                </div>
                <p className="text-[12px] text-slate-400 mb-5">A century-long journey of purity, quality and innovation.</p>

                <div className="flex items-center gap-2">
                  <button onClick={() => setMilestoneIndex(i => (i - 1 + COMPANY_MILESTONES.length) % COMPANY_MILESTONES.length)}
                    title="Previous milestone"
                    className="hidden sm:flex w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm items-center justify-center
                               text-slate-400 hover:text-amber-600 hover:border-amber-300 transition-all flex-shrink-0">
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex-1 flex items-center justify-center gap-3 overflow-x-auto py-2 px-1">
                    {COMPANY_MILESTONES.map((m, i) => {
                      const active = i === milestoneIndex;
                      return (
                        <button key={i} onClick={() => setMilestoneIndex(i)}
                          className={`ih-tilt relative flex-shrink-0 rounded-2xl overflow-hidden text-left transition-all duration-300
                                     ${active ? 'w-44 h-52 ring-2 ring-amber-400 shadow-xl' : 'w-28 h-40 opacity-60 hover:opacity-90 scale-95'}
                                     ${m.image ? '' : 'bg-gradient-to-br from-amber-50 to-orange-50'}`}>
                          {m.image ? (
                            <>
                              <img src={m.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/10" />
                            </>
                          ) : (
                            <Trophy className={`absolute ${active ? 'w-10 h-10 top-4' : 'w-6 h-6 top-3'} left-1/2 -translate-x-1/2 text-amber-300`} />
                          )}
                          {active && i === 0 && (
                            <span className="absolute top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-500
                                             text-white text-[8px] font-black uppercase tracking-wider whitespace-nowrap">
                              Our Beginning
                            </span>
                          )}
                          <div className="absolute inset-x-0 bottom-0 p-3">
                            <p className={`font-black ${active ? 'text-xl' : 'text-sm'} ${m.image ? 'text-white' : 'text-amber-800'}`}>{m.year}</p>
                            {active && <p className={`text-[11px] leading-snug mt-1 ${m.image ? 'text-amber-100/90' : 'text-amber-700/80'}`}>{m.label}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={() => setMilestoneIndex(i => (i + 1) % COMPANY_MILESTONES.length)}
                    title="Next milestone"
                    className="hidden sm:flex w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm items-center justify-center
                               text-slate-400 hover:text-amber-600 hover:border-amber-300 transition-all flex-shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div key={milestoneIndex} className="ih-fade mt-4 text-center">
                  <p className="text-[12px] text-slate-500 leading-relaxed max-w-md mx-auto">{COMPANY_MILESTONES[milestoneIndex].body}</p>
                </div>

                <div className="flex items-center justify-center gap-1 mt-3">
                  {COMPANY_MILESTONES.map((_, i) => (
                    <span key={i} className={`h-1 rounded-full transition-all duration-300 ${i === milestoneIndex ? 'w-5 bg-amber-400' : 'w-1 bg-slate-200'}`} />
                  ))}
                </div>
              </div>
            </section>

            {/* Did You Know — same DID_YOU_KNOW data, daily shuffle and factIndex
                rotation as before, just moved out of the sidebar and restyled as
                a light amber bar under Milestones instead of a dark card. Sized
                up to be the page's closing note now that the platform-stats
                strip below it is gone. */}
            <div className="ih-reveal flex items-center gap-3.5 rounded-2xl bg-amber-50 border border-amber-100 shadow-sm px-6 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <p className="text-[12px] font-black uppercase tracking-widest text-amber-700 flex-shrink-0">Did You Know?</p>
              <div key={factIndex} className="ih-fade flex-1 min-w-0">
                <p className="text-[13.5px] text-amber-900/90 leading-snug font-medium">{DID_YOU_KNOW[factIndex]}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setFactIndex(i => (i - 1 + DID_YOU_KNOW.length) % DID_YOU_KNOW.length)}
                  title="Previous fact" className="w-7 h-7 rounded-lg hover:bg-amber-100 flex items-center justify-center text-amber-500 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setFactIndex(i => (i + 1) % DID_YOU_KNOW.length)}
                  title="Next fact" className="w-7 h-7 rounded-lg hover:bg-amber-100 flex items-center justify-center text-amber-500 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Right rail ──────────────────────────────────────────────────── */}
          <aside className="hidden xl:block w-[330px] flex-shrink-0 sticky top-[68px] space-y-4">
            {/* Holidays — India's real central-government gazetted list for 2026,
                sourced publicly (not APIS's specific internal calendar, which
                hasn't been provided — see the data file for the honest caveat) */}
            {upcomingHolidays.length > 0 && (() => {
              const h = upcomingHolidays[holidayIndex % upcomingHolidays.length];
              const c = HOLIDAY_COLOURS[holidayIndex % HOLIDAY_COLOURS.length];
              return (
                <div className="ih-reveal relative overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm p-5">
                  <div className="ih-drift pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full bg-amber-400/10 blur-2xl" />
                  <div className="relative flex items-center justify-between mb-3">
                    <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-amber-500" />Next Holiday
                    </h2>
                    {upcomingHolidays.length > 1 && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setHolidayIndex(i => (i - 1 + upcomingHolidays.length) % upcomingHolidays.length)}
                          className="w-5 h-5 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400">
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <button onClick={() => setHolidayIndex(i => (i + 1) % upcomingHolidays.length)}
                          className="w-5 h-5 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400">
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div key={holidayIndex} className="ih-fade relative flex items-center gap-3">
                    <div className={`relative w-14 h-14 rounded-xl ${c.split(' ')[1]} flex flex-col items-center justify-center flex-shrink-0`}>
                      <PartyPopper className={`absolute -top-1.5 -right-1.5 w-4 h-4 ${c.split(' ')[0]} opacity-70`} aria-hidden />
                      <span className={`text-[19px] font-black leading-none ${c.split(' ')[0]}`}>{h.date.getDate()}</span>
                      <span className="text-[9px] font-bold uppercase text-slate-400 leading-none mt-1">
                        {h.date.toLocaleDateString(undefined, { month: 'short' })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-bold text-slate-800 truncate">
                        {h.name}{h.tentative && <span className="text-slate-400 font-semibold">*</span>}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {h.daysAway === 0 ? 'Today' : h.daysAway === 1 ? 'Tomorrow' : `In ${h.daysAway} days`}
                      </p>
                    </div>
                  </div>
                  {upcomingHolidays.length > 1 && (
                    <div className="relative flex items-center gap-1 mt-4">
                      {upcomingHolidays.map((_, i) => (
                        <span key={i} className={`h-1 rounded-full transition-all duration-300 ${i === holidayIndex ? 'w-5 bg-amber-400' : 'w-1 bg-slate-200'}`} />
                      ))}
                    </div>
                  )}
                  {h.tentative && (
                    <p className="relative text-[9.5px] text-slate-300 mt-3">*Date provisional, pending official confirmation</p>
                  )}
                </div>
              );
            })()}

            {/* Upcoming Events — no real calendar source is wired up yet, so
                this is explicitly labelled sample data rather than presented
                as real scheduled meetings. */}
            <div className="ih-reveal rounded-xl bg-white border border-slate-200 shadow-sm p-5" style={{ animationDelay: '40ms' }}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <CalendarClock className="w-3.5 h-3.5 text-amber-500" />Upcoming Events
                </h2>
                <span className="text-[10px] font-bold text-amber-500 cursor-default">View all</span>
              </div>
              <p className="text-[9.5px] text-slate-300 mb-3">Sample data — not yet connected to a real calendar</p>
              <div className="space-y-2">
                {UPCOMING_EVENTS.map(ev => {
                  const EIcon = ev.icon;
                  return (
                    <div key={ev.label} className="flex items-center gap-3 rounded-xl hover:bg-slate-50 p-1.5 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <EIcon className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-bold text-slate-800 truncate">{ev.label}</p>
                        <p className="text-[10.5px] text-slate-400">{ev.date} · {ev.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ih-reveal rounded-xl bg-white border border-slate-200 shadow-sm p-5" style={{ animationDelay: '80ms' }}>
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-amber-500" />Quick Links
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_ACCESS.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => onNavigate(t.id)}
                      className="ih-tilt flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-slate-50 transition-all">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-[9px] font-bold text-slate-500 text-center leading-tight">{t.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recently Used — real, derived from this browser's own history,
                with a genuine "opened X ago" from a stored timestamp rather
                than an invented one. */}
            {recentTools.length > 0 && (
              <div className="ih-reveal rounded-xl bg-white border border-slate-200 shadow-sm p-5" style={{ animationDelay: '120ms' }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-amber-500" />Recently Used
                  </h2>
                  <span className="text-[10px] font-bold text-amber-500 cursor-default">View all</span>
                </div>
                <div className="space-y-1">
                  {recentTools.map(({ tool, ts }) => {
                    const Icon = tool.icon;
                    return (
                      <button key={tool.id} onClick={() => onNavigate(tool.id)}
                        className="w-full flex items-center gap-3 rounded-xl hover:bg-slate-50 p-1.5 transition-colors text-left">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-bold text-slate-800 truncate">{tool.label}</p>
                          <p className="text-[10.5px] text-slate-400">{formatRelativeTime(ts)}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stay Connected — compact version of the main-content strip */}
            <div className="ih-reveal rounded-xl bg-white border border-slate-200 shadow-sm p-5" style={{ animationDelay: '200ms' }}>
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Stay Connected</h2>
              <p className="text-[11px] text-slate-400 mb-3">Follow APIS India for the latest updates</p>
              <div className="grid grid-cols-5 gap-2">
                {SOCIAL_LINKS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" title={s.label}
                      className={`ih-reveal ih-tilt aspect-square rounded-lg ${s.bg} flex items-center justify-center
                                 text-white shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-110`}
                      style={{ animationDelay: `${i * 50}ms` }}>
                      <Icon className="w-3.5 h-3.5" />
                    </a>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>

        <footer className="border-t border-slate-200 py-5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            APIS India Limited · Internal Tools Platform
          </p>
        </footer>
    </div>
  );
}

export default IntranetHomePage;