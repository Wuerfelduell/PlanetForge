/**
 * Data-driven game content. Everything balancing-related lives here so it can be tuned
 * (or later loaded from JSON) without touching the simulation code.
 */

import { RULES as BALANCE_RULES } from "../data/balance/progression";

export const RESOURCE_IDS = [
  "food", "wood", "stone", "iron", "sand", "clay", "water", "coal", "oil", "uranium", "aetherite", "science",
  // Tinkering (src/data/balance, "Tüfteln"): raw goods and what sawmill and workshop make of them.
  "fiber", "copper", "planks", "tools", "wire", "cloth",
  // Foundry goods and deep deposits (stage 2 buildings).
  "bricks", "gold",
  // Rocket fuel from the refinery (Seb: flying should be harder and need oil).
  "fuel",
  // Glassworks and foundry goods for the later buildings (greenhouse, observatory, power plants).
  "glass", "steel", "concrete",
  // Late chains after Planet of Mine: biogas from swamps or food, plastic from oil, then electronics and computers.
  "biogas", "plastic", "electronics", "computer",
  // Seb: settlers on planets without breathable air need space suits, or they die off.
  "suits",
  // Gems (Seb): very rare, a handful per world, needed only for a few special things.
  "diamond", "emerald", "ruby",
  // More ores (Seb: "mehr verschiedene Erze"): tin and silver mined as they are, bauxite and
  // ilmenite smelted to aluminium and titanium, platinum only from asteroids and far planets.
  "tin", "silver", "bauxite", "ilmenite", "platinum", "bronze", "aluminium", "titanium",
  // Warp systems (Seb): exotic matter only found in the neighbor systems behind the warp gate.
  "antimatter", "neutronium", "xenocrystal",
  // Planet interior (Seb): very rare ores only the core mine reaches, and deep suits for the
  // people working down there (not used up: one per worker).
  "core-iron", "ember-crystal", "deep-quartz", "deep-suit",
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
  fuel: { name: "Treibstoff", icon: "⛽" },
  glass: { name: "Glas", icon: "🪟" },
  steel: { name: "Stahl", icon: "🔩" },
  concrete: { name: "Beton", icon: "⬜" },
  biogas: { name: "Biogas", icon: "🫧" },
  plastic: { name: "Plastik", icon: "🧴" },
  electronics: { name: "Elektronik", icon: "💡" },
  computer: { name: "Computer", icon: "💻" },
  suits: { name: "Raumanzug", icon: "🧑‍🚀" },
  diamond: { name: "Diamant", icon: "💠" },
  emerald: { name: "Smaragd", icon: "✳️" },
  ruby: { name: "Rubin", icon: "♦️" },
  tin: { name: "Zinn", icon: "🥫" },
  silver: { name: "Silber", icon: "🥈" },
  bauxite: { name: "Bauxit", icon: "🟤" },
  ilmenite: { name: "Titanerz", icon: "🌑" },
  platinum: { name: "Platin", icon: "⚪" },
  bronze: { name: "Bronze", icon: "🥉" },
  aluminium: { name: "Aluminium", icon: "🥄" },
  titanium: { name: "Titan", icon: "🛡️" },
  antimatter: { name: "Antimaterie", icon: "⚛️" },
  neutronium: { name: "Neutronium", icon: "🟣" },
  xenocrystal: { name: "Xenokristall", icon: "🔷" },
  "core-iron": { name: "Kerneisen", icon: "🧲" },
  "ember-crystal": { name: "Glutkristall", icon: "🔶" },
  "deep-quartz": { name: "Tiefenquarz", icon: "🔮" },
  "deep-suit": { name: "Tiefenanzug", icon: "🥽" },
};

export const BIOME_IDS = [
  "forest", "savanna", "mountains", "ocean", "desert", "swamp", "tundra", "crystal", "glacier", "lava", "ash",
  // Only inside a planet (CORE): caves around the glowing core.
  "mushroom-forest", "crystal-grotto", "magma-lake", "primal-sea",
] as const;
export type BiomeId = (typeof BIOME_IDS)[number];

export interface DepositDef {
  resource: ResourceId;
  /** Starting and maximum amount. Ignored when infinite. */
  max: number;
  infinite?: boolean;
  /** Can be collected by inhabitants without a building. */
  byHand?: boolean;
  /** Deep deposit: only a building stage that lists it reaches it (gold and silver, mine stage 2). */
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
      // Seb: under the trees there is ground too; a mine reaches it.
      { resource: "stone", max: 30 },
      { resource: "clay", max: 25 },
    ],
  },
  savanna: {
    name: "Savanne",
    color: 0x8cc55a,
    buildable: true,
    deposits: [
      { resource: "food", max: 50, byHand: true },
      { resource: "fiber", max: 50, byHand: true },
      { resource: "stone", max: 25 },
      { resource: "clay", max: 30 },
      { resource: "bauxite", max: 50 },
    ],
  },
  mountains: {
    name: "Gebirge",
    color: 0x8b8178,
    buildable: true,
    deposits: [
      { resource: "stone", max: 90, byHand: true },
      { resource: "iron", max: 70 },
      { resource: "copper", max: 45 },
      { resource: "gold", max: 15, tier: 2 },
      { resource: "tin", max: 25 },
      { resource: "silver", max: 15, tier: 2 },
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
      { resource: "ilmenite", max: 20 },
      { resource: "bauxite", max: 25 },
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
      { resource: "bauxite", max: 40 },
    ],
  },
  tundra: {
    name: "Tundra",
    color: 0xd8e4ec,
    buildable: true,
    deposits: [
      { resource: "stone", max: 50, byHand: true },
      { resource: "water", max: 60, byHand: true },
      { resource: "iron", max: 42 },
      { resource: "tin", max: 35 },
      { resource: "silver", max: 20, tier: 2 },
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
  // Ice and lava worlds (Seb: "mehr Terrainfelder wie Eis, Lava"). Glacier and lava are hard
  // ground: little to build, but terraforming opens them up (thaw → tundra, cool → ash → forest).
  glacier: {
    name: "Gletscher",
    color: 0xb8e2f2,
    buildable: false,
    deposits: [
      { resource: "water", max: 100, byHand: true },
      { resource: "stone", max: 20, byHand: true },
    ],
  },
  lava: {
    name: "Lavafeld",
    color: 0xd4502a,
    buildable: true,
    deposits: [
      { resource: "stone", max: 60, byHand: true },
      { resource: "iron", max: 63 },
      { resource: "gold", max: 20, tier: 2 },
      { resource: "ilmenite", max: 35 },
    ],
  },
  ash: {
    name: "Aschefeld",
    color: 0x6e6670,
    buildable: true,
    deposits: [
      { resource: "sand", max: 50, byHand: true },
      { resource: "stone", max: 30, byHand: true },
      { resource: "coal", max: 25 },
      { resource: "ilmenite", max: 25 },
    ],
  },
  // Inside a planet (CORE): small deposits that never regrow; only the core mine reaches them.
  "mushroom-forest": {
    name: "Pilzwald",
    color: 0x7a5aa8,
    buildable: true,
    deposits: [
      { resource: "ember-crystal", max: 8 },
      { resource: "aetherite", max: 15 },
    ],
  },
  "crystal-grotto": {
    name: "Kristallgrotte",
    color: 0x5fc6d6,
    buildable: true,
    deposits: [
      { resource: "deep-quartz", max: 10 },
      { resource: "core-iron", max: 8 },
    ],
  },
  "magma-lake": {
    name: "Magmasee",
    color: 0xe0612a,
    buildable: true,
    deposits: [
      { resource: "core-iron", max: 14 },
      { resource: "ember-crystal", max: 10 },
    ],
  },
  "primal-sea": {
    name: "Urmeer",
    color: 0x2f6f8f,
    buildable: true,
    deposits: [
      { resource: "deep-quartz", max: 12 },
      { resource: "uranium", max: 15 },
    ],
  },
};

export const BUILDING_IDS = [
  "housing", "park", "monument",
  "farm", "fishery", "hydro-farm",
  "forester", "mine", "pump",
  "sawmill", "workshop", "foundry", "glassworks", "plastics", "biogas-plant", "electronics",
  "lab", "library", "observatory", "datacenter",
  "power-wind", "power-coal", "power-gas", "power-solar", "power-atomic",
  "watchtower", "battery",
  "launchpad", "refinery",
  "gem-mine", "crystal-palace", "prism-dome", "ruby-laser",
  "smelter", "bell-tower", "power-tower", "deep-drill", "power-fuelcell", "treasury",
  "pitfall", "barracks", "flak", "missile-launcher", "shield-generator", "ion-cannon",
  "warpgate", "exo-drill", "power-antimatter", "neutron-bastion", "shell-armor", "xeno-lab",
  "core-drill", "core-mine", "support-pillar", "power-geothermal", "gravity-cannon", "core-armor", "quantum-lab", "warp-core",
] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];

