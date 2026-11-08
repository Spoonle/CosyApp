/**
 * Validation des entrées IPC (src/main/ipc/validate.ts).
 * C'est la seule barrière entre le rendu et le système : elle mérite des tests.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  extensionOf,
  isFileKind,
  isNonEmptyString,
  isPlainObject,
  isSafeAbsolutePath,
  isStringArray
} from '../src/main/ipc/validate';

describe('validate — types de fichier', () => {
  it('accepte uniquement les quatre types connus', () => {
    expect(['audio', 'image', 'video', 'json'].every(isFileKind)).toBe(true);
    for (const bad of ['Audio', 'pdf', '', 'audio ', 42, null, undefined, {}]) {
      expect(isFileKind(bad)).toBe(false);
    }
  });

  it('extrait l’extension sans se laisser tromper par le dossier', () => {
    expect(extensionOf('/home/user/dossier.mp3/fichier.wav')).toBe('wav');
    expect(extensionOf('C:\\Users\\moi\\son.MP3')).toBe('mp3');
    expect(extensionOf('sans-extension')).toBe('');
    expect(extensionOf('archive.tar.gz')).toBe('gz');
  });
});

describe('validate — chaînes et tableaux', () => {
  it('borne les chaînes', () => {
    expect(isNonEmptyString('ok')).toBe(true);
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString('x'.repeat(11), 10)).toBe(false);
    expect(isNonEmptyString(12)).toBe(false);
  });

  it('limite le nombre de chemins par appel', () => {
    expect(isStringArray(['a', 'b'])).toBe(true);
    expect(isStringArray([])).toBe(true);
    expect(isStringArray(['a', 2])).toBe(false);
    expect(isStringArray('a')).toBe(false);
    expect(isStringArray(Array.from({ length: 501 }, () => 'x'))).toBe(false);
  });

  it('distingue un objet simple d’un tableau ou d’un null', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject('x')).toBe(false);
  });
});

describe('validate — chemins', () => {
  it('exige un chemin absolu', () => {
    expect(isSafeAbsolutePath(path.resolve('relatif.txt'))).toBe(true);
    expect(isSafeAbsolutePath('relatif.txt')).toBe(false);
    expect(isSafeAbsolutePath('./a/b')).toBe(false);
    expect(isSafeAbsolutePath('')).toBe(false);
  });

  it('rejette les octets nuls et les chemins démesurés', () => {
    expect(isSafeAbsolutePath(path.resolve('a') + '\0.png')).toBe(false);
    expect(isSafeAbsolutePath('/' + 'x'.repeat(5000))).toBe(false);
  });
});
