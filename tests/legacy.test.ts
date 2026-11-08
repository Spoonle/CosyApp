/** Tests du scan/import des données legacy (préservation, jamais de suppression). */
import { describe, expect, it } from 'vitest';
import { importLegacyData, scanLegacyData } from '@/services/storage/legacy';
import { db } from '@/services/storage/db';

describe('données legacy', () => {
  it('détecte les clés localStorage évoquant CozyDesk (hors clés actuelles)', async () => {
    window.localStorage.setItem(
      'cozydesk-tasks',
      JSON.stringify([{ title: 'Ancienne tâche', done: false }, { title: 'Autre', done: true }])
    );
    window.localStorage.setItem('cozydesk.settings', JSON.stringify({ theme: 'x' }));
    window.localStorage.setItem('completely-unrelated', 'hello');
    const report = await scanLegacyData();
    expect(report.localStorageKeys.map((k) => k.key)).toContain('cozydesk-tasks');
    expect(report.localStorageKeys.map((k) => k.key)).toContain('cozydesk.settings');
    expect(report.localStorageKeys.map((k) => k.key)).not.toContain('completely-unrelated');
    expect(report.potential.tasks).toBe(2);
  });

  it('ignore les clés de l’application actuelle (préfixe cozydesk.)', async () => {
    window.localStorage.setItem('cozydesk.settings.v1', JSON.stringify({ state: { theme: 'y' } }));
    const report = await scanLegacyData();
    expect(report.localStorageKeys).toHaveLength(0);
  });

  it('importe sans jamais supprimer les originaux', async () => {
    window.localStorage.setItem(
      'cozydesk-store',
      JSON.stringify({
        state: {
          tasks: [{ title: 'Tâche legacy', completed: true }],
          notes: [{ title: 'Note legacy', content: 'Contenu important' }]
        }
      })
    );
    const result = await importLegacyData();
    expect(result.tasks).toBe(1);
    expect(result.notes).toBe(1);

    // Originaux intacts
    expect(window.localStorage.getItem('cozydesk-store')).not.toBeNull();
    // Sauvegarde pré-migration créée
    expect(await db.backups.count()).toBe(1);
    // Données importées
    const tasks = await db.tasks.toArray();
    expect(tasks.some((t) => t.title === 'Tâche legacy' && t.status === 'done')).toBe(true);
    const notes = await db.notes.toArray();
    expect(notes.some((n) => n.title === 'Note legacy' && n.content === 'Contenu important')).toBe(true);
  });

  it('ne plante pas sur des valeurs non JSON', async () => {
    window.localStorage.setItem('cozydesk-broken', '{pas du json');
    const report = await scanLegacyData();
    expect(report.localStorageKeys[0].detected).toContain('valeur non JSON');
    const result = await importLegacyData();
    expect(result.tasks).toBe(0);
  });
});
