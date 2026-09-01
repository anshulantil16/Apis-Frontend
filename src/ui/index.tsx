/* Shared UI kit for every tool in the intranet.
 *
 * The design system (features/home/DESIGN_SYSTEM.md) describes how a screen
 * should look; this is that description as code, so a tool gets the house
 * style by importing rather than by re-deriving it. Before this existed each
 * page hand-rolled its own cards, stat tiles and pointer handlers, which is why
 * the tools drifted apart visually.
 *
 * Everything here is presentational and dependency-light: `ih-*` motion classes
 * are injected globally by IntranetShell, so these need no CSS import.
 */
import { useEffect, useRef, useState } from 'react';
import type { ComponentType, MouseEvent, ReactNode } from 'react';

/* ── pointer helpers ────────────────────────────────────────────────────────
 * These write CSS custom properties instead of React state, so a card can
 * track the cursor without re-rendering anything.
 *
 * They must never measure inside a mousemove. Calling getBoundingClientRect()
 * on every move and then writing a style is layout thrashing: the write
 * invalidates layout, the next event's read forces the browser to recompute it
 * synchronously, and mousemove fires far more often than once a frame. With
 * these handlers spread across dozens of cards, that alone made hovering and
 * clicking feel like slow motion — the main thread was doing forced layout
 * instead of handling input.
 *
 * So: measure ONCE when the cursor enters an element, cache it, and coalesce
 * the writes into one rAF per frame. A card cannot move or resize while the
 * cursor is inside it without a scroll or resize, and both of those clear the
 * cache below. */

let rects = new WeakMap<HTMLElement, DOMRect>();

function rectOf(el: HTMLElement): DOMRect {
  let r = rects.get(el);
  if (!r) { r = el.getBoundingClientRect(); rects.set(el, r); }
  return r;
}

/* Anything that can move an element out from under its cached rect drops the
   cache. A WeakMap has no clear(), and replacing it is the cheapest way to
   drop every entry at once — the next hover re-measures one element. */
if (typeof window !== 'undefined') {
  const clear = () => { rects = new WeakMap(); };
  window.addEventListener('scroll', clear, { passive: true, capture: true });
  window.addEventListener('resize', clear, { passive: true });
}

/* One write per element per frame, applied in a rAF so a burst of mousemove
   events costs one style flush rather than one per event. */
const pending = new Map<HTMLElement, Record<string, string>>();
let frame = 0;

function write(el: HTMLElement, vars: Record<string, string>) {
  pending.set(el, { ...pending.get(el), ...vars });
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    for (const [node, v] of pending) {
      for (const k in v) node.style.setProperty(k, v[k]);
    }
    pending.clear();
  });
}

/** Drops a cached measurement — call when the cursor leaves. */
function forget(el: HTMLElement) { rects.delete(el); }

/** Cursor-follow glow. Pair with `ih-spotlight`. */
export function onSpotlightMove(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = rectOf(el);
  write(el, { '--mx': `${e.clientX - r.left}px`, '--my': `${e.clientY - r.top}px` });
}

/** 3D tilt toward the cursor. Pair with `ih-tilt3d` (and usually `ih-spotlight`). */
export function onTilt3dMove(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = rectOf(el);
  const px = (e.clientX - r.left) / r.width - 0.5;
  const py = (e.clientY - r.top) / r.height - 0.5;
  write(el, {
    '--ry': `${px * 12}deg`, '--rx': `${-py * 12}deg`,
    '--mx': `${e.clientX - r.left}px`, '--my': `${e.clientY - r.top}px`,
  });
}

export function onTilt3dLeave(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  forget(el);
  write(el, { '--rx': '0deg', '--ry': '0deg' });
}

/** Slight pull toward the cursor. Pair with `ih-magnetic` — good on buttons. */
export function onMagneticMove(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = rectOf(el);
  write(el, { '--mx': `${e.clientX - r.left - r.width / 2}px`,
              '--my': `${e.clientY - r.top - r.height / 2}px` });
}

export function onMagneticLeave(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  forget(el);
  write(el, { '--mx': '0px', '--my': '0px' });
}

/** All four tilt/spotlight handlers as props — spread onto a card. */
export const tiltProps = { onMouseMove: onTilt3dMove, onMouseLeave: onTilt3dLeave };
export const magneticProps = { onMouseMove: onMagneticMove, onMouseLeave: onMagneticLeave };

/* ── hooks ──────────────────────────────────────────────────────────────────*/

/** Counts up to `target` once visible. A static number reads as dead data. */
export function useCountUp(target: number, durationMs = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setValue(target); return; }

    const run = () => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / durationMs);
        // ease-out cubic — fast start, gentle settle
        setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    // Re-run when the target changes, but only start once it's on screen.
    done.current = false;
    const io = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (en.isIntersecting && !done.current) { done.current = true; run(); io.unobserve(en.target); }
      }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [target, durationMs]);

  return { value, ref };
}

