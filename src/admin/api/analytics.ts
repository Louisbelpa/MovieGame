import { request } from './client'
import type {
  AnalyticsOverview,
  DailyAnalytics,
  FilmAnalytics,
  SeriesAnalytics,
  ChallengeAnalytics,
  WrongGuess,
  ReturningPlayer,
  HourlyData,
  AnalyticsMediaFilter,
} from './types'

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

export interface SocialStats {
  users: { total: number; new7d: number; new30d: number; appleSignIn: number }
  platforms: { ios: number; android: number; web: number }
  achievements: {
    first_win: number; plays_10: number; streak_7: number
    streak_30: number; wins_50: number; wins_100: number
  }
  social: {
    totalFriendships: number; acceptedFriendships: number
    pendingInvitations: number; friendshipsLast7d: number; usersWithFriends: number
  }
}

export async function getSocialStats(): Promise<SocialStats> {
  return request<SocialStats>('/api/admin/stats/social')
}
