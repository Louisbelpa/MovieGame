/**
 * layout/Header.tsx
 * Responsive top bar:
 *  - Mobile: compact (home + rules | logo+# | account + archive + stats)
 *  - Desktop (lg+): logo left | mode tabs center | streak + controls right
 */

import { useRef, useState, useEffect } from 'react'
import { BarChart2, CalendarDays, LogIn, Flame, UserRound } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import { useWikiStore } from '@/store/wikiStore'
import { useAuthStore } from '@/store/authStore'
import { useAuthModal } from '@/components/modals/AuthModal'
import { ApertureIcon } from '@/components/ui/ApertureIcon'
import { loadStats } from '@/lib/storage'
import { FEATURES } from '@/config/features'

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

  const filmStreak = loadStats('film').currentStreak
  const wikiStreak = FEATURES.enableWiki ? loadStats('wiki').currentStreak : 0
  const seriesStreak = FEATURES.enableSeries ? loadStats('series').currentStreak : 0
  const maxStreak = Math.max(filmStreak, wikiStreak, seriesStreak)

  const iconBtn = 'inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold'

  const [countdown, setCountdown] = useState('')
  useEffect(() => {
    function tick() {
      const now = new Date()
      const paris = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
      const midnight = new Date(paris)
      midnight.setHours(24, 0, 0, 0)
      const diff = midnight.getTime() - paris.getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(h > 0
        ? `${h}h ${String(m).padStart(2, '0')}m`
        : `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="w-full" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* ── Left: logo + help (mobile) ── */}
        <div className="flex items-center gap-1">
          {/* Logo: always visible */}
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
            <div className="overflow-hidden h-5 flex items-center ml-1">
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

        {/* ── Center: countdown ── */}
        <div className="flex-1 flex items-center justify-center">
          {countdown && (
            <span className="text-[11px] font-mono text-film-text-dim/60 whitespace-nowrap">
              Prochain jeu · <span className="text-film-text-dim">{countdown}</span>
            </span>
          )}
        </div>

        {/* ── Right: actions ── */}
        <div className="flex items-center gap-1">
          {/* Streak pill: desktop only */}
          {maxStreak > 0 && (
            <span className="hidden lg:flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-1 mr-1">
              <Flame size={12} aria-hidden />
              {maxStreak}j
            </span>
          )}

          {/* Avatar / Login */}
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
            <>
              {/* Mobile: icon only — w-8 h-8 like avatar to avoid header overflow */}
              <button
                type="button"
                onClick={() => openAuthModal()}
                aria-label="Connexion ou inscription"
                className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors cursor-pointer"
              >
                <UserRound size={18} aria-hidden />
              </button>
              {/* Desktop: pill with label */}
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="hidden lg:flex items-center gap-1.5 rounded-full border border-film-border bg-film-dark hover:bg-film-gray px-3 py-1.5 text-sm text-film-text-dim hover:text-film-text transition-colors cursor-pointer"
              >
                <LogIn size={14} aria-hidden />
                Se connecter
              </button>
            </>
          )}

          {/* Archive: always */}
          <button onClick={() => openModal('archive')} aria-label="Archives" className={iconBtn}>
            <CalendarDays size={20} aria-hidden />
          </button>

          {/* Stats: always */}
          <button onClick={() => openModal('stats')} aria-label="Mes statistiques" className={iconBtn}>
            <BarChart2 size={20} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  )
}
