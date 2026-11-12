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

  constructor() {
    super('CozyDeskDB');
    // v1 — schéma initial. Les index supplémentaires se rajoutent
    // via db.version(n + 1).stores(...) sans jamais modifier les index existants.
    this.version(1).stores({
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
    });

    // v2 — rétro-remplissage non destructif de `addedAt` sur les pistes historiques.
    this.version(2).upgrade(async (tx) => {
      await tx
        .table('tracks')
        .toCollection()
        .modify((track: Record<string, unknown>) => {
          if (typeof track.addedAt !== 'number') {
            track.addedAt = typeof track.createdAt === 'number' ? track.createdAt : Date.now();
          }
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
    if (typeof track.addedAt !== 'number') {
      track.addedAt = typeof track.createdAt === 'number' ? track.createdAt : Date.now();
      count++;
    }
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
    await migrateLegacyTracks(db);
  } catch (err) {
    console.error('[cozydesk:db] ouverture impossible :', err);
    throw err;
  }
}
