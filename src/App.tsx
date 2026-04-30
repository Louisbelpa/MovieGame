/**
 * App.tsx
 * Root layout: header + game page + footer + all modals.
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { GamePage } from '@/components/game/GamePage'
import { WinModal } from '@/components/modals/WinModal'
import { LoseModal } from '@/components/modals/LoseModal'
import { StatsModal } from '@/components/modals/StatsModal'
import { RulesModal } from '@/components/modals/RulesModal'
import { ArchiveModal } from '@/components/modals/ArchiveModal'
import { useGameStore } from '@/store/gameStore'

const RULES_SEEN_KEY = 'cineguess:rules_seen'

function useDynamicTitle() {
  const challengeNumber = useGameStore((s) => s.challenge?.challengeNumber ?? null)
  const viewingDate = useGameStore((s) => s.viewingDate)
  const gameType = useGameStore((s) => s.gameType)

  useEffect(() => {
    const media = gameType === 'series' ? 'la série' : 'le film'
    if (challengeNumber) {
      document.title = viewingDate
        ? `CinéGuessr #${challengeNumber} — Ancien défi`
        : `CinéGuessr #${challengeNumber} — Devine ${media} du jour`
    } else {
      document.title = `CinéGuessr — Devine ${media} du jour`
    }
  }, [challengeNumber, viewingDate, gameType])
}

function useFirstVisit() {
  const openModal = useGameStore((s) => s.openModal)

  useEffect(() => {
    // Show tutorial immediately on mount – before the game loads.
    // This avoids the race condition where the win/lose modal (shown 800ms
    // after initGame) would override the rules modal for returning users.
    if (localStorage.getItem(RULES_SEEN_KEY)) return
    openModal('rules')
  }, [openModal]) // no `status` dependency – runs once on mount
}

export default function App({ gameType = 'film' }: { gameType?: 'film' | 'series' }) {
  void gameType // type is initialized from URL in the store; prop is accepted for main.tsx clarity
  useFirstVisit()
  useDynamicTitle()

  // Synchronise le mode de jeu avec l'URL
  const location = useLocation()
  const setGameType = useGameStore((s) => s.setGameType)
  const currentGameType = useGameStore((s) => s.gameType)
  const initGame = useGameStore((s) => s.initGame)
  useEffect(() => {
    if (location.pathname.startsWith('/series')) setGameType('series')
    else setGameType('film')
  }, [location.pathname, setGameType])

  // Recharge le challenge quand le mode change
  useEffect(() => {
    initGame()
  }, [currentGameType, initGame])

  return (
    <div className="min-h-dvh flex flex-col bg-film-black text-film-text">
      <Header />

      <div className="flex-1">
        <GamePage />
      </div>

      <Footer />

      <WinModal />
      <LoseModal />
      <StatsModal />
      <RulesModal />
      <ArchiveModal />
    </div>
  );
}
