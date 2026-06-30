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
import { Request } from 'express';
import { ADMIN_COOKIE } from './adminAuth.js';

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function adminKeyGenerator(req: Request): string {
  // Keep abuse protection by IP, but split buckets per authenticated admin identity.
  const adminToken = req.signedCookies?.[ADMIN_COOKIE] as string | undefined;
  const identity = adminToken ? `admin:${adminToken}` : 'anon';
  const ip = req.ip ?? 'unknown';
  return `${identity}:${ip}`;
}

export function createRateLimiter(
  opts: Partial<Options> & { max: number; windowMs: number }
) {
  const { max, windowMs, ...rest } = opts;
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,  // Return `RateLimit-*` headers
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down.' },
    ...rest,
  });
}

/** Strict limiter for the /guess endpoint */
export const guessLimiter = createRateLimiter({
  max: envInt('GUESS_RATE_LIMIT_MAX', 30),
  windowMs: envInt('GUESS_RATE_LIMIT_WINDOW_MS', 60_000),
});

/** Relaxed limiter for autocomplete search */
export const searchLimiter = createRateLimiter({
  max: envInt('SEARCH_RATE_LIMIT_MAX', 60),
  windowMs: envInt('SEARCH_RATE_LIMIT_WINDOW_MS', 60_000),
});

/** Limiter for authenticated admin operations */
export const adminLimiter = createRateLimiter({
  max: envInt('ADMIN_RATE_LIMIT_MAX', 180),
  windowMs: envInt('ADMIN_RATE_LIMIT_WINDOW_MS', 60_000),
  keyGenerator: adminKeyGenerator,
});

/** Very strict limiter for the login endpoint — stops brute-force (10 req/min) */
export const loginLimiter = createRateLimiter({
  max: envInt('LOGIN_RATE_LIMIT_MAX', 10),
  windowMs: envInt('LOGIN_RATE_LIMIT_WINDOW_MS', 60_000),
});

/** User auth endpoints: register / login / OAuth callback (10 req / 15 min per IP) */
export const AUTH = createRateLimiter({
  max: envInt('AUTH_RATE_LIMIT_MAX', 10),
  windowMs: envInt('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60_000),
});

/** General API limiter for data-fetching routes (120 req / min per IP) */
export const apiLimiter = createRateLimiter({
  max: envInt('API_RATE_LIMIT_MAX', 120),
  windowMs: envInt('API_RATE_LIMIT_WINDOW_MS', 60_000),
});