/** Tabs of the build menu, in this order. */
export const BUILDING_CATEGORY_IDS = ["housing", "food", "resources", "production", "research", "energy", "defense", "space"] as const;
export type BuildingCategory = (typeof BUILDING_CATEGORY_IDS)[number];

export const BUILDING_CATEGORIES: Record<BuildingCategory, { name: string; icon: string }> = {
  housing: { name: "Wohnraum", icon: "🏠" },
  food: { name: "Nahrung", icon: "🍎" },
  resources: { name: "Rohstoffe", icon: "⛏️" },
  production: { name: "Produktion", icon: "🛠️" },
  research: { name: "Forschung", icon: "🔬" },
  energy: { name: "Energie", icon: "⚡" },
  defense: { name: "Verteidigung", icon: "🛡️" },
  space: { name: "Raumfahrt", icon: "🚀" },
};

export interface BuildingDef {
  name: string;
  icon: string;
  /** Build menu tab. */
  category: BuildingCategory;
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
  /** Each battery round uses this much per firing worker; without it that worker cannot fire. */
  ammo?: { resource: ResourceId; perShot: number };
  /**
   * Attackers shot down on arrival, before the dice battle: per worker, or per building when
   * nobody works here (counted up to RULES.maxIntercept per planet).
   */
  intercept?: number;
  /** Added to the rolls of combat rockets launched from this planet (counted up to RULES.maxAttackBonus). */
  attack?: number;
  /**
   * Worked planetary shield: invaders cannot wreck or burn anything here, and attackers roll
   * this much lower.
   */
  shield?: number;
  /**
   * Power on the planet's grid: positive feeds it (scaled by adjacency, and by the crew on manned
   * plants), negative draws from it. Short of power, consumers run at RULES.energy.unpoweredMul.
   */
  energy?: number;
  /** Burns this much per second with a full crew (power plants); without it there is no power. */
  burns?: { resource: ResourceId; perSecond: number };
  /** Extra ascension points per cycle. */
  ascension?: number;
  /** At most one per planet. */
  unique?: boolean;
  /** Shield shell hits by invaders do this much less damage while one stands anywhere (counted up to WARP.maxShellArmor). */
  shellArmor?: number;
  /** Like shellArmor, on top of it, counted up to CORE.maxCoreArmor. */
  coreArmor?: number;
  /** Cannot be built in versus. */
  coopOnly?: boolean;
}

export type BuildingUpgrade = Pick<BuildingDef, "cost" | "unlockLevel"> &
  Partial<Pick<BuildingDef, "name" | "icon" | "workers" | "housing" | "produces" | "extracts" | "crafts" | "battery" | "defense" | "energy" | "intercept" | "attack">>;

export interface AdjacencyDef {
  biome?: BiomeId;
  building?: BuildingId;
  bonus: number;
}

/** Buildings whose noise lowers housing and lab output next to them. */
const NOISY: readonly AdjacencyDef[] = [
  { building: "mine", bonus: -0.25 },
  { building: "foundry", bonus: -0.25 },
  { building: "refinery", bonus: -0.25 },
  { building: "power-coal", bonus: -0.25 },
  { building: "plastics", bonus: -0.25 },
];

