/**
 * routes/films.ts
 * Film-related endpoints (currently only autocomplete search).
 *
 * GET /api/films/search?q=matrix&limit=8
 *
 * Anti-cheat: today's answer film is silently excluded from results so players
 * cannot confirm their guess by noticing a film disappears from autocomplete.
 *
 * Response 200:
 * {
 *   "results": [
 *     { "title": "The Matrix",           "year": 1999 },
 *     { "title": "The Matrix Reloaded",  "year": 2003 },
 *     { "title": "The Matrix Revolutions","year": 2003 }
 *   ]
 * }
 */

import { Router, Request, Response, NextFunction } from 'express';
import { searchLimiter } from '../middleware/rateLimiter.js';
import { searchFilms } from '../services/challenge.service.js';

export const filmsRouter = Router();

filmsRouter.get(
  '/search',
  searchLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (req.query.q as string | undefined) ?? '';
      const limit = Math.min(
        parseInt((req.query.limit as string | undefined) ?? '10', 10),
        20 // hard cap – never send the entire catalogue
      );

      const results = searchFilms(q, limit);
      res.json({ results });
    } catch (err) {
      next(err);
    }
  }
);
