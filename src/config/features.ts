function envFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue
  return value.toLowerCase() === 'true'
}

export const FEATURES = {
  enableSeries: envFlag(import.meta.env.VITE_ENABLE_SERIES, false),
} as const

export const BRAND_NAME = FEATURES.enableSeries ? 'GuessToday' : 'CinéGuessr'
export const PUBLIC_SITE_URL = FEATURES.enableSeries ? 'https://guesstoday.fr' : 'https://cineguessr.fr'
