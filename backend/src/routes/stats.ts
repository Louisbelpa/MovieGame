/**
 * routes/stats.ts
 * Anonymous statistics endpoints.
 *
 * GET /api/stats — cumul global (trigger sur global_stats)
 * GET /api/stats/challenge?challengeId= — agrégation sur les parties de ce défi uniquement
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { getGlobalStats, getCommunityStatsForChallengeId } from '../services/challenge.service.js';

export const statsRouter = Router();

const statsLimiter = createRateLimiter({ max: 30, windowMs: 60_000 });

statsRouter.get(
  '/challenge',
  statsLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = req.query.challengeId;
      const id =
        typeof raw === 'string' ? parseInt(raw, 10) : Array.isArray(raw) ? parseInt(String(raw[0]), 10) : NaN;
      if (!Number.isFinite(id) || id < 1) {
        res.status(400).json({ error: 'Query parameter challengeId is required (positive integer).' });
        return;
      }
      res.json(getCommunityStatsForChallengeId(id));
    } catch (err) {
      next(err);
    }
  }
);

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
