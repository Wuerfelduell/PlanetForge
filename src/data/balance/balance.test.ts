import { describe, expect, it } from "vitest";
import { ascensionThreshold, BALANCE, buildingSprite, discoveryCost, IDS, rocketFuel, secondsPerBirth, foodUpkeepPerSecond, coopJoinCitizens, type ResourceId } from "./index";
import { homeAvailability, jobsPerCitizen, levelTimeline, sciencePerGame } from "./pacing";

const { buildings, recipes, resources, biomes, peoples, discoveries, pacing } = BALANCE;
const resourceIds = new Set<string>(IDS.resources);
const biomeIds = new Set<string>(IDS.biomes);
const buildingIds = new Set<string>(IDS.buildings);
const discoveryIds = new Set<string>(IDS.discoveries);

type AnyTier = (typeof buildings)[keyof typeof buildings]["tiers"][number] & Record<string, unknown>;
const tiers = () =>
  Object.entries(buildings).flatMap(([id, def]) => def.tiers.map((tier, i) => ({ id, tier: i + 1, def, t: tier as AnyTier })));
const keysOf = (o: object | undefined) => Object.keys(o ?? {});

describe("references", () => {
  it("every cost, input and output names a real resource", () => {
    for (const { id, t } of tiers()) {
      for (const r of [...keysOf(t.cost), ...keysOf(t.upkeep as object), ...keysOf(t.flat as object)]) expect(resourceIds, `${id}: ${r}`).toContain(r);
    }
    for (const [id, r] of Object.entries(recipes)) {
      for (const k of [...keysOf(r.inputs), ...keysOf(r.outputs)]) expect(resourceIds, `${id}: ${k}`).toContain(k);
    }
    for (const b of Object.values(biomes)) for (const d of b.deposits) expect(resourceIds).toContain(d.resource);
  });

  it("biomes, buildings and discoveries referenced anywhere exist", () => {
    for (const [id, def] of Object.entries(buildings)) {
      if (def.biomes !== "any-land") for (const b of def.biomes) expect(biomeIds, id).toContain(b);
      for (const a of ("adjacency" in def ? def.adjacency : []) as { biome?: string; building?: string }[]) {
        if (a.biome) expect(biomeIds, id).toContain(a.biome);
        if (a.building) expect(buildingIds, id).toContain(a.building);
      }
      if ("requires" in def) expect(discoveryIds, id).toContain(def.requires);
    }
    for (const b of Object.values(biomes)) {
      for (const d of b.deposits as readonly { requires?: string }[]) if (d.requires) expect(discoveryIds).toContain(d.requires);
    }
    for (const [id, p] of Object.entries(peoples)) {
      expect(biomeIds, id).toContain(p.favoriteBiome);
      expect(resourceIds, id).toContain(p.favoriteResource);
      if (p.startDiscovery) expect(discoveryIds, id).toContain(p.startDiscovery);
    }
    for (const [id, d] of Object.entries(discoveries)) {
      const unlocks = ("unlocks" in d ? d.unlocks : {}) as { buildings?: string[] };
      for (const b of unlocks.buildings ?? []) {
        expect(buildingIds, id).toContain(b);
        expect((buildings as Record<string, { requires?: string }>)[b]!.requires, `${b} should require ${id}`).toBe(id);
      }
    }
  });

  it("uses the asset ids from the art brief", () => {
    expect(buildingSprite("housing", 2)).toBe("building.housing.t2");
    expect(buildingSprite("market")).toBe("building.market");
    for (const r of Object.values(resources)) expect(r.icon).toMatch(/^resource\.[a-z]+$/);
    expect(IDS.peoples).toHaveLength(12);
    expect(IDS.discoveries).toHaveLength(24);
  });
});

