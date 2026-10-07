/* Policies & Guidelines — document register for SOPs, manual policies,
 * templates, work instructions and formats.
 *
 * Two sources, one table. The 11 PDFs in public/Policies/ ship with the
 * build (MANUAL_POLICIES below) and can't be removed from here. Everything
 * else comes from the `policies` Django app: an upload is stored on the
 * server, attributed to whoever is signed in, and — unless a superadmin
 * added it — held back until a superadmin approves it. Until then the
 * uploader sees their own row marked "Awaiting approval" and nobody else
 * sees it. The uploader can delete their own row; a superadmin can delete
 * any uploaded row.
 */
import { useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent } from 'react';
import {
  ChevronRight, ChevronDown, Plus, Search, FileText, ClipboardList,
  LayoutTemplate, ListChecks, FolderOpen, CalendarClock,
  CheckCircle2, BarChart3, ArrowUpRight, FileStack,
  X, Eye, UploadCloud, Trash2, Loader2,
} from 'lucide-react';
import { apiFetch } from '../portal/session';
import { apiBase } from '../../apiBase';

const POLICIES_API = `${apiBase()}/api/policies`;
const ACCEPTED_FILES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';

/* Real files dropped in public/Policies/ — served as static assets and part
   of the build, so they sit beside the uploaded documents and can't be
   deleted from the page. Encode-on-use handles the spaces/parens in the
   filenames. */
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
/* An uploaded document's file is a full URL from the server, not a path
   under public/Policies/ — pass those straight through. */
function policyHref(file: string) {
  return /^(blob:|https?:|\/)/.test(file) ? file : encodeURI(`/Policies/${file}`);
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
  label: string; icon: ComponentType<{ className?: string }>;
  action: string; gradient: string; glow: string; bar: string;
  /* What one of these is called — the card's "+ Add" button and the form
     title read "Add SOP", "Add Template", not "Add Templates". */
  singular: string;
}
/* Each category gets its own accent (matching CATEGORY_BADGE's colours
   below, so a SOP pill in the table and the SOP card read as the same
   category) rather than five identical amber tiles — the hero, CTA and
   sidebar stay the dominant mustard/amber so the page still reads as one
   theme, this is just per-category variety within it. */
const CATEGORY_CARDS: CategoryCard[] = [
  { label: 'SOP', singular: 'SOP', icon: FileText, action: 'View All', gradient: 'from-amber-400 to-orange-500', glow: 'rgba(245,158,11,.4)', bar: 'bg-amber-500' },
  { label: 'Manual Policy', singular: 'Policy', icon: ClipboardList, action: 'Browse', gradient: 'from-amber-400 to-yellow-600', glow: 'rgba(217,119,6,.4)', bar: 'bg-yellow-500' },
  { label: 'Templates', singular: 'Template', icon: LayoutTemplate, action: 'Browse', gradient: 'from-cyan-400 to-blue-600', glow: 'rgba(6,182,212,.4)', bar: 'bg-cyan-500' },
  { label: 'Work Instructions', singular: 'Work Instruction', icon: ListChecks, action: 'View All', gradient: 'from-emerald-400 to-teal-600', glow: 'rgba(16,185,129,.4)', bar: 'bg-emerald-500' },
  { label: 'Formats', singular: 'Format', icon: FileStack, action: 'Browse', gradient: 'from-rose-400 to-pink-600', glow: 'rgba(244,63,94,.4)', bar: 'bg-rose-500' },
];
/* Every category a document can be filed under — drives the cards, the
   table's filter tabs and the Add form's select, so the three can't drift.
   Must match PolicyDocument.CATEGORY_CHOICES on the backend. */
const CATEGORY_LABELS = CATEGORY_CARDS.map(c => c.label);
const singularOf = (label: string) => CATEGORY_CARDS.find(c => c.label === label)?.singular ?? 'Document';
/* The Employee Referral form's department list (ReferralFormPopup.tsx), plus
   P & C and Admin — the departments the existing policies are filed under,
   so a new policy can be filed alongside them. */
const DEPARTMENTS = ['P & C', 'Admin', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'IT', 'Production', 'Other'];

