/**
 * wikipedia.ts
 * Fetches and parses Wikipedia infobox data for wiki_persons.
 * Called only from admin routes — never during gameplay.
 */

import { LRUCache } from 'lru-cache'
import { commonsFilenameToUploadThumbUrl } from './commonsThumb.js'

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
  | 'generic'

export interface WikiGenericData {
  domain: string | null
  notable_work: string | null
  era: string | null
  birth_year: number | null
  nationality: string | null
  /** Entreprises / organisations (surtout type entrepreneur), distinct de notable_work */
  company: string | null
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
  /** Titre page avec underscores (redirections résolues) — préférer pour `wikipedia_slug`. */
  canonical_wikipedia_slug: string
}

interface WikidataP39Role {
  title: string
  start_year: number | null
  end_year: number | null
}

interface WikidataFallback {
  birth_year: number | null
  nationality: string | null
  occupations: string[]
  notable_work: string | null
  notable_work_labels: string[]
  employer_labels: string[]
  era: string | null
  languages: string[]
  fields_of_work: string[]
  p39_roles: WikidataP39Role[]
  photo_url: string | null
}

const USER_AGENT = 'MovieGame/1.0 (admin tool)'
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])
const REQUEST_TIMEOUT_MS = 15_000
const wikiCache = new LRUCache<string, WikiFetchResult>({
  max: 500,
  ttl: 1000 * 60 * 60, // 1 heure
})
let lastWikiCall = 0
const WIKI_MIN_INTERVAL = 1000 // 1s

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
      const signal = init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      const res = await fetch(url, {
        ...init,
        signal,
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

async function throttledFetch(url: string, init?: RequestInit): Promise<Response> {
  const now = Date.now()
  const wait = lastWikiCall + WIKI_MIN_INTERVAL - now
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastWikiCall = Date.now()
  return fetchWithRetry(url, init)
}

/** Strip wikilinks: [[Target|Label]] → Label, [[Target]] → Target */
function stripLinks(s: string): string {
  return s
    // Remove pure-decoration templates (flags, icons) — must come first
    .replace(/\{\{(?:Drapeau|Flag|Flagicon|Country flag|Football country|Fb|Fball|Fbicon|Sport country|Country|Pays)[^}]*\}\}/gi, '')
    .replace(/\{\{0\}\}/g, '')
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

/** Extract a year range from raw wikitext like "1992-1995", "[[1992]]-[[1995]]", "2003–" */
function extractYearRange(raw: string): { start: number | null; end: number | null } {
  const years = raw.match(/\b(1[89]\d{2}|20\d{2})\b/g)
  if (!years || years.length === 0) return { start: null, end: null }
  return {
    start: parseInt(years[0], 10),
    end: years.length > 1 ? parseInt(years[1], 10) : null,
  }
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
    .replace(/(\p{Ll}{4,})(\p{Lu}\p{Ll}{2,})/gu, '$1, $2')
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

/** Resize a Wikimedia Commons thumb URL to a target pixel width. */
function upscaleWikimediaThumb(url: string | null | undefined, targetWidth: number): string | null {
  if (!url) return null
  const normalized = url.startsWith('//') ? `https:${url}` : url
  // Pattern: .../thumb/x/xx/File.jpg/320px-File.jpg
  return normalized.replace(/\/(\d+)px-([^/]+)$/, `/${targetWidth}px-$2`)
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

function inferEraFromExtract(extract: string | null | undefined): string | null {
  if (!extract) return null
  const years = extract.match(/\b(1[5-9]\d{2}|20\d{2})\b/g)
  if (!years || years.length < 2) return null
  const start = parseInt(years[0], 10)
  const end = parseInt(years[1], 10)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null
  return `${start}–${end}`
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
  const lower = wikitext.toLowerCase()
  const sportKeywords = [
    'infobox football biography', 'infobox sportsperson', 'infobox rugby biography',
    'infobox tennis biography', 'infobox basketball biography', 'infobox ice hockey player',
    'infobox cyclist', 'infobox swimmer', 'infobox athlete', 'infobox golfer',
    'infobox boxer', 'infobox racing driver', 'infobox cricketer', 'infobox baseball biography',
    'infobox volleyballer', 'infobox handball player',
    'infobox footballeur', 'infobox joueur de tennis', 'infobox joueur de basket-ball',
    'infobox basketteur', 'infobox rugbyman', 'infobox cycliste', 'infobox nageur',
    'infobox sportif',
  ]
  if (sportKeywords.some(k => lower.includes(k))) return 'sportsperson'
  const politicianKeywords = [
    'infobox personnalité politique', 'infobox politicien', 'infobox politician',
    'infobox officeholder', 'infobox government official', 'infobox président',
    'infobox premier ministre', 'infobox ministre', 'infobox chef d\'état',
  ]
  if (politicianKeywords.some(k => lower.includes(k))) return 'politician'
  const artistKeywords = [
    'infobox artiste', 'infobox acteur', 'infobox musicien', 'infobox chanteur',
    'infobox comedian', 'infobox actor', 'infobox singer', 'infobox musician',
    'infobox entertainer', 'infobox artist', 'infobox réalisateur', 'infobox director',
  ]
  if (artistKeywords.some(k => lower.includes(k))) return 'artist'
  const scientistKeywords = [
    'infobox scientifique', 'infobox scientist', 'infobox academic',
    'infobox mathematician', 'infobox philosopher',
  ]
  if (scientistKeywords.some(k => lower.includes(k))) return 'scientist'
  const entrepreneurKeywords = [
    'infobox entrepreneur', 'infobox businessperson', 'infobox business magnate',
    'infobox chef d\'entreprise',
  ]
  if (entrepreneurKeywords.some(k => lower.includes(k))) return 'entrepreneur'
  const writerKeywords = [
    'infobox écrivain', 'infobox writer', 'infobox auteur', 'infobox author',
    'infobox poet', 'infobox poète',
  ]
  if (writerKeywords.some(k => lower.includes(k))) return 'writer'
  const historicalKeywords = [
    'infobox monarque', 'infobox monarch', 'infobox military person',
    'infobox noble', 'infobox royalty', 'infobox emperor', 'infobox pope',
  ]
  if (historicalKeywords.some(k => lower.includes(k))) return 'historical_figure'
  // Heuristics based on infobox field presence
  if (/\|\s*club\d+\s*=/.test(wikitext) || /\|\s*année\d+\s*=/.test(wikitext) || /\|\s*poste\s*=/.test(wikitext)) {
    return 'sportsperson'
  }
  if (/\|\s*(?:office|fonction)\d*\s*=/.test(wikitext)) return 'politician'
  return 'generic'
}

function detectPersonTypeFromSummary(description: string | undefined): WikiPersonType | null {
  const d = (description ?? '').toLowerCase()
  if (!d) return null
  if (/(activiste|militant|militante|écologiste|ecologiste|climate activist|environmental activist|human rights activist)/.test(d)) return 'generic'
  if (/(footballeu[rs]e?|joueu[rs]e?|athlète|sportif|sportive|tennis|basket|rugby|cycliste|nageuse?|handballeu[rs]e?|volleyballer|boxeu[rs]e?)/.test(d)) return 'sportsperson'
  if (/(chanteu[rs]e?|acteu[rs]|actrice|artiste|musicien|musicienne|rappeu[rs]e?|compositeu[rs]e?|réalisateu[rs]e?|comédien|comédienne)/.test(d)) return 'artist'
  if (/(scientifique|physicien|chimiste|mathématicien|biologiste|astronome|informaticien|ingénieur)/.test(d)) return 'scientist'
  if (/(entrepreneur|homme d'affaires|femme d'affaires|businessman|businesswoman|investisseur|chef d'entreprise|dirigeant)/.test(d)) return 'entrepreneur'
  if (/(écrivain|écrivaine|romancier|romancière|poète|poétesse|auteur|auteure|dramaturge|journaliste)/.test(d)) return 'writer'
  if (/(empereur|impératrice|roi|reine|monarque|personnalité historique|duc|duchesse|prince|princesse|sultan|pape|pharaon)/.test(d)) return 'historical_figure'
  if (/(homme politique|femme politique|président|présidente|premier ministre|ministre|député|sénateur|maire|gouverneur|chancelier)/.test(d)) return 'politician'
  return null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Net {{…}} depth — values with nested templates keep absorbing `|foo=` lines until balanced. */
function wikiTemplateDepth(s: string): number {
  let d = 0
  let i = 0
  while (i < s.length) {
    if (s.slice(i, i + 2) === '{{') {
      d += 1
      i += 2
      continue
    }
    if (s.slice(i, i + 2) === '}}') {
      d = Math.max(0, d - 1)
      i += 2
      continue
    }
    i += 1
  }
  return d
}

// Mapping FIFA-like trigram → libellé de sélection senior (FR Wikipedia inscrit
// souvent {{XXX football}} pour la sélection majeure).
const FR_FOOTBALL_TRIGRAM_TO_TEAM: Record<string, string> = {
  ARG: 'Argentine', BRA: 'Brésil', FRA: 'France', ESP: 'Espagne', ITA: 'Italie',
  GER: 'Allemagne', DEU: 'Allemagne', ALL: 'Allemagne', POR: 'Portugal', NED: 'Pays-Bas',
  BEL: 'Belgique', ENG: 'Angleterre', SCO: 'Écosse', WAL: 'Pays de Galles',
  USA: 'États-Unis', MEX: 'Mexique', URU: 'Uruguay', COL: 'Colombie', CHI: 'Chili',
  PER: 'Pérou', PAR: 'Paraguay', ECU: 'Équateur', BOL: 'Bolivie', VEN: 'Venezuela',
  CRO: 'Croatie', POL: 'Pologne', SWE: 'Suède', NOR: 'Norvège', DEN: 'Danemark',
  SUI: 'Suisse', AUT: 'Autriche', CZE: 'République tchèque', SVK: 'Slovaquie',
  GRE: 'Grèce', TUR: 'Turquie', RUS: 'Russie', UKR: 'Ukraine', SRB: 'Serbie',
  HUN: 'Hongrie', ROU: 'Roumanie', JPN: 'Japon', KOR: 'Corée du Sud', CHN: 'Chine',
  AUS: 'Australie', NGA: 'Nigeria', SEN: 'Sénégal', CIV: 'Côte d’Ivoire',
  MAR: 'Maroc', TUN: 'Tunisie', ALG: 'Algérie', EGY: 'Égypte', CMR: 'Cameroun',
  GHA: 'Ghana', RSA: 'Afrique du Sud', IRL: 'Irlande', NIR: 'Irlande du Nord',
  CAN: 'Canada', JAM: 'Jamaïque',
}

function parseFrenchTroisColonnesNationalTeam(
  wikitext: string,
): { name: string; caps: number | null; goals: number | null } | null {
  const headerRe = /\|\s*s[ée]lection\s*nationale\s*=\s*\{\{\s*trois\s*colonnes/i
  const m = headerRe.exec(wikitext)
  if (!m) return null
  let depth = 0
  let i = m.index + m[0].lastIndexOf('{{')
  let endIdx = -1
  for (; i < wikitext.length; i++) {
    if (wikitext.slice(i, i + 2) === '{{') {
      depth++
      i++
    } else if (wikitext.slice(i, i + 2) === '}}') {
      depth--
      i++
      if (depth === 0) {
        endIdx = i + 1
        break
      }
    }
  }
  if (endIdx < 0) return null
  const block = wikitext.slice(m.index, endIdx)
  const isYouth = (s: string) =>
    /(moins\s*de|U[\s-]?\d{1,2}|espoirs|jeunes|junior|olymp)/i.test(s)

  const extractTeamName = (line: string): string | null => {
    const piped = line.match(/\[\[\s*Équipe[^\]]*?\|([^\]]+?)\s*\]\]/i)
    if (piped) return piped[1].trim()
    const direct = line.match(/\[\[\s*Équipe\s+(?:d['’]|du\s|de\s|des\s)([^\]|]+?)\s*\]\]/i)
    if (direct) return direct[1].trim()
    const trigram = line.match(/\{\{\s*([A-Z]{2,3})\s+football\s*\}\}/)
    if (trigram) {
      const code = trigram[1].toUpperCase()
      return FR_FOOTBALL_TRIGRAM_TO_TEAM[code] ?? code
    }
    return null
  }

  // Choisit la ligne dont la sélection est senior + caps maximales (proxy pour senior).
  const lines = block.split('\n')
  let best: { name: string; caps: number | null; goals: number | null } | null = null
  for (const line of lines) {
    if (isYouth(line)) continue
    const name = extractTeamName(line)
    if (!name) continue
    const nums = line.match(/(\d{1,4})\s*\(\s*(\d{1,4})\s*\)/)
    const caps = nums ? parseInt(nums[1], 10) : null
    const goals = nums ? parseInt(nums[2], 10) : null
    if (!best || (caps ?? 0) > (best.caps ?? 0)) {
      best = { name, caps, goals }
    }
  }
  return best
}

function parseInfoboxFields(wikitext: string): Map<string, string> {
  const fields = new Map<string, string>()
  const lines = wikitext.split('\n')
  let currentKey: string | null = null

  for (const rawLine of lines) {
    const trimmedEnd = rawLine.trimEnd()
    const trimmed = trimmedEnd.trim()
    const m = trimmed.match(/^\|\s*([^=]+?)\s*=\s*(.*)$/)
    if (m) {
      if (currentKey && wikiTemplateDepth(fields.get(currentKey) ?? '') > 0) {
        const prev = fields.get(currentKey) ?? ''
        fields.set(currentKey, `${prev}\n${trimmedEnd}`.trim())
        continue
      }
      currentKey = m[1].trim().toLowerCase()
      fields.set(currentKey, m[2].trim())
      continue
    }
    if (currentKey && trimmed && !trimmed.startsWith('}}')) {
      const prev = fields.get(currentKey) ?? ''
      fields.set(currentKey, `${prev}\n${trimmedEnd}`.trim())
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
    .filter(([key]) => /^(office|fonction|mandat|charge)\d*$/i.test(key))
    .sort((a, b) => {
      const num = (k: string) =>
        parseInt(k.replace(/^(office|fonction|mandat|charge)/i, ''), 10) || 0
      return num(a[0]) - num(b[0])
    })

  for (const [officeKey, officeValue] of officeEntries) {
    const suffix = officeKey.replace(/^(office|fonction|mandat|charge)/i, '')
    const title = stripLinks(officeValue).trim()
    if (!title) continue

    const termStart = readInfoboxField(fields, [
      `term_start${suffix}`, `term start${suffix}`, `début mandat${suffix}`, `mandat début${suffix}`,
      `start${suffix}`, `from${suffix}`, `début${suffix}`, `début de fonction${suffix}`,
    ])
      || readInfoboxField(fields, [`à partir du fonction${suffix}`, `depuis le fonction${suffix}`])
    const termEnd = readInfoboxField(fields, [
      `term_end${suffix}`, `term end${suffix}`, `fin mandat${suffix}`, `mandat fin${suffix}`,
      `end${suffix}`, `until${suffix}`, `fin${suffix}`, `fin de fonction${suffix}`,
    ])
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
      if (!line.startsWith('|')) continue

      // Pattern A: [[link|2002]]-[[link|2003]] | Club | stats (EN/intl format)
      if (/\[\[[^\]]*\|\d{4}\]\]/.test(line)) {
        const m = line.match(/\[\[[^\]]*\|(?<start>\d{4})\]\](?:\s*[-–]\s*\[\[[^\]]*(?:\|(?<end>\d{4}))?[^\]]*\]\])?\s*\|\s*(?<club>.+?)\s*\|\s*(?<stats>.+)$/)
        if (m?.groups) {
          const clubName = stripLinks(m.groups.club).replace(/''/g, '').trim()
          if (clubName.length >= 2) {
            const statsClean = stripLinks(m.groups.stats).replace(/\s+/g, ' ').trim()
            rows.push({
              name: clubName,
              start_year: parseInt(m.groups.start, 10),
              end_year: m.groups.end ? parseInt(m.groups.end, 10) : null,
              appearances: statsClean.match(/\b(\d{1,4})\b/)?.[1] ? parseInt(statsClean.match(/\b(\d{1,4})\b/)![1], 10) : null,
              goals: statsClean.match(/\((\d{1,4})\)/)?.[1] ? parseInt(statsClean.match(/\((\d{1,4})\)/)![1], 10) : null,
            })
          }
          continue
        }
      }

      // Pattern B: | 1992-1995 | [[Club]] | apps | (goals)  (FR Wikipedia career table rows)
      const mFr = line.match(/^\|\s*((?:1[89]\d{2}|20\d{2})[\s\S]{0,20}?(?:1[89]\d{2}|20\d{2})?)\s*\|\s*([^|]{3,60}?)\s*\|\s*(\d{1,4})\s*\|\s*\(?(\d{1,4})\)?/)
      if (mFr) {
        const clubName = stripLinks(mFr[2]).replace(/''/g, '').trim()
        if (clubName.length >= 2 && !/^\d+$/.test(clubName)) {
          const { start, end } = extractYearRange(mFr[1])
          rows.push({
            name: clubName,
            start_year: start,
            end_year: end,
            appearances: parseInt(mFr[3], 10),
            goals: parseInt(mFr[4], 10),
          })
        }
      }
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
      const { start, end } = extractYearRange(yearsRaw)
      clubs.push({
        name: clubName,
        start_year: start,
        end_year: end,
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

      const { start, end } = extractYearRange(yearsRaw)
      const apps = parseInt(stripLinks(appsRaw).replace(/[^\d-]/g, ''), 10)
      const goals = parseInt(stripLinks(goalsRaw).replace(/[^\d]/g, ''), 10)

      clubs.push({
        name: clubName,
        start_year: start,
        end_year: end,
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

      const { start, end } = extractYearRange(yearsRaw)
      const apps = parseInt(stripLinks(appsRaw).replace(/[^\d-]/g, ''), 10)
      const goals = parseInt(stripLinks(goalsRaw).replace(/[^\d]/g, ''), 10)

      clubs.push({
        name: clubName,
        start_year: start,
        end_year: end,
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

  // National team — look for the senior/main national team (highest numbered entry or explicit field)
  // FR infobox: sélection1, sélection2, matchs-sélection1, buts-sélection1
  // EN infobox: nationalteam1, nationalcaps1, nationalgoals1
  const findNationalTeam = (): { name: string; caps: number | null; goals: number | null } | null => {
    // Certains profils FR encapsulent les sélections dans un template `{{trois colonnes ...}}`
    // (ex: Lionel Messi). On le parse explicitement avant les autres fallbacks.
    const fromTroisColonnes = parseFrenchTroisColonnesNationalTeam(wikitext)
    if (fromTroisColonnes) return fromTroisColonnes

    // Try numbered sélection fields (FR), pick the last/highest (most likely senior team)
    const selKeys = [...fields.keys()].filter(k => /^sélection\d*$/.test(k) || /^selection\d*$/.test(k))
    if (selKeys.length > 0) {
      selKeys.sort((a, b) => {
        const na = parseInt(a.replace(/\D/g, '') || '0', 10)
        const nb = parseInt(b.replace(/\D/g, '') || '0', 10)
        return nb - na
      })
      // Pick the senior national team (last alphabetically numbered, typically highest index)
      for (const sk of selKeys) {
        const name = stripLinks(fields.get(sk) ?? '').trim()
        if (!name || name.toLowerCase().includes('moins') || name.toLowerCase().includes('-15') || name.toLowerCase().includes('-17') || name.toLowerCase().includes('-20') || name.toLowerCase().includes('-21') || name.toLowerCase().includes('-23')) continue
        const idx = sk.replace(/\D/g, '')
        const capsRaw = readInfoboxField(fields, [`matchs-sélection${idx}`, `caps-sélection${idx}`, `nationalcaps${idx}`, `sélections${idx}`])
        const goalsRaw = readInfoboxField(fields, [`buts-sélection${idx}`, `goals-sélection${idx}`, `nationalgoals${idx}`])
        return {
          name,
          caps: capsRaw ? parseInt(stripLinks(capsRaw).replace(/[^\d]/g, ''), 10) || null : null,
          goals: goalsRaw ? parseInt(stripLinks(goalsRaw).replace(/[^\d]/g, ''), 10) || null : null,
        }
      }
    }
    // EN fallback
    const ntRaw = readInfoboxField(fields, ['nationalteam', 'nationalteam1', 'équipe nationale', 'equipe nationale', 'sélection nationale'])
    const ntName = splitMultiValue(ntRaw)[0] ?? ''
    if (!ntName || ntName.toLowerCase().includes('trois colonnes')) return null
    const ntCaps = readInfoboxField(fields, ['nationalcaps', 'nationalcaps1', 'caps sélection', 'sélections'])
    const ntGoals = readInfoboxField(fields, ['nationalgoals', 'nationalgoals1', 'goals sélection'])
    return {
      name: ntName,
      caps: ntCaps ? parseInt(stripLinks(ntCaps).replace(/[^\d]/g, '').trim(), 10) || null : null,
      goals: ntGoals ? parseInt(stripLinks(ntGoals).replace(/[^\d]/g, '').trim(), 10) || null : null,
    }
  }
  const national_team = findNationalTeam()

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
  const extractCompactField = (raw: string, maxLines = 2, maxLen = 180): string => {
    const lines = raw
      .replace(/\r/g, '')
      .split('\n')
      .map((s) => stripLinks(s).replace(/^[:*#\-\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, maxLines)
    const joined = normalizeValue(lines.join(' · ')) ?? ''
    if (!joined) return ''
    return joined.length > maxLen ? `${joined.slice(0, maxLen - 1).trimEnd()}…` : joined
  }
  const birthYear = extractYear(readInfoboxField(fields, ['birth_date', 'date de naissance', 'naissance']))
  const deathYear = extractYear(readInfoboxField(fields, ['death_date', 'date de décès', 'décès', 'mort']))
  const nationality = stripLinks(readInfoboxField(fields, ['nationality', 'nationalité', 'citoyenneté'])).trim() || null

  const isGenericNotableValue = (value: string): boolean => {
    const v = normalizeValue(value)?.toLowerCase() ?? ''
    if (!v) return true
    const wordCount = v.split(/\s+/).filter(Boolean).length
    const genericTerms = new Set([
      'artiste', 'actor', 'acteur', 'actrice', 'animatrice', 'animateur',
      'journaliste', 'musicien', 'musician', 'singer', 'chanteur', 'chanteuse',
      'writer', 'écrivain', 'auteur', 'author', 'scientifique', 'scientist',
      'entrepreneur', 'businessperson', 'politician', 'homme politique',
      'femme politique', 'presenter', 'tv presenter', 'television presenter',
      'personnalité de télévision', 'personnalite de television',
    ])
    if (genericTerms.has(v) && wordCount <= 3) return true
    if (wordCount <= 2 && !/[·,;()\-]/.test(v)) return true
    return false
  }

  const knownFor = extractCompactField(readInfoboxField(fields, ['known_for', 'known for', 'connu pour', 'célèbre pour']))
  const notableWorksRaw = extractCompactField(readInfoboxField(fields, [
    'notable_works', 'notable works', 'œuvres principales', 'oeuvres principales',
    'ouvrages principaux', 'principal_work', 'principal work', 'famous_works', 'works',
  ]), 3, 220)
  const mediaWorksRaw = extractCompactField(readInfoboxField(fields, [
    'television', 'tv', 'programmes', 'programs', 'shows', 'émissions', 'emissions',
    'notable_role', 'notable role', 'roles notables',
  ]), 2, 180)
  const companiesRaw = extractCompactField(readInfoboxField(fields, [
    'entreprise', 'entreprises', 'company', 'companies', 'organisation', 'organization',
    'employer', 'organizations', 'sociétés', 'parent_company', 'établissement',
  ]), 2, 180)
  const occupationRaw = extractCompactField(readInfoboxField(fields, ['occupation', 'occupations']), 2, 120)
  const occupationFirst = occupationRaw.includes(',')
    ? occupationRaw.split(',')[0]?.trim() ?? occupationRaw
    : occupationRaw

  const genre = extractCompactField(readInfoboxField(fields, ['genre', 'genres']), 1, 80)
  const movement = extractCompactField(readInfoboxField(fields, [
    'movement', 'movements', 'literary_movement', 'mouvement', 'school',
  ]), 2, 120)

  const notableParts = [knownFor, notableWorksRaw, mediaWorksRaw].filter((s) => s.length > 0)
  if (domain !== 'Entrepreneuriat' && companiesRaw) notableParts.push(companiesRaw)
  if (!isGenericNotableValue(occupationFirst)) notableParts.push(occupationFirst)
  const uniqueNotable = [...new Set(notableParts)].slice(0, 4)
  let notableWork = uniqueNotable.length ? uniqueNotable.join(' · ') : null
  notableWork = notableWork ? normalizeValue(notableWork) : null
  if (genre) {
    notableWork = notableWork ? normalizeValue(`${notableWork} — ${genre}`) : normalizeValue(genre)
  }

  let era = stripLinks(readInfoboxField(fields, [
    'era', 'période', 'period', 'years_active', 'years active', 'années d\'activité',
  ])).trim() || null
  const reignRaw = stripLinks(readInfoboxField(fields, ['reign', 'règne', 'coronation', 'couronnement'])).trim()
  const reignRg = extractYearRange(reignRaw)
  if (!era && (reignRg.start || reignRg.end)) {
    era = reignRg.start && reignRg.end
      ? `${reignRg.start}–${reignRg.end}`
      : String(reignRg.start ?? reignRg.end ?? '')
  }
  if (movement) {
    era = era ? normalizeValue(`${era} · ${movement}`) ?? era : normalizeValue(movement)
  }
  if (!era && birthYear && deathYear) {
    era = `${birthYear}–${deathYear}`
  }

  let domainOut = domain
  const discipline = stripLinks(readInfoboxField(fields, [
    'field', 'fields', 'discipline', 'specialism', 'specialty', 'domains', 'domain (activity)',
  ])).trim()
  if (discipline && domain === 'Science') {
    domainOut = normalizeValue(`${domain} — ${discipline}`) ?? domain
  } else if (discipline && !notableWork) {
    notableWork = normalizeValue(discipline)
  }
  if (!notableWork && domain === 'Histoire') {
    const titleOrReign = extractCompactField(readInfoboxField(fields, [
      'title', 'titre', 'règne', 'reign', 'fonction', 'succession', 'dynasty', 'dynastie',
    ]), 2, 150)
    notableWork = titleOrReign || null
  }

  const company =
    domain === 'Entrepreneuriat' && companiesRaw
      ? normalizeValue(companiesRaw)
      : null

  return {
    domain: domainOut,
    notable_work: notableWork,
    era: era ? normalizeValue(era) : null,
    birth_year: birthYear,
    nationality,
    company,
  }
}

async function fetchWikidataEntityId(slug: string, lang: string): Promise<string | null> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(slug)}&format=json&formatversion=2`
  const res = await throttledFetch(url)
  if (!res.ok) return null
  const json = await safeJson<{
    query?: { pages?: Array<{ pageprops?: { wikibase_item?: string } }> }
  }>(res)
  if (!json) return null
  return json.query?.pages?.[0]?.pageprops?.wikibase_item ?? null
}

async function fetchWikidataFallback(entityId: string, lang: string): Promise<WikidataFallback | null> {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(entityId)}&props=labels|claims&languages=${encodeURIComponent(lang)}|en&format=json`
  const res = await throttledFetch(url)
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
  const readStringClaim = (pid: string): string | null =>
    (claims[pid]?.[0]?.mainsnak?.datavalue?.value as string | undefined) ?? null
  const commonsFileToThumbUrl = (filenameRaw: string | null): string | null => {
    if (!filenameRaw) return null
    const filename = filenameRaw
      .replace(/^File:/i, '')
      .replace(/^Fichier:/i, '')
      .trim()
    if (!filename) return null
    return commonsFilenameToUploadThumbUrl(filename, 400)
  }

  const occupationIds = readEntityIds('P106')
  const nationalityIds = readEntityIds('P27')
  const employerIds = readEntityIds('P108').slice(0, 12)
  const notableWorkIds = readEntityIds('P800').slice(0, 10)
  const languageIds = readEntityIds('P1412').slice(0, 8)
  const fieldIds = readEntityIds('P101').slice(0, 8)
  const birthYear = readTimeYear('P569')
  const photoUrl = commonsFileToThumbUrl(readStringClaim('P18'))

  const readP39Claims = (): Array<{ positionId: string; start_year: number | null; end_year: number | null }> => {
    const raw = claims['P39'] as Array<{
      mainsnak?: { datavalue?: { value?: { id?: string } } }
      qualifiers?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: { time?: string } } } }>>
    }> | undefined
    if (!raw || !Array.isArray(raw)) return []
    const out: Array<{ positionId: string; start_year: number | null; end_year: number | null }> = []
    for (const c of raw) {
      const positionId = c.mainsnak?.datavalue?.value?.id
      if (!positionId) continue
      const q580 = c.qualifiers?.['P580']?.[0]?.mainsnak?.datavalue?.value as { time?: string } | undefined
      const q582 = c.qualifiers?.['P582']?.[0]?.mainsnak?.datavalue?.value as { time?: string } | undefined
      out.push({
        positionId,
        start_year: q580?.time ? extractYear(q580.time) : null,
        end_year: q582?.time ? extractYear(q582.time) : null,
      })
    }
    return out.slice(0, 12)
  }

  const p39Claims = readP39Claims()

  const labelFor = async (ids: string[]): Promise<string[]> => {
    if (ids.length === 0) return []
    const idsChunk = ids.slice(0, 8).join('|')
    const entitiesUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(idsChunk)}&props=labels&languages=${encodeURIComponent(lang)}|en&format=json`
    const r = await throttledFetch(entitiesUrl)
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

  const labelForMany = async (ids: string[]): Promise<string[]> => {
    const chunks: string[][] = []
    for (let i = 0; i < ids.length; i += 8) chunks.push(ids.slice(i, i + 8))
    const parts = await Promise.all(chunks.map((c) => labelFor(c)))
    return parts.flat()
  }

  const [occupationLabels, nationalityLabels, notableWorkLabels, languageLabels, fieldLabels, p39Labels, employerLabels] =
    await Promise.all([
      labelFor(occupationIds),
      labelFor(nationalityIds),
      labelForMany(notableWorkIds),
      labelFor(languageIds),
      labelFor(fieldIds),
      labelForMany(p39Claims.map((c) => c.positionId)),
      labelForMany(employerIds),
    ])

  const p39_roles: WikidataP39Role[] = p39Claims
    .map((c, i) => ({
      title: p39Labels[i] ?? '',
      start_year: c.start_year,
      end_year: c.end_year,
    }))
    .filter((r) => r.title.length > 0)

  return {
    birth_year: birthYear,
    nationality: normalizeValue(nationalityLabels[0] ?? null),
    occupations: occupationLabels,
    notable_work: normalizeValue(notableWorkLabels[0] ?? null),
    notable_work_labels: notableWorkLabels,
    employer_labels: employerLabels,
    era: null,
    languages: languageLabels,
    fields_of_work: fieldLabels,
    p39_roles,
    photo_url: photoUrl,
  }
}

async function fetchWikipediaImageFallback(slug: string, lang: string): Promise<string | null> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(slug)}&prop=pageimages&piprop=thumbnail&pithumbsize=400&format=json&formatversion=2`
  const res = await throttledFetch(url)
  if (!res.ok) return null
  const json = await safeJson<{
    query?: {
      pages?: Array<{ thumbnail?: { source?: string } }>
    }
  }>(res)
  if (!json) return null
  const page = json.query?.pages?.[0]
  return normalizeMediaUrl(page?.thumbnail?.source ?? null, lang)
}

function inferTypeFromWikidataOccupations(occupations: string[]): WikiPersonType | null {
  const lower = occupations.map((o) => o.toLowerCase())
  // historical_figure d'abord: empereur/monarque l'emporte sur tout (même si l'individu
  // est aussi rangé comme "militant" ou "personnalité politique" dans Wikidata).
  if (lower.some((o) => /(\bmonarch\b|\bmonarque\b|\bempereur\b|\bimp[ée]ratrice\b|\bemperor\b|\broi\b|\bking\b|\breine\b|\bqueen\b|\bnobility\b|\bdynasty\b|\bsultan\b|\bpope\b|\bpape\b|\bpharaoh\b|\bduke\b|\bduchess\b|\bsouverain\b)/.test(o))) return 'historical_figure'
  if (lower.some((o) => /(activist|activisme|militant|militante|environmentalist|écologiste|ecologiste|human rights)/.test(o))) return 'generic'
  if (lower.some((o) => /(football|athl|tennis|basket|sport|joueur|player|coureur|nageur|rugby|cyclist|swimmer|boxer|golfer)/.test(o))) return 'sportsperson'
  if (lower.some((o) => /(singer|actor|actrice|acteur|artist|artiste|musician|musicien|rappeur|composer|filmmaker|comedian)/.test(o))) return 'artist'
  if (lower.some((o) => /(scientist|scientifique|physicien|chimiste|mathématicien|mathematician|biologiste|astronomer|researcher)/.test(o))) return 'scientist'
  if (lower.some((o) => /(entrepreneur|business|investor|industriel|chef d'entreprise)/.test(o))) return 'entrepreneur'
  if (lower.some((o) => /(writer|écrivain|author|auteur|poet|poète|romancier|journalist)/.test(o))) return 'writer'
  if (lower.some((o) => /(politician|politique|ministre|président|député|sénateur|mayor|governor|chancellor)/.test(o))) return 'politician'
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
    let roles = [...(p.roles ?? [])]
    if (roles.length === 0 && fallback.p39_roles.length > 0) {
      roles = fallback.p39_roles.map((r) => ({
        title: r.title,
        title_redacted: r.title,
        start_year: r.start_year,
        end_year: r.end_year,
        country: null,
        predecessor: null,
        successor: null,
      }))
    }
    return {
      personType: resolvedType,
      infobox: {
        roles,
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
    if (resolvedType === 'artist') return 'Musique'
    if (resolvedType === 'scientist') return 'Science'
    if (resolvedType === 'entrepreneur') return 'Entrepreneuriat'
    if (resolvedType === 'writer') return 'Littérature'
    if (resolvedType === 'historical_figure') return 'Histoire'
    return 'Société'
  })()

  let notableMerged = normalizeValue(g.notable_work ?? null)
  if (!notableMerged && fallback.notable_work) notableMerged = fallback.notable_work
  else if (fallback.notable_work_labels.length > 0) {
    const fromWd = fallback.notable_work_labels.slice(0, 5).join(' · ')
    notableMerged = notableMerged
      ? normalizeValue(`${notableMerged} · ${fromWd}`) ?? notableMerged
      : normalizeValue(fromWd)
  }
  if (!notableMerged && fallback.occupations.length > 0) {
    notableMerged = normalizeValue(fallback.occupations.slice(0, 3).join(', '))
  }

  // Ne jamais utiliser les langues comme "oeuvre notable":
  // cela produit des résultats bruités du type "Langues: Français".
  // On conserve cette info dans fallback uniquement pour futurs usages éventuels.

  let domainMerged = normalizeValue(g.domain ?? fallbackDomain)
  if (fallback.fields_of_work.length > 0) {
    const fld = fallback.fields_of_work.slice(0, 4).join(', ')
    domainMerged = domainMerged
      ? normalizeValue(`${domainMerged} — ${fld}`) ?? domainMerged
      : normalizeValue(fld)
  }

  let companyMerged: string | null = null
  if (resolvedType === 'entrepreneur') {
    companyMerged = normalizeValue(g.company ?? null)
    if (!companyMerged && fallback.employer_labels.length > 0) {
      companyMerged = normalizeValue(fallback.employer_labels.slice(0, 8).join(' · '))
    }
  }

  return {
    personType: resolvedType,
    infobox: {
      domain: domainMerged,
      notable_work: notableMerged,
      era: normalizeValue(g.era ?? fallback.era),
      birth_year: g.birth_year ?? fallback.birth_year,
      nationality: normalizeValue(g.nationality ?? fallback.nationality),
      company: companyMerged,
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
  if (personType === 'entrepreneur') {
    return ['birth_year', 'nationality', 'company', 'name_initials', 'name_length']
  }
  return ['birth_year', 'nationality', 'name_initials', 'name_length']
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
  } else if (personType === 'entrepreneur') {
    const g = infoboxData as WikiGenericData
    if (!g.domain) { score -= 20; warnings.push('Domaine manquant') }
    if (!g.notable_work) { score -= 15; warnings.push('Fait notable ou parcours peu renseigné') }
    if (!g.company) { score -= 12; warnings.push('Entreprises non extraites') }
    if (!g.birth_year) { score -= 20; warnings.push('Année de naissance manquante') }
    if (!g.nationality) { score -= 15; warnings.push('Nationalité manquante') }
  } else if (personType === 'historical_figure') {
    const g = infoboxData as WikiGenericData
    if (!g.domain) { score -= 15; warnings.push('Domaine manquant') }
    if (!g.notable_work) { score -= 28; warnings.push('Fait ou titre notable manquant') }
    if (!g.era) { score -= 12; warnings.push('Période ou contexte temporel manquant') }
    if (!g.birth_year) { score -= 18; warnings.push('Année de naissance manquante') }
    if (!g.nationality) { score -= 15; warnings.push('Nationalité manquante') }
  } else {
    const g = infoboxData as WikiGenericData
    if (!g.domain) { score -= 20; warnings.push('Domaine manquant') }
    if (!g.notable_work) { score -= 20; warnings.push('Oeuvre/Fait notable manquant') }
    if (!g.birth_year) { score -= 20; warnings.push('Année de naissance manquante') }
    if (!g.nationality) { score -= 15; warnings.push('Nationalité manquante') }
  }

  return { score: Math.max(0, score), warnings }
}

const WIKIPEDIA_ARTICLE_URL_RE =
  /^https?:\/\/([a-z]{2,})\.(?:m\.)?wikipedia\.org\/wiki\/([^?#]+)/i

async function tryWikipediaDirectTitle(trimmed: string, lang: string): Promise<string | null> {
  const titleQuery = trimmed.replace(/_/g, ' ')
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titleQuery)}&redirects=1&format=json`
  const res = await throttledFetch(url)
  if (!res.ok) return null
  const json = await safeJson<{
    query?: { pages?: Record<string, { missing?: boolean; title?: string }> }
  }>(res)
  const pages = json?.query?.pages
  if (!pages) return null
  const page = Object.values(pages)[0]
  // API v1 : page absente → champ `missing` présent (souvent chaîne vide), pas un booléen fiable.
  if (!page || !page.title || 'missing' in page) return null
  return page.title.trim().replace(/\s+/g, '_')
}

async function searchWikipediaTitle(query: string, lang: string): Promise<string | null> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json`
  const res = await throttledFetch(url)
  if (!res.ok) return null
  const json = await safeJson<{
    query?: { search?: Array<{ title: string }> }
  }>(res)
  const hits = json?.query?.search ?? []
  if (hits.length === 0) return null
  return hits[0].title.trim().replace(/\s+/g, '_')
}

/**
 * Accepte une URL Wikipédia, un titre exact ou une requête libre (ex. « Bruno Le Maire »).
 * Retourne le slug canonique (underscores) et la langue du wiki cible.
 */
export async function resolveWikipediaSlug(input: string, defaultLang: string): Promise<{ slug: string; lang: string }> {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('Recherche vide.')
  }

  const urlMatch = trimmed.match(WIKIPEDIA_ARTICLE_URL_RE)
  if (urlMatch) {
    const lang = urlMatch[1].toLowerCase()
    let pathSeg = urlMatch[2]
    try {
      pathSeg = decodeURIComponent(pathSeg)
    } catch {
      pathSeg = urlMatch[2]
    }
    const titleSpaces = pathSeg.replace(/_/g, ' ').trim()
    const slug = titleSpaces.replace(/\s+/g, '_')
    if (!slug) {
      throw new Error('URL Wikipédia invalide.')
    }
    const directUrl = await tryWikipediaDirectTitle(slug, lang)
    if (directUrl) return { slug: directUrl, lang }
    const searchedUrl = await searchWikipediaTitle(titleSpaces, lang)
    if (searchedUrl) return { slug: searchedUrl, lang }
    throw new Error(`Aucune page Wikipédia trouvée pour l'URL « ${trimmed} » (${lang}).`)
  }

  const lang = /^[a-z]{2}$/i.test(defaultLang) ? defaultLang.toLowerCase() : 'fr'

  const direct = await tryWikipediaDirectTitle(trimmed, lang)
  if (direct) {
    return { slug: direct, lang }
  }

  const searched = await searchWikipediaTitle(trimmed, lang)
  if (searched) {
    return { slug: searched, lang }
  }

  throw new Error(`Aucune page Wikipédia trouvée pour « ${trimmed} » (${lang}).`)
}

/** Titre canonique après redirections — le REST summary exige surtout des espaces, pas des underscores bruts. */
async function resolveCanonicalPageTitle(slug: string, lang: string): Promise<{ displayTitle: string; slugUnderscore: string } | null> {
  const titleQuery = slug.trim().replace(/_/g, ' ')
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titleQuery)}&redirects=1&format=json&formatversion=2`
  const res = await throttledFetch(url)
  if (!res.ok) return null
  const json = await safeJson<{ query?: { pages?: Array<{ missing?: boolean; title?: string }> } }>(res)
  const page = json?.query?.pages?.[0]
  if (!page?.title || page.missing) return null
  const title = page.title.trim()
  return { displayTitle: title, slugUnderscore: title.replace(/\s+/g, '_') }
}

async function fetchLeadExtractViaQuery(displayTitle: string, lang: string): Promise<{ title: string; extract: string } | null> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&titles=${encodeURIComponent(displayTitle)}&exintro=1&explaintext=1&redirects=1&format=json&formatversion=2`
  const res = await throttledFetch(url)
  if (!res.ok) return null
  const json = await safeJson<{ query?: { pages?: Array<{ title?: string; extract?: string; missing?: boolean }> } }>(res)
  const page = json?.query?.pages?.[0]
  if (!page || page.missing || typeof page.extract !== 'string') return null
  const extract = page.extract.trim()
  if (!extract) return null
  return { title: page.title ?? displayTitle, extract }
}

export async function fetchWikipediaData(slug: string, lang = 'fr'): Promise<WikiFetchResult> {
  let canonical = await resolveCanonicalPageTitle(slug, lang)
  if (!canonical) {
    const q = slug.trim().replace(/_/g, ' ').trim()
    const searched = q.length > 0 ? await searchWikipediaTitle(q, lang) : null
    if (searched) {
      canonical = await resolveCanonicalPageTitle(searched, lang)
    }
  }
  if (!canonical) {
    throw new Error(`Page Wikipédia introuvable (${lang}) : « ${slug.trim()} ». Vérifie la langue (FR/EN) ou le titre exact.`)
  }
  const { displayTitle, slugUnderscore } = canonical
  const cacheKey = `${lang}:${slugUnderscore}`
  const cached = wikiCache.get(cacheKey)
  if (cached) return cached

  const titleForApis = encodeURIComponent(displayTitle)
  const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${titleForApis}`
  const wikitextUrl = `https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(displayTitle)}&prop=wikitext&format=json&formatversion=2`
  const [summaryRes, wikitextRes] = await Promise.all([
    throttledFetch(summaryUrl),
    throttledFetch(wikitextUrl),
  ])
  if (!wikitextRes.ok) throw new Error(`Wikipedia wikitext fetch failed: ${wikitextRes.status}`)

  interface RestSummaryJson {
    type?: string
    title?: string
    extract?: string
    description?: string
    thumbnail?: { source: string }
    originalimage?: { source: string }
    content_urls?: { desktop?: { page?: string } }
  }

  let restSummary: RestSummaryJson | null = null
  if (summaryRes.ok) {
    restSummary = await safeJson<RestSummaryJson>(summaryRes)
  }

  let summaryTitle = restSummary?.title ?? displayTitle
  let summaryExtract = (restSummary?.extract ?? '').trim()
  let summaryDescription = restSummary?.description
  let summaryThumb = restSummary?.thumbnail
  const summaryContentUrls = restSummary?.content_urls

  const needsLeadFallback =
    !summaryRes.ok
    || !summaryExtract
    || restSummary?.type === 'disambiguation'

  if (needsLeadFallback) {
    const lead = await fetchLeadExtractViaQuery(displayTitle, lang)
    if (lead) {
      summaryExtract = lead.extract
      summaryTitle = lead.title
    }
  }

  if (!summaryExtract) {
    throw new Error(
      `Résumé Wikipédia indisponible pour « ${displayTitle} » (${lang}). La page existe peut‑être en autre édition linguistique.`
    )
  }

  if (!summaryDescription && summaryExtract.length > 0) {
    const cut = summaryExtract.match(/^[^.!?]+[.!?]?/)
    summaryDescription = cut?.[0]?.slice(0, 160)?.trim()
  }

  // 2. Wikitext (infobox)
  const wikitextJson = await safeJson<{ parse?: { wikitext: string } }>(wikitextRes)
  if (!wikitextJson) throw new Error('Wikipedia wikitext parse failed')
  const wikitext = wikitextJson.parse?.wikitext ?? ''

  // Prefer resized thumbnail (small, fast) over full-resolution original (can be 20–50 MB)
  const thumbUpscaled = upscaleWikimediaThumb(summaryThumb?.source, 400)
  let resolvedPhotoUrl = normalizeMediaUrl(
    thumbUpscaled ?? summaryThumb?.source ?? null,
    lang
  )
  if (!resolvedPhotoUrl) {
    try {
      resolvedPhotoUrl = await fetchWikipediaImageFallback(slugUnderscore, lang)
    } catch {
      resolvedPhotoUrl = null
    }
  }

  let wikidata: WikidataFallback | null = null
  try {
    const entityId = await fetchWikidataEntityId(slugUnderscore, lang)
    if (entityId) wikidata = await fetchWikidataFallback(entityId, lang)
  } catch {
    wikidata = null
  }
  if (wikidata?.photo_url) {
    resolvedPhotoUrl = wikidata.photo_url
  }

  const wikidataType = wikidata ? inferTypeFromWikidataOccupations(wikidata.occupations) : null
  let personType = wikidataType ?? detectPersonTypeFromSummary(summaryDescription) ?? detectPersonType(wikitext)
  let infobox_data: WikiInfoboxData = personType === 'politician'
    ? parsePoliticianData(wikitext)
    : personType === 'sportsperson'
      ? parseSportspersonData(wikitext)
      : personType === 'artist'
        ? parseGenericData(wikitext, 'Musique')
        : personType === 'scientist'
          ? parseGenericData(wikitext, 'Science')
          : personType === 'entrepreneur'
            ? parseGenericData(wikitext, 'Entrepreneuriat')
            : personType === 'writer'
              ? parseGenericData(wikitext, 'Littérature')
              : personType === 'historical_figure'
                ? parseGenericData(wikitext, 'Histoire')
                : parseGenericData(wikitext, 'Société')

  // 3. Apply structured Wikidata fallback for fragile/missing fields.
  const resolved = applyWikidataFallback(personType, infobox_data, wikidata)
  personType = resolved.personType
  infobox_data = applyBirthYearFallback(
    resolved.infobox,
    inferBirthYearFromExtract(summaryExtract)
  )
  if (personType === 'historical_figure') {
    const g = infobox_data as WikiGenericData
    if (!g.era) {
      infobox_data = {
        ...g,
        era: inferEraFromExtract(summaryExtract),
      }
    }
  }

  const quality = evaluateParseQuality(personType, infobox_data, !!resolvedPhotoUrl)

  const wikiArticleUrl =
    summaryContentUrls?.desktop?.page
    ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(displayTitle.replace(/ /g, '_'))}`

  const result: WikiFetchResult = {
    name: summaryTitle,
    extract: summaryExtract.slice(0, 500) || null,
    photo_url: resolvedPhotoUrl,
    wikipedia_url: wikiArticleUrl,
    infobox_data,
    person_type: personType,
    hint_schedule: defaultHintSchedule(personType),
    parse_quality_score: quality.score,
    parse_warnings: quality.warnings,
    canonical_wikipedia_slug: slugUnderscore,
  }
  wikiCache.set(cacheKey, result)
  return result
}
