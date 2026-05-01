# CinéGuessr / GuessToday 🎬

Jeu quotidien multi-modes : devine le film, la série ou la personnalité du jour à partir d'indices progressifs.
Un nouveau défi chaque jour à minuit (heure de Paris). Les anciens défis restent accessibles.

## Modes de jeu

| Mode | Route | Description |
|------|-------|-------------|
| **CinéGuessr / Films** | `/films` | Devine le film à partir d'une image et d'indices (année, réalisateur, acteur) |
| **Séries** | `/series` | Même principe pour les séries TV |
| **WikiGuessr** | `/wiki` | Devine une personnalité réelle (politique, sport, art…) à partir de sa carrière et d'indices progressifs |

## Fonctionnalités

- **Défi quotidien** — un contenu différent chaque jour, planifié via le back office
- **Tentatives limitées** — chaque mauvaise réponse débloque un indice supplémentaire
- **Anciens défis** — navigation ◀ ▶ pour rejouer les jours précédents
- **Statistiques** — suivi local des victoires, séries et distribution des scores
- **Partage** — résultat exportable en grille emoji
- **Back office** — interface d'administration pour gérer le contenu, le planning et les analytics
- **TMDB** — auto-remplissage des fiches films/séries via l'API The Movie Database
- **Wikipedia / Wikidata** — import et parsing automatique des personnalités via les API Wikipedia et Wikidata

## Prérequis

- Node.js v20+
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
│   ├── api/
│   │   ├── client.ts             # Client HTTP typé (films/séries)
│   │   └── wikiClient.ts         # Client HTTP (Wikipedia)
│   ├── store/
│   │   ├── gameStore.ts          # État Zustand (films/séries)
│   │   └── wikiStore.ts          # État Zustand (Wikipedia)
│   ├── config/features.ts        # Feature flags (VITE_ENABLE_SERIES, VITE_ENABLE_WIKI)
│   ├── components/
│   │   ├── game/                 # Image, saisie, indices, tentatives
│   │   ├── wiki/                 # WikiGamePage, WikiHintPanel, modals
│   │   ├── modals/               # Victoire, défaite, règles, stats
│   │   ├── layout/               # Header, Footer
│   │   └── ui/                   # Button, Badge, Modal, Spinner
│   ├── hooks/                    # useAutocomplete, useKeyboard
│   ├── App.tsx                   # Entrée films/séries
│   ├── WikiApp.tsx               # Entrée mode Wikipedia
│   └── admin/                    # Back office complet
│
└── backend/
    ├── src/
    │   ├── routes/               # challenge.ts, films.ts, stats.ts, admin.ts, wiki-challenge.ts
    │   ├── services/             # challenge.service.ts, wiki-challenge.service.ts
    │   ├── lib/                  # wikipedia.ts (parser Wikipedia + Wikidata)
    │   ├── middleware/           # session, rateLimiter, adminAuth, errorHandler
    │   └── db/                   # schema.sql, migrate.ts, database.ts
    └── scripts/
        ├── seed.ts               # Peuplement initial
        └── reset.ts              # Remise à zéro (dev uniquement)
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

### Frontend (Vite)

| Variable | Défaut | Description |
|----------|--------|-------------|
| `VITE_ENABLE_SERIES` | `true` | Active le mode Séries (home, tabs, route `/series`) |
| `VITE_ENABLE_WIKI` | `true` | Active le mode WikiGuessr (home, tab, route `/wiki`) |

Effets des flags :
- `VITE_ENABLE_SERIES=false` + `VITE_ENABLE_WIKI=false` → mode films uniquement, branding `CinéGuessr`
- `VITE_ENABLE_SERIES=true` → films + séries, branding `GuessToday`
- `VITE_ENABLE_WIKI=true` → onglet WikiGuessr visible sur la homepage

