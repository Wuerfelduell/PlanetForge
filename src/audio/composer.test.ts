import { describe, expect, it } from 'vitest';
import { Composer, THEMES, degreeToMidi } from './composer';
import { loadMusicSettings } from './music';

const pitchClasses = (theme: (typeof THEMES)[number]) => new Set(theme.scale.map((s) => (theme.root + s) % 12));

describe('composer', () => {
  it('is deterministic for the same seed', () => {
    for (const theme of THEMES) {
      const a = new Composer(theme, 42);
      const b = new Composer(theme, 42);
      for (let bar = 0; bar < 16; bar++) expect(a.bar(bar)).toEqual(b.bar(bar));
    }
  });

  it('stays in key, in range and inside the bar', () => {
    for (const theme of THEMES) {
      const inKey = pitchClasses(theme);
      const c = new Composer(theme, 7);
      for (let bar = 0; bar < 64; bar++) {
        const notes = c.bar(bar);
        expect(notes.some((n) => n.voice === 'pad')).toBe(true);
        expect(notes.some((n) => n.voice === 'bass')).toBe(true);
        for (const n of notes) {
          expect(n.beat).toBeGreaterThanOrEqual(0);
          expect(n.beat).toBeLessThan(4);
          expect(n.length).toBeGreaterThan(0);
          expect(n.velocity).toBeGreaterThan(0);
          expect(n.velocity).toBeLessThanOrEqual(1);
          if (n.voice === 'kick' || n.voice === 'hat') continue;
          expect(inKey.has(n.midi % 12)).toBe(true);
          expect(n.midi).toBeGreaterThanOrEqual(24);
          expect(n.midi).toBeLessThanOrEqual(96);
        }
      }
    }
  });

  it('puts chord tones on strong beats so the melody does not clash with the pad', () => {
    for (const theme of THEMES) {
      const c = new Composer(theme, 3);
      for (let bar = 0; bar < 64; bar++) {
        const notes = c.bar(bar);
        const chord = new Set(notes.filter((n) => n.voice === 'pad').map((n) => n.midi % 12));
        for (const n of notes) if (n.voice === 'pluck' && n.beat % 1 === 0) expect(chord.has(n.midi % 12)).toBe(true);
      }
    }
  });

  it('has a melody, but leaves room to breathe', () => {
    for (const theme of THEMES) {
      const c = new Composer(theme, 11);
      let melody = 0;
      for (let bar = 0; bar < 64; bar++) melody += c.bar(bar).filter((n) => n.voice === 'pluck').length;
      expect(melody).toBeGreaterThan(64);
      expect(melody).toBeLessThan(64 * 6);
    }
  });

  it('keeps drums for tense music only', () => {
    for (const theme of THEMES) {
      const c = new Composer(theme, 5);
      const drums = Array.from({ length: 8 }, (_, i) => c.bar(i)).flat().some((n) => n.voice === 'kick');
      expect(drums).toBe(theme.mood === 'tense');
    }
  });

  it('maps degrees across octaves', () => {
    const t = THEMES[0];
    expect(degreeToMidi(t, 0)).toBe(t.root);
    expect(degreeToMidi(t, 7)).toBe(t.root + 12);
    expect(degreeToMidi(t, -7)).toBe(t.root - 12);
  });
});

describe('music settings', () => {
  it('falls back to defaults on missing or broken data', () => {
    expect(loadMusicSettings(null)).toEqual({ enabled: true, volume: 0.5 });
    expect(loadMusicSettings('{oops')).toEqual({ enabled: true, volume: 0.5 });
    expect(loadMusicSettings('{"enabled":false,"volume":3}')).toEqual({ enabled: false, volume: 1 });
  });
});
