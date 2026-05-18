/**
 * game/MovieImage.tsx
 * The central movie still.
 */

import { motion } from 'framer-motion'
import { Clapperboard } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MovieImageProps {
  imageUrl: string | null
  attempt: number
  maxAttempts?: number
  className?: string
  /** Fill the parent container instead of enforcing aspect-video */
  fill?: boolean
  /** Remove border/shadow/radius — for full-bleed rendering */
  fullBleed?: boolean
}

export function MovieImage({ imageUrl, attempt, maxAttempts, className, fill, fullBleed }: MovieImageProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-film-gray',
        !fullBleed && 'rounded-xl',
        fill ? 'h-full' : 'aspect-video',
        className
      )}
      style={fullBleed ? undefined : {
        border: '1px solid var(--mode-ring)',
        boxShadow: '0 0 0 4px var(--mode-soft)',
      }}
    >
      {imageUrl ? (
        <>
          <motion.img
            key={imageUrl}
            src={imageUrl}
            alt={`Extrait du film à deviner, tentative ${attempt}`}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            draggable={false}
          />
          {/* Scene badge top-left */}
          <div
            className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-md px-2 py-1"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}
          >
            <Clapperboard size={11} className="text-film-text-dim" aria-hidden />
            <span className="text-[10px] font-medium text-film-text-dim leading-none">
              {maxAttempts != null ? `SCÈNE ${attempt}/${maxAttempts}` : 'Scène'}
            </span>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" role="img" aria-label="Image du film masquée">
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

