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

export type WikiInfoboxData = WikiPoliticianData | WikiSportspersonData

export interface WikiFetchResult {
  name: string
  extract: string | null
  photo_url: string | null
  wikipedia_url: string
  infobox_data: WikiInfoboxData
  person_type: 'politician' | 'sportsperson'
  hint_schedule: string[]
}

/** Strip wikilinks: [[Target|Label]] → Label, [[Target]] → Target */
function stripLinks(s: string): string {
  return s
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .trim()
}

/** Extract year from strings like "2017", "14 mai 2017", "{{birth year|1977}}" */
function extractYear(s: string): number | null {
  const m = s.match(/\b(1[89]\d{2}|20\d{2})\b/)
  return m ? parseInt(m[1], 10) : null
}

/** Detect person type from infobox template name */
function detectPersonType(wikitext: string): 'politician' | 'sportsperson' {
  const sportKeywords = [
    'Infobox football biography', 'Infobox sportsperson', 'Infobox rugby biography',
    'Infobox tennis biography', 'Infobox basketball biography', 'Infobox ice hockey player',
    'Infobox cyclist', 'Infobox swimmer', 'Infobox athlete', 'Infobox golfer',
    'Infobox boxer', 'Infobox racing driver', 'Infobox cricketer',
  ]
  const lower = wikitext.toLowerCase()
  if (sportKeywords.some(k => lower.includes(k.toLowerCase()))) return 'sportsperson'
  return 'politician'
}

function parsePoliticianData(wikitext: string): WikiPoliticianData {
  const roles: WikiRole[] = []

  // Extract office blocks: office, term_start, term_end, predecessor, successor
  const officeMatches = [...wikitext.matchAll(/\|\s*office\s*=\s*([^\n|]+)/g)]
  for (const m of officeMatches) {
    const title = stripLinks(m[1]).trim()
    if (!title) continue

    const offsetAfter = m.index! + m[0].length
    const block = wikitext.slice(offsetAfter, offsetAfter + 800)

    const termStart = block.match(/\|\s*term_start\d*\s*=\s*([^\n|]+)/)?.[1] ?? ''
    const termEnd = block.match(/\|\s*term_end\d*\s*=\s*([^\n|]+)/)?.[1] ?? ''
    const pred = block.match(/\|\s*predecessor\d*\s*=\s*([^\n|]+)/)?.[1] ?? ''
    const succ = block.match(/\|\s*successor\d*\s*=\s*([^\n|]+)/)?.[1] ?? ''

    // Redact country from title: replace country name with [PAYS]
    const countryMatch = block.match(/\|\s*country\d*\s*=\s*([^\n|]+)/)
    const country = countryMatch ? stripLinks(countryMatch[1]).trim() : null

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
    wikitext.match(/\|\s*birth_date\s*=\s*([^\n|]+)/)?.[1] ?? ''
  )

  const party = stripLinks(
    wikitext.match(/\|\s*party\s*=\s*([^\n|]+)/)?.[1] ?? ''
  ).trim() || null

  const nationality = stripLinks(
    wikitext.match(/\|\s*nationality\s*=\s*([^\n|]+)/)?.[1] ?? ''
  ).trim() || null

  return { roles: roles.slice(0, 6), party, birth_year: birthYear, nationality }
}

