/** Persist ?platform=ios|android so register/login can redirect back to the native app. */

const STORAGE_KEY = 'guesstoday:mobile_return'
const TOKEN_PATTERN = /^[0-9a-f]{64}$/i

export type MobilePlatform = 'ios' | 'android'

export function captureMobileReturnFromUrl(): MobilePlatform | null {
  const params = new URLSearchParams(window.location.search)
  const platform = params.get('platform')
  if (platform === 'ios' || platform === 'android') {
    sessionStorage.setItem(STORAGE_KEY, platform)
    return platform
  }
  const stored = sessionStorage.getItem(STORAGE_KEY)
  return stored === 'ios' || stored === 'android' ? stored : null
}

export function getPendingMobileReturn(): MobilePlatform | null {
  const stored = sessionStorage.getItem(STORAGE_KEY)
  return stored === 'ios' || stored === 'android' ? stored : null
}

export function clearPendingMobileReturn(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

/** Build the deep-link URL for the native app, or null if not in a mobile handoff flow. */
export function buildMobileReturnURL(sessionToken: string): string | null {
  const platform = getPendingMobileReturn()
  if (!platform || !TOKEN_PATTERN.test(sessionToken)) return null
  clearPendingMobileReturn()
  return `guesstoday://auth?token=${encodeURIComponent(sessionToken)}`
}

/**
 * @deprecated Use buildMobileReturnURL + show a button instead.
 * window.location.replace() to a custom scheme is blocked by iOS Safari when called
 * from an async/Promise context (no user gesture). Left here for reference only.
 */
export function redirectToMobileApp(sessionToken: string): boolean {
  const url = buildMobileReturnURL(sessionToken)
  if (!url) return false
  window.location.replace(url)
  return true
}
