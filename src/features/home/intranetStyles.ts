/* Animation toolkit for the intranet dashboard.
 *
 * Deliberately weighted toward CONTINUOUS motion, not just entrances.
 * Entrance-only animations play for half a second on mount and then the page
 * sits perfectly still — which reads to a user as "there are no animations".
 * Everything under "ambient" below loops forever so the dashboard always
 * feels alive. It's all CSS (no JS rAF loops), so it stays cheap.
 *
 * Injected once by IntranetShell via <style>{IH_STYLES}</style>, which means
 * every screen in the app can use these classes without importing anything.
 */
export const IH_STYLES = `
/* ── ambient: slow drifting blobs / aurora ─────────────────────────────── */
@keyframes ihDrift {
  0%,100% { transform: translate(0,0) rotate(0deg) scale(1); }
  33% { transform: translate(4%,-5%) rotate(2deg) scale(1.06); }
  66% { transform: translate(-3%,4%) rotate(-1.5deg) scale(.96); }
}
/* will-change: these animate transform for the entire life of the page, and
   carry a very large blur. Without a compositor layer the blur is re-rasterised
   every frame — the single most expensive thing on the dashboard. */
.ih-drift { animation: ihDrift 24s ease-in-out infinite; will-change: transform; }

@keyframes ihAurora {
  0%,100% { transform: translate(-8%,-6%) scale(1); opacity:.5; }
  50% { transform: translate(8%,6%) scale(1.25); opacity:.85; }
}
.ih-aurora { animation: ihAurora 18s ease-in-out infinite; will-change: transform, opacity; }

/* ── ambient: animated gradient fills + gradient text ──────────────────── */
@keyframes ihGradShift { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
.ih-grad-move { background-size: 220% 220%; animation: ihGradShift 9s ease infinite; }
.ih-grad-text {
  background-size: 220% 220%; animation: ihGradShift 7s ease infinite;
  -webkit-background-clip: text; background-clip: text; color: transparent;
}

/* ── ambient: sheen sweeping across a surface on a loop ────────────────── */
@keyframes ihSweep { from { transform: translateX(-120%) skewX(-18deg); } to { transform: translateX(320%) skewX(-18deg); } }
.ih-sweep { position: relative; overflow: hidden; }
.ih-sweep::after {
  content:''; position:absolute; top:0; bottom:0; left:0; width:28%; pointer-events:none;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
  animation: ihSweep 6s ease-in-out infinite;
}

/* ── ambient: pulsing glow / breathing ring ────────────────────────────── */
@keyframes ihPulseGlow { 0%,100% { opacity:.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.3); } }
.ih-pulse-glow { animation: ihPulseGlow 2.2s ease-in-out infinite; }

@keyframes ihBreathe { 0%,100% { box-shadow:0 0 0 0 var(--ih-ring, rgba(6,182,212,.45)); } 70% { box-shadow:0 0 0 12px transparent; } }
.ih-breathe { animation: ihBreathe 2.8s ease-out infinite; }

/* ── ambient: rotating conic border ────────────────────────────────────── */
@property --ih-angle { syntax:'<angle>'; inherits:false; initial-value:0deg; }
@keyframes ihBorderSpin { to { --ih-angle: 360deg; } }
.ih-border-flow { position: relative; }
.ih-border-flow::before {
  content:''; position:absolute; inset:-2px; border-radius:inherit; padding:2px;
  background: conic-gradient(from var(--ih-angle), #22d3ee, #8b5cf6, #f59e0b, #22d3ee);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  animation: ihBorderSpin 4s linear infinite; pointer-events:none;
}

/* ── ambient: slow spin, float, shimmer ────────────────────────────────── */
@keyframes ihSpinSlow { to { transform: rotate(360deg); } }
.ih-spin-slow { will-change: transform; animation: ihSpinSlow 18s linear infinite; }

@keyframes ihFloatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
.ih-float { will-change: transform; animation: ihFloatY 4.5s ease-in-out infinite; }

@keyframes ihShimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
.ih-shimmer {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent);
  background-size: 200% 100%; animation: ihShimmer 3s ease-in-out infinite;
}

/* ── ambient: marquee ticker (pauses on hover) ─────────────────────────── */
@keyframes ihTicker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.ih-ticker { animation: ihTicker 34s linear infinite; }
.ih-ticker-track:hover .ih-ticker { animation-play-state: paused; }

/* ── ambient: rising particles ─────────────────────────────────────────── */
@keyframes ihFloatUp {
  0% { transform: translateY(0); opacity:0; }
  10% { opacity:1; } 90% { opacity:1; }
  100% { transform: translateY(-120vh); opacity:0; }
}
.ih-particle { animation-name: ihFloatUp; animation-timing-function: linear;
               animation-iteration-count: infinite; will-change: transform, opacity; }

/* ── entrances (one-shot) ──────────────────────────────────────────────── */
@keyframes ihReveal { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
.ih-reveal { animation: ihReveal .6s cubic-bezier(.2,.8,.2,1) both; }

@keyframes ihFade { from { opacity:0; } to { opacity:1; } }
.ih-fade { animation: ihFade .5s ease both; }

@keyframes ihPopIn { 0% { transform:scale(.6); opacity:0; } 60% { transform:scale(1.08); opacity:1; } 100% { transform:scale(1); } }
.ih-pop-in { animation: ihPopIn .5s cubic-bezier(.2,.9,.25,1.2) both; }

@keyframes ihPaletteIn { from { opacity:0; transform:translateY(-10px) scale(.98); } to { opacity:1; transform:none; } }
.ih-palette-in { animation: ihPaletteIn .2s cubic-bezier(.2,.9,.25,1.1) both; }

/* Scroll-triggered reveal. IntranetShell sets data-in via an IntersectionObserver
   so cards animate every time they scroll into view, not only on first load.

   Deliberately VISIBLE by default: the hidden state is scoped to
   html.ih-reveal-ready, which the shell only sets once the observer is
   confirmed running. If the observer never attaches (unsupported browser, a
   crash, or an element rendered outside the shell) the content just shows
   normally instead of being stuck at opacity:0 — and an invisible element
   still swallows clicks, so failing visible is much safer than failing
   hidden. */
.ih-inview { transition: opacity .7s cubic-bezier(.2,.8,.2,1), transform .7s cubic-bezier(.2,.8,.2,1); }
html.ih-reveal-ready .ih-inview { opacity:0; transform: translateY(24px); }
html.ih-reveal-ready .ih-inview[data-in] { opacity:1; transform:none; }

/* ── interaction ───────────────────────────────────────────────────────── */
.ih-tilt { transition: transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s; }
.ih-tilt:hover { transform: translateY(-6px) scale(1.015); }

/* real 3D tilt — --rx/--ry are written by a mousemove handler */
.ih-tilt3d {
  transform: perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));
  transition: transform .2s ease-out, box-shadow .3s ease;
}

@keyframes ihSheenMove { from { transform:translateX(-130%) skewX(-12deg); } to { transform:translateX(230%) skewX(-12deg); } }
.ih-sheen { position:relative; overflow:hidden; }
.ih-sheen::after {
  content:''; position:absolute; top:0; left:0; height:100%; width:35%; opacity:0; pointer-events:none;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent);
}
.ih-sheen:hover::after { opacity:1; animation: ihSheenMove .9s ease-in-out; }

/* cursor-follow spotlight — --mx/--my are written by a mousemove handler */
.ih-spotlight { position:relative; }
.ih-spotlight::before {
  content:''; position:absolute; inset:0; pointer-events:none; opacity:0; border-radius:inherit;
  transition: opacity .3s ease;
  background: radial-gradient(240px circle at var(--mx,50%) var(--my,50%), rgba(99,102,241,.13), transparent 70%);
}
.ih-spotlight:hover::before { opacity:1; }

/* neon edge that lights up on hover */
.ih-neon { transition: box-shadow .35s ease, border-color .35s ease; }
.ih-neon:hover { box-shadow: 0 0 0 1px var(--ih-neon, #22d3ee), 0 10px 34px -10px var(--ih-neon, #22d3ee); }

/* ── surfaces: glass, mesh, glow ───────────────────────────────────────────── */
/* Frosted panel. Use over a mesh/aurora background — on flat white it just
   looks like a slightly grey card and costs a paint layer for nothing. */
.ih-glass {
  /* No backdrop-filter. Reducing it from 20px to 10px was treating a symptom:
     the cost of backdrop-filter is in doing it at all, not in the radius. It
     re-reads and re-blurs everything painted behind the element on every
     frame in which that content moves — and what is behind it here is a set
     of permanently animating aurora blobs, so it never stops paying.
     A slightly more opaque white over an already-soft background is visually
     within a hair of the frosted version and costs nothing. */
  background: rgba(255,255,255,.82);
  border: 1px solid rgba(255,255,255,.85);
  box-shadow: 0 8px 32px -12px rgba(15,23,42,.18), inset 0 1px 0 rgba(255,255,255,.9);
}

/* Slow-drifting colour wash for page/hero backgrounds. Sits behind content —
   always pair with a positioned child, never put text directly on it. */
@keyframes ihMesh {
  0%,100% { background-position: 0% 50%, 100% 50%, 50% 0%; }
  50%     { background-position: 100% 50%, 0% 50%, 50% 100%; }
}
.ih-mesh {
  background-image:
    radial-gradient(at 20% 20%, rgba(34,211,238,.20) 0px, transparent 55%),
    radial-gradient(at 80% 30%, rgba(139,92,246,.18) 0px, transparent 55%),
    radial-gradient(at 50% 85%, rgba(244,114,182,.14) 0px, transparent 55%);
  background-size: 180% 180%;
  animation: ihMesh 22s ease-in-out infinite;
}

/* Soft accent halo behind a card. --ih-halo sets the colour. */
.ih-halo { position: relative; }
.ih-halo::before {
  content:''; position:absolute; inset:-20%; border-radius:inherit; z-index:-1;
  background: radial-gradient(closest-side, var(--ih-halo, rgba(99,102,241,.28)), transparent);
  filter: blur(28px); opacity:.75; pointer-events:none;
  animation: ihPulseGlow 5s ease-in-out infinite;
}

/* ── interaction: lift, magnetic, ripple, underline ────────────────────────── */
/* Richer hover than ih-tilt: rises and blooms a coloured shadow. */
.ih-lift { transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s cubic-bezier(.2,.8,.2,1); }
.ih-lift:hover { transform: translateY(-4px); box-shadow: 0 18px 40px -16px var(--ih-lift, rgba(15,23,42,.32)); }

/* Cursor-tracked nudge — --mx/--my written by onMagneticMove. */
.ih-magnetic { transition: transform .25s cubic-bezier(.2,.8,.2,1); }
.ih-magnetic:hover { transform: translate(calc(var(--mx,0px) * .12), calc(var(--my,0px) * .12)); }

/* Animated underline for tabs and inline links. */
.ih-underline { position: relative; }
.ih-underline::after {
  content:''; position:absolute; left:0; right:0; bottom:-2px; height:2px; border-radius:2px;
  background: linear-gradient(90deg, #22d3ee, #8b5cf6);
  transform: scaleX(0); transform-origin: left; transition: transform .3s cubic-bezier(.2,.8,.2,1);
}
.ih-underline:hover::after, .ih-underline[data-active='true']::after { transform: scaleX(1); }

/* ── feedback: skeleton, scan, orbit ───────────────────────────────────────── */
/* Loading placeholder. Prefer this over a spinner for content that has shape —
   it tells the user what is coming, not merely that something is happening. */
@keyframes ihSkeleton { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.ih-skeleton {
  background: linear-gradient(90deg, #eef2f7 25%, #f8fafc 50%, #eef2f7 75%);
  background-size: 200% 100%; animation: ihSkeleton 1.4s ease-in-out infinite;
  border-radius: .75rem; color: transparent !important;
}

/* Scanline passing over a surface — for "processing" states. */
@keyframes ihScan { 0% { top:-30%; } 100% { top:130%; } }
.ih-scan { position: relative; overflow: hidden; }
.ih-scan::after {
  content:''; position:absolute; left:0; right:0; height:30%; pointer-events:none;
  background: linear-gradient(180deg, transparent, rgba(34,211,238,.16), transparent);
  animation: ihScan 2.2s ease-in-out infinite;
}

/* Dot orbiting an icon chip — live/syncing indicator. */
@keyframes ihOrbit { to { transform: rotate(360deg); } }
.ih-orbit { position:relative; }
.ih-orbit::after {
  content:''; position:absolute; inset:-4px; border-radius:9999px; pointer-events:none;
  background: conic-gradient(from 0deg, transparent 70%, var(--ih-orbit, #22d3ee));
  -webkit-mask: radial-gradient(closest-side, transparent 84%, #000 86%);
  mask: radial-gradient(closest-side, transparent 84%, #000 86%);
  animation: ihOrbit 3s linear infinite;
}

/* ── stagger: children reveal in sequence ──────────────────────────────────── */
/* Set on a parent; each child gets an increasing delay. Cheaper and tidier than
   writing style={{animationDelay}} on every item. */
.ih-stagger > * { animation: ihReveal .55s cubic-bezier(.2,.8,.2,1) both; }
.ih-stagger > *:nth-child(1) { animation-delay: .03s }
.ih-stagger > *:nth-child(2) { animation-delay: .07s }
.ih-stagger > *:nth-child(3) { animation-delay: .11s }
.ih-stagger > *:nth-child(4) { animation-delay: .15s }
.ih-stagger > *:nth-child(5) { animation-delay: .19s }
.ih-stagger > *:nth-child(6) { animation-delay: .23s }
.ih-stagger > *:nth-child(7) { animation-delay: .27s }
.ih-stagger > *:nth-child(8) { animation-delay: .31s }
.ih-stagger > *:nth-child(n+9) { animation-delay: .35s }


/* Respect the OS "reduce motion" setting — kill every looping animation.
   Ambient motion is decorative; for users who get motion sickness it is not
   a nice-to-have to switch it off. */
@media (prefers-reduced-motion: reduce) {
  .ih-drift,.ih-aurora,.ih-grad-move,.ih-grad-text,.ih-sweep::after,.ih-pulse-glow,.ih-breathe,
  .ih-border-flow::before,.ih-spin-slow,.ih-float,.ih-shimmer,.ih-ticker,.ih-particle,
  .ih-mesh,.ih-halo::before,.ih-skeleton,.ih-scan::after,.ih-orbit::after,.ih-stagger > *
  { animation: none !important; }
  html.ih-reveal-ready .ih-inview { opacity:1; transform:none; transition:none; }
  .ih-tilt3d,.ih-magnetic:hover,.ih-lift:hover { transform:none; }
  /* the skeleton still needs to read as a placeholder without its shimmer */
  .ih-skeleton { background:#eef2f7; }
}

/* ── the frosted-glass tax ──────────────────────────────────────────────────
 *
 * There were 76 backdrop-blur utilities across the app, 40 of them at -xl
 * (24px). backdrop-filter is the most expensive thing a page can ask a
 * browser for: the element cannot be drawn until everything painted behind it
 * has been captured and blurred, and that work is redone whenever the content
 * behind moves. Behind these panels sit permanently animating aurora blobs,
 * so "whenever the content behind moves" means every single frame, forever —
 * on every screen at once, because these utilities are spread across the
 * whole app rather than concentrated on the home page.
 *
 * That is what made clicks and animations feel like slow motion: the
 * compositor never got a chance to go idle, so input handling and animation
 * frames queued behind blur work.
 *
 * Killing the filter and leaning on the translucent background that these
 * elements already carry is visually almost indistinguishable here — the
 * backdrop is a soft pastel wash, so blurring it changes very little — and it
 * removes the cost entirely. The panels stay translucent; they simply stop
 * re-blurring the page behind them sixty times a second.
 *
 * If a specific panel ever genuinely needs frosting (over a photo, say), add
 * .ih-frost to it — that one opts back in, deliberately and in one place. */
[class*="backdrop-blur"]:not(.ih-frost) {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* Without the blur, a very transparent panel reads as washed-out rather than
   frosted, so the thinnest tiers get enough white to keep text legible. */
[class*="backdrop-blur"]:not(.ih-frost):is(
  [class*="bg-white/5"],[class*="bg-white/6"],[class*="bg-white/7"]
) { background-color: rgba(255,255,255,.86); }

.ih-frost {
  backdrop-filter: blur(10px) saturate(1.4);
  -webkit-backdrop-filter: blur(10px) saturate(1.4);
}

/* The halo is a 28px-blurred pseudo-element animating scale and opacity, used
   on eleven cards. Promote it so the blur is rasterised once and the loop runs
   on the compositor instead of repainting. */
.ih-halo::before { will-change: transform, opacity; }
`;
