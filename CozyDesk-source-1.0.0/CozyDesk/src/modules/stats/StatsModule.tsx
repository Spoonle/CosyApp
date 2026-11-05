/** Module Statistiques — toutes les valeurs sont calculées sur données réelles. */
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart3, Flame, ListTodo, NotebookPen, Timer } from 'lucide-react';
import { SectionTitle } from '@/components/glass';
import { MiniBars, Sparkline } from '@/components/charts/Charts';
import { db } from '@/services/storage/db';
import type { Habit, Note, PomodoroSession, Task } from '@/types/domain';
import { addDaysKey, dateKey, minutesToHM, todayKey } from '@/services/dates/dateUtils';
import { bestStreak, currentStreak } from '@/services/habits/streaks';

export default function StatsModule(): React.ReactNode {
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [] as Task[]);
  const sessions = useLiveQuery(() => db.pomodoroSessions.toArray(), [], [] as PomodoroSession[]);
  const habits = useLiveQuery(() => db.habits.where('archived').equals(0).toArray(), [], [] as Habit[]);
  const habitLogs = useLiveQuery(() => db.habitLogs.toArray(), [], []);
  const notes = useLiveQuery(() => db.notes.toArray(), [], [] as Note[]);
  const journalCount = useLiveQuery(() => db.journal.count(), [], 0);

  const today = todayKey();
  const days7 = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysKey(today, i - 6)), [today]);
  const days14 = useMemo(() => Array.from({ length: 14 }, (_, i) => addDaysKey(today, i - 13)), [today]);
  const days126 = useMemo(() => Array.from({ length: 126 }, (_, i) => addDaysKey(today, i - 125)), [today]);

  const focusByDay = useMemo(
    () =>
      days7.map((day) =>
        sessions
          .filter((s) => s.phase === 'work' && dateKey(new Date(s.startedAt)) === day)
          .reduce((acc, s) => acc + s.durationMin, 0)
      ),
    [sessions, days7]
  );

  const tasksDoneByDay = useMemo(
    () =>
      days14.map(
        (day) =>
          tasks.filter((t) => t.status === 'done' && t.completedAt && dateKey(new Date(t.completedAt)) === day)
            .length
      ),
    [tasks, days14]
  );

  const heatmapData = useMemo(
    () =>
      days126.map((day) => {
        const min = sessions
          .filter((s) => s.phase === 'work' && dateKey(new Date(s.startedAt)) === day)
          .reduce((acc, s) => acc + s.durationMin, 0);
        return { day, min };
      }),
    [sessions, days126]
  );

  const todayFocus = focusByDay[6] ?? 0;
  const todaySessions = sessions.filter(
    (s) => s.phase === 'work' && dateKey(new Date(s.startedAt)) === today
  ).length;
  const todayTasksDone = tasks.filter(
    (t) => t.status === 'done' && t.completedAt && dateKey(new Date(t.completedAt)) === today
  ).length;
  const weekTasksDone = tasks.filter(
    (t) => t.status === 'done' && t.completedAt && days7.includes(dateKey(new Date(t.completedAt)))
  ).length;
  const weekFocus = focusByDay.reduce((a, b) => a + b, 0);

  const habitStreaks = useMemo(
    () =>
      habits.map((h) => {
        const done = habitLogs.filter((l) => l.habitId === h.id).map((l) => l.date);
        return {
          habit: h,
          current: currentStreak(h, new Set(done)),
          best: bestStreak(done)
        };
      }),
    [habits, habitLogs]
  );

  return (
    <div className="module-root">
      <div className="module-header">
        <h2>Statistiques</h2>
      </div>
      <div className="module-body">
        <div className="stat-cards">
          <div className="stat-card glass-ultra">
            <div className="stat-label">Focus aujourd’hui</div>
            <div className="stat-value tabular">{minutesToHM(todayFocus)}</div>
            <div className="stat-hint">{minutesToHM(weekFocus)} cette semaine</div>
          </div>
          <div className="stat-card glass-ultra">
            <div className="stat-label">Pomodoros</div>
            <div className="stat-value tabular">{todaySessions}</div>
            <div className="stat-hint">sessions aujourd’hui</div>
          </div>
          <div className="stat-card glass-ultra">
            <div className="stat-label">Tâches terminées</div>
            <div className="stat-value tabular">{todayTasksDone}</div>
            <div className="stat-hint">{weekTasksDone} sur 7 jours</div>
          </div>
          <div className="stat-card glass-ultra">
            <div className="stat-label">Habitudes actives</div>
            <div className="stat-value tabular">{habits.length}</div>
            <div className="stat-hint">{notes.length} notes · {journalCount} entrées</div>
          </div>
        </div>

        <div className="glass-ultra card" style={{ marginBottom: 14 }}>
          <SectionTitle icon={<Timer size={15} />}>Temps de concentration — 7 jours</SectionTitle>
          <MiniBars
            values={focusByDay}
            labels={days7.map((d) => d.slice(5))}
            formatValue={(v) => minutesToHM(v)}
            height={90}
          />
        </div>

        <div className="glass-ultra card" style={{ marginBottom: 14 }}>
          <SectionTitle icon={<ListTodo size={15} />}>Tâches terminées — 14 jours</SectionTitle>
          <Sparkline values={tasksDoneByDay} width={520} height={70} />
          <div className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
            Total : {tasksDoneByDay.reduce((a, b) => a + b, 0)} tâches sur la période
          </div>
        </div>

        <div className="glass-ultra card" style={{ marginBottom: 14 }}>
          <SectionTitle icon={<BarChart3 size={15} />}>Heatmap du focus — 18 semaines</SectionTitle>
          <Heatmap data={heatmapData} />
          <div className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            Moins
            {[0, 25, 50, 100, 200].map((m) => (
              <span
                key={m}
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 3,
                  background: heatColor(m)
                }}
              />
            ))}
            Plus
          </div>
        </div>

        <div className="glass-ultra card">
          <SectionTitle icon={<Flame size={15} />}>Séries d’habitudes</SectionTitle>
          {habitStreaks.length === 0 && (
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
              Aucune habitude suivie. Créez-en une dans le module Habitudes.
            </p>
          )}
          {habitStreaks.map(({ habit, current, best }) => (
            <div key={habit.id} className="list-row" style={{ padding: '6px 4px' }}>
              <span style={{ width: 9, height: 9, borderRadius: 99, background: habit.color }} />
              <span style={{ fontWeight: 550 }}>{habit.name}</span>
              <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 'var(--text-sm)' }}>
                Série actuelle <b className="text-accent tabular">{current}</b> · record{' '}
                <b className="tabular">{best}</b>
              </span>
            </div>
          ))}
        </div>

        <div className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 12, display: 'flex', gap: 6 }}>
          <NotebookPen size={12} />
          Toutes les statistiques sont calculées à partir de vos données locales (sessions
          Pomodoro, tâches, habitudes, notes, journal).
        </div>
      </div>
    </div>
  );
}

