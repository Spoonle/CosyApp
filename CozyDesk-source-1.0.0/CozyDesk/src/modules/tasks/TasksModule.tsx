/** Module Tâches — CRUD complet, filtres, tri, sous-tâches, catégories, tags. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Archive,
  ArchiveRestore,
  Calendar,
  ChevronDown,
  ListTodo,
  Plus,
  Search,
  Tag,
  Trash2,
  X
} from 'lucide-react';
import {
  Chip,
  EmptyState,
  GlassButton,
  Input,
  Segmented,
  Select,
  Textarea
} from '@/components/glass';
import { db, nowTs, uid } from '@/services/storage/db';
import type { Category, Priority, Subtask, Task } from '@/types/domain';
import { confirmAction } from '@/stores/toast';
import { onBus } from '@/services/bus';
import { humanDate, todayKey } from '@/services/dates/dateUtils';

const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: 'Urgente',
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse'
};

const PRIORITY_COLOR: Record<Priority, string> = {
  urgent: '#ff7a7a',
  high: '#f5b849',
  medium: 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))',
  low: 'rgb(var(--text-muted-rgb))'
};

type StatusFilter = 'active' | 'done' | 'archived' | 'all';
type SortKey = 'due' | 'priority' | 'created' | 'alpha';

export default function TasksModule(): React.ReactNode {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('priority');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quick, setQuick] = useState('');
  const quickRef = useRef<HTMLInputElement | null>(null);

  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [] as Task[]);
  const categories = useLiveQuery(() => db.categories.toArray(), [], [] as Category[]);
  const allTags = useMemo(
    () => [...new Set(tasks.flatMap((t) => t.tags))].sort(),
    [tasks]
  );

  // Palette : « Créer une tâche »
  useEffect(() => onBus('tasks:create', () => quickRef.current?.focus()), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const prOrder: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return tasks
      .filter((t) => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false;
        if (tagFilter !== null && !t.tags.includes(tagFilter)) return false;
        if (q.length > 0) {
          const hay = `${t.title} ${t.notes} ${t.tags.join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === 'alpha') return a.title.localeCompare(b.title, 'fr');
        if (sort === 'created') return b.createdAt - a.createdAt;
        if (sort === 'due') {
          if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return 0;
        }
        const pr = prOrder[a.priority] - prOrder[b.priority];
        if (pr !== 0) return pr;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return b.createdAt - a.createdAt;
      });
  }, [tasks, search, statusFilter, priorityFilter, categoryFilter, tagFilter, sort]);

  const addQuickTask = async (): Promise<void> => {
    const title = quick.trim();
    if (!title) return;
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

  const counts = useMemo(
    () => ({
      active: tasks.filter((t) => t.status === 'active').length,
      done: tasks.filter((t) => t.status === 'done').length,
      archived: tasks.filter((t) => t.status === 'archived').length
    }),
    [tasks]
  );

  return (
    <div className="module-root">
      <div className="module-header">
        <h2>Tâches</h2>
        <span className="chip">{counts.active} active{counts.active > 1 ? 's' : ''}</span>
        <span className="spacer" />
        <CategoryManager categories={categories} />
      </div>

      <div className="module-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Input
            ref={quickRef}
            placeholder="Nouvelle tâche — Entrée pour ajouter…"
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void addQuickTask();
            }}
            style={{ flex: 1 }}
          />
          <GlassButton variant="primary" onClick={() => void addQuickTask()}>
            <Plus size={15} /> Ajouter
          </GlassButton>
        </div>

        <div className="module-toolbar">
          <Segmented
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'active', label: `Actives (${counts.active})` },
              { value: 'done', label: `Terminées (${counts.done})` },
              { value: 'archived', label: `Archives (${counts.archived})` },
              { value: 'all', label: 'Toutes' }
            ]}
          />
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'all' | Priority)}
            aria-label="Filtrer par priorité"
            style={{ width: 'auto' }}
          >
            <option value="all">Toutes priorités</option>
            <option value="urgent">Urgentes</option>
            <option value="high">Hautes</option>
            <option value="medium">Moyennes</option>
            <option value="low">Basses</option>
          </Select>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filtrer par catégorie"
            style={{ width: 'auto' }}
          >
            <option value="all">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Trier"
            style={{ width: 'auto' }}
          >
            <option value="priority">Tri : priorité</option>
            <option value="due">Tri : échéance</option>
            <option value="created">Tri : création</option>
            <option value="alpha">Tri : A→Z</option>
          </Select>
          <span style={{ display: 'flex', alignItems: 'center' }} className="text-muted">
            <Search size={13} style={{ marginRight: -22, zIndex: 1, marginLeft: 12 }} />
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 30, width: 150 }}
            />
          </span>
        </div>

        {allTags.length > 0 && (
          <div className="meta-row" style={{ marginBottom: 12 }}>
            <Tag size={13} className="text-muted" />
            {allTags.map((tag) => (
              <Chip
                key={tag}
                accent={tagFilter === tag}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              >
                #{tag}
              </Chip>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <EmptyState icon={<ListTodo size={30} />} title="Aucune tâche ici">
            Créez votre première tâche avec le champ ci-dessus. Les tâches acceptent échéances,
            priorités, catégories, tags et sous-tâches.
          </EmptyState>
        )}

        {filtered.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            categories={categories}
            expanded={expandedId === task.id}
            onToggleExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- Ligne de tâche ---------- */

