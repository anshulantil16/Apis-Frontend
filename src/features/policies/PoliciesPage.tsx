/* Policies & Guidelines — document register for SOPs, manual policies,
 * templates, work instructions and formats.
 *
 * No policies backend exists yet (see Apis-Backend's app list — there's no
 * `policies` app), so every record here is a sample row shaped the way a
 * real register would look, not live company data. Swap CATEGORY_CARDS /
 * POLICY_ROWS / SUMMARY_STATS for a real fetch once that API exists — the
 * page itself doesn't need to change shape.
 */
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  ChevronRight, ChevronDown, Plus, Search, FileText, ClipboardList,
  LayoutTemplate, ListChecks, FolderOpen, CalendarClock,
  CheckCircle2, XCircle, BarChart3, ArrowUpRight, Radio, FileStack,
} from 'lucide-react';

/* Counts up from 0 to `target` on mount — same easing/technique as the home
   page's useCountUp, kept as a small local copy since this page has no
   scroll-triggered gate to wait for (it's short enough to always be in
   view). Purely a numbers-feel-alive touch, not tied to any real data feed. */
function useCountUp(target: number, durationMs = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return v;
}
/* Animates plain integers ("221", 6); anything else (e.g. "25/8") renders
   as-is rather than being coerced into a meaningless count. */
function AnimatedCount({ value, durationMs }: { value: number | string; durationMs?: number }) {
  const num = typeof value === 'number' ? value : (/^\d+$/.test(value) ? parseInt(value, 10) : null);
  const live = useCountUp(num ?? 0, durationMs);
  if (num === null) return <>{value}</>;
  return <>{live}</>;
}

/* Pointer handlers come from the shared kit: it measures once per
   hover and batches its writes, where this file's old private copy
   measured inside every mousemove and forced a synchronous layout. */
import { onSpotlightMove, onTilt3dMove, onTilt3dLeave } from '../../ui';

interface CategoryCard {
  label: string; count: number; icon: ComponentType<{ className?: string }>;
  action: string; gradient: string; glow: string; bar: string;
}
/* Each category gets its own accent (matching CATEGORY_BADGE's colours
   below, so a SOP pill in the table and the SOP card read as the same
   category) rather than five identical amber tiles — the hero, CTA and
   sidebar stay the dominant mustard/amber so the page still reads as one
   theme, this is just per-category variety within it. */
const CATEGORY_CARDS: CategoryCard[] = [
  { label: 'SOP', count: 6, icon: FileText, action: 'View All', gradient: 'from-amber-400 to-orange-500', glow: 'rgba(245,158,11,.4)', bar: 'bg-amber-500' },
  { label: 'Manual Policy', count: 2, icon: ClipboardList, action: 'Browse', gradient: 'from-violet-400 to-purple-600', glow: 'rgba(139,92,246,.4)', bar: 'bg-violet-500' },
  { label: 'Templates', count: 206, icon: LayoutTemplate, action: 'Browse', gradient: 'from-cyan-400 to-blue-600', glow: 'rgba(6,182,212,.4)', bar: 'bg-cyan-500' },
  { label: 'Work Instructions', count: 3, icon: ListChecks, action: 'View All', gradient: 'from-emerald-400 to-teal-600', glow: 'rgba(16,185,129,.4)', bar: 'bg-emerald-500' },
  { label: 'Formats', count: 10, icon: FileStack, action: 'Browse', gradient: 'from-rose-400 to-pink-600', glow: 'rgba(244,63,94,.4)', bar: 'bg-rose-500' },
];
const MAX_CATEGORY_COUNT = Math.max(...CATEGORY_CARDS.map(c => c.count));

interface PolicyRow {
  doc: string; category: string; version: number; pages: number;
  approvedBy: string; approvalDate: string; amended: boolean;
}
const POLICY_ROWS: PolicyRow[] = [
  { doc: 'AIL/DEP | File Name', category: 'SOP', version: 2, pages: 10, approvedBy: 'Mr. Vimal Anand', approvalDate: '25/8', amended: false },
  { doc: 'AIL | P&C', category: 'Manual Policy', version: 3, pages: 20, approvedBy: 'Mr. Amit Anand', approvalDate: '25/8', amended: true },
  { doc: 'TA & DA Policy', category: 'Templates', version: 4, pages: 40, approvedBy: 'Mr. Pankaj', approvalDate: '20/8', amended: false },
  { doc: 'DEP Name Format', category: 'Formats', version: 1, pages: 20, approvedBy: 'Mr. Arun', approvalDate: '16/8', amended: false },
];

