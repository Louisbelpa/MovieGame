import { request } from './client'

export interface AdminUser {
  id: number
  email: string | null
  displayName: string
  avatarUrl: string | null
  createdAt: string
  isBanned: boolean
  statsGamesPlayed: number
  statsWins: number
  statsStreak: number
  statsMaxStreak: number
  oauthCount: number
  activeSessions: number
}

export async function getUsers(opts: {
  page?: number
  limit?: number
  q?: string
  banned?: 'all' | 'banned' | 'active'
} = {}): Promise<{
  data: AdminUser[]
  total: number
  page: number
  limit: number
  pages: number
}> {
  const params = new URLSearchParams()
  if (opts.page !== undefined) params.set('page', String(opts.page))
  if (opts.limit !== undefined) params.set('limit', String(opts.limit))
  if (opts.q !== undefined && opts.q !== '') params.set('q', opts.q)
  if (opts.banned === 'banned') params.set('banned', '1')
  else if (opts.banned === 'active') params.set('banned', '0')
  const qs = params.toString()
  const res = await request<{
    data: AdminUser[]
    pagination: { total: number; page: number; limit: number; pages: number }
  }>(`/api/admin/users${qs ? `?${qs}` : ''}`)
  return {
    data: res.data,
    total: res.pagination.total,
    page: res.pagination.page,
    limit: res.pagination.limit,
    pages: res.pagination.pages,
  }
}

export async function patchUserBan(id: number, isBanned: boolean): Promise<AdminUser> {
  return request<AdminUser>(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isBanned }),
  })
}

export const updateUserBan = patchUserBan
