import type {
  DailyChallenge,
  GuessResult,
  GameResult,
  GlobalStats,
  SearchResult,
} from '../types';
import { apiFetch } from './http';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, init);
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
