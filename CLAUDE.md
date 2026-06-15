# GuessToday — Guide pour Claude Code

Monorepo : **frontend** React/Vite à la racine, **backend** Express/SQLite dans `backend/`, **apps mobiles** natives dans `mobile/ios` (SwiftUI) et `mobile/android` (Compose).

```
src/            Frontend React+TS (api/, store/ Zustand, components/, admin/, App.tsx, WikiApp.tsx)
backend/src/    routes/ services/ lib/ middleware/ db/  — Express + better-sqlite3
mobile/ios/     SwiftUI (Networking/, Features/, UI/Theme.swift)
mobile/android/ Jetpack Compose (data/, features/, ui/theme/)
```

> **Référence détaillée** (arborescence complète, schéma DB, env vars, types, déploiement) :
> [docs/architecture-reference.md](docs/architecture-reference.md). N'y aller que si la tâche le demande.

## Commandes

```bash
# Frontend (racine)
npm run dev          # Vite → http://localhost:5173
npm run build        # → backend/public/
npm run test         # vitest, jsdom

# Backend
cd backend
cp .env.example .env
npm run db:migrate   # schéma SQLite (idempotent)
npm run db:seed      # films d'exemple + planning
npm run dev          # Express → http://localhost:3001
npm run build        # → backend/dist/
npm run test         # vitest

# iOS — cd mobile/ios && xcodegen generate && open GuessToday.xcodeproj   (Xcode 16+)
# Android — cd mobile/android && ./gradlew assembleDebug
```

---

## Invariants critiques (à respecter partout)

### Timezone Paris
Le jeu se réinitialise à minuit **heure de Paris**. Toujours :
```ts
new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
```
Exposé via `getTodayParis()` — serveur (`challenge.service.ts`, `wiki-challenge.service.ts`, `lib/dates.ts`) et client (`gameStore.ts`, `wikiStore.ts`).

### `hint_schedule` — sans préfixe, max 3 indices
Stocké en DB **sans préfixe** (films : `["year","director","cast"]` ; séries : `creator` au lieu de `director` ; wiki : `["birth_year","nationality","party"]`). Max **3 indices** révélés en jeu. Côté wiki, le service ajoute le préfixe `wiki_` au build du payload — `getAllowedHintKeys()` (admin) et `getSupplementalHintKeys()` (service) doivent rester synchronisés. Détail wiki : [docs/wiki-mode.md](docs/wiki-mode.md).

### `is_active` = soft-delete
`is_active = 0` n'est jamais supprimé physiquement. **Filtrer `is_active = 1` dans toute lecture publique.** `/api/challenge/dates`, `/api/wiki/dates`, `.../adjacent` ne renvoient que l'actif (archives + compteur « joués »). Après reschedule/restore d'un défi : `renumberChallenges()`.

### Colonnes JSON
`title_aliases`, `genres`, `cast_members`, `hint_schedule`, `infobox_data`, `attempts` — toujours `JSON.parse`/`JSON.stringify`.

### Validation des réponses
Toujours passer par `backend/src/lib/matching.ts` (normalisation + Levenshtein). Ne jamais réécrire la comparaison.

### Numéro de défi (`#N`)
`challengeNumber` = ordinal 1-based parmi les défis **actifs** du même `media_type`, ordre `challenge_date` puis `id` (`activeChallengeOrdinalByDate`).

### `media_type` sur `daily_challenges`
À mettre à jour explicitement lors de l'assignation/réassignation d'un défi (routes PUT/PATCH `/challenges/:id`).

### Marque
Utiliser `BRAND_NAME` ('GuessToday') et `PUBLIC_SITE_URL` du `src/config/features.ts`, jamais de string en dur. Seul l'ancien domaine de prod reste référencé dans `src/main.tsx` (redirection `?migrate=`).

### Feature flags
`VITE_ENABLE_SERIES` (défaut `false` = films only), `VITE_ENABLE_WIKI` (défaut `true`).

---

## Pointeurs de référence (lire à la demande seulement)

| Tâche | Doc |
|-------|-----|
| Arborescence complète, schéma DB, env vars, types, déploiement | [docs/architecture-reference.md](docs/architecture-reference.md) |
| Routes API (auth, amis, wiki, stats), auth admin, sécurité, matching | [docs/api-routes.md](docs/api-routes.md) |
| Design system web / iOS / Android (palettes, composants, invariants UI) | [docs/design-system.md](docs/design-system.md) |
| Mode Wikipedia : parser, `person_type`, admin wiki, prefetch | [docs/wiki-mode.md](docs/wiki-mode.md) |

Skills projet (`.claude/skills/`) : `api-endpoint` (route end-to-end), `mobile-parity` (audit web ↔ iOS).

---

## Conventions

- TypeScript strict, pas de `any` implicite. Composants fonctionnels + hooks standard.
- Tailwind CSS, palette `film-*`. Responsive mobile-first (`sm`/`md`/`lg`).
- Pas de commentaires sauf invariants non-évidents.
- Routes API préfixées `/api/`, sauf `/health`.
- iOS `Theme.swift` / Android `Theme.kt` : tab bars natives, ne pas remplacer.

## Mode efficacité tokens (important)

- Répondre court par défaut (pas de longues explications si non demandées).
- Lire uniquement les fichiers utiles à la tâche (éviter l'exploration large).
- Préférer des patches ciblés plutôt que de gros refactors.
- Éviter de relire plusieurs fois les mêmes fichiers sans raison.
- Vérifier avec `npm run build` uniquement après un lot cohérent de changements.
- Ne pas proposer plusieurs alternatives si l'utilisateur a demandé une action directe.
- Limiter le bruit en sortie : 1 résumé + points critiques + next step.
