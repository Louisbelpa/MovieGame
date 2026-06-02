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
  authImportHistory,
  authAppleSignIn,
  authOAuthCallback,
  authGetStats,
  type AuthSessionPayload,
} from '@/api/client'
import type { ServerStatsData } from '@/api/client'
import { loadStats, loadHistory, saveStats } from '@/lib/storage'
import { buildMobileReturnURL } from '@/lib/mobileAuthHandoff'
import { defaultStats } from '@/lib/utils'
import type { User } from '@/types'
import { isMockEnabled } from '@/mock/mockFlags'
import { MOCK_USER, MOCK_SERVER_STATS } from '@/mock/mockData'

export type ServerStatsMap = Record<'film' | 'series' | 'wiki', ServerStatsData | null>

interface AuthStore {
  user: User | null
  isLoading: boolean
  serverStats: ServerStatsMap
  /** Set after mobile auth handoff — URL to open the native app. Cleared by the consumer. */
  mobileReturnURL: string | null
  fetchMe: () => Promise<void>
  refreshServerStats: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  loginWithApple: (identityToken: string, displayName?: string) => Promise<void>
  loginWithGoogle: (providerId: string, email: string, displayName: string, avatarUrl?: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: { displayName?: string; avatarUrl?: string }) => Promise<void>
  setUser: (user: User) => void
  clearMobileReturnURL: () => void
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

async function importAllLocalHistory() {
  for (const type of ['film', 'series', 'wiki'] as const) {
    const history = loadHistory(type) as Record<string, 'won' | 'lost'>
    if (Object.keys(history).length > 0) {
      await authImportHistory(type, history).catch(() => {})
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

/**
 * Import web local stats, then either:
 * - Set mobileReturnURL so the UI can show a button (iOS Safari blocks programmatic deep links)
 * - Or log the user in normally (web flow)
 */
async function finishAuthSession(
  { user, sessionToken }: AuthSessionPayload,
  set: (partial: Partial<AuthStore>) => void,
): Promise<void> {
  await Promise.all([importAllLocalStats(), importAllLocalHistory()])
  const mobileReturnURL = buildMobileReturnURL(sessionToken)
  if (mobileReturnURL) {
    // Don't navigate — store URL so UI renders a tappable button (user gesture required by iOS Safari)
    set({ mobileReturnURL })
    return
  }
  set({ user })
  clearLocalStats()
  fetchAllServerStats().then((serverStats) => set({ serverStats })).catch(() => {})
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  serverStats: NULL_STATS_MAP,
  mobileReturnURL: null,

  fetchMe: async () => {
    if (isMockEnabled()) {
      set({ user: MOCK_USER, serverStats: MOCK_SERVER_STATS, isLoading: false })
      return
    }
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
    await finishAuthSession(await authLogin(email, password), set)
  },

  register: async (email, password, displayName) => {
    await finishAuthSession(await authRegister(email, password, displayName), set)
  },

  loginWithApple: async (identityToken, displayName) => {
    await finishAuthSession(await authAppleSignIn(identityToken, displayName), set)
  },

  loginWithGoogle: async (providerId, email, displayName, avatarUrl) => {
    await finishAuthSession(
      await authOAuthCallback({ provider: 'google', providerId, email, displayName, avatarUrl }),
      set,
    )
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
  clearMobileReturnURL: () => set({ mobileReturnURL: null }),
}))
