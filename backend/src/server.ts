import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { challengeRouter } from './routes/challenge.js';
import { wikiChallengeRouter } from './routes/wiki-challenge.js';
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
const allowedOrigins = (process.env.CORS_ORIGIN ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);

// Trust the first proxy (Railway, Render, etc.) so express-rate-limit can
// read X-Forwarded-For correctly instead of throwing a ValidationError.
app.set('trust proxy', 1);

// ─── Core middleware ──────────────────────────────────────────────────────────

app.use(requestIdMiddleware);
// Compress all responses except already-compressed image formats
app.use(compression({
  level: 6,
  filter: (req, res) => {
    const ct = res.getHeader('Content-Type') as string | undefined;
    if (ct && /image\/(jpeg|png|gif|webp|avif)/i.test(ct)) return false;
    return compression.filter(req, res);
  },
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'https://image.tmdb.org', 'https://upload.wikimedia.org', 'data:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET ?? 'dev_secret'));

if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
  throw new Error('CORS_ORIGIN must be defined in production');
}
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Attach / create anonymous session cookie on every request
app.use(sessionMiddleware);

// ─── Global rate limiter (generous) ──────────────────────────────────────────
// Tighter per-route limits are applied in the route files themselves.
app.use('/api', createRateLimiter({
  max: parseInt(process.env.API_RATE_LIMIT_MAX ?? '600', 10),
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS ?? '60000', 10),
}));

// ─── Static files ─────────────────────────────────────────────────────────────
// /assets/* are Vite-hashed → immutable, cache 1 year
// index.html must never be cached (SPA entry point)
// Everything else → 1 day

app.use('/assets', express.static(path.join(__dirname, '../public/assets'), {
  maxAge: '1y',
  immutable: true,
}));
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: '1d',
  setHeaders(res, filePath) {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/challenge', challengeRouter);
app.use('/api/wiki', wikiChallengeRouter);
app.use('/api/films', filmsRouter);
app.use('/api/series', seriesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/admin', adminRouter);

// Health-check (used by Railway/Render) — rate-limited independently from /api
app.get(
  '/health',
  createRateLimiter({ max: 10, windowMs: 60_000, message: { error: 'Too many health checks' } }),
  (_req: express.Request, res: express.Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }
);

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

const server = app.listen(PORT, () => {
  logger.info(`MovieGame API running on http://localhost:${PORT}`);
  logger.info({ nodeEnv: process.env.NODE_ENV ?? 'development', corsOrigins: allowedOrigins, imageSource: process.env.IMAGE_SOURCE ?? 'tmdb' }, 'Server config');
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully`);
  const forceExit = setTimeout(() => {
    logger.error('Forced exit after 10s timeout');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(() => {
    try { db.close(); } catch { /* already closed */ }
    logger.info('Server closed cleanly');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection');
  shutdown('unhandledRejection');
});

export default app;
