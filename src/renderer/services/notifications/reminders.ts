/**
 * Rappels de calendrier : vérification périodique (30 s) des événements
 * à venir, notification OS + toast. Les rappels déjà émis sont mémorisés
 * pour la journée (localStorage) — aucune notification en double.
 */
import { db } from '@/services/storage/db';
import { todayKey } from '@/services/dates/dateUtils';
import { notifyOS } from './notify';
import { toast } from '@/stores/toast';

const FIRED_KEY = 'cozydesk.reminders.fired.v1';

interface FiredState {
  day: string;
  keys: string[];
}

function loadFired(): FiredState {
  try {
    const raw = window.localStorage.getItem(FIRED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FiredState;
      if (parsed.day === todayKey()) return parsed;
    }
  } catch {
    /* état corrompu : on repart à zéro */
  }
  return { day: todayKey(), keys: [] };
}

function saveFired(state: FiredState): void {
  window.localStorage.setItem(FIRED_KEY, JSON.stringify(state));
}

let timer: number | null = null;

/** Démarre le service de rappels (appelé au démarrage de l'application). */
export function startReminderService(): void {
  if (timer !== null) return;
  const check = async (): Promise<void> => {
    try {
      const today = todayKey();
      const events = await db.events.where('date').equals(today).toArray();
      if (events.length === 0) return;
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      let fired = loadFired();

      for (const ev of events) {
        if (ev.allDay || ev.startMinute === undefined || ev.reminderMinutes === undefined) {
          continue;
        }
        const remindAt = ev.startMinute - ev.reminderMinutes;
        const key = `${ev.id}@${ev.date}`;
        if (nowMin >= remindAt && nowMin <= ev.startMinute + 1 && !fired.keys.includes(key)) {
          notifyOS('Rappel CozyDesk', ev.title);
          toast('info', 'Rappel', ev.title);
          fired = { ...fired, keys: [...fired.keys, key] };
        }
      }
      saveFired(fired);
    } catch (err) {
      console.error('[cozydesk:reminders] vérification impossible :', err);
    }
  };
  void check();
  timer = window.setInterval(() => void check(), 30_000);
}

