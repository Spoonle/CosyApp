/** Store ambiance : volumes persistés, moteur WebAudio procédural. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AMBIENT_CHANNELS,
  ambientEngine,
  type AmbientChannelId
} from '@/services/audio/ambientEngine';

interface AmbientState {
  volumes: Record<AmbientChannelId, number>;
  active: AmbientChannelId[];
  master: number;
  toggle: (id: AmbientChannelId) => void;
  setVolume: (id: AmbientChannelId, v: number) => void;
  setMaster: (v: number) => void;
  stopAll: () => void;
  /** À l'ouverture : applique les volumes ; relance les sons si configuré. */
  boot: (resume: boolean) => void;
}

export const useAmbientStore = create<AmbientState>()(
  persist(
    (set, get) => ({
      volumes: {
        rain: 0.6,
        forest: 0.5,
        wind: 0.5,
        fire: 0.55,
        ocean: 0.6,
        cafe: 0.5,
        white: 0.35
      },
      active: [],
      master: 0.8,

      toggle: (id) => {
        const { active, volumes } = get();
        const on = !active.includes(id);
        ambientEngine.setChannel(id, on, volumes[id]);
        set({ active: on ? [...active, id] : active.filter((c) => c !== id) });
      },

      setVolume: (id, v) => {
        set((s) => ({ volumes: { ...s.volumes, [id]: v } }));
        ambientEngine.setChannelVolume(id, v);
      },

      setMaster: (v) => {
        set({ master: v });
        ambientEngine.setMasterVolume(v);
      },

      stopAll: () => {
        ambientEngine.stopAll();
        set({ active: [] });
      },

      boot: (resume) => {
        const { volumes, master, active } = get();
        ambientEngine.setMasterVolume(master);
        if (resume) {
          for (const id of active) {
            ambientEngine.setChannel(id, true, volumes[id]);
          }
        } else {
          set({ active: [] });
        }
      }
    }),
    {
      name: 'cozydesk.ambient.v1',
      version: 1
    }
  )
);

export { AMBIENT_CHANNELS };
export type { AmbientChannelId };
