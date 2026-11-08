/** Couche des fenêtres flottantes + calque dashboard. */
import { FloatingWindow, SnapPreview } from './FloatingWindow';
import { useWindowStore, workspaceBounds } from '@/stores/windows';
import { MODULES } from '@/modules/registry';
import { useEffect } from 'react';

export function WindowLayer(): React.ReactNode {
  const windows = useWindowStore((s) => s.windows);
  const setRect = useWindowStore((s) => s.setRect);

  // Les fenêtres maximisées suivent la taille de l'écran.
  useEffect(() => {
    const onResize = (): void => {
      const bounds = workspaceBounds();
      for (const w of useWindowStore.getState().windows) {
        if (w.maximized) {
          setRect(w.id, { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h });
        }
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [setRect]);

  return (
    <>
      {windows.map((w) => (
        <FloatingWindow key={w.id} windowId={w.id} />
      ))}
      <SnapPreview />
      {/* Compteur implicite : le module est listé pour le typage de registry */}
      <span hidden data-modules={MODULES.length} />
    </>
  );
}
