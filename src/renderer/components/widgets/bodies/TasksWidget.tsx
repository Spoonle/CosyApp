/** Widget « Tasks ». */
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus } from 'lucide-react';
import { db, uid, nowTs } from '@/services/storage/db';
import type { Task } from '@/types/domain';
import { todayKey } from '@/services/dates/dateUtils';

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function TasksWidget(): ReactNode {
  const tasks = useLiveQuery(
    () => db.tasks.where('status').equals('active').toArray(),
    [],
    [] as Task[]
  );
  const [quick, setQuick] = useState('');

  const top = useMemo(() => {
    return [...tasks]
      .sort((a, b) => {
        const pr = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
        if (pr !== 0) return pr;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return a.order - b.order;
      })
      .slice(0, 5);
  }, [tasks]);

  const toggle = async (task: Task): Promise<void> => {
    await db.tasks.put({
      ...task,
      status: 'done',
      completedAt: nowTs(),
      updatedAt: nowTs()
    });
  };

  const addQuick = async (): Promise<void> => {
    const title = quick.trim();
    if (title.length === 0) return;
    const ts = nowTs();
    await db.tasks.put({
      id: uid(),
      createdAt: ts,
      updatedAt: ts,
      title,
      notes: '',
      status: 'active',
      priority: 'medium',
      tags: [],
      subtasks: [],
      order: ts
    });
    setQuick('');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
      {top.length === 0 && (
        <div className="text-muted" style={{ fontSize: 'var(--text-sm)', padding: '8px 0' }}>
          Aucune tâche active. Profitez-en.
        </div>
      )}
      {top.map((task) => (
        <label
          key={task.id}
          style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={false}
            onChange={() => void toggle(task)}
            style={{ accentColor: 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))' }}
          />
          <span
            style={{
              fontSize: 'var(--text-base)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {task.title}
          </span>
          {task.dueDate && (
            <span
              className="chip"
              style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 'var(--text-2xs)' }}
            >
              {task.dueDate === todayKey() ? "aujourd'hui" : task.dueDate.slice(5)}
            </span>
          )}
        </label>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
        <input
          className="input"
          style={{ padding: '5px 10px', fontSize: 'var(--text-sm)' }}
          placeholder="Ajouter une tâche…"
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void addQuick();
          }}
        />
        <button className="btn btn-ghost btn-sm" aria-label="Ajouter" onClick={() => void addQuick()}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

/* ---------- Progression du jour ---------- */
