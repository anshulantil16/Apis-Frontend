import { useState, useEffect } from 'react';
import {
  FileText, FileWarning, ArrowLeft, ArrowRight, BarChart3,
  Mail, CheckCircle2, Sparkles, Layers,
} from 'lucide-react';
import { OfferLetterSimplePage } from './OfferLetterSimplePage';
import { WarningLetterPage } from './WarningLetterPage';

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
  glow: string;
  grad: string;
  iconWrap: string;
  tagCls: string;
  statsPath: string;
}[] = [
  {
    id: 'appraisal',
    title: 'Appraisal Letters',
    tag: 'Compensation',
    blurb: 'Annual compensation review letters with the Annexure-A salary break-up.',
    bullets: ['Salary revision', 'Promotion', 'Redesignation'],
    icon: FileText,
    glow: 'group-hover:shadow-[0_0_60px_-12px_rgba(59,130,246,0.55)]',
    grad: 'from-blue-500 via-indigo-500 to-violet-600',
    iconWrap: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
    tagCls: 'bg-blue-500/10 text-blue-300 ring-blue-500/20',
    statsPath: 'offer-letter',
  },
  {
    id: 'warning',
    title: 'Warning Letters',
    tag: 'Disciplinary',
    blurb: 'Formal disciplinary communication, issued to one employee or in bulk.',
    bullets: ['Verbal & written', 'Final warning', 'Show cause'],
    icon: FileWarning,
    glow: 'group-hover:shadow-[0_0_60px_-12px_rgba(244,63,94,0.55)]',
    grad: 'from-rose-500 via-red-500 to-orange-500',
    iconWrap: 'bg-rose-500/10 text-rose-400 ring-rose-500/20',
    tagCls: 'bg-rose-500/10 text-rose-300 ring-rose-500/20',
    statsPath: 'warning-letter',
  },
];

type Stats = Record<string, { total: number; sent: number }>;

interface Props {
  onNavigateBack?: () => void;
  onNavigateToApprovals?: () => void;
}

export function LettersGeneratorPage({ onNavigateBack, onNavigateToApprovals }: Props) {
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
      <div className="min-h-screen bg-[#f5f7fa]">
        <div className="bg-[#0a0d14] px-6 py-3 flex items-center gap-3 sticky top-0 z-40
                        border-b border-white/[0.06]">
          <button onClick={() => setKind(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold
                       text-slate-400 hover:text-white hover:bg-white/[0.07] transition-all">
            <ArrowLeft className="w-3.5 h-3.5" />All Letters
          </button>
          <div className="w-px h-5 bg-white/10" />
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <p className="text-white font-bold text-[13px] truncate">{active.title}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {active.id === 'appraisal' && onNavigateToApprovals && (
              <button onClick={onNavigateToApprovals}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold
                           text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all">
                <BarChart3 className="w-3.5 h-3.5" />Approvals
              </button>
            )}
            {onNavigateBack && (
              <button onClick={onNavigateBack}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-slate-500
                           hover:text-slate-300 hover:bg-white/5 transition-all">
                Exit
              </button>
            )}
          </div>
        </div>
        {active.id === 'appraisal' ? <OfferLetterSimplePage /> : <WarningLetterPage />}
      </div>
    );
  }

  /* ── Hub ─────────────────────────────────────────────────────────────── */
  const grandTotal = Object.values(stats).reduce((a, s) => a + s.total, 0);
  const grandSent = Object.values(stats).reduce((a, s) => a + s.sent, 0);

  return (
    <div className="min-h-screen bg-[#0a0d14] relative overflow-hidden">
      {/* Ambient glow — purely decorative, sits behind everything */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 w-[34rem] h-[34rem] rounded-full
                        bg-blue-600/20 blur-[120px]" />
        <div className="absolute -bottom-48 -right-24 w-[34rem] h-[34rem] rounded-full
                        bg-rose-600/20 blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[26rem] h-[26rem]
                        rounded-full bg-violet-600/10 blur-[110px]" />
        <div className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),' +
              'linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 70% 55% at 50% 40%,#000 40%,transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 55% at 50% 40%,#000 40%,transparent 100%)',
          }} />
      </div>

      {onNavigateBack && (
        <button onClick={onNavigateBack}
          className="absolute top-5 left-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                     text-[12px] font-bold text-slate-500 hover:text-white hover:bg-white/[0.07]
                     transition-all">
          <ArrowLeft className="w-3.5 h-3.5" />Back
        </button>
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6
                          bg-white/[0.06] ring-1 ring-white/10 backdrop-blur">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              APIS People &amp; Culture
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-4
                         bg-gradient-to-b from-white via-white to-slate-500
                         bg-clip-text text-transparent">
            Letters Generator
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto leading-relaxed">
            Generate, send and archive official employee letters — each type with its own
            template, delivery and searchable history.
          </p>

          {grandTotal > 0 && (
            <div className="flex items-center justify-center gap-8 mt-9">
              {[
                { icon: Layers, val: grandTotal, label: 'Letters generated', cls: 'text-slate-200' },
                { icon: Mail, val: grandSent, label: 'Delivered by email', cls: 'text-emerald-400' },
                { icon: CheckCircle2, val: LETTERS.length, label: 'Letter types', cls: 'text-blue-400' },
              ].map(s => {
                const I = s.icon;
                return (
                  <div key={s.label} className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <I className={`w-3.5 h-3.5 ${s.cls} opacity-70`} />
                      <p className={`text-2xl font-black tabular-nums ${s.cls}`}>{s.val}</p>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-1">
                      {s.label}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {LETTERS.map(l => {
            const Icon = l.icon;
            const st = stats[l.id];
            return (
              <button key={l.id} onClick={() => setKind(l.id)}
                className={`group relative text-left rounded-3xl p-[1px] overflow-hidden
                            transition-all duration-300 hover:-translate-y-1 ${l.glow}`}>
                {/* Gradient border, revealed on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${l.grad}
                                 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="absolute inset-0 bg-white/[0.08]" />

                <div className="relative rounded-[calc(1.5rem-1px)] bg-[#11151f] p-7 h-full
                                backdrop-blur">
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center
                                     ring-1 ${l.iconWrap}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase
                                      tracking-widest ring-1 ${l.tagCls}`}>
                      {l.tag}
                    </span>
                  </div>

                  <h2 className="text-xl font-black text-white mb-2">{l.title}</h2>
                  <p className="text-[13px] text-slate-400 leading-relaxed mb-5">{l.blurb}</p>

                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {l.bullets.map(b => (
                      <span key={b}
                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold
                                   text-slate-400 bg-white/[0.04] ring-1 ring-white/[0.06]">
                        {b}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                    <p className="text-[11px] font-bold text-slate-600 tabular-nums">
                      {st
                        ? st.total > 0
                          ? <>{st.total} issued · <span className="text-emerald-500">{st.sent} sent</span></>
                          : 'No letters yet'
                        : '—'}
                    </p>
                    <span className="flex items-center gap-1 text-[12px] font-black text-slate-400
                                     group-hover:text-white transition-colors">
                      Open
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-slate-700 mt-12 font-semibold">
          Letters are stored with a searchable history and can be exported as a ZIP archive.
        </p>
      </div>
    </div>
  );
}

export default LettersGeneratorPage;
