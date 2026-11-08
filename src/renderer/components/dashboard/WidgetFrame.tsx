/**
 * Enveloppe d'un widget : position dans la grille, déplacement, redimensionnement,
 * apparence individuelle et contrôles d'édition (visibles uniquement en mode édition).
 */
import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { AlignJustify, EyeOff, Palette, X } from 'lucide-react';
import { GRID_COLS, useDashboardStore, type WidgetLayout } from '@/stores/dashboard';
import { useSettingsStore, type WidgetAppearance } from '@/stores/settings';
import { WidgetContent } from '@/components/widgets/WidgetContent';
import { APPEARANCE_ORDER, WIDGET_ICONS } from './widgetMeta';

const APPEARANCE_LABEL: Record<WidgetAppearance, string> = {
  transparent: 'Transparent',
  subtle: 'Subtil',
  glass: 'Verre'
};

export function WidgetFrame({
  widget,
  cellW,
  rowH,
  gap,
  editMode,
  onOpenModule
}: {
  widget: WidgetLayout;
  cellW: number;
  rowH: number;
  gap: number;
  editMode: boolean;
  onOpenModule: (id: string) => void;
}): React.ReactNode {
  const moveWidget = useDashboardStore((s) => s.moveWidget);
  const resizeWidget = useDashboardStore((s) => s.resizeWidget);
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const toggleHidden = useDashboardStore((s) => s.toggleHidden);
  const setAppearance = useDashboardStore((s) => s.setAppearance);
  const toggleCompact = useDashboardStore((s) => s.toggleCompact);
  const defaultAppearance = useSettingsStore((s) => s.workspace.widgets.appearance);
  const ref = useRef<HTMLElement | null>(null);

  const appearance = widget.appearance ?? defaultAppearance;
  const Icon = WIDGET_ICONS[widget.type];
  const compact = widget.compact === true;

  const left = widget.x * (cellW + gap);
  const top = widget.y * (rowH + gap);
  const width = widget.w * cellW + (widget.w - 1) * gap;
  const height = widget.h * rowH + (widget.h - 1) * gap;

  /* ---------- Déplacement (mode édition uniquement) ---------- */

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>): void => {
    if (!editMode) return;
    if ((e.target as HTMLElement).closest('button')) return;
    const el = ref.current;
    if (!el) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = widget.x;
    const origY = widget.y;
    let lastX = origX;
    let lastY = origY;
    el.setPointerCapture(e.pointerId);
    el.dataset.dragging = 'true';

    const onMove = (ev: PointerEvent): void => {
      const dx = Math.round((ev.clientX - startX) / (cellW + gap));
      const dy = Math.round((ev.clientY - startY) / (rowH + gap));
      const nx = Math.max(0, Math.min(GRID_COLS - widget.w, origX + dx));
      const ny = Math.max(0, origY + dy);
      if (nx !== lastX || ny !== lastY) {
        lastX = nx;
        lastY = ny;
        moveWidget(widget.id, nx, ny);
      }
    };
    const onUp = (): void => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      delete el.dataset.dragging;
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  };

  /* ---------- Redimensionnement ---------- */

  const onResizeDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    e.preventDefault();
    const el = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = widget.w;
    const origH = widget.h;
    el.setPointerCapture(e.pointerId);
    el.dataset.resizing = 'true';

    const onMove = (ev: PointerEvent): void => {
      const dw = Math.round((ev.clientX - startX) / (cellW + gap));
      const dh = Math.round((ev.clientY - startY) / (rowH + gap));
      resizeWidget(widget.id, origW + dw, origH + dh);
    };
    const onUp = (): void => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      delete el.dataset.resizing;
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  };

  const cycleAppearance = (): void => {
    const i = APPEARANCE_ORDER.indexOf(appearance);
    setAppearance(widget.id, APPEARANCE_ORDER[(i + 1) % APPEARANCE_ORDER.length]);
  };

  return (
    <section
      ref={ref}
      className="widget"
      data-type={widget.type}
      data-appearance={appearance}
      data-compact={compact || undefined}
      data-edit={editMode || undefined}
      style={{ left, top, width, height }}
      onPointerDown={onPointerDown}
      onDoubleClick={() => {
        if (!editMode) onOpenModule(widget.type);
      }}
      aria-label={widget.type}
    >
      {editMode && (
        <div className="widget-tools">
          <button
            type="button"
            className="widget-tool"
            data-tooltip={`Apparence : ${APPEARANCE_LABEL[appearance]}`}
            aria-label={`Changer l'apparence (${APPEARANCE_LABEL[appearance]})`}
            onClick={cycleAppearance}
          >
            <Palette size={12} />
          </button>
          <button
            type="button"
            className="widget-tool"
            data-active={compact || undefined}
            data-tooltip={compact ? 'Présentation normale' : 'Présentation compacte'}
            aria-label="Basculer la présentation compacte"
            onClick={() => toggleCompact(widget.id)}
          >
            <AlignJustify size={12} />
          </button>
          <button
            type="button"
            className="widget-tool"
            data-tooltip="Masquer le widget"
            aria-label="Masquer le widget"
            onClick={() => toggleHidden(widget.id)}
          >
            <EyeOff size={12} />
          </button>
          <button
            type="button"
            className="widget-tool widget-tool-danger"
            data-tooltip="Retirer du bureau"
            aria-label="Retirer le widget"
            onClick={() => removeWidget(widget.id)}
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="widget-body">
        {editMode && (
          <span className="widget-tag" aria-hidden="true">
            <Icon size={11} /> {widget.type}
          </span>
        )}
        <WidgetContent type={widget.type} />
      </div>

      {editMode && (
        <div
          className="widget-resize"
          onPointerDown={onResizeDown}
          role="presentation"
          aria-hidden="true"
        >
          <svg width="12" height="12" viewBox="0 0 14 14">
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
