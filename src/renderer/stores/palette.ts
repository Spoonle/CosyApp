/** État de la palette de commandes (Ctrl+K). */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PaletteState {
  open: boolean;
  query: string;
  selected: number;
  recents: string[];
  openPalette: (on: boolean) => void;
  setQuery: (q: string) => void;
  setSelected: (i: number) => void;
  remember: (commandId: string) => void;
}

export const usePaletteStore = create<PaletteState>()(
  persist(
    (set) => ({
      open: false,
      query: '',
      selected: 0,
      recents: [],
      openPalette: (on) => set({ open: on, query: '', selected: 0 }),
      setQuery: (q) => set({ query: q, selected: 0 }),
      setSelected: (i) => set({ selected: i }),
      remember: (commandId) =>
        set((s) => ({
          recents: [commandId, ...s.recents.filter((r) => r !== commandId)].slice(0, 6)
        }))
    }),
    {
      name: 'cozydesk.palette.v1',
      version: 1,
      partialize: (s) => ({ recents: s.recents })
    }
  )
);
