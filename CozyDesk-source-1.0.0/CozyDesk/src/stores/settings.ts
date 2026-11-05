/** Réglages globaux — persistés dans localStorage (migration douce v1 → v2). */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeId =
  | 'midnight-glass'
  | 'catppuccin-glass'
  | 'aurora'
  | 'forest-mist'
  | 'lavender'
  | 'ocean'
  | 'warm-cream'
  | 'amoled';

export type ColorMode = 'auto' | 'light' | 'dark';
export type GraphicsProfile = 'high' | 'balanced' | 'performance';

/* ---------- Espace de travail (2.0) ---------- */

export type ClockSize = 'md' | 'lg' | 'xl';
export type ClockStyle = 'stacked' | 'inline' | 'minimal';
export type WidgetAppearance = 'transparent' | 'subtle' | 'glass';
export type DockPosition = 'bottom' | 'left' | 'right';
export type DashboardDensity = 'tight' | 'comfortable' | 'airy';
export type MotionIntensity = 'full' | 'reduced' | 'none';

export interface ClockSettings {
  size: ClockSize;
  style: ClockStyle;
  /** Affiche les secondes. */
  seconds: boolean;
  /** Affiche la date complète. */
  date: boolean;
  /** Affiche un salut discret. */
  greeting: boolean;
  /** Prénom utilisé par le salut (facultatif). */
  name: string;
}

export interface WorkspaceSettings {
  clock: ClockSettings;
  widgets: {
    /** Apparence appliquée aux widgets qui n'ont pas d'override. */
    appearance: WidgetAppearance;
    /** Multiplicateur d'espacement de la grille (0.4 – 2). */
    spacing: number;
  };
  dashboard: {
    density: DashboardDensity;
  };
  dock: {
    visible: boolean;
    position: DockPosition;
    autoHide: boolean;
    /** Identifiants de modules affichés dans le dock (l'ordre compte). */
    shortcuts: string[];
  };
  motion: MotionIntensity;
}

export const DEFAULT_WORKSPACE: WorkspaceSettings = {
  clock: { size: 'lg', style: 'stacked', seconds: false, date: true, greeting: true, name: '' },
  widgets: { appearance: 'transparent', spacing: 1 },
  dashboard: { density: 'comfortable' },
  dock: {
    visible: true,
    position: 'bottom',
    autoHide: false,
    shortcuts: ['pomodoro', 'tasks', 'notes', 'calendar', 'music', 'stats']
  },
  motion: 'full'
};

/** Marge horizontale du dashboard selon la densité choisie. */
export const DENSITY_MARGIN: Record<DashboardDensity, number> = {
  tight: 16,
  comfortable: 34,
  airy: 68
};

export interface WallpaperSettings {
  kind: 'gradient' | 'image' | 'video';
  presetId: string;
  path?: string;
  url?: string;
  /** Voile sombre 0 – 0.6 pour la lisibilité. */
  dim: number;
  videoEnabled: boolean;
}

export interface PomodoroSettings {
  workMin: number;
  shortMin: number;
  longMin: number;
  cyclesBeforeLong: number;
  autoStartBreaks: boolean;
  sound: boolean;
  notifications: boolean;
}

export interface SettingsState {
  theme: ThemeId;
  mode: ColorMode;
  accent: { h: number; s: number; l: number } | null;
  blurIntensity: number; // 0.2 – 1.6
  transparency: number; // 0.6 – 1.4
  reducedMotion: boolean;
  graphicsProfile: GraphicsProfile;
  language: 'fr';
  wallpaper: WallpaperSettings;
  pomodoro: PomodoroSettings;
  ambientResume: boolean;
  weather: { city: string; lat: number; lon: number } | null;
  workspace: WorkspaceSettings;
  setSettings: (patch: Partial<SettingsState>) => void;
  setWorkspace: (patch: Partial<WorkspaceSettings> & { clock?: Partial<ClockSettings> }) => void;
  setWallpaper: (patch: Partial<WallpaperSettings>) => void;
  setPomodoro: (patch: Partial<PomodoroSettings>) => void;
  resetAppearance: () => void;
  resetWorkspace: () => void;
}

const DEFAULT_APPEARANCE = {
  theme: 'midnight-glass' as ThemeId,
  mode: 'auto' as ColorMode,
  accent: null,
  blurIntensity: 1,
  transparency: 1,
  reducedMotion: false,
  graphicsProfile: 'high' as GraphicsProfile
};

/**
 * Migration pure et testable des réglages.
 * v1 → v2 : conserve l'intégralité des réglages existants et ajoute
 * l'espace de travail avec ses valeurs par défaut.
 */
