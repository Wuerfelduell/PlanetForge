import { describe, expect, it } from "vitest";
import { advanceWithEvents, BIOMES, BUILDINGS, createGame, homePlanet, housing, needsSuits, settlersOutside, RECIPES, RULES, TICK_MS, ticksPerCycle, type GameEvent, type GameState } from "./index";

const P1 = { id: "p1", name: "Seb" };
const clone = (g: GameState) => JSON.parse(JSON.stringify(g)) as GameState;

function run(g: GameState, cycles: number, events: GameEvent[] = []): GameState {
  for (let i = 0; i < cycles; i++) {
    const r = advanceWithEvents(g, g.simTime + ticksPerCycle(g) * TICK_MS);
    events.push(...r.events);
    g = r.state;
  }
  return g;
}

/** A coop game with 4 settlers on a free lava planet. */
function colony(suits: number): { g: GameState; planetId: string } {
  const g = clone(createGame("suits", [P1], { now: 0, invaders: "off", goal: "endless" }));
  const planet = g.planets.find((p) => p.startSlot === null && p.type !== "asteroid")!;
  planet.type = "lava";
  planet.economyId = "e0";
  const first = Object.values(g.units)[0]!;
  for (let i = 0; i < 4; i++) g.units[`s${i}`] = { ...first, id: `s${i}`, planetId: planet.id, segment: null };
  g.economies.e0!.resources.food = 1000;
  g.economies.e0!.resources.suits = suits;
  return { g, planetId: planet.id };
}

describe("space suits", () => {
  it("only airless planets that are not start planets need them", () => {
    const { g, planetId } = colony(0);
    expect(needsSuits(g.planets.find((p) => p.id === planetId)!)).toBe(true);
    const home = homePlanet(g, P1.id)!;
    expect(needsSuits(home)).toBe(false);
    expect(needsSuits({ ...home, type: "lava" })).toBe(false);
    expect(needsSuits({ ...home, startSlot: null, type: "arid" })).toBe(false);
  });

  it("settlers wear them out every cycle", () => {
    let { g, planetId } = colony(10);
    g = run(g, 2);
    expect(g.economies.e0!.resources.suits).toBeCloseTo(10 - 2 * 4 * RULES.suits.perInhabitantPerCycle);
    expect(Object.values(g.units).filter((u) => u.planetId === planetId)).toHaveLength(4);
  });

  it("without suits one settler dies per cycle until the colony is gone", () => {
    const events: GameEvent[] = [];
    let { g, planetId } = colony(0);
    g.planets.find((p) => p.id === planetId)!.birthProgress = -1e9;
    g = run(g, 2, events);
    expect(Object.values(g.units).filter((u) => u.planetId === planetId)).toHaveLength(2);
    expect(events.filter((e) => e.type === "suffocated")).toHaveLength(2);
    g = run(g, 3, events);
    expect(Object.values(g.units).filter((u) => u.planetId === planetId)).toHaveLength(0);
    // The home planet breathes freely.
    expect(Object.values(g.units).filter((u) => u.planetId === homePlanet(g, P1.id)!.id).length).toBeGreaterThan(0);
  });

  it("idle settlers inside the houses need none, workers outside do", () => {
    let { g, planetId } = colony(0);
    const planet = g.planets.find((p) => p.id === planetId)!;
    planet.birthProgress = -1e9;
    const land = planet.segments.filter((s) => BIOMES[s.biome].buildable);
    for (const i of [0, 2, 3]) land[i]!.building = "housing";
    expect(housing(g, planet) - RULES.baseHousing).toBeGreaterThanOrEqual(4);
    expect(settlersOutside(g, planet)).toHaveLength(0);
    g = run(g, 3);
    expect(Object.values(g.units).filter((u) => u.planetId === planetId)).toHaveLength(4);
    // Sent to work outside, a settler needs a suit again.
    g.units.s0!.segment = land[1]!.index;
    expect(settlersOutside(g, g.planets.find((p) => p.id === planetId)!).map((u) => u.id)).toEqual(["s0"]);
    g = run(g, 1);
    expect(g.units.s0).toBeUndefined();
    expect(Object.values(g.units).filter((u) => u.planetId === planetId)).toHaveLength(3);
  });

  it("are cheap: cloth and iron, sewn in the plain workshop", () => {
    // Seb: almost every planet but the start needs them, so they must not wait for level 5.
    expect(RECIPES.suits.inputs).toEqual({ cloth: 2, iron: 1 });
    expect(BUILDINGS.workshop.crafts?.recipes).toContain("suits");
  });
});
