/**
 * Sauvegardes automatiques : instantané complet dans IndexedDB
 * + copie fichier dans userData/backups via IPC (si disponible).
 * Journalisation dans la table `backups` (30 derniers conservés).
 */
import { DB_SCHEMA_VERSION, db, uid, nowTs } from './db';
import type { BackupRec } from '@/types/domain';

export type BackupLabel = 'auto-démarrage' | 'pré-import' | 'pré-migration' | 'manuel';

const MAX_BACKUP_BYTES = 80 * 1024 * 1024;

/** Tables exportées dans un instantané (sans blobs). */
export async function snapshotAll(): Promise<string> {
  const data: Record<string, unknown[]> = {
    tasks: await db.tasks.toArray(),
    categories: await db.categories.toArray(),
    notes: await db.notes.toArray(),
    journal: await db.journal.toArray(),
    pomodoroSessions: await db.pomodoroSessions.toArray(),
    habits: await db.habits.toArray(),
    habitLogs: await db.habitLogs.toArray(),
    events: await db.events.toArray(),
    subjects: await db.subjects.toArray(),
    chapters: await db.chapters.toArray(),
    flashcards: await db.flashcards.toArray(),
    studySessions: await db.studySessions.toArray(),
    tracks: (await db.tracks.toArray()).map((t) => ({ ...t, picture: undefined })),
    playlists: await db.playlists.toArray()
  };
  return JSON.stringify({
    app: 'CozyDesk',
    kind: 'snapshot',
    schemaVersion: DB_SCHEMA_VERSION,
    createdAt: nowTs(),
    data
  });
}

export async function writeBackup(label: BackupLabel): Promise<BackupRec> {
  const json = await snapshotAll();
  if (json.length > MAX_BACKUP_BYTES) {
    throw new Error('Instantané trop volumineux pour une sauvegarde interne.');
  }
  const rec: BackupRec = {
    key: `backup-${nowTs()}-${uid().slice(0, 8)}`,
    createdAt: nowTs(),
    label,
    data: json
  };
  await db.backups.put(rec);
  await pruneBackups();

  // Copie fichier silencieuse (best-effort) via le processus principal.
  const api = window.cozydesk;
  if (api) {
    try {
      const d = new Date();
      const name = `cozydesk-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
        d.getDate()
      ).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(
        d.getMinutes()
      ).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}-${label.replace(/[^a-z0-9-]/gi, '')}.json`;
      await api.files.backup(name, json);
    } catch (err) {
      console.warn('[cozydesk:backup] copie fichier impossible :', err);
    }
  }
  return rec;
}

async function pruneBackups(): Promise<void> {
  const count = await db.backups.count();
  if (count <= 30) return;
  const oldest = await db.backups.orderBy('createdAt').limit(count - 30).toArray();
  await Promise.all(oldest.map((b) => db.backups.delete(b.key)));
}

export async function listBackups(): Promise<BackupRec[]> {
  const all = await db.backups.toArray();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

/** Sauvegarde quotidienne au démarrage (une seule par jour). */
export async function ensureDailyBackup(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const meta = await db.meta.get('lastDailyBackup');
  if (meta && meta.value === today) return;
  await writeBackup('auto-démarrage');
  await db.meta.put({ key: 'lastDailyBackup', value: today });
}
