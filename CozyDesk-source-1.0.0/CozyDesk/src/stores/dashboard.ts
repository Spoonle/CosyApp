/** Disposition du dashboard : widgets déplaçables, redimensionnables, masquables. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WidgetType =
  | 'clock'
  | 'date'
  | 'pomodoro'
  | 'tasks'
  | 'progress'
  | 'calendar'
  | 'music'
  | 'quote'
  | 'habits'
  | 'quicknote'
  | 'stats'
  | 'weather';

export interface WidgetLayout {
  id: string;
  type: WidgetType;
  x: number; // colonne 0-11
  y: number; // ligne
  w: number; // étendue en colonnes
  h: number; // étendue en lignes
  hidden: boolean;
}

export const GRID_COLS = 12;
export const ROW_H = 92;
export const GRID_GAP = 14;

interface DashboardState {
  widgets: WidgetLayout[];
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
  moveWidget: (id: string, x: number, y: number) => void;
  resizeWidget: (id: string, w: number, h: number) => void;
  toggleHidden: (id: string) => void;
  resetDefault: () => void;
}

function id(type: WidgetType): string {
  return `w-${type}`;
}

const DEFAULT_LAYOUT: WidgetLayout[] = [
  { id: id('clock'), type: 'clock', x: 0, y: 0, w: 4, h: 2, hidden: false },
  { id: id('pomodoro'), type: 'pomodoro', x: 4, y: 0, w: 4, h: 2, hidden: false },
  { id: id('tasks'), type: 'tasks', x: 8, y: 0, w: 4, h: 2, hidden: false },
  { id: id('quote'), type: 'quote', x: 0, y: 2, w: 4, h: 1, hidden: false },
  { id: id('habits'), type: 'habits', x: 4, y: 2, w: 4, h: 1, hidden: false },
  { id: id('progress'), type: 'progress', x: 8, y: 2, w: 4, h: 1, hidden: false },
  { id: id('calendar'), type: 'calendar', x: 0, y: 3, w: 4, h: 2, hidden: false },
  { id: id('music'), type: 'music', x: 4, y: 3, w: 4, h: 2, hidden: false },
  { id: id('stats'), type: 'stats', x: 8, y: 3, w: 4, h: 2, hidden: false }
];

function firstFreeSpot(widgets: WidgetLayout[], w: number, h: number): { x: number; y: number } {
  const maxY = widgets.reduce((m, wd) => Math.max(m, wd.y + wd.h), 0);
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x + w <= GRID_COLS; x++) {
      const clash = widgets.some(
        (wd) =>
          !wd.hidden &&
          x < wd.x + wd.w &&
          x + w > wd.x &&
          y < wd.y + wd.h &&
          y + h > wd.y
      );
      if (!clash) return { x, y };
    }
  }
  return { x: 0, y: maxY };
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      widgets: DEFAULT_LAYOUT,
      editMode: false,
      setEditMode: (on) => set({ editMode: on }),
      addWidget: (type) =>
        set((s) => {
          const size = WIDGET_SIZES[type];
          const spot = firstFreeSpot(
            s.widgets.filter((wd) => !wd.hidden),
            size.w,
            size.h
          );
          const widget: WidgetLayout = {
            id: `w-${type}-${Date.now().toString(36)}`,
            type,
            x: spot.x,
            y: spot.y,
            w: size.w,
            h: size.h,
            hidden: false
          };
          return { widgets: [...s.widgets, widget] };
        }),
      removeWidget: (widgetId) =>
        set((s) => ({ widgets: s.widgets.filter((wd) => wd.id !== widgetId) })),
      moveWidget: (widgetId, x, y) =>
        set((s) => ({
          widgets: s.widgets.map((wd) =>
            wd.id === widgetId
              ? { ...wd, x: Math.max(0, Math.min(GRID_COLS - wd.w, x)), y: Math.max(0, y) }
              : wd
          )
        })),
      resizeWidget: (widgetId, w, h) =>
        set((s) => ({
          widgets: s.widgets.map((wd) =>
            wd.id === widgetId
              ? {
                  ...wd,
                  w: Math.max(WIDGET_SIZES[wd.type].minW, Math.min(GRID_COLS - wd.x, w)),
                  h: Math.max(WIDGET_SIZES[wd.type].minH, h)
                }
              : wd
          )
        })),
      toggleHidden: (widgetId) =>
        set((s) => ({
          widgets: s.widgets.map((wd) =>
            wd.id === widgetId ? { ...wd, hidden: !wd.hidden } : wd
          )
        })),
      resetDefault: () => set({ widgets: DEFAULT_LAYOUT, editMode: false })
    }),
    {
      name: 'cozydesk.dashboard.v1',
      version: 1
    }
  )
);

/** Tailles par défaut et minimales par type de widget. */
export const WIDGET_SIZES: Record<
  WidgetType,
  { w: number; h: number; minW: number; minH: number; label: string }
> = {
  clock: { w: 4, h: 2, minW: 2, minH: 1, label: 'Horloge' },
  date: { w: 2, h: 1, minW: 2, minH: 1, label: 'Date & semaine' },
  pomodoro: { w: 4, h: 2, minW: 3, minH: 2, label: 'Pomodoro' },
  tasks: { w: 4, h: 2, minW: 3, minH: 1, label: 'Tâches prioritaires' },
  progress: { w: 4, h: 1, minW: 2, minH: 1, label: 'Progression du jour' },
  calendar: { w: 4, h: 2, minW: 3, minH: 2, label: 'Calendrier' },
  music: { w: 4, h: 2, minW: 3, minH: 1, label: 'Musique' },
  quote: { w: 4, h: 1, minW: 3, minH: 1, label: 'Citation' },
  habits: { w: 4, h: 1, minW: 3, minH: 1, label: 'Habitudes' },
  quicknote: { w: 4, h: 2, minW: 3, minH: 1, label: 'Note rapide' },
  stats: { w: 4, h: 2, minW: 3, minH: 1, label: 'Statistiques' },
  weather: { w: 3, h: 2, minW: 2, minH: 1, label: 'Météo (optionnelle)' }
};
