/**
 * Gestion sécurisée des fichiers locaux :
 * - liste blanche de chemins accordés explicitement (via boîte de dialogue ou validation) ;
 * - protocole `cozydesk-file://` qui diffuse les fichiers autorisés en streaming ;
 * - aucun accès arbitraire au système de fichiers depuis le rendu.
 */
import { app, BrowserWindow, dialog, net, protocol } from 'electron';
import type fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { appConfig } from '../services/config';
import { extensionOf, isSafeAbsolutePath, type FileKind } from './validate';

export interface FileGrant {
  path: string;
  url: string;
  name: string;
  size: number;
  ext: string;
}

/** Chemins autorisés en lecture, indexés par chemin normalisé. */
const allowedPaths = new Map<string, FileKind>();
/** Chemins autorisés en écriture (issue d'une boîte de dialogue d'enregistrement). */
const writablePaths = new Set<string>();

function normalizeKey(filePath: string): string {
  return path.resolve(filePath).split('\\').join('/');
}

function toProtocolUrl(filePath: string): string {
  const segments = filePath.split(/[\\/]/).filter(Boolean).map(encodeURIComponent);
  return `cozydesk-file://local/${segments.join('/')}`;
}

function fromProtocolUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.host !== 'local') return null;
    const decoded = parsed.pathname
      .split('/')
      .filter(Boolean)
      .map((s) => decodeURIComponent(s));
    if (decoded.length === 0) return null;
    const joined = decoded.join('/');
    // Windows : "C:/Users/..." ; POSIX : "/home/..."
    return /^[A-Za-z]:\//.test(joined) ? joined : `/${joined}`;
  } catch {
    return null;
  }
}

async function statFile(filePath: string): Promise<fs.Stats | null> {
  try {
    const st = await fsp.stat(filePath);
    return st;
  } catch {
    return null;
  }
}

/** Valide et accorde l'accès à des fichiers locaux pour un usage donné. */
export async function grantFiles(rawPaths: string[], kind: FileKind): Promise<FileGrant[]> {
  const grants: FileGrant[] = [];
  const errors: string[] = [];
  for (const raw of rawPaths) {
    if (!isSafeAbsolutePath(raw)) {
      errors.push(`Chemin non valide : ${raw}`);
      continue;
    }
    const resolved = path.resolve(raw);
    const st = await statFile(resolved);
    if (!st || !st.isFile()) {
      errors.push(`Fichier introuvable : ${raw}`);
      continue;
    }
    const ext = extensionOf(resolved);
    const allowedExts = kind === 'audio' ? AUDIO_EXTS : kind === 'image' ? IMAGE_EXTS : kind === 'video' ? VIDEO_EXTS : JSON_EXTS;
    if (!allowedExts.includes(ext)) {
      errors.push(`Extension non autorisée (${ext}) : ${raw}`);
      continue;
    }
    allowedPaths.set(normalizeKey(resolved), kind);
    grants.push({ path: resolved, url: toProtocolUrl(resolved), name: path.basename(resolved), size: st.size, ext });
  }
  if (errors.length > 0) {
    console.warn('[cozydesk:files] chemins refusés :', errors.join(' | '));
  }
  return grants;
}

const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'oga', 'flac', 'm4a', 'aac', 'opus', 'weba', 'webm'];
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'bmp'];
const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'mkv', 'm4v'];
const JSON_EXTS = ['json'];

export function registerFileProtocol(): void {
  protocol.handle('cozydesk-file', async (request) => {
    const candidate = fromProtocolUrl(request.url) ?? request.url;
    if (!candidate) return new Response(null, { status: 400 });

    const key = normalizeKey(candidate);
    if (!allowedPaths.has(key)) {
      return new Response(null, { status: 403 });
    }
    const st = await statFile(candidate);
    if (!st || !st.isFile()) {
      return new Response(null, { status: 404 });
    }
    const range = request.headers.get('range');
    return net.fetch(pathToFileURL(candidate).toString(), {
      headers: range ? { Range: range } : undefined,
      bypassCustomProtocolHandlers: true
    });
  });
}

const DIALOG_FILTERS: Record<FileKind, Electron.FileFilter[]> = {
  audio: [{ name: 'Audio', extensions: AUDIO_EXTS }],
  image: [{ name: 'Images', extensions: IMAGE_EXTS }],
  video: [{ name: 'Vidéos', extensions: VIDEO_EXTS }],
  json: [{ name: 'Sauvegarde CozyDesk', extensions: JSON_EXTS }]
};

