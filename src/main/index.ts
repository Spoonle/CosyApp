/**
 * CozyDesk — processus principal Electron.
 * Sécurité : contextIsolation, sandbox, aucune API Node exposée au rendu,
 * protocole de fichiers en liste blanche, IPC validé.
 */
import { app, protocol } from 'electron';
import { registerIpc } from './ipc';
import { registerFileProtocol } from './ipc/files';
import { createMainWindow, getMainWindow } from './windows/main-window';

// Une seule instance de CozyDesk à la fois.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  // Protocole privilégié pour diffuser les médias locaux autorisés.
  app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport');
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'cozydesk-file',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        bypassCSP: false
      }
    }
  ]);

  app.whenReady().then(() => {
    registerIpc();
    registerFileProtocol();
    const win = createMainWindow();
    maybeRunSmokeTest(win);

    app.on('activate', () => {
      if (getMainWindow() === null) createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}

/**
 * Mode test automatisé (headless) :
 *   electron . --smoke-test=/tmp/shot.png --open=tasks,notes --wait=5000
 * Ouvre les fenêtres demandées (via hash), attend, capture l'écran puis quitte.
 */
function maybeRunSmokeTest(win: Electron.BrowserWindow): void {
  const args = process.argv;
  const shot = findArg(args, '--smoke-test');
  if (!shot) return;

  const openModules = findArg(args, '--open') ?? '';
  const wait = Number(findArg(args, '--wait') ?? '4000');

  win.webContents.once('did-finish-load', () => {
    const hash = `#smoke=${encodeURIComponent(openModules)}`;
    void win.webContents.executeJavaScript(
      `window.location.hash = ${JSON.stringify(hash)}; true;`
    );
    setTimeout(async () => {
      try {
        if (process.argv.includes('--diagnose')) {
          const diag = await win.webContents.executeJavaScript(`(() => {
            const cs = getComputedStyle(document.body);
            const brand = document.querySelector('.titlebar-brand span');
            return JSON.stringify({
              dataset: { ...document.documentElement.dataset },
              bodyColor: cs.color,
              brandColor: brand ? getComputedStyle(brand).color : 'absent',
              textRgb: getComputedStyle(document.documentElement).getPropertyValue('--text-rgb'),
              fonts: cs.fontFamily.slice(0, 80)
            });
          })()`);
          console.log('[diag]', diag);
        }
        const image = await win.webContents.capturePage();
        const { writeFile, mkdir } = await import('node:fs/promises');
        const path = await import('node:path');
        await mkdir(path.dirname(shot), { recursive: true });
        await writeFile(shot, image.toPNG());
        console.log(`[smoke-test] capture écrite : ${shot}`);
      } catch (err) {
        console.error('[smoke-test] échec de la capture :', err);
      } finally {
        app.exit(0);
      }
    }, Math.min(Math.max(wait, 1000), 20000));
  });
}

function findArg(args: string[], prefix: string): string | null {
  const found = args.find((a) => a.startsWith(prefix + '='));
  return found ? found.slice(prefix.length + 1) : null;
}
