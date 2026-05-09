import db from '../db/database.js'

/** Ordinal 1-based among active rows of same `media_type`, ordered by `challenge_date` then `id`. */
export function activeChallengeOrdinalByDate(
  id: number,
  challengeDate: string,
  mediaType: string
): number {
  const row = db
    .prepare<[string, string, string, number], { n: number }>(
      `SELECT 1 + COUNT(*) AS n FROM daily_challenges d2
       WHERE d2.media_type = ?
         AND d2.is_active = 1
         AND (d2.challenge_date < ? OR (d2.challenge_date = ? AND d2.id < ?))`
    )
    .get(mediaType, challengeDate, challengeDate, id)!;
  return row.n;
}
