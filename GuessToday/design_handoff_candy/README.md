# Handoff — GuessToday · refonte « Candy »

> **À coller dans Claude Code comme brief de départ.** Lis ce README en entier, puis explore le dossier `design-files/`. Ton objectif : **intégrer la direction visuelle « Candy » dans le vrai codebase de GuessToday**, écran par écran.

---

## 0. Prompt de départ (copie/colle dans Claude Code)

```
Je veux intégrer une nouvelle direction visuelle (« Candy ») dans mon site/app GuessToday.

Le dossier design_handoff_candy/ contient :
- design-files/  → des maquettes HTML/React de référence (look & comportement visés)
- ce README       → tokens, specs écran par écran, comportements

Les fichiers HTML sont des RÉFÉRENCES de design, pas du code à copier tel quel.
Recrée ces écrans dans MON environnement existant (framework, design system,
routing, state) en suivant mes conventions de code. Si une partie n'a pas
encore d'environnement, propose-moi la stack avant de coder.

Commence par :
1. Lire le README en entier + ouvrir 2-3 fichiers design-files pour comprendre le style.
2. M'expliquer ta lecture du système Candy (couleurs, profondeur 3D, typo) en 5 lignes.
3. Me proposer un plan d'intégration par écran (ordre, fichiers touchés) AVANT de coder.
4. Implémenter les design tokens (section 3) en premier, comme variables CSS / thème.
Ne code pas avant qu'on soit d'accord sur le plan.
```

---

## 1. Vue d'ensemble

GuessToday est un jeu de devinettes quotidien (films, séries, personnalités — FilmGuess / SerieGuess / FaceGuess). 3 défis par jour, 5 essais, indices progressifs, série (streak), classement entre amis, partage de score sans spoiler.

« Candy » est une refonte visuelle qui rend l'app **plus « jeu »** : chaleureuse, tactile, arcade soft. C'est l'inverse d'un dashboard SaaS — fond crème, couleurs bonbon, **profondeur 3D par ombres dures**, gros éléments arrondis, typo arrondie (Fredoka).

## 2. À propos des fichiers de design

Les fichiers de `design-files/` sont des **maquettes de référence en HTML/React (via Babel in-browser)** — elles montrent le rendu et le comportement visés, **pas du code de production à copier directement**. Ta tâche est de **recréer ces écrans dans l'environnement existant de GuessToday** (React, Vue, Svelte, SwiftUI… selon ton codebase) avec ses patterns établis (design system, routing, state, i18n). Si aucun environnement n'existe encore, choisis la stack la plus adaptée et propose-la avant de coder.

Le markup et le CSS sont une **source de vérité fiable pour les valeurs** (couleurs, espacements, rayons, ombres, tailles de police). Lis-les pour extraire les valeurs exactes ; ne réutilise pas l'astuce « Babel dans le navigateur » en prod.

## 3. Fidélité

**Haute fidélité (hifi).** Les maquettes sont pixel-near-perfect : couleurs, typo, espacements et profondeur sont finaux. Recrée-les fidèlement, en branchant sur tes vrais composants/état.

---

## 4. Design tokens (LA priorité — implémente-les d'abord)

Toutes les valeurs viennent de `design-files/candy.css` (`.cdy`) et `candy-mobile.css` (`.cdym`). Mets-les dans ton thème / tes variables CSS.

### Couleurs — surfaces & texte
| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#fff4ea` | fond crème de l'app |
| `--bg-2` | `#ffefe1` | fond alterné |
| `--panel` | `#ffffff` | cartes, surfaces |
| `--ink` | `#3c3050` | texte principal (prune foncé, **pas noir**) |
| `--ink-2` | `#9a8ca5` | texte secondaire |
| `--ink-3` | `#bcaec3` | texte tertiaire / placeholder |
| `--line` | `#f0e3d6` | bordures |
| `--line-2` | `#ecd9c7` | ombres dures neutres / bordures basses |

