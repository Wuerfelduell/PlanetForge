/**
 * Back-of-the-envelope models that check the tables against the pacing targets. They are not
 * the simulation; they catch "this number is off by 3×" before a playtest does.
 */
import { BUILDINGS, RECIPES, type BuildingId } from "./buildings";
import { DISCOVERY_IDS } from "./discoveries";
import { ASCENSION, PACING, RULES } from "./progression";
import { BIOMES, RESOURCE_IDS, type BiomeId, type ResourceId } from "./resources";
import { ascensionThreshold, discoveryCost, DISCOVERY_RULES } from "./index";

export interface LevelEta {
  level: number;
  cycle: number;
  minute: number;
}

/** When each level is reached if population grows as PACING.expectedPopulation says. */
export function levelTimeline(players = 1): LevelEta[] {
  const out: LevelEta[] = [];
  let points = 0;
  let cycle = 0;
  let popBefore: number = RULES.startPopulation * players;
  for (let level = 1; level <= ASCENSION.maxLevel; level++) {
    const popAt = PACING.expectedPopulation[level - 1]! * players;
    const need = ascensionThreshold(level, players)! - points;
    cycle += need / ((popBefore + popAt) / 2);
    points = ascensionThreshold(level, players)!;
    popBefore = popAt;
    out.push({ level, cycle, minute: (cycle * RULES.secondsPerCycle) / 60 });
  }
  return out;
}

/** Total science until max level and how many discoveries that buys. */
export function sciencePerGame(players = 1): { science: number; discoveries: number } {
  const timeline = levelTimeline(players);
  let science = 0;
  let prevCycle = 0;
  for (const { level, cycle } of timeline) {
    // Labs running between the previous level and this one, at the previous level's rate.
    const rate = level >= 2 ? PACING.expectedLabSciencePerCycle[level - 2]! * players : 0;
    science += rate * (cycle - prevCycle) + DISCOVERY_RULES.sciencePerLevel * level;
    prevCycle = cycle;
  }
  let discoveries = 0;
  let left = science;
  while (discoveries < DISCOVERY_IDS.length && left >= discoveryCost(discoveries, players)) {
    left -= discoveryCost(discoveries, players);
    discoveries++;
  }
  return { science: Math.round(science), discoveries };
}

/**
 * Earliest ascension level at which a resource can be produced on the home planet,
 * or Infinity if it needs another planet (or a discovery-gated deposit).
 */
export function homeAvailability(): Record<ResourceId, number> {
  const home = RULES.homeGuaranteedBiomes as readonly BiomeId[];
  const level = Object.fromEntries(RESOURCE_IDS.map((r) => [r, Infinity])) as Record<ResourceId, number>;
  const lower = (r: ResourceId, l: number) => {
    if (l < level[r]) {
      level[r] = l;
      return true;
    }
    return false;
  };

  for (const b of home) {
    for (const d of BIOMES[b].deposits as readonly { resource: ResourceId; byHand?: boolean; requires?: string }[]) {
      if (d.requires) continue;
      if (d.byHand) lower(d.resource, 0);
      for (const id of Object.keys(BUILDINGS) as BuildingId[]) {
        const def = BUILDINGS[id];
        const biomes = def.biomes === "any-land" ? null : (def.biomes as readonly BiomeId[]);
        const fromNeighbors = (t: { extracts?: { fromNeighbors?: readonly BiomeId[] } }) => t.extracts?.fromNeighbors ?? [];
        def.tiers.forEach((tier) => {
          const t = tier as { unlockLevel: number; extracts?: { resources: readonly ResourceId[]; fromNeighbors?: readonly BiomeId[] } };
          if (!t.extracts?.resources.includes(d.resource)) return;
          const reachable = (biomes ? biomes.includes(b) : BIOMES[b].buildable) || fromNeighbors(t).includes(b);
          if (reachable) lower(d.resource, t.unlockLevel);
        });
      }
    }
  }
  for (const id of Object.keys(BUILDINGS) as BuildingId[]) {
    for (const tier of BUILDINGS[id].tiers) {
      const p = (tier as { produces?: { resource: ResourceId } }).produces;
      if (p) lower(p.resource, tier.unlockLevel);
    }
  }
  const foundryLevel = (tier: number) => BUILDINGS.foundry.tiers[tier - 1]!.unlockLevel;
  for (let changed = true; changed; ) {
    changed = false;
    for (const recipe of Object.values(RECIPES)) {
      const inputs = Object.keys(recipe.inputs) as ResourceId[];
      const l = Math.max(recipe.unlockLevel, foundryLevel(recipe.tier), ...inputs.map((r) => level[r]));
      for (const out of Object.keys(recipe.outputs) as ResourceId[]) changed = lower(out, l) || changed;
    }
  }
  lower("energy", 0);
  return level;
}
