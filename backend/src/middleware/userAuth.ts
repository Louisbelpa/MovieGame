/**
 * userAuth.ts
 * Middleware that attaches a logged-in user to req.user when a valid
 * user_session cookie or `Authorization: Bearer <session id>` is present.
 * Routes decide whether to require auth.
 *
 * - Cookie: `user_session` (signed, httpOnly) — unsigns to raw session row id
 * - Bearer: same raw id (for native clients that cannot rely on cookie jars)
 * - Session row is validated against user_sessions (non-expired).
 * - req.user is null when not authenticated — no 401 emitted here.
 */

import { Request, Response, NextFunction } from 'express';
import db from '../db/database.js';

export const USER_SESSION_COOKIE = 'user_session';

const SESSION_ID_HEX = /^[0-9a-f]{64}$/i;

interface UserSessionRow {
  id: number;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
}

function parseBearerSessionId(req: Request): string | undefined {
  const raw = req.headers.authorization;
  if (typeof raw !== 'string' || !raw.startsWith('Bearer ')) return undefined;
  const token = raw.slice(7).trim();
  if (!SESSION_ID_HEX.test(token)) return undefined;
  return token;
}

export function userAuth(req: Request, _res: Response, next: NextFunction): void {
  req.user = null;
  req.userSessionId = undefined;

  const cookieSession = req.signedCookies?.[USER_SESSION_COOKIE] as string | undefined;
  const bearerSession = parseBearerSessionId(req);

  const sessionId =
    typeof cookieSession === 'string' && cookieSession.length > 0
      ? cookieSession
      : bearerSession;

  if (!sessionId) {
    next();
    return;
  }

  const row = db
    .prepare<string, UserSessionRow>(
      `SELECT u.id, u.email, u.display_name, u.avatar_url
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?
         AND datetime(s.expires_at) > datetime('now')
         AND u.is_banned = 0`
    )
    .get(sessionId);

  if (!row) {
    next();
    return;
  }

  req.user = {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  };
  req.userSessionId = sessionId;

  // Track platform — X-Platform: ios | android | web
  const platform = req.headers['x-platform'];
  if (platform === 'ios' || platform === 'android' || platform === 'web') {
    try {
      db.prepare(
        `INSERT INTO user_platforms (user_id, platform, last_seen_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT (user_id, platform) DO UPDATE SET last_seen_at = excluded.last_seen_at`
      ).run(row.id, platform);
    } catch {
      // non-blocking — table may not exist yet before migration
    }
  }

  next();
}

/** Middleware that rejects unauthenticated requests with 401. */
export function requireUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}
