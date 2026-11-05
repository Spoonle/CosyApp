/** Types du domaine CozyDesk — partagés par tous les modules. */

export type ID = string;

export interface BaseRec {
  id: ID;
  createdAt: number;
  updatedAt: number;
}

/* ---------- Tâches ---------- */

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'active' | 'done' | 'archived';

export interface Subtask {
  id: ID;
  title: string;
  done: boolean;
}

export interface Task extends BaseRec {
  title: string;
  notes: string;
  status: TaskStatus;
  completedAt?: number;
  dueDate?: string; // 'YYYY-MM-DD'
  priority: Priority;
  categoryId?: ID;
  tags: string[];
  subtasks: Subtask[];
  order: number;
}

export interface Category extends BaseRec {
  name: string;
  color: string;
}

/* ---------- Notes ---------- */

export interface NoteRevision {
  id: ID;
  savedAt: number;
  title: string;
  content: string;
}

export interface Note extends BaseRec {
  title: string;
  content: string;
  tags: string[];
  favorite: boolean;
  pinned: boolean;
  /** 20 dernières révisions (la plus récente en premier). */
  revisions: NoteRevision[];
}

/* ---------- Journal ---------- */

export type Mood = 'great' | 'good' | 'neutral' | 'low' | 'bad';

export interface JournalEntry extends BaseRec {
  date: string; // 'YYYY-MM-DD'
  content: string;
  mood?: Mood;
}

/* ---------- Pomodoro ---------- */

export type PomoPhase = 'work' | 'short' | 'long';

export interface PomodoroSession extends BaseRec {
  startedAt: number;
  endedAt: number;
  durationMin: number;
  phase: PomoPhase;
  taskId?: ID;
  completed: boolean;
}

/* ---------- Habitudes ---------- */

export type HabitFrequency =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] } // 0 = dimanche … 6 = samedi
  | { kind: 'timesPerWeek'; times: number };

export interface Habit extends BaseRec {
  name: string;
  icon: string; // nom d'icône lucide
  color: string; // hsl
  frequency: HabitFrequency;
  /** 0 = active, 1 = archivée (IndexedDB n'indexe pas les booléens). */
  archived: 0 | 1;
}

export interface HabitLog extends BaseRec {
  // id = `${habitId}:${date}` — un pointage par jour et par habitude
  habitId: ID;
  date: string;
}

/* ---------- Calendrier ---------- */

export interface EventItem extends BaseRec {
  title: string;
  date: string; // 'YYYY-MM-DD'
  allDay: boolean;
  /** Minutes écoulées depuis minuit. */
  startMinute?: number;
  endMinute?: number;
  color: string;
  notes?: string;
  /** Minutes avant le début ; absent = pas de rappel. */
  reminderMinutes?: number;
  taskId?: ID;
}

/* ---------- Étude ---------- */

export interface Subject extends BaseRec {
  name: string;
  color: string;
  order: number;
}

export interface Chapter extends BaseRec {
  subjectId: ID;
  name: string;
  done: boolean;
  order: number;
}

/** Carte flash avec planification SM-2 (répétition espacée). */
export interface Flashcard extends BaseRec {
  subjectId: ID;
  front: string;
  back: string;
  ease: number; // facteur de facilité ≥ 1.3
  intervalDays: number;
  due: string; // 'YYYY-MM-DD'
  reps: number;
  lapses: number;
}

export interface StudySession extends BaseRec {
  subjectId: ID;
  startedAt: number;
  endedAt: number;
  minutes: number;
}

/* ---------- Musique ---------- */

export interface Track extends BaseRec {
  path: string; // chemin absolu local
  title: string;
  artist?: string;
  album?: string;
  durationSec?: number;
  ext: string;
  size: number;
  /** Pochette d'album si présente dans les métadonnées. */
  picture?: Blob;
}

export interface Playlist extends BaseRec {
  name: string;
  trackIds: ID[];
}

/* ---------- Sauvegardes internes ---------- */

export interface MetaRec {
  key: string;
  value: unknown;
}

export interface BackupRec {
  key: string;
  createdAt: number;
  label: string;
  data: string; // instantané JSON
}
