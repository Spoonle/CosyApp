/** Widget « Music ». */
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { db } from '@/services/storage/db';
import { useMusicStore } from '@/stores/music';

export function MusicWidget(): ReactNode {
  const currentId = useMusicStore((s) => s.currentId);
  const playing = useMusicStore((s) => s.playing);
  const position = useMusicStore((s) => s.position);
  const duration = useMusicStore((s) => s.duration);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const next = useMusicStore((s) => s.next);
  const prev = useMusicStore((s) => s.prev);
  const seek = useMusicStore((s) => s.seek);
  const init = useMusicStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  const track = useLiveQuery(async () => {
    if (!currentId) return undefined;
    return db.tracks.get(currentId);
  }, [currentId]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
      {track ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'linear-gradient(135deg, hsl(var(--accent-h) 50% 42%), hsl(calc(var(--accent-h) + 50) 55% 34%))',
                flexShrink: 0
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 650,
                  fontSize: 'var(--text-base)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {track.title}
              </div>
              <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                {track.artist ?? 'Artiste inconnu'}
              </div>
            </div>
          </div>
          <div
            role="slider"
            aria-label="Progression"
            aria-valuenow={Math.round(position)}
            aria-valuemax={Math.round(duration)}
            tabIndex={0}
            style={{ height: 6, borderRadius: 99, background: 'rgb(var(--glass-deep-rgb) / 0.8)', cursor: 'pointer' }}
            onClick={(e) => {
              if (duration > 0) {
                const rect = e.currentTarget.getBoundingClientRect();
                seek(((e.clientX - rect.left) / rect.width) * duration);
              }
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 99,
                width: `${duration > 0 ? (position / duration) * 100 : 0}%`,
                background: 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <button className="btn btn-ghost btn-sm btn-icon" aria-label="Précédent" onClick={() => void prev()}>
              <SkipBack size={15} />
            </button>
            <button className="btn btn-primary btn-sm btn-icon" aria-label="Lecture/Pause" onClick={() => void togglePlay()}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button className="btn btn-ghost btn-sm btn-icon" aria-label="Suivant" onClick={() => void next()}>
              <SkipForward size={15} />
            </button>
          </div>
        </>
      ) : (
        <div className="text-muted" style={{ textAlign: 'center', fontSize: 'var(--text-sm)', padding: 12 }}>
          Aucune lecture en cours. Importez votre musique depuis le module Musique.
        </div>
      )}
    </div>
  );
}

/* ---------- Citation ---------- */
