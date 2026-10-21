import { describe, expect, it } from "vitest";
import {
  advance,
  applyCommand,
  buildBlocker,
  BUILDING_CATEGORY_IDS,
  BUILDING_IDS,
  BUILDINGS,
  buildingStats,
  createGame,
  economyOfPlayer,
  homePlanet,
  housing,
  powerFactor,
  RECIPES,
  RULES,
  TICK_MS,
  type BiomeId,
  type BuildingId,
  type Command,
  type GameState,
  type SegmentState,
} from "./index";

const P1 = { id: "p1", name: "Seb" };
const clone = (g: GameState) => JSON.parse(JSON.stringify(g)) as GameState;

/** A fresh coop game with a hand-made strip of segments 0..n and plenty in stock. */
function world(biomes: BiomeId[], level = 9): GameState {
  const g = clone(createGame("buildings", [P1], { now: 0, invaders: "off", goal: "endless" }));
  const home = homePlanet(g, P1.id)!;
  biomes.forEach((biome, i) => {
    const s = home.segments[i]!;
    s.biome = biome;
    s.revealed = true;
    s.building = null;
    s.deposits = [];
  });
  home.segments.at(-1)!.biome = "savanna";
  home.segments[biomes.length]!.biome = "savanna";
  const economy = economyOfPlayer(g, P1.id)!;
  economy.ascension.level = level;
  for (const r of Object.keys(economy.resources) as (keyof typeof economy.resources)[]) economy.resources[r] = 500;
  return g;
}

const seg = (g: GameState, i: number): SegmentState => homePlanet(g, P1.id)!.segments[i]!;
const econ = (g: GameState) => economyOfPlayer(g, P1.id)!;

