-- =============================================================================
--  MovieGame – Database Schema (SQLite)
--  Run via: tsx src/db/migrate.ts
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- films
--   One row per movie. Indices are stored as structured JSON so the table
--   stays schema-flexible; partial indices can be revealed one by one.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS films (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Canonical title used for answer comparison (normalised, lowercase stored
    -- alongside for fast search without COLLATE overhead)
    title           TEXT NOT NULL,
    title_lower     TEXT NOT NULL GENERATED ALWAYS AS (lower(title)) STORED,

    -- Alternative accepted titles (JSON array of strings).
    -- e.g. '["Le Seigneur des Anneaux", "LOTR"]'
    title_aliases   TEXT NOT NULL DEFAULT '[]',

    -- Release year – shown as first hint once game is over
    year            INTEGER NOT NULL,

    -- Director name – revealed as hint #3
    director        TEXT NOT NULL,

    -- Genre tags (JSON array). e.g. '["Action","Science-Fiction"]'
    genres          TEXT NOT NULL DEFAULT '[]',

    -- Cast members (JSON array, top 3–5). e.g. '["Tom Hanks","Robin Wright"]'
    cast_members    TEXT NOT NULL DEFAULT '[]',

    -- Tagline / short catchphrase – revealed as hint #4
    tagline         TEXT,

    -- Synopsis excerpt (1–2 sentences) – revealed as hint #5
    synopsis        TEXT,

    -- Image path or TMDB path (e.g. "/abc123.jpg") depending on IMAGE_SOURCE
    image_url       TEXT NOT NULL,

    -- Optional: blurred / low-res version shown before full reveal
    image_blurred_url TEXT,

    -- TMDB / IMDB identifiers for future enrichment
    tmdb_id         INTEGER UNIQUE,
    imdb_id         TEXT,

    -- Soft-delete / visibility flag
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),

    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_films_title_lower ON films (title_lower);
CREATE INDEX IF NOT EXISTS idx_films_tmdb_id     ON films (tmdb_id);
CREATE INDEX IF NOT EXISTS idx_films_is_active   ON films (is_active);

-- ---------------------------------------------------------------------------
-- daily_challenges
--   Maps one calendar date (UTC, YYYY-MM-DD) to one film.
--   A unique constraint on challenge_date guarantees one film per day.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_challenges (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,

    -- ISO date string, always UTC: '2025-04-25'
    challenge_date  TEXT NOT NULL UNIQUE,

    film_id         INTEGER NOT NULL REFERENCES films (id) ON DELETE RESTRICT,

    -- Challenge number shown to players ("Day #42")
    challenge_number INTEGER NOT NULL,

    -- Pre-computed hint reveal schedule (JSON array, ordered).
    -- Overrides defaults if curators want custom ordering.
    -- e.g. ["image_blurred","year","director","genres","cast","tagline","synopsis"]
    hint_schedule   TEXT NOT NULL DEFAULT '["image_blurred","year","director","genres","cast","tagline","synopsis"]',

    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_date    ON daily_challenges (challenge_date);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_film_id ON daily_challenges (film_id);

-- ---------------------------------------------------------------------------
-- game_sessions
--   One row per player per day.  No user account required; identity is
--   tracked via a signed HTTP-only cookie that contains session_token.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_sessions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,

    -- UUID v4 stored in cookie (httpOnly, signed)
    session_token   TEXT NOT NULL,

    challenge_id    INTEGER NOT NULL REFERENCES daily_challenges (id) ON DELETE CASCADE,

    -- JSON array of attempt objects, max MAX_ATTEMPTS entries.
    -- e.g. [{"guess":"Titanic","correct":false,"ts":"2025-04-25T08:12:00Z"}]
    attempts        TEXT NOT NULL DEFAULT '[]',

    -- Number of hints the player has requested (0–6)
    hints_revealed  INTEGER NOT NULL DEFAULT 0,

    -- NULL = in progress | 'won' | 'lost'
    outcome         TEXT CHECK (outcome IN ('won', 'lost')),

    -- Timestamps
    started_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    finished_at     TEXT,

    -- Composite unique: one session_token can only play each challenge once
    UNIQUE (session_token, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_token       ON game_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_challenge   ON game_sessions (challenge_id);
CREATE INDEX IF NOT EXISTS idx_sessions_outcome     ON game_sessions (outcome);

-- ---------------------------------------------------------------------------
-- global_stats  (materialised, updated on each finished session)
--   Single-row table; avoids expensive aggregation queries on every /stats
--   call. Updated via a trigger after game_sessions.outcome is set.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS global_stats (
    id                  INTEGER PRIMARY KEY CHECK (id = 1),  -- enforces single row
    total_games         INTEGER NOT NULL DEFAULT 0,
    total_wins          INTEGER NOT NULL DEFAULT 0,
    total_losses        INTEGER NOT NULL DEFAULT 0,
    -- Wins by number of attempts (JSON: {"1":0,"2":0,"3":0,"4":0,"5":0,"6":0})
    wins_by_attempt     TEXT    NOT NULL DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0}',
    last_updated        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Seed the single stats row
INSERT OR IGNORE INTO global_stats (id) VALUES (1);

-- ---------------------------------------------------------------------------
-- Trigger: update global_stats when a session is finished.
-- wins_by_attempt JSON key is the number of attempts used (1-6).
-- We use json_set to update only the matching bucket atomically.
-- ---------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_session_finished
AFTER UPDATE OF outcome ON game_sessions
WHEN NEW.outcome IS NOT NULL AND OLD.outcome IS NULL
BEGIN
    UPDATE global_stats
    SET
        total_games      = total_games + 1,
        total_wins       = total_wins  + (CASE WHEN NEW.outcome = 'won' THEN 1 ELSE 0 END),
        total_losses     = total_losses + (CASE WHEN NEW.outcome = 'lost' THEN 1 ELSE 0 END),
        -- Increment wins_by_attempt[attemptCount] only on a win
        wins_by_attempt  = CASE
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
        last_updated     = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    WHERE id = 1;
END;
