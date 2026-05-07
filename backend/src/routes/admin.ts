/**
 * routes/admin.ts
 * Back-office routes for the FrameQuest admin panel.
 *
 * All routes except /login and /logout require the admin_token cookie,
 * validated by the adminAuth middleware.
 *
 * Auth
 *   POST /api/admin/login     – set admin_token cookie (7 days)
 *   POST /api/admin/logout    – clear admin_token cookie
 *
 * Films CRUD
 *   GET    /api/admin/films           – all films (active + inactive), paginated
 *   POST   /api/admin/films           – create a film
 *   PUT    /api/admin/films/:id       – update a film (all fields)
 *   DELETE /api/admin/films/:id       – soft-delete (is_active = 0)
 *
 * Challenge planning
 *   GET    /api/admin/challenges      – list scheduled challenges with film info
 *   POST   /api/admin/challenges      – schedule a challenge
 *   PUT    /api/admin/challenges/:id  – change the film for a scheduled date
 *   DELETE /api/admin/challenges/:id  – remove a scheduled challenge
 *
 * Stats
 *   GET    /api/admin/stats           – global stats + today's challenge stats
 */

import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { fileTypeFromBuffer } from 'file-type';
import db from '../db/database.js';
import { normalizeCommonsPhotoUrl } from '../lib/commonsThumb.js';
import { adminAuth, computeAdminToken, ADMIN_COOKIE } from '../middleware/adminAuth.js';
import { adminLimiter, loginLimiter } from '../middleware/rateLimiter.js';
import { logAuditEvent } from '../middleware/auditLog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Multer upload setup ──────────────────────────────────────────────────────

const uploadsDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG and WebP images are allowed'));
  },
});

const strictAdminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many admin actions' },
});

export const adminRouter = Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE_OPTIONS = {
  signed: true,
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: SEVEN_DAYS_MS,
};

// ─── Internal types ───────────────────────────────────────────────────────────

interface FilmBody {
  title: string;
  title_aliases?: string[];
  year: number;
  director: string;
  genres?: string[];
  cast_members?: string[];
  tagline?: string;
  synopsis?: string;
  image_url: string;
  tmdb_id?: number;
  fame_level?: number;
  is_active?: boolean;
}

interface SeriesBody {
  title: string;
  title_aliases?: string[];
  year: number;
  creator: string;
  genres?: string[];
  cast_members?: string[];
  tagline?: string;
  synopsis?: string;
  image_url: string;
  tmdb_id?: number;
  fame_level?: number;
  is_active?: boolean;
  number_of_seasons?: number;
  network?: string;
  status?: string;
  original_language?: string;
}

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
  imdb_id: string | null;
  is_active: number;
  fame_level: number;
  created_at: string;
  updated_at: string;
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
  original_language: string | null;
  is_active: number;
  fame_level: number;
  created_at: string;
  updated_at: string;
}

interface ChallengeRow {
  id: number;
  challenge_date: string;
  film_id: number | null;
  series_id: number | null;
  wiki_person_id: number | null;
  challenge_number: number;
  hint_schedule: string;
  created_at: string;
}

interface ChallengeWithFilm extends ChallengeRow {
  film_title: string;
  film_image_url: string;
}

interface WikiPersonRow {
  id: number;
  name: string;
  name_aliases: string;
  person_type: 'politician' | 'sportsperson' | 'artist' | 'scientist' | 'entrepreneur' | 'writer' | 'historical_figure' | 'generic';
  wikipedia_slug: string;
  infobox_data: string;
  hint_schedule: string;
  photo_url: string | null;
  extract: string | null;
  wikipedia_url: string | null;
  difficulty: number;
  is_active: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TMDB_BASE_ADMIN = process.env.TMDB_IMAGE_BASE_URL ?? 'https://image.tmdb.org/t/p/w1280';

/**
 * Maps a TMDB vote_count to a 1-5 fame level.
 *   1 = niche       (<500 votes)
 *   2 = confidentiel (500–2 000)
 *   3 = connu        (2 000–8 000)
 *   4 = populaire    (8 000–25 000)
 *   5 = blockbuster  (>25 000)
 */
function fameFromVoteCount(voteCount: number): number {
  if (voteCount >= 25_000) return 5;
  if (voteCount >= 8_000)  return 4;
  if (voteCount >= 2_000)  return 3;
  if (voteCount >= 500)    return 2;
  return 1;
}

function resolveAdminImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http') || url.startsWith('/uploads/')) return url;
  return `${TMDB_BASE_ADMIN}${url}`;
}

function maskTmdbApiKey(url: string): string {
  return url.replace(/api_key=[^&]+/, 'api_key=***');
}

async function validateUploadedImageSignature(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      next();
      return;
    }

    const buffer = req.file.buffer ?? await fs.promises.readFile(req.file.path);
    const type = await fileTypeFromBuffer(buffer);
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!type || !allowedMimes.includes(type.mime)) {
      if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      throw new Error('Invalid image format');
    }

    next();
  } catch (err) {
    next(err);
  }
}

function parseDateParam(raw: unknown): string | null {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

function formatFilm(row: FilmRow, usedDates?: string[]) {
  return {
    id: row.id,
    title: row.title,
    title_aliases: JSON.parse(row.title_aliases) as string[],
    year: row.year,
    director: row.director,
    genres: JSON.parse(row.genres) as string[],
    cast_members: JSON.parse(row.cast_members) as string[],
    tagline: row.tagline,
    synopsis: row.synopsis,
    image_url: resolveAdminImageUrl(row.image_url),
    tmdb_id: row.tmdb_id,
    is_active: row.is_active === 1,
    fame_level: row.fame_level ?? 3,
    used_dates: usedDates ?? [],
  };
}

function getFilmUsedDates(filmId: number): string[] {
  const rows = db
    .prepare<[number], { challenge_date: string }>(
      `SELECT challenge_date FROM daily_challenges WHERE film_id = ? ORDER BY challenge_date DESC`
    )
    .all(filmId);
  return rows.map((r) => r.challenge_date);
}

function formatSeries(row: SeriesRow, usedDates?: string[]) {
  return {
    id: row.id,
    title: row.title,
    title_aliases: JSON.parse(row.title_aliases) as string[],
    year: row.year,
    creator: row.creator,
    genres: JSON.parse(row.genres) as string[],
    cast_members: JSON.parse(row.cast_members) as string[],
    tagline: row.tagline,
    synopsis: row.synopsis,
    image_url: resolveAdminImageUrl(row.image_url),
    tmdb_id: row.tmdb_id,
    is_active: row.is_active === 1,
    fame_level: row.fame_level ?? 3,
    number_of_seasons: row.number_of_seasons,
    network: row.network,
    status: row.status,
    original_language: row.original_language,
    used_dates: usedDates ?? [],
  };
}

function getSeriesUsedDates(seriesId: number): string[] {
  const rows = db
    .prepare<[number], { challenge_date: string }>(
      `SELECT challenge_date FROM daily_challenges WHERE series_id = ? ORDER BY challenge_date DESC`
    )
    .all(seriesId);
  return rows.map((r) => r.challenge_date);
}

function formatWikiPerson(row: WikiPersonRow, usedDates?: string[]) {
  const photoUrl = (() => {
    if (!row.photo_url) return null
    const v = row.photo_url.trim()
    if (!v) return null
    const absolute = v.startsWith('//') ? `https:${v}` : v
    return normalizeCommonsPhotoUrl(absolute) ?? absolute
  })()
  return {
    id: row.id,
    name: row.name,
    title: row.name,
    name_aliases: JSON.parse(row.name_aliases) as string[],
    person_type: row.person_type,
    wikipedia_slug: row.wikipedia_slug,
    infobox_data: JSON.parse(row.infobox_data) as Record<string, unknown>,
    hint_schedule: JSON.parse(row.hint_schedule) as string[],
    image_url: photoUrl,
    photo_url: photoUrl,
    extract: row.extract,
    wikipedia_url: row.wikipedia_url,
    difficulty: row.difficulty,
    is_active: row.is_active === 1,
    used_dates: usedDates ?? [],
  };
}

function getWikiUsedDates(wikiPersonId: number): string[] {
  const rows = db
    .prepare<[number], { challenge_date: string }>(
      `SELECT challenge_date FROM daily_challenges WHERE wiki_person_id = ? ORDER BY challenge_date DESC`
    )
    .all(wikiPersonId);
  return rows.map((r) => r.challenge_date);
}

function formatChallenge(row: ChallengeRow) {
  if (row.wiki_person_id) {
    const person = db
      .prepare<[number], WikiPersonRow>(`SELECT * FROM wiki_persons WHERE id = ?`)
      .get(row.wiki_person_id)!;
    return {
      id: row.id,
      date: row.challenge_date,
      film: null,
      series: null,
      wiki: formatWikiPerson(person, getWikiUsedDates(person.id)),
      mediaType: 'wiki' as const,
    };
  }
  if (row.series_id) {
    const series = db
      .prepare<[number], SeriesRow>(`SELECT * FROM series WHERE id = ?`)
      .get(row.series_id)!;
    return {
      id: row.id,
      date: row.challenge_date,
      film: null,
      series: formatSeries(series, getSeriesUsedDates(series.id)),
      wiki: null,
      mediaType: 'series' as const,
    };
  }
  const film = db
    .prepare<[number], FilmRow>(`SELECT * FROM films WHERE id = ?`)
    .get(row.film_id!)!;
  return {
    id: row.id,
    date: row.challenge_date,
    film: formatFilm(film, getFilmUsedDates(film.id)),
    series: null,
    wiki: null,
    mediaType: 'film' as const,
  };
}

/** Batch-format challenge rows — 2 queries per type instead of N×2 */
function formatChallengesBatch(rows: ChallengeRow[]): ReturnType<typeof formatChallenge>[] {
  if (rows.length === 0) return [];

  const filmIds = [...new Set(rows.filter(r => r.film_id).map(r => r.film_id!))]
  const seriesIds = [...new Set(rows.filter(r => r.series_id).map(r => r.series_id!))]
  const wikiIds = [...new Set(rows.filter(r => r.wiki_person_id).map(r => r.wiki_person_id!))]

  const filmMap = new Map<number, FilmRow>()
  const seriesMap = new Map<number, SeriesRow>()
  const wikiMap = new Map<number, WikiPersonRow>()

  if (filmIds.length) {
    db.prepare<number[], FilmRow>(`SELECT * FROM films WHERE id IN (${filmIds.map(() => '?').join(',')})`)
      .all(...filmIds).forEach(f => filmMap.set(f.id, f))
  }
  if (seriesIds.length) {
    db.prepare<number[], SeriesRow>(`SELECT * FROM series WHERE id IN (${seriesIds.map(() => '?').join(',')})`)
      .all(...seriesIds).forEach(s => seriesMap.set(s.id, s))
  }
  if (wikiIds.length) {
    db.prepare<number[], WikiPersonRow>(`SELECT * FROM wiki_persons WHERE id IN (${wikiIds.map(() => '?').join(',')})`)
      .all(...wikiIds).forEach(w => wikiMap.set(w.id, w))
  }

  const allEntityIds = { film: filmIds, series: seriesIds, wiki: wikiIds }
  const usedDatesMap: Record<string, string[]> = {}
  if (allEntityIds.film.length) {
    const filmDates = db.prepare<number[], { film_id: number; challenge_date: string }>(
      `SELECT film_id, challenge_date FROM daily_challenges WHERE film_id IN (${allEntityIds.film.map(() => '?').join(',')}) ORDER BY challenge_date DESC`
    ).all(...allEntityIds.film)
    for (const r of filmDates) {
      const k = `film:${r.film_id}`
      ;(usedDatesMap[k] ??= []).push(r.challenge_date)
    }
  }
  if (allEntityIds.series.length) {
    const seriesDates = db.prepare<number[], { series_id: number; challenge_date: string }>(
      `SELECT series_id, challenge_date FROM daily_challenges WHERE series_id IN (${allEntityIds.series.map(() => '?').join(',')}) ORDER BY challenge_date DESC`
    ).all(...allEntityIds.series)
    for (const r of seriesDates) {
      const k = `series:${r.series_id}`
      ;(usedDatesMap[k] ??= []).push(r.challenge_date)
    }
  }
  if (allEntityIds.wiki.length) {
    const wikiDates = db.prepare<number[], { wiki_person_id: number; challenge_date: string }>(
      `SELECT wiki_person_id, challenge_date FROM daily_challenges WHERE wiki_person_id IN (${allEntityIds.wiki.map(() => '?').join(',')}) ORDER BY challenge_date DESC`
    ).all(...allEntityIds.wiki)
    for (const r of wikiDates) {
      const k = `wiki:${r.wiki_person_id}`
      ;(usedDatesMap[k] ??= []).push(r.challenge_date)
    }
  }

  return rows.map(row => {
    if (row.wiki_person_id) {
      const person = wikiMap.get(row.wiki_person_id)!;
      return { id: row.id, date: row.challenge_date, film: null, series: null,
        wiki: formatWikiPerson(person, usedDatesMap[`wiki:${person.id}`] ?? []),
        mediaType: 'wiki' as const }
    }
    if (row.series_id) {
      const series = seriesMap.get(row.series_id)!;
      return { id: row.id, date: row.challenge_date, film: null,
        series: formatSeries(series, usedDatesMap[`series:${series.id}`] ?? []),
        wiki: null, mediaType: 'series' as const }
    }
    const film = filmMap.get(row.film_id!)!;
    return { id: row.id, date: row.challenge_date,
      film: formatFilm(film, usedDatesMap[`film:${film.id}`] ?? []),
      series: null, wiki: null, mediaType: 'film' as const }
  })
}

function getTodayParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}

const ALLOWED_IMAGE_ORIGINS = [
  'https://image.tmdb.org',
  'https://upload.wikimedia.org',
  'https://media.themoviedb.org',
]

function isValidImageUrl(url: string): boolean {
  if (url.startsWith('/')) return true
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    return ALLOWED_IMAGE_ORIGINS.some((o) => parsed.origin === o)
  } catch { return false }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

// GET /api/admin/config – public endpoint, returns whether username is required
adminRouter.get(
  '/config',
  (_req: Request, res: Response) => {
    res.json({
      requiresUsername: !!(process.env.ADMIN_USERNAME ?? ''),
      allowPastScheduling: process.env.ALLOW_PAST_SCHEDULING === 'true',
    });
  }
);

