/** Tests des utilitaires de dates. */
import { describe, expect, it } from 'vitest';
import {
  addDaysKey,
  dateKey,
  daysBetween,
  humanDate,
  minutesToHM,
  monthGrid,
  parseKey,
  startOfWeek,
  todayKey,
  weekNumber
} from '@/services/dates/dateUtils';

describe('dateUtils', () => {
  it('dateKey formate en YYYY-MM-DD local', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dateKey(new Date(2026, 10, 25))).toBe('2026-11-25');
  });

  it('parseKey retrouve la date', () => {
    const d = parseKey('2026-03-09');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(9);
  });

  it('addDaysKey traverse les mois et années', () => {
    expect(addDaysKey('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDaysKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysKey('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('daysBetween compte les jours', () => {
    expect(daysBetween('2026-05-01', '2026-05-01')).toBe(0);
    expect(daysBetween('2026-05-01', '2026-05-10')).toBe(9);
    expect(daysBetween('2026-05-10', '2026-05-01')).toBe(-9);
  });

  it('startOfWeek renvoie un lundi', () => {
    // 2026-11-05 est un jeudi → lundi 2026-11-02
    const monday = startOfWeek(new Date(2026, 10, 5));
    expect(monday.getDay()).toBe(1);
    expect(dateKey(monday)).toBe('2026-11-02');
  });

  it('monthGrid couvre 6 semaines complètes commençant lundi', () => {
    const grid = monthGrid(2026, 10); // novembre 2026
    expect(grid).toHaveLength(6);
    expect(grid[0]).toHaveLength(7);
    expect(grid[0][0].getDay()).toBe(1);
    expect(dateKey(grid[0][0])).toBe('2026-10-26');
  });

  it('humanDate formate aujourd’hui/demain/hier', () => {
    const today = todayKey();
    expect(humanDate(today)).toBe('Aujourd’hui');
    expect(humanDate(addDaysKey(today, 1))).toBe('Demain');
    expect(humanDate(addDaysKey(today, -1))).toBe('Hier');
  });

  it('minutesToHM formate proprement', () => {
    expect(minutesToHM(45)).toBe('45 min');
    expect(minutesToHM(60)).toBe('1 h');
    expect(minutesToHM(125)).toBe('2 h 05');
  });

  it('weekNumber calcule le numéro ISO', () => {
    expect(weekNumber(new Date(2026, 0, 1))).toBe(1);
    expect(weekNumber(new Date(2026, 10, 5))).toBe(45);
  });
});
