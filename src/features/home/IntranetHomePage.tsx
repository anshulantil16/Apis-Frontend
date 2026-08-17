import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  ArrowRight, LayoutGrid, Sparkles, Clock, Link2, Quote, Building2, History, Command, Lightbulb,
  MoreHorizontal, ArrowUpRight, Minus, CalendarDays,
} from 'lucide-react';
import {
  QUICK_ACCESS, COMING_SOON, WHATS_NEW, PLATFORM_STATS, LEADERSHIP_NOTE, OUR_PRODUCTS,
  APIS_GLANCE, COMPANY_MILESTONES, SOCIAL_LINKS, HOLIDAYS_2026, getRecentTools,
  type QuickAccessId,
} from './IntranetHomeShared';

const HOLIDAY_COLOURS = ['text-rose-500 bg-rose-50', 'text-amber-500 bg-amber-50', 'text-violet-500 bg-violet-50', 'text-emerald-500 bg-emerald-50', 'text-sky-500 bg-sky-50'];

/* Rotates through real facts (milestones + verified company stats) — pure
   motion/discovery filler for the rail, no invented content. */
const DID_YOU_KNOW = [
  ...COMPANY_MILESTONES.map(m => `${m.label} — ${m.body}`),
  ...APIS_GLANCE.map(s => `${s.label}: ${s.value} (${s.sub})`),
];

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

function useGreeting() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(iv);
  }, []);
  const h = now.getHours();
  const label = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  return { label, time, date };
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

/* Product photos are real APIS India Limited product images, sourced from
   apisindia.com's own public site — not fabricated. Slides without a
   `product` fall back to the dashboard illustration background. */
const HERO_SLIDES = [
  {
    kicker: 'APIS INDIA LIMITED',
    title: 'Nourishing Lives,\nNaturally.',
    body: 'Pure honey, dates, jams, pickles, cereals & vermicelli — APIS India Limited has been trusted since 1924.',
    product: '/products/organic-honey.png',
    tint: 'from-amber-950/90 via-amber-900/70 to-transparent',
  },
  {
    kicker: 'Organic Honey',
    title: 'Sourced from the\nKashmir Valley.',
    body: 'Organic-certified, pure and natural — the honey that started it all, tested and filtered to BRCGS Grade A standards.',
    product: '/products/organic-honey.png',
    tint: 'from-orange-950/90 via-orange-900/70 to-transparent',
  },
  {
    kicker: 'Premium Dates',
    title: 'Naturally sweet,\nnaturally APIS.',
    body: 'Premium and dry dates, hand-picked and packed for freshness — part of a range that also spans jams, pickles and preserves.',
    product: '/products/fruit.png',
    tint: 'from-rose-950/90 via-rose-900/70 to-transparent',
  },
  {
    kicker: 'APIS Internal Tools',
    title: 'Everything your team needs,\non one screen.',
    body: 'PMS, appraisals, letters, room bookings, sales intelligence and more — nine tools, one platform, built in-house for APIS India.',
  },
  {
    kicker: 'New · AdminPulse',
    title: 'Book a room or request\nsupplies in seconds.',
    body: 'Live room status, item requests for stationery & equipment, and an approvals queue admins can clear from one screen.',
  },
];

