/**
 * Bibliothèque de widgets — un panneau discret pour ajouter, révéler ou
 * changer l'apparence par défaut. Aucun contrôle n'est visible hors édition.
 */
import { useEffect } from 'react';
import { Plus, RotateCcw, X } from 'lucide-react';
import { GlassButton, Segmented } from '@/components/glass';
import {
  WIDGET_SIZES,
  useDashboardStore,
  type WidgetType
} from '@/stores/dashboard';
import { useSettingsStore, type WidgetAppearance } from '@/stores/settings';
import { APPEARANCES, WIDGET_ICONS } from './widgetMeta';

export function WidgetLibrary({ onClose }: { onClose: () => void }): React.ReactNode {
  const addWidget = useDashboardStore((s) => s.addWidget);
  const toggleHidden = useDashboardStore((s) => s.toggleHidden);
  const widgets = useDashboardStore((s) => s.widgets);
  const preset = useDashboardStore((s) => s.applyPreset);
  const appearance = useSettingsStore((s) => s.workspace.widgets.appearance);
  const setWorkspace = useSettingsStore((s) => s.setWorkspace);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const types = Object.keys(WIDGET_SIZES) as WidgetType[];
  const hidden = widgets.filter((w) => w.hidden);

  return (
    <div className="library-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="library-panel glass-float anim-pop" role="dialog" aria-label="Bibliothèque de widgets">
        <header className="library-head">
          <div>
            <h3>Widgets</h3>
            <p className="text-muted">Choisissez ce qui vit sur votre bureau.</p>
          </div>
          <button className="library-close" onClick={onClose} aria-label="Fermer">
            <X size={15} />
          </button>
        </header>

        <div className="library-grid">
          {types.map((type) => {
            const Icon = WIDGET_ICONS[type];
            const def = WIDGET_SIZES[type];
            return (
              <button
                key={type}
                className="library-item"
                onClick={() => {
                  addWidget(type);
                  onClose();
                }}
              >
                <span className="library-item-icon">
                  <Icon size={16} strokeWidth={1.9} />
                </span>
                <span className="library-item-text">
                  <span>{def.label}</span>
                  <small>{def.hint}</small>
                </span>
                <Plus size={14} className="library-item-plus" />
              </button>
            );
          })}
        </div>

        {hidden.length > 0 && (
          <section className="library-section">
            <h4>Masqués</h4>
            <div className="library-chips">
              {hidden.map((w) => (
                <button key={w.id} className="library-chip" onClick={() => toggleHidden(w.id)}>
                  {WIDGET_SIZES[w.type].label}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="library-section">
          <h4>Apparence des widgets</h4>
          <Segmented<WidgetAppearance>
            value={appearance}
            options={APPEARANCES.map((a) => ({ value: a.value, label: a.label }))}
            onChange={(value) => setWorkspace({ widgets: { appearance: value } })}
          />
        </section>

        <footer className="library-foot">
          <GlassButton size="sm" variant="ghost" onClick={() => preset('minimal')}>
            <RotateCcw size={13} /> Bureau minimal
          </GlassButton>
          <GlassButton size="sm" variant="primary" onClick={onClose}>
            Terminé
          </GlassButton>
        </footer>
      </div>
    </div>
  );
}
