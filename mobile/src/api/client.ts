import { API_BASE_URL } from '../config/features';
import type {
  DailyChallenge,
  GuessResult,
  GameResult,
  GlobalStats,
  SearchResult,
} from '../types';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? `HTTP ${res.status}`), { status: res.status });
  }
  return res.json() as Promise<T>;
}

export const challengeApi = {
  getToday: (type: 'film' | 'series') =>
    http<DailyChallenge>(`/api/challenge/today?type=${type}`),

  getByDate: (date: string, type: 'film' | 'series') =>
    http<DailyChallenge>(`/api/challenge/date/${date}?type=${type}`),

  getAdjacent: (date: string, direction: 'prev' | 'next', type: 'film' | 'series') =>
    http<{ date: string }>(`/api/challenge/adjacent?date=${date}&direction=${direction}&type=${type}`),

  submitGuess: (challengeId: number, guess: string) =>
    http<GuessResult>('/api/challenge/guess', {
      method: 'POST',
      body: JSON.stringify({ challengeId, guess }),
    }),

  getResult: (challengeId: number) =>
    http<GameResult>(`/api/challenge/result?challengeId=${challengeId}`),

  getDates: (days: number, type: 'film' | 'series') =>
    http<string[]>(`/api/challenge/dates?days=${days}&type=${type}`),

  getStats: () => http<GlobalStats>('/api/stats'),

  searchFilms: (q: string) =>
    http<SearchResult[]>(`/api/films/search?q=${encodeURIComponent(q)}&limit=8`),

  searchSeries: (q: string) =>
    http<SearchResult[]>(`/api/series/search?q=${encodeURIComponent(q)}&limit=8`),
};
