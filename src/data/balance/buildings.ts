import type { BiomeId, ResourceId } from "./resources";
import type { BuildingDef, RecipeDef } from "./types";

export const BUILDING_IDS = [
  "housing", "farm", "sawmill", "forester", "mine", "pump", "refinery", "workshop", "lab", "storage", "foundry", "market", "watchtower",
  "power-wind", "power-coal", "air-filter", "hydro-farm", "launchpad", "power-solar", "monument", "power-atomic",
] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];

type Def = BuildingDef<ResourceId, BiomeId>;

/**
 * Tier 1 is built, higher tiers are upgrades in place (cost = upgrade cost, values replace the
 * tier below, they do not add up). Unlock levels give every ascension level something new.
 * Higher tiers mostly add job slots: the game is about too few citizens, not too little land.
 *
 * Tinkering (Seb, 2026-10-21): placement matters through bonuses AND penalties from neighbors
 * (noise and dust from mines, smog from coal, shade between wind turbines), a few placement
 * rules (sawmill next to forest, mine only on a deposit), intermediate goods (planks, bricks,
 * tools, wire, cloth) that later buildings need, and tools that wear out.
 */
/** Buildings whose noise lowers housing and lab output next to them. */
const NOISY = [
  { building: "mine", bonus: -0.25 },
  { building: "foundry", bonus: -0.25 },
  { building: "power-coal", bonus: -0.25 },
  { building: "refinery", bonus: -0.25 },
] as const;

