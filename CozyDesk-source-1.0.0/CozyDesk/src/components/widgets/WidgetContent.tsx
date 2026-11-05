/** Contenu des widgets du dashboard — toutes les données sont réelles. */
import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Plus,
  Quote as QuoteIcon,
  SkipBack,
  SkipForward,
  CloudSun,
  MapPin
} from 'lucide-react';
import { db, uid, nowTs } from '@/services/storage/db';
import type { Habit, PomodoroSession, Task } from '@/types/domain';
import {
  formatClock,
  todayKey,
  dateKey,
  minutesToHM,
  monthGrid,
  MONTHS_FULL,
  WEEKDAYS_SHORT,
  weekNumber,
  addDaysKey
} from '@/services/dates/dateUtils';
import { useNow } from '@/hooks';
import { usePomodoroStore } from '@/stores/pomodoro';
import { useSettingsStore } from '@/stores/settings';
import { useMusicStore } from '@/stores/music';
import { remainingMs } from '@/services/pomodoroEngine';
import { quoteOfDay } from '@/data/quotes';
import { RingProgress, MiniBars } from '@/components/charts/Charts';
import { t } from '@/i18n';
import { HeroClock } from '@/components/widgets/HeroClock';
import type { WidgetType } from '@/stores/dashboard';

export function WidgetContent({ type }: { type: WidgetType }): React.ReactNode {
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

function ClockWidget(): React.ReactNode {
  // L'horloge est un composant à part entière : tailles et styles configurables.
  return <HeroClock />;
}

/* ---------- Date & semaine ---------- */

function DateWidget(): React.ReactNode {
  const d = new Date();
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const yearEnd = new Date(d.getFullYear() + 1, 0, 1);
  const yearProgress = (d.getTime() - yearStart.getTime()) / (yearEnd.getTime() - yearStart.getTime());
  const dayProgress = (d.getHours() * 60 + d.getMinutes()) / 1440;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
      <div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 650 }}>Semaine {weekNumber(d)}</div>
        <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
          {WEEKDAYS_FULL_FR[d.getDay()]}
        </div>
      </div>
      <MiniProgressBar label="Journée" value={dayProgress} />
      <MiniProgressBar label="Année" value={yearProgress} />
    </div>
  );
}

