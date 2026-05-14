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

// ─── Schema migrations tracking table ────────────────────────────────────────
db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
)`);

function isApplied(name: string): boolean {
  const row = db.prepare(`SELECT 1 FROM schema_migrations WHERE name = ?`).get(name);
  return row != null;
}

function markApplied(name: string) {
  db.prepare(`INSERT OR IGNORE INTO schema_migrations (name) VALUES (?)`).run(name);
}

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
  {
    name: 'create_active_admin_tokens',
    sql: `CREATE TABLE IF NOT EXISTS active_admin_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      expires_at TEXT NOT NULL,
      revoked_at TEXT
    )`,
  },
  {
    name: 'create_active_admin_tokens_idx_hash',
    sql: `CREATE INDEX IF NOT EXISTS idx_admin_tokens_hash ON active_admin_tokens (token_hash)`,
  },
  {
    name: 'add_is_active_to_daily_challenges',
    sql: `ALTER TABLE daily_challenges ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))`,
  },
  {
    name: 'create_daily_challenges_idx_is_active',
    sql: `CREATE INDEX IF NOT EXISTS idx_daily_challenges_is_active ON daily_challenges (is_active)`,
  },
  {
    name: 'create_sparql_cache',
    sql: `CREATE TABLE IF NOT EXISTS sparql_cache (
      key        TEXT NOT NULL PRIMARY KEY,
      slugs_json TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )`,
  },
  {
    name: 'create_wiki_prefetch_pool',
    sql: `CREATE TABLE IF NOT EXISTS wiki_prefetch_pool (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      lang          TEXT NOT NULL,
      min_fame      INTEGER NOT NULL,
      source_slug   TEXT NOT NULL,
      resolved_slug TEXT,
      status        TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','ready','failed')),
      payload_json  TEXT,
      error_message TEXT,
      expires_at    INTEGER NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      UNIQUE(lang, min_fame, source_slug)
    )`,
  },
  {
    name: 'create_wiki_prefetch_pool_idx_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_wiki_prefetch_pool_status ON wiki_prefetch_pool (lang, min_fame, status, expires_at)`,
  },
  {
    name: 'create_wiki_prefetch_pool_idx_updated_at',
    sql: `CREATE INDEX IF NOT EXISTS idx_wiki_prefetch_pool_updated_at ON wiki_prefetch_pool (updated_at)`,
  },
  {
    name: 'create_app_settings',
    sql: `CREATE TABLE IF NOT EXISTS app_settings (
      key        TEXT NOT NULL PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )`,
  },
  {
    name: 'seed_wiki_prefetch_enabled',
    sql: `INSERT OR IGNORE INTO app_settings (key, value) VALUES ('wiki_prefetch_enabled', '1')`,
  },
  {
    name: 'add_hint_schedule_to_films',
    sql: `ALTER TABLE films ADD COLUMN hint_schedule TEXT NOT NULL DEFAULT '["year","director","cast"]'`,
  },
  {
    name: 'add_hint_schedule_to_series',
    sql: `ALTER TABLE series ADD COLUMN hint_schedule TEXT NOT NULL DEFAULT '["year","creator","cast"]'`,
  },
  {
    name: 'create_users',
    sql: `CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT UNIQUE,
      password_hash TEXT,
      display_name  TEXT NOT NULL,
      avatar_url    TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      is_banned     INTEGER NOT NULL DEFAULT 0,
      stats_games_played INTEGER DEFAULT 0,
      stats_wins         INTEGER DEFAULT 0,
      stats_streak       INTEGER DEFAULT 0,
      stats_max_streak   INTEGER DEFAULT 0
    )`,
  },
  {
    name: 'create_oauth_accounts',
    sql: `CREATE TABLE IF NOT EXISTS oauth_accounts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider    TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      UNIQUE(provider, provider_id)
    )`,
  },
  {
    name: 'create_user_sessions',
    sql: `CREATE TABLE IF NOT EXISTS user_sessions (
      id         TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  {
    name: 'create_user_sessions_idx_user_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id)`,
  },
  {
    name: 'create_user_sessions_idx_expires_at',
    sql: `CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions (expires_at)`,
  },
  {
    name: 'add_user_id_to_game_sessions',
    sql: `ALTER TABLE game_sessions ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`,
  },
  {
    name: 'create_wiki_sessions',
    sql: `CREATE TABLE IF NOT EXISTS wiki_sessions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      session_token   TEXT NOT NULL,
      challenge_id    INTEGER NOT NULL REFERENCES daily_challenges (id) ON DELETE CASCADE,
      attempts        TEXT NOT NULL DEFAULT '[]',
      hints_revealed  INTEGER NOT NULL DEFAULT 0,
      outcome         TEXT CHECK (outcome IN ('won', 'lost')),
      started_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      finished_at     TEXT,
      user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE (session_token, challenge_id)
    )`,
  },
  {
    name: 'create_wiki_sessions_idx_token',
    sql: `CREATE INDEX IF NOT EXISTS idx_wiki_sessions_token ON wiki_sessions (session_token)`,
  },
  {
    name: 'create_wiki_sessions_idx_challenge',
    sql: `CREATE INDEX IF NOT EXISTS idx_wiki_sessions_challenge ON wiki_sessions (challenge_id)`,
  },
  {
    name: 'create_wiki_sessions_idx_outcome',
    sql: `CREATE INDEX IF NOT EXISTS idx_wiki_sessions_outcome ON wiki_sessions (outcome)`,
  },
  {
    name: 'create_wiki_sessions_idx_user_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_wiki_sessions_user_id ON wiki_sessions (user_id)`,
  },
  {
    name: 'add_email_verified_to_users',
    sql: `ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`,
  },
  {
    name: 'create_password_reset_tokens',
    sql: `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at    TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  {
    name: 'create_password_reset_tokens_idx',
    sql: `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens (token_hash)`,
  },
  {
    name: 'create_email_verification_tokens',
    sql: `CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at    TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  {
    name: 'create_email_verification_tokens_idx',
    sql: `CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_hash ON email_verification_tokens (token_hash)`,
  },
  {
    name: 'create_user_challenge_results',
    sql: `CREATE TABLE IF NOT EXISTS user_challenge_results (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_id INTEGER NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
      media_type   TEXT NOT NULL,
      attempts_used INTEGER NOT NULL,
      won          INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, challenge_id)
    )`,
  },
  {
    name: 'create_user_challenge_results_idx_user_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_ucr_user_id ON user_challenge_results (user_id, completed_at DESC)`,
  },
  {
    name: 'add_friend_code_to_users',
    sql: `ALTER TABLE users ADD COLUMN friend_code TEXT`,
  },
  {
    name: 'create_friendships',
    sql: `CREATE TABLE IF NOT EXISTS friendships (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       TEXT NOT NULL CHECK(status IN ('pending','accepted')) DEFAULT 'pending',
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    UNIQUE(requester_id, addressee_id)
  )`,
  },
  {
    name: 'create_friendships_idx',
    sql: `CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships (addressee_id, status)`,
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
        is_active        INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
        UNIQUE (challenge_date, media_type)
      );
      INSERT OR IGNORE INTO daily_challenges_v3
        (id, challenge_date, media_type, film_id, series_id, wiki_person_id, challenge_number, hint_schedule, is_active, created_at)
        SELECT id, challenge_date, media_type, film_id, series_id, NULL, challenge_number, hint_schedule, COALESCE(is_active, 1), created_at
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
        is_active        INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
        UNIQUE (challenge_date, media_type)
      );
      INSERT OR IGNORE INTO daily_challenges_v2
        (id, challenge_date, media_type, film_id, series_id, challenge_number, hint_schedule, is_active, created_at)
        SELECT id, challenge_date,
          CASE WHEN series_id IS NOT NULL THEN 'series' ELSE 'film' END,
          film_id, series_id, challenge_number, hint_schedule, COALESCE(is_active, 1), created_at
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

