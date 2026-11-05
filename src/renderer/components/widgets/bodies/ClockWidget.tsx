/** Widget « Clock ». */
import type { ReactNode } from 'react';
import { HeroClock } from '@/components/widgets/HeroClock';

export function ClockWidget(): ReactNode {
  // L'horloge est un composant à part entière : tailles et styles configurables.
  return <HeroClock />;
}

/* ---------- Date & semaine ---------- */