/** Lava is buildable, but only for what stands the heat (mine, foundry, defenses). */
const LAND: readonly BiomeId[] = ["forest", "savanna", "mountains", "desert", "swamp", "tundra", "crystal", "ash"];
const HOT_GROUND: readonly BiomeId[] = [...LAND, "lava"];
/** The cave fields inside a planet (CORE). */
const INNER: readonly BiomeId[] = ["mushroom-forest", "crystal-grotto", "magma-lake", "primal-sea"];

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  housing: {
    name: "Hütte",
    icon: "🛖",
    category: "housing",
    description:
      "Platz für Einwohner, ausbaubar zu Holzhaus, Steinhaus und Wohnturm. −25 % je lautem Nachbarn (Mine, Gießerei, Raffinerie, Kohlekraftwerk) und neben Lava, +10 % je Nachbar-Wald, +20 % je Nachbar-Park.",
    cost: { wood: 15 },
    unlockLevel: 0,
    allowedBiomes: LAND,
    workers: 0,
    housing: 2,
    adjacency: [...NOISY, { biome: "forest", bonus: 0.1 }, { biome: "lava", bonus: -0.25 }, { building: "park", bonus: 0.2 }],
    upgrades: [
      { name: "Holzhaus", icon: "🏠", cost: { planks: 10, clay: 10, stone: 10 }, unlockLevel: 2, housing: 4 },
      { name: "Steinhaus", icon: "🏡", cost: { bricks: 15, cloth: 5, iron: 10 }, unlockLevel: 5, housing: 7 },
      // Needs power: without it only half the flats are lit and lived in.
      { name: "Wohnturm", icon: "🏢", cost: { concrete: 20, steel: 10, glass: 10, plastic: 5 }, unlockLevel: 7, housing: 12, energy: -1 },
    ],
  },
  park: {
    name: "Park",
    icon: "🌳",
    category: "housing",
    description: "Grünfläche ohne Arbeiter: Nachbar-Hütten bieten 20 % mehr Platz.",
    cost: { wood: 10, stone: 10 },
    unlockLevel: 2,
    allowedBiomes: LAND,
    workers: 0,
  },
  monument: {
    name: "Monument",
    icon: "🗿",
    category: "housing",
    description: "Der Stolz des Volkes: +10 Aufstiegspunkte pro Umlauf. Nur eins pro Planet.",
    cost: { bricks: 30, steel: 20, gold: 10, aetherite: 10 },
    unlockLevel: 8,
    allowedBiomes: LAND,
    workers: 0,
    ascension: 10,
    unique: true,
  },
  // Seb 2026-10-28: gold, silver and ätherite piled up with nothing to spend them on.
  treasury: {
    name: "Schatzkammer",
    icon: "🏛️",
    category: "housing",
    description: "Ein Arbeiter lagert Gold, Silber oder Ätherit ein, das Volk ist stolz darauf: je Stück 4 Aufstiegspunkte (Ätherit 6).",
    cost: { bricks: 20, stone: 20, bronze: 5 },
    unlockLevel: 5,
    allowedBiomes: LAND,
    workers: 1,
    crafts: { recipes: ["tribute-gold", "tribute-silver", "tribute-aetherite", "tribute-quartz"], speed: 1 },
  },
  farm: {
    name: "Farm",
    icon: "🌾",
    category: "food",
    description: "Baut Nahrung an, ohne den Boden zu erschöpfen. Geht auch auf fruchtbarer Asche. +25 % je Nachbar-Savanne, +15 % je Nachbar-Aschefeld, +20 % je Nachbar-Pumpe, −25 % je Nachbar-Mine (Staub). Stufe 3 (Bewässerte Farm) bringt 60 % mehr, braucht aber Strom.",
    cost: { wood: 12 },
    unlockLevel: 0,
    allowedBiomes: ["savanna", "forest", "swamp", "ash"],
    workers: 2,
    produces: { resource: "food", perWorker: 0.5 },
    adjacency: [
      { biome: "savanna", bonus: 0.25 },
      { biome: "ash", bonus: 0.15 },
      { building: "pump", bonus: 0.2 },
      { building: "mine", bonus: -0.25 },
      { building: "power-coal", bonus: -0.2 },
    ],
    upgrades: [
      { cost: { planks: 10, bricks: 10 }, unlockLevel: 4, workers: 4 },
      // Seb 2026-10-28: power should pay off. Same crew, more food, but it needs power.
      { name: "Bewässerte Farm", cost: { steel: 10, glass: 5, wire: 5 }, unlockLevel: 6, workers: 4, produces: { resource: "food", perWorker: 0.8 }, energy: -1 },
    ],
  },
  fishery: {
    name: "Fischerei",
    icon: "🎣",
    category: "food",
    description: "Fängt Fisch, ohne das Meer leer zu fischen. Muss neben einem Meer stehen, +30 % je Nachbar-Meer. Stufe 3 (Kühlhafen) bringt mehr, braucht aber Strom.",
    cost: { wood: 15, stone: 5 },
    unlockLevel: 1,
    allowedBiomes: LAND,
    workers: 2,
    produces: { resource: "food", perWorker: 0.35 },
    needsNeighbor: ["ocean"],
    adjacency: [{ biome: "ocean", bonus: 0.3 }],
    upgrades: [
      { name: "Fischereihafen", cost: { planks: 10, cloth: 5 }, unlockLevel: 3, workers: 3, produces: { resource: "food", perWorker: 0.45 } },
      // Seb 2026-10-28: stage 3 of the basic producers yields more with the same crew, for power.
      { name: "Kühlhafen", cost: { steel: 10, plastic: 5, wire: 5 }, unlockLevel: 6, workers: 3, produces: { resource: "food", perWorker: 0.7 }, energy: -1 },
    ],
  },
  "hydro-farm": {
    name: "Gewächshaus",
    icon: "🪴",
    category: "food",
    description: "Zieht aus Wasser Gemüse, auf jedem Boden, auch in Wüste, Tundra und Kristallfeld. Braucht Strom. +20 % je Nachbar-Pumpe.",
    cost: { glass: 10, planks: 10, stone: 10 },
    unlockLevel: 4,
    allowedBiomes: LAND,
    workers: 2,
    crafts: { recipes: ["greens"], speed: 1 },
    adjacency: [{ building: "pump", bonus: 0.2 }],
    energy: -1,
  },
  sawmill: {
    name: "Sägewerk",
    icon: "🪚",
    category: "production",
    description: "Macht aus Holz Bretter. Muss neben einem Wald stehen, +30 % je Nachbar-Wald. Verbraucht Werkzeug. Stufe 2 und 3 brauchen Strom.",
    cost: { wood: 20, stone: 10 },
    unlockLevel: 1,
    allowedBiomes: LAND,
    workers: 2,
    crafts: { recipes: ["planks"], speed: 1 },
    needsNeighbor: ["forest"],
    adjacency: [{ biome: "forest", bonus: 0.3 }],
    usesTools: true,
    upgrades: [
      { cost: { bricks: 10, tools: 5, wire: 5 }, unlockLevel: 4, workers: 4, crafts: { recipes: ["planks"], speed: 1.5 }, energy: -1 },
      { name: "Elektrosägewerk", cost: { steel: 10, glass: 5, wire: 5 }, unlockLevel: 6, workers: 4, crafts: { recipes: ["planks"], speed: 2.25 }, energy: -2 },
    ],
  },
  forester: {
    name: "Förster",
    icon: "🌲",
    category: "resources",
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
    category: "resources",
    description: "Fördert die Bodenschätze des Feldes, auch die ohne Werkzeug unerreichbaren. Nur auf einem Feld mit Vorkommen. +25 % je Nachbar-Gebirge. Verbraucht Werkzeug. Stufe 2 und 3 (Großmine) brauchen Strom.",
    cost: { wood: 20, stone: 5 },
    unlockLevel: 1,
    allowedBiomes: ["mountains", "desert", "swamp", "tundra", "crystal", "forest", "savanna", "lava", "ash"],
    workers: 3,
    extracts: { resources: ["stone", "iron", "copper", "sand", "clay", "coal", "uranium", "aetherite", "tin", "bauxite", "ilmenite"], perWorker: 0.6 },
    adjacency: [{ biome: "mountains", bonus: 0.25 }],
    needsDeposit: true,
    usesTools: true,
    upgrades: [
      {
        cost: { iron: 15, bricks: 10, tools: 5, wire: 5 },
        unlockLevel: 5,
        workers: 5,
        energy: -1,
        extracts: { resources: ["stone", "iron", "copper", "sand", "clay", "coal", "uranium", "aetherite", "gold", "tin", "bauxite", "ilmenite", "silver"], perWorker: 0.8 },
      },
      {
        name: "Großmine",
        cost: { steel: 15, concrete: 10, electronics: 2 },
        unlockLevel: 7,
        workers: 5,
        energy: -2,
        extracts: { resources: ["stone", "iron", "copper", "sand", "clay", "coal", "uranium", "aetherite", "gold", "tin", "bauxite", "ilmenite", "silver"], perWorker: 1.2 },
      },
    ],
  },
  pump: {
    name: "Pumpe",
    icon: "🪣",
    category: "resources",
    description: "Pumpt Wasser und das Öl des Feldes. Braucht Wasser oder Öl im Feld, ein Nachbar-Meer oder einen Nachbar-Gletscher. +50 % je Nachbar-Meer, +30 % je Nachbar-Gletscher.",
    cost: { stone: 12 },
    unlockLevel: 1,
    allowedBiomes: LAND,
    workers: 1,
    produces: { resource: "water", perWorker: 0.5 },
    extracts: { resources: ["oil"], perWorker: 0.4 },
    adjacency: [
      { biome: "ocean", bonus: 0.5 },
      { biome: "glacier", bonus: 0.3 },
    ],
    needsDeposit: true,
  },
  refinery: {
    name: "Raffinerie",
    icon: "🛢️",
    category: "space",
    description: "Macht aus Öl Treibstoff für Raketen, aus Glutkristall sogar viel davon. +25 % je Nachbar-Pumpe. Laut für Hütten und Labore. Verbraucht Werkzeug.",
    cost: { planks: 15, stone: 20, iron: 10 },
    unlockLevel: 2,
    allowedBiomes: LAND,
    workers: 2,
    crafts: { recipes: ["fuel", "ember-fuel"], speed: 1 },
    adjacency: [{ building: "pump", bonus: 0.25 }],
    usesTools: true,
  },
  workshop: {
    name: "Werkstatt",
    icon: "🛠️",
    category: "production",
    description: "Macht Werkzeug (aus Eisen oder sparsamer aus Bronze), Kupferdraht, Stoff oder Raumanzüge. Stufe 2 braucht Strom. +15 % je Nachbar-Sägewerk oder -Mine.",
    cost: { planks: 15, stone: 15 },
    unlockLevel: 2,
    allowedBiomes: LAND,
    workers: 2,
    crafts: { recipes: ["tools", "bronze-tools", "wire", "cloth", "suits"], speed: 1 },
    adjacency: [
      { building: "sawmill", bonus: 0.15 },
      { building: "mine", bonus: 0.15 },
    ],
    upgrades: [{ cost: { bricks: 15, iron: 10, wire: 5 }, unlockLevel: 5, workers: 4, crafts: { recipes: ["tools", "bronze-tools", "wire", "cloth", "suits", "deep-suit"], speed: 1.5 }, energy: -1 }],
  },
  lab: {
    name: "Labor",
    icon: "🔬",
    category: "research",
    description: "Erzeugt Wissen. +15 % je Nachbar-Kristallfeld, +10 % je Nachbar-Hütte, +20 % je Nachbar-Bibliothek, −25 % je lautem Nachbarn (Mine, Gießerei, Raffinerie, Kohlekraftwerk). Stufe 2 braucht Strom.",
    cost: { stone: 20, planks: 10, water: 10 },
    unlockLevel: 2,
    allowedBiomes: LAND,
    workers: 2,
    produces: { resource: "science", perWorker: 0.2 },
    adjacency: [{ biome: "crystal", bonus: 0.15 }, { building: "housing", bonus: 0.1 }, { building: "library", bonus: 0.2 }, ...NOISY],
    upgrades: [{ cost: { bricks: 10, wire: 5, gold: 3 }, unlockLevel: 5, workers: 4, produces: { resource: "science", perWorker: 0.25 }, energy: -1 }],
  },
  foundry: {
    name: "Gießerei",
    icon: "🏭",
    category: "production",
    description: "Brennt Ziegel, Holzkohle, Stahl oder Beton. Darf auf Lava stehen. Stufe 2 (Stahlwerk) braucht Strom und macht aus Neutronium viel Stahl. +30 % je Nachbar-Lavafeld, +10 % je Nachbar-Mine.",
    cost: { stone: 25, clay: 15, planks: 10 },
    unlockLevel: 3,
    allowedBiomes: HOT_GROUND,
    workers: 2,
    crafts: { recipes: ["bricks", "charcoal", "steel", "concrete"], speed: 1 },
    adjacency: [
      { building: "mine", bonus: 0.1 },
      { biome: "lava", bonus: 0.3 },
    ],
    upgrades: [{ name: "Stahlwerk", cost: { bricks: 15, steel: 10 }, unlockLevel: 5, workers: 4, crafts: { recipes: ["bricks", "charcoal", "steel", "concrete", "neutron-steel"], speed: 1.5 }, energy: -1 }],
  },
  glassworks: {
    name: "Glashütte",
    icon: "🫙",
    category: "production",
    description: "Schmilzt Sand mit Kohle zu Glas. Darf auf Lava stehen. +20 % je Nachbar-Wüste, +30 % je Nachbar-Lavafeld.",
    cost: { stone: 20, planks: 10, clay: 10 },
    unlockLevel: 3,
    allowedBiomes: HOT_GROUND,
    workers: 2,
    crafts: { recipes: ["glass"], speed: 1 },
    adjacency: [
      { biome: "desert", bonus: 0.2 },
      { biome: "lava", bonus: 0.3 },
    ],
  },
  library: {
    name: "Bibliothek",
    icon: "📚",
    category: "research",
    description: "Ohne Arbeiter: Nachbar-Labore und -Sternwarten forschen 20 % schneller.",
    cost: { planks: 20, stone: 10, cloth: 5 },
    unlockLevel: 3,
    allowedBiomes: LAND,
    workers: 0,
  },
  observatory: {
    name: "Sternwarte",
    icon: "🔭",
    category: "research",
    description: "Viel Wissen aus dem Blick in den Himmel. Braucht Strom. +20 % je Nachbar-Gebirge, +20 % je Nachbar-Bibliothek, −25 % je lautem Nachbarn.",
    cost: { stone: 30, glass: 10, planks: 10 },
    unlockLevel: 4,
    allowedBiomes: LAND,
    workers: 2,
    produces: { resource: "science", perWorker: 0.3 },
    adjacency: [{ biome: "mountains", bonus: 0.2 }, { building: "library", bonus: 0.2 }, ...NOISY],
    energy: -1,
  },
  datacenter: {
    name: "Rechenzentrum",
    icon: "🖥️",
    category: "research",
    description: "Rechnet mit Computern: das meiste Wissen je Arbeiter, braucht aber viel Strom. +20 % je Nachbar-Bibliothek, −25 % je lautem Nachbarn.",
    cost: { computer: 5, concrete: 25, steel: 15 },
    unlockLevel: 8,
    allowedBiomes: LAND,
    workers: 2,
    produces: { resource: "science", perWorker: 0.6 },
    adjacency: [{ building: "library", bonus: 0.2 }, ...NOISY],
    energy: -3,
  },
  "biogas-plant": {
    name: "Biogasanlage",
    icon: "🫧",
    category: "production",
    description: "Vergärt übrige Nahrung mit Wasser zu Biogas für das Gaskraftwerk und Bioplastik. +20 % je Nachbar-Farm, +15 % je Nachbar-Sumpf.",
    cost: { bricks: 15, planks: 10, iron: 5 },
    unlockLevel: 4,
    allowedBiomes: LAND,
    workers: 1,
    crafts: { recipes: ["biogas"], speed: 1 },
    adjacency: [
      { building: "farm", bonus: 0.2 },
      { biome: "swamp", bonus: 0.15 },
    ],
  },
  plastics: {
    name: "Kunststoffwerk",
    icon: "🧴",
    category: "production",
    description: "Kocht aus Öl Plastik, oder ohne Öl aus Biogas Bioplastik. +25 % je Nachbar-Pumpe. Laut für Hütten und Labore.",
    cost: { bricks: 15, steel: 10, planks: 10 },
    unlockLevel: 5,
    allowedBiomes: LAND,
    workers: 2,
    crafts: { recipes: ["plastic", "bioplastic"], speed: 1 },
    adjacency: [{ building: "pump", bonus: 0.25 }],
  },
  electronics: {
    name: "Elektronikwerk",
    icon: "🔌",
    category: "production",
    description: "Lötet aus Kupferdraht, Plastik und Glas Elektronik, ab Stufe 2 (Chipfabrik) auch Computer, mit Xenokristall doppelt so viele. Braucht Strom. +15 % je Nachbar-Werkstatt.",
    cost: { steel: 15, glass: 10, bricks: 10 },
    unlockLevel: 6,
    allowedBiomes: LAND,
    workers: 2,
    crafts: { recipes: ["electronics"], speed: 1 },
    adjacency: [{ building: "workshop", bonus: 0.15 }],
    energy: -1,
    upgrades: [{ name: "Chipfabrik", cost: { concrete: 15, steel: 10, electronics: 5 }, unlockLevel: 8, workers: 3, crafts: { recipes: ["electronics", "computer", "quantum-chip"], speed: 1.25 }, energy: -2 }],
  },
  "power-wind": {
    name: "Windrad",
    icon: "🌬️",
    category: "energy",
    description: "+2 Strom ohne Arbeiter. +25 % je Nachbar-Gebirge, +15 % je Nachbar-Tundra, −40 % je Nachbar-Windrad (Windschatten).",
    cost: { planks: 15, stone: 10, wire: 5 },
    unlockLevel: 3,
    allowedBiomes: LAND,
    workers: 0,
    energy: 2,
    adjacency: [
      { biome: "mountains", bonus: 0.25 },
      { biome: "tundra", bonus: 0.15 },
      { building: "power-wind", bonus: -0.4 },
    ],
  },
  "power-coal": {
    name: "Kohlekraftwerk",
    icon: "🔥",
    category: "energy",
    description: "+6 Strom mit einem Arbeiter, verbrennt Kohle. Laut für Hütten und Labore, Staub für Farmen.",
    cost: { bricks: 20, iron: 15, wire: 5 },
    unlockLevel: 4,
    allowedBiomes: HOT_GROUND,
    workers: 1,
    energy: 6,
    burns: { resource: "coal", perSecond: 0.1 },
  },
  "power-gas": {
    name: "Gaskraftwerk",
    icon: "🔆",
    category: "energy",
    description: "+5 Strom mit einem Arbeiter, verbrennt Biogas. Sauberer als Kohle: kein Lärm, kein Staub.",
    cost: { bricks: 20, steel: 5, wire: 5 },
    unlockLevel: 5,
    allowedBiomes: LAND,
    workers: 1,
    energy: 5,
    burns: { resource: "biogas", perSecond: 0.08 },
  },
  "power-solar": {
    name: "Solarfeld",
    icon: "☀️",
    category: "energy",
    description: "+3 Strom ohne Arbeiter und ohne Brennstoff. +30 % je Nachbar-Wüste, −30 % je Nachbar-Kohlekraftwerk (Smog).",
    cost: { glass: 15, steel: 5, wire: 5 },
    unlockLevel: 6,
    allowedBiomes: LAND,
    workers: 0,
    energy: 3,
    adjacency: [
      { biome: "desert", bonus: 0.3 },
      { building: "power-coal", bonus: -0.3 },
    ],
  },
  "power-atomic": {
    name: "Atomkraftwerk",
    icon: "☢️",
    category: "energy",
    description: "+15 Strom mit zwei Arbeitern aus wenig Uran, ganz ohne Rauch.",
    cost: { concrete: 40, steel: 30, wire: 10 },
    unlockLevel: 8,
    allowedBiomes: LAND,
    workers: 2,
    energy: 15,
    burns: { resource: "uranium", perSecond: 0.02 },
  },
  "gem-mine": {
    name: "Edelsteinmine",
    icon: "💍",
    category: "resources",
    description: "Schürft ganz langsam Diamanten, Smaragde und Rubine. Nur auf einem der seltenen Felder mit Edelsteinen. Verbraucht Werkzeug.",
    cost: { steel: 10, tools: 10, bricks: 10 },
    unlockLevel: 5,
    allowedBiomes: HOT_GROUND,
    workers: 2,
    extracts: { resources: ["diamond", "emerald", "ruby"], perWorker: 0.03 },
    needsDeposit: true,
    usesTools: true,
  },
  "crystal-palace": {
    name: "Kristallpalast",
    icon: "🏰",
    category: "housing",
    description: "Ein Palast aus Edelsteinen: Platz für 20 Einwohner und +5 Aufstiegspunkte pro Umlauf. Braucht Strom. Nur einer pro Planet.",
    cost: { diamond: 3, emerald: 3, ruby: 3, concrete: 30, glass: 20 },
    unlockLevel: 9,
    allowedBiomes: LAND,
    workers: 0,
    housing: 20,
    ascension: 5,
    energy: -2,
    unique: true,
  },
  "prism-dome": {
    name: "Prismenkuppel",
    icon: "🔮",
    category: "research",
    description: "Smaragdprismen bündeln Sternenlicht: sehr viel Wissen je Arbeiter. Braucht Strom.",
    cost: { emerald: 2, diamond: 1, glass: 20, steel: 10 },
    unlockLevel: 8,
    allowedBiomes: LAND,
    workers: 2,
    produces: { resource: "science", perWorker: 0.8 },
    energy: -2,
  },
  "ruby-laser": {
    name: "Rubinlaser",
    icon: "🔴",
    category: "defense",
    description: "Ein Laser mit Rubinkern schießt auf Invasoren: je Arbeiter 3 Treffer pro Umlauf. Braucht Strom.",
    cost: { ruby: 2, steel: 20, electronics: 3 },
    unlockLevel: 7,
    allowedBiomes: HOT_GROUND,
    workers: 2,
    battery: 3,
    energy: -2,
  },
  // New ores (Seb: "mehr verschiedene Erze"): a smelter for the alloys and light metals, and one
  // new thing each that needs them, so every ore has a use.
  smelter: {
    name: "Erzschmelze",
    icon: "⚗️",
    category: "production",
    description:
      "Schmilzt Kupfer und Zinn zu Bronze und Bauxit zu Aluminium, ab Stufe 2 (Lichtbogenofen) auch Titanerz zu Titan. Braucht Strom. Darf auf Lava stehen. +30 % je Nachbar-Lavafeld, +10 % je Nachbar-Mine.",
    cost: { bricks: 15, stone: 20, iron: 10 },
    unlockLevel: 4,
    allowedBiomes: HOT_GROUND,
    workers: 2,
    crafts: { recipes: ["bronze", "aluminium"], speed: 1 },
    adjacency: [
      { building: "mine", bonus: 0.1 },
      { biome: "lava", bonus: 0.3 },
    ],
    energy: -1,
    upgrades: [{ name: "Lichtbogenofen", cost: { steel: 10, bronze: 10, wire: 5 }, unlockLevel: 6, workers: 3, crafts: { recipes: ["bronze", "aluminium", "titanium"], speed: 1.25 }, energy: -2 }],
  },
  "bell-tower": {
    name: "Glockenturm",
    icon: "🔔",
    category: "housing",
    description: "Eine Bronzeglocke ruft das Volk zusammen: +3 Aufstiegspunkte pro Umlauf. Nur einer pro Planet.",
    cost: { bronze: 12, stone: 20, planks: 10 },
    unlockLevel: 4,
    allowedBiomes: LAND,
    workers: 0,
    ascension: 3,
    unique: true,
  },
  "power-tower": {
    name: "Solarturm",
    icon: "🪞",
    category: "energy",
    description: "Silberspiegel auf Aluminiumgestellen bündeln die Sonne: +6 Strom ohne Arbeiter und ohne Brennstoff. +30 % je Nachbar-Wüste, −30 % je Nachbar-Kohlekraftwerk (Smog).",
    cost: { silver: 4, aluminium: 10, glass: 10 },
    unlockLevel: 6,
    allowedBiomes: LAND,
    workers: 0,
    energy: 6,
    adjacency: [
      { biome: "desert", bonus: 0.3 },
      { building: "power-coal", bonus: -0.3 },
    ],
  },
  "deep-drill": {
    name: "Tiefbohrer",
    icon: "🪛",
    category: "resources",
    description:
      "Ein Bohrer mit Titankopf fördert alle Erze des Feldes schneller als die Mine, auch tiefes Gold und Silber und als einziger Platin. Braucht Strom. Nur auf einem Feld mit Vorkommen. +25 % je Nachbar-Gebirge. Verbraucht Werkzeug.",
    cost: { titanium: 8, steel: 15, electronics: 2 },
    unlockLevel: 7,
    allowedBiomes: ["mountains", "desert", "swamp", "tundra", "crystal", "forest", "savanna", "lava", "ash"],
    workers: 3,
    extracts: {
      resources: ["iron", "copper", "coal", "uranium", "aetherite", "gold", "tin", "bauxite", "ilmenite", "silver", "platinum"],
      perWorker: 1,
    },
    adjacency: [{ biome: "mountains", bonus: 0.25 }],
    needsDeposit: true,
    usesTools: true,
    energy: -2,
  },
  "power-fuelcell": {
    name: "Brennstoffzelle",
    icon: "🔋",
    category: "energy",
    description: "Platin spaltet Wasser und verbrennt es sauber: +8 Strom mit einem Arbeiter, kein Lärm, kein Staub.",
    cost: { platinum: 3, titanium: 10, steel: 10 },
    unlockLevel: 8,
    allowedBiomes: LAND,
    workers: 1,
    energy: 8,
    burns: { resource: "water", perSecond: 0.1 },
  },
  launchpad: {
    name: "Startrampe",
    icon: "🚀",
    category: "space",
    description: "Schickt Raketen mit Einwohnern zu anderen Planeten.",
    cost: { wood: 25, stone: 15 },
    unlockLevel: 0,
    allowedBiomes: LAND,
    workers: 0,
  },
  watchtower: {
    name: "Wachturm",
    icon: "🗼",
    category: "defense",
    description: "+1 auf die Würfe der Verteidiger dieses Planeten.",
    cost: { planks: 10, stone: 20 },
    unlockLevel: 2,
    allowedBiomes: HOT_GROUND,
    workers: 0,
    defense: 1,
    upgrades: [{ name: "Festungsturm", icon: "🏰", cost: { bricks: 15, iron: 10 }, unlockLevel: 5, defense: 2 }],
  },
  battery: {
    name: "Abwehrbatterie",
    icon: "🎯",
    category: "defense",
    description: "Schießt auf Invasoren über dem Planeten: je Arbeiter 1 Treffer pro Umlauf.",
    cost: { iron: 25, stone: 25, wood: 10 },
    unlockLevel: 5,
    allowedBiomes: HOT_GROUND,
    workers: 2,
    battery: 1,
  },
  pitfall: {
    name: "Fallgrube",
    icon: "🕳️",
    category: "defense",
    description: "Eine getarnte Grube: bei jedem Angriff auf diesen Planeten stürzt ein Angreifer hinein, bevor gewürfelt wird.",
    cost: { wood: 15, stone: 10 },
    unlockLevel: 2,
    allowedBiomes: LAND,
    workers: 0,
    intercept: 1,
  },
  barracks: {
    name: "Kaserne",
    icon: "⚔️",
    category: "defense",
    description: "Soldaten üben hier: Kampfraketen, die von diesem Planeten starten, würfeln +1, solange jemand trainiert. Ausbaubar zur Militärakademie.",
    cost: { planks: 20, bricks: 15, tools: 5 },
    unlockLevel: 4,
    allowedBiomes: LAND,
    workers: 1,
    attack: 1,
    upgrades: [{ name: "Militärakademie", icon: "🎖️", cost: { steel: 15, cloth: 10 }, unlockLevel: 7, workers: 2, attack: 2 }],
  },
  flak: {
    name: "Flakgeschütz",
    icon: "💥",
    category: "defense",
    description: "Holt landende Kampfraketen vom Himmel: je Arbeiter ein Angreifer weniger, bevor gewürfelt wird. Trifft auch Invasoren (1 Treffer pro Arbeiter und Umlauf).",
    cost: { steel: 10, bricks: 10, tools: 5 },
    unlockLevel: 6,
    allowedBiomes: HOT_GROUND,
    workers: 2,
    intercept: 1,
    battery: 1,
  },
  "missile-launcher": {
    name: "Raketenwerfer",
    icon: "🎆",
    category: "defense",
    description: "Feuert Raketen auf Invasoren: je Arbeiter 4 Treffer pro Umlauf, verbraucht dabei 2 Treibstoff pro Arbeiter.",
    cost: { steel: 15, wire: 10, electronics: 2 },
    unlockLevel: 7,
    allowedBiomes: HOT_GROUND,
    workers: 2,
    battery: 4,
    ammo: { resource: "fuel", perShot: 2 },
  },
  "shield-generator": {
    name: "Schildgenerator",
    icon: "🛡️",
    category: "defense",
    description: "Ein Energieschild über dem Planeten, solange jemand ihn bedient: Invasoren können nichts zerstören oder verbrennen, Angreifer würfeln −1. Braucht viel Strom. Nur einer pro Planet.",
    cost: { steel: 20, glass: 20, electronics: 4, plastic: 5 },
    unlockLevel: 8,
    allowedBiomes: LAND,
    workers: 1,
    shield: 1,
    energy: -4,
    unique: true,
  },
  "ion-cannon": {
    name: "Ionenkanone",
    icon: "⚡",
    category: "defense",
    description: "Die stärkste Waffe gegen Invasoren: je Arbeiter 8 Treffer pro Umlauf. Braucht viel Strom.",
    cost: { aetherite: 10, computer: 1, steel: 20 },
    unlockLevel: 9,
    allowedBiomes: HOT_GROUND,
    workers: 2,
    battery: 8,
    energy: -4,
  },
  // Warp systems (Seb): the gate opens the way to the neighbor systems, the rest uses their exotic matter.
  warpgate: {
    name: "Warptor",
    icon: "🌀",
    category: "space",
    description: "Ortet beim ersten Bau fünf Nachbarsysteme und schickt Warpschiffe dorthin. Nur eins pro Planet.",
    cost: { steel: 40, titanium: 10, computer: 4, aetherite: 20 },
    unlockLevel: 10,
    allowedBiomes: LAND,
    workers: 0,
    unique: true,
    coopOnly: true,
  },
  "exo-drill": {
    name: "Exobohrer",
    icon: "🛰️",
    category: "resources",
    description: "Fördert Antimaterie, Neutronium und Xenokristall, die es nur in fremden Sonnensystemen gibt. Bringt seinen eigenen Strom mit. Nur auf einem Feld mit Vorkommen. Verbraucht Werkzeug.",
    cost: { titanium: 6, steel: 10, electronics: 2 },
    unlockLevel: 10,
    allowedBiomes: [...HOT_GROUND, "glacier"],
    workers: 2,
    extracts: { resources: ["antimatter", "neutronium", "xenocrystal"], perWorker: 0.15 },
    needsDeposit: true,
    usesTools: true,
  },
  "power-antimatter": {
    name: "Antimaterie-Reaktor",
    icon: "⚛️",
    category: "energy",
    description: "+30 Strom mit zwei Arbeitern aus einer Prise Antimaterie. Xenokristalle halten sie in der Schwebe.",
    cost: { antimatter: 10, xenocrystal: 4, titanium: 15, concrete: 30 },
    unlockLevel: 10,
    allowedBiomes: LAND,
    workers: 2,
    energy: 30,
    burns: { resource: "antimatter", perSecond: 0.01 },
  },
  "neutron-bastion": {
    name: "Neutroniumwall",
    icon: "🧱",
    category: "defense",
    description: "Ein Wall aus Neutronium: +2 auf die Würfe der Verteidiger, holt 2 Angreifer vor dem Kampf herunter.",
    cost: { neutronium: 12, steel: 15, concrete: 15 },
    unlockLevel: 10,
    allowedBiomes: HOT_GROUND,
    workers: 0,
    defense: 2,
    intercept: 2,
  },
  "shell-armor": {
    name: "Hüllenpanzerung",
    icon: "🛡️",
    category: "space",
    description: "Neutroniumplatten für die Schutzhülle um die Sonne: Invasoren richten an der Hülle nur halb so viel Schaden an. Nur eine pro Planet.",
    cost: { neutronium: 20, titanium: 10, steel: 20 },
    unlockLevel: 10,
    allowedBiomes: LAND,
    workers: 0,
    shellArmor: 0.5,
    unique: true,
    coopOnly: true,
  },
  "xeno-lab": {
    name: "Xenolabor",
    icon: "🔬",
    category: "research",
    description: "Erforscht fremde Kristalle: sehr viel Wissen je Arbeiter und +4 Aufstiegspunkte pro Umlauf. Braucht Strom.",
    cost: { xenocrystal: 12, glass: 20, computer: 2 },
    unlockLevel: 10,
    allowedBiomes: LAND,
    workers: 3,
    produces: { resource: "science", perWorker: 1 },
    ascension: 4,
    energy: -3,
  },
  // Planet interior (Seb, "Reise zum Mittelpunkt der Erde"): drill down, mine the rare ores inside.
  "core-drill": {
    name: "Kernbohrung",
    icon: "🕳️",
    category: "resources",
    description:
      "Bohrt sich mit 3 Arbeitern und Strom bis ins Innere des Planeten (ein paar Minuten). Nach dem Durchbruch fahren Arbeiter mit Tiefenanzug hinunter, solange die Bohrung steht. Nur eine pro Planet, nicht auf Asteroiden.",
    cost: { titanium: 15, steel: 25, concrete: 30, platinum: 4, electronics: 3 },
    unlockLevel: 9,
    allowedBiomes: ["mountains", "desert", "tundra", "ash", "lava"],
    workers: 3,
    usesTools: true,
    energy: -4,
    unique: true,
  },
  "core-mine": {
    name: "Kernmine",
    icon: "⛏️",
    category: "resources",
    description: "Die einzige Mine im Planeteninneren: fördert langsam Kerneisen, Glutkristall, Tiefenquarz und was sonst dort liegt. Braucht Strom. Verbraucht Werkzeug. Die Vorkommen wachsen nie nach.",
    cost: { titanium: 6, steel: 10, tools: 10 },
    unlockLevel: 9,
    allowedBiomes: INNER,
    workers: 3,
    extracts: { resources: ["core-iron", "ember-crystal", "deep-quartz", "platinum", "diamond", "emerald", "ruby", "uranium", "aetherite"], perWorker: 0.05 },
    needsDeposit: true,
    usesTools: true,
    energy: -2,
  },
  "support-pillar": {
    name: "Stützpfeiler",
    icon: "🏛️",
    category: "defense",
    description: "Ein Pfeiler aus Stahl und Beton: Beben und Magmaausbrüche treffen dieses Feld und seine Nachbarn nur halb so oft. Ohne Arbeiter.",
    cost: { steel: 10, concrete: 15 },
    unlockLevel: 9,
    allowedBiomes: INNER,
    workers: 0,
  },
  "power-geothermal": {
    name: "Erdwärmekraftwerk",
    icon: "🌋",
    category: "energy",
    description: "Zapft den Magmasee an: +12 Strom mit einem Arbeiter, ohne Brennstoff, für das Innere und die Oberfläche zusammen.",
    cost: { "ember-crystal": 4, steel: 15, concrete: 10 },
    unlockLevel: 9,
    allowedBiomes: ["magma-lake"],
    workers: 1,
    energy: 12,
  },
  "gravity-cannon": {
    name: "Gravitationsgeschütz",
    icon: "🌀",
    category: "defense",
    description: "Kerneisen-Spulen schleudern Kerneisen-Geschosse ins All: je Arbeiter 12 Treffer pro Umlauf gegen Invasoren (je Schuss ¼ Kerneisen) und je Arbeiter ein Angreifer weniger. Braucht viel Strom.",
    cost: { "core-iron": 8, steel: 20, computer: 1 },
    unlockLevel: 9,
    allowedBiomes: HOT_GROUND,
    workers: 2,
    battery: 12,
    ammo: { resource: "core-iron", perShot: 0.25 },
    intercept: 1,
    energy: -5,
  },
  "core-armor": {
    name: "Kernpanzerung",
    icon: "🧲",
    category: "space",
    description: "Kerneisenplatten für die Schutzhülle um die Sonne: Invasoren richten an der Hülle noch ein Viertel weniger Schaden an, zusätzlich zur Hüllenpanzerung. Nur eine pro Planet.",
    cost: { "core-iron": 10, titanium: 10, steel: 15 },
    unlockLevel: 10,
    allowedBiomes: LAND,
    workers: 0,
    coreArmor: 0.25,
    unique: true,
    coopOnly: true,
  },
  "quantum-lab": {
    name: "Quantenlabor",
    icon: "🔮",
    category: "research",
    description: "Rechnet mit Tiefenquarz-Kristallen: sehr viel Wissen je Arbeiter und +5 Aufstiegspunkte pro Umlauf. Braucht Strom.",
    cost: { "deep-quartz": 6, computer: 2, glass: 15 },
    unlockLevel: 10,
    allowedBiomes: LAND,
    workers: 2,
    produces: { resource: "science", perWorker: 1.2 },
    ascension: 5,
    energy: -3,
  },
  "warp-core": {
    name: "Warpkern",
    icon: "💫",
    category: "space",
    description: "Glutkristall und Tiefenquarz bündeln den Sprung: Warpschiffe von diesem Planeten sind doppelt so schnell. Nur einer pro Planet.",
    cost: { "deep-quartz": 8, "ember-crystal": 4, titanium: 10 },
    unlockLevel: 10,
    allowedBiomes: LAND,
    workers: 0,
    unique: true,
    coopOnly: true,
  },
};

