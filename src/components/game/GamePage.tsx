import { useEffect, useRef, useState } from 'react'
import { Film, Tv, User, Share2, BarChart2, CheckCircle2, HelpCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { GuessInput } from './GuessInput'
import { HintPanel } from './HintPanel'
import { MovieImage } from './MovieImage'
import { WikiChallengeImage } from '@/components/wiki/WikiChallengeImage'
import { WikiHintPanel } from '@/components/wiki/WikiHintPanel'
import { WikiGuessInput } from '@/components/wiki/WikiGuessInput'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { GuestBar } from '@/components/layout/GuestBar'
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
import { getTodayGameSnapshot, switcherLabel } from '@/lib/dayStatus'

import { buildShareText, buildAllShareText, collectDayShareGames, type AllShareGame } from '@/lib/utils'
import { guessAttemptMeta } from '@/lib/guessMeta'
import { nativeShare } from '@/lib/share'
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
  extract?: string | null
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

/** Construit le texte de partage d'un défi (sans effet de bord — copie/partage gérés par l'appelant). */
function buildResultText(
  shareMode: 'film' | 'series' | 'wiki',
  challengeId: string,
  guesses: Array<{ status: 'correct' | 'wrong' | 'skipped' }>,
  maxAttempts: number,
  challengeNumber?: number,
): string {
  const won = guesses.some((g) => g.status === 'correct')
  return buildShareText(challengeId, guesses as GuessEntry[], won, maxAttempts, challengeNumber, shareMode)
}

// ── Game switcher ─────────────────────────────────────────────────────────────

function ModeIcon({ mode }: { mode: string }) {
  if (mode === 'series') return <Tv size={18} aria-hidden />
  if (mode === 'wiki') return <User size={18} aria-hidden />
  return <Film size={18} aria-hidden />
}

function accentClass(mode: string) {
  if (mode === 'series') return 'g-serie'
  if (mode === 'wiki') return 'g-face'
  return 'g-film'
}

// Glyph SVG icons (identical à candy-screens.jsx GlyphC)
function GlyphC({ game, size = 22 }: { game: string; size?: number }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (game === 'film')  return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5" {...s} /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" {...s} /></svg>
  if (game === 'serie') return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2.5" {...s} /><path d="M8 3l4 4 4-4" {...s} /></svg>
  if (game === 'face')  return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="9" r="4" {...s} /><path d="M5 20c0-3.8 3.1-6.2 7-6.2s7 2.4 7 6.2" {...s} /></svg>
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" />
}

function modeGlyph(m: string) {
  if (m === 'series') return 'serie'
  if (m === 'wiki')   return 'face'
  return 'film'
}

function GameSwitcher({
  currentMode,
  today,
  liveToday,
}: {
  currentMode: 'film' | 'series' | 'wiki'
  today: string
  liveToday?: { status: 'playing' | 'won' | 'lost'; attempts: number }
}) {
  const activeTabRef = useRef<HTMLElement | null>(null)
  const modes = [
    { key: 'film' as const,   path: '/films',  name: 'FilmGuess',  enabled: true },
    { key: 'series' as const, path: '/series', name: 'SerieGuess', enabled: FEATURES.enableSeries },
    { key: 'wiki' as const,   path: '/wiki',   name: 'FaceGuess',  enabled: FEATURES.enableWiki },
  ].filter(m => m.enabled)

  // Scroll active tab into view on mobile (horizontal scroll)
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' })
  }, [currentMode])

  return (
    <div className="cdy-switch">
      {/* Header label (desktop) */}
      <div className="cdy-switch-head hidden sm:block">
        Les défis du jour · change de jeu quand tu veux
      </div>

      {/* Tabs */}
      <div className="cdy-switch-tabs">
        {modes.map(({ key, path, name }) => {
          const isCur = key === currentMode
          const snapshot = getTodayGameSnapshot(key, today)
          const { label: stLabel, st } = switcherLabel(
            snapshot,
            isCur,
            isCur ? liveToday : undefined,
          )
          const effectiveOutcome = (() => {
            if (isCur && liveToday) {
              if (liveToday.status === 'won' || liveToday.status === 'lost') return liveToday.status
              if (liveToday.status === 'playing') return null
            }
            return snapshot.outcome
          })()
          const stBadge = effectiveOutcome === 'won'
            ? '✓'
            : effectiveOutcome === 'lost'
              ? '✕'
              : isCur && (!effectiveOutcome || liveToday?.status === 'playing')
                ? '●'
                : '→'
          const stResolved = isCur && liveToday?.status === 'playing' ? 'st-current' : st
          const cls      = accentClass(key)

          const Tag  = isCur ? 'div' : 'a'
          const href = isCur ? undefined : path

          return (
            <Tag
              key={key}
              ref={isCur ? (el: HTMLElement | null) => { activeTabRef.current = el } : undefined}
              {...(href ? { href } : {})}
              className={`cdy-switch-tab ${cls} ${stResolved}${isCur ? ' active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <span className="sg"><GlyphC game={modeGlyph(key)} size={20} /></span>
              <div>
                <div className="sn">{name}</div>
                <div className="ss">{stLabel}</div>
              </div>
              <span className="stk">{stBadge}</span>
            </Tag>
          )
        })}
      </div>
    </div>
  )
}

// ── Main GamePage ─────────────────────────────────────────────────────────────

export function GamePage({ mode }: GamePageProps) {
  const isWiki = mode === 'wiki'

  // ── Store selectors ───────────────────────────────────────────────────────
  const gameInit          = useGameStore((s) => s.initGame)
  const gameChallenge     = useGameStore((s) => s.challenge)
  const gameGuesses       = useGameStore((s) => s.guesses)
  const gameHintsRevealed = useGameStore((s) => s.hintsRevealed)
  const gameStatus        = useGameStore((s) => s.status)
  const gameLoading       = useGameStore((s) => s.isLoading)
  const gameError         = useGameStore((s) => s.error)
  const gameSubmitting    = useGameStore((s) => s.isSubmitting)
  const gameOver          = useGameStore((s) => s.isGameOver)
  const gameSubmit        = useGameStore((s) => s.submitGuess)
  const gameSkip          = useGameStore((s) => s.skipAttempt)
  const setGameType       = useGameStore((s) => s.setGameType)
  const gameNavigateDate  = useGameStore((s) => s.navigateDate)
  const gameLoadDate      = useGameStore((s) => s.loadDate)
  const gameViewingDate   = useGameStore((s) => s.viewingDate)
  const gameHasPrev       = useGameStore((s) => s.hasPrev)
  const gameHasNext       = useGameStore((s) => s.hasNext)
  const gameUi            = useGameStore((s) => s.ui)
  const gameOpenModal     = useGameStore((s) => s.openModal)
  const gameCloseModal    = useGameStore((s) => s.closeModal)

  const wikiInit          = useWikiStore((s) => s.initGame)
  const wikiChallenge     = useWikiStore((s) => s.challenge)
  const wikiGuesses       = useWikiStore((s) => s.guesses)
  const wikiHintsRevealed = useWikiStore((s) => s.hintsRevealed)
  const wikiStatus        = useWikiStore((s) => s.status)
  const wikiLoading       = useWikiStore((s) => s.isLoading)
  const wikiError         = useWikiStore((s) => s.error)
  const wikiSubmitting    = useWikiStore((s) => s.isSubmitting)
  const wikiOver          = useWikiStore((s) => s.isGameOver)
  const wikiSubmit        = useWikiStore((s) => s.submitGuess)
  const wikiSkip          = useWikiStore((s) => s.skipAttempt)
  const wikiNavigateDate  = useWikiStore((s) => s.navigateDate)
  const wikiLoadDate      = useWikiStore((s) => s.loadDate)
  const wikiViewingDate   = useWikiStore((s) => s.viewingDate)
  const wikiHasPrev       = useWikiStore((s) => s.hasPrev)
  const wikiHasNext       = useWikiStore((s) => s.hasNext)
  const wikiUi            = useWikiStore((s) => s.ui)
  const wikiOpenModal     = useWikiStore((s) => s.openModal)
  const wikiCloseModal    = useWikiStore((s) => s.closeModal)

  const initGame     = isWiki ? wikiInit        : gameInit
  const challenge    = (isWiki ? wikiChallenge  : gameChallenge) as SharedChallenge | null
  const guesses      = isWiki ? wikiGuesses     : gameGuesses
  const hintsRevealed= isWiki ? wikiHintsRevealed : gameHintsRevealed
  const status       = isWiki ? wikiStatus      : gameStatus
  const isLoading    = isWiki ? wikiLoading     : gameLoading
  const error        = isWiki ? wikiError       : gameError
  const isSubmitting = isWiki ? wikiSubmitting  : gameSubmitting
  const isGameOver   = isWiki ? wikiOver        : gameOver
  const submitGuess  = isWiki ? wikiSubmit      : gameSubmit
  const skipAttempt  = isWiki ? wikiSkip        : gameSkip
  const navigateDate = isWiki ? wikiNavigateDate: gameNavigateDate
  const loadDate     = isWiki ? wikiLoadDate    : gameLoadDate
  const viewingDate  = isWiki ? wikiViewingDate : gameViewingDate
  const hasPrev      = isWiki ? wikiHasPrev     : gameHasPrev
  const hasNext      = isWiki ? wikiHasNext     : gameHasNext
  const ui           = isWiki ? wikiUi          : gameUi
  const openModal    = isWiki ? wikiOpenModal   : gameOpenModal
  const closeModal   = isWiki ? wikiCloseModal  : gameCloseModal

  const previousStatusRef     = useRef<typeof status>('idle')
  const prevChallengeKeyRef   = useRef<string | null>(null)
  const prevGuessCountRef     = useRef(0)
  const prevHintsRevealedRef  = useRef(0)

  const [resultDetails, setResultDetails] = useState<{
    name: string; year?: number; photoUrl?: string | null; extract?: string | null
    genres?: string[]; director?: string; personType?: string; profile?: unknown
    wikipediaUrl?: string | null; tmdbId?: number | null
  } | null>(null)
  const [resultLoadError, setResultLoadError] = useState(false)

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isWiki) setGameType(mode === 'series' ? 'series' : 'film')
    void initGame()
  }, [initGame, isWiki, mode, setGameType])

  useEffect(() => {
    const id = challenge?.challengeId ?? challenge?.id ?? null
    if (id == null) { previousStatusRef.current = status; prevChallengeKeyRef.current = null; return }
    const challengeKey = `${mode}:${id}`
    const challengeChanged = prevChallengeKeyRef.current !== challengeKey
    prevChallengeKeyRef.current = challengeKey
    if (challengeChanged) { previousStatusRef.current = status; return }
    const prev = previousStatusRef.current
    previousStatusRef.current = status
    if (prev === 'playing' && (status === 'won' || status === 'lost')) {
      openModal(status === 'won' ? 'win' : 'lose')
    }
  }, [challenge, status, mode, openModal])

  useEffect(() => {
    prevHintsRevealedRef.current = hintsRevealed
  }, [hintsRevealed])

  useEffect(() => {
    const count = guesses.length
    prevGuessCountRef.current = count
  }, [guesses, status])

  useEffect(() => {
    const challengeId = challenge?.challengeId ?? challenge?.id
    if (!challengeId || (status !== 'won' && status !== 'lost')) { setResultDetails(null); setResultLoadError(false); return }
    let cancelled = false
    const loadResult = async () => {
      setResultLoadError(false)
      try {
        if (isWiki) {
          const data = await fetchWikiResult(challengeId)
          if (cancelled) return
          setResultDetails({ name: data.name, photoUrl: data.photoUrl ?? null, extract: data.extract ?? null, personType: data.personType, wikipediaUrl: data.wikipediaUrl ?? null })
          return
        }
        const data = await fetchResult(challengeId)
        if (cancelled) return
        setResultDetails({ name: data.title, year: data.year, photoUrl: data.imageUrl ?? null, extract: data.synopsis ?? null, genres: data.genres, director: data.director ?? undefined, tmdbId: data.tmdbId ?? null })
      } catch { if (!cancelled) { setResultDetails(null); setResultLoadError(true) } }
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
        if (val.trim()) void submitGuess(val)
        return
      }
      if (e.key === 'Escape' && !isGameOver) { void skipAttempt(); return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isGameOver, isWiki, gameUi.inputValue, wikiUi.inputValue, submitGuess, skipAttempt])

  // ── Derived values ────────────────────────────────────────────────────────
  const todayParis  = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
  const currentDate = viewingDate ?? todayParis
  const isToday     = currentDate === todayParis
  const showPrevNav = hasPrev
  const showNextNav = hasNext && !isToday

  const switcherLive = isToday
    ? {
        status: (status === 'won' || status === 'lost' ? status : 'playing') as 'playing' | 'won' | 'lost',
        attempts: guesses.length,
      }
    : undefined

  // ── Loading / error states ────────────────────────────────────────────────
  if (isLoading || (status === 'idle' && !error)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" role="status" aria-live="polite">
        <Spinner size="lg" />
        <p className="cdy-mono text-sm animate-pulse" style={{ color: 'var(--ink-2)' }}>Chargement du défi…</p>
      </div>
    )
  }

  if (!challenge || status === 'not_found' || error) {
    return (
      <div className={accentClass(mode)} style={{ background: 'var(--bg)' }}>
        <div className="cdy-gamepage">
          <GameSwitcher currentMode={mode} today={todayParis} liveToday={switcherLive} />
          <div className="cdy-gamestage">
            <div className="cdym-arena">
              <div className="cdym-datenav">
                <button type="button" onClick={() => void navigateDate('prev')} disabled={isLoading || !showPrevNav} className={`arrow${!showPrevNav ? ' disabled' : ''}`}>‹</button>
                <div className="center" onClick={() => openModal('archive')} style={{ cursor: 'pointer' }}>
                  <div className="d"><span>📅</span>{isToday ? "Aujourd'hui" : formatDateFr(currentDate)}</div>
                  <div className="s">Archive des défis</div>
                </div>
                {isToday ? <span className="tag">Auj.</span> : <span className="tag old" onClick={() => void loadDate(todayParis)} style={{ cursor: 'pointer' }}>Aujourd'hui</span>}
                <button type="button" onClick={() => void navigateDate('next')} disabled={isLoading || !showNextNav} className={`arrow${!showNextNav ? ' disabled' : ''}`}>›</button>
                <button type="button" onClick={() => openModal('rules')} className="arrow" aria-label="Comment jouer" title="Comment jouer"><HelpCircle size={18} /></button>
              </div>
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <p className="text-4xl">🗓️</p>
                <p className="font-bold text-lg" style={{ color: 'var(--ink)' }}>
                  {isWiki ? 'Aucun défi Personnalités pour cette date.' : 'Aucun défi pour cette date.'}
                </p>
                <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Utilise les flèches pour naviguer vers une date avec un défi.</p>
              </div>
            </div>
          </div>
        </div>
        <MobileTabBar activeTab="games" />
      </div>
    )
  }

  // ── Game data ─────────────────────────────────────────────────────────────
  const maxAttempts    = challenge.maxAttempts
  const attemptsLeft   = Math.max(maxAttempts - guesses.length, 0)
  const hintsAvailable = challenge.hintsAvailable ?? 0

  const wikiProfile: WikiVisibleProfile = isWikiChallenge(challenge)
    ? (challenge.profile as WikiVisibleProfile)
    : { type: 'generic', domain: null, notableWork: null, notableWorkParts: [], era: null, company: null, highlights: [] }
  const wikiPersonType = isWikiChallenge(challenge) ? challenge.personType : undefined
  const wikiExtract    = isWikiChallenge(challenge) ? challenge.extract : null

  const answerLabelPending = (status === 'won' || status === 'lost') && !resultDetails?.name && !resultLoadError
  const modalResultName = resultDetails?.name
    ?? (answerLabelPending ? 'Chargement…' : resultLoadError ? 'Résultat indisponible' : getChallengeName(challenge))

  const guessesForTracker = guesses.map((g) => ({ value: g.guess, status: g.correct ? 'correct' as const : 'wrong' as const, timestamp: 0 }))

  // ── Build share helpers ───────────────────────────────────────────────────
  const today = getTodayParis()
  const allModes = [
    { type: 'film' as const, path: '/films', enabled: true },
    { type: 'series' as const, path: '/series', enabled: FEATURES.enableSeries },
    { type: 'wiki' as const, path: '/wiki', enabled: FEATURES.enableWiki },
  ]
  const unplayedModes = allModes.filter(m => m.enabled && m.type !== mode && !loadHistory(m.type)[today])

  const enabledShareModes = allModes.filter((m) => m.enabled).map((m) => m.type)
  const currentShareGame: AllShareGame = {
    mode,
    guesses: guessesForTracker as GuessEntry[],
    won: status === 'won',
    maxAttempts,
  }
  const buildDayText = () => buildAllShareText(today, collectDayShareGames(currentShareGame, { enabledModes: enabledShareModes }))
  const handleShareAll = () => { void nativeShare(buildDayText()) }
  const singleShareText = buildResultText(mode, challenge.date ?? getTodayParis(), guessesForTracker, maxAttempts, challenge.challengeNumber)

  // ── Render ────────────────────────────────────────────────────────────────
  const gCls = accentClass(mode)
  const dataModeAttr = mode === 'wiki' ? 'wiki' : mode === 'series' ? 'series' : undefined

  return (
    <div className={gCls} data-mode={dataModeAttr} style={{ background: 'var(--bg)', minHeight: '100dvh' }}>

      {/* ── Game switcher + arena wrapper (desktop: cdy-gamepage) ── */}
      <div className="cdy-gamepage">
      <GameSwitcher currentMode={mode} today={todayParis} liveToday={switcherLive} />

      {/* ── Arena ── */}
      <div className="cdy-gamestage">
      <GuestBar />
      <div className="cdym-arena">

        {/* 0. Arena header: icon + name + badge */}
        <div className="cdym-ar-top">
          <div className="cdym-ar-game">
            <span className="cdym-ar-icon">
              <ModeIcon mode={mode} />
            </span>
            <div>
              <div className="cdym-ar-name">
                {mode === 'wiki' ? 'FaceGuess' : mode === 'series' ? 'SerieGuess' : 'FilmGuess'}
              </div>
              <div className="cdym-ar-day">
                {challenge.challengeNumber ? `Défi #${challenge.challengeNumber} · ` : ''}
                {isToday ? "Aujourd'hui" : formatDateFr(currentDate)}
              </div>
            </div>
          </div>
          <span className="cdym-ar-badge">
            {mode === 'wiki' ? 'Personnalités' : mode === 'series' ? 'Séries' : 'Films'}
          </span>
        </div>

        {/* 1. Date navigator — before slots (Candy spec: ar-top → datenav → slots → media) */}
        <div className="cdym-datenav">
          <button
            type="button"
            onClick={() => void navigateDate('prev')}
            disabled={isLoading || !showPrevNav}
            className={`arrow${(!showPrevNav || isLoading) ? ' disabled' : ''}`}
            aria-label="Jour précédent"
          >‹</button>
          <div className="center" onClick={() => openModal('archive')} style={{ cursor: 'pointer' }}>
            <div className="d">
              <span>📅</span>
              {isToday ? "Aujourd'hui" : formatDateFr(currentDate)}
            </div>
            <div className="s">
              {challenge.challengeNumber ? `Défi #${challenge.challengeNumber} · ` : ''}Archive
            </div>
          </div>
          {isToday
            ? <span className="tag">Aujourd&apos;hui</span>
            : <span className="tag old">Ancien défi</span>
          }
          <button
            type="button"
            onClick={() => void navigateDate('next')}
            disabled={isLoading || !showNextNav}
            className={`arrow${(!showNextNav || isLoading) ? ' disabled' : ''}`}
            aria-label="Jour suivant"
          >›</button>
          <button
            type="button"
            onClick={() => openModal('rules')}
            className="arrow"
            aria-label="Comment jouer"
            title="Comment jouer"
          >
            <HelpCircle size={18} />
          </button>
        </div>

        {/* 2. Attempt slots */}
        <div className="cdym-ar-slots">
          {Array.from({ length: maxAttempts }).map((_, i) => {
            const g = guesses[i]
            const cls = g
              ? g.correct
                ? 'used'
                : g.guess === ''
                  ? 'used'
                  : status === 'lost' ? 'miss' : 'used'
              : ''
            return <i key={i} className={cls} />
          })}
        </div>

        {/* 3. Media */}
        <div className={`cdym-ar-media${isWiki ? ' square' : ''}`}>
          {!isWiki ? (
            <MovieImage
              imageUrl={challenge.photoUrl ?? null}
              attempt={Math.min(guesses.length + 1, maxAttempts)}
              maxAttempts={maxAttempts}
            />
          ) : (
            <WikiChallengeImage imageUrl={challenge.photoUrl ?? null} isRevealed={isGameOver} />
          )}
          {isWiki && !isGameOver && (
            <div className="cdym-ar-blurnote" aria-hidden>
              <div className="em">🫥</div>
              <div className="tx">photo floue · reste floue</div>
            </div>
          )}

          {/* Reveal overlay */}
          {isGameOver && (
            <div className="cdym-ar-reveal">
              <div className="rl">La réponse était</div>
              {answerLabelPending ? (
                <div style={{ height: 28, width: 160, borderRadius: 8, background: 'rgba(60,48,80,0.1)', marginTop: 4 }} className="animate-pulse" />
              ) : (
                <div className="rv" style={{ color: status === 'won' ? 'var(--correct-d)' : 'var(--ink)' }}>
                  {modalResultName}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2b. FaceGuess biography extract (ar-bio) */}
        {isWiki && wikiExtract && (
          <div className="cdym-ar-bio">
            <div className="bl">Extrait biographique (vague)</div>
            <p>« {wikiExtract} »</p>
          </div>
        )}

        {/* 3. Wiki hint panel (profile-based hints) */}
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

        {/* 4. Title + tries left */}
        <div className="cdym-ar-title">
          <h2>{isWiki ? 'La personnalité du jour' : mode === 'series' ? 'La série du jour' : 'Le film du jour'}</h2>
          {!isGameOver && (
            <span className="cdym-ar-left">{attemptsLeft} essai{attemptsLeft > 1 ? 's' : ''}</span>
          )}
        </div>

        {/* 5. Win / lose banner */}
        {isGameOver && (
          <motion.div
            className={`cdym-ar-banner ${status === 'won' ? 'win' : 'lose'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="be">{status === 'won' ? '🎉' : '😣'}</span>
            <div>
              <div className="bt">
                {status === 'won'
                  ? `Bravo ! Trouvé en ${guesses.findIndex(g => g.correct) + 1}/${maxAttempts}`
                  : "Perdu pour aujourd'hui"}
              </div>
              <div className="bs">
                {status === 'won'
                  ? 'Reviens demain pour un nouveau défi.'
                  : resultDetails?.name ? `C'était : ${resultDetails.name}` : "Un nouveau défi t'attend demain."}
              </div>
            </div>
            <button
              type="button"
              onClick={() => openModal(status === 'won' ? 'win' : 'lose')}
              className="shrink-0 flex items-center gap-1 font-bold text-xs px-3 py-2 rounded-[12px] cursor-pointer ml-auto"
              style={{ background: '#fff', border: '2px solid rgba(60,48,80,0.12)', boxShadow: '0 3px 0 rgba(60,48,80,0.08)', color: status === 'won' ? 'var(--correct-d)' : 'var(--wrong-d)' }}
            >
              <Share2 size={12} />
              <span className="hidden sm:inline">Résultat</span>
            </button>
          </motion.div>
        )}

        {/* 6. Input */}
        {!isGameOver && (
          isWiki
            ? <WikiGuessInput onSubmit={submitGuess} onSkip={skipAttempt} attemptsLeft={attemptsLeft} disabled={isSubmitting} />
            : <GuessInput onSubmit={submitGuess} onSkip={skipAttempt} attemptsLeft={attemptsLeft} disabled={isSubmitting} />
        )}

        {/* 7. Attempt board */}
        <div className="cdym-ar-board">
          {Array.from({ length: maxAttempts }).map((_, i) => {
            const g = guesses[i]
            if (!g) {
              return (
                <div key={i} className="cdym-ar-row empty">
                  <i />
                  <span style={{ opacity: i === guesses.length ? 1 : 0.4 }}>
                    {i === guesses.length && !isGameOver ? 'À toi de jouer…' : ''}
                  </span>
                </div>
              )
            }
            const rowCls = g.correct ? 'correct' : g.guess === '' ? 'skip' : 'wrong'
            const meta = guessAttemptMeta(
              i,
              g,
              (isWiki ? (challenge.hints as WikiHintPayload[]) : (challenge.hints as HintPayload[])) ?? [],
            )
            return (
              <div key={i} className={`cdym-ar-row ${rowCls}`}>
                <i>{g.correct ? '✓' : g.guess === '' ? '→' : '✕'}</i>
                <span>{g.guess || 'Essai passé'}</span>
                {meta && <em>{meta}</em>}
              </div>
            )
          })}
        </div>

        {/* 8. Hints */}
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

        {/* 9. Actions */}
        <div className="cdym-ar-actions">
          {!isGameOver ? (
            <button
              type="button"
              onClick={() => void skipAttempt()}
              disabled={isSubmitting}
              className="cdy-btn cdy-btn-soft w-full"
              style={{ width: '100%' }}
            >
              Passer l'essai →
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void nativeShare(singleShareText)}
                className="cdy-btn cdy-btn-primary"
                style={{ flex: 1 }}
              >
                <Share2 size={15} />
                Partager
              </button>
              <button
                type="button"
                onClick={() => openModal('stats')}
                className="cdy-btn cdy-btn-soft"
                style={{ flex: 1 }}
              >
                <BarChart2 size={15} />
                Stats
              </button>
              {unplayedModes.length === 0 && (
                <button
                  type="button"
                  onClick={handleShareAll}
                  className="cdy-btn cdy-btn-soft"
                >
                  <CheckCircle2 size={15} />
                  3 jeux
                </button>
              )}
            </>
          )}
        </div>

      </div>{/* /cdym-arena */}
      </div>{/* /cdy-gamestage */}
      </div>{/* /cdy-gamepage */}

      {/* ── Bottom tab bar (mobile) ── */}
      <MobileTabBar activeTab="games" />

      {/* ── Modals ── */}
      {status === 'won' && (
        <WinModal
          isOpen={ui.isModalOpen && ui.modalType === 'win'}
          onClose={closeModal}
          mode={mode}
          result={{
            name: modalResultName, year: resultDetails?.year,
            photoUrl: resultDetails?.photoUrl ?? challenge.photoUrl ?? null,
            extract: resultDetails?.extract ?? null,
            genres: resultDetails?.genres, director: resultDetails?.director,
            personType: resultDetails?.personType ?? (isWikiChallenge(challenge) ? challenge.personType : undefined),
            profile: resultDetails?.profile ?? (isWikiChallenge(challenge) ? challenge.profile : undefined),
            wikipediaUrl: resultDetails?.wikipediaUrl ?? null,
            tmdbId: resultDetails?.tmdbId ?? null,
          }}
          stats={{ attemptsUsed: guesses.length, maxAttempts, hintsRevealed }}
          singleShareText={singleShareText}
          currentShareGame={currentShareGame}
          enabledShareModes={enabledShareModes}
          onOpenStats={() => openModal('stats')}
          unplayedModes={unplayedModes}
          guesses={guesses}
        />
      )}
      {status === 'lost' && (
        <LoseModal
          isOpen={ui.isModalOpen && ui.modalType === 'lose'}
          onClose={closeModal}
          mode={mode}
          result={{
            name: modalResultName, year: resultDetails?.year,
            photoUrl: resultDetails?.photoUrl ?? challenge.photoUrl ?? null,
            extract: resultDetails?.extract ?? null,
            genres: resultDetails?.genres, director: resultDetails?.director,
            tmdbId: resultDetails?.tmdbId ?? null,
            personType: resultDetails?.personType ?? (isWikiChallenge(challenge) ? challenge.personType : undefined),
            wikipediaUrl: resultDetails?.wikipediaUrl ?? (isWikiChallenge(challenge) ? challenge.wikipediaUrl ?? null : null),
          }}
          stats={{ attemptsUsed: guesses.length, maxAttempts, hintsRevealed }}
          onShare={() => void nativeShare(singleShareText)}
          onShareAll={handleShareAll}
          onOpenStats={() => openModal('stats')}
          unplayedModes={unplayedModes}
          guesses={guesses}
        />
      )}
    </div>
  )
}