function TaskRow({
  task,
  categories,
  expanded,
  onToggleExpand
}: {
  task: Task;
  categories: Category[];
  expanded: boolean;
  onToggleExpand: () => void;
}): React.ReactNode {
  const category = categories.find((c) => c.id === task.categoryId);
  const done = task.status === 'done';
  const overdue = !done && task.dueDate !== undefined && task.dueDate < todayKey();
  const subtasksDone = task.subtasks.filter((s) => s.done).length;

  const toggleDone = async (): Promise<void> => {
    const ts = nowTs();
    await db.tasks.put({
      ...task,
      status: done ? 'active' : 'done',
      completedAt: done ? undefined : ts,
      updatedAt: ts
    });
  };

  return (
    <div className="glass-ultra" style={{ borderRadius: 'var(--radius-md)', marginBottom: 8, overflow: 'hidden' }}>
      <div className="list-row" style={{ borderRadius: 0 }}>
        <input
          type="checkbox"
          checked={done}
          onChange={() => void toggleDone()}
          aria-label={done ? `Réouvrir ${task.title}` : `Terminer ${task.title}`}
          style={{ accentColor: 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))' }}
        />
        <button
          onClick={onToggleExpand}
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            opacity: done ? 0.55 : 1
          }}
        >
          <span
            style={{
              fontSize: 'var(--text-base)',
              fontWeight: 550,
              textDecoration: done ? 'line-through' : 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {task.title}
          </span>
        </button>
        <span
          className="chip"
          style={{
            borderColor: `${PRIORITY_COLOR[task.priority]}55`,
            color: PRIORITY_COLOR[task.priority],
            background: `${PRIORITY_COLOR[task.priority]}14`
          }}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
        {task.dueDate && (
          <span
            className="chip"
            style={{
              color: overdue ? '#ff8d8d' : undefined,
              borderColor: overdue ? '#ff8d8d55' : undefined
            }}
          >
            <Calendar size={10} /> {humanDate(task.dueDate)}
          </span>
        )}
        {category && (
          <span className="chip">
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 99,
                background: category.color,
                display: 'inline-block'
              }}
            />
            {category.name}
          </span>
        )}
        {task.subtasks.length > 0 && (
          <span className="chip">
            {subtasksDone}/{task.subtasks.length}
          </span>
        )}
        <button
          onClick={onToggleExpand}
          aria-label={expanded ? 'Réduire' : 'Détails'}
          className="text-muted"
          style={{ display: 'flex' }}
        >
          <ChevronDown
            size={15}
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
          />
        </button>
      </div>

      {expanded && (
        <TaskEditor task={task} categories={categories} onDone={onToggleExpand} />
      )}
    </div>
  );
}

