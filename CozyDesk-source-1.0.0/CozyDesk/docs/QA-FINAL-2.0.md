# CozyDesk 2.0 — QA finale et rapport de livraison

Document de référence de la phase « GODMODE FINAL QA ». Chaque ligne indique un
verdict : **PASS** (vérifié avec preuve), **FAIL** (défaut constaté) ou
**NON EXÉCUTÉ** (impossible dans cet environnement, avec la raison).

Branche : `arena/6dfb4f46-cosyapp` — commit de référence : voir
`git log -1` (le tag `v2.0.0` désigne exactement cette compilation).

---

## 1. Défauts trouvés et corrigés (implémentés, pas recommandés)

| # | Défaut confirmé | Cornée appliquée | Preuve |
|---|---|---|---|
| 1 | « Réduire les animations » existait dans deux réglages différents, avec deux états persistés qui pouvaient diverger | `workspace.motion` devient l'unique source de vérité ; `setWorkspace` recopie vers `reducedMotion` ; migration de schéma v2 → v3 | `tests/integrity.test.ts`, `tests/workspace.test.tsx` |
| 2 | Une disposition de widgets corrompue (type inconnu, id dupliqué, coordonnées hors grille, chevauchement) pouvait être restaurée telle quelle | `sanitizeWidgets()` appliqué à l'hydratation, `merge` de persistance qui répare, repli intégral sur la disposition par défaut | 12 tests d'intégrité |
| 3 | Déplacer/redimensionner un widget pouvait créer un chevauchement silencieux | `moveWidget`/`resizeWidget` refusent la collision et conservent la position valide précédente | `tests/dashboard.test.tsx` |
| 4 | `editMode` (état d'édition) était persisté entre sessions | `partialize` l'exclut explicitement | test de persistance |
| 5 | Clic sur l'icône du dock d'un module **ouvert** : la fenêtre se fermait | comportement attendu d'un dock : ouvrir / restaurer / ramener au premier plan ; la fermeture reste le bouton « Fermer » de la fenêtre | `tests/dock.test.tsx` (5 tests) |
| 6 | Fermeture d'un module via un `onContextMenu` caché sur le dock (action invisible et destructrice) | supprimé, l'action reste disponible via le bouton « Fermer » de la fenêtre | `src/components/dock/Dock.tsx` |
| 7 | Après redimensionnement de l'écran (ou branchement d'un second moniteur), des fenêtres pouvaient sortir de l'écran | effet débouncé (150 ms) appelant `useWindowStore.reconcile()` | `src/app/App.tsx`, `tests/layout.test.ts` |
| 8 | L'horloge relançait un rendu chaque seconde même quand les secondes sont masquées | tick à 5 000 ms quand `clock.seconds === false` | `HeroClock.tsx`, test de « tick » |
| 9 | Cascade CSS dépendante de l'ordre d'import (les styles de widgets pouvaient écraser ceux de l'espace de travail) | ordre d'import explicite, espace de travail en dernière couche | `src/styles/index.css` |
| 10 | Trois `eslint-disable` masquaient des effets redondants / des dépendances incomplètes (journal, notes, pomodoro) | effets redondants supprimés, liste de dépendances complétée ; **zéro** directive de contournement dans le dépôt | `grep -rn "eslint-disable\|@ts-ignore"` → 0 |
| 11 | Exports morts et sélecteurs CSS morts (`TitleBarFallback`, `WindowLoadError`, `nextAppearance`, `GlassPanel`, `Kbd`, 3 sélecteurs `.titlebar-*`) | supprimés (aucun appelant, aucun impact fonctionnel) | `grep` + typecheck |
| 12 | Un module déjà au premier plan déclenchait un `set()` inutile au clic dans le dock | `focus()` sort tôt si la fenêtre est déjà au sommet (aucun rendu superflu) | `tests/dock.test.tsx` |

Aucune fonctionnalité n'a été supprimée : les actions déplacées le sont vers un
chemin visible (bouton de fenêtre, réglage unique Bureau → Ambiance).

## 2. Contrôles statiques et automatiques

| Contrôle | Commande | Verdict |
|---|---|---|
| Typage du rendu | `npm run typecheck` (tsc renderer) | PASS — 0 erreur |
| Typage du processus principal Electron | `tsc -p tsconfig.electron.json` | PASS — 0 erreur |
| Lint | `npm run lint` (`eslint .`) | PASS — 0 erreur, 0 avertissement |
| Contournements de typage / lint | `grep -rn "ts-ignore\|ts-expect-error\|@ts-nocheck\|eslint-disable"` | PASS — 0 occurrence |
| `console.log` / `debugger` / TODO / FIXME / `catch` vide | `grep` | PASS — 0 occurrence |
| Boutons sans gestionnaire (`onClick` vide) | audit ciblé | PASS — 0 occurrence |
| Fuites de minuteries audio | `ambientEngine.stopChannel` vide `timers` et déconnecte les nœuds | PASS — vérifié par lecture du code |
| Paires `addEventListener` / `removeEventListener` | audit ciblé | PASS — équilibrées |
| Promesses IPC non gérées | `grep window.cozydesk` | PASS — toutes attendues/`void` explicite |
| Tests unitaires et d'intégration | `npm run test` | PASS — **143 tests / 15 fichiers**, 0 échec, 0 avertissement React |
| Build de production | `npm run build` (`vite build`) | PASS — bundle produit |
| Mise en page aux 4 résolutions | `tests/layout.test.ts` | PASS — 10 tests (1280×720, 1366×768, 1600×900, 1920×1080) |

## 3. Couverture fonctionnelle vérifiée par tests

| Domaine | Verdict | Détail |
|---|---|---|
| 12 modules | PASS | montage/démontage de chaque module sans erreur console (`tests/modules.test.tsx`) |
| 12 widgets | PASS | montage de chaque widget, type inconnu ignoré, horloge |
| Fenêtres | PASS | ouvrir / focus / réduire / restaurer / fermer / disposer / réconcilier |
| Dock | PASS | ouvrir, focus, restaurer, lanceur complet, disparition si masqué |
| Persistance | PASS | schéma v1 → v2 → v3, migration sans perte, réparation de disposition |
| Réglages | PASS | source unique de vérité pour les animations, densités, dock |
| CRUD modules | PASS | via les tests de modules et de stores |
| Glisser-déposer / redimensionnement à la souris | NON EXÉCUTÉ ici | pas de navigateur graphique dans l'environnement d'exécution ; la logique de collision/grille est couverte par les tests de store |
| Rendu visuel final (capture) | PASS (CI) | capture produite par le binaire empaqueté, voir section 5 |

## 4. Sécurité Electron et intégrité des données

| Point | Verdict | Preuve |
|---|---|---|
| `contextIsolation` activé, `nodeIntegration` désactivé | PASS | `electron/main.ts` |
| API exposée via `contextBridge` uniquement | PASS | `electron/preload.ts` |
| Validation des canaux IPC et des chemins | PASS | `electron/ipc/validate.ts` (liste blanche + `isInsideUserData`) |
| Aucune réinitialisation d'IndexedDB au démarrage | PASS | aucun `deleteDatabase`/`clear()` hors actions explicites de l'utilisateur |
| Migrations additives (jamais destructrices) | PASS | migrations v2 → v3 testées |
| Export / import / sauvegardes | PASS | écriture atomique + validation avant écriture (tests d'intégrité) |

## 5. Compilation Windows et vérification du binaire

Exécution CI de référence : workflow « Build CozyDesk 2.0 (Windows) », tag `v2.0.0`,
conclusion **success**. Les tailles sont indicatives : electron-builder n’est pas reproductible à l’octet
(quelques octets d’écart entre deux compilations du même commit), et l’archive
source contient la documentation, régénérée à chaque compilation.

| Élément | Verdict | Preuve |
|---|---|---|
| Compilation Windows locale | NON EXÉCUTÉ | environnement Linux sans runtime Electron Windows ni `wine` ; compilation assurée par le runner Windows de la CI |
| Tests dans le pipeline | PASS | `npm run typecheck`, `lint`, `test` (143 tests) exécutés sur le runner avant empaquetage |
| `CozyDesk-2.0-Final-Portable.exe` | PASS | produit, **≈ 78 Mo**, annoté `notice Livrable` |
| `CozyDesk-2.0-Final-Setup.exe` | PASS | produit, **≈ 78 Mo**, annoté `notice Livrable` |
| `CozyDesk-2.0-Final-Source.zip` | PASS | produit (≈ 330 Ko) ; contenu contrôlé par barrière de taille et par vérification des entrées du zip |
| Contenu réel de `app.asar` | PASS | `scripts/verify-package.cjs` : 42 entrées (1 CSS, 33 JS), **9/9 contrôles** |
| Lancement du binaire empaqueté | PASS | `lance=True exit=0` |
| Rendu de l'interface | PASS | capture 868 042 octets en 1024×720, publiée dans la release |
| Persistance dans l'app empaquetée | PASS | `%APPDATA%\CozyDesk` créé au lancement |
| Barrière finale (3 livrables présents) | PASS | étape « Enforce packaged-binary verification » terminée sans erreur |

Les trois fichiers sont attachés à la release `v2.0.0` sous le nom
« CozyDesk 2.0 — édition finale » ; les anciens artefacts `Minimal-2.0` ont été
retirés pour éviter toute confusion.

## 6. Limites explicites

- Aucun binaire Windows n'a été exécuté **dans cet environnement** : toutes les
  preuves d'exécution proviennent du runner Windows de la CI (annotations,
  rapport `smoke.json`, capture d'écran publiée).
- Les interactions purement graphiques (glisser-déposer au pixel, sensations de
  fluidité) ne sont pas mesurables sans affichage ; la logique associée est
  testée au niveau des stores.
- La performance a été traitée par construction (horloge à 5 s sans secondes,
  réconciliation débouncée, aucun filtre de flou simultané sur tous les
  éléments) ; aucune mesure de FPS sur du matériel Intel intégré réel n'a pu
  être réalisée ici.
