import { motion, AnimatePresence } from 'framer-motion'
import type { HintPayload } from '@/api/client'

interface HintPanelProps {
  hints: HintPayload[]
  hintsAvailable: number
  hintsRevealed: number
}

export function HintPanel({ hints, hintsAvailable, hintsRevealed }: HintPanelProps) {
  const lockedCount = hintsAvailable - hintsRevealed

  return (
    <section aria-label="Indices" className="w-full">
      <div className="cdym-ar-hints">
        <AnimatePresence initial={false}>
          {hints.map((hint, i) => (
            <HintCard key={hint.type} hint={hint} index={i} />
          ))}
        </AnimatePresence>
        {Array.from({ length: lockedCount }).map((_, i) => (
          <LockedSlot key={`locked-${i}`} index={hintsRevealed + i + 1} />
        ))}
      </div>
    </section>
  )
}

function HintCard({ hint, index }: { hint: HintPayload; index: number }) {
  const { label, formatted } = resolveHint(hint)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22, delay: index * 0.04 }}
      className="cdym-ar-hint on"
    >
      <span className="hl">{label}</span>
      <span className="hv">{formatted}</span>
    </motion.div>
  )
}

function LockedSlot({ index }: { index: number }) {
  return (
    <div className="cdym-ar-hint" style={{ minHeight: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <span className="hl">Indice {index}</span>
      <span className="hv" style={{ color: 'var(--ink-3)', opacity: 0.6 }}>🔒</span>
    </div>
  )
}

const HINT_LABELS: Record<string, string> = {
  year: 'Année', director: 'Réalisateur', genres: 'Genres',
  cast: 'Acteur principal', tagline: 'Accroche', synopsis: 'Synopsis',
  seasons: 'Saisons', creator: 'Créateur',
}

function resolveHint(hint: HintPayload): { label: string; formatted: string } {
  const label = HINT_LABELS[hint.type] ?? hint.type
  const val = hint.value
  const formatted = Array.isArray(val)
    ? (hint.type === 'cast' ? val[0] ?? '' : val.join(', '))
    : String(val)
  return { label, formatted }
}
