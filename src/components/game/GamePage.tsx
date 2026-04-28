/**
 * game/GamePage.tsx
 * Main game view – orchestrates all game sub-components.
 * Supports navigating past challenges with date arrows.
 */

import { useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar, Share2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { MovieImage } from './MovieImage'
import { GuessInput } from './GuessInput'
import { GuessList } from './GuessList'
import { HintPanel } from './HintPanel'
import { AttemptTracker } from './AttemptTracker'
import { Spinner } from '@/components/ui/Spinner'
import { useGameStore, selectAttemptsLeft, selectCurrentHints, selectIsGameOver, getTodayParis } from '@/store/gameStore'

// ─── Date navigation helpers ──────────────────────────────────────────────────

function formatDateFr(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// ─── DateNavBar ───────────────────────────────────────────────────────────────

function DateNavBar({ directionRef }: { directionRef: React.MutableRefObject<'prev' | 'next'> }) {
  const viewingDate = useGameStore((s) => s.viewingDate)
  const challenge = useGameStore((s) => s.challenge)
  const loadDate = useGameStore((s) => s.loadDate)
  const navigateDate = useGameStore((s) => s.navigateDate)
  const status = useGameStore((s) => s.status)
  const hasPrev = useGameStore((s) => s.hasPrev)
  const hasNext = useGameStore((s) => s.hasNext)

  const todayParis = getTodayParis()
  const currentDate = viewingDate ?? todayParis
  const isToday = currentDate === todayParis
  const isLoading = status === 'idle'

  const goBack = useCallback(() => {
    directionRef.current = 'prev'
    navigateDate('prev')
  }, [navigateDate, directionRef])

  const goForward = useCallback(() => {
    if (isToday) return
    directionRef.current = 'next'
    navigateDate('next')
  }, [isToday, navigateDate, directionRef])

  const goToday = useCallback(() => {
    if (isToday) return
    loadDate(todayParis)
  }, [isToday, todayParis, loadDate])

  if (!challenge && !viewingDate) return null

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 px-1">
      <button
        onClick={goBack}
        disabled={isLoading || !hasPrev}
        className="p-1.5 rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        title={!hasPrev ? 'Pas de défi antérieur' : 'Défi précédent'}
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
            className="text-film-text-dim hover:text-film-text transition-colors cursor-pointer"
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
        disabled={isToday || isLoading || !hasNext}
        className="p-1.5 rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        title={isToday ? "C'est le défi du jour" : !hasNext ? 'Pas de défi suivant' : 'Défi suivant'}
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
  const viewingDate = useGameStore((s) => s.viewingDate)

  const attemptsLeft = useGameStore(selectAttemptsLeft)
  const currentHints = useGameStore(useShallow(selectCurrentHints))
  const isGameOver = useGameStore(selectIsGameOver)
  const openModal = useGameStore((s) => s.openModal)

  const directionRef = useRef<'prev' | 'next'>('prev')

  useEffect(() => {
    initGame()
  }, [initGame])

  const dateKey = viewingDate ?? 'today'
  // positive x = arrive from right (prev = older = appears from left side)
  // negative x = arrive from left (next = newer = appears from right side)
  const slideX = directionRef.current === 'prev' ? 32 : -32

  return (
    <AnimatePresence mode="sync">
      {status === 'idle' && (
        <motion.div
          key={`loading-${dateKey}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
        >
          <Spinner size="lg" />
          <p className="text-film-text-dim text-sm animate-pulse">
            Chargement du défi…
          </p>
        </motion.div>
      )}

      {status === 'not_found' && (
        <motion.div
          key={`not-found-${dateKey}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-6 flex flex-col gap-3"
        >
          <DateNavBar directionRef={directionRef} />
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2 text-center">
            <p className="text-film-text font-semibold">Aucun défi pour cette date.</p>
            <p className="text-film-text-dim text-sm">Utilisez les flèches pour naviguer vers une date avec un défi.</p>
          </div>
        </motion.div>
      )}

      {status !== 'idle' && status !== 'not_found' && !challenge && (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="flex flex-col items-center justify-center min-h-[60vh] gap-3"
        >
          <p className="text-film-red font-semibold">Aucun défi disponible.</p>
        </motion.div>
      )}

      {challenge && (
        <motion.main
          key={challenge.date}
          className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-6 flex flex-col gap-3 sm:gap-5"
          initial={{ opacity: 0, x: slideX }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -slideX }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {/* Date navigation */}
          <DateNavBar directionRef={directionRef} />

          {/* Movie image */}
          <section>
            <MovieImage
              imageUrl={challenge.imageUrl}
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
              className={`flex items-center justify-between gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold
                ${status === 'won'
                  ? 'bg-film-green/10 border border-film-green/30 text-film-green'
                  : 'bg-film-red/10 border border-film-red/30 text-film-red'
                }`}
            >
              <span>
                {status === 'won'
                  ? `Bravo\u00a0! Trouvé en ${guesses.filter(g => g.status === 'correct').length > 0
                      ? guesses.findIndex(g => g.status === 'correct') + 1
                      : '?'}/${challenge.maxAttempts}`
                  : 'Pas cette fois…'}
              </span>
              <button
                onClick={() => openModal(status === 'won' ? 'win' : 'lose')}
                className="flex items-center gap-1.5 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                title="Revoir et partager"
              >
                <Share2 size={13} />
                Partager
              </button>
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
      )}
    </AnimatePresence>
  )
}
