# Architecture

CozyDesk est une application **Electron 33 + React 18 + TypeScript** dont la
particularité est d'être entièrement locale : aucun serveur, aucune requête
sortante en dehors de la météo (optionnelle, Open-Meteo) et de l'ouverture de
liens `https:` demandée par l'utilisateur.

## 1. Trois processus, trois dossiers

```text
src/main/       processus principal (Node)  → fenêtres, fichiers, IPC, OS
src/preload/    passerelle isolée           → expose window.cozydesk
src/renderer/   interface (React)           → tout ce qui est visible
src/shared/     contrat IPC (types seuls)   → signé par les deux côtés
```

| Dossier | Rôle | Ne doit jamais |
|---|---|---|
| `src/main` | cycle de vie, `BrowserWindow`, protocole `cozydesk-file:`, dialogues, fichiers | contenir de JSX |
| `src/preload` | traduire l'API `contextBridge` en `ipcRenderer.invoke` | contenir de logique métier |
| `src/renderer` | UI, état, données IndexedDB | toucher `require`, `fs`, `ipcRenderer` |
| `src/shared` | types du contrat IPC | importer du code d'exécution |

Les alias TypeScript/Vite matérialisent la frontière : `@/…` pointe sur
`src/renderer`, `@shared/…` sur `src/shared`. Un import du rendu ne peut donc pas
atteindre `src/main` par erreur.

## 2. Démarrage

1. `src/main/index.ts` prend le verrou mono-instance, déclare le schéma
   privilégié `cozydesk-file`, puis attend `app.whenReady()`.
2. `registerIpc()` installe tous les canaux, `registerFileProtocol()` le diffuseur
   de médias, puis `createMainWindow()` ouvre la fenêtre (sans cadre, 1440×900,
   minimum 1080×700) et charge `dist/index.html` — ou l'URL Vite en développement.
3. Le rendu exécute `src/renderer/main.tsx` → `App` → `useBoot()` :
   `openDatabase()` (Dexie), `ensureDailyBackup()`, `applySettingsToDom` (thème,
   densité, animations), `startReminderService()`. Un échec affiche un écran
   d'erreur explicite : aucune base n'est recréée en silence.

Le mode `--smoke-test=…` de `src/main/index.ts` est réservé à la CI : il ouvre des
modules via le hash, attend, capture l'écran et quitte.

## 3. Composition de l'interface

```text
App
├── WallpaperLayer      fond (image, vidéo ou couleur)
├── TitleBar            barre fine + contrôles de fenêtre (IPC)
├── Dashboard           grille 12 colonnes de widgets
├── WindowLayer         fenêtres flottantes des modules
├── Dock                lanceur + modules épinglés
├── CommandPalette      ⌘/Ctrl+K
├── Toaster             notifications internes
└── ConfirmDialogHost   confirmations
```

Les modules sont chargés paresseusement (`React.lazy` dans
`src/renderer/modules/registry.ts`) : le bundle initial ne contient que le
dashboard, le dock et le design system.

## 4. Flux de données

```text
Interaction → composant → store Zustand → Dexie (IndexedDB) / localStorage
                                   ↘ services (audio, dates, notifications)
```

- **Contenus** (tâches, notes, journal, habitudes, sessions, flashcards, pistes) :
  IndexedDB, lus réactivement via `useLiveQuery`.
- **Préférences d'interface** : `localStorage` via `zustand/persist`, une clé par
  domaine (`cozydesk.settings.v1`, `cozydesk.dashboard.v1`, …).
- **Fichiers locaux** (fond d'écran, musique) : chemins persistés, puis
  ré-autorisés au démarrage via `files:grant` ; le rendu ne lit jamais le disque,
  il passe par `cozydesk-file://`.

## 5. Fenêtres internes vs fenêtres natives

CozyDesk n'ouvre **qu'une seule** fenêtre native. Les « fenêtres » des modules
sont gérées dans le rendu par `useWindowStore` (`src/renderer/stores/windows.ts`) :
position, taille, z-index, réduction, accrochage, réconciliation à la taille de
l'écran. Cette couche est testée sans Electron (`tests/dashboard.test.tsx`,
`tests/layout.test.ts`).

## 6. Décisions structurantes

| Décision | Raison |
|---|---|
| Electron plutôt que Tauri | contrainte produit : pas de chaîne Rust |
| Dexie plutôt que SQLite natif | persistance déjà en place, aucun module natif à compiler |
| Zustand plutôt que Redux/Context | actions directes, persistance triviale, aucun provider |
| esbuild pour le processus principal | build en ~10 ms, un seul fichier CJS |
| Vite pour le rendu | HMR immédiat, découpage automatique par module |
| Aucune librairie de graphiques | trois SVG maison couvrent les besoins (`components/charts`) |

## 7. Ce qu'il n'y a pas (et pourquoi)

- **Pas de routeur** : l'application est un bureau, pas un site ; l'état des
  fenêtres est la navigation.
- **Pas de client HTTP** : `fetch` est utilisé uniquement pour Open-Meteo et
  bloqué par la CSP pour tout le reste.
- **Pas de thème externe** : les 8 thèmes sont des jeux de variables CSS.
- **Pas de télémétrie** : rien n'est envoyé, ni au démarrage ni à l'usage.
