import { describe, expect, it } from "vitest";
import {
  addPlayer,
  advanceWithEvents,
  applyCommand,
  createGame,
  economyOfPlayer,
  empActive,
  factionById,
  homePlanet,
  launchBlocker,
  MISSILES,
  planetIntercept,
  planetShield,
  radarIn,
  RESOURCE_IDS,
  ringDistance,
  TICK_MS,
  ticksPerCycle,
  unitsOn,
  type BuildingId,
  type Command,
  type GameEvent,
  type GameState,
  type RocketId,
} from "./index";

const P1 = { id: "p1", name: "Seb" };
const MO = { id: "p2", name: "Mo" };

const clone = (g: GameState) => JSON.parse(JSON.stringify(g)) as GameState;

function rich(g: GameState, playerId: string, level: number): void {
  const economy = economyOfPlayer(g, playerId)!;
  for (const r of RESOURCE_IDS) economy.resources[r] = 500;
  economy.ascension.level = level;
}

/** Puts a building on the next free land field of the player's home planet (optionally with a worker). */
function place(g: GameState, playerId: string, building: BuildingId, worked = false): number {
  const home = homePlanet(g, playerId)!;
  const s = home.segments.find((x) => x.revealed && x.biome !== "ocean" && !x.building)!;
  s.building = building;
  s.builtBy = playerId;
  if (worked) unitsOn(g, home.id, playerId).find((u) => u.segment === null)!.segment = s.index;
  return s.index;
}

/** A versus duel past the nuke protection, both sides rich and at level 9, P1 with a manned silo. */
function duel(): GameState {
  const r = addPlayer(createGame("missiles", [P1], { now: 0, mode: "versus", maxPlayers: 2 }), MO.id, MO.name, 0);
  if (!r.ok) throw new Error(r.error);
  const g = clone(r.state);
  for (const p of [P1, MO]) rich(g, p.id, 9);
  place(g, P1.id, "missile-silo", true);
  g.tick += (MISSILES.startProtectionCycles + 1) * ticksPerCycle(g);
  return g;
}

function fire(g: GameState, rocket: RocketId, segment?: number, from = P1.id, to = MO.id): { state: GameState; events: GameEvent[] } {
  const cmd: Command = { type: "launch", planetId: homePlanet(g, from)!.id, to: homePlanet(g, to)!.id, rocket, count: 0, ...(segment !== undefined ? { segment } : {}) };
  const r = applyCommand(g, from, cmd, g.simTime);
  if (!r.ok) throw new Error(r.error);
  return r;
}

const arrive = (g: GameState) => advanceWithEvents(g, g.simTime + (g.flights[0]!.arrivalTick - g.tick + 1) * TICK_MS);
const hits = (events: GameEvent[]) => events.filter((e) => e.type === "missileHit");

