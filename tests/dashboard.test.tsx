/** Test DOM du nouveau bureau : rendu, mode édition, bibliothèque de widgets. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { useDashboardStore } from '@/stores/dashboard';
import { DEFAULT_WORKSPACE, useSettingsStore } from '@/stores/settings';

// jsdom ne fournit pas ResizeObserver (utilisé pour mesurer la grille).
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

beforeEach(() => {
  useSettingsStore.setState({ workspace: DEFAULT_WORKSPACE, reducedMotion: false });
  useDashboardStore.getState().applyPreset('minimal');
  useDashboardStore.setState({ editMode: false, savedLayouts: [] });
});

describe('bureau 2.0', () => {
  it('rend les trois widgets par défaut, sans contrôles d’édition', () => {
    const { container } = render(<Dashboard />);
    expect(container.querySelectorAll('.widget')).toHaveLength(3);
    expect(container.querySelector('.workspace-toolbar')).toBeNull();
    // Les widgets sont transparents par défaut.
    const first = container.querySelector('.widget');
    expect(first?.getAttribute('data-appearance')).toBe('transparent');
  });

  it('affiche l’horloge comme élément principal', () => {
    const { container } = render(<Dashboard />);
    expect(container.querySelector('.hero-clock')).not.toBeNull();
    expect(screen.getByRole('timer')).toBeDefined();
  });

  it('révèle la barre de personnalisation en mode édition', () => {
    useDashboardStore.getState().setEditMode(true);
    const { container } = render(<Dashboard />);
    expect(container.querySelector('.workspace-toolbar')).not.toBeNull();
    expect(screen.getByText('Terminer')).toBeDefined();
    fireEvent.click(screen.getByText('Terminer'));
    expect(useDashboardStore.getState().editMode).toBe(false);
  });

  it('ouvre la bibliothèque et ajoute un widget', () => {
    const { container } = render(<Dashboard />);
    fireEvent.click(screen.getByLabelText('Ajouter un widget'));
    expect(container.querySelector('.library-panel')).not.toBeNull();

    const before = useDashboardStore.getState().widgets.length;
    fireEvent.click(screen.getByText('Citation'));
    expect(useDashboardStore.getState().widgets.length).toBe(before + 1);
    expect(container.querySelector('.library-panel')).toBeNull();
  });

  it('applique une apparence à tous les widgets depuis la barre d’édition', () => {
    useDashboardStore.getState().setEditMode(true);
    render(<Dashboard />);
    fireEvent.click(screen.getByText('Apparence'));
    fireEvent.click(screen.getByText('Verre'));
    expect(useDashboardStore.getState().widgets.every((w) => w.appearance === 'glass')).toBe(true);
  });
});
