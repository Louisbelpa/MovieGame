/**
 * routes/stats.ts
 * Anonymous global statistics endpoint.
 *
 * GET /api/stats
 *
 * Response 200:
 * {
 *   "totalGames": 1420,
 *   "totalWins": 986,
 *   "totalLosses": 434,
 *   "winRate": 69,
 *   "winsByAttempt": {
 *     "1": 12,
 *     "2": 95,
 *     "3": 210,
 *     "4": 310,
 *     "5": 218,
 *     "6": 141
 *   },
 *   "lastUpdated": "2025-04-25T09:00:00Z"
 * }
 *
 * No personal data is stored or returned. Stats are maintained by a SQLite
 * trigger so this endpoint is a simple single-row SELECT.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { getGlobalStats } from '../services/challenge.service.js';

export const statsRouter = Router();

const statsLimiter = createRateLimiter({ max: 30, windowMs: 60_000 });

statsRouter.get(
  '/',
  statsLimiter,
  (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(getGlobalStats());
    } catch (err) {
      next(err);
    }
  }
);
