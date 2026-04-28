/**
 * App.tsx
 * Root layout: header + game page + footer + all modals.
 */

import { useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { GamePage } from '@/components/game/GamePage'
import { WinModal } from '@/components/modals/WinModal'
import { LoseModal } from '@/components/modals/LoseModal'
import { StatsModal } from '@/components/modals/StatsModal'
import { RulesModal } from '@/components/modals/RulesModal'
import { useGameStore } from '@/store/gameStore'

const RULES_SEEN_KEY = 'cineguess:rules_seen'

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

export default function App() {
  useFirstVisit()

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
    </div>
  )
}
