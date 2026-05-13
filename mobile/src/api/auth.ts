import { apiFetch } from './http';
import type { User } from '../types';

export interface AuthResponse {
  user: User;
  sessionToken?: string;
}

export type ImportStatsBody = {
  gamesPlayed: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  distribution: Record<string, number>;
};

export function authRegister(
  email: string,
  password: string,
  displayName: string
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
}

export function authLogin(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function authLogout(): Promise<void> {
  return apiFetch<{ ok?: boolean }>('/api/auth/logout', { method: 'POST' }).then(() => undefined);
}

export function authGetMe(): Promise<{ user: User }> {
  return apiFetch<{ user: User }>('/api/auth/me');
}

export function authUpdateProfile(data: {
  displayName?: string;
  avatarUrl?: string | null;
}): Promise<{ user: User }> {
  return apiFetch<{ user: User }>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function authImportStats(stats: ImportStatsBody): Promise<void> {
  return apiFetch<{ ok?: boolean }>('/api/auth/import-stats', {
    method: 'POST',
    body: JSON.stringify({ stats }),
  }).then(() => undefined);
}

export function authOAuthCallback(body: {
  provider: 'google' | 'apple';
  providerId: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/oauth/callback', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
