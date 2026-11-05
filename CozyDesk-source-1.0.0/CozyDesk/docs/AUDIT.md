# CozyDesk — Rapport d'audit (PHASE 1)

Date : 2026-11-05 · Auditeur : équipe architecture / QA

## 1. Constat fondamental : le code source existant est absent

Une recherche exhaustive de l'environnement d'exécution a été effectuée :

- `find / -iname "*cozydesk*" -o -iname "*cozy-desk*"` → **aucun résultat** ;
- dossier `upload/` (fichiers fournis par l'utilisateur) → **vide** ;
- dépôt git local → un seul commit initial ne contenant **aucun code applicatif** (3 fichiers annexes) ;
- aucune installation Tauri/Rust/cargo détectée, aucun `package.json` préexistant.

**Conclusion honnête et assumée** : la consigne indique « Tu disposes du code source existant », mais **aucun code source n'a été transmis à cet environnement**. Il est donc impossible d'auditer une base Tauri existante, d'identifier ses mécanismes de stockage réels, ou de migrer son code ligne à ligne. Prétendre le contraire serait une tromperie, ce que le cahier des charges interdit explicitement (règle « Ne simule jamais »).

### Décision technique prise

1. **Construire CozyDesk intégralement** sur la stack cible imposée (Electron + React + TypeScript + Vite), en appliquant la totalité du cahier des charges fonctionnel (12 modules, fenêtres flottantes, dock, Liquid Glass, persistance locale).
2. **Ne rien perdre** : puisque les schémas des anciennes données sont inconnus, l'application intègre un **cadre de préservation des données** (voir §6) qui scanne `localStorage` et IndexedDB à la recherche de données « CozyDesk legacy », les sauvegarde intégralement, et propose un import best-effort **sans jamais supprimer les originaux**.
3. Si l'utilisateur fournit ultérieurement l'ancien projet, la migration précise (mapping exact des schémas) pourra être branchée dans ce cadre en quelques heures — l'architecture le prévoit explicitement.

## 2. Architecture livrée (résumé)

```
CozyDesk/
├── electron/               Processus principal (Node.js)
│   ├── main.ts             Cycle de vie, instance unique, protocole sécurisé
│   ├── preload.ts          Pont contextBridge (seule API exposée au rendu)
│   ├── ipc/                Canaux IPC validés (dialogues, fichiers, fenêtre)
│   ├── services/           Config, chemins userData
│   └── windows/            Factory BrowserWindow sécurisée
├── src/                    Interface (React + TS, bundlée par Vite)
│   ├── app/                Racine, providers, workspace
│   ├── components/         Design system, dock, fenêtres, palette, widgets, charts
│   ├── modules/            12 modules métier
│   ├── hooks/ services/ stores/ styles/ types/ i18n/
├── tests/                  Tests vitest (unitaires + intégration stockage)
├── scripts/                Build esbuild (electron), générateur d'icône
├── electron-builder.yml    Packaging Windows (NSIS + portable)
└── docs/                   Audit, migration données, campagne QA
```

## 3. Fonctionnalités existantes → à construire

| Domaine | État constaté | Décision |
|---|---|---|
| Tauri/Rust | Absent | Rien à désinstaller ; stack Electron créée from scratch |
| Données localStorage/IndexedDB legacy | Absentes de l'environnement (mais potentiellement présentes chez l'utilisateur) | Cadre de scan + sauvegarde + import non destructeur intégré |
| Pomodoro, tâches, notes, musique, ambiance, wallpapers, calendrier, stats, habitudes, étude, journal, palette | Absents | Construits intégralement, réels et persistants |
| Fenêtres flottantes, dock, dashboard | Absents | Construits (drag, resize, snap, z-index, restauration) |
| Design Liquid Glass | Absent | Design system complet : 5 matériaux, 8 thèmes, mode clair/sombre, accent, flou/transparence réglables, 3 profils graphiques |

## 4. Dépendances

**Supprimées** : aucune (aucune base existante). Aucune trace Tauri, Rust, Cargo ni Visual Studio Build Tools n'est requise.

