# Mode Wikipedia (WikiGuessr) — GuessToday

À lire avant toute tâche sur `wiki_persons`, le parser Wikipedia, ou l'admin wiki.

## Concept

Jeu quotidien séparé : deviner une personnalité réelle à partir de sa carrière (fonctions politiques, clubs sportifs, biographie) et d'indices progressifs débloqués à chaque mauvaise réponse. **5 tentatives** par défaut (`WIKI_MAX_ATTEMPTS`).

## Table DB `wiki_persons`

```sql
person_type TEXT CHECK (person_type IN (
  'politician','sportsperson','artist','scientist',
  'entrepreneur','writer','historical_figure','generic'
))
```

- `infobox_data` — JSON structuré selon le `person_type` (rôles, clubs, domaine…)
- `hint_schedule` — JSON array de clés **sans préfixe** `wiki_` : `["birth_year","nationality","party"]`
- `photo_url` — URL Wikimedia Commons (thumbnail 400px préféré à l'original full-res)

## Invariant critique — `hint_schedule` sans préfixe

`hint_schedule` est stocké **sans préfixe** (`birth_year`, pas `wiki_birth_year`). Le service ajoute le préfixe au moment de construire le payload : `type: 'wiki_birth_year'`. `getAllowedHintKeys()` (admin) et `getSupplementalHintKeys()` (service) doivent rester synchronisés.

## `media_type = 'wiki'` dans `daily_challenges`

La colonne `media_type` doit être mise à jour explicitement lors de l'assignation/réassignation d'un défi (routes PUT/PATCH `/challenges/:id` dans `admin.ts`).

## Parser Wikipedia (`backend/src/lib/wikipedia.ts`)

- Appels : REST API summary → wikitext API → Wikidata SPARQL (fallback). Résumé + wikitext en parallèle.
- Throttle global (1 req/s) pour limiter les rafales Wikipedia/Wikidata.
- Cache LRU en mémoire (TTL 1h, max 500 entrées).
- Détection du type : Wikidata occupations > description Wikidata > template infobox wikitext > heuristiques champs. Fallback final : `'generic'` (pas `'politician'`).
- **Photo** : `thumbnail.source` upscalé à 400px via `upscaleWikimediaThumb()` — l'`originalimage` (jusqu'à 50 Mo) est ignoré.

## Admin Wikipedia

- **`/admin/wiki`** — CRUD personnalités : recherche par slug FR/EN, bouton "Au hasard" via Wikidata SPARQL (`GET /api/admin/wiki-persons/random?lang=fr&minFame=30`).
- **`/admin/settings`** — toggle `wiki_prefetch_enabled` ; `GET /api/admin/settings/summary` récap non sensible (`wikiPrefetchTargetReady`, `wikiPrefetchMaxFetchPerRun`, `wikiPrefetchSparqlLimit`, flags Vite…).
- **`/admin/wiki-pool`** — pool préchargé : pagination + param `hasWikiPerson=all|yes|no` sur `GET /api/admin/wiki-persons/prefetch-pool` ; dates en Europe/Paris ; UX mobile (cartes, badges). Activation pool via Réglages.
- **`POST /api/admin/game-preview-draft`** — payload jeu films/séries depuis le formulaire admin sans persist DB.
- **Planning** — onglet "Wiki" dans CalendarPage, même interface que films/séries.
- `minFame` = seuil de sitelinks Wikidata (≈ notoriété inter-langues, équivalent `vote_count` TMDB).
- Pool ciblé par `WIKI_PREFETCH_TARGET_READY` (max 400) ; remplissage borné par passe (`WIKI_PREFETCH_MAX_FETCH_PER_RUN`) ; `WIKI_PREFETCH_SPARQL_LIMIT` aligne le lot Wikidata sur la cible ; `POST /api/admin/prefetch/warm` avec `PREFETCH_WARM_TOKEN`.
- **Navigation admin** — l'entrée active « Personnalités » ne doit pas matcher `/admin/wiki-pool` : préfixe `/admin/wiki` réservé à la liste Wiki seule (`AdminLayout` plus précis que `startsWith('/admin/wiki')`).
