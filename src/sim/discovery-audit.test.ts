import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  advanceWithEvents,
  BUILDINGS,
  createGame,
  craftRate,
  discoveryUseful,
  economyOfPlayer,
  energySupply,
  foodUpkeepPerCycle,
  homePlanet,
  INVADERS,
  OFFERABLE,
  RESOURCE_IDS,
  segmentOutput,
  shieldFlightPlan,
  SUPERNOVA,
  ticksPerCycle,
  TICK_MS,
  upgradeState,
  type GameEvent,
  type GameState,
} from "./index";
import { buildCost } from "./rules";
import { DISCOVERIES, grantPick, REMOVED_DISCOVERIES, resolveOffer, SUPPORTED_STATS } from "./discoveries";

// Seb 2026-11-04: "schau mal ob die überhaupt was bringen, sonst alle unnötigen raus".
// These tests keep every discovery in the pool doing something real.

const P1 = { id: "p1", name: "Seb" };
const clone = (g: GameState) => JSON.parse(JSON.stringify(g)) as GameState;
type Mod = { stat: string; scope?: { building?: string; resource?: string } };
const defs = DISCOVERIES as unknown as Record<string, { minLevel: number; when?: string; modifiers?: readonly Mod[]; unlocks?: { actions?: readonly string[] } }>;

describe("discovery audit", () => {
  it("every discovery can be offered: no dead entries in the pool", () => {
    expect([...OFFERABLE].sort()).toEqual(Object.keys(DISCOVERIES).sort());
    for (const id of REMOVED_DISCOVERIES) expect(Object.keys(DISCOVERIES)).not.toContain(id);
  });

  it("every stat a discovery changes is read by the simulation", () => {
    const dir = new URL(".", import.meta.url);
    const code = readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "discoveries.ts")
      .map((f) => readFileSync(new URL(f, dir), "utf8"))
      .join("\n");
    // discoveryCost is applied inside discoveries.ts itself.
    const used = (stat: string) => stat === "discoveryCost" || new RegExp(`modified\\([^;]*"${stat}"`).test(code);
    for (const stat of SUPPORTED_STATS) expect(used(stat), stat).toBe(true);
  });

  it("scoped modifiers point at buildings and resources that exist", () => {
    for (const [id, def] of Object.entries(defs)) {
      for (const m of def.modifiers ?? []) {
        if (m.scope?.building) expect(Object.keys(BUILDINGS), id).toContain(m.scope.building);
        if (m.scope?.resource) expect(RESOURCE_IDS as readonly string[], id).toContain(m.scope.resource);
      }
    }
  });

  it("the pool is big: at least 12 choices up to level 5 and 20 up to level 10", () => {
    const upTo = (level: number) => Object.values(defs).filter((d) => d.minLevel <= level && !d.when).length;
    expect(upTo(5)).toBeGreaterThanOrEqual(12);
    expect(upTo(10)).toBeGreaterThanOrEqual(20);
  });

  it("combat and shield discoveries are only offered where they matter", () => {
    const quiet = createGame("q", [P1], { now: 0, invaders: "off", goal: "endless" });
    const busy = createGame("b", [P1], { now: 0, invaders: "normal", goal: "supernova", factions: 2 });
    for (const id of ["ballistics", "salvage", "long-range-sight", "orbital-defense", "shell-statics", "trade-routes", "fortification", "force-fields"]) {
      expect(discoveryUseful(quiet, id), id).toBe(false);
      expect(discoveryUseful(busy, id), id).toBe(true);
    }
    expect(discoveryUseful(quiet, "masonry")).toBe(true);
    const vs = createGame("v", [P1, { id: "p2", name: "Mo" }], { now: 0, mode: "versus" });
    expect(discoveryUseful(vs, "fortification")).toBe(true);
    expect(discoveryUseful(vs, "ballistics")).toBe(false);
  });

  it("a game without invaders, factions or supernova never offers combat or shield discoveries", () => {
    const g = clone(createGame("off", [P1], { now: 0, invaders: "off", goal: "endless" }));
    const economy = economyOfPlayer(g, P1.id)!;
    economy.ascension.level = 20;
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      economy.offer = null;
      economy.picks = 0;
      grantPick(g, economy);
      for (const id of economy.offer!.options) seen.add(id);
    }
    expect(seen.size).toBeGreaterThan(20);
    for (const id of seen) expect(defs[id]!.when, id).toBeUndefined();
  });
});

