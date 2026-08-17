import { useState, useEffect, type MouseEvent } from 'react';
import {
  FileText, FileWarning, ArrowLeft, ArrowRight, BarChart3,
  Mail, CheckCircle2, Sparkles, Layers,
} from 'lucide-react';
import { OfferLetterSimplePage } from './OfferLetterSimplePage';
import { WarningLetterPage } from './WarningLetterPage';
import { TOOL_STYLES } from '../../Components/toolStyles';

/* ── ih-* motion helpers ──────────────────────────────────────────────────
   Mirrors of the helpers in features/home/IntranetHomePage.tsx. They are not
   exported there, so each page keeps its own copy; the `ih-*` CSS they drive
   is injected globally by IntranetShell. Writing to CSS vars instead of React
   state keeps the cursor tracking at zero re-renders. */
function onSpotlightMove(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}
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

const _API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PMS_API = `${_API_BASE}/api/pms`;

type LetterKind = 'appraisal' | 'warning';

/* Add a new letter type by appending one entry here plus its page component —
   the hub cards, routing and stat lookups all key off this list. */
const LETTERS: {
  id: LetterKind;
  title: string;
  tag: string;
  blurb: string;
  bullets: string[];
  icon: any;
  /* Tailwind can't build class names at runtime, so every variant is spelled out. */
  bar: string;
  hover: string;
  iconWrap: string;
  tagCls: string;
  /* rgba accent fed to `--ih-neon` for the hover edge glow */
  glow: string;
  statsPath: string;
}[] = [
  {
    id: 'appraisal',
    title: 'Appraisal Letters',
    tag: 'Compensation',
    blurb: 'Annual compensation review letters with the Annexure-A salary break-up.',
    bullets: ['Salary revision', 'Promotion', 'Redesignation'],
    icon: FileText,
    bar: 'from-blue-500 to-indigo-600',
    hover: 'hover:border-blue-300 hover:shadow-blue-500/10',
    iconWrap: 'bg-blue-50 text-blue-600 ring-blue-100',
    tagCls: 'bg-blue-50 text-blue-600 ring-blue-100',
    glow: 'rgba(59,130,246,.35)',
    statsPath: 'offer-letter',
  },
  {
    id: 'warning',
    title: 'Warning Letters',
    tag: 'Disciplinary',
    blurb: 'Formal disciplinary communication, issued to one employee or in bulk.',
    bullets: ['Verbal & written', 'Final warning', 'Show cause'],
    icon: FileWarning,
    bar: 'from-rose-500 to-red-600',
    hover: 'hover:border-rose-300 hover:shadow-rose-500/10',
    iconWrap: 'bg-rose-50 text-rose-600 ring-rose-100',
    tagCls: 'bg-rose-50 text-rose-600 ring-rose-100',
    glow: 'rgba(244,63,94,.35)',
    statsPath: 'warning-letter',
  },
];

type Stats = Record<string, { total: number; sent: number }>;

interface Props {
  onNavigateBack?: () => void;
  onNavigateToApprovals?: () => void;
}

