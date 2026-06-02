/**
 * game-session.service.ts
 * Resolves game_sessions by logged-in user (cross-device) or anonymous mg_session cookie.
 */

import db from '../db/database.js';

export interface GameSessionRow {
  id: number;
  session_token: string;
  challenge_id: number;
  user_id: number | null;
  attempts: string;
  hints_revealed: number;
  outcome: 'won' | 'lost' | null;
  started_at: string;
  finished_at: string | null;
}

/** Attach anonymous sessions from the current browser/app to the account (same device login). */
export function linkAnonymousGameSessionsToUser(sessionToken: string, userId: number): void {
  db.prepare(
    `UPDATE game_sessions SET user_id = ?
     WHERE session_token = ? AND user_id IS NULL`
  ).run(userId, sessionToken);
}

export function attachUserToGameSession(
  sessionToken: string,
  challengeId: number,
  userId: number
): void {
  db.prepare(
    `UPDATE game_sessions SET user_id = ?
     WHERE session_token = ? AND challenge_id = ? AND user_id IS NULL`
  ).run(userId, sessionToken, challengeId);
}

function findSessionByUser(userId: number, challengeId: number): GameSessionRow | undefined {
  return db
    .prepare<[number, number], GameSessionRow>(
      `SELECT * FROM game_sessions
       WHERE user_id = ? AND challenge_id = ?
       ORDER BY datetime(COALESCE(finished_at, started_at)) DESC
       LIMIT 1`
    )
    .get(userId, challengeId);
}

function findSessionByToken(sessionToken: string, challengeId: number): GameSessionRow | undefined {
  return db
    .prepare<[string, number], GameSessionRow>(
      `SELECT * FROM game_sessions WHERE session_token = ? AND challenge_id = ?`
    )
    .get(sessionToken, challengeId);
}

export function getOrCreateGameSession(
  sessionToken: string,
  challengeId: number,
  userId?: number
): GameSessionRow {
  if (userId != null) {
    linkAnonymousGameSessionsToUser(sessionToken, userId);
    const byUser = findSessionByUser(userId, challengeId);
    if (byUser) return byUser;
  }

  const existing = findSessionByToken(sessionToken, challengeId);
  if (existing) {
    if (userId != null && existing.user_id == null) {
      db.prepare(`UPDATE game_sessions SET user_id = ? WHERE id = ?`).run(userId, existing.id);
      return { ...existing, user_id: userId };
    }
    return existing;
  }

  db.prepare(
    `INSERT INTO game_sessions (session_token, challenge_id, user_id) VALUES (?, ?, ?)`
  ).run(sessionToken, challengeId, userId ?? null);

  return findSessionByToken(sessionToken, challengeId)!;
}

export function findGameSession(
  sessionToken: string,
  challengeId: number,
  userId?: number
): GameSessionRow | undefined {
  if (userId != null) {
    const byUser = findSessionByUser(userId, challengeId);
    if (byUser) return byUser;
  }
  return findSessionByToken(sessionToken, challengeId);
}
