import type { BiomeId, ResourceId } from "./resources";
import type { BuildingDef, RecipeDef } from "./types";

export const BUILDING_IDS = [
  "housing", "farm", "mine", "pump", "lab", "storage", "foundry", "market", "watchtower",
  "power-wind", "power-coal", "air-filter", "hydro-farm", "launchpad", "power-solar", "monument", "power-atomic",
] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];

type Def = BuildingDef<ResourceId, BiomeId>;

/**
 * Tier 1 is built, higher tiers are upgrades in place (cost = upgrade cost, values replace the
 * tier below, they do not add up). Unlock levels give every ascension level something new.
 * Higher tiers mostly add job slots: the game is about too few citizens, not too little land.
 */
export const BUILDINGS = {
  housing: {
    name: "Wohnhaus",
    description: "Platz für mehr Einwohner. Neue Einwohner kommen nur, solange Platz frei ist.",
    art: "housing",
    biomes: "any-land",
    tiers: [
      { cost: { wood: 15 }, unlockLevel: 0, buildSeconds: 6, workers: 0, housing: 2 },
      { cost: { wood: 15, clay: 15, stone: 10 }, unlockLevel: 2, buildSeconds: 10, workers: 0, housing: 4 },
      { cost: { concrete: 15, glass: 10, steel: 5 }, unlockLevel: 5, buildSeconds: 15, workers: 0, housing: 7, energy: -1 },
    ],
  },
  farm: {
    name: "Farm",
    description: "Baut Pflaumbeeren an, ohne den Boden zu erschöpfen. +25 % je Nachbar-Savanne.",
    art: "farm",
    biomes: ["forest", "savanna", "swamp"],
    adjacency: [{ biome: "savanna", bonus: 0.25 }],
    tiers: [
      { cost: { wood: 15 }, unlockLevel: 0, buildSeconds: 6, workers: 2, produces: { resource: "food", perWorker: 0.35 } },
      {
        cost: { wood: 20, glass: 10 },
        unlockLevel: 4,
        buildSeconds: 10,
        workers: 4,
        produces: { resource: "food", perWorker: 0.45 },
        upkeep: { water: 0.05 },
      },
    ],
  },
  mine: {
    name: "Mine",
    description: "Fördert alle festen Bodenschätze des Feldes, auch die ohne Werkzeug unerreichbaren. +20 % je Nachbar-Gebirge.",
    art: "mine",
    biomes: ["mountains", "desert", "savanna", "swamp", "tundra", "crystal"],
    adjacency: [{ biome: "mountains", bonus: 0.2 }],
    tiers: [
      {
        cost: { wood: 20, stone: 10 },
        unlockLevel: 1,
        buildSeconds: 8,
        workers: 3,
        extracts: { resources: ["stone", "sand", "clay", "iron", "coal"], perWorker: 0.35 },
        pollution: 0.01,
      },
      {
        cost: { steel: 10, concrete: 10 },
        unlockLevel: 5,
        buildSeconds: 12,
        workers: 5,
        extracts: { resources: ["stone", "sand", "clay", "iron", "coal", "uranium", "aetherite"], perWorker: 0.5 },
        energy: -2,
        pollution: 0.02,
      },
    ],
  },
  pump: {
    name: "Pumpe",
    description: "Pumpt Flüssigkeiten aus dem Feld und aus einem benachbarten Meer.",
    art: "pump",
    biomes: "any-land",
    tiers: [
      {
        cost: { stone: 12, wood: 8 },
        unlockLevel: 1,
        buildSeconds: 6,
        workers: 1,
        extracts: { resources: ["water", "biogas"], perWorker: 0.4, fromNeighbors: ["ocean"] },
      },
      {
        cost: { steel: 10, stone: 15 },
        unlockLevel: 5,
        buildSeconds: 10,
        workers: 3,
        extracts: { resources: ["water", "biogas", "oil"], perWorker: 0.5, fromNeighbors: ["ocean"] },
        energy: -1,
        pollution: 0.02,
      },
    ],
  },
  lab: {
    name: "Labor",
    description: "Erzeugt Wissen für Entdeckungen. +15 % je Nachbar-Kristallfeld, +10 % je Nachbar-Wohnhaus.",
    art: "lab",
    biomes: "any-land",
    adjacency: [
      { biome: "crystal", bonus: 0.15 },
      { building: "housing", bonus: 0.1 },
    ],
    tiers: [
      { cost: { stone: 20, wood: 15, clay: 10 }, unlockLevel: 2, buildSeconds: 10, workers: 2, produces: { resource: "science", perWorker: 0.1 } },
      { cost: { glass: 15, steel: 10 }, unlockLevel: 5, buildSeconds: 15, workers: 4, produces: { resource: "science", perWorker: 0.15 }, energy: -1 },
    ],
  },
  storage: {
    name: "Lager",
    description: "Mehr Platz für alle Rohstoffe und Waren.",
    art: "storage",
    biomes: "any-land",
    tiers: [
      { cost: { wood: 30, stone: 20 }, unlockLevel: 2, buildSeconds: 8, workers: 0, storage: 100 },
      { cost: { concrete: 20, steel: 10 }, unlockLevel: 6, buildSeconds: 12, workers: 0, storage: 250 },
    ],
  },
  foundry: {
    name: "Gießerei",
    description: "Verarbeitet Rohstoffe nach dem gewählten Rezept. Stufe 2 arbeitet schneller und kann Plastik, Elektronik und Computer.",
    art: "foundry",
    biomes: "any-land",
    adjacency: [{ building: "mine", bonus: 0.1 }],
    tiers: [
      { cost: { stone: 25, clay: 15, wood: 10 }, unlockLevel: 3, buildSeconds: 12, workers: 2, crafts: { speed: 1 }, pollution: 0.03 },
      { cost: { steel: 15, concrete: 15 }, unlockLevel: 6, buildSeconds: 15, workers: 4, crafts: { speed: 1.5 }, energy: -2, pollution: 0.04 },
    ],
  },
  market: {
    name: "Markt",
    description: "Erlaubt Handel mit anderen Völkern und Mitspielern.",
    art: "market",
    biomes: "any-land",
    unique: true,
    tiers: [{ cost: { wood: 30, stone: 20, clay: 20 }, unlockLevel: 3, buildSeconds: 10, workers: 1 }],
  },
  watchtower: {
    name: "Wachturm",
    description: "+2 auf jeden Kampfwurf auf diesem Planeten.",
    art: "watchtower",
    biomes: "any-land",
    tiers: [{ cost: { stone: 25, wood: 15 }, unlockLevel: 4, buildSeconds: 10, workers: 1, defense: 2 }],
  },
  "power-wind": {
    name: "Windrad",
    description: "Kleine, saubere Energie ohne Arbeiter. +25 % je Nachbar-Gebirge.",
    art: "power-wind",
    biomes: "any-land",
    adjacency: [{ biome: "mountains", bonus: 0.25 }],
    tiers: [{ cost: { wood: 20, stone: 10, iron: 10 }, unlockLevel: 4, buildSeconds: 8, workers: 0, energy: 2 }],
  },
  "power-coal": {
    name: "Kohlekraftwerk",
    description: "Viel Energie, verbraucht Kohle und verschmutzt die Luft.",
    art: "power-coal",
    biomes: "any-land",
    tiers: [
      { cost: { stone: 30, iron: 15, clay: 10 }, unlockLevel: 4, buildSeconds: 12, workers: 1, energy: 6, upkeep: { coal: 0.1 }, pollution: 0.06 },
    ],
  },
  "air-filter": {
    name: "Luftfilter",
    description: "Senkt die Verschmutzung des Planeten.",
    art: "air-filter",
    biomes: "any-land",
    requires: "ecology",
    tiers: [{ cost: { steel: 10, glass: 5, stone: 20 }, unlockLevel: 5, buildSeconds: 10, workers: 0, energy: -1, pollution: -0.12 }],
  },
  "hydro-farm": {
    name: "Hydrofarm",
    description: "Nahrung auf jedem Boden, auch in Wüste und Tundra. Braucht Wasser und Energie.",
    art: "hydro-farm",
    biomes: "any-land",
    tiers: [
      {
        cost: { glass: 15, steel: 10, plastic: 5 },
        unlockLevel: 6,
        buildSeconds: 12,
        workers: 4,
        produces: { resource: "food", perWorker: 0.45 },
        upkeep: { water: 0.06 },
        energy: -2,
      },
    ],
  },
  launchpad: {
    name: "Startrampe",
    description: "Hier starten Raketen zu anderen Planeten und Asteroiden.",
    art: "launchpad",
    biomes: "any-land",
    unique: true,
    tiers: [{ cost: { concrete: 25, steel: 20, stone: 30 }, unlockLevel: 6, buildSeconds: 15, workers: 0 }],
  },
  "power-solar": {
    name: "Solarfeld",
    description: "Saubere Energie ohne Arbeiter. +30 % in der Wüste.",
    art: "power-solar",
    biomes: "any-land",
    biomeBonus: { biome: "desert", bonus: 0.3 },
    tiers: [{ cost: { glass: 10, steel: 5, electronics: 1 }, unlockLevel: 7, buildSeconds: 10, workers: 0, energy: 3 }],
  },
  monument: {
    name: "Monument",
    description: "+6 Aufstiegspunkte pro Umlauf. Nur eins pro Planet.",
    art: "monument",
    biomes: "any-land",
    unique: true,
    tiers: [{ cost: { concrete: 40, steel: 25, aetherite: 10 }, unlockLevel: 8, buildSeconds: 20, workers: 0, ascension: 6 }],
  },
  "power-atomic": {
    name: "Atomkraftwerk",
    description: "Sehr viel Energie aus wenig Uran, ganz ohne Verschmutzung.",
    art: "power-atomic",
    biomes: "any-land",
    requires: "atomic-power",
    tiers: [
      { cost: { concrete: 40, steel: 30, electronics: 5 }, unlockLevel: 9, buildSeconds: 20, workers: 2, energy: 15, upkeep: { uranium: 0.02 } },
    ],
  },
} as const satisfies Record<BuildingId, Def>;

