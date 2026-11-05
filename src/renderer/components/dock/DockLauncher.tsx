/** Lanceur complet : tous les modules, toujours accessibles, en un panneau. */
import { useEffect } from 'react';
import { Command, X } from 'lucide-react';
import { MODULES } from '@/modules/registry';
import { useWindowStore } from '@/stores/windows';
import { usePaletteStore } from '@/stores/palette';

export function DockLauncher({ onClose }: { onClose: () => void }): React.ReactNode {
  const open = useWindowStore((s) => s.open);
  const openPalette = usePaletteStore((s) => s.openPalette);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="launcher-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="launcher glass-float anim-pop" role="dialog" aria-label="Tous les modules">
        <header className="launcher-head">
          <h3>Tous les modules</h3>
          <button className="launcher-close" onClick={onClose} aria-label="Fermer">
            <X size={15} />
          </button>
        </header>
        <div className="launcher-grid">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                className="launcher-item"
                onClick={() => {
                  open(m.id, m.defaultSize);
                  onClose();
                }}
              >
                <span className="launcher-item-icon">
                  <Icon size={17} strokeWidth={1.9} />
                </span>
                <span>{m.title}</span>
              </button>
            );
          })}
        </div>
        <footer className="launcher-foot">
          <button
            className="launcher-palette"
            onClick={() => {
              openPalette(true);
              onClose();
            }}
          >
            <Command size={13} /> Palette de commandes
            <kbd className="kbd">Ctrl K</kbd>
          </button>
        </footer>
      </div>
    </div>
  );
}