adminRouter.post(
  '/login',
  loginLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body as { username?: string; password?: string };

      if (!password || typeof password !== 'string') {
        res.status(400).json({ error: 'Field "password" is required.' });
        return;
      }

      const adminPassword = process.env.ADMIN_PASSWORD ?? '';
      if (!adminPassword) {
        res.status(500).json({ error: 'ADMIN_PASSWORD is not configured.' });
        return;
      }

      const adminUsername = process.env.ADMIN_USERNAME ?? '';

      const timingSafeEqual = (a: string, b: string): boolean => {
        const bufA = Buffer.from(a);
        const bufB = Buffer.from(b);
        if (bufA.length !== bufB.length) {
          // Still run timingSafeEqual on same-length buffers to avoid leaking length
          crypto.timingSafeEqual(bufA, bufA);
          return false;
        }
        return crypto.timingSafeEqual(bufA, bufB);
      };

      // If ADMIN_USERNAME is configured, both fields are required
      if (adminUsername) {
        if (!username || typeof username !== 'string') {
          res.status(400).json({ error: 'Field "username" is required.' });
          return;
        }
        if (!timingSafeEqual(username, adminUsername) || !timingSafeEqual(password, adminPassword)) {
          res.status(401).json({ error: 'Identifiants invalides.' });
          return;
        }
      } else {
        // Backward compatibility: password only
        if (!timingSafeEqual(password, adminPassword)) {
          res.status(401).json({ error: 'Mot de passe incorrect.' });
          return;
        }
      }

      logAuditEvent('admin.login', { username: adminUsername || '(password-only)' });
      const token = computeAdminToken();
      res.cookie(ADMIN_COOKIE, token, COOKIE_OPTIONS);
      res.json({ ok: true, requiresUsername: !!adminUsername });
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.post(
  '/logout',
  (req: Request, res: Response) => {
    const token = req.signedCookies?.[ADMIN_COOKIE] as string | undefined;
    if (token) {
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      db.prepare(`UPDATE active_admin_tokens SET revoked_at = datetime('now') WHERE token_hash = ?`).run(hash);
    }
    res.clearCookie(ADMIN_COOKIE, { httpOnly: true, sameSite: 'strict' });
    res.json({ ok: true });
  }
);

// ─── Changelog (public read) ──────────────────────────────────────────────────

// GET /api/admin/changelog – public, no auth (footer fetches this)
adminRouter.get(
  '/changelog',
  (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = db
        .prepare<[], { id: number; version: string; release_date: string; changes: string; created_at: string }>(
          `SELECT id, version, release_date, changes, created_at
           FROM changelog
           ORDER BY created_at DESC`
        )
        .all();

      res.json(
        rows.map((r) => ({
          id: r.id,
          version: r.version,
          release_date: r.release_date,
          changes: JSON.parse(r.changes) as string[],
        }))
      );
    } catch (err) {
      next(err);
    }
  }
);

// ─── All routes below require admin authentication ────────────────────────────

adminRouter.use(adminAuth);
adminRouter.use(adminLimiter);

// ─── Dashboard ────────────────────────────────────────────────────────────────

adminRouter.get(
  '/dashboard',
  (_req: Request, res: Response, next: NextFunction) => {
    try {
      const today = getTodayParis();

      // Today's challenges (one per type)
      const todayFilmRow = db
        .prepare<[string], ChallengeRow>(
          `SELECT dc.* FROM daily_challenges dc WHERE dc.challenge_date = ? AND dc.media_type = 'film'`
        )
        .get(today);
      const todaySeriesRow = db
        .prepare<[string], ChallengeRow>(
          `SELECT dc.* FROM daily_challenges dc WHERE dc.challenge_date = ? AND dc.media_type = 'series'`
        )
        .get(today);
      const todayWikiRow = db
        .prepare<[string], ChallengeRow>(
          `SELECT dc.* FROM daily_challenges dc WHERE dc.challenge_date = ? AND dc.media_type = 'wiki'`
        )
        .get(today);

      // Upcoming challenges (7 next per type)
      const upcomingFilmRows = db
        .prepare<[string], ChallengeRow>(
          `SELECT dc.* FROM daily_challenges dc
           WHERE dc.challenge_date > ? AND dc.media_type = 'film'
           ORDER BY dc.challenge_date ASC LIMIT 7`
        )
        .all(today);
      const upcomingSeriesRows = db
        .prepare<[string], ChallengeRow>(
          `SELECT dc.* FROM daily_challenges dc
           WHERE dc.challenge_date > ? AND dc.media_type = 'series'
           ORDER BY dc.challenge_date ASC LIMIT 7`
        )
        .all(today);
      const upcomingWikiRows = db
        .prepare<[string], ChallengeRow>(
          `SELECT dc.* FROM daily_challenges dc
           WHERE dc.challenge_date > ? AND dc.media_type = 'wiki'
           ORDER BY dc.challenge_date ASC LIMIT 7`
        )
        .all(today);

      // Media library counts (3 queries → 1 each for films/series/wiki)
      const filmCounts = db.prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM daily_challenges dc WHERE dc.film_id = f.id) THEN 1 ELSE 0 END) AS unused,
          (SELECT COUNT(*) FROM daily_challenges WHERE media_type = 'film') AS challenges
        FROM films f WHERE is_active = 1
      `).get() as { total: number; unused: number; challenges: number };
      const seriesCounts = db.prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM daily_challenges dc WHERE dc.series_id = s.id) THEN 1 ELSE 0 END) AS unused,
          (SELECT COUNT(*) FROM daily_challenges WHERE media_type = 'series') AS challenges
        FROM series s WHERE is_active = 1
      `).get() as { total: number; unused: number; challenges: number };
      const wikiCounts = db.prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM daily_challenges dc WHERE dc.wiki_person_id = wp.id) THEN 1 ELSE 0 END) AS unused,
          (SELECT COUNT(*) FROM daily_challenges WHERE media_type = 'wiki') AS challenges
        FROM wiki_persons wp WHERE is_active = 1
      `).get() as { total: number; unused: number; challenges: number };

      const totalFilms = filmCounts.total; const unusedFilms = filmCounts.unused; const totalFilmChallenges = filmCounts.challenges;
      const totalSeries = seriesCounts.total; const unusedSeries = seriesCounts.unused; const totalSeriesChallenges = seriesCounts.challenges;
      const totalWikiPersons = wikiCounts.total; const unusedWikiPersons = wikiCounts.unused; const totalWikiChallenges = wikiCounts.challenges;

      // Unscheduled days per type in next 30 days (3 queries → 1)
      const next30 = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() + i + 1);
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d);
      });
      const lastDay = next30[next30.length - 1];
      const scheduledDatesRows = db.prepare(`
        SELECT challenge_date, media_type FROM daily_challenges
        WHERE challenge_date > ? AND challenge_date <= ?
      `).all(today, lastDay) as { challenge_date: string; media_type: string }[];
      const scheduledFilmDates = new Set(scheduledDatesRows.filter(r => r.media_type === 'film').map(r => r.challenge_date));
      const scheduledSeriesDates = new Set(scheduledDatesRows.filter(r => r.media_type === 'series').map(r => r.challenge_date));
      const scheduledWikiDates = new Set(scheduledDatesRows.filter(r => r.media_type === 'wiki').map(r => r.challenge_date));
      const unscheduledFilmNext30 = next30.filter((d) => !scheduledFilmDates.has(d)).length;
      const unscheduledSeriesNext30 = next30.filter((d) => !scheduledSeriesDates.has(d)).length;
      const unscheduledWikiNext30 = next30.filter((d) => !scheduledWikiDates.has(d)).length;

      // Global success rates grouped by media_type (3 queries → 1)
      const successRows = db.prepare(`
        SELECT dc.media_type,
               COUNT(*) AS total,
               SUM(CASE WHEN gs.outcome = 'won' THEN 1 ELSE 0 END) AS wins
        FROM game_sessions gs
        JOIN daily_challenges dc ON dc.id = gs.challenge_id
        WHERE gs.outcome IS NOT NULL
        GROUP BY dc.media_type
      `).all() as { media_type: string; total: number; wins: number }[];
      function rateFor(type: string) {
        const r = successRows.find(x => x.media_type === type);
        const t = r?.total ?? 0; const w = r?.wins ?? 0;
        return { total: t, wins: w, rate: t > 0 ? Math.round((w / t) * 100) : null };
      }
      const filmSuccessStats = rateFor('film');
      const seriesSuccessStats = rateFor('series');
      const wikiSuccessStats = rateFor('wiki');
      const successRate = (() => {
        const t = filmSuccessStats.total + seriesSuccessStats.total + wikiSuccessStats.total;
        const w = filmSuccessStats.wins + seriesSuccessStats.wins + wikiSuccessStats.wins;
        return t > 0 ? Math.round((w / t) * 100) : null;
      })();

      // Today's activity per challenge (3 queries → 1)
      const todayIds = [todayFilmRow?.id, todaySeriesRow?.id, todayWikiRow?.id].filter(Boolean) as number[];
      const todayActivityRows = todayIds.length > 0
        ? db.prepare(`
            SELECT challenge_id,
                   COUNT(*) AS total,
                   SUM(CASE WHEN outcome = 'won' THEN 1 ELSE 0 END) AS wins
            FROM game_sessions
            WHERE challenge_id IN (${todayIds.map(() => '?').join(',')}) AND outcome IS NOT NULL
            GROUP BY challenge_id
          `).all(...todayIds) as { challenge_id: number; total: number; wins: number }[]
        : [];
      function activityFor(row: ChallengeRow | undefined) {
        if (!row) return { games: 0, wins: 0, rate: null as number | null };
        const r = todayActivityRows.find(x => x.challenge_id === row.id);
        const t = r?.total ?? 0; const w = r?.wins ?? 0;
        return { games: t, wins: w, rate: t > 0 ? Math.round((w / t) * 100) : null };
      }
      const filmActivity = activityFor(todayFilmRow);
      const seriesActivity = activityFor(todaySeriesRow);
      const wikiActivity = activityFor(todayWikiRow);

      res.json({
        today_film_challenge: todayFilmRow ? formatChallengesBatch([todayFilmRow])[0] : null,
        today_series_challenge: todaySeriesRow ? formatChallengesBatch([todaySeriesRow])[0] : null,
        today_wiki_challenge: todayWikiRow ? formatChallengesBatch([todayWikiRow])[0] : null,
        upcoming_film_challenges: formatChallengesBatch(upcomingFilmRows),
        upcoming_series_challenges: formatChallengesBatch(upcomingSeriesRows),
        upcoming_wiki_challenges: formatChallengesBatch(upcomingWikiRows),
        stats: {
          total_films: totalFilms,
          unused_films: unusedFilms,
          total_film_challenges: totalFilmChallenges,
          unscheduled_film_next_30: unscheduledFilmNext30,
          today_film_games: filmActivity.games,
          today_film_wins: filmActivity.wins,
          today_film_rate: filmActivity.rate,
          film_success_rate: filmSuccessStats.rate,
          total_series: totalSeries,
          unused_series: unusedSeries,
          total_series_challenges: totalSeriesChallenges,
          unscheduled_series_next_30: unscheduledSeriesNext30,
          today_series_games: seriesActivity.games,
          today_series_wins: seriesActivity.wins,
          today_series_rate: seriesActivity.rate,
          series_success_rate: seriesSuccessStats.rate,
          total_wiki_persons: totalWikiPersons,
          unused_wiki_persons: unusedWikiPersons,
          total_wiki_challenges: totalWikiChallenges,
          unscheduled_wiki_next_30: unscheduledWikiNext30,
          today_wiki_games: wikiActivity.games,
          today_wiki_wins: wikiActivity.wins,
          today_wiki_rate: wikiActivity.rate,
          wiki_success_rate: wikiSuccessStats.rate,
          success_rate: successRate,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Films CRUD ───────────────────────────────────────────────────────────────

// GET /api/admin/films?page=1&limit=20
adminRouter.get(
  '/films',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string | undefined) ?? '1', 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt((req.query.limit as string | undefined) ?? '20', 10))
      );
      const offset = (page - 1) * limit;

      const total = (
        db.prepare(`SELECT COUNT(*) as count FROM films`).get() as { count: number }
      ).count;

      const rows = db
        .prepare<[number, number], FilmRow>(
          `SELECT * FROM films ORDER BY created_at DESC LIMIT ? OFFSET ?`
        )
        .all(limit, offset);

      res.json({
        data: rows.map((r) => formatFilm(r, getFilmUsedDates(r.id))),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/films
adminRouter.post(
  '/films',
  strictAdminLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as FilmBody;

      if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
        res.status(400).json({ error: 'Field "title" is required.' });
        return;
      }
      if (body.title.length > 500) {
        res.status(400).json({ error: 'Field "title" must be 500 characters or fewer.' });
        return;
      }
      if (!body.year || typeof body.year !== 'number') {
        res.status(400).json({ error: 'Field "year" must be a number.' });
        return;
      }
      const maxYear = new Date().getFullYear() + 5;
      if (!Number.isInteger(body.year) || body.year < 1888 || body.year > maxYear) {
        res.status(400).json({ error: `Field "year" must be between 1888 and ${maxYear}.` });
        return;
      }
      if (!body.director || typeof body.director !== 'string' || !body.director.trim()) {
        res.status(400).json({ error: 'Field "director" is required.' });
        return;
      }
      if (body.director.length > 200) {
        res.status(400).json({ error: 'Field "director" must be 200 characters or fewer.' });
        return;
      }
      if (!body.image_url || typeof body.image_url !== 'string' || !body.image_url.trim()) {
        res.status(400).json({ error: 'Field "image_url" is required.' });
        return;
      }
      if (!isValidImageUrl(body.image_url.trim())) {
        res.status(400).json({ error: 'Field "image_url" must be a relative path or a trusted HTTPS URL (tmdb, wikimedia).' });
        return;
      }
      if (body.fame_level !== undefined && (typeof body.fame_level !== 'number' || body.fame_level < 1 || body.fame_level > 5)) {
        res.status(400).json({ error: 'Field "fame_level" must be between 1 and 5.' });
        return;
      }

      const result = db
        .prepare(
          `INSERT INTO films
             (title, title_aliases, year, director, genres, cast_members,
              tagline, synopsis, image_url, tmdb_id, fame_level, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          body.title.trim(),
          JSON.stringify(body.title_aliases ?? []),
          body.year,
          body.director.trim(),
          JSON.stringify(body.genres ?? []),
          JSON.stringify(body.cast_members ?? []),
          body.tagline ?? null,
          body.synopsis ?? null,
          body.image_url.trim(),
          body.tmdb_id ?? null,
          body.fame_level ?? 3,
          body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1
        );

      const created = db
        .prepare<[number], FilmRow>(`SELECT * FROM films WHERE id = ?`)
        .get(result.lastInsertRowid as number)!;

      logAuditEvent('film.create', { id: result.lastInsertRowid, title: body.title.trim() });
      res.status(201).json(formatFilm(created, []));
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/admin/films/:id
adminRouter.put(
  '/films/:id',
  strictAdminLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid film id.' });
        return;
      }

      const existing = db
        .prepare<[number], FilmRow>(`SELECT * FROM films WHERE id = ?`)
        .get(id);

      if (!existing) {
        res.status(404).json({ error: 'Film not found.' });
        return;
      }

      const body = req.body as Partial<FilmBody>;

      db.prepare(
        `UPDATE films
         SET title        = ?,
             title_aliases = ?,
             year         = ?,
             director     = ?,
             genres       = ?,
             cast_members = ?,
             tagline      = ?,
             synopsis     = ?,
             image_url    = ?,
             tmdb_id      = ?,
             fame_level   = ?,
             is_active    = ?,
             updated_at   = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = ?`
      ).run(
        (body.title ?? existing.title).trim(),
        JSON.stringify(body.title_aliases ?? JSON.parse(existing.title_aliases)),
        body.year ?? existing.year,
        (body.director ?? existing.director).trim(),
        JSON.stringify(body.genres ?? JSON.parse(existing.genres)),
        JSON.stringify(body.cast_members ?? JSON.parse(existing.cast_members)),
        body.tagline !== undefined ? body.tagline : existing.tagline,
        body.synopsis !== undefined ? body.synopsis : existing.synopsis,
        (body.image_url ?? existing.image_url).trim(),
        body.tmdb_id !== undefined ? body.tmdb_id : existing.tmdb_id,
        body.fame_level !== undefined ? body.fame_level : (existing.fame_level ?? 3),
        body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active,
        id
      );

      const updated = db
        .prepare<[number], FilmRow>(`SELECT * FROM films WHERE id = ?`)
        .get(id)!;

      logAuditEvent('film.update', { id, fields: Object.keys(body) });
      res.json(formatFilm(updated, getFilmUsedDates(id)));
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/admin/films/:id  (hard delete — blocked if film is scheduled)
adminRouter.delete(
  '/films/:id',
  strictAdminLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid film id.' });
        return;
      }

      const existing = db
        .prepare<[number], FilmRow>(`SELECT id, is_active FROM films WHERE id = ?`)
        .get(id);

      if (!existing) {
        res.status(404).json({ error: 'Film not found.' });
        return;
      }

      // Block deletion if film is referenced in any scheduled challenge
      const scheduled = db
        .prepare<[number], { count: number }>(
          `SELECT COUNT(*) as count FROM daily_challenges WHERE film_id = ?`
        )
        .get(id);

      if (scheduled && scheduled.count > 0) {
        res.status(409).json({
          error: `Ce film est planifié sur ${scheduled.count} date(s). Retirez-le du planning avant de le supprimer.`,
        });
        return;
      }

      db.prepare(`DELETE FROM films WHERE id = ?`).run(id);

      logAuditEvent('film.delete', { id });
      res.json({ ok: true, id });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/admin/films/:id  (alias for PUT – same behaviour)
