/** Application CozyDesk — composition racine. */
import { useEffect, useState } from 'react';
import { WallpaperLayer } from '@/components/common/WallpaperLayer';
import { TitleBar } from '@/components/common/TitleBar';
import { ConfirmDialogHost, ErrorBoundary, Toaster } from '@/components/common/Hosts';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { WindowLayer } from '@/components/windows/WindowLayer';
import { Dock } from '@/components/dock/Dock';
import { CommandPalette } from '@/components/palette/CommandPalette';
import { useHotkey } from '@/hooks';
import { applySettingsToDom, useSettingsStore, type ColorMode } from '@/stores/settings';
import { MODULE_MAP, MODULES } from '@/modules/registry';
import { usePaletteStore } from '@/stores/palette';
import { useWindowStore } from '@/stores/windows';
import { usePomodoroStore } from '@/stores/pomodoro';
import { useAmbientStore } from '@/stores/ambient';
import { useMusicStore } from '@/stores/music';
import { useDashboardStore } from '@/stores/dashboard';
import { openDatabase } from '@/services/storage/db';
import { ensureDailyBackup } from '@/services/storage/backup';
import { startReminderService } from '@/services/notifications/reminders';

export function App(): React.ReactNode {
  const boot = useBoot();

  useHotkey('mod+k', () => {
    const palette = usePaletteStore.getState();
    palette.openPalette(!palette.open);
  });
  useHotkey('mod+shift+d', () => {
    const dash = useDashboardStore.getState();
    dash.setEditMode(!dash.editMode);
  });

  return (
    <ErrorBoundary>
      {boot !== 'ready' ? (
        <BootScreen state={boot} />
      ) : (
        <>
          <WallpaperLayer />
          <TitleBar />
          <Dashboard />
          <WindowLayer />
          <Dock />
          <CommandPalette />
          <Toaster />
          <ConfirmDialogHost />
        </>
      )}
    </ErrorBoundary>
  );
}

/* ---------- Démarrage ---------- */

type BootState = 'starting' | 'ready' | 'error';

function useBoot(): BootState {
  const [state, setState] = useState<BootState>('starting');

  // Application du thème à chaque changement de réglages.
  useEffect(() => {
    const unsub = useSettingsStore.subscribe(() => applySettingsToDom());
    applySettingsToDom();
    return unsub;
  }, []);

  // Mode auto : suit les préférences système.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (): void => {
      if (useSettingsStore.getState().mode === 'auto') applySettingsToDom();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Redimensionner la fenêtre ne doit jamais laisser un module hors écran.
  useEffect(() => {
    let timer: number | undefined;
    const onResize = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const sizes = Object.fromEntries(MODULES.map((m) => [m.id, m.defaultSize]));
        useWindowStore.getState().reconcile(sizes);
      }, 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await openDatabase();
        await ensureDailyBackup();
        usePomodoroStore.getState().boot();
        const sizes = Object.fromEntries(MODULES.map((m) => [m.id, m.defaultSize]));
        useWindowStore.getState().reconcile(sizes);
        useAmbientStore.getState().boot(useSettingsStore.getState().ambientResume);
        useMusicStore.getState().init();
        startReminderService();

        // Ré-accorde le fond d'écran local (la liste blanche est par session).
        const wp = useSettingsStore.getState().wallpaper;
        if (wp.path && (wp.kind === 'image' || wp.kind === 'video')) {
          void window.cozydesk?.files.grant([wp.path], wp.kind);
        }

        // Mode test automatisé : hash #smoke=mod1,mod2;mode=dark;rm=1
        if (window.location.hash.startsWith('#smoke=')) {
          const raw = decodeURIComponent(window.location.hash.slice(7));
          const segments = raw.split(';');
          const ids = (segments[0] ?? '').split(',').filter(Boolean);
          for (const id of ids) {
            const m = MODULE_MAP[id];
            if (m) useWindowStore.getState().open(id, m.defaultSize);
          }
          for (const opt of segments.slice(1)) {
            if (opt === 'mode=dark' || opt === 'mode=light') {
              useSettingsStore.getState().setSettings({ mode: opt.slice(5) as ColorMode });
            } else if (opt === 'rm=1') {
              useSettingsStore.getState().setWorkspace({ motion: 'none' });
            } else if (opt === 'flat=1') {
              // Capture d'écran sans backdrop-filter (contournement d'un bug
              // de capturePage en rendu logiciel — sans effet sur Windows/GPU).
              document.documentElement.dataset.flat = 'true';
            }
          }
          window.history.replaceState(null, '', window.location.pathname);
        }

        if (!cancelled) setState('ready');
      } catch (err) {
        console.error('[cozydesk] démarrage impossible :', err);
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setState]);

  return state;
}

function BootScreen({ state }: { state: BootState }): React.ReactNode {
  return (
    <div className="ambient-bg" style={{ zIndex: 1000 }}>
      <div className="ambient-blob b1" />
      <div className="ambient-blob b2" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: 'linear-gradient(135deg, hsl(248 84% 70%), hsl(288 70% 60%))',
            boxShadow: '0 12px 40px hsl(248 84% 60% / 0.4)'
          }}
        />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
          CozyDesk
        </div>
        {state === 'error' ? (
          <div style={{ maxWidth: 420, textAlign: 'center' }} className="text-secondary">
            La base de données locale n’a pas pu être ouverte. Une autre instance de CozyDesk est
            peut-être en cours. Fermez-la puis relancez l’application.
          </div>
        ) : (
          <div className="text-muted" style={{ fontSize: 13 }}>
            Préparation de votre espace…
          </div>
        )}
      </div>
    </div>
  );
}
