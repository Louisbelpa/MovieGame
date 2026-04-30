import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { challengeRouter } from './routes/challenge.js';
import { filmsRouter } from './routes/films.js';
import { seriesRouter } from './routes/series.js';
import { statsRouter } from './routes/stats.js';
import { adminRouter } from './routes/admin.js';
import { sessionMiddleware } from './middleware/session.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { createRateLimiter } from './middleware/rateLimiter.js';
import { logger } from './lib/logger.js';
import db from './db/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Production safety checks ─────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const missing = ['COOKIE_SECRET', 'ADMIN_PASSWORD', 'CORS_ORIGIN', 'BACKEND_URL'].filter(
    (v) => !process.env[v]
  );
  if (missing.length) {
    logger.fatal({ missing }, 'Missing required environment variables — aborting');
    process.exit(1);
  }
  if (!process.env.ADMIN_USERNAME) {
    logger.warn(
      'ADMIN_USERNAME is not set — admin login is password-only (single factor). ' +
      'Set ADMIN_USERNAME for better security.'
    );
  }
}

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

// Trust the first proxy (Railway, Render, etc.) so express-rate-limit can
// read X-Forwarded-For correctly instead of throwing a ValidationError.
app.set('trust proxy', 1);

// ─── Core middleware ──────────────────────────────────────────────────────────

app.use(requestIdMiddleware);
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET ?? 'dev_secret'));

// Manual CORS (avoids adding the `cors` package for a single origin)
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
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

// ─── Security headers ─────────────────────────────────────────────────────────
app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://image.tmdb.org",
      "connect-src 'self'",
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Attach / create anonymous session cookie on every request
app.use(sessionMiddleware);

// ─── Global rate limiter (generous) ──────────────────────────────────────────
// Tighter per-route limits are applied in the route files themselves.
app.use('/api', createRateLimiter({
  max: parseInt(process.env.API_RATE_LIMIT_MAX ?? '600', 10),
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS ?? '60000', 10),
}));

// ─── Static files (uploaded images) ──────────────────────────────────────────

app.use(express.static(path.join(__dirname, '../public')));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/challenge', challengeRouter);
app.use('/api/films', filmsRouter);
app.use('/api/series', seriesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/admin', adminRouter);

// Health-check (used by Railway/Render)
app.get('/health', (_req: express.Request, res: express.Response) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', ts: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

// SPA fallback – serve built index.html for all non-API routes (production)
const spaIndex = path.join(__dirname, '../public/index.html');
app.get('*', (req: express.Request, res: express.Response) => {
  if (!req.path.startsWith('/api') && fs.existsSync(spaIndex)) {
    res.sendFile(spaIndex);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Centralised error handler
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  logger.info(`MovieGame API running on http://localhost:${PORT}`);
  logger.info({ nodeEnv: process.env.NODE_ENV ?? 'development', corsOrigin: CORS_ORIGIN, imageSource: process.env.IMAGE_SOURCE ?? 'tmdb' }, 'Server config');
});

export default app;
