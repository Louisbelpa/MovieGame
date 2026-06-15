# Design system — GuessToday (web / iOS / Android)

À lire avant toute tâche UI/style. Les 3 plateformes doivent rester cohérentes.

## Web (CSS + Tailwind)

- **Palette CSS** : `--film-black`, `--film-gold`, `--film-gold-light`, `--film-gold-deep`, `--film-green`, `--film-red`, `--film-border`, `--film-text`, `--film-text-dim`.
- **Couleurs de mode** : `--sg-films` (gold), `--sg-wiki` (rose `#e85788`), `--sg-series` (violet `#6b7cff`). Variables `--mode-color`, `--mode-ring`, `--mode-soft` injectées dynamiquement selon le mode actif.
- **Gradient gold** : `linear-gradient(180deg, #e8c06a, #d4a64a, #a07030)` avec texte `#1a0f00`.
- **Palette Tailwind** : `film-black`, `film-gold`, `film-text`, `film-text-dim`, `film-border`, `film-green`, `film-red`.
- **ModeTabs** (`src/components/game/ModeTabs.tsx` + `.css`) : pill flottant `position: fixed; bottom: 20px`, mobile uniquement (`lg:hidden`). Monté dans `App.tsx` (GameLayout), pas dans `GamePage`.
- **Grille d'indices** : 3 colonnes (`grid-cols-2 sm:grid-cols-3`) — slots verrouillés avec tiret et icône cadenas, pas de label.
- **GuessInput / WikiGuessInput** : conteneur bordure `--mode-ring` + glow `--mode-soft` ; bouton Deviner gradient gold, bouton Passer ghost.

## iOS (SwiftUI)

- **`Theme.swift`** : constantes centralisées (`Theme.background`, `.gold`, `.green`, `.red`, `.surface`, `.border`, `.muted`, `.textDim`, `.text`, `.amber`).
- **Grille d'indices** (`HintCard.swift`) : `LazyVGrid` 3 colonnes ; slots verrouillés `RoundedRectangle` en tirets (`StrokeStyle(lineWidth:1, dash:[5,4])`).
- **`BlurImageView.swift`** : badge "Scène" (`.ultraThinMaterial`) en overlay top-left pour défis films/séries.
- **`WinSheet`** : confetti Canvas physique (150 particules, burst + gravité + fade), header trophée bounce, stats row serif 28pt gradient gold, prompt notifications APNs au 1er gain.
- **`RulesSheet`** : sheet animée par mode (icône + règles numérotées + légende indices), persistée `UserDefaults` clé `rules_seen_{statsKey}`.
- **`FriendsView`** : tab switcher "Aujourd'hui" / "Classement" ; `GlobalLeaderboardView` avec podium 3 colonnes + table ranks.
- **Tab bar** : native iOS (`TabView`) — ne pas remplacer par un composant custom.

## Android (Jetpack Compose)

- **`AppColors`** (`Theme.kt`) : palette complète + `modeFilm`, `modeSeries`, `modeWiki`.
- **`GoldGradient`** : `Brush.verticalGradient(FilmGoldLight → FilmGold → FilmGoldDeep)` — bouton Deviner.
- **Slots verrouillés** : `Modifier.drawBehind` avec `PathEffect.dashPathEffect` (Compose ne supporte pas les tirets via `BorderStroke`).
- **`RulesSheet.kt`** : même logique qu'iOS — `rulesAlreadySeen(ctx, mode)` → `SharedPreferences("game_stats")` clé `rules_seen_{statsKey}`.
- **`FriendsScreen.kt`** : `LeaderboardViewModel` dédié + `GlobalLeaderboardSection` avec podium (`LeaderboardPodium`) et table (`LeaderboardTable`). Endpoint `GET /api/friends/leaderboard`.
- **`ResultBottomSheet`** : `ConfettiOverlay` (Canvas `withFrameNanos`), `WinHeader`/`LoseHeader` animés, stats row 28sp serif, prompt notif Android 13+ via `ActivityResultContracts.RequestPermission`.
- **Bottom nav** : native Material3 — ne pas remplacer.
