import { request } from './client'
import type { AdminChallenge, MediaRef } from './types'

export async function getChallenges(opts: { from?: string; to?: string; mediaType?: 'film' | 'series' | 'wiki' } = {}): Promise<AdminChallenge[]> {
  const params = new URLSearchParams()
  if (opts.from) params.set('from', opts.from)
  if (opts.to) params.set('to', opts.to)
  if (opts.mediaType) params.set('mediaType', opts.mediaType)
  const qs = params.toString()
  const res = await request<{ data: AdminChallenge[] }>(`/api/admin/challenges${qs ? `?${qs}` : ''}`)
  return res.data
}

export async function scheduleChallenge(date: string, ref: MediaRef): Promise<AdminChallenge> {
  const body =
    'filmId' in ref && ref.filmId !== undefined
      ? { date, film_id: ref.filmId }
      : 'seriesId' in ref && ref.seriesId !== undefined
        ? { date, series_id: ref.seriesId }
        : { date, wiki_person_id: (ref as { wikiPersonId: number }).wikiPersonId }
  return request<AdminChallenge>('/api/admin/challenges', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateChallenge(id: number, ref: MediaRef): Promise<AdminChallenge> {
  const body =
    'filmId' in ref && ref.filmId !== undefined
      ? { film_id: ref.filmId }
      : 'seriesId' in ref && ref.seriesId !== undefined
        ? { series_id: ref.seriesId }
        : { wiki_person_id: (ref as { wikiPersonId: number }).wikiPersonId }
  return request<AdminChallenge>(`/api/admin/challenges/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteChallenge(id: number): Promise<void> {
  return request<void>(`/api/admin/challenges/${id}`, { method: 'DELETE' })
}

export async function rescheduleChallenge(id: number, date: string): Promise<AdminChallenge> {
  return request<AdminChallenge>(`/api/admin/challenges/${id}/reschedule`, {
    method: 'POST',
    body: JSON.stringify({ date }),
  })
}
