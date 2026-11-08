/** Séries d'habitudes — calculs purs. */
import type { Habit, HabitFrequency } from '@/types/domain';
import { addDaysKey, parseKey, todayKey } from '@/services/dates/dateUtils';

/** L'habitude est-elle attendue ce jour-là ? */
export function isDueOn(frequency: HabitFrequency, dateKeyStr: string): boolean {
  switch (frequency.kind) {
    case 'daily':
      return true;
    case 'weekdays': {
      const d = parseKey(dateKeyStr);
      // getDay(): 0 = dimanche … 6 = samedi — même convention que days
      return frequency.days.includes(d.getDay());
    }
    case 'timesPerWeek':
      return true; // libre : n'importe quel jour compte pour l'objectif hebdo
    default:
      return true;
  }
}

/** Nombre de pointages attendus sur une semaine. */
export function weeklyTarget(frequency: HabitFrequency): number {
  switch (frequency.kind) {
    case 'daily':
      return 7;
    case 'weekdays':
      return frequency.days.length;
    case 'timesPerWeek':
      return frequency.times;
    default:
      return 7;
  }
}

/**
 * Série actuelle : jours consécutifs (en remontant depuis aujourd'hui)
 * où l'habitude était attendue ET faite. Aujourd'hui non fait ne casse
 * pas la série (le jour n'est pas terminé).
 */
export function currentStreak(habit: Habit, doneDates: Set<string>): number {
  const freq = habit.frequency;
  let streak = 0;
  let day = todayKey();
  // Aujourd'hui : compte seulement si déjà fait.
  if (isDueOn(freq, day) && doneDates.has(day)) {
    streak = 1;
  }
  day = addDaysKey(day, -1);
  for (let i = 0; i < 400; i++) {
    if (!isDueOn(freq, day)) {
      day = addDaysKey(day, -1);
      continue;
    }
    if (doneDates.has(day)) {
      streak++;
      day = addDaysKey(day, -1);
    } else {
      break;
    }
  }
  return streak;
}

/** Meilleure série historique. */
export function bestStreak(doneDates: string[]): number {
  if (doneDates.length === 0) return 0;
  const sorted = [...new Set(doneDates)].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (addDaysKey(sorted[i - 1], 1) === sorted[i]) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

/** Taux de complétion sur N jours (jours attendus uniquement). */
export function completionRate(
  habit: Habit,
  doneDates: Set<string>,
  days = 30
): number | null {
  let expected = 0;
  let done = 0;
  let day = todayKey();
  for (let i = 0; i < days; i++) {
    if (isDueOn(habit.frequency, day)) {
      expected++;
      if (doneDates.has(day)) done++;
    }
    day = addDaysKey(day, -1);
  }
  if (expected === 0) return null;
  return done / expected;
}
