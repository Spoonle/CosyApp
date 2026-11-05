/**
 * Contraintes de mise en page aux résolutions cibles : à 1280×720, l'espace de
 * travail doit rester utilisable (fenêtres dans l'écran, cellules de grille
 * assez larges) quelles que soient la position et la visibilité du dock.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKSPACE, DENSITY_MARGIN, useSettingsStore } from '@/stores/settings';
import { GRID_COLS, WIDGET_SIZES, useDashboardStore } from '@/stores/dashboard';
import { dockReserve, workspaceBounds } from '@/stores/windows';

const RESOLUTIONS: [number, number][] = [
  [1280, 720],
  [1366, 768],
  [1600, 900],
  [1920, 1080]
];

function withViewport(w: number, h: number, run: () => void): void {
  const prevW = window.innerWidth;
  const prevH = window.innerHeight;
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: w });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: h });
  try {
    run();
  } finally {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: prevW });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: prevH });
  }
}

describe('espace de travail aux résolutions cibles', () => {
  it.each(RESOLUTIONS)('%ix%i : les fenêtres tiennent dans l’écran', (w, h) => {
    withViewport(w, h, () => {
      for (const position of ['bottom', 'left', 'right'] as const) {
        for (const autoHide of [false, true]) {
          useSettingsStore.getState().setWorkspace({
            dock: { ...DEFAULT_WORKSPACE.dock, position, autoHide, visible: true }
          });
          const b = workspaceBounds();
          expect(b.x).toBeGreaterThan(-1);
          expect(b.y).toBeGreaterThan(-1);
          expect(b.x + b.w).toBeLessThanOrEqual(w);
          expect(b.y + b.h).toBeLessThanOrEqual(h);
          // Un module de taille minimale doit pouvoir être affiché.
          expect(b.w).toBeGreaterThanOrEqual(620);
          expect(b.h).toBeGreaterThanOrEqual(420);
        }
      }
      useSettingsStore.getState().setWorkspace({ dock: DEFAULT_WORKSPACE.dock });
    });
  });

  it.each(RESOLUTIONS)('%ix%i : la grille garde des cellules utilisables', (w, h) => {
    withViewport(w, h, () => {
      for (const density of ['tight', 'comfortable', 'airy'] as const) {
        useSettingsStore.getState().setWorkspace({ dashboard: { density } });
        const gap = 14;
        const available = w - DENSITY_MARGIN[density] * 2;
        const cellW = (available - gap * (GRID_COLS - 1)) / GRID_COLS;
        expect(cellW).toBeGreaterThan(48);
        // Le plus petit widget doit rester lisible.
        const smallest = Math.min(...Object.values(WIDGET_SIZES).map((s) => s.minW));
        expect(cellW * smallest + gap * (smallest - 1)).toBeGreaterThan(90);
      }
      useSettingsStore.getState().setWorkspace({ dashboard: { density: 'comfortable' } });
    });
  });

  it('le dock laisse plus de place quand il est masqué ou en auto-masquage', () => {
    withViewport(1280, 720, () => {
      useSettingsStore.getState().setWorkspace({
        dock: { ...DEFAULT_WORKSPACE.dock, visible: true, autoHide: false, position: 'bottom' }
      });
      const always = dockReserve();
      useSettingsStore.getState().setWorkspace({
        dock: { ...DEFAULT_WORKSPACE.dock, visible: true, autoHide: true, position: 'bottom' }
      });
      const auto = dockReserve();
      useSettingsStore.getState().setWorkspace({
        dock: { ...DEFAULT_WORKSPACE.dock, visible: false }
      });
      const hidden = dockReserve();
      expect(auto).toBeLessThan(always);
      expect(hidden).toBeLessThan(auto);
      useSettingsStore.getState().setWorkspace({ dock: DEFAULT_WORKSPACE.dock });
    });
  });

  it('la disposition par défaut ne déborde jamais de la grille', () => {
    for (const preset of ['minimal', 'focus', 'classic'] as const) {
      useDashboardStore.getState().applyPreset(preset);
      for (const widget of useDashboardStore.getState().widgets) {
        expect(widget.x).toBeGreaterThanOrEqual(0);
        expect(widget.y).toBeGreaterThanOrEqual(0);
        expect(widget.x + widget.w).toBeLessThanOrEqual(GRID_COLS);
      }
    }
    useDashboardStore.getState().applyPreset('minimal');
  });
});
