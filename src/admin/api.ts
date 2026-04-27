/**
 * admin/api.ts
 * Typed fetch helpers for all /api/admin/* routes.
 * All requests include credentials (cookie-based session).
 * 401 responses redirect to /admin/login.
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
}

export interface AdminChallenge {
  id: number
  date: string // ISO date "YYYY-MM-DD"
  film: AdminFilm
}

export interface AdminDashboard {
  today_challenge: AdminChallenge | null
  upcoming_challenges: AdminChallenge[]
  stats: {
    total_films: number
    total_challenges: number
    success_rate: number // 0-100
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
      (body as { message?: string }).message ?? `HTTP ${res.status}`
    )
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T

  return res.json() as Promise<T>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function adminLogin(password: string): Promise<void> {
  await request<void>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
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

export async function updateFilm(
  id: number,
  payload: Partial<FilmPayload>
): Promise<AdminFilm> {
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

export async function scheduleChallenge(
  date: string,
  filmId: number
): Promise<AdminChallenge> {
  return request<AdminChallenge>('/api/admin/challenges', {
    method: 'POST',
    body: JSON.stringify({ date, film_id: filmId }),
  })
}

export async function updateChallenge(
  id: number,
  filmId: number
): Promise<AdminChallenge> {
  return request<AdminChallenge>(`/api/admin/challenges/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ film_id: filmId }),
  })
}

export async function deleteChallenge(id: number): Promise<void> {
  return request<void>(`/api/admin/challenges/${id}`, { method: 'DELETE' })
}

// ─── TMDB Backdrops ───────────────────────────────────────────────────────────

export interface TmdbBackdrop {
  path: string
  url: string
  width: number
  height: number
  vote_average: number
}

export async function getFilmBackdrops(filmId: number): Promise<TmdbBackdrop[]> {
  const res = await request<{ backdrops: TmdbBackdrop[] }>(
    `/api/admin/films/${filmId}/backdrops`
  )
  return res.backdrops
}

export async function getRandomTmdbFilm(): Promise<FilmPayload> {
  return request<FilmPayload>('/api/admin/tmdb/random')
}

export async function uploadFilmImage(
  filmId: number,
  file: File
): Promise<{ url: string; film: AdminFilm }> {
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
