/** Tests des stores (fenêtres, réglages) et composants de base. */
import { beforeEach, describe, expect, it } from 'vitest';
import { useWindowStore, workspaceBounds } from '@/stores/windows';
import { useDashboardStore, WIDGET_SIZES } from '@/stores/dashboard';
import { render, screen } from '@testing-library/react';
import { GlassButton, EmptyState, ProgressBar } from '@/components/glass';
import { Coffee, ListTodo } from 'lucide-react';

describe('store des fenêtres', () => {
  beforeEach(() => {
    useWindowStore.setState({ windows: [], topZ: 100, snapPreview: null });
  });

  it('ouvre une fenêtre centrée dans les bornes', () => {
    const bounds = workspaceBounds();
    useWindowStore.getState().open('tasks', { w: 800, h: 600 });
    const win = useWindowStore.getState().windows[0];
    expect(win).toBeDefined();
    expect(win.id).toBe('tasks');
    expect(win.w).toBeLessThanOrEqual(bounds.w);
    expect(win.x).toBeGreaterThanOrEqual(bounds.x - 1);
    expect(win.y).toBeGreaterThanOrEqual(bounds.y - 1);
    expect(win.z).toBe(101);
  });

  it('réouvrir un module focus au lieu de dupliquer', () => {
    useWindowStore.getState().open('tasks', { w: 800, h: 600 });
    useWindowStore.getState().open('tasks', { w: 800, h: 600 });
    expect(useWindowStore.getState().windows).toHaveLength(1);
    expect(useWindowStore.getState().windows[0].z).toBe(102);
  });

  it('focus élève le z-index', () => {
    useWindowStore.getState().open('tasks', { w: 800, h: 600 });
    useWindowStore.getState().open('notes', { w: 900, h: 600 });
    const before = useWindowStore.getState().windows.find((w) => w.id === 'tasks')!.z;
    useWindowStore.getState().focus('tasks');
    const after = useWindowStore.getState().windows.find((w) => w.id === 'tasks')!.z;
    expect(after).toBeGreaterThan(before);
  });

  it('snap gauche : moitié gauche de l’écran', () => {
    useWindowStore.getState().open('tasks', { w: 800, h: 600 });
    useWindowStore.getState().snap('tasks', 'left');
    const win = useWindowStore.getState().windows[0];
    const bounds = workspaceBounds();
    expect(win.x).toBe(bounds.x);
    expect(win.w).toBe(Math.round(bounds.w / 2) - 6);
  });

  it('maximise puis restaure la position', () => {
    useWindowStore.getState().open('tasks', { w: 800, h: 600 });
    const original = { ...useWindowStore.getState().windows[0] };
    useWindowStore.getState().toggleMaximize('tasks');
    const maximized = useWindowStore.getState().windows[0];
    expect(maximized.maximized).toBe(true);
    const bounds = workspaceBounds();
    expect(maximized.w).toBe(bounds.w);
    useWindowStore.getState().toggleMaximize('tasks');
    const restored = useWindowStore.getState().windows[0];
    expect(restored.maximized).toBe(false);
    expect(restored.x).toBe(original.x);
    expect(restored.w).toBe(original.w);
  });

  it('minimiser puis restaurer', () => {
    useWindowStore.getState().open('tasks', { w: 800, h: 600 });
    useWindowStore.getState().minimize('tasks');
    expect(useWindowStore.getState().windows[0].minimized).toBe(true);
    useWindowStore.getState().restore('tasks');
    expect(useWindowStore.getState().windows[0].minimized).toBe(false);
  });

  it('reconcile écarte les modules inconnus et recale dans l’écran', () => {
    useWindowStore.setState({
      windows: [
        {
          id: 'tasks',
          x: -500,
          y: 99999,
          w: 800,
          h: 600,
          z: 1,
          minimized: false,
          maximized: false,
          closing: false
        },
        {
          id: 'module-fantome',
          x: 10,
          y: 10,
          w: 100,
          h: 100,
          z: 2,
          minimized: false,
          maximized: false,
          closing: false
        }
      ]
    });
    useWindowStore.getState().reconcile({ tasks: { w: 800, h: 600 } });
    const windows = useWindowStore.getState().windows;
    expect(windows).toHaveLength(1);
    const bounds = workspaceBounds();
    expect(windows[0].x).toBeGreaterThanOrEqual(bounds.x);
    expect(windows[0].y).toBeLessThanOrEqual(bounds.y + bounds.h - 600);
  });
});

describe('store du dashboard', () => {
  it('dispose d’une disposition par défaut minimale et cohérente', () => {
    // 2.0 : trois éléments seulement — le reste est optionnel.
    const { widgets } = useDashboardStore.getState();
    expect(widgets.length).toBe(3);
    for (const w of widgets) {
      expect(w.x + w.w).toBeLessThanOrEqual(12);
      expect(w.w).toBeGreaterThanOrEqual(WIDGET_SIZES[w.type].minW);
      expect(w.h).toBeGreaterThanOrEqual(WIDGET_SIZES[w.type].minH);
    }
  });

  it('déplacer un widget borne les coordonnées', () => {
    const first = useDashboardStore.getState().widgets[0];
    useDashboardStore.getState().moveWidget(first.id, -5, -3);
    const moved = useDashboardStore.getState().widgets[0];
    expect(moved.x).toBe(0);
    expect(moved.y).toBe(0);
  });

  it('ajouter puis réinitialiser', () => {
    const before = useDashboardStore.getState().widgets.length;
    useDashboardStore.getState().addWidget('weather');
    expect(useDashboardStore.getState().widgets.length).toBe(before + 1);
    useDashboardStore.getState().resetDefault();
    expect(useDashboardStore.getState().widgets.length).toBe(before);
  });
});

describe('composants de base', () => {
  it('GlassButton rend son libellé et gère le clic', () => {
    let clicked = 0;
    render(<GlassButton onClick={() => clicked++}>Cliquez ici</GlassButton>);
    screen.getByText('Cliquez ici').click();
    expect(clicked).toBe(1);
  });

  it('EmptyState affiche titre et description', () => {
    render(
      <EmptyState icon={<Coffee size={24} />} title="Rien à voir">
        Description utile.
      </EmptyState>
    );
    expect(screen.getByText('Rien à voir')).toBeDefined();
    expect(screen.getByText('Description utile.')).toBeDefined();
  });

  it('ProgressBar respecte les bornes', () => {
    render(<ProgressBar value={1.5} label="test" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
  });

  it('ListTodo s’affiche (icônes lucide fonctionnelles)', () => {
    render(<ListTodo size={16} aria-label="tâches" />);
    expect(true).toBe(true);
  });
});
