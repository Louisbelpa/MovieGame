/**
 * rateLimiter.ts
 * Factory around express-rate-limit so each route can apply its own window.
 *
 * Anti-cheat role:
 *  - /guess is limited to GUESS_RATE_LIMIT_MAX per IP per window (default 30/min).
 *    A real player needs at most 6 guesses per day; 30/min stops scripted bruteforce.
 *  - /search is limited separately to avoid enumerating the full film catalogue.
 *  - Rate limit state lives in-memory (MemoryStore), which is fine for a single
 *    process on Railway/Render. For multi-process deployments swap to RedisStore.
 */

import rateLimit, { Options } from 'express-rate-limit';

export function createRateLimiter(
  opts: Partial<Options> & { max: number; windowMs: number }
) {
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,  // Return `RateLimit-*` headers
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down.' },
    ...opts,
  });
}

/** Strict limiter for the /guess endpoint */
export const guessLimiter = createRateLimiter({
  max: parseInt(process.env.GUESS_RATE_LIMIT_MAX ?? '30', 10),
  windowMs: parseInt(process.env.GUESS_RATE_LIMIT_WINDOW_MS ?? '60000', 10),
});

/** Relaxed limiter for autocomplete search */
export const searchLimiter = createRateLimiter({
  max: 60,
  windowMs: 60_000,
});
