/**
 * adminAuth.ts
 * Middleware that validates the admin_token signed cookie.
 *
 * Token generation:
 *   token = sha256(ADMIN_PASSWORD + COOKIE_SECRET)
 *
 * On login, the same hash is computed and stored in a signed cookie.
 * On subsequent requests, this middleware recomputes the expected hash and
 * compares it to what was sent. Because the cookie is signed by cookie-parser,
 * tampering is already detected before we even read signedCookies.
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'node:crypto';

export const ADMIN_COOKIE = 'admin_token';

/** Compute the expected admin token from env vars. */
export function computeAdminToken(): string {
  const username = process.env.ADMIN_USERNAME ?? '';
  const password = process.env.ADMIN_PASSWORD ?? '';
  const secret = process.env.COOKIE_SECRET ?? 'dev_secret';
  return createHash('sha256').update(username + password + secret).digest('hex');
}

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.signedCookies?.[ADMIN_COOKIE] as string | undefined;

  if (!token || token !== computeAdminToken()) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
