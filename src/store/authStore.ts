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
} from '@/api/client'
import { loadStats, saveStats } from '@/lib/storage'
import { defaultStats } from '@/lib/utils'
import type { User } from '@/types'

interface AuthStore {
  user: User | null
  isLoading: boolean
  fetchMe: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: { displayName?: string; avatarUrl?: string }) => Promise<void>
}

function buildImportPayload() {
  const film = loadStats('film')
  const wiki = loadStats('wiki')
  // Merge film + wiki stats for the import (film is primary)
  return {
    gamesPlayed: film.gamesPlayed + wiki.gamesPlayed,
    wins: film.gamesWon + wiki.gamesWon,
    currentStreak: Math.max(film.currentStreak, wiki.currentStreak),
    maxStreak: Math.max(film.maxStreak, wiki.maxStreak),
    distribution: Object.fromEntries(
      ([1, 2, 3, 4, 5] as const).map((k) => [
        k,
        (film.guessDistribution[k] ?? 0) + (wiki.guessDistribution[k] ?? 0),
      ])
    ),
  }
}

function clearLocalStats() {
  for (const type of ['film', 'series', 'wiki'] as const) {
    saveStats(defaultStats(), type)
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,

  fetchMe: async () => {
    set({ isLoading: true })
    try {
      const { user } = await authGetMe()
      set({ user, isLoading: false })
    } catch {
      // 401 = not logged in — not an error
      set({ user: null, isLoading: false })
    }
  },

  login: async (email, password) => {
    const { user } = await authLogin(email, password)
    set({ user })
    try {
      await authImportStats(buildImportPayload())
      clearLocalStats()
    } catch {
      // import failure is non-blocking
    }
  },

  register: async (email, password, displayName) => {
    const { user } = await authRegister(email, password, displayName)
    set({ user })
    try {
      await authImportStats(buildImportPayload())
      clearLocalStats()
    } catch {
      // import failure is non-blocking
    }
  },

  logout: async () => {
    await authLogout()
    set({ user: null })
  },

  updateProfile: async (data) => {
    const { user } = await authUpdateProfile(data)
    set({ user })
  },
}))
