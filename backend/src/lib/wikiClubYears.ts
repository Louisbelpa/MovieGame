/**
 * Infère `end_year` pour chaque passage club quand il manque : fin = année de début du club suivant
 * (convention proche des infobox Wikipédia, chevauchement sur la même année possible).
 */

export interface ClubStint {
  name: string
  start_year: number | null
  end_year: number | null
  appearances: number | null
  goals: number | null
}

const MIN_KEY_SUBSTRING = 5

/** Évite « calcio », « sportiva », etc. : faux positifs entre clubs italiens distincts (ex. Naples vs Parme). */
const CLUB_TOKEN_STOPWORDS = new Set([
  'calcio', 'football', 'soccer', 'club', 'association', 'societa', 'societ', 'society', 'sportiva', 'sportive',
  'sportifs', 'sports', 'olympique', 'atlético', 'atletico', 'athletic', 'footballclub', 'team', 'deporte',
  'stadium', 'arena',
])

export function normalizeClubKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

/** Aligne quelques libellés FR/EN/IT avant comparaison de doublons (Parme ↔ Parma, Naples ↔ Napoli). */
function preprocessClubNameForMatch(name: string): string {
  return name
    .replace(/\bParme\b/gi, 'Parma')
    .replace(/\bNaples\b/gi, 'Napoli')
}

function normalizeClubKeyForMatch(name: string): string {
  return normalizeClubKey(preprocessClubNameForMatch(name))
}

function clubStintExactKey(c: ClubStint): string {
  return `${normalizeClubKey(c.name)}|${c.start_year ?? ''}`
}

/** Ex. « Barcelona » vs « Barcelona B » : même racine + suffixe filiale → ne pas fusionner avec le pro. */
function isLikelyReserveBenchSuffix(shorterKey: string, longerKey: string): boolean {
  if (!longerKey.startsWith(shorterKey) || longerKey.length <= shorterKey.length) return false
  const rest = longerKey.slice(shorterKey.length)
  return rest === 'b' || rest === 'ii' || rest === 'bii' || /^b\d{0,2}$/i.test(rest)
}

function clubNameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4)
}

function clubNameTokensForMatch(name: string): string[] {
  const raw = clubNameTokens(preprocessClubNameForMatch(name))
  return raw.filter((t) => !CLUB_TOKEN_STOPWORDS.has(t))
}

function tokenOverlapSameClub(nameA: string, nameB: string): boolean {
  const ta = clubNameTokensForMatch(nameA)
  const tb = clubNameTokensForMatch(nameB)
  if (ta.length === 0 || tb.length === 0) return false
  for (const x of ta) {
    for (const y of tb) {
      if (x === y) return true
      if (x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x))) return true
    }
  }
  return false
}

/**
 * Même passage club malgré libellés différents (ex. « Real Madrid » vs « Real Madrid Club de Fútbol »,
 * « Al-Ahli » vs « Shabab AlAhli Dubai FC »).
 */
export function clubsLikelySameStint(nameA: string, nameB: string): boolean {
  const a = normalizeClubKeyForMatch(nameA)
  const b = normalizeClubKeyForMatch(nameB)
  if (!a || !b) return false
  if (a === b) return true
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a]
  if (shorter.length >= MIN_KEY_SUBSTRING && longer.includes(shorter)) {
    if (longer.startsWith(shorter) && isLikelyReserveBenchSuffix(shorter, longer)) return false
    return true
  }
  return tokenOverlapSameClub(nameA, nameB)
}

/** Aucun match / but renseigné : souvent formation ou ligne mal classée dans le tableau « pro » Wikipédia. */
function isBlankClubStats(c: ClubStint): boolean {
  const a = c.appearances ?? 0
  const g = c.goals ?? 0
  return a === 0 && g === 0
}

/**
 * Doublons junior/senior (même année de début + même club) :
 * – ligne **senior sans stats** → on retire du parcours pro (formation / doublon infobox) et on garde le junior ;
 * – ligne **senior avec stats** → on retire le doublon junior et on peut recopier `end_year` (ex. fin Al-Ahli).
 */
