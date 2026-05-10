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
  resolved_slug?: string
  resolved_lang?: string
  canonical_wikipedia_slug?: string
  suggested_difficulty?: number
}

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
  used_dates: string[]
  fame_level: number
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

export interface WikiPrefetchPoolEntry {
  id: number
  source_slug: string
  resolved_slug: string | null
  status: 'ready' | 'processing' | 'failed'
  error_message: string | null
  expires_at: number
  updated_at: string
  payload: WikipediaFetchPayload | null
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

export interface TmdbBackdrop {
  path: string
  url: string
  width: number
  height: number
  vote_average: number
}

export interface AdminChangelog {
  id: number
  version: string
  release_date: string
  changes: string[]
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

export interface CsvImportResult {
  created: number
  errors: { line: number; error: string }[]
}

export interface AnalyticsOverview {
  total_sessions: number
  completed_sessions: number
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

export type AnalyticsMediaFilter = 'film' | 'series' | 'wiki' | 'all'

export type MediaRef =
  | { filmId: number; seriesId?: never }
  | { seriesId: number; filmId?: never }
  | { wikiPersonId: number; filmId?: never; seriesId?: never }

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