export function migrateSettings(
  persisted: unknown,
  version: number
): Partial<SettingsState> {
  const state = (persisted ?? {}) as Partial<SettingsState>;
  if (version < 2) {
    return {
      ...state,
      workspace: {
        ...DEFAULT_WORKSPACE,
        // On respecte la préférence « animations réduites » déjà choisie.
        motion: state.reducedMotion ? 'reduced' : DEFAULT_WORKSPACE.motion
      }
    };
  }
  return state;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_APPEARANCE,
      language: 'fr',
      wallpaper: {
        kind: 'gradient',
        presetId: 'aurora-nuit',
        dim: 0,
        videoEnabled: true
      },
      pomodoro: {
        workMin: 25,
        shortMin: 5,
        longMin: 15,
        cyclesBeforeLong: 4,
        autoStartBreaks: true,
        sound: true,
        notifications: true
      },
      ambientResume: false,
      weather: null,
      workspace: DEFAULT_WORKSPACE,
      setSettings: (patch) => set(patch),
      setWorkspace: (patch) =>
        set((s) => ({
          workspace: {
            ...s.workspace,
            ...patch,
            clock: { ...s.workspace.clock, ...(patch.clock ?? {}) },
            widgets: { ...s.workspace.widgets, ...(patch.widgets ?? {}) },
            dashboard: { ...s.workspace.dashboard, ...(patch.dashboard ?? {}) },
            dock: { ...s.workspace.dock, ...(patch.dock ?? {}) }
          }
        })),
      setWallpaper: (patch) => set((s) => ({ wallpaper: { ...s.wallpaper, ...patch } })),
      setPomodoro: (patch) => set((s) => ({ pomodoro: { ...s.pomodoro, ...patch } })),
      resetAppearance: () => set(DEFAULT_APPEARANCE),
      resetWorkspace: () => set({ workspace: DEFAULT_WORKSPACE })
    }),
    {
      name: 'cozydesk.settings.v1',
      version: 2,
      /**
       * Migration non destructive v1 → v2 :
       * les réglages existants (thème, mode, accent, wallpaper, pomodoro…) sont
       * conservés tels quels ; seules les nouvelles clés de l'espace de travail
       * sont ajoutées avec leurs valeurs par défaut.
       */
      migrate: migrateSettings
    }
  )
);

/* ---------- Métadonnées des thèmes (pour l'interface Paramètres) ---------- */

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  swatch: [string, string, string];
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'midnight-glass',
    label: 'Midnight Glass',
    swatch: ['#1c2145', '#5b6cff', '#2a1f4d']
  },
  {
    id: 'catppuccin-glass',
    label: 'Catppuccin Glass',
    swatch: ['#2a2942', '#cba6f7', '#31304d']
  },
  { id: 'aurora', label: 'Aurora', swatch: ['#0c2b33', '#2dd4bf', '#14424a'] },
  { id: 'forest-mist', label: 'Forest Mist', swatch: ['#16352a', '#34d399', '#1d4636'] },
  { id: 'lavender', label: 'Lavender', swatch: ['#342159', '#c4a5ff', '#482a6e'] },
  { id: 'ocean', label: 'Ocean', swatch: ['#10315a', '#5eb8ff', '#154a71'] },
  { id: 'warm-cream', label: 'Warm Cream', swatch: ['#efe2c9', '#b4834d', '#f7f1e6'] },
  { id: 'amoled', label: 'AMOLED', swatch: ['#000000', '#7c6fff', '#101018'] }
];

/* ---------- Application au DOM ---------- */

export function resolvedMode(mode: ColorMode): 'light' | 'dark' {
  if (mode !== 'auto') return mode;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** Intensité d'animation effective (le réglage historique prime). */
export function resolvedMotion(s: SettingsState): MotionIntensity {
  return s.reducedMotion ? 'none' : s.workspace.motion;
}

export function applySettingsToDom(): void {
  const s = useSettingsStore.getState();
  const root = document.documentElement;
  const ws = s.workspace;
  const motion = resolvedMotion(s);

  root.dataset.theme = s.theme;
  root.dataset.mode = resolvedMode(s.mode);
  root.dataset.profile = s.graphicsProfile;
  root.dataset.reducedMotion = String(motion === 'none');
  root.dataset.motion = motion;

  /* --- Espace de travail --- */
  root.dataset.dockPosition = ws.dock.position;
  root.dataset.dockHidden = String(!ws.dock.visible);
  root.dataset.dockAutoHide = String(ws.dock.autoHide);
  root.dataset.density = ws.dashboard.density;
  root.dataset.widgetAppearance = ws.widgets.appearance;

  root.style.setProperty('--user-blur-mult', String(s.blurIntensity));
  root.style.setProperty('--user-alpha-mult', String(s.transparency));
  root.style.setProperty('--ws-gap', `${Math.round(14 * ws.widgets.spacing)}px`);
  root.style.setProperty('--ws-margin', `${DENSITY_MARGIN[ws.dashboard.density]}px`);

  // Géométrie réservée au dock (doit rester synchrone avec stores/windows.ts).
  const reserve = !ws.dock.visible
    ? 18
    : ws.dock.position !== 'bottom'
      ? 18
      : ws.dock.autoHide
        ? 36
        : 88;
  const side = !ws.dock.visible || ws.dock.position === 'bottom'
    ? 0
    : ws.dock.autoHide
      ? 24
      : 76;
  root.style.setProperty('--dock-reserve', `${reserve}px`);
  root.style.setProperty('--dock-side', `${side}px`);

  if (s.accent) {
    root.style.setProperty('--accent-h', String(s.accent.h));
    root.style.setProperty('--accent-s', `${s.accent.s}%`);
    root.style.setProperty('--accent-l', `${s.accent.l}%`);
  } else {
    root.style.removeProperty('--accent-h');
    root.style.removeProperty('--accent-s');
    root.style.removeProperty('--accent-l');
  }
}
