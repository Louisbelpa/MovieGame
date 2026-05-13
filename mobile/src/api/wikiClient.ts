import type {
  WikiChallenge,
  WikiGuessResult,
  WikiGameResult,
  GlobalStats,
  WikiSearchResult,
} from '../types';
import { apiFetch } from './http';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, init);
}

export const wikiApi = {
  getToday: () => http<WikiChallenge>('/api/wiki/today'),

  getByDate: (date: string) => http<WikiChallenge>(`/api/wiki/date/${date}`),

  getAdjacent: (date: string, direction: 'prev' | 'next') =>
    http<{ date: string }>(`/api/wiki/adjacent?date=${date}&direction=${direction}`),

  submitGuess: (challengeId: number, guess: string) =>
    http<WikiGuessResult>('/api/wiki/guess', {
      method: 'POST',
      body: JSON.stringify({ challengeId, guess }),
    }),

  getResult: (challengeId: number) =>
    http<WikiGameResult>(`/api/wiki/result?challengeId=${challengeId}`),

  getDates: (days: number) => http<string[]>(`/api/wiki/dates?days=${days}`),

  getStats: () => http<GlobalStats>('/api/wiki/stats'),

  search: (q: string) =>
    http<WikiSearchResult[]>(`/api/wiki/search?q=${encodeURIComponent(q)}&limit=8`),
};
