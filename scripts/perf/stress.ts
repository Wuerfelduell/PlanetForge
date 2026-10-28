// A late-game coop state for performance measurements (not a real save): 3 players, 16 planets,
// the warp systems, interiors, every field built up and a few hundred workers.
import { BUILDING_IDS, BUILDINGS, createGame, type GameState } from "../../src/sim/index";
import { discoverSystems } from "../../src/sim/galaxy";
import { generateCore } from "../../src/sim/core";
import { createUnit } from "../../src/sim/units";
import { Rng } from "../../src/sim/rng";

export function stressState(units = 450): GameState {
  const players = [
    { id: "p1", name: "Seb" },
    { id: "p2", name: "Zwei" },
    { id: "p3", name: "Drei" },
  ];
  const g = createGame("perf-stress", players, { now: 0, invaders: "normal", factions: 3, world: { planets: 16, size: "large" } });
  discoverSystems(g, []);
  const rng = new Rng(42);
  const team = g.players[0]!.economyId;
  const eco = g.economies[team]!;
  for (const r of Object.keys(eco.resources)) eco.resources[r as keyof typeof eco.resources] = 5000;
  eco.ascension.level = 12;
  const ours = g.planets.filter((p) => p.economyId === null || p.economyId === team).slice(0, 20);
  for (const p of ours) p.economyId = team;
  g.cores = ours.slice(0, 6).map((p) => generateCore(g, p));
  const fields = [...ours, ...g.cores];
  for (const p of fields) {
    for (const s of p.segments) {
      s.revealed = true;
      if (rng.next() < 0.75) {
        s.building = BUILDING_IDS[rng.int(0, BUILDING_IDS.length - 1)]!;
        s.builtBy = "p1";
        if (BUILDINGS[s.building].upgrades?.length && rng.next() < 0.5) s.tier = 2;
      }
    }
  }
  for (let i = 0; i < units; i++) {
    const p = fields[rng.int(0, fields.length - 1)]!;
    const owner = players[i % 3]!.id;
    const id = createUnit(g, owner, g.players[i % 3]!.people, p.id);
    if (rng.next() < 0.8) g.units[id]!.segment = rng.int(0, p.segments.length - 1);
  }
  return g;
}