adminRouter.patch(
  '/films/:id',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid film id.' }); return; }

      const existing = db
        .prepare<[number], FilmRow>(`SELECT * FROM films WHERE id = ?`)
        .get(id);
      if (!existing) { res.status(404).json({ error: 'Film not found.' }); return; }

      const body = req.body as Partial<FilmBody>;

      if (body.title !== undefined && body.title.length > 500) {
        res.status(400).json({ error: 'Field "title" must be 500 characters or fewer.' }); return;
      }
      if (body.director !== undefined && body.director.length > 200) {
        res.status(400).json({ error: 'Field "director" must be 200 characters or fewer.' }); return;
      }
      if (body.year !== undefined) {
        const maxYear = new Date().getFullYear() + 5;
        if (!Number.isInteger(body.year) || body.year < 1888 || body.year > maxYear) {
          res.status(400).json({ error: `Field "year" must be between 1888 and ${maxYear}.` }); return;
        }
      }
      if (body.fame_level !== undefined && (body.fame_level < 1 || body.fame_level > 5)) {
        res.status(400).json({ error: 'Field "fame_level" must be between 1 and 5.' }); return;
      }

      db.prepare(
        `UPDATE films
         SET title        = ?,
             title_aliases = ?,
             year         = ?,
             director     = ?,
             genres       = ?,
             cast_members = ?,
             tagline      = ?,
             synopsis     = ?,
             image_url    = ?,
             tmdb_id      = ?,
             fame_level   = ?,
             is_active    = ?,
             updated_at   = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = ?`
      ).run(
        (body.title ?? existing.title).trim(),
        JSON.stringify(body.title_aliases ?? JSON.parse(existing.title_aliases)),
        body.year ?? existing.year,
        (body.director ?? existing.director).trim(),
        JSON.stringify(body.genres ?? JSON.parse(existing.genres)),
        JSON.stringify(body.cast_members ?? JSON.parse(existing.cast_members)),
        body.tagline !== undefined ? body.tagline : existing.tagline,
        body.synopsis !== undefined ? body.synopsis : existing.synopsis,
        (body.image_url ?? existing.image_url).trim(),
        body.tmdb_id !== undefined ? body.tmdb_id : existing.tmdb_id,
        body.fame_level !== undefined ? body.fame_level : (existing.fame_level ?? 3),
        body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active,
        id
      );

      const updated = db.prepare<[number], FilmRow>(`SELECT * FROM films WHERE id = ?`).get(id)!;
      logAuditEvent('film.update', { id, fields: Object.keys(body) });
      res.json(formatFilm(updated, getFilmUsedDates(id)));
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/films/:id/image  – upload a local image file
adminRouter.post(
  '/films/:id/image',
  upload.single('image'),
  validateUploadedImageSignature,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid film id.' }); return; }

      if (!req.file) { res.status(400).json({ error: 'No image file received.' }); return; }

      const existing = db
        .prepare<[number], Pick<FilmRow, 'id'>>(`SELECT id FROM films WHERE id = ?`)
        .get(id);
      if (!existing) {
        fs.unlinkSync(req.file.path);
        res.status(404).json({ error: 'Film not found.' });
        return;
      }

      const imageUrl = `/uploads/${req.file.filename}`;

      db.prepare(
        `UPDATE films SET image_url = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`
      ).run(imageUrl, id);

      const updated = db.prepare<[number], FilmRow>(`SELECT * FROM films WHERE id = ?`).get(id)!;
      res.json({ url: imageUrl, film: formatFilm(updated) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/upload  – upload an image without requiring a film ID (for new films)
adminRouter.post(
  '/upload',
  upload.single('image'),
  validateUploadedImageSignature,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) { res.status(400).json({ error: 'No image file received.' }); return; }
      const url = `/uploads/${req.file.filename}`;
      res.json({ url });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Film stats & CSV import ──────────────────────────────────────────────────

// GET /api/admin/films/:id/stats
adminRouter.get(
  '/films/:id/stats',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid film id.' }); return; }

      const challenge = db
        .prepare<[number], { id: number; challenge_date: string }>(
          `SELECT id, challenge_date FROM daily_challenges WHERE film_id = ? ORDER BY challenge_date DESC LIMIT 1`
        )
        .get(id);

      if (!challenge) {
        res.json({ played: false });
        return;
      }

      const stats = db
        .prepare<[number], { total: number; wins: number; total_attempts: number }>(
          `SELECT COUNT(*) as total,
                  SUM(CASE WHEN outcome = 'won' THEN 1 ELSE 0 END) as wins,
                  SUM(json_array_length(attempts)) as total_attempts
           FROM game_sessions WHERE challenge_id = ? AND outcome IS NOT NULL`
        )
        .get(challenge.id) as { total: number; wins: number; total_attempts: number };

      const winsByAttempt = db
        .prepare<[number], { attempt_count: number; count: number }>(
          `SELECT json_array_length(attempts) as attempt_count, COUNT(*) as count
           FROM game_sessions
           WHERE challenge_id = ? AND outcome = 'won'
           GROUP BY attempt_count ORDER BY attempt_count`
        )
        .all(challenge.id);

      res.json({
        played: true,
        challenge_date: challenge.challenge_date,
        total_games: stats.total ?? 0,
        win_rate: stats.total > 0 ? Math.round(((stats.wins ?? 0) / stats.total) * 100) : 0,
        avg_attempts: stats.total > 0 && stats.total_attempts
          ? Math.round((stats.total_attempts / stats.total) * 10) / 10
          : null,
        wins_by_attempt: Object.fromEntries(winsByAttempt.map((r) => [r.attempt_count, r.count])),
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/films/import-csv — bulk import films from CSV rows
adminRouter.post(
  '/films/import-csv',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rows } = req.body as { rows: Record<string, string>[] };
      if (!Array.isArray(rows) || rows.length === 0) {
        res.status(400).json({ error: 'No rows provided.' });
        return;
      }

      const created: number[] = [];
      const errors: { line: number; error: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const title = row.title?.trim();
        const year = parseInt(row.year, 10);
        const director = row.director?.trim();
        const image_url = row.image_url?.trim() ?? '';

        if (!title) { errors.push({ line: i + 2, error: 'Titre manquant' }); continue; }
        if (!year || isNaN(year)) { errors.push({ line: i + 2, error: 'Année invalide' }); continue; }
        if (!director) { errors.push({ line: i + 2, error: 'Réalisateur manquant' }); continue; }

        try {
          const result = db.prepare(
            `INSERT INTO films (title, title_aliases, year, director, genres, cast_members, tagline, synopsis, image_url, tmdb_id, fame_level, is_active)
             VALUES (?, '[]', ?, ?, '[]', '[]', NULL, NULL, ?, NULL, 3, 1)`
          ).run(title, year, director, image_url);
          created.push(result.lastInsertRowid as number);
        } catch {
          errors.push({ line: i + 2, error: 'Erreur insertion (doublon ?)' });
        }
      }

      res.json({ created: created.length, errors });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Challenge planning ───────────────────────────────────────────────────────
adminRouter.get(
  '/challenges',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const from = parseDateParam(req.query.from);
      const to = parseDateParam(req.query.to);

      const mediaType = req.query.mediaType === 'series'
        ? 'series'
        : req.query.mediaType === 'film'
          ? 'film'
          : req.query.mediaType === 'wiki'
            ? 'wiki'
            : null;
      let query = `SELECT dc.* FROM daily_challenges dc`;
      const params: string[] = [];
      const conditions: string[] = [];

      if (from && to) {
        conditions.push(`dc.challenge_date BETWEEN ? AND ?`);
        params.push(from, to);
      } else if (from) {
        conditions.push(`dc.challenge_date >= ?`);
        params.push(from);
      } else if (to) {
        conditions.push(`dc.challenge_date <= ?`);
        params.push(to);
      }
      if (mediaType) {
        conditions.push(`dc.media_type = ?`);
        params.push(mediaType);
      }
      if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;

      query += ` ORDER BY dc.challenge_date ASC`;

      const rows = db
        .prepare<string[], ChallengeRow>(query)
        .all(...params);

      res.json({ data: formatChallengesBatch(rows) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/challenges
adminRouter.post(
  '/challenges',
  strictAdminLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date, film_id, series_id, wiki_person_id } = req.body as { date?: string; film_id?: number; series_id?: number; wiki_person_id?: number };

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toISOString().slice(0, 10) !== date) {
        res.status(400).json({ error: 'Field "date" must be a valid YYYY-MM-DD string.' });
        return;
      }

      const hasFilm = film_id !== undefined && film_id !== null && typeof film_id === 'number';
      const hasSeries = series_id !== undefined && series_id !== null && typeof series_id === 'number';
      const hasWiki = wiki_person_id !== undefined && wiki_person_id !== null && typeof wiki_person_id === 'number';

      if (!hasFilm && !hasSeries && !hasWiki) {
        res.status(400).json({ error: 'Either "film_id", "series_id" or "wiki_person_id" must be provided.' });
        return;
      }
      if ((hasFilm ? 1 : 0) + (hasSeries ? 1 : 0) + (hasWiki ? 1 : 0) > 1) {
        res.status(400).json({ error: 'Only one of "film_id", "series_id" or "wiki_person_id" may be provided.' });
        return;
      }

      if (hasFilm) {
        const film = db.prepare(`SELECT id FROM films WHERE id = ? AND is_active = 1`).get(film_id);
        if (!film) { res.status(404).json({ error: 'Film not found or inactive.' }); return; }
      } else if (hasSeries) {
        const series = db.prepare(`SELECT id FROM series WHERE id = ? AND is_active = 1`).get(series_id);
        if (!series) { res.status(404).json({ error: 'Series not found or inactive.' }); return; }
      } else {
        const person = db.prepare(`SELECT id FROM wiki_persons WHERE id = ? AND is_active = 1`).get(wiki_person_id);
        if (!person) { res.status(404).json({ error: 'Wiki person not found or inactive.' }); return; }
      }

      const mediaType = hasFilm ? 'film' : hasSeries ? 'series' : 'wiki';

      // Check for existing challenge of same type on that date
      const existing = db
        .prepare(`SELECT id FROM daily_challenges WHERE challenge_date = ? AND media_type = ?`)
        .get(date, mediaType);

      if (existing) {
        res.status(409).json({ error: `A ${mediaType} challenge is already scheduled for ${date}.` });
        return;
      }

      // Challenge number is per media_type
      const maxNum = (
        db
          .prepare(`SELECT COALESCE(MAX(challenge_number), 0) AS max_num FROM daily_challenges WHERE media_type = ?`)
          .get(mediaType) as { max_num: number }
      ).max_num;

      let hintSchedule = hasFilm
        ? JSON.stringify(['year', 'director', 'cast'])
        : JSON.stringify(['year', 'creator', 'cast']);
      if (hasWiki) {
        const wikiHintRow = db
          .prepare<[number], { hint_schedule: string }>(`SELECT hint_schedule FROM wiki_persons WHERE id = ?`)
          .get(wiki_person_id!)!;
        hintSchedule = wikiHintRow.hint_schedule;
      }

      const result = db
        .prepare(
          `INSERT INTO daily_challenges (challenge_date, media_type, film_id, series_id, wiki_person_id, challenge_number, hint_schedule)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(date, mediaType, hasFilm ? film_id : null, hasSeries ? series_id : null, hasWiki ? wiki_person_id : null, maxNum + 1, hintSchedule);

      const created = db
        .prepare<[number], ChallengeRow>(`SELECT dc.* FROM daily_challenges dc WHERE dc.id = ?`)
        .get(result.lastInsertRowid as number)!;

      logAuditEvent('challenge.create', { id: result.lastInsertRowid, date, film_id, series_id, wiki_person_id });
      res.status(201).json(formatChallenge(created));
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/admin/challenges/:id
adminRouter.put(
  '/challenges/:id',
  strictAdminLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid challenge id.' });
        return;
      }

      const { film_id, series_id, wiki_person_id } = req.body as { film_id?: number; series_id?: number; wiki_person_id?: number };
      const hasFilm = film_id !== undefined && film_id !== null && typeof film_id === 'number';
      const hasSeries = series_id !== undefined && series_id !== null && typeof series_id === 'number';
      const hasWiki = wiki_person_id !== undefined && wiki_person_id !== null && typeof wiki_person_id === 'number';

      if (!hasFilm && !hasSeries && !hasWiki) {
        res.status(400).json({ error: 'Either "film_id", "series_id" or "wiki_person_id" must be provided.' });
        return;
      }
      if ((hasFilm ? 1 : 0) + (hasSeries ? 1 : 0) + (hasWiki ? 1 : 0) > 1) {
        res.status(400).json({ error: 'Only one of "film_id", "series_id" or "wiki_person_id" may be provided.' });
        return;
      }

      const existing = db
        .prepare(`SELECT id FROM daily_challenges WHERE id = ?`)
        .get(id);

      if (!existing) {
        res.status(404).json({ error: 'Challenge not found.' });
        return;
      }

      if (hasFilm) {
        const film = db.prepare(`SELECT id FROM films WHERE id = ? AND is_active = 1`).get(film_id);
        if (!film) { res.status(404).json({ error: 'Film not found or inactive.' }); return; }
        db.prepare(`UPDATE daily_challenges SET film_id = ?, series_id = NULL, wiki_person_id = NULL, media_type = 'film' WHERE id = ?`).run(film_id, id);
      } else if (hasSeries) {
        const series = db.prepare(`SELECT id FROM series WHERE id = ? AND is_active = 1`).get(series_id);
        if (!series) { res.status(404).json({ error: 'Series not found or inactive.' }); return; }
        db.prepare(`UPDATE daily_challenges SET film_id = NULL, series_id = ?, wiki_person_id = NULL, media_type = 'series' WHERE id = ?`).run(series_id, id);
      } else {
        const person = db.prepare(`SELECT id FROM wiki_persons WHERE id = ? AND is_active = 1`).get(wiki_person_id);
        if (!person) { res.status(404).json({ error: 'Wiki person not found or inactive.' }); return; }
        db.prepare(`UPDATE daily_challenges SET film_id = NULL, series_id = NULL, wiki_person_id = ?, media_type = 'wiki' WHERE id = ?`).run(wiki_person_id, id);
      }

      const updated = db
        .prepare<[number], ChallengeRow>(`SELECT dc.* FROM daily_challenges dc WHERE dc.id = ?`)
        .get(id)!;

      logAuditEvent('challenge.update', { id, film_id, series_id, wiki_person_id });
      res.json(formatChallenge(updated));
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/admin/challenges/:id  (alias for PUT)
adminRouter.patch(
  '/challenges/:id',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid challenge id.' }); return; }

      const { film_id, series_id, wiki_person_id } = req.body as { film_id?: number; series_id?: number; wiki_person_id?: number };
      const hasFilm = film_id !== undefined && film_id !== null && typeof film_id === 'number';
      const hasSeries = series_id !== undefined && series_id !== null && typeof series_id === 'number';
      const hasWiki = wiki_person_id !== undefined && wiki_person_id !== null && typeof wiki_person_id === 'number';

      if (!hasFilm && !hasSeries && !hasWiki) {
        res.status(400).json({ error: 'Either "film_id", "series_id" or "wiki_person_id" must be provided.' }); return;
      }
      if ((hasFilm ? 1 : 0) + (hasSeries ? 1 : 0) + (hasWiki ? 1 : 0) > 1) {
        res.status(400).json({ error: 'Only one of "film_id", "series_id" or "wiki_person_id" may be provided.' }); return;
      }

      const existing = db.prepare(`SELECT id FROM daily_challenges WHERE id = ?`).get(id);
      if (!existing) { res.status(404).json({ error: 'Challenge not found.' }); return; }

      if (hasFilm) {
        const film = db.prepare(`SELECT id FROM films WHERE id = ? AND is_active = 1`).get(film_id);
        if (!film) { res.status(404).json({ error: 'Film not found or inactive.' }); return; }
        db.prepare(`UPDATE daily_challenges SET film_id = ?, series_id = NULL, wiki_person_id = NULL, media_type = 'film' WHERE id = ?`).run(film_id, id);
      } else if (hasSeries) {
        const series = db.prepare(`SELECT id FROM series WHERE id = ? AND is_active = 1`).get(series_id);
        if (!series) { res.status(404).json({ error: 'Series not found or inactive.' }); return; }
        db.prepare(`UPDATE daily_challenges SET film_id = NULL, series_id = ?, wiki_person_id = NULL, media_type = 'series' WHERE id = ?`).run(series_id, id);
      } else {
        const person = db.prepare(`SELECT id FROM wiki_persons WHERE id = ? AND is_active = 1`).get(wiki_person_id);
        if (!person) { res.status(404).json({ error: 'Wiki person not found or inactive.' }); return; }
        db.prepare(`UPDATE daily_challenges SET film_id = NULL, series_id = NULL, wiki_person_id = ?, media_type = 'wiki' WHERE id = ?`).run(wiki_person_id, id);
      }

      const updated = db.prepare<[number], ChallengeRow>(`SELECT dc.* FROM daily_challenges dc WHERE dc.id = ?`).get(id)!;
      logAuditEvent('challenge.update', { id, film_id, series_id, wiki_person_id });
      res.json(formatChallenge(updated));
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/admin/challenges/:id
adminRouter.delete(
  '/challenges/:id',
  strictAdminLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid challenge id.' });
        return;
      }

      const existing = db
        .prepare(`SELECT id FROM daily_challenges WHERE id = ?`)
        .get(id);

      if (!existing) {
        res.status(404).json({ error: 'Challenge not found.' });
        return;
      }

      db.prepare(`UPDATE daily_challenges SET is_active = 0 WHERE id = ?`).run(id);
      logAuditEvent('challenge.deactivate', { id });
      res.json({ ok: true, id, message: 'Challenge deactivated (soft-delete). Use /restore to reactivate.' });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/challenges/:id/restore
adminRouter.post(
  '/challenges/:id/restore',
  strictAdminLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid challenge id.' });
        return;
      }

      const existing = db
        .prepare(`SELECT id, is_active FROM daily_challenges WHERE id = ?`)
        .get(id) as { id: number; is_active: number } | undefined;

      if (!existing) {
        res.status(404).json({ error: 'Challenge not found.' });
        return;
      }

      db.prepare(`UPDATE daily_challenges SET is_active = 1 WHERE id = ?`).run(id);
      logAuditEvent('challenge.restore', { id });
      res.json({ ok: true, id, message: 'Challenge restored.' });
    } catch (err) {
      next(err);
    }
  }
);

// ─── TMDB Backdrops ───────────────────────────────────────────────────────────

interface TmdbImageEntry {
  file_path: string;
  width: number;
  height: number;
  vote_average: number;
}

interface TmdbImagesResponse {
  backdrops: TmdbImageEntry[];
}

// GET /api/admin/films/:id/backdrops
adminRouter.get(
  '/films/:id/backdrops',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid film id.' });
        return;
      }

      const film = db
        .prepare<[number], Pick<FilmRow, 'tmdb_id'>>(`SELECT tmdb_id FROM films WHERE id = ?`)
        .get(id);

      if (!film) {
        res.status(404).json({ error: 'Film not found.' });
        return;
      }

      if (!film.tmdb_id) {
        res.status(400).json({ error: 'No TMDB ID for this film' });
        return;
      }

      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) {
        res.status(400).json({ error: 'TMDB_API_KEY not configured' });
        return;
      }

      const url =
        `https://api.themoviedb.org/3/movie/${film.tmdb_id}/images` +
        `?api_key=${apiKey}&include_image_language=null`;
      const safeUrl = maskTmdbApiKey(url);

      const tmdbRes = await fetch(url);
      if (!tmdbRes.ok) {
        res.status(502).json({ error: `TMDB error: ${tmdbRes.status} (${safeUrl})` });
        return;
      }

      const data = (await tmdbRes.json()) as TmdbImagesResponse;

      const backdrops = (data.backdrops ?? [])
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 12)
        .map((b) => ({
          path: b.file_path,
          url: `https://image.tmdb.org/t/p/w1280${b.file_path}`,
          width: b.width,
          height: b.height,
          vote_average: b.vote_average,
        }));

      res.json({ backdrops });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Stats ────────────────────────────────────────────────────────────────────

// GET /api/admin/stats
adminRouter.get(
  '/stats',
  (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Global stats
      const globalRow = db.prepare(`SELECT * FROM global_stats WHERE id = 1`).get() as {
        total_games: number;
        total_wins: number;
        total_losses: number;
        wins_by_attempt: string;
        last_updated: string;
      };

      const global = {
        totalGames: globalRow.total_games,
        totalWins: globalRow.total_wins,
        totalLosses: globalRow.total_losses,
        winRate:
          globalRow.total_games > 0
            ? Math.round((globalRow.total_wins / globalRow.total_games) * 100)
            : 0,
        winsByAttempt: JSON.parse(globalRow.wins_by_attempt) as Record<string, number>,
        lastUpdated: globalRow.last_updated,
      };

      // Today's challenge stats
      const today = getTodayParis();
      const todayChallenge = db
        .prepare<[string], ChallengeRow>(
          `SELECT dc.* FROM daily_challenges dc WHERE dc.challenge_date = ?`
        )
        .get(today);

      let todayStats: Record<string, unknown> | null = null;

      if (todayChallenge) {
        const sessionStats = db
          .prepare<[number], { total: number; wins: number }>(
            `SELECT
               COUNT(*) AS total,
               SUM(CASE WHEN outcome = 'won' THEN 1 ELSE 0 END) AS wins
             FROM game_sessions
             WHERE challenge_id = ?`
          )
          .get(todayChallenge.id)!;

        const total = sessionStats.total ?? 0;
        const wins = sessionStats.wins ?? 0;
        const formatted = formatChallengesBatch([todayChallenge])[0];
        const title = formatted.film?.title ?? formatted.series?.title ?? '';
        const imageUrl = formatted.film?.image_url ?? formatted.series?.image_url ?? '';

        todayStats = {
          challengeId: todayChallenge.id,
          date: todayChallenge.challenge_date,
          challengeNumber: todayChallenge.challenge_number,
          filmTitle: title,
          filmImageUrl: imageUrl,
          mediaType: formatted.mediaType,
          totalPlayers: total,
          totalWins: wins,
          successRate: total > 0 ? Math.round((wins / total) * 100) : 0,
        };
      }

      res.json({ global, today: todayStats });
    } catch (err) {
      next(err);
    }
  }
);

// ─── TMDB Search by title ─────────────────────────────────────────────────────

// GET /api/admin/tmdb/search?q=title
// Returns a list of matching films from TMDB (title, year, tmdb_id, poster_path)
adminRouter.get(
  '/tmdb/search',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (req.query.q as string | undefined)?.trim();
      if (!q || q.length < 2) {
        res.json({ results: [] });
        return;
      }

      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) {
        res.status(400).json({ error: 'TMDB_API_KEY not configured' });
        return;
      }

      const searchUrl =
        `https://api.themoviedb.org/3/search/movie` +
        `?api_key=${apiKey}&language=fr-FR&query=${encodeURIComponent(q)}&page=1`;
      const safeUrl = maskTmdbApiKey(searchUrl);

      const tmdbRes = await fetch(searchUrl);
      if (!tmdbRes.ok) {
        res.status(502).json({ error: `TMDB error: ${tmdbRes.status} (${safeUrl})` });
        return;
      }

      const data = (await tmdbRes.json()) as {
        results: {
          id: number;
          title: string;
          original_title: string;
          release_date: string;
          poster_path: string | null;
          backdrop_path: string | null;
        }[];
      };

      const results = (data.results ?? []).slice(0, 8).map((m) => ({
        tmdb_id: m.id,
        title: m.title,
        original_title: m.original_title,
        year: m.release_date ? parseInt(m.release_date.slice(0, 4), 10) : 0,
        poster_url: m.poster_path
          ? `https://image.tmdb.org/t/p/w185${m.poster_path}`
          : null,
      }));

      res.json({ results });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/tmdb/:tmdbId/details
// Fetches full details for a specific TMDB ID (same format as /random)
adminRouter.get(
  '/tmdb/:tmdbId/details',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tmdbId = parseInt(req.params.tmdbId, 10);
      if (isNaN(tmdbId)) {
        res.status(400).json({ error: 'Invalid TMDB id.' });
        return;
      }

      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) {
        res.status(400).json({ error: 'TMDB_API_KEY not configured' });
        return;
      }

      const [detailsRes, creditsRes, imagesRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=fr-FR`),
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${apiKey}`),
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/images?api_key=${apiKey}&include_image_language=null`),
      ]);

      const details = (await detailsRes.json()) as {
        id: number; title: string; original_title: string;
        release_date: string; tagline: string; overview: string;
        backdrop_path: string | null;
        genres: { name: string }[];
        vote_count: number;
      };
      const credits = (await creditsRes.json()) as {
        crew: { job: string; name: string }[];
        cast: { name: string }[];
      };
      const images = (await imagesRes.json()) as {
        backdrops: { file_path: string; vote_average: number }[];
      };

      const director = credits.crew?.find((c) => c.job === 'Director')?.name ?? '';
      const cast = (credits.cast ?? []).slice(0, 5).map((c) => c.name);
      const genres = (details.genres ?? []).map((g) => g.name);

      const bestBackdrop = (images.backdrops ?? [])
        .sort((a, b) => b.vote_average - a.vote_average)[0];
      const imageUrl = bestBackdrop
        ? `https://image.tmdb.org/t/p/w1280${bestBackdrop.file_path}`
        : details.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`
        : '';

      const titleAliases: string[] = [];
      if (details.original_title && details.original_title !== details.title) {
        titleAliases.push(details.original_title);
      }

      res.json({
        title: details.title,
        title_aliases: titleAliases,
        year: details.release_date ? parseInt(details.release_date.slice(0, 4), 10) : 0,
        director,
        genres,
        cast_members: cast,
        tagline: details.tagline ?? '',
        synopsis: details.overview ?? '',
        image_url: imageUrl,
        tmdb_id: details.id,
        is_active: true,
        fame_level: fameFromVoteCount(details.vote_count ?? 0),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── TMDB Random Film ─────────────────────────────────────────────────────────

// GET /api/admin/tmdb/random
// Fetches a random well-known film from TMDB and returns it as a FilmPayload.
adminRouter.get(
  '/tmdb/random',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) {
        res.status(400).json({ error: 'TMDB_API_KEY not configured' });
        return;
      }

      // Random page across popular films (vote_count ≥ 500 keeps results well-known)
      const page = Math.floor(Math.random() * 50) + 1;
      const discoverUrl =
        `https://api.themoviedb.org/3/discover/movie` +
        `?api_key=${apiKey}&language=fr-FR&sort_by=vote_count.desc` +
        `&vote_count.gte=500&page=${page}`;
      const safeUrl = maskTmdbApiKey(discoverUrl);

      const discoverRes = await fetch(discoverUrl);
      if (!discoverRes.ok) {
        res.status(502).json({ error: `TMDB discover error: ${discoverRes.status} (${safeUrl})` });
        return;
      }
      const discoverData = (await discoverRes.json()) as { results: { id: number }[] };
      const results = discoverData.results ?? [];
      if (results.length === 0) {
        res.status(502).json({ error: 'No results from TMDB' });
        return;
      }

      const picked = results[Math.floor(Math.random() * results.length)];

      // Fetch details, credits and images in parallel
      const [detailsRes, creditsRes, imagesRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${picked.id}?api_key=${apiKey}&language=fr-FR`),
        fetch(`https://api.themoviedb.org/3/movie/${picked.id}/credits?api_key=${apiKey}`),
        fetch(`https://api.themoviedb.org/3/movie/${picked.id}/images?api_key=${apiKey}&include_image_language=null`),
      ]);

      const details = (await detailsRes.json()) as {
        id: number; title: string; original_title: string;
        release_date: string; tagline: string; overview: string;
        backdrop_path: string | null;
        genres: { name: string }[];
        vote_count: number;
      };
      const credits = (await creditsRes.json()) as {
        crew: { job: string; name: string }[];
        cast: { name: string }[];
      };
      const images = (await imagesRes.json()) as {
        backdrops: { file_path: string; vote_average: number }[];
      };

      const director = credits.crew?.find((c) => c.job === 'Director')?.name ?? '';
      const cast = (credits.cast ?? []).slice(0, 5).map((c) => c.name);
      const genres = (details.genres ?? []).map((g) => g.name);

      // Best backdrop or fallback to TMDB backdrop_path
      const bestBackdrop = (images.backdrops ?? [])
        .sort((a, b) => b.vote_average - a.vote_average)[0];
      const imageUrl = bestBackdrop
        ? `https://image.tmdb.org/t/p/w1280${bestBackdrop.file_path}`
        : details.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`
        : '';

      const titleAliases: string[] = [];
      if (details.original_title && details.original_title !== details.title) {
        titleAliases.push(details.original_title);
      }

      res.json({
        title: details.title,
        title_aliases: titleAliases,
        year: details.release_date ? parseInt(details.release_date.slice(0, 4), 10) : 0,
        director,
        genres,
        cast_members: cast,
        tagline: details.tagline ?? '',
        synopsis: details.overview ?? '',
        image_url: imageUrl,
        tmdb_id: details.id,
        is_active: true,
        fame_level: fameFromVoteCount(details.vote_count ?? 0),
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/tmdb/tv/random
// Fetches a random popular TV series from TMDB and returns it as a SeriesPayload.
adminRouter.get(
  '/tmdb/tv/random',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) {
        res.status(400).json({ error: 'TMDB_API_KEY not configured' });
        return;
      }

      const page = Math.floor(Math.random() * 30) + 1;
      const discoverUrl =
        `https://api.themoviedb.org/3/discover/tv` +
        `?api_key=${apiKey}&language=fr-FR&sort_by=vote_count.desc` +
        `&vote_count.gte=200&page=${page}`;
      const safeUrl = maskTmdbApiKey(discoverUrl);
      const discoverRes = await fetch(discoverUrl);
      if (!discoverRes.ok) {
        res.status(502).json({ error: `TMDB discover error: ${discoverRes.status} (${safeUrl})` });
        return;
      }
      const discoverData = (await discoverRes.json()) as { results: { id: number }[] };
      const results = discoverData.results ?? [];
      if (results.length === 0) {
        res.status(502).json({ error: 'No results from TMDB' });
        return;
      }

      const picked = results[Math.floor(Math.random() * results.length)];

      const [detailsRes, creditsRes, imagesRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/tv/${picked.id}?api_key=${apiKey}&language=fr-FR`),
        fetch(`https://api.themoviedb.org/3/tv/${picked.id}/aggregate_credits?api_key=${apiKey}`),
        fetch(`https://api.themoviedb.org/3/tv/${picked.id}/images?api_key=${apiKey}&include_image_language=null`),
      ]);

      const details = (await detailsRes.json()) as {
        id: number; name: string; original_name: string;
        first_air_date: string; tagline: string; overview: string;
        backdrop_path: string | null;
        genres: { name: string }[];
        vote_count: number;
        number_of_seasons: number;
        networks: { name: string }[];
        status: string;
        original_language: string;
        created_by?: { name: string }[];
      };
      const credits = (await creditsRes.json()) as {
        cast: { name: string; order: number }[];
      };
      const images = (await imagesRes.json()) as {
        backdrops: { file_path: string; vote_average: number }[];
      };

      const cast = (credits.cast ?? [])
        .sort((a, b) => a.order - b.order)
        .slice(0, 5)
        .map((c) => c.name);
      const genres = (details.genres ?? []).map((g) => g.name);

      const bestBackdrop = (images.backdrops ?? [])
        .sort((a, b) => b.vote_average - a.vote_average)[0];
      const imageUrl = bestBackdrop
        ? `https://image.tmdb.org/t/p/w1280${bestBackdrop.file_path}`
        : details.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`
        : '';

      const titleAliases: string[] = [];
      if (details.original_name && details.original_name !== details.name) {
        titleAliases.push(details.original_name);
      }

      res.json({
        title: details.name,
        title_aliases: titleAliases,
        year: details.first_air_date ? parseInt(details.first_air_date.slice(0, 4), 10) : 0,
        creator: Array.isArray(details.created_by) && details.created_by.length > 0 ? details.created_by[0].name : '',
        genres,
        cast_members: cast,
        tagline: details.tagline ?? '',
        synopsis: details.overview ?? '',
        image_url: imageUrl,
        tmdb_id: details.id,
        is_active: true,
        fame_level: fameFromVoteCount(details.vote_count ?? 0),
        number_of_seasons: details.number_of_seasons ?? null,
        network: details.networks?.[0]?.name ?? null,
        status: details.status ?? null,
        original_language: details.original_language ?? null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/tmdb/:tmdbId/backdrops
// Fetches backdrops directly by TMDB ID — used when creating a film (no DB id yet).
adminRouter.get(
  '/tmdb/:tmdbId/backdrops',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tmdbId = parseInt(req.params.tmdbId, 10);
      if (isNaN(tmdbId)) {
        res.status(400).json({ error: 'Invalid TMDB id.' });
        return;
      }

      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) {
        res.status(400).json({ error: 'TMDB_API_KEY not configured' });
        return;
      }

      const url = `https://api.themoviedb.org/3/movie/${tmdbId}/images?api_key=${apiKey}&include_image_language=null`;
      const safeUrl = maskTmdbApiKey(url);
      const tmdbRes = await fetch(url);
      if (!tmdbRes.ok) {
        res.status(502).json({ error: `TMDB error: ${tmdbRes.status} (${safeUrl})` });
        return;
      }

      const data = (await tmdbRes.json()) as TmdbImagesResponse;
      const backdrops = (data.backdrops ?? [])
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 12)
        .map((b) => ({
          path: b.file_path,
          url: `https://image.tmdb.org/t/p/w1280${b.file_path}`,
          width: b.width,
          height: b.height,
          vote_average: b.vote_average,
        }));

      res.json({ backdrops });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Changelog CRUD (protected) ───────────────────────────────────────────────

interface ChangelogBody {
  version: string;
  release_date: string;
  changes: string[];
}

// POST /api/admin/changelog
adminRouter.post(
  '/changelog',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { version, release_date, changes } = req.body as ChangelogBody;

      if (!version?.trim()) { res.status(400).json({ error: 'Field "version" is required.' }); return; }
      if (!release_date?.trim()) { res.status(400).json({ error: 'Field "release_date" is required.' }); return; }
      if (!Array.isArray(changes)) { res.status(400).json({ error: 'Field "changes" must be an array.' }); return; }

      const result = db
        .prepare(`INSERT INTO changelog (version, release_date, changes) VALUES (?, ?, ?)`)
        .run(version.trim(), release_date.trim(), JSON.stringify(changes));

      const created = db
        .prepare<[number], { id: number; version: string; release_date: string; changes: string }>(
          `SELECT id, version, release_date, changes FROM changelog WHERE id = ?`
        )
        .get(result.lastInsertRowid as number)!;

      res.status(201).json({ id: created.id, version: created.version, release_date: created.release_date, changes: JSON.parse(created.changes) as string[] });
    } catch (err) { next(err); }
  }
);

// PUT /api/admin/changelog/:id
adminRouter.put(
  '/changelog/:id',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid changelog id.' }); return; }

      const existing = db.prepare(`SELECT id FROM changelog WHERE id = ?`).get(id);
      if (!existing) { res.status(404).json({ error: 'Changelog entry not found.' }); return; }

      const { version, release_date, changes } = req.body as ChangelogBody;

      if (!version?.trim()) { res.status(400).json({ error: 'Field "version" is required.' }); return; }
      if (!release_date?.trim()) { res.status(400).json({ error: 'Field "release_date" is required.' }); return; }
      if (!Array.isArray(changes)) { res.status(400).json({ error: 'Field "changes" must be an array.' }); return; }

      db.prepare(`UPDATE changelog SET version = ?, release_date = ?, changes = ? WHERE id = ?`)
        .run(version.trim(), release_date.trim(), JSON.stringify(changes), id);

      const updated = db
        .prepare<[number], { id: number; version: string; release_date: string; changes: string }>(
          `SELECT id, version, release_date, changes FROM changelog WHERE id = ?`
        )
        .get(id)!;

      res.json({ id: updated.id, version: updated.version, release_date: updated.release_date, changes: JSON.parse(updated.changes) as string[] });
    } catch (err) { next(err); }
  }
);

// DELETE /api/admin/changelog/:id
adminRouter.delete(
  '/changelog/:id',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid changelog id.' }); return; }

      const existing = db.prepare(`SELECT id FROM changelog WHERE id = ?`).get(id);
      if (!existing) { res.status(404).json({ error: 'Changelog entry not found.' }); return; }

      db.prepare(`DELETE FROM changelog WHERE id = ?`).run(id);
      res.json({ ok: true, id });
    } catch (err) { next(err); }
  }
);

