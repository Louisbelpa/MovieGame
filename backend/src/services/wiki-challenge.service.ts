/**
 * wiki-challenge.service.ts
 * Core business logic for the Wikipedia person-guessing game.
 * Answer name is NEVER sent to clients — only structured hint objects.
 */

import db from '../db/database.js'
import { normalise, isGuessCorrect } from '../lib/matching.js'

const MAX_ATTEMPTS = parseInt(process.env.MAX_ATTEMPTS ?? '3', 10)
const MAX_HINTS = 3

// ─── Internal types ───────────────────────────────────────────────────────────

interface WikiPersonRow {
  id: number
  name: string
  name_aliases: string
  person_type: 'politician' | 'sportsperson' | 'artist' | 'scientist' | 'entrepreneur' | 'writer' | 'historical_figure' | 'generic'
  infobox_data: string
  hint_schedule: string
  photo_url: string | null
  extract: string | null
  wikipedia_url: string | null
  difficulty: number
}

interface WikiChallengeRow {
  id: number
  challenge_date: string
  wiki_person_id: number
  challenge_number: number
  hint_schedule: string
}

interface SessionRow {
  id: number
  session_token: string
  challenge_id: number
  attempts: string
  hints_revealed: number
  outcome: 'won' | 'lost' | null
  started_at: string
  finished_at: string | null
}

interface AttemptEntry {
  guess: string
  correct: boolean
  ts: string
}

// ─── Infobox types ────────────────────────────────────────────────────────────

interface WikiRole {
  title: string
  title_redacted: string
  start_year: number | null
  end_year: number | null
  country: string | null
  predecessor: string | null
  successor: string | null
}

interface WikiClub {
  name: string
  start_year: number | null
  end_year: number | null
  appearances: number | null
  goals: number | null
}

interface PoliticianData {
  roles: WikiRole[]
  party: string | null
  birth_year: number | null
  nationality: string | null
}

interface SportspersonData {
  sport: string | null
  position: string | null
  clubs: WikiClub[]
  career_highlights?: Array<{ label: string; value: string }>
  national_team: { name: string; caps: number | null; goals: number | null } | null
  birth_year: number | null
  nationality: string | null
}

interface GenericPersonData {
  domain: string | null
  notable_work: string | null
  era: string | null
  birth_year: number | null
  nationality: string | null
}

interface PoliticianRoleView {
  title: string
  years: string
  country: string | null
  predecessor: string | null
  successor: string | null
}

