import { describe, expect, it } from "vitest";
import {
  advance,
  applyCommand,
  BIOMES,
  buildBlocker,
  createGame,
  economyOfPlayer,
  homePlanet,
  housing,
  idleUnits,
  population,
  workerCapacity,
  workersOn,
  type GameState,
} from "./index";

const P1 = { id: "p1", name: "Seb" };

/**
 * The playtest's "naive" player (2026-10-21): only huts and farms, everyone else gathers by hand.
 * It reached level 10 after 37 minutes, faster than a player who builds the whole chain.
 */
function naiveLevels(seed: string, minutes: number): number[] {
  let g: GameState = createGame(seed, [P1], { now: 0, invaders: "off", goal: "endless" });
  const levelAt: number[] = [];
  const act = (cmd: Parameters<typeof applyCommand>[2]) => {
    const r = applyCommand(g, P1.id, cmd, g.simTime);
    if (r.ok) g = r.state;
    return r.ok;
  };
  for (let s = 5; s <= minutes * 60; s += 5) {
    g = advance(g, s * 1000);
    const planet = homePlanet(g, P1.id)!;
    const economy = economyOfPlayer(g, P1.id)!;
    const pop = population(g, planet);
    const land = planet.segments.filter((x) => x.revealed && !x.building && BIOMES[x.biome].buildable);
    // Keep two forests for wood, build anywhere else.
    const forests = land.filter((x) => x.biome === "forest");
    const free = [...land.filter((x) => x.biome !== "forest"), ...forests.slice(2)];
    const farms = planet.segments.filter((x) => x.building === "farm").length;
    const want = farms * 6 < pop ? "farm" : pop >= housing(g, planet) - 1 ? "housing" : null;
    const spot = want && free.find((x) => !buildBlocker(g, planet, x, want));
    if (want && spot) act({ type: "build", planetId: planet.id, segment: spot.index, building: want });

    const food = economy.resources.food < 20 + 3 * pop;
    // Re-plan every step: half the people (at least the farm crew) on food, the rest on wood.
    for (const u of Object.values(g.units)) if (u.segment !== null) act({ type: "assignUnit", unitId: u.id, segment: null });
    let onFood = 0;
    for (let i = idleUnits(g, planet).length; i > 0; i--) {
      const wantFood = food ? true : onFood < Math.ceil(pop / 2);
      const p = homePlanet(g, P1.id)!;
      const targets = p.segments.filter((x) => x.revealed && workersOn(g, p, x.index).length < workerCapacity(x));
      const pick = (r: string) =>
        targets.find((x) => x.building === "farm" && r === "food") ??
        targets.find((x) => !x.building && x.deposits.some((d) => d.resource === r && d.byHand && (d.infinite || d.amount > 0)));
      const first = wantFood ? "food" : "wood";
      const t = pick(first) ?? pick(wantFood ? "wood" : "food");
      if (!t) break;
      const r = t.building ? "food" : t.deposits.some((d) => d.resource === first && d.byHand && (d.infinite || d.amount > 0)) ? first : wantFood ? "wood" : "food";
      if (r === "food") onFood++;
      if (!t.building) act({ type: "setGather", planetId: p.id, segment: t.index, resource: r });
      if (!act({ type: "assign", planetId: p.id, segment: t.index, delta: 1 })) break;
    }
    if (s % 60 === 0) levelAt.push(economy.ascension.level);
  }
  return levelAt;
}

describe("pacing in the simulation", () => {
  it("hut spam is no shortcut: the naive player stays near the design pace", { timeout: 60_000 }, () => {
    for (const seed of ["alpha", "hotel"]) {
      const levels = naiveLevels(seed, 60);
      // levels[m - 1] = level after m minutes. Design pace (docs/balancing.md): L5 at 38, L6 at 55 min.
      expect(levels[39], `${seed} at minute 40`).toBeLessThanOrEqual(5);
      expect(levels[59], `${seed} at minute 60`).toBeLessThanOrEqual(6);
      // Still a game: even without any production chain the people keep growing.
      expect(levels[59], `${seed} at minute 60`).toBeGreaterThanOrEqual(4);
    }
  });
});
