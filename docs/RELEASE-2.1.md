# CozyDesk 2.1 — correction de l’import musical

Version : **2.1.0** — successeur direct de **2.0.0**. Aucune fonctionnalité retirée,
aucune interface redessinée, aucune remise à zéro de données.

---

## 1. Le bogue

### Symptôme

Les fichiers audio importés semblaient ne pas être importés : le message de succès
s’affichait, la bibliothèque restait vide (ou incomplète après redémarrage).

### Cause réelle

Deux mécanismes distincts se combinaient.

**a) Le champ `addedAt` n’était pas écrit à l’import.**
`createdAt` et `updatedAt` étaient renseignés, mais pas `addedAt`.

**b) Un index Dexie n’itère pas les enregistrements dont la clé est absente.**
C’est ce second point qui rendait le bogue « silencieux » : la piste était bel et
bien stockée dans IndexedDB (récupérable par `db.tracks.get(id)`), mais
`db.tracks.orderBy('addedAt')` — la requête de la bibliothèque — ne la voyait
jamais, car `addedAt` fait partie des index du schéma (`tracks: 'id, title,
artist, addedAt'`).

Autrement dit : **les données n’étaient pas perdues, elles étaient invisibles.**
C’est ce qui a dicté la stratégie de correction — réparer sur place, jamais
repartir de zéro.

### Chemin de correction retenu

| Point | Fichier | Rôle |
|---|---|---|
| `addedAt: number` dans l’interface `Track` | `src/renderer/types/domain.ts` | le type reflète désormais la réalité du schéma |
| `addedAt: ts` à la création d’une piste | `src/renderer/modules/music/MusicModule.tsx` | plus aucune piste neuve n’est écrite sans son index |
| Migration Dexie **v1 → v2** | `src/renderer/services/storage/db.ts` | rétro-remplit les pistes historiques un seul commit, sans toucher aux index |
| `backfillAddedAt()` | `src/renderer/services/storage/db.ts` | règle de repli unique, partagée par les trois chemins d’écriture |
| `migrateLegacyTracks()` | `src/renderer/services/storage/db.ts` | filet de sécurité exécuté à chaque ouverture de la base |
| `loadLibrary()` | `src/renderer/services/storage/db.ts` | lecture **pure** de la bibliothèque (voir §3) |
| `repairLibrary()` | `src/renderer/services/storage/db.ts` | réparation hors `liveQuery`, à l’ouverture et au montage du module |
| Normalisation à la restauration | `src/renderer/services/storage/exportImport.ts` | une sauvegarde 2.0 sans `addedAt` reste restaurable |

---

## 2. Règle de repli de l’horodatage

`backfillAddedAt(track, fallback)` est la seule implémentation de la règle, et elle
est idempotente :

1. `addedAt` déjà numérique et fini → **aucune écriture** (une piste saine n’est
   jamais modifiée, quel que soit le nombre de démarrages) ;
2. sinon `createdAt` — date réelle de création, choix le plus fidèle ;
3. sinon `updatedAt` — utilisé si `createdAt` est corrompu ;
4. sinon l’horodatage fourni (date du jour) — dernier recours.

Un `addedAt` présent mais invalide (`NaN`, chaîne de caractères) est traité comme
absent et réparé.

---

## 3. Une erreur commise puis corrigée pendant cette release

La première version de ce correctif rendait `loadLibrary()` « auto-réparatrice »
en écrivant les `addedAt` manquants **avant** la lecture. Appelée depuis un
`useLiveQuery`, elle déclenchait :

```text
ReadOnlyError: Readwrite transaction in liveQuery context
```

Dexie interdit toute transaction en écriture dans le contexte d’un `liveQuery`,
et le module Musique ne se montait plus du tout — plus grave que le bogue
d’origine.

