import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight, LayoutGrid, Sparkles, Building2, History, Lightbulb,
  ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, ChevronDown,
  X, Trophy, Eye, Flag, CheckCircle2, Heart, TrendingUp, TrendingDown, Package, Rocket, UserPlus, Briefcase, Megaphone, Send,
  Info, Scale, CalendarClock as ShelfLifeIcon, MapPin, Warehouse, Tag, Plus, XCircle, RotateCcw, Clock,
} from 'lucide-react';
import type { StateHolidayGroup } from './IntranetHomeShared';
import {
  QUICK_ACCESS, TOOL_CATEGORIES, UPLIFT_VALUES, useVacancies, summarizeVacancies,
  OUR_PRODUCTS, PACK_SIZES, APIS_GLANCE, QUICK_PORTALS, COMPANY_MILESTONES, APIS_QUOTES, APIS_FACTS, APIS_VISION, APIS_MISSION_POINTS,
  useCelebrations, useTicker, useAnnouncements, useHolidayZones,
  getRecentToolsWithTime, formatRelativeTime,
  type VacancyListing,
  type QuickAccessId, type ToolCategoryFilter, type OurProduct,
} from './IntranetHomeShared';
import amitAnandPhoto from '../../assets/hierarchy/amit-anand.jpeg';
import { ReferralForm } from './ReferralFormPopup';

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

// One badge icon per COMPANY_MILESTONES entry, in order: founding, revenue
// milestone, product launch, facility/award, and "coming soon". Cycles via
// `% MILESTONE_ICONS.length` if the data list ever grows past five.
const MILESTONE_ICONS = [Building2, TrendingUp, Package, Trophy, Rocket];

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
  /** Which tools this person may actually open. Gates every card on this
   *  page: the whole point of granting access from the admin console is
   *  that it becomes visible here, not just enforced silently after a click. */
  allowedApps?: string[];
  isSuperadmin?: boolean;
}

/* Pointer handlers come from the shared kit: it measures once per
   hover and batches its writes, where this file's old private copy
   measured inside every mousemove and forced a synchronous layout. */
import { onSpotlightMove, onTilt3dMove, onTilt3dLeave } from '../../ui';

