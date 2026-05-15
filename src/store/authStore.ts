/**
 * store/authStore.ts
 * Auth state — user session managed via httpOnly cookies.
 * On login/register, local stats are imported to the server then cleared.
 */

import { create } from 'zustand'
import {
  authLogin,
  authLogout,
  authRegister,
  authGetMe,
  authUpdateProfile,
  authImportStats,
  authAppleSignIn,
  authGetStats,
} from '@/api/client'
import type { ServerStatsData } from '@/api/client'
import { loadStats, saveStats } from '@/lib/storage'
import { defaultStats } from '@/lib/utils'
import type { User } from '@/types'

export type ServerStatsMap = Record<'film' | 'series' | 'wiki', ServerStatsData | null>

interface AuthStore {
  user: User | null
  isLoading: boolean
  serverStats: ServerStatsMap
  fetchMe: () => Promise<void>
  refreshServerStats: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  loginWithApple: (identityToken: string, displayName?: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: { displayName?: string; avatarUrl?: string }) => Promise<void>
  setUser: (user: User) => void
}

function statsPayload(type: 'film' | 'series' | 'wiki') {
  const s = loadStats(type)
  return {
    gamesPlayed:   s.gamesPlayed,
    wins:          s.gamesWon,
    currentStreak: s.currentStreak,
    maxStreak:     s.maxStreak,
    distribution:  Object.fromEntries(
      ([1, 2, 3, 4, 5] as const).map((k) => [k, s.guessDistribution[k] ?? 0])
    ),
  }
}

async function importAllLocalStats() {
  for (const type of ['film', 'series', 'wiki'] as const) {
    const payload = statsPayload(type)
    if (payload.gamesPlayed > 0) {
      await authImportStats(type, payload).catch(() => {})
    }
  }
}

function clearLocalStats() {
  for (const type of ['film', 'series', 'wiki'] as const) {
    saveStats(defaultStats(), type)
  }
}

const NULL_STATS_MAP: ServerStatsMap = { film: null, series: null, wiki: null }

async function fetchAllServerStats(): Promise<ServerStatsMap> {
  const [film, series, wiki] = await Promise.allSettled([
    authGetStats('film'),
    authGetStats('series'),
    authGetStats('wiki'),
  ])
  return {
    film:   film.status   === 'fulfilled' ? film.value   : null,
    series: series.status === 'fulfilled' ? series.value : null,
    wiki:   wiki.status   === 'fulfilled' ? wiki.value   : null,
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  serverStats: NULL_STATS_MAP,

  fetchMe: async () => {
    set({ isLoading: true })
    try {
      const { user } = await authGetMe()
      set({ user, isLoading: false })
      if (user) {
        fetchAllServerStats().then((serverStats) => set({ serverStats })).catch(() => {})
      }
    } catch {
      set({ user: null, isLoading: false })
    }
  },

  refreshServerStats: async () => {
    const serverStats = await fetchAllServerStats()
    set({ serverStats })
  },

  login: async (email, password) => {
    const { user } = await authLogin(email, password)
    set({ user })
    await importAllLocalStats()
    clearLocalStats()
    fetchAllServerStats().then((serverStats) => set({ serverStats })).catch(() => {})
  },

  register: async (email, password, displayName) => {
    const { user } = await authRegister(email, password, displayName)
    set({ user })
    await importAllLocalStats()
    clearLocalStats()
    fetchAllServerStats().then((serverStats) => set({ serverStats })).catch(() => {})
  },

  loginWithApple: async (identityToken, displayName) => {
    const { user } = await authAppleSignIn(identityToken, displayName)
    set({ user })
    await importAllLocalStats()
    clearLocalStats()
    fetchAllServerStats().then((serverStats) => set({ serverStats })).catch(() => {})
  },

  logout: async () => {
    await authLogout()
    set({ user: null, serverStats: NULL_STATS_MAP })
  },

  updateProfile: async (data) => {
    const { user } = await authUpdateProfile(data)
    set({ user })
  },

  setUser: (user) => set({ user }),
}))
