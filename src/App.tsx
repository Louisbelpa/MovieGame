/**
 * App.tsx
 * Root layout: header + game page + all modals.
 * No router needed – the app is single-page.
 */

import { useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { GamePage } from '@/components/game/GamePage'
import { WinModal } from '@/components/modals/WinModal'
import { LoseModal } from '@/components/modals/LoseModal'
import { StatsModal } from '@/components/modals/StatsModal'
import { RulesModal } from '@/components/modals/RulesModal'
import { useGameStore } from '@/store/gameStore'

// ── First-visit rules modal ───────────────────────────────────────────────────

const RULES_SEEN_KEY = 'cineguess:rules_seen'

function useFirstVisit() {
  const openModal = useGameStore((s) => s.openModal)

  useEffect(() => {
    const seen = localStorage.getItem(RULES_SEEN_KEY)
    if (!seen) {
      // Delay slightly so the game loads first
      const t = setTimeout(() => {
        openModal('rules')
        localStorage.setItem(RULES_SEEN_KEY, '1')
      }, 400)
      return () => clearTimeout(t)
    }
  }, [openModal])
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  useFirstVisit()

  return (
    <div className="min-h-dvh flex flex-col bg-film-black text-film-text">
      {/* ── Navigation ── */}
      <Header />

      {/* ── Main content ── */}
      <div className="flex-1">
        <GamePage />
      </div>

      {/* ── Modals (rendered in a portal-like fashion via AnimatePresence) ── */}
      <WinModal />
      <LoseModal />
      <StatsModal />
      <RulesModal />
    </div>
  )
}
