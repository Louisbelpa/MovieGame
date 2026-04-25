import type { GameStats, PersistedGameState } from '@/types'
import { defaultStats } from '@/lib/utils'

const KEYS = {
  GAME: 'cineguess:game',
  STATS: 'cineguess:stats',
} as const

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
