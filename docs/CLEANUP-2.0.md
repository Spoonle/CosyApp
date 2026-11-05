# Audit, réorganisation et stabilisation — rapport

Date : 2026-11-05 · Branche : `arena/6dfb4f46-cosyapp` · Base : `0752c65`
Périmètre : le dépôt entier (code, configs, CI, docs, assets), sans changer
l'identité visuelle ni les fonctionnalités.

Compteurs de référence : **153 fichiers modifiés, +2 172 / −1 354 lignes**,
125 → 148 fichiers suivis, 5 commits dédiés.

---

## 1. Ce que l'audit a trouvé

| # | Problème constaté | Preuve | Traitement |
|---|---|---|---|
| 1 | Projet imbriqué dans `CozyDesk-source-1.0.0/CozyDesk/` — un développeur clone un dossier vide à la racine et doit deviner où est le code | `ls` à la racine | projet aplati à la racine du dépôt |
| 2 | `README.md` racine de 24 octets (« App to focus ») à côté d'un README complet ailleurs | `cat README.md` | README unique, complet, à la racine |
| 3 | Aucune `LICENSE` alors que `package.json` déclare MIT | `ls` | LICENSE MIT ajoutée |
| 4 | Frontières Electron implicites : `electron/` à côté de `src/`, contrat IPC (`src/types/ipc.ts`) importé par le preload depuis le dossier du rendu | `grep types/ipc` | `src/main`, `src/preload`, `src/renderer`, `src/shared` |
| 5 | Un fichier de 873 lignes contenant les 12 widgets | `wc -l WidgetContent.tsx` | 1 fichier par widget + aiguillage de 47 lignes |
| 6 | 19 exports jamais utilisés | analyse d'occurrences sur `src` + `tests` + `scripts` | supprimés (liste §2) |
| 7 | `clamp` exporté mais inutilisé, tandis que `Math.min(Math.max(…))` était réécrit 4 fois | `grep clamp` | une seule implémentation réutilisée |
| 8 | Table `WEEKDAYS_FULL_FR` dupliquée dans le rendu, à côté d'une `WEEKDAYS_FULL` inutilisée dans `dateUtils` | `grep WEEKDAYS` | `weekdayName()` unique |
| 9 | Résolution de l'icône de fenêtre dupliquée (config + fenêtre), dont une liste de candidats construite puis jetée | lecture `config.ts` / `main-window.ts` | une seule fonction, testée par le type |
| 10 | Branche `--diagnose` du smoke-test interrogeant `.titlebar-brand`, sélecteur supprimé lors de la QA | lecture `main.ts` | supprimée |
| 11 | Deux icônes mortes (`build/icon-256.png`, `build/icon-512.png`) : copies non référencées, que `generate-icon.mjs` ne produit pas | `md5sum`, `grep` | supprimées |
| 12 | 4 scripts npm redondants (`dist`, `dist:dir`, `dist:win`, `dist:win:nosign`) sans `package`, et `preview.config.mjs` sans script | `package.json` | 1 script par intention (§4) |
| 13 | Le rendu pouvait s'auto-autoriser la lecture de **n'importe quel `.json`** du disque (`files:grant` acceptait le type `json`) | lecture `ipc/index.ts` | type `json` refusé hors dialogue |
| 14 | `music-metadata` 10.9.1 : boucle infinie dans le parseur ASF (fichier audio piégé) | `npm audit` | 12.3.4, `parseBlob` vérifié sur un WAV réel |
| 15 | `.gitignore` minimal (ni coverage, ni `.env`, ni caches) ; aucun modèle de ticket/PR | `cat .gitignore` | complété + 4 modèles GitHub |
| 16 | Docs 1.0 (`AUDIT`, `QA`, `MIGRATION`) mélangés aux docs 2.0, chemins et scripts obsolètes dans les documents 2.0 | `grep dist:win` | archivés / corrigés |

Points audités et **déjà sains** (aucune modification nécessaire) : zéro `any`,
zéro `@ts-ignore`, zéro assertion non-nulle, zéro import circulaire (67 fichiers
analysés), séparation `main`/`renderer` fonctionnelle, CSP stricte,
`contextIsolation` + `sandbox`, validation IPC exhaustive, migrations additives.

## 2. Fichiers et symboles supprimés

