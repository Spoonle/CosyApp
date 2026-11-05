/**
 * Préchargement — seule passerelle entre le rendu et le processus principal.
 * Aucune API Node n'est exposée : uniquement des fonctions IPC validées.
 */
import { contextBridge, ipcRenderer } from 'electron';
import type { CozyDeskApi, FileGrantDto } from '../shared/types/ipc';

function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>;
}

const api: CozyDeskApi = {
  app: {
    getInfo: () => invoke('app:getInfo'),
    quit: () => invoke('app:quit')
  },
  win: {
    minimize: () => invoke('win:minimize'),
    toggleMaximize: () => invoke('win:toggleMaximize'),
    close: () => invoke('win:close'),
    isMaximized: () => invoke('win:isMaximized'),
    onMaximizedChange(callback: (maximized: boolean) => void): () => void {
      const listener = (_e: unknown, maximized: boolean) => callback(maximized);
      ipcRenderer.on('win:maximizedChanged', listener);
      return () => {
        ipcRenderer.removeListener('win:maximizedChanged', listener);
      };
    }
  },
  dialogs: {
    openFiles: (kind, multiple) => invoke<FileGrantDto[]>('dialog:openFiles', { kind, multiple }),
    saveJson: (defaultName) => invoke<string | null>('dialog:saveJson', { defaultName })
  },
  files: {
    grant: (paths, kind) => invoke<FileGrantDto[]>('files:grant', { paths, kind }),
    readText: (path) => invoke<string>('files:readText', { path }),
    writeText: (path, contents) => invoke<{ path: string; bytes: number }>('files:writeText', { path, contents }),
    backup: (name, contents) => invoke<string>('backup:write', { name, contents })
  },
  shell: {
    openExternal: (url) => invoke('shell:openExternal', { url })
  }
};

contextBridge.exposeInMainWorld('cozydesk', api);
