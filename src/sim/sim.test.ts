import { describe, expect, it } from "vitest";
import {
  advance,
  advanceWithEvents,
  applyCommand,
  createGame,
  HOME_PLANET_ID,
  housing,
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
const home = (g: GameState) => g.planets[0]!;

/** Runs `ticks` ticks and returns the new state plus events. */
function run(g: GameState, ticks: number): { state: GameState; events: GameEvent[] } {
  return advanceWithEvents(g, g.simTime + ticks * TICK_MS);
}

type LocalCommand = Command extends infer C ? (C extends Command ? Omit<C, "planetId"> : never) : never;

/** Applies a command at the current sim time and returns the new state (throws on rejection). */
function exec(g: GameState, cmd: LocalCommand): GameState {
  const result = applyCommand(g, P1.id, { ...cmd, planetId: HOME_PLANET_ID } as Command, g.simTime);
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

function attempt(g: GameState, cmd: LocalCommand) {
  return applyCommand(g, P1.id, { ...cmd, planetId: HOME_PLANET_ID } as Command, g.simTime);
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
});

describe("commands", () => {
  it("assigns idle inhabitants within capacity", () => {
    let g = newGame(1);
    const forest = home(g).segments.find((s) => s.revealed && s.biome === "forest")!;
    g = exec(g, { type: "assign", segment: forest.index, delta: 2 });
    expect(idleWorkers(g)).toBe(1);
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

  it("rejects unknown players, planets, segments and unaffordable buildings", () => {
    const g = newGame(1);
    const savanna = home(g).segments.find((s) => s.revealed && s.biome === "savanna")!;
    const hidden = home(g).segments.find((s) => !s.revealed)!;
    expect(applyCommand(g, "intruder", { type: "assign", planetId: HOME_PLANET_ID, segment: savanna.index, delta: 1 }, g.simTime)).toEqual({ ok: false, error: "Unbekannter Spieler" });
    expect(applyCommand(g, P1.id, { type: "assign", planetId: "mars", segment: savanna.index, delta: 1 }, g.simTime).ok).toBe(false);
    expect(attempt(g, { type: "assign", segment: 999, delta: 1 }).ok).toBe(false);
    expect(attempt(g, { type: "assign", segment: hidden.index, delta: 1 }).ok).toBe(false);
    expect(attempt(g, { type: "build", segment: savanna.index, building: "housing" }).ok).toBe(false);
  });

  it("building pays the cost, records the builder, adds housing and reveals neighbors", () => {
    let g = newGame(1);
    g.resources.wood = 15;
    const edge = home(g).segments[RULES.startRevealRadius]!;
    if (edge.biome === "ocean") edge.biome = "savanna";
    const result = applyCommand(g, P1.id, { type: "build", planetId: HOME_PLANET_ID, segment: edge.index, building: "housing" }, g.simTime);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    g = result.state;
    expect(g.resources.wood).toBe(0);
    expect(housing(g)).toBe(RULES.baseHousing + 2);
    expect(home(g).segments[edge.index]!.builtBy).toBe(P1.id);
    expect(home(g).segments[edge.index + RULES.buildRevealRadius]!.revealed).toBe(true);
    expect(result.events.map((e) => e.type)).toEqual(["built", "revealed"]);
  });

  it("locks buildings behind ascension level", () => {
    const g = newGame(1);
    g.resources.wood = 100;
    g.resources.stone = 100;
    const mountains = home(g).segments.find((s) => s.revealed && s.biome === "mountains")!;
    expect(attempt(g, { type: "build", segment: mountains.index, building: "mine" }).ok).toBe(false);
    g.ascension.level = 1;
    expect(attempt(g, { type: "build", segment: mountains.index, building: "mine" }).ok).toBe(true);
  });

  it("advances to `now` before applying the command", () => {
    const g = newGame(1);
    const forest = home(g).segments.find((s) => s.revealed && s.biome === "forest")!;
    const result = applyCommand(g, P1.id, { type: "assign", planetId: HOME_PLANET_ID, segment: forest.index, delta: 1 }, g.simTime + 1000);
    expect(result.ok && result.state.tick).toBe(RULES.ticksPerSecond);
  });
});

describe("simulation", () => {
  it("gathers by hand and depletes deposits", () => {
    let g = newGame(7);
    const forestIndex = home(g).segments.find((s) => s.revealed && s.biome === "forest")!.index;
    g = exec(g, { type: "assign", segment: forestIndex, delta: 2 });
    const startWood = g.resources.wood;
    g = run(g, RULES.ticksPerSecond * 10).state;
    expect(g.resources.wood).toBeCloseTo(startWood + 2 * RULES.handRatePerWorker * 10, 5);
    home(g).segments[forestIndex]!.deposits.find((d) => d.resource === "wood")!.amount = 0.1;
    const { state, events } = run(g, 5);
    expect(home(state).segments[forestIndex]!.deposits.find((d) => d.resource === "wood")!.amount).toBe(0);
    expect(events).toContainEqual({ type: "depleted", planetId: HOME_PLANET_ID, segment: forestIndex, resource: "wood" });
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
    g.resources.food = 100;
    g.resources.wood = 15;
    const land = home(g).segments.find((s) => s.revealed && s.biome !== "ocean")!;
    g = exec(g, { type: "build", segment: land.index, building: "housing" });
    const { state, events } = run(g, RULES.ticksPerSecond * RULES.secondsPerBirth);
    expect(state.population).toBe(RULES.startPopulation + 1);
    expect(events.some((e) => e.type === "born")).toBe(true);
  });

  it("starves when food runs out and gains ascension per cycle", () => {
    const g = newGame(3);
    g.resources.food = 0;
    const { state, events } = run(g, TICKS_PER_CYCLE);
    expect(state.starving).toBe(true);
    expect(events).toContainEqual({ type: "starving" });
    expect(state.ascension.points).toBe(RULES.startPopulation);
  });

  it("levels up at the thresholds", () => {
    const g = newGame(3);
    g.resources.food = 1000;
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
