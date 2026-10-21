/**
 * Data-driven game content. Everything balancing-related lives here so it can be tuned
 * (or later loaded from JSON) without touching the simulation code.
 */

export const RESOURCE_IDS = [
  "food", "wood", "stone", "iron", "sand", "clay", "water", "coal", "oil", "uranium", "aetherite", "science",
  // Tinkering (src/data/balance, "Tüfteln"): raw goods and what sawmill and workshop make of them.
  "fiber", "copper", "planks", "tools", "wire", "cloth",
  // Foundry goods and deep deposits (stage 2 buildings).
  "bricks", "gold",
] as const;
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
  fiber: { name: "Fasern", icon: "🌿" },
  copper: { name: "Kupfer", icon: "🟠" },
  planks: { name: "Bretter", icon: "🪵" },
  tools: { name: "Werkzeug", icon: "🔧" },
  wire: { name: "Kupferdraht", icon: "🧵" },
  cloth: { name: "Stoff", icon: "🧶" },
  bricks: { name: "Ziegel", icon: "🧱" },
  gold: { name: "Gold", icon: "🪙" },
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
  /** Deep deposit: only a building stage that lists it reaches it (gold, mine stage 2). */
  tier?: 2;
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
    deposits: [
      { resource: "food", max: 50, byHand: true },
      { resource: "fiber", max: 50, byHand: true },
    ],
  },
  mountains: {
    name: "Gebirge",
    color: 0x8b8178,
    buildable: true,
    deposits: [
      { resource: "stone", max: 90, byHand: true },
      { resource: "iron", max: 50 },
      { resource: "copper", max: 45 },
      { resource: "gold", max: 15, tier: 2 },
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
      { resource: "copper", max: 30 },
    ],
  },
  swamp: {
    name: "Sumpf",
    color: 0x6b7d4a,
    buildable: true,
    deposits: [
      { resource: "clay", max: 70, byHand: true },
      { resource: "water", max: 40 },
      { resource: "fiber", max: 30, byHand: true },
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

export const BUILDING_IDS = ["housing", "farm", "sawmill", "forester", "mine", "pump", "workshop", "lab", "foundry", "launchpad", "watchtower", "battery"] as const;
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
  /**
   * Multiplier change per neighbor of the given biome or building. Negative = penalty (noise, dust).
   * All entries add up; the total never goes below 0. On housing it scales the living space.
   */
  adjacency?: readonly AdjacencyDef[];
  /** Runs these recipes (the segment's `gather` picks one); speed multiplier on recipe time. */
  crafts?: { recipes: readonly RecipeId[]; speed: number };
  /** Needs at least one neighbor of one of these biomes (sawmill next to forest). */
  needsNeighbor?: readonly BiomeId[];
  /** Only on a segment with a deposit it can work (pumps also next to an ocean). */
  needsDeposit?: boolean;
  /** Workers wear out tools (RULES.tools); without tools it runs slower. */
  usesTools?: boolean;
  /** Worked foresters make neighbor forests regrow faster and replant empty ones. */
  forester?: { neighborRegenMul: number; replantsDepleted: boolean };
  /**
   * Upgrades in place: stage 2, 3, … Each costs `cost`, needs `unlockLevel`, and its values
   * replace the stage below (they do not add up). Workers stay on the building.
   */
  upgrades?: readonly BuildingUpgrade[];
  /** Added to the defenders' battle rolls on this planet (counted up to RULES.maxTowerBonus). */
  defense?: number;
  /** Damage to a besieging invader ship per worker and siege round. */
  battery?: number;
}

export type BuildingUpgrade = Pick<BuildingDef, "cost" | "unlockLevel"> &
  Partial<Pick<BuildingDef, "workers" | "housing" | "produces" | "extracts" | "crafts" | "battery" | "defense">>;

export interface AdjacencyDef {
  biome?: BiomeId;
  building?: BuildingId;
  bonus: number;
}

/** Buildings whose noise lowers housing and lab output next to them. */
const NOISY: readonly AdjacencyDef[] = [
  { building: "mine", bonus: -0.25 },
  { building: "foundry", bonus: -0.25 },
];

const LAND: readonly BiomeId[] = ["forest", "savanna", "mountains", "desert", "swamp", "tundra", "crystal"];

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  housing: {
    name: "Hütte",
    icon: "🛖",
    description: "Platz für 2 weitere Einwohner. Je Nachbar-Mine wird es enger (Lärm), Nachbar-Wälder geben etwas mehr Platz.",
    cost: { wood: 15 },
    unlockLevel: 0,
    allowedBiomes: LAND,
    workers: 0,
    housing: 2,
    adjacency: [...NOISY, { biome: "forest", bonus: 0.1 }],
    upgrades: [
      { cost: { planks: 10, clay: 10, stone: 10 }, unlockLevel: 2, housing: 4 },
      { cost: { bricks: 15, cloth: 5, iron: 10 }, unlockLevel: 5, housing: 7 },
    ],
  },
  farm: {
    name: "Farm",
    icon: "🌾",
    description: "Baut Nahrung an, ohne den Boden zu erschöpfen. +25 % je Nachbar-Savanne, +20 % je Nachbar-Pumpe, −25 % je Nachbar-Mine (Staub).",
    cost: { wood: 12 },
    unlockLevel: 0,
    allowedBiomes: ["savanna", "forest", "swamp"],
    workers: 2,
    produces: { resource: "food", perWorker: 0.5 },
    adjacency: [
      { biome: "savanna", bonus: 0.25 },
      { building: "pump", bonus: 0.2 },
      { building: "mine", bonus: -0.25 },
    ],
    upgrades: [{ cost: { planks: 10, bricks: 10 }, unlockLevel: 4, workers: 4 }],
  },
  sawmill: {
    name: "Sägewerk",
    icon: "🪚",
    description: "Macht aus Holz Bretter. Muss neben einem Wald stehen, +30 % je Nachbar-Wald. Verbraucht Werkzeug.",
    cost: { wood: 20, stone: 10 },
    unlockLevel: 1,
    allowedBiomes: LAND,
    workers: 2,
    crafts: { recipes: ["planks"], speed: 1 },
    needsNeighbor: ["forest"],
    adjacency: [{ biome: "forest", bonus: 0.3 }],
    usesTools: true,
    upgrades: [{ cost: { bricks: 10, tools: 5 }, unlockLevel: 4, workers: 4, crafts: { recipes: ["planks"], speed: 1.5 } }],
  },
  forester: {
    name: "Förster",
    icon: "🌲",
    description: "Benachbarte Wälder wachsen dreimal so schnell nach, abgeholzte Nachbarwälder werden neu bepflanzt. Braucht einen Arbeiter.",
    cost: { wood: 10, stone: 5 },
    unlockLevel: 1,
    allowedBiomes: LAND,
    workers: 1,
    forester: { neighborRegenMul: 3, replantsDepleted: true },
  },
  mine: {
    name: "Mine",
    icon: "⛏️",
    description: "Fördert die Bodenschätze des Feldes, auch die ohne Werkzeug unerreichbaren. Nur auf einem Feld mit Vorkommen. +25 % je Nachbar-Gebirge. Verbraucht Werkzeug.",
    cost: { wood: 20, stone: 5 },
    unlockLevel: 1,
    allowedBiomes: ["mountains", "desert", "swamp", "tundra", "crystal", "forest"],
    workers: 3,
    extracts: { resources: ["stone", "iron", "copper", "sand", "clay", "coal", "oil", "uranium", "aetherite"], perWorker: 0.6 },
    adjacency: [{ biome: "mountains", bonus: 0.25 }],
    needsDeposit: true,
    usesTools: true,
    upgrades: [
      {
        cost: { iron: 15, bricks: 10, tools: 5 },
        unlockLevel: 5,
        workers: 5,
        extracts: { resources: ["stone", "iron", "copper", "sand", "clay", "coal", "oil", "uranium", "aetherite", "gold"], perWorker: 0.8 },
      },
    ],
  },
  pump: {
    name: "Pumpe",
    icon: "🪣",
    description: "Pumpt Wasser. Braucht Wasser im Feld oder ein Nachbar-Meer. +50 % je Nachbar-Meer.",
    cost: { stone: 12 },
    unlockLevel: 1,
    allowedBiomes: LAND,
    workers: 1,
    produces: { resource: "water", perWorker: 0.5 },
    adjacency: [{ biome: "ocean", bonus: 0.5 }],
    needsDeposit: true,
  },
  workshop: {
    name: "Werkstatt",
    icon: "🛠️",
    description: "Macht Werkzeug, Kupferdraht oder Stoff. +15 % je Nachbar-Sägewerk oder -Mine.",
    cost: { planks: 15, stone: 15 },
    unlockLevel: 2,
    allowedBiomes: LAND,
    workers: 2,
    crafts: { recipes: ["tools", "wire", "cloth"], speed: 1 },
    adjacency: [
      { building: "sawmill", bonus: 0.15 },
      { building: "mine", bonus: 0.15 },
    ],
    upgrades: [{ cost: { bricks: 15, iron: 10 }, unlockLevel: 5, workers: 4, crafts: { recipes: ["tools", "wire", "cloth"], speed: 1.5 } }],
  },
  lab: {
    name: "Labor",
    icon: "🔬",
    description: "Erzeugt Wissen. +15 % je Nachbar-Kristallfeld, +10 % je Nachbar-Hütte, −25 % je Nachbar-Mine (Lärm).",
    cost: { stone: 20, planks: 10, water: 10 },
    unlockLevel: 2,
    allowedBiomes: LAND,
    workers: 2,
    produces: { resource: "science", perWorker: 0.2 },
    adjacency: [{ biome: "crystal", bonus: 0.15 }, { building: "housing", bonus: 0.1 }, ...NOISY],
    upgrades: [{ cost: { bricks: 10, wire: 5, gold: 3 }, unlockLevel: 5, workers: 4, produces: { resource: "science", perWorker: 0.25 } }],
  },
  foundry: {
    name: "Gießerei",
    icon: "🏭",
    description: "Brennt Ziegel oder Holzkohle. +10 % je Nachbar-Mine. Laut für Hütten und Labore.",
    cost: { stone: 25, clay: 15, planks: 10 },
    unlockLevel: 3,
    allowedBiomes: LAND,
    workers: 2,
    crafts: { recipes: ["bricks", "charcoal"], speed: 1 },
    adjacency: [{ building: "mine", bonus: 0.1 }],
  },
  launchpad: {
    name: "Startrampe",
    icon: "🚀",
    description: "Schickt Raketen mit Einwohnern zu anderen Planeten.",
    cost: { wood: 25, stone: 15 },
    unlockLevel: 2,
    allowedBiomes: LAND,
    workers: 0,
  },
  watchtower: {
    name: "Wachturm",
    icon: "🗼",
    description: "+1 auf die Würfe der Verteidiger dieses Planeten.",
    cost: { planks: 10, stone: 20 },
    unlockLevel: 2,
    allowedBiomes: LAND,
    workers: 0,
    defense: 1,
  },
  battery: {
    name: "Abwehrbatterie",
    icon: "🎯",
    description: "Schießt auf Invasoren über dem Planeten: je Arbeiter 1 Treffer pro Umlauf.",
    cost: { iron: 25, stone: 25, wood: 10 },
    unlockLevel: 5,
    allowedBiomes: LAND,
    workers: 2,
    battery: 1,
  },
};

