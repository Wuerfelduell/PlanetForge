import { describe, expect, it } from "vitest";
import {
  advance,
  advanceWithEvents,
  applyCommand,
  BUILDINGS,
  buildBlocker,
  CORE,
  createGame,
  economyOfPlayer,
  flightPlan,
  homePlanet,
  planetById,
  TICK_MS,
  type BiomeId,
  type BuildingId,
  type Command,
  type GameEvent,
  type GameState,
  type PlanetState,
} from "./index";
import { coreHazard, coreOf, generateCore } from "./core";
import { createUnit } from "./units";

const P1 = { id: "p1", name: "Seb" };
const clone = (g: GameState) => JSON.parse(JSON.stringify(g)) as GameState;

/** A fresh coop game at level 9 with plenty in stock, `people` inhabitants and the first fields set. */
function world(biomes: BiomeId[], people = 10): GameState {
  const g = clone(createGame("core", [P1], { now: 0, invaders: "off", goal: "endless" }));
  const home = homePlanet(g, P1.id)!;
  biomes.forEach((biome, i) => {
    const s = home.segments[i]!;
    s.biome = biome;
    s.revealed = true;
    s.building = null;
    s.deposits = [];
  });
  const economy = economyOfPlayer(g, P1.id)!;
  economy.ascension.level = 10;
  for (const r of Object.keys(economy.resources) as (keyof typeof economy.resources)[]) economy.resources[r] = 500;
  economy.resources["deep-suit"] = 0;
  while (Object.keys(g.units).length < people) createUnit(g, P1.id, g.players[0]!.people, home.id);
  return g;
}

const home = (g: GameState) => homePlanet(g, P1.id)!;
const econ = (g: GameState) => economyOfPlayer(g, P1.id)!;
const core = (g: GameState) => coreOf(g, home(g))!;