// ─── Incremental migrations (single-statement, idempotent) ───────────────────

for (const { name, sql } of incremental) {
  if (isApplied(name)) {
    console.log(`  – ${name} (already applied)`)
    continue
  }
  try {
    db.prepare(sql).run()
    markApplied(name)
    console.log(`  ✓ ${name}`)
  } catch {
    // column/index already exists on a DB that predates schema_migrations — mark as applied
    markApplied(name)
  }
}

// ─── Multi-statement migrations (wrapped in transactions) ────────────────────

for (const { name, sql } of multiStatement) {
  if (isApplied(name)) {
    console.log(`  – ${name} (already applied)`)
    continue
  }

  // Legacy idempotency guards for DBs that predate schema_migrations tracking
  const cols = db.prepare(`PRAGMA table_info(daily_challenges)`).all() as { name: string }[]
  if (name === 'add_media_type_to_daily_challenges' && cols.some((c) => c.name === 'media_type')) {
    markApplied(name); continue
  }
  if (name === 'add_wiki_person_id_to_daily_challenges' && cols.some((c) => c.name === 'wiki_person_id')) {
    markApplied(name); continue
  }
  if (name === 'create_trg_wiki_session_finished') {
    const triggers = db.prepare(`SELECT name FROM sqlite_master WHERE type='trigger' AND name='trg_wiki_session_finished'`).all()
    if (triggers.length > 0) { markApplied(name); continue }
  }
  if (name === 'expand_wiki_person_type_values') {
    const row = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='wiki_persons'`).get() as { sql?: string } | undefined
    const tableSql = row?.sql ?? ''
    if (tableSql.includes("'artist'") && tableSql.includes("'historical_figure'")) { markApplied(name); continue }
  }
  if (name === 'add_generic_to_wiki_person_types') {
    const row = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='wiki_persons'`).get() as { sql?: string } | undefined
    const tableSql = row?.sql ?? ''
    if (tableSql.includes("'generic'")) { markApplied(name); continue }
  }

  try {
    db.transaction(() => { db.exec(sql) })()
    markApplied(name)
    console.log(`  ✓ ${name}`)
  } catch (err) {
    console.error(`  ✗ ${name} — rolled back:`, err)
  }
}

const postMultiStatementIncremental: { name: string; sql: string }[] = [
  {
    name: 'create_push_tokens',
    sql: `CREATE TABLE IF NOT EXISTS push_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT    NOT NULL,
      platform   TEXT    NOT NULL CHECK (platform IN ('ios', 'android')),
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, platform)
    )`,
  },
  {
    name: 'repair_daily_challenges_is_active_after_table_recreate',
    sql: `ALTER TABLE daily_challenges ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))`,
  },
  {
    name: 'repair_daily_challenges_idx_is_active_after_recreate',
    sql: `CREATE INDEX IF NOT EXISTS idx_daily_challenges_is_active ON daily_challenges (is_active)`,
  },
]

for (const { name, sql } of postMultiStatementIncremental) {
  if (isApplied(name)) {
    console.log(`  – ${name} (already applied)`)
    continue
  }
  try {
    db.prepare(sql).run()
    markApplied(name)
    console.log(`  ✓ ${name}`)
  } catch {
    markApplied(name)
  }
}

console.log('Migrations complete.');

db.close();
