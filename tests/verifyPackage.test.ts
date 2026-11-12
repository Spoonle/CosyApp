/**
 * Le vérificateur de paquet doit distinguer un vrai paquet 2.0 d'un ancien paquet
 * renommé : c'est la garantie qu'on ne livre pas la 1.0 sous un nouveau nom.
 */
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
/** Version réelle du dépôt : le vérificateur ne doit pas figer une constante. */
const APP_VERSION: string = (
  JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')) as {
    version: string;
  }
).version;
const asar = require('@electron/asar') as {
  createPackage: (src: string, dest: string) => Promise<void>;
};
const script = path.resolve(__dirname, '../scripts/verify-package.cjs');

async function makePackage(files: Record<string, string>): Promise<string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cozydesk-pkg-'));
  for (const [name, content] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  // L'archive est créée hors du dossier source (createPackage est asynchrone).
  const asarPath = `${dir}.asar`;
  await asar.createPackage(dir, asarPath);
  return asarPath;
}

function run(asarPath: string): { code: number; output: string } {
  const res = spawnSync(process.execPath, [script, asarPath], { encoding: 'utf8' });
  return { code: res.status ?? 1, output: `${res.stdout ?? ''}${res.stderr ?? ''}` };
}

const V2_FILES = {
  'package.json': JSON.stringify({ name: 'cozydesk', version: APP_VERSION }),
  'dist/assets/index.css':
    '.hero-clock{}.floating-window{}.widget[data-appearance=transparent]{}',
  'dist/assets/index.js': 'workspace-add library-panel launcher-grid Bureau "Bon après-midi"'
};

describe('vérificateur de paquet', () => {
  it('accepte un paquet qui contient la refonte 2.0', async () => {
    const { code, output } = run(await makePackage(V2_FILES));
    expect(output).toContain('OK   horloge principale (CSS)');
    expect(output).toContain('9/9 contrôles réussis');
    expect(code).toBe(0);
  });

  it('refuse un ancien paquet 1.0 simplement renommé', async () => {
    const stale = await makePackage({
      'package.json': JSON.stringify({ name: 'cozydesk', version: '1.0.0' }),
      'dist/assets/index.css': '.dashboard{}.widget{}',
      'dist/assets/index.js': 'dashboard-grid widget-drag-handle'
    });
    const { code, output } = run(stale);
    expect(code).toBe(1);
    expect(output).toContain('FAIL version');
    expect(output).toContain('FAIL horloge principale (CSS)');
  });

  it('refuse un paquet dont la version ne correspond pas à package.json', async () => {
    const stale = await makePackage({
      'package.json': JSON.stringify({ name: 'cozydesk', version: '2.0.0' }),
      'dist/assets/index.css':
        '.hero-clock{}.floating-window{}.widget[data-appearance=transparent]{}',
      'dist/assets/index.js': 'workspace-add library-panel launcher-grid Bureau "Bon après-midi"'
    });
    const { code, output } = run(stale);
    expect(code).toBe(1);
    expect(output).toContain(`FAIL version ${APP_VERSION} déclarée`);
  });

  it('la version vérifiée est celle de package.json (pas une constante figée)', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    const builder = fs.readFileSync(path.resolve(__dirname, '../electron-builder.yml'), 'utf8');
    expect(builder).toContain(`CozyDesk-${APP_VERSION.split('.').slice(0, 2).join('.')}-Final-Setup`);
  });

  it('refuse un asar absent', () => {
    const { code } = run(path.join(os.tmpdir(), 'inexistant-cozydesk.asar'));
    expect(code).toBe(1);
  });
});
