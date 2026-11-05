/** Widget « Pomodoro ». */
import type { ReactNode } from 'react';
import { Pause, Play, SkipBack } from 'lucide-react';
import { formatClock } from '@/services/dates/dateUtils';
import { useNow } from '@/hooks';
import { usePomodoroStore } from '@/stores/pomodoro';
import { useSettingsStore } from '@/stores/settings';
import { remainingMs } from '@/services/pomodoroEngine';
import { RingProgress } from '@/components/charts/Charts';
import { t } from '@/i18n';

export function PomodoroWidget(): ReactNode {
  const state = usePomodoroStore((s) => s.state);
  const startPause = usePomodoroStore((s) => s.startPause);
  const resetPhase = usePomodoroStore((s) => s.resetPhase);
  const running = state.running;
  const now = useNow(running ? 500 : 60000);
  const remaining = remainingMs(state, now);
  const settings = useSettingsStore((s) => s.pomodoro);
  const total =
    (state.phase === 'work'
      ? settings.workMin
      : state.phase === 'short'
        ? settings.shortMin
        : settings.longMin) * 60_000;

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
      <RingProgress progress={1 - remaining / total} size={104} thickness={8}>
        <span className="tabular" style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>
          {formatClock(remaining)}
        </span>
      </RingProgress>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <span style={{ fontSize: 'var(--text-md)', fontWeight: 650 }}>{t(`phase.${state.phase}`)}</span>
        <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
          {state.completedWork} cycle{state.completedWork > 1 ? 's' : ''} terminé
          {state.completedWork > 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <button className="btn btn-primary btn-sm" onClick={startPause} style={{ flex: 1 }}>
            {running ? <Pause size={13} /> : <Play size={13} />}
            {running ? 'Pause' : 'Démarrer'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={resetPhase} data-tooltip="Réinitialiser">
            <SkipBack size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