// ─── Audit Logs ───────────────────────────────────────────────────────────────

// GET /api/admin/audit-logs?page=1&limit=50&action=film.create
adminRouter.get(
  '/audit-logs',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const page   = Math.max(1, parseInt(req.query.page as string ?? '1', 10) || 1);
      const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit as string ?? '50', 10) || 50));
      const action = typeof req.query.action === 'string' && req.query.action ? req.query.action : null;
      const offset = (page - 1) * limit;

      const where  = action ? 'WHERE action = ?' : '';
      const params = action ? [action] : [];

      const total = (
        db.prepare<unknown[], { count: number }>(`SELECT COUNT(*) as count FROM audit_logs ${where}`)
          .get(...params) as { count: number }
      ).count;

      interface AuditRow { id: number; action: string; details: string; created_at: string }
      const rows = db.prepare<unknown[], AuditRow>(
        `SELECT id, action, details, created_at FROM audit_logs ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
      ).all(...params, limit, offset);

      res.json({
        data: rows.map((r) => ({ ...r, details: JSON.parse(r.details) as Record<string, unknown> })),
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      });
    } catch (err) { next(err); }
  }
);

// GET /api/admin/audit-logs/actions  – distinct action types for filter dropdown
adminRouter.get(
  '/audit-logs/actions',
  (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = db
        .prepare<[], { action: string }>(`SELECT DISTINCT action FROM audit_logs ORDER BY action`)
        .all();
      res.json({ data: rows.map((r) => r.action) });
    } catch (err) { next(err); }
  }
);

// ─── Series CRUD ──────────────────────────────────────────────────────────────

// GET /api/admin/series?page=1&limit=20
adminRouter.get(
  '/series',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string | undefined) ?? '1', 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt((req.query.limit as string | undefined) ?? '20', 10))
      );
      const offset = (page - 1) * limit;

      const total = (
        db.prepare(`SELECT COUNT(*) as count FROM series`).get() as { count: number }
      ).count;

      const rows = db
        .prepare<[number, number], SeriesRow>(
          `SELECT * FROM series ORDER BY created_at DESC LIMIT ? OFFSET ?`
        )
        .all(limit, offset);

      res.json({
        data: rows.map((r) => formatSeries(r, getSeriesUsedDates(r.id))),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Analytics ────────────────────────────────────────────────────────────────

// GET /api/admin/analytics/overview
adminRouter.get(
  '/analytics/overview',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const mediaType = req.query.mediaType === 'series' ? 'series' : req.query.mediaType === 'film' ? 'film' : req.query.mediaType === 'wiki' ? 'wiki' : null;
      const joinClause = mediaType ? `JOIN daily_challenges dc ON dc.id = gs.challenge_id` : '';
      const whereClause = mediaType ? `WHERE dc.media_type = ?` : '';
      const overview = db.prepare(`
        SELECT
          COUNT(*) AS total_sessions,
          COUNT(DISTINCT session_token) AS total_unique_players,
          ROUND(100.0 * SUM(CASE WHEN outcome = 'won' THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN outcome IS NOT NULL THEN 1 ELSE 0 END), 0)) AS overall_win_rate,
          ROUND(AVG(CASE WHEN outcome = 'won' THEN json_array_length(attempts) ELSE NULL END), 1) AS avg_attempts_on_win,
          ROUND(AVG(hints_revealed), 1) AS avg_hints_per_session,
          ROUND(100.0 * SUM(CASE WHEN outcome IS NOT NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) AS completion_rate,
          ROUND(AVG(CASE WHEN outcome IS NOT NULL THEN strftime('%s', finished_at) - strftime('%s', started_at) ELSE NULL END)) AS avg_session_duration_seconds
        FROM game_sessions gs
        ${joinClause}
        ${whereClause}
      `).get(...(mediaType ? [mediaType] : [])) as {
        total_sessions: number;
        total_unique_players: number;
        overall_win_rate: number | null;
        avg_attempts_on_win: number | null;
        avg_hints_per_session: number | null;
        completion_rate: number | null;
        avg_session_duration_seconds: number | null;
      };

      res.json({
        total_sessions: overview.total_sessions ?? 0,
        total_unique_players: overview.total_unique_players ?? 0,
        overall_win_rate: overview.overall_win_rate ?? 0,
        avg_attempts_on_win: overview.avg_attempts_on_win ?? 0,
        avg_hints_per_session: overview.avg_hints_per_session ?? 0,
        completion_rate: overview.completion_rate ?? 0,
        avg_session_duration_seconds: overview.avg_session_duration_seconds ?? 0,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/series
adminRouter.post(
  '/series',
  strictAdminLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as SeriesBody;

      if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
        res.status(400).json({ error: 'Field "title" is required.' }); return;
      }
      if (body.title.length > 500) {
        res.status(400).json({ error: 'Field "title" must be 500 characters or fewer.' }); return;
      }
      if (!body.year || typeof body.year !== 'number') {
        res.status(400).json({ error: 'Field "year" must be a number.' }); return;
      }
      const maxYear = new Date().getFullYear() + 5;
      if (!Number.isInteger(body.year) || body.year < 1900 || body.year > maxYear) {
        res.status(400).json({ error: `Field "year" must be between 1900 and ${maxYear}.` }); return;
      }
      if (!body.creator || typeof body.creator !== 'string' || !body.creator.trim()) {
        res.status(400).json({ error: 'Field "creator" is required.' }); return;
      }
      if (body.creator.length > 200) {
        res.status(400).json({ error: 'Field "creator" must be 200 characters or fewer.' }); return;
      }
      if (!body.image_url || typeof body.image_url !== 'string' || !body.image_url.trim()) {
        res.status(400).json({ error: 'Field "image_url" is required.' }); return;
      }
      if (!isValidImageUrl(body.image_url.trim())) {
        res.status(400).json({ error: 'Field "image_url" must be a relative path or a trusted HTTPS URL (tmdb, wikimedia).' }); return;
      }
      if (body.fame_level !== undefined && (typeof body.fame_level !== 'number' || body.fame_level < 1 || body.fame_level > 5)) {
        res.status(400).json({ error: 'Field "fame_level" must be between 1 and 5.' }); return;
      }
      if (body.genres !== undefined && !Array.isArray(body.genres)) {
        res.status(400).json({ error: 'Field "genres" must be an array.' }); return;
      }
      if (body.cast_members !== undefined && !Array.isArray(body.cast_members)) {
        res.status(400).json({ error: 'Field "cast_members" must be an array.' }); return;
      }
      if (body.title_aliases !== undefined && !Array.isArray(body.title_aliases)) {
        res.status(400).json({ error: 'Field "title_aliases" must be an array.' }); return;
      }
      if (body.tagline !== undefined && body.tagline !== null && body.tagline.length > 500) {
        res.status(400).json({ error: 'Field "tagline" must be 500 characters or fewer.' }); return;
      }
      if (body.synopsis !== undefined && body.synopsis !== null && body.synopsis.length > 2000) {
        res.status(400).json({ error: 'Field "synopsis" must be 2000 characters or fewer.' }); return;
      }

      const result = db
        .prepare(
          `INSERT INTO series
             (title, title_aliases, year, creator, genres, cast_members,
              tagline, synopsis, image_url, tmdb_id, fame_level, is_active,
              number_of_seasons, network, status, original_language)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          body.title.trim(),
          JSON.stringify(body.title_aliases ?? []),
          body.year,
          body.creator.trim(),
          JSON.stringify(body.genres ?? []),
          JSON.stringify(body.cast_members ?? []),
          body.tagline ?? null,
          body.synopsis ?? null,
          body.image_url.trim(),
          body.tmdb_id ?? null,
          body.fame_level ?? 3,
          body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1,
          body.number_of_seasons ?? null,
          body.network ?? null,
          body.status ?? null,
          body.original_language ?? null
        );

      const created = db
        .prepare<[number], SeriesRow>(`SELECT * FROM series WHERE id = ?`)
        .get(result.lastInsertRowid as number)!;

      logAuditEvent('series.create', { id: result.lastInsertRowid, title: body.title.trim() });
      res.status(201).json(formatSeries(created, []));
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/analytics/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
adminRouter.get(
  '/analytics/daily',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const defaultTo = new Date().toISOString().slice(0, 10);
      const defaultFrom = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const from = parseDateParam(req.query.from) ?? defaultFrom;
      const to = parseDateParam(req.query.to) ?? defaultTo;
      const mediaType = req.query.mediaType === 'series' ? 'series' : req.query.mediaType === 'film' ? 'film' : req.query.mediaType === 'wiki' ? 'wiki' : null;
      const joinClause = mediaType ? `JOIN daily_challenges dc ON dc.id = gs.challenge_id` : '';
      const mediaWhere = mediaType ? `AND dc.media_type = ?` : '';

      const rows = db.prepare(`
        SELECT
          date(gs.started_at) AS date,
          COUNT(*) AS sessions_started,
          SUM(CASE WHEN gs.outcome IS NOT NULL THEN 1 ELSE 0 END) AS sessions_completed,
          COUNT(DISTINCT gs.session_token) AS unique_players,
          ROUND(100.0 * SUM(CASE WHEN gs.outcome = 'won' THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN gs.outcome IS NOT NULL THEN 1 ELSE 0 END), 0)) AS win_rate,
          ROUND(AVG(CASE WHEN gs.outcome IS NOT NULL THEN json_array_length(gs.attempts) ELSE NULL END), 1) AS avg_attempts,
          ROUND(AVG(gs.hints_revealed), 1) AS avg_hints,
          ROUND(100.0 * SUM(CASE WHEN gs.outcome IS NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) AS abandonment_rate
        FROM game_sessions gs
        ${joinClause}
        WHERE date(gs.started_at) BETWEEN ? AND ?
        ${mediaWhere}
        GROUP BY date(gs.started_at)
        ORDER BY date(gs.started_at) ASC
      `).all(...(mediaType ? [from, to, mediaType] : [from, to])) as {
        date: string;
        sessions_started: number;
        sessions_completed: number;
        unique_players: number;
        win_rate: number | null;
        avg_attempts: number | null;
        avg_hints: number | null;
        abandonment_rate: number | null;
      }[];

      res.json(rows.map((r) => ({
        date: r.date,
        sessions_started: r.sessions_started,
        sessions_completed: r.sessions_completed,
        unique_players: r.unique_players,
        win_rate: r.win_rate ?? 0,
        avg_attempts: r.avg_attempts ?? 0,
        avg_hints: r.avg_hints ?? 0,
        abandonment_rate: r.abandonment_rate ?? 0,
      })));
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/analytics/attempts-distribution
adminRouter.get(
  '/analytics/attempts-distribution',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const mediaType = req.query.mediaType === 'series' ? 'series' : req.query.mediaType === 'film' ? 'film' : req.query.mediaType === 'wiki' ? 'wiki' : null;
      const joinClause = mediaType ? `JOIN daily_challenges dc ON dc.id = gs.challenge_id` : '';
      const whereMedia = mediaType ? `AND dc.media_type = ?` : '';
      const rows = db.prepare(`
        SELECT json_array_length(gs.attempts) AS attempt_count, COUNT(*) AS cnt
        FROM game_sessions gs
        ${joinClause}
        WHERE gs.outcome = 'won'
        ${whereMedia}
        GROUP BY attempt_count
        ORDER BY attempt_count ASC
      `).all(...(mediaType ? [mediaType] : [])) as { attempt_count: number; cnt: number }[];

      const result: Record<string, number> = {};
      for (const row of rows) {
        result[String(row.attempt_count)] = row.cnt;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/analytics/hints-distribution
adminRouter.get(
  '/analytics/hints-distribution',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const mediaType = req.query.mediaType === 'series' ? 'series' : req.query.mediaType === 'film' ? 'film' : req.query.mediaType === 'wiki' ? 'wiki' : null;
      const joinClause = mediaType ? `JOIN daily_challenges dc ON dc.id = gs.challenge_id` : '';
      const whereMedia = mediaType ? `WHERE dc.media_type = ?` : '';
      const rows = db.prepare(`
        SELECT gs.hints_revealed, COUNT(*) AS cnt
        FROM game_sessions gs
        ${joinClause}
        ${whereMedia}
        GROUP BY gs.hints_revealed
        ORDER BY gs.hints_revealed ASC
      `).all(...(mediaType ? [mediaType] : [])) as { hints_revealed: number; cnt: number }[];

      const result: Record<string, number> = {};
      for (const row of rows) {
        result[String(row.hints_revealed)] = row.cnt;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/admin/series/:id
adminRouter.patch(
  '/series/:id',
  strictAdminLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid series id.' }); return; }

      const existing = db
        .prepare<[number], SeriesRow>(`SELECT * FROM series WHERE id = ?`)
        .get(id);
      if (!existing) { res.status(404).json({ error: 'Series not found.' }); return; }

      const body = req.body as Partial<SeriesBody>;

      if (body.title !== undefined && body.title.length > 500) {
        res.status(400).json({ error: 'Field "title" must be 500 characters or fewer.' }); return;
      }
      if (body.creator !== undefined && body.creator.length > 200) {
        res.status(400).json({ error: 'Field "creator" must be 200 characters or fewer.' }); return;
      }
      if (body.year !== undefined) {
        const maxYear = new Date().getFullYear() + 5;
        if (!Number.isInteger(body.year) || body.year < 1900 || body.year > maxYear) {
          res.status(400).json({ error: `Field "year" must be between 1900 and ${maxYear}.` }); return;
        }
      }
      if (body.fame_level !== undefined && (body.fame_level < 1 || body.fame_level > 5)) {
        res.status(400).json({ error: 'Field "fame_level" must be between 1 and 5.' }); return;
      }

      db.prepare(
        `UPDATE series
         SET title        = ?,
             title_aliases = ?,
             year         = ?,
             creator      = ?,
             genres       = ?,
             cast_members = ?,
             tagline      = ?,
             synopsis     = ?,
             image_url    = ?,
             tmdb_id      = ?,
             fame_level   = ?,
             is_active    = ?,
             number_of_seasons = ?,
             network      = ?,
             status       = ?,
             original_language = ?,
             updated_at   = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = ?`
      ).run(
        (body.title ?? existing.title).trim(),
        JSON.stringify(body.title_aliases ?? JSON.parse(existing.title_aliases)),
        body.year ?? existing.year,
        (body.creator ?? existing.creator).trim(),
        JSON.stringify(body.genres ?? JSON.parse(existing.genres)),
        JSON.stringify(body.cast_members ?? JSON.parse(existing.cast_members)),
        body.tagline !== undefined ? body.tagline : existing.tagline,
        body.synopsis !== undefined ? body.synopsis : existing.synopsis,
        (body.image_url ?? existing.image_url).trim(),
        body.tmdb_id !== undefined ? body.tmdb_id : existing.tmdb_id,
        body.fame_level !== undefined ? body.fame_level : (existing.fame_level ?? 3),
        body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active,
        body.number_of_seasons !== undefined ? body.number_of_seasons : existing.number_of_seasons,
        body.network !== undefined ? body.network : existing.network,
        body.status !== undefined ? body.status : existing.status,
        body.original_language !== undefined ? body.original_language : existing.original_language,
        id
      );

      const updated = db.prepare<[number], SeriesRow>(`SELECT * FROM series WHERE id = ?`).get(id)!;
      logAuditEvent('series.update', { id, fields: Object.keys(body) });
      res.json(formatSeries(updated, getSeriesUsedDates(id)));
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/analytics/hourly
adminRouter.get(
  '/analytics/hourly',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const mediaType = req.query.mediaType === 'series' ? 'series' : req.query.mediaType === 'film' ? 'film' : req.query.mediaType === 'wiki' ? 'wiki' : null;
      const joinClause = mediaType ? `JOIN daily_challenges dc ON dc.id = gs.challenge_id` : '';
      const whereClause = mediaType ? `WHERE dc.media_type = ?` : '';
      const rows = db.prepare(`
        SELECT CAST(strftime('%H', gs.started_at, '+1 hour') AS INTEGER) AS hour,
               COUNT(*) AS sessions
        FROM game_sessions gs
        ${joinClause}
        ${whereClause}
        GROUP BY hour
        ORDER BY hour ASC
      `).all(...(mediaType ? [mediaType] : [])) as { hour: number; sessions: number }[];

      res.json(rows);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/analytics/films?sort=win_rate|sessions|avg_hints
adminRouter.get(
  '/analytics/films',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const sortParam = req.query.sort as string | undefined;
      const validSorts = ['win_rate', 'sessions', 'avg_hints'] as const;
      type SortOption = typeof validSorts[number];
      const sort: SortOption = validSorts.includes(sortParam as SortOption)
        ? (sortParam as SortOption)
        : 'win_rate';

      const orderClause =
        sort === 'win_rate'
          ? 'ORDER BY win_rate ASC'
          : sort === 'sessions'
          ? 'ORDER BY sessions DESC'
          : 'ORDER BY avg_hints DESC';

      const rows = db.prepare(`
        SELECT
          dc.id AS challenge_id,
          dc.challenge_date,
          f.title AS film_title,
          f.year AS film_year,
          f.fame_level,
          COUNT(gs.rowid) AS sessions,
          ROUND(100.0 * SUM(CASE WHEN gs.outcome = 'won' THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN gs.outcome IS NOT NULL THEN 1 ELSE 0 END), 0)) AS win_rate,
          ROUND(AVG(CASE WHEN gs.outcome IS NOT NULL THEN json_array_length(gs.attempts) ELSE NULL END), 1) AS avg_attempts,
          ROUND(AVG(gs.hints_revealed), 1) AS avg_hints,
          (
            SELECT j.value->>'$.guess'
            FROM game_sessions gs2, json_each(gs2.attempts) j
            WHERE gs2.challenge_id = dc.id AND j.value->>'$.correct' = 'false'
            GROUP BY j.value->>'$.guess'
            ORDER BY COUNT(*) DESC
            LIMIT 1
          ) AS most_common_wrong_guess
        FROM daily_challenges dc
        JOIN films f ON f.id = dc.film_id
        LEFT JOIN game_sessions gs ON gs.challenge_id = dc.id
        GROUP BY dc.id
        ${orderClause}
      `).all() as {
        challenge_id: number;
        challenge_date: string;
        film_title: string;
        film_year: number;
        fame_level: number;
        sessions: number;
        win_rate: number | null;
        avg_attempts: number | null;
        avg_hints: number | null;
        most_common_wrong_guess: string | null;
      }[];

      res.json(rows.map((r) => ({
        challenge_id: r.challenge_id,
        challenge_date: r.challenge_date,
        film_title: r.film_title,
        film_year: r.film_year,
        fame_level: r.fame_level,
        sessions: r.sessions,
        win_rate: r.win_rate ?? 0,
        avg_attempts: r.avg_attempts ?? 0,
        avg_hints: r.avg_hints ?? 0,
        most_common_wrong_guess: r.most_common_wrong_guess ?? null,
      })));
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/analytics/series?sort=win_rate|sessions|avg_hints
adminRouter.get(
  '/analytics/series',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const sortParam = req.query.sort as string | undefined;
      const validSorts = ['win_rate', 'sessions', 'avg_hints'] as const;
      type SortOption = typeof validSorts[number];
      const sort: SortOption = validSorts.includes(sortParam as SortOption)
        ? (sortParam as SortOption)
        : 'win_rate';

      const orderClause =
        sort === 'win_rate'
          ? 'ORDER BY win_rate ASC'
          : sort === 'sessions'
          ? 'ORDER BY sessions DESC'
          : 'ORDER BY avg_hints DESC';

      const rows = db.prepare(`
        SELECT
          dc.id AS challenge_id,
          dc.challenge_date,
          s.title AS series_title,
          s.year AS series_year,
          s.fame_level,
          COUNT(gs.rowid) AS sessions,
          ROUND(100.0 * SUM(CASE WHEN gs.outcome = 'won' THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN gs.outcome IS NOT NULL THEN 1 ELSE 0 END), 0)) AS win_rate,
          ROUND(AVG(CASE WHEN gs.outcome IS NOT NULL THEN json_array_length(gs.attempts) ELSE NULL END), 1) AS avg_attempts,
          ROUND(AVG(gs.hints_revealed), 1) AS avg_hints,
          (
            SELECT j.value->>'$.guess'
            FROM game_sessions gs2, json_each(gs2.attempts) j
            WHERE gs2.challenge_id = dc.id AND j.value->>'$.correct' = 'false'
            GROUP BY j.value->>'$.guess'
            ORDER BY COUNT(*) DESC
            LIMIT 1
          ) AS most_common_wrong_guess
        FROM daily_challenges dc
        JOIN series s ON s.id = dc.series_id
        LEFT JOIN game_sessions gs ON gs.challenge_id = dc.id
        GROUP BY dc.id
        ${orderClause}
      `).all() as {
        challenge_id: number;
        challenge_date: string;
        series_title: string;
        series_year: number;
        fame_level: number;
        sessions: number;
        win_rate: number | null;
        avg_attempts: number | null;
        avg_hints: number | null;
        most_common_wrong_guess: string | null;
      }[];

      res.json(rows.map((r) => ({
        challenge_id: r.challenge_id,
        challenge_date: r.challenge_date,
        series_title: r.series_title,
        series_year: r.series_year,
        fame_level: r.fame_level,
        sessions: r.sessions,
        win_rate: r.win_rate ?? 0,
        avg_attempts: r.avg_attempts ?? 0,
        avg_hints: r.avg_hints ?? 0,
        most_common_wrong_guess: r.most_common_wrong_guess ?? null,
      })));
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/analytics/challenges?mediaType=film|series&sort=win_rate|sessions|avg_hints
adminRouter.get(
  '/analytics/challenges',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawMediaType = req.query.mediaType;
      const mediaType = rawMediaType === 'series' ? 'series' : rawMediaType === 'wiki' ? 'wiki' : 'film';
      const sortParam = req.query.sort as string | undefined;
      const validSorts = ['win_rate', 'sessions', 'avg_hints'] as const;
      type SortOption = typeof validSorts[number];
      const sort: SortOption = validSorts.includes(sortParam as SortOption)
        ? (sortParam as SortOption)
        : 'win_rate';

      const orderClause =
        sort === 'win_rate'
          ? 'ORDER BY win_rate ASC'
          : sort === 'sessions'
          ? 'ORDER BY sessions DESC'
          : 'ORDER BY avg_hints DESC';

      const mediaJoin =
        mediaType === 'series'
          ? `JOIN series m ON m.id = dc.series_id`
          : mediaType === 'wiki'
          ? `JOIN wiki_persons m ON m.id = dc.wiki_person_id`
          : `JOIN films m ON m.id = dc.film_id`;

      const titleCol = mediaType === 'wiki' ? `m.name` : `m.title`;
      const yearCol = mediaType === 'wiki' ? `0` : `m.year`;
      const fameCol = mediaType === 'wiki' ? `m.difficulty` : `m.fame_level`;

      const rows = db.prepare(`
        SELECT
          dc.id AS challenge_id,
          dc.challenge_date,
          ${titleCol} AS title,
          ${yearCol} AS year,
          ${fameCol} AS fame_level,
          COUNT(gs.rowid) AS sessions,
          ROUND(100.0 * SUM(CASE WHEN gs.outcome = 'won' THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN gs.outcome IS NOT NULL THEN 1 ELSE 0 END), 0)) AS win_rate,
          ROUND(AVG(CASE WHEN gs.outcome IS NOT NULL THEN json_array_length(gs.attempts) ELSE NULL END), 1) AS avg_attempts,
          ROUND(AVG(gs.hints_revealed), 1) AS avg_hints,
          (
            SELECT j.value->>'$.guess'
            FROM game_sessions gs2, json_each(gs2.attempts) j
            WHERE gs2.challenge_id = dc.id AND j.value->>'$.correct' = 'false'
            GROUP BY j.value->>'$.guess'
            ORDER BY COUNT(*) DESC
            LIMIT 1
          ) AS most_common_wrong_guess
        FROM daily_challenges dc
        ${mediaJoin}
        LEFT JOIN game_sessions gs ON gs.challenge_id = dc.id
        WHERE dc.media_type = ?
        GROUP BY dc.id
        ${orderClause}
      `).all(mediaType) as {
        challenge_id: number;
        challenge_date: string;
        title: string;
        year: number;
        fame_level: number;
        sessions: number;
        win_rate: number | null;
        avg_attempts: number | null;
        avg_hints: number | null;
        most_common_wrong_guess: string | null;
      }[];

      res.json(rows.map((r) => ({
        challenge_id: r.challenge_id,
        challenge_date: r.challenge_date,
        media_type: mediaType,
        title: r.title,
        year: r.year,
        fame_level: r.fame_level,
        sessions: r.sessions,
        win_rate: r.win_rate ?? 0,
        avg_attempts: r.avg_attempts ?? 0,
        avg_hints: r.avg_hints ?? 0,
        most_common_wrong_guess: r.most_common_wrong_guess ?? null,
      })));
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/admin/series/:id
adminRouter.delete(
  '/series/:id',
  strictAdminLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid series id.' }); return; }

      const existing = db
        .prepare<[number], Pick<SeriesRow, 'id'>>(`SELECT id FROM series WHERE id = ?`)
        .get(id);
      if (!existing) { res.status(404).json({ error: 'Series not found.' }); return; }

      const scheduled = db
        .prepare<[number], { count: number }>(
          `SELECT COUNT(*) as count FROM daily_challenges WHERE series_id = ?`
        )
        .get(id);

      if (scheduled && scheduled.count > 0) {
        res.status(409).json({
          error: `Cette série est planifiée sur ${scheduled.count} date(s). Retirez-la du planning avant de la supprimer.`,
        });
        return;
      }

      db.prepare(`DELETE FROM series WHERE id = ?`).run(id);
      logAuditEvent('series.delete', { id });
      res.json({ ok: true, id });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/analytics/wrong-guesses?challenge_id=X&limit=10
adminRouter.get(
  '/analytics/wrong-guesses',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const challengeId = parseInt(req.query.challenge_id as string, 10);
      if (isNaN(challengeId)) {
        res.status(400).json({ error: 'Query param "challenge_id" must be a valid integer.' });
        return;
      }

      const limit = Math.min(
        100,
        Math.max(1, parseInt((req.query.limit as string | undefined) ?? '10', 10) || 10)
      );

      const rows = db.prepare(`
        SELECT j.value->>'$.guess' AS guess, COUNT(*) AS count
        FROM game_sessions gs, json_each(gs.attempts) j
        WHERE gs.challenge_id = ? AND j.value->>'$.correct' = 'false'
        GROUP BY guess
        ORDER BY count DESC
        LIMIT ?
      `).all(challengeId, limit) as { guess: string; count: number }[];

      res.json(rows);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/series/:id/image  – upload a local image file
adminRouter.post(
  '/series/:id/image',
  upload.single('image'),
  validateUploadedImageSignature,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid series id.' }); return; }
      if (!req.file) { res.status(400).json({ error: 'No image file received.' }); return; }

      const existing = db
        .prepare<[number], Pick<SeriesRow, 'id'>>(`SELECT id FROM series WHERE id = ?`)
        .get(id);
      if (!existing) {
        fs.unlinkSync(req.file.path);
        res.status(404).json({ error: 'Series not found.' });
        return;
      }

      const imageUrl = `/uploads/${req.file.filename}`;

      db.prepare(
        `UPDATE series SET image_url = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`
      ).run(imageUrl, id);

      const updated = db.prepare<[number], SeriesRow>(`SELECT * FROM series WHERE id = ?`).get(id)!;
      res.json({ url: imageUrl, series: formatSeries(updated) });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/series/:id/backdrops
adminRouter.get(
  '/series/:id/backdrops',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid series id.' }); return; }

      const series = db
        .prepare<[number], Pick<SeriesRow, 'tmdb_id'>>(`SELECT tmdb_id FROM series WHERE id = ?`)
        .get(id);
      if (!series) { res.status(404).json({ error: 'Series not found.' }); return; }
      if (!series.tmdb_id) { res.status(400).json({ error: 'No TMDB ID for this series' }); return; }

      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) { res.status(400).json({ error: 'TMDB_API_KEY not configured' }); return; }

      const url = `https://api.themoviedb.org/3/tv/${series.tmdb_id}/images?api_key=${apiKey}&include_image_language=null`;
      const safeUrl = maskTmdbApiKey(url);
      const tmdbRes = await fetch(url);
      if (!tmdbRes.ok) { res.status(502).json({ error: `TMDB error: ${tmdbRes.status} (${safeUrl})` }); return; }

      const data = (await tmdbRes.json()) as TmdbImagesResponse;
      const backdrops = (data.backdrops ?? [])
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 12)
        .map((b) => ({
          path: b.file_path,
          url: `https://image.tmdb.org/t/p/w1280${b.file_path}`,
          width: b.width,
          height: b.height,
          vote_average: b.vote_average,
        }));

      res.json({ backdrops });
    } catch (err) {
      next(err);
    }
  }
);

// ─── TMDB TV search ───────────────────────────────────────────────────────────

// GET /api/admin/tmdb/tv/search?q=title
adminRouter.get(
  '/tmdb/tv/search',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (req.query.q as string | undefined)?.trim();
      if (!q || q.length < 2) { res.json({ results: [] }); return; }

      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) { res.status(400).json({ error: 'TMDB_API_KEY not configured' }); return; }

      const searchUrl =
        `https://api.themoviedb.org/3/search/tv` +
        `?api_key=${apiKey}&language=fr-FR&query=${encodeURIComponent(q)}&page=1`;
      const safeUrl = maskTmdbApiKey(searchUrl);

      const tmdbRes = await fetch(searchUrl);
      if (!tmdbRes.ok) { res.status(502).json({ error: `TMDB error: ${tmdbRes.status} (${safeUrl})` }); return; }

      const data = (await tmdbRes.json()) as {
        results: {
          id: number;
          name: string;
          original_name: string;
          first_air_date: string;
          poster_path: string | null;
        }[];
      };

      const results = (data.results ?? []).slice(0, 8).map((m) => ({
        tmdb_id: m.id,
        title: m.name,
        original_title: m.original_name,
        year: m.first_air_date ? parseInt(m.first_air_date.slice(0, 4), 10) : 0,
        poster_url: m.poster_path
          ? `https://image.tmdb.org/t/p/w185${m.poster_path}`
          : null,
      }));

      res.json({ results });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/tmdb/tv/:tmdbId/details
adminRouter.get(
  '/tmdb/tv/:tmdbId/details',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tmdbId = parseInt(req.params.tmdbId, 10);
      if (isNaN(tmdbId)) { res.status(400).json({ error: 'Invalid TMDB id.' }); return; }

      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) { res.status(400).json({ error: 'TMDB_API_KEY not configured' }); return; }

      const [detailsRes, creditsRes, imagesRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}&language=fr-FR`),
        fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/aggregate_credits?api_key=${apiKey}`),
        fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/images?api_key=${apiKey}&include_image_language=null`),
      ]);

      const details = (await detailsRes.json()) as {
        id: number;
        name: string;
        original_name: string;
        first_air_date: string;
        tagline: string;
        overview: string;
        backdrop_path: string | null;
        genres: { name: string }[];
        vote_count: number;
        number_of_seasons: number;
        networks: { name: string }[];
        status: string;
        original_language: string;
        created_by: { name: string }[];
      };
      const credits = (await creditsRes.json()) as {
        cast: { name: string }[];
      };
      const images = (await imagesRes.json()) as {
        backdrops: { file_path: string; vote_average: number }[];
      };

      const creator = (details.created_by ?? []).map((c) => c.name).join(', ');
      const cast = (credits.cast ?? []).slice(0, 5).map((c) => c.name);
      const genres = (details.genres ?? []).map((g) => g.name);
      const network = (details.networks ?? [])[0]?.name ?? '';

      const bestBackdrop = (images.backdrops ?? [])
        .sort((a, b) => b.vote_average - a.vote_average)[0];
      const imageUrl = bestBackdrop
        ? `https://image.tmdb.org/t/p/w1280${bestBackdrop.file_path}`
        : details.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`
        : '';

      const titleAliases: string[] = [];
      if (details.original_name && details.original_name !== details.name) {
        titleAliases.push(details.original_name);
      }

      const statusMap: Record<string, string> = {
        'Ended': 'Terminée',
        'Canceled': 'Terminée',
        'Returning Series': 'En cours',
        'In Production': 'En cours',
        'Planned': 'En cours',
      };

      res.json({
        title: details.name,
        title_aliases: titleAliases,
        year: details.first_air_date ? parseInt(details.first_air_date.slice(0, 4), 10) : 0,
        creator,
        genres,
        cast_members: cast,
        tagline: details.tagline ?? '',
        synopsis: details.overview ?? '',
        image_url: imageUrl,
        tmdb_id: details.id,
        is_active: true,
        fame_level: fameFromVoteCount(details.vote_count ?? 0),
        number_of_seasons: details.number_of_seasons ?? null,
        network,
        status: statusMap[details.status] ?? details.status ?? null,
        original_language: details.original_language ?? null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/tmdb/tv/:tmdbId/backdrops
adminRouter.get(
  '/tmdb/tv/:tmdbId/backdrops',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tmdbId = parseInt(req.params.tmdbId, 10);
      if (isNaN(tmdbId)) { res.status(400).json({ error: 'Invalid TMDB id.' }); return; }

      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) { res.status(400).json({ error: 'TMDB_API_KEY not configured' }); return; }

      const url = `https://api.themoviedb.org/3/tv/${tmdbId}/images?api_key=${apiKey}&include_image_language=null`;
      const safeUrl = maskTmdbApiKey(url);
      const tmdbRes = await fetch(url);
      if (!tmdbRes.ok) { res.status(502).json({ error: `TMDB error: ${tmdbRes.status} (${safeUrl})` }); return; }

      const data = (await tmdbRes.json()) as TmdbImagesResponse;
      const backdrops = (data.backdrops ?? [])
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 12)
        .map((b) => ({
          path: b.file_path,
          url: `https://image.tmdb.org/t/p/w1280${b.file_path}`,
          width: b.width,
          height: b.height,
          vote_average: b.vote_average,
        }));

      res.json({ backdrops });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Wiki Persons CRUD ────────────────────────────────────────────────────────

// GET /api/admin/wiki-persons
adminRouter.get('/wiki-persons', (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10))
    const limit = Math.min(100, parseInt((req.query.limit as string) ?? '50', 10))
    const offset = (page - 1) * limit
    const search = (req.query.q as string) ?? ''

    const where = search ? `WHERE name_lower LIKE '%' || lower(?) || '%'` : ''
    const params = search ? [search, limit, offset] : [limit, offset]

    const rows = db.prepare(`
      SELECT wp.*,
        GROUP_CONCAT(DISTINCT date(dc.challenge_date)) AS used_dates
      FROM wiki_persons wp
      LEFT JOIN daily_challenges dc ON dc.wiki_person_id = wp.id
      ${where}
      GROUP BY wp.id
      ORDER BY wp.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params) as (WikiPersonRow & { used_dates: string | null })[]

    const total = (db.prepare(`SELECT COUNT(*) AS n FROM wiki_persons ${where}`)
      .get(...(search ? [search] : [])) as { n: number }).n

    const data = rows.map((row) => formatWikiPerson(
      row,
      (row.used_dates ?? '').split(',').map((d) => d.trim()).filter(Boolean)
    ))

    res.json({ data, total, page, limit })
  } catch (err) { next(err) }
})

function normalizeWikiHintSchedule(raw: unknown, personType: unknown): string {
  const normalizedPersonType = String(personType ?? 'politician');
  const isSport = normalizedPersonType === 'sportsperson';
  const isPolitician = normalizedPersonType === 'politician';
  const isEntrepreneur = normalizedPersonType === 'entrepreneur';
  const allowedByType = isPolitician
    ? new Set(['birth_year', 'nationality', 'party', 'name_initials', 'name_length'])
    : isSport
      ? new Set(['birth_year', 'nationality', 'position', 'name_initials', 'name_length'])
      : isEntrepreneur
        ? new Set(['birth_year', 'nationality', 'domain', 'notable_work', 'company', 'name_initials', 'name_length'])
        : new Set(['birth_year', 'nationality', 'domain', 'notable_work', 'name_initials', 'name_length']);
  const fallback = isPolitician
    ? ['birth_year', 'nationality', 'party', 'name_initials', 'name_length']
    : isSport
      ? ['birth_year', 'nationality', 'position', 'name_initials', 'name_length']
      : isEntrepreneur
        ? ['birth_year', 'nationality', 'company', 'name_initials', 'name_length']
        : ['birth_year', 'nationality', 'name_initials', 'name_length'];

  const parseCandidate = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.filter((k): k is string => typeof k === 'string');
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (Array.isArray(parsed)) return parsed.filter((k): k is string => typeof k === 'string');
      } catch {
        return [];
      }
    }
    return [];
  };

  const picked = parseCandidate(raw).filter((key) => allowedByType.has(key));
  return JSON.stringify(picked.length > 0 ? picked : fallback);
}

// POST /api/admin/wiki-persons
adminRouter.post('/wiki-persons', strictAdminLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name, name_aliases = '[]', person_type = 'politician',
      wikipedia_slug, infobox_data = '{}', hint_schedule = '[]',
      photo_url, extract, wikipedia_url, difficulty = 3,
    } = req.body as Record<string, unknown>

    if (!name || !wikipedia_slug) {
      res.status(400).json({ error: 'name and wikipedia_slug are required.' }); return
    }

    const safeAliases = typeof name_aliases === 'string' ? name_aliases : JSON.stringify(name_aliases)
    const safeInfobox = typeof infobox_data === 'string' ? infobox_data : JSON.stringify(infobox_data)
    const safeHintSchedule = normalizeWikiHintSchedule(hint_schedule, person_type)

    const result = db.prepare(`
      INSERT INTO wiki_persons (name, name_aliases, person_type, wikipedia_slug, infobox_data, hint_schedule, photo_url, extract, wikipedia_url, difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(name),
      safeAliases,
      String(person_type),
      String(wikipedia_slug),
      safeInfobox,
      safeHintSchedule,
      typeof photo_url === 'string' && photo_url.trim()
        ? (photo_url.trim().startsWith('//') ? `https:${photo_url.trim()}` : photo_url.trim())
        : null,
      typeof extract === 'string' && extract.trim() ? extract : null,
      typeof wikipedia_url === 'string' && wikipedia_url.trim() ? wikipedia_url : null,
      typeof difficulty === 'number' ? difficulty : parseInt(String(difficulty ?? 3), 10) || 3
    )

    logAuditEvent('wiki_person_created', { id: result.lastInsertRowid, name })
    res.status(201).json({ id: result.lastInsertRowid })
  } catch (err) { next(err) }
})

// PUT /api/admin/wiki-persons/:id
adminRouter.put('/wiki-persons/:id', strictAdminLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid wiki person id.' }); return }
    const {
      name, name_aliases, person_type, wikipedia_slug,
      infobox_data, hint_schedule, photo_url, extract, wikipedia_url, difficulty, is_active,
    } = req.body as Record<string, unknown>

    const safeNameAliases =
      name_aliases === undefined
        ? null
        : (typeof name_aliases === 'string' ? name_aliases : JSON.stringify(name_aliases))
    const safeInfoboxData =
      infobox_data === undefined
        ? null
        : (typeof infobox_data === 'string' ? infobox_data : JSON.stringify(infobox_data))
    const currentPersonType =
      person_type === undefined
        ? (db.prepare<[number], { person_type: WikiPersonRow['person_type'] }>(`SELECT person_type FROM wiki_persons WHERE id = ?`).get(id)?.person_type ?? 'politician')
        : person_type
    const safeHintSchedule =
      hint_schedule === undefined
        ? null
        : normalizeWikiHintSchedule(hint_schedule, currentPersonType)
    const safeDifficulty =
      difficulty === undefined ? null : (typeof difficulty === 'number' ? difficulty : (parseInt(String(difficulty), 10) || null))
    const safeIsActive =
      is_active === undefined
        ? null
        : (typeof is_active === 'boolean' ? (is_active ? 1 : 0) : (parseInt(String(is_active), 10) ? 1 : 0))

    const updateRes = db.prepare(`
      UPDATE wiki_persons SET
        name = COALESCE(?, name),
        name_aliases = COALESCE(?, name_aliases),
        person_type = COALESCE(?, person_type),
        wikipedia_slug = COALESCE(?, wikipedia_slug),
        infobox_data = COALESCE(?, infobox_data),
        hint_schedule = COALESCE(?, hint_schedule),
        photo_url = COALESCE(?, photo_url),
        extract = COALESCE(?, extract),
        wikipedia_url = COALESCE(?, wikipedia_url),
        difficulty = COALESCE(?, difficulty),
        is_active = COALESCE(?, is_active),
        updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
      WHERE id = ?
    `).run(
      typeof name === 'string' ? name : null,
      safeNameAliases,
      typeof person_type === 'string' ? person_type : null,
      typeof wikipedia_slug === 'string' ? wikipedia_slug : null,
      safeInfoboxData,
      safeHintSchedule,
      photo_url !== undefined
        ? (typeof photo_url === 'string' && photo_url.trim()
            ? (photo_url.trim().startsWith('//') ? `https:${photo_url.trim()}` : photo_url.trim())
            : null)
        : null,
      extract !== undefined ? (typeof extract === 'string' && extract.trim() ? extract : null) : null,
      wikipedia_url !== undefined ? (typeof wikipedia_url === 'string' && wikipedia_url.trim() ? wikipedia_url : null) : null,
      safeDifficulty,
      safeIsActive,
      id
    )
    if (updateRes.changes === 0) { res.status(404).json({ error: 'Wiki person not found.' }); return }

    logAuditEvent('wiki_person_updated', { id })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// DELETE /api/admin/wiki-persons/:id
adminRouter.delete('/wiki-persons/:id', strictAdminLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid wiki person id.' }); return }
    const existing = db.prepare<[number], Pick<WikiPersonRow, 'id'>>(`SELECT id FROM wiki_persons WHERE id = ?`).get(id)
    if (!existing) { res.status(404).json({ error: 'Wiki person not found.' }); return }
    const scheduled = db
      .prepare<[number], { count: number }>(`SELECT COUNT(*) as count FROM daily_challenges WHERE wiki_person_id = ?`)
      .get(id)
    if (scheduled && scheduled.count > 0) {
      res.status(409).json({
        error: `Cette personnalité est planifiée sur ${scheduled.count} date(s). Retire-la du planning avant suppression.`,
      })
      return
    }
    const deleteRes = db.prepare(`DELETE FROM wiki_persons WHERE id = ?`).run(id)
    if (deleteRes.changes === 0) { res.status(404).json({ error: 'Wiki person not found.' }); return }
    logAuditEvent('wiki_person_deleted', { id })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

async function fetchSparqlSlugs(lang: string, minFame: number): Promise<string[]> {
  const sparql = `
    SELECT ?title WHERE {
      ?person wdt:P31 wd:Q5 ;
              wdt:P569 ?birthDate ;
              wikibase:sitelinks ?n .
      FILTER(YEAR(?birthDate) >= 1900 && ?n >= ${minFame})
      ?art schema:about ?person ;
           schema:isPartOf <https://${lang}.wikipedia.org/> ;
           schema:name ?title .
    }
    LIMIT 100
  `
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`
  const sparqlRes = await fetch(url, {
    headers: { 'Accept': 'application/sparql-results+json', 'User-Agent': 'MovieGame/1.0 (admin tool)' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!sparqlRes.ok) throw new Error(`Wikidata SPARQL error: ${sparqlRes.status}`)
  const data = await sparqlRes.json() as { results?: { bindings?: Array<{ title?: { value: string } }> } }
  return (data.results?.bindings ?? [])
    .map((b) => b.title?.value?.replace(/ /g, '_') ?? '')
    .filter(Boolean)
}

// GET /api/admin/wiki-persons/random?lang=fr&minFame=30
// Returns a batch of slugs; the frontend manages the pool to avoid repeated SPARQL calls.
adminRouter.get('/wiki-persons/random', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lang = typeof req.query.lang === 'string' ? req.query.lang : 'fr'
    const minFame = Math.max(5, Math.min(100, parseInt(String(req.query.minFame ?? '30'), 10) || 30))
    const slugs = await fetchSparqlSlugs(lang, minFame)
    if (slugs.length === 0) {
      res.status(404).json({ error: 'Aucun résultat Wikidata. Essaie de réduire minFame.' })
      return
    }
    // Shuffle before sending
    for (let i = slugs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slugs[i], slugs[j]] = [slugs[j], slugs[i]]
    }
    res.json({ slugs })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/wiki-persons/fetch-wikipedia
// Body: { input | q | slug: string, lang?: string } — nom libre, titre, slug ou URL Wikipédia
adminRouter.post('/wiki-persons/fetch-wikipedia', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as { slug?: string; input?: string; q?: string; lang?: string }
    const langRaw = typeof body.lang === 'string' ? body.lang : 'fr'
    const lang = /^[a-z]{2}$/i.test(langRaw) ? langRaw.toLowerCase() : 'fr'
    const raw = [body.input, body.q, body.slug]
      .find((x): x is string => typeof x === 'string' && x.trim().length > 0)
      ?.trim()
    if (!raw) {
      res.status(400).json({ error: 'input, q ou slug est requis.' }); return
    }
    const { resolveWikipediaSlug, fetchWikipediaData } = await import('../lib/wikipedia.js')
    const { slug: resolvedSlug, lang: resolvedLang } = await resolveWikipediaSlug(raw, lang)
    const data = await fetchWikipediaData(resolvedSlug, resolvedLang)
    res.json({
      ...data,
      resolved_slug: data.canonical_wikipedia_slug ?? resolvedSlug,
      resolved_lang: resolvedLang,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (
      msg === 'Recherche vide.'
      || msg.startsWith('Aucune page Wikipédia')
      || msg.startsWith('Page Wikipédia introuvable')
      || msg === 'URL Wikipédia invalide.'
    ) {
      res.status(400).json({ error: msg }); return
    }
    next(err)
  }
})

// GET /api/admin/analytics/returning-players?days=30
adminRouter.get(
  '/analytics/returning-players',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const daysParam = parseInt((req.query.days as string | undefined) ?? '0', 10);
      const useDaysFilter = !isNaN(daysParam) && daysParam > 0;
      const mediaType = req.query.mediaType === 'series' ? 'series' : req.query.mediaType === 'film' ? 'film' : req.query.mediaType === 'wiki' ? 'wiki' : null;
      const joinClause = mediaType ? `JOIN daily_challenges dc ON dc.id = gs.challenge_id` : '';
      const whereMedia = mediaType ? `dc.media_type = '${mediaType}'` : '';
      const whereDays = useDaysFilter ? `gs.started_at >= date('now', '-' || ${daysParam} || ' days')` : '';
      const whereClause =
        whereMedia && whereDays
          ? `WHERE ${whereMedia} AND ${whereDays}`
          : whereMedia
          ? `WHERE ${whereMedia}`
          : whereDays
          ? `WHERE ${whereDays}`
          : '';

      const rows = db.prepare(`
        SELECT days_played, COUNT(*) AS player_count
        FROM (
          SELECT gs.session_token, COUNT(DISTINCT date(gs.started_at)) AS days_played
          FROM game_sessions gs
          ${joinClause}
          ${whereClause}
          GROUP BY gs.session_token
          HAVING days_played >= 1
        )
        GROUP BY days_played
        ORDER BY days_played ASC
      `).all() as { days_played: number; player_count: number }[];

      res.json(rows);
    } catch (err) {
      next(err);
    }
  }
);