### Couleurs — par jeu (accent contextuel)
Chaque jeu a sa teinte. Le composant porte une classe `g-film` / `g-serie` / `g-face` qui définit `--acc`, `--acc-d` (foncé, pour l'ombre 3D) et `--acc-soft`.
| Jeu | `--acc` | `--acc-d` (ombre) | `--acc-soft` (fond doux) |
|---|---|---|---|
| FilmGuess (`g-film`) | `#ff7a4d` corail | `#d6582e` | `#ffe7dd` |
| SerieGuess (`g-serie`) | `#9b6cff` violet | `#7a4ae0` | `#ece1ff` |
| FaceGuess (`g-face`) | `#3bb6f5` cyan | `#1f93d6` | `#dcf1ff` |
| (réservé, 4e jeu) `g-music` | `#27c08a` menthe | `#159468` | `#d6f6ea` |

### Couleurs — sémantique
| Token | Hex | Usage |
|---|---|---|
| `--correct` / `-d` / `-soft` | `#27c08a` / `#159468` / `#d6f6ea` | bonne réponse, victoire |
| `--wrong` / `-d` / `-soft` | `#ff6b81` / `#e0445d` / `#ffe3e7` | mauvaise réponse, défaite |
| `--flame` | `#ff9436` | série (🔥 streak) |
| `--sun` / `-d` | `#ffce4a` / `#e0a91f` | médaille or (podium) |

### Typographie
- **Display + corps** : `Fredoka` (Google Fonts), poids 400/500/600/700. Titres en 600/700.
- **Chiffres, dates, codes, labels mono** : `JetBrains Mono`, 500/600/700, `font-variant-numeric: tabular-nums`.
- Échelle (desktop) : h1 36–62px, titres carte 19–27px, corps 15–17px, labels mono 10.5–13px.
- Échelle (mobile) : titres 22–38px, corps 14–16px ; **jamais < 11px**.

### Profondeur 3D — la signature Candy
Pas d'ombres floues diffuses. **Des ombres dures décalées vers le bas** (offset, blur 0), couleur = version foncée de la surface :
- Boutons : `box-shadow: 0 6px 0 var(--acc-d)` ; à l'appui `transform: translateY(4px)` + `box-shadow: 0 2px 0 …`.
- Cartes : `box-shadow: 0 6px 0 var(--line-2)` + `border: 2.5px solid var(--line)`.
- Médias/affiches : `box-shadow: 0 9px 0 #f3d9c4, 0 18px 30px rgba(120,80,40,.12)` + `border: 4px solid #fff`.
- Pastilles colorées (chips, icônes) : `box-shadow: 0 3px 0 rgba(0,0,0,.14)`.

### Rayons & bordures
- Boutons 14–18px · cartes 20–26px · inputs 14–18px · pastilles 999px (pill) · icônes carrées 9–16px.
- Bordures de carte : `2.5px` (mobile) à `3px` (desktop) `solid var(--line)`.

### Espacement
Grille souple en `flex`/`grid` + `gap`. Paddings cartes 16–26px. Gaps entre cartes 11–22px. Toujours `gap`, jamais des marges inline.

---

## 5. Écrans / vues

> Référence desktop : `GuessToday - Candy.html`. Référence mobile (web + iOS + Android) : `GuessToday - Candy Mobile.html`. Chaque section ci-dessous pointe le composant React de référence.

### A. Landing (non connecté) — `CandyLanding` (candy-screens.jsx)
- **But** : présenter le concept, convertir à l'inscription.
- **Layout** : nav (logo + liens + CTA) ; hero 2 colonnes (texte à gauche, **deck de 3 cartes de jeu en éventail** à droite, légèrement tournées/empilées) ; bande « Comment jouer » (3 étapes) ; footer.
- **Copies clés** : « Trois devinettes. Une par jour. Tout le monde joue le même défi. » · CTA « Créer un compte gratuit » + « Voir le défi du jour ».
- **Mobile** : `MobileLanding` (candy-mobile-extra.jsx) — hero centré, nav hamburger, cartes empilées, stats en ligne.

### B. Onboarding (mobile, 3 slides) — `MobileOnboarding` (candy-mobile-extra.jsx)
- 3 slides : « Un défi par jour » (film/corail) · « 5 essais, 3 indices » (série/violet) · « Joue avec tes amis » (face/cyan).
- Grande carte-glyphe 3D tournée, titre, body, **dots de progression** (le point actif s'étire en pilule), bouton Suivant / « Commencer à jouer », lien « Passer ».

### C. Connexion / Inscription — `MobileAuth` (candy-mobile-extra.jsx)
- **But** : cible de tous les CTA « Créer un compte ».
- Logo, titre (« Crée ton compte » / « Bon retour ! »), **boutons sociaux** (Apple noir, Google blanc), séparateur « ou avec un e-mail », champs (Pseudo si signup, E-mail, Mot de passe), CTA primaire, lien bascule login/signup, mention légale.
- `mode="signup" | "login"`.

### D. Hub (connecté) — `CandyHub` (desktop) / `MobileHub` (mobile)
- **But** : point d'entrée quotidien.
- En-tête « Salut {prénom} 👋 » + date mono + **série 🔥**. Barre « défis du jour » avec progression (dots, X/3 terminé). **3 cartes de jeu** (en-tête coloré par jeu + glyphe, état « réussi 3/5 » avec pastilles d'essais ou « à jouer » + CTA). Carte récap « score du jour ».
- Mobile : header compact + **tab bar basse** (Jeux · Stats · Classement · Profil).

### E. Écran de jeu (arène) — `CandyGame` (candy-game.jsx) / `MobileGameBody`+`MobileGame` (candy-mobile.jsx)
- **Template unique piloté par config** `GAME_CFG` (film/serie/face) × `state` (`start` | `playing` | `won` | `lost` | `loading`). **Recrée cette abstraction**, c'est le cœur du produit.
- Éléments : **sélecteur de jeux** (3 onglets, pour changer de défi sans quitter) ; pastilles d'essais (5) ; média (affiche nette, OU **photo floue constante pour FaceGuess** + extrait biographique) ; titre ; champ de saisie + bouton Valider ; **plateau de tentatives** (lignes wrong ✕ / skip → / correct ✓ avec indice de proximité, ex. « 2010 · trop tôt ↑ ») ; **3 indices** (1 se déverrouille par essai raté) ; bouton « Passer l'essai ».
- États finaux : bandeau victoire (vert, 🎉) / défaite (😣), réponse révélée sur le média, boutons Partager / Stats.
- Couleur d'accent = automatique via la classe `g-{jeu}`.

### F. Fin de partie — invité — `MobileGuestArena` + `MobileGuestWin` (candy-mobile-extra.jsx) ; desktop `CandyGuestWin`/`CandyArenaGuest` (candy-screens.jsx)
- Jouer **sans compte** (bandeau « Tu joues en invité »), puis au moment de la victoire : **mur d'inscription doux** (« Ne perds pas ce score », 3 bénéfices 🔥/📊/👥, CTA créer un compte, sortie « continuer sans compte ») + teaser « +2 défis t'attendent ».
- Schéma : zéro friction à l'entrée, conversion au pic d'émotion.

### G. Résultat & partage — `CandyResult` (candy-social.jsx) / `MobileResult` (candy-mobile-extra.jsx)
- Score, réponse révélée + métadonnées, récap de partie, **panneau de partage** avec bascule « Ce jeu / Ma journée ».
- **Cartes de partage sans spoiler** : `CandyShareSingle` (un jeu) et `CandyDailyShareCard` (« Ma journée » — agrège les 3 jeux en pastilles colorées, type Wordle). Réutilisable, largeur paramétrable.

### H. Stats du jour — `CandyStats` (desktop) / `MobileStats` (mobile)
- Tuiles de métriques (taux de victoire, essais moyens, joueurs, indices moyens) + **graphiques à barres** (répartition des tentatives 1–5/X ; taux de victoire par nombre d'indices). Barres = remplissage coloré avec valeur en bout.

### I. Profil — `CandyProfile` (desktop) / `MobileProfile` (mobile)
- En-tête (avatar à initiales, pseudo, ancienneté) + stats globales (parties, victoires, %, série). **Stats par jeu** (barre de réussite + série par jeu) — *non câblées en dur aux 3 jeux : doit fonctionner avec N jeux*. Historique récent.

### J. Classement — `CandyLeaderboard` (desktop) / `MobileLeaderboard` (mobile)
- **Podium 3 places** (hauteurs différenciées, or/argent/bronze), bascule Hebdo/Mensuel, **tableau** (rang, avatar, joueur, victoires/points, moyenne, évolution ▲▼). Ligne « moi » surlignée en `--coral-soft`.

### K. Amis — `CandyFriends` (desktop) / `MobileFriends` (candy-mobile-extra.jsx)
- Recherche par pseudo + bouton Inviter. **Invitations reçues** (Accepter/Refuser), **liste d'amis** (avatar, pseudo, série), **invitations envoyées** (badge « En attente »).

### L. Menu / drawer (mobile web) — `MobileMenu` (candy-mobile-extra.jsx)
- Drawer latéral au-dessus du hub flouté : profil en tête, liens de nav, « Se déconnecter ».

### M. Footer — `CandyFooter` (candy-screens.jsx)
- Marque + baseline + réseaux ; colonnes (Les jeux / Découvrir / GuessToday) ; bas de page (© + sélecteur de langue FR/EN/ES).

---

## 6. Interactions & comportements
- **Boutons** : enfoncement physique à l'appui (`translateY` + ombre réduite). ~80ms.
- **Sélecteur de jeux** : change de défi sans recharger la page. L'onglet actif prend `--acc-soft` + bordure d'accent.
- **Indices** : verrouillés (🔒) puis révélés un par un à chaque essai raté (0→3).
- **Proximité** : chaque tentative ratée affiche un indice directionnel (année trop tôt/tard ↑↓, genre proche…).
- **Onboarding** : dots → pilule animée sur le slide actif.
- **Drawer** : scrim semi-opaque + slide depuis la droite ; le contenu derrière est flouté/atténué.
- **Confettis** (victoire desktop) : voir `Confetti` dans `directions.jsx` (chutes aléatoires déterministes).
- **Reset quotidien** : compte à rebours « Prochain défi dans HH:MM:SS ».

## 7. State (modèle mental)
- `user` : `{ pseudo, avatarInitials, streak, joinedAt }` ou invité.
- `dailyChallenge` : `{ id, date, games: [{ key, status: done|todo|locked, attempts, won }] }`.
- Par jeu : `{ key, answer, media|bio, hints[3], attempts[], state }`.
- `state` machine d'une partie : `loading → start → playing → (won|lost)`.
- Social : `leaderboard[]`, `friends[]`, `invitations{received, sent}`, `dayStats`.
- Le **template d'arène doit être agnostique au jeu** (config + état), pas un composant par jeu.

## 8. Assets
- **Aucun asset binaire** dans les maquettes : les médias (affiches, photos) sont des **placeholders à rayures**. Branche tes vraies images (affiches TMDB, photos…) à leur place. FaceGuess garde sa photo **floue** jusqu'à la fin.
- **Icônes** : SVG inline simples (glyphes film/série/face dans `GlyphC`, candy-screens.jsx ; icônes de tab bar dans `MTabBar`, candy-mobile.jsx). Remplace par ta librairie d'icônes si tu en as une.
- **Polices** : Fredoka + JetBrains Mono via Google Fonts (`@import` en tête de `candy.css`).
- **Avatars** : générés en `oklch(0.66 0.16 <hue>)` avec initiales — pas d'image.

## 9. Fichiers de référence (dans `design-files/`)
| Fichier | Contenu |
|---|---|
| `candy.css` | Design system desktop : tokens, boutons, nav, hero, cartes jeu, hub, arène (`.cdy-ar*`), social, footer, sélecteur de jeux. |
| `candy-mobile.css` | Design system mobile (`.cdym*`) : header, tab bar, arène, onboarding, auth, menu, stats, résultat, amis, mode invité. |
| `candy-screens.jsx` | Nav, Landing, Hub, Défaite, **Footer**, mode invité (desktop), `GlyphC`. |
| `candy-game.jsx` | **`CandyGame`** (template config-driven, tous les états) + `GAME_CFG` + `CandyGamePage` (page complète) + `CandySwitch`. |
| `candy-social.jsx` | Stats, Profil, Classement, Amis, Résultat, **cartes de partage** (`CandyDailyShareCard`, `CandyShareSingle`). |
| `candy-mobile.jsx` | Hub, **`MobileGameBody`/`MobileGame`**, Profil, Classement, tab bar, header (mobile). |
| `candy-mobile-extra.jsx` | Onboarding, Auth, Landing, Menu, Stats, Résultat, Amis, **mode invité** (mobile). |
| `directions.jsx` / `directions.css` | Arène + Victoire « themables » (3 directions explorées : Néon/Candy/Blocs). Candy = `k="b"`. Sert au confetti et à la comparaison. |
| `GuessToday - Candy.html` | Canvas desktop : tous les écrans desktop assemblés. |
| `GuessToday - Candy Mobile.html` | Canvas mobile : web / iOS / Android, tous les écrans. |

> Note : les `.html` chargent les `.jsx` via Babel navigateur (`<script type="text/babel">`) + un composant « design canvas » de présentation. **Ignore le canvas** — ce ne sont que des cadres de présentation ; seuls les composants `Candy*` / `Mobile*` t'intéressent.

## 10. Conseils d'intégration
1. Commence par les **tokens** (section 3) dans ton thème / `:root`. Tout en dépend.
2. Recrée le **système de profondeur** (ombres dures, états d'appui) comme utilitaires/mixins réutilisables.
3. Implémente le **contexte d'accent par jeu** (`g-film`/`serie`/`face` → `--acc*`) — beaucoup de composants en dépendent.
4. Construis le **template d'arène** (`CandyGame`) en premier parmi les écrans : c'est le plus structurant.
5. Garde tout **agnostique au nombre de jeux** (config-driven) pour pouvoir ajouter un 4e jeu (la teinte menthe `g-music` est déjà réservée).
6. Respecte la **hiérarchie typographique** (Fredoka arrondie pour le « jeu », JetBrains Mono pour tous les chiffres/dates).
