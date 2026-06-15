# Référence architecture — GuessToday

Détail complet de l'arborescence, du schéma DB, des variables d'env, des types et du déploiement. Le CLAUDE.md ne garde que les invariants ; ici se trouve la matière de référence.

## Arborescence détaillée

```
/
├── src/                          # Frontend React + TypeScript
│   ├── api/                      # client.ts (HTTP typé), wikiClient.ts (/api/wiki/*)
│   ├── store/                    # gameStore.ts (films/séries), wikiStore.ts (Zustand)
│   ├── lib/                      # utils.ts, storage.ts
│   ├── types/index.ts            # Types partagés frontend
│   ├── config/features.ts        # Feature flags
│   ├── components/
│   │   ├── game/                 # GamePage, DateNavBar, HintPanel, GuessInput, ModeTabs…
│   │   ├── wiki/                 # WikiGamePage, WikiHintPanel, WikiGuessInput, modals
│   │   ├── modals/               # WinModal, LoseModal, StatsModal, RulesModal
│   │   ├── layout/               # Header, Footer
│   │   └── ui/                   # Button, Badge, Modal, Spinner
│   ├── hooks/                    # useAutocomplete, useKeyboard
│   ├── App.tsx                   # Entrée films/séries (contient <ModeTabs />)
│   ├── WikiApp.tsx               # Entrée mode Wikipedia
│   └── admin/                    # Back office (pages, components, api.ts)
│
├── backend/
│   ├── src/
│   │   ├── routes/               # challenge, films, series, stats, admin, wiki-challenge, auth, friends
│   │   ├── services/             # challenge.service, wiki-challenge.service, push-notification.service
│   │   ├── lib/                  # wikipedia.ts (parser + Wikidata), matching.ts, dates.ts
│   │   ├── config/               # uploads.ts
│   │   ├── middleware/           # session, rateLimiter, adminAuth, errorHandler, auditLog, requestId
│   │   └── db/                   # schema.sql, migrate.ts, database.ts
│   └── scripts/                  # seed, reset, backup, fetch-backdrops, backfill-wiki-persons, check-wiki-parser
│
└── mobile/
    ├── ios/GuessToday/           # SwiftUI (iOS 17+)
    │   ├── App/                  # GuessTodayApp, RootView, NotificationManager, SoundManager
    │   ├── Networking/           # APIClient.swift, Models.swift, StatsManager.swift
    │   ├── Features/             # Game, Archive, Auth, Friends, Home, Profile
    │   └── UI/                   # Theme.swift, BlurImageView, HintCard, GuessRow, SearchDropdown
    └── android/                  # Jetpack Compose (Android 8+, minSdk 26)
        └── app/src/main/kotlin/fr/guesstoday/
            ├── data/api/         # ApiService.kt, ApiModels.kt
            ├── data/network/     # NetworkModule.kt (Hilt + OkHttp CookieJar)
            ├── data/prefs/       # SessionManager.kt
            ├── data/push/        # PushNotificationService.kt (FCM)
            ├── features/         # game, archive, auth, friends, profile
            ├── navigation/       # AppNavigation.kt
            └── ui/theme/         # Color.kt, Theme.kt, Type.kt
```

## Schéma base de données (SQLite)

13 tables — toutes créées/mises à jour par `npm run db:migrate` (idempotent). Source de vérité : `backend/src/db/schema.sql`.

| Table | Rôle | Champs clés |
|-------|------|-------------|
| `films` | Catalogue films | `title`, `title_aliases` (JSON), `year`, `director`, `genres`/`cast_members` (JSON), `image_url`, `image_blurred_url`, `tmdb_id`, `fame_level` 1–5, `hint_schedule` (JSON), `is_active` |
| `series` | Catalogue séries | Idem + `creator`, `number_of_seasons`, `network`, `status`, `original_language` |
| `wiki_persons` | Personnalités Wikipedia | `slug_fr`, `slug_en`, `name`, `person_type` (8 valeurs), `infobox_data` (JSON), `hint_schedule` (JSON sans préfixe), `photo_url` |
| `daily_challenges` | Planning quotidien | `challenge_date` (YYYY-MM-DD), `media_type` (film/series/wiki), `film_id`/`series_id`/`wiki_person_id`, `is_active` (soft-delete), `challenge_number` |
| `game_sessions` | Sessions jeu films/séries | `session_token`, `challenge_id`, `user_id` (nullable), `attempts` (JSON), `status`, `completed_at` |
| `wiki_sessions` | Sessions jeu wiki | Même structure que `game_sessions` |
| `users` | Comptes joueurs | `email`, `display_name`, `avatar_url`, `email_verified`, `password_hash`, `friend_code` |
| `oauth_accounts` | Liens OAuth (Google/Apple) | `user_id`, `provider`, `provider_sub` |
| `user_sessions` | Sessions auth joueurs | `user_id`, `session_token`, `expires_at` |
| `active_admin_tokens` | Auth admin | `token_hash` (SHA-256), `expires_at`, `revoked_at` |
| `global_stats` | Stats agrégées communauté | Compteurs wins/losses/attempts par challenge |
| `audit_logs` | Traçabilité admin | `action`, `entity_type`, `entity_id`, `admin_user`, `details` (JSON) |
| `challenge_reviews` | Modération défis | `challenge_id`, `status`, `notes` |

- **Colonnes JSON** (lire/écrire comme strings JSON) : `title_aliases`, `genres`, `cast_members`, `hint_schedule`, `infobox_data`, `attempts`.
- **`is_active = 0`** = soft-delete (jamais supprimé physiquement). Filtrer systématiquement dans les requêtes publiques.
- **`game_sessions.user_id` / `wiki_sessions.user_id`** — nullable ; rempli si connecté. Réconcilie les sessions anonymes avec un compte lors de l'import stats.

