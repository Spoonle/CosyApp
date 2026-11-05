/**
 * SM-2 — répétition espacée (algorithme classique de SuperMemo-2,
 * légèrement ajusté). Fonctions pures, testées.
 */
import { addDaysKey, todayKey } from '@/services/dates/dateUtils';

export type Grade = 0 | 3 | 4 | 5; // Encore / Difficile / Bien / Facile

export interface SrsState {
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  due: string; // 'YYYY-MM-DD'
}

export interface SrsSchedule {
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  due: string;
}

const MIN_EASE = 1.3;
const MAX_EASE = 2.8;

/**
 * Planifie la prochaine révision d'une carte.
 * @param state état SM-2 actuel de la carte
 * @param grade note donnée (0 = échec, 3 = difficile, 4 = bien, 5 = facile)
 */
export function schedule(state: SrsState, grade: Grade, today = todayKey()): SrsSchedule {
  let { ease, intervalDays, reps, lapses } = state;

  if (grade === 0) {
    // Échec : on revoit aujourd'hui, répétitions remises à zéro.
    reps = 0;
    lapses += 1;
    ease = Math.max(MIN_EASE, ease - 0.2);
    return { ease, intervalDays: 0, reps, lapses, due: today };
  }

  ease = Math.min(
    MAX_EASE,
    Math.max(MIN_EASE, ease + (grade === 3 ? -0.14 : grade === 4 ? 0 : 0.1))
  );

  if (reps === 0) {
    intervalDays = grade === 5 ? 2 : 1;
  } else if (reps === 1) {
    intervalDays = grade === 5 ? 6 : grade === 3 ? 3 : 4;
  } else {
    intervalDays = Math.max(1, Math.round(intervalDays * ease * (grade === 3 ? 0.8 : 1)));
  }
  reps += 1;
  return { ease, intervalDays, reps, lapses, due: addDaysKey(today, intervalDays) };
}

/** Nouvelle carte. */
export function newCard(today = todayKey()): SrsSchedule {
  return { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, due: today };
}

/** Indice de rétention approximatif (facilité normalisée). */
export function retentionHint(state: SrsState): number {
  return Math.round(((state.ease - MIN_EASE) / (MAX_EASE - MIN_EASE)) * 100);
}
