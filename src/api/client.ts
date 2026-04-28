/**
 * api/client.ts
 * Typed HTTP client for the MovieGame backend.
 * All requests include credentials (cookie-based session).
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

// ─── Generic fetch wrapper ────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(
      (body as { message?: string }).message ?? `HTTP ${res.status}`
    )
    ;(err as Error & { status: number }).status = res.status
    throw err
  }

  return res.json() as Promise<T>
}

// ─── API response types (aligned with challenge.service.ts) ──────────────────

export interface HintPayload {
  type: string
  value: string | number | string[]
}

export interface AttemptPayload {
  guess: string
  correct: boolean
}

export interface ChallengePayload {
  challengeId: number
  challengeNumber: number
  date: string
  isPastChallenge: boolean
  imageUrl: string                  // always present; frontend applies CSS blur
  isGameOver: boolean
  hintsAvailable: number
  hintsRevealed: number
  hints: HintPayload[]
  attemptsUsed: number
  maxAttempts: number
  attempts: AttemptPayload[]
  outcome: 'won' | 'lost' | null
}

export interface GuessResultPayload {
  correct: boolean
  outcome: 'won' | 'lost' | null
  attemptsLeft: number
  nextHintUnlocked: boolean
  challenge: ChallengePayload
}

export interface ResultPayload {
  outcome: 'won' | 'lost'
  title: string
  year: number
  director: string
  genres: string[]
  cast: string[]
  tagline: string | null
  synopsis: string | null
  imageUrl: string
  tmdbId: number | null
  attemptsUsed: number
  maxAttempts: number
  attempts: AttemptPayload[]
  startedAt: string
  finishedAt: string
}

export interface SearchResultPayload {
  title: string
  year: number
}

export interface GlobalStatsPayload {
  totalGames: number
  totalWins: number
  totalLosses: number
  winRate: number
  winsByAttempt: Record<string, number>
  lastUpdated: string
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/** GET /api/challenge/today – today's challenge + current session state */
export function fetchChallenge(): Promise<ChallengePayload> {
  return request<ChallengePayload>('/api/challenge/today')
}

/** GET /api/challenge/date/:date – a specific past challenge */
export function fetchChallengeByDate(date: string): Promise<ChallengePayload> {
  return request<ChallengePayload>(`/api/challenge/date/${date}`)
}

/**
 * POST /api/challenge/guess
 * Body: { guess: string, challengeId?: number }
 */
export function postGuess(
  challengeId: number,
  guess: string
): Promise<GuessResultPayload> {
  return request<GuessResultPayload>(
    '/api/challenge/guess',
    { method: 'POST', body: JSON.stringify({ guess, challengeId }) }
  )
}

/**
 * GET /api/challenge/result?challengeId=N
 * Only succeeds when outcome !== null
 */
export function fetchResult(challengeId: number): Promise<ResultPayload> {
  return request<ResultPayload>(`/api/challenge/result?challengeId=${challengeId}`)
}

/**
 * GET /api/films/search?q=<query>
 * Autocomplete – excludes today's answer server-side
 */
export function searchMovies(
  query: string,
  limit = 8
): Promise<SearchResultPayload[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  return request<SearchResultPayload[]>(`/api/films/search?${params}`)
}

/** GET /api/stats */
export function fetchGlobalStats(): Promise<GlobalStatsPayload> {
  return request<GlobalStatsPayload>('/api/stats')
}
