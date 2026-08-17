/* The single application frame for the whole intranet.
 *
 * Every screen — the home dashboard and every tool — renders INSIDE this shell,
 * so the sidebar and header are identical everywhere and only the centre
 * content changes. Tools must NOT ship their own sidebar, their own top-level
 * header, or their own "back to home" button: this shell owns all of that.
 *
 * Before this existed each tool carried a bespoke dark sidebar of its own, so
 * opening any tool visually threw you back into a different, older-looking
 * product. If you are adding a new tool, add it to QUICK_ACCESS/NAV_GROUPS in
 * IntranetHomeShared.tsx and render its body as `children` here.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  Search, Bell, ChevronDown, Home as HomeIcon, LayoutGrid, Menu, Building2, Command, CornerDownLeft,
} from 'lucide-react';
import {
  QUICK_ACCESS, NAV_GROUPS, COMING_SOON, IH_STYLES, type QuickAccessId,
} from './IntranetHomeShared';

/* Views the shell can highlight. 'home' plus every tool id, plus a couple of
   sub-views that live under a parent tool (approvals sits under letters). */
export type ShellView = QuickAccessId | 'home' | 'offer-approvals';

interface Props {
  active: ShellView;
  onNavigate: (id: ShellView) => void;
  children: ReactNode;
  /** Optional per-tool secondary nav, rendered in the sidebar under the tool list. */
  subNav?: ReactNode;
  /** Optional per-tool title shown in the header, e.g. "Data Extractor". */
  title?: string;
  subtitle?: string;
}

/* Sub-views map back to the tool that owns them so the sidebar still
   highlights the right entry when you're deep inside a tool. */
const PARENT_OF: Partial<Record<ShellView, QuickAccessId>> = {
  'offer-approvals': 'offer-letters',
};

