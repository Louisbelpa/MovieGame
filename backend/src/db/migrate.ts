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
  {
    name: 'create_wiki_persons',
    sql: `CREATE TABLE IF NOT EXISTS wiki_persons (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT NOT NULL,
      name_lower      TEXT NOT NULL GENERATED ALWAYS AS (lower(name)) STORED,
      name_aliases    TEXT NOT NULL DEFAULT '[]',
      person_type     TEXT NOT NULL DEFAULT 'politician' CHECK (person_type IN ('politician','sportsperson','artist','scientist','entrepreneur','writer','historical_figure')),
      wikipedia_slug  TEXT NOT NULL UNIQUE,
      infobox_data    TEXT NOT NULL DEFAULT '{}',
      hint_schedule   TEXT NOT NULL DEFAULT '[]',
      photo_url       TEXT,
      extract         TEXT,
      wikipedia_url   TEXT,
      difficulty      INTEGER NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
      is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )`,
  },
  {
    name: 'create_wiki_persons_idx_name_lower',
    sql: `CREATE INDEX IF NOT EXISTS idx_wiki_persons_name_lower ON wiki_persons (name_lower)`,
  },
  {
    name: 'create_wiki_persons_idx_person_type',
    sql: `CREATE INDEX IF NOT EXISTS idx_wiki_persons_person_type ON wiki_persons (person_type)`,
  },
  {
    name: 'create_wiki_persons_idx_is_active',
    sql: `CREATE INDEX IF NOT EXISTS idx_wiki_persons_is_active ON wiki_persons (is_active)`,
  },
  {
    name: 'create_wiki_global_stats',
    sql: `CREATE TABLE IF NOT EXISTS wiki_global_stats (
      id            INTEGER PRIMARY KEY CHECK (id = 1),
      total_games   INTEGER NOT NULL DEFAULT 0,
      total_wins    INTEGER NOT NULL DEFAULT 0,
      total_losses  INTEGER NOT NULL DEFAULT 0,
      wins_by_attempt TEXT NOT NULL DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}',
      last_updated  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )`,
  },
  {
    name: 'seed_wiki_global_stats',
    sql: `INSERT OR IGNORE INTO wiki_global_stats (id) VALUES (1)`,
  },
]

