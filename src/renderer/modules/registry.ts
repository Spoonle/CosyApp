/** Registre des modules — chargés paresseusement (React.lazy). */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import {
  AudioWaveform,
  BarChart3,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Image,
  ListTodo,
  Music,
  NotebookPen,
  Repeat,
  Settings,
  Timer,
  type LucideIcon
} from 'lucide-react';
import { t } from '@/i18n';

export interface ModuleDef {
  id: string;
  title: string;
  icon: LucideIcon;
  component: LazyExoticComponent<ComponentType>;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  /** Affiché dans le dock. */
  dock: boolean;
}

export const MODULES: ModuleDef[] = [
  {
    id: 'pomodoro',
    title: t('module.pomodoro'),
    icon: Timer,
    component: lazy(() => import('./pomodoro/PomodoroModule')),
    defaultSize: { w: 540, h: 640 },
    minSize: { w: 460, h: 480 },
    dock: true
  },
  {
    id: 'tasks',
    title: t('module.tasks'),
    icon: ListTodo,
    component: lazy(() => import('./tasks/TasksModule')),
    defaultSize: { w: 860, h: 620 },
    minSize: { w: 620, h: 420 },
    dock: true
  },
  {
    id: 'notes',
    title: t('module.notes'),
    icon: NotebookPen,
    component: lazy(() => import('./notes/NotesModule')),
    defaultSize: { w: 900, h: 620 },
    minSize: { w: 640, h: 400 },
    dock: true
  },
  {
    id: 'music',
    title: t('module.music'),
    icon: Music,
    component: lazy(() => import('./music/MusicModule')),
    defaultSize: { w: 880, h: 620 },
    minSize: { w: 660, h: 460 },
    dock: true
  },
  {
    id: 'ambient',
    title: t('module.ambient'),
    icon: AudioWaveform,
    component: lazy(() => import('./ambient/AmbientModule')),
    defaultSize: { w: 720, h: 560 },
    minSize: { w: 560, h: 440 },
    dock: true
  },
  {
    id: 'wallpapers',
    title: t('module.wallpapers'),
    icon: Image,
    component: lazy(() => import('./wallpapers/WallpapersModule')),
    defaultSize: { w: 860, h: 600 },
    minSize: { w: 640, h: 440 },
    dock: true
  },
  {
    id: 'calendar',
    title: t('module.calendar'),
    icon: CalendarDays,
    component: lazy(() => import('./calendar/CalendarModule')),
    defaultSize: { w: 940, h: 680 },
    minSize: { w: 680, h: 480 },
    dock: true
  },
  {
    id: 'stats',
    title: t('module.stats'),
    icon: BarChart3,
    component: lazy(() => import('./stats/StatsModule')),
    defaultSize: { w: 900, h: 640 },
    minSize: { w: 680, h: 500 },
    dock: true
  },
  {
    id: 'habits',
    title: t('module.habits'),
    icon: Repeat,
    component: lazy(() => import('./habits/HabitsModule')),
    defaultSize: { w: 800, h: 600 },
    minSize: { w: 600, h: 440 },
    dock: true
  },
  {
    id: 'study',
    title: t('module.study'),
    icon: GraduationCap,
    component: lazy(() => import('./study/StudyModule')),
    defaultSize: { w: 900, h: 640 },
    minSize: { w: 680, h: 480 },
    dock: true
  },
  {
    id: 'journal',
    title: t('module.journal'),
    icon: BookOpen,
    component: lazy(() => import('./journal/JournalModule')),
    defaultSize: { w: 860, h: 620 },
    minSize: { w: 620, h: 440 },
    dock: true
  },
  {
    id: 'settings',
    title: t('module.settings'),
    icon: Settings,
    component: lazy(() => import('./settings/SettingsModule')),
    defaultSize: { w: 900, h: 700 },
    minSize: { w: 700, h: 520 },
    dock: true
  }
];

export const MODULE_MAP: Record<string, ModuleDef> = Object.fromEntries(
  MODULES.map((m) => [m.id, m])
);

