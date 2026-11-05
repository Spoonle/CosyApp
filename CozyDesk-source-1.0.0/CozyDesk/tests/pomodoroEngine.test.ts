/** Tests du moteur Pomodoro (logique pure, horodatages). */
import { describe, expect, it } from 'vitest';
import {
  advance,
  initialPomodoroState,
  pause,
  reconcile,
  remainingMs,
  reset,
  start,
  type PomodoroEngineState
} from '@/services/pomodoroEngine';

const CONFIG = {
  workMin: 25,
  shortMin: 5,
  longMin: 15,
  cyclesBeforeLong: 4,
  autoStartBreaks: true
};

const T0 = 1_000_000;

describe('moteur Pomodoro', () => {
  it('état initial : phase travail, pas de course', () => {
    const s = initialPomodoroState(CONFIG);
    expect(s.phase).toBe('work');
    expect(s.running).toBe(false);
  });

  it('le temps restant se calcule depuis endsAt (fiable si minimisé)', () => {
    const s = initialPomodoroState(CONFIG);
    const started = start({ ...s, startedAt: T0, endsAt: T0 + 25 * 60_000 }, CONFIG, T0 + 10_000);
    expect(remainingMs(started, T0 + 10_000)).toBe(25 * 60_000);
    expect(remainingMs(started, T0 + 70_000)).toBe(25 * 60_000 - 60_000);
  });

  it('pause conserve le temps restant, reprise repart de là', () => {
    let s = initialPomodoroState(CONFIG);
    s = start(s, CONFIG, T0);
    s = pause(s, T0 + 5 * 60_000); // 5 min écoulées
    expect(s.running).toBe(false);
    expect(s.pausedRemainingMs).toBe(20 * 60_000);
    s = start(s, CONFIG, T0 + 30 * 60_000); // reprise 25 min plus tard
    expect(s.endsAt).toBe(T0 + 30 * 60_000 + 20 * 60_000);
  });
  it('fin de travail → pause courte, journalise la session', () => {
    const s = { ...initialPomodoroState(CONFIG), running: true, startedAt: T0, endsAt: T0 + 25 * 60_000 };
    const r = advance(s, CONFIG, T0 + 25 * 60_000);
    expect(r.state.phase).toBe('short');
    expect(r.state.running).toBe(true); // autoStartBreaks
    expect(r.completed).toEqual({
      phase: 'work',
      startedAt: T0,
      endedAt: T0 + 25 * 60_000,
      durationMin: 25,
      taskId: undefined
    });
  });

  it('4 cycles → pause longue', () => {
    const s = { ...initialPomodoroState(CONFIG), running: true, completedWork: 3, startedAt: T0, endsAt: T0 + 25 * 60_000 };
    const r = advance(s, CONFIG, T0 + 25 * 60_000);
    expect(r.state.phase).toBe('long');
    expect(r.state.completedWork).toBe(4);
    // Après la pause longue, on repasse au travail
    const r2 = advance(
      { ...r.state, startedAt: T0 + 25 * 60_000, endsAt: T0 + 25 * 60_000 + 15 * 60_000 },
      CONFIG,
      T0 + 40 * 60_000
    );
    expect(r2.state.phase).toBe('work');
    expect(r2.state.completedWork).toBe(4);
  });

  it('reconcile journalise les sessions de travail écoulées pendant l’absence', () => {
    // Session démarrée à T0, l'utilisateur revient 35 min plus tard :
    // → 1 travail (25 min) journalisé + 1 pause courte (5 min) écoulée (non journalisée :
    //   seules les sessions de travail alimentent l'historique),
    //   puis 5 min déjà écoulées dans le travail suivant → 20 min restants.
    const s = { ...initialPomodoroState(CONFIG), running: true, startedAt: T0, endsAt: T0 + 25 * 60_000 };
    const r = reconcile(s, CONFIG, T0 + 35 * 60_000);
    expect(r.completed).toHaveLength(1);
    expect(r.completed[0].phase).toBe('work');
    expect(r.completed[0].durationMin).toBe(25);
    expect(r.state.phase).toBe('work');
    expect(remainingMs(r.state, T0 + 35 * 60_000)).toBe(20 * 60_000);
  });

  it('reset recalé sur la phase courante', () => {
    const s: PomodoroEngineState = {
      ...initialPomodoroState(CONFIG),
      phase: 'long',
      running: true
    };
    const after = reset(s, CONFIG, T0);
    expect(after.running).toBe(false);
    expect(after.endsAt).toBe(T0 + 15 * 60_000);
  });
});
