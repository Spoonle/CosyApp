/** Métadonnées partagées des widgets : icônes, module associé, apparences. */
import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  Clock,
  CloudSun,
  Eye,
  Layers,
  ListTodo,
  Music,
  NotebookPen,
  Quote,
  Repeat,
  Sparkles,
  Timer,
  TrendingUp,
  type LucideIcon
} from 'lucide-react';
import type { WidgetType } from '@/stores/dashboard';
import type { WidgetAppearance } from '@/stores/settings';

export const WIDGET_ICONS: Record<WidgetType, LucideIcon> = {
  clock: Clock,
  date: CalendarClock,
  pomodoro: Timer,
  tasks: ListTodo,
  progress: TrendingUp,
  calendar: CalendarDays,
  music: Music,
  quote: Quote,
  habits: Repeat,
  quicknote: NotebookPen,
  stats: BarChart3,
  weather: CloudSun
};

/** Module ouvert au double-clic sur un widget. */
export const WIDGET_TO_MODULE: Record<WidgetType, string> = {
  clock: 'settings',
  date: 'settings',
  pomodoro: 'pomodoro',
  tasks: 'tasks',
  progress: 'stats',
  calendar: 'calendar',
  music: 'music',
  quote: 'settings',
  habits: 'habits',
  quicknote: 'notes',
  stats: 'stats',
  weather: 'settings'
};

export const APPEARANCES: {
  value: WidgetAppearance;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  { value: 'transparent', label: 'Transparent', hint: 'Fondu dans le fond', icon: Sparkles },
  { value: 'subtle', label: 'Subtil', hint: 'Voile de verre léger', icon: Layers },
  { value: 'glass', label: 'Verre', hint: 'Panneau de verre complet', icon: Eye }
];

export const APPEARANCE_ORDER: WidgetAppearance[] = ['transparent', 'subtle', 'glass'];
