/**
 * game/HintPanel.tsx
 * Shows revealed hints as animated cards that appear one by one.
 * Locked hints are shown as dimmed "?" slots.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clapperboard, User, Users, FileText, Tag, Lock, Layers } from 'lucide-react'
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <AnimatePresence initial={false}>
          {hints.map((hint, i) => (
            <HintCard key={hint.type} hint={hint} index={i} />
          ))}
        </AnimatePresence>

        {/* Locked slots */}
        {Array.from({ length: lockedCount }).map((_, i) => (
          <LockedSlot key={`locked-${i}`} index={hintsRevealed + i + 1} />
        ))}
      </div>
    </section>
  )
}

// ─── Hint card ────────────────────────────────────────────────────────────────

function HintCard({ hint, index }: { hint: HintPayload; index: number }) {
  const { label, formatted } = resolveHint(hint)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex flex-col gap-1 rounded-[10px] min-w-0"
      style={{
        padding: '10px 12px 10px 14px',
        background: 'var(--color-film-gray)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: '3px solid var(--mode-color)',
      }}
    >
      <p
        className="font-mono uppercase tracking-wider leading-none shrink-0"
        style={{ fontSize: '9px', fontWeight: 600, color: 'var(--mode-color)', opacity: 0.85 }}
      >
        {label}
      </p>
      <p className="text-sm text-film-text leading-snug break-words min-w-0">
        {formatted}
      </p>
    </motion.div>
  )
}

function LockedSlot({ index }: { index: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1.5 rounded-[10px]"
      style={{
        padding: '14px 12px',
        minHeight: '64px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px dashed rgba(255,255,255,0.10)',
      }}
    >
      <Lock size={13} style={{ color: 'rgba(255,255,255,0.18)' }} aria-hidden />
      <p
        className="font-mono uppercase tracking-wider leading-none text-center"
        style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.18)' }}
      >
        Indice {index}
      </p>
    </div>
  )
}

// ─── Hint resolver ────────────────────────────────────────────────────────────

const HINT_META: Record<
  string,
  { icon: typeof Calendar; label: string }
> = {
  year:     { icon: Calendar,     label: 'Année' },
  director: { icon: Clapperboard, label: 'Réalisateur' },
  genres:   { icon: Tag,          label: 'Genres' },
  cast:     { icon: User,         label: 'Acteur principal' },
  tagline:  { icon: FileText,     label: 'Accroche' },
  synopsis: { icon: FileText,     label: 'Synopsis' },
  seasons:  { icon: Layers,       label: 'Saisons' },
  creator:  { icon: Clapperboard, label: 'Créateur' },
}

function resolveHint(hint: HintPayload): {
  icon: typeof Calendar
  label: string
  formatted: string
} {
  const meta = HINT_META[hint.type] ?? { icon: Users, label: hint.type }
  const val = hint.value
  // For cast, show only the first actor (main actor)
  const formatted = Array.isArray(val)
    ? (hint.type === 'cast' ? val[0] ?? '' : val.join(', '))
    : String(val)
  return { ...meta, formatted }
}
