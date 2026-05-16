# GuessToday — Applications Mobiles

Deux apps natives qui consomment le backend Express existant via les mêmes cookies httpOnly que le web. Aucune modification du backend nécessaire pour les fonctionnalités de base.

## Structure

```
mobile/
├── ios/        # App SwiftUI (iOS 17+, Xcode 16+)
└── android/    # App Jetpack Compose (Android 8+, minSdk 26)
```

---

## iOS — Setup

### Prérequis
- Xcode 16+
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) : `brew install xcodegen`
- Compte Apple Developer (pour les push notifications et Sign in with Apple)

### Génération du projet

```bash
cd mobile/ios
xcodegen generate
open GuessToday.xcodeproj
```

### Configuration
1. Dans `project.yml`, remplace `YOUR_TEAM_ID` par ton Apple Developer Team ID
2. Dans `GuessToday/Networking/APIClient.swift`, la constante `baseURL` pointe sur `https://guesstoday.fr` en release et `http://localhost:3001` en debug — ajuste si besoin
3. Pour les push notifications : configure les clés APNs dans les variables d'environnement backend (`APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_P8`, `PUSH_BUNDLE_ID`)
4. Pour Sign in with Apple : ajoute `APPLE_WEB_CLIENT_ID` dans le backend

### Dépendances
Aucune librairie tierce — uniquement les frameworks Apple :
- SwiftUI, Combine, URLSession (réseau + cookies)
- UserNotifications + APNs (push)
- AuthenticationServices (Sign in with Apple)

### Architecture iOS

| Fichier | Rôle |
|---------|------|
| `App/RootView.swift` | Navigation racine — TabView natif (Films, Wiki, Archive, Profil) |
| `App/NotificationManager.swift` | Gestion APNs + enregistrement token |
| `App/SoundManager.swift` | Haptiques sur bonne/mauvaise réponse |
| `Networking/APIClient.swift` | URLSession typé, gestion cookies automatique |
| `Networking/StatsManager.swift` | Lecture/écriture stats locales (`UserDefaults`) |
| `Features/Game/GameView.swift` | Écran de jeu (film + wiki) |
| `Features/Game/WinSheet.swift` | Feuille victoire : confetti Canvas, stats, partage |
| `Features/Game/RulesSheet.swift` | Tuto premier lancement par mode |
| `Features/Friends/FriendsView.swift` | Amis + classement global (podium + table) |
| `Features/Profile/ProfileView.swift` | Profil, stats par mode, déconnexion |
| `UI/Theme.swift` | Palette de couleurs centralisée |
| `UI/HintCard.swift` | Grille d'indices 3 colonnes, slots dashed |
| `UI/BlurImageView.swift` | Image floue progressive + badge "Scène" |

---

## Android — Setup

### Prérequis
- Android Studio Ladybug+
- JDK 17+
- Compte Firebase (pour les push notifications FCM)

### Lancer l'app

```bash
cd mobile/android
./gradlew assembleDebug
# ou ouvrir le dossier dans Android Studio
```

### Configuration
1. `BASE_URL` est défini dans `app/build.gradle.kts` : `http://10.0.2.2:3001` en debug, `https://guesstoday.fr` en release
2. Remplace `app/google-services.json` par ton propre fichier Firebase
3. Pour les push : configure `FCM_SERVICE_ACCOUNT` dans le backend

### Dépendances clés
- Jetpack Compose BOM
- Retrofit + OkHttp (CookieJar mémoire)
- Hilt (injection de dépendances)
- Navigation Compose
- DataStore Preferences
- Firebase Messaging (FCM)
- Coil (chargement d'images)

### Architecture Android

| Fichier | Rôle |
|---------|------|
| `navigation/AppNavigation.kt` | Bottom nav Material3 natif (Films, Wiki, Archive, Profil) |
| `data/api/ApiService.kt` | Interface Retrofit — tous les endpoints |
| `data/api/ApiModels.kt` | Data classes JSON (Moshi) |
| `data/network/NetworkModule.kt` | Hilt module — OkHttp + CookieJar + Retrofit |
| `data/push/PushNotificationService.kt` | FCM — reçoit tokens, forward au backend |
| `features/game/GameScreen.kt` | Écran de jeu (film + wiki) |
| `features/game/GameViewModel.kt` | State + logique métier |
| `features/game/RulesSheet.kt` | Tuto premier lancement par mode |
| `features/friends/FriendsScreen.kt` | Amis + classement global (podium + table) |
| `features/profile/ProfileScreen.kt` | Profil, stats par mode, déconnexion |
| `ui/theme/Theme.kt` | `AppColors` + `GoldGradient` |
| `ui/theme/Color.kt` | Palette (`FilmGold`, `ModeFilm`, `ModeWiki`…) |

---

## Fonctionnalités communes (iOS + Android)

| Feature | Détail |
|---------|--------|
| Jeu film & wiki | Image floue progressive, indices 3 colonnes, 5 tentatives, autocomplétion |
| Archive | Calendrier mensuel des défis passés, navigation prev/next |
| Auth | Register / Login / Logout / Profil / Mot de passe oublié |
| Sign in with Apple | iOS uniquement (`POST /api/auth/apple`) |
| Amis | Ajout par code, acceptation, résultats quotidiens |
| Classement global | Podium top-3 + table complète (films / wiki / streak) |
| RulesSheet | Tuto animé au premier lancement, persisté par mode |
| WinSheet | Confetti Canvas physique, stats, partage natif |
| Push notifications | APNs (iOS) / FCM (Android) — prompt au 1er gain |
| Stats locales | `UserDefaults` (iOS) / `SharedPreferences("game_stats")` (Android) — clés `{mode}_played`, `{mode}_wins`, `{mode}_streak`, `{mode}_max_streak` |

---

## Backend — Variables d'environnement push

Ajouter dans `backend/.env` :

```env
APNS_KEY_ID=          # Key ID depuis Apple Developer Portal
APNS_TEAM_ID=         # Team ID (10 caractères)
APNS_KEY_P8=          # Contenu de la clé .p8 en base64
FCM_SERVICE_ACCOUNT=  # JSON service account Firebase en base64
PUSH_BUNDLE_ID=fr.guesstoday.app
APPLE_WEB_CLIENT_ID=fr.guesstoday.web
```

---

## Backend — Routes mobiles utilisées

### Auth (`/api/auth/`)
| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/register` | Création de compte |
| `POST` | `/login` | Connexion |
| `POST` | `/logout` | Déconnexion |
| `GET` | `/me` | Utilisateur courant |
| `PUT` | `/profile` | Mise à jour displayName/avatar |
| `POST` | `/change-password` | Changement mot de passe |
| `POST` | `/forgot-password` | Envoi email réinitialisation |
| `POST` | `/reset-password` | Réinitialisation avec token |
| `POST` | `/apple` | Sign in with Apple |
| `POST` | `/push-token` | Enregistrement token APNs/FCM |
| `GET` | `/stats` | Stats utilisateur par mode |
| `GET` | `/history` | Historique des parties |

### Amis (`/api/friends/`)
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/` | Liste amis + résultats du jour |
| `GET` | `/code` | Code ami personnel |
| `POST` | `/add` | Ajouter par code |
| `POST` | `/accept` | Accepter demande |
| `DELETE` | `/:userId` | Retirer un ami |
| `GET` | `/leaderboard` | Classement global |
