/**
 * challenge.service.ts
 * Core business logic for the daily challenge.
 * All answer data is NEVER sent to the client – only structured hint objects.
 */

import db from '../db/database.js';
import { normalise, isGuessCorrect } from '../lib/matching.js';
import { escapeHtml } from '../lib/utils.js';

const MAX_ATTEMPTS = parseInt(process.env.MAX_ATTEMPTS ?? '5', 10);
const MAX_HINTS = 3;
const VALID_HINTS = new Set(['year', 'director', 'creator', 'genres', 'cast', 'tagline', 'synopsis']);
const IMAGE_SOURCE = process.env.IMAGE_SOURCE ?? 'tmdb';
const TMDB_BASE = process.env.TMDB_IMAGE_BASE_URL ?? 'https://image.tmdb.org/t/p/w500';

// ─── Internal types ───────────────────────────────────────────────────────────

interface FilmRow {
  id: number;
  title: string;
  title_aliases: string;
  year: number;
  director: string;
  genres: string;
  cast_members: string;
  tagline: string | null;
  synopsis: string | null;
  image_url: string;
  image_blurred_url: string | null;
  tmdb_id: number | null;
}

interface SeriesRow {
  id: number;
  title: string;
  title_aliases: string;
  year: number;
  creator: string;
  genres: string;
  cast_members: string;
  tagline: string | null;
  synopsis: string | null;
  image_url: string;
  image_blurred_url: string | null;
  tmdb_id: number | null;
  number_of_seasons: number | null;
  network: string | null;
  status: string | null;
}

interface ChallengeRow {
  id: number;
  challenge_date: string;
  film_id: number | null;
  series_id: number | null;
  challenge_number: number;
  hint_schedule: string;
}

interface SessionRow {
  id: number;
  session_token: string;
  challenge_id: number;
  attempts: string;
  hints_revealed: number;
  outcome: 'won' | 'lost' | null;
  started_at: string;
  finished_at: string | null;
}

interface AttemptEntry {
  guess: string;
  correct: boolean;
  ts: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function resolveImageUrl(raw: string): string {
  if (IMAGE_SOURCE === 'tmdb') {
    if (raw.startsWith('http') || raw.startsWith('/uploads/')) return raw;
    return `${TMDB_BASE}${raw}`;
  }
  return raw; // local path served by Express static middleware
}

/** Returns current date in Europe/Paris timezone as YYYY-MM-DD */
function getTodayParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}

function hasAdjacentScheduledChallenge(
  date: string,
  direction: 'prev' | 'next',
  mediaType: 'film' | 'series'
): boolean {
  const todayParis = getTodayParis();
  const stmt =
    direction === 'prev'
      ? db.prepare<[string, string, string], { n: number }>(
          `SELECT 1 AS n FROM daily_challenges
           WHERE challenge_date < ? AND challenge_date <= ? AND media_type = ?
           LIMIT 1`
        )
      : db.prepare<[string, string, string], { n: number }>(
          `SELECT 1 AS n FROM daily_challenges
           WHERE challenge_date > ? AND challenge_date <= ? AND media_type = ?
           LIMIT 1`
        );
  return stmt.get(date, todayParis, mediaType) !== undefined;
}

// ─── Public service methods ───────────────────────────────────────────────────

/** Return today's challenge row (throws if not found) */
export function getTodayChallenge(type: 'film' | 'series' = 'film'): ChallengeRow {
  const today = getTodayParis();
  const row = db
    .prepare<[string, string], ChallengeRow>(
      `SELECT * FROM daily_challenges WHERE challenge_date <= ? AND media_type = ?
       ORDER BY challenge_date DESC LIMIT 1`
    ).get(today, type);
  if (!row) throw Object.assign(new Error(`No ${type} challenge scheduled`), { status: 404 });
  return row;
}

/** Return a challenge row by its ID */
export function getChallengeById(id: number): ChallengeRow {
  const row = db
    .prepare<[number], ChallengeRow>(`SELECT * FROM daily_challenges WHERE id = ?`)
    .get(id);
  if (!row) throw Object.assign(new Error(`No challenge found with id ${id}`), { status: 404 });
  return row;
}

/** Return a challenge by a specific date (throws if not found) */
export function getChallengeByDate(date: string, type: 'film' | 'series' = 'film'): ChallengeRow {
  const row = db
    .prepare<[string, string], ChallengeRow>(
      `SELECT * FROM daily_challenges WHERE challenge_date = ? AND media_type = ?`
    ).get(date, type);
  if (!row) throw Object.assign(new Error(`No ${type} challenge for ${date}`), { status: 404 });
  return row;
}

