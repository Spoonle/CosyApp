/** Dock flottant : accès aux modules, indicateur de fenêtres ouvertes. */
import clsx from 'clsx';
import { useMemo } from 'react';
import { Search, Settings, X } from 'lucide-react';
import { MODULES } from '@/modules/registry';
import { useWindowStore } from '@/stores/windows';
import { usePaletteStore } from '@/stores/palette';
import { toast } from '@/stores/toast';

export function Dock(): React.ReactNode {
  const windows = useWindowStore((s) => s.windows);
  const open = useWindowStore((s) => s.open);
  const restore = useWindowStore((s) => s.restore);
  const close = useWindowStore((s) => s.close);
  const openPalette = usePaletteStore((s) => s.openPalette);

  const dockModules = useMemo(
    () => MODULES.filter((m) => m.dock && m.id !== 'settings'),
    []
  );

  const activate = (id: string, defaultSize: { w: number; h: number }): void => {
    const existing = useWindowStore.getState().windows.find((w) => w.id === id);
    if (existing && !existing.closing) {
      if (existing.minimized) restore(id);
      else close(id); // clic sur module déjà ouvert et visible → fermeture
    } else {
      open(id, defaultSize);
    }
  };

  return (
    <nav className="dock glass-float" aria-label="Dock CozyDesk">
      <button
        className="dock-item dock-palette"
        data-tooltip="Palette de commandes — Ctrl+K"
        aria-label="Palette de commandes"
        onClick={() => openPalette(true)}
      >
        <Search size={19} strokeWidth={2.2} />
      </button>
      <span className="dock-separator" />
      {dockModules.map((m) => {
        const win = windows.find((w) => w.id === m.id && !w.closing);
        const running = win !== undefined;
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            className={clsx('dock-item', running && 'running')}
            data-tooltip={m.title}
            aria-label={m.title}
            onClick={() => activate(m.id, m.defaultSize)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (running) {
                close(m.id);
                toast('info', `${m.title} fermé`);
              }
            }}
          >
            <Icon size={21} strokeWidth={2} />
            <span className="dock-dot" aria-hidden="true" />
            {running && !win?.minimized && (
              <span
                className="dock-close"
                role="button"
                aria-label={`Fermer ${m.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  close(m.id);
                }}
              >
                <X size={9} strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
      <span className="dock-separator" />
      <button
        className={clsx('dock-item', windows.some((w) => w.id === 'settings') && 'running')}
        data-tooltip="Paramètres"
        aria-label="Paramètres"
        onClick={() => activate('settings', { w: 880, h: 640 })}
      >
        <Settings size={20} strokeWidth={2.1} />
        <span className="dock-dot" aria-hidden="true" />
      </button>
    </nav>
  );
}
