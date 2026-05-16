/**
 * routes/challenge.ts
 * Core endpoints that drive the daily game loop.
 * Supports today's challenge and any past challenge by date.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { guessLimiter } from '../middleware/rateLimiter.js';
import { userAuth } from '../middleware/userAuth.js';
import db from '../db/database.js';
import {
  getTodayChallenge,
  getChallengeByDate,
  getChallengeById,
  getOrCreateSession,
  buildChallengePayload,
  processGuess,
  getResult,
} from '../services/challenge.service.js';
import { attachUserToGameSession } from '../services/game-session.service.js';

export const challengeRouter = Router();

// ─── GET /api/challenge/today ─────────────────────────────────────────────────

challengeRouter.get(
  '/today',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = res.locals.sessionToken as string;
      const type = (req.query.type === 'series' ? 'series' : 'film') as 'film' | 'series';
      const challenge = getTodayChallenge(type);
      const session = getOrCreateSession(sessionToken, challenge.id, req.user?.id);
      const payload = buildChallengePayload(challenge, session);
      res.json(payload);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/challenge/date/:date ────────────────────────────────────────────
//
// Returns a challenge by date (past or today). Rejects future dates.

challengeRouter.get(
  '/date/:date',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date } = req.params;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({ error: 'Date must be in YYYY-MM-DD format.' });
        return;
      }

      const todayParis = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
      if (date > todayParis) {
        res.status(400).json({ error: 'Cannot access future challenges.' });
        return;
      }

      const sessionToken = res.locals.sessionToken as string;
      const type = (req.query.type === 'series' ? 'series' : 'film') as 'film' | 'series';
      const challenge = getChallengeByDate(date, type);
      const session = getOrCreateSession(sessionToken, challenge.id, req.user?.id);
      const payload = buildChallengePayload(challenge, session);
      res.json(payload);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/challenge/guess ────────────────────────────────────────────────
//
// Body: { "guess": "Inception", "challengeId": 42 }
// challengeId defaults to today's challenge if omitted.

challengeRouter.post(
  '/guess',
  guessLimiter,
  userAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = res.locals.sessionToken as string;
      const { guess, challengeId: bodyChallId } = req.body as { guess?: string; challengeId?: number };

      if (typeof guess !== 'string') {
        res.status(422).json({ error: 'Field "guess" must be a string (use empty string to skip).' });
        return;
      }
      if (guess.length > 300) {
        res.status(422).json({ error: 'Field "guess" must be 300 characters or fewer.' });
        return;
      }

      const challenge = (bodyChallId && typeof bodyChallId === 'number')
        ? getChallengeById(bodyChallId)
        : getTodayChallenge();

      const userId = req.user?.id;
      const result = processGuess(sessionToken, challenge.id, guess.trim(), userId);
      const session = getOrCreateSession(sessionToken, challenge.id, userId);
      const payload = buildChallengePayload(challenge, session);

      // Auto-record to user_challenge_results when game ends and user is logged in
      if (req.user && result.outcome) {
        interface MediaRow { media_type: string }
        const row = db
          .prepare<number, MediaRow>('SELECT media_type FROM daily_challenges WHERE id = ?')
          .get(challenge.id);
        if (row) {
          db.prepare(`
            INSERT INTO user_challenge_results (user_id, challenge_id, media_type, attempts_used, won)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, challenge_id) DO UPDATE SET
              attempts_used = excluded.attempts_used,
              won           = excluded.won,
              completed_at  = datetime('now')
          `).run(req.user.id, challenge.id, row.media_type, payload.attemptsUsed, result.outcome === 'won' ? 1 : 0);
          attachUserToGameSession(sessionToken, challenge.id, req.user.id);
        }
      }

      res.json({
        correct: result.correct,
        outcome: result.outcome,
        attemptsLeft: result.attemptsLeft,
        nextHintUnlocked: result.nextHintUnlocked,
        challenge: payload,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/challenge/result ────────────────────────────────────────────────
//
// Full result (film title revealed). Only accessible after game is over.
// Query param: ?challengeId=42 (defaults to today)

challengeRouter.get(
  '/result',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = res.locals.sessionToken as string;

      let challengeId: number;
      if (req.query.challengeId) {
        challengeId = parseInt(req.query.challengeId as string, 10);
        if (isNaN(challengeId)) {
          res.status(400).json({ error: 'Invalid challengeId.' });
          return;
        }
      } else {
        challengeId = getTodayChallenge().id;
      }

      const result = getResult(sessionToken, challengeId, req.user?.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/challenge/dates ─────────────────────────────────────────────────
//
// Returns all challenge dates from the past N days (default 90, max 365).
// Used by the archive calendar on the frontend.

challengeRouter.get(
  '/dates',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = Math.min(Math.max(1, parseInt((req.query.days as string) ?? '90', 10)), 365)
      const type = (req.query.type === 'series' ? 'series' : 'film') as 'film' | 'series'
      const todayParis = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
      const from = new Date(todayParis + 'T12:00:00Z')
      from.setUTCDate(from.getUTCDate() - days)
      const fromStr = from.toISOString().slice(0, 10)

      const rows = db
        .prepare<[string, string, string], { challenge_date: string }>(
          `SELECT challenge_date FROM daily_challenges
           WHERE challenge_date >= ? AND challenge_date <= ? AND media_type = ?
             AND is_active = 1
           ORDER BY challenge_date DESC`
        )
        .all(fromStr, todayParis, type)

      res.json({ dates: rows.map((r) => r.challenge_date) })
    } catch (err) {
      next(err)
    }
  }
)

// ─── GET /api/challenge/adjacent ─────────────────────────────────────────────
//
// Returns the date of the nearest scheduled past challenge before or after a
// given date. Used by the frontend for single-request date navigation.
//
// Query params:
//   date      – reference date YYYY-MM-DD
//   direction – "prev" | "next"

challengeRouter.get(
  '/adjacent',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date, direction } = req.query as { date?: string; direction?: string };

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({ error: 'date must be YYYY-MM-DD' });
        return;
      }
      if (direction !== 'prev' && direction !== 'next') {
        res.status(400).json({ error: 'direction must be "prev" or "next"' });
        return;
      }

      const todayParis = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());

      const type = (req.query.type === 'series' ? 'series' : 'film') as 'film' | 'series';

      const row = direction === 'prev'
        ? db.prepare<[string, string, string], { challenge_date: string }>(
            `SELECT challenge_date FROM daily_challenges
             WHERE challenge_date < ? AND challenge_date <= ? AND media_type = ?
               AND is_active = 1
             ORDER BY challenge_date DESC LIMIT 1`
          ).get(date, todayParis, type)
        : db.prepare<[string, string, string], { challenge_date: string }>(
            `SELECT challenge_date FROM daily_challenges
             WHERE challenge_date > ? AND challenge_date <= ? AND media_type = ?
               AND is_active = 1
             ORDER BY challenge_date ASC LIMIT 1`
          ).get(date, todayParis, type);

      if (!row) {
        res.status(404).json({ error: 'No adjacent challenge found.' });
        return;
      }

      res.json({ date: row.challenge_date });
    } catch (err) {
      next(err);
    }
  }
);