export function IntranetShell({ active, onNavigate, children, subNav, title, subtitle }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(new Date());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const paletteInputRef = useRef<HTMLInputElement>(null);

  const activeTool = PARENT_OF[active] ?? active;

  /* All groups start CLOSED — the sidebar shows just the four category names
   * and the user opens whichever they want. Groups are independent, so
   * opening one doesn't close the others.
   *
   * `go()` still expands the destination's group on navigate, so if you jump
   * to a tool via ⌘K or a dashboard card the sidebar shows where you landed. */
  const groupOf = (id: string) => NAV_GROUPS.find(g => g.items.some(i => i.id === id))?.label ?? null;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(iv);
  }, []);

  /* Global scroll-reveal driver.
   *
   * Runs here — the one component wrapping every screen — so `.ih-inview`
   * just works anywhere in the app and no page has to wire up its own hook. */
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;   // CSS leaves content visible

    const io = new IntersectionObserver(
      entries => entries.forEach(en => en.target.classList.toggle('is-in', en.isIntersecting)),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );

    // Only hide-then-reveal once we know the observer is actually running.
    // Without this the CSS would hide content unconditionally, and any failure
    // to observe would leave it invisible — and invisible elements still
    // swallow clicks, which is a far worse failure than "no animation".
    document.documentElement.classList.add('ih-reveal-ready');

    document.querySelectorAll('.ih-inview').forEach(el => io.observe(el));

    /* Tool pages mount their content long after the shell and swap it on every
     * navigation, so we track adds AND removes.
     *
     * Unobserving on removal is not optional: an IntersectionObserver keeps
     * processing every target it was given, so without this each tool you open
     * leaves its cards in the observer forever. After a few navigations the
     * observer is recomputing intersections for hundreds of detached nodes on
     * every scroll and layout — the main thread janks and clicks stop landing.
     *
     * Walking only the changed subtrees (rather than re-querying the whole
     * document) keeps this proportional to what actually changed. */
    const eachTarget = (n: Node, fn: (el: Element) => void) => {
      if (!(n instanceof Element)) return;
      if (n.matches('.ih-inview')) fn(n);
      n.querySelectorAll('.ih-inview').forEach(fn);
    };
    const mo = new MutationObserver(records => {
      for (const rec of records) {
        rec.removedNodes.forEach(n => eachTarget(n, el => io.unobserve(el)));
        rec.addedNodes.forEach(n => eachTarget(n, el => io.observe(el)));
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      document.documentElement.classList.remove('ih-reveal-ready');
    };
  }, []);

  // Resets query/selection and focuses the input — called from every path
  // that opens the palette, so there's no effect reacting to paletteOpen
  // (an effect that calls setState the instant it fires just adds an extra
  // render for no benefit — doing the reset at the point of opening is both
  // simpler and one render cheaper).
  const openPalette = () => {
    setPaletteQuery(''); setPaletteIndex(0); setPaletteOpen(true);
    setTimeout(() => paletteInputRef.current?.focus(), 10);
  };

  // Global ⌘K / Ctrl+K — the fast path power users expect from any modern app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (paletteOpen) setPaletteOpen(false); else openPalette();
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen]);

  const toggleGroup = (label: string) => setOpenGroups(g => ({ ...g, [label]: !g[label] }));

  // Recent-tool tracking happens centrally in App.tsx's navigate(), so every
  // path (this shell, ⌘K, or a click inside a page's own content) is covered.
  // Also expands the destination's group, so arriving via ⌘K or a card on the
  // home page still leaves the sidebar showing where you are.
  const go = (id: ShellView) => {
    setPaletteOpen(false);
    const g = groupOf(id);
    if (g) setOpenGroups(prev => ({ ...prev, [g]: true }));
    onNavigate(id);
  };

  const pq = paletteQuery.trim().toLowerCase();
  const paletteResults = useMemo(() => (
    pq
      ? QUICK_ACCESS.filter(t => t.label.toLowerCase().includes(pq) || t.desc.toLowerCase().includes(pq))
      : QUICK_ACCESS
  ), [pq]);

  const onPaletteKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setPaletteIndex(i => Math.min(i + 1, paletteResults.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setPaletteIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && paletteResults[paletteIndex]) { go(paletteResults[paletteIndex].id); }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex">
      <style>{IH_STYLES}</style>

      {/* ── Sidebar — identical on every screen ─────────────────────────── */}
      <aside className={`${collapsed ? 'w-[76px]' : 'w-64'} bg-[#0a0d14] flex flex-col flex-shrink-0 h-screen
                         sticky top-0 overflow-y-auto overflow-x-hidden transition-all duration-300`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-3 border-b border-white/[0.06]`}>
          <button onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <Menu className="w-5 h-5" />
          </button>
          {!collapsed && <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Menu</span>}
        </div>

        <nav className="flex-1 p-2.5 pt-4">
          <button onClick={() => go('home')} title="Home"
            className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-[13px] font-black mb-1.5 transition-all
                       ${active === 'home'
                         ? 'bg-gradient-to-r from-cyan-500/15 to-violet-500/15 text-cyan-300 ring-1 ring-cyan-500/20'
                         : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                       ${collapsed ? 'justify-center' : ''}`}>
            <HomeIcon className="w-4 h-4 flex-shrink-0" />{!collapsed && 'Home'}
          </button>

          {!collapsed && <p className="px-2.5 pt-3 pb-1.5 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Tools</p>}
          {NAV_GROUPS.map(group => {
            const GIcon = group.icon;
            const open = !!openGroups[group.label];
            const hasActive = group.items.some(i => i.id === activeTool);
            return (
              <div key={group.label} className="mb-0.5">
                <button
                  onClick={() => { if (collapsed) setCollapsed(false); toggleGroup(group.label); }}
                  title={group.label}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-bold transition-all
                             ${hasActive ? group.accent : 'text-slate-400 hover:text-slate-200'} hover:bg-white/5
                             ${collapsed ? 'justify-center' : 'justify-between'}`}>
                  <span className="flex items-center gap-2.5"><GIcon className="w-3.5 h-3.5 flex-shrink-0" />{!collapsed && group.label}</span>
                  {!collapsed && <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />}
                </button>
                {!collapsed && (
                  // max-h-96 (not max-h-60): the ceiling has to clear the
                  // tallest group or its last items get silently clipped off
                  // and become unclickable.
                  <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96' : 'max-h-0'}`}>
                    {group.items.map(item => {
                      const on = item.id === activeTool;
                      return (
                        <button key={item.id} onClick={() => go(item.id)}
                          className={`w-full flex items-center gap-2 pl-9 pr-2.5 py-2 rounded-lg text-[12px] font-semibold transition-all
                                     ${on ? `bg-white/10 ${group.accent}` : `text-slate-300 hover:bg-white/5 ${group.hoverAccent}`}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${on ? `${group.dot} ih-pulse-glow` : 'bg-slate-500'}`} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Per-tool secondary nav (e.g. Data Extractor's individual tools) */}
          {!collapsed && subNav}

          {!collapsed && (
            <>
              <p className="px-2.5 pt-4 pb-1.5 text-[9px] font-bold text-slate-600 uppercase tracking-widest">About APIS</p>
              <button onClick={() => go('home')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-bold
                           text-slate-300 hover:bg-white/5 hover:text-amber-300 transition-all">
                <Building2 className="w-3.5 h-3.5" />Our Products
              </button>

              {/* These are genuinely not built yet. They're dimmed and
                  `cursor-not-allowed` on purpose so it's obvious they differ
                  from the live tools above — which must NOT look dimmed. */}
              <p className="px-2.5 pt-4 pb-1.5 text-[9px] font-bold text-slate-600 uppercase tracking-widest">More</p>
              {COMING_SOON.map(c => {
                const CIcon = c.icon;
                return (
                  <div key={c.label} title={`${c.label} — not available yet`}
                    className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[12px]
                               font-semibold text-slate-600 cursor-not-allowed opacity-60">
                    <span className="flex items-center gap-2.5"><CIcon className="w-3.5 h-3.5" />{c.label}</span>
                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-slate-500">Soon</span>
                  </div>
                );
              })}
            </>
          )}
        </nav>

        {!collapsed && (
          <div className="p-3.5 border-t border-white/[0.06]">
            <p className="text-[9px] text-slate-600 font-semibold text-center">
              {now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
        )}
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-200">
          <div className="px-7 py-3 flex items-center gap-5">
            <div className="hidden lg:flex items-center gap-3 pr-5 border-r border-slate-200">
              <img src="/logo.png" alt="APIS" className="w-9 h-9 object-contain flex-shrink-0" />
              <div className="leading-none">
                <p className="text-[13px] font-black text-slate-900 tracking-tight">
                  {title || 'APIS Internal Tools'}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                  {subtitle || 'Enterprise Platform'}
                </p>
              </div>
            </div>

            <button onClick={openPalette}
              className="relative flex-1 max-w-md flex items-center gap-2 pl-9 pr-3 py-2 rounded-xl bg-slate-100
                         border border-transparent text-sm text-slate-400 hover:bg-slate-200/70 transition-all text-left">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              Search tools…
              <span className="ml-auto hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white
                               border border-slate-200 text-[10px] font-bold text-slate-400">
                <Command className="w-2.5 h-2.5" />K
              </span>
            </button>

            <div className="ml-auto flex items-center gap-3">
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50
                               ring-1 ring-emerald-200 text-[10px] font-black uppercase tracking-wide text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ih-pulse-glow" />Live · QA
              </span>
              <button className="relative p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
              </button>
              <button onClick={() => go('home')} title="All tools"
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center
                           justify-center text-white shadow-md shadow-cyan-500/25 hover:scale-105 transition-transform">
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 min-h-0">{children}</div>
      </main>

      {/* ── Command palette — ⌘K / Ctrl+K from anywhere in the app ─────────── */}
      {paletteOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4
                        bg-slate-900/40 backdrop-blur-sm" onClick={() => setPaletteOpen(false)}>
          <div onClick={e => e.stopPropagation()}
            className="ih-palette-in w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input ref={paletteInputRef} value={paletteQuery}
                onChange={e => { setPaletteQuery(e.target.value); setPaletteIndex(0); }}
                onKeyDown={onPaletteKey}
                placeholder="Jump to a tool…"
                className="flex-1 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none" />
              <kbd className="text-[10px] font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-100">esc</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto py-1.5">
              {paletteResults.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400">No tools match "{paletteQuery}"</p>
              ) : paletteResults.map((t, i) => {
                const Icon = t.icon;
                const on = i === paletteIndex;
                return (
                  <button key={t.id} onMouseEnter={() => setPaletteIndex(i)} onClick={() => go(t.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${on ? 'bg-cyan-50' : 'hover:bg-slate-50'}`}>
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.gradient} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-slate-800">{t.label}</p>
                      <p className="text-[11px] text-slate-400 truncate">{t.desc}</p>
                    </div>
                    {on && <CornerDownLeft className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-100">↑↓</kbd>navigate</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-100">↵</kbd>open</span>
              <span className="flex items-center gap-1 ml-auto"><Command className="w-2.5 h-2.5" />K anywhere</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IntranetShell;
