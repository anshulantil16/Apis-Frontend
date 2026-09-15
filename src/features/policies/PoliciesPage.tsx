/* Policies & Guidelines — document register for SOPs, manual policies,
 * templates, work instructions and formats.
 *
 * No policies backend exists yet (see Apis-Backend's app list — there's no
 * `policies` app), so every record here is a sample row shaped the way a
 * real register would look, not live company data. Swap CATEGORY_CARDS /
 * POLICY_ROWS / SUMMARY_STATS for a real fetch once that API exists — the
 * page itself doesn't need to change shape.
 */
import { useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent } from 'react';
import {
  ChevronRight, ChevronDown, Plus, Search, FileText, ClipboardList,
  LayoutTemplate, ListChecks, FolderOpen, CalendarClock,
  CheckCircle2, BarChart3, ArrowUpRight, FileStack,
  X, Eye, Download, UploadCloud,
} from 'lucide-react';

/* Real files dropped in public/Policies/ — served as static assets, so this
   is just the filename register (title + version tag for display) until a
   real `policies` backend/upload flow exists. Encode-on-use handles the
   spaces/parens in the filenames. */
interface ManualPolicyDoc { title: string; version?: string; file: string }
const MANUAL_POLICIES: ManualPolicyDoc[] = [
  { title: 'Policy on Prevention of Sexual Harassment', file: 'Apis India Limited Policy on Prevention of Sexual Harassment.pdf' },
  { title: 'Corporate Tour Policy', version: '2026', file: 'Corporate Tour Policy 2026.pdf' },
  { title: 'Disciplinary Policy and Guidelines', version: 'v1.0.0', file: 'Disciplinary Policy and Guidelines ver 1.0.0.pdf' },
  { title: 'Employee Referral Policy', version: 'v2.0 · 2025', file: 'Employee-Referral-Policy_2025 Ver 2.0.pdf' },
  { title: 'Loan Policy', version: '2025', file: 'LOAN POLICY 2025.pdf' },
  { title: 'Leave Policy', version: 'v1.0 · 2025', file: 'Leave Policy ver 10 0 2025.pdf' },
  { title: 'New Employee Joining Policy', version: 'v1.0.0 · 2018', file: 'New Employee Joining Policy  ver 1.0.0 2018.pdf' },
  { title: 'TA-DA Amendment Policy (Sales)', version: 'v2.0.1 · 2023', file: 'TA-DA New Amendment Policy- Sales -2023.06 (V2.0.1).pdf' },
  { title: 'Tour and Travel Policy (HO)', file: 'Tour and Travel Policy-HO.pdf' },
  { title: 'Variable Pay Policy', version: 'v1.0.0 · 2024', file: 'Variale Pay policy 1.0.0 2024.pdf' },
  { title: 'Workplace Affair Policy', version: '2025-26', file: 'Workplace Affair Policy 2025-26.pdf' },
];
/* A freshly-added policy's file is a browser object URL (blob:...), not a
   path under public/Policies/ — pass those straight through. */
function policyHref(file: string) {
  return /^(blob:|https?:)/.test(file) ? file : encodeURI(`/Policies/${file}`);
}

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
  { label: 'SOP', count: 0, icon: FileText, action: 'View All', gradient: 'from-amber-400 to-orange-500', glow: 'rgba(245,158,11,.4)', bar: 'bg-amber-500' },
  { label: 'Manual Policy', count: MANUAL_POLICIES.length, icon: ClipboardList, action: 'Browse', gradient: 'from-amber-400 to-yellow-600', glow: 'rgba(217,119,6,.4)', bar: 'bg-yellow-500' },
  { label: 'Templates', count: 0, icon: LayoutTemplate, action: 'Browse', gradient: 'from-cyan-400 to-blue-600', glow: 'rgba(6,182,212,.4)', bar: 'bg-cyan-500' },
  { label: 'Work Instructions', count: 0, icon: ListChecks, action: 'View All', gradient: 'from-emerald-400 to-teal-600', glow: 'rgba(16,185,129,.4)', bar: 'bg-emerald-500' },
  { label: 'Formats', count: 0, icon: FileStack, action: 'Browse', gradient: 'from-rose-400 to-pink-600', glow: 'rgba(244,63,94,.4)', bar: 'bg-rose-500' },
];
/* Every category a policy can be filed under — drives both the demo cards
   above and the Add Policy form's category select, so the two can't drift. */
