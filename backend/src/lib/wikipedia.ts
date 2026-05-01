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

  const position = stripLinks(
    wikitext.match(/\|\s*(?:position|poste)\s*=\s*([^\n|]+)/i)?.[1] ?? ''
  ).trim() || null

  const nationality = stripLinks(readInfoboxField(fields, ['nationality', 'nationalité', 'nation sportive'])).trim() || null

  return {
    sport: sport || 'Football',
    position,
    clubs: dedupedClubs.slice(0, 8),
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

function defaultHintSchedule(personType: WikiPersonType): string[] {
  if (personType === 'politician') {
    return ['birth_year', 'nationality', 'party', 'name_initials', 'name_length']
  }
  if (personType === 'sportsperson') {
    return ['birth_year', 'nationality', 'position', 'name_initials', 'name_length']
  }
  return ['birth_year', 'nationality', 'domain', 'notable_work', 'name_initials']
}

export async function fetchWikipediaData(slug: string, lang = 'fr'): Promise<WikiFetchResult> {
  // 1. Summary (extract + thumbnail)
  const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`
  const summaryRes = await fetch(summaryUrl, { headers: { 'User-Agent': 'MovieGame/1.0 (admin tool)' } })
  if (!summaryRes.ok) throw new Error(`Wikipedia summary fetch failed: ${summaryRes.status}`)
  const summary = await summaryRes.json() as {
    title: string
    extract: string
    description?: string
    thumbnail?: { source: string }
    content_urls?: { desktop?: { page?: string } }
  }

  // 2. Wikitext (infobox)
  const wikitextUrl = `https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(slug)}&prop=wikitext&format=json&formatversion=2`
  const wikitextRes = await fetch(wikitextUrl, { headers: { 'User-Agent': 'MovieGame/1.0 (admin tool)' } })
  const wikitextJson = await wikitextRes.json() as { parse?: { wikitext: string } }
  const wikitext = wikitextJson.parse?.wikitext ?? ''

  const personType = detectPersonTypeFromSummary(summary.description) ?? detectPersonType(wikitext)
  const infobox_data = personType === 'politician'
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

  return {
    name: summary.title,
    extract: summary.extract?.slice(0, 500) || null,
    photo_url: summary.thumbnail?.source ?? null,
    wikipedia_url: summary.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(slug)}`,
    infobox_data,
    person_type: personType,
    hint_schedule: defaultHintSchedule(personType),
  }
}
