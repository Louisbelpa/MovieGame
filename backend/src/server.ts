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
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { challengeRouter } from './routes/challenge.js';
import { filmsRouter } from './routes/films.js';
import { statsRouter } from './routes/stats.js';
import { adminRouter } from './routes/admin.js';
import { sessionMiddleware } from './middleware/session.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createRateLimiter } from './middleware/rateLimiter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Production safety checks ─────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const missing = ['COOKIE_SECRET', 'ADMIN_PASSWORD', 'CORS_ORIGIN', 'BACKEND_URL'].filter(
    (v) => !process.env[v]
  );
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// ─── Security headers ────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",  // needed for Tailwind inline styles
      "img-src 'self' data: https://image.tmdb.org",
      "connect-src 'self'",
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Attach / create anonymous session cookie on every request
app.use(sessionMiddleware);

// ─── Global rate limiter (generous) ──────────────────────────────────────────
// Tighter per-route limits are applied in the route files themselves.
app.use('/api', createRateLimiter({ max: 300, windowMs: 60_000 }));

// ─── Static files (uploaded images) ──────────────────────────────────────────

app.use(express.static(path.join(__dirname, '../public')));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/challenge', challengeRouter);
app.use('/api/films', filmsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/admin', adminRouter);

// Health-check (used by Railway/Render)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// SPA fallback – serve built index.html for all non-API routes (production)
// In development the Vite dev server handles this at localhost:5173
const spaIndex = path.join(__dirname, '../public/index.html');
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && fs.existsSync(spaIndex)) {
    res.sendFile(spaIndex);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
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
