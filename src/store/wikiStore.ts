import { createBaseGameStore } from './baseGameStore'

export function getTodayParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

export const useWikiStore = createBaseGameStore(
  {
    mediaType: 'wiki',
    apiBase: '/api/wiki',
    buildChallengeFromPayload: (payload) => ({
      challengeId: payload.challengeId,
      id: payload.challengeId,
      title: 'Devinez la personnalité',
      date: payload.date,
      challengeNumber: payload.challengeNumber,
      personType: payload.personType,
      photoUrl: payload.photoUrl,
      profile: payload.profile,
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
