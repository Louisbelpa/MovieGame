/**
 * api/wikiClient.ts
 * Typed HTTP client for the Wikipedia guessing game endpoints.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error((body as { message?: string }).message ?? `HTTP ${res.status}`)
    ;(err as Error & { status: number }).status = res.status
    throw err
  }
  return res.json() as Promise<T>
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface WikiHintPayload {
  type: string
  value: unknown
}

export interface WikiAttemptPayload {
  guess: string
  correct: boolean
}

export interface WikiChallengePayload {
  challengeId: number
  challengeNumber: number
  date: string
  isPastChallenge: boolean
  mediaType: 'wiki'
  personType: 'politician' | 'sportsperson'
  isGameOver: boolean
  hintsAvailable: number
  hintsRevealed: number
  hints: WikiHintPayload[]
  attemptsUsed: number
  maxAttempts: number
  attempts: WikiAttemptPayload[]
  outcome: 'won' | 'lost' | null
}

export interface WikiGuessResultPayload {
  correct: boolean
  outcome: 'won' | 'lost' | null
  attemptsLeft: number
  nextHintUnlocked: boolean
  challenge: WikiChallengePayload
}

export interface WikiResultPayload {
  outcome: 'won' | 'lost'
  mediaType: 'wiki'
  name: string
  personType: 'politician' | 'sportsperson'
  extract: string | null
  photoUrl: string | null
  wikipediaUrl: string | null
  attemptsUsed: number
  maxAttempts: number
  attempts: WikiAttemptPayload[]
  startedAt: string
  finishedAt: string
}

export interface WikiPersonSuggestion {
  title: string
  year: string
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export function fetchWikiChallenge(): Promise<WikiChallengePayload> {
  return request<WikiChallengePayload>('/api/wiki/today')
}

export function fetchWikiChallengeByDate(date: string): Promise<WikiChallengePayload> {
  return request<WikiChallengePayload>(`/api/wiki/date/${date}`)
}

export function postWikiGuess(challengeId: number, guess: string): Promise<WikiGuessResultPayload> {
  return request<WikiGuessResultPayload>('/api/wiki/guess', {
    method: 'POST',
    body: JSON.stringify({ guess, challengeId }),
  })
}

export function fetchWikiResult(challengeId: number): Promise<WikiResultPayload> {
  return request<WikiResultPayload>(`/api/wiki/result?challengeId=${challengeId}`)
}

export function fetchWikiChallengeDates(days = 365): Promise<{ dates: string[] }> {
  return request<{ dates: string[] }>(`/api/wiki/dates?days=${days}`)
}

export function fetchWikiAdjacentDate(date: string, direction: 'prev' | 'next'): Promise<{ date: string }> {
  return request<{ date: string }>(`/api/wiki/adjacent?date=${date}&direction=${direction}`)
}

export function searchWikiPersons(query: string, limit = 8): Promise<WikiPersonSuggestion[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  return request<{ results: WikiPersonSuggestion[] }>(`/api/wiki/search?${params}`)
    .then(r => r.results)
}
