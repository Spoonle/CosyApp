/** Tests des séries d'habitudes. */
import { describe, expect, it, vi } from 'vitest';
import { bestStreak, completionRate, currentStreak, isDueOn, weeklyTarget } from '@/services/habits/streaks';
import type { Habit } from '@/types/domain';
import { addDaysKey, todayKey } from '@/services/dates/dateUtils';

function habit(freq: Habit['frequency']): Habit {
  return {
    id: 'h1',
    createdAt: 0,
    updatedAt: 0,
    name: 'Test',
    icon: 'check',
    color: 'red',
    frequency: freq,
    archived: 0
  };
}

describe('séries d’habitudes', () => {
  it('isDueOn : quotidienne toujours due', () => {
    expect(isDueOn({ kind: 'daily' }, '2026-11-05')).toBe(true);
  });

  it('isDueOn : jours précis', () => {
    // 2026-11-05 est un jeudi (getDay() = 4)
    expect(isDueOn({ kind: 'weekdays', days: [4] }, '2026-11-05')).toBe(true);
    expect(isDueOn({ kind: 'weekdays', days: [1, 3] }, '2026-11-05')).toBe(false);
  });

  it('weeklyTarget selon la fréquence', () => {
    expect(weeklyTarget({ kind: 'daily' })).toBe(7);
    expect(weeklyTarget({ kind: 'weekdays', days: [1, 2, 3, 4, 5] })).toBe(5);
    expect(weeklyTarget({ kind: 'timesPerWeek', times: 3 })).toBe(3);
  });

  it('série actuelle : jours consécutifs faits', () => {
    const h = habit({ kind: 'daily' });
    const today = todayKey();
    const done = new Set([addDaysKey(today, -1), addDaysKey(today, -2), addDaysKey(today, -3)]);
    expect(currentStreak(h, done)).toBe(3); // aujourd'hui non fait = pas compté, jour non terminé
  });

  it('aujourd’hui fait prolonge la série', () => {
    const h = habit({ kind: 'daily' });
    const today = todayKey();
    const done = new Set([today, addDaysKey(today, -1)]);
    expect(currentStreak(h, done)).toBe(2);
  });

  it('un trou casse la série', () => {
    const h = habit({ kind: 'daily' });
    const today = todayKey();
    const done = new Set([addDaysKey(today, -1), addDaysKey(today, -3)]);
    expect(currentStreak(h, done)).toBe(1);
  });

  it('les jours non attendus ne cassent pas la série', () => {
    // Habitude le lundi uniquement — 2026-11-02 (lun), 2026-11-09 (lun)
    const h = habit({ kind: 'weekdays', days: [1] });
    const done = new Set(['2026-11-02', '2026-11-09']);
    // À la date du 2026-11-10 (mardi), la série doit être de 2.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T12:00:00'));
    try {
      expect(currentStreak(h, done)).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('bestStreak trouve le record', () => {
    expect(bestStreak(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-05'])).toBe(3);
    expect(bestStreak([])).toBe(0);
  });

  it('completionRate sur 4 jours', () => {
    const h = habit({ kind: 'daily' });
    const today = todayKey();
    const done = new Set([today, addDaysKey(today, -1)]);
    const rate = completionRate(h, done, 4);
    expect(rate).toBeCloseTo(0.5);
  });
});