## Types frontend clés (`src/types/index.ts`)

```ts
type GuessStatus = 'correct' | 'wrong' | 'skipped'
type GameStatus  = 'idle' | 'playing' | 'won' | 'lost' | 'not_found'
type HintType    = 'year' | 'genre' | 'director' | 'creator' | 'actor' | 'synopsis' | 'country'
type MediaType   = 'film' | 'series' | 'wiki'

// blurLevels: index 0 = max flou, index 5 = image nette — e.g. [24, 18, 12, 8, 4, 0]
interface DailyChallenge { blurLevels: number[]; hints: Hint[]; ... }
// Persisté en localStorage — challengeId sert à détecter le changement de jour
interface PersistedGameState { challengeId: string; guesses: GuessEntry[]; status: GameStatus; blurIndex: number; ... }
```

`image_blurred_url` = version basse résolution optionnelle servie avant la révélation. Si absente, l'image principale est floutée via CSS.

## Feature flags (`src/config/features.ts`)

```ts
export const FEATURES = {
  enableSeries: envFlag(VITE_ENABLE_SERIES, false),  // défaut: films only
  enableWiki:   envFlag(VITE_ENABLE_WIKI,   true),   // défaut: wiki activé
}
export const BRAND_NAME      = 'GuessToday'
export const PUBLIC_SITE_URL = VITE_PUBLIC_SITE_URL || 'https://guesstoday.fr'
```

## Variables d'environnement

### Frontend (`/.env`)

| Variable | Défaut | Description |
|----------|--------|-------------|
| `VITE_ENABLE_SERIES` | `false` | `false` = films only (UI/routes séries masquées), `true` = films + séries |
| `VITE_ENABLE_WIKI` | `true` | Active/désactive le mode WikiGuessr (route `/wiki`, tab Homepage) |
| `VITE_API_URL` | *(vide)* | Préfixe API si frontend non servi même origine que le backend |

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Port Express (défaut: 3001) |
| `DATABASE_PATH` | Chemin SQLite (défaut: `./data/moviegame.db`) |
| `COOKIE_SECRET` | Secret de signature des cookies de session |
| `ADMIN_PASSWORD` | Mot de passe back office |
| `ADMIN_USERNAME` | Identifiant back office (optionnel — si vide, login par mdp seul) |
| `CORS_ORIGIN` | Origines frontend autorisées (CSV) — normalisation d'origine côté `app.ts` |
| `TMDB_API_KEY` | Clé API TMDB (back office uniquement) |
| `IMAGE_SOURCE` | `tmdb` ou `local` |
| `MAX_ATTEMPTS` | Tentatives par défi films/séries (défaut: 5) |
| `WIKI_MAX_ATTEMPTS` | Tentatives par défi wiki (défaut: 5, optionnel) |
| `UPLOADS_DIRECTORY` | Dossier absolu des uploads admin (défaut `public/uploads` ; prod Docker `/data/uploads`) |
| `WIKI_PREFETCH_TARGET_READY` | Cible du pool admin « Au hasard » (défaut 24, max 400) |
| `WIKI_PREFETCH_MAX_FETCH_PER_RUN` | Fiches enrichies par passe (défaut 4, max 40) |
| `WIKI_PREFETCH_SPARQL_LIMIT` | Limite Wikidata SPARQL prefetch (absent : `max(100, TARGET_READY)` cap 800 ; défini : 50–800) |
| `PREFETCH_WARM_TOKEN` | Secret pour `POST /api/admin/prefetch/warm` (cron) |
| `APPLE_WEB_CLIENT_ID` | Client ID web Apple OAuth (`fr.guesstoday.web` par défaut) |
| `APNS_KEY_ID` / `APNS_TEAM_ID` / `APNS_KEY_P8` | Push APNs iOS (Key ID, Team ID 10 car., clé `.p8` en base64) |
| `FCM_SERVICE_ACCOUNT` | JSON service account Firebase en base64 (push Android) |
| `PUSH_BUNDLE_ID` | Bundle ID de l'app iOS (ex: `fr.guesstoday.app`) |

## Middleware backend (`backend/src/middleware/`)

| Fichier | Rôle |
|---------|------|
| `adminAuth.ts` | Vérifie cookie `admin_token` → lookup `active_admin_tokens` (non révoqué, non expiré) |
| `session.ts` | Cookie de session joueur (httpOnly, signé) — `userAuth` + `requireUser` |
| `rateLimiter.ts` | 5 limiteurs : `API`, `GUESS`, `SEARCH`, `ADMIN`, `LOGIN` |
| `errorHandler.ts` | Catch-all Express → JSON `{ error, message }` + log pino |
| `auditLog.ts` | Log les actions admin dans `audit_logs` |
| `requestId.ts` | Injecte `X-Request-Id` |

## Déploiement

**Dockerfile** (3 stages) : `frontend-builder` (`npm run build` → `backend/public/`) → `backend-builder` (compile TS + `better-sqlite3`, requiert python3/make/g++) → `runtime` (Node 20 Alpine, `prune --omit=dev`, expose 3001).

**Railway** — `railway.json` + `railway.toml` à la racine. Volume `/data` pour DB + uploads en prod (`DATABASE_PATH=/data/moviegame.db`, `UPLOADS_DIRECTORY=/data/uploads`).

**Build local complet** : `npm run build` (frontend → `backend/public/`) puis `cd backend && npm run build` (backend → `backend/dist/`).
