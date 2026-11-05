/** Réglages globaux — persistés dans localStorage. */
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
  setSettings: (patch: Partial<SettingsState>) => void;
  setWallpaper: (patch: Partial<WallpaperSettings>) => void;
  setPomodoro: (patch: Partial<PomodoroSettings>) => void;
  resetAppearance: () => void;
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
      setSettings: (patch) => set(patch),
      setWallpaper: (patch) =>
        set((s) => ({ wallpaper: { ...s.wallpaper, ...patch } })),
      setPomodoro: (patch) => set((s) => ({ pomodoro: { ...s.pomodoro, ...patch } })),
      resetAppearance: () => set(DEFAULT_APPEARANCE)
    }),
    {
      name: 'cozydesk.settings.v1',
      version: 1
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

export function applySettingsToDom(): void {
  const s = useSettingsStore.getState();
  const root = document.documentElement;
  root.dataset.theme = s.theme;
  root.dataset.mode = resolvedMode(s.mode);
  root.dataset.profile = s.graphicsProfile;
  root.dataset.reducedMotion = String(s.reducedMotion);
  root.style.setProperty('--user-blur-mult', String(s.blurIntensity));
  root.style.setProperty('--user-alpha-mult', String(s.transparency));
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
