import { describe, expect, it } from "vitest";
import {
  adjacencyMultiplier,
  advance,
  applyCommand,
  buildBlocker,
  createGame,
  economyOfPlayer,
  homePlanet,
  housing,
  RULES,
  TICK_MS,
  upgradeState,
  type BiomeId,
  type BuildingId,
  type Command,
  type GameState,
  type SegmentState,
} from "./index";

const P1 = { id: "p1", name: "Seb" };
const clone = (g: GameState) => JSON.parse(JSON.stringify(g)) as GameState;

/** A fresh coop game with a hand-made strip of segments 0..n and plenty in stock. */
function world(biomes: BiomeId[], level = 1): GameState {
  const g = clone(createGame("tinker", [P1], { now: 0, invaders: "off", goal: "endless" }));
  const home = homePlanet(g, P1.id)!;
  biomes.forEach((biome, i) => {
    const s = home.segments[i]!;
    s.biome = biome;
    s.revealed = true;
    s.building = null;
    s.deposits = [];
  });
  // Neighbors outside the strip: plain savanna, so they add nothing.
  home.segments.at(-1)!.biome = "savanna";
  home.segments[biomes.length]!.biome = "savanna";
  const economy = economyOfPlayer(g, P1.id)!;
  economy.ascension.level = level;
  for (const r of Object.keys(economy.resources) as (keyof typeof economy.resources)[]) economy.resources[r] = 500;
  economy.resources.tools = 0;
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

describe("tinkering", () => {
  it("a sawmill must stand next to a forest and turns wood into planks", () => {
    let g = world(["savanna", "savanna", "forest"]);
    const home = homePlanet(g, P1.id)!;
    expect(buildBlocker(g, home, seg(g, 0), "sawmill")).toBe("Muss neben Wald stehen");
    g = build(g, 1, "sawmill", 2);
    const wood = econ(g).resources.wood;
    g = run(g, 10);
    // 2 workers × 1.3 (one forest) / 4 s per craft.
    expect(econ(g).resources.planks).toBeCloseTo(500 + 10 * (2 * 1.3) / 4, 0);
    expect(econ(g).resources.wood).toBeLessThan(wood);

    g = clone(g);
    econ(g).resources.wood = 0;
    const planks = econ(g).resources.planks;
    g = run(g, 5);
    expect(econ(g).resources.planks).toBeCloseTo(planks, 5);
  });

  it("the workshop makes the recipe its segment is set to", () => {
    let g = world(["savanna", "savanna", "savanna"], 2);
    g = build(g, 1, "workshop", 2);
    const planetId = homePlanet(g, P1.id)!.id;
    expect(applyCommand(g, P1.id, { type: "setGather", planetId, segment: 1, resource: "planks" }, g.simTime)).toEqual({ ok: false, error: "Das stellt dieses Gebäude nicht her" });
    g = exec(g, { type: "setGather", planetId, segment: 1, resource: "cloth" });
    const fiber = econ(g).resources.fiber;
    g = run(g, 8);
    expect(econ(g).resources.cloth).toBeCloseTo(502, 1);
    expect(econ(g).resources.fiber).toBeCloseTo(fiber - 6, 1);
    expect(econ(g).resources.tools).toBe(0);
  });

  it("neighbor bonuses and penalties add up", () => {
    const g = world(["savanna", "savanna", "mountains", "savanna"]);
    const home = homePlanet(g, P1.id)!;
    seg(g, 0).building = "pump";
    seg(g, 1).building = "farm";
    seg(g, 2).building = "mine";
    // Farm: +0.25 savanna under the pump, +0.2 for the pump (watering), −0.25 for the mine (dust).
    expect(adjacencyMultiplier(home, seg(g, 1))).toBeCloseTo(1.2);
    // A lab between two mines: −0.25 noise each.
    seg(g, 1).building = "lab";
    seg(g, 0).building = "mine";
    expect(adjacencyMultiplier(home, seg(g, 1))).toBeCloseTo(0.5);
  });

  it("noisy mines take living space from huts next to them", () => {
    let g = world(["mountains", "savanna", "forest"]);
    seg(g, 0).deposits = [{ resource: "stone", amount: 50, max: 50, infinite: false, byHand: true }];
    const base = housing(g, homePlanet(g, P1.id)!);
    g = build(g, 1, "housing");
    expect(housing(g, homePlanet(g, P1.id)!)).toBe(base + 2);
    g = build(g, 0, "mine");
    // 2 × (1 − 0.25 + 0.1) = 1.7 → one bed less.
    expect(housing(g, homePlanet(g, P1.id)!)).toBe(base + 1);
  });

  it("mines need a deposit, pumps water or an ocean next door", () => {
    const g = world(["mountains", "savanna", "ocean"]);
    const home = homePlanet(g, P1.id)!;
    expect(buildBlocker(g, home, seg(g, 0), "mine")).toBe("Hier gibt es nichts abzubauen");
    expect(buildBlocker(g, home, seg(g, 0), "pump")).toBe("Braucht Wasser im Feld, ein Nachbar-Meer oder einen Nachbar-Gletscher");
    expect(buildBlocker(g, home, seg(g, 1), "pump")).toBeNull();
    seg(g, 0).deposits = [{ resource: "copper", amount: 10, max: 10, infinite: false, byHand: false }];
    expect(buildBlocker(g, home, seg(g, 0), "mine")).toBeNull();
  });

  it("from the workshop's level on, mines wear out tools and slow down without them", () => {
    const setup = (level: number, tools: number) => {
      let g = world(["mountains", "savanna"], level);
      seg(g, 0).deposits = [{ resource: "iron", amount: 400, max: 400, infinite: false, byHand: false }];
      g = build(g, 0, "mine", 3);
      g = clone(g);
      econ(g).resources.tools = tools;
      econ(g).resources.iron = 0;
      return run(g, 10);
    };
    const early = setup(1, 0);
    const worn = setup(2, 0);
    const equipped = setup(2, 50);
    expect(econ(worn).resources.iron).toBeCloseTo(econ(early).resources.iron * RULES.tools.withoutToolsMul, 3);
    expect(econ(equipped).resources.iron).toBeCloseTo(econ(early).resources.iron, 3);
    expect(econ(equipped).resources.tools).toBeCloseTo(50 - (3 * RULES.tools.perWorkerPerMinute * 10) / 60, 3);
  });

  it("a worked forester replants the empty forest next to it", () => {
    let g = world(["forest", "savanna", "forest"]);
    for (const i of [0, 2]) seg(g, i).deposits = [{ resource: "wood", amount: 0, max: 80, infinite: false, byHand: true }];
    g = run(g, 5);
    expect(seg(g, 0).deposits[0]!.amount).toBe(0);
    g = build(g, 1, "forester", 1);
    g = run(g, 5);
    // 1 % of max per second, three times as fast.
    expect(seg(g, 0).deposits[0]!.amount).toBeCloseTo(80 * 0.01 * 3 * 5, 0);
    expect(seg(g, 2).deposits[0]!.amount).toBeGreaterThan(0);
  });

  it("old saves get the new resources", () => {
    const old = clone(createGame("old", [P1], { now: 0 })) as unknown as { version: number; economies: Record<string, { resources: Record<string, number> }> };
    old.version = 11;
    for (const e of Object.values(old.economies)) {
      delete e.resources.planks;
      delete e.resources.copper;
    }
    const g = upgradeState(old)!;
    expect(g.version).toBe(12);
    expect(econ(g).resources.planks).toBe(0);
    expect(econ(g).resources.copper).toBe(0);
    expect(upgradeState({ version: 9 })).toBeNull();
  });
});

describe("building stages", () => {
  it("an upgrade costs, needs its level and replaces the values; demolishing refunds all stages", () => {
    let g = world(["savanna", "savanna", "savanna"], 1);
    g = build(g, 1, "housing");
    const planetId = homePlanet(g, P1.id)!.id;
    const base = housing(g, homePlanet(g, P1.id)!);
    expect(applyCommand(g, P1.id, { type: "upgrade", planetId, segment: 1 }, g.simTime)).toEqual({ ok: false, error: "Ab Aufstiegsstufe 2" });
    g = clone(g);
    econ(g).ascension.level = 2;
    const planks = econ(g).resources.planks;
    g = exec(g, { type: "upgrade", planetId, segment: 1 });
    expect(seg(g, 1).tier).toBe(2);
    // Dammbiber (default people) pay 20 % less planks.
    expect(econ(g).resources.planks).toBe(planks - 8);
    expect(housing(g, homePlanet(g, P1.id)!)).toBe(base + 2);
    expect(applyCommand(g, P1.id, { type: "upgrade", planetId, segment: 1 }, g.simTime)).toEqual({ ok: false, error: "Ab Aufstiegsstufe 5" });

    const wood = econ(g).resources.wood;
    g = exec(g, { type: "demolish", planetId, segment: 1 });
    expect(seg(g, 1).tier).toBeUndefined();
    expect(econ(g).resources.planks).toBe(planks - 8 + 5);
    expect(econ(g).resources.wood).toBe(wood + 7);
  });

  it("gold lies deep: only a stage 2 mine reaches it", () => {
    let g = world(["mountains", "savanna"], 5);
    seg(g, 0).deposits = [
      { resource: "iron", amount: 100, max: 100, infinite: false, byHand: false },
      { resource: "gold", amount: 100, max: 100, infinite: false, byHand: false },
    ];
    g = build(g, 0, "mine", 3);
    g = clone(g);
    econ(g).resources.tools = 50;
    const gold = econ(g).resources.gold;
    g = run(g, 5);
    expect(econ(g).resources.gold).toBe(gold);
    g = exec(g, { type: "upgrade", planetId: homePlanet(g, P1.id)!.id, segment: 0 });
    g = run(g, 5);
    expect(econ(g).resources.gold).toBeGreaterThan(gold);
    expect(seg(g, 0).deposits.find((d) => d.resource === "gold")!.amount).toBeLessThan(100);
  });

  it("the foundry fires bricks from clay and coal", () => {
    let g = world(["savanna", "savanna", "savanna"], 3);
    g = build(g, 1, "foundry", 2);
    const bricks = econ(g).resources.bricks;
    g = run(g, 6);
    expect(econ(g).resources.bricks).toBeCloseTo(bricks + 4, 1);
  });
});
