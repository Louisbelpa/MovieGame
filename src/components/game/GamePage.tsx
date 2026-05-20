import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Share2, HelpCircle, CheckCircle2, XCircle, Film, Tv, User, Calendar } from 'lucide-react'
import { GuessInput } from './GuessInput'
import { GuessList } from './GuessList'
import { HintPanel } from './HintPanel'
import { MovieImage } from './MovieImage'
import { FriendsLive } from './FriendsLive'
import { WikiChallengeImage } from '@/components/wiki/WikiChallengeImage'
import { WikiHintPanel } from '@/components/wiki/WikiHintPanel'
import { WikiGuessInput } from '@/components/wiki/WikiGuessInput'
import { Spinner } from '@/components/ui/Spinner'
import { WinModal } from '@/components/modals/WinModal'
import { LoseModal } from '@/components/modals/LoseModal'
import { fetchResult, fetchChallengeCommunityStats, friendsGetAll } from '@/api/client'
import { fetchWikiResult } from '@/api/wikiClient'
import type { HintPayload, GlobalStatsPayload } from '@/api/client'
import type { WikiChallengePayload, WikiHintPayload, WikiVisibleProfile } from '@/api/wikiClient'
import type { GuessEntry } from '@/types'
import { useGameStore, getTodayParis } from '@/store/gameStore'
import { useWikiStore } from '@/store/wikiStore'
import { useAuthStore } from '@/store/authStore'
import { loadHistory, loadGameState } from '@/lib/storage'
import { Sounds } from '@/lib/sounds'
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

// ─── #01 Sidebar panels ───────────────────────────────────────────────────────

