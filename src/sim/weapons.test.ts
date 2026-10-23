import { describe, expect, it } from "vitest";
import {
  addPlayer,
  advanceWithEvents,
  applyCommand,
  createGame,
  economyOfPlayer,
  homePlanet,
  INVADERS,
  planetAttackBonus,
  planetIntercept,
  RESOURCE_IDS,
  RULES,
  TICK_MS,
  ticksPerCycle,
  unitsOn,
  type BuildingId,
  type GameEvent,
  type GameState,
} from "./index";

const P1 = { id: "p1", name: "Seb" };
const MO = { id: "p2", name: "Mo" };

const clone = (g: GameState) => JSON.parse(JSON.stringify(g)) as GameState;

function rich(g: GameState, playerId: string, level: number): void {
  const economy = economyOfPlayer(g, playerId)!;
  for (const r of RESOURCE_IDS) economy.resources[r] = 500;
  economy.ascension.level = level;
}

/** Puts a building on the next free land field of the player's home planet. */
function place(g: GameState, playerId: string, building: BuildingId): number {
  const home = homePlanet(g, playerId)!;
  const s = home.segments.find((x) => x.revealed && x.biome !== "ocean" && !x.building)!;
  s.building = building;
  s.builtBy = playerId;
  return s.index;
}

function versusGame(): GameState {
  const r = addPlayer(createGame("duel", [P1], { now: 0, mode: "versus", maxPlayers: 2 }), MO.id, MO.name, 0);
  if (!r.ok) throw new Error(r.error);
  const g = clone(r.state);
  for (const p of [P1, MO]) {
    rich(g, p.id, 9);
    place(g, p.id, "launchpad");
  }
  return g;
}

function attack(g: GameState, count: number): { state: GameState; events: GameEvent[] } {
  const r = applyCommand(g, P1.id, { type: "launch", planetId: homePlanet(g, P1.id)!.id, to: homePlanet(g, MO.id)!.id, rocket: "combat", count }, g.simTime);
  if (!r.ok) throw new Error(r.error);
  return r;
}

const arrive = (g: GameState) => advanceWithEvents(g, g.simTime + (g.flights[0]!.arrivalTick - g.tick + 1) * TICK_MS);

describe("weapons in versus", () => {
  it("pitfalls take attackers before anyone rolls, up to the cap", () => {
    const g = versusGame();
    for (let i = 0; i < RULES.maxIntercept + 1; i++) place(g, MO.id, "pitfall");
    expect(planetIntercept(g, homePlanet(g, MO.id)!)).toBe(RULES.maxIntercept);
    const { events } = arrive(attack(g, 2).state);
    expect(events).toContainEqual(expect.objectContaining({ type: "battle", won: false, attackerLosses: 2, defenderLosses: 0, intercepted: 2 }));
  });

  it("flak only shoots while someone mans it", () => {
    const g = versusGame();
    const flak = place(g, MO.id, "flak");
    const home = homePlanet(g, MO.id)!;
    expect(planetIntercept(g, home)).toBe(0);
    unitsOn(g, home.id, MO.id)[0]!.segment = flak;
    expect(planetIntercept(g, home)).toBe(1);
  });

  it("worked barracks give the combat rocket a roll bonus", () => {
    let g = versusGame();
    const barracks = place(g, P1.id, "barracks");
    expect(planetAttackBonus(g, homePlanet(g, P1.id)!)).toBe(0);
    unitsOn(g, homePlanet(g, P1.id)!.id, P1.id)[0]!.segment = barracks;
    g = attack(g, 1).state;
    expect(g.flights[0]!.attackBonus).toBe(1);
  });
});

/** A coop game with a big enough team, rich, at the invaders' level, sieged by wave 1. */
function sieged(): GameState {
  let g = clone(createGame("goals", [P1], { now: 0 }));
  rich(g, P1.id, Math.max(INVADERS.minLevel, 9));
  const first = Object.values(g.units)[0]!;
  for (let i = Object.keys(g.units).length; i < INVADERS.minPeople; i++) {
    const id = `u${g.nextUnitId++}`;
    g.units[id] = { ...first, id };
  }
  for (let i = 0; i < 80 && !g.invasion?.sieging; i++) g = advanceWithEvents(g, g.simTime + ticksPerCycle(g) * TICK_MS).state;
  expect(g.invasion?.sieging).toBe(true);
  return clone(g);
}

const cycle = (g: GameState) => advanceWithEvents(g, g.simTime + ticksPerCycle(g) * TICK_MS);

describe("weapons against invaders", () => {
  it("missile launchers burn fuel per shot and stay silent without it", () => {
    const g = sieged();
    const launcher = place(g, P1.id, "missile-launcher");
    for (const u of unitsOn(g, homePlanet(g, P1.id)!.id, P1.id).slice(0, 2)) u.segment = launcher;
    g.invasion!.hp = g.invasion!.maxHp = 1000;
    const economy = economyOfPlayer(g, P1.id)!;
    economy.resources.fuel = 3;
    const { state, events } = cycle(g);
    const siege = events.find((e) => e.type === "siege") as Extract<GameEvent, { type: "siege" }>;
    // Fuel for one shot: 4 hits from the launcher, the rest from idle defenders.
    expect(siege.damage).toBeGreaterThanOrEqual(4);
    expect(economyOfPlayer(state, P1.id)!.resources.fuel).toBeLessThan(2);
  });

  it("a worked shield generator keeps every building standing", () => {
    const g = sieged();
    const gen = place(g, P1.id, "shield-generator");
    const home = homePlanet(g, P1.id)!;
    unitsOn(g, home.id, P1.id)[0]!.segment = gen;
    g.invasion!.hp = g.invasion!.maxHp = 1000;
    const built = home.segments.filter((s) => s.building).length;
    const { state, events } = cycle(g);
    const siege = events.find((e) => e.type === "siege") as Extract<GameEvent, { type: "siege" }>;
    expect(siege.destroyed).toBeNull();
    expect(siege.scorched).toBeUndefined();
    expect(homePlanet(state, P1.id)!.segments.filter((s) => s.building).length).toBe(built);
  });

  it("the ion cannon hits hard", () => {
    const g = sieged();
    const cannon = place(g, P1.id, "ion-cannon");
    for (const u of unitsOn(g, homePlanet(g, P1.id)!.id, P1.id)) u.segment = cannon;
    g.invasion!.hp = g.invasion!.maxHp = 1000;
    const siege = cycle(g).events.find((e) => e.type === "siege") as Extract<GameEvent, { type: "siege" }>;
    expect(siege.damage).toBeGreaterThanOrEqual(16);
  });
});
