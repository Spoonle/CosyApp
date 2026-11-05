/** Widget « Calendar ». */
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '@/services/storage/db';
import { todayKey, dateKey, monthGrid, MONTHS_FULL, WEEKDAYS_SHORT } from '@/services/dates/dateUtils';

export function CalendarWidget(): ReactNode {
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const viewDate = useMemo(
    () => new Date(year, month + monthOffset, 1),
    [year, month, monthOffset]
  );
  const grid = useMemo(() => monthGrid(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);
  const from = dateKey(grid[0][0]);
  const to = dateKey(grid[grid.length - 1][6]);
  const events = useLiveQuery(
    () => db.events.where('date').between(from, to, true, true).toArray(),
    [from, to],
    []
  );
  const todayStr = todayKey();

  const eventDays = useMemo(() => new Set(events.map((e) => e.date)), [events]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 650 }}>
          {MONTHS_FULL[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <span style={{ display: 'flex', gap: 2 }}>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            style={{ width: 24, height: 24 }}
            aria-label="Mois précédent"
            onClick={() => setMonthOffset((m) => m - 1)}
          >
            <ChevronLeft size={13} />
          </button>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            style={{ width: 24, height: 24 }}
            aria-label="Mois suivant"
            onClick={() => setMonthOffset((m) => m + 1)}
          >
            <ChevronRight size={13} />
          </button>
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
          fontSize: 'var(--text-2xs)',
          color: 'rgb(var(--text-muted-rgb))'
        }}
      >
        {WEEKDAYS_SHORT.map((d, i) => (
          <span key={i} style={{ textAlign: 'center', fontWeight: 650 }}>
            {d}
          </span>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, flex: 1 }}>
        {grid.flat().map((d) => {
          const key = dateKey(d);
          const isToday = key === todayStr;
          const dim = d.getMonth() !== viewDate.getMonth();
          return (
            <div
              key={key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                borderRadius: 7,
                fontSize: 'var(--text-xs)',
                opacity: dim ? 0.45 : 1,
                background: isToday
                  ? 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.25)'
                  : undefined,
                fontWeight: isToday ? 700 : 400,
                minHeight: 22
              }}
              className="tabular"
            >
              {d.getDate()}
              {eventDays.has(key) && (
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 99,
                    background: 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))'
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Musique ---------- */
