import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { GamePage } from './components/game/GamePage'
import { RulesModal } from './components/modals/RulesModal'
import { ArchiveModal } from './components/modals/ArchiveModal'
import { StatsModal } from './components/modals/StatsModal'
import { FEATURES } from './config/features'
import { useGameStore } from './store/gameStore'
import { useWikiStore } from './store/wikiStore'
import { fetchGlobalStats } from './api/client'
import type { GlobalStatsPayload } from './api/client'
import { fetchWikiGlobalStats } from './api/wikiClient'
import { loadStats } from './lib/storage'

const EMPTY_GLOBAL_STATS: GlobalStatsPayload = {
  totalGames: 0,
  totalWins: 0,
  totalLosses: 0,
  winRate: 0,
  winsByAttempt: {},
  lastUpdated: '',
}

function GameModals({ mode }: { mode: 'film' | 'series' | 'wiki' }) {
  const ui = useGameStore((s) => s.ui)
  const closeModal = useGameStore((s) => s.closeModal)
  const gameType = useGameStore((s) => s.gameType)
  const [globalStats, setGlobalStats] = useState<GlobalStatsPayload>(EMPTY_GLOBAL_STATS)

  const statsType = mode === 'series' ? 'series' : 'film'
  const personalStatsRaw = useMemo(() => loadStats(statsType), [statsType, ui.modalType, ui.isModalOpen])
  const personalStats = useMemo(() => ({
    currentStreak: personalStatsRaw.currentStreak,
    maxStreak: personalStatsRaw.maxStreak,
    gamesPlayed: personalStatsRaw.gamesPlayed,
    winRate: personalStatsRaw.gamesPlayed > 0
      ? Math.round((personalStatsRaw.gamesWon / personalStatsRaw.gamesPlayed) * 100)
      : 0,
  }), [personalStatsRaw])

  useEffect(() => {
    if (!ui.isModalOpen || ui.modalType !== 'stats') return
    fetchGlobalStats()
      .then(setGlobalStats)
      .catch(() => setGlobalStats(EMPTY_GLOBAL_STATS))
  }, [ui.isModalOpen, ui.modalType, mode, gameType])

  return (
    <>
      <RulesModal mode={mode === 'series' ? 'series' : 'film'} />
      <ArchiveModal mode="classic" />
      <StatsModal
        isOpen={ui.isModalOpen && ui.modalType === 'stats'}
        onClose={closeModal}
        mode={mode === 'series' ? 'series' : 'film'}
        globalStats={globalStats}
        personalStats={personalStats}
      />
    </>
  )
}

function WikiModals() {
  const ui = useWikiStore((s) => s.ui)
  const closeModal = useWikiStore((s) => s.closeModal)
  const [globalStats, setGlobalStats] = useState<GlobalStatsPayload>(EMPTY_GLOBAL_STATS)

  const personalStatsRaw = useMemo(() => loadStats('wiki'), [ui.modalType, ui.isModalOpen])
  const personalStats = useMemo(() => ({
    currentStreak: personalStatsRaw.currentStreak,
    maxStreak: personalStatsRaw.maxStreak,
    gamesPlayed: personalStatsRaw.gamesPlayed,
    winRate: personalStatsRaw.gamesPlayed > 0
      ? Math.round((personalStatsRaw.gamesWon / personalStatsRaw.gamesPlayed) * 100)
      : 0,
  }), [personalStatsRaw])

  useEffect(() => {
    if (!ui.isModalOpen || ui.modalType !== 'stats') return
    fetchWikiGlobalStats()
      .then(setGlobalStats)
      .catch(() => setGlobalStats(EMPTY_GLOBAL_STATS))
  }, [ui.isModalOpen, ui.modalType])

  return (
    <>
      <RulesModal mode="wiki" />
      <ArchiveModal mode="wiki" />
      <StatsModal
        isOpen={ui.isModalOpen && ui.modalType === 'stats'}
        onClose={closeModal}
        mode="wiki"
        globalStats={globalStats}
        personalStats={personalStats}
      />
    </>
  )
}

function GameLayout({ mode }: { mode: 'film' | 'series' | 'wiki' }) {
  return (
    <div className="app min-h-dvh flex flex-col bg-film-black text-film-text" data-mode={mode}>
      <Header mode={mode} />
      <main id="main-content" className="flex-1">
        <GamePage mode={mode} />
      </main>
      <Footer />
      {mode === 'wiki' ? <WikiModals /> : <GameModals mode={mode} />}
    </div>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Routes>
          <Route path="/films/*" element={<GameLayout mode="film" />} />
          {FEATURES.enableSeries && <Route path="/series/*" element={<GameLayout mode="series" />} />}
          {FEATURES.enableWiki && <Route path="/wiki/*" element={<GameLayout mode="wiki" />} />}
          <Route path="/" element={<Navigate to="/films" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
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
