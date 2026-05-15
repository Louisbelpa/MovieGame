interface ApertureIconProps {
  size?: number
  className?: string
}

export function ApertureIcon({ size = 20, className }: ApertureIconProps) {
  const id = 'ap'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="40%" r="65%">
          <stop offset="0%"  stopColor="#3a2d18"/>
          <stop offset="60%" stopColor="#15110a"/>
          <stop offset="100%" stopColor="#070605"/>
        </radialGradient>
        <linearGradient id={`${id}-g`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%"  stopColor="#fcd982"/>
          <stop offset="100%" stopColor="#a47225"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#${id}-bg)`}/>
      <g transform="translate(50 50)">
        <g fill={`url(#${id}-g)`} stroke="#15110a" strokeWidth="0.8" strokeLinejoin="round">
          <path d="M0 -29.3 L 25.4 -14.6 L 0 0 Z" transform="rotate(0)"/>
          <path d="M0 -29.3 L 25.4 -14.6 L 0 0 Z" transform="rotate(60)"/>
          <path d="M0 -29.3 L 25.4 -14.6 L 0 0 Z" transform="rotate(120)"/>
          <path d="M0 -29.3 L 25.4 -14.6 L 0 0 Z" transform="rotate(180)"/>
          <path d="M0 -29.3 L 25.4 -14.6 L 0 0 Z" transform="rotate(240)"/>
          <path d="M0 -29.3 L 25.4 -14.6 L 0 0 Z" transform="rotate(300)"/>
        </g>
        <circle r="3.5" fill="#15110a"/>
        <circle r="1.2" fill={`url(#${id}-g)`}/>
      </g>
    </svg>
  )
}

// Square version for app-icon contexts (rounded square background)
export function ApertureAppIcon({ size = 40, radius = 9 }: { size?: number; radius?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <radialGradient id="aai-bg" cx="50%" cy="40%" r="65%">
          <stop offset="0%"  stopColor="#3a2d18"/>
          <stop offset="60%" stopColor="#15110a"/>
          <stop offset="100%" stopColor="#070605"/>
        </radialGradient>
        <linearGradient id="aai-g" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%"  stopColor="#fcd982"/>
          <stop offset="100%" stopColor="#a47225"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx={radius} fill="url(#aai-bg)"/>
      <g transform="translate(50 50)">
        <g fill="url(#aai-g)" stroke="#15110a" strokeWidth="0.8" strokeLinejoin="round">
          <path d="M0 -29.3 L 25.4 -14.6 L 0 0 Z" transform="rotate(0)"/>
          <path d="M0 -29.3 L 25.4 -14.6 L 0 0 Z" transform="rotate(60)"/>
          <path d="M0 -29.3 L 25.4 -14.6 L 0 0 Z" transform="rotate(120)"/>
          <path d="M0 -29.3 L 25.4 -14.6 L 0 0 Z" transform="rotate(180)"/>
          <path d="M0 -29.3 L 25.4 -14.6 L 0 0 Z" transform="rotate(240)"/>
          <path d="M0 -29.3 L 25.4 -14.6 L 0 0 Z" transform="rotate(300)"/>
        </g>
        <circle r="3.5" fill="#15110a"/>
        <circle r="1.2" fill="url(#aai-g)"/>
      </g>
    </svg>
  )
}
