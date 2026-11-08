/** Widget « QuickNote ». */
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, uid, nowTs } from '@/services/storage/db';

const QUICK_TAG = 'quick';

export function QuickNoteWidget(): ReactNode {
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
