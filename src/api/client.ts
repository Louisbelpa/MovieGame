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
    const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
    const err = new Error(body.message ?? body.error ?? `HTTP ${res.status}`)
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
  mediaType?: 'film' | 'series'
  imageUrl: string                  // always present; frontend applies CSS blur
  isGameOver: boolean
  hintsAvailable: number
  hintsRevealed: number
  hints: HintPayload[]
  attemptsUsed: number
  maxAttempts: number
  attempts: AttemptPayload[]
  outcome: 'won' | 'lost' | null
  hasPrevChallenge?: boolean
  hasNextChallenge?: boolean
  /** Réponse admin — aperçu sans partie réelle */
  isPreview?: boolean
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
  mediaType?: 'film' | 'series'
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
export function fetchChallenge(type: 'film' | 'series' = 'film'): Promise<ChallengePayload> {
  return request<ChallengePayload>(`/api/challenge/today?type=${type}`)
}

/** GET /api/challenge/date/:date – a specific past challenge */
export function fetchChallengeByDate(date: string, type: 'film' | 'series' = 'film'): Promise<ChallengePayload> {
  return request<ChallengePayload>(`/api/challenge/date/${date}?type=${type}`)
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
 * GET /api/challenge/dates?days=N
 * Returns ISO dates of the last N challenges (default 365)
 */
export function fetchChallengeDates(days = 365, type: 'film' | 'series' = 'film'): Promise<{ dates: string[] }> {
  return request<{ dates: string[] }>(`/api/challenge/dates?days=${days}&type=${type}`)
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
  return request<{ results: SearchResultPayload[] }>(`/api/films/search?${params}`)
    .then(r => r.results)
}

/**
 * GET /api/series/search?q=<query>
 * Autocomplete for series – excludes today's answer server-side
 */
export function searchSeries(
  query: string,
  limit = 8
): Promise<SearchResultPayload[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  return request<{ results: SearchResultPayload[] }>(`/api/series/search?${params}`)
    .then(r => r.results)
}

/** GET /api/stats — cumul global (tous les défis) */
export function fetchGlobalStats(): Promise<GlobalStatsPayload> {
  return request<GlobalStatsPayload>('/api/stats')
}

/** GET /api/stats/challenge?challengeId= — stats communautaires pour ce défi (jour + type) */
export function fetchChallengeCommunityStats(challengeId: number): Promise<GlobalStatsPayload> {
  const params = new URLSearchParams({ challengeId: String(challengeId) })
  return request<GlobalStatsPayload>(`/api/stats/challenge?${params}`)
}

/** GET /api/challenge/adjacent – nearest scheduled challenge before or after a date */
export function fetchAdjacentDate(date: string, direction: 'prev' | 'next', type: 'film' | 'series' = 'film'): Promise<{ date: string }> {
  return request<{ date: string }>(`/api/challenge/adjacent?date=${date}&direction=${direction}&type=${type}`)
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export interface UserPayload {
  id: number
  email: string | null
  displayName: string
  avatarUrl: string | null
  emailVerified: boolean
}

export interface AuthSessionPayload {
  user: UserPayload
  sessionToken: string
}

export function authRegister(email: string, password: string, displayName: string): Promise<AuthSessionPayload> {
  return request<AuthSessionPayload>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  })
}

