/**
 * auth.ts
 * User authentication routes.
 *
 * POST /api/auth/register      — Email + password registration
 * POST /api/auth/login         — Email + password login
 * POST /api/auth/logout        — Revoke current session
 * GET  /api/auth/me            — Return current user
 * PUT  /api/auth/profile       — Update display name / avatar
 * POST /api/auth/oauth/callback — OAuth login/register (client-verified token)
 * POST /api/auth/import-stats  — Merge localStorage stats into account
 *
 * Register / login / oauth responses include `sessionToken` (raw session id) for
 * native clients; browsers rely on the httpOnly cookie and may ignore it.
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import db from '../db/database.js';
import { userAuth, requireUser, USER_SESSION_COOKIE } from '../middleware/userAuth.js';
import { AUTH } from '../middleware/rateLimiter.js';

export const authRouter = Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const SESSION_TTL_DAYS = 30;
const COOKIE_MAX_AGE_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface UserRow {
  id: number;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  password_hash: string | null;
  is_banned: number;
}

function createUserSession(userId: number): string {
  const sessionId = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE_MS).toISOString();
  db.prepare(
    `INSERT INTO user_sessions (id, user_id, expires_at) VALUES (?, ?, ?)`
  ).run(sessionId, userId, expiresAt);
  return sessionId;
}

function setUserCookie(res: Response, sessionId: string): void {
  res.cookie(USER_SESSION_COOKIE, sessionId, {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

function formatUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/** POST /api/auth/register */
authRouter.post('/register', AUTH, async (req: Request, res: Response): Promise<void> => {
  const { email, password, displayName } = req.body as {
    email?: unknown;
    password?: unknown;
    displayName?: unknown;
  };

  if (typeof email !== 'string' || !isValidEmail(email)) {
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }
  if (typeof displayName !== 'string' || displayName.trim().length === 0) {
    res.status(400).json({ error: 'Display name is required' });
    return;
  }

  const existing = db
    .prepare(`SELECT id FROM users WHERE email = ?`)
    .get(email.toLowerCase());

  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const result = db
    .prepare(
      `INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)`
    )
    .run(email.toLowerCase(), passwordHash, displayName.trim());

  const userId = result.lastInsertRowid as number;
  const sessionId = createUserSession(userId);
  setUserCookie(res, sessionId);

  const user = db
    .prepare<number, UserRow>(`SELECT id, email, display_name, avatar_url, password_hash, is_banned FROM users WHERE id = ?`)
    .get(userId)!;

  res.status(201).json({ user: formatUser(user), sessionToken: sessionId });
});

/** POST /api/auth/login */
authRouter.post('/login', AUTH, async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: unknown; password?: unknown };

  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = db
    .prepare<string, UserRow>(
      `SELECT id, email, display_name, avatar_url, password_hash, is_banned FROM users WHERE email = ?`
    )
    .get(email.toLowerCase());

  // Use constant-time comparison even when user not found
  const dummyHash = '$2a$12$invaliddummyhashtopreventtimingattacks00000000000000000';
  const hashToCompare = user?.password_hash ?? dummyHash;
  const valid = await bcrypt.compare(password, hashToCompare);

  if (!user || !valid || user.is_banned) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const sessionId = createUserSession(user.id);
  setUserCookie(res, sessionId);

  res.json({ user: formatUser(user), sessionToken: sessionId });
});

/** POST /api/auth/logout */
authRouter.post('/logout', userAuth, (req: Request, res: Response): void => {
  const sessionId = req.userSessionId;
  if (sessionId) {
    db.prepare(`DELETE FROM user_sessions WHERE id = ?`).run(sessionId);
  }
  res.clearCookie(USER_SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    signed: true,
    path: '/',
  });
  res.json({ ok: true });
});

/** GET /api/auth/me */
authRouter.get('/me', userAuth, (req: Request, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({ user: req.user });
});

/** PUT /api/auth/profile */
authRouter.put('/profile', userAuth, requireUser, (req: Request, res: Response): void => {
  const { displayName, avatarUrl } = req.body as {
    displayName?: unknown;
    avatarUrl?: unknown;
  };

  if (displayName !== undefined && (typeof displayName !== 'string' || displayName.trim().length === 0)) {
    res.status(400).json({ error: 'Display name cannot be empty' });
    return;
  }
  if (avatarUrl !== undefined && avatarUrl !== null && typeof avatarUrl !== 'string') {
    res.status(400).json({ error: 'Invalid avatarUrl' });
    return;
  }

  const userId = req.user!.id;

  if (displayName !== undefined) {
    db.prepare(`UPDATE users SET display_name = ? WHERE id = ?`).run(displayName.trim(), userId);
  }
  if (avatarUrl !== undefined) {
    db.prepare(`UPDATE users SET avatar_url = ? WHERE id = ?`).run(avatarUrl ?? null, userId);
  }

  const updated = db
    .prepare<number, UserRow>(
      `SELECT id, email, display_name, avatar_url, password_hash, is_banned FROM users WHERE id = ?`
    )
    .get(userId)!;

  res.json({ user: formatUser(updated) });
});

