/**
 * store/gameStore.ts
 * Central Zustand store – single source of truth for all game state.
 * Keeps localStorage in sync on every mutation.
 */

import { createBaseGameStore } from './baseGameStore'

export function getTodayParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

export const useGameStore = createBaseGameStore(
  {
    mediaType: 'film',
    apiBase: '/api/challenge',
    buildChallengeFromPayload: (payload) => ({
      challengeId: payload.challengeId,
      id: payload.challengeId,
      title: payload.mediaType === 'film' ? 'Devinez le film' : 'Devinez la série',
      date: payload.date,
      challengeNumber: payload.challengeNumber,
      mediaType: payload.mediaType,
      photoUrl: payload.photoUrl ?? payload.imageUrl,
      hintsAvailable: payload.hintsAvailable,
      hintsRevealed: payload.hintsRevealed,
      hints: payload.hints,
      maxAttempts: payload.maxAttempts,
      isPastChallenge: payload.isPastChallenge
    }),
    buildGuessFromAttempt: (attempt) => ({
      guess: attempt.guess,
      correct: attempt.correct
    })
  }
)
