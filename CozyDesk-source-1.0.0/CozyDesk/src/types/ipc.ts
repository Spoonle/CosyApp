/** Types partagés entre le preload et le rendu (contrat de l'API exposée). */

export type FileKind = 'audio' | 'image' | 'video' | 'json';

export interface FileGrantDto {
  path: string;
  url: string;
  name: string;
  size: number;
  ext: string;
}

export interface AppInfoDto {
  version: string;
  platform: string;
  electron: string;
  node: string;
  chrome: string;
  locale: string;
  userData: string;
  backups: string;
}

export interface CozyDeskApi {
  app: {
    getInfo(): Promise<AppInfoDto>;
    quit(): Promise<void>;
  };
  win: {
    minimize(): Promise<void>;
    toggleMaximize(): Promise<void>;
    close(): Promise<void>;
    isMaximized(): Promise<boolean>;
    onMaximizedChange(callback: (maximized: boolean) => void): () => void;
  };
  dialogs: {
    openFiles(kind: FileKind, multiple: boolean): Promise<FileGrantDto[]>;
    saveJson(defaultName: string): Promise<string | null>;
  };
  files: {
    grant(paths: string[], kind: FileKind): Promise<FileGrantDto[]>;
    readText(path: string): Promise<string>;
    writeText(path: string, contents: string): Promise<{ path: string; bytes: number }>;
    backup(name: string, contents: string): Promise<string>;
  };
  shell: {
    openExternal(url: string): Promise<void>;
  };
}

declare global {
  interface Window {
    cozydesk?: CozyDeskApi;
  }
}
