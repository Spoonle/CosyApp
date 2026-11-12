# Build, tests et publication

## 1. Chaîne de build

```text
src/renderer/**  ──Vite──►      dist/           (HTML + JS + CSS découpés)
src/main/**      ──esbuild──►   dist-electron/main.cjs
src/preload/**   ──esbuild──►   dist-electron/preload.cjs
dist/ + dist-electron/ + package.json ──electron-builder──► release/
```

`npm run build` enchaîne : `typecheck` → `lint` → `test` → `build:electron` →
`vite build`. Un échec à n'importe quelle étape arrête tout.

## 2. Commandes

| Commande | Résultat | Vérifié ici |
|---|---|---|
| `npm ci` | installation reproductible depuis `package-lock.json` | oui |
| `npm run typecheck` | `tsc` rendu + `tsc` processus principal | oui |
| `npm run lint` | ESLint 9, zéro avertissement | oui |
| `npm run test` | Vitest, 17 fichiers / 174 tests | oui |
| `npm run build` | tout ci-dessus + `dist/` + `dist-electron/` | oui |
| `npm run package` | `release/CozyDesk-2.1-Final-Portable.exe` + `-Setup.exe` | CI Windows uniquement |
| `npm run package:nosign` | variante sans signature, pour Linux sans `wine` | non testé localement |
| `npm run preview:web` | `dist/` servi sur http://localhost:4173 | oui |

## 3. Empaquetage Windows

`electron-builder.yml` :

- cibles `nsis` (installateur) et `portable`, architecture x64 ;
- `files` : `dist/**`, `dist-electron/**`, `package.json` — aucun `node_modules`
  applicatif n'est embarqué (tout est bundlé) ;
- noms d'artefacts fixes : `CozyDesk-2.1-Final-Setup.exe`,
  `CozyDesk-2.1-Final-Portable.exe` ;
- `signAndEditExecutable: true` (incrustation de l'icône native).

**Limite connue** : produire un exécutable Windows depuis Linux/macOS demande
`wine` pour la signature et l'édition de l'exe. Sans `wine`, utilisez
`npm run package:nosign` (l'exe reste fonctionnel, l'icône n'est pas incrustée).
La voie de référence reste GitHub Actions sur un runner Windows.

## 4. Pipeline CI

`.github/workflows/build-windows.yml`, déclenché par un tag `v*` ou manuellement
(`workflow_dispatch`) :

1. `npm ci` (cache npm) ;
2. `typecheck`, `lint`, `test` ;
3. `build:electron` + `vite build` ;
4. `electron-builder --win --x64 --publish never` ;
5. **vérification du contenu de `app.asar`** (`scripts/verify-package.cjs`, 9
   contrôles : version, CSS d'horloge, apparences, bibliothèque de widgets,
   lanceur, réglages, fenêtres flottantes) ;
6. **lancement réel** du binaire empaqueté en mode smoke
   (`--smoke-test=… --open=tasks,notes`), capture `smoke-2.1.png` et rapport
   `smoke.json` ;
7. contrôle que `%APPDATA%\CozyDesk` a été créé (persistance) ;
8. **archive source** `CozyDesk-2.1-Final-Source.zip` avec vérification de ses
   entrées (14 fichiers clés présents, aucun `node_modules`/`dist`/`release`) ;
9. publication de la release **uniquement sur tag** ;
10. barrière finale : les trois livrables doivent exister et la capture doit être
    valide, sinon le job échoue.

Les diagnostics sont émis en annotations (`::notice` / `::error`) pour rester
lisibles même quand les logs ne sont pas accessibles.

## 5. Publier une version

```bash
# 1. Vérifier localement
npm ci && npm run build

# 2. Commit, puis tag
git tag -a v2.1.0 -m "CozyDesk 2.1"
git push origin v2.1.0

# 3. La CI construit, vérifie et publie les trois livrables
gh run watch
gh release view v2.1.0
```

Un build manuel (sans tag) produit les artefacts dans l'onglet *Actions* sans
toucher à la release : utile pour valider une branche.

## 6. Ce qui est vérifié automatiquement

| Contrôle | Où |
|---|---|
| typage des deux processus | `npm run typecheck` |
| style et pièges React | `npm run lint` |
| comportement des stores, modules, widgets, mise en page | `tests/` |
| contenu réel du paquet | étape 5 de la CI |
| démarrage et rendu de l'exe | étape 6 |
| persistance après démarrage | étape 7 |
| intégrité de l'archive source | étape 8 |

Ce qui **n'est pas** vérifié automatiquement : le rendu visuel pixel par pixel et
les gestes de glisser-déposer. Voir `docs/RELEASE-2.1.md` (§7) et
`docs/QA-FINAL-2.0.md`, section « Limites ».
