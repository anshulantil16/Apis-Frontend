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
.tp-reveal { animation: tpReveal .5s cubic-bezier(.2,.8,.2,1) both; }

.tp-tilt { transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s; }
.tp-tilt:hover { transform: translateY(-4px); }

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
`;
