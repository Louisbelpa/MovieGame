import 'dotenv/config';
import { logger } from './lib/logger.js';
import db from './db/database.js';
import { createApp } from './app.js';

// ─── Production safety checks ─────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const missing = ['COOKIE_SECRET', 'ADMIN_PASSWORD', 'CORS_ORIGIN'].filter(
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

const app = createApp();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// ─── Start ────────────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  logger.info(`MovieGame API running on http://localhost:${PORT}`);
  logger.info({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    imageSource: process.env.IMAGE_SOURCE ?? 'tmdb',
  }, 'Server config');
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
