# CozyDesk Minimal 2.0 — refonte de l'espace de travail

Version 2.0.0 · même application, même base de données, nouvelle hiérarchie visuelle.
Aucune migration destructive : les dispositions, réglages et données de la 1.0 sont conservés.

---

## 1. Ce qui change, et pourquoi

La 1.0 affichait neuf widgets dès le premier lancement, une barre de titre de 46 px avec
un logo, et un dock de treize icônes de 46 px. Le bureau ressemblait à un tableau de bord
de cartes. La 2.0 part du principe inverse : **le fond d'écran est le fond, l'interface
s'efface**.

| | 1.0 | 2.0 |
|---|---|---|
| Widgets par défaut | 9 | **3** (horloge, pomodoro, tâches) |
| Coque des widgets | verre 52 % partout | **transparent par défaut**, verre au choix |
| Barre de titre | 46 px + logo + libellé | **34 px**, sans logo |
| Dock | 13 icônes, 46 px, pas d'auto-masquage | **36 px**, infobulles, auto-masquage, ancrage, raccourcis |
| Horloge | un widget parmi neuf | **point focal** : 3 tailles, 3 styles, salut optionnel |
| Personnalisation | ajout / déplacement / suppression | + apparence par widget, compact, presets, dispositions nommées |
| Réglages du bureau | éparpillés | **section « Bureau »** dédiée |

## 2. Architecture

```
src/
  components/
    dashboard/
      Dashboard.tsx        orchestration : grille, barre d'édition, bibliothèque
      WidgetFrame.tsx      coque d'un widget : drag, resize, apparence, outils
      WidgetLibrary.tsx    bibliothèque « + » (ajout, masqués, apparence)
      LayoutMenu.tsx       presets + sauvegarde/restauration de disposition
      widgetMeta.ts        icônes, modules associés, cycle d'apparence
    dock/
      Dock.tsx             lanceur minimal (auto-hide, ancrage, raccourcis)
      DockLauncher.tsx     tous les modules, toujours accessibles
    widgets/
      HeroClock.tsx        horloge principale (tailles, styles, salut)
      WidgetContent.tsx    contenu réel des 12 widgets (inchangé fonctionnellement)
    common/TitleBar.tsx    barre de titre fine
  modules/settings/
      WorkspaceSection.tsx réglages « Bureau » (horloge, widgets, dock, ambiance, dispositions)
  stores/
      dashboard.ts         schéma v2 + migration v1 → v2
      settings.ts          schéma v2 + migration v1 → v2 + application au DOM
  styles/
      workspace.css        nouveau : bureau, horloge, bibliothèque, réglages
      dock.css             réécrit
      shell.css            barre de titre fine
      windows.css          chrome des fenêtres
      tokens.css           tokens de géométrie (--titlebar-h, --dock-reserve…)
```

### Modèle d'apparence

L'apparence est résolue par widget, avec repli sur le réglage global :

```
widget.appearance ?? settings.workspace.widgets.appearance   // « transparent » par défaut
```

Trois matériaux, chacun avec son coût :

| Apparence | Fond | Flou | Usage |
|---|---|---|---|
| `transparent` | aucun | **aucun** | défaut, texte directement sur le fond |
| `subtle` | verre 18 % | 14 px | quand le fond d'écran nuit à la lecture |
| `glass` | verre 44 % | 24 px | widgets denses (calendrier, notes) |

Le profil **Performance** coupe le `backdrop-filter` des widgets, le mode **flat** aussi ;
aucun flou n'est appliqué à tous les éléments simultanément.

### Géométrie

Les constantes sont désormais centralisées et pilotées par les réglages :
`--titlebar-h` (34 px), `--dock-reserve` (18 / 36 / 88 px selon dock), `--dock-side`
(0 / 24 / 76 px), `--ws-gap` (espacement), `--ws-margin` (marges du bureau).
`stores/windows.ts` lit les mêmes valeurs pour calculer les bornes de l'espace de travail,
donc le snap, la maximisation et le cadrage restent cohérents avec le dock choisi.

