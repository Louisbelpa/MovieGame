/**
 * game/GamePage.tsx
 * Main game view – orchestrates all game sub-components.
 * Supports navigating past challenges with date arrows.
 */

import { useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { MovieImage } from './MovieImage'
import { GuessInput } from './GuessInput'
import { GuessList } from './GuessList'
import { HintPanel } from './HintPanel'
import { AttemptTracker } from './AttemptTracker'
import { Spinner } from '@/components/ui/Spinner'
import { useGameStore, selectAttemptsLeft, selectCurrentHints, selectIsGameOver, getTodayParis } from '@/store/gameStore'

// ─── Date navigation helpers ──────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z') // noon UTC to avoid DST shifts
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDateFr(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// ─── DateNavBar ───────────────────────────────────────────────────────────────

function DateNavBar() {
  const viewingDate = useGameStore((s) => s.viewingDate)
  const challenge = useGameStore((s) => s.challenge)
  const loadDate = useGameStore((s) => s.loadDate)
  const status = useGameStore((s) => s.status)

  const todayParis = getTodayParis()
  const currentDate = viewingDate ?? todayParis
  const isToday = currentDate === todayParis
  const isLoading = status === 'idle'

  const goBack = useCallback(() => {
    const prev = addDays(currentDate, -1)
    loadDate(prev)
  }, [currentDate, loadDate])

  const goForward = useCallback(() => {
    if (isToday) return
    const next = addDays(currentDate, 1)
    loadDate(next)
  }, [currentDate, isToday, loadDate])

  const goToday = useCallback(() => {
    if (isToday) return
    loadDate(todayParis)
  }, [isToday, todayParis, loadDate])

  if (!challenge && !viewingDate) return null

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 px-1">
      <button
        onClick={goBack}
        disabled={isLoading}
        className="p-1.5 rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-surface transition-colors disabled:opacity-40"
        title="Défi précédent"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="flex items-center gap-2 text-sm">
        <Calendar size={13} className="text-film-text-dim" />
        {isToday ? (
          <span className="font-semibold text-film-gold">Aujourd'hui</span>
        ) : (
          <button
            onClick={goToday}
            className="text-film-text-dim hover:text-film-text transition-colors"
            title="Retour à aujourd'hui"
          >
            {formatDateFr(currentDate)}
          </button>
        )}
        {viewingDate && (
          <span className="text-[10px] bg-film-surface border border-film-border px-1.5 py-0.5 rounded text-film-text-dim">
            Ancien défi
          </span>
        )}
      </div>

      <button
        onClick={goForward}
        disabled={isToday || isLoading}
        className="p-1.5 rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title={isToday ? "C'est le défi du jour" : "Défi suivant"}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

// ─── GamePage ─────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    initGame()
  }, [initGame])

  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner size="lg" />
        <p className="text-film-text-dim text-sm animate-pulse">
          Chargement du défi…
        </p>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-film-red font-semibold">Aucun défi disponible pour cette date.</p>
        <p className="text-film-text-dim text-sm">Essayez une autre date.</p>
      </div>
    )
  }

  const displayImageUrl = challenge.imageUrl

  return (
    <motion.main
      className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-6 flex flex-col gap-3 sm:gap-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Date navigation */}
      <DateNavBar />

      {/* Movie image */}
      <section>
        <MovieImage
          imageUrl={displayImageUrl}
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
                : '?'}/${challenge.maxAttempts}`
            : "Pas cette fois…"}
        </div>
      )}

      {/* Hints */}
      {(currentHints.length > 0 || challenge.hintsAvailable > 0) && (
        <HintPanel
          hints={currentHints}
          hintsAvailable={challenge.hintsAvailable}
          hintsRevealed={hintsRevealed}
        />
      )}

      {/* Guess history */}
      <section>
        <h3 className="text-xs font-semibold text-film-text-dim uppercase tracking-wider mb-2">
          Tentatives
        </h3>
        <GuessList guesses={guesses} maxAttempts={challenge.maxAttempts} />
      </section>
    </motion.main>
  )
}
