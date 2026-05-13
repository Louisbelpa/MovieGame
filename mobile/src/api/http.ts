import { API_BASE_URL } from '../config/features';
import { getUserSessionToken } from '../lib/authSession';

function errMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const o = body as { message?: unknown; error?: unknown };
    if (typeof o.message === 'string' && o.message) return o.message;
    if (typeof o.error === 'string' && o.error) return o.error;
  }
  return `HTTP ${status}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getUserSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  if (init?.headers) {
    const h = new Headers(init.headers);
    h.forEach((v, k) => {
      headers[k] = v;
    });
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(errMessage(body, res.status)), { status: res.status });
  }

  return res.json() as Promise<T>;
}
