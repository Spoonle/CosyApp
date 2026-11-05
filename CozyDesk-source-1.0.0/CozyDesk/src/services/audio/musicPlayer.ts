/**
 * Lecteur musical — un seul élément <audio>, URLs via protocole sécurisé
 * cozydesk-file:// (liste blanche du processus principal).
 */
import type { Track } from '@/types/domain';

export interface PlayerHandle {
  load(url: string): void;
  play(): Promise<void>;
  pause(): void;
  seek(sec: number): void;
  setVolume(v: number): void;
}

type Listener = () => void;

class MusicPlayer {
  private el: HTMLAudioElement | null = null;
  private timeListeners = new Set<Listener>();
  private endListeners = new Set<Listener>();
  private errorListeners = new Set<Listener>();

  private ensure(): HTMLAudioElement {
    if (this.el === null) {
      this.el = new Audio();
      this.el.preload = 'auto';
      this.el.addEventListener('timeupdate', () => this.emitTime());
      this.el.addEventListener('ended', () => this.endListeners.forEach((l) => l()));
      this.el.addEventListener(
        'error',
        () => this.errorListeners.forEach((l) => l())
      );
      this.el.addEventListener('loadedmetadata', () => this.emitTime());
    }
    return this.el;
  }

  attach(): HTMLAudioElement {
    return this.ensure();
  }

  load(url: string): void {
    const el = this.ensure();
    el.src = url;
    el.load();
  }

  async play(): Promise<void> {
    const el = this.ensure();
    await el.play();
  }

  pause(): void {
    this.ensure().pause();
  }

  seek(sec: number): void {
    const el = this.ensure();
    if (Number.isFinite(el.duration)) {
      el.currentTime = Math.max(0, Math.min(sec, el.duration));
    }
  }

  setVolume(v: number): void {
    this.ensure().volume = Math.max(0, Math.min(1, v));
  }

  get currentTime(): number {
    return this.ensure().currentTime;
  }

  get duration(): number {
    const d = this.ensure().duration;
    return Number.isFinite(d) ? d : 0;
  }

  onTime(listener: Listener): () => void {
    this.timeListeners.add(listener);
    return () => this.timeListeners.delete(listener);
  }

  onEnded(listener: Listener): () => void {
    this.endListeners.add(listener);
    return () => this.endListeners.delete(listener);
  }

  onError(listener: Listener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private emitTime(): void {
    this.timeListeners.forEach((l) => l());
  }
}

export const musicPlayer = new MusicPlayer();

/** Demande au processus principal l'URL sécurisée d'une piste. */
export async function grantTrackUrl(track: Track): Promise<string> {
  const api = window.cozydesk;
  if (!api) throw new Error('Lecteur disponible uniquement dans l’application.');
  const grants = await api.files.grant([track.path], 'audio');
  if (grants.length === 0) {
    throw new Error(`Fichier introuvable ou non autorisé : ${track.title}`);
  }
  return grants[0].url;
}

/** Couleur de repli générée à partir du titre (quand pas de pochette). */
export function trackGradient(track: Track): string {
  let hash = 0;
  for (let i = 0; i < track.title.length; i++) {
    hash = (hash * 31 + track.title.charCodeAt(i)) >>> 0;
  }
  const h1 = hash % 360;
  const h2 = (h1 + 60) % 360;
  return `linear-gradient(135deg, hsl(${h1} 55% 45%), hsl(${h2} 60% 35%))`;
}
