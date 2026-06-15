/** Règles de jeu affichées côté client (alignées sur WIKI_MAX_ATTEMPTS / MAX_ATTEMPTS). */
export const MAX_ATTEMPTS_BY_MODE = {
  film: 5,
  series: 5,
  wiki: 5,
} as const

export type PlayableMode = keyof typeof MAX_ATTEMPTS_BY_MODE

export function maxAttemptsForMode(mode: PlayableMode): number {
  return MAX_ATTEMPTS_BY_MODE[mode]
}
