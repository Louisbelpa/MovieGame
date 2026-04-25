/**
 * game/MovieImage.tsx
 * The central movie still with animated blur reveal.
 * Blur is driven by `blurPx` prop; Framer Motion animates transitions.
 */

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MovieImageProps {
  /** CDN URL of the full-resolution still (null until game over) */
  imageUrl: string | null
  /** Active blur in px (0 = clear) */
  blurPx: number
  /** Current attempt number for aria label */
  attempt: number
  className?: string
}

export function MovieImage({ imageUrl, blurPx, attempt, className }: MovieImageProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-xl film-border aspect-video bg-film-gray',
        className
      )}
      aria-label={`Image du film, tentative ${attempt}`}
    >
      {imageUrl ? (
        <motion.img
          key={blurPx} // re-mount triggers entry animation
          src={imageUrl}
          alt="Extrait du film à deviner"
          className="w-full h-full object-cover"
          initial={{ filter: `blur(${blurPx + 8}px)`, opacity: 0.7 }}
          animate={{ filter: `blur(${blurPx}px)`, opacity: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          draggable={false}
        />
      ) : (
        /* Placeholder while image URL is not yet known */
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <FilmStripIcon />
          <p className="text-film-text-dim text-sm">Image révélée à la fin</p>
        </div>
      )}

      {/* Blur level indicator – subtle pill bottom-right */}
      {blurPx > 0 && imageUrl && (
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-film-text-dim text-xs backdrop-blur-sm">
          flou {blurPx}px
        </div>
      )}
    </div>
  )
}

function FilmStripIcon() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden="true"
      className="text-film-muted"
    >
      <rect x="4" y="12" width="48" height="32" rx="3" stroke="currentColor" strokeWidth="2" />
      <rect x="4" y="12" width="8" height="32" rx="1" fill="currentColor" opacity="0.3" />
      <rect x="44" y="12" width="8" height="32" rx="1" fill="currentColor" opacity="0.3" />
      {[16, 22, 28, 34].map((y) => (
        <rect key={y} x="6" y={y} width="4" height="4" rx="1" fill="currentColor" opacity="0.6" />
      ))}
      {[16, 22, 28, 34].map((y) => (
        <rect key={y} x="46" y={y} width="4" height="4" rx="1" fill="currentColor" opacity="0.6" />
      ))}
    </svg>
  )
}