export type RecipeId =
  | "planks" | "tools" | "wire" | "cloth" | "bricks" | "charcoal" | "fuel" | "glass" | "steel" | "concrete" | "greens"
  | "plastic" | "biogas" | "electronics" | "computer" | "suits" | "bronze" | "aluminium" | "titanium"
  | "bronze-tools" | "bioplastic" | "tribute-gold" | "tribute-silver" | "tribute-aetherite"
  | "neutron-steel" | "quantum-chip"
  | "deep-suit" | "tribute-quartz" | "ember-fuel";

export interface RecipeDef {
  name: string;
  inputs: Partial<Record<ResourceId, number>>;
  outputs: Partial<Record<ResourceId, number>>;
  /** Seconds per craft with one worker at speed 1. */
  seconds: number;
  /** Ascension points per craft (treasury offerings, which make no goods). */
  ascension?: number;
}

/** Recipes; the id is also the main output, so a segment's `gather` names the chosen recipe. */
export const RECIPES: Record<RecipeId, RecipeDef> = {
  planks: { name: "Bretter", inputs: { wood: 2 }, outputs: { planks: 1 }, seconds: 4 },
  tools: { name: "Werkzeug", inputs: { iron: 1, planks: 1 }, outputs: { tools: 2 }, seconds: 10 },
  wire: { name: "Kupferdraht", inputs: { copper: 1 }, outputs: { wire: 1 }, seconds: 4 },
  cloth: { name: "Stoff", inputs: { fiber: 3 }, outputs: { cloth: 1 }, seconds: 8 },
  bricks: { name: "Ziegel", inputs: { clay: 2, coal: 1 }, outputs: { bricks: 2 }, seconds: 6 },
  charcoal: { name: "Holzkohle", inputs: { wood: 3 }, outputs: { coal: 1 }, seconds: 6 },
  fuel: { name: "Treibstoff", inputs: { oil: 2 }, outputs: { fuel: 1 }, seconds: 8 },
  glass: { name: "Glas", inputs: { sand: 2, coal: 1 }, outputs: { glass: 1 }, seconds: 8 },
  steel: { name: "Stahl", inputs: { iron: 2, coal: 1 }, outputs: { steel: 1 }, seconds: 10 },
  concrete: { name: "Beton", inputs: { stone: 2, clay: 1, water: 1 }, outputs: { concrete: 1 }, seconds: 8 },
  greens: { name: "Gemüse", inputs: { water: 1 }, outputs: { food: 2 }, seconds: 5 },
  plastic: { name: "Plastik", inputs: { oil: 2 }, outputs: { plastic: 2 }, seconds: 10 },
  biogas: { name: "Biogas", inputs: { food: 3, water: 1 }, outputs: { biogas: 1 }, seconds: 6 },
  electronics: { name: "Elektronik", inputs: { wire: 2, plastic: 1, glass: 1 }, outputs: { electronics: 1 }, seconds: 16 },
  computer: { name: "Computer", inputs: { electronics: 2, glass: 1, gold: 1 }, outputs: { computer: 1 }, seconds: 24 },
  suits: { name: "Raumanzug", inputs: { cloth: 2, iron: 1 }, outputs: { suits: 1 }, seconds: 8 },
  bronze: { name: "Bronze", inputs: { copper: 2, tin: 1, coal: 1 }, outputs: { bronze: 2 }, seconds: 8 },
  aluminium: { name: "Aluminium", inputs: { bauxite: 3 }, outputs: { aluminium: 1 }, seconds: 10 },
  titanium: { name: "Titan", inputs: { ilmenite: 2, coal: 2 }, outputs: { titanium: 1 }, seconds: 14 },
  // Seb 2026-10-28: iron was short and copper, tin, gold, silver, plastic barely needed.
  "bronze-tools": { name: "Bronzewerkzeug", inputs: { bronze: 1, planks: 1 }, outputs: { tools: 3 }, seconds: 10 },
  bioplastic: { name: "Bioplastik", inputs: { biogas: 2 }, outputs: { plastic: 1 }, seconds: 10 },
  "tribute-gold": { name: "Gold einlagern", inputs: { gold: 1 }, outputs: {}, seconds: 10, ascension: 4 },
  "tribute-silver": { name: "Silber einlagern", inputs: { silver: 1 }, outputs: {}, seconds: 10, ascension: 4 },
  // Seb: the warp matter should keep being useful after its few buildings stand.
  "neutron-steel": { name: "Neutroniumstahl", inputs: { neutronium: 1, iron: 1 }, outputs: { steel: 4 }, seconds: 10 },
  "quantum-chip": { name: "Quantenchip", inputs: { xenocrystal: 1, electronics: 1 }, outputs: { computer: 2 }, seconds: 20 },
  "tribute-aetherite": { name: "Ätherit einlagern", inputs: { aetherite: 1 }, outputs: {}, seconds: 10, ascension: 6 },
  // Planet interior (CORE): suits that are not used up, and the rarest offering.
  "deep-suit": { name: "Tiefenanzug", inputs: { titanium: 4, aluminium: 2, cloth: 3, electronics: 1 }, outputs: { "deep-suit": 1 }, seconds: 20 },
  "ember-fuel": { name: "Glut-Treibstoff", inputs: { "ember-crystal": 1 }, outputs: { fuel: 8 }, seconds: 10 },
  "tribute-quartz": { name: "Tiefenquarz einlagern", inputs: { "deep-quartz": 1 }, outputs: {}, seconds: 10, ascension: 25 },
};