const CATEGORY_LABELS = CATEGORY_CARDS.map(c => c.label);
/* Same department list the Employee Referral form uses (ReferralFormPopup.tsx)
   — kept in step so "department" means the same thing everywhere in the app. */
const DEPARTMENTS = ['Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'IT', 'Production', 'Other'];

interface PolicyRow {
  doc: string; category: string; version: number; pages?: number;
  approvedBy: string; approvalDate: string; reviewedBy: string;
  department?: string;
  /* Present only for policies added through the Add Policy form — an
     object URL for the uploaded PDF, so the row is actually viewable. */
  file?: string;
}
/* Real register, built from the 11 PDFs in public/Policies/ — same titles as
   MANUAL_POLICIES above so a document reads identically in the table and in
   the browse popup. Page counts are read straight off each PDF (pypdf), not
   guessed; approver/reviewer names and dates aren't tracked anywhere yet
   (no `policies` backend), so those follow the same placeholder convention
   the register already used before real files existed. */
const POLICY_ROWS: PolicyRow[] = MANUAL_POLICIES.map((doc, i) => {
  const meta = [
    { pages: 9, version: 1, approvedBy: 'Vimal Anand', approvalDate: '1/1', reviewedBy: 'Pankaj', department: 'P & C' },
    { pages: 5, version: 1, approvedBy: 'Amit Anand', approvalDate: '1/1', reviewedBy: 'Arun', department: 'P & C' },
    { pages: 13, version: 1, approvedBy: 'Vimal Anand', approvalDate: '6/4', reviewedBy: 'Pankaj', department: 'P & C' },
    { pages: 5, version: 2, approvedBy: 'Amit Anand', approvalDate: '15/6', reviewedBy: 'Arun', department: 'P & C' },
    { pages: 4, version: 1, approvedBy: 'Pankaj', approvalDate: '10/2', reviewedBy: 'Vimal Anand', department: 'Finance' },
    { pages: 8, version: 1, approvedBy: 'Vimal Anand', approvalDate: '2/5', reviewedBy: 'Amit Anand', department: 'P & C' },
    { pages: 3, version: 1, approvedBy: 'Arun', approvalDate: '9/1', reviewedBy: 'Pankaj', department: 'P & C' },
    { pages: 2, version: 2, approvedBy: 'Pankaj', approvalDate: '6/6', reviewedBy: 'Amit Anand', department: 'Sales' },
    { pages: 3, version: 1, approvedBy: 'Amit Anand', approvalDate: '20/7', reviewedBy: 'Vimal Anand', department: 'Admin' },
    { pages: 3, version: 1, approvedBy: 'Vimal Anand', approvalDate: '4/8', reviewedBy: 'Arun', department: 'Finance' },
    { pages: 2, version: 1, approvedBy: 'Arun', approvalDate: '18/9', reviewedBy: 'Pankaj', department: 'P & C' },
  ][i];
  return { doc: doc.title, category: 'Manual Policy', file: doc.file, ...meta };
});

const CATEGORY_BADGE: Record<string, string> = {
  'SOP': 'text-amber-600 bg-amber-50 ring-amber-200',
  'Manual Policy': 'text-yellow-700 bg-yellow-50 ring-yellow-200',
  'Templates': 'text-cyan-600 bg-cyan-50 ring-cyan-200',
  'Work Instructions': 'text-emerald-600 bg-emerald-50 ring-emerald-200',
  'Formats': 'text-rose-600 bg-rose-50 ring-rose-200',
};
/* Same per-category colour, as a left border accent on each table row —
   ties a row visually back to its category pill and the matching card. */
const CATEGORY_BORDER: Record<string, string> = {
  'SOP': 'border-l-amber-400',
  'Manual Policy': 'border-l-yellow-500',
  'Templates': 'border-l-cyan-400',
  'Work Instructions': 'border-l-emerald-400',
  'Formats': 'border-l-rose-400',
};
const AVATAR_RING = ['ring-amber-200 bg-amber-50 text-amber-700', 'ring-violet-200 bg-violet-50 text-violet-700',
  'ring-cyan-200 bg-cyan-50 text-cyan-700', 'ring-emerald-200 bg-emerald-50 text-emerald-700'];
function initials(name: string) {
  return name.replace(/^Mr\.?\s*/i, '').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

export function PoliciesPage() {
  const [query, setQuery] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [manualPolicyOpen, setManualPolicyOpen] = useState(false);

  const [rows, setRows] = useState<PolicyRow[]>(POLICY_ROWS);
  const [manualDocs, setManualDocs] = useState<ManualPolicyDoc[]>(MANUAL_POLICIES);
  const [categoryCards, setCategoryCards] = useState<CategoryCard[]>(CATEGORY_CARDS);
  const maxCategoryCount = Math.max(1, ...categoryCards.map(c => c.label === 'Manual Policy' ? manualDocs.length : c.count));

  // Add Policy form
  const [addPolicyOpen, setAddPolicyOpen] = useState(false);
  const [newDoc, setNewDoc] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORY_LABELS[0]);
  const [newDepartment, setNewDepartment] = useState(DEPARTMENTS[0]);
  const [newVersion, setNewVersion] = useState(1);
  const [newApprovedBy, setNewApprovedBy] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetAddPolicyForm() {
    setNewDoc(''); setNewCategory(CATEGORY_LABELS[0]); setNewDepartment(DEPARTMENTS[0]); setNewVersion(1);
    setNewApprovedBy(''); setNewFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleAddPolicy(e: FormEvent) {
    e.preventDefault();
    if (!newDoc.trim() || !newFile) return;

    const fileUrl = URL.createObjectURL(newFile);
    const today = new Date();
    const approvalDate = `${today.getDate()}/${today.getMonth() + 1}`;

    setRows(prev => [{
      doc: newDoc.trim(), category: newCategory, department: newDepartment, version: newVersion,
      approvedBy: newApprovedBy.trim() || 'You', approvalDate, reviewedBy: '—', file: fileUrl,
    }, ...prev]);

    if (newCategory === 'Manual Policy') {
      setManualDocs(prev => [{ title: newDoc.trim(), version: `v${newVersion}`, file: fileUrl }, ...prev]);
    } else {
      setCategoryCards(prev => prev.map(c => c.label === newCategory ? { ...c, count: c.count + 1 } : c));
    }

    setAddPolicyOpen(false);
    resetAddPolicyForm();
  }

  const q = query.trim().toLowerCase();
  const filteredRows = useMemo(
    () => !q ? rows : rows.filter(r =>
      r.doc.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.approvedBy.toLowerCase().includes(q)),
    [q, rows],
  );

  const summaryStats = useMemo(() => [
    { label: 'Total Policies', value: rows.length, icon: FolderOpen },
    { label: 'Total Pages', value: rows.reduce((sum, r) => sum + (r.pages ?? 0), 0), icon: FileText },
    { label: 'Total Approvals', value: rows.length, icon: CheckCircle2 },
    { label: 'Latest Approval', value: rows[0]?.approvalDate ?? '—', icon: CalendarClock },
  ], [rows]);

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
        {/* breadcrumb */}
        <div className="ih-fade flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
            <span>Apps</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-amber-600">Policies</span>
          </div>
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
              </div>
            </div>
            <button onClick={() => setAddPolicyOpen(true)}
              className="ih-sheen group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white
                         font-black text-sm shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-0.5 shrink-0 self-start lg:self-auto">
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />Add Policy
            </button>
          </div>
        </div>

        {/* category cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categoryCards.map((c, i) => {
            const Icon = c.icon;
            const count = c.label === 'Manual Policy' ? manualDocs.length : c.count;
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
                <p className="text-2xl font-black text-slate-900 -mt-1"><AnimatedCount value={count} /></p>

                {/* relative-volume meter — purely decorative, scaled against the
                    largest category count so the bars read at a glance */}
                <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${c.bar} transition-[width] duration-1000 ease-out`}
                    style={{ width: `${Math.max(6, (count / maxCategoryCount) * 100)}%` }} />
                </div>

                <button onClick={() => c.label === 'Manual Policy' && setManualPolicyOpen(true)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-amber-300 text-amber-600
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
              Showing <span className="text-slate-700 font-black">{filteredRows.length}</span> of {rows.length} documents
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
                  <th className="text-left px-4 py-3">Reviewed By</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr key={r.doc}
                    className={`ih-inview border-t border-slate-100 border-l-4 ${CATEGORY_BORDER[r.category] ?? 'border-l-transparent'}
                               hover:bg-amber-50/40 hover:shadow-[inset_0_0_0_9999px_rgba(245,158,11,.02)] transition-all`}
                    style={{ transitionDelay: `${i * 40}ms` }}>
                    <td className="px-4 py-3 text-slate-400 font-bold">{String(i + 1).padStart(2, '0')}</td>
                    <td className="px-4 py-3 font-black text-slate-900">
                      {r.file ? (
                        <span className="inline-flex items-center gap-2">
                          <a href={policyHref(r.file)} target="_blank" rel="noopener noreferrer"
                            className="hover:text-amber-600 hover:underline">
                            {r.department ? `${r.department} / ${r.doc}` : r.doc}
                          </a>
                          <a href={policyHref(r.file)} download title="Download"
                            className="text-slate-400 hover:text-amber-600 transition-colors">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </span>
                      ) : (r.department ? `${r.department} / ${r.doc}` : r.doc)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ring-1 ${CATEGORY_BADGE[r.category] ?? 'text-slate-600 bg-slate-50 ring-slate-200'}`}>
                        {r.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-black text-[11px]">v{r.version}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-bold">{r.pages ?? '—'}</td>
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
                      <span className="inline-flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full ring-1 flex items-center justify-center text-[9px] font-black shrink-0 ${AVATAR_RING[(i + 1) % AVATAR_RING.length]}`}>
                          {initials(r.reviewedBy)}
                        </span>
                        <span className="text-slate-600 font-semibold">{r.reviewedBy}</span>
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
              {summaryStats.map((s, i) => {
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

      {/* Manual Policy browser — a big, realistic document-picker popup, not a
          tucked-away dropdown, since this is the one category with real files
          behind it (public/Policies/) rather than placeholder rows. */}
      {manualPolicyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          onClick={() => setManualPolicyOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div onClick={e => e.stopPropagation()}
            className="ih-pop-in relative w-full max-w-5xl max-h-[88vh] flex flex-col rounded-3xl bg-white
                       shadow-[0_60px_120px_-30px_rgba(0,0,0,.5)] ring-1 ring-black/5 overflow-hidden">
            {/* header */}
            <div className="relative flex-shrink-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600" />
              <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.9) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.9) 1px,transparent 1px)',
                         backgroundSize: '36px 36px' }} />
              <div className="relative flex items-center justify-between gap-4 px-6 sm:px-8 py-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-7 h-7 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">Manual Policy Documents</h2>
                    <p className="text-amber-50/90 text-sm font-medium mt-0.5">{manualDocs.length} documents · view or download any policy below</p>
                  </div>
                </div>
                <button onClick={() => setManualPolicyOpen(false)} title="Close"
                  className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center flex-shrink-0 transition-all">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* document grid */}
            <div className="flex-1 overflow-y-auto ih-scroll-clean p-6 sm:p-8 bg-slate-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {manualDocs.map((doc, i) => (
                  <div key={doc.file}
                    className="ih-inview group relative flex flex-col rounded-2xl bg-white border border-slate-200
                               shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-amber-300 transition-all p-4 overflow-hidden"
                    style={{ transitionDelay: `${i * 40}ms` }}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center
                                      shadow-md flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                        <FileText className="w-5.5 h-5.5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-black text-slate-900 leading-snug">{doc.title}</p>
                        {doc.version && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600
                                           ring-1 ring-amber-200 text-[10px] font-black">{doc.version}</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <a href={policyHref(doc.file)} target="_blank" rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200
                                   text-slate-600 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 text-[11px] font-black transition-all">
                        <Eye className="w-3.5 h-3.5" />View
                      </a>
                      <a href={policyHref(doc.file)} download
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600
                                   hover:from-amber-600 hover:to-yellow-700 text-white text-[11px] font-black shadow-md shadow-amber-200 transition-all">
                        <Download className="w-3.5 h-3.5" />Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Policy — client-side only (no `policies` backend exists yet, see
          the file header), so the PDF becomes a browser object URL rather
          than something uploaded to a server. It's fully viewable/downloadable
          for the rest of this session and shows up in the table (and in the
          Manual Policy browser, if that's the chosen category) immediately,
          but won't survive a page reload until a real upload endpoint exists. */}
      {addPolicyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => { setAddPolicyOpen(false); resetAddPolicyForm(); }}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <form onClick={e => e.stopPropagation()} onSubmit={handleAddPolicy}
            className="ih-pop-in relative w-full max-w-lg flex flex-col rounded-3xl bg-white
                       shadow-[0_60px_120px_-30px_rgba(0,0,0,.5)] ring-1 ring-black/5 overflow-hidden">
            <div className="relative flex-shrink-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600" />
              <div className="relative flex items-center justify-between gap-4 px-6 py-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-5.5 h-5.5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-white tracking-tight truncate">Add Policy</h2>
                    <p className="text-amber-50/90 text-[12px] font-medium">Upload a PDF and file it under a category</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setAddPolicyOpen(false); resetAddPolicyForm(); }} title="Close"
                  className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center flex-shrink-0 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto ih-scroll-clean">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Document Name</label>
                <input value={newDoc} onChange={e => setNewDoc(e.target.value)} required
                  placeholder="e.g. Remote Work Policy"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800
                             placeholder:text-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800
                               outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all">
                    {CATEGORY_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Department</label>
                  <select value={newDepartment} onChange={e => setNewDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800
                               outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Version</label>
                <input type="number" min={1} value={newVersion}
                  onChange={e => setNewVersion(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800
                             outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Approved By (optional)</label>
                <input value={newApprovedBy} onChange={e => setNewApprovedBy(e.target.value)}
                  placeholder="e.g. Vimal Anand"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800
                             placeholder:text-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">PDF File</label>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-dashed transition-all text-left
                             ${newFile ? 'border-amber-300 bg-amber-50' : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'}`}>
                  <UploadCloud className={`w-5 h-5 flex-shrink-0 ${newFile ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-bold truncate ${newFile ? 'text-amber-700' : 'text-slate-400'}`}>
                    {newFile ? newFile.name : 'Click to choose a PDF…'}
                  </span>
                </button>
                <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
                  onChange={e => setNewFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button type="button" onClick={() => { setAddPolicyOpen(false); resetAddPolicyForm(); }}
                className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 text-[13px] font-bold transition-all">
                Cancel
              </button>
              <button type="submit" disabled={!newDoc.trim() || !newFile}
                className="ih-sheen inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600
                           hover:from-amber-600 hover:to-orange-700 text-white text-[13px] font-black shadow-md shadow-amber-200
                           transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <Plus className="w-4 h-4" />Add Policy
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default PoliciesPage;
