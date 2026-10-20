import { describe, expect, it } from "vitest";
import {
  advance,
  advanceWithEvents,
  applyCommand,
  addPlayer,
  createGame,
  homePlanet,
  housing,
  RARE_RESOURCES,
  idleWorkers,
  RULES,
  TICK_MS,
  TICKS_PER_CYCLE,
  type Command,
  type GameEvent,
  type GameState,
} from "./index";

const P1 = { id: "p1", name: "Seb" };
const newGame = (seed: number | string) => createGame(String(seed), [P1], { now: 1000 });
const home = (g: GameState) => homePlanet(g, P1.id)!;

/** Runs `ticks` ticks and returns the new state plus events. */
function run(g: GameState, ticks: number): { state: GameState; events: GameEvent[] } {
  return advanceWithEvents(g, g.simTime + ticks * TICK_MS);
}

type LocalCommand = Command extends infer C ? (C extends Command ? Omit<C, "planetId"> : never) : never;

/** Applies a command at the current sim time and returns the new state (throws on rejection). */
function exec(g: GameState, cmd: LocalCommand): GameState {
  const result = applyCommand(g, P1.id, { ...cmd, planetId: home(g).id } as Command, g.simTime);
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

function attempt(g: GameState, cmd: LocalCommand) {
  return applyCommand(g, P1.id, { ...cmd, planetId: home(g).id } as Command, g.simTime);
}

describe("world generation", () => {
  it("is deterministic per seed", () => {
    expect(newGame("abc")).toEqual(newGame("abc"));
    expect(home(newGame("abc"))).not.toEqual(home(newGame("abd")));
  });

  it("always starts with wood, food and stone in reach", () => {
    for (let seed = 0; seed < 200; seed++) {
      const g = newGame(seed);
      const visible = home(g).segments.filter((s) => s.revealed);
      expect(visible).toHaveLength(2 * RULES.startRevealRadius + 1);
      const biomes = visible.map((s) => s.biome);
      expect(biomes).toContain("forest");
      expect(biomes).toContain("savanna");
      expect(biomes).toContain("mountains");
      expect(home(g).segments.some((s) => s.biome === "ocean")).toBe(true);
    }
  });

  it("stores players and starts at the given time", () => {
    const g = createGame("x", [P1, { id: "p2", name: "Mo" }], { now: 5000 });
    expect(g.players.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(g.simTime).toBe(5000);
  });

  it("builds a system with one start planet per possible player plus free planets", () => {
    for (let seed = 0; seed < 50; seed++) {
      const g = newGame(seed);
      const starts = g.planets.filter((p) => p.startSlot !== null);
      expect(starts).toHaveLength(4);
      expect(g.planets.length).toBeGreaterThanOrEqual(6);
      expect(new Set(g.planets.map((p) => p.name)).size).toBe(g.planets.length);
      // Only the joined player's planet is inhabited and partly revealed.
      expect(g.planets.filter((p) => p.ownerId)).toEqual([home(g)]);
      expect(g.planets.filter((p) => p !== home(g)).every((p) => p.segments.every((s) => !s.revealed) && p.population === 0)).toBe(true);
    }
  });

  it("splits rare resources so start planets complement each other", () => {
    const rare = Object.keys(RARE_RESOURCES);
    for (let seed = 0; seed < 100; seed++) {
      const g = createGame(String(seed), [P1, { id: "p2", name: "Mo" }]);
      const rareOn = (planetId: string) =>
        new Set(g.planets.find((p) => p.id === planetId)!.segments.flatMap((s) => s.deposits.map((d) => d.resource)).filter((r) => rare.includes(r)));
      const [a, b] = g.players.map((p) => rareOn(p.homePlanetId));
      // Two players together have everything, and neither has what the other has.
      expect(new Set([...a!, ...b!]).size).toBe(rare.length);
      expect([...a!].some((r) => b!.has(r))).toBe(false);
    }
  });

  it("lets players join later on a free start planet", () => {
    const g = newGame(5);
    const joined = addPlayer(g, { id: "p2", name: "Mo" });
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    const mo = homePlanet(joined.state, "p2")!;
    expect(mo.id).not.toBe(home(g).id);
    expect(mo.population).toBe(RULES.startPopulation);
    expect(addPlayer(joined.state, { id: "p2", name: "Mo" }).ok).toBe(false);
    expect(g.players).toHaveLength(1);
  });
});

describe("commands", () => {
  it("assigns idle inhabitants within capacity", () => {
    let g = newGame(1);
    const forest = home(g).segments.find((s) => s.revealed && s.biome === "forest")!;
    g = exec(g, { type: "assign", segment: forest.index, delta: 2 });
    expect(idleWorkers(home(g))).toBe(1);
    expect(attempt(g, { type: "assign", segment: forest.index, delta: 1 }).ok).toBe(false);
    expect(attempt(g, { type: "assign", segment: forest.index, delta: -3 }).ok).toBe(false);
  });

  it("never mutates the input state", () => {
    const g = newGame(1);
    const before = JSON.stringify(g);
    const forest = home(g).segments.find((s) => s.revealed && s.biome === "forest")!;
    const hidden = home(g).segments.find((s) => !s.revealed)!;
    attempt(g, { type: "assign", segment: forest.index, delta: 2 });
    attempt(g, { type: "assign", segment: hidden.index, delta: 1 });
    advance(g, g.simTime + 60_000);
    expect(JSON.stringify(g)).toBe(before);
  });

  it("only lets owners act on their planet", () => {
    const g = createGame("1", [P1, { id: "p2", name: "Mo" }]);
    const forest = home(g).segments.find((s) => s.revealed && s.biome === "forest")!;
    const result = applyCommand(g, "p2", { type: "assign", planetId: home(g).id, segment: forest.index, delta: 1 }, g.simTime);
    expect(result).toEqual({ ok: false, error: "Dieser Planet gehört dir nicht" });
  });

  it("rejects unknown players, planets, segments and unaffordable buildings", () => {
    const g = newGame(1);
    const savanna = home(g).segments.find((s) => s.revealed && s.biome === "savanna")!;
    const hidden = home(g).segments.find((s) => !s.revealed)!;
    expect(applyCommand(g, "intruder", { type: "assign", planetId: home(g).id, segment: savanna.index, delta: 1 }, g.simTime)).toEqual({ ok: false, error: "Unbekannter Spieler" });
    expect(applyCommand(g, P1.id, { type: "assign", planetId: "mars", segment: savanna.index, delta: 1 }, g.simTime).ok).toBe(false);
    expect(attempt(g, { type: "assign", segment: 999, delta: 1 }).ok).toBe(false);
    expect(attempt(g, { type: "assign", segment: hidden.index, delta: 1 }).ok).toBe(false);
    expect(attempt(g, { type: "build", segment: savanna.index, building: "housing" }).ok).toBe(false);
  });

  it("building pays the cost, records the builder, adds housing and reveals neighbors", () => {
    let g = newGame(1);
    home(g).resources.wood = 15;
    const edge = home(g).segments[RULES.startRevealRadius]!;
    if (edge.biome === "ocean") edge.biome = "savanna";
    const result = applyCommand(g, P1.id, { type: "build", planetId: home(g).id, segment: edge.index, building: "housing" }, g.simTime);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    g = result.state;
    expect(home(g).resources.wood).toBe(0);
    expect(housing(home(g))).toBe(RULES.baseHousing + 2);
    expect(home(g).segments[edge.index]!.builtBy).toBe(P1.id);
    expect(home(g).segments[edge.index + RULES.buildRevealRadius]!.revealed).toBe(true);
    expect(result.events.map((e) => e.type)).toEqual(["built", "revealed"]);
  });

  it("locks buildings behind ascension level", () => {
    const g = newGame(1);
    home(g).resources.wood = 100;
    home(g).resources.stone = 100;
    const mountains = home(g).segments.find((s) => s.revealed && s.biome === "mountains")!;
    expect(attempt(g, { type: "build", segment: mountains.index, building: "mine" }).ok).toBe(false);
    g.ascension.level = 1;
    expect(attempt(g, { type: "build", segment: mountains.index, building: "mine" }).ok).toBe(true);
  });

  it("advances to `now` before applying the command", () => {
    const g = newGame(1);
    const forest = home(g).segments.find((s) => s.revealed && s.biome === "forest")!;
    const result = applyCommand(g, P1.id, { type: "assign", planetId: home(g).id, segment: forest.index, delta: 1 }, g.simTime + 1000);
    expect(result.ok && result.state.tick).toBe(RULES.ticksPerSecond);
  });
});

describe("simulation", () => {
  it("gathers by hand and depletes deposits", () => {
    let g = newGame(7);
    const forestIndex = home(g).segments.find((s) => s.revealed && s.biome === "forest")!.index;
    g = exec(g, { type: "assign", segment: forestIndex, delta: 2 });
    const startWood = home(g).resources.wood;
    g = run(g, RULES.ticksPerSecond * 10).state;
    expect(home(g).resources.wood).toBeCloseTo(startWood + 2 * RULES.handRatePerWorker * 10, 5);
    home(g).segments[forestIndex]!.deposits.find((d) => d.resource === "wood")!.amount = 0.1;
    const { state, events } = run(g, 5);
    expect(home(state).segments[forestIndex]!.deposits.find((d) => d.resource === "wood")!.amount).toBe(0);
    expect(events).toContainEqual({ type: "depleted", planetId: home(g).id, segment: forestIndex, resource: "wood" });
  });

  it("regrows untouched deposits but not exhausted ones", () => {
    const g = newGame(7);
    const [a, b] = home(g).segments.filter((s) => s.revealed && s.biome === "forest");
    a!.deposits[0]!.amount = 10;
    b!.deposits[0]!.amount = 0;
    const next = run(g, RULES.ticksPerSecond * 5).state;
    expect(home(next).segments[a!.index]!.deposits[0]!.amount).toBeGreaterThan(10);
    expect(home(next).segments[b!.index]!.deposits[0]!.amount).toBe(0);
  });

  it("grows population when housing and food allow", () => {
    let g = newGame(3);
    home(g).resources.food = 100;
    home(g).resources.wood = 15;
    const land = home(g).segments.find((s) => s.revealed && s.biome !== "ocean")!;
    g = exec(g, { type: "build", segment: land.index, building: "housing" });
    const { state, events } = run(g, RULES.ticksPerSecond * RULES.secondsPerBirth);
    expect(home(state).population).toBe(RULES.startPopulation + 1);
    expect(events.some((e) => e.type === "born")).toBe(true);
  });

  it("starves when food runs out and gains ascension per cycle", () => {
    const g = newGame(3);
    home(g).resources.food = 0;
    const { state, events } = run(g, TICKS_PER_CYCLE);
    expect(home(state).starving).toBe(true);
    expect(events).toContainEqual({ type: "starving", planetId: home(g).id });
    expect(state.ascension.points).toBe(RULES.startPopulation);
  });

  it("levels up at the thresholds", () => {
    const g = newGame(3);
    home(g).resources.food = 1000;
    g.ascension.points = RULES.ascensionThresholds[0] - 1;
    const { state, events } = run(g, TICKS_PER_CYCLE);
    expect(state.ascension.level).toBe(1);
    expect(events).toContainEqual({ type: "levelUp", level: 1 });
  });

  it("gives the same result whether advanced in one step or many", () => {
    let g = newGame(99);
    const forest = home(g).segments.find((s) => s.revealed && s.biome === "forest")!;
    g = exec(g, { type: "assign", segment: forest.index, delta: 2 });
    const end = g.simTime + TICKS_PER_CYCLE * 3 * TICK_MS + 37;
    const once = advance(g, end);
    let many = g;
    for (let t = g.simTime; t < end; t += 333) many = advance(many, t);
    many = advance(many, end);
    expect(many).toEqual(once);
  });

  it("stays deterministic and JSON-safe across a long session", () => {
    const play = () => {
      let g = newGame(99);
      const forest = home(g).segments.find((s) => s.revealed && s.biome === "forest")!;
      const savanna = home(g).segments.find((s) => s.revealed && s.biome === "savanna")!;
      g = exec(g, { type: "assign", segment: forest.index, delta: 2 });
      g = exec(g, { type: "assign", segment: savanna.index, delta: 1 });
      return run(g, TICKS_PER_CYCLE * 5).state;
    };
    const a = play();
    expect(a).toEqual(play());
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });
});
