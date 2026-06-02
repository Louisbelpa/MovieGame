import { motion, AnimatePresence } from 'framer-motion'
import type { GuessEntry } from '@/types'

interface GuessListProps {
  guesses: GuessEntry[]
  maxAttempts: number
  hints?: string[]
}

export function GuessList({ guesses, maxAttempts, hints }: GuessListProps) {
  const slots = Array.from({ length: maxAttempts }, (_, i) => guesses[i] ?? null)

  return (
    <ol className="flex flex-col gap-2 w-full" aria-label="Historique des tentatives">
      <AnimatePresence initial={false}>
        {slots.map((guess, i) => (
          <GuessSlot key={i} index={i} guess={guess} hint={hints?.[i]} />
        ))}
      </AnimatePresence>
    </ol>
  )
}

interface GuessSlotProps {
  index: number
  guess: GuessEntry | null
  hint?: string
}

function GuessSlot({ index, guess, hint }: GuessSlotProps) {
  const isEmpty = guess === null
  const isCorrect = !isEmpty && guess.status === 'correct'
  const isSkipped = !isEmpty && guess.status === 'skipped'
  const isWrong   = !isEmpty && guess.status === 'wrong'

  const rowStyle: React.CSSProperties = isEmpty
    ? { background: '#fffaf4', border: '2.5px dashed var(--line-2)', boxShadow: 'none', color: 'var(--ink-3)' }
    : isCorrect
    ? { background: 'var(--correct-soft)', color: 'var(--correct-d)', boxShadow: '0 4px 0 rgba(39,192,138,0.15)' }
    : isSkipped
    ? { background: '#f1ece6', color: 'var(--ink-2)', boxShadow: '0 4px 0 rgba(60,48,80,0.06)' }
    : { background: 'var(--wrong-soft)', color: 'var(--wrong-d)', boxShadow: '0 4px 0 rgba(255,107,129,0.15)' }

  const iconStyle: React.CSSProperties = isEmpty
    ? { background: 'transparent', boxShadow: `inset 0 0 0 2px var(--line-2)`, color: 'var(--ink-3)' }
    : isCorrect
    ? { background: 'var(--correct)', boxShadow: '0 2px 0 var(--correct-d)', color: '#fff' }
    : isSkipped
    ? { background: '#d2c4b4', boxShadow: '0 2px 0 rgba(60,48,80,0.15)', color: '#fff' }
    : { background: 'var(--wrong)', boxShadow: '0 2px 0 var(--wrong-d)', color: '#fff' }

  const iconLabel = isCorrect ? '✓' : isSkipped ? '→' : isWrong ? '✕' : String(index + 1)

  return (
    <motion.li
      layout
      initial={guess ? { opacity: 0, x: -12 } : false}
      animate={
        isWrong   ? { opacity: 1, x: [0, -10, 10, -7, 7, -3, 3, 0] } :
        isCorrect ? { opacity: 1, x: 0, scale: [1, 1.02, 1] } :
                    { opacity: 1, x: 0 }
      }
      transition={
        isWrong   ? { duration: 0.45 } :
        isCorrect ? { duration: 0.3, delay: 0.1 } :
                    { duration: 0.25 }
      }
      className="flex items-center gap-3 px-4 py-3 rounded-[14px] font-semibold text-sm"
      style={rowStyle}
      aria-label={
        isEmpty
          ? `Tentative ${index + 1} vide`
          : `Tentative ${index + 1} : ${guess.value || '(passé)'} – ${isCorrect ? 'correct' : isSkipped ? 'passé' : 'incorrect'}`
      }
    >
      {/* Icon */}
      <span
        className="w-7 h-7 rounded-[9px] flex items-center justify-center text-sm font-bold shrink-0"
        style={iconStyle}
        aria-hidden
      >
        {iconLabel}
      </span>

      {/* Text */}
      <span className="flex-1 truncate" style={{ visibility: isEmpty ? 'hidden' : 'visible' }}>
        {isEmpty ? '—' : guess.value || 'Passé'}
      </span>

      {/* Hint badge */}
      {!isEmpty && hint && (
        <span
          className="cdy-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0"
          style={{ background: 'rgba(255,255,255,0.5)', color: 'inherit' }}
          aria-label={`Indice: ${hint}`}
        >
          {hint}
        </span>
      )}
    </motion.li>
  )
}
