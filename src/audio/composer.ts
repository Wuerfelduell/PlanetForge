// Generative background music: decides which notes play in each bar.
// Pure TypeScript without Web Audio, so it is deterministic and testable; music.ts plays the result.

export type Mood = 'calm' | 'tense';
export type Voice = 'pad' | 'bass' | 'pluck' | 'bell' | 'kick' | 'hat';

export interface Note {
  voice: Voice;
  /** Start within the bar, in beats (a bar has 4). */
  beat: number;
  /** Length in beats. */
  length: number;
  /** MIDI note number (60 = middle C). Ignored for drums. */
  midi: number;
  /** Loudness 0..1. */
  velocity: number;
}

export interface Theme {
  id: string;
  mood: Mood;
  bpm: number;
  /** MIDI note of the key's root, in the bass octave. */
  root: number;
  /** Semitone steps of the scale (7 notes). */
  scale: number[];
  /** One chord per bar, as a 0-based scale degree; the progression repeats. */
  progression: number[];
  /** Chance per eighth note that the melody plays. */
  density: number;
}

const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11];

export const THEMES: Theme[] = [
  { id: 'drift', mood: 'calm', bpm: 72, root: 38, scale: DORIAN, progression: [0, 6, 3, 4], density: 0.35 },
  { id: 'dawn', mood: 'calm', bpm: 80, root: 41, scale: LYDIAN, progression: [0, 1, 5, 4], density: 0.3 },
  { id: 'orbit', mood: 'calm', bpm: 66, root: 33, scale: AEOLIAN, progression: [0, 5, 2, 6], density: 0.28 },
  { id: 'siege', mood: 'tense', bpm: 112, root: 36, scale: HARMONIC_MINOR, progression: [0, 0, 5, 4], density: 0.5 },
];

export const BEATS_PER_BAR = 4;
/** Calm themes rotate after this many bars (about 1.5 minutes). */
export const BARS_PER_THEME = 24;

export function barSeconds(theme: Theme): number {
  return (60 / theme.bpm) * BEATS_PER_BAR;
}

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

/** MIDI note of scale degree `degree` (may exceed 7 or be negative) above the theme's root. */
export function degreeToMidi(theme: Theme, degree: number): number {
  const n = theme.scale.length;
  const octave = Math.floor(degree / n);
  return theme.root + octave * 12 + theme.scale[((degree % n) + n) % n];
}

/** The chord tone closest to `degree` within the melody's range (degrees 12..20). */
function nearestChordTone(degree: number, chordTones: number[]): number {
  for (let d = 0; d <= 3; d++) {
    for (const c of [degree - d, degree + d]) if (c >= 12 && c <= 20 && chordTones.includes(c % 7)) return c;
  }
  return degree;
}

/**
 * Writes one theme bar by bar. Keeps a little state (the melody's position) so phrases connect
 * across bars; the same theme and seed always produce the same music.
 */
export class Composer {
  private melody: number;

  constructor(
    readonly theme: Theme,
    private readonly seed = 1,
  ) {
    // Melody lives two octaves above the bass, starting on the chord root.
    this.melody = theme.scale.length * 2 + theme.progression[0];
  }

  bar(index: number): Note[] {
    const t = this.theme;
    const rand = mulberry32(this.seed * 7919 + index * 104729);
    const chord = t.progression[index % t.progression.length];
    const notes: Note[] = [];
    const tense = t.mood === 'tense';
    // Phrases of 8 bars; the first bars of a theme and the last bar of each phrase breathe.
    const intro = index < 2;
    const breath = index % 8 === 7;

    // Pad: the chord's triad one octave above the bass, plus a seventh now and then.
    const pad = [0, 2, 4];
    if (!tense && rand() < 0.4) pad.push(6);
    for (const step of pad) {
      notes.push({ voice: 'pad', beat: 0, length: BEATS_PER_BAR, midi: degreeToMidi(t, t.scale.length + chord + step), velocity: 0.5 });
    }

    // Bass.
    const root = degreeToMidi(t, chord);
    if (tense) {
      for (let e = 0; e < 8; e++) notes.push({ voice: 'bass', beat: e / 2, length: 0.4, midi: e === 6 ? root + 7 : root, velocity: e % 2 ? 0.55 : 0.8 });
    } else {
      notes.push({ voice: 'bass', beat: 0, length: 2.5, midi: root, velocity: 0.7 });
      if (!intro) notes.push({ voice: 'bass', beat: 2.5, length: 1.5, midi: rand() < 0.5 ? root : degreeToMidi(t, chord + 4), velocity: 0.5 });
    }

    // Melody: a random walk on the scale that leans toward chord tones.
    if (!intro && !breath) {
      const chordTones = pad.map((s) => (((chord + s) % 7) + 7) % 7);
      for (let e = 0; e < 8; e++) {
        const onBeat = e % 2 === 0;
        if (rand() > t.density * (onBeat ? 1.4 : 0.7)) continue;
        const step = [-2, -1, -1, 0, 1, 1, 2][Math.floor(rand() * 7)];
        this.melody = Math.max(12, Math.min(20, this.melody + step));
        // On strong beats snap to the nearest chord tone, so it never clashes with the pad.
        if (onBeat) this.melody = nearestChordTone(this.melody, chordTones);
        const length = tense ? 0.5 : 0.5 + Math.floor(rand() * 3) * 0.5;
        notes.push({ voice: 'pluck', beat: e / 2, length, midi: degreeToMidi(t, this.melody), velocity: (onBeat ? 0.7 : 0.5) + rand() * 0.2 });
      }
    }

    // Bells: a rare high chord tone that rings out.
    if (!tense && !intro && rand() < 0.3) {
      notes.push({ voice: 'bell', beat: Math.floor(rand() * 4), length: 3, midi: degreeToMidi(t, 21 + chord + pad[Math.floor(rand() * 3)]), velocity: 0.4 });
    }

    // Drums only when it gets serious.
    if (tense) {
      for (const beat of [0, 1.5, 2, 3]) notes.push({ voice: 'kick', beat, length: 0.5, midi: 0, velocity: beat % 2 === 0 ? 0.9 : 0.6 });
      if (!intro) for (let e = 0; e < 8; e++) notes.push({ voice: 'hat', beat: e / 2, length: 0.25, midi: 0, velocity: e % 2 ? 0.5 : 0.3 });
    }

    return notes;
  }
}
