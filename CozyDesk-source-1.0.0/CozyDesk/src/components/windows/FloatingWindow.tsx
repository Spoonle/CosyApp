/** Fenêtre flottante : déplacement, redimensionnement 8 poignées, snap, focus. */
import clsx from 'clsx';
import { Suspense, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { Maximize2, Minus, Minimize2, Square, X } from 'lucide-react';
import { MODULE_MAP } from '@/modules/registry';
import { useWindowStore, workspaceBounds, type SnapZone } from '@/stores/windows';
import { EmptyState } from '@/components/glass';

const SNAP_EDGE = 26;
const TITLE_H = 36;

export function FloatingWindow({ windowId }: { windowId: string }) {
  const win = useWindowStore((s) => s.windows.find((w) => w.id === windowId));
  const focus = useWindowStore((s) => s.focus);
  const close = useWindowStore((s) => s.close);
  const actuallyRemove = useWindowStore((s) => s.actuallyRemove);
  const minimize = useWindowStore((s) => s.minimize);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const setRect = useWindowStore((s) => s.setRect);
  const snap = useWindowStore((s) => s.snap);
  const setSnapPreview = useWindowStore((s) => s.setSnapPreview);

  const isActive = useWindowStore((s) => {
    const me = s.windows.find((w) => w.id === windowId);
    if (!me) return false;
    return s.windows.every((w) => w.id === windowId || w.z <= me.z || w.minimized || w.closing);
  });

  const module = MODULE_MAP[windowId];
  const ref = useRef<HTMLDivElement | null>(null);

  // Fin d'animation de fermeture → suppression réelle.
  useEffect(() => {
    if (win?.closing) {
      const id = window.setTimeout(() => actuallyRemove(windowId), 190);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [win?.closing, windowId, actuallyRemove]);

  if (!win || !module) return null;
  const { icon: Icon, component: Component } = module;

  /* ---------- Déplacement ---------- */

  const onTitlePointerDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if ((e.target as HTMLElement).closest('button')) return;
    focus(windowId);
    if (win.maximized) return; // pas de déplacement quand maximisée
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = win.x;
    const origY = win.y;
    let zone: SnapZone | null = null;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent): void => {
      const nx = origX + (ev.clientX - startX);
      const ny = Math.max(workspaceBounds().y - TITLE_H / 2, origY + (ev.clientY - startY));
      setRect(windowId, { x: nx, y: ny });
      const bounds = workspaceBounds();
      if (ev.clientY <= bounds.y + 6) zone = 'top';
      else if (ev.clientX <= SNAP_EDGE) zone = 'left';
      else if (ev.clientX >= window.innerWidth - SNAP_EDGE) zone = 'right';
      else zone = null;
      if (zone) {
        setSnapPreview({
          zone,
          rect:
            zone === 'top'
              ? bounds
              : {
                  x: zone === 'left' ? bounds.x : bounds.x + Math.round(bounds.w / 2) + 6,
                  y: bounds.y,
                  w: Math.round(bounds.w / 2) - 6,
                  h: bounds.h
                }
        });
      } else {
        setSnapPreview(null);
      }
    };
    const onUp = (): void => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      setSnapPreview(null);
      if (zone) snap(windowId, zone);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  };

  /* ---------- Redimensionnement ---------- */

  const startResize = (dir: string) => (e: ReactPointerEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    focus(windowId);
    if (win.maximized) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { x: win.x, y: win.y, w: win.w, h: win.h };
    const minW = module.minSize.w;
    const minH = module.minSize.h;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent): void => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const patch: { x?: number; y?: number; w?: number; h?: number } = {};
      if (dir.includes('e')) patch.w = Math.max(minW, orig.w + dx);
      if (dir.includes('s')) patch.h = Math.max(minH, orig.h + dy);
      if (dir.includes('w')) {
        const w = Math.max(minW, orig.w - dx);
        patch.w = w;
        patch.x = orig.x + (orig.w - w);
      }
      if (dir.includes('n')) {
        const h = Math.max(minH, orig.h - dy);
        patch.h = h;
        patch.y = Math.max(workspaceBounds().y - TITLE_H / 2, orig.y + (orig.h - h));
      }
      setRect(windowId, patch);
    };
    const onUp = (): void => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  };

  const handles: { dir: string; style: React.CSSProperties; cursor: string }[] = [
    { dir: 'n', style: { top: -3, left: 10, right: 10, height: 7 }, cursor: 'ns-resize' },
    { dir: 's', style: { bottom: -3, left: 10, right: 10, height: 7 }, cursor: 'ns-resize' },
    { dir: 'e', style: { right: -3, top: 10, bottom: 10, width: 7 }, cursor: 'ew-resize' },
    { dir: 'w', style: { left: -3, top: 10, bottom: 10, width: 7 }, cursor: 'ew-resize' },
    { dir: 'ne', style: { top: -4, right: -4, width: 14, height: 14 }, cursor: 'nesw-resize' },
    { dir: 'nw', style: { top: -4, left: -4, width: 14, height: 14 }, cursor: 'nwse-resize' },
    { dir: 'se', style: { bottom: -4, right: -4, width: 16, height: 16 }, cursor: 'nwse-resize' },
    { dir: 'sw', style: { bottom: -4, left: -4, width: 14, height: 14 }, cursor: 'nesw-resize' }
  ];

  return (
    <div
      ref={ref}
      className={clsx('floating-window glass-float', win.closing && 'is-closing')}
      data-active={isActive || undefined}
      data-maximized={win.maximized || undefined}
      data-minimized={win.minimized || undefined}
      style={{
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: win.z,
        display: win.minimized ? 'none' : undefined
      }}
      onPointerDown={() => focus(windowId)}
      role="dialog"
      aria-label={module.title}
    >
      <div
        className="fw-title"
        onPointerDown={onTitlePointerDown}
        onDoubleClick={() => toggleMaximize(windowId)}
      >
        <span className="fw-title-icon">
          <Icon size={15} strokeWidth={2.2} />
        </span>
        <span className="fw-title-text">{module.title}</span>
        <span className="fw-controls">
          <button aria-label="Réduire" data-tooltip="Réduire" onClick={() => minimize(windowId)}>
            <Minus size={13} strokeWidth={2} />
          </button>
          <button
            aria-label="Agrandir"
            data-tooltip={win.maximized ? 'Restaurer' : 'Agrandir'}
            onClick={() => toggleMaximize(windowId)}
          >
            {win.maximized ? <Minimize2 size={11} /> : <Square size={10} />}
          </button>
          <button aria-label="Fermer" data-tooltip="Fermer" className="fw-close" onClick={() => close(windowId)}>
            <X size={13} strokeWidth={2} />
          </button>
        </span>
      </div>
      <div className="fw-body">
        <Suspense
          fallback={
            <div className="fw-loading">
              <Maximize2 size={18} className="spin" />
            </div>
          }
        >
          <Component />
        </Suspense>
      </div>

      {!win.maximized &&
        handles.map((h) => (
          <div
            key={h.dir}
            className="fw-resize"
            style={{ ...h.style, cursor: h.cursor }}
            onPointerDown={startResize(h.dir)}
          />
        ))}
    </div>
  );
}

/** Zone de survol pendant un drag vers un bord (aperçu de snap). */
export function SnapPreview(): React.ReactNode {
  const preview = useWindowStore((s) => s.snapPreview);
  if (!preview) return null;
  return (
    <div
      className="snap-preview"
      style={{
        left: preview.rect.x,
        top: preview.rect.y,
        width: preview.rect.w,
        height: preview.rect.h
      }}
    />
  );
}

export function WindowLoadError({ message }: { message: string }) {
  return <EmptyState icon={<X size={30} />} title="Module indisponible" children={message} />;
}