interface PolicyRow {
  doc: string; category: string; version: number; pages?: number | null;
  approvedBy: string; approvalDate: string; reviewedBy: string;
  department?: string;
  file?: string;
  /* Present only on uploaded rows, which come from the server; the seed
     rows built from public/Policies/ have none of these. */
  id?: number;
  moderationStatus?: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  canDelete?: boolean;
}

/* The `policies` API's row shape — see policies/views.py `_serialize`. */
interface ApiDocument {
  id: number; title: string; category: string; department: string;
  version: number; pages: number | null;
  approvedBy: string; reviewedBy: string; approvalDate: string | null;
  file: string; moderationStatus: 'pending' | 'approved' | 'rejected';
  reviewNote: string; canDelete: boolean; message?: string;
}
/* Uploaded rows by id; built-in rows by filename, the only thing they have. */
const rowKey = (r: PolicyRow) => (r.id ? `doc-${r.id}` : `builtin-${r.file ?? r.doc}`);

function fromApi(d: ApiDocument): PolicyRow {
  /* d/m/yyyy: the seed rows show d/m only because their year was never
     recorded, not because the year doesn't matter. */
  let approvalDate = '—';
  if (d.approvalDate) {
    const [y, m, day] = d.approvalDate.split('-').map(Number);
    approvalDate = `${day}/${m}/${y}`;
  }
  return {
    id: d.id, doc: d.title, category: d.category, department: d.department || undefined,
    version: d.version, pages: d.pages, approvedBy: d.approvedBy || '—', reviewedBy: d.reviewedBy || '—',
    approvalDate, file: d.file, moderationStatus: d.moderationStatus, reviewNote: d.reviewNote,
    canDelete: d.canDelete,
  };
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
/* The small bin used on table rows and in the Manual Policy browser. */
function DeleteIcon({ label, busy, onClick, className = '' }: { label: string; busy: boolean; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={busy}
      title="Remove this document" aria-label={`Remove ${label}`}
      className={`w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-300
                  hover:text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-50 ${className}`}>
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}

function initials(name: string) {
  return name.replace(/^Mr\.?\s*/i, '').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

export function PoliciesPage() {
  const [query, setQuery] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(true);

  /* Uploaded rows, newest first, ahead of the seed rows that ship with the
     build. Kept apart so a refetch never has to touch the seed rows. */
  const [uploaded, setUploaded] = useState<PolicyRow[]>([]);
  /* Built-in PDFs a superadmin has taken off the page (filenames), and
     whether this viewer may take off more. The files stay in the build;
     the page just stops listing them. */
  const [removedBuiltIns, setRemovedBuiltIns] = useState<string[]>([]);
  const [canRemoveBuiltIns, setCanRemoveBuiltIns] = useState(false);
  const rows = useMemo(() => [
    ...uploaded,
    ...POLICY_ROWS
      .filter(r => !removedBuiltIns.includes(r.file!))
      .map(r => ({ ...r, canDelete: canRemoveBuiltIns })),
  ], [uploaded, removedBuiltIns, canRemoveBuiltIns]);
  const countFor = (label: string) => rows.filter(r => r.category === label).length;
  const maxCategoryCount = Math.max(1, ...CATEGORY_LABELS.map(countFor));
  /* The document browser popup — opened by any card's View All / Browse,
     showing that category's documents (built-in PDFs and uploads alike). */
  const [browseCategory, setBrowseCategory] = useState<string | null>(null);
  const browseCard = CATEGORY_CARDS.find(c => c.label === browseCategory);
  const browseDocs = rows
    .filter(r => r.category === browseCategory && r.file)
    .map(r => ({ row: r, title: r.doc, version: r.id ? `v${r.version}` : MANUAL_POLICIES.find(m => m.file === r.file)?.version, file: r.file! }));

  /* 'All', or one category — set by the tabs above the table. */
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch(`${POLICIES_API}/documents/`);
        if (!r.ok || cancelled) return;
        const docs = (await r.json()) as ApiDocument[];
        if (!cancelled) setUploaded(docs.map(fromApi));
      } catch {
        /* see below */
      }
      try {
        const r = await apiFetch(`${POLICIES_API}/built-in/removed/`);
        if (!r.ok || cancelled) return;
        const data = (await r.json()) as { removed: string[]; canRemove: boolean };
        if (!cancelled) { setRemovedBuiltIns(data.removed); setCanRemoveBuiltIns(data.canRemove); }
      } catch {
        /* Server unreachable: the seed register still shows, which is the
           whole page minus what people uploaded. */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Add Document form — one form for every category, opened from a card's
  // "+ Add" (or the empty-table link) with that category preset.
  const [addPolicyOpen, setAddPolicyOpen] = useState(false);
  const [newDoc, setNewDoc] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORY_LABELS[0]);
  const [newDepartment, setNewDepartment] = useState(DEPARTMENTS[0]);
  const [newVersion, setNewVersion] = useState(1);
  const [newApprovedBy, setNewApprovedBy] = useState('');
  const [newReviewedBy, setNewReviewedBy] = useState('');
  const [newApprovalDate, setNewApprovalDate] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetAddPolicyForm() {
    setNewDoc(''); setNewCategory(CATEGORY_LABELS[0]); setNewDepartment(DEPARTMENTS[0]); setNewVersion(1);
    setNewApprovedBy(''); setNewReviewedBy(''); setNewApprovalDate(''); setNewFile(null); setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
  function openAddForm(category: string) {
    resetAddPolicyForm();
    setNewCategory(category);
    setAddPolicyOpen(true);
  }
  function closeAddForm() {
    if (saving) return;
    setAddPolicyOpen(false);
    resetAddPolicyForm();
  }

  /* Every field is mandatory — the backend refuses an upload missing any of
     them, so the button stays disabled until all are filled. Category,
     department and version always hold a value (selects / number input). */
  const formComplete = !!(newDoc.trim() && newApprovedBy.trim() && newReviewedBy.trim()
    && newApprovalDate && newDepartment && newFile);

  async function handleAddPolicy(e: FormEvent) {
    e.preventDefault();
    if (!formComplete || saving) return;

    const body = new FormData();
    body.append('title', newDoc.trim());
    body.append('category', newCategory);
    body.append('department', newDepartment);
    body.append('version', String(newVersion));
    body.append('approvedBy', newApprovedBy.trim());
    body.append('reviewedBy', newReviewedBy.trim());
    if (newApprovalDate) body.append('approvalDate', newApprovalDate);
    body.append('file', newFile);

    setSaving(true); setFormError('');
    try {
      const r = await apiFetch(`${POLICIES_API}/documents/`, { method: 'POST', body });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setFormError(data.error || (r.status === 401 ? 'Please sign in to add documents.' : 'Could not upload that document.'));
        return;
      }
      setUploaded(prev => [fromApi(data as ApiDocument), ...prev]);
      setNotice({ tone: 'ok', text: data.message || 'Document added.' });
      setAddPolicyOpen(false);
      resetAddPolicyForm();
    } catch {
      setFormError('Could not reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  /* Uploaded rows are deleted outright (row and file). A built-in PDF can't
     be — it's part of the build — so removing one records it as hidden. */
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  async function handleDelete(row: PolicyRow) {
    if (!row.canDelete || deletingKey) return;
    const builtIn = !row.id;
    if (!window.confirm(builtIn
      ? `Remove "${row.doc}" from the page for everyone?`
      : `Remove "${row.doc}" from ${row.category}? This deletes the file too.`)) return;
    setDeletingKey(rowKey(row));
    try {
      const r = builtIn
        ? await apiFetch(`${POLICIES_API}/built-in/removed/`, {
            method: 'POST', body: JSON.stringify({ file: row.file, title: row.doc }) })
        : await apiFetch(`${POLICIES_API}/documents/${row.id}/`, { method: 'DELETE' });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setNotice({ tone: 'error', text: data.error || 'Could not remove that document.' });
        return;
      }
      if (builtIn) setRemovedBuiltIns(prev => [...prev, row.file!]);
      else setUploaded(prev => prev.filter(u => u.id !== row.id));
      setNotice({ tone: 'ok', text: data.message || 'Document removed.' });
    } catch {
      setNotice({ tone: 'error', text: 'Could not reach the server. Please try again.' });
    } finally {
      setDeletingKey(null);
    }
  }

  const q = query.trim().toLowerCase();
  const filteredRows = useMemo(
    () => rows.filter(r =>
      (activeCategory === 'All' || r.category === activeCategory) &&
      (!q || r.doc.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.approvedBy.toLowerCase().includes(q))),
    [q, rows, activeCategory],
  );

  const summaryStats = useMemo(() => [
    { label: 'Total Documents', value: rows.length, icon: FolderOpen },
    { label: 'Total Pages', value: rows.reduce((sum, r) => sum + (r.pages ?? 0), 0), icon: FileText },
    /* A row awaiting the intranet's approval gate isn't an approved document. */
    { label: 'Total Approvals', value: rows.filter(r => r.moderationStatus !== 'pending' && r.moderationStatus !== 'rejected').length, icon: CheckCircle2 },
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
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Guidelines</h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white ring-1 ring-amber-200 text-[10px] font-black text-amber-600">
                    <AnimatedCount value={rows.length} /> documents
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">SOPs, policies, templates, work instructions and formats — add, find and manage them in one place.</p>
              </div>
            </div>
          </div>
        </div>

        {/* category cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORY_CARDS.map((c, i) => {
            const Icon = c.icon;
            const count = countFor(c.label);
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

                <div className="w-full mt-1 flex gap-1.5">
                  <button onClick={() => setBrowseCategory(c.label)}
                    className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-amber-300 text-amber-600
                                     text-[11px] font-black hover:bg-amber-50 transition-all">
                    {c.action}
                  </button>
                  <button onClick={() => openAddForm(c.label)} title={`Add ${c.singular}`}
                    className="shrink-0 inline-flex items-center gap-0.5 px-2 py-1.5 rounded-lg bg-amber-500 text-white
                               text-[11px] font-black shadow-sm shadow-amber-500/30 hover:bg-amber-600 transition-all">
                    <Plus className="w-3.5 h-3.5" />Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* search + table */}
        <div className="ih-reveal rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden" style={{ animationDelay: '100ms' }}>
          {/* category tabs — one register, sliced by kind of document */}
          <div className="px-4 pt-4 flex items-center gap-1.5 overflow-x-auto ih-scroll-clean">
            {['All', ...CATEGORY_LABELS].map(label => {
              const active = activeCategory === label;
              const n = label === 'All' ? rows.length : countFor(label);
              return (
                <button key={label} onClick={() => setActiveCategory(label)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-black transition-all
                             ${active ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {label}
                  <span className={`px-1.5 rounded-md text-[10px] ${active ? 'bg-white/25' : 'bg-slate-100 text-slate-400'}`}>{n}</span>
                </button>
              );
            })}
          </div>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="ih-spotlight relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 sm:w-80"
              onMouseMove={onSpotlightMove}>
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                type="text"
                placeholder="Search documents…"
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
                  <th className="px-2 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr key={rowKey(r)}
                    className={`ih-inview border-t border-slate-100 border-l-4 ${CATEGORY_BORDER[r.category] ?? 'border-l-transparent'}
                               hover:bg-amber-50/40 hover:shadow-[inset_0_0_0_9999px_rgba(245,158,11,.02)] transition-all`}
                    style={{ transitionDelay: `${i * 40}ms` }}>
                    <td className="px-4 py-3 text-slate-400 font-bold">{String(i + 1).padStart(2, '0')}</td>
                    <td className="px-4 py-3 font-black text-slate-900">
                      {r.file ? (
                        <a href={policyHref(r.file)} target="_blank" rel="noopener noreferrer"
                          className="hover:text-amber-600 hover:underline">
                          {r.department ? `${r.department} / ${r.doc}` : r.doc}
                        </a>
                      ) : (r.department ? `${r.department} / ${r.doc}` : r.doc)}
                      {r.moderationStatus === 'pending' && (
                        <span title="Only you can see this until an administrator approves it"
                          className="ml-2 inline-block align-middle px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[9.5px] font-black uppercase">
                          Awaiting approval
                        </span>
                      )}
                      {r.moderationStatus === 'rejected' && (
                        <span title={r.reviewNote || 'Not approved'}
                          className="ml-2 inline-block align-middle px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[9.5px] font-black uppercase">
                          Not approved
                        </span>
                      )}
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
                    {/* Only rows the viewer may remove get the icon: their own
                        uploads, or anything for a superadmin. */}
                    <td className="px-2 py-3 text-right">
                      {r.canDelete && (
                        <DeleteIcon label={r.doc} busy={deletingKey === rowKey(r)} onClick={() => handleDelete(r)} />
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr><td colSpan={9} className="text-center text-sm text-slate-400 py-10">
                    {q ? 'No documents match this search.' : (
                      <>No {activeCategory === 'All' ? 'documents' : activeCategory} yet.{' '}
                        <button onClick={() => openAddForm(activeCategory === 'All' ? 'Manual Policy' : activeCategory)}
                          className="font-black text-amber-600 hover:underline">
                          Add {activeCategory === 'All' ? 'one' : `a ${singularOf(activeCategory)}`}
                        </button>
                      </>
                    )}
                  </td></tr>
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
              <span className="text-sm font-black text-slate-900">Summary</span>
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

      {/* Document browser — a big, realistic document-picker popup, not a
          tucked-away dropdown. One popup for every category, coloured with
          that category's card gradient and icon. */}
      {browseCategory && browseCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          onClick={() => setBrowseCategory(null)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div onClick={e => e.stopPropagation()}
            className="ih-pop-in relative w-full max-w-5xl max-h-[88vh] flex flex-col rounded-3xl bg-white
                       shadow-[0_60px_120px_-30px_rgba(0,0,0,.5)] ring-1 ring-black/5 overflow-hidden">
            {/* header */}
            <div className="relative flex-shrink-0 overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${browseCard.gradient}`} />
              <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.9) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.9) 1px,transparent 1px)',
                         backgroundSize: '36px 36px' }} />
              <div className="relative flex items-center justify-between gap-4 px-6 sm:px-8 py-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
                    <browseCard.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">{browseCategory} Documents</h2>
                    <p className="text-white/85 text-sm font-medium mt-0.5">
                      {browseDocs.length} {browseDocs.length === 1 ? 'document' : 'documents'} · view or download any of them below
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => { setBrowseCategory(null); openAddForm(browseCategory); }}
                    className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-white text-slate-800 hover:bg-white/90
                               text-[12px] font-black shadow-sm transition-all">
                    <Plus className="w-4 h-4" />Add {browseCard.singular}
                  </button>
                  <button onClick={() => setBrowseCategory(null)} title="Close"
                    className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all">
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* document grid */}
            <div className="flex-1 overflow-y-auto ih-scroll-clean p-6 sm:p-8 bg-slate-50">
              {browseDocs.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center py-14 gap-3">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${browseCard.gradient} flex items-center justify-center shadow-md opacity-80`}>
                    <browseCard.icon className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">No {browseCategory} documents yet.</p>
                  <button onClick={() => { setBrowseCategory(null); openAddForm(browseCategory); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white
                               text-[12px] font-black shadow-sm shadow-amber-500/30 transition-all">
                    <Plus className="w-4 h-4" />Add the first {browseCard.singular}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {browseDocs.map((doc, i) => (
                  <div key={rowKey(doc.row)}
                    className="ih-inview group relative flex flex-col rounded-2xl bg-white border border-slate-200
                               shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-amber-300 transition-all p-4 overflow-hidden"
                    style={{ transitionDelay: `${i * 40}ms` }}>
                    {doc.row.canDelete && (
                      <DeleteIcon label={doc.title} busy={deletingKey === rowKey(doc.row)}
                        onClick={() => handleDelete(doc.row)} className="absolute top-2 right-2" />
                    )}
                    <div className={`flex items-start gap-3 mb-3 ${doc.row.canDelete ? 'pr-6' : ''}`}>
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${browseCard.gradient} flex items-center justify-center
                                      shadow-md flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                        <FileText className="w-5.5 h-5.5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-black text-slate-900 leading-snug">{doc.title}</p>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {doc.version && (
                            <span className="inline-block px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600
                                             ring-1 ring-amber-200 text-[10px] font-black">{doc.version}</span>
                          )}
                          {doc.row.department && (
                            <span className="inline-block px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-black">{doc.row.department}</span>
                          )}
                          {doc.row.moderationStatus === 'pending' && (
                            <span className="inline-block px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[9.5px] font-black uppercase">Awaiting approval</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto pt-2">
                      <a href={policyHref(doc.file)} target="_blank" rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200
                                   text-slate-600 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 text-[11px] font-black transition-all">
                        <Eye className="w-3.5 h-3.5" />View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* confirmation / error after an add or delete */}
      {notice && (
        <div role="status"
          className={`ih-pop-in fixed bottom-5 right-5 z-60 max-w-sm rounded-xl px-4 py-3 shadow-lg text-[13px] font-bold ring-1
                     ${notice.tone === 'ok' ? 'bg-white text-slate-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200'}`}>
          {notice.text}
        </div>
      )}

      {/* Add Document — uploads to the `policies` API (see the file header).
          The title follows the chosen category: "Add SOP", "Add Template"… */}
      {addPolicyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closeAddForm}>
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
                    <h2 className="text-lg font-black text-white tracking-tight truncate">Add {singularOf(newCategory)}</h2>
                    <p className="text-amber-50/90 text-[12px] font-medium">Upload a file and it's listed under {newCategory}</p>
                  </div>
                </div>
                <button type="button" onClick={closeAddForm} title="Close"
                  className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center flex-shrink-0 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto ih-scroll-clean">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Document Name<span className="text-rose-500"> *</span></label>
                <input value={newDoc} onChange={e => setNewDoc(e.target.value)} required
                  placeholder="e.g. Remote Work Policy"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800
                             placeholder:text-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Category<span className="text-rose-500"> *</span></label>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800
                               outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all">
                    {CATEGORY_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Department<span className="text-rose-500"> *</span></label>
                  <select value={newDepartment} onChange={e => setNewDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800
                               outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Version<span className="text-rose-500"> *</span></label>
                <input type="number" min={1} value={newVersion}
                  onChange={e => setNewVersion(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800
                             outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Approved By<span className="text-rose-500"> *</span></label>
                  <input value={newApprovedBy} onChange={e => setNewApprovedBy(e.target.value)} required
                    placeholder="e.g. Vimal Anand"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800
                               placeholder:text-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Reviewed By<span className="text-rose-500"> *</span></label>
                  <input value={newReviewedBy} onChange={e => setNewReviewedBy(e.target.value)} required
                    placeholder="e.g. Pankaj"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800
                               placeholder:text-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Approval Date<span className="text-rose-500"> *</span></label>
                <input type="date" value={newApprovalDate} onChange={e => setNewApprovalDate(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800
                             outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">File · PDF, Word, Excel or PowerPoint, up to 25 MB<span className="text-rose-500"> *</span></label>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-dashed transition-all text-left
                             ${newFile ? 'border-amber-300 bg-amber-50' : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'}`}>
                  <UploadCloud className={`w-5 h-5 flex-shrink-0 ${newFile ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-bold truncate ${newFile ? 'text-amber-700' : 'text-slate-400'}`}>
                    {newFile ? newFile.name : 'Click to choose a file…'}
                  </span>
                </button>
                <input ref={fileInputRef} type="file" accept={ACCEPTED_FILES} className="hidden"
                  onChange={e => setNewFile(e.target.files?.[0] ?? null)} />
              </div>

              {formError && (
                <p role="alert" className="rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3.5 py-2.5 text-[12.5px] font-bold text-rose-700">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button type="button" onClick={closeAddForm} disabled={saving}
                className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 text-[13px] font-bold transition-all disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={!formComplete || saving}
                className="ih-sheen inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600
                           hover:from-amber-600 hover:to-orange-700 text-white text-[13px] font-black shadow-md shadow-amber-200
                           transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Uploading…' : `Add ${singularOf(newCategory)}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default PoliciesPage;
