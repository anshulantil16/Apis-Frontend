/* Ask APIS's bee. Drawn rather than an image so its wings can flap, its eyes
 * blink and its arm wave - the animations live in ASK_APIS_STYLES (the
 * `aa-` classes), which the assistant puts on the page. */
import { useId } from 'react';

export function BeeMascot({ size = 96, waving = false, busy = false, still = false, className = '' }: {
  size?: number;
  /* Waves hello - on the start screen. */
  waving?: boolean;
  /* Bobs faster while an answer is being put together. */
  busy?: boolean;
  /* No bobbing - for the small avatar beside each answer. */
  still?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const body = `aa-body-${id}`, head = `aa-head-${id}`, clip = `aa-clip-${id}`, wing = `aa-wing-${id}`;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden
      className={`${still ? '' : busy ? 'aa-bob-fast' : 'aa-bob'} ${className}`}>
      <defs>
        <radialGradient id={body} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#FFE58A" />
          <stop offset="60%" stopColor="#FFC83D" />
          <stop offset="100%" stopColor="#F29F05" />
        </radialGradient>
        <radialGradient id={head} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#FFEFA8" />
          <stop offset="55%" stopColor="#FFD24D" />
          <stop offset="100%" stopColor="#F5A70A" />
        </radialGradient>
        <linearGradient id={wing} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".95" />
          <stop offset="100%" stopColor="#CFEAFF" stopOpacity=".75" />
        </linearGradient>
        <clipPath id={clip}><ellipse cx="66" cy="82" rx="30" ry="25" /></clipPath>
      </defs>

      {/* Wings, behind everything. The tilt sits on the group because the
          flap animation sets the ellipse's own transform. */}
      <g transform="rotate(-28 56 30)">
        <ellipse className="aa-wing-l" cx="56" cy="30" rx="15" ry="22"
          fill={`url(#${wing})`} stroke="#A9D6F5" strokeWidth="1.5" />
      </g>
      <g transform="rotate(24 84 34)">
        <ellipse className="aa-wing-r" cx="84" cy="34" rx="14" ry="21"
          fill={`url(#${wing})`} stroke="#A9D6F5" strokeWidth="1.5" />
      </g>

      {/* Body and stripes. */}
      <path d="M94 88 l12 6 l-12 2 z" fill="#3B2A1A" />
      <ellipse cx="66" cy="82" rx="30" ry="25" fill={`url(#${body})`} stroke="#C77C00" strokeWidth="1.5" />
      <g clipPath={`url(#${clip})`} fill="#3B2A1A">
        <rect x="68" y="50" width="8" height="70" rx="3" transform="rotate(12 72 82)" />
        <rect x="84" y="50" width="8" height="70" rx="3" transform="rotate(12 88 82)" />
      </g>

      {/* Waving arm, or a resting one. */}
      {waving ? (
        <g className="aa-wave">
          <path d="M38 76 Q28 66 26 56" stroke="#3B2A1A" strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="25.5" cy="53.5" r="5" fill="#FFD24D" stroke="#C77C00" strokeWidth="1.5" />
        </g>
      ) : (
        <path d="M40 84 Q34 92 38 98" stroke="#3B2A1A" strokeWidth="5" strokeLinecap="round" fill="none" />
      )}

      {/* Antennae. */}
      <path d="M44 26 Q38 12 30 10" stroke="#3B2A1A" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M60 24 Q64 10 72 7" stroke="#3B2A1A" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="29" cy="10" r="4.5" fill="#3B2A1A" />
      <circle cx="73" cy="7" r="4.5" fill="#3B2A1A" />

      {/* Head and face. */}
      <circle cx="52" cy="50" r="27" fill={`url(#${head})`} stroke="#C77C00" strokeWidth="1.5" />
      <g className="aa-eyes">
        <ellipse cx="42" cy="48" rx="5.5" ry="7" fill="#2A1B0F" />
        <ellipse cx="62" cy="48" rx="5.5" ry="7" fill="#2A1B0F" />
        <circle cx="44" cy="45" r="2.2" fill="#fff" />
        <circle cx="64" cy="45" r="2.2" fill="#fff" />
      </g>
      <ellipse cx="34" cy="59" rx="5" ry="3.2" fill="#FF8A80" opacity=".6" />
      <ellipse cx="70" cy="59" rx="5" ry="3.2" fill="#FF8A80" opacity=".6" />
      <path d="M44 61 Q52 69 60 61" stroke="#2A1B0F" strokeWidth="3" strokeLinecap="round" fill="#B23A2E" />
    </svg>
  );
}
