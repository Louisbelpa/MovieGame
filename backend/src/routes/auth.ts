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
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import appleSignin from 'apple-signin-auth';
import db from '../db/database.js';
import { userAuth, requireUser, USER_SESSION_COOKIE } from '../middleware/userAuth.js';
import { AUTH, apiLimiter } from '../middleware/rateLimiter.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../lib/email.js';
import { registerPushToken } from '../services/push-notification.service.js';
import { getUploadsAbsDir } from '../config/uploads.js';
import { linkAnonymousGameSessionsToUser } from '../services/game-session.service.js';

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

function linkGameSessionsAfterAuth(res: Response, userId: number): void {
  const mgToken = res.locals.sessionToken as string | undefined;
  if (mgToken) linkAnonymousGameSessionsToUser(mgToken, userId);
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
  if (typeof displayName !== 'string' || displayName.trim().length === 0 || displayName.trim().length > 50) {
    res.status(400).json({ error: 'Display name must be between 1 and 50 characters' });
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
  linkGameSessionsAfterAuth(res, userId);

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
  linkGameSessionsAfterAuth(res, user.id);

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

  if (displayName !== undefined && (typeof displayName !== 'string' || displayName.trim().length === 0 || displayName.trim().length > 50)) {
    res.status(400).json({ error: 'Display name must be between 1 and 50 characters' });
    return;
  }
  if (avatarUrl !== undefined && avatarUrl !== null && (typeof avatarUrl !== 'string' || avatarUrl.length > 500)) {
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

/** POST /api/auth/avatar — multipart image upload */
const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(getUploadsAbsDir(), 'avatars');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG and WebP images are allowed'));
  },
});

