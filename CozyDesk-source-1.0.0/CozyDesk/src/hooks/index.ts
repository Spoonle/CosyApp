/** Hooks partagés. */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** Horloge réactive : re-rend le composant à intervalle régulier. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Raccourci clavier global (ex. useHotkey('mod+k', open)). */
export function useHotkey(combo: string, handler: () => void, enabled = true): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent): void => {
      const parts = combo.toLowerCase().split('+');
      const key = parts[parts.length - 1];
      const needMod = parts.includes('mod') || parts.includes('ctrl') || parts.includes('cmd');
      const needShift = parts.includes('shift');
      const needAlt = parts.includes('alt');
      const mod = e.ctrlKey || e.metaKey;
      if (
        e.key.toLowerCase() === key &&
        mod === needMod &&
        e.shiftKey === needShift &&
        e.altKey === needAlt
      ) {
        e.preventDefault();
        ref.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo, enabled]);
}

/** Visibilité du document (pour mettre en pause les vidéos masquées). */
export function useDocumentVisible(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      document.addEventListener('visibilitychange', onChange);
      return () => document.removeEventListener('visibilitychange', onChange);
    },
    () => document.visibilityState === 'visible',
    () => true
  );
}

/** Valeur débounce (recherche, sauvegarde auto…). */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/** Dimensions observées d'un élément. */
export function useElementSize<T extends HTMLElement>(): [
  React.RefObject<T>,
  { width: number; height: number }
] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size];
}

/** Titre du document quand une fenêtre Electron est prête. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
