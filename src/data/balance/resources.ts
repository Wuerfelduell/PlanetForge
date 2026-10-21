import type { BiomeDef, PlanetTypeDef, ResourceDef } from "./types";

export const RESOURCE_IDS = [
  // raw
  "food", "wood", "stone", "sand", "clay", "iron", "coal", "water", "oil", "biogas", "uranium", "aetherite",
  "copper", "gold", "fiber",
  // refined (first tier: sawmill and workshop; second tier: foundry)
  "planks", "tools", "wire", "cloth", "bricks", "fuel",
  "glass", "concrete", "steel", "plastic", "electronics", "computer",
  // special (no storage cap; energy is a live balance, not a stock)
  "science", "energy",
] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

/**
 * value = worker-seconds to get one unit along the cheapest path. Used for trade prices,
 * ultimatum demands and sanity checks (a recipe should never destroy value).
 */
export const RESOURCES = {
  food: { name: "Pflaumbeeren", category: "raw", icon: "resource.food", baseCap: 120, value: 3 },
  wood: { name: "Holz", category: "raw", icon: "resource.wood", baseCap: 100, value: 3 },
  stone: { name: "Stein", category: "raw", icon: "resource.stone", baseCap: 100, value: 3 },
  sand: { name: "Sand", category: "raw", icon: "resource.sand", baseCap: 100, value: 3 },
  clay: { name: "Lehm", category: "raw", icon: "resource.clay", baseCap: 100, value: 3 },
  iron: { name: "Eisen", category: "raw", icon: "resource.iron", baseCap: 80, value: 4 },
  coal: { name: "Kohle", category: "raw", icon: "resource.coal", baseCap: 80, value: 4 },
  water: { name: "Wasser", category: "raw", icon: "resource.water", baseCap: 100, value: 2 },
  oil: { name: "Öl", category: "raw", icon: "resource.oil", baseCap: 80, value: 5 },
  biogas: { name: "Biogas", category: "raw", icon: "resource.biogas", baseCap: 60, value: 5 },
  uranium: { name: "Uran", category: "raw", icon: "resource.uranium", baseCap: 40, value: 12 },
  aetherite: { name: "Ätherit", category: "raw", icon: "resource.aetherite", baseCap: 40, value: 15 },
  copper: { name: "Kupfer", category: "raw", icon: "resource.copper", baseCap: 80, value: 4 },
  gold: { name: "Gold", category: "raw", icon: "resource.gold", baseCap: 30, value: 15 },
  fiber: { name: "Fasern", category: "raw", icon: "resource.fiber", baseCap: 100, value: 3 },
  planks: { name: "Bretter", category: "refined", icon: "resource.planks", baseCap: 80, value: 10 },
  tools: { name: "Werkzeug", category: "refined", icon: "resource.tools", baseCap: 40, value: 12 },
  wire: { name: "Kupferdraht", category: "refined", icon: "resource.wire", baseCap: 60, value: 9 },
  cloth: { name: "Stoff", category: "refined", icon: "resource.cloth", baseCap: 60, value: 18 },
  bricks: { name: "Ziegel", category: "refined", icon: "resource.bricks", baseCap: 80, value: 9 },
  fuel: { name: "Treibstoff", category: "refined", icon: "resource.fuel", baseCap: 60, value: 12 },
  glass: { name: "Glas", category: "refined", icon: "resource.glass", baseCap: 60, value: 18 },
  concrete: { name: "Beton", category: "refined", icon: "resource.concrete", baseCap: 60, value: 18 },
  steel: { name: "Stahl", category: "refined", icon: "resource.steel", baseCap: 60, value: 22 },
  plastic: { name: "Plastik", category: "refined", icon: "resource.plastic", baseCap: 60, value: 22 },
  electronics: { name: "Elektronik", category: "refined", icon: "resource.electronics", baseCap: 40, value: 80 },
  computer: { name: "Computer", category: "refined", icon: "resource.computer", baseCap: 30, value: 220 },
  science: { name: "Wissen", category: "special", icon: "resource.science", value: 10 },
  energy: { name: "Energie", category: "special", icon: "resource.energy", value: 0 },
} as const satisfies Record<ResourceId, ResourceDef>;

/** Biome ids match the asset brief (art/src/biomes/). */
export const BIOME_IDS = ["forest", "savanna", "mountains", "ocean", "swamp", "desert", "tundra", "crystal", "glacier", "lava", "ash"] as const;
export type BiomeId = (typeof BIOME_IDS)[number];

