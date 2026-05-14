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
import { randomBytes, createHash } from 'node:crypto';
import appleSignin from 'apple-signin-auth';
import db from '../db/database.js';
import { userAuth, requireUser, USER_SESSION_COOKIE } from '../middleware/userAuth.js';
import { AUTH } from '../middleware/rateLimiter.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../lib/email.js';

export const authRouter = Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const SESSION_TTL_DAYS = 30;
const COOKIE_MAX_AGE_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;         // 1 hour
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;   // 24 hours

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface UserRow {
  id: number;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  password_hash: string | null;
  is_banned: number;
  email_verified: number;
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
    emailVerified: row.email_verified === 1,
  };
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex');
  return { raw, hash: hashToken(raw) };
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
    .prepare<number, UserRow>(`SELECT id, email, display_name, avatar_url, password_hash, is_banned, email_verified FROM users WHERE id = ?`)
    .get(userId)!;

  // Fire-and-forget verification email
  const vToken = generateToken();
  const vExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS).toISOString();
  db.prepare(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`
  ).run(userId, vToken.hash, vExpires);
  void sendVerificationEmail(email.toLowerCase(), vToken.raw, displayName.trim());

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
      `SELECT id, email, display_name, avatar_url, password_hash, is_banned, email_verified FROM users WHERE email = ?`
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
      `SELECT id, email, display_name, avatar_url, password_hash, is_banned, email_verified FROM users WHERE id = ?`
    )
    .get(userId)!;

  res.json({ user: formatUser(updated) });
});

/** POST /api/auth/change-password */
authRouter.post('/change-password', userAuth, requireUser, async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: unknown; newPassword?: unknown };

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    res.status(400).json({ error: 'Paramètres manquants.' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
    return;
  }

  const userId = req.user!.id;
  const row = db
    .prepare<number, UserRow>(`SELECT id, email, display_name, avatar_url, password_hash, is_banned, email_verified FROM users WHERE id = ?`)
    .get(userId)!;

  if (!row.password_hash) {
    res.status(400).json({ error: 'Ce compte utilise une connexion externe (OAuth) et ne possède pas de mot de passe.' });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, row.password_hash);
  if (!valid) {
    res.status(400).json({ error: 'Mot de passe actuel incorrect.' });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(newHash, userId);

  res.json({ ok: true });
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
      `SELECT id, email, display_name, avatar_url, password_hash, is_banned, email_verified FROM users WHERE id = ?`
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

/** POST /api/auth/forgot-password */
authRouter.post('/forgot-password', AUTH, async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email?: unknown };
  // Always return 200 to prevent email enumeration
  res.json({ ok: true });

  if (typeof email !== 'string' || !isValidEmail(email)) return;

  const user = db
    .prepare<string, UserRow>(`SELECT id, email, display_name, avatar_url, password_hash, is_banned, email_verified FROM users WHERE email = ?`)
    .get(email.toLowerCase());

  if (!user || user.is_banned) return;

  // Invalidate previous reset tokens for this user
  db.prepare(`DELETE FROM password_reset_tokens WHERE user_id = ?`).run(user.id);

  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
  db.prepare(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`
  ).run(user.id, hash, expiresAt);

  void sendPasswordResetEmail(user.email!, raw, user.display_name);
});

