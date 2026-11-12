/** Tests de la couche de stockage (fake-indexeddb) : CRUD, sauvegardes, import/export. */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db, uid } from '@/services/storage/db';
import { importBundle, validateBundle } from '@/services/storage/exportImport';
import type { Task } from '@/types/domain';

function makeTask(title: string): Task {
  const ts = Date.now();
  return {
    id: uid(),
    createdAt: ts,
    updatedAt: ts,
    title,
    notes: '',
    status: 'active',
    priority: 'medium',
    tags: [],
    subtasks: [],
    order: ts
  };
}

beforeAll(async () => {
  if (!db.isOpen()) await db.open();
});

beforeEach(async () => {
  await Promise.all([
    db.tasks.clear(),
    db.notes.clear(),
    db.backups.clear(),
    db.habits.clear(),
    db.pomodoroSessions.clear(),
    db.meta.clear()
  ]);
});

describe('stockage Dexie', () => {
  it('CRUD tâches : création, lecture, mise à jour, suppression', async () => {
    const task = makeTask('Écrire la documentation');
    await db.tasks.put(task);
    expect((await db.tasks.get(task.id))?.title).toBe('Écrire la documentation');

    await db.tasks.put({ ...task, status: 'done', completedAt: Date.now() });
    const updated = await db.tasks.get(task.id);
    expect(updated?.status).toBe('done');
    expect(updated?.completedAt).toBeDefined();

    await db.tasks.delete(task.id);
    expect(await db.tasks.get(task.id)).toBeUndefined();
  });

  it('les requêtes indexées fonctionnent (statut, priorité)', async () => {
    await db.tasks.bulkPut([
      { ...makeTask('A'), priority: 'urgent' },
      { ...makeTask('B'), priority: 'low' },
      { ...makeTask('C'), priority: 'urgent', status: 'done' }
    ]);
    const urgent = await db.tasks.where('priority').equals('urgent').toArray();
    expect(urgent).toHaveLength(2);
    const active = await db.tasks.where('status').equals('active').count();
    expect(active).toBe(2);
  });

  it('les blobs (pochettes) sont stockables', async () => {
    // NB : fake-indexeddb ne conserve pas les Blob natifs (rend un objet vide) —
    // IndexedDB réel les conserve. On vérifie ici que l’écriture/lecture ne casse pas.
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
    const ts = Date.now();
    await db.tracks.put({
      id: 't1',
      createdAt: ts,
      updatedAt: ts,
      addedAt: ts,
      path: '/musique/a.mp3',
      title: 'Test',
      ext: 'mp3',
      size: 100,
      picture: blob
    });
    const back = await db.tracks.get('t1');
    expect(back).toBeDefined();
    expect(back?.title).toBe('Test');
  });
});

describe('export / import', () => {
  it('valide la structure d’un lot', () => {
    expect(() => validateBundle({ foo: 1 })).toThrow();
    expect(() => validateBundle({ app: 'Autre' })).toThrow();
    const ok = validateBundle({
      app: 'CozyDesk',
      schemaVersion: 1,
      exportedAt: 0,
      data: { tasks: [] }
    });
    expect(ok.data.tasks).toEqual([]);
  });

  it('import fusionne sans supprimer l’existant et crée une sauvegarde', async () => {
    await db.tasks.put(makeTask('Existante'));
    const bundle = validateBundle({
      app: 'CozyDesk',
      schemaVersion: 1,
      exportedAt: Date.now(),
      data: {
        tasks: [makeTask('Importée'), makeTask('Importée 2')],
        notes: []
      }
    });
    const report = await importBundle(bundle);
    expect(report.inserted.tasks).toBe(2);
    expect(await db.tasks.count()).toBe(3);
    expect(await db.backups.count()).toBe(1); // sauvegarde pré-import
  });

  it('les enregistrements invalides sont rejetés, pas toute l’import', async () => {
    const bad = {
      id: 42,
      createdAt: 'pas un nombre',
      updatedAt: 0
    };
    const bundle = validateBundle({
      app: 'CozyDesk',
      schemaVersion: 1,
      exportedAt: 0,
      data: { tasks: [makeTask('Valide'), bad] }
    });
    const report = await importBundle(bundle);
    expect(report.inserted.tasks).toBe(1);
    expect(report.rejected.tasks).toBe(1);
  });
});