/**
 * Get or create a game session for the given token + challenge.
 * Never returns the film answer.
 */
export function getOrCreateSession(
  sessionToken: string,
  challengeId: number
): SessionRow {
  const existing = db
    .prepare<[string, number], SessionRow>(
      `SELECT * FROM game_sessions WHERE session_token = ? AND challenge_id = ?`
    )
    .get(sessionToken, challengeId);

  if (existing) return existing;

  db.prepare(
    `INSERT INTO game_sessions (session_token, challenge_id)
     VALUES (?, ?)`
  ).run(sessionToken, challengeId);

  return db
    .prepare<[string, number], SessionRow>(
      `SELECT * FROM game_sessions WHERE session_token = ? AND challenge_id = ?`
    )
    .get(sessionToken, challengeId)!;
}

/**
 * Build the public-safe challenge payload.
 * Only reveals hints up to `session.hints_revealed`.
 * NEVER includes the answer title in the response.
 */
export function buildChallengePayload(
  challenge: ChallengeRow,
  session: SessionRow
) {
  const isSeries = challenge.series_id !== null;

  let title_aliases: string;
  let year: number;
  let genres: string;
  let cast_members: string;
  let tagline: string | null;
  let synopsis: string | null;
  let image_url: string;
  let directorOrCreator: string;

  if (isSeries) {
    const s = db
      .prepare<[number], SeriesRow>(`SELECT * FROM series WHERE id = ?`)
      .get(challenge.series_id!)!;
    title_aliases = s.title_aliases;
    year = s.year;
    genres = s.genres;
    cast_members = s.cast_members;
    tagline = s.tagline;
    synopsis = s.synopsis;
    image_url = s.image_url;
    directorOrCreator = s.creator;
  } else {
    const film = db
      .prepare<[number], FilmRow>(`SELECT * FROM films WHERE id = ?`)
      .get(challenge.film_id!)!;
    title_aliases = film.title_aliases;
    year = film.year;
    genres = film.genres;
    cast_members = film.cast_members;
    tagline = film.tagline;
    synopsis = film.synopsis;
    image_url = film.image_url;
    directorOrCreator = film.director;
  }

  const schedule: string[] = (JSON.parse(challenge.hint_schedule) as string[]).filter(h => VALID_HINTS.has(h)).slice(0, MAX_HINTS);
  const hintsRevealed = Math.min(session.hints_revealed, MAX_HINTS);
  const attempts: AttemptEntry[] = JSON.parse(session.attempts);

  const hints = schedule.slice(0, hintsRevealed).map((type) => {
    switch (type) {
      case 'year':     return { type, value: year };
      case 'director': return { type, value: directorOrCreator };
      case 'creator':  return { type, value: directorOrCreator };
      case 'genres':   return { type, value: JSON.parse(genres) as string[] };
      case 'cast': {
        const cast = JSON.parse(cast_members) as string[];
        return { type, value: cast.slice(0, 1) };
      }
      case 'tagline':  return { type, value: tagline ?? '' };
      case 'synopsis': return { type, value: synopsis ?? '' };
      default:         return { type, value: null };
    }
  });

  const isGameOver = session.outcome !== null;
  const resolvedImageUrl = resolveImageUrl(image_url);
  const today = getTodayParis();
  const isPastChallenge = challenge.challenge_date < today;
  const mediaType = isSeries ? 'series' : 'film';

  return {
    challengeId: challenge.id,
    challengeNumber: challenge.challenge_number,
    date: challenge.challenge_date,
    isPastChallenge,
    mediaType,
    hasPrevChallenge: hasAdjacentScheduledChallenge(challenge.challenge_date, 'prev', mediaType),
    hasNextChallenge: hasAdjacentScheduledChallenge(challenge.challenge_date, 'next', mediaType),
    imageUrl: resolvedImageUrl,
    isGameOver,
    hintsAvailable: schedule.length,
    hintsRevealed: hintsRevealed,
    hints,
    attemptsUsed: attempts.length,
    maxAttempts: MAX_ATTEMPTS,
    attempts: attempts.map((a) => ({ guess: a.guess, correct: a.correct })),
    outcome: session.outcome,
  };
}

/**
 * Process a guess attempt.
 * Returns { correct, outcome, attemptsLeft, payload }
 */
