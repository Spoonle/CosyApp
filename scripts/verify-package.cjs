#!/usr/bin/env node
/**
 * Vérifie qu'un paquet Electron contient réellement la refonte 2.0.
 *
 * Usage :
 *   node scripts/verify-package.cjs <app.asar> [--json=sortie.json] [--notes=notes.md]
 *
 * Sortie : une ligne OK/FAIL par contrôle, code retour 1 si un contrôle échoue.
 * Utilisé par la CI Windows et testable localement (npm test le couvre).
 */
const fs = require('node:fs');
const path = require('node:path');

/** Contrôles : chaque entrée décrit ce qui doit être présent dans le paquet. */
const CHECKS = [
  { name: 'version 2.0.0 déclarée', where: 'meta', test: (m) => m.version === '2.0.0' },
  {
    name: 'horloge principale (CSS)',
    where: 'css',
    test: (css) => css.includes('hero-clock')
  },
  {
    name: 'apparences de widgets (CSS)',
    where: 'css',
    test: (css) => css.includes('data-appearance') && css.includes('transparent')
  },
  {
    name: 'bouton d’ajout discret (JS)',
    where: 'js',
    test: (js) => js.includes('workspace-add')
  },
  {
    name: 'bibliothèque de widgets (JS)',
    where: 'js',
    test: (js) => js.includes('library-panel')
  },
  {
    name: 'lanceur de modules (JS)',
    where: 'js',
    test: (js) => js.includes('launcher-grid')
  },
  {
    name: 'réglages du bureau (JS)',
    where: 'js',
    test: (js) => js.includes('Espace de travail') || js.includes('Bureau')
  },
  {
    name: 'salut de l’horloge (JS)',
    where: 'js',
    test: (js) => js.includes('Bon après-midi')
  },
  {
    name: 'fenêtres flottantes (CSS)',
    where: 'css',
    test: (css) => css.includes('floating-window')
  }
];

function main() {
  const args = process.argv.slice(2);
  const asarPath = args.find((a) => !a.startsWith('--'));
  const jsonOut = args.find((a) => a.startsWith('--json='))?.slice(7);
  const notesOut = args.find((a) => a.startsWith('--notes='))?.slice(8);

  if (!asarPath || !fs.existsSync(asarPath)) {
    console.error(`app.asar introuvable : ${asarPath ?? '(non fourni)'}`);
    process.exit(1);
  }

  const asar = require('@electron/asar');
  const archive = asar.listPackage(asarPath);
  const read = (file) => asar.extractFile(asarPath, file.replace(/^[/\\]/, '')).toString();

  const resources = { meta: {}, css: '', js: '' };
  const packageEntry = archive.find((f) => /(^|[/\\])package\.json$/.test(f));
  if (packageEntry) resources.meta = JSON.parse(read(packageEntry));

  const cssFiles = archive.filter((f) => f.endsWith('.css'));
  const jsFiles = archive.filter((f) => f.endsWith('.js'));
  resources.css = cssFiles.map(read).join('');
  resources.js = jsFiles.map(read).join('');

  const results = CHECKS.map((check) => ({
    name: check.name,
    ok: Boolean(check.test(resources[check.where]))
  }));

  for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.name}`);

  const summary = {
    archive: path.basename(asarPath),
    version: resources.meta.version ?? null,
    entries: archive.length,
    cssFiles: cssFiles.length,
    jsFiles: jsFiles.length,
    checkedAt: new Date().toISOString(),
    passed: results.filter((r) => r.ok).length,
    total: results.length,
    results
  };
  console.log(
    `\n${summary.passed}/${summary.total} contrôles réussis — ${summary.entries} entrées, ` +
      `version ${summary.version}`
  );

  if (jsonOut) {
    fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
    fs.writeFileSync(jsonOut, JSON.stringify(summary, null, 2));
    console.log(`rapport écrit : ${jsonOut}`);
  }

  if (notesOut) {
    const lines = [
      '### Vérification automatique du paquet',
      '',
      `- Version empaquetée : **${summary.version}**`,
      `- Entrées dans \`app.asar\` : ${summary.entries} (${summary.cssFiles} CSS, ${summary.jsFiles} JS)`,
      `- Contrôles : **${summary.passed}/${summary.total}**`,
      '',
      ...results.map((r) => `- ${r.ok ? '✅' : '❌'} ${r.name}`)
    ];
    fs.writeFileSync(notesOut, lines.join('\n') + '\n');
    console.log(`notes écrites : ${notesOut}`);
  }

  process.exit(summary.passed === summary.total ? 0 : 1);
}

main();
