/**
 * layout/Header.tsx
 * Top app bar with logo, challenge number, and icon buttons.
 */

import { useRef } from 'react'
import { HelpCircle, BarChart2, Film, CalendarDays, Tv, Home } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'

export function Header() {
  const openModal = useGameStore((s) => s.openModal)
  const challenge = useGameStore((s) => s.challenge)
  const gameType = useGameStore((s) => s.gameType)

  // Keep last known number so header doesn't flash during loading transitions
  const lastNumberRef = useRef<number | null>(null)
  if (challenge?.challengeNumber) lastNumberRef.current = challenge.challengeNumber
  const displayNumber = lastNumberRef.current

  return (
    <header className="sticky top-0 z-30 w-full border-b border-film-border bg-film-black/90 backdrop-blur-md">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: home + rules */}
        <div className="flex items-center gap-1">
          <a
            href="/"
            aria-label="Choisir le jeu"
            className="p-2 rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors"
          >
            <Home size={20} />
          </a>
          <button
            onClick={() => openModal('rules')}
            aria-label="Règles du jeu"
            className="p-2 rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors cursor-pointer"
          >
            <HelpCircle size={20} />
          </button>
        </div>

        {/* Center: logo */}
        <div className="flex items-center gap-2">
          {gameType === 'series' ? <Tv size={22} className="text-film-gold" aria-hidden /> : <Film size={22} className="text-film-gold" aria-hidden />}
          <span className="font-title text-xl font-bold text-gradient-gold tracking-tight">
            CinéGuessr
          </span>
          {displayNumber && (
            <div className="overflow-hidden h-5 flex items-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={displayNumber}
                  className="text-film-text-dim text-sm font-mono block"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  #{displayNumber}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right: archive + stats buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => openModal('archive')}
            aria-label="Archives"
            className="p-2 rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors cursor-pointer"
          >
            <CalendarDays size={20} />
          </button>
          <button
            onClick={() => openModal('stats')}
            aria-label="Mes statistiques"
            className="p-2 rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors cursor-pointer"
          >
            <BarChart2 size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}
