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
      <h3 className="text-xs font-semibold text-film-text-dim uppercase tracking-wider mb-2">
        Indices ({hintsRevealed}/{hintsAvailable})
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
        <AnimatePresence initial={false}>
          {hints.map((hint, i) => (
            <HintCard key={hint.type} hint={hint} index={i} />
          ))}
        </AnimatePresence>

        {/* Locked slots */}
        {Array.from({ length: lockedCount }).map((_, i) => (
          <LockedSlot key={`locked-${i}`} />
        ))}
      </div>
    </section>
  )
}

// ─── Hint card ────────────────────────────────────────────────────────────────

function HintCard({ hint, index }: { hint: HintPayload; index: number }) {
  const { icon: Icon, label, formatted } = resolveHint(hint)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex items-start gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg film-border"
    >
      <span className="mt-0.5 text-film-gold shrink-0" aria-hidden>
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-film-text-dim uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm text-film-text leading-snug mt-0.5 break-words">
          {formatted}
        </p>
      </div>
    </motion.div>
  )
}

function LockedSlot() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-film-border/40 opacity-40">
      <Lock size={14} className="text-film-text-dim shrink-0" aria-hidden />
      <span className="text-xs text-film-text-dim">Indice verrouillé</span>
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
