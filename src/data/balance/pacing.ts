/**
 * Back-of-the-envelope models that check the tables against the pacing targets. They are not
 * the simulation; they catch "this number is off by 3×" before a playtest does.
 */
import { BUILDINGS, RECIPES, type BuildingId } from "./buildings";
import { DISCOVERY_IDS } from "./discoveries";
import { ASCENSION, PACING, RULES, type ModeId } from "./progression";
import { BIOMES, RESOURCE_IDS, type BiomeId, type ResourceId } from "./resources";
import { ascensionThreshold, discoveryCost, DISCOVERY_RULES, secondsPerBirth } from "./index";

export interface LevelEta {
  level: number;
  minute: number;
  population: number;
}

/**
 * Level timeline when births are the only limit (the player keeps food and housing ahead).
 * In coop, from level 6 on every extra player is assumed to run a colony with its own births.
 */
export function levelTimeline(mode: ModeId = "coop", players = 1): LevelEta[] {
  const out: LevelEta[] = [];
  const startPop = RULES.startPopulation * (mode === "coop" ? players : 1);
  const planets = [{ pop: startPop, progress: 0 }];
  let points = 0;
  let level = 0;
  const cycle = RULES.secondsPerCycle;
  for (let t = 1; level < ASCENSION.maxLevel && t < 10 * 3600; t++) {
    if (mode === "coop" && level >= 6 && planets.length < players) planets.push({ pop: 1, progress: 0 });
    let pop = 0;
    for (const p of planets) {
      p.progress += 1;
      if (p.progress >= secondsPerBirth(p.pop, mode)) {
        p.pop += 1;
        p.progress = 0;
      }
      pop += p.pop;
    }
    points += pop / cycle;
    while (level < ASCENSION.maxLevel && points >= ascensionThreshold(level + 1, mode, players)!) {
      level += 1;
      out.push({ level, minute: t / 60, population: pop });
    }
  }
  return out;
}

/** Total science until the last level (versus: the win level) and how many discoveries that buys. */
export function sciencePerGame(mode: ModeId = "coop", players = 1): { science: number; discoveries: number } {
  const last = mode === "versus" ? 8 : ASCENSION.maxLevel;
  const timeline = levelTimeline(mode, players).slice(0, last);
  // Ascension points equal citizen-cycles, so lab output follows from them directly.
  const citizenCycles = ascensionThreshold(last, mode, players)!;
  let science = citizenCycles * PACING.labWorkerShare * PACING.sciencePerLabWorkerPerCycle;
  for (const { level } of timeline) science += DISCOVERY_RULES.sciencePerLevel * level;
  let discoveries = 0;
  let left = science;
  while (discoveries < DISCOVERY_IDS.length && left >= discoveryCost(discoveries, mode, players)) {
    left -= discoveryCost(discoveries, mode, players);
    discoveries++;
  }
  return { science: Math.round(science), discoveries };
}

/** Job slots on a built-out home planet versus the population at max level. */
export function jobsPerCitizen(): number {
  const maxPop = levelTimeline("coop", 1).at(-1)!.population;
  const housingTop = BUILDINGS.housing.tiers.at(-1)!.housing;
  const houses = Math.ceil((maxPop - RULES.baseHousing) / housingTop);
  // Assume a quarter of the planet is ocean (2 hand-gatherer slots each), the rest is land.
  const ocean = Math.floor(RULES.homeSegments / 4);
  const land = RULES.homeSegments - ocean - houses;
  const production: BuildingId[] = ["farm", "mine", "pump", "lab", "foundry", "hydro-farm"];
  const slots: number[] = production.map((id) => BUILDINGS[id].tiers.at(-1)!.workers);
  const avg = slots.reduce((a, b) => a + b, 0) / slots.length;
  return (land * avg + ocean * RULES.handWorkersPerSegment) / maxPop;
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
        def.tiers.forEach((tier) => {
          const t = tier as { unlockLevel: number; extracts?: { resources: readonly ResourceId[]; fromNeighbors?: readonly BiomeId[] } };
          if (!t.extracts?.resources.includes(d.resource)) return;
          const reachable = (biomes ? biomes.includes(b) : BIOMES[b].buildable) || (t.extracts.fromNeighbors ?? []).includes(b);
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
