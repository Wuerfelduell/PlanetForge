/**
 * Data-driven game content. Everything balancing-related lives here so it can be tuned
 * (or later loaded from JSON) without touching the simulation code.
 */

export const RESOURCE_IDS = ["food", "wood", "stone", "iron", "sand", "clay", "water", "science"] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

export interface ResourceDef {
  name: string;
  icon: string;
}

export const RESOURCES: Record<ResourceId, ResourceDef> = {
  food: { name: "Nahrung", icon: "🍎" },
  wood: { name: "Holz", icon: "🪵" },
  stone: { name: "Stein", icon: "🪨" },
  iron: { name: "Eisen", icon: "⛓️" },
  sand: { name: "Sand", icon: "⏳" },
  clay: { name: "Lehm", icon: "🧱" },
  water: { name: "Wasser", icon: "💧" },
  science: { name: "Wissen", icon: "🔬" },
};

export const BIOME_IDS = ["forest", "savanna", "mountains", "ocean", "desert", "swamp"] as const;
export type BiomeId = (typeof BIOME_IDS)[number];

export interface DepositDef {
  resource: ResourceId;
  /** Starting and maximum amount. Ignored when infinite. */
  max: number;
  infinite?: boolean;
  /** Can be collected by inhabitants without a building. */
  byHand?: boolean;
}

export interface BiomeDef {
  name: string;
  /** Placeholder color until real art arrives. */
  color: number;
  buildable: boolean;
  deposits: DepositDef[];
}

export const BIOMES: Record<BiomeId, BiomeDef> = {
  forest: {
    name: "Wald",
    color: 0x3f8f4f,
    buildable: true,
    deposits: [
      { resource: "wood", max: 80, byHand: true },
      { resource: "food", max: 25, byHand: true },
    ],
  },
  savanna: {
    name: "Savanne",
    color: 0x8cc55a,
    buildable: true,
    deposits: [{ resource: "food", max: 50, byHand: true }],
  },
  mountains: {
    name: "Gebirge",
    color: 0x8b8178,
    buildable: true,
    deposits: [
      { resource: "stone", max: 90, byHand: true },
      { resource: "iron", max: 50 },
    ],
  },
  ocean: {
    name: "Meer",
    color: 0x3d7fc4,
    buildable: false,
    deposits: [
      { resource: "food", max: 40, byHand: true },
      { resource: "water", max: 0, infinite: true, byHand: true },
    ],
  },
  desert: {
    name: "Wüste",
    color: 0xe0c072,
    buildable: true,
    deposits: [
      { resource: "sand", max: 90, byHand: true },
      { resource: "stone", max: 30 },
    ],
  },
  swamp: {
    name: "Sumpf",
    color: 0x6b7d4a,
    buildable: true,
    deposits: [
      { resource: "clay", max: 70, byHand: true },
      { resource: "water", max: 40 },
    ],
  },
};

export const BUILDING_IDS = ["housing", "farm", "mine", "pump", "lab"] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];

export interface BuildingDef {
  name: string;
  icon: string;
  description: string;
  cost: Partial<Record<ResourceId, number>>;
  /** Ascension level needed before it can be built. */
  unlockLevel: number;
  allowedBiomes: readonly BiomeId[];
  /** Max inhabitants working here. 0 = nobody works here. */
  workers: number;
  housing?: number;
  /** Produces from nothing, per worker and second. */
  produces?: { resource: ResourceId; perWorker: number };
  /** Extracts these resources from the segment's deposits, per worker and second. */
  extracts?: { resources: readonly ResourceId[]; perWorker: number };
  /** +bonus multiplier for each neighboring segment of the given biome. */
  adjacency?: { biome: BiomeId; bonus: number };
}

const LAND: readonly BiomeId[] = ["forest", "savanna", "mountains", "desert", "swamp"];

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  housing: {
    name: "Hütte",
    icon: "🛖",
    description: "Platz für 2 weitere Einwohner.",
    cost: { wood: 15 },
    unlockLevel: 0,
    allowedBiomes: LAND,
    workers: 0,
    housing: 2,
  },
  farm: {
    name: "Farm",
    icon: "🌾",
    description: "Baut Nahrung an, ohne den Boden zu erschöpfen. +25 % je Nachbar-Savanne.",
    cost: { wood: 12 },
    unlockLevel: 0,
    allowedBiomes: ["savanna", "forest", "swamp"],
    workers: 2,
    produces: { resource: "food", perWorker: 0.5 },
    adjacency: { biome: "savanna", bonus: 0.25 },
  },
  mine: {
    name: "Mine",
    icon: "⛏️",
    description: "Fördert alle Bodenschätze des Feldes, auch die ohne Werkzeug unerreichbaren. +25 % je Nachbar-Gebirge.",
    cost: { wood: 20, stone: 5 },
    unlockLevel: 1,
    allowedBiomes: ["mountains", "desert", "swamp"],
    workers: 3,
    extracts: { resources: ["stone", "iron", "sand", "clay", "water"], perWorker: 0.6 },
    adjacency: { biome: "mountains", bonus: 0.25 },
  },
  pump: {
    name: "Pumpe",
    icon: "🪣",
    description: "Pumpt Wasser. +50 % je Nachbar-Meer.",
    cost: { stone: 12 },
    unlockLevel: 1,
    allowedBiomes: LAND,
    workers: 1,
    produces: { resource: "water", perWorker: 0.5 },
    adjacency: { biome: "ocean", bonus: 0.5 },
  },
  lab: {
    name: "Labor",
    icon: "🔬",
    description: "Erzeugt Wissen.",
    cost: { stone: 20, iron: 10, water: 10 },
    unlockLevel: 2,
    allowedBiomes: LAND,
    workers: 2,
    produces: { resource: "science", perWorker: 0.2 },
  },
};

/** Simulation constants. */
export const RULES = {
  ticksPerSecond: 10,
  /** One planet rotation; drives food upkeep and ascension. */
  secondsPerCycle: 30,
  segmentCount: 24,
  startRevealRadius: 2,
  buildRevealRadius: 2,
  startPopulation: 3,
  baseHousing: 3,
  /** Inhabitants that can gather by hand on a segment without a building. */
  handWorkersPerSegment: 2,
  handRatePerWorker: 0.3,
  foodPerInhabitantPerCycle: 2,
  starvingRateFactor: 0.5,
  birthFoodCost: 10,
  secondsPerBirth: 12,
  /** Fraction of max that regrows per second on a segment nobody works on. */
  regenPerSecond: 0.01,
  demolishRefund: 0.5,
  /** Cumulative ascension points needed for level 1, 2, 3, … */
  ascensionThresholds: [15, 50, 120, 250, 450, 750, 1200, 1800, 2600, 3600],
  startResources: { food: 20, wood: 10 } as Partial<Record<ResourceId, number>>,
} as const;
