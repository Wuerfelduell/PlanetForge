import { describe, expect, it } from "vitest";
import {
  addPlayer,
  advance,
  advanceWithEvents,
  applyCommand,
  createGame,
  economyOfPlayer,
  homePlanet,
  housing,
  idleUnits,
  population,
  RARE_RESOURCES,
  RULES,
  SYSTEM,
  TICK_MS,
  ticksPerCycle,
  workerCount,
  type Command,
  type GameEvent,
  type GameState,
} from "./index";

const P1 = { id: "p1", name: "Seb" };
const MO = { id: "p2", name: "Mo" };
const newGame = (seed: number | string) => createGame(String(seed), [P1], { now: 1000 });
const home = (g: GameState, playerId = P1.id) => homePlanet(g, playerId)!;
const econ = (g: GameState, playerId = P1.id) => economyOfPlayer(g, playerId)!;
const firstRevealed = (g: GameState, biome: string) => home(g).segments.find((s) => s.revealed && s.biome === biome)!;

/** Runs `ticks` ticks and returns the new state plus events. */
function run(g: GameState, ticks: number): { state: GameState; events: GameEvent[] } {
  return advanceWithEvents(g, g.simTime + ticks * TICK_MS);
}

type PlanetCommand = Extract<Command, { planetId: string }>;
type LocalCommand = PlanetCommand extends infer C ? (C extends PlanetCommand ? Omit<C, "planetId"> : never) : never;

function attempt(g: GameState, cmd: LocalCommand, playerId = P1.id) {
  return applyCommand(g, playerId, { ...cmd, planetId: home(g, playerId).id } as Command, g.simTime);
}

