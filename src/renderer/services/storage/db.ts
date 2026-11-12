/**
 * Base IndexedDB (Dexie) — schéma versionné.
 * Toute montée de version DOIT passer par migration.ts (sauvegarde préalable).
 */
import Dexie, { type Table } from 'dexie';
import type {
  BackupRec,
  Category,
  Chapter,
  EventItem,
  Flashcard,
  Habit,
  HabitLog,
  JournalEntry,
  MetaRec,
  Note,
  Playlist,
  PomodoroSession,
  StudySession,
  Subject,
  Task,
  Track
} from '@/types/domain';

/**
 * Résout l'horodatage `addedAt` d'une piste historique.
 *
 * Une piste importée par une version antérieure ne possède pas `addedAt` :
 * elle est alors **invisible** pour `db.tracks.orderBy('addedAt')` (l'index
 * Dexie ignore les enregistrements dont la clé indexée est absente), donc
 * absente de la bibliothèque alors que les données sont bien stockées.
 *
 * Ordre de repli, du plus fiable au moins fiable :
 *   1. `addedAt` existant et fini — on ne touche à rien (idempotent) ;
 *   2. `createdAt` — date réelle de création de l'enregistrement ;
 *   3. `updatedAt` — utilisée si `createdAt` est corrompu ;
 *   4. `fallback` (date du jour) — dernier recours.
 *
 * Retourne `true` si la piste a été modifiée.
 */
export function backfillAddedAt(
  track: Record<string, unknown>,
  fallback: number = Date.now()
): boolean {
  if (typeof track.addedAt === 'number' && Number.isFinite(track.addedAt)) return false;
  let value: number = fallback;
  if (typeof track.createdAt === 'number' && Number.isFinite(track.createdAt)) {
    value = track.createdAt;
  } else if (typeof track.updatedAt === 'number' && Number.isFinite(track.updatedAt)) {
    value = track.updatedAt;
  }
  track.addedAt = value;
  return true;
}

/**
 * Schéma **v1** (CozyDesk 2.0), exporté pour que les tests puissent créer une
 * vraie base historique puis la migrer avec la classe réelle `CozyDeskDB`.
 * Ne jamais modifier cette constante : elle représente le passé.
 */
export const SCHEMA_V1 = {
  meta: 'key',
  tasks: 'id, order, status, dueDate, priority, categoryId, completedAt, updatedAt',
  categories: 'id, name',
  notes: 'id, updatedAt, pinned, favorite',
  journal: 'id, date, updatedAt',
  pomodoroSessions: 'id, startedAt, phase, taskId',
  habits: 'id, archived, createdAt',
  habitLogs: 'id, habitId, date',
  events: 'id, date, startMinute',
  subjects: 'id, order',
  chapters: 'id, subjectId, done, order',
  flashcards: 'id, subjectId, due',
  studySessions: 'id, subjectId, startedAt',
  tracks: 'id, title, artist, addedAt',
  playlists: 'id, name',
  backups: 'key, createdAt'
} as const;

export class CozyDeskDB extends Dexie {
  meta!: Table<MetaRec, string>;
  tasks!: Table<Task, string>;
  categories!: Table<Category, string>;
  notes!: Table<Note, string>;
  journal!: Table<JournalEntry, string>;
  pomodoroSessions!: Table<PomodoroSession, string>;
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  events!: Table<EventItem, string>;
  subjects!: Table<Subject, string>;
  chapters!: Table<Chapter, string>;
  flashcards!: Table<Flashcard, string>;
  studySessions!: Table<StudySession, string>;
  tracks!: Table<Track, string>;
  playlists!: Table<Playlist, string>;
  backups!: Table<BackupRec, string>;

