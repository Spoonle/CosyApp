/** Graphiques SVG légers (aucune dépendance). */
import { clamp } from '@/services/dates/dateUtils';

export function RingProgress({
  progress,
  size = 120,
  thickness = 9,
  children,
  color,
}: {
  progress: number; // 0-1
  size?: number;
  thickness?: number;
  children?: React.ReactNode;
  color?: string;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const clamped = clamp(progress, 0, 1);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--glass-deep-rgb) / 0.9)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color ?? 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))'}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{
            transition: 'stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1)',
            filter: 'drop-shadow(0 0 6px hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.45))'
          }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function MiniBars({
  values,
  labels,
  height = 64,
  formatValue,
}: {
  values: number[];
  labels?: string[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...values);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }} role="img">
      {values.map((v, i) => (
        <div
          key={i}
          data-tooltip={
            formatValue
              ? `${labels?.[i] ?? ''} ${formatValue(v)}`.trim()
              : (labels?.[i] ?? String(v))
          }
          style={{
            flex: 1,
            height: `${Math.max(3, (v / max) * 100)}%`,
            minHeight: 3,
            borderRadius: 5,
            background:
              v === max && v > 0
                ? 'linear-gradient(180deg, hsl(var(--accent-h) var(--accent-s) calc(var(--accent-l) + 8%)), hsl(var(--accent-h) var(--accent-s) var(--accent-l)))'
                : 'rgb(var(--glass-rgb) / 0.75)',
            border: '1px solid rgb(var(--stroke-rgb) / 0.14)',
            transition: 'height 400ms cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        />
      ))}
    </div>
  );
}

export function Sparkline({
  values,
  width = 140,
  height = 40,
  color
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length < 2) return <svg width={width} height={height} />;
  const max = Math.max(1, ...values);
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${height - (v / max) * (height - 4) - 2}`);
  return (
    <svg width={width} height={height}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color ?? 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}
