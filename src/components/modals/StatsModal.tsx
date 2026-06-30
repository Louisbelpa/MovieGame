/**
 * modals/StatsModal.tsx
 * Stats panel:
 *  - Desktop (lg+): slides in from the right (fixed 380px), game visible behind
 *  - Mobile: bottom sheet / centered modal (unchanged)
 */

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

export interface StatsModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'film' | 'series' | 'wiki'
  communityDateLabel?: string | null
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
  personalDistribution?: Record<1 | 2 | 3 | 4 | 5, number>
}

export function StatsModal(props: StatsModalProps) {
  const { isOpen, onClose, mode, communityDateLabel, globalStats, personalStats, personalDistribution } = props

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const content = (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-2 text-center">
        <StatCell value={personalStats.gamesPlayed} label="Joués" />
        <StatCell value={`${personalStats.winRate}%`} label="Victoires" />
        <StatCell value={personalStats.currentStreak} label="Série" />
        <StatCell value={personalStats.maxStreak} label="Max série" />
      </div>

      {personalDistribution && (
        <div>
          <p className="text-sm font-semibold text-film-text-dim uppercase tracking-wider mb-3">
            Mes tentatives
          </p>
          <DistributionChart
            distribution={Object.fromEntries(
              ([1, 2, 3, 4, 5] as const).map((k) => [String(k), personalDistribution[k] ?? 0])
            )}
          />
        </div>
      )}

      <div>
        <p className={`text-sm font-semibold text-film-text-dim uppercase tracking-wider ${communityDateLabel ? 'mb-1' : 'mb-3'}`}>
          Résultats de la communauté
        </p>
        {communityDateLabel && (
          <p className="text-xs text-film-text-dim/90 mb-3">{communityDateLabel}</p>
        )}
        <DistributionChart distribution={globalStats.winsByAttempt} />
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop side panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="stats-backdrop"
              className="fixed inset-0 z-40 bg-black/30 hidden lg:block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            {/* Panel */}
            <motion.aside
              key="stats-panel"
              className="fixed top-0 right-0 bottom-0 z-50 w-[380px] bg-[#0e1219] border-l border-film-border shadow-2xl overflow-y-auto hidden lg:flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.32, 0, 0.67, 0] }}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-film-border sticky top-0 bg-[#0e1219] z-10">
                <h2 className="font-title font-semibold text-lg text-film-text">{getModalTitle(mode)}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fermer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-film-text-dim hover:text-film-text hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="px-6 py-6 flex-1">
                {content}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile modal (unchanged) */}
      <div className="lg:hidden">
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title={getModalTitle(mode)}
          ariaDescribedBy="stats-modal-desc"
        >
          <div id="stats-modal-desc">
            {content}
          </div>
        </Modal>
      </div>
    </>
  )
}

function getModalTitle(mode: StatsModalProps['mode']): string {
  switch (mode) {
    case 'film':   return 'Statistiques films'
    case 'series': return 'Statistiques séries'
    case 'wiki':   return 'Statistiques personnalités'
    default:       return 'Mes statistiques'
  }
}

function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-2xl font-bold font-title text-gradient-gold">{value}</span>
      <span className="text-xs text-film-text-dim uppercase tracking-wide leading-tight">{label}</span>
    </div>
  )
}

function DistributionChart({ distribution }: { distribution: Record<string, number> }) {
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
            <span className="w-4 text-film-text-dim text-sm text-right">{count}</span>
          </div>
        )
      })}
    </div>
  )
}
