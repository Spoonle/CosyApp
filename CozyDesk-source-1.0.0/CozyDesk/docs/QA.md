# Campagne QA — CozyDesk 1.0.0

Date : 2026-11-05 · Environnement de build : Linux (Node 24, Electron 33.4.11)

## 1. Tests automatisés — `npm run test` (vitest, jsdom + fake-indexeddb)

**61/61 tests passent** — 8 fichiers :

| Fichier | Couverture |
|---|---|
| `dateUtils.test.ts` (9) | clés de dates locales, additions à travers mois/années, grille du mois (5-6 semaines, lundi), `humanDate` (aujourd’hui/demain/hier), formats, numéro de semaine ISO. |
| `pomodoroEngine.test.ts` (7) | calcul du temps restant par horodatage (fiable si minimisé), pause/reprise conservant le restant, transitions de phases, pause longue après 4 cycles, **rattrapage des phases écoulées pendant l'absence (reconcile)**, réinitialisation. |
| `srs.test.ts` (6) | SM-2 : première révision, accélération « facile », échec (facilité réduite, répétitions à zéro), bornes de facilité [1.3 ; 2.8], « difficile » plus lent que « facile ». |
| `streaks.test.ts` (9) | jours attendus selon fréquence, séries actuelles (aujourd'hui non terminé ne casse pas), trous, jours non attendus ignorés, records, taux de complétion — avec horloge figée. |
| `fuzzy.test.ts` (6) | normalisation des accents, sous-séquences ordonnées, bonus de préfixe, préférence des cibles courtes. |
| `storage.test.ts` (7) | CRUD tâches, requêtes indexées, blobs, validation des lots export, **import fusionnant sans supprimer + sauvegarde préalable**, rejet enregistrement par enregistrement. |
| `legacy.test.ts` (4) | détection des clés CozyDesk hors clés actuelles, **import sans jamais supprimer les originaux**, robustesse aux valeurs non JSON. |
| `stores.test.tsx` (14) | fenêtres (ouverture bornée, focus z-index, snap gauche, maximise/restaure, minimise, reconcile des modules inconnus/hors écran), dashboard (défauts cohérents, bornes, ajout/réinitialisation), composants (bouton, état vide, barre de progression bornée). |

## 2. Statique

- `npm run typecheck` : **0 erreur** (2 tsconfig : applicatif + processus principal, `strict`).
- `npm run lint` (eslint 9, typescript-eslint, react-hooks) : **0 erreur, 0 avertissement**.
- `npm run build` : bundling Vite réussi — 12 modules en bundles paresseux séparés, music-metadata
  en chunks asynchrones, CSP stricte dans `index.html`.

## 3. Lancement réel + vérification visuelle (headless Xvfb + captures analysées)

L'application a été lancée réellement (`electron .` sous Xvfb 1440×900) avec un mode test dédié
(`--smoke-test=<fichier> --open=<modules>[;mode=dark|light;flat=1;rm=1]`), **20 captures**
analysées (analyse pixel programmatique + modèle de vision). Défauts trouvés → corrigés → re-vérifiés :

1. **Texte quasi noir sur fond sombre** (mode `auto` résolu clair + presets de wallpaper sombres
   codés en dur) → presets **clair/sombre** par mode ; vérifié : luminosité moyenne 43 (sombre)
   vs 235 (clair), `--text-rgb` correct par mode.
2. **Bouton de thème isolé** au centre de la barre de titre → déplacé avec les contrôles fenêtre.
3. **Doublon d'engrenage** dans le dock (Paramètres listé deux fois) → dédupliqué.
4. **Grande zone vide** sous les widgets → hauteur de ligne dynamique (la grille remplit l'écran).
5. **Contraste insuffisant** des textes secondaires/muted → luminosité des tokens relevée dans les
   deux modes.
6. **Chevrons de citation quasi invisibles** → boutons verre stylés.
7. **Fenêtres trop transparentes** (dashboard lisible à travers) → alphas des matériaux relevés
   (flottant 0.58 → 0.78) ; vérifié par mesure pixel : 0 pixel clair résiduel dans la zone de
   saignement.
8. **Dernière ligne du calendrier** hors mois incohérente → grille 5-6 semaines avec semaines
   entièrement hors mois retirées (usage `grid[grid.length-1]` sécurisé).
9. **Off-by-one** `mode=`.slice(4) dans le harnais de test → corrigé (slice(5)).

Modules vérifiés visuellement en fenêtres flottantes : tâches, Pomodoro (anneau + 25:00 + boutons),
notes (liste + éditeur), musique, ambiance, calendrier (grille + vues), statistiques, étude,
habitudes, journal, paramètres (5 onglets), fonds d'écran.

## 4. Contraintes de l'environnement de build (documentées, non bloquantes)

- **Captures d'écran en rendu logiciel** : `backdrop-filter` + `will-change` sur les fenêtres
  déclenchent un bug Chromium de lecture GPU (`non-existent mailbox`) → les captures de modules
  utilisent un mode `flat=1` (sans flou) propre au harnais de test ; **aucun impact sur Windows
  avec GPU**. Découvert au passage : l'accumulation d'état persisté (fenêtres restaurées)
  aggravait le bug → les captures utilisent un profil vierge.
- **Installateur NSIS** : la finalisation de l'installateur et l'incrustation de l'icône dans
  l'.exe exigent `wine` sous Linux (pas de droits d'installation ici) → le paquet portable
  `win-unpacked` (complet : exe + runtime + app.asar vérifié) est livré zippé ; sur Windows,
  `npm run dist` produit l'installateur NSIS et le portable avec icônes nativement
  (`signAndEditExecutable` est à réactiver dans `electron-builder.yml`).
- **Polices** : l'environnement de test ne dispose pas d'Inter/Segoe UI → repli système ; sur
  Windows, la pile `Segoe UI Variable` s'applique automatiquement.

## 5. Cas limites testés (unitaires ou manuels via harnais)

- tâches : création rapide Entrée, statuts, sous-tâches, archivage, confirmation avant suppression ;
- notes : autosauvegarde 600 ms, révisions (20 max), restauration ;
- Pomodoro : phases écoulées pendant l'absence journalisées une seule fois ; pause → reprise
  conservant le restant ;
- habitudes : jour non terminé ne casse pas la série ; jours non attendus ignorés ;
- étude : échec SM-2 (révision le jour même), bornes de facilité ;
- stockage : import de lots invalides (rejet partiel), base verrouillée (écran d'erreur explicite),
  blobs (pochettes) ;
- météo : désactivée par défaut (aucune fausse donnée), source réelle si configurée.

## 6. Résultat

- Tests : **61/61 ✓** · typecheck ✓ · lint ✓ · build ✓ · lancement réel ✓ · captures vérifiées ✓ ;
- Livrables : source complète, portable Windows (zip), documentation, ce rapport.
