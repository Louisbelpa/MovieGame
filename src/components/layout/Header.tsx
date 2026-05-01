/**
 * layout/Header.tsx
 * Top app bar with logo, challenge number, and icon buttons.
 * Detects /wiki route and uses wikiStore for modal actions.
 */

import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { HelpCircle, BarChart2, Film, CalendarDays, Tv, Home, BookOpen } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import { useWikiStore } from '@/store/wikiStore'
import { BRAND_NAME } from '@/config/features'

export function Header() {
  const location = useLocation()
  const isWiki = location.pathname.startsWith('/wiki')

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
    ? <BookOpen size={22} className="text-[#c4b5fd]" aria-hidden />
    : gameType === 'series'
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
