import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadHistory,
  addToHistory,
  loadStats,
  saveStats,
  loadGameState,
  saveGameState,
  clearGameState,
} from './storage'
import { defaultStats } from './utils'
import type { GameStats, PersistedGameState } from '@/types'

// localStorage is available in jsdom — clear it before each test
beforeEach(() => {
  localStorage.clear()
})

// ─── History ──────────────────────────────────────────────────────────────────

describe('loadHistory', () => {
  it('returns empty object when nothing stored', () => {
    expect(loadHistory('film')).toEqual({})
  })

  it('returns stored history', () => {
    localStorage.setItem('cineguess:history:film', JSON.stringify({ '2026-05-08': 'won' }))
    expect(loadHistory('film')).toEqual({ '2026-05-08': 'won' })
  })

  it('returns empty on invalid JSON', () => {
    localStorage.setItem('cineguess:history:film', 'bad json{{}')
    expect(loadHistory('film')).toEqual({})
  })

  it('is scoped by type', () => {
    localStorage.setItem('cineguess:history:film', JSON.stringify({ '2026-05-08': 'won' }))
    expect(loadHistory('series')).toEqual({})
  })
})

describe('addToHistory', () => {
  it('adds an entry', () => {
    addToHistory('2026-05-08', 'won', 'film')
    expect(loadHistory('film')['2026-05-08']).toBe('won')
  })

  it('does not overwrite existing entry', () => {
    addToHistory('2026-05-08', 'won', 'film')
    addToHistory('2026-05-08', 'lost', 'film') // should be ignored
    expect(loadHistory('film')['2026-05-08']).toBe('won')
  })

  it('is scoped by type', () => {
    addToHistory('2026-05-08', 'won', 'film')
    addToHistory('2026-05-08', 'lost', 'series')
    expect(loadHistory('film')['2026-05-08']).toBe('won')
    expect(loadHistory('series')['2026-05-08']).toBe('lost')
  })

  it('accumulates multiple dates', () => {
    addToHistory('2026-05-06', 'won', 'film')
    addToHistory('2026-05-07', 'lost', 'film')
    addToHistory('2026-05-08', 'won', 'film')
    const history = loadHistory('film')
    expect(Object.keys(history)).toHaveLength(3)
    expect(history['2026-05-07']).toBe('lost')
  })
})

// ─── Stats ────────────────────────────────────────────────────────────────────

describe('loadStats', () => {
  it('returns defaultStats when nothing stored', () => {
    expect(loadStats('film')).toEqual(defaultStats())
  })

  it('returns stored stats', () => {
    const stats: GameStats = { ...defaultStats(), gamesPlayed: 5, gamesWon: 3, currentStreak: 2, maxStreak: 4 }
    localStorage.setItem('cineguess:stats:film', JSON.stringify(stats))
    expect(loadStats('film')).toEqual(stats)
  })

  it('returns defaultStats on invalid JSON', () => {
    localStorage.setItem('cineguess:stats:film', '{{invalid')
    expect(loadStats('film')).toEqual(defaultStats())
  })

  it('is scoped by type', () => {
    const stats: GameStats = { ...defaultStats(), gamesPlayed: 10 }
    saveStats(stats, 'series')
    expect(loadStats('film')).toEqual(defaultStats())
    expect(loadStats('series').gamesPlayed).toBe(10)
  })
})

describe('saveStats / loadStats roundtrip', () => {
  it('persists and retrieves stats intact', () => {
    const stats: GameStats = {
      gamesPlayed: 42,
      gamesWon: 30,
      currentStreak: 7,
      maxStreak: 12,
      guessDistribution: { 1: 5, 2: 10, 3: 8, 4: 4, 5: 3 },
      lastPlayedDate: '2026-05-08',
      lastWonDate: '2026-05-08',
    }
    saveStats(stats, 'film')
    expect(loadStats('film')).toEqual(stats)
  })

  it('wiki type is scoped separately', () => {
    const stats: GameStats = { ...defaultStats(), gamesPlayed: 7 }
    saveStats(stats, 'wiki')
    expect(loadStats('film')).toEqual(defaultStats())
    expect(loadStats('wiki').gamesPlayed).toBe(7)
  })
})

// ─── GameState ────────────────────────────────────────────────────────────────

const mockState: PersistedGameState = {
  challengeId: '2026-05-08',
  guesses: [{ value: 'Avatar', status: 'wrong', timestamp: 1000 }],
  hintsUnlocked: 1,
  status: 'playing',
  blurIndex: 1,
}

describe('loadGameState', () => {
  it('returns null when nothing stored', () => {
    expect(loadGameState('film')).toBeNull()
  })

  it('returns stored game state', () => {
    saveGameState(mockState, 'film')
    expect(loadGameState('film')).toEqual(mockState)
  })

  it('returns null on invalid JSON', () => {
    localStorage.setItem('cineguess:game:film', '{{bad')
    expect(loadGameState('film')).toBeNull()
  })
})

describe('saveGameState / loadGameState roundtrip', () => {
  it('persists guesses and status intact', () => {
    saveGameState(mockState, 'film')
    const loaded = loadGameState('film')
    expect(loaded?.guesses).toHaveLength(1)
    expect(loaded?.guesses[0].value).toBe('Avatar')
    expect(loaded?.status).toBe('playing')
  })

  it('is scoped by type', () => {
    saveGameState(mockState, 'series')
    expect(loadGameState('film')).toBeNull()
    expect(loadGameState('series')).toEqual(mockState)
  })
})

describe('clearGameState', () => {
  it('removes stored state', () => {
    saveGameState(mockState, 'film')
    clearGameState('film')
    expect(loadGameState('film')).toBeNull()
  })

  it('only clears the specified type', () => {
    saveGameState(mockState, 'film')
    saveGameState(mockState, 'series')
    clearGameState('film')
    expect(loadGameState('film')).toBeNull()
    expect(loadGameState('series')).toEqual(mockState)
  })

  it('is idempotent — clearing non-existent state does not throw', () => {
    expect(() => clearGameState('wiki')).not.toThrow()
  })
})

// ─── Wiki game state scoping ──────────────────────────────────────────────────

describe('wiki game state scoping', () => {
  it('saveGameState / loadGameState scoped to wiki type', () => {
    const wikiState: PersistedGameState = { ...mockState, challengeId: 'wiki-2026-05-08' }
    saveGameState(wikiState, 'wiki')
    expect(loadGameState('wiki')).toEqual(wikiState)
    expect(loadGameState('film')).toBeNull()
  })
})

// ─── History: wiki type ───────────────────────────────────────────────────────

describe('addToHistory / loadHistory — wiki type', () => {
  it('stores and retrieves wiki history separately', () => {
    addToHistory('2026-05-08', 'won', 'wiki')
    expect(loadHistory('wiki')['2026-05-08']).toBe('won')
    expect(loadHistory('film')).toEqual({})
  })
})
