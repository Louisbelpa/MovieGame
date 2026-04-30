/**
 * game/AttemptTracker.tsx
 * Visual row of 6 dots showing attempt usage at a glance.
 */

import { cn } from '@/lib/utils'
import type { GuessEntry } from '@/types'

interface AttemptTrackerProps {
  guesses: GuessEntry[]
  maxAttempts: number
}

export function AttemptTracker({ guesses, maxAttempts }: AttemptTrackerProps) {
  return (
    <div
      className="flex items-center gap-1.5"
      role="group"
      aria-label={`${guesses.length} tentatives utilisées sur ${maxAttempts}`}
    >
      {Array.from({ length: maxAttempts }).map((_, i) => {
        const guess = guesses[i]
        const isNext = !guess && i === guesses.length
        return (
          <span
            key={i}
            aria-hidden
            className={cn(
              'w-3 h-3 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300',
              !guess
                ? isNext
                  ? '' // mode-color handled via inline style below
                  : 'bg-film-border'
                : guess.status === 'correct'
                ? 'bg-film-green shadow-[0_0_6px_rgba(76,175,120,0.6)]'
                : guess.status === 'skipped'
                ? 'bg-film-muted'
                : 'bg-film-red'
            )}
            style={isNext ? {
              background: 'var(--mode-color)',
              boxShadow: '0 0 0 3px var(--mode-soft)',
            } : undefined}
          />
        )
      })}
    </div>
  )
}
