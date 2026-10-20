// Renders every sound effect in Node and checks it is sane (no NaN, no clipping, short).
// Usage: npx tsx scripts/audio/check-sfx.ts [--wav out/dir]  (--wav also writes WAV files to listen to)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SOUNDS } from '../../src/audio/sounds';
import { encodeWav, renderSound, soundDuration } from '../../src/audio/synth';

const MAX_SECONDS = 2.5;
const wavIdx = process.argv.indexOf('--wav');
const wavDir = wavIdx > 0 ? process.argv[wavIdx + 1] : null;
if (wavDir) mkdirSync(wavDir, { recursive: true });

let failed = 0;
for (const [id, def] of Object.entries(SOUNDS)) {
  const samples = renderSound(def);
  let peak = 0;
  let bad = false;
  for (const s of samples) {
    if (!Number.isFinite(s)) bad = true;
    peak = Math.max(peak, Math.abs(s));
  }
  const dur = soundDuration(def);
  const problems = [
    bad && 'non-finite samples',
    peak > 1 && `clipping (peak ${peak.toFixed(2)})`,
    peak < 0.05 && 'silent',
    dur > MAX_SECONDS && `too long (${dur.toFixed(2)} s)`,
  ].filter(Boolean);
  if (problems.length) failed++;
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${id.padEnd(20)} ${dur.toFixed(2)} s  peak ${peak.toFixed(2)}  ${problems.join(', ')}`);
  if (wavDir) writeFileSync(join(wavDir, `${id}.wav`), encodeWav(samples));
}
console.log(`${Object.keys(SOUNDS).length} sounds, ${failed} failed`);
process.exit(failed ? 1 : 0);
