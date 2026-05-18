/**
 * layout/Header.tsx
 * Responsive top bar:
 *  - Mobile: compact (home + rules | logo+# | account + archive + stats)
 *  - Desktop (lg+): logo left | mode tabs center | streak + controls right
 */

import { useRef } from 'react'
import { BarChart2, CalendarDays, LogIn, Flame, UserRound } from 'lucide-react'
import { Film, Tv, User } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
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

const MODE_TABS = [
  { id: 'film',   label: 'Films',        to: '/films',  Icon: Film,     color: 'var(--sg-films)',  enabled: true },
  { id: 'series', label: 'Séries',       to: '/series', Icon: Tv,       color: 'var(--sg-series)', enabled: FEATURES.enableSeries },
  { id: 'wiki',   label: 'Personnalités', to: '/wiki',  Icon: User, color: 'var(--sg-wiki)',   enabled: FEATURES.enableWiki },
].filter((t) => t.enabled)

export function Header({ mode }: HeaderProps) {
  const isWiki = mode === 'wiki'
  const { pathname } = useLocation()

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

  const activeTabId = pathname.startsWith('/series') ? 'series' : pathname.startsWith('/wiki') ? 'wiki' : 'film'

  const iconBtn = 'inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold'

  return (
    <header className="w-full">
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

        {/* ── Center: mode tabs (desktop only) ── */}
        {MODE_TABS.length > 1 && (
          <nav className="hidden lg:flex items-center gap-1" aria-label="Mode de jeu">
            {MODE_TABS.map(({ id, label, to, Icon, color }) => {
              const isActive = id === activeTabId
              return (
                <a
                  key={id}
                  href={to}
                  aria-current={isActive ? 'page' : undefined}
                  className="flex items-center gap-1.5 rounded-lg text-[13px] font-medium transition-all duration-150"
                  style={isActive ? {
                    color,
                    background: `color-mix(in srgb, ${color} 14%, transparent)`,
                    padding: '7px 14px',
                  } : {
                    color: 'var(--color-film-text-dim)',
                    padding: '7px 14px',
                  }}
                >
                  <Icon size={14} aria-hidden />
                  {label}
                </a>
              )
            })}
          </nav>
        )}

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
              {/* Mobile: icon only */}
              <button
                type="button"
                onClick={() => openAuthModal()}
                aria-label="Connexion ou inscription"
                className={`lg:hidden ${iconBtn}`}
              >
                <UserRound size={20} aria-hidden />
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
