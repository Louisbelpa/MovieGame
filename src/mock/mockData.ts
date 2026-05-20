/**
 * mockData.ts
 * Données fictives pour le développement / review sur staging.
 * Jamais importées en production (uniquement depuis MockDataBanner + authStore guards).
 */

import type { ServerStatsData, FriendEntry, FriendsResponse, LeaderboardEntry } from '@/api/client'
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

// ─── Leaderboard global ───────────────────────────────────────────────────────

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: 4, displayName: 'Camille R.', avatarUrl: null, isMe: false, rank: 1,
    totalWins: 87, totalPlayed: 93, winRate: 94, filmWins: 31, seriesWins: 28, wikiWins: 28,
    filmPlayed: 33, seriesPlayed: 30, wikiPlayed: 30, avgAttempts: 1.8, currentStreak: 21, maxStreak: 34,
  },
  {
    id: 2, displayName: 'Alice M.', avatarUrl: null, isMe: false, rank: 2,
    totalWins: 74, totalPlayed: 85, winRate: 87, filmWins: 27, seriesWins: 24, wikiWins: 23,
    filmPlayed: 30, seriesPlayed: 28, wikiPlayed: 27, avgAttempts: 2.1, currentStreak: 12, maxStreak: 19,
  },
  {
    id: 1, displayName: 'Demo User', avatarUrl: null, isMe: true, rank: 3,
    totalWins: 61, totalPlayed: 78, winRate: 78, filmWins: 22, seriesWins: 17, wikiWins: 22,
    filmPlayed: 28, seriesPlayed: 24, wikiPlayed: 26, avgAttempts: 2.6, currentStreak: 8, maxStreak: 15,
  },
  {
    id: 3, displayName: 'Thomas B.', avatarUrl: null, isMe: false, rank: 4,
    totalWins: 48, totalPlayed: 69, winRate: 70, filmWins: 18, seriesWins: 12, wikiWins: 18,
    filmPlayed: 24, seriesPlayed: 22, wikiPlayed: 23, avgAttempts: 3.0, currentStreak: 4, maxStreak: 11,
  },
  {
    id: 5, displayName: 'Jules D.', avatarUrl: null, isMe: false, rank: 5,
    totalWins: 29, totalPlayed: 51, winRate: 57, filmWins: 11, seriesWins: 8, wikiWins: 10,
    filmPlayed: 18, seriesPlayed: 16, wikiPlayed: 17, avgAttempts: 3.4, currentStreak: 0, maxStreak: 6,
  },
]
