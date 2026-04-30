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

for (const { name, sql } of incremental) {
  try {
    db.prepare(sql).run()
    console.log(`  ✓ ${name}`)
  } catch {
    // column already exists — ignore
  }
}

console.log('Migrations complete.');

db.close();
