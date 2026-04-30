import type { GameStats, PersistedGameState } from '@/types'
import { defaultStats } from '@/lib/utils'

const keys = (type: 'film' | 'series') => ({
  GAME: `cineguess:game:${type}`,
  STATS: `cineguess:stats:${type}`,
  HISTORY: `cineguess:history:${type}`,
})

export type GameHistory = Record<string, 'won' | 'lost'>

export function loadHistory(type: 'film' | 'series' = 'film'): GameHistory {
  try {
    const raw = localStorage.getItem(keys(type).HISTORY)
    return raw ? (JSON.parse(raw) as GameHistory) : {}
  } catch {
    return {}
  }
}

/** Record the outcome for a date. Won't overwrite an existing entry. */
export function addToHistory(date: string, outcome: 'won' | 'lost', type: 'film' | 'series' = 'film'): void {
  try {
    const history = loadHistory(type)
    if (history[date]) return
    history[date] = outcome
    localStorage.setItem(keys(type).HISTORY, JSON.stringify(history))
  } catch {}
}

export function loadGameState(type: 'film' | 'series' = 'film'): PersistedGameState | null {
  try {
    const raw = localStorage.getItem(keys(type).GAME)
    return raw ? (JSON.parse(raw) as PersistedGameState) : null
  } catch {
    return null
  }
}

export function saveGameState(state: PersistedGameState, type: 'film' | 'series' = 'film'): void {
  try {
    localStorage.setItem(keys(type).GAME, JSON.stringify(state))
  } catch {}
}

export function clearGameState(type: 'film' | 'series' = 'film'): void {
  localStorage.removeItem(keys(type).GAME)
}

export function loadStats(type: 'film' | 'series' = 'film'): GameStats {
  try {
    const raw = localStorage.getItem(keys(type).STATS)
    return raw ? (JSON.parse(raw) as GameStats) : defaultStats()
  } catch {
    return defaultStats()
  }
}

export function saveStats(stats: GameStats, type: 'film' | 'series' = 'film'): void {
  try {
    localStorage.setItem(keys(type).STATS, JSON.stringify(stats))
  } catch {}
}
