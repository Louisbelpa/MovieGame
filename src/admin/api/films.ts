import { request, BASE_URL } from './client'
import type { ChallengePayload } from './client'
import type { AdminFilm, FilmPayload, TmdbSearchResult, TmdbBackdrop, CsvImportResult, FilmSeriesGamePreviewDraftBody } from './types'

export async function getFilms(opts: { page?: number; limit?: number; q?: string; isActive?: boolean } = {}): Promise<{
  data: AdminFilm[]
  total: number
  page: number
  limit: number
  pages: number
}> {
  const params = new URLSearchParams()
  if (opts.page !== undefined) params.set('page', String(opts.page))
  if (opts.limit !== undefined) params.set('limit', String(opts.limit))
  if (opts.q !== undefined && opts.q !== '') params.set('q', opts.q)
  if (opts.isActive !== undefined) params.set('is_active', String(opts.isActive))
  const qs = params.toString()
  const res = await request<{ data: AdminFilm[]; pagination: { total: number; page: number; limit: number; pages: number } }>(
    `/api/admin/films${qs ? `?${qs}` : ''}`
  )
  return {
    data: res.data,
    total: res.pagination.total,
    page: res.pagination.page,
    limit: res.pagination.limit,
    pages: res.pagination.pages,
  }
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

export async function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
  if (!query.trim()) return []
  const res = await request<{ results: TmdbSearchResult[] }>(
    `/api/admin/tmdb/search?q=${encodeURIComponent(query)}`
  )
  return res.results
}

export async function getTmdbFilmDetails(tmdbId: number): Promise<FilmPayload> {
  return request<FilmPayload>(`/api/admin/tmdb/${tmdbId}/details`)
}

export async function importCsvFilms(rows: Record<string, string>[]): Promise<CsvImportResult> {
  return request<CsvImportResult>('/api/admin/films/import-csv', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  })
}

export async function fetchFilmGamePreview(filmId: number): Promise<ChallengePayload> {
  return request<ChallengePayload>(`/api/admin/films/${filmId}/game-preview`)
}

export async function postFilmSeriesGamePreviewDraft(
  body: FilmSeriesGamePreviewDraftBody
): Promise<ChallengePayload> {
  return request<ChallengePayload>('/api/admin/game-preview-draft', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