describe("missiles", () => {
  it("need a manned silo, the level, and stay inside the sun system", () => {
    const g = duel();
    const from = homePlanet(g, P1.id)!;
    const to = homePlanet(g, MO.id)!;
    expect(launchBlocker(g, P1.id, from, to, "homing", 0, 0)).toBeNull();
    expect(launchBlocker(g, P1.id, from, to, "homing", 0)).toBe("Erst ein Zielfeld wählen");
    expect(launchBlocker(g, P1.id, from, to, "homing", 1, 0)).toBe("Raketen fliegen ohne Besatzung");
    expect(launchBlocker(g, MO.id, to, from, "homing", 0, 0)).toBe("Dafür braucht es ein besetztes Raketensilo");
    economyOfPlayer(g, P1.id)!.ascension.level = 8;
    expect(launchBlocker(g, P1.id, from, to, "nuke", 0, 0)).toBe("Atomrakete ab Stufe 9");
    const far = { ...to, id: "x", system: 1 };
    expect(launchBlocker(g, P1.id, from, far, "emp", 0)).toBe("Raketen ohne Besatzung fliegen nur im eigenen Sonnensystem");
  });

  it("a homing missile wrecks the building on its field", () => {
    const g = duel();
    const target = place(g, MO.id, "flak", true);
    const { state, events } = arrive(fire(g, "homing", target).state);
    expect(hits(events)).toContainEqual(expect.objectContaining({ rocket: "homing", intercepted: false, destroyed: ["flak"], killed: 0 }));
    const s = homePlanet(state, MO.id)!.segments[target]!;
    expect(s.building).toBeNull();
    expect(s.ruin).toBe(true);
    // The crew survived and stands idle.
    expect(unitsOn(state, homePlanet(state, MO.id)!.id, MO.id).every((u) => u.segment !== target)).toBe(true);
  });

  it("missile defense downs one missile per worker and cycle, flak catches homing missiles sometimes", () => {
    let g = duel();
    place(g, MO.id, "missile-defense", true);
    const target = place(g, MO.id, "farm");
    let r = arrive(fire(g, "homing", target).state);
    expect(hits(r.events)).toContainEqual(expect.objectContaining({ intercepted: true, destroyed: [] }));
    // Used up for this cycle: the second one gets through.
    g = r.state;
    r = arrive(fire(g, "homing", target).state);
    expect(hits(r.events)).toContainEqual(expect.objectContaining({ intercepted: false, destroyed: ["farm"] }));
  });

  it("an EMP shuts down power, shield and flak for a while; pits still work", () => {
    const g = duel();
    place(g, MO.id, "shield-generator", true);
    place(g, MO.id, "flak", true);
    place(g, MO.id, "pitfall");
    const home = homePlanet(g, MO.id)!;
    expect(planetShield(g, home)).toBe(1);
    expect(planetIntercept(g, home)).toBe(2);
    const { state, events } = arrive(fire(g, "emp").state);
    expect(hits(events)).toContainEqual(expect.objectContaining({ rocket: "emp", emp: true }));
    const hit = homePlanet(state, MO.id)!;
    expect(empActive(state, hit)).toBe(true);
    expect(planetShield(state, hit)).toBe(0);
    expect(planetIntercept(state, hit)).toBe(1);
    const later = advanceWithEvents(state, state.simTime + (MISSILES.empCycles * ticksPerCycle(state) + 1) * TICK_MS).state;
    expect(empActive(later, homePlanet(later, MO.id)!)).toBe(false);
    expect(planetShield(later, homePlanet(later, MO.id)!)).toBe(1);
  });

  it("a nuke wrecks and irradiates the fields around its target and kills the people there", () => {
    const g = duel();
    const target = place(g, MO.id, "farm", true);
    const home = homePlanet(g, MO.id)!;
    const before = unitsOn(g, home.id, MO.id).length;
    const { state, events } = arrive(fire(g, "nuke", target).state);
    const hit = hits(events)[0] as Extract<GameEvent, { type: "missileHit" }>;
    expect(hit.destroyed).toContain("farm");
    expect(hit.killed).toBeGreaterThan(0);
    expect(unitsOn(state, home.id, MO.id).length).toBe(before - hit.killed);
    const n = home.segments.length;
    for (const s of homePlanet(state, MO.id)!.segments) {
      const inside = ringDistance(s.index, target, n) <= MISSILES.nukeRadius;
      expect(!!s.irradiated).toBe(inside);
      if (inside) expect(s.scorched).toBe(true);
    }
    // The silo loads the next one for a few cycles; missiles never conquer.
    expect(homePlanet(state, MO.id)!.economyId).toBe(homePlanet(g, MO.id)!.economyId);
    expect(launchBlocker(state, P1.id, homePlanet(state, P1.id)!, homePlanet(state, MO.id)!, "nuke", 0, target)).toBe("Das Silo lädt noch die nächste Atomrakete");
  });

  it("a worked shield shrinks the blast; start planets are safe early on", () => {
    let g = duel();
    place(g, MO.id, "shield-generator", true);
    const target = place(g, MO.id, "farm");
    const { state } = arrive(fire(g, "nuke", target).state);
    expect(homePlanet(state, MO.id)!.segments.filter((s) => s.irradiated)).toHaveLength(MISSILES.shieldedNukeRadius * 2 + 1);
    g = duel();
    g.tick = 0;
    expect(launchBlocker(g, P1.id, homePlanet(g, P1.id)!, homePlanet(g, MO.id)!, "nuke", 0, 0)).toBe(`Startplaneten sind die ersten ${MISSILES.startProtectionCycles} Umläufe vor Atomraketen sicher`);
  });

  it("the dropship carries 8 and its armor shrugs off one interception", () => {
    const g = duel();
    place(g, P1.id, "launchpad");
    for (let i = 0; i < 8; i++) {
      const home = homePlanet(g, P1.id)!;
      const first = unitsOn(g, home.id, P1.id)[0]!;
      const id = `u${g.nextUnitId++}`;
      g.units[id] = { ...first, id, segment: null };
    }
    place(g, MO.id, "pitfall");
    const r = applyCommand(g, P1.id, { type: "launch", planetId: homePlanet(g, P1.id)!.id, to: homePlanet(g, MO.id)!.id, rocket: "dropship", count: 8 }, g.simTime);
    if (!r.ok) throw new Error(r.error);
    const { events } = arrive(r.state);
    const battle = events.find((e) => e.type === "battle") as Extract<GameEvent, { type: "battle" }>;
    expect(battle.intercepted ?? 0).toBe(0);
  });

  it("radar sees across its own sun system only while manned", () => {
    const g = duel();
    expect(radarIn(g, homePlanet(g, MO.id)!.economyId, 0)).toBe(false);
    place(g, MO.id, "radar", true);
    expect(radarIn(g, homePlanet(g, MO.id)!.economyId, 0)).toBe(true);
    expect(radarIn(g, homePlanet(g, MO.id)!.economyId, 1)).toBe(false);
  });
});

