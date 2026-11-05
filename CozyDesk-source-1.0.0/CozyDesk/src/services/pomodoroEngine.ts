/**
 * Moteur Pomodoro — logique pure, basée sur des horodatages.
 * Fiable même application minimisée : le temps restant est calculé
 * à partir de `endsAt`, jamais en accumulant des ticks.
 */
import type { ID, PomoPhase } from '@/types/domain';

export interface PomodoroEngineState {
  phase: PomoPhase;
  running: boolean;
  /** Début de la phase en cours (horodatage ms). */
  startedAt: number;
  /** Fin prévue de la phase (horodatage ms) — source de vérité. */
  endsAt: number;
  /** Pause : temps restant conservé (ms). */
  pausedRemainingMs: number | null;
  /** Cycles de travail terminés depuis la dernière longue pause. */
  completedWork: number;
  /** Tâche associée à la session de travail en cours. */
  taskId?: ID;
}

export interface PomodoroConfig {
  workMin: number;
  shortMin: number;
  longMin: number;
  cyclesBeforeLong: number;
  autoStartBreaks: boolean;
}

export interface CompletedPhase {
  phase: PomoPhase;
  startedAt: number;
  endedAt: number;
  durationMin: number;
  taskId?: ID;
}

export function phaseDurationMs(phase: PomoPhase, config: PomodoroConfig): number {
  const min =
    phase === 'work'
      ? config.workMin
      : phase === 'short'
        ? config.shortMin
        : config.longMin;
  return Math.max(1, Math.round(min)) * 60_000;
}

export function initialPomodoroState(config: PomodoroConfig): PomodoroEngineState {
  return {
    phase: 'work',
    running: false,
    startedAt: Date.now(),
    endsAt: Date.now() + phaseDurationMs('work', config),
    pausedRemainingMs: null,
    completedWork: 0
  };
}

export function remainingMs(state: PomodoroEngineState, now: number): number {
  if (!state.running) {
    return state.pausedRemainingMs ?? state.endsAt - state.startedAt;
  }
  return Math.max(0, state.endsAt - now);
}

export function start(state: PomodoroEngineState, config: PomodoroConfig, now: number): PomodoroEngineState {
  if (state.running) return state;
  const remaining = state.pausedRemainingMs ?? state.endsAt - state.startedAt;
  return {
    ...state,
    running: true,
    pausedRemainingMs: null,
    startedAt: now,
    endsAt: now + Math.max(0, remaining),
    ...(state.pausedRemainingMs === null && remaining <= 0
      ? { endsAt: now + phaseDurationMs(state.phase, config) }
      : {})
  };
}

export function pause(state: PomodoroEngineState, now: number): PomodoroEngineState {
  if (!state.running) return state;
  return {
    ...state,
    running: false,
    pausedRemainingMs: Math.max(0, state.endsAt - now)
  };
}

export function reset(state: PomodoroEngineState, config: PomodoroConfig, now: number): PomodoroEngineState {
  return {
    ...state,
    running: false,
    pausedRemainingMs: null,
    startedAt: now,
    endsAt: now + phaseDurationMs(state.phase, config)
  };
}

/**
 * Avance d'une phase. Retourne la nouvelle états + la session terminée à journaliser.
 */
export function advance(
  state: PomodoroEngineState,
  config: PomodoroConfig,
  now: number
): { state: PomodoroEngineState; completed: CompletedPhase | null } {
  const completed: CompletedPhase | null =
    state.phase === 'work'
      ? {
          phase: 'work',
          startedAt: state.startedAt,
          endedAt: now,
          durationMin: config.workMin,
          taskId: state.taskId
        }
      : null;

  const wasWork = state.phase === 'work';
  const completedWork = wasWork ? state.completedWork + 1 : state.completedWork;
  const nextPhase: PomoPhase = wasWork
    ? completedWork % Math.max(1, config.cyclesBeforeLong) === 0
      ? 'long'
      : 'short'
    : 'work';

  return {
    state: {
      phase: nextPhase,
      running: config.autoStartBreaks || !wasWork ? true : false,
      startedAt: now,
      endsAt: now + phaseDurationMs(nextPhase, config),
      pausedRemainingMs: null,
      completedWork,
      ...(nextPhase === 'work' ? { taskId: undefined } : {}),
      ...(nextPhase === 'long' || nextPhase === 'short' ? { taskId: state.taskId } : {})
    },
    completed
  };
}

/** Change de phase manuellement (bouton « Passer »). */
export function skip(
  state: PomodoroEngineState,
  config: PomodoroConfig,
  now: number
): { state: PomodoroEngineState; completed: CompletedPhase | null } {
  return advance(state, config, now);
}

/**
 * Réconciliation au démarrage de l'application : si des phases entières
 * se sont écoulées pendant l'absence, elles sont journalisées puis
 * l'état est recalé sur la phase courante.
 */
export function reconcile(
  state: PomodoroEngineState,
  config: PomodoroConfig,
  now: number
): { state: PomodoroEngineState; completed: CompletedPhase[] } {
  if (!state.running) return { state, completed: [] };
  const done: CompletedPhase[] = [];
  let current = state;
  let guard = 0;
  while (current.endsAt <= now && guard < 12) {
    guard++;
    const result = advance(current, config, current.endsAt);
    if (result.completed) done.push(result.completed);
    if (!result.state.running) {
      // autoStart désactivé : on s'arrête au début de la pause.
      return { state: { ...result.state, running: false }, completed: done };
    }
    current = result.state;
  }
  return { state: current, completed: done };
}
