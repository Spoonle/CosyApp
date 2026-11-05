/**
 * Horloge principale — point focal du bureau.
 * Trois styles, trois tailles, secondes et date optionnelles, salut discret.
 * Le rendu s'adapte à la taille du widget via les unités de conteneur.
 */
import { useNow } from '@/hooks';
import { fullDate } from '@/services/dates/dateUtils';
import { useSettingsStore } from '@/stores/settings';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Salut dépendant de l'heure — volontairement sobre. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Bonjour';
  if (hour >= 12 && hour < 18) return 'Bon après-midi';
  if (hour >= 18 && hour < 23) return 'Bonsoir';
  return 'Bonne nuit';
}

export function HeroClock({
  compact = false,
  className
}: {
  compact?: boolean;
  className?: string;
}): React.ReactNode {
  const now = useNow(1000);
  const clock = useSettingsStore((s) => s.workspace.clock);
  const d = new Date(now);

  const greeting = clock.greeting
    ? `${greetingFor(d.getHours())}${clock.name.trim() ? `, ${clock.name.trim()}` : ''}`
    : null;
  const showDate = clock.date && !compact;

  return (
    <div
      className={['hero-clock', className].filter(Boolean).join(' ')}
      data-style={clock.style}
      data-size={clock.size}
      data-compact={compact || undefined}
    >
      {greeting !== null && <p className="clock-greeting">{greeting}</p>}
      <div
        className="clock-time tabular"
        role="timer"
        aria-label={`${d.getHours()} heures ${d.getMinutes()}`}
      >
        <span className="clock-hours">{pad(d.getHours())}</span>
        <span className="clock-colon" data-show-seconds={clock.seconds || undefined}>
          :
        </span>
        <span className="clock-minutes">{pad(d.getMinutes())}</span>
        {clock.seconds && <span className="clock-seconds">{pad(d.getSeconds())}</span>}
      </div>
      {showDate && <p className="clock-date">{fullDate(d)}</p>}
    </div>
  );
}
