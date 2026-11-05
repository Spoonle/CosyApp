# CozyDesk Minimal 2.0 — livraison

> Refonte réelle du code source de CozyDesk 1.0.0, testée, compilée et empaquetée
> en deux exécutables Windows vérifiés.

## 1. Télécharger les exécutables

Publication GitHub (binaires produits sur un runner Windows officiel, à partir de ce dépôt) :

**https://github.com/Spoonle/CosyApp/releases/tag/v2.0.0**

| Fichier | Taille | Rôle |
|---|---|---|
| `CozyDesk-Minimal-2.0-Portable.exe` | 81 681 026 octets | portable, aucune installation |
| `CozyDesk-Minimal-2.0-Setup.exe` | 81 895 343 octets | installateur (dossier, raccourcis) |
| `smoke-2.0.png` | 868 033 octets | capture du binaire empaqueté en cours d'exécution |

L'ancien exécutable 1.0 n'est ni renommé, ni déplacé, ni écrasé : ces deux fichiers portent
un nom distinct et sont les seuls produits par cette refonte.

## 2. Ce qui a changé, en une page

**Le bureau, pas un tableau de bord.** Trois widgets au premier lancement — horloge,
pomodoro, tâches — au lieu de neuf, et **transparents par défaut** : le fond d'écran reste
visible, le texte se pose dessus.

**L'horloge devient le centre.** Composant dédié (`HeroClock.tsx`) : trois tailles
(moyenne / grande / très grande), trois styles (empilé / en ligne / épuré), secondes, date
complète, salut optionnel avec prénom. Elle se met à l'échelle du widget via les unités de
conteneur, jamais l'inverse.

**L'interface se retire.** Barre de titre de 46 → **34 px**, sans logo ni libellé. Dock de
46 → **36 px** : infobulles, indicateur d'activité, **auto-masquage**, ancrage bas/gauche/
droite, raccourcis personnalisables, et un **lanceur** qui garde les 12 modules accessibles.

**Personnaliser sans encombrer.** Hors édition, un seul contrôle : un `+` discret à 42 %
d'opacité. En édition, les outils n'apparaissent qu'au survol du widget (apparence, compact,
masquer, retirer, redimensionner). Bibliothèque de widgets, presets de disposition
(Minimal / Concentration / Classique) et **dispositions nommées** sauvegardables.

**Réglages « Bureau »** dans le module Paramètres : horloge, apparence et espacement des
widgets, marges, dock, voile du fond d'écran, intensité des animations, disposition par défaut.

**Performance respectée.** Les widgets transparents n'appliquent **aucun** `backdrop-filter` ;
seuls les modes subtil/verre en posent un, et les profils Équilibrée/Performance les
désactivent. Pas de flou sur tous les éléments à la fois.

## 3. Vos données sont conservées

- `productName` (`CozyDesk`) et `appId` (`app.cozydesk.desktop`) inchangés → même répertoire
  `%APPDATA%\CozyDesk`, donc la 2.0 relit la base IndexedDB de la 1.0.
- Deux schémas `localStorage` passent en v2 avec des migrations **pures, testées et non
  destructives** (`migrateSettings`, `migrateDashboard`) : thème, mode, accent, wallpaper,
  pomodoro et **disposition existante** sont repris tels quels.
- Aucune migration IndexedDB : le schéma des 12 modules est intact.

## 4. Preuves de vérification

| Contrôle | Résultat |
|---|---|
| `npm run typecheck` | 0 erreur |
| `npm run lint` | 0 erreur, 0 avertissement |
| `npm run test` | **87 tests, 11 fichiers, tous verts** |
| `npm run build` | Vite + esbuild OK, 12 modules en chunks séparés |
| Contenu de `app.asar` du paquet Windows | **9/9** contrôles (horloge, apparences, bibliothèque, lanceur, réglages, version 2.0.0) |
| Lancement de `win-unpacked\CozyDesk.exe` | code de sortie 0, capture 868 033 octets, 1024 × 720 |
| Répertoire de données | `%APPDATA%\CozyDesk` créé au lancement |

Un test dédié prouve que le vérificateur **rejette** un ancien paquet 1.0 simplement renommé :
la livraison ne peut pas être un exécutable recyclé.

## 5. Limites honnêtes de cet environnement

1. **Pas de runtime Electron ici.** Les binaires Electron sont servis par
   `objects.githubusercontent.com`, bloqué au niveau TCP dans ce conteneur ; `electron .` ne
   peut donc pas y être lancé. C'est pourquoi la compilation Windows passe par GitHub Actions.
2. **Pas de navigateur ni de pile graphique** : aucune capture locale possible. Le rendu a été
   vérifié par tests DOM (jsdom) et par la capture du binaire empaqueté produite en CI.
3. **Je n'ai pas pu regarder cette capture** (assets de release également bloqués) : le rendu
   est prouvé par sa taille et ses dimensions, pas inspecté visuellement. Ouvrez
   `smoke-2.0.png` ou l'application pour la recette visuelle finale.
4. **`wine` non installable** : la compilation Windows locale est impossible ; `npm run dist:win`
   fonctionne sur une machine Windows, `npm run dist:win:nosign` sous Linux sans wine.

## 6. Pour reconstruire

```bash
npm ci
npm run dev          # développement (Vite + Electron)
npm run typecheck && npm run lint && npm run test
npm run dist:win     # Windows : portable + installateur
```

Le workflow `.github/workflows/build-windows.yml` refait tout (tests → build → paquet →
vérification de `app.asar` → lancement du binaire → publication) sur `workflow_dispatch` ou
sur un tag `v2*`.

## 7. Documentation

- `docs/REDESIGN-2.0.md` — architecture, modèle d'apparence, migrations, géométrie.
- `docs/QA-2.0.md` — campagne de tests, vérifications du paquet, limites, recette manuelle.
