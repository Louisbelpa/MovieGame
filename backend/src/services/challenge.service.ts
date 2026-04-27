/**
 * challenge.service.ts
 * Core business logic for the daily challenge.
 * All answer data is NEVER sent to the client – only structured hint objects.
 */

import db from '../db/database.js';

const MAX_ATTEMPTS = parseInt(process.env.MAX_ATTEMPTS ?? '3', 10);
const MAX_HINTS = 3;
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
}

interface ChallengeRow {
  id: number;
  challenge_date: string;
  film_id: number;
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

function resolveImageUrl(raw: string): string {
  if (IMAGE_SOURCE === 'tmdb') {
    return raw.startsWith('http') ? raw : `${TMDB_BASE}${raw}`;
  }
  return raw; // local path served by Express static middleware
}

/** Normalise a guess: lowercase, strip punctuation, collapse whitespace */
function normalise(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

// ─── Public service methods ───────────────────────────────────────────────────

/** Return today's challenge row (throws if not found) */
export function getTodayChallenge(): ChallengeRow {
  const today = getTodayUTC();
  const row = db
    .prepare<[string], ChallengeRow>(
      `SELECT dc.* FROM daily_challenges dc
       WHERE dc.challenge_date = ?`
    )
    .get(today);

  if (!row) throw new Error(`No challenge scheduled for ${today}`);
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
 * NEVER includes film.title in the response.
 */
export function buildChallengePayload(
  challenge: ChallengeRow,
  session: SessionRow
) {
  const film = db
    .prepare<[number], FilmRow>(`SELECT * FROM films WHERE id = ?`)
    .get(challenge.film_id)!;

  const schedule: string[] = (JSON.parse(challenge.hint_schedule) as string[]).slice(0, MAX_HINTS);
  const hintsRevealed = Math.min(session.hints_revealed, MAX_HINTS);
  const attempts: AttemptEntry[] = JSON.parse(session.attempts);

  // Build revealed hints array – one object per unlocked hint
  const hints = schedule.slice(0, hintsRevealed).map((type) => {
    switch (type) {
      case 'year':     return { type, value: film.year };
      case 'director': return { type, value: film.director };
      case 'genres':   return { type, value: JSON.parse(film.genres) as string[] };
      case 'cast':     return { type, value: JSON.parse(film.cast_members) as string[] };
      case 'tagline':  return { type, value: film.tagline ?? '' };
      case 'synopsis': return { type, value: film.synopsis ?? '' };
      default:         return { type, value: null };
    }
  });

  const isGameOver = session.outcome !== null;
  const imageUrl = resolveImageUrl(film.image_url);

  return {
    challengeId: challenge.id,
    challengeNumber: challenge.challenge_number,
    date: challenge.challenge_date,
    imageUrl,
    isGameOver,
    hintsAvailable: schedule.length,
    hintsRevealed: hintsRevealed,
    hints,
    attemptsUsed: attempts.length,
    maxAttempts: MAX_ATTEMPTS,
    attempts: attempts.map((a) => ({ guess: a.guess, correct: a.correct })),
    outcome: session.outcome,    // null | 'won' | 'lost'
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

  // Fetch challenge then film (challengeId IS the challenge row id, not film id)
  const challenge = db
    .prepare<[number], ChallengeRow>(`SELECT * FROM daily_challenges WHERE id = ?`)
    .get(challengeId)!;

  const filmRow = db
    .prepare<[number], FilmRow>(`SELECT * FROM films WHERE id = ?`)
    .get(challenge.film_id)!;

  // Build accepted answers from title + aliases
  const aliases: string[] = JSON.parse(filmRow.title_aliases);
  const accepted = [filmRow.title, ...aliases].map(normalise);
  const correct = accepted.includes(normalise(rawGuess));

  // Append attempt
  const newAttempt: AttemptEntry = {
    guess: rawGuess,
    correct,
    ts: new Date().toISOString(),
  };
  attempts.push(newAttempt);

  // Determine new outcome
  const schedule: string[] = (JSON.parse(challenge.hint_schedule) as string[]).slice(0, MAX_HINTS);
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

  const film = db
    .prepare<[number], FilmRow>(`SELECT * FROM films WHERE id = ?`)
    .get(challenge.film_id)!;

  const attempts: AttemptEntry[] = JSON.parse(session.attempts);

  return {
    outcome: session.outcome,
    title: film.title,
    year: film.year,
    director: film.director,
    genres: JSON.parse(film.genres),
    cast: JSON.parse(film.cast_members),
    tagline: film.tagline,
    synopsis: film.synopsis,
    imageUrl: resolveImageUrl(film.image_url),
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

/** Autocomplete search – returns titles only, never exposes today's answer */
export function searchFilms(query: string, limit = 10) {
  if (!query || query.trim().length < 2) return [];

  const todayChallenge = (() => {
    try {
      return getTodayChallenge();
    } catch {
      return null;
    }
  })();

  const rows = db
    .prepare<[string, number], { id: number; title: string; year: number }>(
      `SELECT id, title, year FROM films
       WHERE title_lower LIKE ? AND is_active = 1
       ORDER BY title ASC
       LIMIT ?`
    )
    .all(`%${normalise(query)}%`, limit + 1); // fetch one extra to exclude today if needed

  // Filter out today's challenge film from autocomplete to avoid leaking the answer
  const filtered = todayChallenge
    ? rows.filter((r) => r.id !== todayChallenge.film_id)
    : rows;

  return filtered.slice(0, limit).map((r) => ({ title: r.title, year: r.year }));
}
