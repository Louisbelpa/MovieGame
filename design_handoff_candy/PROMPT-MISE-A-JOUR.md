# Prompt — mettre le codebase à jour PAR PARITÉ avec les maquettes

> Colle ce bloc dans Claude Code, à la racine du repo GuessToday. Le dossier
> `design_handoff_candy/design-files/` contient les maquettes À JOUR (desktop +
> mobile). Objectif : amener CHAQUE page du projet à la **parité visuelle exacte**
> avec sa maquette, desktop ET mobile.

```
CONTEXTE
J'ai déjà intégré une bonne partie de la refonte « Candy », mais certaines pages
de mon projet ne sont PLUS à jour par rapport aux maquettes. Je veux une parité
visuelle EXACTE avec les maquettes, sur desktop ET mobile.

Les maquettes de référence (HTML/React, à lire comme source de vérité de STRUCTURE
et de VALEURS, pas à transpiler) sont dans :
- design_handoff_candy/design-files/GuessToday - Candy.html          (desktop)
- design_handoff_candy/design-files/GuessToday - Candy Mobile.html   (mobile : web + iOS + Android)
- les composants Candy*/Mobile* (.jsx) + candy.css / candy-mobile.css  (markup & tokens exacts)
- design_handoff_candy/README.md                                      (design system + specs)

RÈGLE D'OR (lis-la deux fois)
Pour chaque écran, la STRUCTURE de la maquette (arborescence des blocs, ordre des
éléments, hiérarchie, espacements, profondeur 3D, typo) est la SOURCE DE VÉRITÉ.
Si ma page actuelle diffère, tu RÉÉCRIS la page pour matcher la maquette — tu ne
te contentes JAMAIS de recolorer ou d'ajuster quelques styles. Pas de reskin.

═══════════════════════════════════════════════════════════
PHASE 1 — AUDIT (n'écris aucun code ; rends-moi un tableau)
═══════════════════════════════════════════════════════════
1. Liste toutes les pages/écrans de MON projet (desktop et mobile).
2. Pour chacune, trouve la maquette correspondante dans design-files (composant +
   artboard). Si une maquette n'a pas d'équivalent dans mon code → « MANQUANT ».
3. Pour chaque paire, compare STRUCTURELLEMENT (pas les couleurs) et classe :
   - ✅ CONFORME (déjà identique à la maquette)
   - 🟡 ÉCART MINEUR (espacements, ordre, un bloc déplacé)
   - 🔴 ÉCART MAJEUR (layout différent, blocs manquants, structure à refaire)
   - ➕ MANQUANT (écran de la maquette absent du projet)
4. Rends-moi un TABLEAU : Page | Plateforme (desktop/mobile) | Maquette de réf |
   Verdict | Ce qui diffère concrètement. 
Ne corrige rien tant que je n'ai pas validé ce tableau et l'ordre de passage.

Liste de contrôle des écrans à couvrir (desktop ET mobile) — coche que rien ne
manque dans ton audit :
  Landing · Onboarding (mobile) · Connexion/Inscription · Hub (accueil connecté) ·
  Écran de jeu / arène (FilmGuess, SerieGuess, FaceGuess — états
  start/playing/won/lost/loading) · Sélecteur de jeux (3 onglets) ·
  Navigateur de date + Archive calendrier (jours précédents) ·
  Parcours invité (arène découverte + mur d'inscription à la victoire) ·
  Résultat & partage (carte « un jeu » + carte « Ma journée » sans spoiler) ·
  Stats du jour · Profil · ÉDITION de profil · Classement (podium + tableau) ·
  Amis (reçues / liste / envoyées) · Menu drawer (mobile) · Footer ·
  Vues invité des pages : Stats (accessible) / Classement·Profil·Amis (mur d'inscription).

═══════════════════════════════════════════════════════════
PHASE 2 — FONDATIONS (avant tout écran)
═══════════════════════════════════════════════════════════
Vérifie/mets à jour, en lisant candy.css + candy-mobile.css :
- Design tokens (couleurs surfaces/texte, accent PAR JEU g-film/serie/face,
  sémantique correct/wrong/flame) dans mon thème.
- La PROFONDEUR 3D = ombres DURES décalées (offset, blur 0), boutons qui
  s'enfoncent à l'appui. C'est la signature ; si elle est absente, rien ne « fait
  jeu ».
- Polices : Fredoka (titres/corps) + JetBrains Mono (chiffres/dates/labels).
- Rayons, bordures (2.5–3px), grilles flex/grid avec gap.
Montre-moi un diff des tokens avant de continuer.

═══════════════════════════════════════════════════════════
PHASE 3 — CORRECTION, ÉCRAN PAR ÉCRAN (un seul à la fois)
═══════════════════════════════════════════════════════════
Traite d'abord les 🔴 ÉCART MAJEUR et ➕ MANQUANT, puis les 🟡 mineurs.
Pour CHAQUE écran, fais ce cycle et n'avance pas sans mon OK :
a. Ouvre le composant de la maquette, énonce sa structure (blocs, ordre, sous-parties).
b. Réécris MA page pour reproduire cette structure exacte, branchée sur mes vraies
   données/état (pas de données en dur si j'ai déjà un state/une API).
c. Lance l'app, va sur l'écran, screenshot. Ouvre la maquette correspondante.
   Compare côte à côte (desktop ET responsive/mobile). Corrige tout écart visible
   (layout, blocs manquants, proportions, profondeur, typo) AVANT de continuer.
d. Montre-moi screenshot + maquette et attends validation.

POINTS DE VIGILANCE (déjà sources d'erreurs)
- Ne PAS faire un simple reskin : reproduis la structure.
- Hub : les cartes de jeu NE montrent PAS l'image/affiche du jour (juste en-tête
  coloré + chip + statut/CTA). Pas de spoiler.
- Arène : template UNIQUE piloté par (jeu × état), pas une page par jeu. Inclut le
  navigateur de date (accès jours précédents) et le sélecteur de jeux.
- Archive : calendrier en grille 7 colonnes — attention au bug aspect-ratio+1fr,
  utilise grid-template-columns: repeat(7, minmax(0,1fr)) sinon ça s'empile en 1
  colonne.
- Invité : Stats ACCESSIBLE (données publiques) avec bandeau de conversion ;
  Classement/Profil/Amis = mur d'inscription, pas une erreur. L'arène invité a la
  tab bar (mobile) comme les autres écrans.
- FaceGuess : photo FLOUE constante + bio partielle + indices textuels.
- Footer : vraies icônes réseaux (Instagram/TikTok/X), pas de symboles abstraits.
- Édition de profil : avatar (sélecteur de couleur) + champs + toggles de
  préférences + zone suppression + Enregistrer/Annuler. Existe sur les 4 surfaces.
- Mobile : header compact + tab bar basse (Jeux/Stats/Classement/Profil) ; jamais
  de texte < 11px ; cibles tactiles ≥ 44px.
- Garde tout AGNOSTIQUE au nombre de jeux (config-driven) — un 4e jeu doit pouvoir
  s'ajouter sans réécrire (teinte menthe g-music déjà réservée).

Le canvas de présentation autour des maquettes (cadres téléphone, grille
d'artboards) est juste de la mise en scène : IGNORE-le, ne reproduis que les
composants Candy*/Mobile*.

Commence par la PHASE 1 (l'audit) et rends-moi le tableau. N'écris pas de code
avant ma validation.
```

## Pourquoi ce prompt marche
1. **Phase d'audit obligatoire** → t'obtiens d'abord la carte de ce qui diverge,
   au lieu que Claude Code touche au hasard.
2. **« structure = source de vérité, réécris la page »** répété → empêche le reskin
   qui t'a déjà piégé.
3. **Boucle screenshot maquette vs. app, écran par écran** → la parité visuelle est
   vérifiée, pas supposée.
4. **Points de vigilance** = la liste exacte des décisions de design récentes
   (hub sans image, archive, états invité, édition profil, footer) pour qu'aucune ne
   se reperde.

## Conseils
- Fais valider le tableau d'audit, puis traite **un écran par message** : la
  fidélité chute quand on lui demande 10 écrans d'un coup.
- Si Claude Code n'a pas de preview navigateur, ajoute : « ouvre les .html/.jsx de
  référence et lis le markup ligne par ligne ; reproduis cette arborescence ».
- Travaille desktop ET mobile pour chaque écran avant de le clore (responsive).
