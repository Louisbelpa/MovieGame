/**
 * game/MovieImage.tsx
 * The central movie still.
 */

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MovieImageProps {
  imageUrl: string | null
  attempt: number
  className?: string
}

export function MovieImage({ imageUrl, attempt, className }: MovieImageProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-xl aspect-video bg-film-gray',
        'max-h-[42vh] sm:max-h-none',
        className
      )}
      style={{
        border: '1px solid var(--mode-ring)',
        boxShadow: '0 0 0 4px var(--mode-soft)',
      }}
      aria-label={`Image du film, tentative ${attempt}`}
    >
      {imageUrl ? (
        <motion.img
          key={imageUrl}
          src={imageUrl}
          alt="Extrait du film à deviner"
          className="w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <FilmStripIcon />
          <p className="text-film-text-dim text-sm">Image révélée à la fin</p>
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