/** POST /api/auth/oauth/callback */
authRouter.post('/oauth/callback', AUTH, (req: Request, res: Response): void => {
  const { provider, providerId, email, displayName, avatarUrl } = req.body as {
    provider?: unknown;
    providerId?: unknown;
    email?: unknown;
    displayName?: unknown;
    avatarUrl?: unknown;
  };

  if (
    typeof provider !== 'string' ||
    !['google', 'apple'].includes(provider) ||
    typeof providerId !== 'string' ||
    providerId.trim().length === 0
  ) {
    res.status(400).json({ error: 'Invalid provider or providerId' });
    return;
  }

  interface OAuthRow { user_id: number }
  const existing = db
    .prepare<[string, string], OAuthRow>(
      `SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_id = ?`
    )
    .get(provider, providerId);

  let userId: number;

  if (existing) {
    userId = existing.user_id;
  } else {
    // Create new user
    const name =
      typeof displayName === 'string' && displayName.trim()
        ? displayName.trim()
        : typeof email === 'string' && email
        ? email.split('@')[0]
        : 'User';

    const result = db
      .prepare(
        `INSERT INTO users (email, display_name, avatar_url) VALUES (?, ?, ?)`
      )
      .run(
        typeof email === 'string' ? email.toLowerCase() : null,
        name,
        typeof avatarUrl === 'string' ? avatarUrl : null
      );

    userId = result.lastInsertRowid as number;

    db.prepare(
      `INSERT INTO oauth_accounts (user_id, provider, provider_id) VALUES (?, ?, ?)`
    ).run(userId, provider, providerId);
  }

  const user = db
    .prepare<number, UserRow>(
      `SELECT id, email, display_name, avatar_url, password_hash, is_banned FROM users WHERE id = ?`
    )
    .get(userId)!;

  if (user.is_banned) {
    res.status(403).json({ error: 'Account suspended' });
    return;
  }

  const sessionId = createUserSession(userId);
  setUserCookie(res, sessionId);

  res.json({ user: formatUser(user), sessionToken: sessionId });
});

/** POST /api/auth/import-stats */
authRouter.post('/import-stats', userAuth, requireUser, (req: Request, res: Response): void => {
  const { stats } = req.body as {
    stats?: {
      gamesPlayed?: unknown;
      wins?: unknown;
      currentStreak?: unknown;
      maxStreak?: unknown;
      distribution?: unknown;
    };
  };

  if (!stats || typeof stats !== 'object') {
    res.status(400).json({ error: 'Invalid stats payload' });
    return;
  }

  const toInt = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };

  const incoming = {
    gamesPlayed: toInt(stats.gamesPlayed),
    wins: toInt(stats.wins),
    currentStreak: toInt(stats.currentStreak),
    maxStreak: toInt(stats.maxStreak),
  };

  const userId = req.user!.id;

  interface StatsRow {
    stats_games_played: number;
    stats_wins: number;
    stats_streak: number;
    stats_max_streak: number;
  }

  const current = db
    .prepare<number, StatsRow>(
      `SELECT stats_games_played, stats_wins, stats_streak, stats_max_streak FROM users WHERE id = ?`
    )
    .get(userId)!;

  // Idempotent merge: only update if incoming values are larger
  const merged = {
    gamesPlayed: Math.max(current.stats_games_played ?? 0, incoming.gamesPlayed),
    wins: Math.max(current.stats_wins ?? 0, incoming.wins),
    streak: Math.max(current.stats_streak ?? 0, incoming.currentStreak),
    maxStreak: Math.max(current.stats_max_streak ?? 0, incoming.maxStreak),
  };

  db.prepare(
    `UPDATE users
     SET stats_games_played = ?,
         stats_wins         = ?,
         stats_streak       = ?,
         stats_max_streak   = ?
     WHERE id = ?`
  ).run(merged.gamesPlayed, merged.wins, merged.streak, merged.maxStreak, userId);

  res.json({ ok: true, stats: merged });
});
