/**
 * modals/StatsModal.tsx — Direction Candy
 * Structure : cdym-stat-grid (4 tuiles communauté) + cdym-card-m (barres)
 */

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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

function avgAttempts(winsByAttempt: Record<string, number>): string {
  const total = Object.values(winsByAttempt).reduce((s, v) => s + v, 0)
  if (!total) return '—'
  const weighted = Object.entries(winsByAttempt).reduce((s, [k, v]) => s + Number(k) * v, 0)
  return (weighted / total).toFixed(1).replace('.', ',')
}

export function StatsModal({ isOpen, onClose, mode, communityDateLabel, globalStats, personalStats, personalDistribution }: StatsModalProps) {
  const modeAcc   = mode === 'series' ? 'var(--grape)' : mode === 'wiki' ? 'var(--sky)' : 'var(--coral)'
  const modeAccD  = mode === 'series' ? 'var(--grape-d)' : mode === 'wiki' ? 'var(--sky-d)' : 'var(--coral-d)'

  useEffect(() => {
    if (!isOpen) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, onClose])

  // Bar chart rows: attempts 1–5 + X (losses)
  const distKeys = ['1', '2', '3', '4', '5']
  const distData = distKeys.map((k) => ({ k, v: globalStats.winsByAttempt[k] ?? 0 }))
  const maxBar   = Math.max(1, ...distData.map((d) => d.v))

  const communityTiles = [
    { v: `${globalStats.winRate}%`,                           l: 'taux de victoire',    c: 'var(--mint)' },
    { v: avgAttempts(globalStats.winsByAttempt),              l: 'essais en moyenne',   c: modeAcc },
    { v: globalStats.totalGames.toLocaleString('fr-FR'),      l: 'joueurs aujourd\'hui', c: 'var(--ink)' },
    { v: personalStats.currentStreak > 0 ? `🔥 ${personalStats.currentStreak}` : '—', l: 'ta série', c: 'var(--flame)' },
  ]

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Label date communauté */}
      {communityDateLabel && (
        <p className="cdy-mono" style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0 }}>{communityDateLabel}</p>
      )}

      {/* 4 tuiles stat (cdym-stat-grid) */}
      <div className="cdym-stat-grid">
        {communityTiles.map(({ v, l, c }) => (
          <div key={l} className="cdym-stat-t">
            <div className="v" style={{ color: c }}>{v}</div>
            <div className="l">{l}</div>
          </div>
        ))}
      </div>

      {/* Répartition des tentatives (cdym-card-m + cdym-barrow) */}
      <div className="cdym-card-m">
        <h3>Répartition des tentatives</h3>
        {distData.map(({ k, v }) => (
          <div key={k} className="cdym-barrow">
            <span className="k">{k}</span>
            <div className="tr">
              <div
                className="fl"
                style={{ width: `${Math.max(v > 0 ? 8 : 0, Math.round((v / maxBar) * 100))}%`, background: modeAcc }}
              >
                {v > 0 ? v : ''}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mes stats personnelles */}
      {personalDistribution && (
        <div className="cdym-card-m">
          <h3>Mes tentatives</h3>
          {(() => {
            const pKeys = ['1','2','3','4','5']
            const pData = pKeys.map((k) => ({ k, v: personalDistribution[Number(k) as 1|2|3|4|5] ?? 0 }))
            const pMax  = Math.max(1, ...pData.map((d) => d.v))
            return pData.map(({ k, v }) => (
              <div key={k} className="cdym-barrow">
                <span className="k">{k}</span>
                <div className="tr">
                  <div className="fl" style={{ width: `${Math.max(v > 0 ? 8 : 0, Math.round((v / pMax) * 100))}%`, background: modeAccD }}>
                    {v > 0 ? v : ''}
                  </div>
                </div>
              </div>
            ))
          })()}
          <div className="cdy-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>
            {personalStats.gamesPlayed} parties · meilleure série : {personalStats.maxStreak} jours
          </div>
        </div>
      )}

      {/* Calendrier activité */}
      <StreakCalendar currentStreak={personalStats.currentStreak} gamesPlayed={personalStats.gamesPlayed} />
    </div>
  )

  return (
    <>
      {/* Desktop : side panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="stats-backdrop"
              className="fixed inset-0 z-40 hidden lg:block"
              style={{ background: 'rgba(60,48,80,0.3)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            <motion.aside
              key="stats-panel"
              className="fixed top-0 right-0 bottom-0 z-50 overflow-y-auto hidden lg:flex flex-col"
              style={{ width: 420, background: 'var(--bg)', borderLeft: '2.5px solid var(--line)', boxShadow: '-8px 0 30px rgba(60,48,80,0.12)' }}
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.32, 0, 0.67, 0] }}
            >
              <div className="flex items-center justify-between px-6 py-5 sticky top-0 z-10"
                style={{ borderBottom: '2.5px solid var(--line)', background: 'var(--panel)' }}>
                <h2 style={{ fontWeight: 700, fontSize: 20, color: 'var(--ink)', margin: 0 }}>
                  {getTitle(mode)} 📊
                </h2>
                <button type="button" onClick={onClose} aria-label="Fermer"
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center cursor-pointer transition-colors"
                  style={{ color: 'var(--ink-2)', background: 'var(--bg-2)', border: '2px solid var(--line)' }}>
                  <X size={16} />
                </button>
              </div>
              <div className="px-6 py-5 flex-1">{content}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile : modal */}
      <div className="lg:hidden">
        <Modal isOpen={isOpen} onClose={onClose} title={`${getTitle(mode)} 📊`}>
          {content}
        </Modal>
      </div>
    </>
  )
}

function getTitle(mode: StatsModalProps['mode']) {
  if (mode === 'series') return 'Stats séries'
  if (mode === 'wiki')   return 'Stats personnalités'
  return 'Stats du jour'
}

function StreakCalendar({ currentStreak, gamesPlayed }: { currentStreak: number; gamesPlayed: number }) {
  const days = 28
  return (
    <div>
      <p className="cdy-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
        Activité (28 jours)
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {Array.from({ length: days }, (_, i) => {
          const idx  = days - 1 - i
          const won  = idx < currentStreak
          const lost = !won && idx < Math.min(gamesPlayed, days)
          return (
            <div key={i} title={won ? 'Victoire' : lost ? 'Défaite' : 'Non joué'}
              style={{ width: `calc((100% - ${(days-1)*4}px) / ${days})`, aspectRatio: '1/1', borderRadius: 3, background: won ? 'var(--correct)' : lost ? 'var(--wrong)' : 'var(--line)' }} />
          )
        })}
      </div>
    </div>
  )
}
