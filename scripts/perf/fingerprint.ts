// Prints a hash of late-game states after a few minutes of play, to check that a speed-up
// changes nothing in the simulation (npm run perf:fingerprint): run before and after, the lines must be identical.
import { createHash } from "node:crypto";
import { advance, applyCommand, createGame, type GameState } from "../../src/sim/index";
import { stressState } from "./stress";

const hash = (g: GameState) => createHash("sha256").update(JSON.stringify(g)).digest("hex").slice(0, 16);
let g = stressState();
for (let m = 1; m <= 15; m++) {
  g = advance(g, m * 60_000);
  console.log(`stress ${m} min ${hash(g)}`);
}
for (const seed of ["a", "b", "c"]) {
  let s = createGame(seed, [{ id: "p1", name: "A" }, { id: "p2", name: "B" }], { now: 0, factions: 2 });
  for (let t = 5; t <= 40 * 60; t += 5) {
    s = advance(s, t * 1000);
    const home = s.planets.find((p) => p.economyId === s.players[0]!.economyId)!;
    const idle = Object.values(s.units).find((u) => u.segment === null && u.planetId === home.id);
    const seg = home.segments.find((x) => x.revealed && x.deposits.some((d) => d.byHand && d.amount > 0));
    if (idle && seg) {
      const r = applyCommand(s, idle.owner, { type: "assignUnit", unitId: idle.id, segment: seg.index }, s.simTime);
      if (r.ok) s = r.state;
    }
  }
  console.log(`game ${seed} ${hash(s)} units ${Object.keys(s.units).length}`);
}
