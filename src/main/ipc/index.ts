/**
 * Enregistrement des canaux IPC avec validation systématique des entrées.
 * Le rendu n'accède jamais directement à Node.js : tout passe par ici.
 */
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import {
  backupsDir,
  grantFiles,
  openFileDialog,
  readTextFile,
  saveJsonDialog,
  userDataDir,
  writeBackup,
  writeTextFile
} from './files';
import {
  isFileKind,
  isNonEmptyString,
  isPlainObject,
  isStringArray,
  type FileKind
} from './validate';

export function registerIpc(): void {
  // ---- Application -------------------------------------------------------
  ipcMain.handle('app:getInfo', () => ({
    version: app.getVersion(),
    platform: process.platform,
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    locale: app.getLocale(),
    userData: userDataDir(),
    backups: backupsDir()
  }));

  ipcMain.handle('app:quit', () => {
    app.quit();
  });

  // ---- Fenêtre native ----------------------------------------------------
  ipcMain.handle(
    'win:minimize',
    (event) => {
      const win = findWindow(event);
      win?.minimize();
    }
  );

  ipcMain.handle(
    'win:toggleMaximize',
    (event) => {
      const win = findWindow(event);
      if (!win) return;
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }
  );

  ipcMain.handle('win:isMaximized', (event) => findWindow(event)?.isMaximized() ?? false);

  ipcMain.handle(
    'win:close',
    (event) => {
      findWindow(event)?.close();
    }
  );

  // ---- Dialogues & fichiers ---------------------------------------------
  ipcMain.handle('dialog:openFiles', async (event, payload: unknown) => {
    if (!isPlainObject(payload)) throw new Error('Paramètres non valides.');
    const kind = payload.kind;
    const multiple = payload.multiple === true;
    if (!isFileKind(kind)) throw new Error('Type de fichier non valide.');
    return openFileDialog(event.sender, kind as FileKind, multiple);
  });

  ipcMain.handle('dialog:saveJson', async (event, payload: unknown) => {
    if (!isPlainObject(payload)) throw new Error('Paramètres non valides.');
    const defaultName = isNonEmptyString(payload.defaultName, 200)
      ? payload.defaultName
      : 'cozydesk-sauvegarde.json';
    return saveJsonDialog(event.sender, defaultName);
  });

  ipcMain.handle('files:grant', (_event, payload: unknown) => {
    if (!isPlainObject(payload)) throw new Error('Paramètres non valides.');
    const kind = payload.kind;
    const paths = payload.paths;
    if (!isFileKind(kind)) throw new Error('Type de fichier non valide.');
    if (!isStringArray(paths)) throw new Error('Liste de chemins non valide.');
    return grantFiles(paths, kind as FileKind);
  });

  ipcMain.handle('files:writeText', async (_event, payload: unknown) => {
    if (!isPlainObject(payload)) throw new Error('Paramètres non valides.');
    const filePath = payload.path;
    const contents = payload.contents;
    if (!isNonEmptyString(filePath, 4096)) throw new Error('Chemin non valide.');
    if (typeof contents !== 'string') throw new Error('Contenu non valide.');
    const bytes = await writeTextFile(filePath, contents);
    return { path: filePath, bytes };
  });

  ipcMain.handle('files:readText', async (_event, payload: unknown) => {
    if (!isPlainObject(payload)) throw new Error('Paramètres non valides.');
    const filePath = payload.path;
    if (!isNonEmptyString(filePath, 4096)) throw new Error('Chemin non valide.');
    return readTextFile(filePath);
  });

  ipcMain.handle('backup:write', async (_event, payload: unknown) => {
    if (!isPlainObject(payload)) throw new Error('Paramètres non valides.');
    const name = payload.name;
    const contents = payload.contents;
    if (!isNonEmptyString(name, 200)) throw new Error('Nom non valide.');
    if (typeof contents !== 'string') throw new Error('Contenu non valide.');
    return writeBackup(name, contents);
  });

  // ---- Liens externes ----------------------------------------------------
  ipcMain.handle('shell:openExternal', (_event, payload: unknown) => {
    if (!isPlainObject(payload)) throw new Error('Paramètres non valides.');
    const url = payload.url;
    if (!isNonEmptyString(url, 2048)) throw new Error('URL non valide.');
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('URL non valide.');
    }
    if (parsed.protocol !== 'https:') throw new Error('Seules les URL https sont autorisées.');
    return shell.openExternal(parsed.toString());
  });
}

function findWindow(event: Electron.IpcMainInvokeEvent): Electron.BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender);
}
