/** Module Pomodoro — minuteur fiable par horodatage, historique, association de tâche. */
import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Bell,
  BellRing,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Target,
  Volume2
} from 'lucide-react';
import { GlassButton, SectionTitle, Select, Toggle, EmptyState } from '@/components/glass';
import { RingProgress } from '@/components/charts/Charts';
import { usePomodoroStore } from '@/stores/pomodoro';
import { useSettingsStore } from '@/stores/settings';
import { remainingMs } from '@/services/pomodoroEngine';
import { useNow } from '@/hooks';
import { db } from '@/services/storage/db';
import { formatClock, dateKey, todayKey, minutesToHM, humanDate } from '@/services/dates/dateUtils';
import type { PomodoroSession } from '@/types/domain';
import { t } from '@/i18n';
import { ensureNotificationPermission } from '@/services/notifications/notify';

export default function PomodoroModule(): React.ReactNode {
  const state = usePomodoroStore((s) => s.state);
  const taskId = usePomodoroStore((s) => s.taskId);
  const setTask = usePomodoroStore((s) => s.setTask);
  const startPause = usePomodoroStore((s) => s.startPause);
  const resetPhase = usePomodoroStore((s) => s.resetPhase);
  const skipPhase = usePomodoroStore((s) => s.skipPhase);

  const settings = useSettingsStore((s) => s.pomodoro);
  const setPomodoro = useSettingsStore((s) => s.setPomodoro);
  const [showSettings, setShowSettings] = useState(false);

  const running = state.running;
  const now = useNow(running ? 250 : 30000);
  const remaining = remainingMs(state, now);
  const totalMs =
    (state.phase === 'work'
      ? settings.workMin
      : state.phase === 'short'
        ? settings.shortMin
        : settings.longMin) * 60_000;

  // Changement de durées pendant une pause → recalage de la phase.
  useEffect(() => {
    if (!running) resetPhase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.workMin, settings.shortMin, settings.longMin, settings.cyclesBeforeLong]);

  const tasks = useLiveQuery(() => db.tasks.where('status').equals('active').toArray(), [], []);

  const history = useLiveQuery(
    () =>
      db.pomodoroSessions
        .orderBy('startedAt')
        .reverse()
        .limit(40)
        .toArray(),
    [],
    [] as PomodoroSession[]
  );

  const todaySessions = useMemo(
    () => history.filter((s) => dateKey(new Date(s.startedAt)) === todayKey()),
    [history]
  );
  const todayMinutes = todaySessions.reduce((a, s) => a + s.durationMin, 0);

  const grouped = useMemo(() => {
    const map = new Map<string, PomodoroSession[]>();
    for (const s of history) {
      const key = dateKey(new Date(s.startedAt));
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return [...map.entries()].slice(0, 5);
  }, [history]);

  return (
    <div className="module-root">
      <div className="module-header">
        <h2>Pomodoro</h2>
        <span className="spacer" />
        <GlassButton
          size="sm"
          variant={showSettings ? 'primary' : 'ghost'}
          onClick={() => setShowSettings((v) => !v)}
        >
          <Settings2 size={14} /> Réglages
        </GlassButton>
      </div>

      <div className="module-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <RingProgress progress={1 - remaining / totalMs} size={188} thickness={12}>
            <span className="tabular" style={{ fontSize: 'var(--text-3xl)', fontWeight: 300, letterSpacing: '-0.02em' }}>
              {formatClock(remaining)}
            </span>
            <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
              {t(`phase.${state.phase}`)}
            </span>
          </RingProgress>
          <div style={{ display: 'flex', gap: 10 }}>
            <GlassButton variant="primary" size="lg" onClick={startPause} style={{ minWidth: 150 }}>
              {running ? <Pause size={17} /> : <Play size={17} />}
              {running ? 'Mettre en pause' : state.pausedRemainingMs !== null ? 'Reprendre' : 'Démarrer'}
            </GlassButton>
            <GlassButton variant="ghost" data-tooltip="Réinitialiser la phase" onClick={resetPhase}>
              <RotateCcw size={15} />
            </GlassButton>
            <GlassButton variant="ghost" data-tooltip="Passer à la phase suivante" onClick={skipPhase}>
              <ChevronRight size={16} />
            </GlassButton>
          </div>
          <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            {state.completedWork} cycle{state.completedWork > 1 ? 's' : ''} · pause longue dans{' '}
            {Math.max(1, settings.cyclesBeforeLong - (state.completedWork % settings.cyclesBeforeLong))} cycle
            {(settings.cyclesBeforeLong - (state.completedWork % settings.cyclesBeforeLong)) > 1 ? 's' : ''}
          </div>
        </div>

        <div>
          <SectionTitle icon={<Target size={15} />}>Tâche associée</SectionTitle>
          <Select
            value={taskId ?? ''}
            onChange={(e) => setTask(e.target.value || undefined)}
            aria-label="Tâche associée à la session"
          >
            <option value="">— Aucune —</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </Select>
        </div>

        {showSettings && (
          <div className="glass-ultra module-editor anim-fade" style={{ padding: 16 }}>
            <SectionTitle>Durées (minutes)</SectionTitle>
            <div className="form-row">
              <NumberField
                label="Concentration"
                value={settings.workMin}
                min={1}
                max={120}
                onChange={(v) => setPomodoro({ workMin: v })}
              />
              <NumberField
                label="Pause courte"
                value={settings.shortMin}
                min={1}
                max={60}
                onChange={(v) => setPomodoro({ shortMin: v })}
              />
              <NumberField
                label="Pause longue"
                value={settings.longMin}
                min={1}
                max={90}
                onChange={(v) => setPomodoro({ longMin: v })}
              />
              <NumberField
                label="Cycles avant pause longue"
                value={settings.cyclesBeforeLong}
                min={2}
                max={10}
                onChange={(v) => setPomodoro({ cyclesBeforeLong: v })}
              />
            </div>
            <div className="meta-row" style={{ gap: 20, marginTop: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Toggle
                  checked={settings.autoStartBreaks}
                  onChange={(v) => setPomodoro({ autoStartBreaks: v })}
                  label="Démarrer les pauses automatiquement"
                />
                <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                  Pauses automatiques
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Volume2 size={14} className="text-muted" />
                <Toggle checked={settings.sound} onChange={(v) => setPomodoro({ sound: v })} label="Carillon" />
                <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                  Carillon de fin
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={14} className="text-muted" />
                <Toggle
                  checked={settings.notifications}
                  onChange={async (v) => {
                    setPomodoro({ notifications: v });
                    if (v) await ensureNotificationPermission();
                  }}
                  label="Notifications"
                />
                <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                  Notifications système
                </span>
              </span>
            </div>
          </div>
        )}

        <div>
          <SectionTitle icon={<BellRing size={15} />}>Aujourd’hui</SectionTitle>
          <div className="stat-cards">
            <div className="stat-card glass-ultra">
              <div className="stat-label">Sessions</div>
              <div className="stat-value tabular">{todaySessions.length}</div>
            </div>
            <div className="stat-card glass-ultra">
              <div className="stat-label">Temps de focus</div>
              <div className="stat-value tabular">{minutesToHM(todayMinutes)}</div>
            </div>
          </div>
        </div>

        <div>
          <SectionTitle>Historique récent</SectionTitle>
          {grouped.length === 0 && (
            <EmptyState icon={<Target size={26} />} title="Aucune session pour l’instant">
              Lancez votre premier Pomodoro : chaque session terminée sera journalisée ici, même après
              redémarrage de l’application.
            </EmptyState>
          )}
          {grouped.map(([day, sessions]) => (
            <div key={day} style={{ marginBottom: 10 }}>
              <div className="text-muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 4 }}>
                {humanDate(day)} · {minutesToHM(sessions.reduce((a, s) => a + s.durationMin, 0))}
              </div>
              {sessions.map((s) => (
                <div key={s.id} className="list-row" style={{ padding: '5px 10px' }}>
                  <span className="tabular text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                    {new Date(s.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontSize: 'var(--text-sm)' }}>{t(`phase.${s.phase}`)}</span>
                  <span className="text-muted" style={{ fontSize: 'var(--text-sm)', marginLeft: 'auto' }}>
                    {s.durationMin} min
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}): React.ReactNode {
  return (
    <label style={{ display: 'block', flex: 1 }}>
      <span className="field-label">{label}</span>
      <input
        className="input tabular"
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, Math.round(v))));
        }}
      />
    </label>
  );
}
