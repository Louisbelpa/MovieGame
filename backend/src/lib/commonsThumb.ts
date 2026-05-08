/**
 * Miniatures Wikimedia Commons → URLs statiques upload.wikimedia.org
 * (évite redirections commons + problèmes si crossOrigin sur les <img>).
 */

import { createHash } from 'node:crypto'

/** Largeurs usuelles ; au-delà de 400 on préfère 500px (beaucoup de fichiers n’ont pas 400px exact). */
export function pickCommonsThumbWidth(preferred: number): number {
  if (!Number.isFinite(preferred) || preferred <= 0) return 330
  if (preferred <= 330) return 330
  return 500
}

export function commonsFilenameToUploadThumbUrl(filename: string, preferredWidth: number): string {
  let clean = filename.replace(/^File:/i, '').replace(/^Fichier:/i, '').trim()
  clean = clean.replace(/\+/g, ' ')
  try {
    clean = decodeURIComponent(clean)
  } catch {
    /* garder tel quel */
  }
  clean = clean.replace(/ /g, '_')
  const digest = createHash('md5').update(clean).digest('hex')
  const enc = encodeURIComponent(clean).replace(/'/g, '%27')
  const px = pickCommonsThumbWidth(preferredWidth)
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${digest[0]}/${digest.slice(0, 2)}/${enc}/${px}px-${enc}`
}

export function normalizeCommonsPhotoUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  let v = raw.trim()
  if (v.startsWith('//')) v = `https:${v}`
  try {
    const u = new URL(v)
    if (!u.hostname.endsWith('commons.wikimedia.org')) return v

    let filename: string | null = null
    let width = 400
    const params = u.searchParams
    const wq = params.get('width')
    if (wq) width = parseInt(wq, 10) || 400

    const path = u.pathname
    const fpIdx = path.indexOf('/Special:FilePath/')
    if (fpIdx >= 0) {
      filename = decodeURIComponent(path.slice(fpIdx + '/Special:FilePath/'.length))
    }
    const rdIdx = path.indexOf('/Special:Redirect/file/')
    if (!filename && rdIdx >= 0) {
      filename = decodeURIComponent(path.slice(rdIdx + '/Special:Redirect/file/'.length))
    }

    const title = params.get('title')
    if (!filename && title?.includes('Special:Redirect/file/')) {
      const rest = title.split('Special:Redirect/file/')[1]
      if (rest) filename = decodeURIComponent(rest.replace(/\+/g, ' '))
    }

    if (!filename) return v
    return commonsFilenameToUploadThumbUrl(filename, width)
  } catch {
    return v
  }
}
