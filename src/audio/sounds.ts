import type { SoundDef } from './synth';

// All sound effects of the game, synthesized at runtime (no audio files).
// Cozy toy style: soft sines and triangles, major/pentatonic intervals, short tails.
// Tweak by ear in sfx-preview.html.

export const SOUNDS = {
  // --- UI ---
  'ui.tap': {
    layers: [{ wave: 'triangle', freq: 880, to: 660, release: 0.06 }],
    gain: 0.35,
    variation: 0.5,
  },
  'ui.open': {
    layers: [{ wave: 'sine', freq: 440, to: 880, attack: 0.01, release: 0.14 }],
    gain: 0.4,
  },
  'ui.close': {
    layers: [{ wave: 'sine', freq: 880, to: 440, attack: 0.01, release: 0.12 }],
    gain: 0.35,
  },
  'ui.toggle': {
    layers: [
      { wave: 'square', freq: 1200, release: 0.025, duty: 0.25, lowpass: 3000 },
      { wave: 'triangle', freq: 1600, at: 0.03, release: 0.03 },
    ],
    gain: 0.3,
  },
  'ui.error': {
    layers: [
      { wave: 'square', freq: 220, release: 0.09, duty: 0.4, lowpass: 1200 },
      { wave: 'square', freq: 185, at: 0.1, release: 0.14, duty: 0.4, lowpass: 1200 },
    ],
    gain: 0.4,
  },
  'ui.tab': {
    layers: [{ wave: 'triangle', freq: 660, notes: [0, 7], step: 0.04, release: 0.09 }],
    gain: 0.35,
  },

  // --- Planet wheel ---
  'wheel.tick': {
    layers: [{ wave: 'noise', freq: 6000, release: 0.018, lowpass: 4000 }],
    gain: 0.18,
    variation: 1,
  },
  'segment.select': {
    layers: [
      { wave: 'sine', freq: 784, release: 0.12 },
      { wave: 'sine', freq: 1568, release: 0.06, volume: 0.3 },
    ],
    gain: 0.4,
    variation: 0.3,
  },
  'fog.reveal': {
    layers: [
      { wave: 'noise', freq: 3000, to: 9000, attack: 0.15, release: 0.35, lowpass: 2500, volume: 0.5 },
      { wave: 'sine', freq: 523, notes: [0, 4, 7, 12], step: 0.08, attack: 0.02, release: 0.5, volume: 0.6 },
    ],
    gain: 0.5,
  },

  // --- Building ---
  'build.place': {
    layers: [
      { wave: 'sine', freq: 180, to: 70, release: 0.14 },
      { wave: 'noise', freq: 2500, release: 0.08, lowpass: 1800, volume: 0.6 },
    ],
    gain: 0.6,
    variation: 0.5,
  },
  'build.hammer': {
    layers: [
      { wave: 'triangle', freq: 900, to: 500, release: 0.05 },
      { wave: 'noise', freq: 8000, release: 0.03, lowpass: 5000, volume: 0.4 },
    ],
    gain: 0.35,
    variation: 1.5,
  },
  'build.complete': {
    layers: [
      { wave: 'triangle', freq: 523, notes: [0, 4, 7, 12], step: 0.07, release: 0.42 },
      { wave: 'sine', freq: 1046, at: 0.21, release: 0.4, volume: 0.4 },
    ],
    gain: 0.5,
  },
  'build.upgrade': {
    layers: [
      { wave: 'triangle', freq: 392, notes: [0, 5, 9, 12, 16], step: 0.06, release: 0.45 },
      { wave: 'sine', freq: 392, to: 1568, attack: 0.2, release: 0.15, volume: 0.3 },
    ],
    gain: 0.5,
  },
  'build.demolish': {
    layers: [
      { wave: 'noise', freq: 1200, to: 300, attack: 0.01, release: 0.5, lowpass: 900 },
      { wave: 'sine', freq: 110, to: 45, release: 0.35, volume: 0.8 },
    ],
    gain: 0.6,
  },

  // --- Citizens & resources ---
  'citizen.assign': {
    layers: [{ wave: 'sine', freq: 600, to: 1100, attack: 0.005, release: 0.08, vibrato: { rate: 30, depth: 0.6 } }],
    gain: 0.4,
    variation: 1,
  },
  'citizen.born': {
    layers: [
      { wave: 'sine', freq: 880, notes: [0, 7, 12], step: 0.05, release: 0.2, vibrato: { rate: 12, depth: 0.3 } },
    ],
    gain: 0.4,
  },
  'resource.collect': {
    layers: [
      { wave: 'sine', freq: 1046, notes: [0, 7], step: 0.035, release: 0.1 },
      { wave: 'triangle', freq: 2093, release: 0.03, volume: 0.2 },
    ],
    gain: 0.3,
    variation: 1,
  },
  'resource.rare': {
    layers: [
      { wave: 'sine', freq: 1318, notes: [0, 3, 7, 10, 14], step: 0.045, release: 0.4 },
      { wave: 'triangle', freq: 2637, at: 0.1, release: 0.3, volume: 0.25, vibrato: { rate: 8, depth: 0.2 } },
    ],
    gain: 0.4,
  },

  // --- Progress ---
  'ascension.levelup': {
    layers: [
      { wave: 'triangle', freq: 262, notes: [0, 4, 7, 12, 16, 19, 24], step: 0.09, release: 0.9 },
      { wave: 'sine', freq: 131, attack: 0.3, hold: 0.3, release: 0.6, volume: 0.5 },
      { wave: 'noise', freq: 5000, to: 12000, at: 0.5, attack: 0.1, release: 0.6, lowpass: 3000, volume: 0.2 },
    ],
    gain: 0.6,
  },
  'victory.fanfare': {
    layers: [
      { wave: 'triangle', freq: 392, notes: [0, 0, 0, 5, 9, 12], step: 0.13, release: 0.5 },
      { wave: 'triangle', freq: 523, at: 0.8, attack: 0.05, hold: 0.9, release: 1.2, vibrato: { rate: 5, depth: 0.12 } },
      { wave: 'sine', freq: 659, at: 0.8, attack: 0.08, hold: 0.9, release: 1.2, volume: 0.6 },
      { wave: 'sine', freq: 784, at: 0.8, attack: 0.1, hold: 0.9, release: 1.2, volume: 0.5 },
      { wave: 'sine', freq: 131, at: 0.8, attack: 0.2, hold: 0.8, release: 1.2, volume: 0.6 },
      { wave: 'noise', freq: 6000, to: 12000, at: 0.8, attack: 0.1, release: 1.4, lowpass: 3000, volume: 0.2 },
    ],
    gain: 0.65,
  },
  'discovery.unlock': {
    layers: [
      { wave: 'sine', freq: 659, notes: [0, 7, 12, 19], step: 0.08, release: 0.6, vibrato: { rate: 6, depth: 0.15 } },
      { wave: 'triangle', freq: 1318, at: 0.24, release: 0.5, volume: 0.3 },
    ],
    gain: 0.5,
  },

  // --- Space ---
  'rocket.launch': {
    layers: [
      { wave: 'noise', freq: 800, to: 2400, attack: 0.25, hold: 0.4, release: 0.8, lowpass: 1200 },
      { wave: 'sine', freq: 80, to: 200, attack: 0.2, hold: 0.4, release: 0.7, volume: 0.6 },
    ],
    gain: 0.6,
  },
  'rocket.land': {
    layers: [
      { wave: 'noise', freq: 2000, to: 500, attack: 0.05, release: 0.5, lowpass: 1000 },
      { wave: 'sine', freq: 140, to: 60, at: 0.35, release: 0.2, volume: 0.8 },
    ],
    gain: 0.55,
  },
  'planet.colonize': {
    layers: [
      { wave: 'triangle', freq: 392, notes: [0, 4, 7, 11, 12], step: 0.1, release: 0.7 },
      { wave: 'sine', freq: 196, attack: 0.1, hold: 0.3, release: 0.4, volume: 0.4 },
    ],
    gain: 0.5,
  },

  // --- Diplomacy & conflict ---
  'diplomacy.happy': {
    layers: [{ wave: 'sine', freq: 784, notes: [0, 4, 7], step: 0.06, release: 0.25, vibrato: { rate: 10, depth: 0.3 } }],
    gain: 0.4,
  },
  'diplomacy.angry': {
    layers: [{ wave: 'saw', freq: 200, to: 150, release: 0.3, lowpass: 900, vibrato: { rate: 14, depth: 0.8 } }],
    gain: 0.45,
  },
  'diplomacy.trade': {
    layers: [
      { wave: 'triangle', freq: 1568, release: 0.05 },
      { wave: 'triangle', freq: 2093, at: 0.07, release: 0.12 },
      { wave: 'noise', freq: 9000, at: 0.07, release: 0.05, lowpass: 7000, volume: 0.2 },
    ],
    gain: 0.4,
  },
  'war.declare': {
    layers: [
      { wave: 'saw', freq: 147, notes: [0, 0, 5, 3], step: 0.15, attack: 0.02, release: 0.7, lowpass: 1400 },
      { wave: 'sine', freq: 73, attack: 0.02, hold: 0.3, release: 0.5, volume: 0.6 },
    ],
    gain: 0.55,
  },
  'battle.dice': {
    layers: [
      { wave: 'noise', freq: 4000, release: 0.03, lowpass: 3000 },
      { wave: 'noise', freq: 4000, at: 0.07, release: 0.03, lowpass: 3000 },
      { wave: 'noise', freq: 4000, at: 0.15, release: 0.04, lowpass: 3000 },
      { wave: 'triangle', freq: 700, at: 0.15, release: 0.05, volume: 0.5 },
    ],
    gain: 0.45,
    variation: 1,
  },
  'monster.roar': {
    layers: [
      { wave: 'saw', freq: 90, to: 60, attack: 0.08, hold: 0.25, release: 0.5, lowpass: 600, vibrato: { rate: 18, depth: 1.2 } },
      { wave: 'noise', freq: 900, attack: 0.08, hold: 0.25, release: 0.5, lowpass: 700, volume: 0.5 },
    ],
    gain: 0.6,
  },

  // --- Warnings ---
  'alert.warning': {
    layers: [
      { wave: 'triangle', freq: 880, release: 0.1 },
      { wave: 'triangle', freq: 880, at: 0.16, release: 0.1 },
    ],
    gain: 0.4,
  },
  'alert.hungry': {
    layers: [{ wave: 'sine', freq: 330, to: 220, attack: 0.02, release: 0.35, vibrato: { rate: 5, depth: 0.5 } }],
    gain: 0.4,
  },

  // --- Coop ---
  'coop.ping': {
    layers: [
      { wave: 'sine', freq: 1318, release: 0.25 },
      { wave: 'sine', freq: 1975, at: 0.08, release: 0.3, volume: 0.5 },
    ],
    gain: 0.45,
  },
  'coop.join': {
    layers: [{ wave: 'triangle', freq: 523, notes: [0, 7, 12], step: 0.07, release: 0.3 }],
    gain: 0.45,
  },
  'coop.leave': {
    layers: [{ wave: 'triangle', freq: 523, notes: [12, 7, 0], step: 0.07, release: 0.3 }],
    gain: 0.4,
  },
  'coop.chat': {
    layers: [{ wave: 'sine', freq: 1046, to: 1318, release: 0.07 }],
    gain: 0.3,
  },
} satisfies Record<string, SoundDef>;

export type SfxId = keyof typeof SOUNDS;
