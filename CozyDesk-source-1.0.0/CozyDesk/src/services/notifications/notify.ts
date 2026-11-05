/**
 * Notifications : toast interne + notification système (Electron/Chromium).
 * Carillon de fin de phase synthétisé en WebAudio (aucun fichier requis).
 */
import { toast } from '@/stores/toast';

export function osNotificationSupported(): boolean {
  return typeof Notification !== 'undefined';
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!osNotificationSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch (err) {
    console.warn('[cozydesk:notify] demande de permission impossible :', err);
    return false;
  }
}

export function notifyOS(title: string, body: string): void {
  if (osNotificationSupported() && Notification.permission === 'granted') {
    try {
      const n = new Notification(title, { body, silent: true, tag: 'cozydesk' });
      n.onclick = () => {
        window.focus();
        n.close();
      };
      return;
    } catch (err) {
      console.warn('[cozydesk:notify] notification système impossible :', err);
    }
  }
  toast('info', title, body);
}

export function notifyPomodoro(title: string, body: string): void {
  notifyOS(title, body);
}

/* ---------- Carillon WebAudio ---------- */

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext {
  if (audioCtx === null) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

function bell(freq: number, at: number, dur: number, gainPeak: number): void {
  const ac = ctx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ac.currentTime + at);
  gain.gain.linearRampToValueAtTime(gainPeak, ac.currentTime + at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + at + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + at);
  osc.stop(ac.currentTime + at + dur + 0.05);
}

/** Sons distincts : fin de travail (montée claire) / fin de pause (note apaisée). */
export function chime(kind: 'work-end' | 'break-end' | 'soft'): void {
  try {
    if (kind === 'work-end') {
      bell(880, 0, 0.9, 0.22);
      bell(1174.66, 0.16, 0.9, 0.18);
      bell(1567.98, 0.32, 1.1, 0.14);
    } else if (kind === 'break-end') {
      bell(659.25, 0, 1.0, 0.2);
      bell(880, 0.22, 1.1, 0.16);
    } else {
      bell(987.77, 0, 0.5, 0.14);
    }
  } catch (err) {
    console.warn('[cozydesk:notify] carillon impossible :', err);
  }
}
