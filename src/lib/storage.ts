import type { GameStats, PersistedGameState } from '@/types'
import { defaultStats } from '@/lib/utils'

const KEYS = {
  GAME: 'cineguess:game',
  STATS: 'cineguess:stats',
  HISTORY: 'cineguess:history',
} as const

// ─── Game history (per-date win/loss record) ──────────────────────────────────

export type GameHistory = Record<string, 'won' | 'lost'>

export function loadHistory(): GameHistory {
  try {
    const raw = localStorage.getItem(KEYS.HISTORY)
    return raw ? (JSON.parse(raw) as GameHistory) : {}
  } catch {
    return {}
  }
}

/** Record the outcome for a date. Won't overwrite an existing entry. */
export function addToHistory(date: string, outcome: 'won' | 'lost'): void {
  try {
    const history = loadHistory()
    if (history[date]) return  // already recorded
    history[date] = outcome
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history))
  } catch {
    // quota exceeded – fail silently
  }
}

// ─── Game state ───────────────────────────────────────────────────────────────

export function loadGameState(): PersistedGameState | null {
  try {
    const raw = localStorage.getItem(KEYS.GAME)
    return raw ? (JSON.parse(raw) as PersistedGameState) : null
  } catch {
    return null
  }
}

export function saveGameState(state: PersistedGameState): void {
  try {
    localStorage.setItem(KEYS.GAME, JSON.stringify(state))
  } catch {
    // Storage quota exceeded — fail silently
  }
}

export function clearGameState(): void {
  localStorage.removeItem(KEYS.GAME)
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(KEYS.STATS)
    return raw ? (JSON.parse(raw) as GameStats) : defaultStats()
  } catch {
    return defaultStats()
  }
}

export function saveStats(stats: GameStats): void {
  try {
    localStorage.setItem(KEYS.STATS, JSON.stringify(stats))
  } catch {}
}
