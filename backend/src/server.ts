/**
 * server.ts
 * Express application entry point for MovieGame backend.
 *
 * Stack rationale:
 *  - Node.js + Express  → mature ecosystem, synchronous better-sqlite3 fits perfectly
 *  - better-sqlite3     → single-file SQLite, zero infrastructure, trivially portable
 *  - TMDB CDN           → free, global, no storage costs for the MVP
 *  - Railway/Render     → one-command deploy, free tier sufficient for MVP traffic
 */

import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { challengeRouter } from './routes/challenge.js';
import { filmsRouter } from './routes/films.js';
import { statsRouter } from './routes/stats.js';
import { sessionMiddleware } from './middleware/session.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createRateLimiter } from './middleware/rateLimiter.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

// ─── Core middleware ──────────────────────────────────────────────────────────

app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET ?? 'dev_secret'));

// Manual CORS (avoids adding the `cors` package for a single origin)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Attach / create anonymous session cookie on every request
app.use(sessionMiddleware);

// ─── Global rate limiter (generous) ──────────────────────────────────────────
// Tighter per-route limits are applied in the route files themselves.
app.use('/api', createRateLimiter({ max: 300, windowMs: 60_000 }));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/challenge', challengeRouter);
app.use('/api/films', filmsRouter);
app.use('/api/stats', statsRouter);

// Health-check (used by Railway/Render)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralised error handler
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`MovieGame API running on http://localhost:${PORT}`);
  console.log(`  NODE_ENV   : ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`  CORS origin: ${CORS_ORIGIN}`);
  console.log(`  IMAGE_SOURCE: ${process.env.IMAGE_SOURCE ?? 'tmdb'}`);
});

export default app;
