import { describe, expect, it } from "vitest";
import { BIOMES, BUILDINGS, GEMS, PLANET_TYPES, RARE_RESOURCES, RECIPES, ROCKETS, SUPERNOVA, type BiomeId, type BuildingId, type RecipeId, type ResourceId } from "./content";

/**
 * Walks the whole build and upgrade graph from a fresh home planet (Seb's playtest, 2026-10-21:
 * "kann keine Mine 2 machen"). Every building stage and rocket must be reachable, and no cost may
 * only become producible after the stage itself unlocks, otherwise the player waits on a cycle.
 */
const homeBiomes = Object.keys(PLANET_TYPES.temperate.biomeWeights) as BiomeId[];

function earliestLevels() {
  const resource = new Map<ResourceId, number>();
  const stage = new Map<string, number>();
  const lower = (r: ResourceId, l: number) => {
    if (l < (resource.get(r) ?? Infinity)) {
      resource.set(r, l);
      return true;
    }
    return false;
  };
  const deposits = new Set<ResourceId>();
  for (const b of homeBiomes) {
    for (const d of BIOMES[b].deposits) {
      if (d.byHand) lower(d.resource, 0);
      deposits.add(d.resource);
    }
  }
  for (const [r, biomes] of Object.entries(RARE_RESOURCES)) if (biomes!.some((b) => homeBiomes.includes(b))) deposits.add(r as ResourceId);
  // Every start planet hides one gem field (generate.ts); which gem is luck, the market sells the others.
  for (const g of GEMS.ids) deposits.add(g);
  // Platinum lies only on asteroids and far planets; who has no rocket yet buys it at the market.
  deposits.add("platinum");
  const costLevel = (cost: Partial<Record<ResourceId, number>>) => Math.max(0, ...Object.keys(cost).map((r) => resource.get(r as ResourceId) ?? Infinity));

  for (let changed = true; changed; ) {
    changed = false;
    for (const [id, def] of Object.entries(BUILDINGS) as [BuildingId, (typeof BUILDINGS)[BuildingId]][]) {
      let before = 0;
      [def, ...(def.upgrades ?? [])].forEach((s, i) => {
        const level = Math.max(before, s.unlockLevel, costLevel(s.cost));
        before = level;
        if (level === Infinity) return;
        const key = `${id}.${i + 1}`;
        if (level < (stage.get(key) ?? Infinity)) {
          stage.set(key, level);
          changed = true;
        }
        const full = { ...def, ...s };
        if (full.produces) changed = lower(full.produces.resource, level) || changed;
        for (const r of full.extracts?.resources ?? []) if (deposits.has(r)) changed = lower(r, level) || changed;
        for (const r of full.crafts?.recipes ?? []) {
          const recipe = RECIPES[r as RecipeId];
          const l = Math.max(level, costLevel(recipe.inputs));
          if (l < Infinity) for (const out of Object.keys(recipe.outputs) as ResourceId[]) changed = lower(out, l) || changed;
        }
      });
    }
  }
  return { resource, stage };
}

describe("reachability", () => {
  const { resource, stage } = earliestLevels();

  it("every building stage can be built at its own unlock level, starting from nothing", () => {
    for (const [id, def] of Object.entries(BUILDINGS)) {
      [def, ...(def.upgrades ?? [])].forEach((s, i) => {
        const missing = Object.keys(s.cost).filter((r) => (resource.get(r as ResourceId) ?? Infinity) > s.unlockLevel);
        expect(missing, `${id} stage ${i + 1} (level ${s.unlockLevel}) waits on`).toEqual([]);
        expect(stage.get(`${id}.${i + 1}`), `${id} stage ${i + 1}`).toBe(s.unlockLevel);
      });
    }
  });

  it("every rocket can be built and fueled at its unlock level", () => {
    for (const [id, r] of Object.entries(ROCKETS)) {
      for (const c of [...Object.keys(r.cost), r.fuel.resource]) {
        expect(resource.get(c as ResourceId) ?? Infinity, `${id}: ${c}`).toBeLessThanOrEqual(r.unlockLevel);
      }
    }
  });

  it("the sun shield is buildable once it unlocks, and needs the late chain", () => {
    for (const c of Object.keys(SUPERNOVA.segmentCost)) expect(resource.get(c as ResourceId) ?? Infinity, c).toBeLessThanOrEqual(SUPERNOVA.unlockLevel);
    expect(Object.keys(SUPERNOVA.segmentCost)).toEqual(expect.arrayContaining(["steel", "concrete"]));
  });

  it("gold is a late luxury: nothing before level 5 needs it", () => {
    expect(resource.get("gold")).toBe(5);
    for (const [id, def] of Object.entries(BUILDINGS)) {
      for (const s of [def, ...(def.upgrades ?? [])]) if ("gold" in s.cost) expect(s.unlockLevel, id).toBeGreaterThanOrEqual(5);
    }
  });
});
