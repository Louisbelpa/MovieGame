function envFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue
  return value.toLowerCase() === 'true'
}

export const FEATURES = {
  enableSeries: envFlag(import.meta.env.VITE_ENABLE_SERIES, false),
  enableWiki: envFlag(import.meta.env.VITE_ENABLE_WIKI, true),
} as const

export const BRAND_NAME = FEATURES.enableSeries ? 'GuessToday' : 'CinéGuessr'

const publicSiteFromEnv = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined
const normalizedPublic = publicSiteFromEnv?.trim().replace(/\/$/, '')

export const PUBLIC_SITE_URL =
  normalizedPublic || (FEATURES.enableSeries ? 'https://guesstoday.fr' : 'https://cineguessr.fr')
