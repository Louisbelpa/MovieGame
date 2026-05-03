/**
 * layout/Header.tsx
 * Top app bar with logo, challenge number, and icon buttons.
 * Detects /wiki route and uses wikiStore for modal actions.
 */

import { useRef } from 'react'
import { HelpCircle, BarChart2, Film, CalendarDays, Tv, Home, Landmark } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import { useWikiStore } from '@/store/wikiStore'
import { BRAND_NAME } from '@/config/features'

interface HeaderProps {
  mode: 'film' | 'series' | 'wiki'
}

export function Header({ mode }: HeaderProps) {
  const isWiki = mode === 'wiki'

  const gameOpenModal = useGameStore((s) => s.openModal)
  const wikiOpenModal = useWikiStore((s) => s.openModal)
  const openModal = isWiki ? wikiOpenModal : gameOpenModal

  const gameChallenge = useGameStore((s) => s.challenge)
  const wikiChallenge = useWikiStore((s) => s.challenge)
  const gameType = useGameStore((s) => s.gameType)

  const lastNumberRef = useRef<number | null>(null)
  if (!isWiki && gameChallenge?.challengeNumber) lastNumberRef.current = gameChallenge.challengeNumber
  if (isWiki && wikiChallenge?.challengeNumber) lastNumberRef.current = wikiChallenge.challengeNumber
  const displayNumber = lastNumberRef.current

  const icon = isWiki
    ? <Landmark size={22} className="text-film-gold" aria-hidden />
    : mode === 'series' || gameType === 'series'
      ? <Tv size={22} className="text-film-gold" aria-hidden />
      : <Film size={22} className="text-film-gold" aria-hidden />

  return (
    <header className="sticky top-0 z-30 w-full border-b border-film-border bg-film-black/90 backdrop-blur-md">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: home + rules */}
        <div className="flex items-center gap-1">
          <a
            href="/"
            aria-label="Choisir le jeu"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold"
          >
            <Home size={20} aria-hidden />
          </a>
          <button
            onClick={() => openModal('rules')}
            aria-label="Règles du jeu"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold"
          >
            <HelpCircle size={20} aria-hidden />
          </button>
        </div>

        {/* Center: logo */}
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-title text-xl font-bold text-gradient-gold tracking-tight">
            {BRAND_NAME}
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
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold"
          >
            <CalendarDays size={20} aria-hidden />
          </button>
          <button
            onClick={() => openModal('stats')}
            aria-label="Mes statistiques"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold"
          >
            <BarChart2 size={20} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  )
}
