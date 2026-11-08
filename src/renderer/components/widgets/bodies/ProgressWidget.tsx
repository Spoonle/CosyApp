/** Widget « Progress ». */
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/storage/db';
import type { PomodoroSession, Task } from '@/types/domain';
import { todayKey, dateKey } from '@/services/dates/dateUtils';
import { RingProgress } from '@/components/charts/Charts';
import { Row } from '../widgetShared';

export function ProgressWidget(): ReactNode {
  const today = todayKey();
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [] as Task[]);
  const sessions = useLiveQuery(
    () => db.pomodoroSessions.where('startedAt').above(Date.now() - 2 * 86400000).toArray(),
    [],
    [] as PomodoroSession[]
  );
  const habits = useLiveQuery(() => db.habits.where('archived').equals(0).toArray(), [], []);
  const habitLogs = useLiveQuery(() => db.habitLogs.where('date').equals(today).toArray(), [today], []);

  const taskStats = useMemo(() => {
    const created = tasks.filter(
      (t) => dateKey(new Date(t.createdAt)) === today || t.status !== 'done'
    );
    const doneToday = tasks.filter(
      (t) => t.status === 'done' && t.completedAt && dateKey(new Date(t.completedAt)) === today
    );
    return { total: Math.max(created.length, doneToday.length), done: doneToday.length };
  }, [tasks, today]);

  const sessionsToday = useMemo(
    () => sessions.filter((s) => dateKey(new Date(s.startedAt)) === today && s.phase === 'work'),
    [sessions, today]
  );
  const goal = 8;

  const habitsDone = useMemo(() => {
    if (habits.length === 0) return { total: 0, done: 0 };
    return { total: habits.length, done: habitLogs.length };
  }, [habits, habitLogs]);

  const score =
    ((taskStats.total > 0 ? taskStats.done / taskStats.total : 0) +
      Math.min(1, sessionsToday.length / goal) +
      (habitsDone.total > 0 ? habitsDone.done / habitsDone.total : 0)) /
    3;

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
      <RingProgress progress={score} size={84} thickness={7}>
        <span className="tabular" style={{ fontWeight: 650, fontSize: 'var(--text-lg)' }}>
          {Math.round(score * 100)}%
        </span>
      </RingProgress>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, fontSize: 'var(--text-sm)' }}>
        <Row label="Tâches" value={`${taskStats.done}/${Math.max(taskStats.total, taskStats.done)}`} />
        <Row label="Pomodoros" value={`${sessionsToday.length}/${goal}`} />
        <Row
          label="Habitudes"
          value={habitsDone.total > 0 ? `${habitsDone.done}/${habitsDone.total}` : '—'}
        />
      </div>
    </div>
  );
}
