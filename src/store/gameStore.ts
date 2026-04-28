/**
 * store/gameStore.ts
 * Central Zustand store – single source of truth for all game state.
 * Keeps localStorage in sync on every mutation.
 */

import { create } from 'zustand'
import {
  fetchChallenge,
  fetchChallengeByDate,
  fetchAdjacentDate,
  fetchResult,
  postGuess,
  type ChallengePayload,
  type ResultPayload,
} from '@/api/client'
import { loadStats, saveStats } from '@/lib/storage'
import { buildShareText, getTodayId, updateStats } from '@/lib/utils'
import type {
  GameStats,
  GameStatus,
  GuessEntry,
  PersistedGameState,
  UIState,
} from '@/types'

// ─── Store shape ──────────────────────────────────────────────────────────────

interface GameStore {
  // Server data
  challenge: ChallengePayload | null
  result: ResultPayload | null

  // Derived/local game state (mirrors server but drives UI)
  guesses: GuessEntry[]
  hintsRevealed: number
  status: GameStatus

  // Date navigation
  viewingDate: string | null  // null = today
  hasPrev: boolean  // false when no earlier challenge exists
  hasNext: boolean  // false when no later challenge exists (besides today)

  // Personal stats (localStorage only)
  stats: GameStats

  // UI
  ui: UIState

  // Actions
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

function deriveStatus(outcome: ChallengePayload['outcome']): GameStatus {
  if (outcome === 'won') return 'won'
  if (outcome === 'lost') return 'lost'
  return 'playing'
}

function apiAttemptsToGuesses(
  attempts: ChallengePayload['attempts']
): GuessEntry[] {
  return attempts.map((a: { guess: string; correct: boolean }): GuessEntry => ({
    value: a.guess,
    status: a.correct ? 'correct' : 'wrong',
    timestamp: Date.now(),
  }))
}

/** Returns current date in Europe/Paris timezone as YYYY-MM-DD */
export function getTodayParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// ─── Default UI state ─────────────────────────────────────────────────────────

function defaultUI(): UIState {
  return {
    isModalOpen: false,
    modalType: null,
    isSearchOpen: false,
    inputValue: '',
    shakeTrigger: 0,
  }
}

// ─── Persist a snapshot to localStorage ──────────────────────────────────────

function persistGame(
  challengeId: number,
  state: Omit<PersistedGameState, 'challengeId'>
) {
  const snap: PersistedGameState = {
    challengeId: String(challengeId),
    ...state,
  }
  try {
    localStorage.setItem('cineguess:game', JSON.stringify(snap))
  } catch {
    // quota exceeded – fail silently
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  challenge: null,
  result: null,
  guesses: [],
  hintsRevealed: 0,
  status: 'idle',
  viewingDate: null,
  hasPrev: true,
  hasNext: false,
  stats: loadStats(),
  ui: defaultUI(),

  // ── initGame ──────────────────────────────────────────────────────────────

  initGame: async () => {
    try {
      const challenge = await fetchChallenge()

      const guesses = apiAttemptsToGuesses(challenge.attempts)
      const status = deriveStatus(challenge.outcome)
      const hintsRevealed = challenge.hintsRevealed

      set({
        challenge,
        guesses,
        hintsRevealed,
        status,
        viewingDate: null,
      })

      if (status === 'won' || status === 'lost') {
        try {
          const result = await fetchResult(challenge.challengeId)
          set({ result })
        } catch {
          // result not critical for re-display
        }
        setTimeout(() => {
          // Don't override the tutorial modal if it's currently showing
          if (get().ui.modalType !== 'rules') {
            get().openModal(status === 'won' ? 'win' : 'lose')
          }
        }, 800)
      }
    } catch (err) {
      console.error('[initGame]', err)
    }
  },

  // ── loadDate ──────────────────────────────────────────────────────────────

  loadDate: async (date: string) => {
    const todayParis = getTodayParis()
    // If requesting today, just reload normally
    if (date === todayParis) {
      set({ viewingDate: null, status: 'idle', challenge: null, result: null, guesses: [], hintsRevealed: 0, ui: defaultUI() })
      await get().initGame()
      return
    }

    set({ status: 'idle', challenge: null, result: null, guesses: [], hintsRevealed: 0, viewingDate: date, ui: defaultUI() })
    try {
      const challenge = await fetchChallengeByDate(date)
      const guesses = apiAttemptsToGuesses(challenge.attempts)
      const status = deriveStatus(challenge.outcome)
      const hintsRevealed = challenge.hintsRevealed

      set({ challenge, guesses, hintsRevealed, status, viewingDate: date })

      if (status === 'won' || status === 'lost') {
        try {
          const result = await fetchResult(challenge.challengeId)
          set({ result })
        } catch {
          // result not critical
        }
        setTimeout(() => {
          get().openModal(status === 'won' ? 'win' : 'lose')
        }, 800)
      }
    } catch (err) {
      const is404 = (err as { status?: number }).status === 404
      set({ status: is404 ? 'not_found' : 'idle' })
      if (!is404) console.error('[loadDate]', err)
    }
  },

  // ── navigateDate ─────────────────────────────────────────────────────────
  // Finds the nearest valid challenge in the given direction (single SQL query),
  // then loads it. Pre-checks if another adjacent exists to set boundary flags.
  // On boundary (404), silently restores previous state.

  navigateDate: async (direction: 'prev' | 'next') => {
    const todayParis = getTodayParis()
    const snapshot = get()
    const currentDate = snapshot.viewingDate ?? todayParis

    set({ status: 'idle', challenge: null, result: null, guesses: [], hintsRevealed: 0, ui: defaultUI() })

    try {
      const { date: targetDate } = await fetchAdjacentDate(currentDate, direction)

      if (targetDate >= todayParis) {
        set({ viewingDate: null, hasPrev: true, hasNext: false })
        await get().initGame()
        return
      }

      // We know the opposite direction is valid (we just came from there).
      // Pre-check the same direction to avoid the "ghost click" on the boundary.
      const sameDirectionExists = await fetchAdjacentDate(targetDate, direction)
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
        // Boundary reached – restore previous state and mark this direction as exhausted
        set({
          status: snapshot.status,
          challenge: snapshot.challenge,
          result: snapshot.result,
          guesses: snapshot.guesses,
          hintsRevealed: snapshot.hintsRevealed,
          viewingDate: snapshot.viewingDate,
          ui: snapshot.ui,
          hasPrev: direction === 'prev' ? false : snapshot.hasPrev,
          hasNext: direction === 'next' ? false : snapshot.hasNext,
        })
      } else {
        set({ status: 'idle', viewingDate: currentDate })
        console.error('[navigateDate]', err)
      }
    }
  },

  // ── submitGuess ───────────────────────────────────────────────────────────

  submitGuess: async (guess: string) => {
    const { challenge, guesses, stats } = get()
    if (!challenge || !guess.trim()) return

    const optimisticGuess: GuessEntry = {
      value: guess,
      status: 'wrong',
      timestamp: Date.now(),
    }
    set((s) => ({
      guesses: [...s.guesses, optimisticGuess],
      ui: { ...s.ui, inputValue: '', isSearchOpen: false },
    }))

    try {
      const res = await postGuess(challenge.challengeId, guess)

      const finalStatus: GuessStatus = res.correct ? 'correct' : 'wrong'
      const updatedGuesses: GuessEntry[] = [
        ...guesses,
        { value: guess, status: finalStatus, timestamp: Date.now() },
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
        guesses: updatedGuesses,
        hintsUnlocked: newHintsRevealed,
        status: newStatus,
        blurIndex: newHintsRevealed,
        completedAt: res.outcome ? Date.now() : undefined,
      })

      if (!res.correct) {
        set((s) => ({ ui: { ...s.ui, shakeTrigger: s.ui.shakeTrigger + 1 } }))
      }

      if (res.outcome !== null) {
        const result = await fetchResult(challenge.challengeId)
        set({ result })

        const today = getTodayId()
        const newStats = updateStats(stats, {
          challengeId: String(challenge.challengeId),
          guesses: updatedGuesses,
          hintsUnlocked: newHintsRevealed,
          status: newStatus,
          blurIndex: newHintsRevealed,
          completedAt: Date.now(),
        }, today)
        set({ stats: newStats })
        saveStats(newStats)

        setTimeout(() => {
          get().openModal(res.outcome === 'won' ? 'win' : 'lose')
        }, res.correct ? 1200 : 600)
      }
    } catch (err) {
      set({ guesses })
      console.error('[submitGuess]', err)
    }
  },