export function dedupeYouthAgainstSeniorMergeEnds<T extends ClubStint>(youth: T[], senior: T[]): { youth: T[]; senior: T[] } {
  let seniorOut = senior.map((s) => ({ ...s }))
  let youthWork = youth.map((y) => ({ ...y }))
  const removeSenior = new Set<number>()
  const removeYouth = new Set<number>()

  for (let yi = 0; yi < youthWork.length; yi++) {
    if (removeYouth.has(yi)) continue
    const y = youthWork[yi]
    if (y.start_year == null) continue

    const si = seniorOut.findIndex(
      (s, i) =>
        !removeSenior.has(i) &&
        s.start_year != null &&
        s.start_year === y.start_year &&
        clubsLikelySameStint(y.name, s.name),
    )
    if (si < 0) continue

    const s = seniorOut[si]
    if (isBlankClubStats(s)) {
      removeSenior.add(si)
      if (y.end_year == null && s.end_year != null) {
        youthWork[yi] = { ...y, end_year: s.end_year }
      }
    } else {
      removeYouth.add(yi)
      if (s.end_year == null && y.end_year != null) {
        seniorOut[si] = { ...s, end_year: y.end_year }
      }
    }
  }

  seniorOut = seniorOut.filter((_, i) => !removeSenior.has(i))
  youthWork = youthWork.filter((_, i) => !removeYouth.has(i))

  const seniorKeys = new Set(seniorOut.map(clubStintExactKey))
  youthWork = youthWork.filter((y) => {
    if (seniorKeys.has(clubStintExactKey(y))) return false
    if (y.start_year == null) return true
    return !seniorOut.some(
      (s) =>
        s.start_year != null &&
        s.start_year === y.start_year &&
        clubsLikelySameStint(y.name, s.name),
    )
  })

  return { youth: youthWork, senior: seniorOut }
}

/**
 * Parcours junior vide : reprendre les premières lignes du senior sans matchs/buts jusqu’à la première ligne
 * avec statistiques (formation souvent listée dans le même bloc que le pro).
 */
export function promoteLeadingBlankYouthFromSenior<T extends ClubStint>(youth: T[], senior: T[]): { youth: T[]; senior: T[] } {
  if (youth.length > 0 || senior.length === 0) return { youth, senior }

  const byStart = [...senior].sort((a, b) => (a.start_year ?? 0) - (b.start_year ?? 0))
  if (!byStart.some((c) => !isBlankClubStats(c))) return { youth, senior }

  const promote: T[] = []
  const keep: T[] = []
  let seenProWithStats = false
  for (const c of byStart) {
    if (!seenProWithStats && isBlankClubStats(c)) {
      promote.push(c)
    } else {
      if (!isBlankClubStats(c)) seenProWithStats = true
      keep.push(c)
    }
  }
  if (promote.length === 0) return { youth, senior }
  return { youth: promote, senior: keep }
}

export function inferClubStintEndYears<T extends ClubStint>(clubs: T[]): T[] {
  if (clubs.length === 0) return []
  const sorted = [...clubs].sort((a, b) => (a.start_year ?? 9999) - (b.start_year ?? 9999))
  return sorted.map((c, i) => {
    if (c.end_year != null) return { ...c }
    const next = sorted[i + 1]
    if (next?.start_year != null) {
      return { ...c, end_year: next.start_year }
    }
    return { ...c }
  })
}

export function inferSportspersonInfoboxClubYears(infobox: Record<string, unknown>): Record<string, unknown> {
  const out = { ...infobox }
  if (Array.isArray(out.clubs)) {
    const seniorIn = out.clubs as ClubStint[]
    const youthIn = Array.isArray(out.clubs_youth) ? (out.clubs_youth as ClubStint[]) : []
    const merged = dedupeYouthAgainstSeniorMergeEnds(youthIn, seniorIn)
    const prom = promoteLeadingBlankYouthFromSenior(merged.youth, merged.senior)
    out.clubs = prom.senior
    out.clubs_youth = prom.youth
  }
  if (Array.isArray(out.clubs)) {
    out.clubs = inferClubStintEndYears(out.clubs as ClubStint[])
  }
  if (Array.isArray(out.clubs_youth)) {
    out.clubs_youth = inferClubStintEndYears(out.clubs_youth as ClubStint[])
  }
  return out
}

export function parseInfoboxRecord(raw: unknown): Record<string, unknown> {
  if (raw == null) return {}
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown
      if (typeof p === 'object' && p !== null && !Array.isArray(p)) return p as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return {}
}

/** Sérialise l’infobox ; pour les sportifs, complète les fins de contrats à partir de l’enchaînement des clubs. */
export function normalizeWikiPersonInfoboxForStore(personType: string, raw: unknown): string {
  const rec = parseInfoboxRecord(raw)
  const out = personType === 'sportsperson' ? inferSportspersonInfoboxClubYears(rec) : rec
  return JSON.stringify(out)
}
