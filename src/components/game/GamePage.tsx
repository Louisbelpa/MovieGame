import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Share2, HelpCircle, CheckCircle2, XCircle, Film, Tv, User, Calendar } from 'lucide-react'
import { GuessInput } from './GuessInput'
import { GuessList } from './GuessList'
import { HintPanel } from './HintPanel'
import { AttemptTracker } from './AttemptTracker'
import { MovieImage } from './MovieImage'
import { FriendsLive } from './FriendsLive'
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
import { loadHistory, loadGameState } from '@/lib/storage'
import { buildShareText, buildAllShareText, type AllShareGame } from '@/lib/utils'
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
  shareMode: 'film' | 'series' | 'wiki',
  challengeId: string,
  guesses: Array<{ status: 'correct' | 'wrong' | 'skipped' }>,
  maxAttempts: number,
  challengeNumber?: number,
) {
  const won = guesses.some((g) => g.status === 'correct')
  const text = buildShareText(
    challengeId,
    guesses as GuessEntry[],
    won,
    maxAttempts,
    challengeNumber,
    shareMode,
  )

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

function ModeIcon({ mode, size = 14 }: { mode: string; size?: number }) {
  if (mode === 'series') return <Tv size={size} aria-hidden />
  if (mode === 'wiki') return <User size={size} aria-hidden />
  return <Film size={size} aria-hidden />
}

function modeLabel(mode: string) {
  if (mode === 'series') return 'Séries'
  if (mode === 'wiki') return 'Personnalités'
  return 'Films'
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (window.innerWidth < 1024) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Enter' && !isGameOver) {
        const val = isWiki ? wikiUi.inputValue : gameUi.inputValue
        if (val.trim()) {
          void submitGuess(val)
        }
        return
      }
      if (e.key === 'Escape' && !isGameOver) {
        void skipAttempt()
        return
      }
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === '1') {
        e.preventDefault()
        window.location.href = '/films'
        return
      }
      if (meta && e.key === '2' && FEATURES.enableSeries) {
        e.preventDefault()
        window.location.href = '/series'
        return
      }
      if (meta && e.key === '3' && FEATURES.enableWiki) {
        e.preventDefault()
        window.location.href = '/wiki'
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isGameOver, isWiki, gameUi.inputValue, wikiUi.inputValue, submitGuess, skipAttempt])

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
        </div>

        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2 text-center">
          <p className="text-film-text font-semibold">
            {isWiki
              ? 'Aucun défi Personnalités n’est planifié pour cette date.'
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
    : {
        type: 'generic',
        domain: null,
        notableWork: null,
        notableWorkParts: [],
        era: null,
        company: null,
        highlights: [],
      }
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

  // ── Shared: glass nav overlay ────────────────────────────────────────────────

  const glassBtn = 'inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-white/10 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed'
  const glassTag = 'bg-black/50 backdrop-blur-md text-film-text rounded-full'

  const imageOverlay = (
    <>
      {/* Top row: mode badge left, date nav right */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
        {/* Mode + number */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold pointer-events-auto ${glassTag}`}>
          <ModeIcon mode={mode} size={11} />
          <span>{modeLabel(mode)}</span>
          {challenge.challengeNumber && (
            <span className="text-film-text-dim font-mono">#{challenge.challengeNumber}</span>
          )}
        </div>

        {/* Date nav */}
        <div className={`flex items-center gap-0.5 px-2 py-1 pointer-events-auto ${glassTag}`}>
          {showPrevNav ? (
            <button type="button" onClick={() => void navigateDate('prev')} disabled={isLoading} aria-label="Défi précédent" className={glassBtn}>
              <ChevronLeft size={15} />
            </button>
          ) : <span className="w-8" />}
          <button
            type="button"
            onClick={isToday ? undefined : () => void loadDate(todayParis)}
            className={`px-2 text-xs font-medium leading-none ${isToday ? 'text-film-gold cursor-default' : 'text-film-text-dim hover:text-film-text cursor-pointer transition-colors'}`}
          >
            {isToday ? "Aujourd'hui" : formatDateFr(currentDate)}
          </button>
          {showNextNav ? (
            <button type="button" onClick={() => void navigateDate('next')} disabled={isLoading} aria-label="Défi suivant" className={glassBtn}>
              <ChevronRight size={15} />
            </button>
          ) : <span className="w-8" />}
        </div>
      </div>

      {/* Bottom: gradient + attempts */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
        <div className="h-24" style={{ background: 'linear-gradient(to top, var(--color-film-black) 0%, transparent 100%)' }} />
      </div>
      <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center">
        <AttemptTracker guesses={guessesForTracker} maxAttempts={challenge.maxAttempts} />
      </div>
    </>
  )

  // ── Game over reveal card ─────────────────────────────────────────────────────

  const revealCard = isGameOver ? (
    <div
      className="rounded-2xl overflow-hidden animate-slide-up"
      role="status"
      aria-live="polite"
      style={{
        background: 'var(--color-film-surface)',
        border: status === 'won' ? '1px solid rgba(47,200,122,0.28)' : '1px solid rgba(255,82,82,0.22)',
      }}
    >
      <div className="flex items-start gap-4 p-4 sm:p-5">
        {/* Thumbnail */}
        {(resultDetails?.photoUrl ?? challenge.photoUrl) && (
          <img
            src={resultDetails?.photoUrl ?? challenge.photoUrl ?? ''}
            alt=""
            aria-hidden
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          />
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {status === 'won'
              ? <CheckCircle2 size={14} className="text-film-green shrink-0" aria-hidden />
              : <XCircle size={14} className="text-film-red shrink-0" aria-hidden />}
            <span className={`text-xs font-semibold ${status === 'won' ? 'text-film-green' : 'text-film-red'}`}>
              {status === 'won'
                ? `Bravo ! Trouvé en ${guesses.findIndex((g) => g.correct) + 1}/${challenge.maxAttempts}`
                : 'Pas cette fois…'}
            </span>
          </div>
          {answerLabelPending ? (
            <div className="h-6 w-40 rounded bg-film-gray animate-pulse" />
          ) : (
            <p className="font-title text-xl sm:text-2xl text-film-text leading-tight truncate">
              {resolvedAnswerName ?? getChallengeName(challenge)}
              {!isWiki && resultDetails?.year != null && (
                <span className="text-film-text-dim font-sans text-sm font-normal ml-2">({resultDetails.year})</span>
              )}
            </p>
          )}
          {resultDetails?.extract && (
            <p className="text-xs text-film-text-dim mt-1 line-clamp-2 leading-relaxed">{resultDetails.extract}</p>
          )}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => openModal(status === 'won' ? 'win' : 'lose')}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-film-text)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <Share2 size={12} aria-hidden />
          <span className="hidden sm:inline">Résultat</span>
        </button>
      </div>
    </div>
  ) : null

  // ── Hints section header ──────────────────────────────────────────────────────

  const hintsHeader = (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-widest" style={{ color: 'var(--mode-color, rgba(236,233,226,0.35))' }}>
          Indices
        </span>
        {hintsAvailable > 0 && (
          <span className="text-[10px] font-mono" style={{ color: 'rgba(236,233,226,0.3)' }}>
            {hintsRevealed}/{hintsAvailable}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => openModal('rules')}
        className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest transition-colors cursor-pointer"
        style={{ color: 'rgba(236,233,226,0.35)' }}
      >
        <HelpCircle size={11} aria-hidden />
        Règles
      </button>
    </div>
  )

  // ── Input section (shared mobile/desktop) ─────────────────────────────────────

  const inputSection = !isGameOver && (
    isWiki ? (
      <WikiGuessInput onSubmit={submitGuess} onSkip={skipAttempt} attemptsLeft={attemptsLeft} disabled={isSubmitting} />
    ) : (
      <GuessInput onSubmit={submitGuess} onSkip={skipAttempt} attemptsLeft={attemptsLeft} disabled={isSubmitting} />
    )
  )

  return (
    <main
      className={`atmosphere-${mode === 'wiki' ? 'wiki' : mode === 'series' ? 'series' : 'film'} min-h-screen overflow-x-hidden`}
      data-mode={mode === 'wiki' ? 'wiki' : mode === 'series' ? 'series' : undefined}
    >
      {/* ── MODE TABS ────────────────────────────────────────────────────── */}
      <div className="px-3 sm:px-4 lg:px-8 pt-3 pb-2">
        <nav className="inline-flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <a
            href="/films"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={mode === 'film' ? { background: 'var(--sg-films)', color: '#0b0b1a' } : { color: 'rgba(236,233,226,0.5)' }}
          >
            Films
          </a>
          {FEATURES.enableSeries && (
            <a
              href="/series"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={mode === 'series' ? { background: 'var(--sg-series)', color: '#0b0b1a' } : { color: 'rgba(236,233,226,0.5)' }}
            >
              Séries
            </a>
          )}
          {FEATURES.enableWiki && (
            <a
              href="/wiki"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={mode === 'wiki' ? { background: 'var(--sg-wiki)', color: '#0b0b1a' } : { color: 'rgba(236,233,226,0.5)' }}
            >
              Perso
            </a>
          )}
        </nav>
      </div>

      {/* ── IMAGE HERO — full viewport width ─────────────────────────────── */}
      <div className="relative" style={{ maxHeight: '52vh' }}>
        {!isWiki ? (
          <MovieImage
            imageUrl={challenge.photoUrl ?? null}
            attempt={Math.min(guesses.length + 1, challenge.maxAttempts)}
            maxAttempts={challenge.maxAttempts}
            fullBleed
          />
        ) : (
          <WikiChallengeImage imageUrl={challenge.photoUrl ?? null} isRevealed={isGameOver} />
        )}
        {imageOverlay}
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <div className="px-3 sm:px-4 lg:px-8 py-4 lg:py-6">
        <div className="max-w-5xl mx-auto">

          {/* Reveal card — spans full width */}
          {revealCard && <div className="mb-5">{revealCard}</div>}

          {/* ── Desktop 2-col / Mobile stack ── */}
          <div className="flex flex-col lg:grid lg:items-start gap-5 lg:gap-6"
            style={{ gridTemplateColumns: 'minmax(0,1fr) 340px' }}>

            {/* ── LEFT: wiki profile + hints ── */}
            <div className="flex flex-col gap-4 pb-28 lg:pb-0">
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

              <div>
                {hintsHeader}
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
              </div>

              {/* Guesses list — mobile only (desktop has it in right panel) */}
              {guesses.length > 0 && (
                <div className="lg:hidden">
                  <p className="text-[10px] font-mono font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(236,233,226,0.35)' }}>
                    Tes tentatives
                  </p>
                  <GuessList
                    guesses={guesses.map((g) => ({ value: g.guess, status: g.correct ? 'correct' as const : 'wrong' as const, timestamp: 0 }))}
                    maxAttempts={challenge.maxAttempts}
                  />
                </div>
              )}
            </div>

            {/* ── RIGHT: sticky input panel (desktop only) ── */}
            <div className="hidden lg:block">
              <div
                className="sticky flex flex-col gap-4 rounded-2xl p-5"
                style={{ top: '72px', background: 'var(--color-film-surface)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {/* Attempts pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Array.from({ length: challenge.maxAttempts }).map((_, i) => {
                    const g = guesses[i]
                    return (
                      <span
                        key={i}
                        className="flex-1 h-1.5 rounded-full transition-colors"
                        style={{
                          background: g
                            ? g.correct
                              ? 'var(--color-film-green)'
                              : g.guess === ''
                                ? 'rgba(255,255,255,0.15)'
                                : 'var(--color-film-red)'
                            : 'rgba(255,255,255,0.10)',
                        }}
                      />
                    )
                  })}
                </div>

                {/* Input */}
                {inputSection}

                {/* Remaining count */}
                {!isGameOver && (
                  <p className="text-center text-[11px] font-mono text-film-text-dim/50">
                    {attemptsLeft} essai{attemptsLeft !== 1 ? 's' : ''} restant{attemptsLeft !== 1 ? 's' : ''}
                  </p>
                )}

                {/* Guess list */}
                {guesses.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(236,233,226,0.35)' }}>
                      Tes tentatives
                    </p>
                    <GuessList
                      guesses={guesses.map((g) => ({ value: g.guess, status: g.correct ? 'correct' as const : 'wrong' as const, timestamp: 0 }))}
                      maxAttempts={challenge.maxAttempts}
                    />
                  </div>
                )}

                {/* Friends live */}
                <div className={guesses.length > 0 ? 'pt-1 border-t' : ''} style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <FriendsLive mode={isWiki ? 'wiki' : mode as 'film' | 'series'} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE sticky input bar ── */}
      {!isGameOver && (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-3 pt-3 pb-4"
          style={{
            background: 'rgba(11,11,26,0.95)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 -4px 32px rgba(0,0,0,0.4)',
          }}
        >
          {inputSection}
        </div>
      )}

      {(() => {
        const today = getTodayParis()
        const allModes = [
          { type: 'film' as const, path: '/films', enabled: true },
          { type: 'series' as const, path: '/series', enabled: FEATURES.enableSeries },
          { type: 'wiki' as const, path: '/wiki', enabled: FEATURES.enableWiki },
        ]
        const unplayedModes = allModes.filter(m => m.enabled && m.type !== mode && !loadHistory(m.type)[today])

        const buildOnShareAll = unplayedModes.length === 0 ? () => {
          const enabledModes = allModes.filter(m => m.enabled)
          const games: AllShareGame[] = enabledModes.flatMap((m) => {
            if (m.type === mode) {
              return [{ mode: m.type, guesses: guessesForTracker, won: status === 'won', maxAttempts: challenge.maxAttempts }]
            }
            const state = loadGameState(m.type)
            if (!state) return []
            const maxAttempts = state.status === 'won' ? 5 : state.guesses.length
            return [{ mode: m.type, guesses: state.guesses, won: state.status === 'won', maxAttempts }]
          })
          const text = buildAllShareText(today, games)
          if (navigator.share) {
            void navigator.share({ text })
          } else {
            void navigator.clipboard.writeText(text)
          }
        } : undefined

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
          onShare={() => {
            void shareResult(
              mode,
              challenge.date ?? getTodayParis(),
              guessesForTracker,
              challenge.maxAttempts,
              challenge.challengeNumber,
            )
          }}
          onShareAll={buildOnShareAll}
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
          onShare={() => {
            void shareResult(
              mode,
              challenge.date ?? getTodayParis(),
              guessesForTracker,
              challenge.maxAttempts,
              challenge.challengeNumber,
            )
          }}
          onShareAll={buildOnShareAll}
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