/** Ouvre une boîte de dialogue de sélection et accorde immédiatement les fichiers choisis. */
export async function openFileDialog(
  parent: Electron.WebContents,
  kind: FileKind,
  multiple: boolean
): Promise<FileGrant[]> {
  const win = BrowserWindow.fromWebContents(parent);
  const options: Electron.OpenDialogOptions = {
    title: multiple ? 'Sélectionner des fichiers' : 'Sélectionner un fichier',
    properties: ['openFile', ...(multiple ? ['multiSelections' as const] : [])],
    filters: DIALOG_FILTERS[kind]
  };
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
  if (result.canceled || result.filePaths.length === 0) return [];
  return grantFiles(result.filePaths, kind);
}

/** Boîte de dialogue d'enregistrement (JSON). Le chemin retourné est le seul autorisé en écriture. */
export async function saveJsonDialog(
  parent: Electron.WebContents,
  defaultName: string
): Promise<string | null> {
  const win = BrowserWindow.fromWebContents(parent);
  const options: Electron.SaveDialogOptions = {
    title: 'Enregistrer la sauvegarde',
    defaultPath: defaultName,
    filters: DIALOG_FILTERS.json
  };
  const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) return null;
  let target = result.filePath;
  if (extensionOf(target) !== 'json') target += '.json';
  writablePaths.add(normalizeKey(target));
  return target;
}

const MAX_WRITE_BYTES = 100 * 1024 * 1024;

/** Écrit un fichier texte — uniquement vers un chemin sorti d'une boîte d'enregistrement. */
export async function writeTextFile(filePath: string, contents: string): Promise<number> {
  if (!isSafeAbsolutePath(filePath)) throw new Error('Chemin non valide.');
  const key = normalizeKey(filePath);
  if (!writablePaths.has(key)) throw new Error('Écriture non autorisée pour ce chemin.');
  if (contents.length > MAX_WRITE_BYTES) throw new Error('Contenu trop volumineux.');
  await fsp.writeFile(filePath, contents, 'utf-8');
  return Buffer.byteLength(contents, 'utf-8');
}

/** Lit un fichier texte JSON — uniquement depuis un chemin accordé en lecture. */
export async function readTextFile(filePath: string): Promise<string> {
  if (!isSafeAbsolutePath(filePath)) throw new Error('Chemin non valide.');
  const key = normalizeKey(filePath);
  const kind = allowedPaths.get(key);
  if (kind !== 'json') throw new Error('Lecture non autorisée pour ce chemin.');
  const st = await statFile(filePath);
  if (!st || !st.isFile()) throw new Error('Fichier introuvable.');
  if (st.size > MAX_WRITE_BYTES) throw new Error('Fichier trop volumineux.');
  return fsp.readFile(filePath, 'utf-8');
}

/** Écrit une sauvegarde automatique dans userData/backups (nom contrôlé). */
export async function writeBackup(name: string, contents: string): Promise<string> {
  if (!/^[A-Za-z0-9._-]+$/.test(name) || !name.endsWith('.json') || name.length > 120) {
    throw new Error('Nom de sauvegarde non valide.');
  }
  if (contents.length > MAX_WRITE_BYTES) throw new Error('Contenu trop volumineux.');
  const dir = appConfig.backupsDir;
  await fsp.mkdir(dir, { recursive: true });
  const target = path.join(dir, name);
  await fsp.writeFile(target, contents, 'utf-8');
  await pruneBackups(dir);
  return target;
}

async function pruneBackups(dir: string): Promise<void> {
  try {
    const entries = await fsp.readdir(dir);
    const jsons = entries.filter((e) => e.endsWith('.json'));
    if (jsons.length <= 30) return;
    const withTimes = await Promise.all(
      jsons.map(async (name) => {
        const full = path.join(dir, name);
        const st = await fsp.stat(full);
        return { full, mtime: st.mtimeMs };
      })
    );
    withTimes.sort((a, b) => a.mtime - b.mtime);
    const toDelete = withTimes.slice(0, withTimes.length - 30);
    await Promise.all(toDelete.map((f) => fsp.unlink(f.full).catch(() => undefined)));
  } catch (err) {
    console.warn('[cozydesk:backup] nettoyage impossible :', err);
  }
}

export function backupsDir(): string {
  return appConfig.backupsDir;
}

export function userDataDir(): string {
  return app.getPath('userData');
}
