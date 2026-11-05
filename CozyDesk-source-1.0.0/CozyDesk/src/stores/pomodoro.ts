/** Store Pomodoro : état persistant + vérification horloge + journalisation Dexie. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CompletedPhase, PomodoroEngineState } from '@/services/pomodoroEngine';
import {
  initialPomodoroState,
  pause as enginePause,
  reconcile as engineReconcile,
  remainingMs,
  reset as engineReset,
  skip as engineSkip,
  start as engineStart
} from '@/services/pomodoroEngine';
import { db, nowTs, uid } from '@/services/storage/db';
import type { PomodoroSession } from '@/types/domain';
import { useSettingsStore, type PomodoroSettings } from '@/stores/settings';
import { notifyPomodoro, chime } from '@/services/notifications/notify';
import { formatPhase } from '@/i18n';

function config(): PomodoroSettings {
  return useSettingsStore.getState().pomodoro;
}

interface PomodoroStore {
  state: PomodoroEngineState;
  /** Session de travail associée (choisie dans l'interface). */
  taskId?: string;
  startPause: () => void;
  resetPhase: () => void;
  skipPhase: () => void;
  setTask: (taskId?: string) => void;
  boot: () => Promise<void>;
}

let ticker: number | null = null;

function ensureTicker(get: () => PomodoroStore): void {
  if (ticker !== null) return;
  ticker = window.setInterval(() => {
    const store = get();
    const st = store.state;
    if (!st.running) return;
    const now = Date.now();
    if (st.endsAt <= now) {
      void completePhase(get);
    }
  }, 1000);
}

async function completePhase(get: () => PomodoroStore): Promise<void> {
  const store = get();
  const cfg = config();
  const result = engineSkip(store.state, cfg, Date.now());
  usePomodoroStore.setState({ state: result.state });

  if (result.completed) await logCompleted(result.completed);

  const s = useSettingsStore.getState();
  if (s.pomodoro.notifications) {
    const label =
      result.state.phase === 'work'
        ? 'Pause terminée — au travail !'
        : 'Phase de travail terminée. Respirez…';
    notifyPomodoro('CozyDesk Pomodoro', label);
  }
  if (s.pomodoro.sound) {
    chime(result.state.phase === 'work' ? 'break-end' : 'work-end');
  }
  void store;
}

async function logCompleted(completed: CompletedPhase): Promise<void> {
  const session: PomodoroSession = {
    id: uid(),
    createdAt: nowTs(),
    updatedAt: nowTs(),
    startedAt: completed.startedAt,
    endedAt: completed.endedAt,
    durationMin: completed.durationMin,
    phase: completed.phase,
    taskId: completed.taskId,
    completed: true
  };
  try {
    await db.pomodoroSessions.put(session);
  } catch (err) {
    console.error('[cozydesk:pomodoro] journalisation impossible :', err);
  }
}

export const usePomodoroStore = create<PomodoroStore>()(
  persist(
    (set, get) => ({
      state: initialPomodoroState({
        workMin: 25,
        shortMin: 5,
        longMin: 15,
        cyclesBeforeLong: 4,
        autoStartBreaks: true
      }),

      startPause: () => {
        const st = get().state;
        const cfg = config();
        set({
          state: st.running ? enginePause(st, Date.now()) : engineStart(st, cfg, Date.now())
        });
        ensureTicker(get);
      },

      resetPhase: () => {
        const st = get().state;
        const cfg = config();
        set({ state: engineReset(st, cfg, Date.now()) });
      },

      skipPhase: () => {
        void completePhase(get);
      },

      setTask: (taskId) => {
        set({ taskId });
        set((s) => ({ state: { ...s.state, taskId } }));
      },

      boot: async () => {
        const st = get().state;
        const cfg = config();
        const result = engineReconcile(st, cfg, Date.now());
        set({ state: result.state });
        for (const completed of result.completed) {
          await logCompleted(completed);
        }
        ensureTicker(get);
      }
    }),
    {
      name: 'cozydesk.pomodoro.v1',
      version: 1,
      partialize: (s) => ({ state: s.state, taskId: s.taskId })
    }
  )
);

/** Temps restant affiché (abonné à un tick d'affichage). */
export function pomodoroRemaining(now: number): number {
  const st = usePomodoroStore.getState().state;
  return remainingMs(st, now);
}

export function phaseLabel(phase: string): string {
  return formatPhase(phase);
}
