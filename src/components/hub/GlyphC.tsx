export function GlyphC({ game, size = 26 }: { game: 'film' | 'serie' | 'face'; size?: number }) {
  const s = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (game === 'film') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <rect x="3" y="4" width="18" height="16" rx="2.5" {...s} />
        <path d="M3 9h18M3 15h18M8 4v16M16 4v16" {...s} />
      </svg>
    )
  }
  if (game === 'serie') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <rect x="3" y="7" width="18" height="13" rx="2.5" {...s} />
        <path d="M8 3l4 4 4-4" {...s} />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="9" r="4" {...s} />
      <path d="M5 20c0-3.8 3.1-6.2 7-6.2s7 2.4 7 6.2" {...s} />
    </svg>
  )
}
