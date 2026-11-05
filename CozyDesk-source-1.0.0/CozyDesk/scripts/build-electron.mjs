import { build, context } from 'esbuild';
import { rm } from 'node:fs/promises';

const watch = process.argv.includes('--watch');

const common = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron'],
  sourcemap: 'inline',
  logLevel: 'info'
};

const entries = [
  { entryPoints: ['electron/main.ts'], outfile: 'dist-electron/main.cjs' },
  { entryPoints: ['electron/preload.ts'], outfile: 'dist-electron/preload.cjs' }
];

if (watch) {
  const ctxs = await Promise.all(entries.map((e) => context({ ...e, ...common })));
  await Promise.all(ctxs.map((c) => c.watch()));
  console.log('[build-electron] surveillance des changements...');
} else {
  await rm('dist-electron', { recursive: true, force: true });
  await Promise.all(entries.map((e) => build({ ...e, ...common })));
  console.log('[build-electron] main.cjs + preload.cjs générés.');
}
