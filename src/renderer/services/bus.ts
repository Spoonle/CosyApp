/** Bus d'événements interne (communication inter-modules, typé). */

export type BusEventType =
  | 'tasks:create'
  | 'notes:create'
  | 'journal:open-today'
  | 'study:review-due'
  | 'pomodoro:focus';

const PREFIX = 'cozydesk:';

export function emitBus(type: BusEventType): void {
  window.dispatchEvent(new CustomEvent(PREFIX + type));
}

export function onBus(type: BusEventType, handler: () => void): () => void {
  const listener = (): void => handler();
  window.addEventListener(PREFIX + type, listener);
  return () => window.removeEventListener(PREFIX + type, listener);
}
