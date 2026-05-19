/**
 * mockFlags.ts
 * Feature flag "données mockées" — staging uniquement.
 * Persisté en localStorage pour survivre aux rechargements.
 */

const STORAGE_KEY = 'dev_mock_enabled'

export const IS_STAGING: boolean =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('staging') ||
    window.location.hostname.includes('railway.app') ||
    window.location.hostname === 'localhost')   // pratique aussi en local dev

export function isMockEnabled(): boolean {
  if (!IS_STAGING) return false
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function setMockEnabled(value: boolean): void {
  localStorage.setItem(STORAGE_KEY, String(value))
}
