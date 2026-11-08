/**
 * Mélangeur de sons d'ambiance — synthèse procédurale WebAudio.
 * Aucun fichier audio embarqué : chaque son est réellement généré
 * (bruit filtré, gouttes, crépitements, oiseaux…), 100% local.
 */

export type AmbientChannelId = 'rain' | 'forest' | 'wind' | 'fire' | 'ocean' | 'cafe' | 'white';

export interface AmbientChannelDef {
  id: AmbientChannelId;
  label: string;
}

export const AMBIENT_CHANNELS: AmbientChannelDef[] = [
  { id: 'rain', label: 'Pluie' },
  { id: 'forest', label: 'Forêt' },
  { id: 'wind', label: 'Vent' },
  { id: 'fire', label: 'Feu de cheminée' },
  { id: 'ocean', label: 'Océan' },
  { id: 'cafe', label: 'Café' },
  { id: 'white', label: 'Bruit blanc' }
];

const NOISE_SECONDS = 2.5;

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private channels = new Map<AmbientChannelId, ChannelNodes>();
  private buffers: { white?: AudioBuffer; brown?: AudioBuffer; pink?: AudioBuffer } = {};
  private masterVolume = 0.8;

  private ensureCtx(): AudioContext {
    if (this.ctx === null) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.masterVolume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private whiteBuffer(ctx: AudioContext): AudioBuffer {
    if (this.buffers.white) return this.buffers.white;
    const buf = ctx.createBuffer(1, ctx.sampleRate * NOISE_SECONDS, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.buffers.white = buf;
    return buf;
  }

  private brownBuffer(ctx: AudioContext): AudioBuffer {
    if (this.buffers.brown) return this.buffers.brown;
    const buf = ctx.createBuffer(1, ctx.sampleRate * NOISE_SECONDS, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    this.buffers.brown = buf;
    return buf;
  }

  private pinkBuffer(ctx: AudioContext): AudioBuffer {
    if (this.buffers.pink) return this.buffers.pink;
    const buf = ctx.createBuffer(1, ctx.sampleRate * NOISE_SECONDS, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099;
      b1 = 0.963 * b1 + white * 0.2965;
      b2 = 0.57 * b2 + white * 1.0526;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.22;
    }
    this.buffers.pink = buf;
    return buf;
  }

  private noiseSource(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    return src;
  }

  setMasterVolume(v: number): void {
    this.masterVolume = v;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.08);
    }
  }

  isActive(id: AmbientChannelId): boolean {
    return this.channels.has(id);
  }

  activeChannels(): AmbientChannelId[] {
    return [...this.channels.keys()];
  }

  setChannel(id: AmbientChannelId, active: boolean, volume: number): void {
    if (active) this.startChannel(id, volume);
    else this.stopChannel(id);
  }

  setChannelVolume(id: AmbientChannelId, volume: number): void {
    const ch = this.channels.get(id);
    if (ch && this.ctx) {
      ch.gain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
    }
  }

  stopAll(): void {
    for (const id of [...this.channels.keys()]) this.stopChannel(id);
  }

  private startChannel(id: AmbientChannelId, volume: number): void {
    if (this.channels.has(id)) {
      this.setChannelVolume(id, volume);
      return;
    }
    const ctx = this.ensureCtx();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master!);

    const timers: number[] = [];
    const nodes: AudioNode[] = [];
    switch (id) {
      case 'rain':
        this.buildRain(ctx, gain, nodes, timers);
        break;
      case 'forest':
        this.buildForest(ctx, gain, nodes, timers);
        break;
      case 'wind':
        this.buildWind(ctx, gain, nodes);
        break;
      case 'fire':
        this.buildFire(ctx, gain, nodes, timers);
        break;
      case 'ocean':
        this.buildOcean(ctx, gain, nodes);
        break;
      case 'cafe':
        this.buildCafe(ctx, gain, nodes, timers);
        break;
      case 'white':
        this.buildWhite(ctx, gain, nodes);
        break;
    }

    gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.4);
    this.channels.set(id, { gain, timers, nodes });
  }

  private stopChannel(id: AmbientChannelId): void {
    const ch = this.channels.get(id);
    if (!ch || !this.ctx) return;
    this.channels.delete(id);
    ch.timers.forEach((t) => window.clearInterval(t));
    const ctx = this.ctx;
    ch.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    window.setTimeout(() => {
      ch.nodes.forEach((n) => {
        try {
          if ('stop' in n) (n as AudioBufferSourceNode).stop();
        } catch {
          /* déjà arrêté */
        }
        n.disconnect();
      });
      ch.gain.disconnect();
    }, 900);
  }

  /* ---------- Générateurs ---------- */

  private buildRain(ctx: AudioContext, out: GainNode, nodes: AudioNode[], timers: number[]): void {
    const src = this.noiseSource(ctx, this.whiteBuffer(ctx));
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1500;
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 350;
    src.connect(highpass).connect(lowpass).connect(out);
    src.start();
    nodes.push(src, highpass, lowpass);

    // Gouttes : courts « plink » sinusoïdaux aléatoires
    timers.push(
      window.setInterval(() => {
        if (Math.random() > 0.55) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.value = 1400 + Math.random() * 3200;
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.05, ctx.currentTime + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        osc.connect(g).connect(out);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }, 260)
    );
  }

  private buildForest(ctx: AudioContext, out: GainNode, nodes: AudioNode[], timers: number[]): void {
    // Vent doux sous les feuilles
    const src = this.noiseSource(ctx, this.pinkBuffer(ctx));
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 900;
    band.Q.value = 0.6;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.13;
    lfoGain.gain.value = 0.35;
    const steady = ctx.createGain();
    steady.gain.value = 0.6;
    lfo.connect(lfoGain).connect(steady.gain);
    src.connect(band).connect(steady).connect(out);
    src.start();
    lfo.start();
    nodes.push(src, band, steady, lfo, lfoGain);

    // Oiseaux : trilles FM courtes
    const chirp = (): void => {
      const base = 2200 + Math.random() * 1600;
      const reps = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < reps; i++) {
        const at = ctx.currentTime + i * 0.14;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(base, at);
        osc.frequency.exponentialRampToValueAtTime(base * 1.4, at + 0.05);
        osc.frequency.exponentialRampToValueAtTime(base * 0.9, at + 0.1);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.045, at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
        osc.connect(g).connect(out);
        osc.start(at);
        osc.stop(at + 0.16);
      }
    };
    timers.push(
      window.setInterval(() => {
        if (Math.random() > 0.3) return;
        chirp();
      }, 2100)
    );
  }

  private buildWind(ctx: AudioContext, out: GainNode, nodes: AudioNode[]): void {
    const src = this.noiseSource(ctx, this.brownBuffer(ctx));
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 380;
    band.Q.value = 0.9;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 240;
    lfo.connect(lfoGain).connect(band.frequency);
    const amp = ctx.createGain();
    amp.gain.value = 1.6;
    src.connect(band).connect(amp).connect(out);
    src.start();
    lfo.start();
    nodes.push(src, band, lfo, lfoGain, amp);
  }

  private buildFire(ctx: AudioContext, out: GainNode, nodes: AudioNode[], timers: number[]): void {
    // Ronflement chaud
    const src = this.noiseSource(ctx, this.brownBuffer(ctx));
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 420;
    const amp = ctx.createGain();
    amp.gain.value = 2.4;
    src.connect(lowpass).connect(amp).connect(out);
    src.start();
    nodes.push(src, lowpass, amp);

    // Crépitements : bouffées de bruit très courtes
    const crackle = (): void => {
      const len = 0.02 + Math.random() * 0.04;
      const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
      }
      const s = ctx.createBufferSource();
      s.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1400;
      const g = ctx.createGain();
      g.gain.value = 0.25 + Math.random() * 0.5;
      s.connect(hp).connect(g).connect(out);
      s.start();
    };
    timers.push(
      window.setInterval(() => {
        if (Math.random() > 0.42) return;
        crackle();
      }, 140)
    );
  }

  private buildOcean(ctx: AudioContext, out: GainNode, nodes: AudioNode[]): void {
    const makeWave = (offset: number): void => {
      const src = this.noiseSource(ctx, this.brownBuffer(ctx));
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 800;
      const swell = ctx.createGain();
      swell.gain.value = 0;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.09 + offset * 0.02;
      lfoGain.gain.value = 0.55;
      swell.gain.value = 0.55;
      lfo.connect(lfoGain).connect(swell.gain);
      const amp = ctx.createGain();
      amp.gain.value = 1.4;
      src.connect(lowpass).connect(swell).connect(amp).connect(out);
      src.start();
      lfo.start();
      nodes.push(src, lowpass, swell, lfo, lfoGain, amp);
    };
    makeWave(0);
    makeWave(1);
  }

  private buildCafe(ctx: AudioContext, out: GainNode, nodes: AudioNode[], timers: number[]): void {
    // Bourdonnement de voix
    const src = this.noiseSource(ctx, this.pinkBuffer(ctx));
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 750;
    const amp = ctx.createGain();
    amp.gain.value = 1.7;
    src.connect(lowpass).connect(amp).connect(out);
    src.start();
    nodes.push(src, lowpass, amp);

    // Tasses : « cling » métallique occasionnel
    timers.push(
      window.setInterval(() => {
        if (Math.random() > 0.18) return;
        const at = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 1900 + Math.random() * 900;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.035, at + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
        osc.connect(g).connect(out);
        osc.start(at);
        osc.stop(at + 0.55);
      }, 1700)
    );
  }

  private buildWhite(ctx: AudioContext, out: GainNode, nodes: AudioNode[]): void {
    const src = this.noiseSource(ctx, this.whiteBuffer(ctx));
    const amp = ctx.createGain();
    amp.gain.value = 0.5;
    src.connect(amp).connect(out);
    src.start();
    nodes.push(src, amp);
  }
}

interface ChannelNodes {
  gain: GainNode;
  timers: number[];
  nodes: AudioNode[];
}

export const ambientEngine = new AmbientEngine();
