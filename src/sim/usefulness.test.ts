import { describe, expect, it } from "vitest";
import {
  advance,
  applyCommand,
  BUILDINGS,
  createGame,
  economyOfPlayer,
  homePlanet,
  RECIPES,
  RESOURCE_IDS,
  ROCKETS,
  SUPERNOVA,
  TICK_MS,
  type BiomeId,
  type BuildingId,
  type Command,
  type GameState,
  type ResourceId,
  type SegmentState,
} from "./index";

// Seb 2026-10-28 (online coop, level 14): copper, plastic, titanium, silver, gold and biogas
// piled up unused, iron ran short. These tests keep every resource worth something.

const P1 = { id: "p1", name: "Seb" };
const clone = (g: GameState) => JSON.parse(JSON.stringify(g)) as GameState;

function world(biomes: BiomeId[], level = 6): GameState {
  const g = clone(createGame("useful", [P1], { now: 0, invaders: "off", goal: "endless" }));
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
  for (const r of Object.keys(economy.resources) as ResourceId[]) economy.resources[r] = 500;
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

const recipe = (g: GameState, segment: number, resource: string) =>
  exec(g, { type: "setGather", planetId: homePlanet(g, P1.id)!.id, segment, resource: resource as ResourceId });

const run = (g: GameState, seconds: number) => advance(g, g.simTime + seconds * 1000 + TICK_MS / 2);

describe("every resource has a use", () => {
  it("each resource is spent somewhere, most of them in two or more places", () => {
    const uses = new Map<ResourceId, number>();
    const add = (cost: Partial<Record<ResourceId, number>>) => {
      for (const r of Object.keys(cost) as ResourceId[]) uses.set(r, (uses.get(r) ?? 0) + 1);
    };
    for (const b of Object.values(BUILDINGS)) {
      add(b.cost);
      for (const u of b.upgrades ?? []) add(u.cost);
      if (b.burns) add({ [b.burns.resource]: 1 });
      if (b.ammo) add({ [b.ammo.resource]: 1 });
    }
    for (const r of Object.values(RECIPES)) add(r.inputs);
    for (const r of Object.values(ROCKETS)) add({ ...r.cost, [r.fuel.resource]: 1 });
    add(SUPERNOVA.segmentCost);
    // Spent outside these tables: food (upkeep), science (discoveries), suits (breathing).
    const elsewhere = new Set<ResourceId>(["food", "science", "suits"]);
    const single = RESOURCE_IDS.filter((r) => !elsewhere.has(r) && (uses.get(r) ?? 0) < 2);
    // Raw goods with exactly one recipe that turns them into something widely used, and platinum.
    expect(single).toEqual(["sand", "fiber", "tin", "bauxite", "ilmenite", "platinum"]);
  });

  it("a treasury turns gold, silver and ätherite into ascension points", () => {
    let g = world(["savanna"]);
    g = build(g, 0, "treasury", 1);
    g = recipe(g, 0, "tribute-gold");
    const gold = econ(g).resources.gold;
    const points = econ(g).ascension.points;
    g = run(g, 10);
    expect(gold - econ(g).resources.gold).toBeCloseTo(1, 1);
    expect(econ(g).ascension.points - points).toBeGreaterThanOrEqual(4 - 1e-6);
  });

  it("bronze makes tools with less iron", () => {
    let g = world(["savanna"]);
    g = build(g, 0, "workshop", 2);
    g = recipe(g, 0, "bronze-tools");
    const iron = econ(g).resources.iron;
    const tools = econ(g).resources.tools;
    g = run(g, 10);
    expect(econ(g).resources.iron).toBe(iron);
    expect(econ(g).resources.tools - tools).toBeGreaterThan(5);
  });

  it("bioplastic comes from biogas, without oil", () => {
    let g = world(["savanna"]);
    g = build(g, 0, "plastics", 2);
    g = recipe(g, 0, "bioplastic");
    const oil = econ(g).resources.oil;
    const plastic = econ(g).resources.plastic;
    g = run(g, 10);
    expect(econ(g).resources.oil).toBe(oil);
    expect(econ(g).resources.plastic).toBeGreaterThan(plastic);
  });

  it("upgraded workshops, mines, sawmills and labs draw power", () => {
    for (const b of ["workshop", "mine", "sawmill", "lab"] as const) {
      expect(BUILDINGS[b].upgrades![0]!.energy, b).toBe(-1);
      expect(BUILDINGS[b].upgrades![0]!.cost.wire, b).toBeGreaterThan(0);
    }
    let g = world(["savanna"]);
    g = build(g, 0, "workshop", 2);
    g = exec(g, { type: "upgrade", planetId: homePlanet(g, P1.id)!.id, segment: 0 });
    g = run(g, 1);
    expect(seg(g, 0).tier).toBe(2);
    expect(homePlanet(g, P1.id)!.power?.demand).toBe(1);
  });

  it("a farm at stage 3 makes more food with the same crew, for power", () => {
    const [t2, t3] = BUILDINGS.farm.upgrades!;
    expect(t3!.workers).toBe(t2!.workers);
    expect(t3!.produces!.perWorker).toBeGreaterThan(BUILDINGS.farm.produces!.perWorker);
    expect(t3!.energy).toBe(-1);
  });

  it("dry start planets hold more oil than temperate ones", () => {
    const oil = (start: "arid" | "temperate") => {
      const g = createGame("oily", [P1], { now: 0, world: { start } });
      return homePlanet(g, P1.id)!.segments.filter((s) => s.deposits.some((d) => d.resource === "oil")).length;
    };
    expect(oil("temperate")).toBe(2);
    expect(oil("arid")).toBeGreaterThanOrEqual(4);
  });
});