export function processGuess(
  sessionToken: string,
  challengeId: number,
  rawGuess: string
): {
  correct: boolean;
  outcome: 'won' | 'lost' | null;
  attemptsLeft: number;
  nextHintUnlocked: boolean;
} {
  const session = getOrCreateSession(sessionToken, challengeId);

  // Guard: game already finished
  if (session.outcome !== null) {
    throw Object.assign(new Error('Game already finished'), { status: 409 });
  }

  const attempts: AttemptEntry[] = JSON.parse(session.attempts);

  // Guard: max attempts already reached (shouldn't normally happen if client is correct)
  if (attempts.length >= MAX_ATTEMPTS) {
    throw Object.assign(new Error('No attempts remaining'), { status: 409 });
  }

  // Fetch challenge then film/series
  const challenge = db
    .prepare<[number], ChallengeRow>(`SELECT * FROM daily_challenges WHERE id = ?`)
    .get(challengeId)!;

  let mediaTitle: string;
  let mediaAliases: string;

  if (challenge.series_id !== null) {
    const s = db.prepare<[number], { title: string; title_aliases: string }>(`SELECT title, title_aliases FROM series WHERE id = ?`).get(challenge.series_id)!;
    mediaTitle = s.title;
    mediaAliases = s.title_aliases;
  } else {
    const f = db.prepare<[number], { title: string; title_aliases: string }>(`SELECT title, title_aliases FROM films WHERE id = ?`).get(challenge.film_id!)!;
    mediaTitle = f.title;
    mediaAliases = f.title_aliases;
  }

  // Build accepted answers from title + aliases
  const aliases: string[] = JSON.parse(mediaAliases);
  const accepted = [mediaTitle, ...aliases].map(normalise);
  const correct = isGuessCorrect(rawGuess, accepted);

  // Append attempt
  const newAttempt: AttemptEntry = {
    guess: escapeHtml(rawGuess),
    correct,
    ts: new Date().toISOString(),
  };
  attempts.push(newAttempt);

  // Determine new outcome
  const schedule: string[] = (JSON.parse(challenge.hint_schedule) as string[]).filter(h => VALID_HINTS.has(h)).slice(0, MAX_HINTS);
  let newOutcome: 'won' | 'lost' | null = null;
  let newHintsRevealed = Math.min(session.hints_revealed, MAX_HINTS);
  let nextHintUnlocked = false;

  if (correct) {
    newOutcome = 'won';
  } else if (attempts.length >= MAX_ATTEMPTS) {
    newOutcome = 'lost';
  } else {
    // Wrong guess: unlock the next hint automatically
    if (newHintsRevealed < schedule.length) {
      newHintsRevealed += 1;
      nextHintUnlocked = true;
    }
  }

  const finishedAt = newOutcome ? new Date().toISOString() : null;

  db.prepare(
    `UPDATE game_sessions
     SET attempts = ?, hints_revealed = ?, outcome = ?, finished_at = ?
     WHERE session_token = ? AND challenge_id = ?`
  ).run(
    JSON.stringify(attempts),
    newHintsRevealed,
    newOutcome,
    finishedAt,
    sessionToken,
    challengeId
  );

  return {
    correct,
    outcome: newOutcome,
    attemptsLeft: MAX_ATTEMPTS - attempts.length,
    nextHintUnlocked,
  };
}

/**
 * Get the final result payload (only allowed when game is over).
 * This is the ONLY endpoint that ever reveals film.title.
 */
export function getResult(sessionToken: string, challengeId: number) {
  const session = db
    .prepare<[string, number], SessionRow>(
      `SELECT * FROM game_sessions WHERE session_token = ? AND challenge_id = ?`
    )
    .get(sessionToken, challengeId);

  if (!session) throw Object.assign(new Error('No session found'), { status: 404 });
  if (session.outcome === null) {
    throw Object.assign(new Error('Game not finished yet'), { status: 403 });
  }

  const challenge = db
    .prepare<[number], ChallengeRow>(`SELECT * FROM daily_challenges WHERE id = ?`)
    .get(challengeId)!;

  const attempts: AttemptEntry[] = JSON.parse(session.attempts);

  if (challenge.series_id !== null) {
    const s = db
      .prepare<[number], SeriesRow>(`SELECT * FROM series WHERE id = ?`)
      .get(challenge.series_id)!;

    return {
      outcome: session.outcome,
      mediaType: 'series',
      title: s.title,
      year: s.year,
      director: null,
      creator: s.creator,
      genres: JSON.parse(s.genres),
      cast: JSON.parse(s.cast_members),
      tagline: s.tagline,
      synopsis: s.synopsis,
      imageUrl: resolveImageUrl(s.image_url),
      tmdbId: s.tmdb_id,
      number_of_seasons: s.number_of_seasons,
      network: s.network,
      status: s.status,
      attemptsUsed: attempts.length,
      maxAttempts: MAX_ATTEMPTS,
      attempts: attempts.map((a) => ({ guess: a.guess, correct: a.correct })),
      startedAt: session.started_at,
      finishedAt: session.finished_at,
    };
  }

  const film = db
    .prepare<[number], FilmRow>(`SELECT * FROM films WHERE id = ?`)
    .get(challenge.film_id!)!;

  return {
    outcome: session.outcome,
    mediaType: 'film',
    title: film.title,
    year: film.year,
    director: film.director,
    creator: null,
    genres: JSON.parse(film.genres),
    cast: JSON.parse(film.cast_members),
    tagline: film.tagline,
    synopsis: film.synopsis,
    imageUrl: resolveImageUrl(film.image_url),
    tmdbId: film.tmdb_id,
    number_of_seasons: null,
    network: null,
    status: null,
    attemptsUsed: attempts.length,
    maxAttempts: MAX_ATTEMPTS,
    attempts: attempts.map((a) => ({ guess: a.guess, correct: a.correct })),
    startedAt: session.started_at,
    finishedAt: session.finished_at,
  };
}

