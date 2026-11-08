/** Module Notes — liste, éditeur, tags, favoris, épinglage, révisions, autosauvegarde. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { History, NotebookPen, Pin, Plus, Search, Star, Trash2 } from 'lucide-react';
import { Chip, EmptyState, GlassButton, IconButton, Input, Textarea } from '@/components/glass';
import { db, nowTs, uid } from '@/services/storage/db';
import type { Note, NoteRevision } from '@/types/domain';
import { onBus } from '@/services/bus';
import { confirmAction } from '@/stores/toast';

const MAX_REVISIONS = 20;

export default function NotesModule(): React.ReactNode {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), [], [] as Note[]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? notes.filter(
          (n) => `${n.title} ${n.content} ${n.tags.join(' ')}`.toLowerCase().includes(q)
        )
      : notes;
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, search]);

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  );

  const createNote = async (): Promise<Note> => {
    const ts = nowTs();
    const note: Note = {
      id: uid(),
      createdAt: ts,
      updatedAt: ts,
      title: 'Nouvelle note',
      content: '',
      tags: [],
      favorite: false,
      pinned: false,
      revisions: []
    };
    await db.notes.put(note);
    setSelectedId(note.id);
    return note;
  };

  useEffect(() => {
    if (selectedId === null && notes.length > 0) setSelectedId(notes[0].id);
  }, [notes, selectedId]);

  useEffect(() => onBus('notes:create', () => void createNote()), []);

  return (
    <div className="module-root module-split">
      <div className="module-split-left">
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ position: 'relative', flex: 1 }}>
            <Search size={13} className="text-muted" style={{ position: 'absolute', left: 10, top: 10 }} />
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 29 }}
            />
          </span>
          <GlassButton
            size="sm"
            variant="primary"
            aria-label="Nouvelle note"
            data-tooltip="Nouvelle note"
            onClick={() => void createNote()}
          >
            <Plus size={15} />
          </GlassButton>
        </div>
        <div className="module-list">
          {filtered.length === 0 && (
            <div className="text-muted" style={{ padding: 14, fontSize: 'var(--text-sm)' }}>
              Aucune note. Créez-en une avec +.
            </div>
          )}
          {filtered.map((n) => (
            <button
              key={n.id}
              className="module-item"
              data-selected={n.id === selectedId}
              onClick={() => setSelectedId(n.id)}
              style={{ alignItems: 'flex-start' }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="module-item-title" style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {n.pinned && <Pin size={11} style={{ flexShrink: 0 }} />}
                  {n.favorite && <Star size={11} style={{ flexShrink: 0, fill: 'currentColor' }} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {n.title || 'Sans titre'}
                  </span>
                </span>
                <span className="module-item-sub" style={{ display: 'block' }}>
                  {n.content.slice(0, 60) || 'Vide'}
                </span>
              </span>
              <span className="text-muted tabular" style={{ fontSize: 'var(--text-2xs)', flexShrink: 0, marginTop: 2 }}>
                {new Date(n.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="module-split-right">
        {selected ? (
          <NoteEditor key={selected.id} note={selected} />
        ) : (
          <EmptyState icon={<NotebookPen size={30} />} title="Sélectionnez ou créez une note">
            Les notes sont sauvegardées automatiquement et conservent leurs 20 dernières versions.
          </EmptyState>
        )}
      </div>
    </div>
  );
}

/* ---------- Éditeur ---------- */