export type RecipeId = "planks" | "tools" | "wire" | "cloth" | "bricks" | "charcoal";

export interface RecipeDef {
  name: string;
  inputs: Partial<Record<ResourceId, number>>;
  outputs: Partial<Record<ResourceId, number>>;
  /** Seconds per craft with one worker at speed 1. */
  seconds: number;
}

/** Recipes; the id is also the main output, so a segment's `gather` names the chosen recipe. */
export const RECIPES: Record<RecipeId, RecipeDef> = {
  planks: { name: "Bretter", inputs: { wood: 2 }, outputs: { planks: 1 }, seconds: 4 },
  tools: { name: "Werkzeug", inputs: { iron: 1, planks: 1 }, outputs: { tools: 2 }, seconds: 10 },
  wire: { name: "Kupferdraht", inputs: { copper: 1 }, outputs: { wire: 1 }, seconds: 4 },
  cloth: { name: "Stoff", inputs: { fiber: 3 }, outputs: { cloth: 1 }, seconds: 8 },
  bricks: { name: "Ziegel", inputs: { clay: 2, coal: 1 }, outputs: { bricks: 2 }, seconds: 6 },
  charcoal: { name: "Holzkohle", inputs: { wood: 3 }, outputs: { coal: 1 }, seconds: 6 },
};

