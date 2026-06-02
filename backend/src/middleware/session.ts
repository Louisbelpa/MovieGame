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

// Header utilisé par les apps natives (iOS/Android) qui ne stockent pas
// fiablement les cookies sur localhost. Le token est un UUID brut (non signé)
// généré et conservé côté client natif.
const NATIVE_SESSION_HEADER = 'x-game-session';

export function sessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 1. Cookie signé (web / production)
  let token = req.signedCookies?.[COOKIE_NAME] as string | undefined;

  // 2. Header natif fallback (iOS / Android — notamment sur localhost)
  if (!token || typeof token !== 'string' || token.length < 8) {
    const headerToken = req.headers[NATIVE_SESSION_HEADER];
    if (typeof headerToken === 'string' && headerToken.length >= 8) {
      token = headerToken;
      // Pas de cookie en réponse : le client natif gère lui-même la persistance
    }
  }

  // 3. Nouvelle session anonyme si aucun token valide
  if (!token || typeof token !== 'string' || token.length < 8) {
    token = randomUUID();
    res.cookie(COOKIE_NAME, token, {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: MAX_AGE_MS,
    });
  }

  // Expose on req so route handlers can read it cleanly
  res.locals.sessionToken = token;
  next();
}