**Conservées/introduites** (toutes justifiées, toutes dev-side grâce au bundling Vite — l'application packagée ne embarque AUCUN node_module applicatif) :

| Paquet | Rôle | Côté |
|---|---|---|
| electron | Runtime desktop | dev |
| react / react-dom | UI | dev (bundlé) |
| typescript / vite / @vitejs/plugin-react | Typage + build | dev |
| zustand | État global léger (settings, fenêtres, pomodoro…) | dev (bundlé) |
| dexie + dexie-react-hooks | IndexedDB typée, requêtes réactives | dev (bundlé) |
| lucide-react | Icônes harmonisées | dev (bundlé) |
| music-metadata | Métadonnées + pochettes des fichiers audio locaux | dev (bundlé, import dynamique, repli nom de fichier) |
| vitest / jsdom / fake-indexeddb / @testing-library | Tests | dev |
| eslint / typescript-eslint | Qualité | dev |
| esbuild | Compilation processus principal | dev |
| concurrently / wait-on / cross-env | Scripts npm | dev |
| electron-builder | Packaging Windows | dev |

## 5. Risques de migration identifiés

1. **Schémas legacy inconnus** → atténué par le cadre de scan/import non destructeur + sauvegarde préalable systématique.
2. **Perte de données au changement de schéma futur** → atténué par versionnement Dexie + snapshot automatique avant toute montée de version.
3. **Comportement audio/vidéo selon GPU Windows** → profils graphiques (Haute/Basculée/Performance) + repli solide.
4. **Packaging Windows depuis l'environnement de build actuel (Linux)** → l'installateur NSIS est généré ici ; si l'icône exe ne peut pas être embarquée sans Wine, un mode de secours documenté est prévu — sur la machine Windows de l'utilisateur, `npm run dist` produit l'installateur complet avec icône.

## 6. Plan technique détaillé (phases 2 → 9)

- **P2** — Processus principal Electron sécurisé (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`), preload contextBridge typé, IPC à validation stricte, protocole `cozydesk-file://` en liste blanche pour lire les médias locaux sans exposer le système de fichiers, scripts `dev/build/dist`.
- **P3** — Couche données : Dexie v1 (12 tables), repository typé, sauvegarde automatique (snapshot JSON dans IndexedDB + fichier `userData/backups`), export/import complet, scan des données legacy.
- **P4** — Design system Liquid Glass : tokens, 8 thèmes, mode clair/sombre, accent HSL, intensités de flou/transparence, `prefers-reduced-motion`, composants (boutons, cartes, modales, inputs…).
- **P5** — Shell : fenêtrage interne (déplacement, redimensionnement 8 poignées, snap aux bords, z-index, minimisation, restauration des positions), dock animé, dashboard à widgets réorganisables, palette de commandes Ctrl+K, toasts + notifications OS.
- **P6** — 12 modules réels (CRUD complet, persistance vérifiée, cas limites testés).
- **P7** — Optimisation : lazy loading des modules, profils graphiques, pause des vidéos masquées, réduction du `backdrop-filter` en mode Performance.
- **P8** — QA : `typecheck`, `lint`, `test` (vitest), lancement headless + captures vérifiées, corrections.
- **P9** — Packaging Windows (NSIS + portable), documentation, livraison.

## 7. Tests prévus

- **Unitaires** : moteur Pomodoro (calcul par horodatage, reprise après redémarrage), SM-2 (répétition espacée), séries d'habitudes, filtres/tri de tâches, utilitaires de dates, recherche floue de la palette, sélecteurs de statistiques.
- **Intégration stockage** (fake-indexeddb) : CRUD tâches/notes, snapshot de sauvegarde, import legacy non destructeur, export/import complet.
- **Composants** : rendu des composants verre, flux de création de tâche.
- **Build/lancement** : `npm run typecheck && lint && test && build`, démarrage headless sous Xvfb avec captures d'écran vérifiées, packaging vérifié.

*Fin du rapport d'audit. La suite du document est produite pendant la construction — voir `docs/QA.md` et `docs/MIGRATION.md`.*