  // ── skipAttempt ───────────────────────────────────────────────────────────

  skipAttempt: async () => {
    const { challenge, guesses, stats } = get()
    if (!challenge) return

    const skippedGuess: GuessEntry = {
      value: '',
      status: 'skipped',
      timestamp: Date.now(),
    }
    const updatedGuesses = [...guesses, skippedGuess]

    try {
      const res = await postGuess(challenge.challengeId, '')

      const newStatus = deriveStatus(res.outcome)
      const newHintsRevealed = res.challenge.hintsRevealed
      set({
        guesses: updatedGuesses,
        hintsRevealed: newHintsRevealed,
        status: newStatus,
        challenge: { ...challenge, hints: res.challenge.hints, hintsRevealed: newHintsRevealed },
      })

      persistGame(challenge.challengeId, {
        guesses: updatedGuesses,
        hintsUnlocked: newHintsRevealed,
        status: newStatus,
        blurIndex: newHintsRevealed,
        completedAt: res.outcome ? Date.now() : undefined,
      })

      if (res.outcome !== null) {
        const result = await fetchResult(challenge.challengeId)
        set({ result })

        const today = getTodayId()
        const newStats = updateStats(stats, {
          challengeId: String(challenge.challengeId),
          guesses: updatedGuesses,
          hintsUnlocked: newHintsRevealed,
          status: newStatus,
          blurIndex: newHintsRevealed,
          completedAt: Date.now(),
        }, today)
        set({ stats: newStats })
        saveStats(newStats)

        setTimeout(() => get().openModal('lose'), 600)
      }
    } catch (err) {
      console.error('[skipAttempt]', err)
    }
  },

  // ── UI actions ────────────────────────────────────────────────────────────

  openModal: (type) =>
    set((s) => ({ ui: { ...s.ui, isModalOpen: true, modalType: type } })),

  closeModal: () =>
    set((s) => ({ ui: { ...s.ui, isModalOpen: false, modalType: null } })),

  setInputValue: (value) =>
    set((s) => ({
      ui: { ...s.ui, inputValue: value, isSearchOpen: value.length >= 2 },
    })),

  shareResult: () => {
    const { challenge, guesses, status } = get()
    if (!challenge) return
    const text = buildShareText(
      challenge.date,
      guesses,
      status === 'won',
      challenge.maxAttempts
    )
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).catch(() => {})
    }
  },
}))

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectAttemptsLeft = (s: GameStore) =>
  (s.challenge?.maxAttempts ?? 6) - s.guesses.length

const EMPTY_HINTS: ChallengePayload['hints'] = []

export const selectCurrentHints = (s: GameStore) =>
  s.challenge ? s.challenge.hints.slice(0, s.hintsRevealed) : EMPTY_HINTS

export const selectIsGameOver = (s: GameStore) =>
  s.status === 'won' || s.status === 'lost'

type GuessStatus = 'correct' | 'wrong' | 'skipped'
