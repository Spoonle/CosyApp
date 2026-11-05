/** Dashboard : grille de widgets déplaçables et redimensionnables. */
import { useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Check, LayoutGrid, Plus, RotateCcw, X } from 'lucide-react';
import {
  GRID_COLS,
  GRID_GAP,
  WIDGET_SIZES,
  useDashboardStore,
  type WidgetLayout,
  type WidgetType
} from '@/stores/dashboard';
import { useElementSize } from '@/hooks';
import { useWindowStore } from '@/stores/windows';
import { MODULE_MAP } from '@/modules/registry';
import { GlassButton } from '@/components/glass';
import { WidgetContent } from '@/components/widgets/WidgetContent';

const MIN_ROW_H = 92;
const MAX_ROW_H = 168;

export function Dashboard(): React.ReactNode {
  const widgets = useDashboardStore((s) => s.widgets);
  const editMode = useDashboardStore((s) => s.editMode);
  const setEditMode = useDashboardStore((s) => s.setEditMode);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const resetDefault = useDashboardStore((s) => s.resetDefault);
  const open = useWindowStore((s) => s.open);

  const [dashRef, dashSize] = useElementSize<HTMLElement>();
  const [gridRef, gridSize] = useElementSize<HTMLDivElement>();
  const cellW = Math.max(60, (gridSize.width - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);

  const visible = useMemo(() => widgets.filter((w) => !w.hidden), [widgets]);
  const rowsUsed = visible.reduce((m, w) => Math.max(m, w.y + w.h), 0);

  // Hauteur de ligne dynamique : la grille remplit l'espace disponible
  // (entre 92 et 168 px par ligne) — pas de grande zone vide sous les widgets.
  const availH = Math.max(240, dashSize.height - 18 - 26);
  const rowH =
    rowsUsed > 0
      ? Math.max(
          MIN_ROW_H,
          Math.min(MAX_ROW_H, (availH - GRID_GAP * (rowsUsed - 1)) / rowsUsed)
        )
      : MIN_ROW_H;

  const openModuleFor = (type: string): void => {
    const moduleId = WIDGET_TO_MODULE[type];
    if (moduleId && MODULE_MAP[moduleId]) {
      open(moduleId, MODULE_MAP[moduleId].defaultSize);
    }
  };

  return (
    <main className="dashboard" data-edit={editMode} ref={dashRef}>
      {editMode && (
        <div className="dashboard-toolbar glass-float anim-pop">
          <AddWidgetMenu onAdd={addWidget} />
          <GlassButton
            size="sm"
            variant="ghost"
            data-tooltip="Disposition par défaut"
            onClick={() => resetDefault()}
          >
            <RotateCcw size={14} /> Réinitialiser
          </GlassButton>
          <GlassButton size="sm" variant="primary" onClick={() => setEditMode(false)}>
            <Check size={14} /> Terminer
          </GlassButton>
        </div>
      )}

      <div className="dashboard-grid" ref={gridRef} style={{ height: rowsUsed * (rowH + GRID_GAP) }}>
        {visible.map((w) => (
          <WidgetShell
            key={w.id}
            widget={w}
            cellW={cellW}
            rowH={rowH}
            editMode={editMode}
            onOpenModule={openModuleFor}
          />
        ))}
      </div>
    </main>
  );
}

const WIDGET_TO_MODULE: Record<string, string> = {
  clock: 'settings',
  date: 'settings',
  pomodoro: 'pomodoro',
  tasks: 'tasks',
  progress: 'stats',
  calendar: 'calendar',
  music: 'music',
  quote: 'settings',
  habits: 'habits',
  quicknote: 'notes',
  stats: 'stats',
  weather: 'settings'
};

/* ---------- Enveloppe d'un widget (position, drag, resize) ---------- */

function WidgetShell({
  widget,
  cellW,
  rowH,
  editMode,
  onOpenModule
}: {
  widget: WidgetLayout;
  cellW: number;
  rowH: number;
  editMode: boolean;
  onOpenModule: (type: string) => void;
}) {
  const moveWidget = useDashboardStore((s) => s.moveWidget);
  const resizeWidget = useDashboardStore((s) => s.resizeWidget);
  const removeWidget = useDashboardStore((s) => s.removeWidget);

  const left = widget.x * (cellW + GRID_GAP);
  const top = widget.y * (rowH + GRID_GAP);
  const width = widget.w * cellW + (widget.w - 1) * GRID_GAP;
  const height = widget.h * rowH + (widget.h - 1) * GRID_GAP;

  const onDragStart = (e: ReactPointerEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = widget.x;
    const origY = widget.y;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent): void => {
      const dx = Math.round((ev.clientX - startX) / (cellW + GRID_GAP));
      const dy = Math.round((ev.clientY - startY) / (rowH + GRID_GAP));
      const nx = Math.max(0, Math.min(GRID_COLS - widget.w, origX + dx));
      const ny = Math.max(0, origY + dy);
      if (nx !== widget.x || ny !== widget.y) moveWidget(widget.id, nx, ny);
    };
    const onUp = (): void => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  };

  const onResizeStart = (e: ReactPointerEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = widget.w;
    const origH = widget.h;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent): void => {
      const dw = Math.round((ev.clientX - startX) / (cellW + GRID_GAP));
      const dh = Math.round((ev.clientY - startY) / (rowH + GRID_GAP));
      resizeWidget(widget.id, origW + dw, origH + dh);
    };
    const onUp = (): void => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  };

  return (
    <section
      className="widget glass"
      style={{ left, top, width, height }}
      aria-label={WIDGET_SIZES[widget.type].label}
    >
      {editMode && <div className="widget-drag-handle" onPointerDown={onDragStart} />}
      {editMode && (
        <button
          className="widget-remove"
          aria-label="Retirer le widget"
          onClick={() => removeWidget(widget.id)}
        >
          <X size={12} strokeWidth={2.6} />
        </button>
      )}
      <div className="widget-body" onDoubleClick={() => !editMode && onOpenModule(widget.type)}>
        <WidgetContent type={widget.type} />
      </div>
      {editMode && (
        <div className="widget-resize-handle" onPointerDown={onResizeStart}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M13 5 5 13M13 10 10 13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </section>
  );
}

/* ---------- Menu d'ajout de widgets ---------- */
function AddWidgetMenu({ onAdd }: { onAdd: (type: WidgetType) => void }) {
  const [openMenu, setOpenMenu] = useState(false);
  const types = Object.entries(WIDGET_SIZES) as [
    WidgetType,
    (typeof WIDGET_SIZES)[WidgetType]
  ][];
  return (
    <div style={{ position: 'relative' }}>
      <GlassButton size="sm" variant="ghost" onClick={() => setOpenMenu((v) => !v)}>
        <Plus size={14} /> Widget
      </GlassButton>
      {openMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 690 }}
            onClick={() => setOpenMenu(false)}
          />
          <div
            className="menu glass-deep anim-pop"
            style={{ top: 'calc(100% + 8px)', left: 0, zIndex: 700 }}
          >
            {types.map(([type, def]) => (
              <button
                key={type}
                className="menu-item"
                onClick={() => {
                  onAdd(type);
                  setOpenMenu(false);
                }}
              >
                <LayoutGrid size={14} />
                {def.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