/** POST /api/auth/reset-password */
authRouter.post('/reset-password', AUTH, async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body as { token?: unknown; password?: unknown };

  if (typeof token !== 'string' || token.trim().length === 0) {
    res.status(400).json({ error: 'Token manquant.' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    return;
  }

  interface ResetRow { id: number; user_id: number; expires_at: string; used_at: string | null }
  const record = db
    .prepare<string, ResetRow>(
      `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?`
    )
    .get(hashToken(token));

  if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
    res.status(400).json({ error: 'Ce lien est invalide ou a expiré.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(passwordHash, record.user_id);
  db.prepare(`UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?`).run(record.id);
  // Revoke all existing sessions for security
  db.prepare(`DELETE FROM user_sessions WHERE user_id = ?`).run(record.user_id);

  res.json({ ok: true });
});

/** GET /api/auth/verify-email?token= */
authRouter.get('/verify-email', (req: Request, res: Response): void => {
  const { token } = req.query as { token?: unknown };

  if (typeof token !== 'string' || token.trim().length === 0) {
    res.status(400).json({ error: 'Token manquant.' });
    return;
  }

  interface VerifyRow { id: number; user_id: number; expires_at: string; used_at: string | null }
  const record = db
    .prepare<string, VerifyRow>(
      `SELECT id, user_id, expires_at, used_at FROM email_verification_tokens WHERE token_hash = ?`
    )
    .get(hashToken(token));

  if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
    res.status(400).json({ error: 'Ce lien est invalide ou a expiré.' });
    return;
  }

  db.prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(record.user_id);
  db.prepare(`UPDATE email_verification_tokens SET used_at = datetime('now') WHERE id = ?`).run(record.id);

  res.json({ ok: true });
});

/** POST /api/auth/verify-email/send — resend verification email */
authRouter.post('/verify-email/send', userAuth, requireUser, (req: Request, res: Response): void => {
  const userId = req.user!.id;
  const user = db
    .prepare<number, UserRow>(`SELECT id, email, display_name, avatar_url, password_hash, is_banned, email_verified FROM users WHERE id = ?`)
    .get(userId)!;

  if (user.email_verified) {
    res.json({ ok: true, alreadyVerified: true });
    return;
  }

  // Invalidate previous tokens
  db.prepare(`DELETE FROM email_verification_tokens WHERE user_id = ?`).run(userId);

  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS).toISOString();
  db.prepare(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`
  ).run(userId, hash, expiresAt);

  void sendVerificationEmail(user.email!, raw, user.display_name);
  res.json({ ok: true });
});

/** POST /api/auth/challenge-result — record a completed challenge for the authenticated user */
authRouter.post('/challenge-result', userAuth, requireUser, (req: Request, res: Response): void => {
  const { challengeId, won, attemptsUsed } = req.body as {
    challengeId?: unknown;
    won?: unknown;
    attemptsUsed?: unknown;
  };

  if (typeof challengeId !== 'number' || !Number.isInteger(challengeId) || challengeId <= 0) {
    res.status(400).json({ error: 'Invalid challengeId' });
    return;
  }
  if (typeof won !== 'boolean') {
    res.status(400).json({ error: 'won must be a boolean' });
    return;
  }
  if (typeof attemptsUsed !== 'number' || attemptsUsed < 0) {
    res.status(400).json({ error: 'Invalid attemptsUsed' });
    return;
  }

  interface ChallengeRow { id: number; media_type: string }
  const challenge = db
    .prepare<number, ChallengeRow>(`SELECT id, media_type FROM daily_challenges WHERE id = ?`)
    .get(challengeId);

  if (!challenge) {
    res.status(404).json({ error: 'Challenge not found' });
    return;
  }

  const userId = req.user!.id;

  db.prepare(`
    INSERT INTO user_challenge_results (user_id, challenge_id, media_type, attempts_used, won)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, challenge_id) DO UPDATE SET
      attempts_used = excluded.attempts_used,
      won           = excluded.won,
      completed_at  = datetime('now')
  `).run(userId, challengeId, challenge.media_type, attemptsUsed, won ? 1 : 0);

  res.json({ ok: true });
});

/** GET /api/auth/history?limit=&offset= */
authRouter.get('/history', userAuth, requireUser, (req: Request, res: Response): void => {
  const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
  const offset = parseInt(String(req.query.offset ?? '0'), 10) || 0;
  const userId = req.user!.id;

  interface HistoryRow {
    challenge_id: number;
    challenge_date: string;
    media_type: string;
    attempts_used: number;
    won: number;
    completed_at: string;
  }

  const rows = db
    .prepare<[number, number, number], HistoryRow>(`
      SELECT r.challenge_id, dc.challenge_date, r.media_type, r.attempts_used, r.won, r.completed_at
      FROM user_challenge_results r
      JOIN daily_challenges dc ON dc.id = r.challenge_id
      WHERE r.user_id = ?
      ORDER BY r.completed_at DESC
      LIMIT ? OFFSET ?
    `)
    .all(userId, limit, offset);

  const total = (db
    .prepare<number, { count: number }>(`SELECT COUNT(*) as count FROM user_challenge_results WHERE user_id = ?`)
    .get(userId) as { count: number }).count;

  res.json({
    results: rows.map((r) => ({
      challengeId: r.challenge_id,
      date: r.challenge_date,
      mediaType: r.media_type,
      attemptsUsed: r.attempts_used,
      won: r.won === 1,
      completedAt: r.completed_at,
    })),
    total,
    limit,
    offset,
  });
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

/** POST /api/auth/apple */
authRouter.post('/apple', AUTH, async (req: Request, res: Response): Promise<void> => {
  const { identityToken, displayName } = req.body as {
    identityToken?: unknown;
    displayName?: unknown;
  };

  if (typeof identityToken !== 'string' || identityToken.trim().length === 0) {
    res.status(400).json({ error: 'identityToken is required' });
    return;
  }

  let decoded: { sub: string; email?: string; name?: string; [key: string]: unknown };
  try {
    decoded = (await appleSignin.verifyIdToken(identityToken, { audience: ['fr.guesstoday.app', process.env.APPLE_WEB_CLIENT_ID ?? 'fr.guesstoday.web'] })) as unknown as typeof decoded;
  } catch {
    res.status(401).json({ error: 'Invalid Apple identity token' });
    return;
  }

  const sub = decoded.sub;
  const appleEmail = typeof decoded.email === 'string' ? decoded.email : undefined;

  interface OAuthRow { user_id: number }
  const existing = db
    .prepare<[string, string], OAuthRow>(
      `SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_id = ?`
    )
    .get('apple', sub);

  if (existing) {
    const user = db
      .prepare<number, UserRow>(
        `SELECT id, email, display_name, avatar_url, password_hash, is_banned, email_verified FROM users WHERE id = ?`
      )
      .get(existing.user_id)!;

    if (user.is_banned) {
      res.status(403).json({ error: 'Account suspended' });
      return;
    }

    const sessionId = createUserSession(user.id);
    setUserCookie(res, sessionId);
    res.json({ user: formatUser(user), sessionToken: sessionId });
    return;
  }

  const name =
    typeof displayName === 'string' && displayName.trim()
      ? displayName.trim()
      : typeof decoded.name === 'string' && decoded.name.trim()
      ? decoded.name.trim()
      : 'Joueur';

  let userId: number;

  if (appleEmail) {
    const emailUser = db
      .prepare<string, UserRow>(
        `SELECT id, email, display_name, avatar_url, password_hash, is_banned, email_verified FROM users WHERE email = ?`
      )
      .get(appleEmail.toLowerCase());

    if (emailUser) {
      userId = emailUser.id;
      db.prepare(
        `INSERT OR IGNORE INTO oauth_accounts (user_id, provider, provider_id) VALUES (?, ?, ?)`
      ).run(userId, 'apple', sub);

      const user = db
        .prepare<number, UserRow>(
          `SELECT id, email, display_name, avatar_url, password_hash, is_banned, email_verified FROM users WHERE id = ?`
        )
        .get(userId)!;

      if (user.is_banned) {
        res.status(403).json({ error: 'Account suspended' });
        return;
      }

      const sessionId = createUserSession(userId);
      setUserCookie(res, sessionId);
      res.json({ user: formatUser(user), sessionToken: sessionId });
      return;
    }
  }

  const result = db
    .prepare(
      `INSERT INTO users (email, display_name) VALUES (?, ?)`
    )
    .run(appleEmail ? appleEmail.toLowerCase() : null, name);

  userId = result.lastInsertRowid as number;

  db.prepare(
    `INSERT INTO oauth_accounts (user_id, provider, provider_id) VALUES (?, ?, ?)`
  ).run(userId, 'apple', sub);

  const user = db
    .prepare<number, UserRow>(
      `SELECT id, email, display_name, avatar_url, password_hash, is_banned, email_verified FROM users WHERE id = ?`
    )
    .get(userId)!;

  const sessionId = createUserSession(userId);
  setUserCookie(res, sessionId);
  res.status(201).json({ user: formatUser(user), sessionToken: sessionId });
});
