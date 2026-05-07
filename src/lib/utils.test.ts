import { describe, it, expect } from 'vitest'
import {
  normaliseTitle,
  isCorrectGuess,
  buildShareGrid,
  buildShareText,
  defaultStats,
  updateStats,
} from './utils'
import type { GuessEntry, GameStats } from '@/types'

// ─── normaliseTitle ───────────────────────────────────────────────────────────

describe('normaliseTitle', () => {
  it('lowercases', () => expect(normaliseTitle('TITANIC')).toBe('titanic'))
  it('strips accents', () => expect(normaliseTitle('Intouchables')).toBe('intouchables'))
  it('strips é', () => expect(normaliseTitle('Été')).toBe('ete'))
  it('strips apostrophe (no space added)', () => expect(normaliseTitle("L'Amour")).toBe('lamour'))
  it('collapses whitespace', () => expect(normaliseTitle('Le  Roi  Lion')).toBe('le roi lion'))
  it('trims', () => expect(normaliseTitle('  Titanic  ')).toBe('titanic'))
  it('strips numbers? — keeps them', () => expect(normaliseTitle('2001')).toBe('2001'))
})

// ─── isCorrectGuess ───────────────────────────────────────────────────────────

describe('isCorrectGuess', () => {
  it('exact match', () => expect(isCorrectGuess('Titanic', 'Titanic')).toBe(true))
  it('case insensitive', () => expect(isCorrectGuess('TITANIC', 'titanic')).toBe(true))
  it('accent insensitive', () => expect(isCorrectGuess('Intouchables', 'Intouchables')).toBe(true))
  it('wrong answer → false', () => expect(isCorrectGuess('Avatar', 'Titanic')).toBe(false))
  it('empty guess → false', () => expect(isCorrectGuess('', 'Titanic')).toBe(false))
  it('normalises both sides', () => expect(isCorrectGuess('Été', 'Ete')).toBe(true))
})

// ─── buildShareGrid ───────────────────────────────────────────────────────────

describe('buildShareGrid', () => {
  it('correct guess → 🎬', () => {
    const guesses: GuessEntry[] = [{ value: 'Titanic', status: 'correct', timestamp: 0 }]
    expect(buildShareGrid(guesses)).toBe('🎬')
  })

  it('skipped guess → ⏭️', () => {
    const guesses: GuessEntry[] = [{ value: '', status: 'skipped', timestamp: 0 }]
    expect(buildShareGrid(guesses)).toBe('⏭️')
  })

  it('wrong guess → ❌', () => {
    const guesses: GuessEntry[] = [{ value: 'Avatar', status: 'wrong', timestamp: 0 }]
    expect(buildShareGrid(guesses)).toBe('❌')
  })

  it('mixed guesses', () => {
    const guesses: GuessEntry[] = [
      { value: 'Avatar', status: 'wrong', timestamp: 0 },
      { value: '', status: 'skipped', timestamp: 0 },
      { value: 'Titanic', status: 'correct', timestamp: 0 },
    ]
    expect(buildShareGrid(guesses)).toBe('❌ ⏭️ 🎬')
  })

  it('empty → empty string', () => expect(buildShareGrid([])).toBe(''))
})

// ─── buildShareText ───────────────────────────────────────────────────────────

