/**
 * Barre de titre 2.0 — fine, silencieuse.
 * Aucun logo, aucun libellé : uniquement le déplacement de la fenêtre et
 * les contrôles système essentiels.
 */
import { useEffect, useState } from 'react';
import { Minus, Moon, Square, Sun, X } from 'lucide-react';
import { useSettingsStore, resolvedMode } from '@/stores/settings';

export function TitleBar(): React.ReactNode {
  const [maximized, setMaximized] = useState(false);
  const mode = useSettingsStore((s) => s.mode);
  const setSettings = useSettingsStore((s) => s.setSettings);

  useEffect(() => {
    const api = window.cozydesk;
    if (!api) return;
    void api.win.isMaximized().then(setMaximized);
    return api.win.onMaximizedChange(setMaximized);
  }, []);

  const resolved = resolvedMode(mode);

  return (
    <header className="titlebar" role="banner">
      <div className="titlebar-drag" aria-hidden="true" />
      <div className="titlebar-controls">
        <button
          className="titlebar-soft"
          data-tooltip={resolved === 'dark' ? 'Mode clair' : 'Mode sombre'}
          aria-label={resolved === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          onClick={() => setSettings({ mode: resolved === 'dark' ? 'light' : 'dark' })}
        >
          {resolved === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
        </button>
        <button aria-label="Réduire la fenêtre" onClick={() => void window.cozydesk?.win.minimize()}>
          <Minus size={13} strokeWidth={2} />
        </button>
        <button
          aria-label="Agrandir la fenêtre"
          onClick={() => void window.cozydesk?.win.toggleMaximize()}
        >
          <Square size={maximized ? 9 : 10} />
        </button>
        <button
          aria-label="Fermer CozyDesk"
          className="close"
          onClick={() => void window.cozydesk?.win.close()}
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}

/** Conservé pour compatibilité avec les anciens écrans de chargement. */
export function TitleBarFallback(): React.ReactNode {
  return <div className="titlebar" aria-hidden="true" />;
}