const CATEGORY_BADGE: Record<string, string> = {
  'SOP': 'text-amber-600 bg-amber-50 ring-amber-200',
  'Manual Policy': 'text-violet-600 bg-violet-50 ring-violet-200',
  'Templates': 'text-cyan-600 bg-cyan-50 ring-cyan-200',
  'Work Instructions': 'text-emerald-600 bg-emerald-50 ring-emerald-200',
  'Formats': 'text-rose-600 bg-rose-50 ring-rose-200',
};
/* Same per-category colour, as a left border accent on each table row —
   ties a row visually back to its category pill and the matching card. */
const CATEGORY_BORDER: Record<string, string> = {
  'SOP': 'border-l-amber-400',
  'Manual Policy': 'border-l-violet-400',
  'Templates': 'border-l-cyan-400',
  'Work Instructions': 'border-l-emerald-400',
  'Formats': 'border-l-rose-400',
};
const AVATAR_RING = ['ring-amber-200 bg-amber-50 text-amber-700', 'ring-violet-200 bg-violet-50 text-violet-700',
  'ring-cyan-200 bg-cyan-50 text-cyan-700', 'ring-emerald-200 bg-emerald-50 text-emerald-700'];
function initials(name: string) {
  return name.replace(/^Mr\.?\s*/i, '').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

const SUMMARY_STATS = [
  { label: 'Total Policies', value: '221', icon: FolderOpen },
  { label: 'Total Pages', value: '170', icon: FileText },
  { label: 'Total Approvals', value: '4', icon: CheckCircle2 },
  { label: 'Latest Approval', value: '25/8', icon: CalendarClock },
];

export function PoliciesPage() {
  const [query, setQuery] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(true);

  const q = query.trim().toLowerCase();
  const filteredRows = useMemo(
    () => !q ? POLICY_ROWS : POLICY_ROWS.filter(r =>
      r.doc.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.approvedBy.toLowerCase().includes(q)),
    [q],
  );

  return (
    <div className="min-h-full bg-[#f8fafc] relative">
      {/* ambient background wash — same drift/aurora technique as the home
          dashboard, so this reads as the same product, not a bolted-on page */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ih-drift absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-amber-300/20 blur-[130px]" />
        <div className="ih-aurora absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-orange-300/15 blur-[130px]" />
        <div className="ih-drift absolute bottom-0 left-1/4 w-[26rem] h-[26rem] rounded-full bg-amber-200/20 blur-[130px]" style={{ animationDelay: '6s' }} />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-6 py-5 space-y-6">
        {/* breadcrumb + live status pill */}
        <div className="ih-fade flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
            <span>Apps</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-amber-600">Policies</span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 ring-1 ring-amber-200 text-[10px] font-black uppercase tracking-wider text-amber-600">
            <Radio className="ih-pulse-glow w-3 h-3" />Demo data — live feed not connected yet
          </span>
        </div>

        {/* hero header — mustard/amber gradient panel, same family as the
            APIS Tree hero header, with a faint circuit-grid overlay and a
            slow holographic sweep for a more "control panel" feel */}
        <div className="ih-reveal ih-sweep relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-amber-50/60 to-white
                        border border-amber-100 shadow-sm p-6 md:p-8">
          <div className="ih-drift pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-300/25 blur-[100px]" />
          <div className="ih-aurora pointer-events-none absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-orange-200/25 blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(rgba(180,83,9,.7) 1px,transparent 1px),linear-gradient(90deg,rgba(180,83,9,.7) 1px,transparent 1px)',
                     backgroundSize: '40px 40px' }} />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="ih-border-flow ih-float relative w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
                <ClipboardList className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Policies</h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white ring-1 ring-amber-200 text-[10px] font-black text-amber-600">
                    <AnimatedCount value={221} /> documents
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">Manage policies, track revisions, total pages and approvals.</p>
                <p className="text-[11px] text-amber-600/70 font-semibold mt-1">Sample records shown below — connect the policies register to replace these.</p>
              </div>
            </div>
            <button
              className="ih-sheen group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white
                         font-black text-sm shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-0.5 shrink-0 self-start lg:self-auto">
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />Add Policy
            </button>
          </div>
        </div>

        {/* category cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORY_CARDS.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={c.label}
                onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
                style={{ animationDelay: `${i * 70}ms`, ['--ih-neon' as string]: c.glow }}
                className="ih-pop-in ih-tilt3d ih-spotlight ih-neon group relative rounded-2xl bg-white border border-slate-200
                           shadow-sm p-4 flex flex-col items-center text-center gap-2.5 overflow-hidden">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center shadow-md
                                 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-wide">{c.label}</p>
                <p className="text-2xl font-black text-slate-900 -mt-1"><AnimatedCount value={c.count} /></p>

                {/* relative-volume meter — purely decorative, scaled against the
                    largest category count so the bars read at a glance */}
                <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${c.bar} transition-[width] duration-1000 ease-out`}
                    style={{ width: `${Math.max(6, (c.count / MAX_CATEGORY_COUNT) * 100)}%` }} />
                </div>

                <button className="w-full mt-1 px-3 py-1.5 rounded-lg border border-amber-300 text-amber-600
                                   text-[11px] font-black hover:bg-amber-50 transition-all">
                  {c.action}
                </button>
              </div>
            );
          })}
        </div>

        {/* search + table */}
        <div className="ih-reveal rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden" style={{ animationDelay: '100ms' }}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="ih-spotlight relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 sm:w-80"
              onMouseMove={onSpotlightMove}>
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                type="text"
                placeholder="Search policies…"
                className="w-full bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
              />
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              Showing <span className="text-slate-700 font-black">{filteredRows.length}</span> of {POLICY_ROWS.length} documents
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/80 sticky top-0 z-[1]">
                  <th className="text-left px-4 py-3">Sr.No</th>
                  <th className="text-left px-4 py-3">Document Name</th>
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-left px-4 py-3">Version No.</th>
                  <th className="text-left px-4 py-3">Total Pages</th>
                  <th className="text-left px-4 py-3">Approved By</th>
                  <th className="text-left px-4 py-3">Approval Date</th>
                  <th className="text-left px-4 py-3">Annexure (Y/N)</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr key={r.doc}
                    className={`ih-inview border-t border-slate-100 border-l-4 ${CATEGORY_BORDER[r.category] ?? 'border-l-transparent'}
                               hover:bg-amber-50/40 hover:shadow-[inset_0_0_0_9999px_rgba(245,158,11,.02)] transition-all`}
                    style={{ transitionDelay: `${i * 40}ms` }}>
                    <td className="px-4 py-3 text-slate-400 font-bold">{String(i + 1).padStart(2, '0')}</td>
                    <td className="px-4 py-3 font-black text-slate-900">{r.doc}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ring-1 ${CATEGORY_BADGE[r.category] ?? 'text-slate-600 bg-slate-50 ring-slate-200'}`}>
                        {r.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-black text-[11px]">v{r.version}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-bold">{r.pages}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full ring-1 flex items-center justify-center text-[9px] font-black shrink-0 ${AVATAR_RING[i % AVATAR_RING.length]}`}>
                          {initials(r.approvedBy)}
                        </span>
                        <span className="text-slate-600 font-semibold">{r.approvedBy}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-semibold">{r.approvalDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ring-1
                        ${r.amended ? 'text-amber-600 bg-amber-50 ring-amber-200' : 'text-slate-400 bg-slate-50 ring-slate-200'}`}>
                        {r.amended ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {r.amended ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-sm text-slate-400 py-10">No policies match this search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* collapsible summary bar */}
        <div className="ih-reveal rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden" style={{ animationDelay: '160ms' }}>
          <button onClick={() => setSummaryOpen(o => !o)}
            className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-amber-50/40 transition-colors">
            <span className="flex items-center gap-2.5">
              <span className="relative w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <span className="ih-pulse-glow absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">1</span>
              </span>
              <span className="text-sm font-black text-slate-900">Policies Summary</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="text-[11px] font-black text-amber-600 flex items-center gap-1">
                View All<ArrowUpRight className="w-3 h-3" />
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${summaryOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${summaryOpen ? 'max-h-40' : 'max-h-0'}`}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5 pt-1">
              {SUMMARY_STATS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="ih-pop-in ih-tilt group flex items-center gap-3 rounded-xl bg-amber-50/60 ring-1 ring-amber-100 px-4 py-3"
                    style={{ animationDelay: `${i * 70}ms` }}>
                    <div className="w-9 h-9 rounded-lg bg-white ring-1 ring-amber-200 flex items-center justify-center shrink-0
                                    transition-transform duration-300 group-hover:scale-110">
                      <Icon className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-black text-slate-900 leading-none"><AnimatedCount value={s.value} /></p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1 truncate">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="h-2" />
      </div>
    </div>
  );
}

export default PoliciesPage;
