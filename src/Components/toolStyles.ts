/* Shared animation toolkit for every "legacy" tool page (Data Extractor,
   Appraisal, EOM, Performance, TA/DA, Letters Generator, PMS, SalesIQ) —
   keeps the visual language consistent with AdminPulse and the intranet
   home page without duplicating the same keyframes in eight places.
   Import once per page: <style>{TOOL_STYLES}</style> */
export const TOOL_STYLES = `
@keyframes tpReveal {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}
/* Entrance. IntranetShell's observer also tags these elements with data-in as
   they scroll past, which upgrades the one-shot entrance into a reveal that
   replays — see the .tp-reveal[data-in] rule below. */
.tp-reveal { animation: tpReveal .5s cubic-bezier(.2,.8,.2,1) both; }

/* Cards lift and bloom a soft shadow rather than just moving up: a card that
   translates with no shadow change reads as sliding, not rising. */
.tp-tilt { transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s cubic-bezier(.2,.8,.2,1); }
.tp-tilt:hover { transform: translateY(-4px); box-shadow: 0 18px 40px -18px rgba(15,23,42,.28); }

/* Inside the shell, tp-reveal becomes a scroll reveal instead of a one-shot
   entrance: IntranetShell observes .tp-reveal and toggles data-in, so cards
   further down a long page animate when you actually reach them, and again on
   re-entry. Every legacy card also picks up a hover lift here, which is why
   the ten large view files needed no edits.

   Guarded by html.ih-reveal-ready — the shell only sets that once the observer
   is confirmed running, so if it never attaches these stay visible rather than
   stuck at opacity:0 (an invisible card still swallows clicks). */
html.ih-reveal-ready .tp-reveal {
  animation: none;
  opacity: 0; transform: translateY(18px);
  transition: opacity .6s cubic-bezier(.2,.8,.2,1), transform .6s cubic-bezier(.2,.8,.2,1),
              box-shadow .3s cubic-bezier(.2,.8,.2,1);
}
html.ih-reveal-ready .tp-reveal[data-in] { opacity: 1; transform: none; }
html.ih-reveal-ready .tp-reveal[data-in]:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 36px -18px rgba(15,23,42,.26);
}

/* Ambient sheen for hero/stat surfaces — loops, unlike tp-sheen which is
   hover-only. Entrance-only motion reads as no motion once it has played. */
@keyframes tpSweep {
  from { transform: translateX(-120%) skewX(-18deg); }
  to { transform: translateX(320%) skewX(-18deg); }
}
.tp-sweep { position: relative; overflow: hidden; }
.tp-sweep::after {
  content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 28%; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.28), transparent);
  animation: tpSweep 6s ease-in-out infinite;
}

/* Shimmer placeholder for loading rows. */
@keyframes tpSkeleton { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.tp-skeleton {
  background: linear-gradient(90deg, #eef2f7 25%, #f8fafc 50%, #eef2f7 75%);
  background-size: 200% 100%; animation: tpSkeleton 1.4s ease-in-out infinite;
  border-radius: .75rem; color: transparent !important;
}

/* Gentle continuous bob for icons. */
@keyframes tpFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
.tp-float { animation: tpFloat 4.5s ease-in-out infinite; }

/* Animated gradient text for headings. */
@keyframes tpGradShift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
.tp-grad-text {
  background-size: 220% 220%; animation: tpGradShift 7s ease infinite;
  -webkit-background-clip: text; background-clip: text; color: transparent;
}

/* Rows in a table/list stagger in instead of appearing as one block. */
.tp-stagger > * { animation: tpReveal .5s cubic-bezier(.2,.8,.2,1) both; }
.tp-stagger > *:nth-child(1) { animation-delay: .03s }
.tp-stagger > *:nth-child(2) { animation-delay: .06s }
.tp-stagger > *:nth-child(3) { animation-delay: .09s }
.tp-stagger > *:nth-child(4) { animation-delay: .12s }
.tp-stagger > *:nth-child(5) { animation-delay: .15s }
.tp-stagger > *:nth-child(6) { animation-delay: .18s }
.tp-stagger > *:nth-child(7) { animation-delay: .21s }
.tp-stagger > *:nth-child(n+8) { animation-delay: .24s }

@keyframes tpSheenMove {
  from { transform: translateX(-130%) skewX(-12deg); }
  to { transform: translateX(230%) skewX(-12deg); }
}
.tp-sheen { position: relative; overflow: hidden; }
.tp-sheen::after {
  content: ''; position: absolute; top: 0; left: 0; height: 100%; width: 35%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent);
  opacity: 0; pointer-events: none;
}
.tp-sheen:hover::after { opacity: 1; animation: tpSheenMove .9s ease-in-out; }

@keyframes tpPulseGlow {
  0%,100% { opacity: .55; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.25); }
}
.tp-pulse-glow { animation: tpPulseGlow 2.2s ease-in-out infinite; }

@keyframes tpBorderSpin { to { --tp-angle: 360deg; } }
@property --tp-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.tp-border-flow { position: relative; }
.tp-border-flow::before {
  content: ''; position: absolute; inset: -1.5px; border-radius: inherit; padding: 1.5px;
  background: conic-gradient(from var(--tp-angle), var(--tp-c1,#22d3ee), var(--tp-c2,#8b5cf6), var(--tp-c1,#22d3ee));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  animation: tpBorderSpin 3.5s linear infinite; pointer-events: none;
}

@keyframes tpPopIn {
  0% { transform: scale(.6); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); }
}
.tp-pop-in { animation: tpPopIn .45s cubic-bezier(.2,.9,.25,1.2) both; }

@keyframes tpDrift {
  0%,100% { transform: translate(0,0) rotate(0deg); }
  50% { transform: translate(3%,-3%) rotate(1deg); }
}
.tp-drift { animation: tpDrift 22s ease-in-out infinite; }

@keyframes tpSpinSlow { to { transform: rotate(360deg); } }
.tp-spin-slow { animation: tpSpinSlow 18s linear infinite; }


/* Same contract as the intranet shell: looping motion is decorative, and for
   anyone who has asked the OS to reduce motion it is not a nice-to-have. */
@media (prefers-reduced-motion: reduce) {
  .tp-reveal,.tp-pop-in,.tp-drift,.tp-spin-slow,.tp-pulse-glow,.tp-border-flow::before,
  .tp-sheen:hover::after,.tp-sweep::after,.tp-skeleton,.tp-float,.tp-grad-text,.tp-stagger > *
  { animation: none !important; }
  .tp-reveal,.tp-stagger > * { opacity: 1 !important; transform: none !important; }
  html.ih-reveal-ready .tp-reveal { opacity: 1 !important; transform: none !important; transition: none; }
  html.ih-reveal-ready .tp-reveal[data-in]:hover,.tp-tilt:hover { transform: none; }
  .tp-skeleton { background: #eef2f7; }
}
`;