/**
 * The planet interior (Seb, "Reise zum Mittelpunkt der Erde"): a core drill opens a ring of cave
 * fields inside the planet. Only rare ores, no homes; every worker down there needs a deep suit
 * (kept, not used up), and quakes and magma make it dangerous.
 */
export const CORE = {
  /** Seconds the drill needs with a full crew until it breaks through. */
  drillSeconds: 240,
  /** Cave fields inside; the art has every overlay for this count. */
  segments: 12,
  /** Fields around the landing spot of the shaft (field 0) that are known at once. */
  revealRadius: 1,
  /** Deposit size against the biome's max, drawn per field from the core's own seed stream. */
  amount: [0.6, 1] as const,
  /** Extra rare fields: count, picked from `rare`, amount each. */
  extra: { count: [2, 4] as const, rare: ["platinum", "diamond", "emerald", "ruby", "uranium", "aetherite"] as ResourceId[], amount: [6, 12] as const },
  /** Chance per cycle that a quake on a worked field kills one worker (and the suit). */
  quake: { "mushroom-forest": 0.02, "crystal-grotto": 0.03, "magma-lake": 0.05, "primal-sea": 0.03 } as Partial<Record<BiomeId, number>>,
  /**
   * Chance per cycle of a magma burst on a built field: on a magma lake, and half as likely next
   * to one. It knocks the building down a stage (a stage-1 building is wrecked) and kills a worker.
   */
  eruption: { lake: 0.04, nextToLake: 0.02 },
  /** A support pillar on a field or next to it multiplies both chances with this. */
  pillarMul: 0.5,
  /** Chance from which a field shows the danger badge. */
  warnFrom: 0.04,
  /** Core armor counts up to this, on top of WARP.maxShellArmor. */
  maxCoreArmor: 0.25,
  /** Warp flights from a planet with a warp core take this share of the time. */
  warpCoreMul: 0.5,
} as const;

