import type { ChallengePayload } from '@/api/client'
import type { WikiChallengePayload } from '@/api/wikiClient'

export type { ChallengePayload, WikiChallengePayload }

export const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
