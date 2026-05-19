/**
 * mockData.ts
 * Données fictives pour le développement / review sur staging.
 * Jamais importées en production (uniquement depuis MockDataBanner + authStore guards).
 */

import type { ServerStatsData, FriendEntry, FriendsResponse } from '@/api/client'
import type { User } from '@/types'
import type { ServerStatsMap } from '@/store/authStore'
import { getTodayParis } from '@/store/gameStore'

// ─── User ────────────────────────────────────────────────────────────────────

export const MOCK_USER: User = {
  id: 1,
  email: 'demo@guesstoday.fr',
  displayName: 'Demo User',
  avatarUrl: null,
  emailVerified: true,
}

// ─── Stats ───────────────────────────────────────────────────────────────────

const filmStats: ServerStatsData = {
  gamesPlayed: 47,
  wins: 39,
  currentStreak: 8,
  maxStreak: 15,
  distribution: { '1': 12, '2': 14, '3': 8, '4': 3, '5': 2 },
}

const seriesStats: ServerStatsData = {
  gamesPlayed: 23,
  wins: 17,
  currentStreak: 3,
  maxStreak: 7,
  distribution: { '1': 4, '2': 7, '3': 4, '4': 1, '5': 1 },
}

const wikiStats: ServerStatsData = {
  gamesPlayed: 31,
  wins: 22,
  currentStreak: 5,
  maxStreak: 11,
  distribution: { '1': 6, '2': 8, '3': 5, '4': 2, '5': 1 },
}

export const MOCK_SERVER_STATS: ServerStatsMap = {
  film: filmStats,
  series: seriesStats,
  wiki: wikiStats,
}

// ─── Friends ─────────────────────────────────────────────────────────────────

const today = getTodayParis()

export const MOCK_FRIENDS_RESPONSE: FriendsResponse = {
  date: today,
  today,
  myCode: 'DEMO42',
  friends: [
    {
      id: 1,
      displayName: 'Demo User',
      avatarUrl: null,
      streak: 8,
      isMe: true,
      scores: {
        film:   { attemptsUsed: 2, won: true,  completedAt: new Date().toISOString() },
        series: null,
        wiki:   { attemptsUsed: 4, won: false, completedAt: new Date().toISOString() },
      },
    },
    {
      id: 2,
      displayName: 'Alice M.',
      avatarUrl: null,
      streak: 12,
      isMe: false,
      scores: {
        film:   { attemptsUsed: 1, won: true,  completedAt: new Date().toISOString() },
        series: { attemptsUsed: 3, won: true,  completedAt: new Date().toISOString() },
        wiki:   null,
      },
    },
    {
      id: 3,
      displayName: 'Thomas B.',
      avatarUrl: null,
      streak: 4,
      isMe: false,
      scores: {
        film:   { attemptsUsed: 5, won: false, completedAt: new Date().toISOString() },
        series: null,
        wiki:   { attemptsUsed: 2, won: true,  completedAt: new Date().toISOString() },
      },
    },
    {
      id: 4,
      displayName: 'Camille R.',
      avatarUrl: null,
      streak: 21,
      isMe: false,
      scores: {
        film:   { attemptsUsed: 1, won: true, completedAt: new Date().toISOString() },
        series: { attemptsUsed: 1, won: true, completedAt: new Date().toISOString() },
        wiki:   { attemptsUsed: 3, won: true, completedAt: new Date().toISOString() },
      },
    },
    {
      id: 5,
      displayName: 'Jules D.',
      avatarUrl: null,
      streak: 0,
      isMe: false,
      scores: { film: null, series: null, wiki: null },
    },
  ] satisfies FriendEntry[],
  pending: [
    { id: 6, displayName: 'Sophie L.', direction: 'incoming' },
  ],
}