/**
 * Invaders from other star systems (design 13.1), coop and solo only. Waves follow from seed and
 * time; each one targets a planet (or the sun shield, 13.3) and stays until its mothership is
 * destroyed. It never leaves on its own: from the sun it moves on to a planet after siegeCycles.
 */
export const INVADERS = {
  /** Team ascension level from which waves come. */
  minLevel: 5,
  /** ...and team size (playtest: a 9-strong team at level 5 was wiped out). */
  minPeople: 12,
  firstWaveCycles: [8, 16] as const,
  waveIntervalCycles: [20, 35] as const,
  approachCycles: 8,
  /** Without long-range sight the team sees the fleet only this many cycles before arrival. */
  blindWarningCycles: 3,
  /** Cycles at the sun shield before the fleet moves on to a planet. */
  siegeCycles: 5,
  /** Flight time when the fleet moves on to another planet. */
  moveOnCycles: 3,
  shipHp: { base: 6, perWave: 4 },
  /**
   * Mothership hp scale with the team: × people / perPeople, within min..max, so a wave is about
   * as tough for 12 inhabitants as for 60.
   */
  hpTeamScale: { perPeople: 20, min: 0.6, max: 3 },
  /** Escorts add to their roll: floor(wave × escortBonusPerWave). */
  escortBonusPerWave: 0.5,
  strongMul: 1.5,
  reward: { science: 30, iron: 15 },
  /** Never kills the last inhabitants of a planet, so it can grow again. */
  minSurvivors: 2,
  /**
   * Undefended rounds (no battery firing, nobody fighting): the wrecked building's field and this
   * many more fields burn. Scorched earth yields nothing until it is cleared (terraform).
   */
  scorchPerUndefendedRound: 1,
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
  /**
   * Playtest 2026-10-21: 12 segments took 6 minutes. A segment now needs the late chain (steel,
   * concrete) and real research, a crew of 3 and a long flight, so the shell is a project.
   */
  segmentCost: { steel: 15, concrete: 15, aetherite: 10, science: 60 } as Partial<Record<ResourceId, number>>,
  repairCost: { steel: 5, concrete: 5 } as Partial<Record<ResourceId, number>>,
  /** Inhabitants who fly to the sun to build or repair, then come back. */
  crew: 3,
  /** Extra seconds every shield flight takes on top of the distance (the sun is far and hot). */
  flightSeconds: 60,
  unlockLevel: 6,
} as const;

