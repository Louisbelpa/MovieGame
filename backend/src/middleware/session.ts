/**
 * session.ts
 * Middleware that attaches an anonymous session token to every request.
 *
 * Strategy:
 *  - Token is stored in a SIGNED, httpOnly cookie (not accessible from JS).
 *  - No user account required: each browser gets a random UUID v4.
 *  - The signature uses COOKIE_SECRET, so forged cookies are rejected.
 *  - SameSite=Lax prevents CSRF on state-mutating POST endpoints.
 *
 * Anti-cheat role:
 *  - The session token ties game state (attempts, hints, outcome) server-side.
 *  - Even if a player clears cookies, they start a fresh game session –
 *    they cannot reuse a previous session to "undo" a wrong guess.
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

const COOKIE_NAME = 'mg_session';
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

export function sessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // signedCookies is populated by cookie-parser when a secret is provided
  let token = req.signedCookies?.[COOKIE_NAME] as string | undefined;

  if (!token || typeof token !== 'string' || token.length < 8) {
    token = randomUUID();
    res.cookie(COOKIE_NAME, token, {
      signed: true,
      httpOnly: true,           // not accessible from document.cookie
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: MAX_AGE_MS,
    });
  }

  // Expose on req so route handlers can read it cleanly
  res.locals.sessionToken = token;
  next();
}
