/**
 * admin/api.ts
 * Typed fetch helpers for all /api/admin/* routes.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminFilm {
  id: number
  title: string
  title_aliases: string[]
  year: number
  director: string
  genres: string[]
  cast_members: string[]
  tagline: string
  synopsis: string
  image_url: string
  tmdb_id: number | null
  is_active: boolean
  used_dates: string[]  // ISO dates this film has been scheduled
}

export interface AdminChallenge {
  id: number
  date: string
  film: AdminFilm
}

export interface AdminDashboard {
  today_challenge: AdminChallenge | null
  upcoming_challenges: AdminChallenge[]
  stats: {
    total_films: number
    total_challenges: number
    success_rate: number
  }
}

export interface FilmPayload {
  title: string
  title_aliases: string[]
  year: number
  director: string
  genres: string[]
  cast_members: string[]
  tagline: string
  synopsis: string
  image_url: string
  tmdb_id: number | null
  is_active: boolean
}

export interface TmdbSearchResult {
  tmdb_id: number
  title: string
  original_title: string
  year: number
  poster_url: string | null
}

// ─── HTTP client ──────────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  if (res.status === 401) {
    window.location.href = '/admin/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      (body as { error?: string; message?: string }).error ??
      (body as { message?: string }).message ??
      `HTTP ${res.status}`
    )
  }

  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function adminLogin(username: string | undefined, password: string): Promise<void> {
  await request<{ ok: boolean; requiresUsername: boolean }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify(username !== undefined ? { username, password } : { password }),
  })
}

/** Check whether the server requires a username in addition to a password. */
export async function checkAdminConfig(): Promise<{ requiresUsername: boolean }> {
  // POST with dummy password to trigger a 401 that tells us whether username is required
  // A simpler approach: try to hit a public-safe config endpoint, or just check login response
  // We use a dedicated endpoint: GET /api/admin/config (unauthenticated)
  try {
    const res = await fetch(`${BASE_URL}/api/admin/config`, { credentials: 'include' })
    if (res.ok) return res.json() as Promise<{ requiresUsername: boolean }>
  } catch {
    // ignore
  }
  return { requiresUsername: false }
}

export async function adminLogout(): Promise<void> {
  await request<void>('/api/admin/logout', { method: 'POST' })
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboard(): Promise<AdminDashboard> {
  return request<AdminDashboard>('/api/admin/dashboard')
}

// ─── Films ────────────────────────────────────────────────────────────────────

export async function getFilms(): Promise<AdminFilm[]> {
  const res = await request<{ data: AdminFilm[] }>('/api/admin/films')
  return res.data
}

export async function createFilm(payload: FilmPayload): Promise<AdminFilm> {
  return request<AdminFilm>('/api/admin/films', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateFilm(id: number, payload: Partial<FilmPayload>): Promise<AdminFilm> {
  return request<AdminFilm>(`/api/admin/films/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteFilm(id: number): Promise<void> {
  return request<void>(`/api/admin/films/${id}`, { method: 'DELETE' })
}

// ─── Calendar / Challenges ────────────────────────────────────────────────────

export async function getChallenges(days = 30): Promise<AdminChallenge[]> {
  const res = await request<{ data: AdminChallenge[] }>(`/api/admin/challenges?days=${days}`)
  return res.data
}

export async function scheduleChallenge(date: string, filmId: number): Promise<AdminChallenge> {
  return request<AdminChallenge>('/api/admin/challenges', {
    method: 'POST',
    body: JSON.stringify({ date, film_id: filmId }),
  })
}

export async function updateChallenge(id: number, filmId: number): Promise<AdminChallenge> {
  return request<AdminChallenge>(`/api/admin/challenges/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ film_id: filmId }),
  })
}

export async function deleteChallenge(id: number): Promise<void> {
  return request<void>(`/api/admin/challenges/${id}`, { method: 'DELETE' })
}

// ─── TMDB ─────────────────────────────────────────────────────────────────────

export interface TmdbBackdrop {
  path: string
  url: string
  width: number
  height: number
  vote_average: number
}

export async function getFilmBackdrops(filmId: number): Promise<TmdbBackdrop[]> {
  const res = await request<{ backdrops: TmdbBackdrop[] }>(`/api/admin/films/${filmId}/backdrops`)
  return res.backdrops
}

export async function getBackdropsByTmdbId(tmdbId: number): Promise<TmdbBackdrop[]> {
  const res = await request<{ backdrops: TmdbBackdrop[] }>(`/api/admin/tmdb/${tmdbId}/backdrops`)
  return res.backdrops
}

export async function getRandomTmdbFilm(): Promise<FilmPayload> {
  return request<FilmPayload>('/api/admin/tmdb/random')
}

/** Search TMDB by movie title – returns lightweight suggestions */
export async function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
  if (!query.trim()) return []
  const res = await request<{ results: TmdbSearchResult[] }>(
    `/api/admin/tmdb/search?q=${encodeURIComponent(query)}`
  )
  return res.results
}

/** Fetch full film details from TMDB by tmdb_id */
export async function getTmdbFilmDetails(tmdbId: number): Promise<FilmPayload> {
  return request<FilmPayload>(`/api/admin/tmdb/${tmdbId}/details`)
}

export async function uploadFilmImage(filmId: number, file: File): Promise<{ url: string; film: AdminFilm }> {
  const form = new FormData()
  form.append('image', file)

  const res = await fetch(`${BASE_URL}/api/admin/films/${filmId}/image`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })

  if (res.status === 401) {
    window.location.href = '/admin/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<{ url: string; film: AdminFilm }>
}