function parseSportspersonData(wikitext: string): WikiSportspersonData {
  const clubs: WikiClub[] = []

  // clubs section: | clubs = \n {{fb cl|Club}} \n ...
  const clubsBlock = wikitext.match(/\|\s*clubs\s*=\s*([\s\S]*?)(?=\n\s*\|(?![\s\S]*?\|\s*clubs))/)?.[1] ?? ''
  const yearsBlock = wikitext.match(/\|\s*clinyears\s*=\s*([\s\S]*?)(?=\n\s*\|)/)?.[1] ?? ''
  const capsBlock = wikitext.match(/\|\s*clingoals\s*=\s*([\s\S]*?)(?=\n\s*\|)/)?.[1] ?? ''

  // Try simpler club extraction from list lines
  const clubLines = clubsBlock.split('\n').map(l => stripLinks(l).trim()).filter(Boolean)
  const yearLines = yearsBlock.split('\n').map(l => l.trim()).filter(Boolean)

  for (let i = 0; i < clubLines.length; i++) {
    const yearStr = yearLines[i] ?? ''
    const yearRange = yearStr.match(/(\d{4})\s*[-–]\s*(\d{4}|\s*)/)
    clubs.push({
      name: clubLines[i],
      start_year: yearRange ? parseInt(yearRange[1], 10) : null,
      end_year: yearRange?.[2]?.trim() ? parseInt(yearRange[2], 10) : null,
      appearances: null,
      goals: null,
    })
  }

  // National team
  const ntName = stripLinks(wikitext.match(/\|\s*nationalteam\s*=\s*([^\n|]+)/)?.[1] ?? '').trim()
  const ntCaps = wikitext.match(/\|\s*nationalcaps\s*=\s*([^\n|]+)/)?.[1]
  const ntGoals = wikitext.match(/\|\s*nationalgoals\s*=\s*([^\n|]+)/)?.[1]

  const national_team = ntName ? {
    name: ntName,
    caps: ntCaps ? parseInt(ntCaps.trim(), 10) || null : null,
    goals: ntGoals ? parseInt(ntGoals.trim(), 10) || null : null,
  } : null

  const birthYear = extractYear(
    wikitext.match(/\|\s*birth_date\s*=\s*([^\n|]+)/)?.[1] ?? ''
  )

  const sport = stripLinks(
    wikitext.match(/\|\s*sport\s*=\s*([^\n|]+)/)?.[1] ?? 'Football'
  ).trim()

  const position = stripLinks(
    wikitext.match(/\|\s*position\s*=\s*([^\n|]+)/)?.[1] ?? ''
  ).trim() || null

  const nationality = stripLinks(
    wikitext.match(/\|\s*nationality\s*=\s*([^\n|]+)/)?.[1] ?? ''
  ).trim() || null

  return {
    sport: sport || 'Football',
    position,
    clubs: clubs.slice(0, 8),
    national_team,
    birth_year: birthYear,
    nationality,
  }
}

function defaultHintSchedule(personType: 'politician' | 'sportsperson'): string[] {
  if (personType === 'politician') {
    return ['roles_titles_only', 'roles_with_dates', 'roles_with_countries', 'predecessor_names', 'birth_year_party']
  }
  return ['clubs_names_only', 'clubs_with_years', 'clubs_with_stats', 'national_team', 'sport_position_birth']
}

export async function fetchWikipediaData(slug: string, lang = 'fr'): Promise<WikiFetchResult> {
  // 1. Summary (extract + thumbnail)
  const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`
  const summaryRes = await fetch(summaryUrl, { headers: { 'User-Agent': 'MovieGame/1.0 (admin tool)' } })
  if (!summaryRes.ok) throw new Error(`Wikipedia summary fetch failed: ${summaryRes.status}`)
  const summary = await summaryRes.json() as {
    title: string
    extract: string
    thumbnail?: { source: string }
    content_urls?: { desktop?: { page?: string } }
  }

  // 2. Wikitext (infobox)
  const wikitextUrl = `https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(slug)}&prop=wikitext&format=json&formatversion=2`
  const wikitextRes = await fetch(wikitextUrl, { headers: { 'User-Agent': 'MovieGame/1.0 (admin tool)' } })
  const wikitextJson = await wikitextRes.json() as { parse?: { wikitext: string } }
  const wikitext = wikitextJson.parse?.wikitext ?? ''

  const personType = detectPersonType(wikitext)
  const infobox_data = personType === 'politician'
    ? parsePoliticianData(wikitext)
    : parseSportspersonData(wikitext)

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
