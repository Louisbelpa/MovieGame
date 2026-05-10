/**
 * admin/api.ts
 * Typed fetch helpers for all /api/admin/* routes.
 */

import type { ChallengePayload } from '@/api/client'
import type { WikiChallengePayload } from '@/api/wikiClient'

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
  fame_level: number    // 1–5, auto-filled from TMDB vote_count
  /** Ordre des clés d’indices copié vers le calendrier à la planification */
  hint_schedule: string[]
}

export interface AdminSeries {
  id: number
  title: string
  title_aliases: string[]
  year: number
  creator: string
  genres: string[]
  cast_members: string[]
  tagline: string
  synopsis: string
  image_url: string
  tmdb_id: number | null
  is_active: boolean
  used_dates: string[]
  fame_level: number
  number_of_seasons: number | null
  network: string | null
  status: string | null
  original_language: string | null
  hint_schedule: string[]
}

export interface AdminWikiPerson {
  id: number
  name: string
  title: string
  name_aliases: string[]
  person_type: 'politician' | 'sportsperson' | 'artist' | 'scientist' | 'entrepreneur' | 'writer' | 'historical_figure' | 'generic'
  wikipedia_slug: string
  infobox_data: Record<string, unknown>
  hint_schedule: string[]
  image_url: string | null
  photo_url: string | null
  extract: string | null
  wikipedia_url: string | null
  difficulty: number
  is_active: boolean
  used_dates: string[]
}

export interface WikiPersonPayload {
  name: string
  name_aliases: string[]
  person_type: 'politician' | 'sportsperson' | 'artist' | 'scientist' | 'entrepreneur' | 'writer' | 'historical_figure' | 'generic'
  wikipedia_slug: string
  infobox_data: Record<string, unknown>
  hint_schedule: string[]
  photo_url: string | null
  extract: string | null
  wikipedia_url: string | null
  difficulty: number
  is_active: boolean
}

export interface WikipediaFetchPayload {
  name: string
  extract: string | null
  photo_url: string | null
  wikipedia_url: string
  infobox_data: Record<string, unknown>
  person_type: 'politician' | 'sportsperson' | 'artist' | 'scientist' | 'entrepreneur' | 'writer' | 'historical_figure' | 'generic'
  hint_schedule: string[]
  parse_quality_score: number
  parse_warnings: string[]
  /** Slug canonique après résolution (recherche / URL / redirections) */
  resolved_slug?: string
  resolved_lang?: string
  canonical_wikipedia_slug?: string
  /** Difficulté suggérée automatiquement (1–5) basée sur sitelinks Wikidata + pageviews mensuels */
  suggested_difficulty?: number
}

export interface WikiPrefetchPoolEntry {
  id: number
  source_slug: string
  resolved_slug: string | null
  status: 'ready' | 'processing' | 'failed'
  error_message: string | null
  expires_at: number
  updated_at: string
  /** Présent si `status === 'ready'` — données `fetchWikipediaData` (aperçu admin) */
  payload: WikipediaFetchPayload | null
  /** Aligné sur `wiki_persons.wikipedia_slug` (colonnes pool + champs JSON slug). */
  has_wiki_person: boolean
  wiki_person_id: number | null
}

export type WikiPrefetchPoolHasWikiFilter = 'all' | 'yes' | 'no'

export interface WikiPrefetchPoolResponse {
  lang: string
  minFame: number
  stats: { processing: number; ready: number; failed: number; total: number }
  page: number
  pageSize: number
  totalMatching: number
  totalPages: number
  hasWikiPersonFilter: WikiPrefetchPoolHasWikiFilter
  entries: WikiPrefetchPoolEntry[]
}

export interface SeriesPayload {
  title: string
  title_aliases: string[]
  year: number
  creator: string
  genres: string[]
  cast_members: string[]
  tagline: string
  synopsis: string
  image_url: string
  tmdb_id: number | null
  is_active: boolean
  fame_level: number
  number_of_seasons: number | null
  network: string | null
  status: string | null
  original_language: string | null
  hint_schedule: string[]
}

export interface TmdbTvSearchResult {
  tmdb_id: number
  title: string
  original_title: string
  year: number
  poster_url: string | null
}

export interface AdminChallenge {
  id: number
  /** Numéro affiché côté joueur (#N dans le header / partages) — pas l’id SQL */
  challengeNumber: number
  date: string
  film: AdminFilm | null
  series: AdminSeries | null
  wiki: AdminWikiPerson | null
  mediaType: 'film' | 'series' | 'wiki'
}

