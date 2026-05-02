import { motion } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'
import { useWikiStore } from '@/store/wikiStore'
import type { GameStats } from '@/types'

export function WikiStatsModal() {
  const isOpen = useWikiStore((s) => s.ui.isModalOpen && s.ui.modalType === 'stats')
  const closeModal = useWikiStore((s) => s.closeModal)
  const stats = useWikiStore((s) => s.stats)

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Mes statistiques WikiGuessr">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-4 gap-2 text-center">
          <StatCell value={stats.gamesPlayed} label="Joués" />
          <StatCell value={`${winRate}%`} label="Victoires" />
          <StatCell value={stats.currentStreak} label="Série" />
          <StatCell value={stats.maxStreak} label="Max série" />
        </div>
        <div>
          <p className="text-xs font-semibold text-film-text-dim uppercase tracking-wider mb-3">
            Distribution des victoires
          </p>
          <DistributionChart distribution={stats.guessDistribution} maxAttempts={5} />
        </div>
      </div>
    </Modal>
  )
}

function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-2xl font-bold font-title text-gradient-gold">{value}</span>
      <span className="text-[10px] text-film-text-dim uppercase tracking-wide leading-tight">{label}</span>
    </div>
  )
}

function DistributionChart({ distribution, maxAttempts }: { distribution: GameStats['guessDistribution']; maxAttempts: number }) {
  const slots = Array.from({ length: maxAttempts }, (_, i) => i + 1) as (1 | 2 | 3 | 4 | 5 | 6)[]
  const maxVal = Math.max(1, ...slots.map((n) => distribution[n] ?? 0))

  return (
    <div className="flex flex-col gap-1.5">
      {slots.map((n) => {
        const count = distribution[n] ?? 0
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
            <span className="w-4 text-film-text-dim text-xs text-right">{count}</span>
          </div>
        )
      })}
    </div>
  )
}