/** Global anonymous statistics */
export function getGlobalStats() {
  const stats = db
    .prepare(`SELECT * FROM global_stats WHERE id = 1`)
    .get() as {
    total_games: number;
    total_wins: number;
    total_losses: number;
    wins_by_attempt: string;
    last_updated: string;
  };

  const winRate =
    stats.total_games > 0
      ? Math.round((stats.total_wins / stats.total_games) * 100)
      : 0;

  return {
    totalGames: stats.total_games,
    totalWins: stats.total_wins,
    totalLosses: stats.total_losses,
    winRate,
    winsByAttempt: JSON.parse(stats.wins_by_attempt),
    lastUpdated: stats.last_updated,
  };
}

/** Autocomplete search for films – returns titles only, never exposes today's answer */
export function searchFilms(query: string, limit = 10, excludeChallengeId?: number) {
  if (!query || query.trim().length < 2) return [];
  const safeQuery = normalise(query).replace(/[%_]/g, '\\$&');

  const todayChallenge = (() => {
    try {
      return getTodayChallenge('film');
    } catch {
      return null;
    }
  })();

  const rows = db
    .prepare<[string, number], { id: number; title: string; year: number }>(
      `SELECT id, title, year FROM films
       WHERE title_lower LIKE ? ESCAPE '\\' AND is_active = 1
       AND NOT EXISTS (
         SELECT 1 FROM daily_challenges dc
         WHERE dc.film_id = films.id AND dc.challenge_date > date('now')
       )
       ORDER BY title ASC
       LIMIT ?`
    )
    .all(`%${safeQuery}%`, limit + 1);

  const excludeIds = new Set<number>();
  if (todayChallenge?.film_id) excludeIds.add(todayChallenge.film_id);
  if (excludeChallengeId) {
    const ch = db.prepare<[number], ChallengeRow>(`SELECT * FROM daily_challenges WHERE id = ?`).get(excludeChallengeId);
    if (ch?.film_id) excludeIds.add(ch.film_id);
  }

  const filtered = rows.filter((r) => !excludeIds.has(r.id));
  return filtered.slice(0, limit).map((r) => ({ title: r.title, year: r.year }));
}

/** Autocomplete search for series – returns titles only, never exposes today's answer */
export function searchSeries(query: string, limit = 10, excludeChallengeId?: number) {
  if (!query || query.trim().length < 2) return [];
  const safeQuery = normalise(query).replace(/[%_]/g, '\\$&');

  const todayChallenge = (() => {
    try {
      return getTodayChallenge('series');
    } catch {
      return null;
    }
  })();

  const rows = db
    .prepare<[string, number], { id: number; title: string; year: number }>(
      `SELECT id, title, year FROM series
       WHERE title_lower LIKE ? ESCAPE '\\' AND is_active = 1
       AND NOT EXISTS (
         SELECT 1 FROM daily_challenges dc
         WHERE dc.series_id = series.id AND dc.challenge_date > date('now')
       )
       ORDER BY title ASC
       LIMIT ?`
    )
    .all(`%${safeQuery}%`, limit + 1);

  const excludeIds = new Set<number>();
  if (todayChallenge?.series_id) excludeIds.add(todayChallenge.series_id);
  if (excludeChallengeId) {
    const ch = db.prepare<[number], ChallengeRow>(`SELECT * FROM daily_challenges WHERE id = ?`).get(excludeChallengeId);
    if (ch?.series_id) excludeIds.add(ch.series_id);
  }

  const filtered = rows.filter((r) => !excludeIds.has(r.id));
  return filtered.slice(0, limit).map((r) => ({ title: r.title, year: r.year }));
}
