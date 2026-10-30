import { describe, expect, it } from "vitest";
import {
  advanceWithEvents,
  applyCommand,
  buildBlocker,
  createGame,
  economyOfPlayer,
  flightPlan,
  homePlanet,
  launchBlocker,
  RESOURCE_IDS,
  TICK_MS,
  upgradeState,
  WARP,
  type Command,
  type GameEvent,
  type GameState,
} from "./index";

const P1 = { id: "p1", name: "Seb" };

function exec(g: GameState, cmd: Command): { state: GameState; events: GameEvent[] } {
  const result = applyCommand(g, P1.id, cmd, g.simTime);
  if (!result.ok) throw new Error(result.error);
  return result;
}

/** Rich team at level 10 with free inhabitants at home. */
function rich(seed: string): GameState {
  const g = createGame(seed, [P1], { now: 0 });
  const economy = economyOfPlayer(g, P1.id)!;
  for (const r of RESOURCE_IDS) economy.resources[r] = 500;
  economy.ascension.level = 10;
  return g;
}

function gateSegment(g: GameState): number {
  const home = homePlanet(g, P1.id)!;
  return home.segments.find((s) => !buildBlocker(g, home, s, "warpgate"))!.index;
}

function withGate(seed: string): { state: GameState; events: GameEvent[] } {
  const g = rich(seed);
  return exec(g, { type: "build", planetId: homePlanet(g, P1.id)!.id, segment: gateSegment(g), building: "warpgate" });
}

