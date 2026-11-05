/** Widget « Date ». */
import type { ReactNode } from 'react';
import { weekNumber, weekdayName } from '@/services/dates/dateUtils';
import { MiniProgressBar } from '../widgetShared';

export function DateWidget(): ReactNode {
  const d = new Date();
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const yearEnd = new Date(d.getFullYear() + 1, 0, 1);
  const yearProgress = (d.getTime() - yearStart.getTime()) / (yearEnd.getTime() - yearStart.getTime());
  const dayProgress = (d.getHours() * 60 + d.getMinutes()) / 1440;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
      <div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 650 }}>Semaine {weekNumber(d)}</div>
        <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
          {weekdayName(d)}
        </div>
      </div>
      <MiniProgressBar label="Journée" value={dayProgress} />
      <MiniProgressBar label="Année" value={yearProgress} />
    </div>
  );
}
