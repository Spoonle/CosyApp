# Migration & préservation des données — CozyDesk

## Contexte

Le cahier des charges impose la conservation des données d'une installation antérieure de CozyDesk
(stockées dans `localStorage` et/ou IndexedDB). **Aucun code source de l'ancienne version n'ayant
été fourni dans cet environnement** (voir `AUDIT.md`), les schémas exacts ne pouvaient pas être
connus à l'avance. CozyDesk 1.0 intègre donc un **cadre de préservation générique**, conçu pour ne
jamais perdre de données et pour accepter un mapping précis si l'ancien projet est fourni un jour.

## Principes absolus respectés

1. **Jamais de suppression** : les données d'origine (localStorage, IndexedDB legacy) ne sont ni
   modifiées ni effacées. L'import crée de *nouveaux* enregistrements dans `CozyDeskDB`.
2. **Sauvegarde préalable systématique** : avant tout import, un instantané complet est journalisé
   dans la table `backups` + copie fichier dans `userData/backups`.
3. **Import best-effort, erreurs explicites** : chaque élément non reconnu est ignoré et compté,
   jamais silencieusement transformé.

## Comment ça marche (module Paramètres → Données)

### 1. Scan

`scanLegacyData()` parcourt :

- **localStorage** : clés contenant `cozy` ou `desk`, **sauf** les clés de l'application actuelle
  (motif `cozydesk.<nom>.v<nombre>`). Chaque clé est analysée : JSON parse, extraction des tableaux
  d'objets (jusqu'à 3 niveaux de profondeur, compatible zustand `persist`), détection heuristique
  des formes « tâche » (titre + done/completed/status), « note » (contenu/body), « habitude »
  (nom), « session Pomodoro » (durée/début-fin).
- **IndexedDB** : énumération des bases dont le nom évoque CozyDesk (autre que `CozyDeskDB`).

Le rapport affiche : clé, taille, aperçu, contenu détecté.

### 2. Import (best-effort)

`importLegacyData()` :

1. crée la sauvegarde `pré-migration` ;
2. pour chaque forme reconnue, insère un enregistrement **neuf** (nouvel UUID) :
   - tâche → `tasks` (statut `done` si `done`/`completed` vrai, sinon `active`) ;
   - note → `notes` (tag `importé`) ;
   - habitude → `habits` (fréquence quotidienne) ;
   - session → `pomodoroSessions` ;
3. retourne les compteurs exacts ; **les originaux restent en place**.

### 3. Récupération en cas d'échec

- Les instantanés internes (30 derniers) sont restaurables depuis Paramètres → Données ;
- l'export JSON manuel est disponible à tout moment ;
- en cas d'échec d'ouverture de la base (instance verrouillée), un écran d'erreur explicite
  s'affiche (aucun effacement automatique n'existe dans l'application).

## Schéma actuel (Dexie v1)

Tables indexées : `meta`, `tasks`, `categories`, `notes`, `journal`, `pomodoroSessions`, `habits`,
`habitLogs`, `events`, `subjects`, `chapters`, `flashcards`, `studySessions`, `tracks`,
`playlists`, `backups`.

Toute future montée de version passera par `db.version(n+1)` avec sauvegarde `pré-migration`
automatique et migrations incrémentales (jamais de réinitialisation).

## Si vous fournissez l'ancien projet

Le point d'extension est `src/services/storage/legacy.ts` : il suffit d'ajouter des détecteurs
précis (signatures des anciens types) et un mapping champ à champ vers les types de
`src/types/domain.ts`. L'architecture (scan → sauvegarde → import non destructeur → rapport) est
déjà en place et testée (voir `tests/legacy.test.ts` : détection, exclusion des clés actuelles,
import sans suppression, robustesse aux valeurs non JSON).

## Export / import CozyDesk natif

- **Export** : JSON complet (`{ app: 'CozyDesk', schemaVersion: 1, data: { … } }`), via boîte
  d'enregistrement native.
- **Import** : validation du fichier (signature, version), sauvegarde préalable, fusion (upsert)
  enregistrement par enregistrement — les enregistrements invalides sont comptés et rejetés,
  jamais importés en silence.
