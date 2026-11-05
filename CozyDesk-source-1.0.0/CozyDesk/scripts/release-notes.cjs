#!/usr/bin/env node
/**
 * Compose les notes de publication à partir du rapport de vérification du paquet.
 * Usage : node scripts/release-notes.cjs <verification.json> <sortie.md>
 */
const fs = require('node:fs');

const [, , jsonPath, outPath] = process.argv;
if (!jsonPath || !outPath) {
  console.error('usage : node scripts/release-notes.cjs <verification.json> <sortie.md>');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const lines = [
  'CozyDesk Minimal 2.0 — bureau premium minimaliste.',
  '',
  '- `CozyDesk-Minimal-2.0-Portable.exe` : version portable, aucune installation.',
  '- `CozyDesk-Minimal-2.0-Setup.exe` : installateur (choix du répertoire, raccourcis).',
  '',
  'Compilé depuis les sources de ce dépôt sur un runner Windows officiel, puis vérifié',
  'automatiquement : contenu de `app.asar`, lancement réel de l’exécutable empaqueté',
  '(capture `smoke-2.0.png`), création du répertoire de données.',
  '',
  '### Vérification automatique du paquet',
  '',
  `- Version empaquetée : **${report.version}**`,
  `- Entrées dans \`app.asar\` : ${report.entries} (${report.cssFiles} CSS, ${report.jsFiles} JS)`,
  `- Contrôles : **${report.passed}/${report.total}**`,
  ''
];

for (const result of report.results) {
  lines.push(`- ${result.ok ? '✅' : '❌'} ${result.name}`);
}

fs.writeFileSync(outPath, lines.join('\n') + '\n');
console.log(lines.join('\n'));
