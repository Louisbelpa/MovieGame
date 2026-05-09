/** Une pop-in tutoriel par mode ; ancienne clé unique conservée pour rétrocompat migrée une fois. */
export const RULES_SEEN_KEY_FILM = 'cineguess:rules_seen:film'
export const RULES_SEEN_KEY_SERIES = 'cineguess:rules_seen:series'
export const RULES_SEEN_KEY_WIKI = 'cineguess:rules_seen:wiki'
const RULES_SEEN_KEY_LEGACY = 'cineguess:rules_seen'

export function rulesSeenKeyForRoute(mode: 'film' | 'series' | 'wiki'): string {
  switch (mode) {
    case 'wiki':
      return RULES_SEEN_KEY_WIKI
    case 'series':
      return RULES_SEEN_KEY_SERIES
    default:
      return RULES_SEEN_KEY_FILM
  }
}

/** Copie l’ancien « tutoriel vu » partagé films+séries vers les deux clés par mode (sans ré-afficher aux anciens joueurs). */
export function migrateLegacyRulesSeen(): void {
  try {
    if (localStorage.getItem(RULES_SEEN_KEY_LEGACY) !== '1') return
    if (!localStorage.getItem(RULES_SEEN_KEY_FILM)) localStorage.setItem(RULES_SEEN_KEY_FILM, '1')
    if (!localStorage.getItem(RULES_SEEN_KEY_SERIES)) localStorage.setItem(RULES_SEEN_KEY_SERIES, '1')
  } catch {
    /* private browsing */
  }
}
