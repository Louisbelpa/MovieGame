/**
 * scripts/fetch-backdrops.ts
 * Fetches movie backdrop images (scene screenshots) from TMDB API
 * and updates the image_url in the database.
 *
 * Usage:
 *   1. Get a free TMDB API key at https://www.themoviedb.org/settings/api
 *   2. Add TMDB_API_KEY=your_key to backend/.env
 *   3. Run: npm run fetch-backdrops
 *
 * Backdrops are widescreen scene screenshots (1280×720 or 1920×1080),
 * much better for a guessing game than promotional posters.
 */

import 'dotenv/config';
import db from '../src/db/database.js';
import { pickBestBackdrop, type TmdbBackdrop } from '../src/lib/tmdb-images.js';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_BASE = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error('❌  TMDB_API_KEY is not set in .env');
  console.error('   Get a free key at https://www.themoviedb.org/settings/api');
  process.exit(1);
}

interface TmdbImagesResponse {
  backdrops: TmdbBackdrop[];
}

async function fetchBestBackdrop(tmdbId: number): Promise<string | null> {
  const url = `${TMDB_API_BASE}/movie/${tmdbId}/images?api_key=${TMDB_API_KEY}&include_image_language=null`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  TMDB ${tmdbId}: HTTP ${res.status}`);
    return null;
  }
  const data = (await res.json()) as TmdbImagesResponse;
  // Préfère un backdrop paysage sans texte ; déterministe pour un script batch.
  return pickBestBackdrop(data.backdrops, false);
}

async function main() {
  const films = db
    .prepare<[], { id: number; title: string; tmdb_id: number | null }>(
      `SELECT id, title, tmdb_id FROM films WHERE tmdb_id IS NOT NULL AND is_active = 1`
    )
    .all();

  if (films.length === 0) {
    console.log('No films with tmdb_id found.');
    return;
  }

  console.log(`Fetching backdrops for ${films.length} films…\n`);

  const updateStmt = db.prepare(`UPDATE films SET image_url = ? WHERE id = ?`);

  let updated = 0;
  let skipped = 0;

  for (const film of films) {
    try {
      const backdrop = await fetchBestBackdrop(film.tmdb_id!);
      if (backdrop) {
        updateStmt.run(backdrop, film.id);
        console.log(`  ✓  ${film.title} → ${backdrop}`);
        updated++;
      } else {
        console.log(`  –  ${film.title}: no backdrop found, keeping poster`);
        skipped++;
      }
      // Respect TMDB rate limit (40 req/10s)
      await new Promise((r) => setTimeout(r, 260));
    } catch (err) {
      console.error(`  ✗  ${film.title}:`, err);
      skipped++;
    }
  }

  console.log(`\nDone. ${updated} updated, ${skipped} skipped.`);
  db.close();
}

main();
