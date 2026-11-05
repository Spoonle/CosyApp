import { app } from 'electron';
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
  get iconPath(): string {
    const candidates = [
      path.join(__dirname, '../build/icon.png'),
      path.join(__dirname, '../dist/icon.png'),
      path.join(__dirname, '../public/icon.png')
    ];
    return candidates[0]; // résolu au runtime par existsSync côté appelant
  },
  get backupsDir(): string {
    return path.join(app.getPath('userData'), 'backups');
  }
};