export function LettersGeneratorPage({ onNavigateToApprovals }: Props) {
  const [kind, setKind] = useState<LetterKind | null>(null);
  const [stats, setStats] = useState<Stats>({});


  // Live counts make the hub reflect real activity instead of static marketing
  // copy. Failures are silent on purpose — the hub must still render offline.
  useEffect(() => {
    if (kind) return;
    let alive = true;
    (async () => {
      const out: Stats = {};
      await Promise.all(LETTERS.map(async l => {
        try {
          const r = await fetch(`${PMS_API}/${l.statsPath}/history/?limit=1`);
          if (!r.ok) return;
          const d = await r.json();
          out[l.id] = { total: d.summary?.total ?? 0, sent: d.summary?.sent ?? 0 };
        } catch { /* offline / not deployed yet — card just shows no counts */ }
      }));
      if (alive) setStats(out);
    })();
    return () => { alive = false; };
  }, [kind]);

  /* ── A letter type is open ───────────────────────────────────────────── */
  if (kind) {
    const active = LETTERS.find(l => l.id === kind)!;
    const Icon = active.icon;
    return (
      <div className="min-h-full bg-[#f5f7fa]">
        <style>{TOOL_STYLES}</style>
        <div className="bg-white px-6 py-2.5 flex items-center gap-3 relative z-20
                        border-b border-slate-200 shadow-sm">
          <button onClick={() => setKind(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold
                       text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all">
            <ArrowLeft className="w-3.5 h-3.5" />All Letters
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <p className="text-slate-800 font-bold text-[13px] truncate">{active.title}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {active.id === 'appraisal' && onNavigateToApprovals && (
              <button onClick={onNavigateToApprovals}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold
                           text-emerald-600 hover:bg-emerald-50 transition-all">
                <BarChart3 className="w-3.5 h-3.5" />Approvals
              </button>
            )}
          </div>
        </div>
        {active.id === 'appraisal' ? <OfferLetterSimplePage /> : <WarningLetterPage />}
      </div>
    );
  }

  /* ── Hub — fills the shell's content area, centred ───────────────────── */
  const grandTotal = Object.values(stats).reduce((a, s) => a + s.total, 0);
  const grandSent = Object.values(stats).reduce((a, s) => a + s.sent, 0);

  return (
    <div className="min-h-full bg-[#f5f7fa] relative flex flex-col">
      <style>{TOOL_STYLES}</style>
      {/* Soft colour wash — decorative only */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="tp-drift absolute -top-32 -left-24 w-[30rem] h-[30rem] rounded-full
                        bg-blue-400/15 blur-[110px]" />
        <div className="tp-drift absolute -bottom-40 -right-20 w-[30rem] h-[30rem] rounded-full
                        bg-rose-400/15 blur-[110px]" style={{ animationDelay: '5s' }} />
        <div className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,.035) 1px,transparent 1px),' +
              'linear-gradient(90deg,rgba(15,23,42,.035) 1px,transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse 65% 55% at 50% 42%,#000 30%,transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 65% 55% at 50% 42%,#000 30%,transparent 100%)',
          }} />
      </div>

      {/* Vertically centred within whatever height the shell provides */}
      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-6 py-6">
        <div className="w-full max-w-4xl">
          {/* Hero */}
          <div className="tp-reveal text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4
                            bg-white ring-1 ring-slate-200 shadow-sm">
              <Sparkles className="w-3 h-3 text-amber-500 tp-spin-slow" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                APIS People &amp; Culture
              </span>
            </div>
            <h1 className="ih-grad-text text-4xl sm:text-5xl font-black tracking-tight mb-3
                           bg-gradient-to-r from-slate-900 via-blue-600 to-rose-600">
              Letters Generator
            </h1>
            <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
              Generate, send and archive official employee letters — each type with its own
              template, delivery and searchable history.
            </p>

            {grandTotal > 0 && (
              <div className="flex items-center justify-center gap-7 mt-6">
                {[
                  { icon: Layers, val: grandTotal, label: 'Generated', cls: 'text-slate-700' },
                  { icon: Mail, val: grandSent, label: 'Delivered', cls: 'text-emerald-600' },
                  { icon: CheckCircle2, val: LETTERS.length, label: 'Letter types', cls: 'text-blue-600' },
                ].map(s => {
                  const I = s.icon;
                  return (
                    <div key={s.label} className="tp-pop-in text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <I className={`w-3.5 h-3.5 ${s.cls} opacity-60`} />
                        <p className={`text-xl font-black tabular-nums ${s.cls}`}>{s.val}</p>
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                        {s.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {LETTERS.map((l, i) => {
              const Icon = l.icon;
              const st = stats[l.id];
              return (
                <button key={l.id} onClick={() => setKind(l.id)}
                  onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
                  className={`ih-inview ih-tilt3d ih-spotlight ih-neon group relative text-left rounded-2xl
                              bg-white/80 backdrop-blur-xl border border-slate-200
                              p-6 shadow-sm overflow-hidden
                              hover:shadow-xl ${l.hover}`}
                  style={{ transitionDelay: `${i * 80}ms`, '--ih-neon': l.glow } as any}>
                  <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${l.bar}
                                   opacity-0 group-hover:opacity-100 transition-opacity`} />

                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center
                                     ring-1 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${l.iconWrap}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase
                                      tracking-widest ring-1 ${l.tagCls}`}>
                      {l.tag}
                    </span>
                  </div>

                  <h2 className="text-lg font-black text-slate-900 mb-1.5">{l.title}</h2>
                  <p className="text-[13px] text-slate-500 leading-relaxed mb-4">{l.blurb}</p>

                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {l.bullets.map(b => (
                      <span key={b}
                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold
                                   text-slate-500 bg-slate-50 ring-1 ring-slate-100">
                        {b}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3.5 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 tabular-nums">
                      {st
                        ? st.total > 0
                          ? <>{st.total} issued · <span className="text-emerald-600">{st.sent} sent</span></>
                          : 'No letters yet'
                        : '—'}
                    </p>
                    <span className="flex items-center gap-1 text-[12px] font-black text-slate-400
                                     group-hover:text-slate-900 transition-colors">
                      Open
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LettersGeneratorPage;
