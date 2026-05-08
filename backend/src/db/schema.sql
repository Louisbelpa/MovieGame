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

    -- Celebrity level 1–5 (1 = niche, 5 = blockbuster). Used to gauge difficulty.
    fame_level      INTEGER NOT NULL DEFAULT 3 CHECK (fame_level BETWEEN 1 AND 5),

    -- Soft-delete / visibility flag
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),

    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_films_title_lower ON films (title_lower);
CREATE INDEX IF NOT EXISTS idx_films_tmdb_id     ON films (tmdb_id);
CREATE INDEX IF NOT EXISTS idx_films_is_active   ON films (is_active);

-- ---------------------------------------------------------------------------
-- series
--   One row per TV series. Same structure as films with series-specific fields.
--   Uses "creator" instead of "director".
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS series (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,

    title           TEXT NOT NULL,
    title_lower     TEXT NOT NULL GENERATED ALWAYS AS (lower(title)) STORED,

    title_aliases   TEXT NOT NULL DEFAULT '[]',

    -- First air date year
    year            INTEGER NOT NULL,

    -- Show creator(s) – revealed as hint #3
    creator         TEXT NOT NULL,

    genres          TEXT NOT NULL DEFAULT '[]',
    cast_members    TEXT NOT NULL DEFAULT '[]',

    tagline         TEXT,
    synopsis        TEXT,

    image_url       TEXT NOT NULL,
    image_blurred_url TEXT,

    tmdb_id         INTEGER UNIQUE,

    -- Series-specific fields
    number_of_seasons INTEGER,
    network         TEXT,
    status          TEXT,               -- 'En cours' | 'Terminée' | etc.
    original_language TEXT,

    fame_level      INTEGER NOT NULL DEFAULT 3 CHECK (fame_level BETWEEN 1 AND 5),
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),

    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_series_title_lower ON series (title_lower);
CREATE INDEX IF NOT EXISTS idx_series_tmdb_id     ON series (tmdb_id);
CREATE INDEX IF NOT EXISTS idx_series_is_active   ON series (is_active);

-- ---------------------------------------------------------------------------
-- daily_challenges
--   Maps one calendar date (UTC, YYYY-MM-DD) to one film OR one series.
--   Exactly one of film_id / series_id must be non-null (enforced by CHECK).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_challenges (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,

    -- ISO date string: '2025-04-25'
    challenge_date  TEXT NOT NULL,

    -- 'film' or 'series' — one challenge per (date, type)
    media_type      TEXT NOT NULL DEFAULT 'film' CHECK (media_type IN ('film', 'series')),

    film_id         INTEGER REFERENCES films (id) ON DELETE RESTRICT,
    series_id       INTEGER REFERENCES series (id) ON DELETE RESTRICT,

    -- Challenge number shown to players — sequenced per media_type
    challenge_number INTEGER NOT NULL,

    hint_schedule   TEXT NOT NULL DEFAULT '["year","director","cast"]',

    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

    UNIQUE (challenge_date, media_type)
);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_date      ON daily_challenges (challenge_date);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_film_id   ON daily_challenges (film_id);
-- series_id and media_type indexes created by incremental migrations after those columns are added

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
-- changelog  (managed via admin back office)
--   Each row is one release entry shown in the public changelog modal.
--   Ordered by created_at DESC (newest first).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS changelog (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    version      TEXT NOT NULL,
    release_date TEXT NOT NULL,
    changes      TEXT NOT NULL DEFAULT '[]',
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Seed initial entries (idempotent – only runs if the table was just created)
INSERT OR IGNORE INTO changelog (id, version, release_date, changes) VALUES
  (1, '1.2.0', 'Avril 2026',   '["Navigation dans les défis passés avec les flèches ◀ ▶","Bouton « En savoir plus » vers la page TMDB du film en fin de partie","Réinitialisation du jeu à minuit heure de Paris (corrigé)","Back office : recherche TMDB avec auto-remplissage des fiches film","Back office : connexion par identifiant + mot de passe","Back office : badge « Joué / Planifié » sur les films","Back office : responsive mobile","Footer : FAQ, politique de confidentialité, contact, changelog"]'),
  (2, '1.1.0', 'Mars 2026',    '["Tutoriel affiché à la première visite","Indices progressifs : année → réalisateur → acteur principal","Statistiques personnelles (victoires, séries, distribution)","Partage du résultat en grille emoji"]'),
  (3, '1.0.0', 'Janvier 2026', '["Lancement de CinéGuessr","Défi quotidien avec une image tirée d''un film","Autocomplétion des titres","Back office pour gérer les films et le planning"]');

-- ---------------------------------------------------------------------------
-- audit_logs  (trail of admin actions for security and debugging)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    action     TEXT NOT NULL,
    details    TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);

-- ---------------------------------------------------------------------------
-- active_admin_tokens (revocable admin sessions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS active_admin_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    expires_at TEXT NOT NULL,
    revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_tokens_hash ON active_admin_tokens (token_hash);

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