function SidebarPanel({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      style={{ background: '#161c2f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}
    >
      {children}
    </motion.div>
  )
}

function GuessHistorySide({
  guesses,
  maxAttempts,
}: {
  guesses: Array<{ guess: string; correct: boolean; hint?: string }>
  maxAttempts: number
}) {
  return (
    <SidebarPanel delay={0}>
      <div style={{ padding: '11px 12px' }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(159,163,173,0.5)', textTransform: 'uppercase', marginBottom: 8 }}>
          TES TENTATIVES · {guesses.length}/{maxAttempts}
        </p>
        {guesses.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(159,163,173,0.35)' }}>Aucune tentative pour l'instant.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {guesses.map((g, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: g.correct ? 'rgba(76,176,120,0.2)' : 'rgba(212,96,74,0.2)',
                  border: `1px solid ${g.correct ? '#4cb078' : '#d4604a'}`,
                  color: g.correct ? '#4cb078' : '#d4604a',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: '#e8eaed', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.guess || <em style={{ color: 'rgba(159,163,173,0.4)', fontStyle: 'normal' }}>—Passé—</em>}
                  </p>
                  {g.hint && (
                    <p style={{ fontSize: 10, color: 'rgba(159,163,173,0.5)', fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                      {g.hint}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SidebarPanel>
  )
}

function DailyChallengeStatsPanel({
  challengeId,
  challengeNumber,
  accentColor,
}: {
  challengeId: number
  challengeNumber?: number
  accentColor: string
}) {
  const [stats, setStats] = useState<GlobalStatsPayload | null>(null)

  useEffect(() => {
    let cancelled = false
    function fetchStats() {
      fetchChallengeCommunityStats(challengeId).then((s) => {
        if (!cancelled) setStats(s)
      }).catch(() => {})
    }
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [challengeId])

  const maxBarVal = stats ? Math.max(1, ...Object.values(stats.winsByAttempt)) : 1
  const maxKey = stats ? Object.entries(stats.winsByAttempt).reduce((best, [k, v]) => v > (stats.winsByAttempt[best] ?? 0) ? k : best, '1') : '1'

  const avgAttempts = stats && stats.totalWins > 0
    ? Math.round(Object.entries(stats.winsByAttempt).reduce((sum, [k, v]) => sum + Number(k) * v, 0) / stats.totalWins * 10) / 10
    : null

  return (
    <SidebarPanel delay={0.07}>
      <div style={{ padding: '11px 12px' }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(159,163,173,0.5)', textTransform: 'uppercase', marginBottom: 8 }}>
          DÉFI {challengeNumber ? `#${challengeNumber}` : ''} · LIVE
        </p>
        {stats ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4cb078', display: 'inline-block' }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#4cb078', fontWeight: 600 }}>
                {stats.totalGames} joueurs
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
              {['1', '2', '3', '4', '5'].map((k) => {
                const count = stats.winsByAttempt[k] ?? 0
                const pct = Math.round((count / maxBarVal) * 100)
                const isMax = k === maxKey && count > 0
                return (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(159,163,173,0.5)', textAlign: 'right', flexShrink: 0 }}>{k}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 3,
                          width: `${Math.max(pct, count > 0 ? 4 : 0)}%`,
                          background: isMax ? accentColor : `${accentColor}73`,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    <span style={{ width: 16, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(159,163,173,0.4)', textAlign: 'right', flexShrink: 0 }}>{count}</span>
                  </div>
                )
              })}
            </div>
            {avgAttempts !== null && (
              <p style={{ fontSize: 10, color: 'rgba(159,163,173,0.45)', fontFamily: "'JetBrains Mono', monospace" }}>
                Score moyen : {avgAttempts} essais
              </p>
            )}
          </>
        ) : (
          <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: accentColor, animation: 'spin 1s linear infinite' }} />
          </div>
        )}
      </div>
    </SidebarPanel>
  )
}

function FriendsTodayMiniPanel({ mode }: { mode: 'film' | 'series' | 'wiki' }) {
  const user = useAuthStore((s) => s.user)
  const today = getTodayParis()
  const [friends, setFriends] = useState<Array<{
    id: number; displayName: string; avatarUrl: string | null
    score: { won: boolean; attemptsUsed: number } | null; isMe: boolean
  }>>([])

  useEffect(() => {
    if (!user) return
    friendsGetAll(today).then((r) => {
      const entries = r.friends.slice(0, 4).map((f) => ({
        id: f.id,
        displayName: f.displayName,
        avatarUrl: f.avatarUrl,
        score: f.scores[mode] ?? null,
        isMe: f.isMe,
      }))
      setFriends(entries)
    }).catch(() => {})
  }, [user, today, mode])

  if (!user || friends.length === 0) return null

  return (
    <SidebarPanel delay={0.14}>
      <a href="/friends" style={{ display: 'block', textDecoration: 'none' }}>
        <div style={{ padding: '11px 12px' }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(159,163,173,0.5)', textTransform: 'uppercase', marginBottom: 8 }}>
            AMIS · AUJOURD'HUI
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {friends.map((f, i) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {i === 0 && f.score?.won ? (
                  <span style={{ fontSize: 12, flexShrink: 0 }}>🥇</span>
                ) : (
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: f.avatarUrl ? 'transparent' : 'rgba(255,255,255,0.06)',
                    color: 'rgba(159,163,173,0.5)', fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {f.avatarUrl
                      ? <img src={f.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : f.displayName.charAt(0).toUpperCase()
                    }
                  </span>
                )}
                <span style={{ flex: 1, fontSize: 12, color: f.isMe ? '#d4a64a' : '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.isMe ? 'Toi' : f.displayName}
                </span>
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, flexShrink: 0, color: f.score === null ? 'rgba(159,163,173,0.2)' : f.score.won ? '#4cb078' : '#d4604a' }}>
                  {f.score === null ? '—' : f.score.won ? `${f.score.attemptsUsed}/5` : '✗'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </a>
    </SidebarPanel>
  )
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
  const prevGuessCountRef = useRef(0)
  const prevHintsRevealedRef = useRef(0)
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
      if (status === 'won') Sounds.win()
      else Sounds.lose()
      openModal(status === 'won' ? 'win' : 'lose')
    }
  }, [challenge, status, mode, openModal])

  // Sound effects on hint reveal
  useEffect(() => {
    if (hintsRevealed > prevHintsRevealedRef.current && prevHintsRevealedRef.current > 0) {
      Sounds.hint()
    }
    prevHintsRevealedRef.current = hintsRevealed
  }, [hintsRevealed])

  // Sound effects on new guess
  useEffect(() => {
    const count = guesses.length
    if (count > prevGuessCountRef.current && count > 0 && status === 'playing') {
      const last = guesses[count - 1]
      if (last) {
        if (last.correct) Sounds.correct()
        else Sounds.wrong()
      }
    }
    prevGuessCountRef.current = count
  }, [guesses, status])

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
          extract: data.synopsis ?? null,
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

  const modeAccentColor = mode === 'film' ? '#f5d358' : mode === 'series' ? '#4ad6c0' : '#ff5a8a'
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

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
        <div className="h-24" style={{ background: 'linear-gradient(to top, var(--color-film-black) 0%, transparent 100%)' }} />
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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {status === 'won'
              ? <CheckCircle2 size={14} className="text-film-green shrink-0" aria-hidden />
              : <XCircle size={14} className="text-film-red shrink-0" aria-hidden />}
            <span className={`text-xs font-semibold ${status === 'won' ? 'text-film-green' : 'text-film-red'}`}>
              {status === 'won'
                ? `Bravo ! Trouvé en ${guesses.findIndex((g) => g.correct) + 1}/${challenge.maxAttempts}`
                : 'Pas cette fois…'}
            </span>
            {status === 'won' && (() => {
              const n = guesses.findIndex((g) => g.correct) + 1
              if (n === 1) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-film-gold/20 border border-film-gold/40 text-film-gold">⚡ Coup de maître</span>
              if (n <= 3) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-film-green/30 text-film-green" style={{ background: 'rgba(16,185,129,0.15)' }}>✓ {n === 2 ? 'Excellent' : 'Bien joué'}</span>
              return null
            })()}
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
          {/* Genres + director row */}
          {!isWiki && (resultDetails?.genres?.length || resultDetails?.director) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {resultDetails?.director && (
                <span className="text-[11px] text-film-text-dim">
                  {resultDetails.director}
                </span>
              )}
              {resultDetails?.director && resultDetails?.genres?.length ? (
                <span className="text-film-text-dim/30 text-[11px]">·</span>
              ) : null}
              {resultDetails?.genres?.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(236,233,226,0.55)' }}
                >
                  {g}
                </span>
              ))}
            </div>
          )}
          {resultDetails?.extract && (
            <p className="text-xs text-film-text-dim mt-1.5 line-clamp-3 leading-relaxed">{resultDetails.extract}</p>
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
      <div className="px-3 sm:px-4 py-3 max-w-2xl mx-auto w-full flex justify-center">
        <nav className="inline-flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <a
            href="/films"
            className={`mode-tab px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'film' ? 'mode-tab--active' : ''}`}
            style={mode === 'film' ? { background: 'var(--sg-films)', color: '#0b0b1a' } : { color: 'rgba(236,233,226,0.5)' }}
          >
            Films
          </a>
          {FEATURES.enableSeries && (
            <a
              href="/series"
              className={`mode-tab px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'series' ? 'mode-tab--active' : ''}`}
              style={mode === 'series' ? { background: 'var(--sg-series)', color: '#0b0b1a' } : { color: 'rgba(236,233,226,0.5)' }}
            >
              Séries
            </a>
          )}
          {FEATURES.enableWiki && (
            <a
              href="/wiki"
              className={`mode-tab px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'wiki' ? 'mode-tab--active' : ''}`}
              style={mode === 'wiki' ? { background: 'var(--sg-wiki)', color: '#0b0b1a' } : { color: 'rgba(236,233,226,0.5)' }}
            >
              Perso
            </a>
          )}
        </nav>
      </div>

      {/* ── IMAGE HERO ───────────────────────────────────────────────────── */}
      <div className="px-3 sm:px-4">
        <div className="relative max-w-2xl mx-auto overflow-hidden rounded-xl">
          {!isWiki ? (
            <MovieImage
              imageUrl={challenge.photoUrl ?? null}
              attempt={Math.min(guesses.length + 1, challenge.maxAttempts)}
              maxAttempts={challenge.maxAttempts}
            />
          ) : (
            <WikiChallengeImage imageUrl={challenge.photoUrl ?? null} isRevealed={isGameOver} />
          )}
          {imageOverlay}
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <div className={`px-3 sm:px-4 py-4 sm:py-6 pb-28 sm:pb-32 lg:pb-8 ${FEATURES.newDesign ? 'lg:max-w-6xl lg:mx-auto' : ''}`}>
        <div className={FEATURES.newDesign ? 'lg:grid lg:grid-cols-[1fr_320px] lg:gap-6' : ''}>

          {/* Main column */}
          <div className="max-w-2xl mx-auto lg:mx-0 lg:max-w-none flex flex-col gap-5">

            {/* Reveal card */}
            {revealCard}

            {/* Attempts tracker */}
            <div className="flex items-center gap-1.5">
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
                            ? 'rgba(255,255,255,0.38)'
                            : 'var(--color-film-red)'
                        : 'rgba(255,255,255,0.10)',
                    }}
                  />
                )
              })}
            </div>

            {/* Input (desktop only — mobile uses sticky bar) */}
            {!isGameOver && <div className="hidden sm:block">{inputSection}</div>}

            {/* Wiki profile */}
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

            {/* Hints */}
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
            <FriendsLive mode={isWiki ? 'wiki' : mode as 'film' | 'series'} />

          </div>

          {/* #01 — Sidebar (desktop lg+ only, new design) */}
          {FEATURES.newDesign && (
            <div className="hidden lg:flex flex-col gap-3 sticky top-4 overflow-y-auto max-h-[calc(100vh-80px)] self-start">
              <GuessHistorySide
                guesses={guesses.map((g) => ({ guess: g.guess, correct: g.correct }))}
                maxAttempts={challenge.maxAttempts}
              />
              <DailyChallengeStatsPanel
                challengeId={challenge.challengeId ?? 0}
                challengeNumber={challenge.challengeNumber}
                accentColor={modeAccentColor}
              />
              <FriendsTodayMiniPanel mode={isWiki ? 'wiki' : mode as 'film' | 'series'} />
            </div>
          )}

        </div>
      </div>

      {/* ── MOBILE sticky input bar ── */}
      {!isGameOver && (
        <div
          className="sm:hidden fixed bottom-0 left-0 right-0 z-30 px-3 pt-3 pb-4"
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
