/** Widget « Habits ». */
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check } from 'lucide-react';
import { db, nowTs } from '@/services/storage/db';
import type { Habit } from '@/types/domain';
import { todayKey } from '@/services/dates/dateUtils';

export function HabitsWidget(): ReactNode {
  const today = todayKey();
  const habits = useLiveQuery(
    () => db.habits.where('archived').equals(0).toArray(),
    [],
    [] as Habit[]
  );
  const logs = useLiveQuery(() => db.habitLogs.where('date').equals(today).toArray(), [today], []);
  const doneIds = useMemo(() => new Set(logs.map((l) => l.habitId)), [logs]);

  const toggle = async (habit: Habit): Promise<void> => {
    const logId = `${habit.id}:${today}`;
    if (doneIds.has(habit.id)) {
      await db.habitLogs.delete(logId);
    } else {
      const ts = nowTs();
      await db.habitLogs.put({ id: logId, createdAt: ts, updatedAt: ts, habitId: habit.id, date: today });
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
      {habits.length === 0 && (
        <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
          Aucune habitude suivie pour l’instant.
        </div>
      )}
      {habits.slice(0, 4).map((h) => {
        const done = doneIds.has(h.id);
        return (
          <button
            key={h.id}
            onClick={() => void toggle(h)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '3px 6px',
              borderRadius: 8,
              textAlign: 'left'
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                borderRadius: 99,
                border: `1.6px solid ${done ? h.color : 'rgb(var(--text-muted-rgb) / 0.6)'}`,
                background: done ? h.color : 'transparent',
                color: '#fff',
                flexShrink: 0
              }}
            >
              {done && <Check size={11} strokeWidth={3.4} />}
            </span>
            <span style={{ fontSize: 'var(--text-sm)', opacity: done ? 0.75 : 1 }}>{h.name}</span>
          </button>
        );
      })}
      {habits.length > 4 && (
        <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
          +{habits.length - 4} autres habitudes
        </div>
      )}
    </div>
  );
}

/* ---------- Note rapide ---------- */
