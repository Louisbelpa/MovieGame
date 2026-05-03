/**
 * adminAuth.ts
 * Middleware that validates the admin_token signed cookie.
 *
 * Token generation:
 *   token = random 32-byte hex string
 *
 * Only a SHA-256 hash of the token is persisted in DB, with expiration and
 * optional revocation timestamp. Cookie signatures still protect against
 * tampering before we read signedCookies.
 */

import { Request, Response, NextFunction } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import db from '../db/database.js';

export const ADMIN_COOKIE = 'admin_token';

/** Generate a new admin token and persist only its hash. */
export function computeAdminToken(): string {
  const token = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO active_admin_tokens (token_hash, expires_at) VALUES (?, ?)`).run(hash, expiresAt);
  return token;
}

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.signedCookies?.[ADMIN_COOKIE] as string | undefined;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const hash = createHash('sha256').update(token).digest('hex');
  const row = db
    .prepare(
      `SELECT id
       FROM active_admin_tokens
       WHERE token_hash = ?
         AND revoked_at IS NULL
         AND datetime(expires_at) > datetime('now')`
    )
    .get(hash);

  if (!row) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  next();
}
