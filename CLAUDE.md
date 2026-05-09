# GuessToday — Guide pour Claude Code

## Architecture

Monorepo avec un **frontend** React/Vite à la racine et un **backend** Express/SQLite dans `backend/`.

```
/
├── src/                          # Frontend React + TypeScript
│   ├── api/
│   │   ├── client.ts             # Client HTTP typé (fetch wrappé)
│   │   └── wikiClient.ts         # Client HTTP pour les routes /api/wiki/*
│   ├── store/
│   │   ├── gameStore.ts          # État global Zustand (films/séries)
│   │   └── wikiStore.ts          # État global Zustand (Wikipedia)
│   ├── lib/                      # utils.ts, storage.ts
│   ├── types/index.ts            # Types partagés frontend
│   ├── config/features.ts        # Feature flags (VITE_ENABLE_SERIES, VITE_ENABLE_WIKI)
│   ├── components/
│   │   ├── game/                 # GamePage, DateNavBar, HintPanel, GuessInput…
│   │   ├── wiki/                 # WikiGamePage, WikiHintPanel, WikiGuessInput, modals
│   │   ├── modals/               # WinModal, LoseModal, StatsModal, RulesModal
│   │   ├── layout/               # Header, Footer
│   │   └── ui/                   # Button, Badge, Modal, Spinner
│   ├── hooks/                    # useAutocomplete, useKeyboard
│   ├── App.tsx                   # Entrée films/séries
│   ├── WikiApp.tsx               # Entrée mode Wikipedia
│   └── admin/                    # Back office (pages, components, api.ts)
│
└── backend/
    ├── src/
    │   ├── routes/               # challenge.ts, films.ts, stats.ts, admin.ts, wiki-challenge.ts
    │   ├── services/             # challenge.service.ts, wiki-challenge.service.ts
│   ├── lib/                  # wikipedia.ts (parser + fetch Wikidata)
│   ├── config/               # uploads.ts (chemins disque upload admin)
│   ├── middleware/           # session, rateLimiter, adminAuth, errorHandler
│   └── db/                   # schema.sql, migrate.ts, database.ts
    └── scripts/
        ├── seed.ts
        └── reset.ts
```

## Commandes

### Frontend (racine)
```bash
npm install
npm run dev          # Vite sur http://localhost:5173
npm run build        # Build → backend/public/
```

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run db:migrate   # Crée/met à jour le schéma SQLite (idempotent)
npm run db:seed      # Films d'exemple + planning initial
npm run dev          # Express sur http://localhost:3001
```

## Variables d'environnement clés

### Frontend (`/.env`)

| Variable | Défaut | Description |
|----------|--------|-------------|
| `VITE_ENABLE_SERIES` | `true` | `false` = films only (UI/ routes séries masquées), `true` = films + séries — branding toujours `GuessToday` |
| `VITE_ENABLE_WIKI` | `true` | Active/désactive le mode WikiGuessr (route `/wiki`, tab Homepage) |
| `VITE_API_URL` | *(vide)* | Préfixe API si le frontend n’est pas servi même origine que le backend |

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Port Express (défaut: 3001) |
| `DATABASE_PATH` | Chemin SQLite (défaut: `./data/moviegame.db`) |
| `COOKIE_SECRET` | Secret de signature des cookies de session |
| `ADMIN_PASSWORD` | Mot de passe back office |
| `ADMIN_USERNAME` | Identifiant back office (optionnel — si vide, login par mdp seul) |
| `CORS_ORIGIN` | Origines frontend autorisées (CSV, ex: `https://app.com,https://www.app.com`) — normalisation d’origine côté `app.ts` |
| `TMDB_API_KEY` | Clé API TMDB (back office uniquement) |
| `IMAGE_SOURCE` | `tmdb` ou `local` |
| `MAX_ATTEMPTS` | Tentatives par défi films/séries (défaut: 5) |
| `WIKI_MAX_ATTEMPTS` | Tentatives par défi wiki (défaut: 5, optionnel) |
| `UPLOADS_DIRECTORY` | Dossier absolu des fichiers uploadés admin (défaut `public/uploads` ; prod Docker `/data/uploads`) |
| `WIKI_PREFETCH_TARGET_READY` | Cible du pool admin « Au hasard » (défaut 24, max 400) |
| `WIKI_PREFETCH_MAX_FETCH_PER_RUN` | Fiches enrichies par passe (défaut 4, max 40) |
| `WIKI_PREFETCH_SPARQL_LIMIT` | Limite Wikidata (`LIMIT` SPARQL prefetch ; si absent : `max(100, WIKI_PREFETCH_TARGET_READY)` cap 800 ; si défini : 50–800 ; corrige l’ancien plafond fixe à 100) |
| `PREFETCH_WARM_TOKEN` | Secrète pour `POST /api/admin/prefetch/warm` (cron) |

