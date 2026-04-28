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
import db from '../db/database.js';
import { adminAuth, computeAdminToken, ADMIN_COOKIE } from '../middleware/adminAuth.js';

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
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

export const adminRouter = Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE_OPTIONS = {
  signed: true,
  httpOnly: true,
  sameSite: 'lax' as const,
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

interface ChallengeRow {
  id: number;
  challenge_date: string;
  film_id: number;
  challenge_number: number;
  hint_schedule: string;
  created_at: string;
}

interface ChallengeWithFilm extends ChallengeRow {
  film_title: string;
  film_image_url: string;
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
  return url.startsWith('http') ? url : `${TMDB_BASE_ADMIN}${url}`;
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

function formatChallenge(row: ChallengeRow) {
  const film = db
    .prepare<[number], FilmRow>(`SELECT * FROM films WHERE id = ?`)
    .get(row.film_id)!;
  return {
    id: row.id,
    date: row.challenge_date,
    film: formatFilm(film, getFilmUsedDates(film.id)),
  };
}

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

// GET /api/admin/config – public endpoint, returns whether username is required
adminRouter.get(
  '/config',
  (_req: Request, res: Response) => {
    res.json({ requiresUsername: !!(process.env.ADMIN_USERNAME ?? '') });
  }
);

adminRouter.post(
  '/login',
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

      // If ADMIN_USERNAME is configured, both fields are required
      if (adminUsername) {
        if (!username || typeof username !== 'string') {
          res.status(400).json({ error: 'Field "username" is required.' });
          return;
        }
        if (username !== adminUsername || password !== adminPassword) {
          res.status(401).json({ error: 'Identifiants invalides.' });
          return;
        }
      } else {
        // Backward compatibility: password only
        if (password !== adminPassword) {
          res.status(401).json({ error: 'Mot de passe incorrect.' });
          return;
        }
      }

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
  (_req: Request, res: Response) => {
    res.clearCookie(ADMIN_COOKIE, { httpOnly: true, sameSite: 'lax' });
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

// ─── Dashboard ────────────────────────────────────────────────────────────────

adminRouter.get(
  '/dashboard',
  (_req: Request, res: Response, next: NextFunction) => {
    try {
      const today = getTodayUTC();

      const todayRow = db
        .prepare<[string], ChallengeWithFilm>(
          `SELECT dc.*, f.title AS film_title, f.image_url AS film_image_url,
                  f.year AS film_year, f.director AS film_director
           FROM daily_challenges dc
           JOIN films f ON f.id = dc.film_id
           WHERE dc.challenge_date = ?`
        )
        .get(today);

      const upcomingRows = db
        .prepare<[string], ChallengeWithFilm>(
          `SELECT dc.*, f.title AS film_title, f.image_url AS film_image_url,
                  f.year AS film_year, f.director AS film_director
           FROM daily_challenges dc
           JOIN films f ON f.id = dc.film_id
           WHERE dc.challenge_date > ?
           ORDER BY dc.challenge_date ASC
           LIMIT 7`
        )
        .all(today);

      const totalFilms = (
        db.prepare(`SELECT COUNT(*) as c FROM films WHERE is_active = 1`).get() as { c: number }
      ).c;
      const unusedFilms = (
        db.prepare(`SELECT COUNT(*) as c FROM films f WHERE is_active = 1 AND NOT EXISTS (SELECT 1 FROM daily_challenges dc WHERE dc.film_id = f.id)`).get() as { c: number }
      ).c;
      const totalChallenges = (
        db.prepare(`SELECT COUNT(*) as c FROM daily_challenges`).get() as { c: number }
      ).c;
      // Unscheduled days in the next 30 days
      const next30 = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(); d.setUTCDate(d.getUTCDate() + i + 1);
        return d.toISOString().slice(0, 10);
      });
      const scheduledDates = new Set(
        (db.prepare(`SELECT challenge_date FROM daily_challenges WHERE challenge_date > ? AND challenge_date <= ?`)
          .all(today, next30[next30.length - 1]) as { challenge_date: string }[])
          .map((r) => r.challenge_date)
      );
      const unscheduledNext30 = next30.filter((d) => !scheduledDates.has(d)).length;

      const globalRow = db.prepare(`SELECT * FROM global_stats WHERE id = 1`).get() as {
        total_games: number; total_wins: number;
      };
      const successRate = globalRow.total_games > 0
        ? Math.round((globalRow.total_wins / globalRow.total_games) * 100)
        : 0;

      // Today's game activity
      let todayGames = 0; let todayWins = 0;
      if (todayRow) {
        const todayStats = db.prepare<[number], { total: number; wins: number }>(
          `SELECT COUNT(*) as total, SUM(CASE WHEN outcome = 'won' THEN 1 ELSE 0 END) as wins
           FROM game_sessions WHERE challenge_id = ?`
        ).get(todayRow.id) as { total: number; wins: number } | undefined;
        todayGames = todayStats?.total ?? 0;
        todayWins = todayStats?.wins ?? 0;
      }

      res.json({
        today_challenge: todayRow ? formatChallenge(todayRow) : null,
        upcoming_challenges: upcomingRows.map(formatChallenge),
        stats: {
          total_films: totalFilms,
          unused_films: unusedFilms,
          total_challenges: totalChallenges,
          success_rate: successRate,
          today_games: todayGames,
          today_wins: todayWins,
          unscheduled_next_30: unscheduledNext30,
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
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as FilmBody;

      if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
        res.status(400).json({ error: 'Field "title" is required.' });
        return;
      }
      if (!body.year || typeof body.year !== 'number') {
        res.status(400).json({ error: 'Field "year" must be a number.' });
        return;
      }
      if (!body.director || typeof body.director !== 'string' || !body.director.trim()) {
        res.status(400).json({ error: 'Field "director" is required.' });
        return;
      }
      if (!body.image_url || typeof body.image_url !== 'string' || !body.image_url.trim()) {
        res.status(400).json({ error: 'Field "image_url" is required.' });
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

      res.status(201).json(formatFilm(created, []));
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/admin/films/:id
adminRouter.put(
  '/films/:id',
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

      res.json(formatFilm(updated, getFilmUsedDates(id)));
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/admin/films/:id  (hard delete — blocked if film is scheduled)
adminRouter.delete(
  '/films/:id',
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

      const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '');
      const imageUrl = `${backendUrl}/uploads/${req.file.filename}`;

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
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) { res.status(400).json({ error: 'No image file received.' }); return; }
      const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '');
      const url = `${backendUrl}/uploads/${req.file.filename}`;
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

      let query = `
        SELECT dc.*, f.title AS film_title, f.image_url AS film_image_url
        FROM daily_challenges dc
        JOIN films f ON f.id = dc.film_id
      `;
      const params: string[] = [];

      if (from && to) {
        query += ` WHERE dc.challenge_date BETWEEN ? AND ?`;
        params.push(from, to);
      } else if (from) {
        query += ` WHERE dc.challenge_date >= ?`;
        params.push(from);
      } else if (to) {
        query += ` WHERE dc.challenge_date <= ?`;
        params.push(to);
      }

      query += ` ORDER BY dc.challenge_date ASC`;

      const rows = db
        .prepare<string[], ChallengeWithFilm>(query)
        .all(...params);

      res.json({ data: rows.map(formatChallenge) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/challenges
adminRouter.post(
  '/challenges',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date, film_id } = req.body as { date?: string; film_id?: number };

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({ error: 'Field "date" must be a valid YYYY-MM-DD string.' });
        return;
      }
      if (!film_id || typeof film_id !== 'number') {
        res.status(400).json({ error: 'Field "film_id" must be a number.' });
        return;
      }

      const film = db
        .prepare(`SELECT id FROM films WHERE id = ? AND is_active = 1`)
        .get(film_id);

      if (!film) {
        res.status(404).json({ error: 'Film not found or inactive.' });
        return;
      }

      // Check for existing challenge on that date
      const existing = db
        .prepare(`SELECT id FROM daily_challenges WHERE challenge_date = ?`)
        .get(date);

      if (existing) {
        res.status(409).json({ error: `A challenge is already scheduled for ${date}.` });
        return;
      }

      // Determine next challenge number
      const maxNum = (
        db
          .prepare(`SELECT COALESCE(MAX(challenge_number), 0) AS max_num FROM daily_challenges`)
          .get() as { max_num: number }
      ).max_num;

      const result = db
        .prepare(
          `INSERT INTO daily_challenges (challenge_date, film_id, challenge_number, hint_schedule)
           VALUES (?, ?, ?, ?)`
        )
        .run(date, film_id, maxNum + 1, JSON.stringify(['year', 'director', 'cast']));

      const created = db
        .prepare<[number], ChallengeWithFilm>(
          `SELECT dc.*, f.title AS film_title, f.image_url AS film_image_url
           FROM daily_challenges dc
           JOIN films f ON f.id = dc.film_id
           WHERE dc.id = ?`
        )
        .get(result.lastInsertRowid as number)!;

      res.status(201).json(formatChallenge(created));
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/admin/challenges/:id
adminRouter.put(
  '/challenges/:id',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid challenge id.' });
        return;
      }

      const { film_id } = req.body as { film_id?: number };
      if (!film_id || typeof film_id !== 'number') {
        res.status(400).json({ error: 'Field "film_id" must be a number.' });
        return;
      }

      const existing = db
        .prepare(`SELECT id FROM daily_challenges WHERE id = ?`)
        .get(id);

      if (!existing) {
        res.status(404).json({ error: 'Challenge not found.' });
        return;
      }

      const film = db
        .prepare(`SELECT id FROM films WHERE id = ? AND is_active = 1`)
        .get(film_id);

      if (!film) {
        res.status(404).json({ error: 'Film not found or inactive.' });
        return;
      }

      db.prepare(`UPDATE daily_challenges SET film_id = ? WHERE id = ?`).run(film_id, id);

      const updated = db
        .prepare<[number], ChallengeWithFilm>(
          `SELECT dc.*, f.title AS film_title, f.image_url AS film_image_url
           FROM daily_challenges dc
           JOIN films f ON f.id = dc.film_id
           WHERE dc.id = ?`
        )
        .get(id)!;

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

      const { film_id } = req.body as { film_id?: number };
      if (!film_id || typeof film_id !== 'number') {
        res.status(400).json({ error: 'Field "film_id" must be a number.' });
        return;
      }

      const existing = db.prepare(`SELECT id FROM daily_challenges WHERE id = ?`).get(id);
      if (!existing) { res.status(404).json({ error: 'Challenge not found.' }); return; }

      const film = db.prepare(`SELECT id FROM films WHERE id = ? AND is_active = 1`).get(film_id);
      if (!film) { res.status(404).json({ error: 'Film not found or inactive.' }); return; }

      db.prepare(`UPDATE daily_challenges SET film_id = ? WHERE id = ?`).run(film_id, id);

      const updated = db
        .prepare<[number], ChallengeWithFilm>(
          `SELECT dc.*, f.title AS film_title, f.image_url AS film_image_url
           FROM daily_challenges dc
           JOIN films f ON f.id = dc.film_id
           WHERE dc.id = ?`
        )
        .get(id)!;

      res.json(formatChallenge(updated));
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/admin/challenges/:id
adminRouter.delete(
  '/challenges/:id',
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

      db.prepare(`DELETE FROM daily_challenges WHERE id = ?`).run(id);
      res.json({ ok: true, id });
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

      const tmdbRes = await fetch(url);
      if (!tmdbRes.ok) {
        res.status(502).json({ error: `TMDB error: ${tmdbRes.status}` });
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
      const today = getTodayUTC();
      const todayChallenge = db
        .prepare<[string], ChallengeWithFilm>(
          `SELECT dc.*, f.title AS film_title, f.image_url AS film_image_url
           FROM daily_challenges dc
           JOIN films f ON f.id = dc.film_id
           WHERE dc.challenge_date = ?`
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

        todayStats = {
          challengeId: todayChallenge.id,
          date: todayChallenge.challenge_date,
          challengeNumber: todayChallenge.challenge_number,
          filmTitle: todayChallenge.film_title,
          filmImageUrl: todayChallenge.film_image_url,
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

      const tmdbRes = await fetch(searchUrl);
      if (!tmdbRes.ok) {
        res.status(502).json({ error: `TMDB error: ${tmdbRes.status}` });
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

      const discoverRes = await fetch(discoverUrl);
      if (!discoverRes.ok) {
        res.status(502).json({ error: `TMDB discover error: ${discoverRes.status}` });
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

      const tmdbRes = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbId}/images?api_key=${apiKey}&include_image_language=null`
      );
      if (!tmdbRes.ok) {
        res.status(502).json({ error: `TMDB error: ${tmdbRes.status}` });
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