/* Counts up to `target` once the element is on screen. Static numbers read as
   dead; a number that ticks up reads as live data. */
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
function MountainScape() {
  const ridges = ['#f7c876', '#e2933f', '#9a4e13'];
  return (
    <div className="relative w-full flex-1 min-h-[190px] overflow-hidden">
      <svg aria-hidden viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
        {/* sun glow, top-right */}
        <circle cx="305" cy="46" r="34" fill="#fff" opacity="0.16" />
        <circle cx="305" cy="46" r="18" fill="#fff" opacity="0.3" />

        {/* soft clouds drifting in the upper sky */}
        <g fill="#fff" opacity="0.3">
          <ellipse cx="70" cy="38" rx="26" ry="8" />
          <ellipse cx="92" cy="34" rx="16" ry="7" />
          <ellipse cx="185" cy="58" rx="20" ry="6" />
        </g>

        {/* three layered ridges, lightest (farthest) to darkest (nearest) */}
        <polygon points="0,200 0,128 65,72 145,122 215,52 290,116 345,80 400,132 400,200" fill={ridges[0]} opacity="0.65" />
        <polygon points="0,200 0,152 60,102 150,142 205,88 275,138 335,96 400,146 400,200" fill={ridges[1]} opacity="0.82" />
        <polygon points="0,200 0,174 78,128 168,164 238,120 308,164 368,126 400,158 400,200" fill={ridges[2]} opacity="0.95" />

        <PineTree x={34} scale={0.85} fill={ridges[2]} />
        <PineTree x={64} scale={1.15} fill={ridges[2]} />
        <PineTree x={340} scale={0.9} fill={ridges[2]} />
        <PineTree x={368} scale={1.05} fill={ridges[2]} />

        {/* winding path climbing from the foreground to a small flag
            planted on the nearest peak — the "journey toward the goal" */}
        <path d="M175,200 C160,168 200,150 185,120 C173,96 205,84 200,58 C197,44 210,34 218,22"
          stroke="#fde68a" opacity="0.85" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M175,200 C160,168 200,150 185,120 C173,96 205,84 200,58 C197,44 210,34 218,22"
          stroke="#b45309" opacity="0.35" strokeWidth="5" strokeDasharray="1 11" strokeLinecap="round" fill="none" />
        <line x1="218" y1="22" x2="218" y2="4" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
        <path d="M218,4 L234,9 L218,14 Z" fill="#dc2626" />
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
/* Slide 2 of the product popup — a spec-sheet card built from what
   OUR_PRODUCTS already carries (label, desc, weight) plus generic
   packaged-food fields no one has supplied real values for yet. Flagged as
   sample data, same convention as every other placeholder feed in this app
   (Announcements, Celebrations, …), so nothing here reads as a real claim
   about shelf life or storage until it's replaced with the real thing. */
function ProductDetailsSlide({ product }: { product: OurProduct }) {
  // Net Weight is read from the same PACK_SIZES data the Packaging Types
  // slide shows — the real sizes on the actual charts — rather than
  // product.weight, a separate field that only ever held one guessed
  // number and drifted out of sync the moment a chart added more sizes
  // (Organic Honey's charted seven, its old weight field still said just
  // "500g"). Falls back to product.weight for products with no chart yet
  // (Corn Flakes), or to '—' when neither is known (Vermicelli's chart
  // names packs by price and case count, no gram weight at all).
  const packWeights = Array.from(new Set(
    (PACK_SIZES[product.label] ?? []).map(p => p.weight).filter((w): w is string => !!w),
  ));
  const netWeight = packWeights.length > 0 ? packWeights.join(', ') : (product.weight ?? '—');

  const rows: { icon: typeof Tag; label: string; value: string }[] = [
    { icon: Tag, label: 'Category', value: product.category ?? 'Packaged Food' },
    { icon: Scale, label: 'Net Weight', value: netWeight },
    { icon: ShelfLifeIcon, label: 'Shelf Life', value: product.shelfLife ?? '12 months from packaging' },
    { icon: Warehouse, label: 'Storage', value: product.storage ?? 'Cool, dry place, away from direct sunlight' },
    ...(product.hideMadeIn ? [] : [{ icon: MapPin, label: 'Made In', value: 'India' }]),
  ];
  return (
    <div>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">{product.desc}</p>

      {product.highlight && (
        <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-100 px-3.5 py-2.5 mb-5">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-emerald-800 leading-relaxed">{product.highlight}</p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <r.icon className="w-4 h-4" />
            </div>
            <span className="text-[12.5px] font-bold text-slate-500 w-28 shrink-0">{r.label}</span>
            <span className="text-[12.5px] font-black text-slate-800">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PackagingPopup({ product, onClose }: { product: OurProduct; onClose: () => void }) {
  const images = (product.packagingImages ?? []).map(p =>
    typeof p === 'string' ? { src: p, label: undefined as string | undefined } : p);
  const packSizes = PACK_SIZES[product.label] ?? [];
  const hasVariant = packSizes.some(p => p.variant);
  const hasWeight = packSizes.some(p => p.weight);
  const hasPrice = packSizes.some(p => p.price);
  const hasUnits = packSizes.some(p => p.unitsPerCase);
  // Every column shows up only when at least one row of THIS product
  // actually carries it — Royal Zahidi Dates names pack designs but has no
  // price; the green tea chart has a price but no case count; the
  // Vermicelli chart names packs by price and case count with no gram
  // weight at all. Literal class strings, not interpolated — Tailwind's
  // static scan can't see a computed `grid-cols-${n}` and would drop the
  // rule entirely.
  const packColCount = [hasVariant, hasWeight, hasPrice, hasUnits].filter(Boolean).length;
  const packGridCols = packColCount === 4 ? 'grid-cols-4' : packColCount === 3 ? 'grid-cols-3'
    : packColCount === 2 ? 'grid-cols-2' : 'grid-cols-1';
  const [slide, setSlide] = useState<'packaging' | 'details'>('packaging');
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="ih-palette-in w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
          <p className="text-base font-black text-slate-900">{product.label}</p>
          <button onClick={onClose} title="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Two slides, tab-switched — Packaging Types (real photography) and
            Product Details (sample spec sheet, see ProductDetailsSlide).
            Same active/inactive tab language as CelebrationsPopup's
            Birthdays/Anniversaries switcher elsewhere on this page. */}
        <div className="px-6 pt-4">
          <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setSlide('packaging')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-black transition-all ${
                slide === 'packaging' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              <Package className="w-3.5 h-3.5" />Packaging Types
            </button>
            <button onClick={() => setSlide('details')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-black transition-all ${
                slide === 'details' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              <Info className="w-3.5 h-3.5" />Product Details
            </button>
          </div>
        </div>

        <div className="p-6">
          {slide === 'packaging' ? (
            images.length === 0 ? (
              <p className="text-center text-[13px] text-slate-400 py-6">Packaging details coming soon.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {images.map((img, i) => (
                    <div key={i} className={images.length === 1 ? 'sm:col-span-2' : ''}>
                      <ProductPhoto src={img.src} alt={img.label ?? `${product.label} packaging ${i + 1}`}
                        className="w-full h-80 object-contain rounded-xl bg-amber-50 ring-1 ring-black/5 p-3" />
                      {img.label && (
                        <p className="text-center text-[12px] font-black text-slate-600 mt-2">{img.label}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Variant / weight / price / units-per-case for every SKU,
                    when supplied (see PACK_SIZES) — the photo shows what
                    each pack looks like, this says what to actually order.
                    Columns adapt to what this product's rows actually
                    carry: Royal Zahidi Dates names six pack designs but no
                    price; Organic Honey has one design across seven priced
                    sizes. */}
                {packSizes.length > 0 && (
                  <div className="mt-5 rounded-xl border border-slate-200 overflow-hidden">
                    <div className={`grid ${packGridCols} bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400`}>
                      {hasVariant && <span>Pack Design</span>}
                      {hasWeight && <span>Weight</span>}
                      {hasPrice && <span>MRP</span>}
                      {hasUnits && <span>Units / Case</span>}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {packSizes.map((p, i) => (
                        <div key={i} className={`grid ${packGridCols} items-center px-4 py-2.5 text-[12.5px]`}>
                          {hasVariant && <span className="font-bold text-slate-600 pr-2">{p.variant ?? '—'}</span>}
                          {hasWeight && <span className="font-black text-slate-800">{p.weight ?? '—'}</span>}
                          {hasPrice && <span className="font-bold text-amber-600">{p.price ?? '—'}</span>}
                          {hasUnits && <span className="text-slate-500">{p.unitsPerCase ?? '—'}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            <ProductDetailsSlide product={product} />
          )}
        </div>
      </div>
    </div>
  );
}

/* "View all" popup for the New Joiners card — same fixed-overlay/backdrop
   pattern as PackagingPopup above, sized up (max-w-lg, bigger avatars) so
   the same sample rows read clearly at a glance rather than in the card's
   cramped two-column width. Still explicitly flagged as sample data, same
   caveat as the card itself. */
function NewJoinersPopup({ onClose }: { onClose: () => void }) {
  const { new_joiners: joiners, loading, has_data } = useCelebrations('all');
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="ih-palette-in w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
          <div>
            <p className="text-base font-black text-slate-900 flex items-center gap-2">
              <UserPlus className="w-4.5 h-4.5 text-amber-500" />New Joiners
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {loading ? 'Loading…'
                : `Joined this month · ${joiners.length} ${joiners.length === 1 ? 'person' : 'people'}`}
            </p>
          </div>
          <button onClick={onClose} title="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-2">
          {!loading && joiners.length === 0 && (
            <p className="text-sm text-slate-400 py-6 text-center">
              {has_data
                ? 'Nobody has joined this month yet.'
                : 'No joining dates on record yet — run a Pocket HRMS sync from the admin console.'}
            </p>
          )}
          {/* Keyed by position, not name. At ~660 employees two people share a
              name sooner or later, and React silently drops the second row of
              a duplicated key - so the colleague whose name collided would
              just never appear on their own birthday. */}
          {joiners.map((j, i) => (
            <div key={`${j.name}-${i}`} className="flex items-center gap-4 rounded-xl hover:bg-slate-50 p-3 transition-colors">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0 text-base font-black">
                {j.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 truncate">{j.name}</p>
                <p className="text-[12px] text-slate-400">Joined on {j.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* "View all" popup for the Vacancies card — same pattern as
   NewJoinersPopup, with the opening-count badge scaled up to match, plus a
   second tab holding the full referral form (ReferralFormPopup.tsx) that
   the "Employee Referral Form" button switches into. */
const VACANCY_FUNCTIONS = ['Sales', 'Factory', 'HO'];
const vacFieldCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-800 ' +
  'placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all';
const vacFieldLabelCls = 'block text-[11.5px] font-bold text-slate-600 mb-1.5';

function VacanciesPopup({ onClose, isSuperadmin = false }:
  { onClose: () => void; isSuperadmin?: boolean }) {
  const [tab, setTab] = useState<'vacancies' | 'referral'>('vacancies');
  const { vacancies, loading, addVacancy, setVacancyStatus } = useVacancies();
  const [addVacancyOpen, setAddVacancyOpen] = useState(false);
  const [newType, setNewType] = useState<'New' | 'Replacement'>('New');
  const [error, setError] = useState('');
  // What the server said about the last submission — whether it went live or
  // went into the approval queue depends on who is adding it, so the message
  // comes back from the server rather than being decided here.
  const [notice, setNotice] = useState('');

  async function handleAddVacancy(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? '').trim();
    const title = get('title'), location = get('location');
    if (!title || !location) return;

    setError('');
    try {
      const created = await addVacancy({
        title, function: get('function'), department: get('department'),
        grade: get('grade'), location, state: get('state'),
        reportingManager: get('reportingManager'), type: newType,
        experience: get('experience'), education: get('education'),
      });
      setNotice(created.message || '');
      setAddVacancyOpen(false);
      setNewType('New');
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the vacancy.');
    }
  }

  // Closing a seat once it's filled — flips status rather than deleting the
  // row, so a closed position stays visible (greyed out) as a record instead
  // of just vanishing. Administrators only: closing one takes it off the
  // dashboard for the whole company, and the server enforces the same rule.
  async function toggleVacancyStatus(v: VacancyListing) {
    setError('');
    try {
      await setVacancyStatus(v.id, v.status === 'Active' ? 'Closed' : 'Active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the vacancy.');
    }
  }

  // Counts describe what the company can see. A pending row is visible to
  // its own submitter, so counting it here would tell them there is one more
  // open position than anyone else can find.
  const live = vacancies.filter(v => v.moderationStatus === 'approved');
  const awaiting = vacancies.filter(v => v.moderationStatus === 'pending');
  const openCount = live.filter(v => v.status === 'Active').length;
  const closedCount = live.length - openCount;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className={`ih-palette-in w-full max-h-[88vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5
          transition-[max-width] ${tab === 'referral' ? 'max-w-4xl' : 'max-w-3xl'}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
          <div>
            <p className="text-base font-black text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4.5 h-4.5 text-amber-500" />Vacancies
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {tab === 'referral' ? 'Refer a candidate and help us build a stronger team.'
                : closedCount > 0 ? `${openCount} open · ${closedCount} closed, out of ${vacancies.length} positions`
                : `${openCount} open positions across the current hiring plan`}
            </p>
          </div>
          <button onClick={onClose} title="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 border-b border-slate-100">
          <div className="flex items-center gap-5">
            {([
              { id: 'vacancies' as const, label: 'Available Vacancies' },
              { id: 'referral' as const, label: 'Referral Form' },
            ]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`py-3 text-[12.5px] font-black border-b-2 transition-colors ${
                  tab === t.id ? 'text-amber-600 border-amber-500' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'vacancies' && (
            <button onClick={() => setAddVacancyOpen(true)}
              className="ih-sheen flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600
                text-white text-[11.5px] font-black shadow-sm transition-colors shrink-0">
              <Plus className="w-3.5 h-3.5" />Add Vacancy
            </button>
          )}
        </div>

        {tab === 'vacancies' ? (
          <div className="p-6">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-[12.5px] text-rose-700 font-semibold mb-4">
                <XCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}
            {notice && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-[12.5px] text-amber-800 font-semibold mb-4">
                <Clock className="w-4 h-4 shrink-0 mt-px" />
                <span className="flex-1">{notice}</span>
                <button type="button" onClick={() => setNotice('')} title="Dismiss"
                  className="shrink-0 text-amber-500 hover:text-amber-700"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {isSuperadmin && awaiting.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 text-[12.5px] text-sky-800 font-semibold mb-4">
                <Clock className="w-4 h-4 shrink-0" />
                {awaiting.length} vacanc{awaiting.length === 1 ? 'y is' : 'ies are'} waiting for your approval — review {awaiting.length === 1 ? 'it' : 'them'} in Admin Console › Dashboard Content.
              </div>
            )}
            {loading && (
              <p className="text-center text-sm text-slate-400 py-16">Loading vacancies…</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {!loading && vacancies.map(v => {
                const closed = v.status !== 'Active';
                const pending = v.moderationStatus === 'pending';
                const rejected = v.moderationStatus === 'rejected';
                return (
                  <div key={v.id}
                    className={`rounded-xl border transition-all p-3.5 ${
                      pending ? 'border-amber-200 bg-amber-50/40 border-dashed'
                        : rejected ? 'border-rose-100 bg-rose-50/40'
                        : closed ? 'border-slate-100 bg-slate-50/60 opacity-70'
                        : 'border-slate-200 hover:border-amber-300 hover:shadow-sm'}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className={`text-[13px] font-black leading-tight ${closed && !pending ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-800'}`}>
                        {v.title}
                      </p>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase ring-1 flex-shrink-0 ${
                        pending ? 'text-amber-700 bg-amber-100 ring-amber-200'
                          : rejected ? 'text-rose-600 bg-rose-50 ring-rose-200'
                          : closed ? 'text-slate-400 bg-slate-100 ring-slate-200'
                          : 'text-emerald-600 bg-emerald-50 ring-emerald-200'}`}>
                        {pending ? 'Awaiting approval' : rejected ? 'Not approved' : v.status}
                      </span>
                    </div>
                    {/* Only ever shown to the submitter and to administrators —
                        the server does not send these rows to anyone else. */}
                    {pending && (
                      <p className="text-[10px] text-amber-700 font-bold mb-1.5">
                        {v.isMine ? 'Your submission — visible only to you until an administrator approves it.'
                          : `Submitted by ${v.submittedBy} · not yet on the dashboard`}
                      </p>
                    )}
                    {rejected && v.reviewNote && (
                      <p className="text-[10px] text-rose-600 font-bold mb-1.5">Not approved: {v.reviewNote}</p>
                    )}
                    <p className="text-[10.5px] text-slate-400 font-semibold mb-2 truncate">{v.department} · {v.function}</p>
                    <div className="flex items-center gap-1.5 text-[11.5px] text-slate-600 font-bold mb-2">
                      <MapPin className="w-3 h-3 text-amber-500 flex-shrink-0" />{v.location}, {v.state}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-50 ring-1 ring-slate-100 text-[10px] font-bold text-slate-500">
                        Grade {v.grade}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-md ring-1 text-[10px] font-bold
                        ${v.type === 'New' ? 'bg-sky-50 ring-sky-100 text-sky-600' : 'bg-amber-50 ring-amber-100 text-amber-600'}`}>
                        {v.type}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-50 ring-1 ring-slate-100 text-[10px] font-bold text-slate-500">
                        {v.experience}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-400 truncate" title={v.education}>{v.education}</p>
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <p className="text-[10px] text-slate-300">Reporting to {v.reportingManager}</p>
                      {isSuperadmin && !pending && !rejected && (
                        <button type="button" onClick={() => toggleVacancyStatus(v)}
                          title={closed ? 'Reopen this vacancy' : 'Mark this vacancy as closed/filled'}
                          className={`flex items-center gap-1 text-[10px] font-black shrink-0 transition-colors ${
                            closed ? 'text-emerald-600 hover:text-emerald-700' : 'text-rose-500 hover:text-rose-600'}`}>
                          {closed ? <RotateCcw className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {closed ? 'Reopen Vacancy' : 'Close Vacancy'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Referral CTA — every open role is a reminder that referrals are
                how most of these seats get filled. */}
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 text-amber-600" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-slate-800 leading-tight">Help us grow our team!</p>
                  <p className="text-[11.5px] text-slate-500 leading-tight mt-0.5">
                    Refer a talented friend or colleague and be a part of our success story.
                  </p>
                </div>
              </div>
              <button onClick={() => setTab('referral')}
                className="ih-sheen flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600
                text-white text-[12.5px] font-black shrink-0 shadow-sm transition-colors">
                <Send className="w-3.5 h-3.5" />Employee Referral Form
              </button>
            </div>
          </div>
        ) : (
          <ReferralForm onCancel={() => setTab('vacancies')} vacancies={vacancies} />
        )}
      </div>

      {/* Add Vacancy — POSTs to the real `vacancies` Django app via
          useVacancies(); the new row comes back with a real id and is
          merged into local state immediately, so it survives a reload. */}
      {addVacancyOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4"
          onClick={() => setAddVacancyOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <form onClick={e => e.stopPropagation()} onSubmit={handleAddVacancy}
            className="ih-pop-in relative w-full max-w-md max-h-[85vh] overflow-y-auto ih-scroll-clean flex flex-col
                       rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
              <p className="text-[14px] font-black text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-500" />Add Vacancy
              </p>
              <button type="button" onClick={() => setAddVacancyOpen(false)} title="Close"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className={vacFieldLabelCls}>Position Title <span className="text-rose-500">*</span></label>
                <input name="title" required placeholder="e.g. Territory Sales Executive" className={vacFieldCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={vacFieldLabelCls}>Function <span className="text-rose-500">*</span></label>
                  <select name="function" required defaultValue="" className={vacFieldCls}>
                    <option value="" disabled>Select function</option>
                    {VACANCY_FUNCTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className={vacFieldLabelCls}>Department <span className="text-rose-500">*</span></label>
                  <input name="department" required placeholder="e.g. SALES (GT)" className={vacFieldCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={vacFieldLabelCls}>HQ Location <span className="text-rose-500">*</span></label>
                  <input name="location" required placeholder="e.g. Jaipur" className={vacFieldCls} />
                </div>
                <div>
                  <label className={vacFieldLabelCls}>State <span className="text-rose-500">*</span></label>
                  <input name="state" required placeholder="e.g. Rajasthan" className={vacFieldCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={vacFieldLabelCls}>Grade</label>
                  <input name="grade" placeholder="e.g. O4" className={vacFieldCls} />
                </div>
                <div>
                  <label className={vacFieldLabelCls}>Experience</label>
                  <input name="experience" placeholder="e.g. 2-6 Yrs" className={vacFieldCls} />
                </div>
              </div>
              <div>
                <label className={vacFieldLabelCls}>Reporting Manager</label>
                <input name="reportingManager" placeholder="Enter reporting manager name" className={vacFieldCls} />
              </div>
              <div>
                <label className={vacFieldLabelCls}>Education Required</label>
                <input name="education" placeholder="e.g. Graduate" className={vacFieldCls} />
              </div>
              <div>
                <label className={vacFieldLabelCls}>Opening Type</label>
                <div className="flex gap-2">
                  {(['New', 'Replacement'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setNewType(t)}
                      className={`flex-1 px-3 py-2 rounded-lg border text-[12px] font-bold transition-all ${
                        newType === t ? 'text-amber-700 border-amber-300 bg-amber-50' : 'text-slate-500 border-slate-200 bg-white hover:border-slate-300'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-slate-100 bg-slate-50">
              <button type="button" onClick={() => setAddVacancyOpen(false)}
                className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 text-[13px] font-bold transition-all">
                Cancel
              </button>
              <button type="submit"
                className="ih-sheen inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600
                           hover:from-amber-600 hover:to-orange-700 text-white text-[13px] font-black shadow-md shadow-amber-200 transition-all">
                <Plus className="w-4 h-4" />Add Vacancy
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* "View all" popup for the Announcements card — same pattern as
   NewJoinersPopup/VacanciesPopup, with each row's icon tile carrying the
   announcement's own icon instead of initials. */
function AnnouncementsPopup({ onClose }: { onClose: () => void }) {
  const { announcements, loading } = useAnnouncements();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="ih-palette-in w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
          <div>
            <p className="text-base font-black text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4.5 h-4.5 text-amber-500" />Announcements
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {loading ? 'Loading…'
                : announcements.length ? `${announcements.length} notice${announcements.length === 1 ? '' : 's'} from HR`
                : 'Nothing posted yet'}
            </p>
          </div>
          <button onClick={onClose} title="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-2">
          {!loading && announcements.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-10">
              No announcements yet. HR posts these from Admin Console.
            </p>
          )}
          {announcements.map(a => {
            const Icon = a.icon;
            return (
              <div key={a.id} className="flex items-start gap-4 rounded-xl hover:bg-slate-50 p-3 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 leading-snug">{a.title}</p>
                  <p className="text-[12px] text-slate-400 leading-snug mt-0.5">{a.body}</p>
                  <p className="text-[11px] font-bold text-slate-300 mt-1.5">{a.date}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* "View all" popup for the Birthdays/Anniversaries card — same pattern as
   NewJoinersPopup, plus its own copy of the card's tab switcher (opens on
   whichever tab was active on the card, but can be flipped independently
   inside the popup). */
function CelebrationsPopup({ initialTab, onClose }: { initialTab: 'birthdays' | 'anniversaries'; onClose: () => void }) {
  const [tab, setTab] = useState(initialTab);
  const { birthdays, anniversaries, loading, has_data } = useCelebrations('all');
  const rows = tab === 'birthdays' ? birthdays : anniversaries;
  const label = tab === 'birthdays' ? 'birthdays' : 'anniversaries';
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="ih-palette-in w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setTab('birthdays')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-black transition-all ${
                tab === 'birthdays' ? 'bg-white text-amber-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              <Heart className="w-3.5 h-3.5" />Birthdays
            </button>
            <button onClick={() => setTab('anniversaries')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-black transition-all ${
                tab === 'anniversaries' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              Anniversaries
            </button>
          </div>
          <button onClick={onClose} title="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="px-6 pt-3 text-[11px] text-slate-400">
          {loading ? 'Loading…' : !has_data ? 'Employee directory not synced yet'
            : `Rest of this month · ${rows.length} ${label}`}
        </p>
        <div className="p-6 pt-3 space-y-2">
          {/* "Nothing this month" and "the directory has never been synced"
              look identical and mean opposite things - the server sends
              has_data so the two can be told apart rather than a blank
              month being read as a broken page. */}
          {!loading && rows.length === 0 && (
            <p className="text-sm text-slate-400 py-6 text-center">
              {has_data
                ? `No more ${label} left this month.`
                : 'No dates of birth or joining on record yet — run a Pocket HRMS sync from the admin console.'}
            </p>
          )}
          {rows.map((p, i) => (
            <div key={`${p.name}-${i}`} className="flex items-center gap-4 rounded-xl hover:bg-slate-50 p-3 transition-colors">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-base font-black
                               ${tab === 'birthdays' ? 'bg-amber-50 text-amber-500' : 'bg-orange-50 text-orange-600'}`}>
                {p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {p.years != null && (
                    <span className="font-bold text-orange-600">
                      {p.years} {p.years === 1 ? 'year' : 'years'}
                      {p.department ? ' · ' : ''}
                    </span>
                  )}
                  {p.department}
                </p>
              </div>
              <span className="text-[12px] font-bold text-slate-400 flex-shrink-0">{p.date}</span>
            </div>
          ))}
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

export function IntranetHomePage({ onNavigate, allowedApps, isSuperadmin }: IntranetHomePageProps) {
  /* Birthdays, anniversaries and new joiners, live from the employee master.
     Only currently-employed people; the server enforces that. */
  const cel = useCelebrations();
  const vac = useVacancies();
  const vacSummary = summarizeVacancies(vac.vacancies);
  const liveVacancyCount = vac.vacancies.filter(
    v => v.moderationStatus === 'approved' && v.status === 'Active').length;
  /* Live BSE price for the banner; server-cached, so this is cheap. */
  const ticker = useTicker();

  /* Every card on this page used to render for every signed-in person,
   * whatever the admin console said they could open — clicking a card was
   * the only place permission was ever checked, and even then only App.tsx's
   * route guard caught it. That made a grant invisible: the dashboard looked
   * identical before and after, so "I gave her access" and "nothing changed
   * on her screen" were both true at once.
   *
   * VISIBLE_TOOLS is what every list on this page reads from instead of the
   * raw QUICK_ACCESS export. */
  const VISIBLE_TOOLS = useMemo(
    () => (isSuperadmin || !allowedApps
      ? QUICK_ACCESS
      : QUICK_ACCESS.filter(t => allowedApps.includes(t.id))),
    [allowedApps, isSuperadmin],
  );
  // Top-level hero carousel: slide 0 is the "Our Products" showcase, with
  // its own continuously-sliding product strip; slides 1+ are the
  // leadership profiles.
  const heroSlideCount = 1 + LEADERSHIP_SLIDES.length;
  const [heroSlide, setHeroSlide] = useState(0);

  const recentEntries = useMemo(() => getRecentToolsWithTime(), []);
  const recentTools = recentEntries
    // A tool opened before access was revoked must not linger in "Recent".
    .map(r => ({ tool: VISIBLE_TOOLS.find(t => t.id === r.id), ts: r.ts }))
    .filter((x): x is { tool: typeof QUICK_ACCESS[number]; ts: number } => !!x.tool);

  const [category, setCategory] = useState<ToolCategoryFilter>('All');
  const [dense, setDense] = useState(true);
  const [openProduct, setOpenProduct] = useState<OurProduct | null>(null);
  const [openListPopup, setOpenListPopup] = useState<'joiners' | 'vacancies' | 'announcements' | 'celebrations' | null>(null);
  const [celebrationTab, setCelebrationTab] = useState<'birthdays' | 'anniversaries'>('birthdays');
  const filteredTools = category === 'All' ? VISIBLE_TOOLS : VISIBLE_TOOLS.filter(t => t.category === category);

  const { announcements, loading: announcementsLoading } = useAnnouncements();

  // Statewise holiday widget — APIS's own zones, now served from the
  // `noticeboard` app rather than a hard-coded array, so next year's circular
  // is a change an administrator makes rather than a deploy.
  const { zones } = useHolidayZones();
  const [holidayStateId, setHolidayStateId] = useState('');
  const [holidayWindowStart, setHolidayWindowStart] = useState(0);
  const HOLIDAY_CARD_COUNT = 3;
  const upcomingStateHolidays = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    // Falls back to the first zone until one is picked, and to nothing at all
    // while the zones are still loading.
    const group = zones.find(g => g.id === holidayStateId) ?? zones[0];
    if (!group) return [];
    return group.holidays
      .map(h => ({ ...h, dateObj: new Date(`${h.date}T00:00:00`) }))
      .filter(h => h.dateObj >= today)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [holidayStateId, zones]);
  const visibleHolidays = upcomingStateHolidays.slice(holidayWindowStart, holidayWindowStart + HOLIDAY_CARD_COUNT);
  const [zoneMenuOpen, setZoneMenuOpen] = useState(false);
  const zoneMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!zoneMenuOpen) return;
    const h = (e: MouseEvent) => { if (zoneMenuRef.current && !zoneMenuRef.current.contains(e.target as Node)) setZoneMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [zoneMenuOpen]);
  /* Undefined until the zones arrive — the list is fetched, so the first
     render has none. Typed as possibly-missing because it genuinely is; the
     picker renders a placeholder rather than reading .label off nothing. */
  const selectedZone: StateHolidayGroup | undefined =
    zones.find(g => g.id === holidayStateId) ?? zones[0];


  const [factIndex, setFactIndex] = useState(0);
  const [milestoneIndex, setMilestoneIndex] = useState(0);

  useEffect(() => {
    if (heroSlideCount < 2) return;
    const iv = setInterval(() => setHeroSlide(s => (s + 1) % heroSlideCount), 7000);
    return () => clearInterval(iv);
  }, [heroSlideCount]);
  useEffect(() => {
    const iv = setInterval(() => setFactIndex(i => (i + 1) % DID_YOU_KNOW.length), 5000);
    return () => clearInterval(iv);
  }, []);
  // Switching state resets the card window rather than leaving it stranded
  // past the end of a shorter zone's list.
  useEffect(() => { setHolidayWindowStart(0); }, [holidayStateId]);
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

        {/* BSE quote + tagline ticker — continuously auto-scrolling strip
            above the hero, same marquee technique (.ih-ticker, pauses on
            hover) as the product strip further down. The one segment is
            repeated several times before being duplicated for the loop, so
            there's no gap even on very wide screens. */}
        <div className="ih-ticker-track relative overflow-hidden bg-white border-b border-amber-100 py-2">
          <div className="ih-ticker flex items-center w-max whitespace-nowrap" style={{ animationDuration: '75s' }}>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-6 shrink-0">
                {/* A down day is red with the arrow the other way up. Painting
                    every movement green was fine while the number never moved. */}
                {ticker.quote && (ticker.trend_up
                  ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  : <TrendingDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />)}
                {ticker.quote && (
                  <>
                    <span className="text-[12px] font-bold text-slate-700">{ticker.quote}</span>
                    <span className={`text-[12px] font-black ${ticker.trend_up ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ({ticker.change_pct})
                    </span>
                    {/* Says so rather than passing an old price off as today's. */}
                    {ticker.stale && (
                      <span className="text-[10px] font-bold text-slate-400">last known</span>
                    )}
                    <span className="text-amber-300">|</span>
                  </>
                )}
                <span className="text-[12px] text-slate-500">{ticker.tagline}</span>
                <span className="text-amber-300">•</span>
              </div>
            ))}
          </div>
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

                  {/* right: continuously auto-sliding product strip — no
                      manual arrows, just a seamless marquee (pauses on
                      hover). OUR_PRODUCTS is duplicated back-to-back so the
                      ihTicker keyframe's translateX(-50%) loops with no
                      visible seam; see .ih-ticker in intranetStyles.ts. */}
                  <div className="ih-ticker-track relative flex-1 min-w-0 overflow-hidden">
                    <div className="ih-ticker flex items-center gap-3 w-max">
                      {[...OUR_PRODUCTS, ...OUR_PRODUCTS].map((p, i) => (
                        <div key={`${p.label}-${i}`}
                          className="w-24 sm:w-28 shrink-0 aspect-square rounded-2xl p-3 flex items-center justify-center overflow-hidden">
                          <ProductPhoto src={p.image} alt={p.label} className="w-4/5 h-4/5 object-contain" />
                        </div>
                      ))}
                    </div>
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
                      <div className="min-w-0 flex-1 text-center md:text-left">
                        <h1 className="text-2xl md:text-3xl font-black text-amber-300 uppercase tracking-wide mb-1">
                          {leader.name}
                        </h1>
                        <p className="text-base font-bold text-slate-300 mb-3">{leader.role}</p>
                        <div className="w-12 h-1 rounded-full bg-amber-500 mb-3 mx-auto md:mx-0" />
                        <p className="text-slate-300 text-[15px] leading-relaxed">{leader.bio}</p>
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

            {/* APIS at a glance — quick jump-off points to the real external
                platforms employees actually use day to day, not company
                stats (those still live in APIS_GLANCE, feeding the "Did you
                know" ticker). ERP's href is null until that link is
                provided, so its card renders as a visible "Coming soon"
                rather than a dead link. */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">APIS at a Glance</h2>
                <span className="text-[10px] font-bold text-slate-300">Quick access</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {QUICK_PORTALS.map((p, i) => {
                  const Icon = p.icon;
                  const inner = (
                    <>
                      <div className={`ih-float w-11 h-11 rounded-xl ${p.soft} ring-4 ${p.ring} flex items-center justify-center
                                       flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}
                        style={{ animationDelay: `${i * 300}ms` }}>
                        <Icon className={`w-5 h-5 ${p.accent}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-black text-slate-900 leading-tight">{p.label}</p>
                        <p className="text-[10.5px] text-slate-400 leading-snug mt-1">{p.sub}</p>
                      </div>
                    </>
                  );
                  const cardCls = `ih-inview ih-tilt3d ih-spotlight ih-sweep group relative rounded-2xl bg-white border
                    border-slate-200 p-4 shadow-sm overflow-hidden flex items-start gap-3 text-left transition-all
                    ${p.href ? 'hover:border-amber-300 hover:shadow-lg hover:-translate-y-0.5' : 'opacity-70'}`;
                  return p.href ? (
                    <a key={p.label} href={p.href} {...(p.download ? { download: true } : { target: '_blank', rel: 'noopener noreferrer' })}
                      onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
                      className={cardCls} style={{ transitionDelay: `${i * 60}ms` }}>
                      {inner}
                    </a>
                  ) : (
                    <div key={p.label} title="Link coming soon" onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
                      className={cardCls} style={{ transitionDelay: `${i * 60}ms` }}>
                      {inner}
                      <span className="absolute top-2.5 right-2.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">
                        Soon
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Uplift Values / Our Vision / Our Mission — APIS's UPLIFT core
                values as a scannable list (replacing the old 6-tile grid and
                the What's Happening feed in this slot) alongside APIS's own
                published vision and mission statements (see
                APIS_VISION/APIS_MISSION in IntranetHomeShared.tsx for
                sourcing). All three sit in one row so they read as a set. */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
                className="ih-reveal ih-tilt3d ih-spotlight relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-amber-50/40 border border-amber-100 shadow-lg p-5 flex flex-col">
                {/* honeycomb watermark + bee, bottom-left — same gold mark
                    the reference card carries there, bleeding past the
                    corner rather than a faint background texture. */}
                <svg aria-hidden viewBox="0 0 160 160" className="pointer-events-none absolute -bottom-8 -left-8 w-40 h-40 opacity-[0.16]">
                  <defs>
                    <pattern id="ih-hex" width="18" height="31.2" patternUnits="userSpaceOnUse">
                      <path d="M9 0 L18 5.2 L18 15.6 L9 20.8 L0 15.6 L0 5.2 Z" fill="none" stroke="#b45309" strokeWidth="1.5" />
                      <path d="M9 20.8 L18 26 L18 36.4 L9 41.6 L0 36.4 L0 26 Z" fill="none" stroke="#b45309" strokeWidth="1.5" />
                    </pattern>
                  </defs>
                  <rect width="160" height="160" fill="url(#ih-hex)" />
                </svg>
                <svg aria-hidden viewBox="0 0 40 40" className="pointer-events-none absolute bottom-3 left-9 w-7 h-7 opacity-70">
                  <ellipse cx="20" cy="22" rx="9" ry="7" fill="#78350f" />
                  <path d="M12 22a8 8 0 0 1 16 0" fill="none" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="20" cy="11" r="5" fill="#78350f" />
                  <ellipse cx="13" cy="15" rx="6" ry="4" fill="#fde68a" opacity="0.85" transform="rotate(-25 13 15)" />
                  <ellipse cx="27" cy="15" rx="6" ry="4" fill="#fde68a" opacity="0.85" transform="rotate(25 27 15)" />
                </svg>

                <div className="relative z-10 flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h2 className="text-[13px] font-black text-amber-900 uppercase tracking-wide">Uplift Values</h2>
                </div>

                <div className="relative z-10 divide-y divide-amber-100/80 overflow-y-auto pr-1">
                  {UPLIFT_VALUES.map(v => {
                    const Icon = v.icon;
                    return (
                      <div key={v.letter} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11.5px] font-black text-amber-900 uppercase tracking-wide">{v.label}</p>
                          <p className="text-[11.5px] text-slate-500 leading-snug mt-0.5">{v.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Our Vision — a full sunset wash (pale gold at the top,
                  deep amber-brown at the base) rather than a flat pastel
                  tint, so the card reads as one continuous scene behind the
                  mountains, the way the reference sits. Cursor-follow
                  spotlight + 3D tilt for the same "alive" interaction every
                  other card in this app has. */}
              <div onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
                className="ih-reveal ih-tilt3d ih-spotlight relative overflow-hidden rounded-2xl shadow-lg flex flex-col"
                style={{ background: 'linear-gradient(180deg, #fef6da 0%, #fbdd8b 32%, #f3a94d 62%, #c9701c 100%)' }}>
                <div className="ih-drift pointer-events-none absolute -top-14 -right-14 w-48 h-48 rounded-full bg-white/30 blur-3xl" />
                <div className="relative z-10 p-5 pb-3">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="ih-float w-9 h-9 rounded-full bg-white/80 backdrop-blur-md ring-2 ring-white/70 text-amber-600 flex items-center justify-center shrink-0">
                      <Eye className="w-4 h-4" />
                    </div>
                    <h2 className="text-[13px] font-black text-amber-950 uppercase tracking-wide">Our Vision</h2>
                  </div>
                  <p className="text-amber-950/90 text-[16px] leading-relaxed font-medium">{APIS_VISION}</p>
                </div>
                <MountainScape />
              </div>

              {/* Our Mission — deliberately breaks from Vision's warm honey
                  scene: a light cyan/violet-tinted surface with a neon edge,
                  an animated circuit-node backdrop, and a scanline sweep, so
                  it reads as "the forward-looking one" of the two without
                  going all the way to a dark panel. Reuses the app's own
                  ih-* ambient-motion kit (ih-mesh, ih-scan, ih-orbit,
                  ih-halo, ih-neon) rather than inventing new CSS. */}
              <div onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
                style={{ animationDelay: '80ms', ['--ih-neon' as string]: '#22d3ee' }}
                className="ih-reveal ih-tilt3d ih-spotlight ih-neon ih-scan relative overflow-hidden rounded-2xl
                           bg-gradient-to-br from-white via-cyan-50/70 to-violet-50/70
                           border border-cyan-200 shadow-[0_20px_60px_-18px_rgba(34,211,238,.25)] flex flex-col">
                {/* ambient cyan/violet colour wash, same technique as the
                    dashboard's own ih-mesh background */}
                <div className="ih-mesh pointer-events-none absolute inset-0 opacity-40" />

                {/* faint circuit grid — thin lines + a few "nodes", one
                    pulsing, standing in for the honey/mountain motif the
                    other two cards carry */}
                <svg aria-hidden viewBox="0 0 300 260" className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.18]">
                  <g stroke="#0891b2" strokeWidth="1" fill="none">
                    <path d="M20 40 H120 V90 H220 V50 H280" />
                    <path d="M10 140 H90 V190 H180 V230 H270" />
                    <path d="M150 20 V80 H240 V160" />
                  </g>
                  <g fill="#0891b2">
                    <circle cx="120" cy="40" r="3" />
                    <circle cx="220" cy="90" r="3" />
                    <circle cx="90" cy="140" r="3" />
                    <circle cx="180" cy="190" r="3" />
                    <circle cx="240" cy="160" r="3" />
                  </g>
                  <circle className="ih-pulse-glow" cx="280" cy="50" r="4" fill="#8b5cf6" />
                </svg>

                <div className="relative z-10 p-5 pb-4 flex-1">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="ih-orbit ih-halo w-9 h-9 rounded-full bg-white/90 backdrop-blur-md
                                    ring-1 ring-cyan-300 text-cyan-600 flex items-center justify-center shrink-0"
                      style={{ ['--ih-orbit' as string]: '#22d3ee', ['--ih-halo' as string]: 'rgba(139,92,246,.35)' }}>
                      <Flag className="w-4 h-4" />
                    </div>
                    <h2 className="ih-grad-text text-[15px] font-black uppercase tracking-wide
                                   bg-gradient-to-r from-cyan-600 via-sky-600 to-violet-600">
                      Our Mission
                    </h2>
                  </div>
                  <ul className="space-y-3">
                    {APIS_MISSION_POINTS.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-4.5 h-4.5 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500
                                         flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_10px_-1px_rgba(34,211,238,.5)]">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </span>
                        <span className="text-slate-700 text-[13.5px] leading-relaxed font-medium">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Our Products — real APIS India Limited product photography */}
            <section id="our-products" className="scroll-mt-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  </span>
                  Our Products
                </h2>
                <a href="#our-products"
                  className="flex items-center gap-1 text-[12px] font-black text-amber-600 hover:text-amber-700 transition-colors">
                  View all products <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {OUR_PRODUCTS.map((p, i) => (
                  <button key={p.label} onClick={() => setOpenProduct(p)}
                    onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
                    className="ih-inview ih-tilt3d ih-spotlight group relative rounded-2xl overflow-hidden
                      bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:border-amber-200
                      transition-all text-left"
                    style={{ transitionDelay: `${i * 60}ms` }}>
                    <div className="relative aspect-square p-6 flex items-center justify-center overflow-hidden bg-white">
                      {/* A small warm glow behind the product itself — not a full
                          amber wash across the whole tile, just enough to lift the
                          photo off the white card the way the reference does. */}
                      <div aria-hidden className="absolute inset-x-8 inset-y-6 rounded-full bg-amber-300/60 blur-xl" />
                      <ProductPhoto src={p.image} alt={p.label}
                        className="relative w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
                    </div>
                    <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-t border-slate-100">
                      <p className="font-bold text-slate-800 text-[13.5px] truncate">{p.label}</p>
                      <span className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center
                        justify-center shrink-0 group-hover:bg-amber-500 transition-colors">
                        <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 group-hover:text-white transition-colors" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {openProduct && <PackagingPopup product={openProduct} onClose={() => setOpenProduct(null)} />}
            {openListPopup === 'joiners' && <NewJoinersPopup onClose={() => setOpenListPopup(null)} />}
            {openListPopup === 'vacancies' && <VacanciesPopup onClose={() => setOpenListPopup(null)} isSuperadmin={isSuperadmin} />}
            {openListPopup === 'announcements' && <AnnouncementsPopup onClose={() => setOpenListPopup(null)} />}
            {openListPopup === 'celebrations' && <CelebrationsPopup initialTab={celebrationTab} onClose={() => setOpenListPopup(null)} />}

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

            {/* Our Journey / Milestones — same real COMPANY_MILESTONES data
                and auto-advance/manual-nav behaviour as before (milestoneIndex
                still ticks every 5s, see the effect above), redesigned around
                a floating icon badge + framed photo per card and a dashed
                "road" timeline underneath with a dot per milestone and a
                pointer triangle under whichever one is active — reads as a
                literal journey/roadmap rather than a plain filmstrip. */}
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
                <p className="text-[12px] text-slate-400 mb-8">A century-long journey of purity, quality and innovation.</p>

                <div className="flex items-center gap-2">
                  <button onClick={() => setMilestoneIndex(i => (i - 1 + COMPANY_MILESTONES.length) % COMPANY_MILESTONES.length)}
                    title="Previous milestone"
                    className="hidden sm:flex w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm items-center justify-center
                               text-slate-400 hover:text-amber-600 hover:border-amber-300 transition-all flex-shrink-0">
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex-1 overflow-x-auto">
                    {/* Every column is the same fixed width/height whether
                        active or not — the "pop" for the active card comes
                        from scale/ring/shadow (transform, not box size), so
                        columns never reflow and the connector row below
                        always lines up under the right card. `overflow-x-auto`
                        makes the browser compute `overflow-y` as `auto` too
                        (per spec — setting overflow-y: visible explicitly
                        gets silently overridden back to auto whenever
                        overflow-x isn't visible, so that's not a usable
                        fix): without real clearance above the row, the
                        floating icon badge — which deliberately pokes above
                        the card via negative positioning — gets clipped by
                        that invisible vertical scrollbox before it's fully
                        painted. pt-9 gives it enough room to clear. */}
                    <div className="flex items-start justify-center gap-4 px-1 pt-9 pb-1 min-w-max mx-auto">
                      {COMPANY_MILESTONES.map((m, i) => {
                        const active = i === milestoneIndex;
                        const Icon = MILESTONE_ICONS[i % MILESTONE_ICONS.length];
                        return (
                          <button key={i} onClick={() => setMilestoneIndex(i)}
                            className={`ih-tilt relative flex-shrink-0 w-36 rounded-2xl bg-white text-left transition-all duration-300 p-3 pt-6
                                       ${active
                                         ? 'shadow-xl shadow-amber-500/25 ring-2 ring-amber-400 scale-105 z-10 -translate-y-1'
                                         : 'border border-slate-200 opacity-75 hover:opacity-100 hover:-translate-y-0.5'}`}>
                            {/* Floating icon badge, half in / half out of the card */}
                            <span className={`absolute -top-4 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center rounded-full
                                             text-white ring-4 ring-white transition-all duration-300
                                             ${active
                                               ? 'w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/40 ih-pulse-glow'
                                               : 'w-8 h-8 bg-amber-300'}`}>
                              <Icon className={active ? 'w-5 h-5' : 'w-4 h-4'} />
                            </span>

                            <div className={`relative h-20 rounded-xl overflow-hidden ${m.image ? 'ring-1 ring-amber-100' : 'bg-gradient-to-br from-amber-50 to-orange-50'}`}>
                              {m.image && <img src={m.image} alt="" className="w-full h-full object-cover" />}
                            </div>

                            <div className="text-center mt-2.5">
                              <p className={`font-black ${active ? 'text-lg text-slate-900' : 'text-sm text-slate-500'}`}>{m.year}</p>
                              <p className={`text-[10.5px] font-semibold text-amber-600 leading-snug mt-0.5 min-h-[26px] transition-opacity duration-300
                                            ${active ? 'opacity-100' : 'opacity-0'}`}>
                                {m.label}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Dashed "road" with one dot per milestone, and a
                        pointer triangle under whichever one is active — a
                        separate, fixed-height row, so it always sits at the
                        right spot regardless of how tall the cards above
                        are. */}
                    <div className="hidden sm:flex relative items-center justify-center gap-4 px-1 min-w-max mx-auto">
                      <div aria-hidden className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-px border-t-2 border-dashed border-amber-300" />
                      {COMPANY_MILESTONES.map((_, i) => {
                        const active = i === milestoneIndex;
                        return (
                          <div key={i} className="relative z-10 flex-shrink-0 w-36 flex flex-col items-center gap-1">
                            <div className={`w-0 h-0 border-x-[5px] border-x-transparent border-b-[6px] border-b-amber-400 transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`} />
                            <span className={`rounded-full ring-4 ring-white transition-all duration-300 ${active ? 'w-3 h-3 bg-amber-500' : 'w-2 h-2 bg-amber-200'}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button onClick={() => setMilestoneIndex(i => (i + 1) % COMPANY_MILESTONES.length)}
                    title="Next milestone"
                    className="hidden sm:flex w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm items-center justify-center
                               text-slate-400 hover:text-amber-600 hover:border-amber-300 transition-all flex-shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div key={milestoneIndex} className="ih-fade mt-3 text-center">
                  <p className="text-[12px] text-slate-500 leading-relaxed max-w-md mx-auto">{COMPANY_MILESTONES[milestoneIndex].body}</p>
                </div>

                <div className="flex items-center justify-center gap-1 mt-3 sm:hidden">
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
            {/* Holidays — APIS's own zone-wise 2026 circular (STATE_HOLIDAYS_2026),
                not a generic public list. A state picker because the circular
                itself is zone-specific: Delhi/HO sees a different calendar
                than, say, Kerala or Tamil Nadu. */}
            {/* No ih-reveal on this outer box: a CSS animation targeting
                opacity/transform makes an element a stacking-context root
                for as long as the class stays applied (even once the
                animation has finished playing) — which silently traps the
                dropdown menu's z-20 inside this card, so it painted BELOW
                the next widget down (New Joiners/Vacancies) wherever it
                overflowed this card's bounds. The one-time entrance fade
                moves to an inner wrapper that doesn't contain the menu. */}
            <div className="relative rounded-xl bg-white border border-slate-200 shadow-sm p-5">
              {/* Clipped to its own layer, not the card, so the dropdown menu
                  below can overflow the card's bounds without being cut off. */}
              <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                <div className="ih-drift absolute -top-8 -right-8 w-28 h-28 rounded-full bg-amber-400/10 blur-2xl" />
              </div>
              <div className="ih-reveal">
                <div className="relative flex items-center justify-between mb-1">
                  <h2 className="text-[13px] font-black text-slate-800 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-amber-500" />Upcoming Holidays
                  </h2>
                </div>
                <p className="relative text-[10.5px] text-slate-400 font-medium mb-3">
                  Check the special (exceptional) holidays for your zone.
                </p>
              </div>

              <div ref={zoneMenuRef} className="relative mb-3">
                <button type="button" onClick={() => setZoneMenuOpen(o => !o)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg ring-1 transition-colors
                    ${zoneMenuOpen ? 'bg-amber-100/70 ring-amber-300' : 'bg-amber-50/60 ring-amber-100 hover:bg-amber-100/50'}`}>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />Your Zone
                  </span>
                  <span className="flex items-center gap-1 min-w-0">
                    <span className="text-[11px] font-black text-slate-700 truncate">
                      {selectedZone?.label ?? 'Loading…'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-amber-500 flex-shrink-0 transition-transform duration-200 ${zoneMenuOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>

                {zoneMenuOpen && (
                  <div className="ih-pop-in absolute right-0 top-[calc(100%+6px)] z-20 w-64 max-h-72 overflow-y-auto ih-scroll-clean
                                  rounded-xl bg-white border border-slate-200 shadow-[0_20px_45px_-15px_rgba(0,0,0,.25)] p-1.5">
                    {zones.map(g => {
                      const active = g.id === holidayStateId;
                      return (
                        <button key={g.id} type="button"
                          onClick={() => { setHolidayStateId(g.id); setZoneMenuOpen(false); }}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-[12px] font-bold transition-colors
                            ${active ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                          <span className="truncate">{g.label}</span>
                          {active && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {visibleHolidays.length > 0 ? (
                <div className="relative flex items-stretch gap-2">
                  <button onClick={() => setHolidayWindowStart(s => Math.max(0, s - 1))}
                    disabled={holidayWindowStart === 0}
                    className="w-5 flex-shrink-0 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <div key={`${holidayStateId}-${holidayWindowStart}`} className="ih-fade flex-1 grid grid-cols-3 gap-1.5 min-w-0">
                    {visibleHolidays.map(h => (
                      <div key={h.date + h.name} className="flex flex-col items-center text-center rounded-lg bg-slate-50 ring-1 ring-slate-100 px-1.5 py-2.5">
                        <p className="text-[13px] font-black text-amber-600 leading-none">{h.dateObj.getDate()} {h.dateObj.toLocaleDateString(undefined, { month: 'short' })}</p>
                        <p className="text-[10.5px] font-bold text-slate-700 leading-tight mt-1.5 line-clamp-2">{h.name}</p>
                        <span className={`mt-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide ring-1
                          ${h.type === 'National' ? 'text-amber-600 bg-amber-50 ring-amber-200' : 'text-sky-600 bg-sky-50 ring-sky-200'}`}>
                          {h.type === 'National' ? 'National' : 'State Special'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setHolidayWindowStart(s => Math.min(upcomingStateHolidays.length - HOLIDAY_CARD_COUNT, s + 1))}
                    disabled={holidayWindowStart + HOLIDAY_CARD_COUNT >= upcomingStateHolidays.length}
                    className="w-5 flex-shrink-0 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <p className="relative text-[11px] text-slate-400 text-center py-3">No more holidays left in this zone for 2026.</p>
              )}

              <p className="relative flex items-start gap-1.5 text-[9.5px] text-slate-400 mt-3.5 leading-snug">
                <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                Different zones may have different holidays — pick yours above to see its list.
              </p>
            </div>

            {/* New Joiners / Vacancies — two side-by-side cards. New Joiners
                is real, from the HRMS-synced employee master. Vacancies has
                no live ATS feed either, but is backed by the real
                `vacancies` Django app (useVacancies()) rather than a
                placeholder set. */}
            <div className="grid grid-cols-2 gap-3">
              {/* flex column with the list on flex-1: grid cells stretch to the
                  tallest card in the row, and without this the spare height
                  pooled into one dead block under the last name. */}
              <div className="ih-reveal rounded-xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col" style={{ animationDelay: '40ms' }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 min-w-0 truncate">
                    <UserPlus className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />New Joiners
                  </h2>
                  <button onClick={() => setOpenListPopup('joiners')}
                    className="text-[9.5px] font-bold text-amber-500 hover:text-amber-600 whitespace-nowrap flex-shrink-0 transition-colors">
                    View all
                  </button>
                </div>
                <div className="flex-1 flex flex-col justify-evenly gap-1">
                  {!cel.loading && cel.new_joiners.length === 0 && (
                    <p className="text-[10px] text-slate-400 py-3">
                      {cel.has_data ? 'Nobody joined this week.' : 'Directory not synced yet.'}
                    </p>
                  )}
                  {cel.new_joiners.slice(0, 4).map((j, i) => (
                    <div key={`${j.name}-${i}`} className="flex items-center gap-2.5 rounded-lg hover:bg-slate-50 p-1 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0 text-[10.5px] font-black">
                        {j.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11.5px] font-bold text-slate-800 truncate">{j.name}</p>
                        <p className="text-[9.5px] text-slate-400">Joined on {j.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ih-reveal rounded-xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col" style={{ animationDelay: '60ms' }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 min-w-0 truncate">
                    <Briefcase className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />Vacancies
                  </h2>
                  <button onClick={() => setOpenListPopup('vacancies')}
                    className="text-[9.5px] font-bold text-amber-500 hover:text-amber-600 whitespace-nowrap flex-shrink-0 transition-colors">
                    View all
                  </button>
                </div>
                {/* Counted over what the whole company can see, not over the
                    raw list: a superadmin (and a submitter) is served their
                    own pending rows too, and counting those here promised
                    more open positions than anyone else could find. */}
                <p className="text-[9px] text-slate-300 mb-2.5">
                  Top roles by open seats — {liveVacancyCount} position{liveVacancyCount === 1 ? '' : 's'} in total
                </p>
                <div className="flex-1 flex flex-col justify-evenly gap-1">
                  {!vac.loading && vacSummary.length === 0 && (
                    <p className="text-[10px] text-slate-400 py-3">No open positions right now.</p>
                  )}
                  {vacSummary.map(v => (
                    <div key={v.title} className="flex items-center gap-2.5 rounded-lg hover:bg-slate-50 p-1 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11.5px] font-bold text-slate-800 truncate">{v.title}</p>
                        <p className="text-[9.5px] text-slate-400 truncate">{v.location}</p>
                      </div>
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10.5px] font-black flex-shrink-0">
                        {v.openings}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Birthdays / Anniversaries — real, from the employee master that
                Pocket HRMS syncs into the portal, currently-employed people
                only (the server enforces that). The card shows the week
                ahead; "View all" opens the rest of the month. */}
            <div className="ih-reveal rounded-xl bg-white border border-slate-200 shadow-sm p-5" style={{ animationDelay: '80ms' }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                  <button onClick={() => setCelebrationTab('birthdays')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-black transition-all ${
                      celebrationTab === 'birthdays' ? 'bg-white text-amber-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Heart className="w-3 h-3" />Birthdays
                  </button>
                  <button onClick={() => setCelebrationTab('anniversaries')}
                    className={`px-2 py-1 rounded-md text-[10.5px] font-black transition-all ${
                      celebrationTab === 'anniversaries' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    Anniversaries
                  </button>
                </div>
                <button onClick={() => setOpenListPopup('celebrations')}
                  className="text-[10px] font-bold text-amber-500 hover:text-amber-600 transition-colors">
                  View all
                </button>
              </div>
              <div className="space-y-1">
                {(() => {
                  const list = celebrationTab === 'birthdays' ? cel.birthdays : cel.anniversaries;
                  return !cel.loading && list.length === 0
                    ? <p className="text-[10px] text-slate-400 py-3">
                        {cel.has_data ? 'Nothing in the next 7 days.' : 'Directory not synced yet.'}
                      </p>
                    : null;
                })()}
                {(celebrationTab === 'birthdays' ? cel.birthdays : cel.anniversaries).slice(0, 4).map((p, i) => (
                  <div key={`${p.name}-${i}`} className="flex items-center gap-3 rounded-xl hover:bg-slate-50 p-1.5 transition-colors">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-black
                                     ${celebrationTab === 'birthdays' ? 'bg-amber-50 text-amber-500' : 'bg-orange-50 text-orange-600'}`}>
                      {p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-bold text-slate-800 truncate">{p.name}</p>
                      {/* An anniversary without the number is just a date. */}
                      {p.years != null && (
                        <p className="text-[9.5px] font-bold text-orange-600">
                          {p.years} {p.years === 1 ? 'year' : 'years'}
                        </p>
                      )}
                    </div>
                    <span className="text-[10.5px] font-bold text-slate-400 flex-shrink-0">{p.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Announcements — real notices from the `noticeboard` app,
                written by HR in Admin Console › Dashboard Content. Sits
                directly under the Birthdays/Anniversaries card. */}
            <div className="ih-reveal rounded-xl bg-white border border-slate-200 shadow-sm p-5" style={{ animationDelay: '90ms' }}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-amber-500" />Announcements
                </h2>
                <button onClick={() => setOpenListPopup('announcements')}
                  className="text-[10px] font-bold text-amber-500 hover:text-amber-600 transition-colors">
                  View all
                </button>
              </div>
              <div className="space-y-3 mt-3">
                {!announcementsLoading && announcements.length === 0 && (
                  <p className="text-[11px] text-slate-400 py-3">
                    Nothing posted yet.
                  </p>
                )}
                {announcements.slice(0, 3).map(a => {
                  const Icon = a.icon;
                  return (
                    <div key={a.id} className="flex items-start gap-3 rounded-xl hover:bg-slate-50 p-1.5 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-slate-800 leading-snug">{a.title}</p>
                        <p className="text-[10.5px] text-slate-400 leading-snug mt-0.5">{a.body}</p>
                        <p className="text-[9.5px] font-bold text-slate-300 mt-1">{a.date}</p>
                      </div>
                    </div>
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