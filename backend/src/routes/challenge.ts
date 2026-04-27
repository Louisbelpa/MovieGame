/**
 * routes/challenge.ts
 * Three core endpoints that drive the daily game loop.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ Anti-cheat summary                                                       │
 * │  • film.title is NEVER included in GET /today or POST /guess responses.  │
 * │  • GET /result is gated: 403 until session.outcome is non-null.          │
 * │  • All game state lives server-side (DB), keyed by signed cookie token.  │
 * │  • guessLimiter blocks brute-force enumeration (30 req/min per IP).      │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

import { Router, Request, Response, NextFunction } from 'express';
import { guessLimiter } from '../middleware/rateLimiter.js';
import {
  getTodayChallenge,
  getOrCreateSession,
  buildChallengePayload,
  processGuess,
  getResult,
} from '../services/challenge.service.js';

export const challengeRouter = Router();

// ─── GET /api/challenge/today ─────────────────────────────────────────────────
//
// Returns the challenge of the day WITHOUT the film title.
// Creates (or resumes) the player's game session.
//
// Response 200:
// {
//   "challengeId": 42,
//   "challengeNumber": 42,
//   "date": "2025-04-25",
//   "imageUrl": null,               ← null until game over; avoids reverse-image search
//   "hintsAvailable": 7,
//   "hintsRevealed": 2,
//   "hints": [
//     { "type": "image_blurred", "value": "https://image.tmdb.org/..." },
//     { "type": "year",          "value": 1994 }
//   ],
//   "attemptsUsed": 2,
//   "maxAttempts": 6,
//   "attempts": [
//     { "guess": "Titanic", "correct": false },
//     { "guess": "Matrix",  "correct": false }
//   ],
//   "outcome": null                 ← null | "won" | "lost"
// }

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

// ─── POST /api/challenge/guess ────────────────────────────────────────────────
//
// Submit a guess for today's challenge.
// Body: { "guess": "The Shawshank Redemption" }
//
// Response 200 (wrong guess):
// {
//   "correct": false,
//   "outcome": null,
//   "attemptsLeft": 4,
//   "nextHintUnlocked": true,
//   "challenge": { ...same shape as GET /today... }
// }
//
// Response 200 (correct guess):
// {
//   "correct": true,
//   "outcome": "won",
//   "attemptsLeft": 3,
//   "nextHintUnlocked": false,
//   "challenge": { ...imageUrl now populated... }
// }
//
// Response 409: game already finished or no attempts remaining.
// Response 422: missing / empty guess field.

challengeRouter.post(
  '/guess',
  guessLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = res.locals.sessionToken as string;
      const { guess } = req.body as { guess?: string };

      if (typeof guess !== 'string') {
        res.status(422).json({ error: 'Field "guess" must be a string (use empty string to skip).' });
        return;
      }

      const challenge = getTodayChallenge();
      const result = processGuess(sessionToken, challenge.id, guess.trim());

      // Refresh session to build the up-to-date payload
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
// Full result including the film title. ONLY accessible after game is over.
//
// Response 200:
// {
//   "outcome": "won",
//   "title": "The Shawshank Redemption",
//   "year": 1994,
//   "director": "Frank Darabont",
//   "genres": ["Drama"],
//   "cast": ["Tim Robbins", "Morgan Freeman"],
//   "tagline": "Fear can hold you prisoner. Hope can set you free.",
//   "synopsis": "Two imprisoned men bond over a number of years...",
//   "imageUrl": "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
//   "attemptsUsed": 3,
//   "maxAttempts": 6,
//   "attempts": [
//     { "guess": "Titanic", "correct": false },
//     { "guess": "Forrest Gump", "correct": false },
//     { "guess": "The Shawshank Redemption", "correct": true }
//   ],
//   "startedAt": "2025-04-25T08:00:00.000Z",
//   "finishedAt": "2025-04-25T08:05:32.000Z"
// }
//
// Response 403: game not finished yet.
// Response 404: no session found (player never called /today).

challengeRouter.get(
  '/result',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = res.locals.sessionToken as string;
      const challenge = getTodayChallenge();
      const result = getResult(sessionToken, challenge.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
