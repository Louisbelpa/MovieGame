/**
 * modals/StatsModal.tsx
 * Personal statistics panel with guess distribution bar chart.
 */

import { motion } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'
import { useGameStore } from '@/store/gameStore'
import type { GameStats } from '@/types'

export function StatsModal() {
  const isOpen = useGameStore((s) => s.ui.isModalOpen && s.ui.modalType === 'stats')
  const closeModal = useGameStore((s) => s.closeModal)
  const stats = useGameStore((s) => s.stats)

  const winRate =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Mes statistiques">
      <div className="flex flex-col gap-6">
        {/* Summary row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <StatCell value={stats.gamesPlayed} label="Joués" />
          <StatCell value={`${winRate}%`} label="Victoires" />
          <StatCell value={stats.currentStreak} label="Série" />
          <StatCell value={stats.maxStreak} label="Max série" />
        </div>

        {/* Distribution */}
        <div>
          <p className="text-xs font-semibold text-film-text-dim uppercase tracking-wider mb-3">
            Distribution des victoires
          </p>
          <DistributionChart distribution={stats.guessDistribution} />
        </div>
      </div>
    </Modal>
  )
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
  distribution: GameStats['guessDistribution']
}) {
  const maxVal = Math.max(1, ...Object.values(distribution))

  return (
    <div className="flex flex-col gap-1.5">
      {([1, 2, 3, 4, 5, 6] as const).map((n) => {
        const count = distribution[n]
        const pct = Math.round((count / maxVal) * 100)
        return (
          <div key={n} className="flex items-center gap-2 text-sm">
            <span className="w-3 text-film-text-dim text-xs font-mono">{n}</span>
            <div className="flex-1 h-5 bg-film-gray rounded overflow-hidden">
              <motion.div
                className="h-full bg-film-gold rounded"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                transition={{ duration: 0.5, delay: n * 0.06, ease: 'easeOut' }}
              />
            </div>
            <span className="w-4 text-film-text-dim text-xs text-right">
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
