/**
 * wikipedia.ts
 * Fetches and parses Wikipedia infobox data for wiki_persons.
 * Called only from admin routes — never during gameplay.
 */

export interface WikiRole {
  title: string
  title_redacted: string
  start_year: number | null
  end_year: number | null
  country: string | null
  predecessor: string | null
  successor: string | null
}

export interface WikiClub {
  name: string
  start_year: number | null
  end_year: number | null
  appearances: number | null
  goals: number | null
}

export interface WikiPoliticianData {
  roles: WikiRole[]
  party: string | null
  birth_year: number | null
  nationality: string | null
}

export interface WikiSportspersonData {
  sport: string | null
  position: string | null
  clubs: WikiClub[]
  career_highlights?: Array<{ label: string; value: string }>
  national_team: { name: string; caps: number | null; goals: number | null } | null
  birth_year: number | null
  nationality: string | null
}

export type WikiPersonType =
  | 'politician'
  | 'sportsperson'
  | 'artist'
  | 'scientist'
  | 'entrepreneur'
  | 'writer'
  | 'historical_figure'

export interface WikiGenericData {
  domain: string | null
  notable_work: string | null
  era: string | null
  birth_year: number | null
  nationality: string | null
}

export type WikiInfoboxData = WikiPoliticianData | WikiSportspersonData | WikiGenericData

export interface WikiFetchResult {
  name: string
  extract: string | null
  photo_url: string | null
  wikipedia_url: string
  infobox_data: WikiInfoboxData
  person_type: WikiPersonType
  hint_schedule: string[]
  parse_quality_score: number
  parse_warnings: string[]
}

interface WikidataFallback {
  birth_year: number | null
  nationality: string | null
  occupations: string[]
  notable_work: string | null
  era: string | null
}

const USER_AGENT = 'MovieGame/1.0 (admin tool)'
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return await res.json() as T
  } catch {
    return null
  }
}

async function fetchWithRetry(url: string, init: RequestInit = {}, maxAttempts = 4): Promise<Response> {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'User-Agent': USER_AGENT, ...(init.headers ?? {}) },
      })
      if (res.ok) return res
      if (!RETRY_STATUS.has(res.status) || attempt === maxAttempts) return res
      const retryAfter = Number(res.headers.get('retry-after') ?? '')
      const waitMs = Number.isFinite(retryAfter)
        ? Math.max(500, retryAfter * 1000)
        : Math.min(8000, 600 * (2 ** (attempt - 1)))
      await new Promise((resolve) => setTimeout(resolve, waitMs))
      continue
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt === maxAttempts) break
      const waitMs = Math.min(8000, 600 * (2 ** (attempt - 1)))
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
  }
  throw (lastError ?? new Error(`Network request failed for ${url}`))
}

/** Strip wikilinks: [[Target|Label]] → Label, [[Target]] → Target */
function stripLinks(s: string): string {
  return s
    .replace(/\{\{lang\|[^|]+\|([^}]+)\}\}/gi, '$1')
    .replace(/\{\{ill\|([^|}]+)(?:\|[^}]*)?\}\}/gi, '$1')
    .replace(/\{\{([^{}]+)\}\}/g, (_m, inner: string) => {
      const parts = inner.split('|').map((p) => p.trim()).filter(Boolean)
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        if (!parts[i].includes('=')) return ` ${parts[i]} `
      }
      return ''
    })
    .replace(/<br\s*\/?>/gi, ', ')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[\[/g, '')
    .replace(/\]\]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Extract year from strings like "2017", "14 mai 2017", "{{birth year|1977}}" */
function extractYear(s: string): number | null {
  const m = s.match(/\b(1[89]\d{2}|20\d{2})\b/)
  return m ? parseInt(m[1], 10) : null
}

