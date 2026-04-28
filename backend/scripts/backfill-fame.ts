/**
 * scripts/backfill-fame.ts
 * Fetches vote_count from TMDB for every film that has a tmdb_id
 * and updates fame_level accordingly.
 *
 * Usage: cd backend && npx tsx scripts/backfill-fame.ts
 *
 * Thresholds:
 *   < 500        → 1 (niche)
 *   500–2 000    → 2
 *   2 000–8 000  → 3
 *   8 000–25 000 → 4
 *   ≥ 25 000     → 5 (blockbuster)
 */

import 'dotenv/config'
import db from '../src/db/database.js'

const TMDB_API_KEY = process.env.TMDB_API_KEY
if (!TMDB_API_KEY) {
  console.error('❌ TMDB_API_KEY is not set in .env')
  process.exit(1)
}

function fameFromVoteCount(voteCount: number): number {
  if (voteCount >= 25_000) return 5
  if (voteCount >= 8_000)  return 4
  if (voteCount >= 2_000)  return 3
  if (voteCount >= 500)    return 2
  return 1
}

interface FilmRow {
  id: number
  title: string
  tmdb_id: number
  fame_level: number
}

const films = db
  .prepare<[], FilmRow>(`SELECT id, title, tmdb_id, fame_level FROM films WHERE tmdb_id IS NOT NULL`)
  .all()

console.log(`Found ${films.length} film(s) with a TMDB ID. Fetching vote counts…\n`)

let updated = 0
let skipped = 0
let errors = 0

for (const film of films) {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${film.tmdb_id}?api_key=${TMDB_API_KEY}&language=fr-FR`
    )
    if (!res.ok) {
      console.warn(`  ⚠️  TMDB ${res.status} for "${film.title}" (tmdb_id=${film.tmdb_id})`)
      errors++
      continue
    }

    const data = (await res.json()) as { vote_count: number }
    const newLevel = fameFromVoteCount(data.vote_count ?? 0)

    if (newLevel !== film.fame_level) {
      db.prepare(`UPDATE films SET fame_level = ? WHERE id = ?`).run(newLevel, film.id)
      console.log(`  ✓ "${film.title}" → ${film.fame_level}★ → ${newLevel}★  (votes: ${data.vote_count})`)
      updated++
    } else {
      skipped++
    }

    // Respect TMDB rate limit (40 req/10s)
    await new Promise((r) => setTimeout(r, 260))
  } catch (err) {
    console.error(`  ✗ Error for "${film.title}":`, err)
    errors++
  }
}

console.log(`\nDone. Updated: ${updated} · Unchanged: ${skipped} · Errors: ${errors}`)
db.close()
