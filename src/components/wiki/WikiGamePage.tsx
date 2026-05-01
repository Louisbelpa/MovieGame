/**
 * wiki/WikiGamePage.tsx
 * Main game view for the Wikipedia person-guessing game.
 */

import { useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar, Share2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { WikiHintPanel } from './WikiHintPanel'
import { WikiGuessInput } from './WikiGuessInput'
import { GuessList } from '@/components/game/GuessList'
import { AttemptTracker } from '@/components/game/AttemptTracker'
import { Spinner } from '@/components/ui/Spinner'
import {
  useWikiStore,
  selectWikiAttemptsLeft,
  selectWikiCurrentHints,
  selectWikiIsGameOver,
  getTodayParis,
} from '@/store/wikiStore'

function formatDateFr(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function DateNavBar({ directionRef }: { directionRef: React.MutableRefObject<'prev' | 'next'> }) {
  const viewingDate = useWikiStore((s) => s.viewingDate)
  const challenge = useWikiStore((s) => s.challenge)
  const loadDate = useWikiStore((s) => s.loadDate)
  const navigateDate = useWikiStore((s) => s.navigateDate)
  const status = useWikiStore((s) => s.status)
  const hasPrev = useWikiStore((s) => s.hasPrev)
  const hasNext = useWikiStore((s) => s.hasNext)

  const todayParis = getTodayParis()
  const currentDate = viewingDate ?? todayParis
  const isToday = currentDate === todayParis
  const isLoading = status === 'idle'

  const goBack = useCallback(() => { directionRef.current = 'prev'; navigateDate('prev') }, [navigateDate, directionRef])
  const goForward = useCallback(() => { if (isToday) return; directionRef.current = 'next'; navigateDate('next') }, [isToday, navigateDate, directionRef])
  const goToday = useCallback(() => { if (isToday) return; loadDate(todayParis) }, [isToday, todayParis, loadDate])

  if (!challenge && !viewingDate) return null

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-2 py-1.5 px-1">
        <button onClick={goBack} disabled={isLoading || !hasPrev}
          className="p-1.5 rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title={!hasPrev ? 'Pas de défi antérieur' : 'Défi précédent'}>
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={13} className="text-film-text-dim" />
          {isToday ? (
            <span className="font-semibold text-film-gold">Aujourd'hui</span>
          ) : (
            <button onClick={goToday} className="text-film-text-dim hover:text-film-text transition-colors cursor-pointer" title="Retour à aujourd'hui">
              {formatDateFr(currentDate)}
            </button>
          )}
          {viewingDate && (
            <span className="text-[10px] bg-film-surface border border-film-border px-1.5 py-0.5 rounded text-film-text-dim">
              Ancien défi
            </span>
          )}
        </div>
        <button onClick={goForward} disabled={isToday || isLoading || !hasNext}
          className="p-1.5 rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title={isToday ? "C'est le défi du jour" : !hasNext ? 'Pas de défi suivant' : 'Défi suivant'}>
          <ChevronRight size={18} />
        </button>
      </div>
      {isToday && hasPrev && (
        <p className="text-center text-[11px] text-film-text-dim/60 tracking-wide">
          ← défis des jours précédents disponibles
        </p>
      )}
    </div>
  )
}

export function WikiGamePage() {
  const initGame = useWikiStore((s) => s.initGame)
  const submitGuess = useWikiStore((s) => s.submitGuess)
  const skipAttempt = useWikiStore((s) => s.skipAttempt)

  const challenge = useWikiStore((s) => s.challenge)
  const result = useWikiStore((s) => s.result)
  const guesses = useWikiStore((s) => s.guesses)
  const status = useWikiStore((s) => s.status)
  const hintsRevealed = useWikiStore((s) => s.hintsRevealed)
  const viewingDate = useWikiStore((s) => s.viewingDate)

  const attemptsLeft = useWikiStore(selectWikiAttemptsLeft)
  const currentHints = useWikiStore(useShallow(selectWikiCurrentHints))
  const isGameOver = useWikiStore(selectWikiIsGameOver)
  const openModal = useWikiStore((s) => s.openModal)

  const directionRef = useRef<'prev' | 'next'>('prev')

  useEffect(() => { initGame() }, [initGame])

  const dateKey = viewingDate ?? 'today'
  const slideX = directionRef.current === 'prev' ? 32 : -32

  return (
    <AnimatePresence mode="sync">
      {status === 'idle' && (
        <motion.div key={`loading-${dateKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
          className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Spinner size="lg" />
          <p className="text-film-text-dim text-sm animate-pulse">Chargement du défi…</p>
        </motion.div>
      )}

      {status === 'not_found' && (
        <motion.div key={`not-found-${dateKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
          className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-6 flex flex-col gap-3">
          <DateNavBar directionRef={directionRef} />
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2 text-center">
            <p className="text-film-text font-semibold">Aucun défi planifié pour aujourd'hui.</p>
            <p className="text-film-text-dim text-sm">Ajoutez une personnalité dans l'admin et planifiez un défi pour cette date.</p>
          </div>
        </motion.div>
      )}

      {challenge && (
        <motion.main key={challenge.date}
          className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-6 pb-24 sm:pb-6 flex flex-col gap-3 sm:gap-5"
          initial={{ opacity: 0, x: slideX }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -slideX }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}>

          <DateNavBar directionRef={directionRef} />

          {/* Profile + hints — primary content */}
          {(currentHints.length > 0 || challenge.hintsAvailable > 0) && (
            <WikiHintPanel
              photoUrl={challenge.photoUrl}
              profile={challenge.profile}
              hints={currentHints}
              hintsAvailable={challenge.hintsAvailable}
              hintsRevealed={hintsRevealed}
            />
          )}

          {/* Attempt tracker + input */}
          {!isGameOver && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <AttemptTracker guesses={guesses} maxAttempts={challenge.maxAttempts} />
                <span className="text-xs text-film-text-dim font-mono">
                  {guesses.length}/{challenge.maxAttempts}
                </span>
              </div>
              <WikiGuessInput
                onSubmit={submitGuess}
                onSkip={skipAttempt}
                attemptsLeft={attemptsLeft}
                disabled={isGameOver}
              />
            </section>
          )}

          {/* Game over recap */}
          {isGameOver && (
            <div className={`flex items-center justify-between gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold
              ${status === 'won'
                ? 'bg-film-green/10 border border-film-green/30 text-film-green'
                : 'bg-film-red/10 border border-film-red/30 text-film-red'}`}>
              <span>
                {status === 'won'
                  ? `Bravo ! Trouvé en ${guesses.findIndex(g => g.status === 'correct') + 1}/${challenge.maxAttempts}`
                  : 'Pas cette fois…'}
              </span>
              {result?.name && (
                <span className="text-xs font-medium text-film-text-dim truncate max-w-[45%] text-center">
                  {result.name}
                </span>
              )}
              <button
                onClick={() => openModal(status === 'won' ? 'win' : 'lose')}
                className="flex items-center gap-1.5 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                title="Voir les détails du défi">
                <Share2 size={13} />
                Voir le résultat
              </button>
            </div>
          )}

          {/* Guess history */}
          <GuessList guesses={guesses} maxAttempts={challenge.maxAttempts} />
        </motion.main>
      )}
    </AnimatePresence>
  )
}
