/** Tests de l'espace de travail 2.0 : migrations, apparences, dispositions, horloge. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DEFAULT_WORKSPACE,
  applySettingsToDom,
  migrateSettings,
  useSettingsStore
} from '@/stores/settings';
import { migrateDashboard, useDashboardStore } from '@/stores/dashboard';
import { HeroClock, greetingFor } from '@/components/widgets/HeroClock';
import { dockReserve, workspaceBounds } from '@/stores/windows';

beforeEach(() => {
  useSettingsStore.setState({ workspace: DEFAULT_WORKSPACE, reducedMotion: false });
  useDashboardStore.setState({ editMode: false, savedLayouts: [] });
  useDashboardStore.getState().applyPreset('minimal');
});

describe('migration des réglages (v1 → v2)', () => {
  it('conserve les réglages existants et ajoute l’espace de travail', () => {
    const migrated = migrateSettings(
      {
        theme: 'ocean',
        mode: 'dark',
        accent: { h: 210, s: 80, l: 60 },
        wallpaper: { kind: 'image', presetId: 'nuit-pure', path: 'C:/wp.jpg', dim: 0.2, videoEnabled: false },
        pomodoro: { workMin: 50, shortMin: 10, longMin: 30, cyclesBeforeLong: 3, autoStartBreaks: false, sound: false, notifications: false }
      },
      1
    );

    expect(migrated.theme).toBe('ocean');
    expect(migrated.mode).toBe('dark');
    expect(migrated.accent).toEqual({ h: 210, s: 80, l: 60 });
    expect(migrated.wallpaper?.path).toBe('C:/wp.jpg');
    expect(migrated.pomodoro?.workMin).toBe(50);
    expect(migrated.workspace).toEqual(DEFAULT_WORKSPACE);
  });

  it('respecte la préférence « animations réduites » existante', () => {
    const migrated = migrateSettings({ reducedMotion: true }, 1);
    expect(migrated.workspace?.motion).toBe('reduced');
  });

  it('ne touche à rien au-delà de la version 2', () => {
    const state = { theme: 'amoled' as const };
    expect(migrateSettings(state, 2)).toBe(state);
  });
});

describe('migration du dashboard (v1 → v2)', () => {
  it('reprend la disposition existante sans la réinitialiser', () => {
    const legacy = [
      { id: 'w-clock', type: 'clock' as const, x: 0, y: 0, w: 4, h: 2, hidden: false },
      { id: 'w-music', type: 'music' as const, x: 4, y: 2, w: 4, h: 2, hidden: true }
    ];
    const migrated = migrateDashboard({ widgets: legacy, editMode: true }, 1);
    expect(migrated.widgets).toEqual(legacy);
    expect(migrated.widgets?.[1].hidden).toBe(true);
    expect(migrated.savedLayouts).toEqual([]);
  });
});

describe('espace de travail par défaut', () => {
  it('affiche trois widgets seulement', () => {
    const { widgets } = useDashboardStore.getState();
    expect(widgets).toHaveLength(3);
    expect(widgets.map((w) => w.type).sort()).toEqual(['clock', 'pomodoro', 'tasks']);
    for (const w of widgets) {
      expect(w.x + w.w).toBeLessThanOrEqual(12);
      expect(w.hidden).toBe(false);
    }
  });

  it('applique des widgets transparents par défaut', () => {
    expect(useSettingsStore.getState().workspace.widgets.appearance).toBe('transparent');
  });
});

describe('personnalisation des widgets', () => {
  it('change l’apparence d’un widget sans toucher aux autres', () => {
    const clock = useDashboardStore.getState().widgets[0];
    useDashboardStore.getState().setAppearance(clock.id, 'glass');
    const after = useDashboardStore.getState().widgets;
    expect(after.find((w) => w.id === clock.id)?.appearance).toBe('glass');
    expect(after.filter((w) => w.id !== clock.id).every((w) => w.appearance === undefined)).toBe(
      true
    );
  });

  it('applique une apparence à tous les widgets', () => {
    useDashboardStore.getState().setAppearanceAll('subtle');
    expect(useDashboardStore.getState().widgets.every((w) => w.appearance === 'subtle')).toBe(true);
  });

  it('bascule la présentation compacte et la visibilité', () => {
    const id = useDashboardStore.getState().widgets[0].id;
    useDashboardStore.getState().toggleCompact(id);
    expect(useDashboardStore.getState().widgets[0].compact).toBe(true);
    useDashboardStore.getState().toggleHidden(id);
    expect(useDashboardStore.getState().widgets[0].hidden).toBe(true);
  });

  it('applique les dispositions prêtes à l’emploi', () => {
    useDashboardStore.getState().applyPreset('classic');
    expect(useDashboardStore.getState().widgets).toHaveLength(9);
    useDashboardStore.getState().applyPreset('focus');
    expect(useDashboardStore.getState().widgets.map((w) => w.type).sort()).toEqual([
      'clock',
      'pomodoro'
    ]);
  });

  it('sauvegarde, restaure et supprime une disposition', () => {
    const store = useDashboardStore.getState();
    store.saveLayout('Bureau soir');
    const saved = useDashboardStore.getState().savedLayouts;
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('Bureau soir');

    useDashboardStore.getState().applyPreset('classic');
    expect(useDashboardStore.getState().widgets).toHaveLength(9);

    useDashboardStore.getState().applySavedLayout(saved[0].id);
    expect(useDashboardStore.getState().widgets).toHaveLength(3);

    useDashboardStore.getState().deleteSavedLayout(saved[0].id);
    expect(useDashboardStore.getState().savedLayouts).toHaveLength(0);
  });
});

describe('réglages de l’espace de travail', () => {
  it('fusionne partiellement l’horloge sans écraser le dock', () => {
    useSettingsStore.getState().setWorkspace({ clock: { ...DEFAULT_WORKSPACE.clock, size: 'xl' } });
    const ws = useSettingsStore.getState().workspace;
    expect(ws.clock.size).toBe('xl');
    expect(ws.dock.shortcuts).toEqual(DEFAULT_WORKSPACE.dock.shortcuts);
  });

  it('expose les raccourcis du dock et permet de les modifier', () => {
    useSettingsStore.getState().setWorkspace({
      dock: { ...DEFAULT_WORKSPACE.dock, shortcuts: ['tasks'] }
    });
    expect(useSettingsStore.getState().workspace.dock.shortcuts).toEqual(['tasks']);
  });

  it('réserve moins d’espace quand le dock est masqué', () => {
    useSettingsStore.getState().setWorkspace({ dock: { ...DEFAULT_WORKSPACE.dock, visible: true } });
    const withDock = workspaceBounds().h;
    useSettingsStore.getState().setWorkspace({ dock: { ...DEFAULT_WORKSPACE.dock, visible: false } });
    const withoutDock = workspaceBounds().h;
    expect(withoutDock).toBeGreaterThan(withDock);
    expect(dockReserve()).toBe(18);
  });

  it('reflète les réglages dans le DOM (positions, marges, animations)', () => {
    useSettingsStore.getState().setWorkspace({
      dock: { ...DEFAULT_WORKSPACE.dock, position: 'left', autoHide: true },
      dashboard: { density: 'airy' },
      motion: 'reduced'
    });
    applySettingsToDom();
    const root = document.documentElement;
    expect(root.dataset.dockPosition).toBe('left');
    expect(root.dataset.dockAutoHide).toBe('true');
    expect(root.dataset.density).toBe('airy');
    expect(root.dataset.motion).toBe('reduced');
    expect(root.style.getPropertyValue('--ws-margin')).toBe('68px');
  });
});

describe('horloge principale', () => {
  it('salue selon l’heure', () => {
    expect(greetingFor(8)).toBe('Bonjour');
    expect(greetingFor(14)).toBe('Bon après-midi');
    expect(greetingFor(20)).toBe('Bonsoir');
    expect(greetingFor(2)).toBe('Bonne nuit');
  });

  it('affiche l’heure, la date et le salut configurés', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 9, 41, 7));
    useSettingsStore.getState().setWorkspace({
      clock: {
        size: 'xl',
        style: 'stacked',
        seconds: true,
        date: true,
        greeting: true,
        name: 'Alex'
      }
    });
    const { container } = render(<HeroClock />);
    expect(screen.getByRole('timer')).toBeDefined();
    expect(container.textContent).toContain('09');
    expect(container.textContent).toContain('41');
    expect(container.textContent).toContain('07');
    expect(container.textContent).toContain('Bonjour, Alex');
    expect(container.textContent?.toLowerCase()).toContain('novembre');
    expect(container.querySelector('.hero-clock')?.getAttribute('data-size')).toBe('xl');
    vi.useRealTimers();
  });

  it('masque la date en présentation compacte', () => {
    const { container } = render(<HeroClock compact />);
    expect(container.querySelector('.clock-date')).toBeNull();
    expect(container.querySelector('.clock-time')).not.toBeNull();
  });
});
