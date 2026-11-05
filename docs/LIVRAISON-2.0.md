# CozyDesk 2.0 — édition finale (livraison)

> Phase « GODMODE FINAL QA » : audit complet du code source 2.0, correction des
> défauts confirmés, validation des 12 modules et du système de widgets aux
> quatre résolutions cibles, puis compilation et vérification des exécutables
> Windows définitifs.

## 1. Télécharger les livrables

Publication GitHub (binaires produits sur un runner Windows officiel, à partir
du code de ce dépôt) :

**https://github.com/Spoonle/CosyApp/releases/tag/v2.0.0**

| Fichier | Taille (indicative) | Rôle |
|---|---|---|
| `CozyDesk-2.0-Final-Portable.exe` | ≈ 78 Mo | portable, aucune installation |
| `CozyDesk-2.0-Final-Setup.exe` | ≈ 78 Mo | installateur (dossier au choix, raccourcis bureau + menu Démarrer) |
| `CozyDesk-2.0-Final-Source.zip` | ≈ 328 Ko | code source exact utilisé pour cette compilation (sources, tests, docs) |
| `smoke-2.0.png` | ≈ 848 Ko | capture du binaire empaqueté en cours d'exécution (1024×720) |

L'ancien exécutable 1.0 n'est ni renommé, ni déplacé, ni écrasé.

## 1 bis. Essayer sans rien installer (aperçu navigateur)

```bash
cd .
npm ci
npm run build:electron && npx vite build      # produit dist/
npx vite preview --config preview.config.mjs  # http://localhost:4173
```

Ou en développement complet (fenêtre Electron réelle) :

```bash
npm ci
npm run dev
```

Le mode navigateur sert le build de production réel, mais **ce n'est pas
l'application** : les contrôles de fenêtre Electron, les sélecteurs de fichiers
locaux et les médias locaux y sont inactifs, et les données vivent dans
l'IndexedDB du navigateur.

## 2. Ce qui a été corrigé dans cette phase finale

Aucune refonte : uniquement des défauts confirmés, corrigés dans le code.

1. **Réglage d'animations dédoublonné.** Deux interrupteurs persistaient le même
   choix et pouvaient diverger. `workspace.motion` est désormais l'unique source
   de vérité (schéma **v3**, migration automatique v2 → v3 sans perte).
2. **Dispositions de widgets fiabilisées.** Toute disposition persistée passe par
   `sanitizeWidgets()` : type inconnu, identifiant dupliqué, coordonnées hors
   grille, apparence invalide ou chevauchement sont réparés ; en dernier recours,
   retour à la disposition par défaut. Le mode édition n'est plus persisté.
3. **Plus de chevauchement possible à la souris.** Déplacement et
   redimensionnement refusent une collision et conservent la dernière position
   valide.
4. **Dock prévisible.** Cliquer sur un module ouvert l'amène au premier plan
   (avant : il se fermait) ; un module réduit est restauré. La fermeture reste le
   bouton « Fermer » de la fenêtre — aucune action destructrice invisible.
5. **Fenêtres toujours accessibles.** Au redimensionnement de l'écran, une
   réconciliation débouncée (150 ms) ramène les fenêtres dans l'espace visible.
6. **Horloge plus économe.** Le rendu passe à 5 s quand les secondes sont
   masquées (au lieu de 1 s).
7. **Cascade CSS explicite.** Ordre d'import corrigé, styles de l'espace de
   travail en dernière couche.
8. **Zéro contournement.** Les trois `eslint-disable` restants ont été supprimés
   en corrigeant les causes (effets redondants, liste de dépendances incomplète).
   Aucun `@ts-ignore`, `@ts-expect-error` ni `catch` vide dans le dépôt.
9. **Code mort supprimé.** Cinq exports jamais utilisés et trois sélecteurs CSS
   orphelins retirés ; aucun impact fonctionnel.

## 3. Validation exécutée

| Commande | Résultat |
|---|---|
| `npm run typecheck` | 0 erreur (renderer + processus principal) |
| `npm run lint` | 0 erreur, 0 avertissement |
| `npm run test` | **143 tests / 15 fichiers**, 0 échec, 0 avertissement React |
| `npm run build` | bundle de production produit |

Tests ajoutés dans cette phase :

- `tests/modules.test.tsx` — les 12 modules et les 12 widgets montent et
  démontent sans erreur console ;
- `tests/integrity.test.ts` — migrations, assainissement des dispositions,
  persistance, export/import ;
- `tests/layout.test.ts` — 1280×720, 1366×768, 1600×900, 1920×1080 : fenêtres
  dans l'écran quel que soit le dock, cellules de grille utilisables, aucune
  disposition qui déborde ;
- `tests/dock.test.tsx` — ouvrir, ramener au premier plan, restaurer, lanceur
  complet, disparition quand le dock est masqué.

## 4. Vérification du binaire empaqueté (CI Windows)

| Contrôle | Résultat |
|---|---|
| Contenu de `app.asar` (`scripts/verify-package.cjs`) | 42 entrées — **9/9** contrôles |
| Lancement de l'exécutable empaqueté | `exit=0` |
| Rendu de l'interface | capture ≈ 848 Ko, 1024×720 |
| Création du répertoire de données | `%APPDATA%\CozyDesk` |
| Présence des trois livrables | vérifiée par une barrière de fin de job |

## 5. Limites déclarées

- Aucun binaire Windows n'a été exécuté **sur cette machine** (environnement
  Linux sans runtime Windows ni `wine`) : la compilation et les preuves
  d'exécution proviennent du runner Windows de la CI, publiées en annotations et
  dans la release.
- Les gestes purement graphiques (glisser-déposer au pixel, fluidité perçue) ne
  sont pas mesurables sans affichage ; leur logique est couverte par les tests de
  stores.
- Aucune mesure de FPS sur du matériel Intel intégré réel n'a pu être faite ici ;
  les optimisations sont structurelles (horloge à 5 s, réconciliation
  débouncée, pas de flou simultané sur tous les éléments).

Rapport détaillé, ligne par ligne (PASS / FAIL / NON EXÉCUTÉ) :
[`docs/QA-FINAL-2.0.md`](docs/QA-FINAL-2.0.md).
