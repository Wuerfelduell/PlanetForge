/**
 * Data-driven game content. Everything balancing-related lives here so it can be tuned
 * (or later loaded from JSON) without touching the simulation code.
 */

export const RESOURCE_IDS = ["food", "wood", "stone", "iron", "sand", "clay", "water", "coal", "oil", "uranium", "aetherite", "science"] as const;
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
  coal: { name: "Kohle", icon: "⚫" },
  oil: { name: "Öl", icon: "🛢️" },
  uranium: { name: "Uran", icon: "🟢" },
  aetherite: { name: "Ätherit", icon: "💎" },
  science: { name: "Wissen", icon: "🔬" },
};

export const BIOME_IDS = ["forest", "savanna", "mountains", "ocean", "desert", "swamp", "tundra", "crystal"] as const;
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
  tundra: {
    name: "Tundra",
    color: 0xd8e4ec,
    buildable: true,
    deposits: [
      { resource: "stone", max: 50, byHand: true },
      { resource: "water", max: 60, byHand: true },
    ],
  },
  crystal: {
    name: "Kristallfeld",
    color: 0x9b7fd1,
    buildable: true,
    deposits: [
      { resource: "stone", max: 40, byHand: true },
      { resource: "aetherite", max: 40 },
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

const LAND: readonly BiomeId[] = ["forest", "savanna", "mountains", "desert", "swamp", "tundra", "crystal"];

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
    allowedBiomes: ["mountains", "desert", "swamp", "tundra", "crystal", "forest"],
    workers: 3,
    extracts: { resources: ["stone", "iron", "sand", "clay", "coal", "oil", "uranium", "aetherite"], perWorker: 0.6 },
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

/** Playable peoples (ids from the asset list). Bonuses and abilities come with the balancing data. */
export const PEOPLE_IDS = ["burrowbeavers", "quillfolk", "axolings", "shellguards", "dunehoppers", "starowls", "tideotters", "hornbeetles", "frostseals", "swapcoons", "glowsnails", "echobats"] as const;
export type PeopleId = (typeof PEOPLE_IDS)[number];

export const PEOPLES: Record<PeopleId, { name: string; icon: string }> = {
  burrowbeavers: { name: "Dammbiber", icon: "🦫" },
  quillfolk: { name: "Stachelvolk", icon: "🦔" },
  axolings: { name: "Axolinge", icon: "🦎" },
  shellguards: { name: "Panzerlinge", icon: "🛡️" },
  dunehoppers: { name: "Dünenhüpfer", icon: "🐭" },
  starowls: { name: "Sterneulen", icon: "🦉" },
  tideotters: { name: "Gezeitenotter", icon: "🦦" },
  hornbeetles: { name: "Hornkäfer", icon: "🪲" },
  frostseals: { name: "Frostrobben", icon: "🦭" },
  swapcoons: { name: "Tauschbären", icon: "🦝" },
  glowsnails: { name: "Glimmschnecken", icon: "🐌" },
  echobats: { name: "Echoflatterer", icon: "🦇" },
};

export const PLANET_TYPE_IDS = ["temperate", "arid", "ice", "ocean", "lava", "toxic"] as const;
export type PlanetTypeId = (typeof PLANET_TYPE_IDS)[number];

export interface PlanetTypeDef {
  name: string;
  /** Relative chance of each biome on this planet type. */
  biomeWeights: Partial<Record<BiomeId, number>>;
}

export const PLANET_TYPES: Record<PlanetTypeId, PlanetTypeDef> = {
  temperate: { name: "Gemäßigt", biomeWeights: { forest: 3, savanna: 3, mountains: 2, ocean: 2, swamp: 1, desert: 1 } },
  arid: { name: "Trocken", biomeWeights: { desert: 4, savanna: 2, mountains: 2, ocean: 0.5 } },
  ice: { name: "Eis", biomeWeights: { tundra: 4, mountains: 2, ocean: 2 } },
  ocean: { name: "Ozean", biomeWeights: { ocean: 5, swamp: 2, forest: 1, savanna: 1 } },
  lava: { name: "Lava", biomeWeights: { mountains: 3, desert: 2, crystal: 1.5 } },
  toxic: { name: "Giftig", biomeWeights: { swamp: 4, crystal: 2, desert: 1 } },
};

/**
 * Rare resources are not tied to a biome. The generator places them as extra deposits so that
 * start planets complement each other (see design/koop-design.md, 4.1). Each entry lists the
 * biomes a deposit may sit on.
 */
export const RARE_RESOURCES: Partial<Record<ResourceId, readonly BiomeId[]>> = {
  coal: ["mountains", "forest", "swamp"],
  oil: ["desert", "swamp"],
  uranium: ["mountains", "desert"],
  aetherite: ["crystal", "mountains"],
};

export const SYSTEM = {
  /** Start planets are always generated for this many players, so others can join later. */
  maxPlayers: 4,
  freePlanets: { min: 2, max: 4 },
  /** versus: one start planet per player. */
  startPlanetSegments: 24,
  /** coop: one shared start planet. Bigger, because the game is about workers, not space. */
  coopStartPlanetSegments: 32,
  freePlanetSegments: [16, 24, 32],
  /** Rare deposits per start planet / per free planet. */
  rarePerStartPlanet: 2,
  rarePerFreePlanet: { min: 2, max: 4 },
  rareDepositMax: 60,
  sunTypes: ["yellow", "red", "blue", "white"],
} as const;

/** Simulation constants. */
export const RULES = {
  ticksPerSecond: 10,
  /** One planet rotation; drives food upkeep and ascension. */
  secondsPerCycle: 30,
  startRevealRadius: 2,
  buildRevealRadius: 2,
  startPopulation: 3,
  /** coop: each player who joins brings this many inhabitants to the shared planet. */
  coopJoinPopulation: 2,
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
