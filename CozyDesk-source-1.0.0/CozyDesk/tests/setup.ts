/** Configuration des tests (jsdom + fake-indexeddb). */
import { beforeEach } from 'vitest';
import 'fake-indexeddb/auto';

// matchMedia absent de jsdom.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false
  })
});

// localStorage est fourni par jsdom ; on le vide entre les fichiers.
beforeEach(() => {
  window.localStorage.clear();
});
