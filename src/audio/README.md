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

Music is not part of this; plan is CC0 loops (e.g. Kenney, OpenGameArt with CC0 filter).
