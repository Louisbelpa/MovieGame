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
  const status = useGameStore((s) => s.status)

  useEffect(() => {
    if (status === 'idle') return
    if (localStorage.getItem(RULES_SEEN_KEY)) return
    localStorage.setItem(RULES_SEEN_KEY, '1')
    openModal('rules')
  }, [status, openModal])
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
