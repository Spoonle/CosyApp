# CozyDesk 2.0

Bureau premium minimaliste pour Windows : horloge centrale, widgets transparents,
dock discret. Focus, tâches, notes, musique, ambiance, habitudes — **100 % local,
sans compte, sans serveur**.

![CozyDesk 2.0 — bureau principal](https://github.com/Spoonle/CosyApp/releases/download/v2.0.0/smoke-2.0.png)

## Télécharger

Dernière version publiée : **[releases/tag/v2.0.0](https://github.com/Spoonle/CosyApp/releases/tag/v2.0.0)**

| Fichier | Rôle |
|---|---|
| `CozyDesk-2.0-Final-Portable.exe` | version portable, aucune installation |
| `CozyDesk-2.0-Final-Setup.exe` | installateur (dossier au choix, raccourcis) |
| `CozyDesk-2.0-Final-Source.zip` | sources exactes de la compilation |

Les exécutables sont produits par GitHub Actions sur un runner Windows officiel, à
partir de ce dépôt, puis vérifiés automatiquement (contenu de `app.asar`, lancement
réel, capture d'écran, création du répertoire de données).

## Fonctionnalités

- **Bureau** : horloge centrale configurable, 12 widgets (horloge, date, pomodoro,
  tâches, progression, calendrier, musique, citation, habitudes, note rapide,
  statistiques, météo), grille 12 colonnes, dispositions sauvegardables.
- **12 modules** dans des fenêtres flottantes : Pomodoro, Tâches, Notes, Musique,
  Ambiance, Fonds d'écran, Calendrier, Statistiques, Habitudes, Étude, Journal,
  Paramètres.
- **Design system Liquid Glass** : 5 matériaux, 8 thèmes, clair/sombre, accent
  personnalisé, animations réduites sur demande.
- **Données locales** : IndexedDB (Dexie) pour les contenus, `localStorage` pour les
  préférences d'interface, sauvegardes automatiques, export/import JSON.
- **Sécurité Electron** : `contextIsolation`, `sandbox`, aucune API Node dans le
  rendu, IPC validé, protocole de fichiers en liste blanche, CSP stricte.

## Pile technique

| Couche | Technologie |
|---|---|
| Application de bureau | Electron 33 |
| Interface | React 18 + TypeScript 5.7 (strict) |
| Build | Vite 5 (rendu) + esbuild (processus principal) |
| État | Zustand 5 (7 stores persistés) |
| Données | Dexie 4 (IndexedDB, 16 tables) |
| Icônes | lucide-react |
| Tests | Vitest 2 + Testing Library + fake-indexeddb |
| Empaquetage | electron-builder 25 (NSIS + portable) |

Aucune dépendance à Rust, Cargo, Tauri ou Visual Studio Build Tools.

## Prérequis

- **Node.js 20 ou plus** (le projet est développé et testé avec Node 22)
- npm 10+
- Windows pour produire les exécutables (Linux/macOS suffisent pour développer,
  tester et construire le rendu)

## Installation et développement

```bash
git clone https://github.com/Spoonle/CosyApp.git
cd CosyApp
npm ci                 # installation reproductible
npm run dev            # Vite + Electron, rechargement à chaud
```

Sans interface graphique (CI, conteneur), l'application se construit et se teste
quand même :

```bash
npm run build          # typecheck + lint + tests + build rendu + build Electron
npm run preview:web    # sert dist/ dans le navigateur (aperçu, pas l'application)
```

L'aperçu navigateur ne remplace pas l'application : les contrôles de fenêtre
Electron, les sélecteurs de fichiers locaux et les médias locaux y sont inactifs,
et les données vivent dans l'IndexedDB du navigateur.

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Vite (5173) + Electron en mode développement |
| `npm run build` | typecheck → lint → tests → `dist-electron/` → `dist/` |
| `npm run typecheck` | `tsc` sur le rendu puis sur le processus principal |
| `npm run lint` | ESLint 9 (aucun avertissement toléré) |
| `npm run test` | Vitest (16 fichiers, 150 tests) — `test:watch` en continu |
| `npm run package` | build + `electron-builder --win` (portable + installateur) |
| `npm run package:dir` | paquet non compressé (`release/win-unpacked`) |
| `npm run package:nosign` | paquet Windows sans signature/édition de l'exe (Linux sans wine) |
| `npm run preview:web` | build + `vite preview` sur http://localhost:4173 |

## Structure du dépôt

```text
.
├── src/
│   ├── main/            processus principal Electron
│   │   ├── index.ts     cycle de vie, protocole privilégié, smoke-test
│   │   ├── windows/     création et politique de la fenêtre principale
│   │   ├── ipc/         canaux IPC, validation, fichiers, dialogues
│   │   └── services/    configuration centrale (chemins, mode dev)
│   ├── preload/         passerelle unique rendu → principal (contextBridge)
│   ├── renderer/        application React
│   │   ├── app/         composition racine
│   │   ├── components/  design system, dashboard, widgets, dock, fenêtres
│   │   ├── modules/     les 12 modules + registre
│   │   ├── services/    stockage, audio, dates, notifications, moteurs
│   │   ├── stores/      état Zustand persisté
│   │   ├── styles/      tokens, thèmes, mise en page, widgets
│   │   └── types/       modèle de domaine
│   └── shared/          contrat IPC partagé preload ↔ rendu
├── tests/               tests Vitest (unitaires, intégration, non-régression)
├── scripts/             build Electron, génération d'icône, vérification du paquet
├── build/               icônes utilisées par electron-builder
├── docs/                architecture, données, widgets, build, QA
└── .github/workflows/   CI Windows : tests, empaquetage, vérification, release
```

Détail des frontières et du flux de données : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Documentation

| Document | Contenu |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | processus, frontières, flux de données |
| [`docs/IPC.md`](docs/IPC.md) | contrat IPC et politique de sécurité |
| [`docs/PERSISTENCE.md`](docs/PERSISTENCE.md) | IndexedDB, migrations, sauvegardes |
| [`docs/STATE-MANAGEMENT.md`](docs/STATE-MANAGEMENT.md) | stores Zustand et leurs invariants |
| [`docs/WIDGETS.md`](docs/WIDGETS.md) | système de widgets et dispositions |
| [`docs/BUILD-RELEASE.md`](docs/BUILD-RELEASE.md) | build local, CI, publication |
| [`docs/QA-FINAL-2.0.md`](docs/QA-FINAL-2.0.md) | rapport de QA finale (PASS/FAIL) |
| [`docs/REDESIGN-2.0.md`](docs/REDESIGN-2.0.md) | refonte visuelle 2.0 |

## Contribuer

Les conventions de code, de commit, de test et de pull request sont décrites dans
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## Licence

MIT — voir [`LICENSE`](LICENSE).
