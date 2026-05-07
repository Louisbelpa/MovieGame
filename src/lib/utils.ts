import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { GameStats, GuessEntry, PersistedGameState } from '@/types'
import { BRAND_NAME, PUBLIC_SITE_URL } from '@/config/features'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns today's date as YYYY-MM-DD (UTC) */
export function getTodayId(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Normalise a movie title for comparison (lowercase, no accents, no punctuation) */
export function normaliseTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Check whether a guess matches the answer */
export function isCorrectGuess(guess: string, answer: string): boolean {
  return normaliseTitle(guess) === normaliseTitle(answer)
}

/** Build an emoji grid for sharing (Wordle-style) */
export function buildShareGrid(guesses: GuessEntry[]): string {
  return guesses
    .map((g) => {
      if (g.status === 'correct') return '🎬'
      if (g.status === 'skipped') return '⏭️'
      return '❌'
    })
    .join(' ')
}

/** Format a share text */
export function buildShareText(
  challengeId: string,
  guesses: GuessEntry[],
  won: boolean,
  maxAttempts?: number,
  challengeNumber?: number
): string {
  const grid = buildShareGrid(guesses)
  const max = maxAttempts ?? guesses.length
  const score = won ? `${guesses.length}/${max}` : `X/${max}`
  const url = PUBLIC_SITE_URL
  const dateFr = new Date(challengeId + 'T12:00:00Z').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
  const header = challengeNumber ? `${BRAND_NAME} #${challengeNumber} – ${dateFr}` : `${BRAND_NAME} – ${dateFr}`
  return `${header}\n${score} ${grid}\n\n${url}`
}

/** Default empty stats */
export function defaultStats(): GameStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  }
}

/** Update stats after a completed game */
export function updateStats(
  prev: GameStats,
  state: PersistedGameState,
  todayId: string
): GameStats {
  const won = state.status === 'won'
  const attemptCount = state.guesses.filter(
    (g) => g.status !== 'skipped'
  ).length as 1 | 2 | 3 | 4 | 5 | 6

  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterdayId = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(yesterdayDate)

  const isStreak =
    prev.lastWonDate === yesterdayId || prev.lastWonDate === todayId

  const newStreak = won ? (isStreak ? prev.currentStreak + 1 : 1) : 0

  return {
    gamesPlayed: prev.gamesPlayed + 1,
    gamesWon: prev.gamesWon + (won ? 1 : 0),
    currentStreak: newStreak,
    maxStreak: Math.max(prev.maxStreak, newStreak),
    guessDistribution: won
      ? { ...prev.guessDistribution, [attemptCount]: prev.guessDistribution[attemptCount] + 1 }
      : prev.guessDistribution,
    lastPlayedDate: todayId,
    lastWonDate: won ? todayId : prev.lastWonDate,
  }
}

/** Blur value (px) for each attempt index (0 = no guess yet, 5 = all used) */
export const BLUR_LEVELS = [28, 20, 14, 8, 3, 0]

/** Max number of attempts */
export const MAX_ATTEMPTS = 6
