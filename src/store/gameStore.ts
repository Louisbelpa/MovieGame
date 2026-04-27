/**
 * store/gameStore.ts
 * Central Zustand store – single source of truth for all game state.
 * Keeps localStorage in sync on every mutation.
 */

import { create } from 'zustand'
import {
  fetchChallenge,
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

  // Personal stats (localStorage only)
  stats: GameStats

  // UI
  ui: UIState

  // Actions
  initGame: () => Promise<void>
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
      })

      // If game already over (user returns same day), fetch result & open modal
      if (status === 'won' || status === 'lost') {
        try {
          const result = await fetchResult(challenge.challengeId)
          set({ result })
        } catch {
          // result not critical for re-display
        }
        // Small delay so the page mounts before the modal appears
        setTimeout(() => {
          get().openModal(status === 'won' ? 'win' : 'lose')
        }, 800)
      }
    } catch (err) {
      console.error('[initGame]', err)
      // stay idle – GamePage will show an error boundary
    }
  },

  // ── submitGuess ───────────────────────────────────────────────────────────

  submitGuess: async (guess: string) => {
    const { challenge, guesses, stats } = get()
    if (!challenge || !guess.trim()) return

    // Optimistic UI: append guess immediately
    const optimisticGuess: GuessEntry = {
      value: guess,
      status: 'wrong', // will be corrected on response
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

      // Wrong guess: shake animation
      if (!res.correct) {
        set((s) => ({ ui: { ...s.ui, shakeTrigger: s.ui.shakeTrigger + 1 } }))
      }

      // Game over
      if (res.outcome !== null) {
        const result = await fetchResult(challenge.challengeId)
        set({ result })

        // Update local stats
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
      // Revert optimistic update
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

    // A skip counts as a wrong attempt server-side: send empty string
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
      status === 'won'
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

// Fix missing type import used in submitGuess
type GuessStatus = 'correct' | 'wrong' | 'skipped'
