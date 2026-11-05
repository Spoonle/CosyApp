/**
 * Préservation des données d'une installation antérieure de CozyDesk.
 *
 * Principe : NE JAMAIS supprimer ni modifier les données d'origine.
 * 1. Scan de localStorage (clés évoquant CozyDesk) et d'IndexedDB.
 * 2. Rapport détaillé de ce qui est détecté.
 * 3. Import best-effort des formes reconnues (tâches, notes, habitudes,
 *    sessions Pomodoro) avec de nouveaux identifiants.
 * 4. Sauvegarde préalable systématique.
 */
import { db, uid, nowTs } from './db';
import { writeBackup } from './backup';
import type { Habit, Note, PomodoroSession, Task } from '@/types/domain';

export interface LegacyKeyReport {
  key: string;
  bytes: number;
  preview: string;
  detected: string[];
}

export interface LegacyScanReport {
  localStorageKeys: LegacyKeyReport[];
  indexedDBs: string[];
  potential: { tasks: number; notes: number; habits: number; pomodoro: number };
}

const KEY_PATTERN = /cozy|desk/i;
/** Clés de l’application ACTUELLE (préfixe cozydesk. + suffixe de version) — jamais importées. */
const CURRENT_KEY_PATTERN = /^cozydesk\.[\w-]+\.v\d+$/;

function previewOf(value: string): string {
  return value.length > 140 ? `${value.slice(0, 140)}…` : value;
}

function looksLikeTask(v: unknown): v is { title: unknown; done?: unknown; completed?: unknown } {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.title === 'string' && ('done' in r || 'completed' in r || 'status' in r);
}

function looksLikeNote(v: unknown): v is { title?: unknown; content: unknown } {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (typeof r.content === 'string' || typeof r.body === 'string') && !('done' in r);
}

function looksLikeHabit(v: unknown): v is { name: unknown } {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.name === 'string' && /hab/i.test(String(v)) === false && 'name' in r;
}

function looksLikePomodoro(v: unknown): v is { durationMin?: unknown; minutes?: unknown } {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return 'durationMin' in r || 'minutes' in r || ('startedAt' in r && 'endedAt' in r);
}

/** Extrait des tableaux candidats depuis une valeur localStorage (forme brute ou zustand persist). */
function candidateArrays(value: unknown): unknown[][] {
  const out: unknown[][] = [];
  const visit = (v: unknown, depth: number): void => {
    if (depth > 3) return;
    if (Array.isArray(v)) {
      if (v.length > 0 && typeof v[0] === 'object') out.push(v);
      return;
    }
    if (typeof v === 'object' && v !== null) {
      for (const child of Object.values(v as Record<string, unknown>)) visit(child, depth + 1);
    }
  };
  visit(value, 0);
  return out;
}

export async function scanLegacyData(): Promise<LegacyScanReport> {
  const report: LegacyScanReport = {
    localStorageKeys: [],
    indexedDBs: [],
    potential: { tasks: 0, notes: 0, habits: 0, pomodoro: 0 }
  };

  for (const key of Object.keys(window.localStorage)) {
    if (!KEY_PATTERN.test(key) || CURRENT_KEY_PATTERN.test(key)) continue;
    const raw = window.localStorage.getItem(key) ?? '';
    const entry: LegacyKeyReport = {
      key,
      bytes: raw.length,
      preview: previewOf(raw),
      detected: []
    };
    try {
      const parsed: unknown = JSON.parse(raw);
      for (const arr of candidateArrays(parsed)) {
        if (arr.some(looksLikeTask)) {
          entry.detected.push(`${countMatches(arr, looksLikeTask)} tâches`);
          report.potential.tasks += countMatches(arr, looksLikeTask);
        }
        if (arr.some(looksLikeNote)) {
          entry.detected.push(`${countMatches(arr, looksLikeNote)} notes`);
          report.potential.notes += countMatches(arr, looksLikeNote);
        }
        if (arr.some(looksLikeHabit)) {
          entry.detected.push(`${countMatches(arr, looksLikeHabit)} habitudes`);
          report.potential.habits += countMatches(arr, looksLikeHabit);
        }
        if (arr.some(looksLikePomodoro)) {
          entry.detected.push(`${countMatches(arr, looksLikePomodoro)} sessions`);
          report.potential.pomodoro += countMatches(arr, looksLikePomodoro);
        }
      }
    } catch {
      entry.detected.push('valeur non JSON');
    }
    report.localStorageKeys.push(entry);
  }

  if (typeof indexedDB.databases === 'function') {
    try {
      const dbs = await indexedDB.databases();
      for (const d of dbs) {
        const name = d.name ?? '';
        if (KEY_PATTERN.test(name) && name !== 'CozyDeskDB') {
          report.indexedDBs.push(name);
        }
      }
    } catch (err) {
      console.warn('[cozydesk:legacy] énumération IndexedDB impossible :', err);
    }
  }

  return report;
}