  /**
   * @param name nom de la base. Surchargeable uniquement pour les tests de
   * migration réels (v1 -> v2) : l'application utilise toujours `CozyDeskDB`.
   */
  constructor(name = 'CozyDeskDB') {
    super(name);
    // v1 — schéma initial. Les index supplémentaires se rajoutent
    // via db.version(n + 1).stores(...) sans jamais modifier les index existants.
    this.version(1).stores({ ...SCHEMA_V1 });

    // v2 — rétro-remplissage non destructif de `addedAt` sur les pistes historiques.
    // Aucun index n'est ajouté ni retiré : `tracks` était déjà indexée par
    // `addedAt`, seules les valeurs manquantes sont écrites. Une piste déjà
    // pourvue d'un `addedAt` numérique n'est jamais touchée.
    this.version(2).upgrade(async (tx) => {
      await tx
        .table('tracks')
        .toCollection()
        .modify((track: Record<string, unknown>) => {
          backfillAddedAt(track);
        });
    });
  }
}

export const DB_SCHEMA_VERSION = 2;

export const db = new CozyDeskDB();

/** Identifiant unique (UUID v4). */
export function uid(): string {
  return crypto.randomUUID();
}

export function nowTs(): number {
  return Date.now();
}

/**
 * Rétro-remplit de façon non-destructive `addedAt` pour toutes les pistes
 * qui en sont dépourvues (ex. créées sous une ancienne version sans montée de schéma).
 */
export async function migrateLegacyTracks(database: CozyDeskDB = db): Promise<number> {
  let count = 0;
  await database.tracks.toCollection().modify((track: Partial<Track>) => {
    if (backfillAddedAt(track as Record<string, unknown>)) count++;
  });
  return count;
}

/** Ouvre la base avec gestion d'erreur explicite (jamais de catch silencieux). */
export async function openDatabase(): Promise<void> {
  db.on('blocked', () => {
    console.error(
      '[cozydesk:db] une autre instance bloque la mise à jour de la base. Fermez les autres fenêtres CozyDesk.'
    );
  });
  db.on('versionchange', () => {
    // Une autre version de l'application demande un changement de schéma.
    db.close();
    console.warn('[cozydesk:db] version du schéma changée par une autre instance — rechargement.');
    window.location.reload();
  });
  try {
    await db.open();
    await repairLibrary(db);
  } catch (err) {
    console.error('[cozydesk:db] ouverture impossible :', err);
    throw err;
  }
}

/**
 * Charge la bibliothèque musicale, du plus récent au plus ancien.
 *
 * **Lecture pure** : cette fonction ne doit jamais écrire. Elle est appelée
 * depuis `useLiveQuery`, et Dexie interdit toute transaction en écriture dans
 * le contexte d'un `liveQuery` (`ReadOnlyError`). La réparation des pistes
 * historiques se fait donc via `repairLibrary()`, appelée hors du liveQuery.
 */
export async function loadLibrary(database: CozyDeskDB = db): Promise<Track[]> {
  return database.tracks.orderBy('addedAt').reverse().toArray();
}

/**
 * Répare les pistes stockées sans `addedAt` (donc invisibles pour `loadLibrary`).
 *
 * **Écriture** — à n'appeler que hors de tout `liveQuery`. Idempotent : ne
 * modifie aucune piste déjà pourvue d'un `addedAt`. Retourne le nombre de
 * pistes réparées. Un garde-fou évite de relancer un balayage complet à chaque
 * montage du module dans la même session.
 */
let repairInFlight: Promise<number> | null = null;

export function repairLibrary(database: CozyDeskDB = db): Promise<number> {
  if (repairInFlight === null) {
    repairInFlight = migrateLegacyTracks(database)
      .then((repaired) => {
        if (repaired > 0) {
          console.warn(
            `[cozydesk:db] ${repaired} piste(s) historique(s) réparée(s) (addedAt ajouté).`
          );
        }
        return repaired;
      })
      .catch((err: unknown) => {
        // Un échec de réparation ne doit jamais empêcher l'affichage de la
        // bibliothèque : on réessaiera au prochain démarrage.
        repairInFlight = null;
        console.warn('[cozydesk:db] réparation de la bibliothèque impossible :', err);
        return 0;
      });
  }
  return repairInFlight;
}
