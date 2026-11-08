/** Widget « Stats ». */
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/storage/db';
import { todayKey, dateKey, minutesToHM, addDaysKey } from '@/services/dates/dateUtils';
import { MiniBars } from '@/components/charts/Charts';

export function StatsWidget(): ReactNode {
  const days = useMemo(() => {
    const out: string[] = [];
    for (let i = 6; i >= 0; i--) out.push(addDaysKey(todayKey(), -i));
    return out;
  }, []);
  const sessions = useLiveQuery(
    () => db.pomodoroSessions.where('phase').equals('work').toArray(),
    [],
    []
  );

  const byDay = useMemo(() => {
    const minutes = days.map((day) =>
      sessions
        .filter((s) => dateKey(new Date(s.startedAt)) === day)
        .reduce((acc, s) => acc + s.durationMin, 0)
    );
    return minutes;
  }, [sessions, days]);

  const todayMin = byDay[byDay.length - 1] ?? 0;
  const todayCount = sessions.filter((s) => dateKey(new Date(s.startedAt)) === days[6]).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 18 }}>
        <div>
          <div className="widget-label">Focus aujourd’hui</div>
          <div className="tabular" style={{ fontSize: 'var(--text-xl)', fontWeight: 650 }}>
            {minutesToHM(todayMin)}
          </div>
        </div>
        <div>
          <div className="widget-label">Sessions</div>
          <div className="tabular" style={{ fontSize: 'var(--text-xl)', fontWeight: 650 }}>
            {todayCount}
          </div>
        </div>
      </div>
      <MiniBars values={byDay} labels={days.map((d) => d.slice(5))} formatValue={(v) => minutesToHM(v)} />
      <div className="text-muted" style={{ fontSize: 'var(--text-2xs)', textAlign: 'center' }}>
        7 derniers jours
      </div>
    </div>
  );
}