/**
 * Invaders from other star systems (design 13.1), coop and solo only. Waves follow from seed and
 * time; each one targets a planet (or the sun shield, 13.3), besieges it for a few cycles and
 * leaves when its mothership is destroyed or after plundering.
 */
export const INVADERS = {
  /** Team ascension level from which waves come. */
  minLevel: 5,
  firstWaveCycles: [8, 16] as const,
  waveIntervalCycles: [20, 35] as const,
  approachCycles: 6,
  /** Without long-range sight the team sees the fleet only this many cycles before arrival. */
  blindWarningCycles: 1,
  siegeCycles: 5,
  shipHp: { base: 6, perWave: 4 },
  /** Escorts add to their roll: floor(wave × escortBonusPerWave). */
  escortBonusPerWave: 0.5,
  strongMul: 1.5,
  /** Share of every stockpile taken when the fleet leaves undefeated. */
  plunderShare: 0.2,
  reward: { science: 30, iron: 15 },
  /** Never kills the last inhabitants of a planet, so it can grow again. */
  minSurvivors: 2,
  /** Damage to a shield segment per siege round. */
  shieldDamage: 25,
  /** Chance that a wave goes for the shield once a segment stands (design 13.3). */
  shieldTargetChance: 0.5,
} as const;

/** The sun turns supernova (design 13.2); a complete shield prevents it. */
export const SUPERNOVA = {
  /** Supernova cycle drawn from the seed. */
  cycles: [400, 600] as const,
  firstHintCycle: 200,
  hintEveryCycles: 50,
  segments: 12,
  /** Each standing segment pushes the supernova back. */
  delayPerSegmentCycles: 20,
  /** A segment below this hp does not count. */
  workingHp: 50,
  segmentCost: { iron: 40, stone: 60, aetherite: 10, science: 20 } as Partial<Record<ResourceId, number>>,
  repairCost: { iron: 15, stone: 15 } as Partial<Record<ResourceId, number>>,
  /** Inhabitants who fly to the sun to build or repair, then come back. */
  crew: 2,
  unlockLevel: 4,
} as const;

