/**
 * routes/series.ts
 * Series-related endpoints (autocomplete search).
 *
 * GET /api/series/search?q=breaking&limit=8
 *
 * Anti-cheat: today's answer series is silently excluded from results.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { searchLimiter } from '../middleware/rateLimiter.js';
import { searchSeries } from '../services/challenge.service.js';

export const seriesRouter = Router();

seriesRouter.get(
  '/search',
  searchLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (req.query.q as string | undefined) ?? '';
      const limit = Math.min(
        parseInt((req.query.limit as string | undefined) ?? '10', 10),
        20
      );

      const results = searchSeries(q, limit);
      res.json({ results });
    } catch (err) {
      next(err);
    }
  }
);
