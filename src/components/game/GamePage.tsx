import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Share2 } from 'lucide-react'
import { GuessInput } from './GuessInput'
import { HintPanel } from './HintPanel'
import { AttemptTracker } from './AttemptTracker'
import { ModeTabs } from './ModeTabs'
import { MovieImage } from './MovieImage'
import { WikiChallengeImage } from '@/components/wiki/WikiChallengeImage'
import { WikiHintPanel } from '@/components/wiki/WikiHintPanel'
import { WikiGuessInput } from '@/components/wiki/WikiGuessInput'
import { Spinner } from '@/components/ui/Spinner'
import { WinModal } from '@/components/modals/WinModal'
import { LoseModal } from '@/components/modals/LoseModal'
import { fetchResult } from '@/api/client'
import { fetchWikiResult } from '@/api/wikiClient'
import type { HintPayload } from '@/api/client'
import type { WikiChallengePayload, WikiHintPayload, WikiVisibleProfile } from '@/api/wikiClient'
import type { GuessEntry } from '@/types'
import { useGameStore, getTodayParis } from '@/store/gameStore'
import { useWikiStore } from '@/store/wikiStore'
import { loadHistory } from '@/lib/storage'
import { buildShareText } from '@/lib/utils'
import { FEATURES } from '@/config/features'

interface GamePageProps {
  mode: 'film' | 'series' | 'wiki'
}

type SharedChallenge = {
  challengeId?: number
  id?: number
  date?: string
  challengeNumber?: number
  title?: string
  name?: string
  photoUrl?: string | null
  hints: HintPayload[] | WikiHintPayload[]
  hintsAvailable?: number
  maxAttempts: number
}

type WikiChallengeExtras = {
  profile: unknown
  personType?: WikiChallengePayload['personType']
  wikipediaUrl?: string | null
}

