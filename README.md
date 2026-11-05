# CozyDesk 2.0

**Bureau premium minimaliste — horloge centrale, widgets transparents, dock discret. Focus, tâches, notes, musique, ambiance, habitudes. 100 % local, sans compte, sans serveur.**

CozyDesk est une application Windows construite avec **Electron + React + TypeScript + Vite**, habillée d'un design system **Liquid Glass** complet (5 matériaux de verre, 8 thèmes, mode clair/sombre, accent personnalisé).

La version **2.0** repense la hiérarchie visuelle : trois widgets par défaut au lieu de neuf,
horloge principale configurable, widgets transparents, barre de titre fine, dock minimal
avec auto-masquage, et une section de réglages « Bureau » complète.
Détails et migrations : [`docs/REDESIGN-2.0.md`](docs/REDESIGN-2.0.md) ·
recette QA : [`docs/QA-2.0.md`](docs/QA-2.0.md) ·
**rapport de la QA finale** : [`docs/QA-FINAL-2.0.md`](docs/QA-FINAL-2.0.md).

**Téléchargement des exécutables Windows :** [`releases/tag/v2.0.0`](https://github.com/Spoonle/CosyApp/releases/tag/v2.0.0)
(`CozyDesk-2.0-Final-Portable.exe`, `CozyDesk-2.0-Final-Setup.exe`,
`CozyDesk-2.0-Final-Source.zip`).

Aucune dépendance à Rust, Cargo, Tauri ou Visual Studio Build Tools.

---

## Démarrage rapide

### Utiliser l'application (portable)

1. Lancez `CozyDesk-2.0-Final-Portable.exe` (ou `CozyDesk-2.0-Final-Setup.exe` pour une installation).
2. C'est tout — vos données restent dans `%APPDATA%/CozyDesk` (IndexedDB + sauvegardes JSON dans `backups/`) et la version 2.0 relit celles de la 1.0.

### Développer / reconstruire

Prérequis : **Node.js 20+** (aucun compilateur natif).

```bash
npm install      # installe les dépendances
npm run dev      # développement (Vite + Electron, rechargement à chaud)
npm run typecheck
npm run lint
npm run test     # 84 tests automatisés (vitest)
npm run build    # typecheck + lint + tests + build complet
npm run dist:win # build + installateur Windows (NSIS) + portable
```

`npm run dist` sur une machine **Windows** produit :

- `release/CozyDesk-2.0-Final-Setup.exe` — installateur assisté (choix du dossier, raccourcis bureau + menu démarrer) ;
- `release/CozyDesk-2.0-Final-Portable.exe` — version portable mono-fichier.

Sous Linux sans `wine`, utilisez `npm run dist:win:nosign`.
La compilation Windows est aussi automatisée : `.github/workflows/build-windows.yml`
(runner `windows-latest`) publie les deux exécutables.

> **Note build Linux** : la finalisation de l'installateur NSIS et l'incrustation de l'icône dans l'exe nécessitent `wine`. Le paquet portable fourni ici a été assemblé et vérifié sans cette étape ; sur Windows, `npm run dist` fait tout nativement.

---

## Fonctionnalités

### Espace de travail

- **Dashboard à widgets** : horloge, date & progression, Pomodoro, tâches prioritaires, progression du jour, mini-calendrier, musique, citation, habitudes, note rapide, statistiques, météo (optionnelle, source réelle Open-Meteo). Widgets déplaçables, redimensionnables, masquables, disposition persistée, réinitialisation en un clic.
- **Fenêtres flottantes internes** : déplacement, redimensionnement 8 poignées, minimisation, maximisation, fermeture, gestion du focus et du z-index, aimantation aux bords (moitié gauche/droite/plein écran), restauration des positions au redémarrage.
- **Dock flottant** animé (magnification, indicateurs de fenêtres ouvertes, fermeture au clic droit).
- **Palette de commandes `Ctrl+K`** : recherche floue sur ~45 commandes (ouvrir un module, créer une tâche/note, démarrer un Pomodoro, changer de thème, exporter/importer, profils graphiques…).
- **Raccourcis** : `Ctrl+K` palette · `Ctrl+Maj+D` édition du dashboard.

### Les 12 modules

| Module | Fonctionnalités réelles |
|---|---|
| **Pomodoro** | Moteur par horodatage (fiable fenêtre minimisée), durées configurables, pause/reprise/réinitialisation, cycles et pause longue, notifications système + carillon WebAudio, historique journalisé (IndexedDB), association à une tâche, rattrapage automatique des phases écoulées pendant l'absence. |
| **Tâches** | CRUD complet, échéances, 4 priorités, catégories colorées, tags, sous-tâches, statuts (actives/terminées/archivées), recherche, filtres, 4 tris, sauvegarde automatique de l'éditeur. |
| **Notes** | Liste + éditeur, recherche, tags, favoris, épinglage, sauvegarde automatique (600 ms), historique des 20 dernières révisions restaurables. |
| **Musique** | Import de fichiers locaux (MP3, FLAC, OGG, M4A…), métadonnées réelles (music-metadata) avec repli sur le nom de fichier, pochette d'album, file d'attente, lecture aléatoire, répétition (off/tout/piste), volume, playlists, Media Session (touches système). Lecture via protocole sécurisé en liste blanche. |
| **Ambiance** | 7 sons **synthétisés en temps réel** (WebAudio) : pluie, forêt (oiseaux), vent, feu de cheminée, océan, café, bruit blanc. Volume indépendant par canal, mélange simultané, volume général, reprise au démarrage optionnelle. Aucun fichier audio embarqué. |
| **Fonds d'écran** | 6 dégradés intégrés (variantes clair/sombre), import d'images et vidéos locales, galerie, voile d'assombrissement réglable, pause automatique des vidéos masquées, désactivation selon profil. |
| **Calendrier** | Vues mois/semaine/jour, événements horodatés ou journée entière, rappels **réellement fonctionnels** (vérification toutes les 30 s, notification système, anti-doublon), couleurs, association à des tâches. |
| **Statistiques** | Focus du jour/semaine, sessions Pomodoro, tâches terminées, séries d'habitudes, graphiques 7/14 jours, **heatmap 18 semaines** — tout calculé sur les données réelles locales. |
| **Habitudes** | Création, 3 types de fréquence (quotidienne, jours précis, X fois/semaine), validation quotidienne, séries actuelles et records, taux de complétion 30 jours, calendrier de progression mensuel. |
| **Étude** | Matières, chapitres avec progression, sessions chronométrées, objectif hebdomadaire, flashcards avec **répétition espacée SM-2** (4 notes de rappel, facilité bornée, planification testée). |
| **Journal** | Une entrée par jour, humeur (5 niveaux), navigation entre jours, recherche plein texte, sauvegarde automatique. |
| **Paramètres** | 8 thèmes × 2 modes, accent HSL personnalisé, intensités de flou et transparence, réduction des animations, 3 profils graphiques, notifications, météo (Open-Meteo, optionnelle), données : compteurs, export/import JSON, sauvegardes restaurables, scan des données d'une installation antérieure. |

---

## Sécurité (Electron)

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` ;
- API exposition **uniquement** via `contextBridge` (`window.cozydesk`), typée de bout en bout ;
- IPC validé (types, longueurs, chemins absolus, extensions en liste blanche) ;
- **aucun accès disque arbitraire** : les fichiers locaux passent par des boîtes de dialogue natives ou une validation stricte, puis sont servis par le protocole interne `cozydesk-file://` (liste blanche par session, streaming, plages HTTP) ;
- écritures limitées aux chemins issus d'une boîte d'enregistrement + dossier de sauvegardes contrôlé ;
- CSP stricte ; navigation et fenêtres pop-up bloquées ; permissions limitées aux notifications ; liens externes `https` uniquement.

## Données & confidentialité

- Stockage **100 % local** : IndexedDB (Dexie, schéma versionné) + `localStorage` pour les préférences ;
- sauvegarde automatique quotidienne au démarrage + avant chaque import/migration (30 instantanés internes + copie fichier dans `userData/backups`) ;
- export/import JSON complet avec validation enregistrement par enregistrement ;
- **préservation des données existantes** : scan non destructeur des anciennes clés localStorage/IndexedDB « CozyDesk » avec import best-effort (voir `docs/MIGRATION.md`) ;
- aucune télémétrie, aucun compte ; seule requête réseau possible : la météo optionnelle (Open-Meteo, si configurée).

## Performance

- Chargement paresseux des 12 modules (bundles séparés) ;
- 3 profils graphiques : **Haute qualité** (verre complet), **Basculée**, **Performance** (flou retiré, vidéos figées) ;
- vidéos en pause quand la fenêtre est masquée ; blobs d'ambiance figés en profil Performance ;
- respect de `prefers-reduced-motion` et du réglage utilisateur.

## Structure du projet

```
CozyDesk/
├── electron/            # processus principal (main, preload, IPC, fenêtres)
├── src/
│   ├── app/             # racine React + séquence de démarrage
│   ├── components/      # design system verre, dock, fenêtres, palette, widgets, charts
│   ├── modules/         # 12 modules métier (chargés paresseusement)
│   ├── hooks/ services/ stores/ styles/ types/ i18n/ data/
├── tests/               # 61 tests vitest (moteurs, stockage, stores, composants)
├── scripts/             # build esbuild, générateur d'icône
├── docs/                # audit, migration données, campagne QA
├── electron-builder.yml # packaging Windows
└── vite.config.ts
```

## Documentation

- `docs/AUDIT.md` — audit initial et décisions ;
- `docs/MIGRATION.md` — préservation et migration des données ;
- `docs/QA.md` — campagne de tests détaillée et problèmes connus.

## Licences

Application : MIT. Icônes : Lucide (ISC). Packaging : electron-builder. Métadonnées audio : music-metadata.