/* ---------- Éditeur ---------- */

function TaskEditor({
  task,
  categories,
  onDone
}: {
  task: Task;
  categories: Category[];
  onDone: () => void;
}): React.ReactNode {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [dueDate, setDueDate] = useState(task.dueDate ?? '');
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [categoryId, setCategoryId] = useState(task.categoryId ?? '');
  const [tagInput, setTagInput] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const id = window.setTimeout(async () => {
      await db.tasks.put({
        ...task,
        title: title.trim() || task.title,
        notes,
        dueDate: dueDate || undefined,
        priority,
        categoryId: categoryId || undefined,
        updatedAt: nowTs()
      });
    }, 500);
    return () => window.clearTimeout(id);
  }, [title, notes, dueDate, priority, categoryId, dirty, task]);

  const addTag = (): void => {
    const tag = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (tag && !task.tags.includes(tag)) {
      void db.tasks.put({ ...task, tags: [...task.tags, tag], updatedAt: nowTs() });
    }
    setTagInput('');
  };

  const addSubtask = async (): Promise<void> => {
    const t = subtaskInput.trim();
    if (!t) return;
    const sub: Subtask = { id: uid(), title: t, done: false };
    await db.tasks.put({ ...task, subtasks: [...task.subtasks, sub], updatedAt: nowTs() });
    setSubtaskInput('');
  };

  return (
    <div
      className="module-editor selectable"
      style={{ borderTop: '1px solid rgb(var(--stroke-rgb) / 0.1)', background: 'rgb(var(--glass-deep-rgb) / 0.25)' }}
    >
      <label style={{ display: 'block' }}>
        <span className="field-label">Titre</span>
        <Input
          value={title}
          onChange={(e) => {
            setDirty(true);
            setTitle(e.target.value);
          }}
        />
      </label>

      <label style={{ display: 'block' }}>
        <span className="field-label">Notes</span>
        <Textarea
          rows={3}
          value={notes}
          placeholder="Détails, contexte, liens…"
          onChange={(e) => {
            setDirty(true);
            setNotes(e.target.value);
          }}
        />
      </label>

      <div className="form-row">
        <label style={{ display: 'block' }}>
          <span className="field-label">Échéance</span>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => {
              setDirty(true);
              setDueDate(e.target.value);
            }}
          />
        </label>
        <label style={{ display: 'block' }}>
          <span className="field-label">Priorité</span>
          <Select value={priority} onChange={(e) => { setDirty(true); setPriority(e.target.value as Priority); }}>
            <option value="urgent">Urgente</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </Select>
        </label>
        <label style={{ display: 'block' }}>
          <span className="field-label">Catégorie</span>
          <Select value={categoryId} onChange={(e) => { setDirty(true); setCategoryId(e.target.value); }}>
            <option value="">— Aucune —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div>
        <span className="field-label">Tags</span>
        <div className="meta-row" style={{ marginBottom: 6 }}>
          {task.tags.map((tag) => (
            <Chip
              key={tag}
              onRemove={() =>
                void db.tasks.put({
                  ...task,
                  tags: task.tags.filter((t) => t !== tag),
                  updatedAt: nowTs()
                })
              }
            >
              #{tag}
            </Chip>
          ))}
          {task.tags.length === 0 && <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Aucun tag</span>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Input
            placeholder="Ajouter un tag…"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <GlassButton size="sm" variant="ghost" onClick={addTag}>
            <Plus size={14} />
          </GlassButton>
        </div>
      </div>

      <div>
        <span className="field-label">Sous-tâches</span>
        {task.subtasks.map((sub) => (
          <div key={sub.id} className="list-row" style={{ padding: '4px 6px' }}>
            <input
              type="checkbox"
              checked={sub.done}
              onChange={() =>
                void db.tasks.put({
                  ...task,
                  subtasks: task.subtasks.map((s) =>
                    s.id === sub.id ? { ...s, done: !s.done } : s
                  ),
                  updatedAt: nowTs()
                })
              }
              aria-label={sub.title}
            />
            <span
              style={{
                fontSize: 'var(--text-sm)',
                textDecoration: sub.done ? 'line-through' : 'none',
                opacity: sub.done ? 0.6 : 1,
                flex: 1
              }}
            >
              {sub.title}
            </span>
            <button
              className="text-muted"
              aria-label="Supprimer la sous-tâche"
              onClick={() =>
                void db.tasks.put({
                  ...task,
                  subtasks: task.subtasks.filter((s) => s.id !== sub.id),
                  updatedAt: nowTs()
                })
              }
            >
              <X size={13} />
            </button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <Input
            placeholder="Nouvelle sous-tâche…"
            value={subtaskInput}
            onChange={(e) => setSubtaskInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void addSubtask();
            }}
          />
          <GlassButton size="sm" variant="ghost" onClick={() => void addSubtask()}>
            <Plus size={14} />
          </GlassButton>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <GlassButton
          size="sm"
          variant="ghost"
          onClick={async () => {
            await db.tasks.put({
              ...task,
              status: task.status === 'archived' ? 'active' : 'archived',
              updatedAt: nowTs()
            });
            onDone();
          }}
        >
          {task.status === 'archived' ? <ArchiveRestore size={13} /> : <Archive size={13} />}
          {task.status === 'archived' ? 'Désarchiver' : 'Archiver'}
        </GlassButton>
        <GlassButton
          size="sm"
          variant="danger"
          onClick={async () => {
            const ok = await confirmAction({
              title: 'Supprimer cette tâche ?',
              message: `« ${task.title} » sera définitivement supprimée.`,
              confirmLabel: 'Supprimer',
              danger: true
            });
            if (ok) {
              await db.tasks.delete(task.id);
              onDone();
            }
          }}
        >
          <Trash2 size={13} /> Supprimer
        </GlassButton>
      </div>
    </div>
  );
}

/* ---------- Gestionnaire de catégories ---------- */

function CategoryManager({ categories }: { categories: Category[] }): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#7c6fff');

  return (
    <div style={{ position: 'relative' }}>
      <GlassButton size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
        <Tag size={14} /> Catégories
      </GlassButton>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 690 }} onClick={() => setOpen(false)} />
          <div className="menu glass-deep anim-pop" style={{ right: 0, top: 'calc(100% + 8px)', zIndex: 700, width: 250 }}>
            {categories.map((c) => (
              <div key={c.id} className="menu-item" style={{ cursor: 'default' }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: c.color }} />
                <span style={{ flex: 1 }}>{c.name}</span>
                <button
                  className="text-muted"
                  aria-label={`Supprimer ${c.name}`}
                  onClick={() => void db.categories.delete(c.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-muted" style={{ padding: '6px 11px', fontSize: 'var(--text-sm)' }}>
                Aucune catégorie
              </div>
            )}
            <div className="menu-separator" />
            <div style={{ display: 'flex', gap: 6, padding: '4px 6px' }}>
              <Input
                placeholder="Nom…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: '5px 9px', fontSize: 'var(--text-sm)' }}
              />
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Couleur de la catégorie"
                style={{
                  width: 30,
                  height: 30,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer'
                }}
              />
              <GlassButton
                size="sm"
                variant="primary"
                onClick={async () => {
                  if (!name.trim()) return;
                  const ts = nowTs();
                  await db.categories.put({
                    id: uid(),
                    createdAt: ts,
                    updatedAt: ts,
                    name: name.trim(),
                    color
                  });
                  setName('');
                }}
              >
                <Plus size={13} />
              </GlassButton>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
