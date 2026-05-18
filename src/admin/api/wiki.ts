import { request, BASE_URL } from './client'
import type { AdminWikiPerson, WikiPersonPayload, WikipediaFetchPayload, WikiPrefetchPoolHasWikiFilter, WikiPrefetchPoolResponse, WikiPersonDraftPreviewBody } from './types'
import type { WikiChallengePayload } from './client'

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string')
  } catch {
    return []
  }
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value !== 'string' || !value.trim()) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return {}
  } catch {
    return {}
  }
}

function parseUsedDates(value: unknown): string[] {
  if (Array.isArray(value)) return (value as unknown[]).map(String).filter(Boolean)
  if (typeof value !== 'string' || !value.trim()) return []
  return value.split(',').map((v) => v.trim()).filter(Boolean)
}

function mapWikiPerson(raw: Record<string, unknown>): AdminWikiPerson {
  const personTypeRaw = String(raw.person_type ?? 'generic')
  const validTypes = ['politician', 'sportsperson', 'artist', 'actor', 'scientist', 'entrepreneur', 'writer', 'historical_figure', 'generic']
  const person_type: AdminWikiPerson['person_type'] = validTypes.includes(personTypeRaw)
    ? personTypeRaw as AdminWikiPerson['person_type']
    : 'generic'
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ''),
    title: String(raw.title ?? raw.name ?? ''),
    name_aliases: parseJsonArray(raw.name_aliases ?? raw.title_aliases),
    person_type,
    wikipedia_slug: String(raw.wikipedia_slug ?? ''),
    infobox_data: parseJsonObject(raw.infobox_data),
    hint_schedule: parseJsonArray(raw.hint_schedule),
    image_url: raw.image_url ? String(raw.image_url) : (raw.photo_url ? String(raw.photo_url) : null),
    photo_url: raw.photo_url ? String(raw.photo_url) : null,
    extract: raw.extract ? String(raw.extract) : null,
    wikipedia_url: raw.wikipedia_url ? String(raw.wikipedia_url) : null,
    difficulty: Number(raw.difficulty ?? 3),
    is_active: Number(raw.is_active ?? 1) === 1,
    used_dates: parseUsedDates(raw.used_dates),
  }
}

export async function getWikiPersons(opts: { page?: number; limit?: number; q?: string } = {}): Promise<{
  data: AdminWikiPerson[]
  total: number
  page: number
  limit: number
}> {
  const params = new URLSearchParams()
  if (opts.page) params.set('page', String(opts.page))
  if (opts.limit) params.set('limit', String(opts.limit))
  if (opts.q) params.set('q', opts.q)
  const qs = params.toString()
  const res = await request<{ data: Record<string, unknown>[]; total: number; page: number; limit: number }>(
    `/api/admin/wiki-persons${qs ? `?${qs}` : ''}`
  )
  return {
    ...res,
    data: res.data.map(mapWikiPerson),
  }
}