interface SportClubView {
  name: string
  years: string
  apps: number | null
  goals: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

function formatYearRange(start: number | null, end: number | null): string {
  if (!start) return ''
  return end ? `${start}–${end}` : `${start}–présent`
}

function computeInitials(name: string): string {
  const parts = name
    .split(/[\s-]+/)
    .map(p => p.trim())
    .filter(Boolean)
  return parts.map(p => p[0]?.toUpperCase()).filter(Boolean).join('')
}

function computeNameLength(name: string): number {
  return name.replace(/[\s'-]/g, '').length
}

function getSupplementalHintKeys(personType: WikiPersonRow['person_type']): string[] {
  if (personType === 'politician') {
    return ['birth_year', 'nationality', 'party', 'name_initials', 'name_length']
  }
  if (personType === 'sportsperson') {
    return ['birth_year', 'nationality', 'position', 'name_initials', 'name_length']
  }
  return ['birth_year', 'nationality', 'domain', 'notable_work', 'name_initials', 'name_length']
}

function normalizeMediaUrl(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null
  const v = raw.trim()
  if (v.startsWith('//')) return `https:${v}`
  return v
}

function parseHintSchedule(raw: string, personType: WikiPersonRow['person_type']): string[] {
  const allowed = new Set(getSupplementalHintKeys(personType))
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((v): v is string => typeof v === 'string')
      .filter((key) => allowed.has(key))
  } catch {
    return []
  }
}

function hasUsableHintValue(hint: { type: string; value: unknown } | null): boolean {
  if (!hint) return false
  if (hint.type === 'wiki_name_initials' || hint.type === 'wiki_name_length') return true
  if (hint.value === null || hint.value === undefined) return false
  if (typeof hint.value === 'string' && !hint.value.trim()) return false
  return true
}

function computeHintSchedule(person: WikiPersonRow, challengeScheduleRaw: string): string[] {
  const preferred = parseHintSchedule(challengeScheduleRaw, person.person_type)
  const fallback = getSupplementalHintKeys(person.person_type)
  const merged = (preferred.length > 0 ? preferred : fallback).slice(0, MAX_HINTS)
  const usable = merged.filter((key) => hasUsableHintValue(resolveHint(key, person)))
  return (usable.length > 0 ? usable : merged).slice(0, MAX_HINTS)
}

function buildVisibleProfile(person: WikiPersonRow): { type: 'politician'; roles: PoliticianRoleView[] } | {
  type: 'sportsperson'
  clubs: SportClubView[]
  sport: string | null
  careerHighlights: Array<{ label: string; value: string }>
  nationalTeam: SportspersonData['national_team']
} | {
  type: 'generic'
  domain: string | null
  notableWork: string | null
  era: string | null
} {
  const data = JSON.parse(person.infobox_data)
  if (person.person_type === 'politician') {
    const p = data as PoliticianData
    const roles = (p.roles ?? []).map((r) => ({
      title: r.title_redacted || r.title,
      years: formatYearRange(r.start_year, r.end_year),
      country: r.country,
      predecessor: r.predecessor,
      successor: r.successor,
    }))
    return { type: 'politician', roles }
  }
  if (person.person_type === 'sportsperson') {
    const s = data as SportspersonData
    const clubs = (s.clubs ?? []).map((c) => ({
      name: c.name,
      years: formatYearRange(c.start_year, c.end_year),
      apps: c.appearances,
      goals: c.goals,
    }))
    return {
      type: 'sportsperson',
      clubs,
      sport: s.sport,
      careerHighlights: (s.career_highlights ?? []).slice(0, 6),
      nationalTeam: s.national_team,
    }
  }
  const g = data as GenericPersonData
  return {
    type: 'generic',
    domain: g.domain,
    notableWork: g.notable_work,
    era: g.era,
  }
}

/**
 * Resolves a hint_schedule key against the person's infobox_data.
 * Returns a structured { type, value } hint object safe to send to the client.
 */
function resolveHint(key: string, person: WikiPersonRow): { type: string; value: unknown } | null {
  const data = JSON.parse(person.infobox_data)

  if (person.person_type === 'politician') {
    const p = data as PoliticianData

    switch (key) {
      case 'birth_year':
        return { type: 'wiki_birth_year', value: p.birth_year }
      case 'nationality':
        return { type: 'wiki_nationality', value: p.nationality }
      case 'party':
        return { type: 'wiki_party', value: p.party }
      case 'name_initials':
        return { type: 'wiki_name_initials', value: computeInitials(person.name) }
      case 'name_length':
        return { type: 'wiki_name_length', value: computeNameLength(person.name) }
    }
  }

  if (person.person_type === 'sportsperson') {
    const s = data as SportspersonData

    switch (key) {
      case 'birth_year':
        return { type: 'wiki_birth_year', value: s.birth_year }
      case 'nationality':
        return { type: 'wiki_nationality', value: s.nationality }
      case 'position':
        return { type: 'wiki_position', value: s.position }
      case 'name_initials':
        return { type: 'wiki_name_initials', value: computeInitials(person.name) }
      case 'name_length':
        return { type: 'wiki_name_length', value: computeNameLength(person.name) }
    }
  }

  const g = data as GenericPersonData
  switch (key) {
    case 'birth_year':
      return { type: 'wiki_birth_year', value: g.birth_year }
    case 'nationality':
      return { type: 'wiki_nationality', value: g.nationality }
    case 'domain':
      return { type: 'wiki_domain', value: g.domain }
    case 'notable_work':
      return { type: 'wiki_notable_work', value: g.notable_work }
    case 'name_initials':
      return { type: 'wiki_name_initials', value: computeInitials(person.name) }
    case 'name_length':
      return { type: 'wiki_name_length', value: computeNameLength(person.name) }
  }

  return null
}

// ─── Public service methods ───────────────────────────────────────────────────

export function getTodayWikiChallenge(): WikiChallengeRow {
  const today = getTodayParis()
  const row = db
    .prepare<[string], WikiChallengeRow>(
      `SELECT * FROM daily_challenges
       WHERE challenge_date <= ? AND media_type = 'wiki'
       ORDER BY challenge_date DESC LIMIT 1`
    )
    .get(today)
  if (!row) throw Object.assign(new Error('No wiki challenge scheduled'), { status: 404 })
  return row
}

export function getWikiChallengeByDate(date: string): WikiChallengeRow {
  const row = db
    .prepare<[string], WikiChallengeRow>(
      `SELECT * FROM daily_challenges WHERE challenge_date = ? AND media_type = 'wiki'`
    )
    .get(date)
  if (!row) throw Object.assign(new Error(`No wiki challenge for ${date}`), { status: 404 })
  return row
}

export function getWikiChallengeById(id: number): WikiChallengeRow {
  const row = db
    .prepare<[number], WikiChallengeRow>(`SELECT * FROM daily_challenges WHERE id = ?`)
    .get(id)
  if (!row) throw Object.assign(new Error(`No challenge found with id ${id}`), { status: 404 })
  return row
}

export function getOrCreateWikiSession(sessionToken: string, challengeId: number): SessionRow {
  const existing = db
    .prepare<[string, number], SessionRow>(
      `SELECT * FROM game_sessions WHERE session_token = ? AND challenge_id = ?`
    )
    .get(sessionToken, challengeId)
  if (existing) return existing

  db.prepare(
    `INSERT INTO game_sessions (session_token, challenge_id) VALUES (?, ?)`
  ).run(sessionToken, challengeId)

  return db
    .prepare<[string, number], SessionRow>(
      `SELECT * FROM game_sessions WHERE session_token = ? AND challenge_id = ?`
    )
    .get(sessionToken, challengeId)!
}

export function buildWikiChallengePayload(challenge: WikiChallengeRow, session: SessionRow) {
  const person = db
    .prepare<[number], WikiPersonRow>(`SELECT * FROM wiki_persons WHERE id = ?`)
    .get(challenge.wiki_person_id)!

  const schedule = computeHintSchedule(person, challenge.hint_schedule)
  const hintsRevealed = Math.min(session.hints_revealed, MAX_HINTS)
  const attempts: AttemptEntry[] = JSON.parse(session.attempts)

  const hints = schedule
    .slice(0, hintsRevealed)
    .map(key => resolveHint(key, person))
    .filter((h): h is NonNullable<typeof h> => h !== null)

  const today = getTodayParis()

  return {
    challengeId: challenge.id,
    challengeNumber: challenge.challenge_number,
    date: challenge.challenge_date,
    isPastChallenge: challenge.challenge_date < today,
    mediaType: 'wiki' as const,
    personType: person.person_type,
    photoUrl: normalizeMediaUrl(person.photo_url),
    profile: buildVisibleProfile(person),
    isGameOver: session.outcome !== null,
    hintsAvailable: schedule.length,
    hintsRevealed,
    hints,
    attemptsUsed: attempts.length,
    maxAttempts: MAX_ATTEMPTS,
    attempts: attempts.map(a => ({ guess: a.guess, correct: a.correct })),
    outcome: session.outcome,
  }
}

export function processWikiGuess(
  sessionToken: string,
  challengeId: number,
  rawGuess: string
): { correct: boolean; outcome: 'won' | 'lost' | null; attemptsLeft: number; nextHintUnlocked: boolean } {
  const session = getOrCreateWikiSession(sessionToken, challengeId)
  if (session.outcome !== null) {
    throw Object.assign(new Error('Game already finished'), { status: 409 })
  }

  const attempts: AttemptEntry[] = JSON.parse(session.attempts)
  if (attempts.length >= MAX_ATTEMPTS) {
    throw Object.assign(new Error('No attempts remaining'), { status: 409 })
  }

  const challenge = db
    .prepare<[number], WikiChallengeRow>(`SELECT * FROM daily_challenges WHERE id = ?`)
    .get(challengeId)!

  const answerPerson = db
    .prepare<[number], { name: string; name_aliases: string }>(
      `SELECT name, name_aliases FROM wiki_persons WHERE id = ?`
    )
    .get(challenge.wiki_person_id)!

  const aliases: string[] = JSON.parse(answerPerson.name_aliases)
  const accepted = [answerPerson.name, ...aliases].map(normalise)
  const correct = isGuessCorrect(rawGuess, accepted)

  attempts.push({ guess: rawGuess, correct, ts: new Date().toISOString() })

  const hintPerson = db
    .prepare<[number], Pick<WikiPersonRow, 'name' | 'person_type' | 'infobox_data'>>(
      `SELECT name, person_type, infobox_data FROM wiki_persons WHERE id = ?`
    )
    .get(challenge.wiki_person_id)!
  const personForHints: WikiPersonRow = {
    id: challenge.wiki_person_id,
    name: hintPerson.name,
    name_aliases: '[]',
    person_type: hintPerson.person_type,
    infobox_data: hintPerson.infobox_data,
    hint_schedule: challenge.hint_schedule,
    photo_url: null,
    extract: null,
    wikipedia_url: null,
    difficulty: 3,
  }
  const schedule = computeHintSchedule(personForHints, challenge.hint_schedule)
  let newOutcome: 'won' | 'lost' | null = null
  let newHintsRevealed = Math.min(session.hints_revealed, MAX_HINTS)
  let nextHintUnlocked = false

  if (correct) {
    newOutcome = 'won'
  } else if (attempts.length >= MAX_ATTEMPTS) {
    newOutcome = 'lost'
  } else if (newHintsRevealed < schedule.length) {
    newHintsRevealed += 1
    nextHintUnlocked = true
  }

  db.prepare(
    `UPDATE game_sessions
     SET attempts = ?, hints_revealed = ?, outcome = ?, finished_at = ?
     WHERE session_token = ? AND challenge_id = ?`
  ).run(
    JSON.stringify(attempts),
    newHintsRevealed,
    newOutcome,
    newOutcome ? new Date().toISOString() : null,
    sessionToken,
    challengeId
  )

  return { correct, outcome: newOutcome, attemptsLeft: MAX_ATTEMPTS - attempts.length, nextHintUnlocked }
}

export function getWikiResult(sessionToken: string, challengeId: number) {
  const session = db
    .prepare<[string, number], SessionRow>(
      `SELECT * FROM game_sessions WHERE session_token = ? AND challenge_id = ?`
    )
    .get(sessionToken, challengeId)
  if (!session) throw Object.assign(new Error('No session found'), { status: 404 })
  if (session.outcome === null) throw Object.assign(new Error('Game not finished yet'), { status: 403 })

  const challenge = db
    .prepare<[number], WikiChallengeRow>(`SELECT * FROM daily_challenges WHERE id = ?`)
    .get(challengeId)!

  const person = db
    .prepare<[number], WikiPersonRow>(`SELECT * FROM wiki_persons WHERE id = ?`)
    .get(challenge.wiki_person_id)!

  const attempts: AttemptEntry[] = JSON.parse(session.attempts)

  return {
    outcome: session.outcome,
    mediaType: 'wiki' as const,
    name: person.name,
    personType: person.person_type,
    extract: person.extract,
    photoUrl: normalizeMediaUrl(person.photo_url),
    wikipediaUrl: person.wikipedia_url,
    attemptsUsed: attempts.length,
    maxAttempts: MAX_ATTEMPTS,
    attempts: attempts.map(a => ({ guess: a.guess, correct: a.correct })),
    startedAt: session.started_at,
    finishedAt: session.finished_at,
  }
}

export function searchWikiPersons(query: string, limit = 10) {
  if (!query || query.trim().length < 2) return []

  const todayChallenge = (() => {
    try { return getTodayWikiChallenge() }
    catch { return null }
  })()

  const rows = db
    .prepare<[string, number], { id: number; name: string; person_type: string }>(
      `SELECT id, name, person_type FROM wiki_persons
       WHERE name_lower LIKE ? AND is_active = 1
       ORDER BY name ASC LIMIT ?`
    )
    .all(`%${normalise(query)}%`, limit + 1)

  const excludeId = todayChallenge?.wiki_person_id
  return rows
    .filter(r => r.id !== excludeId)
    .slice(0, limit)
    .map(r => ({ title: r.name, year: r.person_type }))
}

export function getWikiGlobalStats() {
  const stats = db.prepare(`SELECT * FROM wiki_global_stats WHERE id = 1`).get() as {
    total_games: number; total_wins: number; total_losses: number
    wins_by_attempt: string; last_updated: string
  }
  const winRate = stats.total_games > 0
    ? Math.round((stats.total_wins / stats.total_games) * 100) : 0
  return {
    totalGames: stats.total_games,
    totalWins: stats.total_wins,
    totalLosses: stats.total_losses,
    winRate,
    winsByAttempt: JSON.parse(stats.wins_by_attempt),
    lastUpdated: stats.last_updated,
  }
}
