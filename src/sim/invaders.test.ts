import { describe, expect, it } from "vitest";
import {
  advanceWithEvents,
  applyCommand,
  BIOMES,
  buildBlocker,
  BLOCKADED,
  createGame,
  economyOfPlayer,
  homePlanet,
  INVADERS,
  launchBlocker,
  novaTickNow,
  SUPERNOVA,
  TICK_MS,
  ticksPerCycle,
  type GameEvent,
  type GameState,
} from "./index";

const P1 = { id: "p1", name: "Seb" };

const clone = (g: GameState) => JSON.parse(JSON.stringify(g)) as GameState;

/** Runs whole cycles, collecting the events. */
function run(g: GameState, cycles: number, events: GameEvent[] = []): GameState {
  for (let i = 0; i < cycles; i++) {
    const r = advanceWithEvents(g, g.simTime + ticksPerCycle(g) * TICK_MS);
    events.push(...r.events);
    g = r.state;
  }
  return g;
}

/** A coop game far enough along for invaders and the shield, with plenty in stock. */
function lateGame(options: { invaders?: "off" | "normal" | "strong"; goal?: "endless" | "supernova" } = {}): GameState {
  const g = clone(createGame("goals", [P1], { now: 0, ...options }));
  const economy = economyOfPlayer(g, P1.id)!;
  economy.ascension.level = INVADERS.minLevel;
  for (const r of Object.keys(economy.resources) as (keyof typeof economy.resources)[]) economy.resources[r] = 5000;
  return g;
}

/** Runs until the next wave starts its siege. */
function untilSiege(g: GameState, events: GameEvent[]): GameState {
  for (let i = 0; i < 60 && !g.invasion?.sieging; i++) g = run(g, 1, events);
  expect(g.invasion?.sieging).toBe(true);
  return g;
}