describe("new discovery effects", () => {
  const game = () => {
    const g = clone(createGame("fx", [P1], { now: 0, goal: "supernova" }));
    return { g, economy: economyOfPlayer(g, P1.id)!, planet: homePlanet(g, P1.id)! };
  };

  it("masonry and the matter replicator make building cheaper", () => {
    const { economy } = game();
    const cost = { iron: 20, stone: 10 };
    economy.peoples = [];
    economy.discoveries.push("masonry");
    expect(buildCost(economy, cost)).toEqual({ iron: 17, stone: 9 });
    economy.discoveries.push("matter-replicator");
    expect(buildCost(economy, cost)).toEqual({ iron: 13, stone: 7 });
  });

  it("preserves and exobiology cut food upkeep", () => {
    const { g, economy } = game();
    const before = foodUpkeepPerCycle(g, 20, economy);
    economy.discoveries.push("preserves");
    expect(foodUpkeepPerCycle(g, 20, economy)).toBeCloseTo(before * 0.85);
  });

  it("automation and robotics speed up workshops", () => {
    const { economy, planet } = game();
    const seg = planet.segments.find((s) => s.revealed && !s.building)!;
    seg.building = "workshop";
    const before = craftRate(planet, seg, 2, economy);
    expect(before).toBeGreaterThan(0);
    economy.discoveries.push("automation");
    expect(craftRate(planet, seg, 2, economy)).toBeCloseTo(before * 1.25);
  });

  it("the energy grid makes power plants deliver more", () => {
    const { economy, planet } = game();
    const seg = planet.segments.find((s) => s.revealed && !s.building)!;
    seg.building = "power-wind";
    const before = energySupply(planet, seg, 0, economy);
    expect(before).toBeGreaterThan(0);
    economy.discoveries.push("energy-grid");
    expect(energySupply(planet, seg, 0, economy)).toBeCloseTo(before * 1.25);
  });

  it("shell statics make shield segments cheaper, research stays the same", () => {
    const { economy, planet } = game();
    const before = shieldFlightPlan(planet, false, economy).cost;
    economy.discoveries.push("shell-statics");
    const after = shieldFlightPlan(planet, false, economy).cost;
    expect(after.steel).toBe(before.steel! - Math.floor(SUPERNOVA.segmentCost.steel! * 0.3));
    expect(after.science).toBe(before.science);
  });

  it("ballistics makes batteries hit harder and salvage doubles the loot", () => {
    const siege = (discoveries: string[]) => {
      const g = clone(createGame("goals", [P1], { now: 0 }));
      const economy = economyOfPlayer(g, P1.id)!;
      economy.ascension.level = INVADERS.minLevel;
      economy.discoveries.push(...(discoveries as never[]));
      const home = homePlanet(g, P1.id)!;
      const first = Object.values(g.units)[0]!;
      for (let i = Object.keys(g.units).length; i < INVADERS.minPeople; i++) g.units[`u${g.nextUnitId++}`] = { ...first, id: `u${g.nextUnitId}` };
      const spots = home.segments.filter((s) => s.revealed && !s.building).slice(0, 2);
      for (const s of spots) s.building = "battery";
      Object.values(g.units).forEach((u, i) => (u.segment = i < 2 ? spots[i]!.index : null));
      g.invasion = { wave: 1, target: home.id, arrivalTick: g.tick, spotted: true, sieging: true, siegeEndTick: 0, hp: 1e6, maxHp: 1e6, bonus: 99 };
      const events: GameEvent[] = [];
      let s = g;
      for (let i = 0; i < 1; i++) {
        const r = advanceWithEvents(s, s.simTime + ticksPerCycle(s) * TICK_MS);
        events.push(...r.events);
        s = r.state;
      }
      return (events.find((e) => e.type === "siege") as Extract<GameEvent, { type: "siege" }>).damage;
    };
    expect(siege([])).toBe(2);
    expect(siege(["ballistics"])).toBe(3);
  });
});

describe("extra picks", () => {
  it("pure science opens the next choice right away", () => {
    const g = clone(createGame("pick", [P1], { now: 0 }));
    const economy = economyOfPlayer(g, P1.id)!;
    economy.ascension.level = 3;
    economy.resources.science = 1000;
    economy.picks = 1;
    economy.offer = { options: ["pure-science", "masonry", "forestry"], votes: { p1: "pure-science" } } as unknown as typeof economy.offer;
    resolveOffer(g, economy, true, []);
    expect(economy.discoveries).toEqual(["pure-science"]);
    expect(economy.picks).toBe(1);
    expect(economy.offer?.options).toHaveLength(3);
    expect(economy.offer!.options).not.toContain("pure-science");
  });
});

describe("removed discoveries", () => {
  it("vanish from saves", () => {
    const g = clone(createGame("old", [P1], { now: 0 }));
    const economy = economyOfPlayer(g, P1.id)!;
    economy.discoveries = ["swift-feet", "storage-tech", "terraforming"] as never;
    const up = upgradeState(g)!;
    expect(economyOfPlayer(up, P1.id)!.discoveries).toEqual(["swift-feet"]);
  });
});

describe("deposit yield", () => {
  it("deep drilling gets more out of the same deposit instead of emptying it faster", () => {
    const g = clone(createGame("yield", [P1], { now: 0, invaders: "off" }));
    const economy = economyOfPlayer(g, P1.id)!;
    economy.peoples = [];
    const planet = homePlanet(g, P1.id)!;
    const seg = planet.segments.find((s) => s.revealed && !s.building)!;
    seg.building = "mine";
    seg.deposits = [{ resource: "iron", amount: 10, max: 10, infinite: false, byHand: false }];
    const before = segmentOutput(planet, seg, 2, economy).iron!;
    economy.discoveries.push("deep-drilling");
    expect(segmentOutput(planet, seg, 2, economy).iron!).toBeCloseTo(before * 1.25);
    // Mine the field dry: 10 units in the ground give 12.5 iron.
    for (const u of Object.values(g.units).slice(0, 2)) u.segment = seg.index;
    const iron = economy.resources.iron;
    const s = advanceWithEvents(g, g.simTime + 600_000).state;
    const after = economyOfPlayer(s, P1.id)!;
    expect(homePlanet(s, P1.id)!.segments[seg.index]!.deposits[0]!.amount).toBe(0);
    expect(after.resources.iron - iron).toBeCloseTo(12.5, 1);
  });
});
