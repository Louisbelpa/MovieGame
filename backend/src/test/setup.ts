/**
 * Vitest global setup for integration tests.
 * Runs schema creation on the in-memory SQLite DB before any test.
 * Cleans data tables between tests (respecting FK order).
 */

import { beforeAll, afterEach } from 'vitest';
import db from '../db/database.js';

// ─── Full schema for :memory: DB ─────────────────────────────────────────────
// Mirrors the latest production schema (schema.sql + all migrations).

const SCHEMA = /* sql */ `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS films (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  title_lower     TEXT NOT NULL GENERATED ALWAYS AS (lower(title)) STORED,
  title_aliases   TEXT NOT NULL DEFAULT '[]',
  year            INTEGER NOT NULL,
  director        TEXT NOT NULL,
  genres          TEXT NOT NULL DEFAULT '[]',
  cast_members    TEXT NOT NULL DEFAULT '[]',
  tagline         TEXT,
  synopsis        TEXT,
  image_url       TEXT NOT NULL,
  image_blurred_url TEXT,
  tmdb_id         INTEGER UNIQUE,
  imdb_id         TEXT,
  fame_level      INTEGER NOT NULL DEFAULT 3 CHECK (fame_level BETWEEN 1 AND 5),
  is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_films_title_lower ON films (title_lower);
CREATE INDEX IF NOT EXISTS idx_films_is_active   ON films (is_active);

CREATE TABLE IF NOT EXISTS series (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  title_lower     TEXT NOT NULL GENERATED ALWAYS AS (lower(title)) STORED,
  title_aliases   TEXT NOT NULL DEFAULT '[]',
  year            INTEGER NOT NULL,
  creator         TEXT NOT NULL,
  genres          TEXT NOT NULL DEFAULT '[]',
  cast_members    TEXT NOT NULL DEFAULT '[]',
  tagline         TEXT,
  synopsis        TEXT,
  image_url       TEXT NOT NULL,
  image_blurred_url TEXT,
  tmdb_id         INTEGER UNIQUE,
  number_of_seasons INTEGER,
  network         TEXT,
  status          TEXT,
  original_language TEXT,
  fame_level      INTEGER NOT NULL DEFAULT 3 CHECK (fame_level BETWEEN 1 AND 5),
  is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_series_title_lower ON series (title_lower);
CREATE INDEX IF NOT EXISTS idx_series_is_active   ON series (is_active);

CREATE TABLE IF NOT EXISTS wiki_persons (
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

CREATE INDEX IF NOT EXISTS idx_wiki_persons_name_lower  ON wiki_persons (name_lower);
CREATE INDEX IF NOT EXISTS idx_wiki_persons_person_type ON wiki_persons (person_type);
CREATE INDEX IF NOT EXISTS idx_wiki_persons_is_active   ON wiki_persons (is_active);

CREATE TABLE IF NOT EXISTS daily_challenges (
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

CREATE INDEX IF NOT EXISTS idx_daily_challenges_date           ON daily_challenges (challenge_date);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_film_id        ON daily_challenges (film_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_series_id      ON daily_challenges (series_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_wiki_person_id ON daily_challenges (wiki_person_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_media_type     ON daily_challenges (media_type);

CREATE TABLE IF NOT EXISTS game_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token   TEXT NOT NULL,
  challenge_id    INTEGER NOT NULL REFERENCES daily_challenges (id) ON DELETE CASCADE,
  attempts        TEXT NOT NULL DEFAULT '[]',
  hints_revealed  INTEGER NOT NULL DEFAULT 0,
  outcome         TEXT CHECK (outcome IN ('won', 'lost')),
  started_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  finished_at     TEXT,
  UNIQUE (session_token, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_token     ON game_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_challenge ON game_sessions (challenge_id);
CREATE INDEX IF NOT EXISTS idx_sessions_outcome   ON game_sessions (outcome);

CREATE TABLE IF NOT EXISTS global_stats (
  id              INTEGER PRIMARY KEY CHECK (id = 1),
  total_games     INTEGER NOT NULL DEFAULT 0,
  total_wins      INTEGER NOT NULL DEFAULT 0,
  total_losses    INTEGER NOT NULL DEFAULT 0,
  wins_by_attempt TEXT NOT NULL DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0}',
  last_updated    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

INSERT OR IGNORE INTO global_stats (id) VALUES (1);

CREATE TABLE IF NOT EXISTS wiki_global_stats (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  total_games   INTEGER NOT NULL DEFAULT 0,
  total_wins    INTEGER NOT NULL DEFAULT 0,
  total_losses  INTEGER NOT NULL DEFAULT 0,
  wins_by_attempt TEXT NOT NULL DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}',
  last_updated  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

INSERT OR IGNORE INTO wiki_global_stats (id) VALUES (1);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  action     TEXT NOT NULL,
  details    TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS active_admin_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS changelog (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  version      TEXT NOT NULL,
  release_date TEXT NOT NULL,
  changes      TEXT NOT NULL DEFAULT '[]',
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TRIGGER IF NOT EXISTS trg_session_finished
AFTER UPDATE OF outcome ON game_sessions
WHEN NEW.outcome IS NOT NULL AND OLD.outcome IS NULL
BEGIN
  UPDATE global_stats
  SET
    total_games     = total_games + 1,
    total_wins      = total_wins  + (CASE WHEN NEW.outcome = 'won' THEN 1 ELSE 0 END),
    total_losses    = total_losses + (CASE WHEN NEW.outcome = 'lost' THEN 1 ELSE 0 END),
    wins_by_attempt = CASE
      WHEN NEW.outcome = 'won' THEN
        json_set(
          wins_by_attempt,
          '$.' || CAST(json_array_length(NEW.attempts) AS TEXT),
          COALESCE(
            json_extract(wins_by_attempt, '$.' || CAST(json_array_length(NEW.attempts) AS TEXT)),
            0
          ) + 1
        )
      ELSE wins_by_attempt
    END,
    last_updated = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  WHERE id = 1;
END;

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
END;
`;

beforeAll(() => {
  db.exec(SCHEMA);
});

afterEach(() => {
  // Delete in FK-safe order (children before parents)
  db.exec(`
    DELETE FROM game_sessions;
    DELETE FROM active_admin_tokens;
    DELETE FROM audit_logs;
    DELETE FROM daily_challenges;
    DELETE FROM films;
    DELETE FROM series;
    DELETE FROM wiki_persons;
    DELETE FROM changelog;
    -- Reset stats to zero
    UPDATE global_stats SET total_games=0, total_wins=0, total_losses=0, wins_by_attempt='{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0}', last_updated=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id=1;
    UPDATE wiki_global_stats SET total_games=0, total_wins=0, total_losses=0, wins_by_attempt='{"1":0,"2":0,"3":0,"4":0,"5":0}', last_updated=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id=1;
  `);
});
