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

## Variables d'environnement clés (backend)

- `PORT`
- `DATABASE_PATH`
- `COOKIE_SECRET`
- `ADMIN_PASSWORD`
- `ADMIN_USERNAME` (optionnel mais recommandé)
- `CORS_ORIGIN` (CSV d'origines)
- `BACKEND_URL`
- `TMDB_API_KEY`
- `MAX_ATTEMPTS` (films/séries)
- `WIKI_MAX_ATTEMPTS` (wiki, optionnel)

## WikiGuessr

- `hint_schedule` est stocké sans préfixe `wiki_`.
- Le service préfixe au runtime (`wiki_birth_year`, etc.).
- `getAllowedHintKeys()` (admin) et `getSupplementalHintKeys()` (service) doivent rester alignés.
- Parser Wikipedia: fallback Wikidata, throttle 1 req/s, cache LRU (1h).
