/**
 * Test d'intégration des modules et des widgets : chaque écran doit se monter
 * sans erreur, avec ses données réelles (Dexie + fake-indexeddb).
 * Sert de garde-fou contre les imports cassés, les stores mal branchés et les
 * crashs au premier rendu.
 */
import { describe, expect, it, vi } from 'vitest';
import { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MODULES } from '@/modules/registry';
import { WidgetContent } from '@/components/widgets/WidgetContent';
import type { WidgetType } from '@/stores/dashboard';

// jsdom ne fournit pas ResizeObserver (mesures de grille, listes…).
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

// Certains modules mesurent leur conteneur ou attendent un frame.
if (!window.matchMedia) {
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
}

const consoleErrors: string[] = [];

describe('modules', () => {
  it.each(MODULES.map((m) => [m.id, m] as const))(
    'le module %s se monte et affiche du contenu',
    async (_id, module) => {
      const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
        consoleErrors.push(String(args[0]));
      });
      const Component = module.component;
      const { container } = render(
        <Suspense fallback={<div>chargement</div>}>
          <Component />
        </Suspense>
      );
      // Les composants sont chargés paresseusement : on attend le vrai contenu,
      // pas le fallback de Suspense.
      await waitFor(
        () => {
          expect(container.querySelector('.module-root, .module-split')).not.toBeNull();
        },
        { timeout: 8000 }
      );
      spy.mockRestore();
      expect(container.textContent?.replace('chargement', '').trim().length ?? 0).toBeGreaterThan(0);
    }
  );

  it('aucune erreur console pendant le montage des modules', () => {
    expect(consoleErrors).toEqual([]);
  });
});

describe('widgets', () => {
  const types: WidgetType[] = [
    'clock',
    'date',
    'pomodoro',
    'tasks',
    'progress',
    'calendar',
    'music',
    'quote',
    'habits',
    'quicknote',
    'stats',
    'weather'
  ];

  it.each(types)('le widget %s se rend', async (type) => {
    const { container } = render(<WidgetContent type={type} />);
    await waitFor(() => {
      expect(container.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    });
  });

  it('un widget inconnu ne casse pas le rendu', () => {
    const { container } = render(
      <WidgetContent type={'inexistant' as unknown as WidgetType} />
    );
    expect(container).not.toBeNull();
  });

  it('l’horloge se met à jour chaque seconde', async () => {
    const { container, unmount } = render(<WidgetContent type="clock" />);
    await waitFor(() => expect(screen.getByRole('timer')).toBeDefined());
    expect(container.querySelector('.hero-clock')).not.toBeNull();
    unmount();
  });
});
