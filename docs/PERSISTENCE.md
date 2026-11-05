# Données et persistance

CozyDesk stocke tout localement, dans deux espaces complémentaires.

| Espace | Contenu | Accès |
|---|---|---|
| IndexedDB `CozyDeskDB` (Dexie) | tâches, notes, journal, habitudes, sessions, événements, fiches, pistes, playlists, sauvegardes | `src/renderer/services/storage/db.ts` |
| `localStorage` | préférences d'interface (thème, dock, disposition des widgets, fenêtres…) | stores Zustand `persist` |

## 1. Schéma IndexedDB

Base `CozyDeskDB`, **version 1**, 16 tables :

```text
meta              key
tasks             id, order, status, dueDate, priority, categoryId, completedAt, updatedAt
categories        id, name
notes             id, updatedAt, pinned, favorite
journal           id, date, updatedAt
pomodoroSessions  id, startedAt, phase, taskId
habits            id, archived, createdAt
habitLogs         id, habitId, date
events            id, date, startMinute
subjects          id, order
chapters          id, subjectId, done, order
flashcards        id, subjectId, due
studySessions     id, subjectId, startedAt
tracks            id, title, artist, addedAt
playlists         id, name
backups           key, createdAt
```

Règle : on **ajoute** des index avec `db.version(n + 1).stores({...})`, on ne
modifie ni ne supprime un index existant. Toute montée de version déclenche une
sauvegarde `pré-migration` avant ouverture.

## 2. Clés de préférences

| Clé `localStorage` | Store | Version de schéma |
|---|---|---|
| `cozydesk.settings.v1` | `stores/settings.ts` | **3** (`SETTINGS_SCHEMA_VERSION`) |
| `cozydesk.dashboard.v1` | `stores/dashboard.ts` | 1 |
| `cozydesk.windows.v1` | `stores/windows.ts` | 1 |
| `cozydesk.pomodoro.v1` | `stores/pomodoro.ts` | 1 |
| `cozydesk.music.v1` | `stores/music.ts` | 1 |
| `cozydesk.ambient.v1` | `stores/ambient.ts` | 1 |
| `cozydesk.palette.v1` | `stores/palette.ts` | 1 |

La version de schéma est stockée dans le même objet persisté ; `migrate` reçoit
la version d'origine et convertit les données. Une migration ne supprime jamais
une clé : elle la transforme ou la laisse telle quelle.

### Migrations de `cozydesk.settings.v1`

| De | Vers | Effet |
|---|---|---|
| 1 | 2 | ajout de la section `workspace` (dock, densité, animations) |
| 2 | 3 | `workspace.motion` devient l'unique source de vérité pour « réduire les animations » ; `reducedMotion` reste synchronisé pour les composants existants |

## 3. Sauvegardes

Trois niveaux, du plus léger au plus complet :

1. **Instantané quotidien** — `ensureDailyBackup()` au démarrage, écrit dans la
   table `backups` (30 derniers conservés) et, si l'API Electron est disponible,
   une copie fichier dans `%APPDATA%\CozyDesk\backups` (nom horodaté, 30 fichiers).
2. **Sauvegarde avant opération risquée** — libellés `pré-import`, `pré-migration`.
3. **Export manuel** — JSON complet via `dialogs.saveJson` + `files:writeText`.

Un instantané exclut les blobs lourds (pochettes de pistes) pour rester sous
80 Mo ; il contient `app`, `kind`, `schemaVersion`, `createdAt` et les données.

## 4. Import : jamais destructif

`importBundle()` (`services/storage/exportImport.ts`) :

1. valide le JSON (signature `app: 'CozyDesk'`, version de schéma connue) ;
2. écrit une sauvegarde `pré-import` ;
3. **fusionne** en `upsert` par identifiant — aucun enregistrement existant n'est
   supprimé ;
4. signale les entrées invalides au lieu de tout rejeter.

Les identifiants absents du fichier restent intacts ; un import deux fois de suite
produit le même état.

## 5. Données corrompues

- Disposition de widgets invalide → `sanitizeWidgets()` répare (type inconnu,
  identifiant dupliqué, coordonnées hors grille, chevauchement, apparence
  inconnue) puis, en dernier recours, disposition par défaut.
- Base IndexedDB inaccessible → écran d'erreur explicite, base **non recréée**.
- Préférences illisibles → valeurs par défaut, ancienne valeur conservée sur
  disque pour diagnostic.

## 6. Migration depuis CozyDesk 1.0

`services/storage/legacy.ts` importe une seule fois les données historiques
(`localStorage` d'une installation antérieure) : détection, transformation,
écriture, marqueur pour ne pas rejouer l'import. Couvert par
`tests/legacy.test.ts` et `tests/integrity.test.ts`.

## 7. Vérifier la persistance

```bash
npm run test -- tests/storage.test.ts tests/legacy.test.ts tests/integrity.test.ts
```

Ces tests créent une base avec `fake-indexeddb`, écrivent, rechargent, migrent et
contrôlent qu'aucune donnée n'a disparu.
