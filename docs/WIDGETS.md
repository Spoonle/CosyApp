# Système de widgets

Le dashboard est une grille de **12 colonnes** sur laquelle chaque widget occupe un
rectangle `(x, y, w, h)`.

## 1. Les 12 widgets

| Type | Contenu réel | Module ouvert au double-clic |
|---|---|---|
| `clock` | horloge centrale (`HeroClock`), 12/24 h, secondes optionnelles | `settings` |
| `date` | semaine, jour, progression de la journée et de l'année | `calendar` |
| `pomodoro` | minuteur en cours, phase, anneau de progression | `pomodoro` |
| `tasks` | prochaines tâches par priorité, cocher directement | `tasks` |
| `progress` | avancement de la journée (tâches, focus, habitudes) | `stats` |
| `calendar` | grille du mois, événements du jour | `calendar` |
| `music` | piste en cours, lecture/pause, suivant | `music` |
| `quote` | citation du jour | `journal` |
| `habits` | habitudes du jour, validation en un clic | `habits` |
| `quicknote` | note rapide auto-sauvegardée (tag `quick`) | `notes` |
| `stats` | activité des 7 derniers jours | `stats` |
| `weather` | météo Open-Meteo (optionnelle, cache 30 min) | `settings` |

Chaque corps vit dans `src/renderer/components/widgets/bodies/<Nom>Widget.tsx` ;
`WidgetContent.tsx` ne fait qu'aiguiller. Le rendu partagé (barre fine, ligne de
statistique) est dans `widgetShared.tsx`.

## 2. Modèle

```ts
interface WidgetLayout {
  id: string;            // identifiant unique de l'instance
  type: WidgetType;      // l'un des 12 types
  x: number;             // colonne 0-11
  y: number;             // ligne
  w: number;             // largeur en colonnes
  h: number;             // hauteur en lignes
  hidden: boolean;
  appearance?: WidgetAppearance;  // verre, opacité, rayon
  compact?: boolean;              // moins d'informations secondaires
}
```

Tailles minimales et maximales par type : `WIDGET_SIZES` dans
`stores/dashboard.ts`.

## 3. Opérations

| Action | Effet |
|---|---|
| `addWidget(type)` | ajoute une instance, refuse si la grille est pleine |
| `removeWidget(id)` | retire l'instance |
| `moveWidget(id, x, y)` | déplace, **refuse** si collision |
| `resizeWidget(id, w, h)` | redimensionne, **refuse** si collision ou hors grille |
| `toggleHidden(id)` | masque sans supprimer (restaurable) |
| `setAppearance(id, appearance)` | apparence par widget |
| `applyPreset('minimal' \| 'focus' \| 'classic')` | dispositions prédéfinies |
| `saveLayout(name)` / `loadLayout(id)` / `deleteLayout(id)` | dispositions nommées |

## 4. Garanties

1. **Jamais de position corrompue.** À l'hydratation, `sanitizeWidgets()` :
   supprime les types inconnus, déduplique les identifiants, ramène les
   coordonnées dans la grille, retire les chevauchements, corrige les apparences
   inconnues ; si le résultat est vide, retour à la disposition par défaut.
2. **Jamais de chevauchement non voulu.** Une position qui entre en collision avec
   un autre widget est refusée : le widget reste où il était.
3. **Le mode édition ne survit pas** à un rechargement (`partialize`).
4. **Les dispositions nommées** sont validées à la restauration comme la
   disposition courante.
5. **Toutes les tailles tiennent** à 1280×720, 1366×768, 1600×900 et 1920×1080
   (`tests/layout.test.ts`).

## 5. Ajouter un widget

1. `WidgetType` et `WIDGET_SIZES` dans `stores/dashboard.ts`.
2. Icône et module associé dans `components/dashboard/widgetMeta.ts`.
3. Corps dans `components/widgets/bodies/` + cas dans `WidgetContent.tsx`.
4. Ajouter le type à `tests/modules.test.tsx` (montage) et `tests/layout.test.ts`
   (contraintes de grille).
5. Aucune donnée factice : un widget lit Dexie, un store ou une API réelle.

## 6. Apparences

`WidgetAppearance` (`stores/settings.ts`) décrit le matériau, l'opacité et le
rayon. `undefined` = apparence héritée des réglages Bureau. Le fond reste
transparent par défaut : la direction visuelle 2.0 est un bureau visible, pas une
mosaïque de cartes opaques.