export interface RocketDef {
  name: string;
  icon: string;
  /** Paid on every launch; the rocket is used up on landing. */
  cost: Partial<Record<ResourceId, number>>;
  capacity: number;
  /** Fuel = ceil(takeoff + distance × (perDistance + perPassenger × passengers)). */
  fuel: { resource: ResourceId; takeoff: number; perDistance: number; perPassenger: number };
  secondsPerDistance: number;
  maxRange: number;
  versusOnly?: boolean;
  /** Burns this instead (fuel amount × mul) when the economy is short of the main fuel. */
  altFuel?: { resource: ResourceId; mul: number };
  /** Flies only between sun systems, from a warp gate (see WARP). */
  warp?: true;
}

/**
 * Rockets (numbers after src/data/balance SPACE). Seb: flying should be harder and need oil, so
 * rockets burn refinery fuel; every start planet has an oil deposit (generate.ts), so nobody is
 * locked out of flying.
 */
export const ROCKET_IDS = ["colony", "combat", "starship", "warp"] as const;
export type RocketId = (typeof ROCKET_IDS)[number];

// Seb: flying has no level limit; launch pad, rocket cost and fuel are the only gates.
export const ROCKETS: Record<RocketId, RocketDef> = {
  colony: {
    name: "Siedlerrakete",
    icon: "🚀",
    cost: { planks: 20, iron: 15, tools: 5, cloth: 3 },
    capacity: 3,
    fuel: { resource: "fuel", takeoff: 6, perDistance: 1.5, perPassenger: 1 },
    secondsPerDistance: 3,
    maxRange: 16,
  },
  combat: {
    name: "Kampfrakete",
    icon: "⚔️",
    cost: { iron: 20, planks: 15, tools: 5 },
    capacity: 4,
    fuel: { resource: "fuel", takeoff: 6, perDistance: 1.5, perPassenger: 0.75 },
    secondsPerDistance: 4,
    maxRange: 16,
    versusOnly: true,
  },
  // The big ship after Planet of Mine: a computer, titanium hull and plastic, flies on uranium, far and fast.
  starship: {
    name: "Sternenschiff",
    icon: "🛸",
    cost: { computer: 1, titanium: 10, aluminium: 10, plastic: 10 },
    capacity: 6,
    fuel: { resource: "uranium", takeoff: 2, perDistance: 0.2, perPassenger: 0.1 },
    secondsPerDistance: 1.5,
    maxRange: 40,
  },
  // Seb: other sun systems only by warp. The first jumps burn ätherite, antimatter from there is cheaper.
  warp: {
    name: "Warpschiff",
    icon: "🌠",
    cost: { titanium: 5, computer: 2 },
    capacity: 6,
    fuel: { resource: "antimatter", takeoff: 3, perDistance: 0, perPassenger: 0.1 },
    altFuel: { resource: "aetherite", mul: 3 },
    secondsPerDistance: 0,
    maxRange: Infinity,
    warp: true,
  },
};