## Points techniques importants

### Timezone Paris
Le jeu se réinitialise à minuit **heure de Paris**. Utiliser systématiquement :
```ts
new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
```
— côté serveur dans `challenge.service.ts` et `wiki-challenge.service.ts` (`getTodayParis()`)
— côté client dans `gameStore.ts` et `wikiStore.ts` (`getTodayParis()` exporté)

### Authentification admin
- Le token de session admin est maintenant un token aléatoire 32 bytes (hex), hashé en SHA-256 en base.
- Les sessions actives sont stockées dans `active_admin_tokens` avec `expires_at` et `revoked_at`.
- Le logout révoque explicitement le token courant.
- Si `ADMIN_USERNAME` est vide, le login accepte n'importe quel username (rétrocompatibilité).

### État du jeu (Zustand)
- `viewingDate: string | null` — `null` = défi du jour, sinon date `YYYY-MM-DD`
- `loadDate(date)` charge un défi passé sans toucher aux stats
- `initGame()` vérifie `ui.modalType !== 'rules'` avant d'ouvrir la modale win/lose (évite d'écraser le tutoriel)
- Même structure pour `wikiStore.ts` (miroir de `gameStore.ts`)

### Tutoriel (premier visit)
- Clé localStorage : `cineguess:rules_seen`
- `useFirstVisit()` dans `App.tsx` ouvre la modale au montage, **sans dépendance sur `status`**
- `RULES_SEEN_KEY` est écrit dans `RulesModal.handleClose()`, pas au montage

### Indices films/séries
Ordre d'affichage : année → réalisateur → acteur principal (1 seul, `cast.slice(0, 1)`)

### TMDB
- Le back office utilise l'API TMDB pour la recherche et l'auto-remplissage de fiches film/série
- Les images du jeu viennent de TMDB (`IMAGE_SOURCE=tmdb`) ou de fichiers locaux
- Attribution TMDB obligatoire dans le footer

### Numéro de défi (`#N` header)
- Le payload API expose `challengeNumber` = **ordinal 1-based** parmi les défis **actifs** du même `media_type`, ordre `challenge_date` puis `id` (`activeChallengeOrdinalByDate`).

### Planning & archives
- Suppression calendrier admin = `daily_challenges.is_active = 0` (ligne conservée).
- **`GET /api/challenge/dates`**, **`/api/wiki/dates`**, **`.../adjacent`** : uniquement `is_active = 1` — les jours retirés ne sortent plus dans l’archive ni dans le compteur « joués ».
- Après **reschedule** ou **restore** d’un défi : `renumberChallenges()`.

### Uploads admin
- Multer écrit dans `UPLOADS_DIRECTORY` ; Express sert `/uploads` via `getUploadsAbsDir()` (`app.ts`).

### Redirection de marque
- `src/main.tsx` : ancien hostname de prod → `guesstoday.fr?migrate=` (localStorage stats/history partiels) — seul endroit où l’ancien domaine reste référencé en dur.

### Durcissement backend
- `helmet` gère les headers de sécurité (CSP incluse, images TMDB + Wikimedia autorisées).
- CORS passe par le package `cors` avec whitelist basée sur `CORS_ORIGIN` (CSV).
- Payloads limités: `express.json({ limit: '1mb' })` et `express.urlencoded({ limit: '1mb' })`.
- `seed.ts` refuse de s'exécuter en production.

### Sécurité des entrées utilisateur
- Les guesses stockées dans `game_sessions.attempts` sont échappées via `escapeHtml()`.
- Les endpoints de recherche échappent `%` et `_` en LIKE SQL.
- Les autocomplétions excluent aussi le contenu planifié dans le futur (anti-leak planning).

---

## Mode Wikipedia (WikiGuessr)

### Concept
Jeu quotidien séparé : l'utilisateur doit deviner une personnalité réelle à partir de sa carrière (fonctions politiques, clubs sportifs, biographie) et d'indices progressifs débloqués à chaque mauvaise réponse. **5 tentatives** par défaut (`WIKI_MAX_ATTEMPTS`).

