/** Module Musique — bibliothèque locale, playlists, file d'attente, pochette, métadonnées. */
import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  FolderOpen,
  ListMusic,
  Music as MusicIcon,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  X
} from 'lucide-react';
import { EmptyState, GlassButton, IconButton, Input, SectionTitle, Slider } from '@/components/glass';
import { db, nowTs, uid } from '@/services/storage/db';
import type { Playlist, Track } from '@/types/domain';
import { useMusicStore, type RepeatMode } from '@/stores/music';
import { trackGradient } from '@/services/audio/musicPlayer';
import { confirmAction, toast } from '@/stores/toast';

export default function MusicModule(): React.ReactNode {
  const init = useMusicStore((s) => s.init);
  const playTrack = useMusicStore((s) => s.playTrack);
  const enqueue = useMusicStore((s) => s.enqueue);
  const playNextInQueue = useMusicStore((s) => s.playNextInQueue);
  const removeFromQueue = useMusicStore((s) => s.removeFromQueue);
  const currentId = useMusicStore((s) => s.currentId);
  const playing = useMusicStore((s) => s.playing);
  const position = useMusicStore((s) => s.position);
  const duration = useMusicStore((s) => s.duration);
  const volume = useMusicStore((s) => s.volume);
  const shuffle = useMusicStore((s) => s.shuffle);
  const repeat = useMusicStore((s) => s.repeat);
  const queue = useMusicStore((s) => s.queue);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const next = useMusicStore((s) => s.next);
  const prev = useMusicStore((s) => s.prev);
  const seek = useMusicStore((s) => s.seek);
  const setVolume = useMusicStore((s) => s.setVolume);
  const setShuffle = useMusicStore((s) => s.setShuffle);
  const cycleRepeat = useMusicStore((s) => s.cycleRepeat);

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'library' | 'playlists' | 'queue'>('library');
  const [activePlaylist, setActivePlaylist] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  const tracks = useLiveQuery(() => db.tracks.orderBy('addedAt').reverse().toArray(), [], [] as Track[]);
  const playlists = useLiveQuery(() => db.playlists.toArray(), [], [] as Playlist[]);

  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentId) ?? null,
    [tracks, currentId]
  );

  const filteredTracks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter((t) => `${t.title} ${t.artist ?? ''} ${t.album ?? ''}`.toLowerCase().includes(q));
  }, [tracks, search]);

  /* ---------- Import ---------- */

  const importFiles = async (): Promise<void> => {
    const api = window.cozydesk;
    if (!api) {
      toast('error', 'Import indisponible', 'Fonction disponible dans l’application CozyDesk.');
      return;
    }
    setImporting(true);
    try {
      const grants = await api.dialogs.openFiles('audio', true);
      if (grants.length === 0) return;
      let parsedCount = 0;
      let fallbackCount = 0;
      for (const grant of grants) {
        const ts = nowTs();
        const fallbackTitle = grant.name.replace(/\.[^.]+$/, '');
        const track: Track = {
          id: uid(),
          createdAt: ts,
          updatedAt: ts,
          path: grant.path,
          title: fallbackTitle,
          ext: grant.ext,
          size: grant.size
        };
        // Métadonnées réelles (best-effort) via music-metadata.
        try {
          const { parseBlob } = await import('music-metadata');
          const resp = await fetch(grant.url);
          const blob = await resp.blob();
          const meta = await parseBlob(blob);
          if (meta.common.title) track.title = meta.common.title;
          if (meta.common.artist) track.artist = meta.common.artist;
          if (meta.common.album) track.album = meta.common.album;
          if (meta.common.picture !== undefined && meta.common.picture.length > 0) {
            const pic = meta.common.picture[0];
            track.picture = new Blob([pic.data], { type: pic.format });
          }
          if (typeof meta.format.duration === 'number') {
            track.durationSec = Math.round(meta.format.duration);
          }
          parsedCount++;
        } catch {
          // Repli : découpe « Artiste - Titre » du nom de fichier.
          const parts = fallbackTitle.split(' - ');
          if (parts.length >= 2) {
            track.artist = parts[0].trim();
            track.title = parts.slice(1).join(' - ').trim();
          }
          fallbackCount++;
        }
        await db.tracks.put(track);
      }
      toast(
        'success',
        `${grants.length} piste${grants.length > 1 ? 's' : ''} importée${grants.length > 1 ? 's' : ''}`,
        parsedCount > 0 ? `${parsedCount} avec métadonnées complètes, ${fallbackCount} par nom de fichier.` : undefined
      );
    } catch (err) {
      toast('error', 'Import impossible', err instanceof Error ? err.message : undefined);
    } finally {
      setImporting(false);
    }
  };

  const libraryQueue = useMemo(() => filteredTracks.map((t) => t.id), [filteredTracks]);

  return (
    <div className="module-root module-split">
      {/* ---------- Colonne gauche ---------- */}
      <div className="module-split-left" style={{ width: 320 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Input
            placeholder="Rechercher dans la bibliothèque…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: 'var(--text-sm)' }}
          />
          <GlassButton
            size="sm"
            variant="primary"
            onClick={() => void importFiles()}
            disabled={importing}
            data-tooltip="Importer des fichiers audio locaux"
          >
            <FolderOpen size={14} />
          </GlassButton>
        </div>

        <div className="segmented" style={{ alignSelf: 'flex-start' }}>
          <button data-active={tab === 'library'} onClick={() => setTab('library')}>
            Bibliothèque ({tracks.length})
          </button>
          <button data-active={tab === 'playlists'} onClick={() => setTab('playlists')}>
            Playlists ({playlists.length})
          </button>
          <button data-active={tab === 'queue'} onClick={() => setTab('queue')}>
            File ({queue.length})
          </button>
        </div>

        <div className="module-list">
          {tab === 'library' &&
            (filteredTracks.length === 0 ? (
              <EmptyState icon={<MusicIcon size={26} />} title="Bibliothèque vide">
                Importez vos fichiers audio locaux (MP3, FLAC, OGG, M4A…). Tout reste sur votre
                machine — aucun service de streaming, aucune donnée envoyée.
              </EmptyState>
            ) : (
              filteredTracks.map((t) => (
                <div
                  key={t.id}
                  className="module-item"
                  data-selected={t.id === currentId}
                  onClick={() => void playTrack(t.id, libraryQueue)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void playTrack(t.id, libraryQueue);
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      flexShrink: 0,
                      background: trackGradient(t),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgb(255 255 255 / 0.9)'
                    }}
                  >
                    {t.id === currentId && playing ? (
                      <Pause size={13} />
                    ) : (
                      <Play size={13} />
                    )}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="module-item-title" style={{ display: 'block' }}>{t.title}</span>
                    <span className="module-item-sub" style={{ display: 'block' }}>
                      {t.artist ?? 'Artiste inconnu'}
                      {t.durationSec ? ` · ${Math.floor(t.durationSec / 60)}:${String(t.durationSec % 60).padStart(2, '0')}` : ''}
                    </span>
                  </span>
                  <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button
                      aria-label="Lire ensuite"
                      data-tooltip="Lire ensuite"
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        playNextInQueue(t.id);
                      }}
                    >
                      <ListMusic size={13} />
                    </button>
                    <button
                      aria-label="Ajouter à la file"
                      data-tooltip="Ajouter à la file"
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        enqueue(t.id);
                      }}
                    >
                      <Plus size={13} />
                    </button>
                    <button
                      aria-label="Supprimer de la bibliothèque"
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        void confirmAction({
                          title: 'Retirer cette piste ?',
                          message: `« ${t.title} » sera retirée de la bibliothèque CozyDesk (le fichier sur disque n’est pas touché).`,
                          confirmLabel: 'Retirer',
                          danger: true
                        }).then((ok) => {
                          if (ok) void db.tracks.delete(t.id);
                        });
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                </div>
              ))
            ))}

          {tab === 'playlists' && (
            <>
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const ts = nowTs();
                  await db.playlists.put({
                    id: uid(),
                    createdAt: ts,
                    updatedAt: ts,
                    name: `Playlist ${playlists.length + 1}`,
                    trackIds: []
                  });
                }}
              >
                <Plus size={14} /> Nouvelle playlist
              </GlassButton>
              {playlists.map((p) => (
                <div key={p.id} className="module-item" data-selected={p.id === activePlaylist}>
                  <button
                    style={{ flex: 1, textAlign: 'left' }}
                    onClick={() => setActivePlaylist(p.id)}
                  >
                    <span className="module-item-title" style={{ display: 'block' }}>{p.name}</span>
                    <span className="module-item-sub" style={{ display: 'block' }}>
                      {p.trackIds.length} piste{p.trackIds.length > 1 ? 's' : ''}
                    </span>
                  </button>
                  <button
                    aria-label="Lire la playlist"
                    data-tooltip="Lire"
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => {
                      if (p.trackIds.length === 0) return;
                      void playTrack(p.trackIds[0], p.trackIds);
                    }}
                  >
                    <Play size={13} />
                  </button>
                  <button
                    aria-label="Supprimer la playlist"
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() =>
                      void confirmAction({
                        title: 'Supprimer la playlist ?',
                        message: `« ${p.name} » sera supprimée. Les pistes restent dans la bibliothèque.`,
                        confirmLabel: 'Supprimer',
                        danger: true
                      }).then((ok) => {
                        if (ok) void db.playlists.delete(p.id);
                      })
                    }
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {activePlaylist && <PlaylistEditor playlistId={activePlaylist} tracks={tracks} />}
            </>
          )}

          {tab === 'queue' && (
            <>
              {queue.length === 0 && (
                <div className="text-muted" style={{ padding: 12, fontSize: 'var(--text-sm)' }}>
                  File d’attente vide.
                </div>
              )}
              {queue.map((id, index) => {
                const t = tracks.find((tr) => tr.id === id);
                return (
                  <div key={`${id}-${index}`} className="module-item" data-selected={id === currentId}>
                    <span className="text-muted tabular" style={{ width: 18, fontSize: 'var(--text-xs)' }}>
                      {index + 1}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="module-item-title" style={{ display: 'block' }}>
                        {t?.title ?? 'Piste introuvable'}
                      </span>
                    </span>
                    <button
                      aria-label="Retirer de la file"
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => removeFromQueue(index)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ---------- Lecteur ---------- */}
      <div className="module-split-right" style={{ alignItems: 'center', justifyContent: 'center', padding: 22 }}>
        {currentTrack ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 420 }}>
            <CoverArt track={currentTrack} size={200} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 650 }}>{currentTrack.title}</div>
              <div className="text-secondary" style={{ fontSize: 'var(--text-md)' }}>
                {currentTrack.artist ?? 'Artiste inconnu'}
                {currentTrack.album ? ` — ${currentTrack.album}` : ''}
              </div>
            </div>

            <div style={{ width: '100%' }}>
              <Slider
                value={duration > 0 ? position : 0}
                min={0}
                max={Math.max(1, duration)}
                step={1}
                onChange={(v) => seek(v)}
                ariaLabel="Progression de la piste"
              />
              <div
                className="text-muted tabular"
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}
              >
                <span>{fmtTime(position)}</span>
                <span>{fmtTime(duration)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IconButton
                label={shuffle ? 'Désactiver la lecture aléatoire' : 'Lecture aléatoire'}
                onClick={() => setShuffle(!shuffle)}
                style={{ color: shuffle ? 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))' : undefined }}
              >
                <Shuffle size={16} />
              </IconButton>
              <IconButton label="Piste précédente" onClick={() => void prev()}>
                <SkipBack size={18} />
              </IconButton>
              <button className="btn btn-primary btn-icon" style={{ width: 52, height: 52 }} aria-label="Lecture/Pause" onClick={() => void togglePlay()}>
                {playing ? <Pause size={22} /> : <Play size={22} />}
              </button>
              <IconButton label="Piste suivante" onClick={() => void next()}>
                <SkipForward size={18} />
              </IconButton>
              <IconButton
                label={repeatLabel(repeat)}
                onClick={cycleRepeat}
                style={{ color: repeat !== 'off' ? 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))' : undefined }}
              >
                {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
              </IconButton>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: 300 }}>
              <Volume2 size={15} className="text-muted" />
              <Slider value={volume} onChange={(v) => setVolume(v)} ariaLabel="Volume" />
            </div>
          </div>
        ) : (
          <EmptyState icon={<MusicIcon size={32} />} title="Aucune lecture en cours">
            Sélectionnez une piste dans votre bibliothèque locale. Les fichiers restent sur votre
            machine et sont lus via un protocole sécurisé.
          </EmptyState>
        )}
      </div>
    </div>
  );
}