function NoteEditor({ note }: { note: Note }): React.ReactNode {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tagInput, setTagInput] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const lastRevisionAt = useRef<number>(note.updatedAt);

  // L'éditeur est remonté via `key={selected.id}` : inutile de resynchroniser
  // l'état local à chaque changement de note.
  // Autosauvegarde + révision si le contenu a réellement changé.
  useEffect(() => {
    if (title === note.title && content === note.content) return;
    const id = window.setTimeout(async () => {
      const ts = nowTs();
      // Révision archivée si la dernière remonte à plus de 2 minutes.
      const revisions: NoteRevision[] =
        ts - lastRevisionAt.current > 2 * 60_000
          ? [
              { id: uid(), savedAt: note.updatedAt, title: note.title, content: note.content },
              ...note.revisions
            ].slice(0, MAX_REVISIONS)
          : note.revisions;
      await db.notes.put({ ...note, title, content, revisions, updatedAt: ts });
      lastRevisionAt.current = ts;
      setSavedAt(ts);
    }, 600);
    return () => window.clearTimeout(id);
  }, [title, content, note]);

  const words = content.trim().length === 0 ? 0 : content.trim().split(/\s+/).length;

  return (
    <div className="module-editor" style={{ flex: 1, padding: 18 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre de la note"
          style={{ fontSize: 'var(--text-lg)', fontWeight: 650, padding: '8px 12px' }}
        />
        <IconButton
          label={note.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          onClick={() =>
            void db.notes.put({ ...note, favorite: !note.favorite, updatedAt: nowTs() })
          }
          style={{ color: note.favorite ? '#f5b849' : undefined }}
        >
          <Star size={16} style={note.favorite ? { fill: 'currentColor' } : undefined} />
        </IconButton>
        <IconButton
          label={note.pinned ? 'Désépingler' : 'Épingler'}
          onClick={() => void db.notes.put({ ...note, pinned: !note.pinned, updatedAt: nowTs() })}
          style={{ color: note.pinned ? 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))' : undefined }}
        >
          <Pin size={16} />
        </IconButton>
        <IconButton label="Historique" onClick={() => setShowHistory((v) => !v)}>
          <History size={16} />
        </IconButton>
        <IconButton
          label="Supprimer la note"
          className="btn-danger"
          onClick={async () => {
            const ok = await confirmAction({
              title: 'Supprimer cette note ?',
              message: `« ${note.title || 'Sans titre'} » sera définitivement supprimée.`,
              confirmLabel: 'Supprimer',
              danger: true
            });
            if (ok) await db.notes.delete(note.id);
          }}
        >
          <Trash2 size={16} />
        </IconButton>
      </div>

      {showHistory && (
        <div className="glass-ultra" style={{ padding: 10, maxHeight: 180, overflowY: 'auto' }}>
          {note.revisions.length === 0 && (
            <div className="text-muted" style={{ fontSize: 'var(--text-sm)', padding: 6 }}>
              Aucune révision antérieure enregistrée.
            </div>
          )}
          {note.revisions.map((r) => (
            <div key={r.id} className="list-row" style={{ padding: '5px 8px' }}>
              <span className="text-secondary" style={{ fontSize: 'var(--text-sm)', flex: 1 }}>
                {new Date(r.savedAt).toLocaleString('fr-FR')}
              </span>
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTitle(r.title);
                  setContent(r.content);
                  setShowHistory(false);
                }}
              >
                Restaurer
              </GlassButton>
            </div>
          ))}
        </div>
      )}

      <div className="meta-row">
        {note.tags.map((tag) => (
          <Chip
            key={tag}
            onRemove={() =>
              void db.notes.put({
                ...note,
                tags: note.tags.filter((t) => t !== tag),
                updatedAt: nowTs()
              })
            }
          >
            #{tag}
          </Chip>
        ))}
        <input
          className="input"
          style={{ width: 120, padding: '3px 9px', fontSize: 'var(--text-sm)' }}
          placeholder="+ tag"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const tag = tagInput.trim().replace(/^#/, '').toLowerCase();
              if (tag && !note.tags.includes(tag)) {
                void db.notes.put({ ...note, tags: [...note.tags, tag], updatedAt: nowTs() });
              }
              setTagInput('');
            }
          }}
        />
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Écrivez librement… la sauvegarde est automatique."
        style={{ flex: 1, fontSize: 'var(--text-md)', lineHeight: 1.7 }}
      />

      <div
        className="text-muted"
        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}
      >
        <span>{words} mot{words > 1 ? 's' : ''}</span>
        <span>
          {savedAt
            ? `Enregistré à ${new Date(savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
            : 'À jour'}
        </span>
      </div>
    </div>
  );
}
