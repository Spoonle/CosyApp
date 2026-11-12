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

// Polyfill localStorage pour Node 22+ (où l'API native expérimentale masque jsdom sans --localstorage-file).
function createLocalStorageMock(): Storage {
  let store: Record<string, string> = {};
  const storage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    }
  };
  return new Proxy(storage as unknown as Storage, {
    get(target, prop: string) {
      if (prop in target) {
        return (target as Record<string, unknown>)[prop];
      }
      return store[prop];
    },
    set(_target, prop: string, value: string) {
      store[prop] = String(value);
      return true;
    },
    deleteProperty(_target, prop: string) {
      delete store[prop];
      return true;
    },
    ownKeys() {
      return Object.keys(store);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop === 'string' && prop in store) {
        return {
          value: store[prop],
          enumerable: true,
          writable: true,
          configurable: true
        };
      }
      return undefined;
    }
  });
}

try {
  if (!window.localStorage || typeof window.localStorage.clear !== 'function') {
    const mockStorage = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });
  }
} catch {
  const mockStorage = createLocalStorageMock();
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
    configurable: true
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
    configurable: true
  });
}

// localStorage est fourni par jsdom ; on le vide entre les fichiers.
beforeEach(() => {
  window.localStorage.clear();
});