describe("warp systems", () => {
  it("are not in the state before the first warp gate", () => {
    const g = rich("galaxy");
    expect(g.systems).toBeUndefined();
    expect(g.planets.every((p) => p.system === undefined)).toBe(true);
  });

  it("the first warp gate finds five systems, one or two of them inhabited", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      const { state, events } = withGate(seed);
      expect(state.systems).toHaveLength(WARP.systems);
      const inhabited = state.systems!.filter((s) => s.faction);
      expect(inhabited.length).toBeGreaterThanOrEqual(1);
      expect(inhabited.length).toBeLessThanOrEqual(2);
      expect(events).toContainEqual({ type: "systemsFound", count: 5, inhabited: inhabited.length });
      for (const sys of inhabited) {
        const settled = state.planets.filter((p) => p.system === sys.index && p.economyId !== null);
        expect(settled.length).toBeGreaterThanOrEqual(Math.min(WARP.settledPlanets, state.planets.filter((p) => p.system === sys.index).length));
        expect(state.factions.some((f) => f.id === sys.faction)).toBe(true);
      }
      // Every exotic resource lies in a system nobody lives in.
      const empty = state.systems!.filter((s) => !s.faction);
      for (const r of ["antimatter", "neutronium", "xenocrystal"]) expect(empty.some((s) => s.specialties.includes(r as never))).toBe(true);
    }
  });

  it("are the same for the same seed, whenever the gate is built", () => {
    const a = withGate("same").state;
    let b = rich("same");
    b = advanceWithEvents(b, 60_000).state;
    for (const r of RESOURCE_IDS) economyOfPlayer(b, P1.id)!.resources[r] = 500;
    b = exec(b, { type: "build", planetId: homePlanet(b, P1.id)!.id, segment: gateSegment(b), building: "warpgate" }).state;
    const strip = (g: GameState) => g.planets.filter((p) => p.system).map((p) => ({ id: p.id, name: p.name, type: p.type, biomes: p.segments.map((s) => s.biome), deposits: p.segments.map((s) => s.deposits.map((d) => d.resource)) }));
    expect(strip(b)).toEqual(strip(a));
    expect(b.systems!.map((s) => s.faction !== null)).toEqual(a.systems!.map((s) => s.faction !== null));
  });

  it("only the warp ship reaches other systems, and it needs the gate", () => {
    const { state } = withGate("fly");
    const home = homePlanet(state, P1.id)!;
    const target = state.planets.find((p) => p.system && p.economyId === null)!;
    expect(launchBlocker(state, P1.id, home, target, "colony", 1)).toMatch(/Warpschiff/);
    expect(launchBlocker(state, P1.id, home, target, "warp", 2)).toBeNull();
    const local = state.planets.find((p) => !p.system && p.id !== home.id && p.type !== "asteroid")!;
    expect(launchBlocker(state, P1.id, home, local, "warp", 1)).toMatch(/nur in andere/);
  });

  it("burns ätherite without antimatter, antimatter once there is some", () => {
    const { state } = withGate("fuel");
    const economy = economyOfPlayer(state, P1.id)!;
    const home = homePlanet(state, P1.id)!;
    const target = state.planets.find((p) => p.system && p.economyId === null)!;
    economy.resources.antimatter = 0;
    const first = flightPlan(home, target, "warp", 2, economy);
    expect(first.cost.antimatter).toBeUndefined();
    expect(first.cost.aetherite).toBeGreaterThan(0);
    economy.resources.antimatter = 50;
    const later = flightPlan(home, target, "warp", 2, economy);
    expect(later.cost.antimatter).toBeGreaterThan(0);
    expect(later.cost.aetherite).toBeUndefined();
    expect(later.seconds).toBe(WARP.seconds);
  });

  it("a warp ship settles a planet in another system", () => {
    let { state } = withGate("settle");
    const home = homePlanet(state, P1.id)!;
    const target = state.planets.find((p) => p.system && p.economyId === null)!;
    state = exec(state, { type: "launch", planetId: home.id, to: target.id, rocket: "warp", count: 2 }).state;
    state = advanceWithEvents(state, state.simTime + (WARP.seconds + 1) * 1000).state;
    const landed = state.planets.find((p) => p.id === target.id)!;
    expect(landed.economyId).toBe(economyOfPlayer(state, P1.id)!.id);
    expect(Object.values(state.units).filter((u) => u.planetId === target.id && u.owner === P1.id)).toHaveLength(2);
  });

  it("the foreign peoples run as factions without breaking the game", () => {
    let { state } = withGate("aliens");
    state = advanceWithEvents(state, state.simTime + 600 * TICK_MS * 10).state;
    const aliens = state.systems!.filter((s) => s.faction).map((s) => s.faction!);
    for (const id of aliens) {
      const faction = state.factions.find((f) => f.id === id)!;
      expect(faction.eliminated).toBe(false);
      // They stay in their own system.
      const economyId = state.players.find((p) => p.id === id)!.economyId;
      const system = state.systems!.find((s) => s.faction === id)!.index;
      expect(state.planets.filter((p) => p.economyId === economyId).every((p) => p.system === system)).toBe(true);
    }
  });

  it("cannot be built in versus", () => {
    const g = createGame("vs", [P1], { now: 0, mode: "versus", maxPlayers: 2 });
    const economy = economyOfPlayer(g, P1.id)!;
    for (const r of RESOURCE_IDS) economy.resources[r] = 500;
    economy.ascension.level = 10;
    const home = homePlanet(g, P1.id)!;
    const seg = home.segments.find((s) => s.revealed && s.biome !== "ocean" && !s.building)!;
    expect(buildBlocker(g, home, seg, "warpgate")).toBe("Nur im Miteinander");
  });
  it("have 7 to 12 planets, hot ones near the sun and ice far out (Seb)", () => {
    const heat = { lava: 0, toxic: 1, arid: 2, temperate: 3, ocean: 4, ice: 5 } as Record<string, number>;
    for (const seed of ["a", "b", "c", "d"]) {
      const { state } = withGate(seed);
      for (const sys of state.systems!) {
        const planets = state.planets.filter((p) => p.system === sys.index).sort((a, b) => a.orbit.radius - b.orbit.radius);
        expect(planets.length).toBeGreaterThanOrEqual(7);
        expect(planets.length).toBeLessThanOrEqual(12);
        expect(planets[0]!.orbit.radius).toBe(1);
        expect(planets.at(-1)!.orbit.radius).toBeCloseTo(WARP.maxOrbit);
        // No ice in the inner half, no lava in the outer half.
        planets.forEach((p, i) => {
          if (i < planets.length / 2) expect(p.type).not.toBe("ice");
          else expect(p.type).not.toBe("lava");
        });
        expect(heat[planets[0]!.type]).toBeLessThan(heat[planets.at(-1)!.type]!);
        // Foreign peoples live in the middle, never on the innermost or outermost planet.
        if (sys.faction) {
          const settled = planets.filter((p) => p.economyId !== null);
          expect(settled).not.toContain(planets[0]);
          expect(settled).not.toContain(planets.at(-1));
        }
      }
    }
  });

  it("systems found with fewer planets get the rest on load", () => {
    const { state } = withGate("grow");
    const sys = state.systems![0]!;
    // Like an old save: only three planets in that system.
    const own = state.planets.filter((p) => p.system === sys.index);
    const keep = own.slice(0, 3).map((p) => p.id);
    state.planets = state.planets.filter((p) => p.system !== sys.index || keep.includes(p.id));
    const before = JSON.parse(JSON.stringify(state.planets.filter((p) => keep.includes(p.id))));
    const up = upgradeState(JSON.parse(JSON.stringify(state)))!;
    const after = up.planets.filter((p) => p.system === sys.index);
    expect(after.length).toBeGreaterThanOrEqual(7);
    expect(new Set(after.map((p) => p.id)).size).toBe(after.length);
    expect(new Set(up.planets.map((p) => p.name)).size).toBe(up.planets.length);
    // The old planets keep everything but their orbit.
    for (const old of before) {
      const now = after.find((p) => p.id === old.id)!;
      expect({ ...now, orbit: null }).toEqual({ ...old, orbit: null });
    }
    // Loading again changes nothing.
    expect(upgradeState(JSON.parse(JSON.stringify(up)))).toEqual(up);
  });
});