describe("invaders", () => {
  it("come once the team reaches their level, with a warning before they arrive", () => {
    const events: GameEvent[] = [];
    let g = lateGame();
    g.economies.e0!.ascension.level = INVADERS.minLevel - 1;
    g = run(g, INVADERS.firstWaveCycles[1] + 2);
    expect(g.invasion).toBeNull();
    expect(g.nextWaveTick).toBeNull();

    g = clone(g);
    g.economies.e0!.ascension.level = INVADERS.minLevel;
    g = untilSiege(g, events);
    const spotted = events.findIndex((e) => e.type === "invasionSpotted");
    const arrived = events.findIndex((e) => e.type === "invasionArrived");
    expect(spotted).toBeGreaterThanOrEqual(0);
    expect(arrived).toBeGreaterThan(spotted);
    expect(g.invasion!.target).toBe(homePlanet(g, P1.id)!.id);
  });

  it("besieged planets cannot launch rockets", () => {
    const g = untilSiege(lateGame(), []);
    const home = homePlanet(g, P1.id)!;
    home.segments.find((s) => s.revealed && !s.building)!.building = "launchpad";
    const free = g.planets.find((p) => p.economyId === null)!;
    expect(launchBlocker(g, P1.id, home, free, "colony", 1)).toBe(BLOCKADED);
  });

  it("without defenders they wreck and kill, never leave on their own, but never wipe the team out", () => {
    const events: GameEvent[] = [];
    let g = untilSiege(lateGame(), events);
    g = clone(g);
    // Everyone at work: nobody fights back.
    const home = homePlanet(g, P1.id)!;
    const fields = home.segments.filter((s) => s.revealed);
    Object.values(g.units).forEach((u, i) => (u.segment = fields[i % fields.length]!.index));
    home.birthProgress = -1e9;
    // Freed workers fight back eventually; a mothership they can't bring down shows it never leaves.
    g.invasion!.hp = g.invasion!.maxHp = 1e6;
    const wave = g.invasion!.wave;
    g = run(g, INVADERS.siegeCycles * 4, events);
    expect(g.invasion).toMatchObject({ wave, target: home.id, sieging: true });
    expect(events.some((e) => e.type === "invasionMoved")).toBe(false);
    expect(g.nextWaveTick).toBeNull();
    expect(events.filter((e) => e.type === "siege").length).toBeGreaterThan(INVADERS.siegeCycles * 3);
    expect(Object.keys(g.units).length).toBeGreaterThanOrEqual(INVADERS.minSurvivors);
  });

  it("a fleet at the sun shield can't be fought there, so it moves on to a planet", () => {
    const events: GameEvent[] = [];
    let g = clone(lateGame());
    g.sun.shield[0] = { built: true, hp: 100 };
    g.invasion = { wave: 1, target: "sun", arrivalTick: g.tick, spotted: true, sieging: true, siegeEndTick: g.tick + ticksPerCycle(g), hp: 10, maxHp: 10, bonus: 0 };
    g.wave = 1;
    g.nextWaveTick = null;
    g = run(g, 2, events);
    const home = homePlanet(g, P1.id)!;
    expect(events).toContainEqual(expect.objectContaining({ type: "invasionMoved", from: "sun", target: home.id }));
    expect(g.invasion).toMatchObject({ target: home.id, sieging: false, hp: 10 });
    g = run(g, INVADERS.moveOnCycles + 1, events);
    expect(g.invasion?.sieging).toBe(true);
  });

  it("undefended, they burn the ground: no building, no gathering until it is cleared", () => {
    const events: GameEvent[] = [];
    let g = clone(untilSiege(lateGame(), events));
    const home = homePlanet(g, P1.id)!;
    const fields = home.segments.filter((s) => s.revealed && !s.building && BIOMES[s.biome].buildable);
    fields[0]!.building = "housing";
    // Everyone at work, no battery: nobody fights back.
    Object.values(g.units).forEach((u) => (u.segment = fields[1]!.index));
    // No births: no fresh idle inhabitant who would fight.
    home.birthProgress = -1e9;
    g = run(g, 1, events);
    const siege = events.filter((e) => e.type === "siege").at(-1) as Extract<GameEvent, { type: "siege" }>;
    expect(siege.scorched?.length).toBe(1 + INVADERS.scorchPerUndefendedRound);
    expect(homePlanet(g, P1.id)!.segments[siege.scorched![0]!]!.ruin).toBe(true);
    const burnt = homePlanet(g, P1.id)!.segments[siege.scorched![1]!]!;
    expect(burnt.scorched).toBe(true);
    expect(burnt.deposits.every((d) => d.infinite || d.amount === 0)).toBe(true);
    expect(buildBlocker(g, homePlanet(g, P1.id)!, burnt, "housing")).toBe("Verbrannte Erde: erst aufräumen");

    economyOfPlayer(g, P1.id)!.resources.food = 100; // food above the stock limit rots, the siege ate the rest
    const r = applyCommand(g, P1.id, { type: "terraform", planetId: home.id, segment: burnt.index, kind: "clearScorched" }, g.simTime);
    if (!r.ok) throw new Error(r.error);
    const cleared = homePlanet(r.state, P1.id)!.segments[burnt.index]!;
    expect(cleared.scorched).toBeUndefined();
    expect(cleared.deposits.some((d) => d.amount > 0)).toBe(true);
  });

  it("defenders keep the ground from burning even when they lose a building", () => {
    const events: GameEvent[] = [];
    const g = run(clone(untilSiege(lateGame(), events)), 1, events);
    const siege = events.filter((e) => e.type === "siege").at(-1) as Extract<GameEvent, { type: "siege" }>;
    expect(siege.scorched).toBeUndefined();
    expect(homePlanet(g, P1.id)!.segments.some((s) => s.scorched)).toBe(false);
  });

  it("batteries shoot the mothership down and the team earns a reward", () => {
    const events: GameEvent[] = [];
    let g = clone(untilSiege(lateGame(), events));
    const home = homePlanet(g, P1.id)!;
    const units = Object.values(g.units);
    // Two batteries manned with all hands are more than enough for the first wave.
    const spots = home.segments.filter((s) => s.revealed && !s.building).slice(0, 2);
    for (const s of spots) s.building = "battery";
    units.forEach((u, i) => (u.segment = spots[i % 2]!.index));
    g.invasion!.hp = 2;
    const science = g.economies.e0!.resources.science;
    g = run(g, 1, events);
    expect(events).toContainEqual(expect.objectContaining({ type: "invasionDefeated", wave: 1 }));
    expect(g.invasion).toBeNull();
    expect(g.economies.e0!.resources.science).toBeGreaterThanOrEqual(science + INVADERS.reward.science);
  });

  it("stay away when switched off and in versus", () => {
    expect(run(lateGame({ invaders: "off" }), 40).invasion).toBeNull();
    const v = clone(createGame("vs", [P1, { id: "p2", name: "Mo" }], { now: 0, mode: "versus" }));
    for (const e of Object.values(v.economies)) e.ascension.level = 9;
    const after = run(v, 40);
    expect(after.invasion).toBeNull();
    expect(after.sun.novaTick).toBeNull();
  });
});