export interface AdminDashboard {
  today_film_challenge: AdminChallenge | null
  today_series_challenge: AdminChallenge | null
  today_wiki_challenge: AdminChallenge | null
  upcoming_film_challenges: AdminChallenge[]
  upcoming_series_challenges: AdminChallenge[]
  upcoming_wiki_challenges: AdminChallenge[]
  stats: {
    total_films: number
    unused_films: number
    total_film_challenges: number
    unscheduled_film_next_30: number
    today_film_games: number
    today_film_wins: number
    today_film_rate: number | null
    film_success_rate: number | null
    total_series: number
    unused_series: number
    total_series_challenges: number
    unscheduled_series_next_30: number
    today_series_games: number
    today_series_wins: number
    today_series_rate: number | null
    series_success_rate: number | null
    total_wiki_persons: number
    unused_wiki_persons: number
    total_wiki_challenges: number
    unscheduled_wiki_next_30: number
    today_wiki_games: number
    today_wiki_wins: number
    today_wiki_rate: number | null
    wiki_success_rate: number | null
    success_rate: number | null
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
  fame_level: number
  hint_schedule: string[]
}

export interface TmdbSearchResult {
  tmdb_id: number
  title: string
  original_title: string
  year: number
  poster_url: string | null
}

export interface AuditLog {
  id: number
  action: string
  details: Record<string, unknown>
  created_at: string
}

export interface AuditLogsResponse {
  data: AuditLog[]
  total: number
  page: number
  limit: number
  pages: number
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
export async function checkAdminConfig(): Promise<{ requiresUsername: boolean; allowPastScheduling: boolean }> {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/config`, { credentials: 'include' })
    if (res.ok) return res.json() as Promise<{ requiresUsername: boolean; allowPastScheduling: boolean }>
  } catch {
    // ignore
  }
  return { requiresUsername: false, allowPastScheduling: false }
}

export async function adminLogout(): Promise<void> {
  await request<void>('/api/admin/logout', { method: 'POST' })
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboard(): Promise<AdminDashboard> {
  return request<AdminDashboard>('/api/admin/dashboard')
}

// ─── Films ────────────────────────────────────────────────────────────────────

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

/** Upload a local image file and return the hosted URL */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('image', file)
  const res = await fetch(`${BASE_URL}/api/admin/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  if (res.status === 401) {
    window.location.href = '/admin/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  const data = await res.json() as { url: string }
  return data.url
}

// ─── Calendar / Challenges ────────────────────────────────────────────────────

export async function getChallenges(opts: { from?: string; to?: string; mediaType?: 'film' | 'series' | 'wiki' } = {}): Promise<AdminChallenge[]> {
  const params = new URLSearchParams()
  if (opts.from) params.set('from', opts.from)
  if (opts.to) params.set('to', opts.to)
  if (opts.mediaType) params.set('mediaType', opts.mediaType)
  const qs = params.toString()
  const res = await request<{ data: AdminChallenge[] }>(`/api/admin/challenges${qs ? `?${qs}` : ''}`)
  return res.data
}

export type MediaRef =
  | { filmId: number; seriesId?: never }
  | { seriesId: number; filmId?: never }
  | { wikiPersonId: number; filmId?: never; seriesId?: never }

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

export async function getRandomTmdbSeries(): Promise<SeriesPayload> {
  return request<SeriesPayload>('/api/admin/tmdb/tv/random')
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

// ─── Changelog ───────────────────────────────────────────────────────────────

export interface AdminChangelog {
  id: number
  version: string
  release_date: string
  changes: string[]
}

export async function getChangelog(): Promise<AdminChangelog[]> {
  return request<AdminChangelog[]>('/api/admin/changelog')
}

export async function createChangelogEntry(payload: Omit<AdminChangelog, 'id'>): Promise<AdminChangelog> {
  return request<AdminChangelog>('/api/admin/changelog', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateChangelogEntry(id: number, payload: Omit<AdminChangelog, 'id'>): Promise<AdminChangelog> {
  return request<AdminChangelog>(`/api/admin/changelog/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteChangelogEntry(id: number): Promise<void> {
  return request<void>(`/api/admin/changelog/${id}`, { method: 'DELETE' })
}

// ─── Series ───────────────────────────────────────────────────────────────────

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
  const validTypes = ['politician', 'sportsperson', 'artist', 'scientist', 'entrepreneur', 'writer', 'historical_figure', 'generic']
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

export interface WikiPersonDraftPreviewBody {
  name: string
  person_type: string
  infobox_data: Record<string, unknown>
  hint_schedule: string[]
  photo_url: string | null
  extract: string | null
  wikipedia_url: string | null
  difficulty: number
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

export async function fetchFilmGamePreview(filmId: number): Promise<ChallengePayload> {
  return request<ChallengePayload>(`/api/admin/films/${filmId}/game-preview`)
}

export async function fetchSeriesGamePreview(seriesId: number): Promise<ChallengePayload> {
  return request<ChallengePayload>(`/api/admin/series/${seriesId}/game-preview`)
}

/** Brouillon film/série pour aperçu sans enregistrement (aligné sur FilmPayload / SeriesPayload utiles au rendu). */
export interface FilmSeriesGamePreviewDraftBody {
  mode: 'film' | 'series'
  year: number
  director?: string
  creator?: string
  genres: string[]
  cast_members: string[]
  tagline: string
  synopsis: string
  image_url: string
  hint_schedule: string[]
}

export async function postFilmSeriesGamePreviewDraft(
  body: FilmSeriesGamePreviewDraftBody
): Promise<ChallengePayload> {
  return request<ChallengePayload>('/api/admin/game-preview-draft', {
    method: 'POST',
    body: JSON.stringify(body),
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

export interface AdminSettingsSummary {
  wikiPrefetchEnabled: boolean
  wikiPrefetchTargetReady: number
  wikiPrefetchMaxFetchPerRun: number
  wikiPrefetchSparqlLimit: number
  maxAttempts: number
  wikiMaxAttempts: number
  imageSource: 'tmdb' | 'local'
  planningAlertConfigured: boolean
  nodeEnv: 'production' | 'development'
}

export async function fetchAdminSettingsSummary(): Promise<AdminSettingsSummary> {
  return request<AdminSettingsSummary>('/api/admin/settings/summary')
}

export async function setWikiPrefetchSettings(enabled: boolean): Promise<{ ok: boolean; enabled: boolean }> {
  return request<{ ok: boolean; enabled: boolean }>('/api/admin/wiki-prefetch/settings', {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  })
}

/** `input` : nom affiché, titre, slug avec underscores ou URL complète Wikipédia */
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
    if (res.status === 429) {
      throw new Error('Trop de requêtes vers Wikipedia/Wikidata. Attends 3-5 secondes puis réessaie.')
    }
    if (res.status === 504) {
      throw new Error('Wikipedia met trop de temps à répondre. Réessaie ou passe en EN pour cette personne.')
    }
    if (res.status === 404) {
      throw new Error(backendMessage || 'Aucune page trouvée. Vérifie le nom, le slug ou essaie en EN.')
    }
    if (res.status === 400) {
      throw new Error(backendMessage || 'Entrée invalide. Renseigne un nom, un slug ou une URL Wikipedia.')
    }
    throw new Error(backendMessage || `Erreur serveur (${res.status}).`)
  }
  return res.json() as Promise<WikipediaFetchPayload>
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

// ─── CSV Import ───────────────────────────────────────────────────────────────

export interface CsvImportResult {
  created: number
  errors: { line: number; error: string }[]
}

export async function importCsvFilms(
  rows: Record<string, string>[]
): Promise<CsvImportResult> {
  return request<CsvImportResult>('/api/admin/films/import-csv', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  })
}

// ─── Image upload ─────────────────────────────────────────────────────────────

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

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  /** Lignes game_sessions (terminées + non terminées). */
  total_sessions: number
  /** Parties allant au bout : victoire ou défaite (`outcome` renseigné). */
  completed_sessions: number
  /** Sessions ouvertes sans fin de partie enregistrée (`outcome` null). */
  incomplete_sessions: number
  total_unique_players: number
  overall_win_rate: number
  avg_attempts_on_win: number
  avg_hints_per_session: number
  completion_rate: number
  avg_session_duration_seconds: number
}

export interface DailyAnalytics {
  date: string
  sessions_started: number
  sessions_completed: number
  unique_players: number
  win_rate: number
  avg_attempts: number
  avg_hints: number
  abandonment_rate: number
}

export interface FilmAnalytics {
  challenge_id: number
  challenge_date: string
  film_title: string
  film_year: number
  fame_level: number
  sessions: number
  win_rate: number
  avg_attempts: number
  avg_hints: number
  most_common_wrong_guess: string | null
}

export interface SeriesAnalytics {
  challenge_id: number
  challenge_date: string
  series_title: string
  series_year: number
  fame_level: number
  sessions: number
  win_rate: number
  avg_attempts: number
  avg_hints: number
  most_common_wrong_guess: string | null
}

export interface ChallengeAnalytics {
  challenge_id: number
  challenge_date: string
  media_type: 'film' | 'series' | 'wiki'
  title: string
  year: number
  fame_level: number
  sessions: number
  win_rate: number
  avg_attempts: number
  avg_hints: number
  most_common_wrong_guess: string | null
}

export interface WrongGuess {
  guess: string
  count: number
}

export interface ReturningPlayer {
  days_played: number
  player_count: number
}

export interface HourlyData {
  hour: number
  sessions: number
}

/** Filtre type de jeu analytics ; `all` = films + séries + wiki (pas de paramètre `mediaType` côté API). */
export type AnalyticsMediaFilter = 'film' | 'series' | 'wiki' | 'all'

export async function getAnalyticsOverviewByMedia(
  mediaType: AnalyticsMediaFilter,
  from: string,
  to: string
): Promise<AnalyticsOverview> {
  const params = new URLSearchParams({ from, to })
  if (mediaType !== 'all') params.set('mediaType', mediaType)
  return request<AnalyticsOverview>(`/api/admin/analytics/overview?${params}`)
}

export async function getAnalyticsDaily(
  from: string,
  to: string,
  mediaType?: AnalyticsMediaFilter
): Promise<DailyAnalytics[]> {
  const params = new URLSearchParams({ from, to })
  if (mediaType && mediaType !== 'all') params.set('mediaType', mediaType)
  return request<DailyAnalytics[]>(`/api/admin/analytics/daily?${params}`)
}

export async function getAnalyticsFilms(
  sort?: 'win_rate' | 'sessions' | 'avg_hints'
): Promise<FilmAnalytics[]> {
  const params = new URLSearchParams()
  if (sort) params.set('sort', sort)
  const qs = params.toString()
  return request<FilmAnalytics[]>(`/api/admin/analytics/films${qs ? `?${qs}` : ''}`)
}

export async function getAnalyticsSeries(
  sort?: 'win_rate' | 'sessions' | 'avg_hints'
): Promise<SeriesAnalytics[]> {
  const params = new URLSearchParams()
  if (sort) params.set('sort', sort)
  const qs = params.toString()
  return request<SeriesAnalytics[]>(`/api/admin/analytics/series${qs ? `?${qs}` : ''}`)
}

export async function getAnalyticsChallenges(
  mediaType: AnalyticsMediaFilter,
  sort: 'challenge_date' | 'win_rate' | 'sessions' | 'avg_hints',
  from: string,
  to: string
): Promise<ChallengeAnalytics[]> {
  const params = new URLSearchParams({ from, to })
  params.set('mediaType', mediaType === 'all' ? 'all' : mediaType)
  params.set('sort', sort)
  return request<ChallengeAnalytics[]>(`/api/admin/analytics/challenges?${params}`)
}

export async function getWrongGuesses(challengeId: number, limit?: number): Promise<WrongGuess[]> {
  const params = new URLSearchParams({ challenge_id: String(challengeId) })
  if (limit !== undefined) params.set('limit', String(limit))
  return request<WrongGuess[]>(`/api/admin/analytics/wrong-guesses?${params}`)
}

export async function getReturningPlayers(days?: number): Promise<ReturningPlayer[]> {
  const params = new URLSearchParams()
  if (days !== undefined) params.set('days', String(days))
  const qs = params.toString()
  return request<ReturningPlayer[]>(`/api/admin/analytics/returning-players${qs ? `?${qs}` : ''}`)
}

export async function getReturningPlayersByMedia(
  from: string,
  to: string,
  mediaType: AnalyticsMediaFilter
): Promise<ReturningPlayer[]> {
  const params = new URLSearchParams({ from, to })
  if (mediaType !== 'all') params.set('mediaType', mediaType)
  return request<ReturningPlayer[]>(`/api/admin/analytics/returning-players?${params}`)
}

export async function getHourlyDistribution(
  mediaType: AnalyticsMediaFilter,
  from: string,
  to: string
): Promise<HourlyData[]> {
  const params = new URLSearchParams({ from, to })
  if (mediaType !== 'all') params.set('mediaType', mediaType)
  return request<HourlyData[]>(`/api/admin/analytics/hourly?${params}`)
}

export async function getAttemptsDistribution(
  mediaType: AnalyticsMediaFilter,
  from: string,
  to: string
): Promise<Record<string, number>> {
  const params = new URLSearchParams({ from, to })
  if (mediaType !== 'all') params.set('mediaType', mediaType)
  return request<Record<string, number>>(`/api/admin/analytics/attempts-distribution?${params}`)
}

export async function getHintsDistribution(
  mediaType: AnalyticsMediaFilter,
  from: string,
  to: string
): Promise<Record<string, number>> {
  const params = new URLSearchParams({ from, to })
  if (mediaType !== 'all') params.set('mediaType', mediaType)
  return request<Record<string, number>>(`/api/admin/analytics/hints-distribution?${params}`)
}

// ─── Audit logs ───────────────────────────────────────────────────────────────

export async function getAuditLogs(
  page = 1,
  limit = 50,
  action?: string
): Promise<AuditLogsResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (action) params.set('action', action)
  return request<AuditLogsResponse>(`/api/admin/audit-logs?${params}`)
}

export async function getAuditLogActions(): Promise<string[]> {
  const res = await request<{ data: string[] }>('/api/admin/audit-logs/actions')
  return res.data
}
