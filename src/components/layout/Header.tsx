/**
 * layout/Header.tsx
 * Top app bar with logo, challenge number, and icon buttons.
 */

import { HelpCircle, BarChart2, Film } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'

export function Header() {
  const openModal = useGameStore((s) => s.openModal)
  const challenge = useGameStore((s) => s.challenge)

  return (
    <header className="sticky top-0 z-30 w-full border-b border-film-border bg-film-black/90 backdrop-blur-md">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: rules button */}
        <button
          onClick={() => openModal('rules')}
          aria-label="Règles du jeu"
          className="p-2 rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors"
        >
          <HelpCircle size={20} />
        </button>

        {/* Center: logo */}
        <div className="flex items-center gap-2">
          <Film size={22} className="text-film-gold" aria-hidden />
          <span className="font-title text-xl font-bold text-gradient-gold tracking-tight">
            CineGuess
          </span>
          {challenge?.challengeNumber && (
            <span className="text-film-text-dim text-sm font-mono">
              #{challenge.challengeNumber}
            </span>
          )}
        </div>

        {/* Right: stats button */}
        <button
          onClick={() => openModal('stats')}
          aria-label="Mes statistiques"
          className="p-2 rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors"
        >
          <BarChart2 size={20} />
        </button>
      </div>
    </header>
  )
}
