/** Module Calendrier — vues mois/semaine/jour, événements, rappels réels. */
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2
} from 'lucide-react';
import {
  EmptyState,
  Field,
  GlassButton,
  IconButton,
  Input,
  Modal,
  Segmented,
  Select,
  Textarea,
  Toggle
} from '@/components/glass';
import { db, nowTs, uid } from '@/services/storage/db';
import type { EventItem } from '@/types/domain';
import {
  addDays,
  dateKey,
  fullDate,
  minutesToClock,
  monthGrid,
  monthTitle,
  startOfWeek,
  todayKey,
  WEEKDAYS_SHORT,
  clockToMinutes,
  daysBetween
} from '@/services/dates/dateUtils';
import { confirmAction } from '@/stores/toast';

const EVENT_COLORS = [
  'hsl(248 84% 70%)',
  'hsl(172 70% 55%)',
  'hsl(36 90% 60%)',
  'hsl(150 62% 55%)',
  'hsl(0 80% 68%)',
  'hsl(210 88% 66%)'
];

type ViewMode = 'month' | 'week' | 'day';

export default function CalendarModule(): React.ReactNode {
  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(todayKey());
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [creating, setCreating] = useState(false);

  const events = useLiveQuery(() => db.events.toArray(), [], [] as EventItem[]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const ev of events) {
      const arr = map.get(ev.date) ?? [];
      arr.push(ev);
      map.set(ev.date, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.startMinute ?? 0) - (b.startMinute ?? 0));
    }
    return map;
  }, [events]);

  const selectedEvents = eventsByDay.get(selectedDay) ?? [];

  const navigate = (dir: 1 | -1): void => {
    if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else if (view === 'week') setCursor(addDays(cursor, dir * 7));
    else setCursor(addDays(cursor, dir));
  };

  const title =
    view === 'month'
      ? monthTitle(cursor)
      : view === 'week'
        ? `Semaine du ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(startOfWeek(cursor))}`
        : fullDate(cursor);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  return (
    <div className="module-root">
      <div className="module-header">
        <h2>{title}</h2>
        <span className="spacer" />
        <IconButton label="Période précédente" onClick={() => navigate(-1)}>
          <ChevronLeft size={16} />
        </IconButton>
        <GlassButton
          size="sm"
          variant="ghost"
          onClick={() => {
            setCursor(new Date());
            setSelectedDay(todayKey());
          }}
        >
          Aujourd’hui
        </GlassButton>
        <IconButton label="Période suivante" onClick={() => navigate(1)}>
          <ChevronRight size={16} />
        </IconButton>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'month', label: 'Mois' },
            { value: 'week', label: 'Semaine' },
            { value: 'day', label: 'Jour' }
          ]}
        />
      </div>

      <div className="module-body">
        {view === 'month' && (
          <MonthView
            cursor={cursor}
            eventsByDay={eventsByDay}
            selectedDay={selectedDay}
            onSelect={(day) => {
              setSelectedDay(day);
              setCursor(new Date(day));
            }}
          />
        )}
        {view === 'week' && (
          <WeekView weekDays={weekDays} eventsByDay={eventsByDay} selectedDay={selectedDay} onSelect={setSelectedDay} />
        )}
        {view === 'day' && (
          <DayView
            day={dateKey(cursor)}
            events={eventsByDay.get(dateKey(cursor)) ?? []}
            onEdit={setEditing}
          />
        )}

        {(view === 'month' || view === 'week') && (
          <div style={{ marginTop: 14 }}>
            <div className="section-title">
              <CalendarDays size={15} />
              {daysBetween(todayKey(), selectedDay) === 0
                ? "Aujourd’hui"
                : new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(
                    new Date(selectedDay)
                  )}
              <span className="spacer" style={{ flex: 1 }} />
              <GlassButton
                size="sm"
                variant="primary"
                onClick={() => {
                  setCreating(true);
                }}
              >
                <CalendarPlus size={14} /> Nouvel événement
              </GlassButton>
            </div>
            {selectedEvents.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                Aucun événement ce jour-là.
              </p>
            ) : (
              selectedEvents.map((ev) => <EventRow key={ev.id} event={ev} onEdit={setEditing} />)
            )}
          </div>
        )}
      </div>

      {(creating || editing !== null) && (
        <EventEditor
          event={editing}
          defaultDate={selectedDay}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Vue mois ---------- */

function MonthView({
  cursor,
  eventsByDay,
  selectedDay,
  onSelect
}: {
  cursor: Date;
  eventsByDay: Map<string, EventItem[]>;
  selectedDay: string;
  onSelect: (day: string) => void;
}): React.ReactNode {
  const grid = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const today = todayKey();
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
          marginBottom: 4,
          textAlign: 'center',
          fontSize: 'var(--text-xs)',
          fontWeight: 650,
          color: 'rgb(var(--text-muted-rgb))'
        }}
      >
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {grid.flat().map((d) => {
          const key = dateKey(d);
          const evs = eventsByDay.get(key) ?? [];
          const isToday = key === today;
          const isSelected = key === selectedDay;
          const dim = d.getMonth() !== cursor.getMonth();
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              style={{
                minHeight: 64,
                borderRadius: 10,
                padding: 5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                opacity: dim ? 0.4 : 1,
                border: isSelected
                  ? '1.5px solid hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.7)'
                  : '1px solid rgb(var(--stroke-rgb) / 0.1)',
                background: isToday
                  ? 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.15)'
                  : 'rgb(var(--glass-deep-rgb) / 0.3)'
              }}
            >
              <span className="tabular" style={{ fontSize: 'var(--text-sm)', fontWeight: isToday ? 700 : 500 }}>
                {d.getDate()}
              </span>
              <span style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                {evs.slice(0, 3).map((ev) => (
                  <span key={ev.id} style={{ width: 5, height: 5, borderRadius: 99, background: ev.color }} />
                ))}
                {evs.length > 3 && (
                  <span className="text-muted" style={{ fontSize: 8 }}>
                    +{evs.length - 3}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Vue semaine ---------- */

function WeekView({
  weekDays,
  eventsByDay,
  selectedDay,
  onSelect
}: {
  weekDays: Date[];
  eventsByDay: Map<string, EventItem[]>;
  selectedDay: string;
  onSelect: (day: string) => void;
}): React.ReactNode {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
      {weekDays.map((d) => {
        const key = dateKey(d);
        const evs = eventsByDay.get(key) ?? [];
        const isToday = key === todayKey();
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              minHeight: 230,
              borderRadius: 10,
              padding: 6,
              textAlign: 'left',
              border:
                selectedDay === key
                  ? '1.5px solid hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.7)'
                  : '1px solid rgb(var(--stroke-rgb) / 0.1)',
              background: isToday
                ? 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.12)'
                : 'rgb(var(--glass-deep-rgb) / 0.3)'
            }}
          >
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 650, textAlign: 'center' }}>
              {WEEKDAYS_SHORT[(d.getDay() + 6) % 7]} {d.getDate()}
            </span>
            {evs.slice(0, 6).map((ev) => (
              <span
                key={ev.id}
                style={{
                  fontSize: 'var(--text-2xs)',
                  padding: '2px 5px',
                  borderRadius: 5,
                  background: `${ev.color}26`,
                  borderLeft: `2px solid ${ev.color}`,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {ev.allDay ? '' : `${minutesToClock(ev.startMinute ?? 0)} `}
                {ev.title}
              </span>
            ))}
            {evs.length > 6 && (
              <span className="text-muted" style={{ fontSize: 'var(--text-2xs)' }}>
                +{evs.length - 6} autres
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Vue jour ---------- */

function DayView({ day, events, onEdit }: { day: string; events: EventItem[]; onEdit: (e: EventItem) => void }): React.ReactNode {
  const timed = events.filter((e) => !e.allDay);
  const allDay = events.filter((e) => e.allDay);
  return (
    <div>
      {allDay.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div className="widget-label" style={{ marginBottom: 6 }}>Toute la journée</div>
          {allDay.map((ev) => (
            <EventRow key={ev.id} event={ev} onEdit={onEdit} />
          ))}
        </div>
      )}
      {timed.length === 0 && allDay.length === 0 && (
        <EmptyState icon={<CalendarDays size={28} />} title="Journée libre">
          Aucun événement programmé pour {fullDate(new Date(day)).toLowerCase()}.
        </EmptyState>
      )}
      {timed.map((ev) => (
        <EventRow key={ev.id} event={ev} onEdit={onEdit} />
      ))}
    </div>
  );
}

function EventRow({ event, onEdit }: { event: EventItem; onEdit: (e: EventItem) => void }): React.ReactNode {
  return (
    <div className="list-row glass-ultra" style={{ borderRadius: 'var(--radius-md)', marginBottom: 6 }}>
      <span style={{ width: 4, height: 30, borderRadius: 99, background: event.color, flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 550 }}>{event.title}</span>
        <span className="text-muted" style={{ fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={10} />
          {event.allDay
            ? 'Toute la journée'
            : `${minutesToClock(event.startMinute ?? 0)} – ${minutesToClock(event.endMinute ?? event.startMinute ?? 0)}`}
          {event.reminderMinutes !== undefined && ` · rappel ${event.reminderMinutes === 0 ? 'à l’heure' : `${event.reminderMinutes} min avant`}`}
        </span>
      </span>
      <IconButton label="Modifier" size="sm" onClick={() => onEdit(event)}>
        <CalendarDays size={13} />
      </IconButton>
    </div>
  );
}

/* ---------- Éditeur d'événement ---------- */

function EventEditor({
  event,
  defaultDate,
  onClose
}: {
  event: EventItem | null;
  defaultDate: string;
  onClose: () => void;
}): React.ReactNode {
  const [title, setTitle] = useState(event?.title ?? '');
  const [date, setDate] = useState(event?.date ?? defaultDate);
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [start, setStart] = useState(minutesToClock(event?.startMinute ?? 9 * 60));
  const [end, setEnd] = useState(minutesToClock(event?.endMinute ?? (event?.startMinute ?? 9 * 60) + 60));
  const [color, setColor] = useState(event?.color ?? EVENT_COLORS[0]);
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [reminder, setReminder] = useState<string>(
    event?.reminderMinutes !== undefined ? String(event.reminderMinutes) : '15'
  );
  const [error, setError] = useState<string | null>(null);

  const save = async (): Promise<void> => {
    if (title.trim().length === 0) {
      setError('Le titre est obligatoire.');
      return;
    }
    const startMin = clockToMinutes(start);
    const endMin = clockToMinutes(end);
    if (!allDay && endMin <= startMin) {
      setError('L’heure de fin doit être après l’heure de début.');
      return;
    }
    const ts = nowTs();
    const item: EventItem = {
      id: event?.id ?? uid(),
      createdAt: event?.createdAt ?? ts,
      updatedAt: ts,
      title: title.trim(),
      date,
      allDay,
      startMinute: allDay ? undefined : startMin,
      endMinute: allDay ? undefined : endMin,
      color,
      notes,
      reminderMinutes: reminder === 'none' ? undefined : Number(reminder),
      taskId: event?.taskId
    };
    await db.events.put(item);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={event ? 'Modifier l’événement' : 'Nouvel événement'}
      footer={
        <>
          {event && (
            <GlassButton
              variant="danger"
              onClick={async () => {
                const ok = await confirmAction({
                  title: 'Supprimer cet événement ?',
                  message: `« ${event.title} » sera supprimé.`,
                  confirmLabel: 'Supprimer',
                  danger: true
                });
                if (ok) {
                  await db.events.delete(event.id);
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
        <Field label="Titre">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Réunion d’équipe" />
        </Field>
        <div className="form-row">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Toute la journée">
            <div style={{ padding: '8px 0' }}>
              <Toggle checked={allDay} onChange={setAllDay} label="Toute la journée" />
            </div>
          </Field>
        </div>
        {!allDay && (
          <div className="form-row">
            <Field label="Début">
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Fin">
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
        )}
        <div className="form-row">
          <Field label="Rappel">
            <Select value={reminder} onChange={(e) => setReminder(e.target.value)}>
              <option value="none">Aucun rappel</option>
              <option value="0">À l’heure</option>
              <option value="5">5 minutes avant</option>
              <option value="15">15 minutes avant</option>
              <option value="30">30 minutes avant</option>
              <option value="60">1 heure avant</option>
            </Select>
          </Field>
          <Field label="Couleur">
            <span style={{ display: 'flex', gap: 6, padding: '6px 0' }}>
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`Couleur ${c}`}
                  onClick={() => setColor(c)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 99,
                    background: c,
                    border: color === c ? '2px solid rgb(255 255 255 / 0.9)' : '2px solid transparent',
                    boxShadow: color === c ? `0 0 10px ${c}` : undefined
                  }}
                />
              ))}
            </span>
          </Field>
        </div>
        <Field label="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {error && <p style={{ color: '#ff8d8d', fontSize: 'var(--text-sm)' }}>{error}</p>}
      </div>
    </Modal>
  );
}
