import { describe, expect, it } from "vitest";
import { applyCommand, createGame, housing, idleWorkers, RULES, step, TICKS_PER_CYCLE, type GameState } from "./index";

const run = (state: GameState, ticks: number) => {
  const events = [];
  for (let i = 0; i < ticks; i++) events.push(...step(state));
  return events;
};

describe("world generation", () => {
  it("is deterministic per seed", () => {
    expect(createGame({ seed: 42 })).toEqual(createGame({ seed: 42 }));
    expect(createGame({ seed: 42 }).planet).not.toEqual(createGame({ seed: 43 }).planet);
  });

  it("always starts with wood, food and stone in reach", () => {
    for (let seed = 0; seed < 200; seed++) {
      const g = createGame({ seed });
      const visible = g.planet.segments.filter((s) => s.revealed);
      expect(visible).toHaveLength(2 * RULES.startRevealRadius + 1);
      const biomes = visible.map((s) => s.biome);
      expect(biomes).toContain("forest");
      expect(biomes).toContain("meadow");
      expect(biomes).toContain("mountain");
      expect(g.planet.segments.some((s) => s.biome === "sea")).toBe(true);
    }
  });
});

describe("commands", () => {
  it("assigns idle inhabitants within capacity", () => {
    const g = createGame({ seed: 1 });
    const forest = g.planet.segments.find((s) => s.revealed && s.biome === "forest")!;
    expect(applyCommand(g, { type: "assign", segment: forest.index, delta: 2 })).toEqual({ ok: true });
    expect(idleWorkers(g)).toBe(1);
    expect(applyCommand(g, { type: "assign", segment: forest.index, delta: 1 }).ok).toBe(false);
    expect(applyCommand(g, { type: "assign", segment: forest.index, delta: -3 }).ok).toBe(false);
  });

  it("rejects unrevealed segments and unaffordable buildings without changing state", () => {
    const g = createGame({ seed: 1 });
    const hidden = g.planet.segments.find((s) => !s.revealed)!;
    const before = structuredClone(g);
    expect(applyCommand(g, { type: "assign", segment: hidden.index, delta: 1 }).ok).toBe(false);
    const meadow = g.planet.segments.find((s) => s.revealed && s.biome === "meadow")!;
    expect(applyCommand(g, { type: "build", segment: meadow.index, building: "hut" }).ok).toBe(false);
    expect(g).toEqual(before);
  });

  it("building pays the cost, adds housing and reveals neighbors", () => {
    const g = createGame({ seed: 1 });
    g.resources.wood = 15;
    const edge = g.planet.segments.find((s) => s.index === RULES.startRevealRadius)!;
    if (edge.biome === "sea") edge.biome = "meadow";
    const result = applyCommand(g, { type: "build", segment: edge.index, building: "hut" });
    expect(result).toEqual({ ok: true });
    expect(g.resources.wood).toBe(0);
    expect(housing(g)).toBe(RULES.baseHousing + 2);
    expect(g.planet.segments[edge.index + RULES.buildRevealRadius]!.revealed).toBe(true);
  });

  it("locks buildings behind ascension level", () => {
    const g = createGame({ seed: 1 });
    g.resources.wood = 100;
    g.resources.stone = 100;
    const mountain = g.planet.segments.find((s) => s.revealed && s.biome === "mountain")!;
    expect(applyCommand(g, { type: "build", segment: mountain.index, building: "mine" }).ok).toBe(false);
    g.ascension.level = 1;
    expect(applyCommand(g, { type: "build", segment: mountain.index, building: "mine" }).ok).toBe(true);
  });
});

describe("simulation", () => {
  it("gathers by hand and depletes deposits", () => {
    const g = createGame({ seed: 7 });
    const forest = g.planet.segments.find((s) => s.revealed && s.biome === "forest")!;
    applyCommand(g, { type: "assign", segment: forest.index, delta: 2 });
    const wood = forest.deposits.find((d) => d.resource === "wood")!;
    const startWood = g.resources.wood;
    run(g, RULES.ticksPerSecond * 10);
    expect(g.resources.wood).toBeCloseTo(startWood + 2 * RULES.handRatePerWorker * 10, 5);
    wood.amount = 0.1;
    const events = run(g, 5);
    expect(wood.amount).toBe(0);
    expect(events).toContainEqual({ type: "depleted", segment: forest.index, resource: "wood" });
  });

  it("regrows untouched deposits but not exhausted ones", () => {
    const g = createGame({ seed: 7 });
    const [a, b] = g.planet.segments.filter((s) => s.revealed && s.biome === "forest");
    a!.deposits[0]!.amount = 10;
    b!.deposits[0]!.amount = 0;
    run(g, RULES.ticksPerSecond * 5);
    expect(a!.deposits[0]!.amount).toBeGreaterThan(10);
    expect(b!.deposits[0]!.amount).toBe(0);
  });

  it("grows population when housing and food allow", () => {
    const g = createGame({ seed: 3 });
    g.resources.food = 100;
    g.resources.wood = 15;
    const land = g.planet.segments.find((s) => s.revealed && s.biome !== "sea")!;
    applyCommand(g, { type: "build", segment: land.index, building: "hut" });
    const events = run(g, RULES.ticksPerSecond * RULES.secondsPerBirth);
    expect(g.population).toBe(RULES.startPopulation + 1);
    expect(events.some((e) => e.type === "born")).toBe(true);
  });

  it("starves when food runs out and gains ascension per cycle", () => {
    const g = createGame({ seed: 3 });
    g.resources.food = 0;
    const events = run(g, TICKS_PER_CYCLE);
    expect(g.starving).toBe(true);
    expect(events).toContainEqual({ type: "starving" });
    expect(g.ascension.points).toBe(RULES.startPopulation);
  });

  it("levels up at the thresholds", () => {
    const g = createGame({ seed: 3 });
    g.resources.food = 1000;
    g.ascension.points = RULES.ascensionThresholds[0] - 1;
    const events = run(g, TICKS_PER_CYCLE);
    expect(g.ascension.level).toBe(1);
    expect(events).toContainEqual({ type: "levelUp", level: 1 });
  });

  it("stays deterministic and JSON-safe across a long session", () => {
    const play = () => {
      const g = createGame({ seed: 99 });
      const forest = g.planet.segments.find((s) => s.revealed && s.biome === "forest")!;
      const meadow = g.planet.segments.find((s) => s.revealed && s.biome === "meadow")!;
      applyCommand(g, { type: "assign", segment: forest.index, delta: 2 });
      applyCommand(g, { type: "assign", segment: meadow.index, delta: 1 });
      run(g, TICKS_PER_CYCLE * 5);
      return g;
    };
    const a = play();
    expect(a).toEqual(play());
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });
});