export const BUILDINGS = {
  housing: {
    name: "Wohnhaus",
    description:
      "Platz für mehr Einwohner. Neue Einwohner kommen nur, solange Platz frei ist. −25 % Platz je lautem Nachbarn (Mine, Gießerei, Kohlekraftwerk, Raffinerie), +10 % je Nachbar-Wald.",
    art: "housing",
    biomes: "any-land",
    adjacency: [...NOISY, { biome: "forest", bonus: 0.1 }],
    tiers: [
      { cost: { wood: 15 }, unlockLevel: 0, buildSeconds: 6, workers: 0, housing: 2 },
      { cost: { planks: 10, clay: 10, stone: 10 }, unlockLevel: 2, buildSeconds: 10, workers: 0, housing: 4 },
      { cost: { bricks: 15, glass: 10, cloth: 5, steel: 5 }, unlockLevel: 5, buildSeconds: 15, workers: 0, housing: 7, energy: -1 },
    ],
  },
  farm: {
    name: "Farm",
    description:
      "Baut Pflaumbeeren an, ohne den Boden zu erschöpfen. +25 % je Nachbar-Savanne, +20 % je Nachbar-Pumpe (Bewässerung), −25 % je Nachbar-Mine (Staub), −20 % je Nachbar-Kohlekraftwerk.",
    art: "farm",
    biomes: ["forest", "savanna", "swamp", "ash"],
    adjacency: [
      { biome: "savanna", bonus: 0.25 },
      { building: "pump", bonus: 0.2 },
      { building: "mine", bonus: -0.25 },
      { building: "power-coal", bonus: -0.2 },
    ],
    tiers: [
      { cost: { wood: 15 }, unlockLevel: 0, buildSeconds: 6, workers: 2, produces: { resource: "food", perWorker: 0.35 } },
      {
        cost: { planks: 10, glass: 10 },
        unlockLevel: 4,
        buildSeconds: 10,
        workers: 4,
        produces: { resource: "food", perWorker: 0.45 },
        upkeep: { water: 0.05 },
      },
    ],
  },
  sawmill: {
    name: "Sägewerk",
    description: "Macht aus Holz Bretter. Muss neben einem Wald stehen, +30 % je Nachbar-Wald. Verbraucht Werkzeug.",
    art: "sawmill",
    biomes: "any-land",
    needsNeighbor: ["forest"],
    adjacency: [{ biome: "forest", bonus: 0.3 }],
    tiers: [
      { cost: { wood: 20, stone: 10 }, unlockLevel: 1, buildSeconds: 8, workers: 2, crafts: { speed: 1 }, usesTools: true },
      { cost: { bricks: 10, tools: 5 }, unlockLevel: 4, buildSeconds: 10, workers: 4, crafts: { speed: 1.5 }, usesTools: true },
    ],
  },
  forester: {
    name: "Förster",
    description: "Benachbarte Wälder wachsen dreimal so schnell nach, abgeholzte Nachbarfelder werden neu bepflanzt.",
    art: "forester",
    biomes: "any-land",
    tiers: [{ cost: { wood: 10, stone: 5 }, unlockLevel: 1, buildSeconds: 6, workers: 1, forester: { neighborRegenMul: 3, replantsDepleted: true } }],
  },
  mine: {
    name: "Mine",
    description:
      "Fördert die festen Bodenschätze des Feldes. Nur auf einem Feld mit Vorkommen. +20 % je Nachbar-Gebirge. Verbraucht Werkzeug, Gold erst ab Stufe 2.",
    art: "mine",
    biomes: ["mountains", "desert", "savanna", "swamp", "tundra", "crystal", "lava", "ash"],
    needsDeposit: true,
    adjacency: [{ biome: "mountains", bonus: 0.2 }],
    tiers: [
      {
        cost: { wood: 20, stone: 10 },
        unlockLevel: 1,
        buildSeconds: 8,
        workers: 3,
        extracts: { resources: ["stone", "sand", "clay", "iron", "copper", "coal"], perWorker: 0.35 },
        pollution: 0.01,
        usesTools: true,
      },
      {
        cost: { steel: 10, concrete: 10, tools: 5 },
        unlockLevel: 5,
        buildSeconds: 12,
        workers: 5,
        extracts: { resources: ["stone", "sand", "clay", "iron", "copper", "coal", "gold", "uranium", "aetherite"], perWorker: 0.5 },
        energy: -2,
        pollution: 0.02,
        usesTools: true,
      },
    ],
  },
  pump: {
    name: "Pumpe",
    description:
      "Pumpt Wasser, Biogas und Öl aus dem Feld und Wasser aus einem benachbarten Meer. Braucht Wasser, Öl oder Biogas im Feld oder ein Nachbar-Meer. +50 % je Nachbar-Meer.",
    art: "pump",
    biomes: "any-land",
    needsDeposit: true,
    adjacency: [{ biome: "ocean", bonus: 0.5 }],
    tiers: [
      {
        cost: { stone: 12, wood: 8 },
        unlockLevel: 1,
        buildSeconds: 6,
        workers: 1,
        extracts: { resources: ["water", "biogas", "oil"], perWorker: 0.4, fromNeighbors: ["ocean"] },
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
  refinery: {
    name: "Raffinerie",
    description: "Macht aus Öl Treibstoff für Raketen. +25 % je Nachbar-Pumpe, stinkt für Wohnhäuser und Labore.",
    art: "refinery",
    biomes: "any-land",
    adjacency: [{ building: "pump", bonus: 0.25 }],
    tiers: [
      { cost: { planks: 15, stone: 20, iron: 10 }, unlockLevel: 2, buildSeconds: 12, workers: 2, crafts: { speed: 1 }, pollution: 0.02, usesTools: true },
      { cost: { steel: 15, bricks: 10, tools: 5 }, unlockLevel: 6, buildSeconds: 15, workers: 3, crafts: { speed: 1.5 }, energy: -1, pollution: 0.03, usesTools: true },
    ],
  },
  workshop: {
    name: "Werkstatt",
    description: "Macht Werkzeug, Kupferdraht und Stoff. +15 % je Nachbar-Sägewerk oder -Mine.",
    art: "workshop",
    biomes: "any-land",
    adjacency: [
      { building: "sawmill", bonus: 0.15 },
      { building: "mine", bonus: 0.15 },
    ],
    tiers: [
      { cost: { planks: 15, stone: 15 }, unlockLevel: 2, buildSeconds: 10, workers: 2, crafts: { speed: 1 } },
      { cost: { bricks: 15, steel: 10 }, unlockLevel: 5, buildSeconds: 12, workers: 4, crafts: { speed: 1.5 }, energy: -1 },
    ],
  },
  lab: {
    name: "Labor",
    description:
      "Erzeugt Wissen für Entdeckungen. +15 % je Nachbar-Kristallfeld, +10 % je Nachbar-Wohnhaus, −25 % je lautem Nachbarn (Mine, Gießerei, Kohlekraftwerk, Raffinerie).",
    art: "lab",
    biomes: "any-land",
    adjacency: [{ biome: "crystal", bonus: 0.15 }, { building: "housing", bonus: 0.1 }, ...NOISY],
    tiers: [
      { cost: { stone: 20, planks: 10, clay: 10 }, unlockLevel: 2, buildSeconds: 10, workers: 2, produces: { resource: "science", perWorker: 0.1 } },
      { cost: { glass: 15, steel: 10, wire: 5 }, unlockLevel: 5, buildSeconds: 15, workers: 4, produces: { resource: "science", perWorker: 0.15 }, energy: -1 },
    ],
  },
  storage: {
    name: "Lager",
    description: "Mehr Platz für alle Rohstoffe und Waren.",
    art: "storage",
    biomes: "any-land",
    tiers: [
      { cost: { planks: 20, stone: 20 }, unlockLevel: 2, buildSeconds: 8, workers: 0, storage: 100 },
      { cost: { concrete: 20, steel: 10 }, unlockLevel: 6, buildSeconds: 12, workers: 0, storage: 250 },
    ],
  },
  foundry: {
    name: "Gießerei",
    description:
      "Verarbeitet Rohstoffe nach dem gewählten Rezept. Stufe 2 arbeitet schneller und kann Plastik, Elektronik und Computer. +10 % je Nachbar-Mine, laut für Wohnhäuser und Labore.",
    art: "foundry",
    biomes: "any-land",
    adjacency: [{ building: "mine", bonus: 0.1 }],
    tiers: [
      { cost: { stone: 25, clay: 15, planks: 10 }, unlockLevel: 3, buildSeconds: 12, workers: 2, crafts: { speed: 1 }, pollution: 0.03 },
      { cost: { steel: 15, concrete: 15 }, unlockLevel: 6, buildSeconds: 15, workers: 4, crafts: { speed: 1.5 }, energy: -2, pollution: 0.04 },
    ],
  },
  market: {
    name: "Markt",
    description: "Erlaubt Handel mit anderen Völkern und Mitspielern.",
    art: "market",
    biomes: "any-land",
    unique: true,
    tiers: [{ cost: { planks: 20, stone: 20, cloth: 5 }, unlockLevel: 3, buildSeconds: 10, workers: 1 }],
  },
  watchtower: {
    name: "Wachturm",
    description: "+2 auf jeden Kampfwurf auf diesem Planeten.",
    art: "watchtower",
    biomes: "any-land",
    tiers: [{ cost: { stone: 25, planks: 15 }, unlockLevel: 4, buildSeconds: 10, workers: 1, defense: 2 }],
  },
  "power-wind": {
    name: "Windrad",
    description: "Kleine, saubere Energie ohne Arbeiter. +25 % je Nachbar-Gebirge, −40 % je Nachbar-Windrad (Windschatten).",
    art: "power-wind",
    biomes: "any-land",
    adjacency: [
      { biome: "mountains", bonus: 0.25 },
      { building: "power-wind", bonus: -0.4 },
    ],
    tiers: [{ cost: { planks: 15, stone: 10, wire: 5 }, unlockLevel: 4, buildSeconds: 8, workers: 0, energy: 2 }],
  },
  "power-coal": {
    name: "Kohlekraftwerk",
    description: "Viel Energie, verbraucht Kohle und verschmutzt die Luft.",
    art: "power-coal",
    biomes: "any-land",
    tiers: [
      { cost: { bricks: 20, iron: 15, wire: 5 }, unlockLevel: 4, buildSeconds: 12, workers: 1, energy: 6, upkeep: { coal: 0.1 }, pollution: 0.06 },
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
    tiers: [{ cost: { stone: 30, wood: 20, iron: 10 }, unlockLevel: 2, buildSeconds: 15, workers: 0 }],
  },
  "power-solar": {
    name: "Solarfeld",
    description: "Saubere Energie ohne Arbeiter. +30 % in der Wüste, −30 % je Nachbar-Kohlekraftwerk (Smog).",
    art: "power-solar",
    biomes: "any-land",
    biomeBonus: { biome: "desert", bonus: 0.3 },
    adjacency: [{ building: "power-coal", bonus: -0.3 }],
    tiers: [{ cost: { glass: 10, steel: 5, electronics: 1 }, unlockLevel: 7, buildSeconds: 10, workers: 0, energy: 3 }],
  },
  monument: {
    name: "Monument",
    description: "+6 Aufstiegspunkte pro Umlauf. Nur eins pro Planet.",
    art: "monument",
    biomes: "any-land",
    unique: true,
    tiers: [{ cost: { concrete: 40, steel: 25, gold: 10, aetherite: 10 }, unlockLevel: 8, buildSeconds: 20, workers: 0, ascension: 6 }],
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

export const RECIPE_IDS = [
  "planks", "tools", "wire", "cloth", "fuel",
  "charcoal", "bricks", "glass", "concrete", "steel", "biogas", "plastic", "electronics", "computer",
] as const;
export type RecipeId = (typeof RECIPE_IDS)[number];

/**
 * Recipes. `building` says where they are crafted (default foundry). Time per craft =
 * seconds / (workers × building speed × adjacency). Inputs are taken when a craft starts;
 * a craft never starts without all inputs.
 */
export const RECIPES = {
  planks: { name: "Bretter", inputs: { wood: 2 }, outputs: { planks: 1 }, seconds: 4, unlockLevel: 1, building: "sawmill", tier: 1 },
  tools: { name: "Werkzeug", inputs: { iron: 1, planks: 1 }, outputs: { tools: 2 }, seconds: 10, unlockLevel: 2, building: "workshop", tier: 1 },
  wire: { name: "Kupferdraht", inputs: { copper: 1 }, outputs: { wire: 1 }, seconds: 4, unlockLevel: 2, building: "workshop", tier: 1 },
  cloth: { name: "Stoff", inputs: { fiber: 3 }, outputs: { cloth: 1 }, seconds: 8, unlockLevel: 2, building: "workshop", tier: 1 },
  fuel: { name: "Treibstoff", inputs: { oil: 2 }, outputs: { fuel: 1 }, seconds: 8, unlockLevel: 2, building: "refinery", tier: 1, pollution: 0.02 },
  charcoal: { name: "Holzkohle", inputs: { wood: 3 }, outputs: { coal: 1 }, seconds: 6, unlockLevel: 3, tier: 1, pollution: 0.02 },
  bricks: { name: "Ziegel", inputs: { clay: 2, coal: 1 }, outputs: { bricks: 2 }, seconds: 6, unlockLevel: 3, tier: 1, pollution: 0.01 },
  glass: { name: "Glas", inputs: { sand: 2, coal: 1 }, outputs: { glass: 1 }, seconds: 8, unlockLevel: 3, tier: 1, pollution: 0.02 },
  concrete: { name: "Beton", inputs: { stone: 2, clay: 1, water: 1 }, outputs: { concrete: 1 }, seconds: 8, unlockLevel: 3, tier: 1 },
  steel: { name: "Stahl", inputs: { iron: 2, coal: 1 }, outputs: { steel: 1 }, seconds: 10, unlockLevel: 4, tier: 1, pollution: 0.03 },
  biogas: { name: "Biogas", inputs: { food: 3, water: 1 }, outputs: { biogas: 1 }, seconds: 6, unlockLevel: 5, tier: 1 },
  plastic: { name: "Plastik", inputs: { oil: 2 }, outputs: { plastic: 1 }, seconds: 10, unlockLevel: 6, tier: 2, energy: 1, pollution: 0.03 },
  electronics: {
    name: "Elektronik",
    inputs: { wire: 2, plastic: 1, glass: 1 },
    outputs: { electronics: 1 },
    seconds: 16,
    unlockLevel: 7,
    tier: 2,
    energy: 2,
  },
  computer: {
    name: "Computer",
    inputs: { electronics: 2, glass: 1, gold: 1 },
    outputs: { computer: 1 },
    seconds: 24,
    unlockLevel: 8,
    tier: 2,
    energy: 3,
  },
} as const satisfies Record<RecipeId, RecipeDef<ResourceId>>;
