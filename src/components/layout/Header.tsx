/**
 * layout/Header.tsx
 * Top app bar with logo, challenge number, and icon buttons.
 * Detects /wiki route and uses wikiStore for modal actions.
 */

import { useRef } from 'react'
import { HelpCircle, BarChart2, CalendarDays, Home, LogIn } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import { useWikiStore } from '@/store/wikiStore'
import { useAuthStore } from '@/store/authStore'
import { useAuthModal } from '@/components/modals/AuthModal'
import { ApertureIcon } from '@/components/ui/ApertureIcon'

interface HeaderProps {
  mode: 'film' | 'series' | 'wiki'
}

export function Header({ mode }: HeaderProps) {
  const isWiki = mode === 'wiki'

  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const { open: openAuthModal } = useAuthModal()

  const gameOpenModal = useGameStore((s) => s.openModal)
  const wikiOpenModal = useWikiStore((s) => s.openModal)
  const openModal = isWiki ? wikiOpenModal : gameOpenModal

  const gameChallenge = useGameStore((s) => s.challenge)
  const wikiChallenge = useWikiStore((s) => s.challenge)

  const lastNumberRef = useRef<number | null>(null)
  const prevModeRef = useRef(mode)
  if (prevModeRef.current !== mode) {
    prevModeRef.current = mode
    lastNumberRef.current = null
  }
  if (!isWiki && gameChallenge?.challengeNumber) lastNumberRef.current = gameChallenge.challengeNumber
  if (isWiki && wikiChallenge?.challengeNumber) lastNumberRef.current = wikiChallenge.challengeNumber
  const displayNumber = lastNumberRef.current

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
          <a
            href="/"
            aria-label="Accueil GuessToday"
            className="inline-flex items-center gap-2 rounded-lg px-1 -mx-1 min-h-[44px] text-film-text hover:bg-film-gray/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold"
          >
            <ApertureIcon size={22} />
            <span className="font-title text-xl leading-none tracking-tight">
              <span className="font-[500] text-film-text">Guess</span>
              <span className="italic font-[600] text-gradient-gold">today</span>
            </span>
          </a>
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

        {/* Right: compte + archives + stats */}
        <div className="flex items-center gap-1">
          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-film-gold/10 animate-pulse" />
          ) : user ? (
            <a
              href="/profile"
              aria-label={`Profil de ${user.displayName}`}
              title={user.displayName}
              className="w-8 h-8 rounded-full overflow-hidden bg-film-gold/20 border border-film-gold/40 text-sm font-bold text-film-gold flex items-center justify-center hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                user.displayName.charAt(0).toUpperCase()
              )}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              aria-label="Connexion ou inscription"
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold"
            >
              <LogIn size={20} aria-hidden />
            </button>
          )}
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
