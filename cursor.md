# MovieGame — Guide Cursor

Ce fichier résume les invariants à respecter pour travailler vite et sans régressions sur ce repo.

## Repo

- Frontend React/Vite à la racine (`src/`)
- Backend Express/SQLite dans `backend/`
- Build frontend servi par le backend (`backend/public/`)

## Commandes utiles

```bash
# Frontend
npm run dev
npm run build

# Backend
cd backend
npm run dev
npm run db:migrate
npm run db:seed
```

## Invariants backend importants

- Timezone métier: toujours **Europe/Paris** pour le défi du jour.
- Sessions admin: cookie signé `admin_token`, token aléatoire, hash SHA-256 persisté en table `active_admin_tokens`.
- Logout admin: doit révoquer le token actif (`revoked_at`).
- `seed.ts`: interdit en production.
- Sécurité serveur: `helmet`, CORS whitelist via `CORS_ORIGIN` (CSV), body limit `1mb`.
- Les guesses utilisateur persistées sont échappées (`escapeHtml`).
- Les recherches (`/search`) ne doivent pas leak le planning futur.
- `GET /api/challenge/dates` et `/api/wiki/dates` (+ adjacent) : filtrer **`is_active = 1`** sur `daily_challenges`.
- Uploads admin : `UPLOADS_DIRECTORY` + static `/uploads` (volume persistant avec la DB en prod).
- Numéro défi header : ordinal parmi défis actifs, pas seulement la colonne SQL `challenge_number`.

## Variables d'environnement clés (backend)

- `PORT`
- `DATABASE_PATH`
- `COOKIE_SECRET`
- `ADMIN_PASSWORD`
- `ADMIN_USERNAME` (optionnel mais recommandé)
- `CORS_ORIGIN` (CSV d'origines `https://…`)
- `UPLOADS_DIRECTORY` (fichiers image admin ; ex. `/data/uploads` avec volume `/data`)
- `WIKI_PREFETCH_TARGET_READY` / `WIKI_PREFETCH_MAX_FETCH_PER_RUN` (pool admin Wikipedia)
- `PREFETCH_WARM_TOKEN` (cron `POST /api/admin/prefetch/warm`)
- `TMDB_API_KEY`
- `MAX_ATTEMPTS` (films/séries)
- `WIKI_MAX_ATTEMPTS` (wiki, optionnel)

## WikiGuessr

- `hint_schedule` est stocké sans préfixe `wiki_`.
- Le service préfixe au runtime (`wiki_birth_year`, etc.).
- `getAllowedHintKeys()` (admin) et `getSupplementalHintKeys()` (service) doivent rester alignés.
- Parser Wikipedia: fallback Wikidata, throttle 1 req/s, cache LRU (1h).
