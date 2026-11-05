/** Fenêtres flottantes internes à CozyDesk (pas les fenêtres natives). */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSettingsStore } from '@/stores/settings';

export type SnapZone = 'left' | 'right' | 'top';

export interface WindowRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WindowState extends WindowRect {
  id: string; // identifiant du module
  z: number;
  minimized: boolean;
  maximized: boolean;
  /** Animation de fermeture en cours. */
  closing: boolean;
  prevRect?: WindowRect;
}

export interface SnapPreviewState {
  zone: SnapZone;
  rect: WindowRect;
}

/** Hauteur de la barre de titre (fines, discrète, en 2.0). */
export const TOPBAR_H = 34;

/** Réserve d'espace occupée par le dock selon sa position et son auto-masquage. */
export function dockReserve(): number {
  const dock = useSettingsStore.getState().workspace.dock;
  if (!dock.visible) return 18;
  if (dock.position !== 'bottom') return 18;
  return dock.autoHide ? 36 : 88;
}

/** Réserve latérale quand le dock est ancré à gauche ou à droite. */
function dockSideReserve(): number {
  const dock = useSettingsStore.getState().workspace.dock;
  if (!dock.visible || dock.position === 'bottom') return 0;
  return dock.autoHide ? 24 : 76;
}

/** Bornes de l'espace de travail (sous la barre de titre, au-dessus du dock). */
export function workspaceBounds(): WindowRect {
  const reserve = dockReserve();
  const side = dockSideReserve();
  return {
    x: 12 + (useSettingsStore.getState().workspace.dock.position === 'left' ? side : 0),
    y: TOPBAR_H + 10,
    w: Math.max(320, window.innerWidth - 24 - side),
    h: Math.max(240, window.innerHeight - TOPBAR_H - 10 - reserve)
  };
}

interface WindowActions {
  windows: WindowState[];
  topZ: number;
  snapPreview: SnapPreviewState | null;
  open: (moduleId: string, size: { w: number; h: number }, focusNew?: boolean) => void;
  close: (id: string) => void;
  actuallyRemove: (id: string) => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  restore: (id: string) => void;
  toggleMaximize: (id: string) => void;
  setRect: (id: string, rect: Partial<WindowRect>) => void;
  setSnapPreview: (preview: SnapPreviewState | null) => void;
  snap: (id: string, zone: SnapZone) => void;
  closeAll: () => void;
  minimizeAll: () => void;
  /** Au démarrage : replace les fenêtres dans l'écran. */
  reconcile: (sizes: Record<string, { w: number; h: number }>) => void;
}

export const useWindowStore = create<WindowActions>()(
  persist(
    (set, get) => ({
      windows: [],
      topZ: 100,
      snapPreview: null,

      open: (moduleId, size, focusNew = true) => {
        const { windows, topZ } = get();
        const existing = windows.find((w) => w.id === moduleId);
        if (existing) {
          set({
            windows: windows.map((w) =>
              w.id === moduleId
                ? { ...w, minimized: false, closing: false, z: topZ + 1 }
                : w
            ),
            topZ: topZ + 1
          });
          return;
        }
        const bounds = workspaceBounds();
        const w = Math.min(size.w, bounds.w);
        const h = Math.min(size.h, bounds.h);
        const openCount = windows.filter((win) => !win.closing).length;
        const cascade = (openCount % 6) * 26;
        const x = Math.min(
          bounds.x + Math.max(8, (bounds.w - w) / 2) + cascade - 60,
          bounds.x + bounds.w - w
        );
        const y = Math.min(
          bounds.y + Math.max(8, (bounds.h - h) / 2.4) + cascade - 40,
          bounds.y + bounds.h - h
        );
        set({
          windows: [
            ...windows,
            {
              id: moduleId,
              x: Math.max(bounds.x, x),
              y: Math.max(bounds.y, y),
              w,
              h,
              z: topZ + 1,
              minimized: false,
              maximized: false,
              closing: false
            }
          ],
          topZ: topZ + 1
        });
        if (!focusNew) return;
      },

      close: (id) =>
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, closing: true } : w))
        })),

      actuallyRemove: (id) =>
        set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

      focus: (id) =>
        set((s) => {
          const target = s.windows.find((w) => w.id === id);
          if (!target || target.z === s.topZ) return s;
          return {
            windows: s.windows.map((w) => (w.id === id ? { ...w, z: s.topZ + 1 } : w)),
            topZ: s.topZ + 1
          };
        }),

      minimize: (id) =>
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w))
        })),

      restore: (id) =>
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === id ? { ...w, minimized: false, z: s.topZ + 1 } : w
          ),
          topZ: s.topZ + 1
        })),

      toggleMaximize: (id) =>
        set((s) => ({
          windows: s.windows.map((w) => {
            if (w.id !== id) return w;
            if (w.maximized && w.prevRect) {
              return { ...w, maximized: false, ...w.prevRect, prevRect: undefined };
            }
            const bounds = workspaceBounds();
            return {
              ...w,
              maximized: true,
              prevRect: { x: w.x, y: w.y, w: w.w, h: w.h },
              x: bounds.x,
              y: bounds.y,
              w: bounds.w,
              h: bounds.h
            };
          })
        })),

      setRect: (id, rect) =>
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, ...rect } : w))
        })),

      setSnapPreview: (preview) => set({ snapPreview: preview }),

      snap: (id, zone) =>
        set((s) => {
          const bounds = workspaceBounds();
          return {
            windows: s.windows.map((w) => {
              if (w.id !== id) return w;
              const prev = w.maximized && w.prevRect ? w.prevRect : { x: w.x, y: w.y, w: w.w, h: w.h };
              if (zone === 'top') {
                return {
                  ...w,
                  maximized: true,
                  prevRect: prev,
                  x: bounds.x,
                  y: bounds.y,
                  w: bounds.w,
                  h: bounds.h
                };
              }
              return {
                ...w,
                maximized: false,
                prevRect: undefined,
                x: zone === 'left' ? bounds.x : bounds.x + Math.round(bounds.w / 2) + 6,
                y: bounds.y,
                w: Math.round(bounds.w / 2) - 6,
                h: bounds.h
              };
            }),
            snapPreview: null
          };
        }),

      closeAll: () =>
        set((s) => ({
          windows: s.windows.map((w) => ({ ...w, closing: true }))
        })),

      minimizeAll: () =>
        set((s) => ({
          windows: s.windows.map((w) => ({ ...w, minimized: true }))
        })),

      reconcile: (sizes) =>
        set((s) => {
          const bounds = workspaceBounds();
          return {
            windows: s.windows
              .filter((w) => sizes[w.id] !== undefined)
              .map((w) => {
                const size = sizes[w.id];
                const width = Math.min(size.w, bounds.w);
                const height = Math.min(size.h, bounds.h);
                return {
                  ...w,
                  closing: false,
                  w: width,
                  h: height,
                  x: Math.min(Math.max(w.x, bounds.x), bounds.x + bounds.w - width),
                  y: Math.min(Math.max(w.y, bounds.y), bounds.y + bounds.h - height)
                };
              })
          };
        })
    }),
    {
      name: 'cozydesk.windows.v1',
      version: 1,
      partialize: (s) => ({
        windows: s.windows.map((w) => ({
          id: w.id,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
          z: w.z,
          minimized: w.minimized,
          maximized: false,
          closing: false
        })),
        topZ: s.topZ
      })
    }
  )
);
