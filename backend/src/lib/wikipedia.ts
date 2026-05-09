/**
 * wikipedia.ts
 * Fetches and parses Wikipedia infobox data for wiki_persons.
 * Called only from admin routes — never during gameplay.
 */

import { LRUCache } from 'lru-cache'
import { AsyncLocalStorage } from 'node:async_hooks'
import { commonsFilenameToUploadThumbUrl } from './commonsThumb.js'
import { inferClubStintEndYears } from './wikiClubYears.js'

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
  /** Infobox FR « parcours junior » ({{deux colonnes}}), distinct du parcours pro */
  clubs_youth?: WikiClub[]
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
  /** Repères carrière (admin / saisie manuelle), même schéma que career_highlights sportif */
  highlights?: Array<{ label: string; value: string }>
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
  /** Difficulté suggérée automatiquement (1=facile … 5=difficile) basée sur sitelinks + pageviews. */
  suggested_difficulty: number
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
  /** P102 — parti politique (souvent absent de l’infobox minimale). */
  party_labels: string[]
  /** P264 — maisons de disques (artistes). */
  record_label_labels: string[]
  /** P463 — groupes / collectifs dont la personne est membre (ex. groupe de musique). */
  member_of_labels: string[]
  era: string | null
  languages: string[]
  fields_of_work: string[]
  p39_roles: WikidataP39Role[]
  photo_url: string | null
  sitelinks_count: number
}

const USER_AGENT = 'MovieGame/1.0 (admin tool)'
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])
const REQUEST_TIMEOUT_MS = 4_000
const wikiCache = new LRUCache<string, WikiFetchResult>({
  max: 500,
  ttl: 1000 * 60 * 60, // 1 heure
})
const WIKI_MIN_INTERVAL = 800 // serialized Wikipedia calls (~75 req/min max)
const WIKIDATA_MIN_INTERVAL = 200 // serialized Wikidata calls (~300 req/min max)
const OPTIONAL_ENRICH_TIMEOUT_MS = 8_000

type ThrottleState = {
  queue: Array<{
    priority: 'high' | 'normal'
    task: () => Promise<unknown>
    resolve: (value: unknown) => void
    reject: (reason?: unknown) => void
  }>
  running: boolean
  nextAllowedAt: number
}

const wikiThrottle: ThrottleState = { queue: [], running: false, nextAllowedAt: 0 }
const wikidataThrottle: ThrottleState = { queue: [], running: false, nextAllowedAt: 0 }
const wikiPriorityCtx = new AsyncLocalStorage<{ priority: 'high' | 'normal' }>()

export async function runWithWikiFetchPriority<T>(
  priority: 'high' | 'normal',
  fn: () => Promise<T>
): Promise<T> {
  return wikiPriorityCtx.run({ priority }, fn)
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return await res.json() as T
  } catch {
    return null
  }
}

async function fetchWithRetry(url: string, init: RequestInit = {}, maxAttempts = 2): Promise<Response> {
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

async function runThrottled<T>(
  state: ThrottleState,
  minIntervalMs: number,
  task: () => Promise<T>
): Promise<T> {
  const priority = wikiPriorityCtx.getStore()?.priority ?? 'normal'
  return new Promise<T>((resolve, reject) => {
    state.queue.push({
      priority,
      task: task as () => Promise<unknown>,
      resolve: resolve as (value: unknown) => void,
      reject,
    })

    if (state.running) return
    state.running = true

    const drain = async () => {
      try {
        while (state.queue.length > 0) {
          const highIdx = state.queue.findIndex((item) => item.priority === 'high')
          const idx = highIdx >= 0 ? highIdx : 0
          const item = state.queue.splice(idx, 1)[0]
          const waitMs = state.nextAllowedAt - Date.now()
          if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs))
          state.nextAllowedAt = Date.now() + minIntervalMs
          try {
            const value = await item.task()
            item.resolve(value)
          } catch (err) {
            item.reject(err)
          }
        }
      } finally {
        state.running = false
      }
    }

    void drain()
  })
}