describe("sanity", () => {
  it("every recipe is crafted by a building that crafts and is unlocked in time", () => {
    for (const [id, r] of Object.entries(recipes)) {
      const where = ((r as { building?: string }).building ?? "foundry") as keyof typeof buildings;
      const tier = buildings[where].tiers[r.tier - 1] as AnyTier | undefined;
      expect(tier?.crafts, `${id} at ${where}`).toBeTruthy();
      expect(tier!.unlockLevel, id).toBeLessThanOrEqual(r.unlockLevel);
    }
  });

  it("placement is a puzzle: there are neighbor penalties as well as bonuses", () => {
    const all = Object.values(buildings).flatMap((d) => ("adjacency" in d ? (d.adjacency as readonly { bonus: number }[]) : []));
    expect(all.filter((a) => a.bonus < 0).length).toBeGreaterThanOrEqual(8);
    expect(all.filter((a) => a.bonus > 0).length).toBeGreaterThanOrEqual(10);
  });

  it("tiers unlock in order and never get worse", () => {
    for (const { id, def } of tiers()) {
      const ts = def.tiers as readonly AnyTier[];
      for (let i = 1; i < ts.length; i++) {
        expect(ts[i]!.unlockLevel, id).toBeGreaterThanOrEqual(ts[i - 1]!.unlockLevel);
        expect(ts[i]!.workers, id).toBeGreaterThanOrEqual(ts[i - 1]!.workers);
        for (const key of ["housing", "storage"] as const) expect((ts[i]![key] as number) ?? 0, id).toBeGreaterThanOrEqual((ts[i - 1]![key] as number) ?? 0);
      }
    }
  });

  it("every cost fits into the base storage (no storage building needed to build anything)", () => {
    for (const { id, t } of tiers()) {
      for (const [r, n] of Object.entries(t.cost)) {
        const cap = (resources[r as ResourceId] as { baseCap?: number }).baseCap ?? Infinity;
        expect(n as number, `${id}: ${r}`).toBeLessThanOrEqual(cap);
      }
    }
  });

  it("refining adds value (outputs are worth at least the inputs)", () => {
    for (const [id, r] of Object.entries(recipes)) {
      if (id === "charcoal" || id === "biogas") continue; // emergency recipes, lossy on purpose
      const worth = (c: object) => Object.entries(c).reduce((s, [k, n]) => s + resources[k as ResourceId].value * (n as number), 0);
      expect(worth(r.outputs), id).toBeGreaterThanOrEqual(worth(r.inputs));
    }
  });

  it("every building cost is producible at home by its unlock level, except late-game expansion goals", () => {
    const avail = homeAvailability();
    const needsExpansion = new Set<string>();
    for (const { id, tier, t } of tiers()) {
      const latest = Math.max(0, ...Object.keys(t.cost).map((r) => avail[r as ResourceId]));
      if (latest === Infinity) needsExpansion.add(`${id}.t${tier}`);
      else expect(latest, `${id} t${tier}`).toBeLessThanOrEqual(t.unlockLevel);
    }
    expect([...needsExpansion].sort()).toEqual(["monument.t1"]);
    // Uranium and aetherite only come from other planets (or from the echobats' start discovery).
    expect(avail.uranium).toBe(Infinity);
    expect(avail.aetherite).toBe(Infinity);
    expect(avail.glass).toBe(3);
    expect(avail.plastic).toBe(6);
  });

  it("flying is hard: rockets burn refined fuel, buildable by their unlock level, and home oil lasts only a few flights", () => {
    const avail = homeAvailability();
    for (const [id, r] of Object.entries(BALANCE.space.rockets)) {
      if (r.fuel === "uranium") continue;
      expect(r.fuel, id).toBe("fuel");
      for (const c of [...Object.keys(r.cost), r.fuel]) expect(avail[c as ResourceId], `${id}: ${c}`).toBeLessThanOrEqual(r.unlockLevel);
    }
    const oilPerFuel = recipes.fuel.inputs.oil / recipes.fuel.outputs.fuel;
    const homeOil = BALANCE.rules.homeGuaranteedBiomes
      .flatMap((b) => biomes[b].deposits as readonly { resource: string; max: number }[])
      .filter((d) => d.resource === "oil")
      .reduce((sum, d) => sum + d.max, 0);
    const flights = homeOil / (rocketFuel("rocket-colony", 4, 3) * oilPerFuel);
    expect(flights).toBeGreaterThanOrEqual(1.5);
    expect(flights).toBeLessThanOrEqual(3);
  });

  it("food: a full farm feeds several citizens, a hand gatherer only a few", () => {
    const perCitizen = foodUpkeepPerSecond(10);
    const farm = buildings.farm.tiers[0];
    const fedByFarm = (farm.produces.perWorker * farm.workers) / perCitizen;
    const fedByHand = BALANCE.rules.handRatePerWorker / perCitizen;
    expect(fedByHand).toBeGreaterThanOrEqual(2.5);
    expect(fedByHand).toBeLessThanOrEqual(4);
    expect(fedByFarm / farm.workers).toBeGreaterThan(fedByHand);
  });
});

