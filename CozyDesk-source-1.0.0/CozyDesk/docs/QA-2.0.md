# Campagne QA — CozyDesk Minimal 2.0

Date : 2026-11-05 · Cible : Windows x64

## 1. Chaîne statique et tests (exécutés localement, environnement Linux)

| Commande | Résultat |
|---|---|
| `npm run typecheck` | 0 erreur (applicatif + processus principal, `strict`) |
| `npm run lint` | 0 erreur, 0 avertissement (eslint 9, typescript-eslint, react-hooks) |
| `npm run test` | **84 tests / 9 fichiers — tous verts** |
| `npm run build` | Vite + esbuild OK, 12 modules en chunks paresseux |

Détail des suites : `dateUtils` (9), `pomodoroEngine` (7), `srs` (6), `streaks` (9),
`fuzzy` (6), `storage` (6), `legacy` (4), `stores` (14), `workspace` (18),
`dashboard` (5).

Contrôles du bundle de production :
- `dist/assets/*.css` contient bien `.hero-clock`, `[data-style='inline']`,
  la bibliothèque et la barre d'édition ;
- `dist/assets/index-*.js` contient `hero-clock`, `workspace-add`, `library-panel`,
  les saluts (`Bon après-midi`) — la refonte est réellement embarquée, pas seulement
  présente dans les sources.

## 2. Ce qui n'a pas pu être exécuté dans cet environnement

Ces limites sont réelles et explicitées, pas contournées :

1. **Runtime Electron indisponible.** Le téléchargement des binaires Electron se fait via
   `objects.githubusercontent.com`, bloqué au niveau TCP dans cet environnement.
   `npm install` a donc été exécuté avec `ELECTRON_SKIP_BINARY_DOWNLOAD=1` : les tests,
   le typecheck, le lint et le build (qui n'ont pas besoin du binaire) sont valides,
   mais `electron .` ne peut pas être lancé ici.
2. **Aucun navigateur / aucune pile graphique.** Ni Chromium, ni Firefox, ni Xvfb ne sont
   présents ; il n'est donc pas possible de produire une capture d'écran du rendu.
   La vérification visuelle a été remplacée par des tests DOM (jsdom) sur le bureau réel :
   trois widgets rendus, horloge présente, barre d'édition absente hors édition,
   bibliothèque fonctionnelle, apparence appliquée à tous les widgets.
3. **`wine` non installable** (dépôts Debian inaccessibles) : `electron-builder` ne peut pas
   produire d'artefact Windows localement, indépendamment du point 1.

Conséquence : **l'exécutable Windows est compilé par GitHub Actions sur un runner
`windows-latest`**, à partir de ce dépôt. C'est la même chaîne `electron-builder` que
`npm run dist:win`, donc l'exe contient bien le code redesigné (front `dist/` + main
`dist-electron/`), et non un ancien binaire renommé.

## 3. Vérification du paquet Windows

À la fin du workflow, les éléments suivants sont contrôlés :

- `release/CozyDesk-Minimal-2.0-Portable.exe` et `release/CozyDesk-Minimal-2.0-Setup.exe`
  existent et ont une taille plausible (plusieurs dizaines de Mo) ;
- l'archive `win-unpacked` est inspectée : `app.asar` contient les marqueurs de la 2.0
  (`hero-clock`, `workspace.css`) et `package.json` porte la version `2.0.0` ;
- les empreintes SHA-256 des deux exécutables sont publiées avec la livraison.

L'exécution réelle de l'exe (lancement, widgets, modules, persistance) doit être faite
sur une machine Windows : ce conteneur ne peut pas exécuter de binaire Windows.
La procédure de recette manuelle est décrite en section 5.

## 4. Compatibilité des données

- `productName` (`CozyDesk`) et `appId` (`app.cozydesk.desktop`) sont inchangés :
  le répertoire `userData` reste le même, donc la 2.0 relit les données IndexedDB de la 1.0.
- Deux schémas `localStorage` passent en v2 avec migration pure et testée
  (`migrateSettings`, `migrateDashboard`) : aucune disposition, aucun réglage n'est perdu.
- Aucune migration IndexedDB : le schéma des 12 modules est intact.
- L'ancien exécutable n'est ni déplacé ni écrasé ; les nouveaux artefacts portent
  `CozyDesk-Minimal-2.0-*`.

## 5. Recette manuelle sur Windows

1. Lancer `CozyDesk-Minimal-2.0-Portable.exe`.
2. Vérifier au premier lancement : trois widgets (horloge, pomodoro, tâches),
   horloge lisible et qui avance, dock discret en bas.
3. Ouvrir chaque module depuis le dock puis depuis « Tous les modules » (les 12 doivent
   s'ouvrir, se déplacer, se redimensionner, se réduire et se restaurer).
4. Pomodoro : démarrer, mettre en pause, laisser tourner — le temps suit après
   réduction de la fenêtre.
5. Personnalisation : `+` → ajouter un widget, changer son apparence (transparent /
   subtil / verre), le déplacer, le redimensionner, le masquer ; `Ctrl+Maj+D` pour sortir.
6. Réglages → Bureau : taille/style d'horloge, marges, espacement, dock (position,
   auto-masquage, raccourcis), voile du fond d'écran, intensité des animations.
7. Fermer l'application, la relancer : la disposition, les réglages et les données
   doivent être identiques.
8. Si la 1.0 était déjà installée : vérifier que tâches, notes, sessions, habitudes et
   fond d'écran sont toujours là, et que la disposition antérieure est conservée.

## 6. Profils de performance

| Profil | Comportement 2.0 |
|---|---|
| Haute qualité | flou sur les widgets `subtle`/`glass` uniquement, jamais sur les transparents |
| Équilibrée | flou réduit (×0.65), opacité renforcée |
| Performance | `backdrop-filter` coupé sur les widgets, dock opaque, blobs figés |

Les widgets transparents (défaut) n'appliquent **aucun** filtre : le rendu reste fluide
même sur un GPU Intel intégré.