export interface RocketDef {
  name: string;
  icon: string;
  /** Paid on every launch; the rocket is used up on landing. */
  cost: Partial<Record<ResourceId, number>>;
  unlockLevel: number;
  capacity: number;
  /** Fuel = ceil(distance × (perDistance + perPassenger × passengers)). */
  fuel: { resource: ResourceId; perDistance: number; perPassenger: number };
  secondsPerDistance: number;
  maxRange: number;
  versusOnly?: boolean;
}

/**
 * Rockets (numbers after src/data/balance SPACE). Fuel is wood for now: oil is not on every
 * versus start planet and there is no trade yet, and nobody may be locked out of flying.
 */
export const ROCKET_IDS = ["colony", "combat"] as const;
export type RocketId = (typeof ROCKET_IDS)[number];

export const ROCKETS: Record<RocketId, RocketDef> = {
  colony: {
    name: "Siedlerrakete",
    icon: "🚀",
    cost: { wood: 15, stone: 10 },
    unlockLevel: 2,
    capacity: 3,
    fuel: { resource: "wood", perDistance: 1.5, perPassenger: 1 },
    secondsPerDistance: 3,
    maxRange: 16,
  },
  combat: {
    name: "Kampfrakete",
    icon: "⚔️",
    cost: { iron: 20, wood: 20, stone: 15 },
    unlockLevel: 3,
    capacity: 4,
    fuel: { resource: "wood", perDistance: 2, perPassenger: 1.5 },
    secondsPerDistance: 4,
    maxRange: 16,
    versusOnly: true,
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
/** Asteroids are not drawn for free planets; they come in their own belt (SYSTEM.asteroids). */
export type PlanetTypeId = (typeof PLANET_TYPE_IDS)[number] | "asteroid";

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
  asteroid: { name: "Asteroid", biomeWeights: { mountains: 3, crystal: 2 } },
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
  /** Small rocks between the orbits, reachable with the discovery "Weltraumbergbau". */
  asteroids: { min: 2, max: 4, segments: 12, rare: { min: 1, max: 2 } },
} as const;

/** Simulation constants. */
export const RULES = {
  ticksPerSecond: 10,
  /** Default for settings.cycleSeconds: one planet rotation; drives food upkeep and ascension. */
  defaultCycleSeconds: 30,
  /** Build orders per planet queue. */
  queueLength: 3,
  /** Entries kept in GameState.log. */
  logLength: 200,
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
  /**
   * Tools wear out: every worker in a building with `usesTools` uses this many per minute from the
   * team's ascension level `fromLevel` on (when the workshop unlocks). Without tools: withoutToolsMul.
   */
  tools: { perWorkerPerMinute: 0.1, withoutToolsMul: 0.6, fromLevel: 2 },
  /** Cumulative ascension points needed for level 1, 2, 3, … */
  ascensionThresholds: [15, 50, 120, 250, 450, 750, 1200, 1800, 2600, 3600],
  startResources: { food: 20, wood: 10 } as Partial<Record<ResourceId, number>>,
  /** A fresh colony reveals this far around its landing site. */
  colonyRevealRadius: 1,
  battleDie: 6,
  /** Defenders fight at home: added to their rolls; ties go to the defenders too. */
  homeAdvantage: 1,
  maxTowerBonus: 2,
  /** versus: captives count for their original owner for this many cycles, then join the captor. */
  captiveAssimilationCycles: 10,
  /** versus: after this many cycles without a battle the game offers a draw. */
  drawOfferCycles: 300,
} as const;
