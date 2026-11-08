/** Module Journal — entrées datées, humeur, recherche, autosauvegarde. */
import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ChevronLeft,
  ChevronRight,
  Frown,
  Meh,
  Smile,
  Trash2,
  Search
} from 'lucide-react';
import { IconButton, Input } from '@/components/glass';
import { db, nowTs, uid } from '@/services/storage/db';
import type { JournalEntry, Mood } from '@/types/domain';
import { confirmAction } from '@/stores/toast';
import { onBus } from '@/services/bus';
import { humanDate, todayKey, fullDate, addDaysKey } from '@/services/dates/dateUtils';

const MOODS: { id: Mood; label: string; icon: typeof Smile }[] = [
  { id: 'great', label: 'Excellente', icon: Smile },
  { id: 'good', label: 'Bonne', icon: Smile },
  { id: 'neutral', label: 'Neutre', icon: Meh },
  { id: 'low', label: 'Basse', icon: Frown },
  { id: 'bad', label: 'Difficile', icon: Frown }
];

export default function JournalModule(): React.ReactNode {
  const [selectedDay, setSelectedDay] = useState(todayKey());
  const [search, setSearch] = useState('');

  const entries = useLiveQuery(
    () => (search.trim() ? db.journal.filter((e) => e.content.toLowerCase().includes(search.trim().toLowerCase())).toArray() : db.journal.toArray()),
    [search],
    [] as JournalEntry[]
  );

  useEffect(() => onBus('journal:open-today', () => setSelectedDay(todayKey())), []);

  const entry = useMemo(
    () => entries.find((e) => e.date === selectedDay) ?? null,
    [entries, selectedDay]
  );

  const byMonth = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const e of [...entries].sort((a, b) => b.date.localeCompare(a.date))) {
      const key = e.date.slice(0, 7);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [entries]);

  return (
    <div className="module-root module-split">
      <div className="module-split-left" style={{ width: 250 }}>
        <span style={{ position: 'relative' }}>
          <Search size={13} className="text-muted" style={{ position: 'absolute', left: 10, top: 10 }} />
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 29, fontSize: 'var(--text-sm)' }}
          />
        </span>
        <div className="module-list">
          {byMonth.length === 0 && (
            <div className="text-muted" style={{ padding: 12, fontSize: 'var(--text-sm)' }}>
              Aucune entrée pour l’instant.
            </div>
          )}
          {byMonth.map(([month, list]) => (
            <div key={month}>
              <div
                className="widget-label"
                style={{ margin: '8px 4px 4px', textTransform: 'none', letterSpacing: 0 }}
              >
                {new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
                  new Date(`${month}-01`)
                )}
              </div>
              {list.map((e) => (
                <button
                  key={e.id}
                  className="module-item"
                  data-selected={e.date === selectedDay}
                  onClick={() => setSelectedDay(e.date)}
                >
                  <span className="module-item-title">{humanDate(e.date)}</span>
                  {e.mood && (
                    <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 'var(--text-2xs)' }}>
                      {MOODS.find((m) => m.id === e.mood)?.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="module-split-right">
        <DayEditor key={selectedDay} day={selectedDay} entry={entry} onNavigate={setSelectedDay} />
      </div>
    </div>
  );
}

function DayEditor({
  day,
  entry,
  onNavigate
}: {
  day: string;
  entry: JournalEntry | null;
  onNavigate: (day: string) => void;
}): React.ReactNode {
  const [content, setContent] = useState(entry?.content ?? '');
  const [mood, setMood] = useState<Mood | undefined>(entry?.mood);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // L'éditeur est remonté via `key={selectedDay}` : l'état local est déjà
  // réinitialisé au changement de jour, aucun effet de synchronisation requis.
  // Autosauvegarde (crée l'entrée au premier caractère).
  useEffect(() => {
    if (content === (entry?.content ?? '') && mood === entry?.mood) return;
    if (content.length === 0 && !entry) return;
    const id = window.setTimeout(async () => {
      const ts = nowTs();
      const base: JournalEntry = entry ?? {
        id: uid(),
        createdAt: ts,
        updatedAt: ts,
        date: day,
        content: ''
      };
      await db.journal.put({ ...base, content, mood, updatedAt: ts });
      setSavedAt(ts);
    }, 650);
    return () => window.clearTimeout(id);
  }, [content, mood, day, entry]);

  const words = content.trim().length === 0 ? 0 : content.trim().split(/\s+/).length;

  return (
    <div className="module-editor" style={{ flex: 1, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconButton label="Jour précédent" size="sm" onClick={() => onNavigate(addDaysKey(day, -1))}>
          <ChevronLeft size={15} />
        </IconButton>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 650 }}>{fullDate(new Date(day))}</div>
        <IconButton label="Jour suivant" size="sm" onClick={() => onNavigate(addDaysKey(day, 1))}>
          <ChevronRight size={15} />
        </IconButton>
        {entry && (
          <IconButton
            label="Supprimer l’entrée"
            size="sm"
            className="btn-danger"
            onClick={async () => {
              const ok = await confirmAction({
                title: 'Supprimer cette entrée ?',
                message: `L’entrée du ${humanDate(day).toLowerCase()} sera définitivement supprimée.`,
                confirmLabel: 'Supprimer',
                danger: true
              });
              if (ok) await db.journal.delete(entry.id);
            }}
          >
            <Trash2 size={14} />
          </IconButton>
        )}
      </div>

      <div className="meta-row" style={{ justifyContent: 'center' }}>
        {MOODS.map((m) => {
          const Icon = m.icon;
          const active = mood === m.id;
          return (
            <button
              key={m.id}
              aria-label={`Humeur : ${m.label}`}
              data-tooltip={m.label}
              onClick={() => setMood(active ? undefined : m.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                borderRadius: 12,
                border: active
                  ? '1.5px solid hsl(var(--accent-h) var(--accent-s) var(--accent-l))'
                  : '1px solid rgb(var(--stroke-rgb) / 0.15)',
                background: active ? 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.18)' : 'transparent',
                color: active ? 'hsl(var(--accent-h) var(--accent-s) calc(var(--accent-l) + 8%))' : 'rgb(var(--text-muted-rgb))'
              }}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>

      <div className="writing-area">
        <textarea
          className="selectable"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Comment s’est passée votre journée ? Tout reste sur votre machine, aucune synchronisation cloud."
        />
      </div>

      <div className="text-muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
        <span>{words} mot{words > 1 ? 's' : ''}</span>
        <span>
          {savedAt
            ? `Enregistré à ${new Date(savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
            : entry
              ? 'À jour'
              : 'Non créé'}
        </span>
      </div>
    </div>
  );
}
