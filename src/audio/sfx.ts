import { renderSound, type SoundDef } from './synth';
import { SOUNDS, type SfxId } from './sounds';

export type { SfxId } from './sounds';

export interface PlayOptions {
  /** Extra volume factor, 0..1. */
  volume?: number;
  /** Pitch shift in semitones, added to the sound's random variation. */
  semitones?: number;
}

/** Same sound again within this window is skipped (e.g. 20 resources popping at once). */
const MIN_REPEAT_MS = 40;
/** Pitch variants rendered per sound with `variation`, picked at random when played. */
const VARIANTS = 4;

/**
 * Plays the game's synthesized sound effects through Web Audio.
 * Browsers (iOS especially) only allow audio after a user gesture, so call `unlock()`
 * from the first tap/click handler; until then `play()` is a silent no-op.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private cache = new Map<string, AudioBuffer>();
  private lastPlayed = new Map<SfxId, number>();
  private volume = 0.8;
  private muted = false;

  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.applyVolume();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  play(id: SfxId, opts: PlayOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted || ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (this.lastPlayed.get(id) ?? -Infinity) < MIN_REPEAT_MS) return;
    this.lastPlayed.set(id, now);

    const def: SoundDef = SOUNDS[id];
    const variant = def.variation ? Math.floor(Math.random() * VARIANTS) : 0;
    const src = ctx.createBufferSource();
    src.buffer = this.buffer(id, def, variant);
    if (opts.semitones) src.playbackRate.value = Math.pow(2, opts.semitones / 12);
    let out: AudioNode = src;
    if (opts.volume !== undefined) {
      const g = ctx.createGain();
      g.gain.value = opts.volume;
      src.connect(g);
      out = g;
    }
    out.connect(this.master);
    src.start();
  }

  /** Renders every sound up front, e.g. during a loading screen. Needs `unlock()` first. */
  preload(): void {
    for (const id of Object.keys(SOUNDS) as SfxId[]) {
      const def: SoundDef = SOUNDS[id];
      for (let v = 0; v < (def.variation ? VARIANTS : 1); v++) this.buffer(id, def, v);
    }
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyVolume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.applyVolume();
  }

  private applyVolume(): void {
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  private buffer(id: SfxId, def: SoundDef, variant: number): AudioBuffer {
    const key = `${id}#${variant}`;
    let buf = this.cache.get(key);
    if (!buf) {
      const ctx = this.ctx!;
      // Spread variants evenly across ±variation semitones.
      const semis = def.variation ? ((variant / (VARIANTS - 1)) * 2 - 1) * def.variation : 0;
      const samples = renderSound(def, {
        sampleRate: ctx.sampleRate,
        pitch: Math.pow(2, semis / 12),
        seed: variant + 1,
      });
      buf = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      buf.copyToChannel(samples, 0);
      this.cache.set(key, buf);
    }
    return buf;
  }
}

/** Shared instance for the whole game. */
export const sfx = new Sfx();
