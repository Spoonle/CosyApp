# Campagne QA — CozyDesk 2.0

Date : 2026-11-05 · Cible : Windows x64

## 1. Chaîne statique et tests (exécutés localement, environnement Linux)

| Commande | Résultat |
|---|---|
| `npm run typecheck` | 0 erreur (applicatif + processus principal, `strict`) |
| `npm run lint` | 0 erreur, 0 avertissement (eslint 9, typescript-eslint, react-hooks) |
| `npm run test` | **87 tests / 11 fichiers — tous verts** |
| `npm run build` | Vite + esbuild OK, 12 modules en chunks paresseux |

Détail des suites : `dateUtils` (9), `pomodoroEngine` (7), `srs` (6), `streaks` (9),
`fuzzy` (6), `storage` (6), `legacy` (4), `stores` (14), `workspace` (18),
`dashboard` (5), `verifyPackage` (3).

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
`npm run package`, donc l'exe contient bien le code redesigné (front `dist/` + main
`dist-electron/`), et non un ancien binaire renommé.

## 3. Vérification du paquet Windows — exécutée et réussie

Le workflow `.github/workflows/build-windows.yml` a été exécuté sur un runner
`windows-latest` à partir du commit livré (dernier run `42077660134`, conclusion **success**).
Trois vérifications ont porté sur le binaire réellement produit :

**a. Contenu de `app.asar`** (`scripts/verify-package.cjs`) — **9/9** :

| Contrôle | Résultat |
|---|---|
| version `2.0.0` déclarée | ✅ |
| horloge principale (CSS) | ✅ |
| apparences de widgets (CSS) | ✅ |
| bouton d'ajout discret (JS) | ✅ |
| bibliothèque de widgets (JS) | ✅ |
| lanceur de modules (JS) | ✅ |
| réglages du bureau (JS) | ✅ |
| salut de l'horloge (JS) | ✅ |
| fenêtres flottantes (CSS) | ✅ |

Archive : 42 entrées (1 CSS, 33 JS). Un test unitaire (`tests/verifyPackage.test.ts`)
démontre que le même vérificateur **refuse** un ancien paquet 1.0 renommé.

**b. Lancement de l'exécutable empaqueté** — `win-unpacked\CozyDesk.exe` démarré avec
`--smoke-test --open=tasks,notes,settings --wait=7000` : code de sortie **0**, capture
produite de **≈ 868 Ko** en **1024 × 720**, modules ouverts pendant la capture.
C'est le binaire du paquet, pas le serveur Vite.

**c. Persistance** — le répertoire `%APPDATA%\CozyDesk` est créé au lancement
(base IndexedDB ouverte), ce qui matérialise le chemin de données conservé depuis la 1.0.

### Artefacts publiés

| Fichier | Taille |
|---|---|
| `CozyDesk-2.0-Final-Portable.exe` | ≈ 78 Mo |
| `CozyDesk-2.0-Final-Setup.exe` | ≈ 78 Mo |
| `smoke-2.0.png` (preuve de rendu) | ≈ 868 Ko |

Les tailles exactes varient de quelques octets d'un build à l'autre (horodatage embarqué
par electron-builder) : elles sont donc indiquées en ordre de grandeur.

Publication : `https://github.com/Spoonle/CozyDesk/releases/tag/v2.0.0` — l'exécutable 1.0
d'origine n'est ni déplacé ni écrasé.

### Limite restante, explicitement assumée

Le rendu a été prouvé (capture de taille et de dimensions attendues), mais **je n'ai pas pu
regarder cette capture** : les assets de release passent par `objects.githubusercontent.com`,
bloqué depuis cet environnement. La recette visuelle humaine reste donc à faire en ouvrant
`smoke-2.0.png` ou l'application sur Windows (section 5).

## 4. Compatibilité des données

- `productName` (`CozyDesk`) et `appId` (`app.cozydesk.desktop`) sont inchangés :
  le répertoire `userData` reste le même, donc la 2.0 relit les données IndexedDB de la 1.0.
- Deux schémas `localStorage` passent en v2 avec migration pure et testée
  (`migrateSettings`, `migrateDashboard`) : aucune disposition, aucun réglage n'est perdu.
- Aucune migration IndexedDB : le schéma des 12 modules est intact.
- L'ancien exécutable n'est ni déplacé ni écrasé ; les nouveaux artefacts portent
  `CozyDesk-2.0-Final-*`.

## 5. Recette manuelle sur Windows

1. Lancer `CozyDesk-2.0-Final-Portable.exe`.
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
