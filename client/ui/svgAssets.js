// SVG Asset Generators for Anime & Game HUD Visuals

export function ScannerRadarSVG() {
  return `
    <svg viewBox="0 0 200 200" class="w-36 h-36 md:w-44 md:h-44 mx-auto drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
      <defs>
        <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#c026d3" stop-opacity="0.3" />
          <stop offset="70%" stop-color="#7e22ce" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#3b0764" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="sweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a855f7" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#ec4899" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Background Glow Circle -->
      <circle cx="100" cy="100" r="90" fill="url(#radarGrad)" stroke="#7e22ce" stroke-width="1.5" stroke-dasharray="4 4" />
      <circle cx="100" cy="100" r="65" fill="none" stroke="#a855f7" stroke-width="1" stroke-opacity="0.4" />
      <circle cx="100" cy="100" r="40" fill="none" stroke="#ec4899" stroke-width="1" stroke-opacity="0.6" />
      <circle cx="100" cy="100" r="15" fill="none" stroke="#f472b6" stroke-width="1.5" />

      <!-- Crosshairs -->
      <line x1="10" y1="100" x2="190" y2="100" stroke="#a855f7" stroke-width="1" stroke-opacity="0.3" />
      <line x1="100" y1="10" x2="100" y2="190" stroke="#a855f7" stroke-width="1" stroke-opacity="0.3" />

      <!-- Rotating Scanner Beam -->
      <g class="animate-spin-slow origin-center">
        <polygon points="100,100 190,100 170,40" fill="url(#sweepGrad)" />
        <line x1="100" y1="100" x2="190" y2="100" stroke="#e879f9" stroke-width="2" />
      </g>

      <!-- Center Core Gem -->
      <circle cx="100" cy="100" r="7" fill="#f472b6" class="animate-pulse" />
      <circle cx="100" cy="100" r="3" fill="#ffffff" />
    </svg>
  `;
}

export function KnowledgeCrystalSVG(color = 'purple') {
  const colors = {
    purple: { fill: '#c026d3', stroke: '#f472b6', glow: 'rgba(236,72,153,0.6)' },
    gold: { fill: '#d97706', stroke: '#fef08a', glow: 'rgba(245,158,11,0.6)' },
    cyan: { fill: '#0891b2', stroke: '#67e8f9', glow: 'rgba(6,182,212,0.6)' },
    emerald: { fill: '#059669', stroke: '#6ee7b7', glow: 'rgba(16,185,129,0.6)' }
  };
  const c = colors[color] || colors.purple;

  return `
    <svg viewBox="0 0 60 70" class="w-8 h-9 inline-block filter drop-shadow-[0_0_8px_${c.glow}] transition-transform hover:scale-110">
      <polygon points="30,5 55,20 48,55 30,65 12,55 5,20" fill="${c.fill}" opacity="0.85" stroke="${c.stroke}" stroke-width="2" />
      <polygon points="30,5 30,65 48,55 55,20" fill="#ffffff" opacity="0.25" />
      <polygon points="30,5 12,55 30,65" fill="#000000" opacity="0.2" />
      <line x1="30" y1="5" x2="30" y2="65" stroke="${c.stroke}" stroke-width="1.5" />
      <circle cx="30" cy="25" r="3" fill="#ffffff" class="animate-pulse" />
    </svg>
  `;
}

export function MissionStageSVG(stageNumber, status) {
  // status: 'completed' | 'active' | 'upcoming'
  let stroke = '#475569';
  let fill = '#0f172a';
  let textColor = '#94a3b8';
  let ringClass = '';

  if (status === 'completed') {
    stroke = '#22c55e';
    fill = '#052e16';
    textColor = '#4ade80';
  } else if (status === 'active') {
    stroke = '#c026d3';
    fill = '#3b0764';
    textColor = '#f472b6';
    ringClass = 'animate-pulse drop-shadow-[0_0_10px_rgba(192,38,211,0.8)]';
  }

  return `
    <svg viewBox="0 0 50 50" class="w-8 h-8 md:w-9 md:h-9 ${ringClass}">
      <polygon points="25,3 45,14 45,36 25,47 5,36 5,14" fill="${fill}" stroke="${stroke}" stroke-width="2.5" />
      ${status === 'completed' ? `
        <path d="M16 25 L22 31 L34 18" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ` : `
        <text x="25" y="30" text-anchor="middle" fill="${textColor}" font-size="16" font-weight="900" font-family="sans-serif">${stageNumber}</text>
      `}
    </svg>
  `;
}

export function SuccessBurstSVG() {
  return `
    <svg viewBox="0 0 100 100" class="w-16 h-16 mx-auto animate-bounce-short drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]">
      <circle cx="50" cy="50" r="42" fill="#052e16" stroke="#22c55e" stroke-width="3" />
      <circle cx="50" cy="50" r="35" fill="none" stroke="#4ade80" stroke-width="1.5" stroke-dasharray="3 3" />
      <path d="M30 52 L43 65 L70 36" fill="none" stroke="#4ade80" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

export function ShieldHintSVG() {
  return `
    <svg viewBox="0 0 60 60" class="w-9 h-9 inline-block filter drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
      <path d="M30 5 L52 14 V30 C52 44 30 55 30 55 C30 55 8 44 8 30 V14 Z" fill="#451a03" stroke="#f59e0b" stroke-width="2.5" />
      <path d="M30 12 V48" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="2 2" />
      <text x="30" y="37" text-anchor="middle" fill="#fef08a" font-size="22" font-weight="bold">💡</text>
    </svg>
  `;
}

export function ComboBadgeSVG(multiplier = 2) {
  return `
    <svg viewBox="0 0 120 40" class="w-24 h-8 inline-block drop-shadow-[0_0_10px_rgba(236,72,153,0.6)]">
      <rect x="2" y="2" width="116" height="36" rx="18" fill="url(#comboBg)" stroke="#f472b6" stroke-width="2" />
      <defs>
        <linearGradient id="comboBg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#831843" />
          <stop offset="50%" stop-color="#581c87" />
          <stop offset="100%" stop-color="#701a75" />
        </linearGradient>
      </defs>
      <text x="20" y="26" fill="#fef08a" font-size="16" font-weight="900">⚡</text>
      <text x="42" y="25" fill="#ffffff" font-size="13" font-weight="800" font-family="sans-serif">مضاعف x${multiplier}</text>
    </svg>
  `;
}