function exec(g: GameState, cmd: Command): GameState {
  const r = applyCommand(g, P1.id, cmd, g.simTime);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

function build(g: GameState, planet: PlanetState, segment: number, building: BuildingId, workers = 0): GameState {
  g = exec(g, { type: "build", planetId: planet.id, segment, building });
  return workers ? exec(g, { type: "assign", planetId: planet.id, segment, delta: workers }) : g;
}

const run = (g: GameState, seconds: number) => advance(g, g.simTime + seconds * 1000 + TICK_MS / 2);

/** A world whose home planet is already drilled open, with a drill on field 0. */
function opened(people = 10): GameState {
  let g = world(["mountains", "savanna", "savanna"], people);
  g = build(g, home(g), 0, "core-drill");
  (g.cores ??= []).push(generateCore(g, home(g)));
  return g;
}

describe("planet interior", () => {
  it("a manned core drill with power breaks through and opens the interior", () => {
    let g = world(["mountains", "savanna", "savanna"]);
    g = build(g, home(g), 1, "power-fuelcell", 1);
    g = build(g, home(g), 0, "core-drill", 3);
    expect(g.cores).toBeUndefined();
    g = run(g, CORE.drillSeconds / 2);
    expect(home(g).drill).toBeGreaterThan(CORE.drillSeconds / 2 - 2);
    expect(g.cores).toBeUndefined();
    const { state, events } = advanceWithEvents(g, g.simTime + (CORE.drillSeconds / 2 + 2) * 1000);
    g = state;
    expect(events.some((e) => e.type === "coreOpened" && e.planetId === home(g).id)).toBe(true);
    expect(home(g).drill).toBeUndefined();
    const inside = core(g);
    expect(inside.segments).toHaveLength(CORE.segments);
    expect(inside.economyId).toBe(home(g).economyId);
    expect(planetById(g, inside.id)).toBe(inside);
    // Not on the star map: the planets list stays the same.
    expect(g.planets.some((p) => p.id === inside.id)).toBe(false);
    // Only rare ores down there, and the shaft lands on safe, known ground.
    expect(inside.segments[0]!.biome).not.toBe("magma-lake");
    expect(inside.segments[0]!.revealed).toBe(true);
    for (const s of inside.segments) for (const d of s.deposits) expect(["food", "wood", "stone", "sand", "clay", "water"]).not.toContain(d.resource);
  });

  it("the interior comes from its own seed stream: the same every time, nothing else changes", () => {
    const g = world(["mountains"]);
    expect(generateCore(g, home(g))).toEqual(generateCore(clone(g), home(clone(g))));
    const before = JSON.stringify(g.planets);
    generateCore(g, home(g));
    expect(JSON.stringify(g.planets)).toBe(before);
  });

  it("no core drill on asteroids, and none twice on a planet", () => {
    let g = world(["mountains", "mountains"]);
    g = build(g, home(g), 0, "core-drill");
    expect(buildBlocker(g, home(g), home(g).segments[1]!, "core-drill")).toBe("Nur eins pro Planet");
    const asteroid = clone(g);
    home(asteroid).type = "asteroid";
    home(asteroid).segments[0]!.building = null;
    expect(buildBlocker(asteroid, home(asteroid), home(asteroid).segments[0]!, "core-drill")).toBe("Asteroiden haben keinen Kern");
  });

  it("workers go down only with a deep suit each; the suits are kept, and they come back up idle", () => {
    let g = opened();
    const inside = core(g);
    inside.segments[0]!.biome = "crystal-grotto";
    inside.segments[0]!.deposits = [{ resource: "deep-quartz", amount: 10, max: 10, infinite: false, byHand: false }];
    g = build(g, inside, 0, "core-mine");
    const assign = (delta: number) => applyCommand(g, P1.id, { type: "assign", planetId: inside.id, segment: 0, delta }, g.simTime);
    expect(assign(1)).toMatchObject({ ok: false, error: expect.stringContaining("Tiefenanzüge") });
    econ(g).resources["deep-suit"] = 2;
    expect(assign(3)).toMatchObject({ ok: false });
    const r = assign(2);
    if (!r.ok) throw new Error(r.error);
    g = r.state;
    const down = Object.values(g.units).filter((u) => u.planetId === inside.id);
    expect(down).toHaveLength(2);
    expect(down.every((u) => u.segment === 0)).toBe(true);
    g = run(g, 60);
    // Worn, not used up (unless a quake struck).
    expect(econ(g).resources["deep-suit"] + Object.values(g.units).filter((u) => u.planetId === inside.id).length).toBeGreaterThanOrEqual(2);
    g = exec(g, { type: "assign", planetId: inside.id, segment: 0, delta: -Object.values(g.units).filter((u) => u.planetId === inside.id).length });
    expect(Object.values(g.units).some((u) => u.planetId === inside.id)).toBe(false);
    expect(Object.values(g.units).every((u) => u.planetId === home(g).id)).toBe(true);
  });

  it("the core mine digs the rare ores slowly, and they never grow back", () => {
    let g = opened();
    const inside = core(g);
    inside.segments[0]!.biome = "mushroom-forest";
    inside.segments[0]!.deposits = [{ resource: "ember-crystal", amount: 8, max: 8, infinite: false, byHand: false }];
    econ(g).resources["deep-suit"] = 3;
    const ember = econ(g).resources["ember-crystal"];
    g = build(g, inside, 0, "core-mine", 3);
    g = run(g, 20);
    const mined = econ(g).resources["ember-crystal"] - ember;
    expect(mined).toBeGreaterThan(0);
    expect(mined).toBeLessThan(BUILDINGS["core-mine"].extracts!.perWorker * 3 * 20 + 0.01);
    const left = core(g).segments[0]!.deposits[0]!.amount;
    g = exec(g, { type: "assign", planetId: core(g).id, segment: 0, delta: -Object.values(g.units).filter((u) => u.planetId === core(g).id).length });
    g = run(g, 120);
    expect(core(g).segments[0]!.deposits[0]!.amount).toBe(left);
  });

  it("without the drill on the surface, work inside stands still", () => {
    let g = opened();
    const inside = core(g);
    inside.segments[0]!.biome = "mushroom-forest";
    inside.segments[0]!.deposits = [{ resource: "ember-crystal", amount: 8, max: 8, infinite: false, byHand: false }];
    econ(g).resources["deep-suit"] = 3;
    g = build(g, inside, 0, "core-mine", 3);
    g = exec(g, { type: "demolish", planetId: home(g).id, segment: 0 });
    const ember = econ(g).resources["ember-crystal"];
    g = run(g, 20);
    expect(econ(g).resources["ember-crystal"]).toBe(ember);
    expect(applyCommand(g, P1.id, { type: "assign", planetId: core(g).id, segment: 0, delta: 1 }, g.simTime)).toMatchObject({ ok: false });
  });

  it("a geothermal plant inside powers the surface too", () => {
    let g = opened();
    const inside = core(g);
    inside.segments[0]!.biome = "magma-lake";
    econ(g).resources["deep-suit"] = 1;
    g = build(g, inside, 0, "power-geothermal", 1);
    g = build(g, home(g), 1, "lab", 0);
    g = run(g, 1);
    expect(home(g).power?.supply).toBe(12);
    expect(core(g).power?.supply).toBe(12);
  });

  it("quakes kill workers down there, suits and all; pillars halve the danger", () => {
    let g = opened(14);
    const inside = core(g);
    for (const i of [0, 1, 2]) {
      inside.segments[i]!.biome = "magma-lake";
      inside.segments[i]!.revealed = true;
      inside.segments[i]!.deposits = [{ resource: "core-iron", amount: 500, max: 500, infinite: false, byHand: false }];
    }
    econ(g).resources["deep-suit"] = 9;
    for (const i of [0, 1, 2]) g = build(g, core(g), i, "core-mine", 3);
    const events: GameEvent[] = [];
    for (let i = 0; i < 40 && !events.some((e) => e.type === "quake" || (e.type === "eruption" && e.killed)); i++) {
      const r = advanceWithEvents(g, g.simTime + g.settings.cycleSeconds * 1000);
      g = r.state;
      events.push(...r.events);
    }
    const deaths = events.reduce((n, e) => n + (e.type === "quake" || e.type === "eruption" ? e.killed : 0), 0);
    expect(deaths).toBeGreaterThan(0);
    expect(econ(g).resources["deep-suit"]).toBe(9 - deaths);
    expect(Object.keys(g.units)).toHaveLength(14 - deaths);

    const lake = core(g).segments[1]!;
    const plain = coreHazard(core(g), lake);
    core(g).segments[2]!.building = "support-pillar";
    const propped = coreHazard(core(g), lake);
    expect(propped.quake).toBeCloseTo(plain.quake * CORE.pillarMul);
    expect(propped.eruption).toBeCloseTo(plain.eruption * CORE.pillarMul);
  });

  it("a magma burst knocks a building down a stage, or wrecks it", () => {
    let g = opened();
    const inside = core(g);
    inside.segments[0]!.biome = "magma-lake";
    g = build(g, inside, 0, "support-pillar");
    let wrecked = false;
    for (let i = 0; i < 400 && !wrecked; i++) {
      const r = advanceWithEvents(g, g.simTime + g.settings.cycleSeconds * 1000);
      g = r.state;
      wrecked = r.events.some((e) => e.type === "eruption" && e.wrecked);
    }
    expect(wrecked).toBe(true);
    expect(core(g).segments[0]!.building).toBeNull();
    expect(core(g).segments[0]!.ruin).toBe(true);
  });

  it("interior workers sleep upstairs: they count for housing, food and ascension", () => {
    let g = opened();
    const inside = core(g);
    inside.segments[0]!.biome = "crystal-grotto";
    inside.segments[0]!.deposits = [{ resource: "deep-quartz", amount: 10, max: 10, infinite: false, byHand: false }];
    econ(g).resources["deep-suit"] = 3;
    const points = (state: GameState) => {
      const before = econ(state).ascension.points;
      return econ(run(state, state.settings.cycleSeconds)).ascension.points - before;
    };
    const up = points(g);
    g = build(g, inside, 0, "core-mine", 3);
    expect(points(g)).toBeCloseTo(up, 5);
  });

  it("warp ships from a planet with a warp core are twice as fast", () => {
    const g = world(["savanna"]);
    const other = { ...home(g), id: "x", system: 1 } as PlanetState;
    const slow = flightPlan(home(g), other, "warp", 1).seconds;
    home(g).segments[0]!.building = "warp-core";
    expect(flightPlan(home(g), other, "warp", 1).seconds).toBe(slow * CORE.warpCoreMul);
  });
});
