/**
 * Intégrité de la disposition : réparation des données stockées, refus des
 * chevauchements, et absence de fuite du mode édition dans la persistance.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  GRID_COLS,
  WIDGET_SIZES,
  sanitizeWidgets,
  useDashboardStore,
  type WidgetLayout
} from '@/stores/dashboard';

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function visibleOverlaps(widgets: WidgetLayout[]): boolean {
  const vis = widgets.filter((w) => !w.hidden);
  for (let i = 0; i < vis.length; i++) {
    for (let j = i + 1; j < vis.length; j++) {
      if (overlaps(vis[i], vis[j])) return true;
    }
  }
  return false;
}

beforeEach(() => {
  useDashboardStore.getState().applyPreset('minimal');
});

describe('réparation des dispositions stockées', () => {
  it('écarte les types inconnus et garde les widgets valides', () => {
    const repaired = sanitizeWidgets([
      { id: 'a', type: 'clock', x: 0, y: 0, w: 4, h: 2, hidden: false },
      { id: 'b', type: 'licorne', x: 0, y: 0, w: 4, h: 2, hidden: false },
      null,
      'nawak'
    ]);
    expect(repaired.map((w) => w.type)).toEqual(['clock']);
  });

  it('ramène les coordonnées et tailles dans la grille', () => {
    const repaired = sanitizeWidgets([
      { id: 'a', type: 'tasks', x: -40, y: -9, w: 999, h: 0, hidden: false }
    ]);
    const w = repaired[0];
    expect(w.x).toBeGreaterThanOrEqual(0);
    expect(w.y).toBeGreaterThanOrEqual(0);
    expect(w.x + w.w).toBeLessThanOrEqual(GRID_COLS);
    expect(w.w).toBeGreaterThanOrEqual(WIDGET_SIZES.tasks.minW);
    expect(w.h).toBeGreaterThanOrEqual(WIDGET_SIZES.tasks.minH);
  });

  it('régénère les identifiants dupliqués', () => {
    const repaired = sanitizeWidgets([
      { id: 'dup', type: 'clock', x: 0, y: 0, w: 4, h: 2, hidden: false },
      { id: 'dup', type: 'tasks', x: 5, y: 0, w: 3, h: 2, hidden: false }
    ]);
    expect(new Set(repaired.map((w) => w.id)).size).toBe(repaired.length);
  });

  it('sépare des widgets qui se chevauchaient', () => {
    const repaired = sanitizeWidgets([
      { id: 'a', type: 'clock', x: 0, y: 0, w: 6, h: 2, hidden: false },
      { id: 'b', type: 'tasks', x: 2, y: 0, w: 4, h: 2, hidden: false }
    ]);
    expect(repaired).toHaveLength(2);
    expect(visibleOverlaps(repaired)).toBe(false);
  });

  it('ignore les apparences invalides et conserve les valides', () => {
    const repaired = sanitizeWidgets([
      { id: 'a', type: 'clock', x: 0, y: 0, w: 4, h: 2, hidden: false, appearance: 'chrome' },
      { id: 'b', type: 'tasks', x: 5, y: 0, w: 3, h: 2, hidden: false, appearance: 'subtle' }
    ]);
    expect(repaired[0].appearance).toBeUndefined();
    expect(repaired[1].appearance).toBe('subtle');
  });

  it('retombe sur la disposition par défaut si tout est invalide', () => {
    const repaired = sanitizeWidgets([{ type: 'inconnu' }]);
    expect(repaired).toHaveLength(3);
  });
});

describe('anti-chevauchement', () => {
  it('refuse un déplacement sur un widget voisin', () => {
    const widgets = useDashboardStore.getState().widgets;
    const pomodoro = widgets.find((w) => w.type === 'pomodoro')!;
    useDashboardStore.getState().moveWidget(pomodoro.id, 0, 0); // occupe par l'horloge
    const after = useDashboardStore.getState().widgets.find((w) => w.id === pomodoro.id)!;
    expect(after.x).toBe(pomodoro.x);
    expect(after.y).toBe(pomodoro.y);
    expect(visibleOverlaps(useDashboardStore.getState().widgets)).toBe(false);
  });

  it('autorise un déplacement vers une zone libre', () => {
    const pomodoro = useDashboardStore.getState().widgets.find((w) => w.type === 'pomodoro')!;
    useDashboardStore.getState().moveWidget(pomodoro.id, 6, 3);
    const after = useDashboardStore.getState().widgets.find((w) => w.id === pomodoro.id)!;
    expect(after.x).toBe(6);
    expect(after.y).toBe(3);
  });

  it('refuse un agrandissement qui empiète sur un voisin', () => {
    const clock = useDashboardStore.getState().widgets.find((w) => w.type === 'clock')!;
    useDashboardStore.getState().resizeWidget(clock.id, 12, 4);
    const after = useDashboardStore.getState().widgets.find((w) => w.id === clock.id)!;
    expect(after.w).toBe(clock.w);
    expect(visibleOverlaps(useDashboardStore.getState().widgets)).toBe(false);
  });

  it('borne toujours un redimensionnement dans la grille', () => {
    const clock = useDashboardStore.getState().widgets.find((w) => w.type === 'clock')!;
    useDashboardStore.getState().resizeWidget(clock.id, 3, 1);
    const after = useDashboardStore.getState().widgets.find((w) => w.id === clock.id)!;
    expect(after.w).toBeGreaterThanOrEqual(WIDGET_SIZES.clock.minW);
    expect(after.h).toBeGreaterThanOrEqual(WIDGET_SIZES.clock.minH);
  });
});

describe('persistance', () => {
  it('ne persiste jamais le mode édition', () => {
    useDashboardStore.getState().setEditMode(true);
    const partialize = useDashboardStore.persist.getOptions().partialize!;
    const persisted = partialize(useDashboardStore.getState()) as Record<string, unknown>;
    expect(persisted).not.toHaveProperty('editMode');
    expect(persisted).toHaveProperty('widgets');
    expect(persisted).toHaveProperty('savedLayouts');
  });

  it('relit une disposition stockée en la réparant', () => {
    const merge = useDashboardStore.persist.getOptions().merge!;
    const merged = merge(
      {
        widgets: [
          { id: 'x', type: 'clock', x: -5, y: 0, w: 99, h: 99, hidden: false },
          { id: 'y', type: 'fantome', x: 0, y: 0, w: 1, h: 1, hidden: false }
        ]
      },
      useDashboardStore.getState()
    ) as { widgets: WidgetLayout[] };
    expect(merged.widgets).toHaveLength(1);
    expect(merged.widgets[0].type).toBe('clock');
    expect(merged.widgets[0].x + merged.widgets[0].w).toBeLessThanOrEqual(GRID_COLS);
  });
});