/**
 * Neighbor sun systems (Seb): found when the first warp gate is built, reachable only by warp ship.
 * Each one is rich in exotic matter; some are home to a foreign people (an AI faction).
 */
export const WARP = {
  systems: 5,
  /** Planets per neighbor system. */
  planets: [3, 5] as const,
  /** Every system is inhabited with this chance, but at least `inhabited[0]` and at most `inhabited[1]` are. */
  inhabitedChance: 0.3,
  inhabited: [1, 2] as const,
  /** An inhabited system has at least this many settled planets (if it has that many). */
  settledPlanets: 3,
  /** Inhabitants of a foreign people on its main planet and on each other settled planet. */
  people: { main: 8, other: 4 },
  /** Exotic matter of the systems; inhabited systems keep theirs too. */
  specialties: [["antimatter"], ["neutronium"], ["xenocrystal"], ["antimatter", "neutronium"], ["neutronium", "xenocrystal"]] as ResourceId[][],
  /** Exotic fields per planet and their size. */
  fields: [1, 2] as const,
  amount: [40, 80] as const,
  /** Distance used for warp fuel, and seconds per jump. */
  distance: 10,
  seconds: 120,
  /** Shell armor counts up to this (halves shield damage at most). */
  maxShellArmor: 0.5,
} as const;

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
  /** Without breathable air, settlers wear out space suits (RULES.suits); start planets are exempt. */
  breathable: boolean;
  /** Relative chance of each biome on this planet type. */
  biomeWeights: Partial<Record<BiomeId, number>>;
}

export const PLANET_TYPES: Record<PlanetTypeId, PlanetTypeDef> = {
  // Seb: every green planet on the map (habitable zone) has air: temperate, arid, ocean, toxic.
  temperate: { breathable: true, name: "Gemäßigt", biomeWeights: { forest: 3, savanna: 3, mountains: 2, ocean: 2, swamp: 1, desert: 1 } },
  arid: { breathable: true, name: "Trocken", biomeWeights: { desert: 4, savanna: 2, mountains: 2, ash: 0.5, ocean: 0.5 } },
  ice: { breathable: false, name: "Eis", biomeWeights: { tundra: 4, glacier: 3, mountains: 2, ocean: 1 } },
  ocean: { breathable: true, name: "Ozean", biomeWeights: { ocean: 5, swamp: 2, forest: 1, savanna: 1 } },
  lava: { breathable: false, name: "Lava", biomeWeights: { lava: 3, ash: 2.5, mountains: 2, crystal: 1 } },
  toxic: { breathable: true, name: "Giftig", biomeWeights: { swamp: 4, crystal: 2, desert: 1 } },
  asteroid: { breathable: false, name: "Asteroid", biomeWeights: { mountains: 3, crystal: 2 } },
};

/**
 * Rare resources are not tied to a biome. The generator places them as extra deposits so that
 * start planets complement each other (see design/koop-design.md, 4.1). Each entry lists the
 * biomes a deposit may sit on.
 */
export const RARE_RESOURCES: Partial<Record<ResourceId, readonly BiomeId[]>> = {
  coal: ["mountains", "forest", "swamp", "ash"],
  oil: ["desert", "swamp"],
  uranium: ["mountains", "desert", "lava"],
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
  /** Oil fields every start planet gets (rockets burn fuel from oil). */
  oilFieldsPerStartPlanet: 2,
  /** More oil fields on dry and swampy worlds, start planets included. */
  extraOilFields: { arid: 3, toxic: 1 } as Partial<Record<PlanetTypeId, number>>,
  rarePerFreePlanet: { min: 2, max: 4 },
  rareDepositMax: 60,
  sunTypes: ["yellow", "red", "blue", "white"],
  /** Small rocks between the orbits, reachable with the discovery "Weltraumbergbau". */
  asteroids: { min: 2, max: 4, segments: 12, rare: { min: 1, max: 2 } },
  /** Systems with more planets than this share orbits, so the star map stays readable on a phone. */
  compactFrom: 7,
  maxOrbit: 7,
} as const;

/**
 * Gems (Seb: "ganz selten"): from their own seed stream, so worlds stay the same. Every start
 * planet hides one gem field outside the start area, other planets and asteroids only sometimes.
 */
export const GEMS = {
  ids: ["diamond", "emerald", "ruby"] as ResourceId[],
  biomes: {
    diamond: ["mountains", "lava", "crystal"],
    emerald: ["crystal", "swamp", "forest"],
    ruby: ["mountains", "desert", "lava"],
  } as Partial<Record<ResourceId, readonly BiomeId[]>>,
  /** Chance per free planet or asteroid to hold one gem field. */
  planetChance: 0.35,
  amount: [6, 12] as const,
} as const;

/**
 * Platinum (Seb: "mehr verschiedene Erze"): never on a start planet, so flying out pays. From its
 * own seed stream; only the deep drill reaches it.
 */
export const PLATINUM = {
  /** Chance per asteroid / per other free planet to hold one platinum field. */
  asteroidChance: 0.6,
  planetChance: 0.3,
  biomes: ["mountains", "crystal", "lava", "tundra"] as readonly BiomeId[],
  amount: [15, 30] as const,
} as const;

/**
 * Cryo pods (Planet of Mine): frozen members of other peoples on free planets and asteroids,
 * hidden until the field is explored. Thawing them adds inhabitants of that people.
 */
export const CRYO = {
  /** Chance per free planet or asteroid to hold one pod. */
  planetChance: 0.5,
  count: [2, 3] as const,
  thawCost: { food: 20, science: 10 } as Partial<Record<ResourceId, number>>,
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
  starvingRateFactor: 0.5,
  /**
   * Births, food upkeep and ascension thresholds come from src/data/balance (MODES, RULES), see
   * rules.ts: secondsPerBirth, foodUpkeepPerCycle, nextLevelThreshold. Playtest 2026-10-21: the
   * old flat values here (12 s per birth, 2 food) made hut spam the best strategy.
   */
  birthFoodCost: BALANCE_RULES.birthFoodCost,
  /** Food beyond this rots at the end of a cycle: base + perCitizen × people of the economy. */
  foodStock: BALANCE_RULES.foodStock,
  /** Fraction of max that regrows per second on a segment nobody works on. */
  regenPerSecond: 0.01,
  demolishRefund: 0.5,
  /**
   * Tools wear out: every worker in a building with `usesTools` uses this many per minute from the
   * team's ascension level `fromLevel` on (when the workshop unlocks). Without tools: withoutToolsMul.
   */
  tools: { perWorkerPerMinute: 0.1, withoutToolsMul: 0.6, fromLevel: 2 },
  startResources: BALANCE_RULES.startResources as Partial<Record<ResourceId, number>>,
  /** A fresh colony reveals this far around its landing site. */
  colonyRevealRadius: 1,
  battleDie: 6,
  /**
   * Planets without breathable air: each settler wears out this many suits per cycle; when the
   * stock runs out, one settler there dies per cycle.
   */
  suits: { perInhabitantPerCycle: 0.1 },
  /** Workers pulled from their jobs to defend against an attack roll this much lower. */
  workerDefensePenalty: 1,
  /** Defenders fight at home: added to their rolls; ties go to the defenders too. */
  homeAdvantage: 1,
  maxTowerBonus: 2,
  /** Attackers that pitfalls and flak can down before one battle. */
  maxIntercept: 3,
  /** Bonus on combat rocket rolls from barracks on the launch planet. */
  maxAttackBonus: 2,
  /** versus: captives count for their original owner for this many cycles, then join the captor. */
  captiveAssimilationCycles: 10,
  /** versus: after this many cycles without a battle the game offers a draw. */
  drawOfferCycles: 300,
  /** Consumers on a planet short of power run at supply ÷ demand, but never slower than this. */
  energy: { unpoweredMul: 0.25 },
} as const;