/* ── primitives ─────────────────────────────────────────────────────────────*/

type Tone = 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose' | 'sky' | 'indigo' | 'fuchsia' | 'slate';

/* Full literal class strings — Tailwind only detects complete class names, so
   these can never be built by concatenation (see DESIGN_SYSTEM rule 4). */
const TONE: Record<Tone, { soft: string; text: string; grad: string; glow: string; ring: string }> = {
  cyan:    { soft: 'bg-cyan-50',    text: 'text-cyan-600',    grad: 'from-cyan-500 to-blue-600',      glow: 'rgba(6,182,212,.35)',   ring: 'ring-cyan-200' },
  violet:  { soft: 'bg-violet-50',  text: 'text-violet-600',  grad: 'from-violet-500 to-purple-600',  glow: 'rgba(139,92,246,.35)',  ring: 'ring-violet-200' },
  emerald: { soft: 'bg-emerald-50', text: 'text-emerald-600', grad: 'from-emerald-500 to-teal-600',   glow: 'rgba(16,185,129,.35)',  ring: 'ring-emerald-200' },
  amber:   { soft: 'bg-amber-50',   text: 'text-amber-600',   grad: 'from-amber-400 to-orange-500',   glow: 'rgba(245,158,11,.35)',  ring: 'ring-amber-200' },
  rose:    { soft: 'bg-rose-50',    text: 'text-rose-600',    grad: 'from-rose-500 to-pink-600',      glow: 'rgba(244,63,94,.35)',   ring: 'ring-rose-200' },
  sky:     { soft: 'bg-sky-50',     text: 'text-sky-600',     grad: 'from-sky-500 to-cyan-600',       glow: 'rgba(14,165,233,.35)',  ring: 'ring-sky-200' },
  indigo:  { soft: 'bg-indigo-50',  text: 'text-indigo-600',  grad: 'from-indigo-500 to-violet-600',  glow: 'rgba(99,102,241,.35)',  ring: 'ring-indigo-200' },
  fuchsia: { soft: 'bg-fuchsia-50', text: 'text-fuchsia-600', grad: 'from-fuchsia-500 to-purple-600', glow: 'rgba(217,70,239,.35)',  ring: 'ring-fuchsia-200' },
  slate:   { soft: 'bg-slate-100',  text: 'text-slate-600',   grad: 'from-slate-500 to-slate-700',    glow: 'rgba(100,116,139,.30)', ring: 'ring-slate-200' },
};
export const tone = (t: Tone = 'cyan') => TONE[t];

/** Standard card: reveals on scroll, tilts and glows on hover. */
export function Card({ children, className = '', tone: t = 'cyan', interactive = true, glass = false }: {
  children: ReactNode; className?: string; tone?: Tone; interactive?: boolean; glass?: boolean;
}) {
  const c = TONE[t];
  const base = glass
    ? 'ih-glass rounded-2xl'
    : 'rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm';
  return (
    <div
      {...(interactive ? tiltProps : {})}
      style={interactive ? ({ ['--ih-neon' as string]: c.glow, ['--ih-lift' as string]: c.glow }) : undefined}
      className={`ih-inview ${base} ${interactive ? 'ih-tilt3d ih-spotlight ih-neon' : ''} ${className}`}>
      {children}
    </div>
  );
}

/** Small square icon badge used at the top-left of cards and rows. */
export function IconChip({ icon: Icon, tone: t = 'cyan', size = 'md', live = false, float = false }: {
  icon: ComponentType<{ className?: string }>; tone?: Tone;
  size?: 'sm' | 'md' | 'lg'; live?: boolean; float?: boolean;
}) {
  const c = TONE[t];
  const box = size === 'sm' ? 'w-8 h-8 rounded-lg' : size === 'lg' ? 'w-12 h-12 rounded-2xl' : 'w-9 h-9 rounded-xl';
  const ico = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-[18px] h-[18px]';
  return (
    <span style={live ? ({ ['--ih-orbit' as string]: c.glow }) : undefined}
      className={`${box} ${c.soft} ${live ? 'ih-orbit' : ''} ${float ? 'ih-float' : ''} flex items-center justify-center shrink-0`}>
      <Icon className={`${ico} ${c.text}`} />
    </span>
  );
}

/** Headline number with a label. Counts up when scrolled into view. */
export function StatTile({ label, value, icon, tone: t = 'cyan', suffix = '', prefix = '', hint }: {
  label: string; value: number; icon?: ComponentType<{ className?: string }>;
  tone?: Tone; suffix?: string; prefix?: string; hint?: string;
}) {
  const c = TONE[t];
  const { value: n, ref } = useCountUp(value);
  return (
    <div {...tiltProps} style={{ ['--ih-neon' as string]: c.glow }}
      className="ih-inview ih-tilt3d ih-spotlight ih-neon ih-sweep relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest truncate">{label}</p>
          <p className="text-2xl font-black text-slate-900 leading-tight mt-1">
            {prefix}<span ref={ref}>{n.toLocaleString('en-IN')}</span>{suffix}
          </p>
          {hint && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{hint}</p>}
        </div>
        {icon && <IconChip icon={icon} tone={t} />}
      </div>
    </div>
  );
}

