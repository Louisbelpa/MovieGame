# GuessToday — Applications Mobiles

Deux apps natives qui consomment le backend Express existant.

## Structure

```
mobile/
├── ios/        # App SwiftUI (iOS 17+)
└── android/    # App Jetpack Compose (Android 8+)
```

## iOS — Setup

### Prérequis
- Xcode 16+
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) : `brew install xcodegen`
- Compte Apple Developer (pour les push notifications)

### Génération du projet

```bash
cd mobile/ios
xcodegen generate
open GuessToday.xcodeproj
```

### Configuration
1. Dans `project.yml`, remplace `YOUR_TEAM_ID` par ton Apple Developer Team ID
2. Dans `GuessToday/Networking/APIClient.swift`, ajuste `BASE_URL` si besoin
3. Pour les push notifications : ajoute tes clés APNs dans les variables d'environnement backend

### Dépendances
Aucune librairie tierce — uniquement les frameworks Apple :
- SwiftUI, Combine, URLSession (réseau)
- UserNotifications (push)
- AuthenticationServices (Sign in with Apple)

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
1. Dans `app/src/main/kotlin/fr/guesstoday/data/network/NetworkModule.kt`, ajuste `BASE_URL`
2. Remplace `app/google-services.json` par ton propre fichier Firebase
3. Pour les push notifications : configure FCM dans la console Firebase

### Dépendances clés
- Jetpack Compose BOM
- Retrofit + OkHttp
- Hilt (injection de dépendances)
- Navigation Compose
- DataStore Preferences
- Firebase Messaging (FCM)
- Coil (chargement d'images)

## Backend — Variables d'environnement push

Ajouter dans `backend/.env` :

```
APNS_KEY_ID=          # Key ID depuis Apple Developer Portal
APNS_TEAM_ID=         # Team ID (10 caractères)
APNS_KEY_P8=          # Contenu de la clé .p8 en base64
FCM_SERVICE_ACCOUNT=  # JSON service account Firebase en base64
PUSH_BUNDLE_ID=fr.guesstoday.app
```