// Multi-statement migrations that need db.exec() rather than db.prepare().run()
const multiStatement: { name: string; sql: string }[] = [
  {
    name: 'expand_wiki_person_type_values',
    sql: `
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS wiki_persons_v2;
      CREATE TABLE wiki_persons_v2 (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        name            TEXT NOT NULL,
        name_lower      TEXT NOT NULL GENERATED ALWAYS AS (lower(name)) STORED,
        name_aliases    TEXT NOT NULL DEFAULT '[]',
        person_type     TEXT NOT NULL DEFAULT 'politician' CHECK (person_type IN ('politician','sportsperson','artist','scientist','entrepreneur','writer','historical_figure')),
        wikipedia_slug  TEXT NOT NULL UNIQUE,
        infobox_data    TEXT NOT NULL DEFAULT '{}',
        hint_schedule   TEXT NOT NULL DEFAULT '[]',
        photo_url       TEXT,
        extract         TEXT,
        wikipedia_url   TEXT,
        difficulty      INTEGER NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
        is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );
      INSERT OR IGNORE INTO wiki_persons_v2
        (id, name, name_aliases, person_type, wikipedia_slug, infobox_data, hint_schedule, photo_url, extract, wikipedia_url, difficulty, is_active, created_at, updated_at)
        SELECT id, name, name_aliases, person_type, wikipedia_slug, infobox_data, hint_schedule, photo_url, extract, wikipedia_url, difficulty, is_active, created_at, updated_at
        FROM wiki_persons;
      DROP TABLE wiki_persons;
      ALTER TABLE wiki_persons_v2 RENAME TO wiki_persons;
      CREATE INDEX IF NOT EXISTS idx_wiki_persons_name_lower ON wiki_persons (name_lower);
      CREATE INDEX IF NOT EXISTS idx_wiki_persons_person_type ON wiki_persons (person_type);
      CREATE INDEX IF NOT EXISTS idx_wiki_persons_is_active ON wiki_persons (is_active);
      PRAGMA foreign_keys = ON;
    `,
  },
  {
    name: 'add_wiki_person_id_to_daily_challenges',
    sql: `
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS daily_challenges_v3;
      CREATE TABLE daily_challenges_v3 (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        challenge_date   TEXT NOT NULL,
        media_type       TEXT NOT NULL DEFAULT 'film' CHECK (media_type IN ('film','series','wiki')),
        film_id          INTEGER REFERENCES films(id) ON DELETE RESTRICT,
        series_id        INTEGER REFERENCES series(id) ON DELETE RESTRICT,
        wiki_person_id   INTEGER REFERENCES wiki_persons(id) ON DELETE RESTRICT,
        challenge_number INTEGER NOT NULL,
        hint_schedule    TEXT NOT NULL DEFAULT '["year","director","cast"]',
        created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
        UNIQUE (challenge_date, media_type)
      );
      INSERT OR IGNORE INTO daily_challenges_v3
        (id, challenge_date, media_type, film_id, series_id, wiki_person_id, challenge_number, hint_schedule, created_at)
        SELECT id, challenge_date, media_type, film_id, series_id, NULL, challenge_number, hint_schedule, created_at
        FROM daily_challenges;
      DROP TABLE daily_challenges;
      ALTER TABLE daily_challenges_v3 RENAME TO daily_challenges;
      CREATE INDEX IF NOT EXISTS idx_daily_challenges_date          ON daily_challenges (challenge_date);
      CREATE INDEX IF NOT EXISTS idx_daily_challenges_film_id       ON daily_challenges (film_id);
      CREATE INDEX IF NOT EXISTS idx_daily_challenges_series_id     ON daily_challenges (series_id);
      CREATE INDEX IF NOT EXISTS idx_daily_challenges_wiki_person_id ON daily_challenges (wiki_person_id);
      CREATE INDEX IF NOT EXISTS idx_daily_challenges_media_type    ON daily_challenges (media_type);
      PRAGMA foreign_keys = ON;
    `,
  },
  {
    name: 'create_trg_wiki_session_finished',
    sql: `
      CREATE TRIGGER IF NOT EXISTS trg_wiki_session_finished
      AFTER UPDATE OF outcome ON game_sessions
      WHEN NEW.outcome IS NOT NULL AND OLD.outcome IS NULL
        AND EXISTS (
          SELECT 1 FROM daily_challenges dc
          WHERE dc.id = NEW.challenge_id AND dc.media_type = 'wiki'
        )
      BEGIN
        UPDATE wiki_global_stats SET
          total_games     = total_games + 1,
          total_wins      = total_wins  + (CASE WHEN NEW.outcome = 'won' THEN 1 ELSE 0 END),
          total_losses    = total_losses + (CASE WHEN NEW.outcome = 'lost' THEN 1 ELSE 0 END),
          wins_by_attempt = CASE WHEN NEW.outcome = 'won' THEN
            json_set(wins_by_attempt, '$.' || CAST(json_array_length(NEW.attempts) AS TEXT),
              COALESCE(json_extract(wins_by_attempt, '$.' || CAST(json_array_length(NEW.attempts) AS TEXT)), 0) + 1)
          ELSE wins_by_attempt END,
          last_updated    = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
        WHERE id = 1;
      END
    `,
  },
  {
    name: 'add_generic_to_wiki_person_types',
    sql: `
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS wiki_persons_v3;
      CREATE TABLE wiki_persons_v3 (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        name            TEXT NOT NULL,
        name_lower      TEXT NOT NULL GENERATED ALWAYS AS (lower(name)) STORED,
        name_aliases    TEXT NOT NULL DEFAULT '[]',
        person_type     TEXT NOT NULL DEFAULT 'generic' CHECK (person_type IN ('politician','sportsperson','artist','scientist','entrepreneur','writer','historical_figure','generic')),
        wikipedia_slug  TEXT NOT NULL UNIQUE,
        infobox_data    TEXT NOT NULL DEFAULT '{}',
        hint_schedule   TEXT NOT NULL DEFAULT '[]',
        photo_url       TEXT,
        extract         TEXT,
        wikipedia_url   TEXT,
        difficulty      INTEGER NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
        is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );
      INSERT OR IGNORE INTO wiki_persons_v3
        (id, name, name_aliases, person_type, wikipedia_slug, infobox_data, hint_schedule, photo_url, extract, wikipedia_url, difficulty, is_active, created_at, updated_at)
        SELECT id, name, name_aliases, person_type, wikipedia_slug, infobox_data, hint_schedule, photo_url, extract, wikipedia_url, difficulty, is_active, created_at, updated_at
        FROM wiki_persons;
      DROP TABLE wiki_persons;
      ALTER TABLE wiki_persons_v3 RENAME TO wiki_persons;
      CREATE INDEX IF NOT EXISTS idx_wiki_persons_name_lower ON wiki_persons (name_lower);
      CREATE INDEX IF NOT EXISTS idx_wiki_persons_person_type ON wiki_persons (person_type);
      CREATE INDEX IF NOT EXISTS idx_wiki_persons_is_active ON wiki_persons (is_active);
      PRAGMA foreign_keys = ON;
    `,
  },
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
    const cols = db.prepare(`PRAGMA table_info(daily_challenges)`).all() as { name: string }[]
    if (name === 'add_media_type_to_daily_challenges' && cols.some((c) => c.name === 'media_type')) {
      continue
    }
    if (name === 'add_wiki_person_id_to_daily_challenges' && cols.some((c) => c.name === 'wiki_person_id')) {
      continue
    }
    if (name === 'create_trg_wiki_session_finished') {
      const triggers = db.prepare(`SELECT name FROM sqlite_master WHERE type='trigger' AND name='trg_wiki_session_finished'`).all()
      if (triggers.length > 0) continue
    }
    if (name === 'expand_wiki_person_type_values') {
      const row = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='wiki_persons'`).get() as { sql?: string } | undefined
      const sql = row?.sql ?? ''
      if (sql.includes("'artist'") && sql.includes("'historical_figure'")) continue
    }
    if (name === 'add_generic_to_wiki_person_types') {
      const row = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='wiki_persons'`).get() as { sql?: string } | undefined
      const sql = row?.sql ?? ''
      if (sql.includes("'generic'")) continue
    }
    db.exec(sql)
    console.log(`  ✓ ${name}`)
  } catch (err) {
    console.error(`  ✗ ${name}:`, err)
  }
}

console.log('Migrations complete.');

db.close();