L'horloge utilise les **unités de conteneur** (`cqw`/`cqh`) pour rester proportionnée
quelle que soit la taille du widget, avec un `font-size` de repli.

## 3. Migrations (non destructives)

Deux schémas persistés changent de version. Les deux migrations sont des fonctions pures,
exportées et testées.

**`cozydesk.settings.v1` — v1 → v2** (`migrateSettings`)
- conserve thème, mode, accent, wallpaper, pomodoro, profil graphique ;
- ajoute `workspace` (horloge, widgets, dashboard, dock, motion) ;
- reprend `reducedMotion: true` existant en `motion: 'reduced'`.

**`cozydesk.dashboard.v1` — v1 → v2** (`migrateDashboard`)
- reprend la disposition existante **telle quelle**, y compris les widgets masqués ;
- initialise `savedLayouts: []` ;
- n'applique jamais la disposition minimale à un utilisateur existant (elle ne sert que
  de valeur initiale et de preset).

Aucune donnée IndexedDB n'est touchée : les 12 modules, les tâches, notes, sessions,
habitudes et réglages gardent leur schéma. Le chemin `userData` reste `CozyDesk`
(`productName` et `appId` inchangés), donc l'application 2.0 relit les données de la 1.0.

## 4. Expérience de personnalisation

- **Hors édition** : un seul contrôle, le bouton `+` discret (30 px, opacité 42 %).
- **En édition** (`Ctrl+Maj+D` ou `+`) : barre flottante en bas — Widget, Disposition,
  Apparence, Terminer ; chaque widget révèle ses outils **au survol** : apparence,
  compact, masquer, retirer, poignée de redimensionnement.
- **Dispositions** : presets Minimal / Concentration / Classique (les 9 widgets de la 1.0),
  plus des dispositions nommées sauvegardables et restaurables.
- **Réglages « Bureau »** : taille et style d'horloge, secondes, date, salut et prénom,
  apparence par défaut, espacement, marges, dock (visibilité, auto-masquage, position,
  raccourcis), voile du fond d'écran, intensité des animations, dispositions.

## 5. Vérifications

```
npm run typecheck     # 0 erreur (2 tsconfig)
npm run lint          # 0 erreur, 0 avertissement
npm run test          # 84 tests (23 nouveaux)
npm run build         # Vite + esbuild, 12 modules en chunks séparés
```

Nouveaux tests :
- `tests/workspace.test.tsx` (18) — migrations v1→v2 (réglages et dashboard), disposition
  par défaut à 3 widgets, apparence par widget et globale, compact/masquage, presets,
  sauvegarde/restauration/suppression de disposition, fusion partielle des réglages,
  réserve du dock et bornes de l'espace, application au DOM, horloge (salut, secondes,
  date, taille, mode compact).
- `tests/dashboard.test.tsx` (5) — rendu des 3 widgets, horloge présente comme élément
  principal, barre d'édition révélée seulement en édition, bibliothèque et ajout de widget,
  application d'apparence à tous.
- `tests/stores.test.tsx` — l'assertion « > 5 widgets par défaut » est remplacée par
  « exactement 3 », conformément à l'objectif de sobriété.

## 6. Compilation des exécutables Windows

Les artefacts sont nommés explicitement, donc la version 1.0 n'est jamais écrasée :

```
CozyDesk-Minimal-2.0-Portable.exe
CozyDesk-Minimal-2.0-Setup.exe
```

Sur Windows (recommandé, icône incrustée nativement) :

```
npm ci
npm run dist:win
```

Sous Linux sans wine :

```
npm run dist:win:nosign     # signAndEditExecutable=false
```

L'environnement d'exécution de cette refonte ne peut pas télécharger le runtime Electron
(les assets de release GitHub y sont bloqués) : la compilation Windows est donc réalisée
par `.github/workflows/build-windows.yml` sur un runner `windows-latest`, qui exécute
typecheck, lint, tests, build puis `electron-builder --win --x64` et publie les deux
exécutables. Voir `docs/QA-2.0.md` pour le détail des vérifications et des limites.
