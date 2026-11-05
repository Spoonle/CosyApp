import { BrowserWindow, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { appConfig } from '../services/config';

let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

export function createMainWindow(): BrowserWindow {
  if (getMainWindow()) return getMainWindow()!;

  const iconCandidates = [
    path.join(__dirname, '../build/icon.png'),
    path.join(__dirname, '../dist/icon.png'),
    path.join(__dirname, '../public/icon.png')
  ];
  const icon = iconCandidates.find((p) => fs.existsSync(p));

  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    show: false,
    frame: false,
    title: 'CozyDesk',
    backgroundColor: '#0a0c16',
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      devTools: true
    }
  });

  win.once('ready-to-show', () => win.show());

  // Empêche toute navigation hors de l'application.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const dev = appConfig.devServerUrl;
    const isOwn =
      url.startsWith('file://') || (dev !== null && url.startsWith(dev));
    if (!isOwn) {
      event.preventDefault();
      if (url.startsWith('https://')) void shell.openExternal(url);
    }
  });

  // Notifications système autorisées, tout le reste refusé.
  win.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'notifications');
  });

  win.on('maximize', () => win.webContents.send('win:maximizedChanged', true));
  win.on('unmaximize', () => win.webContents.send('win:maximizedChanged', false));
  win.on('closed', () => {
    mainWindow = null;
  });

  if (appConfig.devServerUrl) {
    void win.loadURL(appConfig.devServerUrl);
  } else {
    void win.loadFile(appConfig.distIndex);
  }

  mainWindow = win;
  return win;
}
