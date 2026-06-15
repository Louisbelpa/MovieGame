/**
 * lib/share.ts
 * Deux actions de partage distinctes, fidèles à leur intention :
 * - copyText   : presse-papier strict (jamais de menu natif) — pour le bouton « Copier ».
 * - nativeShare: feuille de partage OS si dispo, sinon repli presse-papier — pour « Partager ».
 */

/** Copie stricte dans le presse-papier. Retourne true si la copie a réussi. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** True si la feuille de partage native du navigateur est disponible. */
export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/** Partage natif OS si disponible, sinon repli sur le presse-papier. */
export async function nativeShare(text: string): Promise<'shared' | 'copied' | 'failed'> {
  if (canNativeShare()) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch {
      /* annulé par l'utilisateur ou échec — on retombe sur le presse-papier */
    }
  }
  return (await copyText(text)) ? 'copied' : 'failed'
}
