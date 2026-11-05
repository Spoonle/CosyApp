/** Contenu des widgets du dashboard — réparti par widget dans ./bodies, données réelles. */
import type { ReactNode } from 'react';
import type { WidgetType } from '@/stores/dashboard';
import { ClockWidget } from './bodies/ClockWidget';
import { DateWidget } from './bodies/DateWidget';
import { PomodoroWidget } from './bodies/PomodoroWidget';
import { TasksWidget } from './bodies/TasksWidget';
import { ProgressWidget } from './bodies/ProgressWidget';
import { CalendarWidget } from './bodies/CalendarWidget';
import { MusicWidget } from './bodies/MusicWidget';
import { QuoteWidget } from './bodies/QuoteWidget';
import { HabitsWidget } from './bodies/HabitsWidget';
import { QuickNoteWidget } from './bodies/QuickNoteWidget';
import { StatsWidget } from './bodies/StatsWidget';
import { WeatherWidget } from './bodies/WeatherWidget';

export function WidgetContent({ type }: { type: WidgetType }): ReactNode {
  switch (type) {
    case 'clock':
      return <ClockWidget />;
    case 'date':
      return <DateWidget />;
    case 'pomodoro':
      return <PomodoroWidget />;
    case 'tasks':
      return <TasksWidget />;
    case 'progress':
      return <ProgressWidget />;
    case 'calendar':
      return <CalendarWidget />;
    case 'music':
      return <MusicWidget />;
    case 'quote':
      return <QuoteWidget />;
    case 'habits':
      return <HabitsWidget />;
    case 'quicknote':
      return <QuickNoteWidget />;
    case 'stats':
      return <StatsWidget />;
    case 'weather':
      return <WeatherWidget />;
    default:
      return null;
  }
}

/* ---------- Horloge ---------- */
