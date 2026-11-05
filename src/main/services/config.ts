import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

/** Configuration centrale du processus principal. */
export const appConfig = {
  get isDev(): boolean {
    return !!process.env.VITE_DEV_SERVER_URL || process.argv.includes('--dev');
  },
  get devServerUrl(): string | null {
    return process.env.VITE_DEV_SERVER_URL ?? null;
  },
  get distIndex(): string {
    return path.join(__dirname, '../dist/index.html');
  },
  /**
   * Icône de fenêtre : premier candidat réellement présent sur le disque
   * (en développement build/, dans le paquet dist/ servi par Vite).
   * `undefined` si aucun n'existe — l'icône de l'exécutable reste utilisée.
   */
  get iconPath(): string | undefined {
    const candidates = [
      path.join(__dirname, '../build/icon.png'),
      path.join(__dirname, '../dist/icon.png'),
      path.join(__dirname, '../public/icon.png')
    ];
    return candidates.find((candidate) => fs.existsSync(candidate));
  },
  get backupsDir(): string {
    return path.join(app.getPath('userData'), 'backups');
  }
};