async function withSoftTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout | null = null
  try {
    const timeoutPromise = new Promise<T>((resolve) => {
      timer = setTimeout(() => resolve(fallback), ms)
    })
    return await Promise.race([promise, timeoutPromise])
  } catch {
    return fallback
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** Wikidata calls — light throttle (100ms) to avoid burst rate-limiting. */
async function throttledFetch(url: string, init?: RequestInit): Promise<Response> {
  return runThrottled(
    wikiThrottle,
    WIKI_MIN_INTERVAL,
    () => fetchWithRetry(url, init, 2)
  )
}

/** Wikidata calls — serialized throttle to avoid burst rate-limiting. */
async function wikidataFetch(url: string): Promise<Response> {
  return runThrottled(
    wikidataThrottle,
    WIKIDATA_MIN_INTERVAL,
    () => fetchWithRetry(url, {}, 2)
  )
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

/**
 * Plage d’années infobox (ex. « 2010-2011 », « 2010–2011 » tiret FR, [[2010]]–[[2011]]).
 * Sans deux années explicites, la fin du dernier club ne peut pas être inférée (pas de « club suivant »).
 */
function extractYearRange(raw: string): { start: number | null; end: number | null } {
  const cleaned = stripLinks(raw)
    .replace(/''/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const sep = String.raw`[-–—\u2010\u2011\u2012\u2013\u2014]`
  const explicit = cleaned.match(
    new RegExp(`^(1[89]\\d{2}|20\\d{2})\\s*${sep}+\\s*(1[89]\\d{2}|20\\d{2})(?:\\b|$)`),
  )
  if (explicit) {
    return { start: parseInt(explicit[1], 10), end: parseInt(explicit[2], 10) }
  }
  const loose = cleaned.match(
    new RegExp(`\\b(1[89]\\d{2}|20\\d{2})\\s*${sep}+\\s*(1[89]\\d{2}|20\\d{2})\\b`),
  )
  if (loose) {
    return { start: parseInt(loose[1], 10), end: parseInt(loose[2], 10) }
  }
  const years = cleaned.match(/\b(1[89]\d{2}|20\d{2})\b/g)
  if (!years || years.length === 0) return { start: null, end: null }
  if (years.length === 1) return { start: parseInt(years[0], 10), end: null }
  return {
    start: parseInt(years[0], 10),
    end: parseInt(years[years.length - 1], 10),
  }
}

/** Pipes « de niveau infobox » — pas les | à l'intérieur de [[wikiliens]]. */
function splitPipeColumns(line: string): string[] {
  const trimmed = line.replace(/^\s*\|/, '').trimEnd()
  const parts: string[] = []
  let depth = 0
  let cur = ''
  for (let i = 0; i < trimmed.length; i += 1) {
    if (trimmed[i] === '[' && trimmed[i + 1] === '[') {
      depth += 1
      cur += '[['
      i += 1
      continue
    }
    if (trimmed[i] === ']' && trimmed[i + 1] === ']' && depth > 0) {
      depth -= 1
      cur += ']]'
      i += 1
      continue
    }
    if (trimmed[i] === '|' && depth === 0) {
      parts.push(cur.trim())
      cur = ''
      continue
    }
    cur += trimmed[i]
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

function extractFrenchTemplateRows(raw: string, kind: 'deux' | 'trois'): string[] {
  if (!raw) return []
  const re = kind === 'deux' ? /\{\{\s*deux\s+colonnes\b/i : /\{\{\s*trois\s+colonnes\b/i
  const lines = raw.split('\n')
  const rows: string[] = []
  let inside = false
  for (const line of lines) {
    if (re.test(line)) {
      inside = true
      continue
    }
    if (!inside) continue
    const t = line.trim()
    if (t === '}}' || /^\}\}\s*$/.test(t)) break
    if (line.trimStart().startsWith('|')) rows.push(line)
  }
  return rows
}

/** Infobox FR « parcours junior » (2 col.) / « parcours senior » (3 col. avec stats). */
function parseFrenchColonnesCareer(raw: string, kind: 'deux' | 'trois'): WikiClub[] {
  const rows = extractFrenchTemplateRows(raw, kind)
  const ncols = kind === 'deux' ? 2 : 3
  const out: WikiClub[] = []
  for (const rowLine of rows) {
    const parts = splitPipeColumns(rowLine)
    if (parts.length < 2) continue
    const yearsRaw = parts[0]
    const clubRaw = parts[1]
    const statsRaw = ncols === 3 && parts.length >= 3 ? parts[2] : ''
    const yLabel = stripLinks(yearsRaw).toLowerCase()
    const cLabel = stripLinks(clubRaw).toLowerCase()
    if (yLabel.includes('total') || cLabel.includes('total')) continue
    const { start, end } = extractYearRange(yearsRaw)
    const clubName = normalizeValue(stripLinks(clubRaw).replace(/''/g, '').trim()) ?? ''
    if (clubName.length < 2 || /^\d+$/.test(clubName)) continue
    let appearances: number | null = null
    let goals: number | null = null
    if (ncols === 3 && statsRaw) {
      const sc = stripLinks(statsRaw).replace(/\s+/g, ' ')
      const pa = sc.match(/(\d{1,4})\s*\((\d{1,4})\)/)
      if (pa) {
        appearances = parseInt(pa[1], 10)
        goals = parseInt(pa[2], 10)
      } else {
        const onlyNum = sc.match(/(\d{1,4})/)
        if (onlyNum) appearances = parseInt(onlyNum[1], 10)
      }
    }
    out.push({ name: clubName, start_year: start, end_year: end, appearances, goals })
  }
  return out
}

function dedupeWikiClubs(clubs: WikiClub[]): WikiClub[] {
  const out: WikiClub[] = []
  const seen = new Set<string>()
  for (const club of clubs) {
    const key = `${club.name.toLowerCase()}|${club.start_year ?? ''}|${club.end_year ?? ''}|${club.appearances ?? ''}|${club.goals ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(club)
  }
  return out
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

/**
 * Uniquement le premier bloc {{Infobox …}} — évite d’interpréter des `| clé =` du corps d’article
 * (même classe de problème que le scan « carrière » hors infobox pour les sportifs).
 */
function extractFirstInfoboxWikitext(raw: string): string {
  const m = /\{\{\s*Infobox\b/i.exec(raw)
  if (!m || m.index === undefined) return raw
  let depth = 0
  let i = m.index
  while (i < raw.length) {
    if (raw.slice(i, i + 2) === '{{') {
      depth += 1
      i += 2
      continue
    }
    if (raw.slice(i, i + 2) === '}}') {
      depth -= 1
      i += 2
      if (depth === 0) return raw.slice(m.index, i)
      continue
    }
    i += 1
  }
  return raw
}

function readInfoboxField(fields: Map<string, string>, keys: string[]): string {
  for (const key of keys) {
    const v = fields.get(key.toLowerCase())
    if (v) return v
  }
  return ''
}

/** Mandat de député à l'Assemblée nationale : l'infobox met souvent le prédécesseur électoral (même circonscription), peu lisible pour le jeu. */
function isFrenchNationalAssemblyDeputyTitle(title: string): boolean {
  return /\bd[ée]put[ée]e?\s+fran[cç]aise?\b/i.test(title)
}

function parsePoliticianData(wikitext: string): WikiPoliticianData {
  const roles: WikiRole[] = []
  const fields = parseInfoboxFields(extractFirstInfoboxWikitext(wikitext))

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

    let predecessor = pred.trim() ? stripLinks(pred).trim() : null
    let successor = succ.trim() ? stripLinks(succ).trim() : null
    if (isFrenchNationalAssemblyDeputyTitle(title)) {
      predecessor = null
      successor = null
    }

    roles.push({
      title,
      title_redacted: titleRedacted,
      start_year: extractYear(termStart),
      end_year: termEnd.trim() ? extractYear(termEnd) : null,
      country: country || null,
      predecessor,
      successor,
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
  const infoboxOnly = extractFirstInfoboxWikitext(wikitext)
  const fields = parseInfoboxFields(infoboxOnly)
  const infoboxScope = [...fields.values()].join('\n')
  const frYouth = parseFrenchColonnesCareer(
    readInfoboxField(fields, [
      'parcours junior', 'parcours_junior', 'jeunes', 'youthclubs', 'youth clubs', 'formation club',
    ]),
    'deux',
  )
  const frSenior = parseFrenchColonnesCareer(
    readInfoboxField(fields, [
      'parcours senior', 'parcours_senior', 'parcours professionnel', 'parcours_professionnel',
    ]),
    'trois',
  )

  const splitMultiValue = (raw: string): string[] =>
    raw
      .replace(/<br\s*\/?>/gi, '\n')
      .split('\n')
      .map((v) => stripLinks(v).trim())
      .filter(Boolean)

  const extractClubsFromCareerRows = (scope: string): WikiClub[] => {
    const rows: WikiClub[] = []
    const lines = scope.split('\n')
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
  const clubsBlock = infoboxOnly.match(/\|\s*clubs\s*=\s*([\s\S]*?)(?=\n\s*\|(?![\s\S]*?\|\s*clubs))/)?.[1] ?? ''
  const yearsBlock = infoboxOnly.match(/\|\s*(?:clubyears|years)\s*=\s*([\s\S]*?)(?=\n\s*\|)/i)?.[1] ?? ''
  const capsBlock = infoboxOnly.match(/\|\s*(?:clubcaps|caps|apps)\s*=\s*([\s\S]*?)(?=\n\s*\|)/i)?.[1] ?? ''
  const goalsBlock = infoboxOnly.match(/\|\s*(?:clubgoals|goals)\s*=\s*([\s\S]*?)(?=\n\s*\|)/i)?.[1] ?? ''

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

  // FR tables fallback: career lines with years | club | stats (uniquement dans le texte des champs infobox).
  clubs.push(...extractClubsFromCareerRows(infoboxScope))

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

  const seniorPool = frSenior.length > 0 ? frSenior : clubs
  const dedupedClubs = dedupeWikiClubs(seniorPool)
  const dedupedYouth = dedupeWikiClubs(frYouth)

  // National team — look for the senior/main national team (highest numbered entry or explicit field)
  // FR infobox: sélection1, sélection2, matchs-sélection1, buts-sélection1
  // EN infobox: nationalteam1, nationalcaps1, nationalgoals1
  const findNationalTeam = (): { name: string; caps: number | null; goals: number | null } | null => {
    // Certains profils FR encapsulent les sélections dans un template `{{trois colonnes ...}}`
    // (ex: Lionel Messi). On le parse explicitement avant les autres fallbacks.
    const fromTroisColonnes = parseFrenchTroisColonnesNationalTeam(infoboxOnly)
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
    infoboxOnly.match(/\|\s*sport\s*=\s*([^\n|]+)/)?.[1]
      ?? (infoboxOnly.match(/\{\{Infobox\s+Footballeur/i) ? 'Football'
        : infoboxOnly.match(/\{\{Infobox\s+Joueur de tennis/i) ? 'Tennis'
          : infoboxOnly.match(/\{\{Infobox\s+Basketteur/i) ? 'Basket-ball'
            : 'Sport')
  ).trim()
  const isTennisProfile = /tennis/i.test(sport)

  const normalizeClubNames = (arr: WikiClub[]) =>
    arr
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

  const cleanedClubs = normalizeClubNames(dedupedClubs)
  const cleanedYouth = normalizeClubNames(dedupedYouth)

  const position = stripLinks(
    infoboxOnly.match(/\|\s*(?:position|poste)\s*=\s*([^\n|]+)/i)?.[1] ?? ''
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

  const seniorClubs = isTennisProfile ? [] : inferClubStintEndYears(cleanedClubs.slice(0, 8))
  const youthClubs =
    isTennisProfile || cleanedYouth.length === 0 ? undefined : inferClubStintEndYears(cleanedYouth.slice(0, 8))

  return {
    sport: sport || 'Football',
    position,
    clubs: seniorClubs,
    clubs_youth: youthClubs,
    career_highlights: careerHighlights.slice(0, 6),
    national_team,
    birth_year: birthYear,
    nationality,
  }
}

function parseGenericData(wikitext: string, domain: string): WikiGenericData {
  const fields = parseInfoboxFields(extractFirstInfoboxWikitext(wikitext))
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

/** Single Wikipedia API call: resolves redirects, gets canonical title + Wikidata entity ID. */
async function fetchPageMeta(slug: string, lang: string): Promise<{ displayTitle: string; slugUnderscore: string; entityId: string | null } | null> {
  const titleQuery = slug.trim().replace(/_/g, ' ')
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titleQuery)}&redirects=1&prop=pageprops&format=json&formatversion=2`
  const res = await throttledFetch(url)
  if (!res.ok) return null
  const json = await safeJson<{
    query?: { pages?: Array<{ missing?: boolean; title?: string; pageprops?: { wikibase_item?: string } }> }
  }>(res)
  const page = json?.query?.pages?.[0]
  if (!page?.title || 'missing' in page) return null
  const title = page.title.trim()
  return {
    displayTitle: title,
    slugUnderscore: title.replace(/\s+/g, '_'),
    entityId: page.pageprops?.wikibase_item ?? null,
  }
}

async function fetchWikidataFallback(entityId: string, lang: string): Promise<WikidataFallback | null> {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(entityId)}&props=labels|claims|sitelinks&languages=${encodeURIComponent(lang)}|en&format=json`
  const res = await wikidataFetch(url)
  if (!res.ok) return null
  const json = await safeJson<{
    entities?: Record<string, {
      claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>
      sitelinks?: Record<string, unknown>
    }>
  }>(res)
  if (!json) return null
  const entity = json.entities?.[entityId]
  const claims = entity?.claims
  if (!claims) return null
  const sitelinks_count = Object.keys(entity?.sitelinks ?? {}).length

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
  const partyIds = readEntityIds('P102').slice(0, 6)
  /** Plusieurs P800 (albums, titres…) pour hydrater highlights artistes. */
  const notableWorkIds = readEntityIds('P800').slice(0, 14)
  const recordLabelIds = readEntityIds('P264').slice(0, 8)
  const memberOfIds = readEntityIds('P463').slice(0, 10)
  const languageIds = readEntityIds('P1412').slice(0, 8)
  const fieldIds = readEntityIds('P101').slice(0, 8)
  const birthYear = readTimeYear('P569')
  const photoUrl = commonsFileToThumbUrl(readStringClaim('P18'))

  /** Qualificatifs Wikidata : tableau de snaks avec `datavalue` direct (pas de `mainsnak`). */
  const qualifierTimeYear = (
    quals: Record<string, unknown[]> | undefined,
    prop: string,
  ): number | null => {
    const snak = quals?.[prop]?.[0] as { datavalue?: { value?: { time?: string } } } | undefined
    const t = snak?.datavalue?.value?.time
    return t ? extractYear(t) : null
  }

  const readP39Claims = (): Array<{ positionId: string; start_year: number | null; end_year: number | null }> => {
    const raw = claims['P39'] as Array<{
      mainsnak?: { datavalue?: { value?: { id?: string } } }
      qualifiers?: Record<string, unknown[]>
    }> | undefined
    if (!raw || !Array.isArray(raw)) return []
    const out: Array<{ positionId: string; start_year: number | null; end_year: number | null }> = []
    for (const c of raw) {
      const positionId = c.mainsnak?.datavalue?.value?.id
      if (!positionId) continue
      const q580y = qualifierTimeYear(c.qualifiers, 'P580')
      const q582y = qualifierTimeYear(c.qualifiers, 'P582')
      out.push({
        positionId,
        start_year: q580y,
        end_year: q582y,
      })
    }
    return out.slice(0, 12)
  }

  const p39Claims = readP39Claims()

  /** Orgs liées au mandat (P39) — ex. PDG + P2389 → LVMH ; souvent absent alors que P108 (employer) est vide. */
  const readPositionHeldOrganizationIds = (): string[] => {
    const raw = claims['P39'] as Array<{ qualifiers?: Record<string, unknown[]> }> | undefined
    if (!raw || !Array.isArray(raw)) return []
    const ids: string[] = []
    for (const c of raw) {
      const quals = c.qualifiers?.['P2389']
      if (!Array.isArray(quals)) continue
      for (const q of quals) {
        const val = (q as { datavalue?: { value?: { id?: string; 'numeric-id'?: number } } }).datavalue?.value
        if (val && typeof val === 'object') {
          if (typeof val.id === 'string') ids.push(val.id)
          else if (typeof val['numeric-id'] === 'number') ids.push(`Q${val['numeric-id']}`)
        }
      }
    }
    return [...new Set(ids)].slice(0, 16)
  }
  const positionHeldOrgIds = readPositionHeldOrganizationIds()

  // Batch all label lookups into 1-2 Wikidata requests (50 IDs/request max)
  // instead of 7 separate calls — major reduction in API usage
  const p39PositionIds = p39Claims.map((c) => c.positionId)
  const allIds = [
    ...occupationIds, ...nationalityIds, ...notableWorkIds,
    ...languageIds, ...fieldIds, ...p39PositionIds, ...employerIds, ...positionHeldOrgIds,
    ...partyIds, ...recordLabelIds, ...memberOfIds,
  ]
  const uniqueIds = [...new Set(allIds)]

  const labelsMap: Record<string, string> = {}
  for (let i = 0; i < uniqueIds.length; i += 50) {
    const chunk = uniqueIds.slice(i, i + 50)
    try {
      const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(chunk.join('|'))}&props=labels&languages=${encodeURIComponent(lang)}|en&format=json`
      const r = await wikidataFetch(url)
      if (r.ok) {
        const j = await safeJson<{ entities?: Record<string, { labels?: Record<string, { value: string }> }> }>(r)
        for (const [id, entity] of Object.entries(j?.entities ?? {})) {
          const label = entity.labels?.[lang]?.value ?? entity.labels?.en?.value
          if (label) labelsMap[id] = normalizeValue(label) ?? label
        }
      }
    } catch { /* non-critical */ }
  }

  const resolve = (ids: string[]) => ids.map((id) => labelsMap[id]).filter((v): v is string => Boolean(v))

  const occupationLabels = resolve(occupationIds)
  const nationalityLabels = resolve(nationalityIds)
  const notableWorkLabels = [...new Set(resolve(notableWorkIds))]
  const languageLabels = resolve(languageIds)
  const fieldLabels = resolve(fieldIds)
  const employerLabels = [...new Set([...resolve(employerIds), ...resolve(positionHeldOrgIds)])]
  const partyLabels = [...new Set(resolve(partyIds))]
  const recordLabelLabels = [...new Set(resolve(recordLabelIds))]
  const memberOfLabels = [...new Set(resolve(memberOfIds))]

  const p39_roles: WikidataP39Role[] = p39Claims
    .map((c) => ({
      title: labelsMap[c.positionId] ?? '',
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
    party_labels: partyLabels,
    record_label_labels: recordLabelLabels,
    member_of_labels: memberOfLabels,
    era: null,
    languages: languageLabels,
    fields_of_work: fieldLabels,
    p39_roles,
    photo_url: photoUrl,
    sitelinks_count,
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
  if (lower.some((o) =>
    /(scientist|scientifique|physicien|chimiste|mathématicien|mathematician|biologiste|astronomer|researcher|ingénieur|ingenieur|engineer)/.test(o))) return 'scientist'
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
    let partyMerged = normalizeValue(p.party ?? null)
    if (!partyMerged && fallback.party_labels.length > 0) {
      partyMerged = normalizeValue(fallback.party_labels.slice(0, 4).join(' · '))
    }
    return {
      personType: resolvedType,
      infobox: {
        roles,
        party: partyMerged,
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
        clubs_youth: s.clubs_youth,
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
    if (resolvedType === 'artist') {
      const firstWd = fallback.notable_work_labels[0]
      if (!notableMerged) {
        notableMerged = normalizeValue(firstWd)
      } else if (firstWd) {
        const low = notableMerged.toLowerCase()
        const sub = firstWd.toLowerCase()
        if (!low.includes(sub)) {
          notableMerged = normalizeValue(`${notableMerged} · ${firstWd}`) ?? notableMerged
        }
      }
    } else {
      const fromWd = fallback.notable_work_labels.slice(0, 5).join(' · ')
      notableMerged = notableMerged
        ? normalizeValue(`${notableMerged} · ${fromWd}`) ?? notableMerged
        : normalizeValue(fromWd)
    }
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

  const HIGHLIGHT_CAP = 10
  const existingHighlights = Array.isArray(g.highlights) ? [...g.highlights] : []
  let highlightsOut: Array<{ label: string; value: string }> | undefined

  if (resolvedType === 'artist') {
    const rows: Array<{ label: string; value: string }> = [...existingHighlights]
    if (fallback.member_of_labels.length > 0) {
      rows.push({
        label: 'Membre de',
        value: fallback.member_of_labels.slice(0, 6).join(' · '),
      })
    }
    if (fallback.record_label_labels.length > 0) {
      rows.push({
        label: 'Label(s)',
        value: fallback.record_label_labels.slice(0, 6).join(' · '),
      })
    }
    for (const value of fallback.notable_work_labels.slice(1, 9)) {
      const v = normalizeValue(value)
      if (!v) continue
      rows.push({ label: 'Album / titre', value: v })
    }
    highlightsOut = rows.slice(0, HIGHLIGHT_CAP)
    if (highlightsOut.length === 0) highlightsOut = undefined
  } else if (existingHighlights.length > 0) {
    highlightsOut = existingHighlights
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
      ...(highlightsOut ? { highlights: highlightsOut } : {}),
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
    const hasCareerData =
      (s.clubs ?? []).length > 0
      || (s.clubs_youth ?? []).length > 0
      || (s.career_highlights ?? []).length > 0
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
  if (res.status === 429) throw new Error('Wikipedia rate limit atteint. Attends quelques secondes et réessaye.')
  if (!res.ok) return null
  const json = await safeJson<{
    query?: { pages?: Record<string, { missing?: boolean; title?: string }> }
    error?: { code?: string; info?: string }
  }>(res)
  if (json?.error?.code === 'ratelimited') throw new Error('Wikipedia rate limit atteint. Attends quelques secondes et réessaye.')
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
  if (direct) return { slug: direct, lang }

  // Try title-case variant: "tim cook" → "Tim Cook" (covers mis-cased proper nouns)
  const titleCased = trimmed.replace(/\b\w/g, (c) => c.toUpperCase())
  if (titleCased !== trimmed) {
    const directCased = await tryWikipediaDirectTitle(titleCased, lang)
    if (directCased) return { slug: directCased, lang }
  }

  const searched = await searchWikipediaTitle(trimmed, lang)
  if (searched) return { slug: searched, lang }

  throw new Error(`Aucune page Wikipédia trouvée pour « ${trimmed} » (${lang}). Essaie en anglais (EN) ou colle directement l'URL Wikipedia.`)
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

async function fetchPageviewsAvg(slug: string, lang: string): Promise<number> {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), 1)
  const start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}01`
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${lang}.wikipedia.org/all-access/all-agents/${encodeURIComponent(slug)}/monthly/${fmt(start)}/${fmt(end)}`
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4_000),
      headers: { 'User-Agent': USER_AGENT },
    })
    if (!res.ok) return 0
    const json = await safeJson<{ items?: Array<{ views: number }> }>(res)
    if (!json?.items?.length) return 0
    return Math.round(json.items.reduce((s, i) => s + i.views, 0) / json.items.length)
  } catch {
    return 0
  }
}

function computeSuggestedDifficulty(sitelinks: number, avgPageviews: number): number {
  // If enrichment signals are missing (timeouts/rate limits), keep neutral difficulty
  // instead of incorrectly marking well-known people as very hard.
  if (sitelinks <= 0 && avgPageviews <= 0) return 3

  const slScore = sitelinks > 0 ? Math.min(100, (Math.log(sitelinks + 1) / Math.log(201)) * 100) : 0
  const pvScore = avgPageviews > 0 ? Math.min(100, (Math.log(avgPageviews + 1) / Math.log(5_000_001)) * 100) : 0
  const score = sitelinks > 0 && avgPageviews > 0
    ? slScore * 0.6 + pvScore * 0.4
    : Math.max(slScore, pvScore)
  if (score >= 80) return 1
  if (score >= 60) return 2
  if (score >= 40) return 3
  if (score >= 20) return 4
  return 5
}

export async function fetchWikipediaData(
  slug: string,
  lang = 'fr',
  options?: { bypassCache?: boolean }
): Promise<WikiFetchResult> {
  let meta = await fetchPageMeta(slug, lang)
  if (!meta) {
    const q = slug.trim().replace(/_/g, ' ').trim()
    const searched = q.length > 0 ? await searchWikipediaTitle(q, lang) : null
    if (searched) {
      meta = await fetchPageMeta(searched, lang)
    }
  }
  if (!meta) {
    throw new Error(`Page Wikipédia introuvable (${lang}) : « ${slug.trim()} ». Vérifie la langue (FR/EN) ou le titre exact.`)
  }
  const { displayTitle, slugUnderscore, entityId: resolvedEntityId } = meta
  const cacheKey = `${lang}:${slugUnderscore}`
  if (!options?.bypassCache) {
    const cached = wikiCache.get(cacheKey)
    if (cached) return cached
  }

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
  let avgPageviews = 0
  try {
    if (resolvedEntityId) {
      ;[wikidata, avgPageviews] = await Promise.all([
        withSoftTimeout(fetchWikidataFallback(resolvedEntityId, lang), OPTIONAL_ENRICH_TIMEOUT_MS, null),
        withSoftTimeout(fetchPageviewsAvg(slugUnderscore, lang), OPTIONAL_ENRICH_TIMEOUT_MS, 0),
      ])
    }
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

  const suggested_difficulty = computeSuggestedDifficulty(wikidata?.sitelinks_count ?? 0, avgPageviews)

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
    suggested_difficulty,
  }
  wikiCache.set(cacheKey, result)
  return result
}
