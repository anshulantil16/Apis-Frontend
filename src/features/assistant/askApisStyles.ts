/* Ask APIS's own animations and honey styling, prefixed `aa-` so nothing
 * else on the page picks them up. Put on the page once, by AskApisButton. */

/* A faint honeycomb, drawn behind the panel's content. */
const HONEYCOMB = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='48' viewBox='0 0 28 48'%3E%3Cpath d='M14 0l14 8v16l-14 8L0 24V8z M14 32l14 8v16 M14 32L0 40v16' fill='none' stroke='%23F5B301' stroke-opacity='.13' stroke-width='1.2'/%3E%3C/svg%3E")`;

export const ASK_APIS_STYLES = `
.aa-card {
  background-color: #FFF9E6;
  background-image: ${HONEYCOMB}, linear-gradient(180deg, #FFFDF5 0%, #FFF6D6 55%, #FFEFB8 100%);
  background-size: 28px 48px, 100% 100%;
}
.aa-hand { font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive; }

@keyframes aaPanelIn { from { opacity: 0; transform: translateY(18px) scale(.94); } to { opacity: 1; transform: none; } }
.aa-panel-in { transform-origin: bottom right; animation: aaPanelIn .38s cubic-bezier(.2,.9,.25,1.15) both; }

@keyframes aaMsgIn { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
.aa-msg-in { animation: aaMsgIn .32s cubic-bezier(.2,.9,.25,1.1) both; }

@keyframes aaBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
.aa-bob { animation: aaBob 2.8s ease-in-out infinite; }
.aa-bob-fast { animation: aaBob .8s ease-in-out infinite; }

@keyframes aaFlapL { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-16deg) scaleY(.92); } }
@keyframes aaFlapR { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(16deg) scaleY(.92); } }
.aa-wing-l, .aa-wing-r { transform-box: fill-box; transform-origin: 50% 100%; }
.aa-wing-l { animation: aaFlapL .22s ease-in-out infinite; }
.aa-wing-r { animation: aaFlapR .22s ease-in-out infinite; }

@keyframes aaBlink { 0%, 93%, 100% { transform: scaleY(1); } 96% { transform: scaleY(.1); } }
.aa-eyes { transform-box: fill-box; transform-origin: center; animation: aaBlink 4.2s infinite; }

@keyframes aaWave { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-22deg); } 75% { transform: rotate(14deg); } }
.aa-wave { transform-box: fill-box; transform-origin: 90% 100%; animation: aaWave 1.5s ease-in-out infinite; }

@keyframes aaDot { 0%, 80%, 100% { transform: translateY(0); opacity: .35; } 40% { transform: translateY(-4px); opacity: 1; } }
.aa-dot { animation: aaDot 1.1s infinite; }
.aa-dot:nth-child(2) { animation-delay: .15s; }
.aa-dot:nth-child(3) { animation-delay: .3s; }

@keyframes aaTwinkle { 0%, 100% { opacity: .25; transform: scale(.6) rotate(0); } 50% { opacity: 1; transform: scale(1) rotate(20deg); } }
.aa-twinkle { animation: aaTwinkle 2.2s ease-in-out infinite; }

@keyframes aaPulse { 0% { box-shadow: 0 0 0 0 rgba(251,176,36,.55); } 70% { box-shadow: 0 0 0 16px rgba(251,176,36,0); } 100% { box-shadow: 0 0 0 0 rgba(251,176,36,0); } }
.aa-pulse { animation: aaPulse 2.4s ease-out infinite; }

@keyframes aaBuzz {
  0% { transform: translate(0, 0) rotate(-8deg); } 25% { transform: translate(-10px, -6px) rotate(6deg); }
  50% { transform: translate(-4px, 6px) rotate(-4deg); } 75% { transform: translate(6px, -3px) rotate(8deg); }
  100% { transform: translate(0, 0) rotate(-8deg); }
}
.aa-buzz { animation: aaBuzz 5s ease-in-out infinite; }

@keyframes aaCaret { 50% { opacity: 0; } }
.aa-caret { display: inline-block; width: 2px; height: 1em; margin-left: 1px; vertical-align: -2px; background: #F59E0B; animation: aaCaret .8s steps(1) infinite; }

@keyframes aaDrip { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.18); } }
.aa-drip { transform-box: fill-box; transform-origin: top; animation: aaDrip 3.4s ease-in-out infinite; }

.aa-chip { transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease; }
.aa-chip:hover { transform: translateY(-2px); box-shadow: 0 8px 18px -10px rgba(194,120,3,.55); }

.aa-scroll::-webkit-scrollbar { width: 6px; }
.aa-scroll::-webkit-scrollbar-thumb { background: rgba(217,150,20,.35); border-radius: 9999px; }

@media (prefers-reduced-motion: reduce) {
  .aa-panel-in, .aa-msg-in, .aa-bob, .aa-bob-fast, .aa-wing-l, .aa-wing-r, .aa-eyes, .aa-wave,
  .aa-dot, .aa-twinkle, .aa-pulse, .aa-buzz, .aa-caret, .aa-drip { animation: none; }
}
`;
