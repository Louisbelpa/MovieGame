import { request, BASE_URL } from './client'
import type { ChallengePayload } from './client'
import type { AdminSeries, SeriesPayload, TmdbTvSearchResult, TmdbBackdrop } from './types'

export async function getSeries(opts: { page?: number; limit?: number; q?: string; isActive?: boolean } = {}): Promise<{
  data: AdminSeries[]
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
  const res = await request<{ data: AdminSeries[]; pagination: { total: number; page: number; limit: number; pages: number } }>(
    `/api/admin/series${qs ? `?${qs}` : ''}`
  )
  return {
    data: res.data,
    total: res.pagination.total,
    page: res.pagination.page,
    limit: res.pagination.limit,
    pages: res.pagination.pages,
  }
}

export async function createSeries(payload: SeriesPayload): Promise<AdminSeries> {
  return request<AdminSeries>('/api/admin/series', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateSeries(id: number, payload: Partial<SeriesPayload>): Promise<AdminSeries> {
  return request<AdminSeries>(`/api/admin/series/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteSeries(id: number): Promise<void> {
  return request<void>(`/api/admin/series/${id}`, { method: 'DELETE' })
}

export async function uploadSeriesImage(seriesId: number, file: File): Promise<{ url: string; series: AdminSeries }> {
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${BASE_URL}/api/admin/series/${seriesId}/image`, {
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
  return res.json() as Promise<{ url: string; series: AdminSeries }>
}

export async function getSeriesBackdrops(seriesId: number): Promise<TmdbBackdrop[]> {
  const res = await request<{ backdrops: TmdbBackdrop[] }>(`/api/admin/series/${seriesId}/backdrops`)
  return res.backdrops
}

export async function getSeriesBackdropsByTmdbId(tmdbId: number): Promise<TmdbBackdrop[]> {
  const res = await request<{ backdrops: TmdbBackdrop[] }>(`/api/admin/tmdb/tv/${tmdbId}/backdrops`)
  return res.backdrops
}

export async function getRandomTmdbSeries(): Promise<SeriesPayload> {
  return request<SeriesPayload>('/api/admin/tmdb/tv/random')
}

export async function searchTmdbTv(query: string): Promise<TmdbTvSearchResult[]> {
  if (!query.trim()) return []
  const res = await request<{ results: TmdbTvSearchResult[] }>(
    `/api/admin/tmdb/tv/search?q=${encodeURIComponent(query)}`
  )
  return res.results
}

export async function getTmdbTvDetails(tmdbId: number): Promise<SeriesPayload> {
  return request<SeriesPayload>(`/api/admin/tmdb/tv/${tmdbId}/details`)
}

export async function fetchSeriesGamePreview(seriesId: number): Promise<ChallengePayload> {
  return request<ChallengePayload>(`/api/admin/series/${seriesId}/game-preview`)
}
