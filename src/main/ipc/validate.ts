/**
 * Validation stricte des entrées IPC.
 * Règle absolue : aucune donnée provenant du rendu n'est utilisée sans validation.
 */
import path from 'node:path';

export type FileKind = 'audio' | 'image' | 'video' | 'json';

const MAX_READ_BYTES = 100 * 1024 * 1024; // 100 Mo (référence pour la cohérence IPC)
export { MAX_READ_BYTES };
const MAX_GRANT_PATHS = 500;

export function isNonEmptyString(value: unknown, maxLength = 4096): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

export function isStringArray(value: unknown, maxLen = MAX_GRANT_PATHS): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maxLen &&
    value.every((v) => isNonEmptyString(v, 4096))
  );
}

export function isFileKind(value: unknown): value is FileKind {
  return value === 'audio' || value === 'image' || value === 'video' || value === 'json';
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function extensionOf(filePath: string): string {
  const base = filePath.split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : '';
}

/** Rejette les chemins non absolus ou suspects (pas de traversée, pas de device bizarre). */
export function isSafeAbsolutePath(filePath: string): boolean {
  return path.isAbsolute(filePath) && !filePath.includes('\0') && filePath.length <= 4096;
}
