# Contribuer à CozyDesk

Merci de prendre le temps de contribuer. Ce document décrit comment préparer
l'environnement, coder, tester et proposer une modification.

## 1. Environnement de développement

```bash
git clone https://github.com/Spoonle/CozyDesk.git
cd CosyApp
npm ci
npm run dev
```

| Outil | Version |
|---|---|
| Node.js | 20+ (22 recommandé) |
| npm | 10+ |
| Windows | requis uniquement pour produire les `.exe` |

`npm run dev` lance Vite sur `http://127.0.0.1:5173` puis Electron. Si le port est
occupé, Vite s'arrête (`strictPort`) : libérez-le plutôt que de changer le port,
la configuration Electron le référence.

## 2. Avant d'écrire du code

1. Vérifiez qu'un test couvre déjà le comportement visé (`tests/`).
2. Pour un défaut : reproduisez-le, puis ajoutez un test qui échoue avant la
   correction.
3. Regardez `docs/ARCHITECTURE.md` pour savoir **où** placer le code.

## 3. Conventions de code

### TypeScript

- `strict`, `noUnusedLocals`, `noUnusedParameters` : aucun contournement.
- **Interdits** : `any`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`,
  `eslint-disable`, assertions non-nulles (`!`). Si le typage bloque, corrigez le
  type — ne le taisez pas.
- Import de type explicite (`import type { X }`), valeurs par défaut sûres.
- Le contrat IPC vit dans `src/shared/types/ipc.ts` ; il ne doit importer que des
  types (jamais de code du rendu).

### React

- Composants en `function`, un composant par fichier dès qu'il dépasse ~150 lignes.
- Effets : dépendances complètes. Pas de réinitialisation d'état via `useEffect`
  quand une clé (`key`) ou un état dérivé suffit.
- Pas de `useEffect` pour synchroniser deux stores : une seule source de vérité.
- Les listes longues utilisent `useMemo` ; les valeurs dérivées ne sont pas
  stockées dans un état supplémentaire.

### État (Zustand)

- Un store par domaine (`src/renderer/stores`).
- Persistance : `name: 'cozydesk.<domaine>.v1'`, `partialize` pour exclure l'état
  éphémère (mode édition, survol…).
- Toute montée de version de schéma passe par `version` + `migrate`.

### Styles

- Tokens et thèmes dans `src/renderer/styles/tokens.css` et `themes.css`.
- `src/renderer/styles/index.css` définit l'ordre des couches : l'espace de travail
  est importé **en dernier**.
- Évitez les styles en ligne pour ce qui est réutilisé : préférez une classe.
- L'esthétique Liquid Glass est une contrainte produit : ne changez pas la
  direction visuelle sans en discuter.

### Nommage

- Fichiers de composants en `PascalCase.tsx`, modules utilitaires en `camelCase.ts`.
- Messages d'erreur et commentaires en français, identifiants en anglais.
- Aucun `console.log` laissé dans le code : `console.error`/`warn` préfixés
  (`[cozydesk:domaine]`) pour les erreurs réelles.

## 4. Tests

```bash
npm run test            # une passe
npm run test:watch      # en continu
npm run test -- tests/windows.test.ts
```

Exigences :

- toute correction de défaut arrive avec un test de non-régression ;
- toute nouvelle fonctionnalité a au moins un test de comportement (pas seulement
  de rendu) ;
- un test ne doit produire **aucun** avertissement console (React `act`, erreurs) ;
- la suite complète doit rester verte : `npm run build` (typecheck + lint + tests).

Le projet n'utilise pas de snapshots : les assertions portent sur le comportement
observable.

## 5. Commits

Format : `type(portée): impératif présent, français`.

| Type | Usage |
|---|---|
| `feat` | nouvelle fonctionnalité |
| `fix` | correction de défaut |
| `refactor` | réorganisation sans changement de comportement |
| `test` | tests seuls |
| `docs` | documentation seule |
| `chore` | outillage, dépendances, CI |

Exemple : `fix(widgets): refuser un redimensionnement qui chevauche un autre widget`.

Un commit = un changement cohérent, validé (`npm run typecheck && npm run lint &&
npm run test`).

## 6. Branches et pull requests

- Branche depuis `main`, nom court et descriptif (`fix/dock-focus`,
  `refactor/widget-bodies`).
- Une PR = un sujet. Pas de refactor massif mélangé à une correction.
- La description indique : le problème, la solution, ce qui a été testé et les
  limites connues.
- La CI doit être verte (typecheck, lint, tests, empaquetage Windows).
- Les PR qui suppriment une fonctionnalité, réinitialisent des données
  utilisateur ou affaiblissent la sécurité d'Electron sont refusées.

## 7. Données utilisateur

Règle absolue : **on ne supprime jamais de données existantes**.

- Changement de schéma IndexedDB → nouvelle `db.version(n+1)` avec migration
  explicite et test.
- Changement de préférences `localStorage` → `version` + `migrate` dans le store.
- Toute migration doit être testée avec des données « anciennes » réalistes (voir
  `tests/legacy.test.ts` et `tests/integrity.test.ts`).

## 8. Sécurité

Toute modification du processus principal doit préserver :

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` ;
- une API `preload` minimale (une fonction = un besoin réel) ;
- la validation systématique des entrées IPC (`src/main/ipc/validate.ts`) ;
- l'absence de navigation externe non contrôlée et l'ouverture de liens
  `https:` uniquement.

Une PR qui élargit la surface d'attaque doit le justifier explicitement.
