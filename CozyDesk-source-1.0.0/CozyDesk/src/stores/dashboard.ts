/**
 * Disposition du dashboard : widgets déplaçables, redimensionnables, masquables.
 *
 * v2 (CozyDesk 2.0) :
 * - apparence par widget (transparent / subtil / verre) + mode compact ;
 * - disposition par défaut minimale (horloge, pomodoro, tâches) ;
 * - dispositions prêtes à l'emploi + dispositions sauvegardées par l'utilisateur ;
 * - migration v1 → v2 non destructive : la disposition existante est conservée.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WidgetAppearance } from '@/stores/settings';

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
  /** Apparence propre au widget ; absent = apparence par défaut des réglages. */
  appearance?: WidgetAppearance;
  /** Présentation compacte (moins d'informations secondaires). */
  compact?: boolean;
}

export interface SavedLayout {
  id: string;
  name: string;
  widgets: WidgetLayout[];
  savedAt: number;
}

export type LayoutPresetId = 'minimal' | 'focus' | 'classic';

export const GRID_COLS = 12;
export const ROW_H = 92;
export const GRID_GAP = 14;

interface DashboardState {
  widgets: WidgetLayout[];
  editMode: boolean;
  savedLayouts: SavedLayout[];
  setEditMode: (on: boolean) => void;
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
  moveWidget: (id: string, x: number, y: number) => void;
  resizeWidget: (id: string, w: number, h: number) => void;
  toggleHidden: (id: string) => void;
  setAppearance: (id: string, appearance: WidgetAppearance) => void;
  setAppearanceAll: (appearance: WidgetAppearance) => void;
  toggleCompact: (id: string) => void;
  resetDefault: () => void;
  applyPreset: (preset: LayoutPresetId) => void;
  saveLayout: (name: string) => void;
  applySavedLayout: (id: string) => void;
  deleteSavedLayout: (id: string) => void;
}

function id(type: WidgetType): string {
  return `w-${type}`;
}

/** Disposition historique de CozyDesk 1.0 (conservée comme preset « classique »). */
const CLASSIC_LAYOUT: WidgetLayout[] = [
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

/**
 * Disposition 2.0 : trois éléments, beaucoup d'air.
 * L'horloge occupe la moitié gauche, le pomodoro et les tâches se partagent la droite.
 */
const MINIMAL_LAYOUT: WidgetLayout[] = [
  { id: id('clock'), type: 'clock', x: 0, y: 0, w: 6, h: 2, hidden: false },
  { id: id('pomodoro'), type: 'pomodoro', x: 6, y: 0, w: 3, h: 2, hidden: false },
  { id: id('tasks'), type: 'tasks', x: 9, y: 0, w: 3, h: 2, hidden: false }
];

/** Concentration : l'horloge et le pomodoro seulement. */
const FOCUS_LAYOUT: WidgetLayout[] = [
  { id: id('clock'), type: 'clock', x: 0, y: 0, w: 8, h: 2, hidden: false },
  { id: id('pomodoro'), type: 'pomodoro', x: 8, y: 0, w: 4, h: 2, hidden: false }
];

const PRESETS: Record<LayoutPresetId, WidgetLayout[]> = {
  minimal: MINIMAL_LAYOUT,
  focus: FOCUS_LAYOUT,
  classic: CLASSIC_LAYOUT
};

export const PRESET_META: { id: LayoutPresetId; label: string; hint: string }[] = [
  { id: 'minimal', label: 'Minimal', hint: 'Horloge, pomodoro, tâches' },
  { id: 'focus', label: 'Concentration', hint: 'Horloge et pomodoro' },
  { id: 'classic', label: 'Classique', hint: 'Les neuf widgets de la 1.0' }
];

const DEFAULT_LAYOUT = MINIMAL_LAYOUT;

function cloneWidgets(widgets: WidgetLayout[]): WidgetLayout[] {
  return widgets.map((w) => ({ ...w }));
}

function firstFreeSpot(widgets: WidgetLayout[], w: number, h: number): { x: number; y: number } {
  const maxY = widgets.reduce((m, wd) => Math.max(m, wd.y + wd.h), 0);
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x + w <= GRID_COLS; x++) {
      const clash = widgets.some(
        (wd) =>
          !wd.hidden && x < wd.x + wd.w && x + w > wd.x && y < wd.y + wd.h && y + h > wd.y
      );
      if (!clash) return { x, y };
    }
  }
  return { x: 0, y: maxY };
}