authRouter.post('/avatar', userAuth, requireUser, avatarUpload.single('avatar'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const userId = req.user!.id;
  const newUrl = `/uploads/avatars/${req.file.filename}`;

  // Delete previous local avatar if present
  const prev = db.prepare<number, { avatar_url: string | null }>(`SELECT avatar_url FROM users WHERE id = ?`).get(userId);
  if (prev?.avatar_url?.startsWith('/uploads/avatars/')) {
    const old = path.join(getUploadsAbsDir(), prev.avatar_url.replace('/uploads/', ''));
    fs.unlink(old, () => {});
  }

  db.prepare(`UPDATE users SET avatar_url = ? WHERE id = ?`).run(newUrl, userId);

  const updated = db
    .prepare<number, UserRow>(`SELECT id, email, display_name, avatar_url, password_hash, is_banned, email_verified FROM users WHERE id = ?`)
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

    const createOAuthUser = db.transaction(() => {
      const r = db
        .prepare(`INSERT INTO users (email, display_name, avatar_url) VALUES (?, ?, ?)`)
        .run(
          typeof email === 'string' ? email.toLowerCase() : null,
          name,
          typeof avatarUrl === 'string' ? avatarUrl : null
        );
      const newUserId = r.lastInsertRowid as number;
      db.prepare(`INSERT INTO oauth_accounts (user_id, provider, provider_id) VALUES (?, ?, ?)`)
        .run(newUserId, provider, providerId);
      return newUserId;
    });

    userId = createOAuthUser();
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
  linkGameSessionsAfterAuth(res, userId);

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
authRouter.get('/verify-email', AUTH, (req: Request, res: Response): void => {
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
authRouter.post('/verify-email/send', AUTH, userAuth, requireUser, (req: Request, res: Response): void => {
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
authRouter.post('/challenge-result', apiLimiter, userAuth, requireUser, (req: Request, res: Response): void => {
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

/**
 * GET /api/auth/history
 *
 * With ?type=film|series|wiki — returns { history: { "YYYY-MM-DD": "won"|"lost" } }
 * Without ?type             — paginated list with ?limit=&offset=
 */
authRouter.get('/history', apiLimiter, userAuth, requireUser, (req: Request, res: Response): void => {
  const userId = req.user!.id;
  const type   = typeof req.query.type === 'string' ? req.query.type : '';
  const validTypes = ['film', 'series', 'wiki'] as const;

  if (type) {
    // Type-filtered calendar view: { history: { "YYYY-MM-DD": "won"|"lost" } }
    if (!validTypes.includes(type as never)) {
      res.status(400).json({ error: 'type must be film, series or wiki' });
      return;
    }

    interface Row { challenge_date: string; won: number }
    const rows = db
      .prepare<[number, string], Row>(`
        SELECT dc.challenge_date, r.won
        FROM user_challenge_results r
        JOIN daily_challenges dc ON dc.id = r.challenge_id
        WHERE r.user_id = ? AND r.media_type = ?
        ORDER BY dc.challenge_date DESC
      `)
      .all(userId, type);

    const history: Record<string, 'won' | 'lost'> = {};
    for (const row of rows) {
      history[row.challenge_date] = row.won === 1 ? 'won' : 'lost';
    }
    res.json({ history });
    return;
  }

  // Paginated list view
  const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
  const offset = Math.max(0, parseInt(String(req.query.offset ?? '0'), 10) || 0);

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

/** GET /api/auth/stats?type=film|series|wiki — compute stats from user_challenge_results */
authRouter.get('/stats', userAuth, requireUser, (req: Request, res: Response): void => {
  const userId = req.user!.id;
  const type   = String(req.query.type ?? '');
  const validTypes = ['film', 'series', 'wiki'] as const;

  const todayParis = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
  const yd = new Date(); yd.setDate(yd.getDate() - 1);
  const yesterdayParis = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(yd);

  interface ResultRow { challenge_date: string; attempts_used: number; won: number }
  type ImportRow = Record<string, number>;

  const computeStats = (mediaType: 'film' | 'series' | 'wiki') => {
    const rows = db
      .prepare<[number, string], ResultRow>(`
        SELECT dc.challenge_date, r.attempts_used, r.won
        FROM user_challenge_results r
        JOIN daily_challenges dc ON dc.id = r.challenge_id
        WHERE r.user_id = ? AND r.media_type = ?
        ORDER BY dc.challenge_date DESC
      `)
      .all(userId, mediaType);

    const gamesPlayed = rows.length;
    const wins = rows.filter((r) => r.won === 1).length;

    const distribution: Record<string, number> = {};
    for (const row of rows) {
      if (row.won === 1) {
        const key = String(row.attempts_used);
        distribution[key] = (distribution[key] ?? 0) + 1;
      }
    }

    const wonDates = [...new Set(rows.filter((r) => r.won === 1).map((r) => r.challenge_date))].sort().reverse();

    let currentStreak = 0;
    if (wonDates.length > 0 && (wonDates[0] === todayParis || wonDates[0] === yesterdayParis)) {
      currentStreak = 1;
      for (let i = 1; i < wonDates.length; i++) {
        const diff = Math.round((new Date(wonDates[i - 1]).getTime() - new Date(wonDates[i]).getTime()) / 86400000);
        if (diff === 1) { currentStreak++; } else { break; }
      }
    }

    const wonAsc = [...wonDates].reverse();
    let maxStreak = 0, tempStreak = 0;
    for (let i = 0; i < wonAsc.length; i++) {
      if (i === 0) { tempStreak = 1; } else {
        const diff = Math.round((new Date(wonAsc[i]).getTime() - new Date(wonAsc[i - 1]).getTime()) / 86400000);
        tempStreak = diff === 1 ? tempStreak + 1 : 1;
      }
      maxStreak = Math.max(maxStreak, tempStreak);
    }

    // Merge with per-mode import floor (stats imported from local storage at login)
    const col = (f: string) => `import_${mediaType}_${f}`;
    const imp = db
      .prepare<number, ImportRow>(
        `SELECT ${col('played')}, ${col('wins')}, ${col('streak')}, ${col('max_streak')} FROM users WHERE id = ?`
      )
      .get(userId);

    return {
      gamesPlayed:   Math.max(gamesPlayed,   imp?.[col('played')]     ?? 0),
      wins:          Math.max(wins,           imp?.[col('wins')]       ?? 0),
      currentStreak: Math.max(currentStreak,  imp?.[col('streak')]     ?? 0),
      maxStreak:     Math.max(maxStreak,      imp?.[col('max_streak')] ?? 0),
      distribution,
    };
  };

  if (type && (validTypes as readonly string[]).includes(type)) {
    res.json(computeStats(type as 'film' | 'series' | 'wiki'));
  } else {
    res.json({
      film:   computeStats('film'),
      series: computeStats('series'),
      wiki:   computeStats('wiki'),
    });
  }
});

/** POST /api/auth/import-stats */
authRouter.post('/import-stats', userAuth, requireUser, (req: Request, res: Response): void => {
  const { type, stats } = req.body as {
    type?: unknown;
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

  const validTypes = ['film', 'series', 'wiki'] as const;
  const mode = validTypes.includes(type as never) ? (type as 'film' | 'series' | 'wiki') : null;

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

  if (mode) {
    // Per-mode import — idempotent merge into import_<mode>_* columns
    type ImportRow = Record<string, number>;
    const col = (f: string) => `import_${mode}_${f}`;
    const current = db
      .prepare<number, ImportRow>(
        `SELECT ${col('played')}, ${col('wins')}, ${col('streak')}, ${col('max_streak')} FROM users WHERE id = ?`
      )
      .get(userId)!;

    const merged = {
      played:     Math.max(current[col('played')]     ?? 0, incoming.gamesPlayed),
      wins:       Math.max(current[col('wins')]       ?? 0, incoming.wins),
      streak:     Math.max(current[col('streak')]     ?? 0, incoming.currentStreak),
      max_streak: Math.max(current[col('max_streak')] ?? 0, incoming.maxStreak),
    };

    db.prepare(
      `UPDATE users
       SET ${col('played')}     = ?,
           ${col('wins')}       = ?,
           ${col('streak')}     = ?,
           ${col('max_streak')} = ?
       WHERE id = ?`
    ).run(merged.played, merged.wins, merged.streak, merged.max_streak, userId);

    res.json({ ok: true });
  } else {
    // Legacy fallback (no type): write to global stats_* columns
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

    const merged = {
      gamesPlayed: Math.max(current.stats_games_played ?? 0, incoming.gamesPlayed),
      wins:        Math.max(current.stats_wins         ?? 0, incoming.wins),
      streak:      Math.max(current.stats_streak       ?? 0, incoming.currentStreak),
      maxStreak:   Math.max(current.stats_max_streak   ?? 0, incoming.maxStreak),
    };

    db.prepare(
      `UPDATE users
       SET stats_games_played = ?,
           stats_wins         = ?,
           stats_streak       = ?,
           stats_max_streak   = ?
       WHERE id = ?`
    ).run(merged.gamesPlayed, merged.wins, merged.streak, merged.maxStreak, userId);

    res.json({ ok: true });
  }
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
    linkGameSessionsAfterAuth(res, user.id);
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
      linkGameSessionsAfterAuth(res, userId);
      res.json({ user: formatUser(user), sessionToken: sessionId });
      return;
    }
  }

  const createAppleUser = db.transaction(() => {
    const r = db
      .prepare(`INSERT INTO users (email, display_name) VALUES (?, ?)`)
      .run(appleEmail ? appleEmail.toLowerCase() : null, name);
    const newUserId = r.lastInsertRowid as number;
    db.prepare(`INSERT INTO oauth_accounts (user_id, provider, provider_id) VALUES (?, ?, ?)`)
      .run(newUserId, 'apple', sub);
    return newUserId;
  });
  userId = createAppleUser();

  const user = db
    .prepare<number, UserRow>(
      `SELECT id, email, display_name, avatar_url, password_hash, is_banned, email_verified FROM users WHERE id = ?`
    )
    .get(userId)!;

  const sessionId = createUserSession(userId);
  setUserCookie(res, sessionId);
  linkGameSessionsAfterAuth(res, userId);
  res.status(201).json({ user: formatUser(user), sessionToken: sessionId });
});

/** POST /api/auth/push-token — Register a push notification token */
authRouter.post('/push-token', userAuth, requireUser, (req: Request, res: Response): void => {
  const { token, platform } = req.body as { token?: unknown; platform?: unknown };
  if (typeof token !== 'string' || !token) {
    res.status(400).json({ error: 'token required' });
    return;
  }
  if (platform !== 'ios' && platform !== 'android') {
    res.status(400).json({ error: 'platform must be ios or android' });
    return;
  }
  registerPushToken(req.user!.id, token, platform);
  res.json({ ok: true });
});
