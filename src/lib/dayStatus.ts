import { maxAttemptsForMode } from '@/lib/gameRules'
import { loadGameState, loadHistory, loadStats } from '@/lib/storage'
import type { GameStatus, PersistedGameState } from '@/types'

export type DayOutcome = 'won' | 'lost' | null

export interface TodayGameSnapshot {
  outcome: DayOutcome
  attempts: number | null
  maxAttempts: number
}

function parisDayFromTs(ts: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(ts))
}

function isSameParisDay(state: PersistedGameState, today: string): boolean {
  return (
    state.challengeId === today
    || (state.completedAt != null && parisDayFromTs(state.completedAt) === today)
  )
}

function attemptsFromState(state: PersistedGameState): number | null {
  if (!state.guesses.length) return null
  const winIdx = state.guesses.findIndex((g) => g.status === 'correct')
  if (winIdx >= 0) return winIdx + 1
  return state.guesses.length
}

/** État du jour pour un mode (localStorage + repli stats). */
export function getTodayGameSnapshot(
  mode: 'film' | 'series' | 'wiki',
  today: string,
  maxAttempts = maxAttemptsForMode(mode),
): TodayGameSnapshot {
  const state = loadGameState(mode)
  const hist = loadHistory(mode)[today]

  if (state && isSameParisDay(state, today)) {
    if (state.status === 'won') {
      return {
        outcome: 'won',
        attempts: attemptsFromState(state),
        maxAttempts,
      }
    }
    if (state.status === 'lost') {
      return { outcome: 'lost', attempts: null, maxAttempts }
    }
    if (hist) {
      return {
        outcome: hist,
        attempts: hist === 'won' ? attemptsFromState(state) : null,
        maxAttempts,
      }
    }
    return { outcome: null, attempts: null, maxAttempts }
  }

  if (hist) {
    return {
      outcome: hist,
      attempts: hist === 'won' && state?.status === 'won' ? attemptsFromState(state) : null,
      maxAttempts,
    }
  }

  const stats = loadStats(mode)
  if (stats.lastPlayedDate === today) {
    return {
      outcome: stats.lastWonDate === today ? 'won' : 'lost',
      attempts: null,
      maxAttempts,
    }
  }

  return { outcome: null, attempts: null, maxAttempts }
}

export function switcherLabel(
  snapshot: TodayGameSnapshot,
  isCurrent: boolean,
  live?: { status: GameStatus; attempts: number },
): { label: string; st: 'st-current' | 'st-done' | 'st-lost' | 'st-todo' } {
  let outcome = snapshot.outcome
  let attempts = snapshot.attempts

  if (isCurrent && live) {
    if (live.status === 'won' || live.status === 'lost') {
      outcome = live.status
      attempts = live.status === 'won' ? live.attempts : null
    } else if (live.status === 'playing') {
      return { label: 'En cours', st: 'st-current' }
    }
  }

  if (isCurrent && !outcome) {
    return { label: 'En cours', st: 'st-current' }
  }

  if (outcome === 'won') {
    const label = attempts != null
      ? `Réussi ${attempts}/${snapshot.maxAttempts}`
      : 'Réussi'
    return {
      label,
      st: isCurrent ? 'st-current' : 'st-done',
    }
  }
  if (outcome === 'lost') {
    return { label: 'Perdu', st: 'st-lost' }
  }
  return { label: 'À jouer', st: 'st-todo' }
}
