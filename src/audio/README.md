# Audio

All sound effects are synthesized in code; there are no audio files.

- `synth.ts` renders a `SoundDef` (layers of sine/triangle/square/saw/noise with pitch slide, arpeggio, vibrato, envelope, low-pass) to samples. Pure TS, also runs in Node.
- `sounds.ts` defines every effect by id (`ui.tap`, `build.complete`, `rocket.launch`, `coop.ping`, …).
- `sfx.ts` plays them via Web Audio and caches the rendered buffers.

```ts
import { sfx } from './audio/sfx';

// In the first tap/click handler (browsers, iOS especially, block audio before a gesture):
sfx.unlock();
sfx.preload(); // optional, renders everything up front

sfx.play('build.complete');
sfx.play('resource.collect', { volume: 0.5, semitones: 2 });
sfx.setVolume(0.6);
sfx.setMuted(true);
```

Repeated plays of the same id within 40 ms are skipped, and sounds with `variation` get a random pitch so they don't get tiring.

**Tuning:** open `/sfx-preview.html` in the Vite dev server, tap a sound, edit its values in the text box, play the edited version, then copy it into `sounds.ts`.

**Check:** `npx tsx scripts/audio/check-sfx.ts` renders every sound and fails on NaN, clipping, silence or > 2.5 s. Add `--wav <dir>` to export WAV files for listening.

## Music

Background music is generated in code too, so there are no music files and no license questions.

- `composer.ts` writes the notes bar by bar: pad chords, bass, a melody that random-walks on the scale and lands on chord tones, rare bells. Four themes: `drift`, `dawn`, `orbit` (calm, rotate every 24 bars, ~1.5 min) and `siege` (tense, faster, with drums). Pure TS and seeded, tested in `composer.test.ts`.
- `music.ts` plays them live through Web Audio (lookahead scheduler, soft echo, crossfade between themes). Pauses and suspends the AudioContext while the tab is hidden. Settings (on/off, volume) are stored in `localStorage` under `planetforge.music`.
- `musicControl.ts` is the 🎵 button above the panel (popover with on/off and volume) and starts the music on the first tap or key press.

```ts
import { music } from './audio/music';

music.unlock();      // from a user gesture
music.alert();       // tense music for 45 s, e.g. on a battle (main.ts does this) or later an invasion
music.setMood('calm');
music.setEnabled(false);
music.setVolume(0.4);
```

To add a theme, append to `THEMES` in `composer.ts` (root, 7-note scale, chord progression as scale degrees, bpm, melody density).
