/**
 * Tests de régression pour l'import musical et la migration des enregistrements historiques.
 * Couvre :
 * - Le rétro-remplissage non destructif de `addedAt` pour les pistes historiques.
 * - La requête indexée `db.tracks.orderBy('addedAt')` sur les pistes nouvelles et migrées.
 * - L'import des formats MP3, WAV, FLAC, OGG et M4A.
 * - La tolérance aux erreurs de lecture des métadonnées (nom de fichier en repli).
 * - La préservation des bibliothèques et des playlists existantes.
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { liveQuery } from 'dexie';
import {
  backfillAddedAt,
  CozyDeskDB,
  db,
  loadLibrary,
  migrateLegacyTracks,
  nowTs,
  SCHEMA_V1
} from '@/services/storage/db';
import { createTrackFromGrant } from '@/modules/music/MusicModule';
import { importBundle, validateBundle } from '@/services/storage/exportImport';
import type { Playlist, Track } from '@/types/domain';

beforeAll(async () => {
  if (!db.isOpen()) await db.open();
});

beforeEach(async () => {
  await Promise.all([
    db.tracks.clear(),
    db.playlists.clear(),
    db.backups.clear()
  ]);
});

describe('Régression : rétro-remplissage de addedAt pour les pistes existantes', () => {
  it('confirme que les pistes sans addedAt sont ignorées par orderBy(addedAt) puis réparées', async () => {
    const t1Ts = 1700000000000;
    const t2Ts = 1700000500000;

    // Insertion directe simulant des pistes créées par l'ancienne version buggée (sans addedAt)
    const legacyTrack1 = {
      id: 'legacy-1',
      createdAt: t1Ts,
      updatedAt: t1Ts,
      path: '/music/classic.mp3',
      title: 'Classic Track',
      artist: 'Classic Artist',
      album: 'Oldies',
      ext: 'mp3',
      size: 4096
    } as unknown as Track;

    const legacyTrack2 = {
      id: 'legacy-2',
      createdAt: t2Ts,
      updatedAt: t2Ts,
      path: '/music/acoustic.flac',
      title: 'Acoustic Morning',
      artist: 'Guitarist',
      ext: 'flac',
      size: 8192
    } as unknown as Track;

    await db.tracks.bulkPut([legacyTrack1, legacyTrack2]);

    // Vérification de la présence dans la table par clé primaire
    expect(await db.tracks.count()).toBe(2);

    // Bogue confirmé : orderBy('addedAt') ne trouve aucune piste car addedAt est absent de l'index
    const beforeMigration = await db.tracks.orderBy('addedAt').reverse().toArray();
    expect(beforeMigration).toHaveLength(0);

    // Exécution de la migration
    const migratedCount = await migrateLegacyTracks(db);
    expect(migratedCount).toBe(2);

    // Après migration : orderBy('addedAt') retrouve toutes les pistes dans l'ordre chronologique inverse
    const afterMigration = await db.tracks.orderBy('addedAt').reverse().toArray();
    expect(afterMigration).toHaveLength(2);
    expect(afterMigration[0].id).toBe('legacy-2');
    expect(afterMigration[0].addedAt).toBe(t2Ts);
    expect(afterMigration[1].id).toBe('legacy-1');
    expect(afterMigration[1].addedAt).toBe(t1Ts);

    // Vérification non destructive : tous les champs d'origine sont préservés
    const reloadedTrack1 = await db.tracks.get('legacy-1');
    expect(reloadedTrack1).toBeDefined();
    expect(reloadedTrack1?.title).toBe('Classic Track');
    expect(reloadedTrack1?.artist).toBe('Classic Artist');
    expect(reloadedTrack1?.album).toBe('Oldies');
    expect(reloadedTrack1?.ext).toBe('mp3');
    expect(reloadedTrack1?.size).toBe(4096);
    expect(reloadedTrack1?.createdAt).toBe(t1Ts);
    expect(reloadedTrack1?.updatedAt).toBe(t1Ts);
    expect(reloadedTrack1?.addedAt).toBe(t1Ts);
  });

  it('la montée de version Dexie v1 -> v2 rétro-remplit automatiquement addedAt', async () => {
    const { Dexie } = await import('dexie');
    const testDbName = `test-v1-to-v2-${Date.now()}`;

    // Simule une base v1 existante
    const v1Db = new Dexie(testDbName);
    v1Db.version(1).stores({
      tracks: 'id, title, artist, addedAt'
    });
    await v1Db.open();
    await v1Db.table('tracks').put({
      id: 'v1-track',
      createdAt: 1680000000000,
      updatedAt: 1680000000000,
      path: '/media/song.mp3',
      title: 'Old Song',
      ext: 'mp3',
      size: 1024
      // Pas de addedAt
    });
    v1Db.close();

    // Ouvre avec la version 2 et son upgrade
    const v2Db = new Dexie(testDbName);
    v2Db.version(1).stores({
      tracks: 'id, title, artist, addedAt'
    });
    v2Db.version(2).upgrade(async (tx) => {
      await tx
        .table('tracks')
        .toCollection()
        .modify((track: Record<string, unknown>) => {
          if (typeof track.addedAt !== 'number') {
            track.addedAt = typeof track.createdAt === 'number' ? track.createdAt : Date.now();
          }
        });
    });
    await v2Db.open();

    const result = await v2Db.table('tracks').orderBy('addedAt').toArray();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('v1-track');
    expect(result[0].addedAt).toBe(1680000000000);
    v2Db.close();
  });

  it('ne modifie pas les pistes qui ont déjà un addedAt valide', async () => {
    const ts = 1700000000000;
    const addedTs = 1700000999000;
    const properTrack: Track = {
      id: 'proper-1',
      createdAt: ts,
      updatedAt: ts,
      addedAt: addedTs,
      path: '/music/proper.ogg',
      title: 'Proper Track',
      ext: 'ogg',
      size: 1024
    };

    await db.tracks.put(properTrack);

    const migrated = await migrateLegacyTracks(db);
    expect(migrated).toBe(0);

    const reloaded = await db.tracks.get('proper-1');
    expect(reloaded?.addedAt).toBe(addedTs);
  });

  it('préserve les playlists associées lors de la migration', async () => {
    const ts = Date.now();
    const legacyTrack = {
      id: 'track-in-playlist',
      createdAt: ts,
      updatedAt: ts,
      path: '/music/fav.mp3',
      title: 'Favorite',
      ext: 'mp3',
      size: 2048
    } as unknown as Track;

    await db.tracks.put(legacyTrack);

    const playlist: Playlist = {
      id: 'pl-1',
      createdAt: ts,
      updatedAt: ts,
      name: 'Mes coups de coeur',
      trackIds: ['track-in-playlist']
    };
    await db.playlists.put(playlist);

    await migrateLegacyTracks(db);

    const pl = await db.playlists.get('pl-1');
    expect(pl).toBeDefined();
    expect(pl?.trackIds).toEqual(['track-in-playlist']);

    const queryResult = await db.tracks.orderBy('addedAt').reverse().toArray();
    expect(queryResult.some((t) => t.id === 'track-in-playlist')).toBe(true);
  });
});

describe('Import de pistes : formats supportés (MP3, WAV, FLAC, OGG, M4A)', () => {
  const formats = [
    { ext: 'mp3', name: 'Song.mp3' },
    { ext: 'wav', name: 'Instrumental.wav' },
    { ext: 'flac', name: 'HiRes.flac' },
    { ext: 'ogg', name: 'AudioStream.ogg' },
    { ext: 'm4a', name: 'Podcast.m4a' }
  ];

  it.each(formats)('importe un fichier %s avec addedAt défini et interrogeable', async ({ ext, name }) => {
    const grant = {
      name,
      path: `/media/music/${name}`,
      ext,
      size: 512000,
      url: `cozydesk-file://local/media/music/${name}`
    };

    const importTimestamp = 1710000000000;
    const { track } = await createTrackFromGrant(grant, importTimestamp);

    expect(track.addedAt).toBe(importTimestamp);
    expect(track.ext).toBe(ext);
    expect(track.path).toBe(grant.path);
    expect(track.size).toBe(grant.size);
    expect(track.title).toBe(name.replace(/\.[^.]+$/, ''));

    await db.tracks.put(track);

    const results = await db.tracks.orderBy('addedAt').reverse().toArray();
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(track.id);
    expect(results[0].addedAt).toBe(importTimestamp);
  });
});

describe('Résilience aux échecs de lecture des métadonnées', () => {
  it('importe la piste même si le parsing de métadonnées échoue (repli sur Artiste - Titre)', async () => {
    // URL inaccessible provoquant un échec du fetch / parseBlob
    const grant = {
      name: 'Ludwig van Beethoven - Moonlight Sonata.flac',
      path: '/music/Ludwig van Beethoven - Moonlight Sonata.flac',
      ext: 'flac',
      size: 15000000,
      url: 'http://127.0.0.1:9999/nonexistent.flac'
    };

    const ts = nowTs();
    const { track, hasFullMetadata } = await createTrackFromGrant(grant, ts);

    // Métadonnées non trouvées via blob -> repli activé
    expect(hasFullMetadata).toBe(false);
    expect(track.addedAt).toBe(ts);
    expect(track.artist).toBe('Ludwig van Beethoven');
    expect(track.title).toBe('Moonlight Sonata');

    await db.tracks.put(track);

    const loaded = await db.tracks.orderBy('addedAt').reverse().toArray();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe('Moonlight Sonata');
    expect(loaded[0].artist).toBe('Ludwig van Beethoven');
    expect(loaded[0].addedAt).toBe(ts);
  });

  it('importe la piste même si le fichier ne contient pas de délimiteur tiret', async () => {
    const grant = {
      name: 'AmbientSoundscape.ogg',
      path: '/ambient/AmbientSoundscape.ogg',
      ext: 'ogg',
      size: 2000000,
      url: 'invalid://url'
    };

    const ts = 1711111111000;
    const { track, hasFullMetadata } = await createTrackFromGrant(grant, ts);

    expect(hasFullMetadata).toBe(false);
    expect(track.title).toBe('AmbientSoundscape');
    expect(track.artist).toBeUndefined();
    expect(track.addedAt).toBe(ts);

    await db.tracks.put(track);

    const loaded = await db.tracks.orderBy('addedAt').toArray();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(track.id);
  });
});

describe('Importation de sauvegarde (exportImport) avec pistes historiques', () => {
  it('rétro-remplit addedAt lors de l’importation d’une sauvegarde legacy', async () => {
    const ts = 1690000000000;
    const bundle = validateBundle({
      app: 'CozyDesk',
      schemaVersion: 1,
      exportedAt: Date.now(),
      data: {
        tracks: [
          {
            id: 'legacy-export-1',
            createdAt: ts,
            updatedAt: ts,
            path: '/library/vintage.mp3',
            title: 'Vintage Track',
            artist: 'Vintage Artist',
            ext: 'mp3',
            size: 1024
            // addedAt délibérément absent
          }
        ]
      }
    });

    const report = await importBundle(bundle);
    expect(report.inserted.tracks).toBe(1);

    const query = await db.tracks.orderBy('addedAt').reverse().toArray();
    expect(query).toHaveLength(1);
    expect(query[0].id).toBe('legacy-export-1');
    expect(query[0].addedAt).toBe(ts);
  });
});

describe('Migration réelle : classe CozyDeskDB v1 -> v2', () => {
  it('migre une vraie base v1 (schéma SCHEMA_V1) et conserve toutes les tables', async () => {
    const name = `cozydesk-migration-${Date.now()}`;
    const ts = 1670000000000;

    // 1. Base créée par CozyDesk 2.0 : version 1, piste sans addedAt.
    const legacy = new Dexie(name);
    legacy.version(1).stores({ ...SCHEMA_V1 });
    await legacy.open();
    await legacy.table('tracks').bulkPut([
      {
        id: 'real-v1-1',
        createdAt: ts,
        updatedAt: ts,
        path: '/music/a.mp3',
        title: 'Real V1 A',
        artist: 'Artist',
        ext: 'mp3',
        size: 111
      },
      {
        id: 'real-v1-2',
        createdAt: ts + 1000,
        updatedAt: ts + 1000,
        path: '/music/b.wav',
        title: 'Real V1 B',
        ext: 'wav',
        size: 222
      }
    ]);
    await legacy.table('playlists').put({
      id: 'real-pl',
      createdAt: ts,
      updatedAt: ts,
      name: 'Historique',
      trackIds: ['real-v1-1', 'real-v1-2']
    });
    await legacy.table('tasks').put({
      id: 'task-1',
      createdAt: ts,
      updatedAt: ts,
      title: 'Tâche historique',
      order: 0,
      status: 'todo'
    });
    expect(await legacy.table('tracks').orderBy('addedAt').count()).toBe(0);
    legacy.close();

    // 2. Ouverture par la vraie classe applicative -> upgrade v2 automatique.
    const upgraded = new CozyDeskDB(name);
    await upgraded.open();
    expect(upgraded.verno).toBe(2);

    const tracks = await upgraded.tracks.orderBy('addedAt').reverse().toArray();
    expect(tracks.map((t) => t.id)).toEqual(['real-v1-2', 'real-v1-1']);
    expect(tracks[0].addedAt).toBe(ts + 1000);
    expect(tracks[1].addedAt).toBe(ts);

    // Non destructif : aucune autre table ni aucun autre champ n'est perdu.
    expect((await upgraded.playlists.get('real-pl'))?.trackIds).toEqual(['real-v1-1', 'real-v1-2']);
    expect((await upgraded.tasks.get('task-1'))?.title).toBe('Tâche historique');
    expect((await upgraded.tracks.get('real-v1-1'))?.path).toBe('/music/a.mp3');
    upgraded.close();
  });

  it('la migration v2 est idempotente (réouverture sans modification)', async () => {
    const name = `cozydesk-idempotent-${Date.now()}`;
    const ts = 1660000000000;

    const v1 = new Dexie(name);
    v1.version(1).stores({ ...SCHEMA_V1 });
    await v1.open();
    await v1.table('tracks').put({ id: 'idem', createdAt: ts, updatedAt: ts, title: 'Idem', ext: 'ogg', size: 1 });
    v1.close();

    const first = new CozyDeskDB(name);
    await first.open();
    const afterFirst = await first.tracks.get('idem');
    first.close();

    const second = new CozyDeskDB(name);
    await second.open();
    const afterSecond = await second.tracks.get('idem');
    // Aucune piste n'est à réparer à la réouverture.
    const repaired = await migrateLegacyTracks(second);
    second.close();

    expect(afterFirst?.addedAt).toBe(ts);
    expect(afterSecond?.addedAt).toBe(ts);
    expect(repaired).toBe(0);
  });
});

describe('Lecture de la bibliothèque : lecture pure + réparation explicite', () => {
  it('loadLibrary() est une lecture pure : aucune écriture, pas de bogue liveQuery', async () => {
    const ts = 1650000000000;
    await db.tracks.put({
      id: 'unrepaired',
      createdAt: ts,
      updatedAt: ts,
      path: '/music/unrepaired.m4a',
      title: 'Unrepaired',
      ext: 'm4a',
      size: 42
    } as unknown as Track);

    // loadLibrary ne doit jamais écrire : il ignore simplement la piste non
    // indexée. (Dexie interdit l'écriture dans un liveQuery — cf. test suivant.)
    expect(await loadLibrary()).toHaveLength(0);

    // La réparation est une étape séparée, hors liveQuery.
    expect(await migrateLegacyTracks()).toBe(1);

    const repaired = await loadLibrary();
    expect(repaired.map((t) => t.id)).toEqual(['unrepaired']);
    expect(repaired[0].addedAt).toBe(ts);
    expect(repaired[0].title).toBe('Unrepaired');
  });

  it('loadLibrary() reste utilisable dans un liveQuery (régression Windows CI)', async () => {
    const ts = 1640000000000;
    await db.tracks.bulkPut([
      { id: 'live-a', createdAt: ts, updatedAt: ts, path: '/m/a.mp3', title: 'A', ext: 'mp3', size: 1 },
      {
        id: 'live-b',
        createdAt: ts + 500,
        updatedAt: ts + 500,
        addedAt: ts + 500,
        path: '/m/b.mp3',
        title: 'B',
        ext: 'mp3',
        size: 1
      }
    ] as unknown as Track[]);

    // Un liveQuery qui écrirait lèverait ReadOnlyError ; celui-ci doit réussir
    // et émettre une valeur exploitable.
    const seen = await new Promise<Track[]>((resolve, reject) => {
      const sub = liveQuery(() => loadLibrary()).subscribe({
        next: (rows) => {
          sub.unsubscribe();
          resolve(rows);
        },
        error: (err) => {
          sub.unsubscribe();
          reject(err);
        }
      });
    });

    expect(seen).toHaveLength(1);
    expect(seen[0].id).toBe('live-b');
  });

  it('classe correctement un mélange de pistes neuves et historiques', async () => {
    await db.tracks.bulkPut([
      { id: 'old', createdAt: 1000, updatedAt: 1000, path: '/m/old.mp3', title: 'Old', ext: 'mp3', size: 1 },
      {
        id: 'new',
        createdAt: 3000,
        updatedAt: 3000,
        addedAt: 3000,
        path: '/m/new.mp3',
        title: 'New',
        ext: 'mp3',
        size: 1
      }
    ] as unknown as Track[]);

    await migrateLegacyTracks();
    const library = await loadLibrary();
    expect(library.map((t) => t.id)).toEqual(['new', 'old']);
  });
});

describe('backfillAddedAt : choix de l’horodatage de repli', () => {
  it('privilégie createdAt', () => {
    const rec: Record<string, unknown> = { createdAt: 1000, updatedAt: 2000 };
    expect(backfillAddedAt(rec)).toBe(true);
    expect(rec.addedAt).toBe(1000);
  });

  it('utilise updatedAt si createdAt est invalide', () => {
    const rec: Record<string, unknown> = { createdAt: 'pas un nombre', updatedAt: 2000 };
    backfillAddedAt(rec);
    expect(rec.addedAt).toBe(2000);
  });

  it('retombe sur la date fournie quand aucune date exploitable', () => {
    const rec: Record<string, unknown> = {};
    backfillAddedAt(rec, 424242);
    expect(rec.addedAt).toBe(424242);
  });

  it('ne touche jamais un addedAt existant', () => {
    const rec: Record<string, unknown> = { addedAt: 77, createdAt: 1000 };
    expect(backfillAddedAt(rec, 999)).toBe(false);
    expect(rec.addedAt).toBe(77);
  });

  it('répare un addedAt NaN (valeur non numérique indexée de travers)', () => {
    const rec: Record<string, unknown> = { addedAt: Number.NaN, createdAt: 5000 };
    expect(backfillAddedAt(rec)).toBe(true);
    expect(rec.addedAt).toBe(5000);
  });
});