const WEEKDAYS_FULL_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function MiniProgressBar({ label, value }: { label: string; value: number }): React.ReactNode {
  return (
    <div>
      <div
        className="text-muted"
        style={{ fontSize: 'var(--text-2xs)', display: 'flex', justifyContent: 'space-between' }}
      >
        <span>{label}</span>
        <span className="tabular">{Math.round(value * 100)}%</span>
      </div>
      <div className="progress-track" style={{ height: 5 }}>
        <div className="progress-fill" style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

/* ---------- Pomodoro ---------- */

function PomodoroWidget(): React.ReactNode {
  const state = usePomodoroStore((s) => s.state);
  const startPause = usePomodoroStore((s) => s.startPause);
  const resetPhase = usePomodoroStore((s) => s.resetPhase);
  const running = state.running;
  const now = useNow(running ? 500 : 60000);
  const remaining = remainingMs(state, now);
  const settings = useSettingsStore((s) => s.pomodoro);
  const total =
    (state.phase === 'work'
      ? settings.workMin
      : state.phase === 'short'
        ? settings.shortMin
        : settings.longMin) * 60_000;

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
      <RingProgress progress={1 - remaining / total} size={104} thickness={8}>
        <span className="tabular" style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>
          {formatClock(remaining)}
        </span>
      </RingProgress>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <span style={{ fontSize: 'var(--text-md)', fontWeight: 650 }}>{t(`phase.${state.phase}`)}</span>
        <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
          {state.completedWork} cycle{state.completedWork > 1 ? 's' : ''} terminé
          {state.completedWork > 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <button className="btn btn-primary btn-sm" onClick={startPause} style={{ flex: 1 }}>
            {running ? <Pause size={13} /> : <Play size={13} />}
            {running ? 'Pause' : 'Démarrer'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={resetPhase} data-tooltip="Réinitialiser">
            <SkipBack size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Tâches prioritaires ---------- */

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function TasksWidget(): React.ReactNode {
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

function ProgressWidget(): React.ReactNode {
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

function Row({ label, value }: { label: string; value: string }): React.ReactNode {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span className="text-secondary">{label}</span>
      <span className="tabular" style={{ fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

/* ---------- Mini calendrier ---------- */

function CalendarWidget(): React.ReactNode {
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const viewDate = useMemo(
    () => new Date(year, month + monthOffset, 1),
    [year, month, monthOffset]
  );
  const grid = useMemo(() => monthGrid(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);
  const from = dateKey(grid[0][0]);
  const to = dateKey(grid[grid.length - 1][6]);
  const events = useLiveQuery(
    () => db.events.where('date').between(from, to, true, true).toArray(),
    [from, to],
    []
  );
  const todayStr = todayKey();

  const eventDays = useMemo(() => new Set(events.map((e) => e.date)), [events]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 650 }}>
          {MONTHS_FULL[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <span style={{ display: 'flex', gap: 2 }}>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            style={{ width: 24, height: 24 }}
            aria-label="Mois précédent"
            onClick={() => setMonthOffset((m) => m - 1)}
          >
            <ChevronLeft size={13} />
          </button>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            style={{ width: 24, height: 24 }}
            aria-label="Mois suivant"
            onClick={() => setMonthOffset((m) => m + 1)}
          >
            <ChevronRight size={13} />
          </button>
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
          fontSize: 'var(--text-2xs)',
          color: 'rgb(var(--text-muted-rgb))'
        }}
      >
        {WEEKDAYS_SHORT.map((d, i) => (
          <span key={i} style={{ textAlign: 'center', fontWeight: 650 }}>
            {d}
          </span>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, flex: 1 }}>
        {grid.flat().map((d) => {
          const key = dateKey(d);
          const isToday = key === todayStr;
          const dim = d.getMonth() !== viewDate.getMonth();
          return (
            <div
              key={key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                borderRadius: 7,
                fontSize: 'var(--text-xs)',
                opacity: dim ? 0.45 : 1,
                background: isToday
                  ? 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.25)'
                  : undefined,
                fontWeight: isToday ? 700 : 400,
                minHeight: 22
              }}
              className="tabular"
            >
              {d.getDate()}
              {eventDays.has(key) && (
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 99,
                    background: 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))'
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Musique ---------- */

function MusicWidget(): React.ReactNode {
  const currentId = useMusicStore((s) => s.currentId);
  const playing = useMusicStore((s) => s.playing);
  const position = useMusicStore((s) => s.position);
  const duration = useMusicStore((s) => s.duration);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const next = useMusicStore((s) => s.next);
  const prev = useMusicStore((s) => s.prev);
  const seek = useMusicStore((s) => s.seek);
  const init = useMusicStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  const track = useLiveQuery(async () => {
    if (!currentId) return undefined;
    return db.tracks.get(currentId);
  }, [currentId]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
      {track ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'linear-gradient(135deg, hsl(var(--accent-h) 50% 42%), hsl(calc(var(--accent-h) + 50) 55% 34%))',
                flexShrink: 0
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 650,
                  fontSize: 'var(--text-base)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {track.title}
              </div>
              <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                {track.artist ?? 'Artiste inconnu'}
              </div>
            </div>
          </div>
          <div
            role="slider"
            aria-label="Progression"
            aria-valuenow={Math.round(position)}
            aria-valuemax={Math.round(duration)}
            tabIndex={0}
            style={{ height: 6, borderRadius: 99, background: 'rgb(var(--glass-deep-rgb) / 0.8)', cursor: 'pointer' }}
            onClick={(e) => {
              if (duration > 0) {
                const rect = e.currentTarget.getBoundingClientRect();
                seek(((e.clientX - rect.left) / rect.width) * duration);
              }
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 99,
                width: `${duration > 0 ? (position / duration) * 100 : 0}%`,
                background: 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <button className="btn btn-ghost btn-sm btn-icon" aria-label="Précédent" onClick={() => void prev()}>
              <SkipBack size={15} />
            </button>
            <button className="btn btn-primary btn-sm btn-icon" aria-label="Lecture/Pause" onClick={() => void togglePlay()}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button className="btn btn-ghost btn-sm btn-icon" aria-label="Suivant" onClick={() => void next()}>
              <SkipForward size={15} />
            </button>
          </div>
        </>
      ) : (
        <div className="text-muted" style={{ textAlign: 'center', fontSize: 'var(--text-sm)', padding: 12 }}>
          Aucune lecture en cours. Importez votre musique depuis le module Musique.
        </div>
      )}
    </div>
  );
}

/* ---------- Citation ---------- */

function QuoteWidget(): React.ReactNode {
  const [offset, setOffset] = useState(0);
  const quote = quoteOfDay(offset);
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: 0
      }}
    >
      <QuoteIcon size={16} style={{ flexShrink: 0, opacity: 0.5 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="selectable"
          style={{ fontSize: 'var(--text-sm)', fontStyle: 'italic', lineHeight: 1.45 }}
        >
          « {quote.text} »
        </div>
        <div className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
          — {quote.author}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button
          className="btn btn-ghost btn-sm btn-icon quote-nav"
          style={{ width: 24, height: 22 }}
          aria-label="Citation suivante"
          onClick={() => setOffset((o) => o + 1)}
        >
          <ChevronRight size={13} />
        </button>
        <button
          className="btn btn-ghost btn-sm btn-icon quote-nav"
          style={{ width: 24, height: 22 }}
          aria-label="Citation précédente"
          onClick={() => setOffset((o) => o - 1)}
        >
          <ChevronLeft size={13} />
        </button>
      </div>
    </div>
  );
}

/* ---------- Habitudes ---------- */

function HabitsWidget(): React.ReactNode {
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

const QUICK_TAG = 'quick';

function QuickNoteWidget(): React.ReactNode {
  const note = useLiveQuery(
    () => db.notes.filter((n) => n.tags.includes(QUICK_TAG)).first(),
    []
  );
  const [value, setValue] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const current = value ?? note?.content ?? '';

  useEffect(() => {
    // Sauvegarde automatique (débounce via l'effet de nettoyage).
    if (value === null) return;
    const id = window.setTimeout(async () => {
      const ts = nowTs();
      if (note) {
        await db.notes.put({ ...note, content: value, updatedAt: ts });
      } else {
        await db.notes.put({
          id: uid(),
          createdAt: ts,
          updatedAt: ts,
          title: 'Note rapide',
          content: value,
          tags: [QUICK_TAG],
          favorite: false,
          pinned: false,
          revisions: []
        });
      }
      setSavedAt(ts);
    }, 700);
    return () => window.clearTimeout(id);
  }, [value, note]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minHeight: 0 }}>
      <textarea
        className="textarea selectable"
        style={{ flex: 1, minHeight: 44, resize: 'none', fontSize: 'var(--text-sm)' }}
        placeholder="Une idée ? Notez-la ici, la sauvegarde est automatique…"
        value={current}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="text-muted" style={{ fontSize: 'var(--text-2xs)', textAlign: 'right' }}>
        {savedAt
          ? `Enregistré à ${new Date(savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
          : 'Sauvegarde automatique'}
      </div>
    </div>
  );
}

/* ---------- Statistiques ---------- */

function StatsWidget(): React.ReactNode {
  const days = useMemo(() => {
    const out: string[] = [];
    for (let i = 6; i >= 0; i--) out.push(addDaysKey(todayKey(), -i));
    return out;
  }, []);
  const sessions = useLiveQuery(
    () => db.pomodoroSessions.where('phase').equals('work').toArray(),
    [],
    []
  );

  const byDay = useMemo(() => {
    const minutes = days.map((day) =>
      sessions
        .filter((s) => dateKey(new Date(s.startedAt)) === day)
        .reduce((acc, s) => acc + s.durationMin, 0)
    );
    return minutes;
  }, [sessions, days]);

  const todayMin = byDay[byDay.length - 1] ?? 0;
  const todayCount = sessions.filter((s) => dateKey(new Date(s.startedAt)) === days[6]).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 18 }}>
        <div>
          <div className="widget-label">Focus aujourd’hui</div>
          <div className="tabular" style={{ fontSize: 'var(--text-xl)', fontWeight: 650 }}>
            {minutesToHM(todayMin)}
          </div>
        </div>
        <div>
          <div className="widget-label">Sessions</div>
          <div className="tabular" style={{ fontSize: 'var(--text-xl)', fontWeight: 650 }}>
            {todayCount}
          </div>
        </div>
      </div>
      <MiniBars values={byDay} labels={days.map((d) => d.slice(5))} formatValue={(v) => minutesToHM(v)} />
      <div className="text-muted" style={{ fontSize: 'var(--text-2xs)', textAlign: 'center' }}>
        7 derniers jours
      </div>
    </div>
  );
}

/* ---------- Météo (source réelle Open-Meteo, optionnelle) ---------- */

interface WeatherCache {
  fetchedAt: number;
  temp: number;
  wind: number;
  code: number;
}

const WEATHER_CACHE_KEY = 'cozydesk.weather.cache.v1';

function WeatherWidget(): React.ReactNode {
  const weather = useSettingsStore((s) => s.weather);
  const [cache, setCache] = useState<WeatherCache | null>(() => {
    try {
      const raw = window.localStorage.getItem(WEATHER_CACHE_KEY);
      return raw ? (JSON.parse(raw) as WeatherCache) : null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!weather) return;
    if (cache && Date.now() - cache.fetchedAt < 30 * 60_000) return;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${weather.lat}&longitude=${weather.lon}&current=temperature_2m,wind_speed_10m,weather_code`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { current: { temperature_2m: number; wind_speed_10m: number; weather_code: number } }) => {
        const entry: WeatherCache = {
          fetchedAt: Date.now(),
          temp: data.current.temperature_2m,
          wind: data.current.wind_speed_10m,
          code: data.current.weather_code
        };
        window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(entry));
        setCache(entry);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Indisponible'));
  }, [weather, cache]);

  if (!weather) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <CloudSun size={26} className="text-muted" />
        <div className="text-muted" style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}>
          Météo désactivée — configurez une ville dans Paramètres (source réelle Open-Meteo).
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <MapPin size={13} className="text-muted" />
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 650 }}>{weather.city}</span>
      </div>
      {error && (
        <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
          Météo indisponible ({error}). Réessai automatique.
        </div>
      )}
      {!error && cache && (
        <>
          <div className="tabular" style={{ fontSize: 'var(--text-3xl)', fontWeight: 300 }}>
            {Math.round(cache.temp)}°C
          </div>
          <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
            {weatherLabel(cache.code)} · vent {Math.round(cache.wind)} km/h
          </div>
        </>
      )}
      {!error && !cache && (
        <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
          Chargement…
        </div>
      )}
    </div>
  );
}

function weatherLabel(code: number): string {
  if (code === 0) return 'Ciel dégagé';
  if (code <= 3) return 'Nuageux';
  if (code <= 48) return 'Brouillard';
  if (code <= 67) return 'Pluie';
  if (code <= 77) return 'Neige';
  if (code <= 82) return 'Averses';
  if (code <= 86) return 'Grésil';
  return 'Orage';
}
