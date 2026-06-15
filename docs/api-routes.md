# Routes API & sécurité backend — GuessToday

Toutes les routes préfixées `/api/`, sauf `/health`. Source de vérité : `backend/src/routes/*.ts`.

## Auth utilisateur (`routes/auth.ts`)

- Sessions par cookie httpOnly signé (`COOKIE_SECRET`) — partagé web + mobile (même domaine ou CORS configuré).
- Middleware `userAuth` + `requireUser` dans `backend/src/middleware/session.ts`.
- Tables : `users`, `oauth_accounts`, `user_sessions`.

| Route | Description |
|-------|-------------|
| `POST /api/auth/register` / `login` / `logout` / `me` | Cycle de vie session |
| `PUT /api/auth/profile` | displayName / avatarUrl |
| `POST /api/auth/avatar` | Upload multer |
| `POST /api/auth/change-password` / `forgot-password` / `reset-password` | Mot de passe |
| `GET /api/auth/verify-email` / `POST /api/auth/verify-email/send` | Vérification email |
| `POST /api/auth/apple` | Sign in with Apple (valide `identityToken` via `apple-signin-auth`) |
| `POST /api/auth/oauth/callback` | Callback générique Google/Apple |
| `POST /api/auth/push-token` | Enregistre token FCM/APNs `{ token, platform: 'ios'\|'android' }` |
| `GET /api/auth/stats` / `GET /api/auth/history` | Stats & historique par `media_type` |
| `POST /api/auth/import-stats` | Migration stats localStorage → compte |

Les stats serveur (`GET /api/auth/stats`) ont priorité sur SharedPreferences mobile si connecté.

## Amis & classement (`routes/friends.ts`, préfixe `/api/friends/`)

| Route | Description |
|-------|-------------|
| `GET /code` | Code ami personnel |
| `POST /add` | Ajoute par code |
| `POST /accept` | Accepte une demande |
| `DELETE /:userId` | Retire un ami |
| `GET /` | Liste amis + résultats du jour |
| `GET /leaderboard` | Classement global (`totalWins`, `filmWins`, `seriesWins`, `wikiWins`, `currentStreak`) |

Classement calculé côté serveur depuis `user_sessions` + `wiki_sessions`.

## Wiki (`routes/wiki-challenge.ts`, préfixe `/api/wiki/`)

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/wiki/today` | Défi du jour |
| `GET` | `/api/wiki/date/:date` | Défi d'une date passée |
| `GET` | `/api/wiki/adjacent?date=&direction=` | Date voisine (prev/next) |
| `POST` | `/api/wiki/guess` | Soumettre une tentative |
| `GET` | `/api/wiki/result?challengeId=` | Résultat (fin de partie) |
| `GET` | `/api/wiki/search?q=` | Autocomplétion noms |
| `GET` | `/api/wiki/stats` | Statistiques globales |
| `GET` | `/api/wiki/dates?days=` | Dates avec défi wiki actif (archive) |

## Films / séries (`routes/challenge.ts`, `films.ts`, `series.ts`)

- `GET /api/challenge/dates?days=&type=film|series` — archive (uniquement `is_active = 1`).
- `GET /api/challenge/adjacent` — filtre aussi `is_active = 1`.
- `GET /api/challenge/today`, `/date/:date`, `POST /guess`, `GET /result`.
- `GET /api/films/search`, `/api/series/search` — autocomplete (exclut la réponse du jour + le contenu futur).

## Stats anonymes (`routes/stats.ts`)

- `GET /api/stats` — cumul global (trigger `global_stats`).
- `GET /api/stats/challenge?challengeId=` — agrégation par défi.
- Ce router utilise un `statsLimiter` local et le pattern `(req, res, next)` + `try/catch → next(err)` (différent de `friends.ts`).

## Auth admin

- Token de session admin = token aléatoire 32 bytes (hex), hashé SHA-256 en base.
- Sessions actives dans `active_admin_tokens` (`expires_at`, `revoked_at`). Logout révoque explicitement le token courant.
- Si `ADMIN_USERNAME` est vide, login accepte n'importe quel username (rétrocompatibilité).

## Durcissement & sécurité des entrées

- `helmet` gère les headers (CSP incluse, images TMDB + Wikimedia autorisées).
- CORS via package `cors`, whitelist basée sur `CORS_ORIGIN` (CSV).
- Payloads limités : `express.json({ limit: '1mb' })` + `express.urlencoded({ limit: '1mb' })`.
- `seed.ts` refuse de s'exécuter en production.
- Guesses dans `game_sessions.attempts` échappées via `escapeHtml()`.
- Endpoints de recherche échappent `%` et `_` en LIKE SQL.
- Autocomplétions excluent le contenu planifié dans le futur (anti-leak planning).

## Matching des guesses (`backend/src/lib/matching.ts`)

Utilisé dans `challenge.service.ts` et `wiki-challenge.service.ts` :
- Normalisation : minuscules, accents supprimés, ponctuation ignorée.
- Comparaison contre `title` + `title_aliases` (JSON array).
- Distance de Levenshtein pour tolérance aux fautes (seuil configurable).
- **Ne jamais contourner ce module** pour valider une réponse (faux positifs/négatifs).

## Uploads admin

Multer écrit dans `UPLOADS_DIRECTORY` ; Express sert `/uploads` via `getUploadsAbsDir()` (`app.ts`).
