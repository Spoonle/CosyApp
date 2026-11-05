/**
 * Internationalisation — le français est la locale de référence.
 * Architecture prête pour l'anglais : ajouter un dictionnaire et
 * enregistrer la locale dans `LOCALES`.
 */

type Dictionary = Record<string, string>;

const fr: Dictionary = {
  // Phases Pomodoro
  'phase.work': 'Concentration',
  'phase.short': 'Pause courte',
  'phase.long': 'Pause longue',
  // Modules
  'module.pomodoro': 'Pomodoro',
  'module.tasks': 'Tâches',
  'module.notes': 'Notes',
  'module.music': 'Musique',
  'module.ambient': 'Ambiance',
  'module.wallpapers': 'Fonds d’écran',
  'module.calendar': 'Calendrier',
  'module.stats': 'Statistiques',
  'module.habits': 'Habitudes',
  'module.study': 'Étude',
  'module.journal': 'Journal',
  'module.settings': 'Paramètres'
};

const LOCALES: Record<string, Dictionary> = {
  fr
};

export type LocaleId = keyof typeof LOCALES;

const currentLocale: LocaleId = 'fr';

/**
 * Traduction. La clé FR est la valeur par défaut : une locale absente
 * retombe toujours sur le français, sans blocage.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let text = LOCALES[currentLocale][key] ?? fr[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function formatPhase(phase: string): string {
  return t(`phase.${phase}`);
}