function repeatLabel(repeat: RepeatMode): string {
  if (repeat === 'all') return 'Répéter tout';
  if (repeat === 'one') return 'Répéter la piste';
  return 'Répétition désactivée';
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/* ---------- Pochette ---------- */

function CoverArt({ track, size }: { track: Track; size: number }): React.ReactNode {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!track.picture) {
      setUrl(null);
      return;
    }
    const objUrl = URL.createObjectURL(track.picture);
    setUrl(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [track.picture]);

  if (url) {
    return (
      <img
        src={url}
        alt={`Pochette de ${track.title}`}
        style={{ width: size, height: size, borderRadius: 18, objectFit: 'cover', boxShadow: 'var(--shadow-lg)' }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 18,
        background: trackGradient(track),
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgb(255 255 255 / 0.85)'
      }}
    >
      <MusicIcon size={size * 0.28} />
    </div>
  );
}

/* ---------- Éditeur de playlist ---------- */

function PlaylistEditor({ playlistId, tracks }: { playlistId: string; tracks: Track[] }): React.ReactNode {
  const playlist = useLiveQuery(() => db.playlists.get(playlistId), [playlistId]);
  const [title, setTitle] = useState('');
  if (!playlist) return null;

  return (
    <div className="glass-ultra" style={{ padding: 10, borderRadius: 'var(--radius-md)', marginTop: 8 }}>
      <SectionTitle>{playlist.name}</SectionTitle>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <Input
          placeholder="Renommer…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ fontSize: 'var(--text-sm)', padding: '5px 9px' }}
        />
        <GlassButton
          size="sm"
          variant="ghost"
          onClick={async () => {
            if (!title.trim()) return;
            await db.playlists.put({ ...playlist, name: title.trim(), updatedAt: nowTs() });
            setTitle('');
          }}
        >
          Renommer
        </GlassButton>
      </div>
      <div className="module-list" style={{ maxHeight: 160 }}>
        {playlist.trackIds.length === 0 && (
          <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            Playlist vide — ajoutez des pistes depuis la bibliothèque.
          </div>
        )}
        {playlist.trackIds.map((id, i) => {
          const t = tracks.find((tr) => tr.id === id);
          return (
            <div key={`${id}-${i}`} className="list-row" style={{ padding: '4px 6px' }}>
              <span style={{ flex: 1, fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t?.title ?? 'Piste introuvable'}
              </span>
              <button
                className="text-muted"
                aria-label="Retirer de la playlist"
                onClick={() =>
                  void db.playlists.put({
                    ...playlist,
                    trackIds: playlist.trackIds.filter((_, idx) => idx !== i),
                    updatedAt: nowTs()
                  })
                }
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8, maxHeight: 120, overflowY: 'auto' }}>
        {tracks
          .filter((t) => !playlist.trackIds.includes(t.id))
          .slice(0, 30)
          .map((t) => (
            <button
              key={t.id}
              className="chip chip-button"
              onClick={() =>
                void db.playlists.put({
                  ...playlist,
                  trackIds: [...playlist.trackIds, t.id],
                  updatedAt: nowTs()
                })
              }
            >
              + {t.title.slice(0, 22)}
            </button>
          ))}
      </div>
    </div>
  );
}
