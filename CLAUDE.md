# MovieGuessr — Guide pour Claude Code

## Architecture

Monorepo avec un **frontend** React/Vite à la racine et un **backend** Express/SQLite dans `backend/`.

```
/
├── src/                          # Frontend React + TypeScript
│   ├── api/client.ts             # Client HTTP typé (fetch wrappé)
│   ├── store/gameStore.ts        # État global Zustand
│   ├── lib/                      # utils.ts, storage.ts
│   ├── types/index.ts            # Types partagés frontend
│   ├── components/
│   │   ├── game/                 # GamePage, DateNavBar, HintPanel, GuessInput...
│   │   ├── modals/               # WinModal, LoseModal, StatsModal, RulesModal
│   │   ├── layout/               # Header, Footer
│   │   └── ui/                   # Button, Badge, Modal, Spinner
│   ├── hooks/                    # useAutocomplete, useKeyboard
│   └── admin/                    # Back office complet (pages, components, api.ts)
│
└── backend/
    ├── src/
    │   ├── routes/               # challenge.ts, films.ts, stats.ts, admin.ts
    │   ├── services/             # challenge.service.ts (logique métier centrale)
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
npm run db:migrate   # Crée/met à jour le schéma SQLite
npm run db:seed      # Films d'exemple + planning initial
npm run dev          # Express sur http://localhost:3001
```

## Variables d'environnement clés (`backend/.env`)

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
| `MAX_ATTEMPTS` | Tentatives par défi (défaut: 3) |

## Points techniques importants

### Timezone Paris
Le jeu se réinitialise à minuit **heure de Paris**. Utiliser systématiquement :
```ts
new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
```
— côté serveur dans `challenge.service.ts` (`getTodayParis()`)
— côté client dans `gameStore.ts` (`getTodayParis()` exporté)

### Authentification admin
Le token de session admin est un SHA-256 de `ADMIN_USERNAME + ADMIN_PASSWORD + COOKIE_SECRET`.
Si `ADMIN_USERNAME` est vide, le login accepte n'importe quel username (rétrocompatibilité).

### État du jeu (Zustand)
- `viewingDate: string | null` — `null` = défi du jour, sinon date `YYYY-MM-DD`
- `loadDate(date)` charge un défi passé sans toucher aux stats
- `initGame()` vérifie `ui.modalType !== 'rules'` avant d'ouvrir la modale win/lose (évite d'écraser le tutoriel)

### Tutoriel (premier visit)
- Clé localStorage : `cineguess:rules_seen`
- `useFirstVisit()` dans `App.tsx` ouvre la modale au montage, **sans dépendance sur `status`**
- `RULES_SEEN_KEY` est écrit dans `RulesModal.handleClose()`, pas au montage — garantit que l'utilisateur a bien vu le modal

### Indices
Ordre d'affichage : année → réalisateur → acteur principal (1 seul, `cast.slice(0, 1)`)

### TMDB
- Le back office utilise l'API TMDB pour la recherche et l'auto-remplissage de fiches film
- Les images du jeu viennent de TMDB (`IMAGE_SOURCE=tmdb`) ou de fichiers locaux
- Attribution TMDB obligatoire dans le footer

## Conventions

- TypeScript strict, pas de `any` implicite
- Tailwind CSS pour le style — palette personnalisée : `film-black`, `film-gold`, `film-text`, `film-text-dim`, `film-border`, `film-green`, `film-red`
- Composants fonctionnels uniquement, hooks React standard
- Pas de commentaires sauf pour les invariants non-évidents
- Responsive : mobile-first, breakpoints `sm`, `md`, `lg`
- Routes API préfixées `/api/`, sauf `/health`
