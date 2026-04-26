/**
 * game/GamePage.tsx
 * Main game view – orchestrates all game sub-components.
 * Reads from Zustand; all mutations go through store actions.
 */

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { MovieImage } from './MovieImage'
import { GuessInput } from './GuessInput'
import { GuessList } from './GuessList'
import { HintPanel } from './HintPanel'
import { AttemptTracker } from './AttemptTracker'
import { Spinner } from '@/components/ui/Spinner'
import { useGameStore, selectAttemptsLeft, selectCurrentHints, selectIsGameOver } from '@/store/gameStore'

export function GamePage() {
  const initGame = useGameStore((s) => s.initGame)
  const submitGuess = useGameStore((s) => s.submitGuess)
  const skipAttempt = useGameStore((s) => s.skipAttempt)

  const challenge = useGameStore((s) => s.challenge)
  const guesses = useGameStore((s) => s.guesses)
  const status = useGameStore((s) => s.status)
  const hintsRevealed = useGameStore((s) => s.hintsRevealed)

  const attemptsLeft = useGameStore(selectAttemptsLeft)
  const currentHints = useGameStore(useShallow(selectCurrentHints))
  const isGameOver = useGameStore(selectIsGameOver)

  // Bootstrap on mount
  useEffect(() => {
    initGame()
  }, [initGame])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner size="lg" />
        <p className="text-film-text-dim text-sm animate-pulse">
          Chargement du défi du jour…
        </p>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-film-red font-semibold">Aucun défi disponible aujourd'hui.</p>
        <p className="text-film-text-dim text-sm">Revenez demain !</p>
      </div>
    )
  }

  // ── Game view ──────────────────────────────────────────────────────────────

  const displayImageUrl = challenge.imageUrl

  return (
    <motion.main
      className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Movie image */}
      <section>
        <MovieImage
          imageUrl={displayImageUrl}
          blurPx={0}
          attempt={guesses.length + 1}
        />
      </section>

      {/* Attempt dots + input */}
      {!isGameOver && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <AttemptTracker guesses={guesses} maxAttempts={challenge.maxAttempts} />
            <span className="text-xs text-film-text-dim font-mono">
              {guesses.length}/{challenge.maxAttempts}
            </span>
          </div>

          <GuessInput
            onSubmit={submitGuess}
            onSkip={skipAttempt}
            attemptsLeft={attemptsLeft}
            disabled={isGameOver}
          />
        </section>
      )}

      {/* Game over recap bar */}
      {isGameOver && (
        <div
          className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold
            ${status === 'won'
              ? 'bg-film-green/10 border border-film-green/30 text-film-green'
              : 'bg-film-red/10 border border-film-red/30 text-film-red'
            }`}
        >
          {status === 'won'
            ? `Bravo ! Trouvé en ${guesses.filter(g => g.status === 'correct').length > 0
                ? guesses.findIndex(g => g.status === 'correct') + 1
                : '?'}/6`
            : "Pas cette fois… Revenez demain !"}
        </div>
      )}

      {/* Hints */}
      {(currentHints.length > 0 || challenge.hintsAvailable > 0) && (
        <HintPanel
          hints={currentHints.filter((h) => h.type !== 'image_blurred')}
          hintsAvailable={challenge.hintsAvailable}
          hintsRevealed={hintsRevealed}
        />
      )}

      {/* Guess history */}
      <section>
        <h3 className="text-xs font-semibold text-film-text-dim uppercase tracking-wider mb-3">
          Tentatives
        </h3>
        <GuessList guesses={guesses} maxAttempts={challenge.maxAttempts} />
      </section>
    </motion.main>
  )
}