/**
 * Migration pure et testable du dashboard.
 * v1 → v2 : la disposition de l'utilisateur est reprise telle quelle ;
 * les dispositions sauvegardées (nouvelle notion) démarrent vides.
 */
export function migrateDashboard(persisted: unknown, version: number): Partial<DashboardState> {
  const state = (persisted ?? {}) as Partial<DashboardState>;
  if (version < 2) {
    return {
      ...state,
      widgets: (state.widgets ?? cloneWidgets(DEFAULT_LAYOUT)).map((w) => ({ ...w })),
      savedLayouts: []
    };
  }
  return state;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      widgets: cloneWidgets(DEFAULT_LAYOUT),
      editMode: false,
      savedLayouts: [],
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
      setAppearance: (widgetId, appearance) =>
        set((s) => ({
          widgets: s.widgets.map((wd) => (wd.id === widgetId ? { ...wd, appearance } : wd))
        })),
      setAppearanceAll: (appearance) =>
        set((s) => ({ widgets: s.widgets.map((wd) => ({ ...wd, appearance })) })),
      toggleCompact: (widgetId) =>
        set((s) => ({
          widgets: s.widgets.map((wd) => (wd.id === widgetId ? { ...wd, compact: !wd.compact } : wd))
        })),
      resetDefault: () => set({ widgets: cloneWidgets(DEFAULT_LAYOUT), editMode: false }),
      applyPreset: (preset) => set({ widgets: cloneWidgets(PRESETS[preset]), editMode: false }),
      saveLayout: (name) =>
        set((s) => ({
          savedLayouts: [
            ...s.savedLayouts,
            {
              id: `layout-${Date.now().toString(36)}`,
              name: name.trim() || 'Ma disposition',
              widgets: cloneWidgets(s.widgets),
              savedAt: Date.now()
            }
          ].slice(-12)
        })),
      applySavedLayout: (layoutId) => {
        const layout = get().savedLayouts.find((l) => l.id === layoutId);
        if (!layout) return;
        set({ widgets: cloneWidgets(layout.widgets), editMode: false });
      },
      deleteSavedLayout: (layoutId) =>
        set((s) => ({ savedLayouts: s.savedLayouts.filter((l) => l.id !== layoutId) }))
    }),
    {
      name: 'cozydesk.dashboard.v1',
      version: 2,
      /**
       * Migration non destructive v1 → v2 :
       * la disposition de l'utilisateur est reprise intégralement ; les nouvelles
       * clés (apparence par widget, dispositions sauvegardées) restent optionnelles.
       */
      migrate: migrateDashboard
    }
  )
);

/** Tailles par défaut et minimales par type de widget. */
export const WIDGET_SIZES: Record<
  WidgetType,
  { w: number; h: number; minW: number; minH: number; label: string; hint: string }
> = {
  clock: {
    w: 6,
    h: 2,
    minW: 3,
    minH: 1,
    label: 'Horloge',
    hint: 'Le point focal de votre bureau'
  },
  date: { w: 2, h: 1, minW: 2, minH: 1, label: 'Date & semaine', hint: 'Journée et année en cours' },
  pomodoro: { w: 3, h: 2, minW: 2, minH: 2, label: 'Pomodoro', hint: 'Minuteur de concentration' },
  tasks: {
    w: 3,
    h: 2,
    minW: 2,
    minH: 1,
    label: 'Tâches prioritaires',
    hint: 'Les prochaines tâches actives'
  },
  progress: { w: 3, h: 1, minW: 2, minH: 1, label: 'Progression du jour', hint: 'Sessions et tâches' },
  calendar: { w: 4, h: 2, minW: 3, minH: 2, label: 'Calendrier', hint: 'Le mois en un regard' },
  music: { w: 4, h: 2, minW: 3, minH: 1, label: 'Musique', hint: 'Lecture en cours' },
  quote: { w: 4, h: 1, minW: 3, minH: 1, label: 'Citation', hint: 'Une phrase par jour' },
  habits: { w: 4, h: 1, minW: 3, minH: 1, label: 'Habitudes', hint: 'Séries en cours' },
  quicknote: { w: 4, h: 2, minW: 3, minH: 1, label: 'Note rapide', hint: 'Bloc-notes éclair' },
  stats: { w: 4, h: 2, minW: 3, minH: 1, label: 'Statistiques', hint: 'Tendance de la semaine' },
  weather: { w: 3, h: 2, minW: 2, minH: 1, label: 'Météo (optionnelle)', hint: 'Nécessite une ville' }
};