### Table DB `wiki_persons`
```sql
person_type  TEXT CHECK (person_type IN (
  'politician','sportsperson','artist','scientist',
  'entrepreneur','writer','historical_figure','generic'
))
```
- `infobox_data` — JSON structuré selon le `person_type` (rôles, clubs, domaine…)
- `hint_schedule` — JSON array de clés **sans préfixe** `wiki_` : `["birth_year","nationality","party"]`
- `photo_url` — URL Wikimedia Commons (thumbnail 400px préféré à l'original full-res)

### `media_type = 'wiki'` dans `daily_challenges`
La colonne `media_type` doit être mise à jour explicitement lors de l'assignation/réassignation d'un défi (voir routes PUT/PATCH `/challenges/:id` dans `admin.ts`).

### Hint schedule — invariant critique
`hint_schedule` est stocké **sans préfixe** (`birth_year`, pas `wiki_birth_year`).
Le service ajoute le préfixe au moment de construire le payload : `type: 'wiki_birth_year'`.
`getAllowedHintKeys()` côté admin et `getSupplementalHintKeys()` côté service doivent rester synchronisés.

### Parser Wikipedia (`backend/src/lib/wikipedia.ts`)
- Appels : REST API summary → wikitext API → Wikidata SPARQL (fallback)
- Résumé + wikitext récupérés en parallèle
- Throttle global (1 req/s) pour limiter les rafales vers Wikipedia/Wikidata
- Cache LRU en mémoire (TTL 1h, max 500 entrées)
- Détection du type : Wikidata occupations > description Wikidata > template infobox wikitext > heuristiques champs
- Fallback final : `'generic'` (pas `'politician'`)
- **Photo** : `thumbnail.source` upscalé à 400px via `upscaleWikimediaThumb()` — l'`originalimage` (jusqu'à 50 Mo) est ignoré

### Admin Wikipedia
- **`/admin/wiki`** — CRUD personnalités : recherche par slug FR/EN, bouton "Au hasard" via Wikidata SPARQL (`GET /api/admin/wiki-persons/random?lang=fr&minFame=30`)
- **`/admin/settings`** — toggle `wiki_prefetch_enabled` (plus sur la page pool) ; **`GET /api/admin/settings/summary`** : récap non sensible (`wikiPrefetchTargetReady`, `wikiPrefetchMaxFetchPerRun`, `wikiPrefetchSparqlLimit`, flags Vite…)
- **`/admin/wiki-pool`** — pool préchargé : pagination + param **`hasWikiPerson=all|yes|no`** sur **`GET /api/admin/wiki-persons/prefetch-pool`** ; dates affichées en Europe/Paris ; UX mobile (cartes, badges fiche existante). Activation pool via Réglages.
- **`POST /api/admin/game-preview-draft`** — même payload jeu films/séries que pour une fiche enregistrée, depuis le formulaire admin sans persist DB.
- **Planning** — onglet "Wiki" dans CalendarPage, même interface que films/séries
- `minFame` = seuil de sitelinks Wikidata (≈ notoriété inter-langues, équivalent `vote_count` TMDB)
- Pool ciblé par `WIKI_PREFETCH_TARGET_READY` (max 400) ; remplissage borné par passe (`WIKI_PREFETCH_MAX_FETCH_PER_RUN`) ; **`WIKI_PREFETCH_SPARQL_LIMIT`** aligne la taille du lot Wikidata sur la cible ; option **`POST /api/admin/prefetch/warm`** avec `PREFETCH_WARM_TOKEN`
- **Navigation admin** — l’entrée active « Personnalités » ne doit pas matcher **`/admin/wiki-pool`** : préfixe **`/admin/wiki`** réservé à la liste Wiki seule (`AdminLayout` plus précis que `startsWith('/admin/wiki')`).

### Routes API wiki
Préfixe `/api/wiki/` — définies dans `wiki-challenge.ts`, enregistrées dans `app.ts`.

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

**Films / séries** — `GET /api/challenge/dates?days=&type=film|series` : idem pour l’archive ; `adjacent` filtre aussi `is_active = 1`.

---

## Conventions

- TypeScript strict, pas de `any` implicite
- Tailwind CSS pour le style — palette personnalisée : `film-black`, `film-gold`, `film-text`, `film-text-dim`, `film-border`, `film-green`, `film-red`
- Composants fonctionnels uniquement, hooks React standard
- Pas de commentaires sauf pour les invariants non-évidents
- Responsive : mobile-first, breakpoints `sm`, `md`, `lg`
- Routes API préfixées `/api/`, sauf `/health`

## Mode efficacité tokens (important)

- Répondre court par défaut (pas de longues explications si non demandées).
- Lire uniquement les fichiers utiles à la tâche (éviter l'exploration large).
- Préférer des patches ciblés plutôt que de gros refactors.
- Éviter de relire plusieurs fois les mêmes fichiers sans raison.
- Vérifier avec `npm run build` uniquement après un lot cohérent de changements.
- Ne pas proposer plusieurs alternatives si l'utilisateur a demandé une action directe.
- Limiter le bruit en sortie: 1 résumé + points critiques + next step.