Le problème a été détecté par la CI Windows, pas par les tests locaux : sous
Linux, l’ordre d’exécution des fichiers de test laissait la base déjà ouverte et
le `modify()` ne trouvait le plus souvent rien à écrire, ce qui masquait la
course. C’est précisément ce genre d’écart que la CI existe pour attraper.

**Correction.** La lecture et l’écriture sont désormais séparées :

- `loadLibrary()` — **lecture pure**, utilisable dans `liveQuery` ;
- `repairLibrary()` — écriture, appelée à l’ouverture de la base (avant que
  l’interface ne s’abonne) et au montage du module, **hors** `liveQuery` ;
  la notification Dexie provoque ensuite la relecture de la bibliothèque
  réparée.

Un test de non-régression souscrit un vrai `liveQuery` sur `loadLibrary()` ; il
échoue avec `ReadOnlyError` sur l’ancienne implémentation et passe sur la
nouvelle.

---

## 4. Non-destructif, par construction

- **Aucun index n’est ajouté ni retiré** en v2 : la version 2 ne contient qu’un
  `upgrade()`, elle hérite du schéma v1. Le risque de reconstruction de table
  (donc de perte de données) est écarté.
- Les enregistrements sont modifiés **en place** (`Collection.modify`), champ par
  champ ; les autres colonnes, les playlists et les blobs de pochette sont
  intacts.
- Aucun `delete`, aucun `clear`, aucun `db.delete()` n’est appelé.
- L’import de sauvegarde existant reste un *upsert* : jamais de suppression.
- Si la base est inaccessible, l’application affiche une erreur explicite et
  **ne recrée pas** la base (comportement inchangé depuis 2.0).

---

## 5. Formats audio

La liste blanche du processus principal (`AUDIO_EXTS`, `src/main/ipc/files.ts`)
couvre déjà `mp3`, `wav`, `flac`, `ogg`, `oga`, `m4a`, `aac`, `opus`, `weba`,
`webm`. Les cinq formats demandés sont donc acceptés par la boîte de dialogue,
puis par la validation IPC.

Pour chacun, le test vérifie que la piste importée est **retrouvée par la requête
indexée** de la bibliothèque, et pas seulement stockée :

| Format | Extension | Couvert par |
|---|---|---|
| MP3 | `.mp3` | `tests/musicImport.test.ts` |
| WAV | `.wav` | `tests/musicImport.test.ts` |
| FLAC | `.flac` | `tests/musicImport.test.ts` |
| OGG | `.ogg` | `tests/musicImport.test.ts` |
| M4A | `.m4a` | `tests/musicImport.test.ts` |

> Portée honnête : ces tests exercent tout le pipeline applicatif (création de la
> piste, écriture IndexedDB, requête de bibliothèque, repli sur le nom de
> fichier). Ils n’ouvrent pas de fichier audio binaire réel ni ne délèguent au
> décodeur d’Electron ; la lecture effective reste à valider manuellement dans
> l’application empaquetée.

---

## 6. Résilience aux métadonnées

`createTrackFromGrant()` entoure `parseBlob` d’un `try/catch` : un fichier sans
métadonnées, un conteneur exotique ou une lecture impossible ne bloque jamais
l’import. Le titre est alors déduit du nom de fichier, avec découpage
`Artiste - Titre` lorsqu’un tiret entouré d’espaces est présent. Le compteur
affiché dans la notification distingue les pistes « métadonnées complètes » des
pistes « par nom de fichier ».

Deux tests couvrent explicitement ce chemin (URL inaccessible, nom sans tiret).

---

## 7. Tests de régression

Ajoutés dans `tests/musicImport.test.ts` (porté de 12 à **21 tests**) :

**Migration réelle**
- une vraie base v1 est créée avec `SCHEMA_V1`, remplie de pistes sans `addedAt`,
  puis **ouverte par la vraie classe `CozyDeskDB`** : l’upgrade v2 s’exécute et
  les pistes réapparaissent dans l’ordre chronologique inverse ;