/** Page-top hero band. One per screen — it carries the animated border. */
export function PageHero({ title, subtitle, icon, tone: t = 'cyan', children, badge }: {
  title: string; subtitle?: string; icon?: ComponentType<{ className?: string }>;
  tone?: Tone; children?: ReactNode; badge?: ReactNode;
}) {
  const c = TONE[t];
  return (
    <div className={`ih-sweep relative overflow-hidden rounded-2xl bg-gradient-to-r ${c.grad} p-5 sm:p-6 text-white shadow-lg`}
      style={{ boxShadow: `0 18px 44px -20px ${c.glow}` }}>
      {/* decorative wash — behind the content, never under text directly */}
      <div className="ih-drift absolute -right-10 -top-16 w-56 h-56 rounded-full bg-white/10 pointer-events-none" />
      <div className="ih-aurora absolute -left-16 -bottom-20 w-56 h-56 rounded-full bg-white/10 pointer-events-none" />
      <div className="relative flex items-start gap-4 flex-wrap">
        {icon && (
          <span className="ih-float w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
            {(() => { const I = icon; return <I className="w-6 h-6 text-white" />; })()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-black leading-tight">{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="text-white/80 text-sm mt-0.5">{subtitle}</p>}
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </div>
  );
}

/** Small caps heading used above a group of cards. */
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-2">
      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{children}</h3>
      {right}
    </div>
  );
}

/** Primary action. Magnetic pull plus a light sweep on hover. */
export function Button({ children, tone: t = 'cyan', variant = 'primary', className = '', ...rest }: {
  children: ReactNode; tone?: Tone; variant?: 'primary' | 'secondary' | 'ghost'; className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const c = TONE[t];
  const cls = variant === 'primary'
    ? `ih-sheen ih-magnetic bg-gradient-to-r ${c.grad} text-white shadow-lg`
    : variant === 'secondary'
      ? 'bg-white border border-slate-200 text-slate-600 font-bold hover:border-cyan-300 hover:text-cyan-700'
      : 'text-slate-500 hover:text-slate-800';
  return (
    <button {...(variant === 'primary' ? magneticProps : {})} {...rest}
      style={variant === 'primary' ? { boxShadow: `0 10px 26px -12px ${c.glow}` } : undefined}
      className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2 ${cls} ${className}`}>
      {children}
    </button>
  );
}

/** Status pill. */
export function Pill({ children, tone: t = 'slate' }: { children: ReactNode; tone?: Tone }) {
  const c = TONE[t];
  return <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${c.soft} ${c.text}`}>{children}</span>;
}

/** Shown where a list has nothing in it — never leave a blank region. */
export function EmptyState({ icon: Icon, title, hint, action, tone: t = 'slate' }: {
  icon: ComponentType<{ className?: string }>; title: string; hint?: string;
  action?: ReactNode; tone?: Tone;
}) {
  const c = TONE[t];
  return (
    <div className="ih-fade flex flex-col items-center justify-center text-center py-12 px-6">
      <span className={`ih-float w-14 h-14 rounded-2xl ${c.soft} flex items-center justify-center mb-3`}>
        <Icon className={`w-7 h-7 ${c.text}`} />
      </span>
      <p className="font-black text-slate-700 text-sm">{title}</p>
      {hint && <p className="text-xs text-slate-400 mt-1 max-w-sm">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Placeholder rows while data loads — shows the shape of what's coming. */
export function Skeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="ih-skeleton h-12" style={{ animationDelay: `${i * 90}ms` }} />
      ))}
    </div>
  );
}

/** Animated tab strip. */
export function Tabs<T extends string>({ tabs, active, onChange, tone: t = 'cyan' }: {
  tabs: { k: T; label: string; icon?: ComponentType<{ className?: string }> }[];
  active: T; onChange: (k: T) => void; tone?: Tone;
}) {
  const c = TONE[t];
  return (
    <div className="flex gap-1 flex-wrap">
      {tabs.map(tb => {
        const on = tb.k === active;
        return (
          <button key={tb.k} onClick={() => onChange(tb.k)} data-active={on}
            className={`ih-underline relative px-3.5 py-2 rounded-xl text-xs font-black transition-all inline-flex items-center gap-1.5
              ${on ? `${c.soft} ${c.text}` : 'text-slate-400 hover:text-slate-600'}`}>
            {tb.icon && (() => { const I = tb.icon; return <I className="w-3.5 h-3.5" />; })()}
            {tb.label}
          </button>
        );
      })}
    </div>
  );
}