function formatDateFr(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function getChallengeName(challenge: { title?: string; name?: string }): string {
  return challenge.name ?? challenge.title ?? 'Défi'
}

function isWikiChallenge(challenge: SharedChallenge): challenge is SharedChallenge & WikiChallengeExtras {
  return 'profile' in challenge
}

async function shareResult(
  challengeId: string,
  guesses: Array<{ status: 'correct' | 'wrong' | 'skipped' }>,
  maxAttempts: number,
  challengeNumber?: number,
) {
  const won = guesses.some((g) => g.status === 'correct')
  const text = buildShareText(challengeId, guesses as GuessEntry[], won, maxAttempts, challengeNumber)

  if (navigator.share) {
    try {
      await navigator.share({ text })
      return
    } catch {
      // AbortError (user cancelled) or NotAllowedError — fall through to clipboard
    }
  }
  await navigator.clipboard.writeText(text)
}

export function GamePage({ mode }: GamePageProps) {
  const isWiki = mode === 'wiki'
  const gameInit = useGameStore((s) => s.initGame)
  const gameChallenge = useGameStore((s) => s.challenge)
  const gameGuesses = useGameStore((s) => s.guesses)
  const gameHintsRevealed = useGameStore((s) => s.hintsRevealed)
  const gameStatus = useGameStore((s) => s.status)
  const gameLoading = useGameStore((s) => s.isLoading)
  const gameError = useGameStore((s) => s.error)
  const gameSubmitting = useGameStore((s) => s.isSubmitting)
  const gameOver = useGameStore((s) => s.isGameOver)
  const gameSubmit = useGameStore((s) => s.submitGuess)
  const gameSkip = useGameStore((s) => s.skipAttempt)
  const setGameType = useGameStore((s) => s.setGameType)
  const gameNavigateDate = useGameStore((s) => s.navigateDate)
  const gameLoadDate = useGameStore((s) => s.loadDate)
  const gameViewingDate = useGameStore((s) => s.viewingDate)
  const gameHasPrev = useGameStore((s) => s.hasPrev)
  const gameHasNext = useGameStore((s) => s.hasNext)
  const gameUi = useGameStore((s) => s.ui)
  const gameOpenModal = useGameStore((s) => s.openModal)
  const gameCloseModal = useGameStore((s) => s.closeModal)

  const wikiInit = useWikiStore((s) => s.initGame)
  const wikiChallenge = useWikiStore((s) => s.challenge)
  const wikiGuesses = useWikiStore((s) => s.guesses)
  const wikiHintsRevealed = useWikiStore((s) => s.hintsRevealed)
  const wikiStatus = useWikiStore((s) => s.status)
  const wikiLoading = useWikiStore((s) => s.isLoading)
  const wikiError = useWikiStore((s) => s.error)
  const wikiSubmitting = useWikiStore((s) => s.isSubmitting)
  const wikiOver = useWikiStore((s) => s.isGameOver)
  const wikiSubmit = useWikiStore((s) => s.submitGuess)
  const wikiSkip = useWikiStore((s) => s.skipAttempt)
  const wikiNavigateDate = useWikiStore((s) => s.navigateDate)
  const wikiLoadDate = useWikiStore((s) => s.loadDate)
  const wikiViewingDate = useWikiStore((s) => s.viewingDate)
  const wikiHasPrev = useWikiStore((s) => s.hasPrev)
  const wikiHasNext = useWikiStore((s) => s.hasNext)
  const wikiUi = useWikiStore((s) => s.ui)
  const wikiOpenModal = useWikiStore((s) => s.openModal)
  const wikiCloseModal = useWikiStore((s) => s.closeModal)

  const initGame = isWiki ? wikiInit : gameInit
  const challenge = (isWiki ? wikiChallenge : gameChallenge) as SharedChallenge | null
  const guesses = isWiki ? wikiGuesses : gameGuesses
  const hintsRevealed = isWiki ? wikiHintsRevealed : gameHintsRevealed
  const status = isWiki ? wikiStatus : gameStatus
  const isLoading = isWiki ? wikiLoading : gameLoading
  const error = isWiki ? wikiError : gameError
  const isSubmitting = isWiki ? wikiSubmitting : gameSubmitting
  const isGameOver = isWiki ? wikiOver : gameOver
  const submitGuess = isWiki ? wikiSubmit : gameSubmit
  const skipAttempt = isWiki ? wikiSkip : gameSkip
  const navigateDate = isWiki ? wikiNavigateDate : gameNavigateDate
  const loadDate = isWiki ? wikiLoadDate : gameLoadDate
  const viewingDate = isWiki ? wikiViewingDate : gameViewingDate
  const hasPrev = isWiki ? wikiHasPrev : gameHasPrev
  const hasNext = isWiki ? wikiHasNext : gameHasNext
  const ui = isWiki ? wikiUi : gameUi
  const openModal = isWiki ? wikiOpenModal : gameOpenModal
  const closeModal = isWiki ? wikiCloseModal : gameCloseModal
  const previousStatusRef = useRef<typeof status>('idle')
  const prevChallengeKeyRef = useRef<string | null>(null)
  const [resultDetails, setResultDetails] = useState<{
    name: string
    year?: number
    photoUrl?: string | null
    extract?: string | null
    genres?: string[]
    director?: string
    creator?: string
    personType?: string
    profile?: unknown
    wikipediaUrl?: string | null
    tmdbId?: number | null
  } | null>(null)
  const [resultLoadError, setResultLoadError] = useState(false)

  useEffect(() => {
    if (!isWiki) {
      setGameType(mode === 'series' ? 'series' : 'film')
    }
    void initGame()
  }, [initGame, isWiki, mode, setGameType])

  useEffect(() => {
    const id = challenge?.challengeId ?? challenge?.id ?? null
    if (id == null) {
      previousStatusRef.current = status
      prevChallengeKeyRef.current = null
      return
    }

    const challengeKey = `${mode}:${id}`
    const challengeChanged = prevChallengeKeyRef.current !== challengeKey
    prevChallengeKeyRef.current = challengeKey

    if (challengeChanged) {
      previousStatusRef.current = status
      return
    }

    const prev = previousStatusRef.current
    previousStatusRef.current = status

    if (prev === 'playing' && (status === 'won' || status === 'lost')) {
      openModal(status === 'won' ? 'win' : 'lose')
    }
  }, [challenge, status, mode, openModal])

  useEffect(() => {
    const challengeId = challenge?.challengeId ?? challenge?.id
    if (!challengeId || (status !== 'won' && status !== 'lost')) {
      setResultDetails(null)
      setResultLoadError(false)
      return
    }

    let cancelled = false
    const loadResult = async () => {
      setResultLoadError(false)
      try {
        if (isWiki) {
          const data = await fetchWikiResult(challengeId)
          if (cancelled) return
          setResultDetails({
            name: data.name,
            photoUrl: data.photoUrl ?? null,
            extract: data.extract ?? null,
            personType: data.personType,
            wikipediaUrl: data.wikipediaUrl ?? null,
          })
          return
        }

        const data = await fetchResult(challengeId)
        if (cancelled) return
        setResultDetails({
          name: data.title,
          year: data.year,
          photoUrl: data.imageUrl ?? null,
          genres: data.genres,
          director: data.director ?? undefined,
          tmdbId: data.tmdbId ?? null,
        })
      } catch {
        if (!cancelled) {
          setResultDetails(null)
          setResultLoadError(true)
        }
      }
    }

    void loadResult()
    return () => { cancelled = true }
  }, [challenge?.challengeId, challenge?.id, isWiki, status])

  if (isLoading || (status === 'idle' && !error)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" role="status" aria-live="polite">
        <Spinner size="lg" />
        <p className="text-film-text-dim text-sm animate-pulse">Chargement du défi…</p>
      </div>
    )
  }

  if (status === 'not_found' || error) {
    const todayParisErr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
    const refDateErr = viewingDate ?? todayParisErr
    const isTodayErr = refDateErr === todayParisErr
    const showPrevErr = hasPrev
    const showNextErr = hasNext && !isTodayErr

    return (
      <main className={`max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-6 flex flex-col gap-3 sm:gap-5 game-page game-page--${mode}`}>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2 py-1.5 px-1">
            {showPrevErr ? (
              <button
                type="button"
                onClick={() => void navigateDate('prev')}
                disabled={isLoading}
                aria-label="Défi précédent"
                title="Défi précédent"
                className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold"
              >
                <ChevronLeft size={20} aria-hidden />
              </button>
            ) : (
              <span className="inline-flex min-h-[44px] min-w-[44px]" aria-hidden />
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={13} className="text-film-text-dim" />
              <span className="font-semibold text-film-gold">Aujourd&apos;hui</span>
            </div>
            {showNextErr ? (
              <button
                type="button"
                onClick={() => void navigateDate('next')}
                disabled={isLoading}
                aria-label="Défi suivant"
                title="Défi suivant"
                className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold"
              >
                <ChevronRight size={20} aria-hidden />
              </button>
            ) : (
              <span className="inline-flex min-h-[44px] min-w-[44px]" aria-hidden />
            )}
          </div>
          <ModeTabs />
        </div>

        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2 text-center">
          <p className="text-film-text font-semibold">
            {isWiki
              ? 'Aucun défi Wikipedia n’est planifié pour cette date.'
              : 'Aucun défi n’est planifié pour cette date.'}
          </p>
          <p className="text-film-text-dim text-sm">
            Essaie un autre mode de jeu ou utilise les flèches pour naviguer vers une date avec un défi.
          </p>
        </div>
      </main>
    )
  }

  if (!challenge) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-film-red font-semibold">Aucun défi disponible.</p>
      </div>
    )
  }

  const attemptsLeft = Math.max(challenge.maxAttempts - guesses.length, 0)
  const guessesForTracker = guesses.map((guess) => ({
    value: guess.guess,
    status: guess.correct ? 'correct' as const : 'wrong' as const,
    timestamp: 0,
  }))
  const hintsAvailable = challenge.hintsAvailable ?? 0
  const wikiProfile: WikiVisibleProfile = isWikiChallenge(challenge)
    ? (challenge.profile as WikiVisibleProfile)
    : { type: 'generic', domain: null, notableWork: null, era: null }
  const wikiPersonType = isWikiChallenge(challenge) ? challenge.personType : undefined
  const todayParis = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
  const currentDate = viewingDate ?? todayParis
  const isToday = currentDate === todayParis
  const showPrevNav = hasPrev
  const showNextNav = hasNext && !isToday

  const resolvedAnswerName = resultDetails?.name ?? null
  const answerLabelPending =
    (status === 'won' || status === 'lost') && !resolvedAnswerName && !resultLoadError
  const modalResultName =
    resolvedAnswerName
    ?? (answerLabelPending
      ? 'Chargement du résultat…'
      : resultLoadError
        ? 'Résultat indisponible'
        : getChallengeName(challenge))

  return (
    <main className={`max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-6 flex flex-col gap-3 sm:gap-5 game-page game-page--${mode}`}>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2 py-1.5 px-1">
          {showPrevNav ? (
            <button
              type="button"
              onClick={() => void navigateDate('prev')}
              disabled={isLoading}
              aria-label="Défi précédent"
              title="Défi précédent"
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold"
            >
              <ChevronLeft size={20} aria-hidden />
            </button>
          ) : (
            <span className="inline-flex min-h-[44px] min-w-[44px]" aria-hidden />
          )}

          <div className="flex items-center gap-2 text-sm">
            <Calendar size={13} className="text-film-text-dim" />
            {isToday ? (
              <span className="font-semibold text-film-gold">Aujourd'hui</span>
            ) : (
              <button
                onClick={() => void loadDate(todayParis)}
                className="text-film-text-dim hover:text-film-text transition-colors cursor-pointer"
                title="Retour à aujourd'hui"
              >
                {formatDateFr(currentDate)}
              </button>
            )}
            {viewingDate && (
              <span className="text-xs bg-film-surface border border-film-border px-1.5 py-0.5 rounded text-film-text-dim">
                Ancien défi
              </span>
            )}
          </div>

          {showNextNav ? (
            <button
              type="button"
              onClick={() => void navigateDate('next')}
              disabled={isLoading}
              aria-label="Défi suivant"
              title="Défi suivant"
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold"
            >
              <ChevronRight size={20} aria-hidden />
            </button>
          ) : (
            <span className="inline-flex min-h-[44px] min-w-[44px]" aria-hidden />
          )}
        </div>
        {isToday && hasPrev && (
          <p className="text-center text-xs text-film-text-dim tracking-wide">
            ← défis des jours précédents disponibles
          </p>
        )}
        <ModeTabs />
      </div>
      {!isWiki && (
        <MovieImage
          imageUrl={challenge.photoUrl ?? null}
          attempt={Math.min(guesses.length + 1, challenge.maxAttempts)}
        />
      )}

      {isWiki && (
        <WikiChallengeImage
          imageUrl={challenge.photoUrl ?? null}
          isRevealed={isGameOver}
        />
      )}

      {isWiki && (
        <WikiHintPanel
          profile={wikiProfile}
          hints={[]}
          hintsAvailable={hintsAvailable}
          hintsRevealed={hintsRevealed}
          showHints={false}
          wikiPersonType={wikiPersonType}
        />
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <AttemptTracker guesses={guessesForTracker} maxAttempts={challenge.maxAttempts} />
          <span className="text-sm text-film-text-dim font-mono">{guesses.length}/{challenge.maxAttempts}</span>
        </div>

        {!isGameOver && (
          isWiki ? (
            <WikiGuessInput
              onSubmit={submitGuess}
              onSkip={skipAttempt}
              attemptsLeft={attemptsLeft}
              disabled={isSubmitting}
            />
          ) : (
            <GuessInput
              onSubmit={submitGuess}
              onSkip={skipAttempt}
              attemptsLeft={attemptsLeft}
              disabled={isSubmitting}
            />
          )
        )}

        {isGameOver && (
          <div
            className={`flex flex-wrap items-center justify-between gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold ${
              status === 'won'
                ? 'bg-film-green/10 border border-film-green/30 text-film-green'
                : 'bg-film-red/10 border border-film-red/30 text-film-red'
            }`}
            role="status"
            aria-live="polite"
          >
            <span>
              {status === 'won'
                ? `Bravo ! Trouvé en ${guesses.findIndex((g) => g.correct) + 1}/${challenge.maxAttempts}`
                : 'Pas cette fois…'}
            </span>
            {resolvedAnswerName && (
              <span className="text-xs font-medium text-film-text-dim truncate max-w-[45%] text-center min-w-0">
                {resolvedAnswerName}
                {!isWiki && resultDetails?.year != null ? ` (${resultDetails.year})` : ''}
              </span>
            )}
            {answerLabelPending && (
              <span className="text-xs font-medium text-film-text-dim animate-pulse">
                Chargement…
              </span>
            )}
            {resultLoadError && (
              <span className="text-xs font-medium text-film-text-dim">
                Résultat indisponible
              </span>
            )}
            <button
              type="button"
              onClick={() => openModal(status === 'won' ? 'win' : 'lose')}
              className="flex items-center gap-1.5 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold rounded"
              title="Voir les détails du défi"
            >
              <Share2 size={13} aria-hidden />
              Voir le résultat
            </button>
          </div>
        )}
      </section>

      {isWiki ? (
        <WikiHintPanel
          profile={wikiProfile}
          hints={challenge.hints as WikiHintPayload[]}
          hintsAvailable={hintsAvailable}
          hintsRevealed={hintsRevealed}
          showProfile={false}
        />
      ) : (
        <HintPanel
          hints={challenge.hints as HintPayload[]}
          hintsAvailable={hintsAvailable}
          hintsRevealed={hintsRevealed}
        />
      )}

      {(() => {
        const today = getTodayParis()
        const allModes = [
          { type: 'film' as const, path: '/films', enabled: true },
          { type: 'series' as const, path: '/series', enabled: FEATURES.enableSeries },
          { type: 'wiki' as const, path: '/wiki', enabled: FEATURES.enableWiki },
        ]
        const unplayedModes = allModes.filter(m => m.enabled && m.type !== mode && !loadHistory(m.type)[today])
        return (
          <>
      {status === 'won' && (
        <WinModal
          isOpen={ui.isModalOpen && ui.modalType === 'win'}
          onClose={closeModal}
          mode={mode}
          result={{
            name: modalResultName,
            year: resultDetails?.year,
            photoUrl: resultDetails?.photoUrl ?? challenge.photoUrl ?? null,
            extract: resultDetails?.extract ?? null,
            genres: resultDetails?.genres,
            director: resultDetails?.director,
            personType: resultDetails?.personType ?? (isWikiChallenge(challenge) ? challenge.personType : undefined),
            profile: resultDetails?.profile ?? (isWikiChallenge(challenge) ? challenge.profile : undefined),
            wikipediaUrl: resultDetails?.wikipediaUrl ?? null,
            tmdbId: resultDetails?.tmdbId ?? null,
          }}
          stats={{ attemptsUsed: guesses.length, maxAttempts: challenge.maxAttempts, hintsRevealed }}
          onShare={() => { void shareResult(challenge.date ?? getTodayParis(), guessesForTracker, challenge.maxAttempts, challenge.challengeNumber) }}
          onOpenStats={() => openModal('stats')}
          unplayedModes={unplayedModes}
        />
      )}

      {status === 'lost' && (
        <LoseModal
          isOpen={ui.isModalOpen && ui.modalType === 'lose'}
          onClose={closeModal}
          mode={mode}
          result={{
            name: modalResultName,
            year: resultDetails?.year,
            photoUrl: resultDetails?.photoUrl ?? challenge.photoUrl ?? null,
            extract: resultDetails?.extract ?? null,
            genres: resultDetails?.genres,
            director: resultDetails?.director,
            tmdbId: resultDetails?.tmdbId ?? null,
            personType: resultDetails?.personType ?? (isWikiChallenge(challenge) ? challenge.personType : undefined),
            wikipediaUrl: resultDetails?.wikipediaUrl ?? (isWikiChallenge(challenge) ? challenge.wikipediaUrl ?? null : null),
          }}
          stats={{ attemptsUsed: guesses.length, maxAttempts: challenge.maxAttempts, hintsRevealed }}
          onShare={() => { void shareResult(challenge.date ?? getTodayParis(), guessesForTracker, challenge.maxAttempts, challenge.challengeNumber) }}
          onOpenStats={() => openModal('stats')}
          unplayedModes={unplayedModes}
        />
      )}
          </>
        )
      })()}
    </main>
  )
}
