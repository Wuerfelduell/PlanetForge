// Measures the hot paths of a late game (npm run perf). Numbers are per call on this machine; phones are a few times slower.
import { advance, advanceWithEvents, applyCommand, cloneState, type GameState } from "../../src/sim/index";
import { pack, unpack } from "../../src/net/pack";
import { stressState } from "./stress";

function time(label: string, runs: number, fn: () => unknown): number {
  fn();
  const t0 = performance.now();
  for (let i = 0; i < runs; i++) fn();
  const ms = (performance.now() - t0) / runs;
  console.log(`${label.padEnd(34)} ${ms.toFixed(2)} ms`);
  return ms;
}

let g: GameState = stressState();
g = advance(g, 10 * 60_000); // settle: ten minutes of play
const json = JSON.stringify(g);
const packed = await pack(g);
console.log(`planets ${g.planets.length} + cores ${g.cores?.length ?? 0}, units ${Object.keys(g.units).length}, log ${g.log.length}`);
console.log(`state JSON ${(json.length / 1024).toFixed(0)} KB, packed ${(packed.length / 1024).toFixed(0)} KB`);
const parts: Record<string, number> = {};
for (const [k, v] of Object.entries(g)) parts[k] = JSON.stringify(v).length;
console.log(Object.entries(parts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${(v / 1024).toFixed(0)} KB`).join(", "));

time("cloneState", 50, () => cloneState(g));
time("advance 1 tick (100 ms)", 50, () => advance(g, g.simTime + 100));
time("advance 10 s (100 ticks)", 5, () => advance(g, g.simTime + 10_000));
time("advance 60 s (600 ticks)", 2, () => advance(g, g.simTime + 60_000));
const planet = g.planets.find((p) => p.economyId === g.players[0]!.economyId)!;
time("applyCommand (rename)", 50, () => applyCommand(g, "p1", { type: "renamePlanet", planetId: planet.id, name: "Bench" }, g.simTime));
time("30 commands batch", 3, () => {
  let s = g;
  for (let i = 0; i < 30; i++) {
    const r = applyCommand(s, "p1", { type: "renamePlanet", planetId: planet.id, name: `B${i}` }, s.simTime);
    if (r.ok) s = r.state;
  }
});
time("client frame w/ tick (advanceWithEvents)", 50, () => advanceWithEvents(g, g.simTime + 100));
const tPack = performance.now();
for (let i = 0; i < 10; i++) await pack(g);
console.log(`${"pack".padEnd(34)} ${((performance.now() - tPack) / 10).toFixed(2)} ms`);
const tUnpack = performance.now();
for (let i = 0; i < 10; i++) await unpack(packed);
console.log(`${"unpack".padEnd(34)} ${((performance.now() - tUnpack) / 10).toFixed(2)} ms`);
time("JSON.stringify (reply)", 20, () => JSON.stringify({ ok: true, state: g }));
