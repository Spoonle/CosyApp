/** Module Habitudes — création, validation quotidienne, séries, calendrier de progression. */
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Flame, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import {
  EmptyState,
  Field,
  GlassButton,
  IconButton,
  Input,
  Modal,
  Select
} from '@/components/glass';
import { db, nowTs, uid } from '@/services/storage/db';
import type { Habit, HabitFrequency } from '@/types/domain';
import { confirmAction } from '@/stores/toast';
import { monthGrid, monthTitle, todayKey, dateKey, MONTHS_FULL } from '@/services/dates/dateUtils';
import { bestStreak, completionRate, currentStreak, isDueOn } from '@/services/habits/streaks';

const HABIT_COLORS = [
  'hsl(160 62% 52%)',
  'hsl(248 84% 70%)',
  'hsl(36 90% 58%)',
  'hsl(172 70% 50%)',
  'hsl(0 78% 66%)',
  'hsl(210 88% 64%)',
  'hsl(280 70% 68%)'
];

export default function HabitsModule(): React.ReactNode {
  const habits = useLiveQuery(() => db.habits.where('archived').equals(0).toArray(), [], [] as Habit[]);
  const logs = useLiveQuery(() => db.habitLogs.toArray(), [], []);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [creating, setCreating] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => new Date());

  const today = todayKey();
  const doneToday = useMemo(
    () => new Set(logs.filter((l) => l.date === today).map((l) => l.habitId)),
    [logs, today]
  );

  const logsByHabit = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const l of logs) {
      const set = map.get(l.habitId) ?? new Set<string>();
      set.add(l.date);
      map.set(l.habitId, set);
    }
    return map;
  }, [logs]);

  const toggleToday = async (habit: Habit): Promise<void> => {
    const logId = `${habit.id}:${today}`;
    if (doneToday.has(habit.id)) {
      await db.habitLogs.delete(logId);
    } else {
      const ts = nowTs();
      await db.habitLogs.put({
        id: logId,
        createdAt: ts,
        updatedAt: ts,
        habitId: habit.id,
        date: today
      });
    }
  };

  const grid = useMemo(
    () => monthGrid(monthCursor.getFullYear(), monthCursor.getMonth()),
    [monthCursor]
  );

  return (
    <div className="module-root">
      <div className="module-header">
        <h2>Habitudes</h2>
        <span className="spacer" />
        <GlassButton size="sm" variant="primary" onClick={() => setCreating(true)}>
          <Plus size={14} /> Nouvelle habitude
        </GlassButton>
      </div>

      <div className="module-body">
        {habits.length === 0 && (
          <EmptyState icon={<Repeat size={30} />} title="Aucune habitude suivie">
            Créez une habitude (quotidienne, jours précis, ou X fois par semaine) et validez-la
            chaque jour pour construire vos séries.
          </EmptyState>
        )}

        {habits.map((habit) => {
          const done = doneToday.has(habit.id);
          const doneSet = logsByHabit.get(habit.id) ?? new Set<string>();
          const streak = currentStreak(habit, doneSet);
          const rate = completionRate(habit, doneSet);
          return (
            <div key={habit.id} className="glass-ultra" style={{ borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => void toggleToday(habit)}
                  aria-label={done ? `Annuler ${habit.name} aujourd’hui` : `Valider ${habit.name} aujourd’hui`}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    border: `2px solid ${habit.color}`,
                    background: done ? habit.color : 'transparent',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 160ms var(--ease-out-soft)'
                  }}
                >
                  {done && <Check size={20} strokeWidth={3} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 650 }}>{habit.name}</div>
                  <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                    {frequencyLabel(habit.frequency)}
                    {rate !== null ? ` · ${Math.round(rate * 100)}% sur 30 jours` : ''}
                  </div>
                </div>
                <span
                  className="chip"
                  style={{
                    borderColor: `${habit.color}66`,
                    color: habit.color,
                    background: `${habit.color}18`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Flame size={11} /> {streak} jour{streak > 1 ? 's' : ''}
                </span>
                <IconButton label="Modifier" size="sm" onClick={() => setEditing(habit)}>
                  <Pencil size={13} />
                </IconButton>
              </div>

              {/* Calendrier de progression (mois courant) */}
              <div style={{ display: 'flex', gap: 3, marginTop: 10, flexWrap: 'wrap' }}>
                {grid.flat().map((d) => {
                  const key = dateKey(d);
                  const inMonth = d.getMonth() === monthCursor.getMonth();
                  const isDone = doneSet.has(key);
                  const due = isDueOn(habit.frequency, key);
                  const isToday = key === today;
                  return (
                    <span
                      key={key}
                      title={`${key}${isDone ? ' — fait' : ''}`}
                      style={{
                        width: 13,
                        height: 13,
                        borderRadius: 4,
                        opacity: inMonth ? 1 : 0.25,
                        background: isDone
                          ? habit.color
                          : due
                            ? 'rgb(var(--glass-deep-rgb) / 0.85)'
                            : 'rgb(var(--glass-deep-rgb) / 0.45)',
                        border: isToday ? '1.5px solid rgb(var(--text-rgb) / 0.8)' : 'none',
                        flexShrink: 0
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {habits.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
            >
              ← {MONTHS_FULL[(monthCursor.getMonth() + 11) % 12]}
            </GlassButton>
            <span style={{ fontWeight: 650 }}>{monthTitle(monthCursor)}</span>
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
            >
              {MONTHS_FULL[(monthCursor.getMonth() + 1) % 12]} →
            </GlassButton>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <div className="section-title">
            <Flame size={15} /> Records
          </div>
          {habits.map((habit) => {
            const done = [...(logsByHabit.get(habit.id) ?? new Set<string>())];
            return (
              <div key={habit.id} className="list-row" style={{ padding: '4px 6px' }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: habit.color }} />
                <span style={{ fontWeight: 550 }}>{habit.name}</span>
                <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 'var(--text-sm)' }}>
                  record : <b className="tabular">{bestStreak(done)}</b> jour
                  {bestStreak(done) > 1 ? 's' : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {(creating || editing !== null) && (
        <HabitEditor
          habit={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function frequencyLabel(freq: HabitFrequency): string {
  if (freq.kind === 'daily') return 'Tous les jours';
  if (freq.kind === 'weekdays') {
    const names = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
    return `Les ${freq.days.map((d) => names[d]).join(', ')}`;
  }
  return `${freq.times} fois par semaine`;
}

/* ---------- Éditeur ---------- */

const WEEKDAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function HabitEditor({ habit, onClose }: { habit: Habit | null; onClose: () => void }): React.ReactNode {
  const [name, setName] = useState(habit?.name ?? '');
  const [color, setColor] = useState(habit?.color ?? HABIT_COLORS[0]);
  const [kind, setKind] = useState<HabitFrequency['kind']>(habit?.frequency.kind ?? 'daily');
  const [days, setDays] = useState<number[]>(
    habit?.frequency.kind === 'weekdays' ? habit.frequency.days : [1, 3, 5]
  );
  const [times, setTimes] = useState(
    habit?.frequency.kind === 'timesPerWeek' ? habit.frequency.times : 3
  );
  const [error, setError] = useState<string | null>(null);

  const save = async (): Promise<void> => {
    if (name.trim().length === 0) {
      setError('Le nom est obligatoire.');
      return;
    }
    if (kind === 'weekdays' && days.length === 0) {
      setError('Choisissez au moins un jour.');
      return;
    }
    const frequency: HabitFrequency =
      kind === 'daily'
        ? { kind: 'daily' }
        : kind === 'weekdays'
          ? { kind: 'weekdays', days: [...days].sort() }
          : { kind: 'timesPerWeek', times: Math.max(1, Math.min(7, times)) };
    const ts = nowTs();
    const item: Habit = {
      id: habit?.id ?? uid(),
      createdAt: habit?.createdAt ?? ts,
      updatedAt: ts,
      name: name.trim(),
      icon: habit?.icon ?? 'check',
      color,
      frequency,
      archived: 0
    };
    await db.habits.put(item);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={habit ? 'Modifier l’habitude' : 'Nouvelle habitude'}
      footer={
        <>
          {habit && (
            <GlassButton
              variant="danger"
              onClick={async () => {
                const ok = await confirmAction({
                  title: 'Supprimer cette habitude ?',
                  message: `« ${habit.name} » et son historique seront supprimés.`,
                  confirmLabel: 'Supprimer',
                  danger: true
                });
                if (ok) {
                  await db.habits.delete(habit.id);
                  const logs = await db.habitLogs.where('habitId').equals(habit.id).toArray();
                  await db.habitLogs.bulkDelete(logs.map((l) => l.id));
                  onClose();
                }
              }}
            >
              <Trash2 size={14} /> Supprimer
            </GlassButton>
          )}
          <span style={{ flex: 1 }} />
          <GlassButton variant="ghost" onClick={onClose}>
            Annuler
          </GlassButton>
          <GlassButton variant="primary" onClick={() => void save()}>
            Enregistrer
          </GlassButton>
        </>
      }
    >
      <div className="module-editor">
        <Field label="Nom">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Lire 20 minutes"
          />
        </Field>
        <Field label="Couleur">
          <span style={{ display: 'flex', gap: 6 }}>
            {HABIT_COLORS.map((c) => (
              <button
                key={c}
                aria-label={`Couleur ${c}`}
                onClick={() => setColor(c)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 99,
                  background: c,
                  border: color === c ? '2px solid rgb(255 255 255 / 0.9)' : '2px solid transparent'
                }}
              />
            ))}
          </span>
        </Field>
        <Field label="Fréquence">
          <Select value={kind} onChange={(e) => setKind(e.target.value as HabitFrequency['kind'])}>
            <option value="daily">Tous les jours</option>
            <option value="weekdays">Jours précis de la semaine</option>
            <option value="timesPerWeek">X fois par semaine</option>
          </Select>
        </Field>
        {kind === 'weekdays' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {WEEKDAY_NAMES.map((label, d) => (
              <button
                key={d}
                className="chip"
                style={{
                  borderColor: days.includes(d) ? 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))' : undefined,
                  color: days.includes(d) ? 'hsl(var(--accent-h) var(--accent-s) calc(var(--accent-l) + 10%))' : undefined
                }}
                onClick={() => {
                  setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {kind === 'timesPerWeek' && (
          <Field label="Nombre de fois par semaine">
            <Input
              type="number"
              min={1}
              max={7}
              value={times}
              onChange={(e) => setTimes(Number(e.target.value))}
              className="tabular"
            />
          </Field>
        )}
        {error && <p style={{ color: '#ff8d8d', fontSize: 'var(--text-sm)' }}>{error}</p>}
      </div>
    </Modal>
  );
}
