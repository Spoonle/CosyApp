# CozyDesk

**Version 2.1.0** — un bureau premium minimaliste : horloge centrale, widgets
transparents, dock discret. 100 % local.

---

## ✨ À propos

**CozyDesk** est une application de bureau qui transforme votre espace de travail
en un environnement personnel.

Plutôt que d’alterner entre plusieurs applications, CozyDesk réunit l’essentiel
dans une interface unique, propre et personnalisable. L’idée est simple : créer un
bureau qui vous ressemble, qui vous aide à rester organisé, et qui rend le travail
quotidien un peu plus agréable.

CozyDesk combine productivité, personnalisation et une expérience visuelle
minimaliste inspirée du design de bureau moderne.

---

## 🚀 Fonctionnalités

- **Tableau de bord personnalisable** — organisez votre bureau avec des widgets.
- **Horloge et salutation** — l’heure, en grand, sans encombrement.
- **Minuteur Pomodoro** — sessions de concentration et pauses structurées.
- **Gestion des tâches** — suivez vos tâches du jour.
- **Notes et journal** — consignez idées, réflexions et informations.
- **Calendrier** — gardez votre emploi du temps organisé.
- **Habitudes** — suivez vos routines et vos séries.
- **Musique et sons d’ambiance** — votre bibliothèque locale, sans streaming.
- **Statistiques** — observez votre productivité dans le temps.
- **Fonds d’écran personnalisés** — images et vidéos locales.
- **Fenêtres flottantes** — plusieurs outils côte à côte.
- **Design « liquid glass »** — une interface moderne et confortable.

---

## 🆕 Nouveautés de la 2.1 — correction de l’import musical

La 2.0 avait un défaut sérieux : les fichiers audio importés étaient bien
enregistrés, mais **absents de la bibliothèque**.

**Cause.** Dexie n’itère pas les enregistrements dont la clé indexée est absente.
Les pistes étaient créées sans le champ `addedAt`, alors que la bibliothèque est
lue via `db.tracks.orderBy('addedAt')`. Les données étaient donc stockées… mais
invisibles.

**Correction.**

- `addedAt` fait désormais partie du type `Track` et est écrit à chaque import.
- Migration du schéma IndexedDB **v1 → v2** : rétro-remplissage de `addedAt` sur
  les pistes historiques, en respectant `createdAt`.
- **Aucune donnée supprimée, aucune base réinitialisée.** La migration ne touche
  ni aux index, ni aux playlists, ni aux pochettes.
- La réparation est **séparée de la lecture** : `loadLibrary()` reste une
  lecture pure (obligatoire dans un `liveQuery`, sinon Dexie lève
  `ReadOnlyError`), et `repairLibrary()` effectue l’écriture à l’ouverture de la
  base ainsi qu’au montage du module.
- Les sauvegardes exportées par la 2.0 (sans `addedAt`) restent restaurables.
- MP3, WAV, FLAC, OGG et M4A vérifiés de bout en bout.
- Un échec de lecture des métadonnées n’empêche plus jamais l’import : repli sur
  le nom de fichier, avec découpage `Artiste - Titre`.

Détail complet, cause racine et résultats de tests : **[`docs/RELEASE-2.1.md`](docs/RELEASE-2.1.md)**.

### Historique des versions

| Version | Date | Points marquants |
|---|---|---|
| **2.1.0** | 2026-11-12 | Correction de l’import musical (`addedAt`), migration Dexie v2 non destructive, 174 tests |
| 2.0.0 | 2026-11-05 | Refonte visuelle complète, tableau de bord, fenêtres flottantes |

---

## 📥 Téléchargement

La dernière version est **CozyDesk 2.1.0**.

