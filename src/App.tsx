import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { GamePage } from './components/game/GamePage'

const RulesModal = lazy(() => import('./components/modals/RulesModal').then((m) => ({ default: m.RulesModal })))
const ArchiveModal = lazy(() => import('./components/modals/ArchiveModal').then((m) => ({ default: m.ArchiveModal })))
const StatsModal = lazy(() => import('./components/modals/StatsModal').then((m) => ({ default: m.StatsModal })))
import { FEATURES } from './config/features'
import { migrateLegacyRulesSeen, rulesSeenKeyForRoute } from './lib/rulesSeen'
import { useGameStore } from './store/gameStore'
import { useWikiStore } from './store/wikiStore'
import { fetchChallengeCommunityStats } from './api/client'
import type { GlobalStatsPayload } from './api/client'
import { loadStats } from './lib/storage'
import { useAuthStore } from './store/authStore'
import { AuthModal } from './components/modals/AuthModal'
import { ResetPasswordPage } from './components/ResetPasswordPage'
import { PalettePicker } from './components/PalettePicker'
import { FriendsPage } from './components/FriendsPage'
import { ProfilePage } from './components/ProfilePage'
import { EmailVerificationBanner } from './components/EmailVerificationBanner'

const EMPTY_GLOBAL_STATS: GlobalStatsPayload = {
  totalGames: 0,
  totalWins: 0,
  totalLosses: 0,
  winRate: 0,
  winsByAttempt: {},
  lastUpdated: '',
}

function GameModals({ mode }: { mode: 'film' | 'series' | 'wiki' }) {
  const gameUi = useGameStore((s) => s.ui)
  const gameCloseModal = useGameStore((s) => s.closeModal)
  const gameChallenge = useGameStore((s) => s.challenge)
  const wikiUi = useWikiStore((s) => s.ui)
  const wikiCloseModal = useWikiStore((s) => s.closeModal)
  const wikiChallenge = useWikiStore((s) => s.challenge)

  const isWiki = mode === 'wiki'
  const ui = isWiki ? wikiUi : gameUi
  const closeModal = isWiki ? wikiCloseModal : gameCloseModal
  const challenge = isWiki ? wikiChallenge : gameChallenge

  const [globalStats, setGlobalStats] = useState<GlobalStatsPayload>(EMPTY_GLOBAL_STATS)

  const statsType = isWiki ? 'wiki' : mode === 'series' ? 'series' : 'film'
  const serverStatsForMode = useAuthStore((s) => s.serverStats[statsType])
  const personalStatsRaw = useMemo(() => loadStats(statsType), [statsType, ui.modalType, ui.isModalOpen])
  const personalStats = useMemo(() => {
    if (serverStatsForMode) {
      return {
        currentStreak: serverStatsForMode.currentStreak,
        maxStreak: serverStatsForMode.maxStreak,
        gamesPlayed: serverStatsForMode.gamesPlayed,
        winRate: serverStatsForMode.gamesPlayed > 0
          ? Math.round((serverStatsForMode.wins / serverStatsForMode.gamesPlayed) * 100)
          : 0,
      }
    }
    return {
      currentStreak: personalStatsRaw.currentStreak,
      maxStreak: personalStatsRaw.maxStreak,
      gamesPlayed: personalStatsRaw.gamesPlayed,
      winRate: personalStatsRaw.gamesPlayed > 0
        ? Math.round((personalStatsRaw.gamesWon / personalStatsRaw.gamesPlayed) * 100)
        : 0,
    }
  }, [serverStatsForMode, personalStatsRaw])
  const personalDistribution = useMemo(() => {
    if (serverStatsForMode) {
      return Object.fromEntries(
        ([1, 2, 3, 4, 5] as const).map((k) => [k, serverStatsForMode.distribution[String(k)] ?? 0])
      ) as Record<1 | 2 | 3 | 4 | 5, number>
    }
    return personalStatsRaw.guessDistribution
  }, [serverStatsForMode, personalStatsRaw])

  const communityDateLabel =
    challenge?.date != null
      ? `Pour le défi du ${new Date(challenge.date + 'T12:00:00').toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })} (tous les joueurs)`
      : null

  useEffect(() => {
    if (!ui.isModalOpen || ui.modalType !== 'stats') return
    const id = challenge && 'challengeId' in challenge ? challenge.challengeId : null
    if (id == null) {
      setGlobalStats(EMPTY_GLOBAL_STATS)
      return
    }
    fetchChallengeCommunityStats(id)
      .then(setGlobalStats)
      .catch(() => setGlobalStats(EMPTY_GLOBAL_STATS))
  }, [ui.isModalOpen, ui.modalType, challenge?.challengeId])

  return (
    <Suspense>
      <RulesModal mode={isWiki ? 'wiki' : mode === 'series' ? 'series' : 'film'} />
      <ArchiveModal mode={isWiki ? 'wiki' : 'classic'} />
      <StatsModal
        isOpen={ui.isModalOpen && ui.modalType === 'stats'}
        onClose={closeModal}
        mode={isWiki ? 'wiki' : mode === 'series' ? 'series' : 'film'}
        communityDateLabel={communityDateLabel}
        globalStats={globalStats}
        personalStats={personalStats}
        personalDistribution={personalDistribution}
      />
    </Suspense>
  )
}

function GameLayout({ mode }: { mode: 'film' | 'series' | 'wiki' }) {
  const gameOpenModal = useGameStore((s) => s.openModal)
  const wikiOpenModal = useWikiStore((s) => s.openModal)

  useEffect(() => {
    try {
      migrateLegacyRulesSeen()
      const key = rulesSeenKeyForRoute(mode)
      if (mode === 'wiki') {
        if (!localStorage.getItem(key)) wikiOpenModal('rules')
      } else if (!localStorage.getItem(key)) {
        gameOpenModal('rules')
      }
    } catch {
      /* navigation privée */
    }
  }, [mode, gameOpenModal, wikiOpenModal])

  return (
    <div className="app min-h-dvh flex flex-col bg-film-black text-film-text" data-mode={mode}>
      <Header mode={mode} />
      <main id="main-content" className="flex-1">
        <GamePage mode={mode} />
      </main>
      <Footer />
      <GameModals mode={mode} />
    </div>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthShell>
          <Routes>
            <Route path="/films/*" element={<GameLayout mode="film" />} />
            {FEATURES.enableSeries && <Route path="/series/*" element={<GameLayout mode="series" />} />}
            {FEATURES.enableWiki && <Route path="/wiki/*" element={<GameLayout mode="wiki" />} />}
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/" element={<Navigate to="/films" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthShell>
      </BrowserRouter>
    </MotionConfig>
  )
}

function AuthShell({ children }: { children: React.ReactNode }) {
  const fetchMe = useAuthStore((s) => s.fetchMe)
  useEffect(() => {
    void fetchMe()
  }, [fetchMe])
  return (
    <>
      <EmailVerificationBanner />
      {children}
      <AuthModal />
      <PalettePicker />
    </>
  )
}

function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-film-black text-film-text px-4 text-center">
      <p className="text-6xl font-title font-bold text-film-gold">404</p>
      <p className="text-film-text-dim">Cette page n'existe pas.</p>
      <a href="/films" className="text-sm text-film-gold hover:underline">Retour au jeu</a>
    </div>
  )
}
