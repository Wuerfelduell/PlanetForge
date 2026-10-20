/**
 * All balancing data in one place. Pure data plus a few formulas, no DOM: the simulation,
 * the UI and the coop edge function import the same module.
 *
 * Rationale and how to tune: docs/balancing.md.
 */
import { BUILDINGS, BUILDING_IDS, RECIPES, RECIPE_IDS } from "./buildings";
import { DISCOVERIES, DISCOVERY_IDS, DISCOVERY_RULES } from "./discoveries";
import { PEOPLES, PEOPLE_BASE, PEOPLE_IDS } from "./peoples";
import { ASCENSION, BATTLE, COOP, DIPLOMACY, ENERGY, MONSTERS, MONSTER_IDS, PACING, POLLUTION, RULES, SPACE } from "./progression";
import { BIOMES, BIOME_IDS, PLANET_TYPES, RESOURCES, RESOURCE_IDS } from "./resources";

export * from "./buildings";
export * from "./discoveries";
export * from "./peoples";
export * from "./progression";
export * from "./resources";
export type * from "./types";

export const BALANCE = {
  version: 1,
  resources: RESOURCES,
  biomes: BIOMES,
  planetTypes: PLANET_TYPES,
  buildings: BUILDINGS,
  recipes: RECIPES,
  peoples: PEOPLES,
  peopleBase: PEOPLE_BASE,
  discoveries: DISCOVERIES,
  discoveryRules: DISCOVERY_RULES,
  rules: RULES,
  ascension: ASCENSION,
  energy: ENERGY,
  pollution: POLLUTION,
  monsters: MONSTERS,
  battle: BATTLE,
  space: SPACE,
  diplomacy: DIPLOMACY,
  coop: COOP,
  pacing: PACING,
} as const;

export const IDS = {
  resources: RESOURCE_IDS,
  biomes: BIOME_IDS,
  buildings: BUILDING_IDS,
  recipes: RECIPE_IDS,
  peoples: PEOPLE_IDS,
  discoveries: DISCOVERY_IDS,
  monsters: MONSTER_IDS,
} as const;

const coopIndex = (players: number) => Math.min(Math.max(Math.round(players), 1), COOP.maxPlayers) - 1;

/** Cumulative ascension points for `level` (1–10) with the given team size, or null past max. */
export function ascensionThreshold(level: number, players = 1): number | null {
  const base = ASCENSION.thresholds[level - 1];
  if (base === undefined) return null;
  return Math.round(base * COOP.ascensionThresholdMul[coopIndex(players)]!);
}

/** Science cost of the next discovery when `owned` were bought already (start discoveries don't count). */
export function discoveryCost(owned: number, players = 1, costMul = 1): number {
  const { baseCost, growth } = DISCOVERY_RULES;
  return Math.round(baseCost * growth ** owned * COOP.discoveryCostMul[coopIndex(players)]! * costMul);
}

/** Fuel for one rocket flight. */
export function rocketFuel(rocket: keyof typeof SPACE.rockets, distance: number, passengers: number, fuelMul = 1): number {
  const r = SPACE.rockets[rocket];
  return Math.ceil(distance * (r.fuelPerDistance + r.fuelPerPassenger * passengers) * fuelMul);
}

export function monsterStrength(monster: keyof typeof MONSTERS, players = 1): number {
  return Math.round(MONSTERS[monster].strength * COOP.monsterStrengthMul[coopIndex(players)]!);
}

/** Sprite id in art/manifest.json for a building tier (single-tier buildings have no suffix). */
export function buildingSprite(building: keyof typeof BUILDINGS, tier = 1): string {
  const def = BUILDINGS[building];
  return def.tiers.length > 1 ? `building.${def.art}.t${tier}` : `building.${def.art}`;
}
