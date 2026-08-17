# Intranet design system

Every screen renders inside `IntranetShell`, which owns the sidebar + header and
injects `IH_STYLES` globally. **Any tool can use the `ih-*` classes below with no
import.** Follow this so a tool never looks like a different product when opened.

## Theme

**The app is light. There are no dark-themed pages.** A dark panel inside the
light shell reads as a different, older product — that was the single biggest
visual inconsistency in this codebase and it is not to be reintroduced.

| Token | Value |
|---|---|
| Page background | inherit the shell's `#f5f7fa` — set no `bg-*` on the page root, or `bg-[#f5f7fa]` if you need it explicit |
| Page root sizing | `min-h-full` (never `h-screen`/`min-h-screen` — the shell already owns the viewport) |
| Card | `rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm` |
| Card (solid) | `rounded-2xl bg-white border border-slate-200 shadow-sm` |
| Section heading | `text-[11px] font-black text-slate-400 uppercase tracking-widest` |
| Card title | `text-[14px] font-black text-slate-900` |
| Body text | `text-[12px] text-slate-500 leading-relaxed` |
| Icon chip | `w-9 h-9 rounded-xl bg-<c>-50 flex items-center justify-center` + icon `w-4.5 h-4.5 text-<c>-600` |
| Primary button | `ih-sheen px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-black shadow-lg shadow-cyan-500/25` |
| Secondary button | `px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold hover:border-cyan-300 hover:text-cyan-700` |
| Radius | `rounded-2xl` for cards, `rounded-xl` for controls/chips |

Accent colours are per-tool (see `QUICK_ACCESS` in `IntranetHomeShared.tsx` —
each tool has `accent`, `soft`, `gradient`, `glow`). Use the tool's own accent
so screens are distinguishable without being a different design.

## Motion (`ih-*`, injected globally by the shell)

Prefer **ambient** (looping) motion over entrance-only. A page whose animations
all finish in 600ms reads to a user as having no animation at all.

| Class | Use for |
|---|---|
| `ih-inview` | scroll-triggered reveal — **default for cards**; replays on re-entry |
| `ih-tilt3d` + `onMouseMove={onTilt3dMove}` `onMouseLeave={onTilt3dLeave}` | 3D cursor tilt on cards |
| `ih-spotlight` | cursor-follow glow (pairs with tilt3d) |
| `ih-neon` + `style={{'--ih-neon': accentRgba}}` | coloured edge glow on hover |
| `ih-sheen` | one-shot light sweep on hover — buttons |
| `ih-sweep` | **looping** light sweep — hero/stat surfaces |
| `ih-aurora` / `ih-drift` | ambient background blobs |
| `ih-float` | gentle continuous bob — icons |
| `ih-pulse-glow` | breathing dot — live/status indicators |
| `ih-grad-text` | animated gradient text — page headings |
| `ih-ticker` (+ `ih-ticker-track` parent) | marquee; pauses on hover |
| `ih-border-flow` | rotating conic border — use on **one** hero element per screen |
| `ih-reveal` / `ih-fade` / `ih-pop-in` | one-shot entrances |

`ih-inview` needs **no setup** — `IntranetShell` runs a single global
IntersectionObserver (plus a MutationObserver, so content mounted later by a
tool page is picked up automatically). Do **not** write a local
`useScrollReveal` hook in a page; it's redundant. Note the flip side: an
element with `ih-inview` is `opacity:0` until observed, so never put it on
something rendered outside the shell.

Pointer helpers (`onTilt3dMove`, `onTilt3dLeave`, `onSpotlightMove`) are plain
functions — copy the ~8-line implementations from `IntranetHomePage.tsx`.

`prefers-reduced-motion: reduce` disables every looping animation — do not
re-add motion via inline styles that bypass that block.

## Rules

1. **No page draws its own sidebar, top-level header, or "back to home" button.**
   The shell owns all of it.
2. **No `h-screen` / `min-h-screen`** on a page root — double-counts the header.
3. Tool headers are `relative z-20`, never `sticky z-50` (the shell header is
   the sticky one, at `z-30`).
4. Never build a Tailwind class by string concatenation
   (`` `hover:${x}` ``) — Tailwind only detects complete literal class names,
   so it silently produces no CSS. Store the full class string in data instead.

## Legacy note

`src/Components/toolStyles.ts` (`tp-*`) predates this and is a subset of
`ih-*`. It still works and is still injected by some tool pages; prefer `ih-*`
for anything new, since it's global and has the ambient set.
