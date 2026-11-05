/** Éléments partagés par plusieurs widgets (barre fine, ligne de statistique). */
import type { ReactNode } from 'react';

export function MiniProgressBar({ label, value }: { label: string; value: number }): ReactNode {
  return (
    <div>
      <div
        className="text-muted"
        style={{ fontSize: 'var(--text-2xs)', display: 'flex', justifyContent: 'space-between' }}
      >
        <span>{label}</span>
        <span className="tabular">{Math.round(value * 100)}%</span>
      </div>
      <div className="progress-track" style={{ height: 5 }}>
        <div className="progress-fill" style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

export function Row({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span className="text-secondary">{label}</span>
      <span className="tabular" style={{ fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}