function normalizeValue(s: string | null | undefined): string | null {
  if (!s) return null
  const normalized = s
    .replace(/\b[A-Z]{2,4}-d\b/g, ' ')
    .replace(/([\p{Ll}])([\p{Lu}])/gu, '$1, $2')
    .replace(/\s+/g, ' ')
    .replace(/\s*([,/;:])\s*/g, '$1 ')
    .replace(/,\s*,+/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return normalized || null
}

function normalizeMediaUrl(url: string | null | undefined, lang: string): string | null {
  if (!url) return null
  const v = url.trim()
  if (!v) return null
  if (v.startsWith('//')) return `https:${v}`
  if (v.startsWith('/')) return `https://${lang}.wikipedia.org${v}`
  return v
}

function extractPositiveInteger(raw: string): number | null {
  const clean = stripLinks(raw).replace(/[^\d]/g, '').trim()
  if (!clean) return null
  const n = parseInt(clean, 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function inferBirthYearFromExtract(extract: string | null | undefined): number | null {
  if (!extract) return null
  const normalized = extract.replace(/\u00a0/g, ' ')
  const aroundBirth = normalized.match(/\bné[e]?\b[\s\S]{0,60}?\b(1[5-9]\d{2}|20\d{2})\b/i)
  if (aroundBirth) return parseInt(aroundBirth[1], 10)
  const firstYear = normalized.match(/\b(1[5-9]\d{2}|20\d{2})\b/)
  return firstYear ? parseInt(firstYear[1], 10) : null
}

function applyBirthYearFallback(infobox: WikiInfoboxData, birthYear: number | null): WikiInfoboxData {
  if (!birthYear) return infobox
  if ('roles' in infobox) {
    return { ...infobox, birth_year: infobox.birth_year ?? birthYear }
  }
  if ('clubs' in infobox) {
    return { ...infobox, birth_year: infobox.birth_year ?? birthYear }
  }
  return { ...infobox, birth_year: infobox.birth_year ?? birthYear }
}

/** Detect person type from infobox template name */
function detectPersonType(wikitext: string): WikiPersonType {
  const sportKeywords = [
    'Infobox football biography', 'Infobox sportsperson', 'Infobox rugby biography',
    'Infobox tennis biography', 'Infobox basketball biography', 'Infobox ice hockey player',
    'Infobox cyclist', 'Infobox swimmer', 'Infobox athlete', 'Infobox golfer',
    'Infobox boxer', 'Infobox racing driver', 'Infobox cricketer',
    'Infobox Footballeur', 'Infobox Joueur de tennis',
    'Infobox Basketteur', 'Infobox Joueur de basket-ball', 'Infobox Rugbyman', 'Infobox Cycliste', 'Infobox Nageur',
  ]
  const lower = wikitext.toLowerCase()
  if (sportKeywords.some(k => lower.includes(k.toLowerCase()))) return 'sportsperson'
  const artistKeywords = ['infobox artiste', 'infobox acteur', 'infobox musicien', 'infobox chanteur', 'infobox comedian']
  if (artistKeywords.some(k => lower.includes(k))) return 'artist'
  const scientistKeywords = ['infobox scientifique', 'infobox scientist']
  if (scientistKeywords.some(k => lower.includes(k))) return 'scientist'
  const entrepreneurKeywords = ['infobox entrepreneur', 'infobox businessperson']
  if (entrepreneurKeywords.some(k => lower.includes(k))) return 'entrepreneur'
  const writerKeywords = ['infobox écrivain', 'infobox writer', 'infobox auteur']
  if (writerKeywords.some(k => lower.includes(k))) return 'writer'
  const historicalKeywords = ['infobox monarque', 'infobox monarch', 'infobox military person']
  if (historicalKeywords.some(k => lower.includes(k))) return 'historical_figure'
  // Heuristic fallback for many FR sport infoboxes.
  if (/\|\s*club\d+\s*=/.test(wikitext) || /\|\s*année\d+\s*=/.test(wikitext) || /\|\s*poste\s*=/.test(wikitext)) {
    return 'sportsperson'
  }
  return 'politician'
}

function detectPersonTypeFromSummary(description: string | undefined): WikiPersonType | null {
  const d = (description ?? '').toLowerCase()
  if (!d) return null
  if (/(footballeur|joueur|athlète|sportif|tennis|basket|rugby|cycliste|nageur)/.test(d)) return 'sportsperson'
  if (/(chanteur|chanteuse|acteur|actrice|artiste|musicien|musicienne|rappeur|rappeuse|compositeur)/.test(d)) return 'artist'
  if (/(scientifique|physicien|chimiste|mathématicien|biologiste|astronome)/.test(d)) return 'scientist'
  if (/(entrepreneur|homme d'affaires|femme d'affaires|businessman|businesswoman|investisseur)/.test(d)) return 'entrepreneur'
  if (/(écrivain|ecrivaine|romancier|poète|poete|auteur)/.test(d)) return 'writer'
  if (/(empereur|roi|reine|monarque|personnalité historique|historien antique)/.test(d)) return 'historical_figure'
  if (/(politique|président|premier ministre|ministre|député|sénateur)/.test(d)) return 'politician'
  return null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseInfoboxFields(wikitext: string): Map<string, string> {
  const fields = new Map<string, string>()
  const lines = wikitext.split('\n')
  let currentKey: string | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    const m = line.match(/^\|\s*([^=]+?)\s*=\s*(.*)$/)
    if (m) {
      currentKey = m[1].trim().toLowerCase()
      fields.set(currentKey, m[2].trim())
      continue
    }
    if (currentKey && line && !line.startsWith('|') && !line.startsWith('}}')) {
      const prev = fields.get(currentKey) ?? ''
      fields.set(currentKey, `${prev}\n${line}`.trim())
    }
  }

  return fields
}

function readInfoboxField(fields: Map<string, string>, keys: string[]): string {
  for (const key of keys) {
    const v = fields.get(key.toLowerCase())
    if (v) return v
  }
  return ''
}

function parsePoliticianData(wikitext: string): WikiPoliticianData {
  const roles: WikiRole[] = []
  const fields = parseInfoboxFields(wikitext)

  const officeEntries = [...fields.entries()]
    .filter(([key]) => /^(office|fonction)\d*$/i.test(key))
    .sort((a, b) => {
      const aNum = parseInt(a[0].replace(/^(office|fonction)/i, ''), 10) || 0
      const bNum = parseInt(b[0].replace(/^(office|fonction)/i, ''), 10) || 0
      return aNum - bNum
    })

  for (const [officeKey, officeValue] of officeEntries) {
    const suffix = officeKey.replace(/^(office|fonction)/i, '')
    const title = stripLinks(officeValue).trim()
    if (!title) continue

    const termStart = readInfoboxField(fields, [`term_start${suffix}`, `term start${suffix}`, `début mandat${suffix}`, `mandat début${suffix}`])
      || readInfoboxField(fields, [`à partir du fonction${suffix}`, `depuis le fonction${suffix}`])
    const termEnd = readInfoboxField(fields, [`term_end${suffix}`, `term end${suffix}`, `fin mandat${suffix}`, `mandat fin${suffix}`])
      || readInfoboxField(fields, [`jusqu'au fonction${suffix}`])
    const pred = readInfoboxField(fields, [`predecessor${suffix}`, `prédécesseur${suffix}`, `prédécesseur ${suffix}`])
    const succ = readInfoboxField(fields, [`successor${suffix}`, `successeur${suffix}`, `successeur ${suffix}`])
    const countryRaw = readInfoboxField(fields, [`country${suffix}`, `pays${suffix}`])
    const country = stripLinks(countryRaw).trim() || null

    const titleRedacted = country ? title.replace(new RegExp(country, 'gi'), '[PAYS]') : title

    roles.push({
      title,
      title_redacted: titleRedacted,
      start_year: extractYear(termStart),
      end_year: termEnd.trim() ? extractYear(termEnd) : null,
      country: country || null,
      predecessor: pred.trim() ? stripLinks(pred).trim() : null,
      successor: succ.trim() ? stripLinks(succ).trim() : null,
    })
  }

  const birthYear = extractYear(
    readInfoboxField(fields, ['birth_date', 'date de naissance', 'naissance'])
  )

  const party = stripLinks(readInfoboxField(fields, ['party', 'parti politique', 'parti'])).trim() || null

  const nationality = stripLinks(readInfoboxField(fields, ['nationality', 'nationalité', 'citoyenneté'])).trim() || null

  return { roles: roles.slice(0, 6), party, birth_year: birthYear, nationality }
}

function parseSportspersonData(wikitext: string): WikiSportspersonData {
  const clubs: WikiClub[] = []
  const fields = parseInfoboxFields(wikitext)

  const splitMultiValue = (raw: string): string[] =>
    raw
      .replace(/<br\s*\/?>/gi, '\n')
      .split('\n')
      .map((v) => stripLinks(v).trim())
      .filter(Boolean)

  const extractClubsFromCareerRows = (): WikiClub[] => {
    const rows: WikiClub[] = []
    const lines = wikitext.split('\n')
    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line.startsWith('|') || !/\[\[[^\]]*\|\d{4}\]\]/.test(line)) continue
      const m = line.match(/\[\[[^\]]*\|(?<start>\d{4})\]\](?:\s*-\s*\[\[[^\]]*(?:\|(?<end>\d{4}))?[^\]]*\]\])?\s*\|\s*(?<club>.+?)\s*\|\s*(?<stats>.+)$/)
      if (!m?.groups) continue

      const startYear = parseInt(m.groups.start, 10)
      const endYear = m.groups.end ? parseInt(m.groups.end, 10) : null
      const clubName = stripLinks(m.groups.club).replace(/''/g, '').trim()
      if (!clubName || clubName.length < 2) continue

      const statsClean = stripLinks(m.groups.stats).replace(/\{\{0\}\}/g, '').replace(/\s+/g, ' ').trim()
      const appsMatch = statsClean.match(/\b(\d{1,4})\b/)
      const goalsMatch = statsClean.match(/\((\d{1,4})\)/)

      rows.push({
        name: clubName,
        start_year: Number.isFinite(startYear) ? startYear : null,
        end_year: Number.isFinite(endYear as number) ? endYear : null,
        appearances: appsMatch ? parseInt(appsMatch[1], 10) : null,
        goals: goalsMatch ? parseInt(goalsMatch[1], 10) : null,
      })
    }
    return rows
  }

  // clubs section: | clubs = \n {{fb cl|Club}} \n ...
  const clubsBlock = wikitext.match(/\|\s*clubs\s*=\s*([\s\S]*?)(?=\n\s*\|(?![\s\S]*?\|\s*clubs))/)?.[1] ?? ''
  const yearsBlock = wikitext.match(/\|\s*(?:clubyears|years)\s*=\s*([\s\S]*?)(?=\n\s*\|)/i)?.[1] ?? ''
  const capsBlock = wikitext.match(/\|\s*(?:clubcaps|caps|apps)\s*=\s*([\s\S]*?)(?=\n\s*\|)/i)?.[1] ?? ''
  const goalsBlock = wikitext.match(/\|\s*(?:clubgoals|goals)\s*=\s*([\s\S]*?)(?=\n\s*\|)/i)?.[1] ?? ''

  // Try simpler club extraction from list lines
  const clubLines = clubsBlock.split('\n').map(l => stripLinks(l).trim()).filter(Boolean)
  const yearLines = yearsBlock.split('\n').map(l => l.trim()).filter(Boolean)
  const capsLines = capsBlock.split('\n').map(l => stripLinks(l).replace(/[^\d-]/g, '').trim()).filter(Boolean)
  const goalsLines = goalsBlock.split('\n').map(l => stripLinks(l).replace(/[^\d-]/g, '').trim()).filter(Boolean)

  for (let i = 0; i < clubLines.length; i++) {
    const yearStr = yearLines[i] ?? ''
    const yearRange = yearStr.match(/(\d{4})\s*[-–]\s*(\d{4}|\s*)/)
    const caps = parseInt(capsLines[i] ?? '', 10)
    const goals = parseInt(goalsLines[i] ?? '', 10)
    clubs.push({
      name: clubLines[i],
      start_year: yearRange ? parseInt(yearRange[1], 10) : null,
      end_year: yearRange?.[2]?.trim() ? parseInt(yearRange[2], 10) : null,
      appearances: Number.isFinite(caps) ? caps : null,
      goals: Number.isFinite(goals) ? goals : null,
    })
  }

  // FR/intl fallback: unnumbered club/year lists in `club` + `année` fields.
  const singleClubValues = splitMultiValue(readInfoboxField(fields, ['club', 'clubs']))
  const singleYearValues = splitMultiValue(readInfoboxField(fields, ['année', 'annee', 'years']))
  if (singleClubValues.length > 0) {
    for (let i = 0; i < singleClubValues.length; i++) {
      const clubName = singleClubValues[i]
      const yearsRaw = singleYearValues[i] ?? ''
      if (!clubName) continue
      const yearRange = yearsRaw.match(/(\d{4})\s*[-–]\s*(\d{4}|\s*)/)
      const singleYear = yearsRaw.match(/\b(1[89]\d{2}|20\d{2})\b/)
      clubs.push({
        name: clubName,
        start_year: yearRange ? parseInt(yearRange[1], 10) : (singleYear ? parseInt(singleYear[1], 10) : null),
        end_year: yearRange?.[2]?.trim() ? parseInt(yearRange[2], 10) : null,
        appearances: null,
        goals: null,
      })
    }
  }

  // FR tables fallback: career lines with years | club | stats.
  clubs.push(...extractClubsFromCareerRows())

  // FR fallback: club1/année1/matchs1/buts1 keys are very common.
  const frClubRows = [...fields.entries()].filter(([k]) => /^club\d+$/i.test(k))
  if (frClubRows.length > 0) {
    for (const [key, rawClub] of frClubRows) {
      const idx = key.replace(/club/i, '')
      const clubName = stripLinks(rawClub).trim()
      if (!clubName) continue

      const yearsRaw = readInfoboxField(fields, [`année${idx}`, `years${idx}`])
      const appsRaw = readInfoboxField(fields, [`matchs${idx}`, `apps${idx}`])
      const goalsRaw = readInfoboxField(fields, [`buts${idx}`, `goals${idx}`])

      const yearRange = yearsRaw.match(/(\d{4})\s*[-–]\s*(\d{4}|\s*)/)
      const singleYear = yearsRaw.match(/\b(1[89]\d{2}|20\d{2})\b/)
      const apps = parseInt(stripLinks(appsRaw).replace(/[^\d-]/g, ''), 10)
      const goals = parseInt(stripLinks(goalsRaw).replace(/[^\d-]/g, ''), 10)

      clubs.push({
        name: clubName,
        start_year: yearRange ? parseInt(yearRange[1], 10) : (singleYear ? parseInt(singleYear[1], 10) : null),
        end_year: yearRange?.[2]?.trim() ? parseInt(yearRange[2], 10) : null,
        appearances: Number.isFinite(apps) ? apps : null,
        goals: Number.isFinite(goals) ? goals : null,
      })
    }
  }

  // EN/intl fallback: club1/years1/caps1/goals1 keys.
  const genericClubRows = [...fields.entries()].filter(([k]) => /^clubs?\d+$/i.test(k))
  if (genericClubRows.length > 0) {
    for (const [key, rawClub] of genericClubRows) {
      const idx = key.replace(/^clubs?/i, '')
      const clubName = stripLinks(rawClub).trim()
      if (!clubName) continue

      const yearsRaw = readInfoboxField(fields, [`years${idx}`])
      const appsRaw = readInfoboxField(fields, [`caps${idx}`, `apps${idx}`])
      const goalsRaw = readInfoboxField(fields, [`goals${idx}`])

      const yearRange = yearsRaw.match(/(\d{4})\s*[-–]\s*(\d{4}|\s*)/)
      const singleYear = yearsRaw.match(/\b(1[89]\d{2}|20\d{2})\b/)
      const apps = parseInt(stripLinks(appsRaw).replace(/[^\d-]/g, ''), 10)
      const goals = parseInt(stripLinks(goalsRaw).replace(/[^\d-]/g, ''), 10)

      clubs.push({
        name: clubName,
        start_year: yearRange ? parseInt(yearRange[1], 10) : (singleYear ? parseInt(singleYear[1], 10) : null),
        end_year: yearRange?.[2]?.trim() ? parseInt(yearRange[2], 10) : null,
        appearances: Number.isFinite(apps) ? apps : null,
        goals: Number.isFinite(goals) ? goals : null,
      })
    }
  }

  // De-duplicate clubs collected from multiple infobox styles.
  const dedupedClubs: WikiClub[] = []
  const seenClubs = new Set<string>()
  for (const club of clubs) {
    const key = `${club.name.toLowerCase()}|${club.start_year ?? ''}|${club.end_year ?? ''}`
    if (seenClubs.has(key)) continue
    seenClubs.add(key)
    dedupedClubs.push(club)
  }

  // National team
  const ntRaw = readInfoboxField(fields, ['nationalteam', 'nationalteam1', 'équipe nationale', 'equipe nationale', 'sélection nationale'])
  const ntName = splitMultiValue(ntRaw)[0] ?? ''
  const ntCaps = readInfoboxField(fields, ['nationalcaps', 'nationalcaps1', 'caps sélection', 'caps sélection nationale', 'sélections'])
  const ntGoals = readInfoboxField(fields, ['nationalgoals', 'nationalgoals1', 'goals sélection', 'points sélection'])

  const national_team = ntName && !ntName.toLowerCase().includes('trois colonnes') ? {
    name: ntName,
    caps: ntCaps ? parseInt(stripLinks(ntCaps).replace(/[^\d-]/g, '').trim(), 10) || null : null,
    goals: ntGoals ? parseInt(stripLinks(ntGoals).replace(/[^\d-]/g, '').trim(), 10) || null : null,
  } : null

  const birthYear = extractYear(readInfoboxField(fields, ['birth_date', 'date de naissance', 'naissance']))

  const sport = stripLinks(
    wikitext.match(/\|\s*sport\s*=\s*([^\n|]+)/)?.[1]
      ?? (wikitext.match(/\{\{Infobox\s+Footballeur/i) ? 'Football'
        : wikitext.match(/\{\{Infobox\s+Joueur de tennis/i) ? 'Tennis'
          : wikitext.match(/\{\{Infobox\s+Basketteur/i) ? 'Basket-ball'
            : 'Sport')
  ).trim()
  const isTennisProfile = /tennis/i.test(sport)

  const cleanedClubs = dedupedClubs
    .map((club) => ({
      ...club,
      name: normalizeValue(
        club.name
          .replace(/^[|:•\s]+/, '')
          .replace(/\bFichier:[^|,\n]+/gi, '')
          .replace(/\s{2,}/g, ' ')
      ) ?? '',
    }))
    .filter((club) => club.name.length > 1)

  const position = stripLinks(
    wikitext.match(/\|\s*(?:position|poste)\s*=\s*([^\n|]+)/i)?.[1] ?? ''
  ).trim() || null

  const nationality = stripLinks(readInfoboxField(fields, ['nationality', 'nationalité', 'nation sportive'])).trim() || null

  const careerHighlights: Array<{ label: string; value: string }> = []
  const pushHighlight = (label: string, value: string | null) => {
    const v = normalizeValue(value)
    if (!v) return
    if (careerHighlights.some((h) => h.label === label && h.value === v)) return
    careerHighlights.push({ label, value: v })
  }
  const singlesTitles = extractPositiveInteger(readInfoboxField(fields, ['singlestitles', 'titres en simple', 'titres simple']))
  const doublesTitles = extractPositiveInteger(readInfoboxField(fields, ['doublestitles', 'titres en double', 'titres double']))
  const highestSingles = normalizeValue(stripLinks(readInfoboxField(fields, ['highestsinglesranking', 'meilleur classement en simple', 'classement simple'])))
  const highestDoubles = normalizeValue(stripLinks(readInfoboxField(fields, ['highestdoublesranking', 'meilleur classement en double', 'classement double'])))
  const turnedPro = normalizeValue(stripLinks(readInfoboxField(fields, ['turnedpro', 'début carrière pro', 'debut carriere pro'])))

  if (singlesTitles != null) pushHighlight('Titres en simple', String(singlesTitles))
  if (doublesTitles != null) pushHighlight('Titres en double', String(doublesTitles))
  pushHighlight('Meilleur classement simple', highestSingles)
  pushHighlight('Meilleur classement double', highestDoubles)
  pushHighlight('Début carrière pro', turnedPro)

  return {
    sport: sport || 'Football',
    position,
    clubs: isTennisProfile ? [] : cleanedClubs.slice(0, 8),
    career_highlights: careerHighlights.slice(0, 6),
    national_team,
    birth_year: birthYear,
    nationality,
  }
}

function parseGenericData(wikitext: string, domain: string): WikiGenericData {
  const fields = parseInfoboxFields(wikitext)
  const birthYear = extractYear(readInfoboxField(fields, ['birth_date', 'date de naissance', 'naissance']))
  const nationality = stripLinks(readInfoboxField(fields, ['nationality', 'nationalité', 'citoyenneté'])).trim() || null
  const notableWork = stripLinks(
    readInfoboxField(fields, ['known_for', 'notable_works', 'œuvres principales', 'ouvrages principaux', 'occupation'])
  ).trim() || null
  const era = stripLinks(readInfoboxField(fields, ['era', 'période', 'period'])).trim() || null
  return {
    domain,
    notable_work: notableWork,
    era,
    birth_year: birthYear,
    nationality,
  }
}

async function fetchWikidataEntityId(slug: string, lang: string): Promise<string | null> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(slug)}&format=json&formatversion=2`
  const res = await fetchWithRetry(url)
  if (!res.ok) return null
  const json = await safeJson<{
    query?: { pages?: Array<{ pageprops?: { wikibase_item?: string } }> }
  }>(res)
  if (!json) return null
  return json.query?.pages?.[0]?.pageprops?.wikibase_item ?? null
}

async function fetchWikidataFallback(entityId: string, lang: string): Promise<WikidataFallback | null> {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(entityId)}&props=labels|claims&languages=${encodeURIComponent(lang)}|en&format=json`
  const res = await fetchWithRetry(url)
  if (!res.ok) return null
  const json = await safeJson<{
    entities?: Record<string, {
      claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>
    }>
  }>(res)
  if (!json) return null
  const entity = json.entities?.[entityId]
  const claims = entity?.claims
  if (!claims) return null

  const readTimeYear = (pid: string): number | null => {
    const time = claims[pid]?.[0]?.mainsnak?.datavalue?.value as { time?: string } | undefined
    return time?.time ? extractYear(time.time) : null
  }
  const readEntityIds = (pid: string): string[] =>
    (claims[pid] ?? [])
      .map((c) => (c.mainsnak?.datavalue?.value as { id?: string } | undefined)?.id ?? null)
      .filter((id): id is string => !!id)

  const occupationIds = readEntityIds('P106')
  const nationalityIds = readEntityIds('P27')
  const notableWorkIds = readEntityIds('P800')
  const birthYear = readTimeYear('P569')

  const labelFor = async (ids: string[]): Promise<string[]> => {
    if (ids.length === 0) return []
    const idsChunk = ids.slice(0, 8).join('|')
    const entitiesUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(idsChunk)}&props=labels&languages=${encodeURIComponent(lang)}|en&format=json`
    const r = await fetchWithRetry(entitiesUrl)
    if (!r.ok) return []
    const j = await safeJson<{
      entities?: Record<string, { labels?: Record<string, { value: string }> }>
    }>(r)
    if (!j) return []
    return ids
      .map((id) => j.entities?.[id]?.labels?.[lang]?.value ?? j.entities?.[id]?.labels?.en?.value ?? null)
      .filter((v): v is string => !!v)
      .map((v) => normalizeValue(v) ?? '')
      .filter(Boolean)
  }

  const [occupationLabels, nationalityLabels, notableWorkLabels] = await Promise.all([
    labelFor(occupationIds),
    labelFor(nationalityIds),
    labelFor(notableWorkIds),
  ])

  return {
    birth_year: birthYear,
    nationality: normalizeValue(nationalityLabels[0] ?? null),
    occupations: occupationLabels,
    notable_work: normalizeValue(notableWorkLabels[0] ?? null),
    era: null,
  }
}

async function fetchWikipediaImageFallback(slug: string, lang: string): Promise<string | null> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(slug)}&prop=pageimages&piprop=original|thumbnail&pithumbsize=1000&format=json&formatversion=2`
  const res = await fetchWithRetry(url)
  if (!res.ok) return null
  const json = await safeJson<{
    query?: {
      pages?: Array<{
        original?: { source?: string }
        thumbnail?: { source?: string }
      }>
    }
  }>(res)
  if (!json) return null
  const page = json.query?.pages?.[0]
  return normalizeMediaUrl(page?.original?.source ?? page?.thumbnail?.source ?? null, lang)
}

function inferTypeFromWikidataOccupations(occupations: string[]): WikiPersonType | null {
  const lower = occupations.map((o) => o.toLowerCase())
  if (lower.some((o) => /(football|athl|tennis|basket|sport|joueur|player|coureur|nageur|rugby)/.test(o))) return 'sportsperson'
  if (lower.some((o) => /(singer|actor|actrice|acteur|artist|artiste|musician|musicien|rappeur|composer)/.test(o))) return 'artist'
  if (lower.some((o) => /(scientist|scientifique|physicien|chimiste|mathématicien|mathematician|biologiste)/.test(o))) return 'scientist'
  if (lower.some((o) => /(entrepreneur|business|investor|industriel|chef d'entreprise)/.test(o))) return 'entrepreneur'
  if (lower.some((o) => /(writer|écrivain|author|auteur|poet|poète|romancier)/.test(o))) return 'writer'
  if (lower.some((o) => /(politician|politique|ministre|président|député|sénateur|monarque|empereur|roi|reine)/.test(o))) return 'politician'
  return null
}

function applyWikidataFallback(
  personType: WikiPersonType,
  infobox: WikiInfoboxData,
  fallback: WikidataFallback | null
): { personType: WikiPersonType; infobox: WikiInfoboxData } {
  if (!fallback) return { personType, infobox }
  const inferred = inferTypeFromWikidataOccupations(fallback.occupations)
  const resolvedType = inferred ?? personType

  if (resolvedType === 'politician') {
    const p = infobox as Partial<WikiPoliticianData>
    return {
      personType: resolvedType,
      infobox: {
        roles: p.roles ?? [],
        party: normalizeValue(p.party ?? null),
        birth_year: p.birth_year ?? fallback.birth_year,
        nationality: normalizeValue(p.nationality ?? fallback.nationality),
      },
    }
  }
  if (resolvedType === 'sportsperson') {
    const s = infobox as Partial<WikiSportspersonData>
    return {
      personType: resolvedType,
      infobox: {
        sport: normalizeValue(s.sport ?? null),
        position: normalizeValue(s.position ?? null),
        clubs: s.clubs ?? [],
        career_highlights: s.career_highlights ?? [],
        national_team: s.national_team ?? null,
        birth_year: s.birth_year ?? fallback.birth_year,
        nationality: normalizeValue(s.nationality ?? fallback.nationality),
      },
    }
  }
  const g = infobox as Partial<WikiGenericData>
  const fallbackDomain = (() => {
    if (resolvedType === 'artist') return 'Art'
    if (resolvedType === 'scientist') return 'Science'
    if (resolvedType === 'entrepreneur') return 'Entrepreneuriat'
    if (resolvedType === 'writer') return 'Littérature'
    return 'Histoire'
  })()
  return {
    personType: resolvedType,
    infobox: {
      domain: normalizeValue(g.domain ?? fallbackDomain),
      notable_work: normalizeValue(g.notable_work ?? fallback.notable_work),
      era: normalizeValue(g.era ?? fallback.era),
      birth_year: g.birth_year ?? fallback.birth_year,
      nationality: normalizeValue(g.nationality ?? fallback.nationality),
    },
  }
}

function defaultHintSchedule(personType: WikiPersonType): string[] {
  if (personType === 'politician') {
    return ['birth_year', 'nationality', 'party', 'name_initials', 'name_length']
  }
  if (personType === 'sportsperson') {
    return ['birth_year', 'nationality', 'position', 'name_initials', 'name_length']
  }
  return ['birth_year', 'nationality', 'domain', 'notable_work', 'name_initials']
}

function evaluateParseQuality(
  personType: WikiPersonType,
  infoboxData: WikiInfoboxData,
  hasPhoto: boolean
): { score: number; warnings: string[] } {
  let score = 100
  const warnings: string[] = []

  if (!hasPhoto) {
    score -= 10
    warnings.push('Photo absente')
  }

  if (personType === 'politician') {
    const p = infoboxData as WikiPoliticianData
    if ((p.roles ?? []).length === 0) { score -= 40; warnings.push('Aucune fonction politique extraite') }
    if (!p.birth_year) { score -= 20; warnings.push('Année de naissance manquante') }
    if (!p.nationality) { score -= 15; warnings.push('Nationalité manquante') }
    if (!p.party) { score -= 10; warnings.push('Parti manquant') }
  } else if (personType === 'sportsperson') {
    const s = infoboxData as WikiSportspersonData
    const isTennisProfile = /tennis/i.test(s.sport ?? '')
    const hasCareerData = (s.clubs ?? []).length > 0 || (s.career_highlights ?? []).length > 0
    if (!hasCareerData) { score -= 35; warnings.push('Aucune carrière sportive extraite') }
    if (!isTennisProfile && !s.position) { score -= 15; warnings.push('Poste manquant') }
    if (!s.birth_year) { score -= 20; warnings.push('Année de naissance manquante') }
    if (!s.nationality) { score -= 15; warnings.push('Nationalité manquante') }
  } else {
    const g = infoboxData as WikiGenericData
    if (!g.domain) { score -= 20; warnings.push('Domaine manquant') }
    if (!g.notable_work) { score -= 20; warnings.push('Oeuvre/Fait notable manquant') }
    if (!g.birth_year) { score -= 20; warnings.push('Année de naissance manquante') }
    if (!g.nationality) { score -= 15; warnings.push('Nationalité manquante') }
  }

  return { score: Math.max(0, score), warnings }
}

export async function fetchWikipediaData(slug: string, lang = 'fr'): Promise<WikiFetchResult> {
  // 1. Summary (extract + thumbnail)
  const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`
  const summaryRes = await fetchWithRetry(summaryUrl)
  if (!summaryRes.ok) throw new Error(`Wikipedia summary fetch failed: ${summaryRes.status}`)
  const summary = await safeJson<{
    title: string
    extract: string
    description?: string
    thumbnail?: { source: string }
    originalimage?: { source: string }
    content_urls?: { desktop?: { page?: string } }
  }>(summaryRes)
  if (!summary) throw new Error('Wikipedia summary parse failed')

  // 2. Wikitext (infobox)
  const wikitextUrl = `https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(slug)}&prop=wikitext&format=json&formatversion=2`
  const wikitextRes = await fetchWithRetry(wikitextUrl)
  if (!wikitextRes.ok) throw new Error(`Wikipedia wikitext fetch failed: ${wikitextRes.status}`)
  const wikitextJson = await safeJson<{ parse?: { wikitext: string } }>(wikitextRes)
  if (!wikitextJson) throw new Error('Wikipedia wikitext parse failed')
  const wikitext = wikitextJson.parse?.wikitext ?? ''

  let resolvedPhotoUrl = normalizeMediaUrl(
    summary.originalimage?.source ?? summary.thumbnail?.source ?? null,
    lang
  )
  if (!resolvedPhotoUrl) {
    try {
      resolvedPhotoUrl = await fetchWikipediaImageFallback(slug, lang)
    } catch {
      resolvedPhotoUrl = null
    }
  }

  let wikidata: WikidataFallback | null = null
  try {
    const entityId = await fetchWikidataEntityId(slug, lang)
    if (entityId) wikidata = await fetchWikidataFallback(entityId, lang)
  } catch {
    wikidata = null
  }

  const wikidataType = wikidata ? inferTypeFromWikidataOccupations(wikidata.occupations) : null
  let personType = wikidataType ?? detectPersonTypeFromSummary(summary.description) ?? detectPersonType(wikitext)
  let infobox_data: WikiInfoboxData = personType === 'politician'
    ? parsePoliticianData(wikitext)
    : personType === 'sportsperson'
      ? parseSportspersonData(wikitext)
      : personType === 'artist'
        ? parseGenericData(wikitext, 'Art')
        : personType === 'scientist'
          ? parseGenericData(wikitext, 'Science')
          : personType === 'entrepreneur'
            ? parseGenericData(wikitext, 'Entrepreneuriat')
            : personType === 'writer'
              ? parseGenericData(wikitext, 'Littérature')
              : parseGenericData(wikitext, 'Histoire')

  // 3. Apply structured Wikidata fallback for fragile/missing fields.
  const resolved = applyWikidataFallback(personType, infobox_data, wikidata)
  personType = resolved.personType
  infobox_data = applyBirthYearFallback(
    resolved.infobox,
    inferBirthYearFromExtract(summary.extract)
  )

  const quality = evaluateParseQuality(personType, infobox_data, !!resolvedPhotoUrl)

  return {
    name: summary.title,
    extract: summary.extract?.slice(0, 500) || null,
    photo_url: resolvedPhotoUrl,
    wikipedia_url: summary.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(slug)}`,
    infobox_data,
    person_type: personType,
    hint_schedule: defaultHintSchedule(personType),
    parse_quality_score: quality.score,
    parse_warnings: quality.warnings,
  }
}
