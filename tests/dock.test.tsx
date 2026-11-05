/** Dock : ouverture, focus, restauration — et jamais de fermeture surprise. */
import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Dock } from '@/components/dock/Dock';
import { useWindowStore } from '@/stores/windows';
import { DEFAULT_WORKSPACE, useSettingsStore } from '@/stores/settings';
import { MODULE_MAP } from '@/modules/registry';

beforeEach(() => {
  useWindowStore.setState({ windows: [], topZ: 100, snapPreview: null });
  useSettingsStore.setState({ workspace: DEFAULT_WORKSPACE });
});

describe('dock', () => {
  it('ouvre un module fermé', () => {
    render(<Dock />);
    fireEvent.click(screen.getByLabelText('Tâches'));
    const win = useWindowStore.getState().windows.find((w) => w.id === 'tasks');
    expect(win).toBeDefined();
    expect(win?.minimized).toBe(false);
  });

  it('ramène au premier plan un module déjà ouvert sans le fermer', () => {
    render(<Dock />);
    fireEvent.click(screen.getByLabelText('Tâches'));
    fireEvent.click(screen.getByLabelText('Notes'));
    const byId = () => useWindowStore.getState().windows;
    // Notes est au-dessus après son ouverture.
    expect(byId().find((w) => w.id === 'notes')!.z).toBeGreaterThan(
      byId().find((w) => w.id === 'tasks')!.z
    );
    fireEvent.click(screen.getByLabelText('Tâches'));
    const windows = byId();
    expect(windows).toHaveLength(2);
    expect(windows.find((w) => w.id === 'tasks')!.z).toBeGreaterThan(
      windows.find((w) => w.id === 'notes')!.z
    );
    expect(windows.every((w) => !w.closing)).toBe(true);
  });

  it('restaure un module réduit', () => {
    render(<Dock />);
    fireEvent.click(screen.getByLabelText('Tâches'));
    act(() => useWindowStore.getState().minimize('tasks'));
    fireEvent.click(screen.getByLabelText('Tâches'));
    expect(useWindowStore.getState().windows[0].minimized).toBe(false);
  });

  it('donne accès à tous les modules via le lanceur', () => {
    render(<Dock />);
    fireEvent.click(screen.getByLabelText('Tous les modules'));
    for (const module of Object.values(MODULE_MAP)) {
      expect(screen.getAllByText(module.title).length).toBeGreaterThan(0);
    }
  });

  it('disparaît entièrement quand il est masqué dans les réglages', () => {
    useSettingsStore.setState({
      workspace: { ...DEFAULT_WORKSPACE, dock: { ...DEFAULT_WORKSPACE.dock, visible: false } }
    });
    const { container } = render(<Dock />);
    expect(container.querySelector('.dock')).toBeNull();
  });
});