**Fichiers** (aucun n'était référencé) :

- `build/icon-256.png`, `build/icon-512.png` — copies obsolètes de `build/icon.png` ;
- `README.md` racine (24 octets) — remplacé par le vrai README ;
- `CozyDesk-2.0-LIVRAISON.md` à la racine — déplacé dans `docs/LIVRAISON-2.0.md`.

**Exports morts retirés** (19) : `kindGuard`, `KIND_EXTENSIONS`, `useDebounced`,
`useDocumentTitle`, `setLocale`, `moduleTitle`, `PlayerHandle`,
`stopReminderService`, `ensureDbReady`, `pomodoroRemaining`, `phaseLabel`,
`ROW_H`, `GRID_GAP`, `JournalHelpModal`, `isSameDay`, `startOfMonth`,
`endOfMonth`, `shortDate`, `timeHM`.

Chacun a été vérifié par recherche d'occurrences sur `src`, `tests` et `scripts`
avant suppression ; `clamp`, `weeklyTarget`, `newCard` et `retentionHint` ont été
**conservés** car utilisés (tests inclus).

## 3. Arborescence

```text
avant                               après
──────────────────────────────      ──────────────────────────────────────────
CozyDesk-source-1.0.0/CozyDesk/     .
├── electron/                       ├── src/main/       (index, windows, ipc, services)
│   ├── main.ts                     ├── src/preload/    (index.ts)
│   ├── preload.ts                  ├── src/renderer/   (app, components, modules, …)
│   ├── ipc/                        ├── src/shared/     (types/ipc.ts)
│   ├── services/                   ├── tests/          (16 fichiers)
│   └── windows/                    ├── scripts/        (4 scripts)
├── src/                            ├── docs/           (8 docs + archive/)
│   ├── types/ipc.ts  ◄─ partagé    ├── .github/        (workflow + 4 modèles)
│   └── components/…                ├── LICENSE
├── tests/                          ├── CONTRIBUTING.md
└── docs/                           └── README.md
```

Alias : `@/…` → `src/renderer`, `@shared/…` → `src/shared`. Le rendu ne peut donc
plus atteindre `src/main` par inadvertance.

## 4. Refactorings notables

| Refactoring | Effet mesurable |
|---|---|
| Découpage `WidgetContent.tsx` | 873 → 47 lignes + 12 fichiers `bodies/*` + `widgetShared.tsx` |
| Corps des widgets vérifiés | comparaison normalisée des 15 fonctions : identiques à l'original |
| Centralisation `clamp` | 4 duplications supprimées (Charts, ProgressBar, reconcile ×2) |
| `weekdayName()` | 1 table au lieu de 2 |
| Icône de fenêtre | 2 implémentations → 1 (`appConfig.iconPath`) |
| Scripts npm | 11 → 10, une intention par script, `preview:web` ajouté |
| `src/shared/types/ipc.ts` | contrat IPC séparé du rendu (plus d'import `../src/…` depuis le preload) |
| Test de validation IPC | couverture 0 → 7 tests sur la seule barrière rendu/système |

## 5. Dépendances

| Dépendance | Action | Raison |
|---|---|---|
| `music-metadata` | 10.9.1 → **12.3.4** | advisory : boucle infinie (ASF) sur un fichier piégé ; `parseBlob` vérifié sur un WAV réel |
| autres (35) | aucune | toutes utilisées : `cli`/`music-metadata` vérifiés par recherche d'import statique **et** dynamique |

Aucune dépendance ajoutée, aucune supprimée. `@testing-library/dom` est conservé :
c'est une dépendance *peer* de `@testing-library/react` v16, indispensable au
rendu des tests même sans import direct.

## 6. Revue de sécurité

**Vérifié, inchangé et conforme** : `contextIsolation: true`, `sandbox: true`,
`nodeIntegration: false`, `webSecurity: true`, preload minimal (une fonction par
besoin), 11 canaux IPC tous validés, `shell:openExternal` limité à `https:`,
navigation et `window.open` bloqués, permissions limitées aux notifications,
protocole `cozydesk-file:` en liste blanche (403 hors liste), écritures limitées
aux chemins issus d'une boîte d'enregistrement, sauvegardes confinées à
`userData/backups` avec nom filtré, CSP stricte sans `unsafe-eval`.

**Corrigé** : `files:grant` refusait auparavant… rien — il accordait la lecture de
tout chemin absolu d'extension `.json`. Un rendu compromis pouvait donc lire des
fichiers de configuration arbitraires. Désormais le type `json` est refusé : les
imports de sauvegarde passent obligatoirement par un dialogue utilisateur.

**Non corrigé, documenté (§9)** : Electron 33 est en fin de vie et porte des
avis de sécurité non corrigés dans cette branche ; la montée de version majeure
n'a pas été tentée ici car elle ne peut pas être validée par un lancement réel
dans cet environnement.

## 7. Intégrité des données

- **Aucun changement de schéma** : IndexedDB reste `CozyDeskDB` **v1** (16 tables),
  les sept clés `localStorage` (`cozydesk.*.v1`) et `SETTINGS_SCHEMA_VERSION = 3`
  sont inchangées.
- Les liens entre données et code n'ont pas bougé (mêmes noms de stores, mêmes
  tables), donc **aucune migration n'était nécessaire** : une installation 2.0
  existante rouvre ses données sans transformation.
- Couverture : `tests/storage.test.ts`, `tests/legacy.test.ts` (import 1.0),
  `tests/integrity.test.ts` (migrations v1→v2→v3, assainissement des dispositions,
  export/import non destructif), `tests/workspace.test.tsx`.
- Rien dans ce chantier n'écrit, ne vide ni ne recrée une base.

## 8. Validation exécutée

Environnement : Linux, Node 22.22, aucune interface graphique.

| Commande | Résultat |
|---|---|
| `npm ci --ignore-scripts` | installation reproductible (459 paquets) |
| `npm ci` (avec scripts) | **échec** : le postinstall d'Electron télécharge un binaire depuis un hôte inaccessible ici (voir §9) |
| `npm run typecheck` | PASS — 0 erreur (rendu + processus principal) |
| `npm run lint` | PASS — 0 erreur, 0 avertissement |
| `npm run test` | PASS — **16 fichiers, 150 tests**, 0 avertissement console |
| `npm run build:electron` | PASS — `dist-electron/main.cjs` + `preload.cjs` |
| `npx vite build` | PASS — `dist/` produit |
| `npm audit` | 32 avis, tous dans l'outillage (voir §9) |

Chaîne Windows (GitHub Actions, run **42097871265**, commit `db7d437`,
conclusion **success**, 15 étapes vertes) :

| Étape | Résultat |
|---|---|
| typecheck + lint + tests sur runner Windows | PASS |
| empaquetage portable + NSIS | PASS — 81 705 037 / 81 919 325 octets |
| vérification du contenu de `app.asar` | PASS — 9/9 contrôles |
| lancement du binaire empaqueté | PASS — `exit=0` |
| rendu capturé | PASS — 868 052 octets, 1024×720 |
| répertoire de données créé | PASS — `%APPDATA%\CozyDesk` |
| archive source | PASS — 149 entrées, 13 fichiers clés aux nouveaux chemins, aucun artefact de build |
| publication de release | **non déclenchée** (build de branche) — la release `v2.0.0` existante est intacte |

Les artefacts de ce build sont disponibles dans l'onglet *Actions* du run ; ils
n'ont pas été publiés, conformément à la consigne de ne pas écraser les livrables
existants.

## 9. Problèmes connus et non vérifiés

| Point | État | Détail |
|---|---|---|
| `npm ci` complet dans cet environnement | NON EXÉCUTÉ | le postinstall d'Electron télécharge `electron-v33…zip` depuis un hôte bloqué ; `--ignore-scripts` suffit pour typer, linter, tester et builder. Sur un runner Windows, `npm ci` passe (étape CI verte). |
| Electron 33 (EOL) | NON CORRIGÉ | avis non corrigés dans la branche 33 ; montée vers Electron 42+ = changement de plateforme à valider sur une vraie machine Windows. Recommandation : planifier cette montée comme un chantier dédié, avec test du paquet signé. |
| Avis `npm audit` restants | MITIGÉS | `vite`, `vitest`, `tar`, `electron-builder` : outillage de build/test, non embarqué dans l'application (aucun `node_modules` dans le paquet). `music-metadata` et `electron` traités ci-dessus. |
| Rendu visuel pixel par pixel, glisser-déposer | NON VÉRIFIÉ | pas d'affichage disponible ; la logique de grille/collision est couverte par tests. |
| Performance sur Intel intégré réel | NON MESURÉE | optimisations structurelles seulement. |
| `package:nosign` sur Linux | NON EXÉCUTÉ | nécessite `wine` ; la voie de référence reste la CI Windows. |

## 10. Documentation livrée

| Fichier | Contenu |
|---|---|
| `README.md` | présentation, capture, fonctionnalités, pile, prérequis, installation, scripts, structure, liens |
| `CONTRIBUTING.md` | environnement, conventions (TS/React/Zustand/CSS), tests, commits, PR, règles données et sécurité |
| `LICENSE` | MIT, cohérent avec `package.json` |
| `docs/ARCHITECTURE.md` | trois processus, frontières, flux de données, décisions, ce qui n'existe pas |
| `docs/IPC.md` | surface exposée, validation, politique fichiers, diffusion média, vérifications |
| `docs/PERSISTENCE.md` | schéma IndexedDB, clés de préférences, migrations, sauvegardes, import non destructif |
| `docs/STATE-MANAGEMENT.md` | 8 stores, invariants, ce qui n'est pas dans un store, procédure d'ajout |
| `docs/WIDGETS.md` | 12 widgets, modèle, opérations, garanties, ajout d'un widget |
| `docs/BUILD-RELEASE.md` | chaîne de build, commandes vérifiées, CI, publication, limites |
| `docs/archive/` | documents 1.0 conservés (audit, QA, migration) |
| `.github/` | modèles de ticket (défaut, évolution) et de pull request |
