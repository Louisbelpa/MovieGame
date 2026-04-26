# FrameQuest 🎬

Jeu quotidien : devine le film à partir d'une image et d'indices progressifs. Un nouveau film chaque jour.

## Prérequis

- [Node.js](https://nodejs.org) v18+
- npm v9+

## Lancement en local

Le projet est composé de deux parties : un **frontend** React/Vite et un **backend** Express/SQLite. Il faut lancer les deux en parallèle.

### 1. Backend

```bash
cd backend

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Le fichier .env fonctionne tel quel pour le dev local.
# Optionnel : changer COOKIE_SECRET pour plus de sécurité.

# Créer la base de données et appliquer le schéma
npm run db:migrate

# Remplir la base avec les films et planifier les défis
npm run db:seed

# Démarrer le serveur API (port 3001, hot-reload)
npm run dev
```

L'API est disponible sur `http://localhost:3001`.  
Vérification : `curl http://localhost:3001/health` doit retourner `{"status":"ok"}`.

---

### 2. Frontend

Dans un second terminal, depuis la **racine du projet** :

```bash
npm install
npm run dev
```

Le frontend est disponible sur `http://localhost:5173`.

---

## Structure du projet

```
/
├── src/                        # Frontend React + TypeScript
│   ├── api/client.ts           # Appels API typés
│   ├── components/
│   │   ├── game/               # Composants du jeu (image, input, indices...)
│   │   ├── modals/             # Victoire, défaite, règles, stats
│   │   ├── layout/             # Header
│   │   └── ui/                 # Composants réutilisables (Button, Badge...)
│   ├── hooks/                  # useAutocomplete, useKeyboard
│   ├── store/gameStore.ts      # État global Zustand
│   └── types/index.ts          # Types TypeScript partagés
│
└── backend/
    ├── src/
    │   ├── routes/             # challenge.ts, films.ts, stats.ts
    │   ├── services/           # challenge.service.ts (logique métier)
    │   ├── middleware/         # session, rateLimiter, errorHandler
    │   └── db/                 # schema.sql, migrate.ts, database.ts
    └── scripts/
        ├── seed.ts             # Peuplement initial (films + planning)
        └── reset.ts            # Remise à zéro (dev uniquement)
```

## Scripts utiles

### Backend

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur avec hot-reload |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run db:migrate` | Applique le schéma SQL (idempotent) |
| `npm run db:seed` | Insère les films et planifie 60 jours |
| `npm run db:reset` | Supprime et recrée la base (dev uniquement) |

### Frontend

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur Vite avec hot-reload |
| `npm run build` | Build de production dans `dist/` |

## Variables d'environnement

Voir `backend/.env.example` pour la liste complète. Les valeurs par défaut fonctionnent en local sans modification.

| Variable | Valeur locale | Description |
|----------|--------------|-------------|
| `PORT` | `3001` | Port du serveur API |
| `DATABASE_PATH` | `./data/moviegame.db` | Chemin du fichier SQLite |
| `COOKIE_SECRET` | *(voir .env.example)* | Secret pour signer les cookies de session |
| `CORS_ORIGIN` | `http://localhost:5173` | Origine autorisée (frontend) |
| `IMAGE_SOURCE` | `tmdb` | Source des images (`tmdb` ou `local`) |

## API

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/challenge/today` | Défi du jour (sans le titre) |
| `POST` | `/api/challenge/guess` | Soumettre une tentative `{ guess: string }` |
| `GET` | `/api/challenge/result` | Révéler le film (fin de partie uniquement) |
| `GET` | `/api/films/search?q=` | Autocomplétion des titres |
| `GET` | `/api/stats` | Statistiques globales anonymes |
| `GET` | `/health` | Vérification de santé du serveur |

## Déploiement

- **Frontend** → [Vercel](https://vercel.com) (détection Vite automatique, `vercel.json` inclus)
- **Backend** → [Railway](https://railway.app) (`backend/railway.toml` inclus)

Voir la section déploiement dans la doc du projet pour les étapes complètes.