export function IntranetHomePage({ onNavigate }: IntranetHomePageProps) {
  const [slide, setSlide] = useState(0);
  const greeting = useGreeting();
  const recentIds = useMemo(() => getRecentTools(), []);
  const recentTools = recentIds
    .map(id => QUICK_ACCESS.find(t => t.id === id))
    .filter((t): t is typeof QUICK_ACCESS[number] => !!t);

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

  const [factIndex, setFactIndex] = useState(0);
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
    const iv = setInterval(() => setSlide(s => (s + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    const iv = setInterval(() => setFactIndex(i => (i + 1) % DID_YOU_KNOW.length), 5000);
    return () => clearInterval(iv);
  }, []);

  // Search lives in the shell header now, so the hub always lists every tool.
  const filtered = QUICK_ACCESS;

  return (
    <>
        {/* Ambient aurora wash behind the whole dashboard — the page is never
            completely static, even when nothing is loading or hovered. */}
        <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="ih-aurora absolute -top-40 -left-40 w-[38rem] h-[38rem] rounded-full bg-cyan-300/25 blur-[130px]" />
          <div className="ih-aurora absolute top-1/3 -right-40 w-[34rem] h-[34rem] rounded-full bg-violet-300/25 blur-[130px]" style={{ animationDelay: '6s' }} />
          <div className="ih-aurora absolute -bottom-40 left-1/3 w-[30rem] h-[30rem] rounded-full bg-amber-300/20 blur-[130px]" style={{ animationDelay: '12s' }} />
        </div>

        <div className="relative max-w-[1600px] mx-auto px-7 py-6 flex gap-6 items-start">
          {/* ── Center column ──────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Live greeting — a tiny personal touch, no fabricated identity */}
            <div className="ih-fade flex items-center justify-between flex-wrap gap-2">
              <p className="ih-grad-text text-2xl font-black bg-gradient-to-r from-slate-900 via-cyan-600 to-violet-600">
                {greeting.label}
              </p>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                <Clock className="w-3.5 h-3.5 ih-spin-slow" />
                {greeting.date} · <span className="tabular-nums text-slate-600">{greeting.time}</span>
              </div>
            </div>

            {/* Hero carousel — product slides use real APIS India product photography
                (sourced from apisindia.com), tool slides use the dashboard illustration */}
            <div className="relative rounded-[28px] overflow-hidden ih-reveal" style={{ minHeight: 240 }}>
              {HERO_SLIDES.map((s, i) => (
                <div key={i} className={`absolute inset-0 transition-opacity duration-700 ${i === slide ? 'opacity-100 z-[1]' : 'opacity-0 pointer-events-none'}`}>
                  {s.product ? (
                    <>
                      <div className="absolute inset-0 bg-slate-950" />
                      <div className="ih-drift absolute -right-10 top-1/2 -translate-y-1/2 w-[60%] h-[85%] opacity-90">
                        <img src={s.product} alt="" className="w-full h-full object-contain drop-shadow-2xl" />
                      </div>
                      <div className={`absolute inset-0 bg-gradient-to-r ${s.tint} to-90%`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    </>
                  ) : (
                    <>
                      <div className="ih-drift absolute inset-0">
                        <img src="/dashboard-bg.png" alt="" className="w-full h-full object-cover scale-125" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/75 to-cyan-950/80" />
                    </>
                  )}
                </div>
              ))}
              <Particles />
              <div className="absolute inset-0 opacity-[0.06] z-[1]"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)',
                         backgroundSize: '44px 44px' }} />

              <div className="relative z-10 p-8 md:p-10 flex flex-col justify-center min-h-[240px] max-w-2xl">
                {HERO_SLIDES.map((s, i) => (
                  <div key={i} className={i === slide ? 'block' : 'hidden'}>
                    <div className="ih-fade">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md
                                       ring-1 ring-white/20 text-[10px] font-black uppercase tracking-widest text-amber-300 mb-3">
                        <Sparkles className="w-3 h-3" />{s.kicker}
                      </span>
                      <h1 className="text-2xl md:text-3xl font-black text-white leading-[1.15] mb-2.5 whitespace-pre-line">
                        {s.title}
                      </h1>
                      <p className="text-slate-300 text-[13px] leading-relaxed max-w-lg mb-5">{s.body}</p>
                    </div>
                    <button onClick={() => onNavigate(QUICK_ACCESS[0].id)}
                      className="ih-sheen group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900
                                 font-black text-sm shadow-xl transition-all hover:-translate-y-0.5">
                      Explore Tools
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="absolute bottom-5 left-8 md:left-10 flex items-center gap-2 z-10">
                {HERO_SLIDES.map((_, i) => (
                  <button key={i} onClick={() => setSlide(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? 'w-8 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/50'}`} />
                ))}
              </div>
            </div>

            {/* Live ticker — always-moving strip of real platform updates.
                Duplicated once so the -50% marquee loop is seamless. */}
            <div className="ih-ticker-track relative overflow-hidden rounded-2xl bg-slate-900 py-2.5">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-slate-900 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-slate-900 to-transparent" />
              <div className="ih-ticker flex w-max items-center gap-8">
                {[...WHATS_NEW, ...WHATS_NEW].map((n, i) => (
                  <span key={i} className="flex items-center gap-2.5 whitespace-nowrap">
                    <span className={`w-1.5 h-1.5 rounded-full ${n.dot} ih-pulse-glow flex-shrink-0`} />
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">{n.tag}</span>
                    <span className="text-[12.5px] font-semibold text-slate-200">{n.title}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Quick access — flat tile launcher, like a real intranet's app grid */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Quick Access</h2>
                <button className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700">Customize</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2.5">
                {QUICK_ACCESS.map((t, i) => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => onNavigate(t.id)}
                      onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
                      className="ih-inview ih-tilt3d ih-spotlight ih-neon group relative flex flex-col items-center justify-center gap-2
                                 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200 py-4 px-2 shadow-sm
                                 overflow-hidden"
                      style={{ transitionDelay: `${i * 35}ms`, '--ih-neon': t.glow } as any}>
                      <div className={`w-9 h-9 rounded-xl ${t.soft} flex items-center justify-center
                                       transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                        <Icon className={`w-4.5 h-4.5 ${t.accent}`} />
                      </div>
                      <p className="relative text-[10px] font-bold text-slate-600 text-center leading-tight group-hover:text-slate-900">
                        {t.label}
                      </p>
                    </button>
                  );
                })}
                <a href="#all-tools" onMouseMove={onSpotlightMove}
                  className="ih-reveal ih-tilt ih-spotlight group relative flex flex-col items-center justify-center gap-2
                             rounded-2xl bg-slate-50 border border-dashed border-slate-300 py-4 px-2
                             hover:bg-white hover:border-slate-400 transition-all duration-300 overflow-hidden"
                  style={{ animationDelay: `${QUICK_ACCESS.length * 35}ms` }}>
                  <div className="w-9 h-9 rounded-xl bg-white ring-1 ring-slate-200 flex items-center justify-center
                                  transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90">
                    <MoreHorizontal className="w-4.5 h-4.5 text-slate-400" />
                  </div>
                  <p className="relative text-[10px] font-bold text-slate-500 text-center leading-tight group-hover:text-slate-800">More</p>
                </a>
              </div>
            </section>

            {/* Recently visited — real, derived from this browser's own history */}
            {recentTools.length > 0 && (
              <section>
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-cyan-600" />Recently Visited
                </h2>
                <div className="flex flex-wrap gap-3">
                  {recentTools.map((t, i) => {
                    const Icon = t.icon;
                    return (
                      <button key={t.id} onClick={() => onNavigate(t.id)}
                        className="ih-reveal ih-tilt ih-sheen flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-full
                                   bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                        style={{ animationDelay: `${i * 60}ms` }}>
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-[12px] font-bold text-slate-700">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Our Products — real APIS India Limited product photography */}
            <section id="our-products" className="scroll-mt-20">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />Our Products
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {OUR_PRODUCTS.map((p, i) => (
                  <div key={p.label}
                    className="ih-inview ih-tilt3d ih-sweep relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-950 to-slate-900 p-5 flex items-center gap-4 shadow-sm"
                    style={{ animationDelay: `${i * 80}ms` }}>
                    <img src={p.image} alt={p.label} className="w-20 h-20 object-contain drop-shadow-xl flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white font-black text-sm">{p.label}</p>
                      <p className="text-amber-200/70 text-[12px] mt-1 leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Leadership note + What's new */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="ih-reveal rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 flex flex-col justify-between min-h-[220px]">
                <div>
                  <Quote className="w-7 h-7 text-cyan-400/50 mb-3" />
                  <p className="text-white text-[15px] font-bold leading-relaxed">{LEADERSHIP_NOTE.body}</p>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-4">
                  {LEADERSHIP_NOTE.heading}
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-600" />What's New
                  </h2>
                  <Clock className="w-3.5 h-3.5 text-slate-300" />
                </div>
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {WHATS_NEW.map((n, i) => (
                    <div key={i} className="ih-reveal ih-tilt flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3 hover:bg-white hover:shadow-sm transition-all"
                      style={{ animationDelay: `${i * 80}ms` }}>
                      <div className={`w-1.5 self-stretch rounded-full bg-gradient-to-b ${n.bar} flex-shrink-0`} />
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
            </section>

            {/* APIS at a glance — real, publicly-reported figures (BSE: 506166) */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">APIS at a Glance</h2>
                <span className="text-[10px] font-bold text-slate-300">Public filings · FY 2025-26</span>
              </div>
              <div ref={statsRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {APIS_GLANCE.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
                      className="ih-inview ih-tilt3d ih-spotlight ih-sweep relative rounded-2xl bg-white/80 backdrop-blur-xl
                                 border border-slate-200 p-4 shadow-sm overflow-hidden text-center"
                      style={{ transitionDelay: `${i * 60}ms` }}>
                      <div className={`ih-float mx-auto w-11 h-11 rounded-full ${s.soft} ring-4 ${s.ring} flex items-center justify-center mb-2.5`}
                        style={{ animationDelay: `${i * 300}ms` }}>
                        <Icon className={`w-5 h-5 ${s.accent}`} />
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

            {/* Company milestones — a small honest timeline, same real sourcing */}
            <section>
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Milestones</h2>
              <div className="relative pl-5 space-y-5 before:absolute before:left-[7px] before:top-1 before:bottom-1
                              before:w-px before:bg-gradient-to-b before:from-amber-400 before:via-slate-200 before:to-transparent">
                {COMPANY_MILESTONES.map((m, i) => (
                  <div key={i} className="ih-reveal relative" style={{ animationDelay: `${i * 70}ms` }}>
                    <span className="absolute -left-5 top-1 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">{m.year}</p>
                    <p className="text-[13px] font-bold text-slate-800">{m.label}</p>
                    <p className="text-[12px] text-slate-400 leading-relaxed">{m.body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Platform meta note — kept small and separate from the real company stats above */}
            <section>
              <div className="ih-reveal relative overflow-hidden flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl
                              bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 text-white px-5 py-4">
                <div className="ih-drift pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-cyan-500/10 blur-3xl" />
                {PLATFORM_STATS.map(s => (
                  <div key={s.label} className="relative flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${(s as any).dot} ih-pulse-glow flex-shrink-0`} />
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-black tabular-nums">{(s as any).display ?? `${s.value}${s.suffix || ''}`}</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{s.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Explore all tools — the fuller descriptive cards */}
            <section id="all-tools" className="scroll-mt-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-cyan-600" />Explore All Tools
                </h2>
              </div>
              {(
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((t, i) => {
                    const Icon = t.icon;
                    return (
                      <button key={t.id} onClick={() => onNavigate(t.id)} onMouseMove={onSpotlightMove}
                        className="ih-inview ih-tilt3d ih-spotlight ih-neon group relative text-left rounded-2xl bg-white/80 backdrop-blur-xl border
                                   border-slate-200 p-5 shadow-sm overflow-hidden"
                        style={{ transitionDelay: `${i * 50}ms`, '--ih-neon': t.glow } as any}>
                        <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full
                                        opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
                          style={{ background: t.glow }} />
                        <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center
                                         justify-center shadow-lg mb-3 transition-transform duration-300
                                         group-hover:scale-110 group-hover:-rotate-6`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="relative text-[14px] font-black text-slate-900">{t.label}</p>
                        <p className="relative text-[12px] text-slate-400 mt-1 leading-relaxed">{t.desc}</p>
                        <div className="relative flex items-center gap-1 mt-3 text-[11px] font-black text-cyan-600
                                        opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          Open <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ── Right rail ──────────────────────────────────────────────────── */}
          <aside className="hidden xl:block w-72 flex-shrink-0 sticky top-[68px] space-y-5">
            {/* Holidays — India's real central-government gazetted list for 2026,
                sourced publicly (not APIS's specific internal calendar, which
                hasn't been provided — see the data file for the honest caveat) */}
            {upcomingHolidays.length > 0 && (
              <div className="ih-reveal relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
                <div className="ih-drift pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full bg-rose-400/10 blur-2xl" />
                <h2 className="relative text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-rose-500" />Upcoming Holidays
                </h2>
                <div className="relative space-y-2">
                  {upcomingHolidays.map((h, i) => {
                    const c = HOLIDAY_COLOURS[i % HOLIDAY_COLOURS.length];
                    return (
                      <div key={h.name} className="ih-reveal ih-tilt flex items-center gap-3 rounded-xl hover:bg-slate-50 p-1.5 transition-colors"
                        style={{ animationDelay: `${i * 50}ms` }}>
                        <div className={`w-10 h-10 rounded-xl ${c.split(' ')[1]} flex flex-col items-center justify-center flex-shrink-0`}>
                          <span className={`text-[13px] font-black leading-none ${c.split(' ')[0]}`}>{h.date.getDate()}</span>
                          <span className="text-[8px] font-bold uppercase text-slate-400 leading-none mt-0.5">
                            {h.date.toLocaleDateString(undefined, { month: 'short' })}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-bold text-slate-800 truncate">
                            {h.name}{h.tentative && <span className="text-slate-400 font-semibold">*</span>}
                          </p>
                          <p className="text-[10.5px] text-slate-400">
                            {h.daysAway === 0 ? 'Today' : h.daysAway === 1 ? 'Tomorrow' : `In ${h.daysAway} days`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {upcomingHolidays.some(h => h.tentative) && (
                  <p className="relative text-[9.5px] text-slate-300 mt-3">*Date provisional, pending official confirmation</p>
                )}
              </div>
            )}

            <div className="ih-reveal rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-cyan-600" />Quick Links
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_ACCESS.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => onNavigate(t.id)}
                      className="ih-tilt flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-slate-50 transition-all">
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${t.gradient} flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-[9px] font-bold text-slate-500 text-center leading-tight">{t.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ih-reveal rounded-2xl bg-white border border-slate-200 shadow-sm p-5" style={{ animationDelay: '80ms' }}>
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Coming Soon</h2>
              <div className="space-y-1.5">
                {COMING_SOON.map(c => {
                  const CIcon = c.icon;
                  return (
                    <div key={c.label} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                      <span className="flex items-center gap-2.5 text-[12px] font-semibold">
                        <span className={`w-6 h-6 rounded-lg ${c.soft} flex items-center justify-center flex-shrink-0`}>
                          <CIcon className={`w-3.5 h-3.5 ${c.accent}`} />
                        </span>
                        {c.label}
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">Soon</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Did You Know — rotates through real facts, no invented content */}
            <div className="ih-reveal ih-border-flow relative rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800
                            p-5 overflow-hidden" style={{ animationDelay: '140ms' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <h2 className="text-[11px] font-black text-amber-300 uppercase tracking-widest">Did You Know</h2>
              </div>
              <div key={factIndex} className="ih-fade min-h-[54px]">
                <p className="text-[12.5px] text-slate-200 leading-relaxed">{DID_YOU_KNOW[factIndex]}</p>
              </div>
              <div className="flex items-center gap-1 mt-4">
                {DID_YOU_KNOW.map((_, i) => (
                  <span key={i} className={`h-1 rounded-full transition-all duration-300 ${i === factIndex ? 'w-5 bg-amber-400' : 'w-1 bg-white/20'}`} />
                ))}
              </div>
            </div>

            {/* Stay Connected — compact version of the main-content strip */}
            <div className="ih-reveal rounded-2xl bg-white border border-slate-200 shadow-sm p-5" style={{ animationDelay: '180ms' }}>
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

            {/* Keyboard shortcut hint — surfaces the ⌘K palette for discoverability */}
            <div className="ih-reveal flex items-center gap-3 rounded-2xl bg-white border border-slate-200 shadow-sm p-4"
              style={{ animationDelay: '220ms' }}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center
                              justify-center flex-shrink-0 ih-pulse-glow">
                <Command className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-slate-700">Press ⌘K anywhere</p>
                <p className="text-[10.5px] text-slate-400">Jump to any tool instantly</p>
              </div>
            </div>
          </aside>
        </div>

        <footer className="border-t border-slate-200 py-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            APIS India Limited · Internal Tools Platform
          </p>
        </footer>
    </>
  );
}

export default IntranetHomePage;
