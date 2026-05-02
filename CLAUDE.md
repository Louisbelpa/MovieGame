# CinéGuessr / GuessToday — Guide pour Claude Code

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
| `VITE_ENABLE_SERIES` | `true` | `false` = films only + branding `CinéGuessr`, `true` = films+séries + branding `GuessToday` |
| `VITE_ENABLE_WIKI` | `true` | Active/désactive le mode WikiGuessr (route `/wiki`, tab Homepage) |

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Port Express (défaut: 3001) |
| `DATABASE_PATH` | Chemin SQLite (défaut: `./data/moviegame.db`) |
| `COOKIE_SECRET` | Secret de signature des cookies de session |
| `ADMIN_PASSWORD` | Mot de passe back office |
| `ADMIN_USERNAME` | Identifiant back office (optionnel — si vide, login par mdp seul) |
| `CORS_ORIGIN` | Origine frontend autorisée (défaut: `http://localhost:5173`) |
| `TMDB_API_KEY` | Clé API TMDB (back office uniquement) |
| `IMAGE_SOURCE` | `tmdb` ou `local` |
| `MAX_ATTEMPTS` | Tentatives par défi films/séries (défaut: 5) ; wiki utilise aussi cette valeur (défaut: 3) |

## Points techniques importants

### Timezone Paris
Le jeu se réinitialise à minuit **heure de Paris**. Utiliser systématiquement :
```ts
new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
```
— côté serveur dans `challenge.service.ts` et `wiki-challenge.service.ts` (`getTodayParis()`)
— côté client dans `gameStore.ts` et `wikiStore.ts` (`getTodayParis()` exporté)

### Authentification admin
Le token de session admin est un SHA-256 de `ADMIN_USERNAME + ADMIN_PASSWORD + COOKIE_SECRET`.
Si `ADMIN_USERNAME` est vide, le login accepte n'importe quel username (rétrocompatibilité).

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

---

## Mode Wikipedia (WikiGuessr)

### Concept
Jeu quotidien séparé : l'utilisateur doit deviner une personnalité réelle à partir de sa carrière (fonctions politiques, clubs sportifs, biographie) et d'indices progressifs débloqués à chaque mauvaise réponse. **3 tentatives** par défaut.

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
- Détection du type : Wikidata occupations > description Wikidata > template infobox wikitext > heuristiques champs
- Fallback final : `'generic'` (pas `'politician'`)
- **Photo** : `thumbnail.source` upscalé à 400px via `upscaleWikimediaThumb()` — l'`originalimage` (jusqu'à 50 Mo) est ignoré

### Admin Wikipedia
- **`/admin/wiki`** — CRUD personnalités : recherche par slug FR/EN, bouton "Au hasard" via Wikidata SPARQL (`GET /api/admin/wiki-persons/random?lang=fr&minFame=30`)
- **Planning** — onglet "Wiki" dans CalendarPage, même interface que films/séries
- `minFame` = seuil de sitelinks Wikidata (≈ notoriété inter-langues, équivalent `vote_count` TMDB)

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