export async function createWikiPerson(payload: WikiPersonPayload): Promise<{ id: number }> {
  return request<{ id: number }>('/api/admin/wiki-persons', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateWikiPerson(id: number, payload: Partial<WikiPersonPayload>): Promise<void> {
  await request<{ ok: boolean }>(`/api/admin/wiki-persons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteWikiPerson(id: number): Promise<void> {
  await request<{ ok: boolean }>(`/api/admin/wiki-persons/${id}`, { method: 'DELETE' })
}

export async function fetchWikiGamePreview(personId: number): Promise<WikiChallengePayload> {
  return request<WikiChallengePayload>(`/api/admin/wiki-persons/${personId}/game-preview`)
}

export async function fetchWikiPoolEntryGamePreview(poolEntryId: number): Promise<WikiChallengePayload> {
  return request<WikiChallengePayload>(`/api/admin/wiki-prefetch-pool/${poolEntryId}/game-preview`)
}

export async function postWikiPersonDraftPreview(body: WikiPersonDraftPreviewBody): Promise<WikiChallengePayload> {
  return request<WikiChallengePayload>('/api/admin/wiki-persons/preview-draft', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function refetchWikiPrefetchPoolEntry(
  poolEntryId: number
): Promise<{ ok: boolean; status: 'ready' | 'failed'; error?: string }> {
  return request<{ ok: boolean; status: 'ready' | 'failed'; error?: string }>(
    `/api/admin/wiki-prefetch-pool/${poolEntryId}/refetch`,
    { method: 'POST' }
  )
}

export async function importWikiPersonFromPrefetchPool(poolEntryId: number): Promise<{ id: number }> {
  return request<{ id: number }>(`/api/admin/wiki-prefetch-pool/${poolEntryId}/import-wiki-person`, {
    method: 'POST',
  })
}

export async function fetchRandomWikiSlugs(lang = 'fr', minFame = 30): Promise<{ slugs: string[] }> {
  return request<{ slugs: string[] }>(`/api/admin/wiki-persons/random?lang=${encodeURIComponent(lang)}&minFame=${minFame}`)
}

export async function fetchRandomPrefetchedWikipediaPerson(lang = 'fr', minFame = 30): Promise<WikipediaFetchPayload> {
  return request<WikipediaFetchPayload>(
    `/api/admin/wiki-persons/random-prefetched?lang=${encodeURIComponent(lang)}&minFame=${minFame}`
  )
}

export async function getWikiPrefetchPool(params: {
  lang?: string
  minFame?: number
  page?: number
  pageSize?: number
  hasWikiPerson?: WikiPrefetchPoolHasWikiFilter
}): Promise<WikiPrefetchPoolResponse> {
  const q = new URLSearchParams()
  q.set('lang', params.lang ?? 'fr')
  q.set('minFame', String(params.minFame ?? 30))
  q.set('page', String(params.page ?? 1))
  q.set('pageSize', String(params.pageSize ?? 25))
  q.set('hasWikiPerson', params.hasWikiPerson ?? 'all')
  return request<WikiPrefetchPoolResponse>(`/api/admin/wiki-persons/prefetch-pool?${q.toString()}`)
}

export async function addWikiPrefetchPoolEntry(body: {
  input: string
  lang?: string
  minFame?: number
}): Promise<{ ok: boolean; resolved_slug?: string; resolved_lang?: string }> {
  return request<{ ok: boolean; resolved_slug?: string; resolved_lang?: string }>(
    '/api/admin/wiki-persons/prefetch-pool/add',
    { method: 'POST', body: JSON.stringify(body) }
  )
}

export async function getWikiPrefetchSettings(): Promise<{ enabled: boolean }> {
  return request<{ enabled: boolean }>('/api/admin/wiki-prefetch/settings')
}

export async function setWikiPrefetchSettings(enabled: boolean): Promise<{ ok: boolean; enabled: boolean }> {
  return request<{ ok: boolean; enabled: boolean }>('/api/admin/wiki-prefetch/settings', {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  })
}

export async function fetchWikipediaPerson(input: string, lang = 'fr'): Promise<WikipediaFetchPayload> {
  const res = await fetch(`${BASE_URL}/api/admin/wiki-persons/fetch-wikipedia`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, lang }),
  })
  if (res.status === 401) {
    window.location.href = '/admin/login'
    throw new Error('Session admin expirée. Reconnecte-toi.')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as { error?: string; message?: string }))
    const backendMessage =
      (body as { error?: string; message?: string }).error
      ?? (body as { error?: string; message?: string }).message
      ?? ''
    if (res.status === 429) throw new Error('Trop de requêtes vers Wikipedia/Wikidata. Attends 3-5 secondes puis réessaie.')
    if (res.status === 504) throw new Error('Wikipedia met trop de temps à répondre. Réessaie ou passe en EN pour cette personne.')
    if (res.status === 404) throw new Error(backendMessage || 'Aucune page trouvée. Vérifie le nom, le slug ou essaie en EN.')
    if (res.status === 400) throw new Error(backendMessage || 'Entrée invalide. Renseigne un nom, un slug ou une URL Wikipedia.')
    throw new Error(backendMessage || `Erreur serveur (${res.status}).`)
  }
  return res.json() as Promise<WikipediaFetchPayload>
}