- la même opération vérifie que `playlists`, `tasks` et les autres champs des
  pistes sont préservés ;
- une réouverture ne rejoue aucune écriture (idempotence, migration = 0 piste).

**Requête auto-réparatrice**
- une piste insérée sans `addedAt` est invisible pour `orderBy('addedAt')`, puis
  retournée par `loadLibrary()` avec le bon horodatage ;
- un mélange de pistes neuves et historiques est classé correctement.

**Règle de repli** — cinq cas unitaires : `createdAt` prioritaire, `updatedAt` en
secours, valeur de repli, `addedAt` existant jamais modifié, `NaN` réparé.

**Déjà présents et conservés** — import des 5 formats, échec de parsing,
sauvegarde legacy, préservation des playlists.

> Le test v1 → v2 fourni lors du premier correctif reconstruisait un schéma Dexie
> à la main ; il ne prouvait donc pas que la **vraie** classe migrait correctement.
> Le nouveau test utilise `CozyDeskDB` elle-même. C’est la principale faiblesse
> corrigée dans cette version.

**Lecture vs écriture**
- `loadLibrary()` est vérifiée comme lecture pure ;
- un vrai `liveQuery` est souscrit sur `loadLibrary()` : il doit émettre une
  valeur sans lever `ReadOnlyError` (régression de la CI Windows).

Également ajouté : `tests/verifyPackage.test.ts` vérifie désormais que la version
contrôlée dans `app.asar` provient de `package.json` (plus de constante figée) et
qu’elle correspond aux noms d’artefacts d’`electron-builder.yml`.

---

## 8. Résultats de validation (exécutés)

| Étape | Commande | Résultat |
|---|---|---|
| Typecheck rendu | `npx tsc -p tsconfig.json --noEmit` | ✅ 0 erreur |
| Typecheck processus principal | `npx tsc -p tsconfig.electron.json --noEmit` | ✅ 0 erreur |
| ESLint | `npx eslint .` | ✅ 0 erreur, 0 avertissement |
| Tests | `npx vitest run` | ✅ **17 fichiers, 174 tests** |
| Build Electron | `npm run build:electron` | ✅ `main.cjs` + `preload.cjs` |
| Build de production | `npx vite build` | ✅ `dist/` généré |

Comparaison avec 2.0.0 : **162 → 174 tests**, tous verts.

### Chaîne CI Windows (run `43233018023`, tag `v2.1.0`)

Toutes les étapes ont réussi, y compris celles qui ne peuvent pas tourner sous
Linux :

| Étape CI | Résultat |
|---|---|
| Typecheck, lint, tests (Windows) | ✅ |
| Build frontend + Electron main | ✅ |
| Empaquetage Windows (NSIS + portable) | ✅ |
| Vérification du contenu de `app.asar` | ✅ |
| **Lancement réel de l’exe empaqueté** | ✅ capture 1024×720, 868 035 octets |
| Création du répertoire de données | ✅ `%APPDATA%\CozyDesk` |
| Archive source (14 fichiers clés) | ✅ 152 entrées, aucun artefact de build |
| Publication de la release | ✅ |

> Le premier run du tag `v2.1.0` avait échoué sur la régression `liveQuery`
> décrite au § 3. Le tag a été reposé sur le commit corrigé, et le run final est
> entièrement vert.

---

## 9. Mise à jour depuis 2.0.0

Aucune action manuelle :

1. installez 2.1 par-dessus 2.0 (ou utilisez la version portable) ;
2. au premier démarrage, la base passe en schéma v2 et les pistes historiques
   reçoivent leur `addedAt` ;
3. la bibliothèque réapparaît complète, playlists incluses.

Pour les installations dont les fichiers audio auraient été déplacés entre-temps,
la piste reste listée mais la lecture signale « Fichier introuvable ou non
autorisé » — il suffit de réimporter le fichier depuis son nouvel emplacement.
