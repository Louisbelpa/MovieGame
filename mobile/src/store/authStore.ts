import { create } from 'zustand';
import {
  authGetMe,
  authImportStats,
  authLogin,
  authLogout,
  authRegister,
  authUpdateProfile,
} from '../api/auth';
import { clearUserSessionToken, getUserSessionToken } from '../lib/authSession';
import { gameStorage } from '../lib/storage';
import type { ImportStatsBody } from '../api/auth';
import type { User } from '../types';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { displayName?: string; avatarUrl?: string | null }) => Promise<void>;
}

function defaultStats() {
  return {
    gamesPlayed: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: {} as Record<string, number>,
  };
}

async function buildImportPayload(): Promise<ImportStatsBody> {
  const film = (await gameStorage.getStats('film')) ?? defaultStats();
  const series = (await gameStorage.getStats('series')) ?? defaultStats();
  const wiki = (await gameStorage.getStats('wiki')) ?? defaultStats();
  const distribution: Record<string, number> = {};
  for (const k of ['1', '2', '3', '4', '5'] as const) {
    distribution[k] =
      (film.distribution[k] ?? 0) +
      (series.distribution[k] ?? 0) +
      (wiki.distribution[k] ?? 0);
  }
  return {
    gamesPlayed: film.gamesPlayed + series.gamesPlayed + wiki.gamesPlayed,
    wins: film.wins + series.wins + wiki.wins,
    currentStreak: Math.max(film.currentStreak, series.currentStreak, wiki.currentStreak),
    maxStreak: Math.max(film.maxStreak, series.maxStreak, wiki.maxStreak),
    distribution,
  };
}

async function clearLocalStats(): Promise<void> {
  const empty = defaultStats();
  for (const type of ['film', 'series', 'wiki'] as const) {
    await gameStorage.setStats(type, { ...empty, distribution: { ...empty.distribution } });
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,

  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const { user } = await authGetMe();
      set({ user, isLoading: false });
    } catch (err) {
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? (err as { status?: number }).status
          : undefined;
      if (status === 401) {
        await clearUserSessionToken();
      }
      set({ user: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    await clearUserSessionToken();
    const { user } = await authLogin(email, password);
    set({ user });
    try {
      await authImportStats(await buildImportPayload());
      await clearLocalStats();
    } catch {
      /* non-bloquant */
    }
  },

  register: async (email, password, displayName) => {
    await clearUserSessionToken();
    const { user } = await authRegister(email, password, displayName);
    set({ user });
    try {
      await authImportStats(await buildImportPayload());
      await clearLocalStats();
    } catch {
      /* non-bloquant */
    }
  },

  logout: async () => {
    try {
      await authLogout();
    } catch {
      /* réseau ou session déjà invalide */
    }
    set({ user: null });
  },

  updateProfile: async (data) => {
    const { user } = await authUpdateProfile(data);
    set({ user });
  },
}));
