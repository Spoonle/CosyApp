# Gestion d'état

CozyDesk utilise **Zustand 5**. Chaque domaine a un store unique, persisté ou non.

## 1. Inventaire

| Store | Fichier | Persisté | Rôle |
|---|---|---|---|
| `settings` | `stores/settings.ts` | oui (`v3`) | thème, accent, densité, animations, dock, horloge, météo, pomodoro par défaut |
| `dashboard` | `stores/dashboard.ts` | oui | widgets, dispositions sauvegardées, mode édition (non persisté) |
| `windows` | `stores/windows.ts` | oui | fenêtres internes : position, taille, z, réduction, accrochage |
| `pomodoro` | `stores/pomodoro.ts` | oui | état du minuteur + journalisation des sessions |
| `music` | `stores/music.ts` | oui | file de lecture, volume, lecture en cours |
| `ambient` | `stores/ambient.ts` | oui | canaux sonores actifs et volumes |
| `palette` | `stores/palette.ts` | oui | dernière commande utilisée |
| `toast` | `stores/toast.ts` | non | notifications et confirmations éphémères |

## 2. Invariants

Ces règles sont garanties par le code et vérifiées par les tests.

### `settings`

- `workspace.motion` est **l'unique** source de vérité pour « réduire les
  animations » ; `reducedMotion` reste un miroir maintenu par `setWorkspace`.
  `applySettingsToDom` lit `workspace.motion`.
- Toute écriture passe par les actions du store ; aucune mutation directe de
  `state.settings` depuis un composant.
- Schéma **v3** : migration v1 → v2 (ajout de `workspace`) puis v2 → v3
  (alignement de `reducedMotion` sur `workspace.motion`).

### `dashboard`

- Grille de 12 colonnes ; toute disposition est validée par `sanitizeWidgets()`
  au chargement (type inconnu, identifiant dupliqué, coordonnées hors grille,
  chevauchement, apparence invalide).
- `moveWidget` / `resizeWidget` **refusent** une position qui chevauche un autre
  widget : la dernière position valide est conservée.
- `partialize` exclut `editMode` : on ne rouvre jamais en mode édition.
- `merge` répare la disposition persistée à l'hydratation.

### `windows`

- Une seule entrée par module ; `open()` focus, `focus()` sort tôt si la fenêtre
  est déjà au sommet (aucun rendu inutile).
- `reconcile()` replace les fenêtres dans l'écran au démarrage et à chaque
  redimensionnement (débounce 150 ms dans `App`).
- `dockReserve()` et `workspaceBounds()` sont les seules sources de vérité pour
  l'espace disponible.

### `pomodoro`

- Le moteur (`services/pomodoroEngine.ts`) est pur et horodaté : l'état survit à
  une mise en veille ou à un rechargement, il est réconcilié à la reprise.
- Chaque phase terminée écrit une ligne dans `pomodoroSessions` (IndexedDB).

## 3. Ce qui n'est **pas** dans un store

| Donnée | Où | Pourquoi |
|---|---|---|
| liste des modules | `modules/registry.ts` | constante, aucune variation à l'exécution |
| types de widgets, tailles | `stores/dashboard.ts` + `components/dashboard/widgetMeta.ts` | constantes de configuration |
| thèmes, tokens | CSS (`styles/tokens.css`, `themes.css`) | variables CSS, aucun JS |
| horloge | `useNow()` (`hooks`) | valeur dérivée du temps, jamais persistée |

## 4. Règles pour ajouter un état

1. L'état appartient-il à un domaine existant ? Sinon, nouveau store.
2. Est-il utile après un redémarrage ? Si non → pas de `persist`, ou `partialize`.
3. Sa forme change-t-elle ? → incrémenter `version` et écrire `migrate`.
4. Une valeur peut-elle être dérivée ? → la dériver, ne pas la stocker.
5. Ajouter un test dans `tests/stores.test.tsx` (ou `tests/integrity.test.ts`
   pour la persistance).
