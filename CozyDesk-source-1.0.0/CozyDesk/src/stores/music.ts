/** Store musique : file d'attente, lecture, volume, playlists. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/services/storage/db';
import { grantTrackUrl, musicPlayer } from '@/services/audio/musicPlayer';
import { toast } from '@/stores/toast';
import type { Track } from '@/types/domain';

export type RepeatMode = 'off' | 'all' | 'one';

interface MusicState {
  queue: string[]; // identifiants de pistes
  currentId: string | null;
  playing: boolean;
  position: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Initialise les écouteurs du lecteur (une fois au démarrage). */
  init: () => void;
  playTrack: (trackId: string, queue?: string[]) => Promise<void>;
  togglePlay: () => Promise<void>;
  next: (auto?: boolean) => Promise<void>;
  prev: () => Promise<void>;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  setShuffle: (on: boolean) => void;
  cycleRepeat: () => void;
  enqueue: (trackId: string) => void;
  removeFromQueue: (index: number) => void;
  playNextInQueue: (trackId: string) => void;
}

let initialized = false;

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      queue: [],
      currentId: null,
      playing: false,
      position: 0,
      duration: 0,
      volume: 0.85,
      shuffle: false,
      repeat: 'off',

      init: () => {
        if (initialized) return;
        initialized = true;
        musicPlayer.setVolume(get().volume);
        musicPlayer.onTime(() => {
          set({ position: musicPlayer.currentTime, duration: musicPlayer.duration });
        });
        musicPlayer.onEnded(() => {
          void get().next(true);
        });
        musicPlayer.onError(() => {
          set({ playing: false });
          toast('error', 'Lecture impossible', 'Le fichier est peut-être introuvable.');
        });
        // Media Session (intégration système)
        if ('mediaSession' in navigator) {
          navigator.mediaSession.setActionHandler('play', () => void get().togglePlay());
          navigator.mediaSession.setActionHandler('pause', () => void get().togglePlay());
          navigator.mediaSession.setActionHandler('nexttrack', () => void get().next());
          navigator.mediaSession.setActionHandler('previoustrack', () => void get().prev());
        }
      },

      playTrack: async (trackId, queue) => {
        const track = await db.tracks.get(trackId);
        if (!track) {
          toast('error', 'Piste introuvable');
          return;
        }
        const currentQueue = queue ?? get().queue;
        set({ queue: currentQueue.length > 0 ? currentQueue : [trackId], currentId: trackId });
        try {
          const url = await grantTrackUrl(track);
          musicPlayer.load(url);
          await musicPlayer.play();
          set({ playing: true, position: 0 });
          updateMediaSession(track);
        } catch (err) {
          set({ playing: false });
          toast('error', 'Lecture impossible', err instanceof Error ? err.message : undefined);
        }
      },

      togglePlay: async () => {
        const { currentId, playing } = get();
        if (!currentId) return;
        if (playing) {
          musicPlayer.pause();
          set({ playing: false });
        } else {
          try {
            await musicPlayer.play();
            set({ playing: true });
          } catch (err) {
            toast('error', 'Lecture impossible', err instanceof Error ? err.message : undefined);
          }
        }
      },

      next: async (auto = false) => {
        const { queue, currentId, repeat, shuffle } = get();
        if (queue.length === 0) return;
        if (repeat === 'one' && auto && currentId) {
          await get().playTrack(currentId);
          return;
        }
        let idx = currentId ? queue.indexOf(currentId) : -1;
        if (shuffle && queue.length > 1) {
          let rand = idx;
          while (rand === idx) rand = Math.floor(Math.random() * queue.length);
          idx = rand;
        } else {
          idx = idx + 1;
        }
        if (idx >= queue.length) {
          if (repeat === 'all') idx = 0;
          else {
            musicPlayer.pause();
            set({ playing: false });
            return;
          }
        }
        await get().playTrack(queue[idx]);
      },

      prev: async () => {
        const { queue, currentId } = get();
        if (queue.length === 0) return;
        // Retour au début si on est après 3 secondes, sinon piste précédente.
        if (musicPlayer.currentTime > 3 && currentId) {
          musicPlayer.seek(0);
          return;
        }
        const idx = currentId ? queue.indexOf(currentId) : 0;
        const prevIdx = idx > 0 ? idx - 1 : queue.length - 1;
        await get().playTrack(queue[prevIdx]);
      },

      seek: (sec) => {
        musicPlayer.seek(sec);
        set({ position: sec });
      },

      setVolume: (v) => {
        set({ volume: v });
        musicPlayer.setVolume(v);
      },

      setShuffle: (on) => set({ shuffle: on }),

      cycleRepeat: () => {
        const order: RepeatMode[] = ['off', 'all', 'one'];
        const current = get().repeat;
        set({ repeat: order[(order.indexOf(current) + 1) % order.length] });
      },

      enqueue: (trackId) => {
        const { queue, currentId } = get();
        if (currentId && !queue.includes(currentId)) {
          set({ queue: [currentId, ...queue, trackId] });
        } else {
          set({ queue: [...queue, trackId] });
        }
      },

      removeFromQueue: (index) => {
        const { queue } = get();
        set({ queue: queue.filter((_, i) => i !== index) });
      },

      playNextInQueue: (trackId) => {
        const { queue, currentId } = get();
        if (!currentId) {
          void get().playTrack(trackId);
          return;
        }
        const idx = queue.indexOf(currentId);
        const copy = [...queue];
        copy.splice(idx + 1, 0, trackId);
        set({ queue: copy });
      }
    }),
    {
      name: 'cozydesk.music.v1',
      version: 1,
      partialize: (s) => ({
        volume: s.volume,
        shuffle: s.shuffle,
        repeat: s.repeat
      })
    }
  )
);

function updateMediaSession(track: Track): void {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist ?? '',
      album: track.album ?? 'CozyDesk'
    });
  } catch {
    /* Media Session non critique */
  }
}
