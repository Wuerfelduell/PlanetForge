import { describe, expect, it } from "vitest";
import { ascensionThreshold, BALANCE, buildingSprite, discoveryCost, IDS, rocketFuel, secondsPerBirth, type ResourceId } from "./index";
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

  it("food: a full farm feeds several citizens, a hand gatherer only a few", () => {
    const perCitizen = BALANCE.rules.foodPerInhabitantPerCycle / BALANCE.rules.secondsPerCycle;
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
    expect(attacksOpen).toBeLessThan(25);
    expect(BALANCE.versusCombat.attackMinLevel).toBeGreaterThanOrEqual(BALANCE.space.rockets["rocket-small"].unlockLevel);
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

  it("formulas", () => {
    expect(ascensionThreshold(1)).toBe(25);
    expect(ascensionThreshold(11)).toBeNull();
    expect(ascensionThreshold(10, "coop", 2)).toBe(Math.round(12900 * 1.15));
    expect(ascensionThreshold(10, "versus", 4)).toBe(1900);
    expect(discoveryCost(0)).toBe(30);
    expect(discoveryCost(1)).toBe(41);
    expect(discoveryCost(0, "versus")).toBe(15);
    expect(secondsPerBirth(10)).toBe(90);
    expect(rocketFuel("rocket-small", 4, 1)).toBe(14);
    expect(rocketFuel("rocket-small", 4, 3)).toBe(26);
  });
});