export function authLogin(email: string, password: string): Promise<AuthSessionPayload> {
  return request<AuthSessionPayload>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function authLogout(): Promise<void> {
  return request<void>('/api/auth/logout', { method: 'POST' })
}

export function authGetMe(): Promise<{ user: UserPayload }> {
  return request<{ user: UserPayload }>('/api/auth/me')
}

export function authUpdateProfile(data: { displayName?: string; avatarUrl?: string }): Promise<{ user: UserPayload }> {
  return request<{ user: UserPayload }>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function authUploadAvatar(file: File): Promise<{ user: UserPayload }> {
  const form = new FormData()
  form.append('avatar', file)
  const res = await fetch(`${BASE_URL}/api/auth/avatar`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
    throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<{ user: UserPayload }>
}

export interface ImportStatsData {
  gamesPlayed: number
  wins: number
  currentStreak: number
  maxStreak: number
  distribution: Record<string, number>
}

export interface ServerStatsData {
  gamesPlayed: number
  wins: number
  currentStreak: number
  maxStreak: number
  distribution: Record<string, number>
}

export function authGetStats(type: 'film' | 'series' | 'wiki'): Promise<ServerStatsData> {
  return request<ServerStatsData>(`/api/auth/stats?type=${type}`)
}

export function authGetHistory(type: 'film' | 'series' | 'wiki'): Promise<{ history: Record<string, 'won' | 'lost'> }> {
  return request<{ history: Record<string, 'won' | 'lost'> }>(`/api/auth/history?type=${type}`)
}

export function authImportHistory(type: 'film' | 'series' | 'wiki', history: Record<string, 'won' | 'lost'>): Promise<{ imported: number }> {
  return request<{ imported: number }>('/api/auth/import-history', {
    method: 'POST',
    body: JSON.stringify({ type, history }),
  })
}

export function authImportStats(type: 'film' | 'series' | 'wiki', stats: ImportStatsData): Promise<void> {
  return request<void>('/api/auth/import-stats', {
    method: 'POST',
    body: JSON.stringify({ type, stats }),
  })
}

export function authChallengeResult(challengeId: number, won: boolean, attemptsUsed: number): Promise<void> {
  return request<void>('/api/auth/challenge-result', {
    method: 'POST',
    body: JSON.stringify({ challengeId, won, attemptsUsed }),
  })
}

export function authForgotPassword(email: string): Promise<void> {
  return request<void>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function authResetPassword(token: string, password: string): Promise<void> {
  return request<void>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export function authDeleteAccount(): Promise<void> {
  return request<void>('/api/auth/account', { method: 'DELETE' })
}

export function authChangePassword(currentPassword: string, newPassword: string): Promise<void> {
  return request<void>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export function authAppleSignIn(identityToken: string, displayName?: string): Promise<AuthSessionPayload> {
  return request<AuthSessionPayload>('/api/auth/apple', {
    method: 'POST',
    body: JSON.stringify({ identityToken, displayName }),
  })
}

export function authOAuthCallback(data: {
  provider: string
  providerId: string
  email: string
  displayName: string
  avatarUrl?: string
}): Promise<AuthSessionPayload> {
  return request<AuthSessionPayload>('/api/auth/oauth/callback', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ─── Friends ──────────────────────────────────────────────────────────────────

export interface FriendScore {
  attemptsUsed: number
  won: boolean
  completedAt: string
}

export interface FriendEntry {
  id: number
  displayName: string
  avatarUrl: string | null
  streak: number
  isMe: boolean
  scores: {
    film: FriendScore | null
    series: FriendScore | null
    wiki: FriendScore | null
  }
}

export interface PendingEntry {
  id: number
  displayName: string
  direction: 'incoming' | 'outgoing'
}

export interface FriendsResponse {
  date: string
  today: string
  myCode: string | null
  friends: FriendEntry[]
  pending: PendingEntry[]
}

export function friendsGetAll(date?: string): Promise<FriendsResponse> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : ''
  return request<FriendsResponse>(`/api/friends${qs}`)
}

export function friendsAdd(code: string): Promise<{ ok: boolean }> {
  return request('/api/friends/add', { method: 'POST', body: JSON.stringify({ code }) })
}

export function friendsAccept(userId: number): Promise<{ ok: boolean }> {
  return request('/api/friends/accept', { method: 'POST', body: JSON.stringify({ userId }) })
}

export function friendsRemove(userId: number): Promise<{ ok: boolean }> {
  return request(`/api/friends/${userId}`, { method: 'DELETE' })
}

export interface LeaderboardEntry {
  id: number
  displayName: string
  avatarUrl: string | null
  isMe: boolean
  rank: number
  totalWins: number
  totalPlayed: number
  winRate: number
  filmWins: number
  seriesWins: number
  wikiWins: number
  filmPlayed: number
  seriesPlayed: number
  wikiPlayed: number
  avgAttempts: number | null
  currentStreak: number
  maxStreak: number
}

export function friendsGetLeaderboard(): Promise<{ leaderboard: LeaderboardEntry[] }> {
  return request('/api/friends/leaderboard')
}
