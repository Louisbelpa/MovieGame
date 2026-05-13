/**
 * userAuth.ts
 * Middleware that attaches a logged-in user to req.user when a valid
 * user_session cookie is present. Routes decide whether to require auth.
 *
 * - Cookie: `user_session` (signed, httpOnly)
 * - Session row is validated against user_sessions (non-expired).
 * - req.user is null when not authenticated — no 401 emitted here.
 */

import { Request, Response, NextFunction } from 'express';
import db from '../db/database.js';

export const USER_SESSION_COOKIE = 'user_session';

interface UserSessionRow {
  id: number;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
}

export function userAuth(req: Request, _res: Response, next: NextFunction): void {
  const sessionId = req.signedCookies?.[USER_SESSION_COOKIE] as string | undefined;

  if (!sessionId || typeof sessionId !== 'string') {
    req.user = null;
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
    req.user = null;
    next();
    return;
  }

  req.user = {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  };

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