describe("missiles in coop", () => {
  it("a homing missile hits the mothership besieging an own planet", () => {
    const g = clone(createGame("hunt", [P1], { now: 0 }));
    rich(g, P1.id, 9);
    place(g, P1.id, "missile-silo", true);
    const home = homePlanet(g, P1.id)!;
    expect(launchBlocker(g, P1.id, home, home, "homing", 0)).toBe("Ziel ist der Startplanet");
    g.invasion = { wave: 1, target: home.id, arrivalTick: 0, spotted: true, sieging: true, siegeEndTick: 0, hp: 10, maxHp: 10, bonus: 0 };
    expect(launchBlocker(g, P1.id, home, home, "homing", 0)).toBeNull();
    expect(launchBlocker(g, P1.id, home, home, "nuke", 0)).toBe("Ziel ist der Startplanet");
    const { state, events } = arrive(fire(g, "homing", undefined, P1.id, P1.id).state);
    expect(hits(events)).toContainEqual(expect.objectContaining({ invaderDamage: MISSILES.invaderDamage }));
    expect(state.invasion?.hp).toBe(10 - MISSILES.invaderDamage);
    const second = arrive(fire(state, "homing", undefined, P1.id, P1.id).state);
    expect(second.state.invasion).toBeNull();
    expect(second.events).toContainEqual(expect.objectContaining({ type: "invasionDefeated" }));
  });

  it("against factions only in war; a nuked faction refuses peace for a while", () => {
    const g = clone(createGame("nukewar", [P1], { now: 0, factions: 2 }));
    rich(g, P1.id, 9);
    place(g, P1.id, "missile-silo", true);
    g.tick += (MISSILES.startProtectionCycles + 1) * ticksPerCycle(g);
    const faction = g.factions[0]!;
    const target = g.planets.find((p) => p.economyId === economyOfPlayer(g, faction.id)!.id)!;
    const from = homePlanet(g, P1.id)!;
    expect(launchBlocker(g, P1.id, from, target, "nuke", 0, 0)).toBe("Dafür müsste Krieg herrschen");
    faction.stance = "war";
    expect(launchBlocker(g, P1.id, from, target, "nuke", 0, 0)).toBeNull();
    const r = applyCommand(g, P1.id, { type: "launch", planetId: from.id, to: target.id, rocket: "nuke", count: 0, segment: 0 }, g.simTime);
    if (!r.ok) throw new Error(r.error);
    const { state } = arrive(r.state);
    const after = factionById(state, faction.id)!;
    expect(after.noPeaceUntilTick).toBeGreaterThan(state.tick);
    after.nextProposalTick = 0;
    after.attitude = 100;
    const peace = applyCommand(state, P1.id, { type: "diplomacy", faction: faction.id, action: "peace" }, state.simTime);
    expect(peace.ok).toBe(false);
  });

  it("factions at war fire missiles at the team's defenses", () => {
    let g = clone(createGame("aimissile", [P1], { now: 0, factions: 2 }));
    const faction = g.factions[0]!;
    rich(g, faction.id, 7);
    faction.stance = "war";
    faction.personality = "builder";
    faction.nextAttackTick = 0;
    const tower = place(g, P1.id, "watchtower");
    const events: GameEvent[] = [];
    for (let i = 0; i < 3 && !g.flights.some((f) => f.rocket === "homing"); i++) {
      const r = advanceWithEvents(g, g.simTime + ticksPerCycle(g) * TICK_MS);
      events.push(...r.events);
      g = r.state;
      g.factions[0]!.nextAttackTick = 0;
    }
    const missile = g.flights.find((f) => f.rocket === "homing" && f.owner === faction.id);
    expect(missile?.segment).toBe(tower);
  });
});
