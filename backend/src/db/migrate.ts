/**
 * migrate.ts
 * Reads schema.sql and executes it against the SQLite database.
 * Safe to run multiple times (all statements use CREATE … IF NOT EXISTS).
 *
 * Usage: tsx src/db/migrate.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import db from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

console.log('Running migrations…');
db.exec(schema);

// Incremental migrations — safe to re-run (guarded by try/catch)
const incremental: { name: string; sql: string }[] = [
  {
    name: 'add_fame_level',
    sql: `ALTER TABLE films ADD COLUMN fame_level INTEGER NOT NULL DEFAULT 3 CHECK (fame_level BETWEEN 1 AND 5)`,
  },
  {
    name: 'create_audit_logs',
    sql: `CREATE TABLE IF NOT EXISTS audit_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      action     TEXT NOT NULL,
      details    TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )`,
  },
  {
    name: 'create_audit_logs_idx_action',
    sql: `CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action)`,
  },
  {
    name: 'create_audit_logs_idx_created_at',
    sql: `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at)`,
  },
  {
    name: 'create_series_table',
    sql: `CREATE TABLE IF NOT EXISTS series (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      title             TEXT NOT NULL,
      title_lower       TEXT NOT NULL GENERATED ALWAYS AS (lower(title)) STORED,
      title_aliases     TEXT NOT NULL DEFAULT '[]',
      year              INTEGER NOT NULL,
      creator           TEXT NOT NULL,
      genres            TEXT NOT NULL DEFAULT '[]',
      cast_members      TEXT NOT NULL DEFAULT '[]',
      tagline           TEXT,
      synopsis          TEXT,
      image_url         TEXT NOT NULL,
      image_blurred_url TEXT,
      tmdb_id           INTEGER UNIQUE,
      number_of_seasons INTEGER,
      network           TEXT,
      status            TEXT,
      original_language TEXT,
      fame_level        INTEGER NOT NULL DEFAULT 3 CHECK (fame_level BETWEEN 1 AND 5),
      is_active         INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )`,
  },
  {
    name: 'create_series_idx_title_lower',
    sql: `CREATE INDEX IF NOT EXISTS idx_series_title_lower ON series (title_lower)`,
  },
  {
    name: 'create_series_idx_tmdb_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_series_tmdb_id ON series (tmdb_id)`,
  },
  {
    name: 'create_series_idx_is_active',
    sql: `CREATE INDEX IF NOT EXISTS idx_series_is_active ON series (is_active)`,
  },
  {
    name: 'add_series_id_to_daily_challenges',
    sql: `ALTER TABLE daily_challenges ADD COLUMN series_id INTEGER REFERENCES series (id) ON DELETE RESTRICT`,
  },
  {
    name: 'create_daily_challenges_idx_series_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_daily_challenges_series_id ON daily_challenges (series_id)`,
  },
]

// Multi-statement migrations that need db.exec() rather than db.prepare().run()
const multiStatement: { name: string; sql: string }[] = [
  {
    name: 'add_media_type_to_daily_challenges',
    // Recreates daily_challenges with a media_type column and UNIQUE(date,type)
    // so films and series can have independent planning per date.
    sql: `
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS daily_challenges_v2;
      CREATE TABLE daily_challenges_v2 (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        challenge_date   TEXT NOT NULL,
        media_type       TEXT NOT NULL DEFAULT 'film' CHECK (media_type IN ('film','series')),
        film_id          INTEGER REFERENCES films(id) ON DELETE RESTRICT,
        series_id        INTEGER REFERENCES series(id) ON DELETE RESTRICT,
        challenge_number INTEGER NOT NULL,
        hint_schedule    TEXT NOT NULL DEFAULT '["year","director","cast"]',
        created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
        UNIQUE (challenge_date, media_type)
      );
      INSERT OR IGNORE INTO daily_challenges_v2
        (id, challenge_date, media_type, film_id, series_id, challenge_number, hint_schedule, created_at)
        SELECT id, challenge_date,
          CASE WHEN series_id IS NOT NULL THEN 'series' ELSE 'film' END,
          film_id, series_id, challenge_number, hint_schedule, created_at
        FROM daily_challenges;
      DROP TABLE daily_challenges;
      ALTER TABLE daily_challenges_v2 RENAME TO daily_challenges;
      CREATE INDEX IF NOT EXISTS idx_daily_challenges_date       ON daily_challenges (challenge_date);
      CREATE INDEX IF NOT EXISTS idx_daily_challenges_film_id    ON daily_challenges (film_id);
      CREATE INDEX IF NOT EXISTS idx_daily_challenges_series_id  ON daily_challenges (series_id);
      CREATE INDEX IF NOT EXISTS idx_daily_challenges_media_type ON daily_challenges (media_type);
      PRAGMA foreign_keys = ON;
    `,
  },
]

for (const { name, sql } of incremental) {
  try {
    db.prepare(sql).run()
    console.log(`  ✓ ${name}`)
  } catch {
    // column already exists — ignore
  }
}

for (const { name, sql } of multiStatement) {
  try {
    // Only run if media_type column doesn't exist yet
    const cols = db.prepare(`PRAGMA table_info(daily_challenges)`).all() as { name: string }[]
    if (cols.some((c) => c.name === 'media_type')) {
      continue
    }
    db.exec(sql)
    console.log(`  ✓ ${name}`)
  } catch (err) {
    console.error(`  ✗ ${name}:`, err)
  }
}

console.log('Migrations complete.');

db.close();
