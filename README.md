# MovieGuessr 🎬

Jeu quotidien de cinéma : devine le film à partir d'une image et d'indices progressifs.
Un nouveau défi chaque jour à minuit (heure de Paris). Les anciens défis restent accessibles.

## Fonctionnalités

- **Défi quotidien** — un film différent chaque jour, planifié via le back office
- **3 tentatives** — chaque mauvaise réponse débloque un indice (année → réalisateur → acteur principal)
- **Anciens défis** — navigation ◀ ▶ pour rejouer les jours précédents
- **Statistiques** — suivi local des victoires, séries et distribution des scores
- **Partage** — résultat exportable en grille emoji
- **Back office** — interface d'administration pour gérer les films et le planning
- **TMDB** — auto-remplissage des fiches films via l'API The Movie Database

## Prérequis

- Node.js v18+
- npm v9+
- Clé API TMDB gratuite (pour le back office) : [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)

## Lancement en local

Le projet est composé d'un **frontend** React/Vite et d'un **backend** Express/SQLite. Lancer les deux en parallèle.

### 1. Backend

```bash
cd backend

npm install

# Copier et ajuster la config
cp .env.example .env

# Créer la base et appliquer le schéma
npm run db:migrate

# Insérer les films d'exemple et planifier les premiers défis
npm run db:seed

# Démarrer l'API (port 3001, hot-reload)
npm run dev
```

Vérification : `curl http://localhost:3001/health` → `{"status":"ok"}`

### 2. Frontend

```bash
# Depuis la racine du projet
npm install
npm run dev
```

Frontend disponible sur `http://localhost:5173`.  
Back office sur `http://localhost:5173/admin`.

## Structure du projet

```
/
├── src/                          # Frontend React + TypeScript
│   ├── api/client.ts             # Client HTTP typé
│   ├── store/gameStore.ts        # État global Zustand
│   ├── components/
│   │   ├── game/                 # Image, saisie, indices, tentatives
│   │   ├── modals/               # Victoire, défaite, règles, stats
│   │   ├── layout/               # Header, Footer
│   │   └── ui/                   # Button, Badge, Modal, Spinner
│   ├── hooks/                    # useAutocomplete, useKeyboard
│   └── types/index.ts            # Types partagés
│
└── backend/
    ├── src/
    │   ├── routes/               # challenge.ts, films.ts, stats.ts, admin.ts
    │   ├── services/             # challenge.service.ts (logique métier)
    │   ├── middleware/           # session, rateLimiter, adminAuth, errorHandler
    │   └── db/                   # schema.sql, migrate.ts, database.ts
    └── scripts/
        ├── seed.ts               # Peuplement initial
        └── reset.ts              # Remise à zéro (dev)
```

## Scripts

### Backend (`cd backend`)

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur avec hot-reload |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run db:migrate` | Applique le schéma SQL (idempotent) |
| `npm run db:seed` | Insère les films et planifie les défis |
| `npm run db:reset` | Supprime et recrée la base (dev uniquement) |

### Frontend (racine)

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur Vite avec hot-reload |
| `npm run build` | Build de production dans `backend/public/` |

## Variables d'environnement

Voir `backend/.env.example` pour la liste complète.

| Variable | Dev | Description |
|----------|-----|-------------|
| `PORT` | `3001` | Port du serveur API |
| `DATABASE_PATH` | `./data/moviegame.db` | Chemin du fichier SQLite |
| `COOKIE_SECRET` | *(voir .env.example)* | Secret de signature des cookies |
| `ADMIN_PASSWORD` | *(voir .env.example)* | Mot de passe du back office |
| `ADMIN_USERNAME` | *(optionnel)* | Identifiant du back office (si défini, requis à la connexion) |
| `CORS_ORIGIN` | `http://localhost:5173` | Origine autorisée |
| `TMDB_API_KEY` | — | Clé API TMDB (back office uniquement) |
| `IMAGE_SOURCE` | `tmdb` | `tmdb` ou `local` |
| `MAX_ATTEMPTS` | `3` | Nombre de tentatives par défi |

## API publique

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/challenge/today` | Défi du jour (sans le titre) |
| `GET` | `/api/challenge/date/:date` | Défi d'une date passée (`YYYY-MM-DD`) |
| `POST` | `/api/challenge/guess` | Soumettre une tentative `{ guess, challengeId? }` |
| `GET` | `/api/challenge/result?challengeId=` | Révéler le film (fin de partie) |
| `GET` | `/api/films/search?q=` | Autocomplétion des titres |
| `GET` | `/api/stats` | Statistiques globales anonymes |
| `GET` | `/health` | Santé du serveur |

## Back office

Accessible sur `/admin`. Protégé par mot de passe (et identifiant si `ADMIN_USERNAME` est défini).

- **Dashboard** — aperçu du défi du jour et des 7 prochains jours
- **Films** — CRUD complet, recherche TMDB par titre avec auto-remplissage, sélection de backdrop, badge "Joué / Planifié"
- **Planning** — calendrier des 30 prochains jours, association film ↔ date

## Déploiement

- **Frontend** → [Vercel](https://vercel.com) (détection Vite automatique, `vercel.json` inclus)
- **Backend** → [Railway](https://railway.app) (`backend/railway.toml` inclus) avec volume persistant sur `/data`

## Attribution

Ce produit utilise l'API TMDB mais n'est pas approuvé ou certifié par [TMDB](https://www.themoviedb.org).
