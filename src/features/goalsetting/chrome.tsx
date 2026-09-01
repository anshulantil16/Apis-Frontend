/* The product's visual furniture, in one place.
 *
 * These are the pieces that repeat across every Goal Setting screen — the
 * ambient wash, the stat tile, the section card, the weightage ring. Building
 * them once means the four seats look like one product rather than four
 * screens that happen to share a colour.
 *
 * Motion comes from the intranet's `ih-*` classes, which IntranetShell injects
 * globally, so nothing here imports CSS. Where a mousemove is involved it uses
 * the shared pointer handlers from src/ui — they measure once per hover and
 * batch their writes, unlike a hand-rolled handler which forces a synchronous
 * layout on every mouse event.
 */
import { useEffect, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { onTilt3dMove, onTilt3dLeave } from '../../ui';

/* Ambient background. Three slow blurred washes, the same technique the home
   dashboard uses — enough to give the page depth, few enough that the
   compositor is not re-rasterising half a screen of blur every frame. */
export function Ambient() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="ih-aurora absolute -top-40 -left-40 w-[38rem] h-[38rem] rounded-full bg-amber-300/25 blur-[130px]" />
      <div className="ih-aurora absolute top-1/3 -right-40 w-[32rem] h-[32rem] rounded-full bg-violet-300/20 blur-[130px]"
        style={{ animationDelay: '6s' }} />
      <div className="ih-drift absolute -bottom-40 left-1/4 w-[30rem] h-[30rem] rounded-full bg-cyan-300/20 blur-[130px]"
        style={{ animationDelay: '12s' }} />
    </div>
  );
}

/* Counts up to a number once, on mount.
 *
 * Respects the OS reduce-motion setting rather than animating regardless: a
 * number ticking upward is exactly the kind of movement that makes some people
 * ill, and it carries no information the final value does not. */
export function useCountUp(target: number, ms = 900) {
  const [n, setN] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) { setN(target); return; }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !target) { setN(target); done.current = true; return; }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / ms, 1);
      // ease-out: fast to begin, settling into the real figure
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
      else done.current = true;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return n;
}

export interface TileProps {
  label: string;
  value: number | string;
  sub?: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: 'slate' | 'amber' | 'emerald' | 'rose' | 'violet' | 'sky';
  onClick?: () => void;
  delay?: number;
}

const TONES = {
  slate:   { text: 'text-slate-800',   ring: 'rgba(100,116,139,.5)',  soft: 'bg-slate-50',   icon: 'text-slate-400' },
  amber:   { text: 'text-amber-600',   ring: 'rgba(245,158,11,.55)',  soft: 'bg-amber-50',   icon: 'text-amber-500' },
  emerald: { text: 'text-emerald-600', ring: 'rgba(16,185,129,.55)',  soft: 'bg-emerald-50', icon: 'text-emerald-500' },
  rose:    { text: 'text-rose-600',    ring: 'rgba(244,63,94,.55)',   soft: 'bg-rose-50',    icon: 'text-rose-500' },
  violet:  { text: 'text-violet-600',  ring: 'rgba(139,92,246,.55)',  soft: 'bg-violet-50',  icon: 'text-violet-500' },
  sky:     { text: 'text-sky-600',     ring: 'rgba(14,165,233,.55)',  soft: 'bg-sky-50',     icon: 'text-sky-500' },
};