export const BIOMES = {
  forest: {
    name: "Wald",
    art: "forest",
    buildable: true,
    deposits: [
      { resource: "wood", max: 80, byHand: true },
      { resource: "food", max: 25, byHand: true },
    ],
  },
  savanna: {
    name: "Savanne",
    art: "savanna",
    buildable: true,
    deposits: [
      { resource: "food", max: 60, byHand: true },
      { resource: "fiber", max: 50, byHand: true },
      { resource: "wood", max: 20, byHand: true },
      { resource: "clay", max: 20 },
    ],
  },
  mountains: {
    name: "Gebirge",
    art: "mountains",
    buildable: true,
    deposits: [
      { resource: "stone", max: 90, byHand: true },
      { resource: "iron", max: 60 },
      { resource: "copper", max: 45 },
      { resource: "coal", max: 40 },
      { resource: "gold", max: 15, tier: 2 },
    ],
  },
  ocean: {
    name: "Meer",
    art: "ocean",
    buildable: false,
    deposits: [
      { resource: "water", max: 0, infinite: true, byHand: true },
      { resource: "food", max: 40, byHand: true },
    ],
  },
  swamp: {
    name: "Sumpf",
    art: "swamp",
    buildable: true,
    deposits: [
      { resource: "fiber", max: 30, byHand: true },
      { resource: "clay", max: 70, byHand: true },
      { resource: "water", max: 40, byHand: true },
      { resource: "biogas", max: 40 },
      { resource: "oil", max: 30 },
    ],
  },
  desert: {
    name: "Wüste",
    art: "desert",
    buildable: true,
    deposits: [
      { resource: "sand", max: 90, byHand: true },
      { resource: "stone", max: 30, byHand: true },
      { resource: "copper", max: 30 },
      { resource: "oil", max: 60 },
    ],
  },
  tundra: {
    name: "Tundra",
    art: "tundra",
    buildable: true,
    deposits: [
      { resource: "water", max: 50, byHand: true },
      { resource: "stone", max: 40, byHand: true },
      { resource: "uranium", max: 25, requires: "deep-drilling" },
    ],
  },
  crystal: {
    name: "Kristallfeld",
    art: "crystal",
    buildable: true,
    deposits: [
      { resource: "stone", max: 30, byHand: true },
      { resource: "aetherite", max: 30, requires: "crystal-lore" },
    ],
  },
  // Ice and lava worlds. Glacier thaws to tundra, lava cools to ash, ash can be planted (src/sim/terraform.ts).
  glacier: {
    name: "Gletscher",
    art: "glacier",
    buildable: false,
    deposits: [
      { resource: "water", max: 100, byHand: true },
      { resource: "stone", max: 20, byHand: true },
    ],
  },
  lava: {
    name: "Lavafeld",
    art: "lava",
    // Only mine, foundry, watchtower and battery stand the heat (the sim's allowedBiomes).
    buildable: true,
    deposits: [
      { resource: "stone", max: 60, byHand: true },
      { resource: "iron", max: 45 },
      { resource: "gold", max: 20, tier: 2 },
    ],
  },
  ash: {
    name: "Aschefeld",
    art: "ash",
    buildable: true,
    deposits: [
      { resource: "sand", max: 50, byHand: true },
      { resource: "stone", max: 30, byHand: true },
      { resource: "coal", max: 25 },
    ],
  },
} as const satisfies Record<BiomeId, BiomeDef<ResourceId>>;

/**
 * Planet types for the star system. The home planet is always "temperate" with 32 segments,
 * so every seed starts with forest, savanna and mountains in reach.
 */
export const PLANET_TYPES = {
  temperate: {
    name: "Gemäßigt",
    art: "planet-temperate",
    segments: 32,
    biomeWeights: { forest: 4, savanna: 3, mountains: 3, ocean: 3, swamp: 2, desert: 1 },
    depositMul: 1,
  },
  arid: {
    name: "Trocken",
    art: "planet-arid",
    segments: 24,
    biomeWeights: { desert: 5, savanna: 3, mountains: 2, crystal: 1, ash: 0.5 },
    depositMul: 1.1,
  },
  ice: {
    name: "Eis",
    art: "planet-ice",
    segments: 24,
    biomeWeights: { tundra: 5, glacier: 3, mountains: 2, ocean: 1, crystal: 1 },
    depositMul: 1.1,
  },
  lava: {
    name: "Lava",
    art: "planet-lava",
    segments: 16,
    biomeWeights: { lava: 4, ash: 3, mountains: 3, crystal: 2 },
    depositMul: 1.4,
  },
  toxic: {
    name: "Giftig",
    art: "planet-toxic",
    segments: 24,
    biomeWeights: { swamp: 6, crystal: 1, forest: 1 },
    depositMul: 1.2,
  },
  ocean: {
    name: "Ozean",
    art: "planet-ocean",
    segments: 32,
    biomeWeights: { ocean: 8, swamp: 2, forest: 2, savanna: 1 },
    depositMul: 1,
  },
  asteroid: {
    name: "Asteroid",
    art: "asteroid-a",
    segments: 12,
    biomeWeights: { mountains: 3, crystal: 2 },
    depositMul: 0.6,
  },
} as const satisfies Record<string, PlanetTypeDef<BiomeId>>;
export type PlanetTypeId = keyof typeof PLANET_TYPES;
