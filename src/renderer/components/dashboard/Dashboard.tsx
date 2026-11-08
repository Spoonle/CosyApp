/**
 * Dashboard 2.0 — un bureau, pas une grille de cartes.
 * Le fond d'écran reste visible : widgets transparents par défaut, contrôles
 * révélés uniquement en mode édition.
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, LayoutGrid, Palette, Plus } from 'lucide-react';
import { GRID_COLS, useDashboardStore } from '@/stores/dashboard';
import { useSettingsStore, type WidgetAppearance } from '@/stores/settings';
import { useElementSize } from '@/hooks';
import { useWindowStore } from '@/stores/windows';
import { MODULE_MAP } from '@/modules/registry';
import { GlassButton } from '@/components/glass';
import { WidgetFrame } from './WidgetFrame';
import { WidgetLibrary } from './WidgetLibrary';
import { LayoutMenu } from './LayoutMenu';
import { APPEARANCES, WIDGET_TO_MODULE } from './widgetMeta';

const MIN_ROW_H = 88;
const MAX_ROW_H = 196;
const BASE_GAP = 14;

export function Dashboard(): React.ReactNode {
  const widgets = useDashboardStore((s) => s.widgets);
  const editMode = useDashboardStore((s) => s.editMode);
  const setEditMode = useDashboardStore((s) => s.setEditMode);
  const setAppearanceAll = useDashboardStore((s) => s.setAppearanceAll);
  const spacing = useSettingsStore((s) => s.workspace.widgets.spacing);

  const [dashRef, dashSize] = useElementSize<HTMLElement>();
  const [gridRef, gridSize] = useElementSize<HTMLDivElement>();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const gap = Math.round(BASE_GAP * spacing);
  const cellW = Math.max(48, (gridSize.width - gap * (GRID_COLS - 1)) / GRID_COLS);

  const visible = useMemo(() => widgets.filter((w) => !w.hidden), [widgets]);
  const rowsUsed = visible.reduce((m, w) => Math.max(m, w.y + w.h), 0);

  // La grille occupe l'espace disponible : les lignes s'étirent, sans trou sous les widgets.
  const availH = Math.max(200, dashSize.height);
  const rowH =
    rowsUsed > 0
      ? Math.max(MIN_ROW_H, Math.min(MAX_ROW_H, (availH - gap * (rowsUsed - 1)) / rowsUsed))
      : MIN_ROW_H;

  useEffect(() => {
    if (!editMode) {
      setLayoutOpen(false);
      setAppearanceOpen(false);
    }
  }, [editMode]);

  useEffect(() => {
    if (!editMode) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setEditMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editMode, setEditMode]);

  const openModuleFor = (type: string): void => {
    const moduleId = WIDGET_TO_MODULE[type as keyof typeof WIDGET_TO_MODULE];
    if (moduleId && MODULE_MAP[moduleId]) {
      useWindowStore.getState().open(moduleId, MODULE_MAP[moduleId].defaultSize);
    }
  };

  return (
    <main className="dashboard" data-edit={editMode} ref={dashRef}>
      {/* Accès discret à la bibliothèque, hors édition */}
      {!editMode && (
        <button
          className="workspace-add"
          aria-label="Ajouter un widget"
          data-tooltip="Personnaliser le bureau"
          onClick={() => setLibraryOpen(true)}
        >
          <Plus size={15} strokeWidth={2.2} />
        </button>
      )}

      <div className="dashboard-grid" ref={gridRef} style={{ height: rowsUsed * (rowH + gap) }}>
        {visible.map((w) => (
          <WidgetFrame
            key={w.id}
            widget={w}
            cellW={cellW}
            rowH={rowH}
            gap={gap}
            editMode={editMode}
            onOpenModule={openModuleFor}
          />
        ))}

        {visible.length === 0 && (
          <button className="workspace-empty" onClick={() => setLibraryOpen(true)}>
            <Plus size={16} />
            Votre bureau est vide — ajoutez un widget
          </button>
        )}
      </div>

      {/* Barre d'édition : uniquement en mode personnalisation */}
      {editMode && (
        <div className="workspace-toolbar glass-float anim-pop" role="toolbar" aria-label="Personnalisation">
          <GlassButton size="sm" variant="ghost" onClick={() => setLibraryOpen(true)}>
            <Plus size={14} /> Widget
          </GlassButton>

          <div className="workspace-toolbar-slot">
            <GlassButton
              size="sm"
              variant="ghost"
              data-active={layoutOpen || undefined}
              onClick={() => {
                setLayoutOpen((v) => !v);
                setAppearanceOpen(false);
              }}
            >
              <LayoutGrid size={14} /> Disposition
            </GlassButton>
            {layoutOpen && <LayoutMenu onClose={() => setLayoutOpen(false)} />}
          </div>

          <div className="workspace-toolbar-slot">
            <GlassButton
              size="sm"
              variant="ghost"
              data-active={appearanceOpen || undefined}
              onClick={() => {
                setAppearanceOpen((v) => !v);
                setLayoutOpen(false);
              }}
            >
              <Palette size={14} /> Apparence
            </GlassButton>
            {appearanceOpen && (
              <div className="appearance-pop glass-deep anim-pop" role="menu">
                {APPEARANCES.map((a) => (
                  <button
                    key={a.value}
                    className="appearance-option"
                    role="menuitem"
                    onClick={() => {
                      setAppearanceAll(a.value as WidgetAppearance);
                      setAppearanceOpen(false);
                    }}
                  >
                    <a.icon size={13} />
                    <span>{a.label}</span>
                    <small>{a.hint}</small>
                  </button>
                ))}
              </div>
            )}
          </div>

          <GlassButton size="sm" variant="primary" onClick={() => setEditMode(false)}>
            <Check size={14} /> Terminer
          </GlassButton>
        </div>
      )}

      {libraryOpen && <WidgetLibrary onClose={() => setLibraryOpen(false)} />}
    </main>
  );
}
