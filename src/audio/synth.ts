// Tiny offline synthesizer: turns a SoundDef into raw samples.
// Pure TypeScript with no Web Audio dependency, so it runs in Node too (tests, WAV export).

export type Wave = 'sine' | 'triangle' | 'square' | 'saw' | 'noise';

export interface Layer {
  wave: Wave;
  /** Start frequency in Hz. For noise: how often a new random value is drawn (higher = brighter hiss). */
  freq: number;
  /** End frequency in Hz; the pitch slides exponentially from freq to this. */
  to?: number;
  /** Delay before this layer starts, in seconds. */
  at?: number;
  attack?: number;
  hold?: number;
  release: number;
  volume?: number;
  /** Pulse width for square waves, 0..1. */
  duty?: number;
  /** Arpeggio: semitone offsets played one after another, each `step` seconds long. */
  notes?: number[];
  step?: number;
  /** Pitch wobble: rate in Hz, depth in semitones. */
  vibrato?: { rate: number; depth: number };
  /** One-pole low-pass cutoff in Hz, softens harsh waves. */
  lowpass?: number;
}

export interface SoundDef {
  layers: Layer[];
  /** Overall loudness after normalizing, 0..1. */
  gain?: number;
  /** Random pitch spread in semitones (±), so repeated sounds do not get tiring. */
  variation?: number;
}

export interface RenderOptions {
  sampleRate?: number;
  /** Pitch multiplier applied to every layer. */
  pitch?: number;
  /** Seed for the noise generator, so the same sound always renders the same. */
  seed?: number;
}

const TAU = Math.PI * 2;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function layerDuration(l: Layer): number {
  return (l.at ?? 0) + (l.attack ?? 0.005) + (l.hold ?? 0) + l.release;
}

export function soundDuration(def: SoundDef): number {
  return Math.max(...def.layers.map(layerDuration));
}

function envelope(t: number, attack: number, hold: number, release: number): number {
  if (t < attack) return t / attack;
  t -= attack;
  if (t < hold) return 1;
  t -= hold;
  if (t < release) {
    const k = 1 - t / release;
    return k * k;
  }
  return 0;
}

function oscillator(wave: Wave, phase: number, duty: number): number {
  const p = phase - Math.floor(phase);
  switch (wave) {
    case 'sine':
      return Math.sin(p * TAU);
    case 'triangle':
      return 1 - 4 * Math.abs(p - 0.5);
    case 'square':
      return p < duty ? 1 : -1;
    case 'saw':
      return 2 * p - 1;
    default:
      return 0;
  }
}

function renderLayer(out: Float32Array, l: Layer, sr: number, pitch: number, rand: () => number): void {
  const attack = l.attack ?? 0.005;
  const hold = l.hold ?? 0;
  const dur = attack + hold + l.release;
  const start = Math.round((l.at ?? 0) * sr);
  const len = Math.min(Math.round(dur * sr), out.length - start);
  const f0 = l.freq * pitch;
  const f1 = (l.to ?? l.freq) * pitch;
  const vol = l.volume ?? 1;
  const duty = l.duty ?? 0.5;
  const lpA = l.lowpass ? 1 - Math.exp((-TAU * l.lowpass) / sr) : 1;

  let phase = 0;
  let noiseVal = 0;
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const p = t / dur;
    let f = f0 * Math.pow(f1 / f0, p);
    if (l.notes && l.notes.length) {
      const idx = Math.min(l.notes.length - 1, Math.floor(t / (l.step ?? 0.08)));
      f *= Math.pow(2, l.notes[idx] / 12);
    }
    if (l.vibrato) f *= Math.pow(2, (l.vibrato.depth * Math.sin(TAU * l.vibrato.rate * t)) / 12);

    const prev = phase;
    phase += f / sr;
    let s: number;
    if (l.wave === 'noise') {
      if (Math.floor(phase) !== Math.floor(prev)) noiseVal = rand() * 2 - 1;
      s = noiseVal;
    } else {
      s = oscillator(l.wave, phase, duty);
    }
    lp += lpA * (s - lp);
    out[start + i] += lp * vol * envelope(t, attack, hold, l.release);
  }
}

/** Renders a sound to mono samples in -1..1, normalized to the sound's gain. */
export function renderSound(def: SoundDef, opts: RenderOptions = {}): Float32Array<ArrayBuffer> {
  const sr = opts.sampleRate ?? 44100;
  const pitch = opts.pitch ?? 1;
  const rand = mulberry32(opts.seed ?? 1);
  const out = new Float32Array(Math.ceil(soundDuration(def) * sr) + 1);
  for (const l of def.layers) renderLayer(out, l, sr, pitch, rand);

  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  const scale = peak > 0 ? (def.gain ?? 0.6) / peak : 0;
  // 3 ms fade in/out against clicks.
  const fade = Math.min(Math.round(sr * 0.003), out.length >> 1);
  for (let i = 0; i < out.length; i++) {
    let k = scale;
    if (i < fade) k *= i / fade;
    else if (i > out.length - fade) k *= (out.length - i) / fade;
    out[i] *= k;
  }
  return out;
}

/** Encodes mono samples as a 16-bit PCM WAV file. */
export function encodeWav(samples: Float32Array, sampleRate = 44100): Uint8Array {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s * 0x7fff, true);
  }
  return new Uint8Array(buf);
}
