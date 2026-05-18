import { request, BASE_URL } from './client'
import type { AdminDashboard, AdminChangelog, AuditLog, AuditLogsResponse, AdminSettingsSummary } from './types'

export async function adminLogin(username: string | undefined, password: string): Promise<void> {
  await request<{ ok: boolean; requiresUsername: boolean }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify(username !== undefined ? { username, password } : { password }),
  })
}

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

export async function getDashboard(): Promise<AdminDashboard> {
  return request<AdminDashboard>('/api/admin/dashboard')
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

export async function fetchAdminSettingsSummary(): Promise<AdminSettingsSummary> {
  return request<AdminSettingsSummary>('/api/admin/settings/summary')
}

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

export type { AuditLog, AuditLogsResponse }