/** Applies a command at the current sim time and returns the new state (throws on rejection). */
function exec(g: GameState, cmd: LocalCommand | Command, playerId = P1.id): GameState {
  const full = ("planetId" in cmd || cmd.type === "assignUnit" || !("segment" in cmd) ? cmd : { ...cmd, planetId: home(g, playerId).id }) as Command;
  const result = applyCommand(g, playerId, full, g.simTime);
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

function join(g: GameState, player = MO, now = g.simTime): GameState {
  const r = addPlayer(g, player.id, player.name, now);
  if (!r.ok) throw new Error(r.error);
  return r.state;
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

  it("stores settings, host and start time", () => {
    const g = createGame("x", [P1, MO], { now: 5000, cycleSeconds: 60 });
    expect(g.players.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(g.hostId).toBe(P1.id);
    expect(g.simTime).toBe(5000);
    expect(g.settings).toEqual({ mode: "coop", cycleSeconds: 60, difficulty: "normal", maxPlayers: SYSTEM.maxPlayers, goal: "supernova", invaders: "normal" });
    expect(ticksPerCycle(g)).toBe(600);
  });

  it("coop: one big shared start planet with every rare resource, plus free planets", () => {
    for (let seed = 0; seed < 50; seed++) {
      const g = newGame(seed);
      expect(g.planets.filter((p) => p.startSlot !== null)).toEqual([home(g)]);
      expect(home(g).segments).toHaveLength(SYSTEM.coopStartPlanetSegments);
      expect(g.planets.length).toBeGreaterThanOrEqual(1 + SYSTEM.freePlanets.min);
      expect(new Set(g.planets.map((p) => p.name)).size).toBe(g.planets.length);
      const deposits = new Set(home(g).segments.flatMap((s) => s.deposits.map((d) => d.resource)));
      for (const r of Object.keys(RARE_RESOURCES)) expect(deposits.has(r as never)).toBe(true);
      expect(g.planets.filter((p) => p !== home(g)).every((p) => p.segments.every((s) => !s.revealed) && population(g, p) === 0)).toBe(true);
    }
  });

  it("versus: one start planet and economy per player, rare resources split so players complement each other", () => {
    const rare = Object.keys(RARE_RESOURCES);
    for (let seed = 0; seed < 100; seed++) {
      const g = createGame(String(seed), [P1, MO], { mode: "versus" });
      expect(g.planets.filter((p) => p.startSlot !== null)).toHaveLength(SYSTEM.maxPlayers);
      expect(Object.keys(g.economies)).toHaveLength(2);
      const rareOn = (playerId: string) => new Set(home(g, playerId).segments.flatMap((s) => s.deposits.map((d) => d.resource)).filter((r) => rare.includes(r)));
      const [a, b] = [rareOn(P1.id), rareOn(MO.id)];
      expect(new Set([...a, ...b]).size).toBe(rare.length);
      expect([...a].some((r) => b.has(r))).toBe(false);
    }
  });
});

describe("players and units", () => {
  it("creates owned units for the starting people", () => {
    const g = newGame(1);
    const units = Object.values(g.units);
    expect(units).toHaveLength(RULES.startPopulation);
    expect(units.every((u) => u.owner === P1.id && u.people === "burrowbeavers" && u.planetId === home(g).id && u.segment === null)).toBe(true);
  });

  it("coop: joining players bring an own people to the shared planet and economy", () => {
    const g = newGame(5);
    const joined = join(g, MO, g.simTime + 5000);
    expect(home(joined, MO.id)).toEqual(home(joined));
    expect(population(joined, home(joined), MO.id)).toBe(RULES.coopJoinPopulation);
    expect(population(joined, home(joined))).toBe(RULES.startPopulation + RULES.coopJoinPopulation);
    expect(joined.players.map((p) => p.people)).toEqual(["burrowbeavers", "quillfolk"]);
    expect(econ(joined, MO.id)).toBe(econ(joined));
    expect(joined.simTime).toBe(g.simTime + 5000);
    expect(joined.log.map((l) => l.event)).toContainEqual({ type: "joined", playerId: MO.id });
    expect(addPlayer(joined, MO.id, MO.name, joined.simTime).ok).toBe(false);
  });

  it("coop: each player moves only their own units and keeps teammates' buildings", () => {
    let g = join(newGame(5));
    const forest = firstRevealed(g, "forest");
    g = exec(g, { type: "assign", segment: forest.index, delta: 1 });
    expect(attempt(g, { type: "assign", segment: forest.index, delta: -1 }, MO.id)).toEqual({ ok: false, error: "Hier arbeiten keine Leute von dir" });
    g = exec(g, { type: "assign", segment: forest.index, delta: 1 }, MO.id);
    expect(workerCount(g, home(g), forest.index, P1.id)).toBe(1);
    expect(workerCount(g, home(g), forest.index, MO.id)).toBe(1);
    expect(idleUnits(g, home(g), MO.id)).toHaveLength(RULES.coopJoinPopulation - 1);

    const p1Unit = Object.values(g.units).find((u) => u.owner === P1.id)!;
    expect(applyCommand(g, MO.id, { type: "assignUnit", unitId: p1Unit.id, segment: null }, g.simTime)).toEqual({ ok: false, error: "Dieser Einwohner gehört dir nicht" });

    econ(g).resources.wood = 15;
    g = exec(g, { type: "build", segment: forest.index, building: "housing" });
    expect(workerCount(g, home(g), forest.index)).toBe(0);
    expect(attempt(g, { type: "demolish", segment: forest.index }, MO.id)).toEqual({ ok: false, error: "Das hat ein Mitspieler gebaut" });
    expect(attempt(g, { type: "demolish", segment: forest.index }).ok).toBe(true);
  });

  it("versus: late joiners get a free start planet; players only act on their own", () => {
    const g = join(createGame("5", [P1], { mode: "versus" }));
    expect(home(g, MO.id).id).not.toBe(home(g).id);
    expect(econ(g, MO.id)).not.toBe(econ(g));
    const forest = firstRevealed(g, "forest");
    const result = applyCommand(g, MO.id, { type: "assign", planetId: home(g).id, segment: forest.index, delta: 1 }, g.simTime);
    expect(result).toEqual({ ok: false, error: "Dieser Planet gehört dir nicht" });
  });

  it("refuses players beyond maxPlayers", () => {
    const g = join(createGame("5", [P1], { maxPlayers: 2 }));
    expect(addPlayer(g, "p3", "Ki", 0)).toEqual({ ok: false, error: "Das Spiel ist voll" });
  });

  it("moves single units with assignUnit within capacity", () => {
    let g = newGame(2);
    const forest = firstRevealed(g, "forest");
    const [a, b, c] = Object.keys(g.units);
    g = exec(g, { type: "assignUnit", unitId: a!, segment: forest.index });
    g = exec(g, { type: "assignUnit", unitId: b!, segment: forest.index });
    expect(applyCommand(g, P1.id, { type: "assignUnit", unitId: c!, segment: forest.index }, g.simTime)).toEqual({ ok: false, error: "Kein Platz für weitere Einwohner" });
    g = exec(g, { type: "assignUnit", unitId: a!, segment: null });
    expect(g.units[a!]!.segment).toBeNull();
  });
});

describe("commands", () => {
  it("never mutates the input state", () => {
    const g = newGame(1);
    const before = JSON.stringify(g);
    const forest = firstRevealed(g, "forest");
    attempt(g, { type: "assign", segment: forest.index, delta: 2 });
    attempt(g, { type: "assign", segment: home(g).segments.find((s) => !s.revealed)!.index, delta: 1 });
    advance(g, g.simTime + 60_000);
    expect(JSON.stringify(g)).toBe(before);
  });

  it("rejects unknown players, planets, segments and unaffordable buildings", () => {
    const g = newGame(1);
    const savanna = firstRevealed(g, "savanna");
    expect(applyCommand(g, "intruder", { type: "assign", planetId: home(g).id, segment: savanna.index, delta: 1 }, g.simTime)).toEqual({ ok: false, error: "Unbekannter Spieler" });
    expect(applyCommand(g, P1.id, { type: "assign", planetId: "mars", segment: savanna.index, delta: 1 }, g.simTime).ok).toBe(false);
    expect(attempt(g, { type: "assign", segment: 999, delta: 1 }).ok).toBe(false);
    expect(attempt(g, { type: "assign", segment: home(g).segments.find((s) => !s.revealed)!.index, delta: 1 }).ok).toBe(false);
    expect(attempt(g, { type: "build", segment: savanna.index, building: "housing" }).ok).toBe(false);
  });

  it("building pays the cost, records the builder, adds housing and reveals neighbors", () => {
    const g = newGame(1);
    econ(g).resources.wood = 15;
    const edge = home(g).segments[RULES.startRevealRadius]!;
    if (edge.biome === "ocean") edge.biome = "savanna";
    const result = attempt(g, { type: "build", segment: edge.index, building: "housing" });
    if (!result.ok) throw new Error(result.error);
    const s = result.state;
    expect(econ(s).resources.wood).toBe(0);
    expect(housing(s, home(s))).toBe(RULES.baseHousing + 2);
    expect(home(s).segments[edge.index]!.builtBy).toBe(P1.id);
    expect(home(s).segments[edge.index + RULES.buildRevealRadius]!.revealed).toBe(true);
    expect(result.events.map((e) => e.type)).toEqual(["built", "revealed"]);
  });

  it("locks buildings behind ascension level", () => {
    const g = newGame(1);
    econ(g).resources.wood = 100;
    econ(g).resources.stone = 100;
    const mountains = firstRevealed(g, "mountains");
    expect(attempt(g, { type: "build", segment: mountains.index, building: "mine" }).ok).toBe(false);
    econ(g).ascension.level = 1;
    expect(attempt(g, { type: "build", segment: mountains.index, building: "mine" }).ok).toBe(true);
  });

  it("advances to `now` before applying the command", () => {
    const g = newGame(1);
    const forest = firstRevealed(g, "forest");
    const result = applyCommand(g, P1.id, { type: "assign", planetId: home(g).id, segment: forest.index, delta: 1 }, g.simTime + 1000);
    expect(result.ok && result.state.tick).toBe(RULES.ticksPerSecond);
  });
});

describe("host and queue", () => {
  it("host removes a player; their units vanish and queued orders go", () => {
    let g = join(newGame(4));
    econ(g).resources.wood = 0;
    const land = home(g).segments.find((s) => s.revealed && s.biome !== "ocean")!;
    g = exec(g, { type: "enqueue", segment: land.index, building: "housing" }, MO.id);
    expect(applyCommand(g, MO.id, { type: "kickPlayer", playerId: P1.id }, g.simTime)).toEqual({ ok: false, error: "Nur der Gastgeber kann Spieler entfernen" });
    expect(applyCommand(g, P1.id, { type: "kickPlayer", playerId: P1.id }, g.simTime).ok).toBe(false);
    g = exec(g, { type: "kickPlayer", playerId: MO.id });
    expect(g.players.map((p) => p.id)).toEqual([P1.id]);
    expect(Object.values(g.units).every((u) => u.owner === P1.id)).toBe(true);
    expect(population(g, home(g))).toBe(RULES.startPopulation);
    expect(g.queues[home(g).id]).toEqual([]);
    expect(g.log.map((l) => l.event)).toContainEqual({ type: "removed", playerId: MO.id, by: P1.id });
  });

  it("queued builds run once affordable, in order, and stale ones drop", () => {
    let g = newGame(4);
    econ(g).resources.wood = 0;
    const [a, b] = home(g).segments.filter((s) => s.revealed && s.biome !== "ocean");
    g = exec(g, { type: "enqueue", segment: a!.index, building: "housing" });
    g = exec(g, { type: "enqueue", segment: b!.index, building: "farm" });
    expect(attempt(g, { type: "enqueue", segment: a!.index, building: "farm" })).toEqual({ ok: false, error: "Für dieses Feld ist schon etwas geplant" });
    expect(attempt(g, { type: "enqueue", segment: a!.index, building: "lab" }).ok).toBe(false);

    g = run(g, 1).state;
    expect(home(g).segments[a!.index]!.building).toBeNull();
    econ(g).resources.wood = 15;
    let r = run(g, 1);
    g = r.state;
    expect(home(g).segments[a!.index]!.building).toBe("housing");
    expect(r.events).toContainEqual(expect.objectContaining({ type: "built", segment: a!.index }));
    expect(g.queues[home(g).id]).toHaveLength(1);

    // Someone builds on the second segment directly: the order cannot run any more and is dropped.
    econ(g).resources.wood = 15;
    g = exec(g, { type: "build", segment: b!.index, building: "housing" });
    r = run(g, 1);
    expect(r.events).toContainEqual(expect.objectContaining({ type: "queueDropped", segment: b!.index }));
    expect(r.state.queues[home(g).id]).toEqual([]);

    g = exec(r.state, { type: "enqueue", segment: home(g).segments.find((s) => s.revealed && !s.building && s.biome !== "ocean")!.index, building: "housing" });
    g = exec(g, { type: "dequeue", planetId: home(g).id, index: 0 });
    expect(g.queues[home(g).id]).toEqual([]);
  });
});

describe("lobby clock", () => {
  it("stops the clock while closed or paused, without catching up later", () => {
    let g = join(newGame(1));
    expect(applyCommand(g, MO.id, { type: "closeLobby" }, g.simTime)).toEqual({ ok: false, error: "Nur der Gastgeber kann das Spiel öffnen oder schließen" });
    g = exec(g, { type: "closeLobby" });
    const closedAt = g.tick;
    g = advance(g, g.simTime + 60_000);
    expect(g.tick).toBe(closedAt);
    const forest = firstRevealed(g, "forest");
    expect(attempt(g, { type: "assign", segment: forest.index, delta: 1 })).toEqual({ ok: false, error: "Das Spiel ist geschlossen" });

    g = exec(g, { type: "openLobby" });
    g = advance(g, g.simTime + 1000);
    expect(g.tick).toBe(closedAt + RULES.ticksPerSecond);

    g = exec(g, { type: "pause" }, MO.id);
    g = advance(g, g.simTime + 5000);
    expect(g.tick).toBe(closedAt + RULES.ticksPerSecond);
    g = exec(g, { type: "resume" }, MO.id);
    g = advance(g, g.simTime + 1000);
    expect(g.tick).toBe(closedAt + 2 * RULES.ticksPerSecond);
    expect(g.log.filter((l) => l.event.type === "lobby")).toHaveLength(4);
  });
});

describe("simulation", () => {
  it("gathers by hand and depletes deposits", () => {
    let g = newGame(7);
    const forestIndex = firstRevealed(g, "forest").index;
    g = exec(g, { type: "assign", segment: forestIndex, delta: 2 });
    const startWood = econ(g).resources.wood;
    g = run(g, RULES.ticksPerSecond * 10).state;
    expect(econ(g).resources.wood).toBeCloseTo(startWood + 2 * RULES.handRatePerWorker * 10, 5);
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
    econ(g).resources.food = 100;
    econ(g).resources.wood = 15;
    const land = home(g).segments.find((s) => s.revealed && s.biome !== "ocean")!;
    g = exec(g, { type: "build", segment: land.index, building: "housing" });
    const { state, events } = run(g, RULES.ticksPerSecond * RULES.secondsPerBirth);
    expect(population(state, home(state))).toBe(RULES.startPopulation + 1);
    expect(events.some((e) => e.type === "born")).toBe(true);
  });

  it("coop: births go to the smallest people first", () => {
    let g = join(newGame(5));
    econ(g).resources.food = 500;
    econ(g).resources.wood = 15;
    const land = home(g).segments.find((s) => s.revealed && s.biome !== "ocean")!;
    g = exec(g, { type: "build", segment: land.index, building: "housing" });
    const { state, events } = run(g, RULES.ticksPerSecond * RULES.secondsPerBirth);
    expect(events).toContainEqual(expect.objectContaining({ type: "born", playerId: MO.id }));
    expect(population(state, home(state), MO.id)).toBe(RULES.coopJoinPopulation + 1);
  });

  it("starves when food runs out and gains ascension per cycle", () => {
    const g = newGame(3);
    econ(g).resources.food = 0;
    const { state, events } = run(g, ticksPerCycle(g));
    expect(econ(state).starving).toBe(true);
    expect(events).toContainEqual({ type: "starving", economyId: econ(g).id });
    expect(econ(state).ascension.points).toBe(RULES.startPopulation);
  });

  it("levels up at the thresholds", () => {
    const g = newGame(3);
    econ(g).resources.food = 1000;
    econ(g).ascension.points = RULES.ascensionThresholds[0] - 1;
    const { state, events } = run(g, ticksPerCycle(g));
    expect(econ(state).ascension.level).toBe(1);
    expect(events).toContainEqual({ type: "levelUp", economyId: econ(g).id, level: 1 });
  });

  it("keeps the log bounded", () => {
    let g = newGame(3);
    for (let i = 0; i < RULES.logLength + 20; i++) g = exec(g, { type: i % 2 ? "resume" : "pause" });
    expect(g.log).toHaveLength(RULES.logLength);
  });

  it("gives the same result whether advanced in one step or many", () => {
    let g = newGame(99);
    g = exec(g, { type: "assign", segment: firstRevealed(g, "forest").index, delta: 2 });
    const end = g.simTime + ticksPerCycle(g) * 3 * TICK_MS + 37;
    const once = advance(g, end);
    let many = g;
    for (let t = g.simTime; t < end; t += 333) many = advance(many, t);
    many = advance(many, end);
    expect(many).toEqual(once);
  });

  it("stays deterministic and JSON-safe across a long session", () => {
    const play = () => {
      let g = newGame(99);
      g = exec(g, { type: "assign", segment: firstRevealed(g, "forest").index, delta: 2 });
      g = exec(g, { type: "assign", segment: firstRevealed(g, "savanna").index, delta: 1 });
      return run(g, ticksPerCycle(g) * 5).state;
    };
    const a = play();
    expect(a).toEqual(play());
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });
});