function countMatches(arr: unknown[], pred: (v: unknown) => boolean): number {
  return arr.filter(pred).length;
}

export interface LegacyImportResult {
  tasks: number;
  notes: number;
  habits: number;
  pomodoro: number;
  backupKey: string;
}

/**
 * Import best-effort. Les données d'origine restent intactes :
 * seuls de NOUVEAUX enregistrements sont créés dans CozyDeskDB.
 */
export async function importLegacyData(): Promise<LegacyImportResult> {
  const backup = await writeBackup('pré-migration');
  const result: LegacyImportResult = {
    tasks: 0,
    notes: 0,
    habits: 0,
    pomodoro: 0,
    backupKey: backup.key
  };

  for (const key of Object.keys(window.localStorage)) {
    if (!KEY_PATTERN.test(key) || CURRENT_KEY_PATTERN.test(key)) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(window.localStorage.getItem(key) ?? 'null');
    } catch {
      continue;
    }
    for (const arr of candidateArrays(parsed)) {
      for (const item of arr) {
        const ts = nowTs();
        if (looksLikeTask(item) && typeof item.title === 'string') {
          const done =
            item.done === true ||
            item.completed === true ||
            (item as { status?: unknown }).status === 'done';
          const task: Task = {
            id: uid(),
            createdAt: ts,
            updatedAt: ts,
            title: item.title,
            notes: '',
            status: done ? 'done' : 'active',
            completedAt: done ? ts : undefined,
            priority: 'medium',
            tags: [],
            subtasks: [],
            order: ts
          };
          await db.tasks.put(task);
          result.tasks++;
        } else if (looksLikeNote(item)) {
          const r = item as { title?: unknown; content?: unknown; body?: unknown };
          const note: Note = {
            id: uid(),
            createdAt: ts,
            updatedAt: ts,
            title: typeof r.title === 'string' ? r.title : 'Note importée',
            content: typeof r.content === 'string' ? r.content : String(r.body ?? ''),
            tags: ['importé'],
            favorite: false,
            pinned: false,
            revisions: []
          };
          await db.notes.put(note);
          result.notes++;
        } else if (looksLikeHabit(item) && typeof item.name === 'string') {
          const habit: Habit = {
            id: uid(),
            createdAt: ts,
            updatedAt: ts,
            name: item.name,
            icon: 'check',
            color: 'hsl(160 60% 55%)',
            frequency: { kind: 'daily' },
            archived: 0
          };
          await db.habits.put(habit);
          result.habits++;
        } else if (looksLikePomodoro(item)) {
          const r = item as { startedAt?: number; endedAt?: number; durationMin?: number; minutes?: number };
          const startedAt = typeof r.startedAt === 'number' ? r.startedAt : ts;
          const endedAt =
            typeof r.endedAt === 'number' ? r.endedAt : startedAt + 25 * 60_000;
          const durationMin =
            typeof r.durationMin === 'number'
              ? r.durationMin
              : typeof r.minutes === 'number'
                ? r.minutes
                : 25;
          const session: PomodoroSession = {
            id: uid(),
            createdAt: ts,
            updatedAt: ts,
            startedAt,
            endedAt,
            durationMin,
            phase: 'work',
            completed: true
          };
          await db.pomodoroSessions.put(session);
          result.pomodoro++;
        }
      }
    }
  }

  return result;
}
