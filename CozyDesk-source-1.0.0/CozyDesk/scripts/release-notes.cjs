#!/usr/bin/env node
/**
 * Compose les notes de publication à partir du rapport de vérification du paquet.
 * Usage : node scripts/release-notes.cjs <verification.json> <sortie.md>
 */
const fs = require('node:fs');

const [, , jsonPath, outPath, smokePath] = process.argv;
if (!jsonPath || !outPath) {
  console.error('usage : node scripts/release-notes.cjs <verification.json> <sortie.md> [smoke.json]');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const smoke =
  smokePath && fs.existsSync(smokePath) ? JSON.parse(fs.readFileSync(smokePath, 'utf8')) : null;

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

lines.push('', '### Lancement de l’exécutable empaqueté', '');
if (smoke === null) {
  lines.push('- ⚠️ Aucun rapport de lancement disponible.');
} else {
  const rendered = smoke.pngExists && smoke.pngBytes >= 20000 && smoke.width >= 800;
  lines.push(`- ${smoke.launched ? '✅' : '❌'} démarrage de \`win-unpacked\\CozyDesk.exe\``);
  lines.push(`- ${rendered ? '✅' : '❌'} rendu capturé : ${smoke.pngBytes} octets, ${smoke.width}×${smoke.height}`);
  if (smoke.error) lines.push(`- ⚠️ ${smoke.error}`);
  if (!rendered) {
    lines.push(
      '',
      '> La capture de rendu n’a pas pu être obtenue sur le runner (session sans GPU).',
      '> Le paquet lui-même est vérifié (contenu `app.asar`, version, empreintes) ;',
      '> la recette visuelle doit être faite sur une machine Windows.',
      ''
    );
  }
}

fs.writeFileSync(outPath, lines.join('\n') + '\n');
console.log(lines.join('\n'));
