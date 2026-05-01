/**
 * store/wikiStore.ts
 * Zustand store for the Wikipedia person-guessing game.
 * Mirrors gameStore.ts structure but calls /api/wiki/* endpoints.
 */

import { create } from 'zustand'
import {
  fetchWikiChallenge,
  fetchWikiChallengeByDate,
  fetchWikiAdjacentDate,
  fetchWikiResult,
  postWikiGuess,
  type WikiChallengePayload,
  type WikiResultPayload,
} from '@/api/wikiClient'
import { loadStats, saveStats, addToHistory } from '@/lib/storage'
import { buildShareText, getTodayId, updateStats } from '@/lib/utils'
import type { GameStats, GameStatus, GuessEntry, PersistedGameState, UIState } from '@/types'

// ─── Store shape ──────────────────────────────────────────────────────────────

interface WikiStore {
  challenge: WikiChallengePayload | null
  result: WikiResultPayload | null
  guesses: GuessEntry[]
  hintsRevealed: number
  status: GameStatus
  viewingDate: string | null
  hasPrev: boolean
  hasNext: boolean
  stats: GameStats
  ui: UIState

  initGame: () => Promise<void>
  loadDate: (date: string) => Promise<void>
  navigateDate: (direction: 'prev' | 'next') => Promise<void>
  submitGuess: (guess: string) => Promise<void>
  skipAttempt: () => Promise<void>
  openModal: (type: UIState['modalType']) => void
  closeModal: () => void
  setInputValue: (value: string) => void
  shareResult: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getTodayParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

function deriveStatus(outcome: WikiChallengePayload['outcome']): GameStatus {
  if (outcome === 'won') return 'won'
  if (outcome === 'lost') return 'lost'
  return 'playing'
}

function apiAttemptsToGuesses(attempts: WikiChallengePayload['attempts']): GuessEntry[] {
  return attempts.map(a => ({
    value: a.guess,
    status: a.correct ? 'correct' : 'wrong',
    timestamp: Date.now(),
  } as GuessEntry))
}

function defaultUI(): UIState {
  return { isModalOpen: false, modalType: null, isSearchOpen: false, inputValue: '', shakeTrigger: 0 }
}

function persistGame(challengeId: number, state: Omit<PersistedGameState, 'challengeId'>) {
  const snap: PersistedGameState = { challengeId: String(challengeId), ...state }
  try { localStorage.setItem('cineguess:game:wiki', JSON.stringify(snap)) } catch {}
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWikiStore = create<WikiStore>((set, get) => ({
  challenge: null,
  result: null,
  guesses: [],
  hintsRevealed: 0,
  status: 'idle',
  viewingDate: null,
  hasPrev: true,
  hasNext: false,
  stats: loadStats('wiki'),
  ui: defaultUI(),

  // ── initGame ────────────────────────────────────────────────────────────────

  initGame: async () => {
    try {
      const challenge = await fetchWikiChallenge()
      const hasPrev = await fetchWikiAdjacentDate(challenge.date, 'prev')
        .then(() => true)
        .catch((err) => (err as { status?: number }).status === 404 ? false : true)

      set({
        challenge,
        guesses: apiAttemptsToGuesses(challenge.attempts),
        hintsRevealed: challenge.hintsRevealed,
        status: deriveStatus(challenge.outcome),
        viewingDate: null,
        hasPrev,
        hasNext: false,
      })

      const status = deriveStatus(challenge.outcome)
      if (status === 'won' || status === 'lost') {
        try { set({ result: await fetchWikiResult(challenge.challengeId) }) } catch {}
      }
    } catch (err) {
      console.error('[wikiStore.initGame]', err)
    }
  },

  // ── loadDate ────────────────────────────────────────────────────────────────

  loadDate: async (date: string) => {
    const todayParis = getTodayParis()
    if (date === todayParis) {
      set({ viewingDate: null, status: 'idle', challenge: null, result: null, guesses: [], hintsRevealed: 0, ui: defaultUI() })
      await get().initGame()
      return
    }

    set({ status: 'idle', challenge: null, result: null, guesses: [], hintsRevealed: 0, viewingDate: date, ui: defaultUI() })
    try {
      const [challenge, prevCheck, nextCheck] = await Promise.all([
        fetchWikiChallengeByDate(date),
        fetchWikiAdjacentDate(date, 'prev').then(() => true).catch((err) => (err as { status?: number }).status === 404 ? false : true),
        fetchWikiAdjacentDate(date, 'next').then(() => true).catch((err) => (err as { status?: number }).status === 404 ? false : true),
      ])

      const status = deriveStatus(challenge.outcome)
      set({ challenge, guesses: apiAttemptsToGuesses(challenge.attempts), hintsRevealed: challenge.hintsRevealed, status, viewingDate: date, hasPrev: prevCheck, hasNext: nextCheck })

      if (status === 'won' || status === 'lost') {
        try { set({ result: await fetchWikiResult(challenge.challengeId) }) } catch {}
      }
    } catch (err) {
      const is404 = (err as { status?: number }).status === 404
      set({ status: is404 ? 'not_found' : 'idle' })
      if (!is404) console.error('[wikiStore.loadDate]', err)
    }
  },

  // ── navigateDate ────────────────────────────────────────────────────────────

  navigateDate: async (direction: 'prev' | 'next') => {
    const todayParis = getTodayParis()
    const snapshot = get()
    const currentDate = snapshot.viewingDate ?? todayParis

    try {
      const { date: targetDate } = await fetchWikiAdjacentDate(currentDate, direction)
      const isToday = targetDate >= todayParis
      set({ status: 'idle', challenge: null, result: null, guesses: [], hintsRevealed: 0, ui: defaultUI(), viewingDate: isToday ? null : targetDate })

      if (isToday) {
        set({ hasPrev: true, hasNext: false })
        await get().initGame()
        return
      }

      const sameDirectionExists = await fetchWikiAdjacentDate(targetDate, direction)
        .then(() => true)
        .catch((err) => (err as { status?: number }).status === 404 ? false : true)

      set({
        hasPrev: direction === 'prev' ? sameDirectionExists : true,
        hasNext: direction === 'next' ? sameDirectionExists : true,
      })
      await get().loadDate(targetDate)
    } catch (err) {
      const is404 = (err as { status?: number }).status === 404
      if (is404) {
        set({
          status: snapshot.status, challenge: snapshot.challenge, result: snapshot.result,
          guesses: snapshot.guesses, hintsRevealed: snapshot.hintsRevealed, viewingDate: snapshot.viewingDate, ui: snapshot.ui,
          hasPrev: direction === 'prev' ? false : snapshot.hasPrev,
          hasNext: direction === 'next' ? false : snapshot.hasNext,
        })
      } else {
        set({ status: 'idle', viewingDate: currentDate })
        console.error('[wikiStore.navigateDate]', err)
      }
    }
  },

  // ── submitGuess ─────────────────────────────────────────────────────────────

  submitGuess: async (guess: string) => {
    const { challenge, guesses, stats } = get()
    if (!challenge || !guess.trim()) return

    set(s => ({
      guesses: [...s.guesses, { value: guess, status: 'wrong', timestamp: Date.now() } as GuessEntry],
      ui: { ...s.ui, inputValue: '', isSearchOpen: false },
    }))

    try {
      const res = await postWikiGuess(challenge.challengeId, guess)
      const updatedGuesses: GuessEntry[] = [
        ...guesses,
        { value: guess, status: res.correct ? 'correct' : 'wrong', timestamp: Date.now() } as GuessEntry,
      ]
      const newStatus = deriveStatus(res.outcome)
      const newHintsRevealed = res.challenge.hintsRevealed

      set({
        guesses: updatedGuesses,
        hintsRevealed: newHintsRevealed,
        status: newStatus,
        challenge: { ...challenge, hints: res.challenge.hints, hintsRevealed: newHintsRevealed },
      })

      persistGame(challenge.challengeId, {
        guesses: updatedGuesses, hintsUnlocked: newHintsRevealed, status: newStatus,
        blurIndex: newHintsRevealed, completedAt: res.outcome ? Date.now() : undefined,
      })

      if (!res.correct) set(s => ({ ui: { ...s.ui, shakeTrigger: s.ui.shakeTrigger + 1 } }))

      if (res.outcome !== null) {
        const result = await fetchWikiResult(challenge.challengeId)
        set({ result })
        addToHistory(challenge.date, res.outcome, 'wiki')
        const today = getTodayId()
        const newStats = updateStats(stats, {
          challengeId: String(challenge.challengeId), guesses: updatedGuesses,
          hintsUnlocked: newHintsRevealed, status: newStatus, blurIndex: newHintsRevealed, completedAt: Date.now(),
        }, today)
        set({ stats: newStats })
        saveStats(newStats, 'wiki')
        setTimeout(() => get().openModal(res.outcome === 'won' ? 'win' : 'lose'), res.correct ? 1200 : 600)
      }
    } catch (err) {
      set({ guesses })
      console.error('[wikiStore.submitGuess]', err)
    }
  },

  // ── skipAttempt ─────────────────────────────────────────────────────────────

  skipAttempt: async () => {
    const { challenge, guesses, stats } = get()
    if (!challenge) return

    const updatedGuesses: GuessEntry[] = [...guesses, { value: '', status: 'skipped', timestamp: Date.now() } as GuessEntry]

    try {
      const res = await postWikiGuess(challenge.challengeId, '')
      const newStatus = deriveStatus(res.outcome)
      const newHintsRevealed = res.challenge.hintsRevealed
      set({
        guesses: updatedGuesses, hintsRevealed: newHintsRevealed, status: newStatus,
        challenge: { ...challenge, hints: res.challenge.hints, hintsRevealed: newHintsRevealed },
      })
      persistGame(challenge.challengeId, {
        guesses: updatedGuesses, hintsUnlocked: newHintsRevealed, status: newStatus,
        blurIndex: newHintsRevealed, completedAt: res.outcome ? Date.now() : undefined,
      })
      if (res.outcome !== null) {
        const result = await fetchWikiResult(challenge.challengeId)
        set({ result })
        addToHistory(challenge.date, res.outcome, 'wiki')
        const today = getTodayId()
        const newStats = updateStats(stats, {
          challengeId: String(challenge.challengeId), guesses: updatedGuesses,
          hintsUnlocked: newHintsRevealed, status: newStatus, blurIndex: newHintsRevealed, completedAt: Date.now(),
        }, today)
        set({ stats: newStats })
        saveStats(newStats, 'wiki')
        setTimeout(() => get().openModal('lose'), 600)
      }
    } catch (err) {
      console.error('[wikiStore.skipAttempt]', err)
    }
  },

  // ── UI actions ───────────────────────────────────────────────────────────────

  openModal: (type) => set(s => ({ ui: { ...s.ui, isModalOpen: true, modalType: type } })),
  closeModal: () => set(s => ({ ui: { ...s.ui, isModalOpen: false, modalType: null } })),
  setInputValue: (value) => set(s => ({ ui: { ...s.ui, inputValue: value, isSearchOpen: value.length >= 2 } })),

  shareResult: () => {
    const { challenge, guesses, status } = get()
    if (!challenge) return
    const text = buildShareText(challenge.date, guesses, status === 'won', challenge.maxAttempts, challenge.challengeNumber)
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else navigator.clipboard.writeText(text).catch(() => {})
  },
}))

// ─── Selectors ─────────────────────────────────────────────────────────────────

export const selectWikiAttemptsLeft = (s: WikiStore) =>
  (s.challenge?.maxAttempts ?? 3) - s.guesses.length

export const selectWikiCurrentHints = (s: WikiStore) =>
  s.challenge ? s.challenge.hints.slice(0, s.hintsRevealed) : []

export const selectWikiIsGameOver = (s: WikiStore) =>
  s.status === 'won' || s.status === 'lost'