/** A headline number. Tilts toward the cursor, lights its edge, and counts up. */
export function Tile({ label, value, sub, icon: Icon, tone = 'slate', onClick, delay = 0 }: TileProps) {
  const t = TONES[tone];
  const numeric = typeof value === 'number';
  const shown = useCountUp(numeric ? value : 0);
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick ? { onClick, type: 'button' as const } : {})}
      onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
      style={{ transitionDelay: `${delay}ms`, ['--ih-neon' as string]: t.ring }}
      className={`ih-inview ih-tilt3d ih-spotlight ih-neon ih-sheen relative overflow-hidden
        rounded-2xl bg-white border border-slate-200 px-4 py-3.5 shadow-sm text-left w-full
        ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <span className={`w-9 h-9 rounded-xl ${t.soft} flex items-center justify-center shrink-0`}>
            <Icon className={`w-4.5 h-4.5 ${t.icon}`} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
            {label}
          </p>
          <p className={`text-2xl font-black leading-none mt-1 tabular-nums ${t.text}`}>
            {numeric ? shown : value}
          </p>
          {sub && (
            <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate">{sub}</p>
          )}
        </div>
      </div>
    </Tag>
  );
}

/** A section of the page. Reveals on scroll and lifts a little on hover. */
export function Panel({ children, className = '', delay = 0, hover = false }: {
  children: ReactNode; className?: string; delay?: number; hover?: boolean;
}) {
  return (
    <section
      style={{ transitionDelay: `${delay}ms` }}
      className={`ih-inview ${hover ? 'ih-tilt' : ''} relative bg-white border border-slate-200
        rounded-2xl shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

/** Section heading with an icon plate and a one-line explanation. */
export function PanelHead({ icon: Icon, title, sub, right, tone = 'slate' }: {
  icon: ComponentType<{ className?: string }>; title: string; sub?: string;
  right?: ReactNode; tone?: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100">
      <span className={`ih-float w-9 h-9 rounded-xl ${t.soft} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4.5 h-4.5 ${t.icon}`} />
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-slate-800 text-sm leading-tight">{title}</h3>
        {sub && <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* The weightage ring.
 *
 * A dial rather than a bar because this is the one number that must be exactly
 * 100 — a circle has an obvious "full", where a bar's right-hand edge is just
 * wherever the container ends. Over 100 the ring turns and the overshoot is
 * stated in words, since a full circle cannot show 115% by length.
 *
 * One hue for the measure, with the reserved status colours only for the two
 * states that genuinely are statuses: complete, and over.
 */
export function WeightRing({ total, size = 74 }: { total: number; size?: number }) {
  const shown = useCountUp(Math.round(total), 700);
  const ok = total === 100;
  const over = total > 100;
  const r = (size - 9) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(total, 100)) / 100;
  const colour = ok ? '#059669' : over ? '#e11d48' : '#f59e0b';

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f7" strokeWidth={7} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colour} strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1), stroke .3s' }}
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[15px] font-black tabular-nums leading-none"
            style={{ color: colour }}>{shown}%</span>
        </span>
        {ok && (
          <span className="ih-pulse-glow absolute inset-0 rounded-full pointer-events-none"
            style={{ boxShadow: '0 0 22px -4px rgba(5,150,105,.55)' }} aria-hidden />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Total weightage
        </p>
        <p className={`text-[11px] font-bold mt-0.5 ${
          ok ? 'text-emerald-600' : over ? 'text-rose-600' : 'text-amber-600'}`}>
          {ok ? 'Adds up exactly'
              : over ? `${Math.round(total - 100)}% over — reduce it`
              : `${Math.round(100 - total)}% still to allocate`}
        </p>
      </div>
    </div>
  );
}

/* Page hero. A dark slab with its own drifting light, which is what separates
   a tool's own screen from the pale dashboard chrome around it. */
export function Hero({ icon: Icon, eyebrow, title, sub, right }: {
  icon: ComponentType<{ className?: string }>;
  eyebrow?: string; title: string; sub?: string; right?: ReactNode;
}) {
  return (
    <div className="ih-inview relative overflow-hidden rounded-2xl bg-[#1a1410] px-6 py-5 shadow-lg">
      <div className="ih-drift pointer-events-none absolute -right-24 top-1/2 -translate-y-1/2 w-[34rem] h-[34rem] rounded-full bg-amber-500/25 blur-[110px]" aria-hidden />
      <div className="ih-aurora pointer-events-none absolute -left-20 -bottom-24 w-[22rem] h-[22rem] rounded-full bg-orange-500/15 blur-[110px]" aria-hidden />

      <div className="relative flex flex-wrap items-center gap-4">
        <span className="ih-float ih-halo w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25"
          style={{ ['--ih-halo' as string]: 'rgba(245,158,11,.45)' }}>
          <Icon className="w-6 h-6 text-white" />
        </span>
        <div className="flex-1 min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-black text-amber-300/80 uppercase tracking-[0.2em] mb-0.5">
              {eyebrow}
            </p>
          )}
          <h1 className="ih-grad-text text-xl sm:text-2xl font-black leading-tight truncate">
            {title}
          </h1>
          {sub && <p className="text-[12px] text-amber-100/60 font-semibold mt-0.5 truncate">{sub}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}

/* Rising motes. Purely decorative, and cheap: a handful of composited spans
   on their own transform loop, not a canvas or a rAF in JavaScript. */
export function Motes({ count = 14 }: { count?: number }) {
  const pts = useRef<{ l: number; s: number; d: number; dur: number; o: number }[] | null>(null);
  if (!pts.current) {
    pts.current = Array.from({ length: count }, () => ({
      l: Math.random() * 100,
      s: 2 + Math.random() * 3,
      d: Math.random() * 14,
      dur: 16 + Math.random() * 16,
      o: 0.15 + Math.random() * 0.3,
    }));
  }
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pts.current.map((p, i) => (
        <span key={i} className="ih-particle absolute rounded-full bg-amber-400"
          style={{
            left: `${p.l}%`, bottom: '-5%', width: p.s, height: p.s, opacity: p.o,
            animationDuration: `${p.dur}s`, animationDelay: `${p.d}s`,
            boxShadow: '0 0 8px rgba(245,158,11,.5)',
          }} />
      ))}
    </div>
  );
}