/* ---------- Heatmap SVG ---------- */

function Heatmap({ data }: { data: { day: string; min: number }[] }): React.ReactNode {
  const weeks = 18;
  const cell = 13;
  const gap = 3;
  const height = 7 * (cell + gap);
  const width = weeks * (cell + gap);
  // data est ordonnée du plus ancien au plus récent ; dernière case = aujourd’hui.
  const byIndex = new Map(data.map((d, i) => [i, d]));
  const today = todayKey();

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: width }} role="img" aria-label="Heatmap du temps de concentration">
      {Array.from({ length: weeks }, (_, w) =>
        Array.from({ length: 7 }, (_, dow) => {
          const idx = data.length - weeks * 7 + w * 7 + dow;
          const entry = byIndex.get(idx);
          if (!entry) return null;
          const isFuture = entry.day > today;
          return (
            <rect
              key={`${w}-${dow}`}
              x={w * (cell + gap)}
              y={dow * (cell + gap)}
              width={cell}
              height={cell}
              rx={3.5}
              fill={isFuture ? 'rgb(var(--glass-deep-rgb) / 0.4)' : heatColor(entry.min)}
            >
              <title>{`${entry.day} — ${minutesToHM(entry.min)} de focus`}</title>
            </rect>
          );
        })
      )}
    </svg>
  );
}

function heatColor(min: number): string {
  if (min <= 0) return 'rgb(var(--glass-deep-rgb) / 0.75)';
  if (min < 25) return 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.28)';
  if (min < 50) return 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.45)';
  if (min < 100) return 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.65)';
  return 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.9)';
}
