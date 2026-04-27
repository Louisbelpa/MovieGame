/**
 * routes/challenge.ts
 * Core endpoints that drive the daily game loop.
 * Supports today's challenge and any past challenge by date.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { guessLimiter } from '../middleware/rateLimiter.js';
import {
  getTodayChallenge,
  getChallengeByDate,
  getChallengeById,
  getOrCreateSession,
  buildChallengePayload,
  processGuess,
  getResult,
} from '../services/challenge.service.js';

export const challengeRouter = Router();

// ─── GET /api/challenge/today ─────────────────────────────────────────────────

challengeRouter.get(
  '/today',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = res.locals.sessionToken as string;
      const challenge = getTodayChallenge();
      const session = getOrCreateSession(sessionToken, challenge.id);
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
      const challenge = getChallengeByDate(date);
      const session = getOrCreateSession(sessionToken, challenge.id);
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
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = res.locals.sessionToken as string;
      const { guess, challengeId: bodyChallId } = req.body as { guess?: string; challengeId?: number };

      if (typeof guess !== 'string') {
        res.status(422).json({ error: 'Field "guess" must be a string (use empty string to skip).' });
        return;
      }

      const challenge = (bodyChallId && typeof bodyChallId === 'number')
        ? getChallengeById(bodyChallId)
        : getTodayChallenge();

      const result = processGuess(sessionToken, challenge.id, guess.trim());
      const session = getOrCreateSession(sessionToken, challenge.id);
      const payload = buildChallengePayload(challenge, session);

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

      const result = getResult(sessionToken, challengeId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