👉 **[Télécharger CozyDesk 2.1.0](https://github.com/Spoonle/CozyDesk/releases/tag/v2.1.0)**

| Fichier | Description |
|---|---|
| `CozyDesk-2.1-Final-Setup.exe` | Installateur Windows (choix du répertoire, raccourcis) |
| `CozyDesk-2.1-Final-Portable.exe` | Version portable, aucune installation |
| `CozyDesk-2.1-Final-Source.zip` | Code source exact utilisé pour la compilation |

> **Mise à jour depuis la 2.0.0** : installez simplement la 2.1 par-dessus, ou
> utilisez la version portable. Au premier démarrage, la base passe en schéma v2
> et vos pistes historiques réapparaissent dans la bibliothèque. Vos données,
> vos playlists et vos réglages sont conservés.

---

## 🎨 Philosophie de design

- **Minimalisme** — une interface propre, sans encombrement visuel superflu.
- **Personnalisation** — chacun organise son bureau selon ses préférences.
- **Confort** — un environnement agréable à utiliser tous les jours.

L’objectif n’est pas d’accumuler des fonctionnalités, mais de faire cohabiter
naturellement celles qui sont utiles.

---

## 💡 Inspiration et crédits

Un remerciement particulier à l’équipe derrière **[CozySpace](https://cozyspace.app/)**.

CozySpace a été une source d’inspiration importante pendant le développement de
CozyDesk : le concept d’un espace de travail personnel et accueillant, la
direction visuelle minimaliste et l’attention portée aux détails qui rendent
l’usage quotidien plus agréable.

Découvrir CozySpace m’a encouragé à expérimenter ma propre interprétation de cette
idée, jusqu’à construire CozyDesk. CozyDesk a sa propre implémentation, sa propre
architecture, ses propres fonctionnalités et sa propre identité — mais il est
important de reconnaître les projets qui inspirent. Merci à l’équipe CozySpace !

🌐 **CozySpace :** https://cozyspace.app/

---

## 🛠️ Construit avec

| Technologie | Rôle |
|---|---|
| **Electron** | Application de bureau |
| **React** | Interface |
| **TypeScript** | Développement typé |
| **Vite** | Développement et build |
| **Zustand** | Gestion d’état |
| **Dexie / IndexedDB** | Persistance locale |
| **music-metadata** | Lecture des métadonnées audio |
| **Lucide** | Icônes |

---

## 💻 Développement

### Prérequis

- Node.js **22** ou supérieur
- npm
- Git

### Installation

```bash
git clone https://github.com/Spoonle/CozyDesk.git
cd CozyDesk
npm ci
```

### Lancer l’application

```bash
npm run dev          # Vite + Electron avec rechargement
npm run preview:web  # build de production servi sur http://localhost:4173
```

### Vérifications

```bash
npm run typecheck   # TypeScript, rendu + processus principal
npm run lint        # ESLint 9
npm run test        # Vitest (17 fichiers, 174 tests)
npm run build       # typecheck + lint + tests + build Electron + build Vite
```

### Empaqueter pour Windows

```bash
npm run package       # NSIS + portable (nécessite wine hors Windows)
npm run package:dir   # paquet non empaqueté, pour inspection
```

Les artefacts sont écrits dans `release/`. La chaîne complète est décrite dans
[`docs/BUILD-RELEASE.md`](docs/BUILD-RELEASE.md).

### Structure du dépôt

```text
src/
  main/       processus principal Electron (fenêtre, IPC, protocole fichiers)
  preload/    pont contextBridge exposé au rendu
  renderer/   application React
    app/        composition racine
    components/ dashboard, widgets, dock, palette, fenêtres
    modules/    modules plein écran (musique, tâches, réglages…)
    services/   stockage, audio, notifications, dates
    stores/     état Zustand
    types/      types du domaine
  shared/     types partagés main ↔ rendu
tests/        tests Vitest (unitaires + intégration)
docs/         architecture, persistance, IPC, QA, notes de version
scripts/      outillage de build et de vérification du paquet
```

---

## 🔒 Confidentialité

CozyDesk ne collecte rien et n’envoie rien. Toutes les données restent sur votre
machine :

- **IndexedDB** (`CozyDeskDB`, Dexie) pour les tâches, notes, journal, habitudes,
  événements, fiches, pistes et playlists ;
- **localStorage** pour les préférences d’interface ;
- des sauvegardes locales quotidiennes dans `%APPDATA%\CozyDesk\backups`.

Le rendu n’a aucun accès à Node.js : les fichiers passent par un protocole en
liste blanche et chaque appel IPC est validé. Voir
[`docs/PERSISTENCE.md`](docs/PERSISTENCE.md) et [`docs/IPC.md`](docs/IPC.md).

Seules exceptions réseau, facultatives et déclenchées par vous : les widgets
météo (`api.open-meteo.com`) et l’ouverture de liens externes.

---

## 🧪 Qualité

| Contrôle | Commande |
|---|---|
| Typage des deux processus | `npm run typecheck` |
| Style et pièges React | `npm run lint` |
| Comportement (stores, modules, widgets, musique) | `npm run test` |
| Contenu réel du paquet | `node scripts/verify-package.cjs` (CI) |
| Démarrage de l’exe empaqueté | CI Windows (capture + rapport) |

La correction de l’import musical est couverte par
[`tests/musicImport.test.ts`](tests/musicImport.test.ts) — **21 tests**, dont une
migration v1 → v2 exécutée sur la vraie classe `CozyDeskDB` et la vérification
que la bibliothèque retrouve les pistes historiques sans perte de données.

---

## 📄 Licence

MIT — voir [`LICENSE`](LICENSE).

Contributions bienvenues : [`CONTRIBUTING.md`](CONTRIBUTING.md).