describe("supernova", () => {
  it("ends a coop game when the shield is missing", () => {
    const events: GameEvent[] = [];
    let g = lateGame({ invaders: "off" });
    g.sun.novaTick = 3 * ticksPerCycle(g);
    g = run(g, 4, events);
    expect(g.result).toEqual({ supernova: true });
    expect(events).toContainEqual({ type: "gameOver", result: { supernova: true } });
  });

  it("a shield flight builds a segment, delays the nova and brings the crew home", () => {
    const events: GameEvent[] = [];
    let g = lateGame({ invaders: "off" });
    const home = homePlanet(g, P1.id)!;
    home.segments.find((s) => s.revealed && !s.building)!.building = "launchpad";
    const nova = novaTickNow(g)!;
    const people = Object.keys(g.units).length;
    const r = applyCommand(g, P1.id, { type: "shieldFlight", planetId: home.id, segment: 3, repair: false }, g.simTime);
    if (!r.ok) throw new Error(r.error);
    g = r.state;
    expect(Object.keys(g.units).length).toBe(people - SUPERNOVA.crew);
    expect(applyCommand(g, P1.id, { type: "shieldFlight", planetId: home.id, segment: 3, repair: false }, g.simTime)).toEqual({ ok: false, error: "Dorthin ist schon eine Mannschaft unterwegs" });

    for (let i = 0; i < 20 && !g.sun.shield[3]!.built; i++) g = run(g, 1, events);
    expect(g.sun.shield[3]).toEqual({ built: true, hp: 100 });
    expect(novaTickNow(g)).toBe(nova + SUPERNOVA.delayPerSegmentCycles * ticksPerCycle(g));
    for (let i = 0; i < 20 && g.flights.length; i++) g = run(g, 1, events);
    expect(events).toContainEqual(expect.objectContaining({ type: "landed", planetId: home.id, count: SUPERNOVA.crew }));
    expect(events).toContainEqual(expect.objectContaining({ type: "shieldBuilt", segment: 3, repaired: false }));
  });

  it("a complete working shell saves the sun", () => {
    const events: GameEvent[] = [];
    let g = lateGame({ invaders: "off" });
    const home = homePlanet(g, P1.id)!;
    home.segments.find((s) => s.revealed && !s.building)!.building = "launchpad";
    g.sun.shield = g.sun.shield.map((_, i) => (i === 0 ? { built: false, hp: 0 } : { built: true, hp: 100 }));
    const r = applyCommand(g, P1.id, { type: "shieldFlight", planetId: home.id, segment: 0, repair: false }, g.simTime);
    if (!r.ok) throw new Error(r.error);
    g = r.state;
    for (let i = 0; i < 20 && !g.sun.saved; i++) g = run(g, 1, events);
    expect(g.sun.saved).toBe(true);
    expect(novaTickNow(g)).toBeNull();
    expect(events).toContainEqual({ type: "shieldComplete" });
  });
});