function exec(g: GameState, cmd: Command): GameState {
  const r = applyCommand(g, P1.id, cmd, g.simTime);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

function build(g: GameState, segment: number, building: BuildingId, workers = 0): GameState {
  const planetId = homePlanet(g, P1.id)!.id;
  g = exec(g, { type: "build", planetId, segment, building });
  return workers ? exec(g, { type: "assign", planetId, segment, delta: workers }) : g;
}

const run = (g: GameState, seconds: number) => advance(g, g.simTime + seconds * 1000 + TICK_MS / 2);

describe("building catalog", () => {
  it("every building sits in a build menu tab and every recipe exists", () => {
    for (const b of BUILDING_IDS) {
      expect(BUILDING_CATEGORY_IDS).toContain(BUILDINGS[b].category);
      for (const r of BUILDINGS[b].crafts?.recipes ?? []) expect(RECIPES[r]).toBeDefined();
      for (const u of BUILDINGS[b].upgrades ?? []) for (const r of u.crafts?.recipes ?? []) expect(RECIPES[r]).toBeDefined();
    }
    for (const c of BUILDING_CATEGORY_IDS) expect(BUILDING_IDS.some((b) => BUILDINGS[b].category === c)).toBe(true);
  });

  it("housing grows from hut to tower, with the stage's name", () => {
    const names = [BUILDINGS.housing.name, ...BUILDINGS.housing.upgrades!.map((u) => u.name)];
    expect(names).toEqual(["Hütte", "Holzhaus", "Steinhaus", "Wohnturm"]);
    let g = world(["savanna"]);
    g = build(g, 0, "housing");
    const planetId = homePlanet(g, P1.id)!.id;
    for (let i = 0; i < 3; i++) g = exec(g, { type: "upgrade", planetId, segment: 0 });
    expect(buildingStats(seg(g, 0))!.name).toBe("Wohnturm");
    expect(buildingStats(seg(g, 0))!.housing).toBe(12);
  });
});

describe("power grid", () => {
  it("a tower without power houses only a quarter, a windmill lights it up", () => {
    let g = world(["savanna", "savanna", "savanna"]);
    const planetId = homePlanet(g, P1.id)!.id;
    g = build(g, 0, "housing");
    for (let i = 0; i < 3; i++) g = exec(g, { type: "upgrade", planetId, segment: 0 });
    g = run(g, 1);
    expect(homePlanet(g, P1.id)!.power).toEqual({ supply: 0, demand: 1 });
    expect(powerFactor(homePlanet(g, P1.id)!, seg(g, 0))).toBe(RULES.energy.unpoweredMul);
    expect(housing(g, homePlanet(g, P1.id)!)).toBe(RULES.baseHousing + 3);

    g = build(g, 2, "power-wind");
    g = run(g, 1);
    expect(homePlanet(g, P1.id)!.power).toEqual({ supply: 2, demand: 1 });
    expect(housing(g, homePlanet(g, P1.id)!)).toBe(RULES.baseHousing + 12);
  });

  it("windmills shade each other", () => {
    let g = world(["savanna", "savanna"]);
    g = build(g, 0, "power-wind");
    g = build(g, 1, "power-wind");
    g = run(g, 1);
    expect(homePlanet(g, P1.id)!.power!.supply).toBeCloseTo(2 * 2 * 0.6, 5);
  });

  it("a coal plant needs its worker and burns coal; without coal it goes dark", () => {
    let g = world(["savanna", "savanna"]);
    g = build(g, 0, "power-coal");
    g = run(g, 1);
    expect(homePlanet(g, P1.id)!.power).toBeUndefined();
    const planetId = homePlanet(g, P1.id)!.id;
    g = exec(g, { type: "assign", planetId, segment: 0, delta: 1 });
    const coal = econ(g).resources.coal;
    g = run(g, 10);
    expect(homePlanet(g, P1.id)!.power!.supply).toBe(6);
    expect(econ(g).resources.coal).toBeCloseTo(coal - 1, 1);

    g = clone(g);
    econ(g).resources.coal = 0;
    g = run(g, 1);
    expect(homePlanet(g, P1.id)!.power?.supply ?? 0).toBe(0);
  });

  it("a greenhouse turns water into food, slowly without power", () => {
    let g = world(["desert", "savanna"]);
    g = build(g, 0, "hydro-farm", 2);
    const food = econ(g).resources.food;
    g = run(g, 10);
    // 2 workers / 5 s per craft × 2 food × 0.25 (no power).
    expect(econ(g).resources.food - food).toBeCloseTo(10 * (2 / 5) * 2 * RULES.energy.unpoweredMul, 0);
  });
});

describe("new buildings", () => {
  it("a fishery needs the sea next to it", () => {
    const g = world(["savanna", "ocean"]);
    const home = homePlanet(g, P1.id)!;
    expect(buildBlocker(g, home, seg(g, 0), "fishery")).toBeNull();
    home.segments[1]!.biome = "savanna";
    expect(buildBlocker(g, home, seg(g, 0), "fishery")).toBe("Muss neben Meer stehen");
  });

  it("only one monument per planet, and it adds ascension points every cycle", () => {
    let g = world(["savanna", "savanna"]);
    g = build(g, 0, "monument");
    expect(buildBlocker(g, homePlanet(g, P1.id)!, seg(g, 1), "monument")).toBe("Nur eins pro Planet");
    const points = econ(g).ascension.points;
    g = run(g, RULES.defaultCycleSeconds);
    // People earn one point each, the monument ten more.
    expect(econ(g).ascension.points - points).toBe(RULES.startPopulation + 10);
  });

  it("a library speeds up the lab next to it", () => {
    let g = world(["savanna", "savanna"]);
    g = build(g, 0, "lab", 2);
    let science = econ(g).resources.science;
    let without = run(g, 10);
    const base = econ(without).resources.science - science;
    g = build(g, 1, "library");
    science = econ(g).resources.science;
    without = run(g, 10);
    expect(econ(without).resources.science - science).toBeCloseTo(base * 1.2, 3);
  });

  it("leftover food becomes biogas, and the gas plant burns it for power", () => {
    let g = world(["savanna", "savanna", "savanna"]);
    g = build(g, 0, "biogas-plant", 1);
    g = build(g, 2, "power-gas", 1);
    const biogas = econ(g).resources.biogas;
    g = run(g, 6);
    // 1 worker × 1.0 / 6 s per craft makes 1 biogas; the plant burns 0.08/s.
    expect(econ(g).resources.biogas).toBeCloseTo(biogas + 1 - 6 * 0.08, 1);
    expect(homePlanet(g, P1.id)!.power!.supply).toBe(5);
  });

  it("oil becomes plastic, plastic electronics, and the chip factory makes computers", () => {
    let g = world(["savanna", "savanna", "savanna", "savanna"]);
    const planetId = homePlanet(g, P1.id)!.id;
    g = build(g, 0, "plastics", 1);
    g = build(g, 3, "electronics", 1);
    g = exec(g, { type: "upgrade", planetId, segment: 3 });
    g = exec(g, { type: "setGather", planetId, segment: 3, resource: "computer" });
    const before = { plastic: econ(g).resources.plastic, computer: econ(g).resources.computer };
    g = run(g, 30);
    expect(econ(g).resources.plastic).toBeGreaterThan(before.plastic);
    expect(econ(g).resources.computer).toBeGreaterThan(before.computer);
  });
});