describe("pacing", () => {
  for (const mode of IDS.modes) {
    it(`${mode}: levels land near the target minutes`, () => {
      const timeline = levelTimeline(mode, 1);
      expect(timeline).toHaveLength(10);
      timeline.forEach(({ level, minute }) => {
        const target = pacing[mode].targetMinute[level - 1]!;
        expect(minute, `level ${level}`).toBeGreaterThan(target * 0.8);
        expect(minute, `level ${level}`).toBeLessThan(target * 1.2);
      });
    });

    it(`${mode}: discoveries per game`, () => {
      const { discoveries: n } = sciencePerGame(mode, 1);
      expect(n).toBeGreaterThanOrEqual(pacing[mode].discoveriesPerGame.min);
      expect(n).toBeLessThanOrEqual(pacing[mode].discoveriesPerGame.max);
    });
  }

  it("coop is long, versus is short and opens attacks early", () => {
    const coop = levelTimeline("coop").at(-1)!.minute;
    const attacksOpen = levelTimeline("versus")[BALANCE.versusCombat.attackMinLevel - 1]!.minute;
    expect(coop).toBeGreaterThan(150);
    expect(attacksOpen).toBeLessThan(10);
    const { rockets } = BALANCE.space;
    expect(BALANCE.versusCombat.attackMinLevel).toBeGreaterThanOrEqual(rockets["rocket-combat"].unlockLevel);
    expect(BALANCE.versusCombat.sabotageMinLevel).toBeGreaterThanOrEqual(rockets["rocket-scout"].unlockLevel);
    expect(BALANCE.buildings.launchpad.tiers[0].unlockLevel).toBeLessThanOrEqual(rockets["rocket-scout"].unlockLevel);
  });

  it("more coop players are a bit faster than solo, never slower and never trivial", () => {
    const solo = levelTimeline("coop", 1).at(-1)!.minute;
    for (let players = 2; players <= 4; players++) {
      const team = levelTimeline("coop", players).at(-1)!.minute;
      expect(team, `${players} players`).toBeLessThanOrEqual(solo);
      expect(team, `${players} players`).toBeGreaterThan(solo * 0.6);
      expect(sciencePerGame("coop", players).discoveries, `${players} players`).toBeGreaterThanOrEqual(pacing.coop.discoveriesPerGame.min);
    }
  });

  it("citizens are the bottleneck, not land: a built-out planet has more jobs than citizens", () => {
    expect(jobsPerCitizen()).toBeGreaterThanOrEqual(pacing.jobsPerCitizen);
  });

  it("system size follows the coop design (coop 4 + 2n planets, 1 + n AI; versus 1 + 2n planets, n AI)", () => {
    for (let n = 1; n <= 4; n++) {
      expect(BALANCE.modes.coop.planets[n - 1]).toBe(4 + 2 * n);
      expect(BALANCE.modes.coop.aiFactions[n - 1]).toBe(1 + n);
      expect(BALANCE.modes.versus.planets[n - 1]).toBe(1 + 2 * n);
      expect(BALANCE.modes.versus.aiFactions[n - 1]).toBe(n);
      expect(BALANCE.modes.coop.playerThresholdMul[n - 1]).toBeCloseTo(0.7 + 0.3 * n);
    }
  });

  it("formulas", () => {
    expect(ascensionThreshold(1)).toBe(25);
    expect(ascensionThreshold(11)).toBeNull();
    expect(ascensionThreshold(10, "coop", 2)).toBe(Math.round(12900 * 1.3));
    expect(coopJoinCitizens(0)).toBe(3);
    expect(coopJoinCitizens(5)).toBe(5);
    expect(ascensionThreshold(10, "versus", 4)).toBe(1900);
    expect(discoveryCost(0)).toBe(30);
    expect(discoveryCost(1)).toBe(41);
    expect(discoveryCost(0, "versus")).toBe(15);
    expect(secondsPerBirth(10)).toBe(90);
    expect(rocketFuel("rocket-small", 4, 1)).toBe(16);
    expect(rocketFuel("rocket-small", 4, 3)).toBe(24);
    expect(rocketFuel("rocket-colony", 4, 3)).toBe(24);
  });
});
