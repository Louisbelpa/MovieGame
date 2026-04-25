/**
 * game/GuessList.tsx
 * Timeline of previous guesses with animated entry.
 * Shows 6 slots: filled ones display result, empty ones are dimmed placeholders.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GuessEntry } from '@/types'

interface GuessListProps {
  guesses: GuessEntry[]
  maxAttempts: number
}

export function GuessList({ guesses, maxAttempts }: GuessListProps) {
  const slots = Array.from({ length: maxAttempts }, (_, i) => guesses[i] ?? null)

  return (
    <ol className="flex flex-col gap-2 w-full" aria-label="Historique des tentatives">
      <AnimatePresence initial={false}>
        {slots.map((guess, i) => (
          <GuessSlot key={i} index={i} guess={guess} />
        ))}
      </AnimatePresence>
    </ol>
  )
}

interface GuessSlotProps {
  index: number
  guess: GuessEntry | null
}

function GuessSlot({ index, guess }: GuessSlotProps) {
  const isEmpty = guess === null

  return (
    <motion.li
      layout
      initial={guess ? { opacity: 0, x: -12 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
        isEmpty
          ? 'border border-dashed border-film-border/50 text-film-text-dim/40'
          : guess.status === 'correct'
          ? 'border border-film-green/30 bg-film-green/8'
          : guess.status === 'skipped'
          ? 'border border-film-border bg-film-gray/50'
          : 'border border-film-red/20 bg-film-red/5'
      )}
      aria-label={
        isEmpty
          ? `Tentative ${index + 1} vide`
          : `Tentative ${index + 1} : ${guess.value || '(passé)'} – ${
              guess.status === 'correct'
                ? 'correct'
                : guess.status === 'skipped'
                ? 'passé'
                : 'incorrect'
            }`
      }
    >
      {/* Index badge */}
      <span
        className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono shrink-0',
          isEmpty
            ? 'bg-film-border/30 text-film-text-dim/40'
            : guess.status === 'correct'
            ? 'bg-film-green text-film-black'
            : guess.status === 'skipped'
            ? 'bg-film-muted text-film-text-dim'
            : 'bg-film-red text-white'
        )}
        aria-hidden
      >
        {index + 1}
      </span>

      {/* Guess text */}
      <span className={cn('flex-1 truncate', isEmpty && 'invisible')}>
        {isEmpty ? '—' : guess.value || 'Passé'}
      </span>

      {/* Status icon */}
      {!isEmpty && (
        <span className="shrink-0" aria-hidden>
          {guess.status === 'correct' ? (
            <CheckCircle2 size={16} className="text-film-green" />
          ) : guess.status === 'skipped' ? (
            <SkipForward size={14} className="text-film-text-dim" />
          ) : (
            <XCircle size={16} className="text-film-red" />
          )}
        </span>
      )}
    </motion.li>
  )
}