export const RECIPE_IDS = ["charcoal", "glass", "concrete", "steel", "biogas", "plastic", "electronics", "computer"] as const;
export type RecipeId = (typeof RECIPE_IDS)[number];

/**
 * Foundry recipes. Time per craft = seconds / (workers × foundry speed × adjacency).
 * Inputs are taken when a craft starts; a craft never starts without all inputs.
 */
export const RECIPES = {
  charcoal: { name: "Holzkohle", inputs: { wood: 3 }, outputs: { coal: 1 }, seconds: 6, unlockLevel: 3, tier: 1, pollution: 0.02 },
  glass: { name: "Glas", inputs: { sand: 2, coal: 1 }, outputs: { glass: 1 }, seconds: 8, unlockLevel: 3, tier: 1, pollution: 0.02 },
  concrete: { name: "Beton", inputs: { stone: 2, clay: 1, water: 1 }, outputs: { concrete: 1 }, seconds: 8, unlockLevel: 3, tier: 1 },
  steel: { name: "Stahl", inputs: { iron: 2, coal: 1 }, outputs: { steel: 1 }, seconds: 10, unlockLevel: 4, tier: 1, pollution: 0.03 },
  biogas: { name: "Biogas", inputs: { food: 3, water: 1 }, outputs: { biogas: 1 }, seconds: 6, unlockLevel: 5, tier: 1 },
  plastic: { name: "Plastik", inputs: { oil: 2 }, outputs: { plastic: 1 }, seconds: 10, unlockLevel: 6, tier: 2, energy: 1, pollution: 0.03 },
  electronics: {
    name: "Elektronik",
    inputs: { steel: 1, plastic: 1, glass: 1 },
    outputs: { electronics: 1 },
    seconds: 16,
    unlockLevel: 7,
    tier: 2,
    energy: 2,
  },
  computer: {
    name: "Computer",
    inputs: { electronics: 2, glass: 1, aetherite: 1 },
    outputs: { computer: 1 },
    seconds: 24,
    unlockLevel: 8,
    tier: 2,
    energy: 3,
  },
} as const satisfies Record<RecipeId, RecipeDef<ResourceId>>;
