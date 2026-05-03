/**
 * modals/StatsModal.tsx
 * Personal statistics panel with guess distribution bar chart.
 */

import { motion } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'

export interface StatsModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'film' | 'series' | 'wiki'
  globalStats: {
    totalGames: number
    totalWins: number
    winRate: number
    winsByAttempt: Record<string, number>
  }
  personalStats: {
    currentStreak: number
    maxStreak: number
    gamesPlayed: number
    winRate: number
  }
}

export function StatsModal({
  isOpen,
  onClose,
  mode,
  globalStats,
  personalStats,
}: StatsModalProps) {
  const modalTitle = getModalTitle(mode)
  const modalDescId = 'modal-desc'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      ariaDescribedBy={modalDescId}
    >
      <div id={modalDescId} className="flex flex-col gap-6">
        <div className="grid grid-cols-4 gap-2 text-center">
          <StatCell value={personalStats.gamesPlayed} label="Joués" />
          <StatCell value={`${personalStats.winRate}%`} label="Victoires" />
          <StatCell value={personalStats.currentStreak} label="Série" />
          <StatCell value={personalStats.maxStreak} label="Max série" />
        </div>

        <div>
          <p className="text-sm font-semibold text-film-text-dim uppercase tracking-wider mb-3">
            Distribution des victoires
          </p>
          <DistributionChart distribution={globalStats.winsByAttempt} />
        </div>
      </div>
    </Modal>
  )
}

function getModalTitle(mode: StatsModalProps['mode']): string {
  switch (mode) {
    case 'film':
      return 'Statistiques films'
    case 'series':
      return 'Statistiques series'
    case 'wiki':
      return 'Statistiques wiki'
    default:
      return 'Mes statistiques'
  }
}

function StatCell({
  value,
  label,
}: {
  value: string | number
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-2xl font-bold font-title text-gradient-gold">
        {value}
      </span>
      <span className="text-xs text-film-text-dim uppercase tracking-wide leading-tight">
        {label}
      </span>
    </div>
  )
}

function DistributionChart({
  distribution,
}: {
  distribution: Record<string, number>
}) {
  const keys = Object.keys(distribution).sort((a, b) => Number(a) - Number(b))
  const maxVal = Math.max(1, ...Object.values(distribution))

  return (
    <div className="flex flex-col gap-1.5">
      {keys.map((attemptKey, idx) => {
        const count = distribution[attemptKey] ?? 0
        const pct = Math.round((count / maxVal) * 100)
        return (
          <div key={attemptKey} className="flex items-center gap-2 text-sm">
            <span className="w-3 text-film-text-dim text-sm font-mono">{attemptKey}</span>
            <div className="flex-1 h-5 bg-film-gray rounded overflow-hidden">
              <motion.div
                className="h-full bg-film-gold rounded"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                transition={{ duration: 0.5, delay: (idx + 1) * 0.06, ease: 'easeOut' }}
              />
            </div>
            <span className="w-4 text-film-text-dim text-sm text-right">
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
