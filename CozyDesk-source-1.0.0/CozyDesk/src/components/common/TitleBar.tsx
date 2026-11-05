/** Barre de titre native (fenêtre sans cadre) : drag, contrôles fenêtre. */
import { useEffect, useState } from 'react';
import { Minus, Moon, Square, Sun, X } from 'lucide-react';
import { useSettingsStore, resolvedMode } from '@/stores/settings';
import { IconButton } from '@/components/glass';

export function TitleBar(): React.ReactNode {
  const [maximized, setMaximized] = useState(false);
  const mode = useSettingsStore((s) => s.mode);
  const setSettings = useSettingsStore((s) => s.setSettings);

  useEffect(() => {
    const api = window.cozydesk;
    if (!api) return;
    void api.win.isMaximized().then(setMaximized);
    const off = api.win.onMaximizedChange(setMaximized);
    return off;
  }, []);

  const resolved = resolvedMode(mode);

  return (
    <header className="titlebar" role="banner">
      <div className="titlebar-brand">
        <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
          <defs>
            <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent-h) var(--accent-s) 72%)" />
              <stop offset="100%" stopColor="hsl(calc(var(--accent-h) + 40) 70% 58%)" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#logo-g)" />
          <circle cx="24" cy="21" r="9.5" fill="rgb(255 255 255 / 0.95)" />
          <circle cx="29.5" cy="17.5" r="7.5" fill="url(#logo-g)" />
          <circle cx="35" cy="33" r="1.8" fill="rgb(255 255 255 / 0.9)" />
          <circle cx="14" cy="33" r="1.3" fill="rgb(255 255 255 / 0.75)" />
          <circle cx="18.5" cy="37" r="1" fill="rgb(255 255 255 / 0.6)" />
        </svg>
        <span>CozyDesk</span>
      </div>

      <div className="titlebar-controls">
        <button
          className="titlebar-mode"
          data-tooltip={resolved === 'dark' ? 'Passer en clair' : 'Passer en sombre'}
          aria-label={resolved === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          onClick={() => setSettings({ mode: resolved === 'dark' ? 'light' : 'dark' })}
        >
          {resolved === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>
        <button aria-label="Réduire la fenêtre" onClick={() => void window.cozydesk?.win.minimize()}>
          <Minus size={14} />
        </button>
        <button
          aria-label="Agrandir la fenêtre"
          onClick={() => void window.cozydesk?.win.toggleMaximize()}
        >
          <Square size={maximized ? 10 : 11} />
        </button>
        <button
          aria-label="Fermer CozyDesk"
          className="close"
          onClick={() => void window.cozydesk?.win.close()}
        >
          <X size={15} />
        </button>
      </div>
    </header>
  );
}

export function TitleBarFallback(): React.ReactNode {
  return <IconButton label="Chargement" />;
}