describe('buildShareText', () => {
  const guesses: GuessEntry[] = [
    { value: 'Avatar', status: 'wrong', timestamp: 0 },
    { value: 'Titanic', status: 'correct', timestamp: 0 },
  ]

  it('includes score when won', () => {
    const text = buildShareText('2026-05-08', guesses, true, 5)
    expect(text).toContain('2/5')
  })

  it('includes X/max when lost', () => {
    const text = buildShareText('2026-05-08', guesses, false, 5)
    expect(text).toContain('X/5')
  })

  it('includes emoji grid', () => {
    const text = buildShareText('2026-05-08', guesses, true, 5)
    expect(text).toContain('❌')
    expect(text).toContain('🎬')
  })

  it('includes challenge number when provided', () => {
    const text = buildShareText('2026-05-08', guesses, true, 5, 42)
    expect(text).toContain('#42')
  })

  it('includes site URL', () => {
    const text = buildShareText('2026-05-08', guesses, true, 5)
    expect(text).toMatch(/https?:\/\//)
  })
})

// ─── defaultStats ─────────────────────────────────────────────────────────────

describe('defaultStats', () => {
  it('returns zeroed stats', () => {
    const s = defaultStats()
    expect(s.gamesPlayed).toBe(0)
    expect(s.gamesWon).toBe(0)
    expect(s.currentStreak).toBe(0)
    expect(s.maxStreak).toBe(0)
  })

  it('guess distribution has keys 1-5', () => {
    const s = defaultStats()
    expect(Object.keys(s.guessDistribution).map(Number).sort()).toEqual([1, 2, 3, 4, 5])
    expect(Object.values(s.guessDistribution).every((v) => v === 0)).toBe(true)
  })
})

// ─── updateStats ──────────────────────────────────────────────────────────────

function makeGuesses(statuses: Array<'correct' | 'wrong' | 'skipped'>): Array<Pick<GuessEntry, 'status'>> {
  return statuses.map((status) => ({ status }))
}

describe('updateStats — win', () => {
  it('increments gamesPlayed and gamesWon', () => {
    const prev = defaultStats()
    const next = updateStats(prev, { status: 'won', guesses: makeGuesses(['wrong', 'correct']) }, '2026-05-08')
    expect(next.gamesPlayed).toBe(1)
    expect(next.gamesWon).toBe(1)
  })

  it('records attempt count in guessDistribution (skipped not counted)', () => {
    const prev = defaultStats()
    // 1 wrong + 1 correct = 2 non-skipped = attempt key 2
    const next = updateStats(prev, { status: 'won', guesses: makeGuesses(['wrong', 'correct']) }, '2026-05-08')
    expect(next.guessDistribution[2]).toBe(1)
  })

  it('starts streak at 1 on first win', () => {
    const prev = defaultStats()
    const next = updateStats(prev, { status: 'won', guesses: makeGuesses(['correct']) }, '2026-05-08')
    expect(next.currentStreak).toBe(1)
    expect(next.maxStreak).toBe(1)
  })

  it('increments streak on consecutive days', () => {
    const prev: GameStats = { ...defaultStats(), currentStreak: 3, maxStreak: 3, lastWonDate: '2026-05-07' }
    const next = updateStats(prev, { status: 'won', guesses: makeGuesses(['correct']) }, '2026-05-08')
    expect(next.currentStreak).toBe(4)
    expect(next.maxStreak).toBe(4)
  })

  it('resets streak when gap > 1 day', () => {
    const prev: GameStats = { ...defaultStats(), currentStreak: 5, maxStreak: 5, lastWonDate: '2026-05-05' }
    const next = updateStats(prev, { status: 'won', guesses: makeGuesses(['correct']) }, '2026-05-08')
    expect(next.currentStreak).toBe(1)
    expect(next.maxStreak).toBe(5) // maxStreak preserved
  })

  it('does not break streak when same day (replaying)', () => {
    const prev: GameStats = { ...defaultStats(), currentStreak: 2, maxStreak: 2, lastWonDate: '2026-05-08' }
    const next = updateStats(prev, { status: 'won', guesses: makeGuesses(['correct']) }, '2026-05-08')
    expect(next.currentStreak).toBe(3)
  })

  it('sets lastWonDate to challengeDate', () => {
    const prev = defaultStats()
    const next = updateStats(prev, { status: 'won', guesses: makeGuesses(['correct']) }, '2026-05-08')
    expect(next.lastWonDate).toBe('2026-05-08')
  })

  it('updates maxStreak correctly', () => {
    const prev: GameStats = { ...defaultStats(), currentStreak: 7, maxStreak: 10, lastWonDate: '2026-05-07' }
    const next = updateStats(prev, { status: 'won', guesses: makeGuesses(['correct']) }, '2026-05-08')
    expect(next.currentStreak).toBe(8)
    expect(next.maxStreak).toBe(10) // was already higher
  })
})

describe('updateStats — loss', () => {
  it('increments gamesPlayed, not gamesWon', () => {
    const prev = defaultStats()
    const next = updateStats(prev, { status: 'lost', guesses: makeGuesses(['wrong', 'wrong', 'wrong']) }, '2026-05-08')
    expect(next.gamesPlayed).toBe(1)
    expect(next.gamesWon).toBe(0)
  })

  it('resets currentStreak to 0', () => {
    const prev: GameStats = { ...defaultStats(), currentStreak: 4, maxStreak: 4 }
    const next = updateStats(prev, { status: 'lost', guesses: makeGuesses(['wrong']) }, '2026-05-08')
    expect(next.currentStreak).toBe(0)
  })

  it('preserves maxStreak on loss', () => {
    const prev: GameStats = { ...defaultStats(), currentStreak: 4, maxStreak: 4 }
    const next = updateStats(prev, { status: 'lost', guesses: makeGuesses(['wrong']) }, '2026-05-08')
    expect(next.maxStreak).toBe(4)
  })

  it('does not update guessDistribution on loss', () => {
    const prev = defaultStats()
    const next = updateStats(prev, { status: 'lost', guesses: makeGuesses(['wrong', 'wrong']) }, '2026-05-08')
    expect(Object.values(next.guessDistribution).every((v) => v === 0)).toBe(true)
  })

  it('does not update lastWonDate on loss', () => {
    const prev: GameStats = { ...defaultStats(), lastWonDate: '2026-05-07' }
    const next = updateStats(prev, { status: 'lost', guesses: makeGuesses(['wrong']) }, '2026-05-08')
    expect(next.lastWonDate).toBe('2026-05-07')
  })
})

describe('updateStats — accumulation', () => {
  it('accumulates wins across multiple calls', () => {
    let stats = defaultStats()
    stats = updateStats(stats, { status: 'won', guesses: makeGuesses(['correct']) }, '2026-05-06')
    stats = updateStats(stats, { status: 'won', guesses: makeGuesses(['wrong', 'correct']) }, '2026-05-07')
    stats = updateStats(stats, { status: 'won', guesses: makeGuesses(['wrong', 'wrong', 'correct']) }, '2026-05-08')
    expect(stats.gamesPlayed).toBe(3)
    expect(stats.gamesWon).toBe(3)
    expect(stats.currentStreak).toBe(3)
    expect(stats.guessDistribution[1]).toBe(1)
    expect(stats.guessDistribution[2]).toBe(1)
    expect(stats.guessDistribution[3]).toBe(1)
  })

  it('streak breaks correctly after loss then win', () => {
    let stats = defaultStats()
    stats = updateStats(stats, { status: 'won', guesses: makeGuesses(['correct']) }, '2026-05-06')
    stats = updateStats(stats, { status: 'lost', guesses: makeGuesses(['wrong']) }, '2026-05-07')
    stats = updateStats(stats, { status: 'won', guesses: makeGuesses(['correct']) }, '2026-05-08')
    expect(stats.currentStreak).toBe(1) // reset after loss
    expect(stats.maxStreak).toBe(1)
    expect(stats.gamesPlayed).toBe(3)
    expect(stats.gamesWon).toBe(2)
  })
})
