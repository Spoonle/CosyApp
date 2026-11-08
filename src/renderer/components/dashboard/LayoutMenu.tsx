/** Menu des dispositions : presets, sauvegarde et restauration. */
import { useEffect, useRef, useState } from 'react';
import { BookmarkPlus, Check } from 'lucide-react';
import { useDashboardStore, PRESET_META } from '@/stores/dashboard';
import { GlassButton, Input } from '@/components/glass';

export function LayoutMenu({ onClose }: { onClose: () => void }): React.ReactNode {
  const applyPreset = useDashboardStore((s) => s.applyPreset);
  const saveLayout = useDashboardStore((s) => s.saveLayout);
  const savedLayouts = useDashboardStore((s) => s.savedLayouts);
  const applySavedLayout = useDashboardStore((s) => s.applySavedLayout);
  const deleteSavedLayout = useDashboardStore((s) => s.deleteSavedLayout);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = (): void => {
    saveLayout(name);
    setName('');
    inputRef.current?.blur();
  };

  return (
    <div className="layout-pop glass-deep anim-pop" role="menu" aria-label="Dispositions">
      <h4>Dispositions</h4>
      <div className="layout-presets">
        {PRESET_META.map((p) => (
          <button
            key={p.id}
            className="layout-preset"
            role="menuitem"
            onClick={() => {
              applyPreset(p.id);
              onClose();
            }}
          >
            <span>{p.label}</span>
            <small>{p.hint}</small>
          </button>
        ))}
      </div>

      <div className="layout-save">
        <Input
          ref={inputRef}
          value={name}
          placeholder="Nommer cette disposition…"
          aria-label="Nom de la disposition"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
        />
        <GlassButton size="sm" variant="ghost" onClick={save} data-tooltip="Sauvegarder">
          <BookmarkPlus size={13} />
        </GlassButton>
      </div>

      {savedLayouts.length > 0 && (
        <div className="layout-saved">
          <h5>Enregistrées</h5>
          {savedLayouts.map((l) => (
            <div key={l.id} className="layout-saved-row">
              <button
                className="layout-saved-apply"
                onClick={() => {
                  applySavedLayout(l.id);
                  onClose();
                }}
              >
                <Check size={12} /> {l.name}
              </button>
              <button
                className="layout-saved-delete"
                aria-label={`Supprimer ${l.name}`}
                onClick={() => deleteSavedLayout(l.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
