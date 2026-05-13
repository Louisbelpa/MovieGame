/**
 * app.ts
 * Pure Express application factory — no listen(), no dotenv, no prod safety checks.
 * Imported by server.ts (production) and test files.
 */

import express from 'express';
import compression from 'compression';
import pinoHttp from 'pino-http';
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
import { userAuth } from './middleware/userAuth.js';
import { authRouter } from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { createRateLimiter } from './middleware/rateLimiter.js';
import { logger } from './lib/logger.js';
import { ensureUploadsDir, getUploadsAbsDir } from './config/uploads.js';
import db from './db/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(): express.Application {
  const app = express();

  const toOrigin = (value: string): string | null => {
    const raw = value.trim()
    if (!raw) return null
    const withScheme = raw.startsWith('http://') || raw.startsWith('https://')
      ? raw
      : `https://${raw}`
    try {
      const url = new URL(withScheme)
      return url.origin
    } catch {
      return null
    }
  }

  const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)
    .map(toOrigin)
    .filter((o): o is string => Boolean(o));
  const allowedOriginsSet = new Set(allowedOrigins)

  app.set('trust proxy', 1);
  app.use(requestIdMiddleware);
  app.use(pinoHttp({
    logger: logger as Parameters<typeof pinoHttp>[0] extends { logger?: infer L } ? L : never,
    autoLogging: { ignore: (req) => req.url === '/health' },
    customLogLevel: (_req, res) => res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
  }));
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

  // Static files before CORS — same-origin assets don't need CORS headers
  ensureUploadsDir();
  app.use(
    '/uploads',
    express.static(getUploadsAbsDir(), { maxAge: '7d' })
  );
  app.use('/assets', express.static(path.join(__dirname, '../public/assets'), { maxAge: '1y', immutable: true }));
  app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: '1d',
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    },
  }));

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) { callback(null, true); return }
      if (allowedOriginsSet.size === 0) { callback(null, true); return }
      const normalized = toOrigin(origin)
      if (normalized && allowedOriginsSet.has(normalized)) {
        callback(null, true)
        return
      }
      logger.warn({ origin, normalizedOrigin: normalized, allowedOrigins }, 'CORS rejected origin')
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));

  app.use(sessionMiddleware);
  app.use(userAuth);
  app.use('/api', createRateLimiter({
    max: parseInt(process.env.API_RATE_LIMIT_MAX ?? '600', 10),
    windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS ?? '60000', 10),
  }));

  app.use('/api/challenge', challengeRouter);
  app.use('/api/wiki', wikiChallengeRouter);
  app.use('/api/films', filmsRouter);
  app.use('/api/series', seriesRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/auth', authRouter);

  app.get(
    '/health',
    createRateLimiter({ max: 10, windowMs: 60_000, message: { error: 'Too many health checks' } }),
    (_req, res) => {
      try {
        db.prepare('SELECT 1').get();
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
      } catch {
        res.status(503).json({ status: 'error', error: 'Database unavailable' });
      }
    }
  );

  const spaIndex = path.join(__dirname, '../public/index.html');
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && fs.existsSync(spaIndex)) res.sendFile(spaIndex);
    else res.status(404).json({ error: 'Not found' });
  });

  app.use(errorHandler);

  return app;
}
