/**
 * Dock 2.0 — un lanceur discret, pas une barre d'outils.
 * Icônes réduites, survol sobre, infobulles, indicateur d'activité,
 * auto-masquage optionnel, position configurable, raccourcis personnalisables.
 * Tous les modules restent accessibles via le lanceur et la palette.
 */
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { Grid2x2, Search, Settings } from 'lucide-react';
import { MODULE_MAP, MODULES } from '@/modules/registry';
import { useWindowStore } from '@/stores/windows';
import { usePaletteStore } from '@/stores/palette';
import { useSettingsStore } from '@/stores/settings';
import { DockLauncher } from './DockLauncher';

export function Dock(): React.ReactNode {
  const windows = useWindowStore((s) => s.windows);
  const close = useWindowStore((s) => s.close);
  const restore = useWindowStore((s) => s.restore);
  const openPalette = usePaletteStore((s) => s.openPalette);
  const dock = useSettingsStore((s) => s.workspace.dock);

  const [launcherOpen, setLauncherOpen] = useState(false);
  const [revealed, setRevealed] = useState(!dock.autoHide);

  // L'auto-masquage se réévalue quand le réglage change.
  useEffect(() => {
    setRevealed(!dock.autoHide);
  }, [dock.autoHide, dock.position, dock.visible]);

  const shortcuts = useMemo(() => {
    const ids = dock.shortcuts.filter((id) => MODULE_MAP[id] !== undefined);
    const list = ids.map((id) => MODULE_MAP[id]);
    return list.length > 0 ? list : MODULES.slice(0, 6);
  }, [dock.shortcuts]);

  if (!dock.visible) return null;

  const activate = (id: string): void => {
    const size = MODULE_MAP[id].defaultSize;
    const existing = useWindowStore.getState().windows.find((w) => w.id === id);
    if (existing && !existing.closing) {
      if (existing.minimized) restore(id);
      else close(id);
    } else {
      useWindowStore.getState().open(id, size);
    }
  };

  const hidden = dock.autoHide && !revealed;

  return (
    <>
      {dock.autoHide && <div className="dock-hot" data-position={dock.position} />}
      <nav
        className={clsx('dock', hidden && 'is-hidden')}
        data-position={dock.position}
        data-autohide={dock.autoHide || undefined}
        data-revealed={revealed || undefined}
        aria-label="Dock CozyDesk"
        onMouseEnter={() => setRevealed(true)}
        onMouseLeave={() => dock.autoHide && setRevealed(false)}
        onFocusCapture={() => setRevealed(true)}
      >
        <button
          className="dock-item dock-accent"
          data-tooltip="Rechercher — Ctrl K"
          aria-label="Palette de commandes"
          onClick={() => openPalette(true)}
        >
          <Search size={17} strokeWidth={2.1} />
        </button>

        <button
          className="dock-item"
          data-tooltip="Tous les modules"
          aria-label="Tous les modules"
          onClick={() => setLauncherOpen(true)}
        >
          <Grid2x2 size={17} strokeWidth={2} />
        </button>

        <span className="dock-separator" aria-hidden="true" />

        {shortcuts.map((m) => {
          const win = windows.find((w) => w.id === m.id && !w.closing);
          const running = win !== undefined;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              className={clsx('dock-item', running && 'running')}
              data-active={running && !win?.minimized ? true : undefined}
              data-tooltip={m.title}
              aria-label={m.title}
              aria-pressed={running}
              onClick={() => activate(m.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (running) close(m.id);
              }}
            >
              <Icon size={18} strokeWidth={1.9} />
              <span className="dock-dot" aria-hidden="true" />
            </button>
          );
        })}

        <span className="dock-separator" aria-hidden="true" />

        <button
          className={clsx('dock-item', windows.some((w) => w.id === 'settings') && 'running')}
          data-tooltip="Paramètres"
          aria-label="Paramètres"
          onClick={() => activate('settings')}
        >
          <Settings size={17} strokeWidth={1.9} />
          <span className="dock-dot" aria-hidden="true" />
        </button>
      </nav>

      {launcherOpen && <DockLauncher onClose={() => setLauncherOpen(false)} />}
    </>
  );
}