### Backend

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PORT` | `3001` | Port du serveur API |
| `DATABASE_PATH` | `./data/moviegame.db` | Chemin du fichier SQLite |
| `COOKIE_SECRET` | *(voir .env.example)* | Secret de signature des cookies — générer avec `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | *(voir .env.example)* | Mot de passe du back office (min. 12 caractères recommandé) |
| `ADMIN_USERNAME` | *(optionnel)* | Identifiant du back office (si défini, requis à la connexion) |
| `CORS_ORIGIN` | `http://localhost:5173` | Origine autorisée — domaine exact, sans slash final |
| `TMDB_API_KEY` | — | Clé API TMDB (back office uniquement) |
| `IMAGE_SOURCE` | `tmdb` | `tmdb` ou `local` |
| `MAX_ATTEMPTS` | `5` (films/séries) / `3` (wiki) | Nombre de tentatives par défi |
| `BACKEND_URL` | — | URL publique du backend (pour les URLs d'images uploadées) |

## API publique

### Films / Séries

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/challenge/today` | Défi du jour |
| `GET` | `/api/challenge/date/:date` | Défi d'une date passée (`YYYY-MM-DD`) |
| `POST` | `/api/challenge/guess` | Soumettre une tentative |
| `GET` | `/api/challenge/result?challengeId=` | Révéler le titre (fin de partie) |
| `GET` | `/api/films/search?q=` | Autocomplétion des titres |
| `GET` | `/api/stats` | Statistiques globales anonymes |
| `GET` | `/health` | Santé du serveur |

### WikiGuessr

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/wiki/today` | Défi Wikipedia du jour |
| `GET` | `/api/wiki/date/:date` | Défi d'une date passée |
| `GET` | `/api/wiki/adjacent?date=&direction=` | Date voisine (prev/next) |
| `POST` | `/api/wiki/guess` | Soumettre une tentative |
| `GET` | `/api/wiki/result?challengeId=` | Révéler la personnalité (fin de partie) |
| `GET` | `/api/wiki/search?q=` | Autocomplétion des noms |
| `GET` | `/api/wiki/stats` | Statistiques globales |

## Back office

Accessible sur `/admin`. Protégé par mot de passe (et identifiant si `ADMIN_USERNAME` est défini).

- **Dashboard** — aperçu du défi du jour et des 7 prochains jours
- **Films** — CRUD complet, recherche TMDB par titre, bouton "Film aléatoire" (TMDB discover, vote_count ≥ 500)
- **Séries** — CRUD complet, recherche TMDB, bouton "Série aléatoire"
- **Wikipedia** — CRUD personnalités : import depuis un slug Wikipedia (FR ou EN), bouton "Au hasard" via Wikidata SPARQL (filtre par sitelinks), parsing automatique du type de personnalité et de la carrière
- **Planning** — calendrier des 30 prochains jours avec onglets Films / Séries / Wiki, assignation et auto-planification
- **Analytics** — statistiques de jeu, taux de victoire, joueurs récurrents

## Déploiement (Railway)

Le frontend est buildé dans `backend/public/` et servi directement par Express — un seul service à déployer.

### Première mise en production

1. Créer le service Railway et lier le repo
2. Ajouter un **volume persistant** monté sur `/data` (pour la base SQLite)
3. Configurer toutes les variables d'environnement (voir tableau ci-dessus + `.env.example`)
4. Déployer — Railway détecte le `Dockerfile` automatiquement
5. Après le premier déploiement réussi, peupler la base depuis la console Railway :
   ```bash
   cd backend && npm run db:seed
   ```

### Variables obligatoires en production

```
COOKIE_SECRET=<openssl rand -hex 32>
ADMIN_PASSWORD=<mot de passe fort, 12+ caractères>
CORS_ORIGIN=https://votre-app.up.railway.app
BACKEND_URL=https://votre-app.up.railway.app
TMDB_API_KEY=<votre clé TMDB>
```

### Checklist avant mise en ligne

- [ ] `COOKIE_SECRET` généré aléatoirement (`openssl rand -hex 32`)
- [ ] `ADMIN_PASSWORD` fort et unique (≥ 12 caractères)
- [ ] `ADMIN_USERNAME` défini (recommandé pour le double facteur identifiant + mot de passe)
- [ ] `CORS_ORIGIN` pointe vers le bon domaine (sans slash final)
- [ ] `BACKEND_URL` configuré pour les URLs d'images uploadées
- [ ] Volume persistant Railway monté sur `/data`
- [ ] HTTPS activé (Railway le fait automatiquement)
- [ ] Au moins 2 semaines de défis planifiés dans le back office (films, séries, wiki)
- [ ] `npm audit` sans vulnérabilité critique côté frontend et backend
- [ ] `VITE_ENABLE_WIKI` et `VITE_ENABLE_SERIES` configurés selon les modes souhaités

## Attribution

Ce produit utilise l'API TMDB mais n'est pas approuvé ou certifié par [TMDB](https://www.themoviedb.org).

Les données Wikipedia et Wikidata sont utilisées sous licence [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/) — Wikipedia® est une marque déposée de la Wikimedia Foundation.
