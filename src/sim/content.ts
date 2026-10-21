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
  // Rocket fuel from the refinery (Seb: flying should be harder and need oil).
  "fuel",
  // Glassworks and foundry goods for the later buildings (greenhouse, observatory, power plants).
  "glass", "steel", "concrete",
  // Late chains after Planet of Mine: biogas from swamps or food, plastic from oil, then electronics and computers.
  "biogas", "plastic", "electronics", "computer",
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
};

export const BIOME_IDS = ["forest", "savanna", "mountains", "ocean", "desert", "swamp", "tundra", "crystal", "glacier", "lava", "ash"] as const;
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
      { resource: "iron", max: 30 },
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
      { resource: "iron", max: 45 },
      { resource: "gold", max: 20, tier: 2 },
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
  "market",
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
}

export type BuildingUpgrade = Pick<BuildingDef, "cost" | "unlockLevel"> &
  Partial<Pick<BuildingDef, "name" | "icon" | "workers" | "housing" | "produces" | "extracts" | "crafts" | "battery" | "defense" | "energy">>;

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
      { name: "Wohnturm", icon: "🏢", cost: { concrete: 20, steel: 10, glass: 10 }, unlockLevel: 7, housing: 12, energy: -1 },
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
  farm: {
    name: "Farm",
    icon: "🌾",
    category: "food",
    description: "Baut Nahrung an, ohne den Boden zu erschöpfen. Geht auch auf fruchtbarer Asche. +25 % je Nachbar-Savanne, +15 % je Nachbar-Aschefeld, +20 % je Nachbar-Pumpe, −25 % je Nachbar-Mine (Staub).",
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
    upgrades: [{ cost: { planks: 10, bricks: 10 }, unlockLevel: 4, workers: 4 }],
  },
  fishery: {
    name: "Fischerei",
    icon: "🎣",
    category: "food",
    description: "Fängt Fisch, ohne das Meer leer zu fischen. Muss neben einem Meer stehen, +30 % je Nachbar-Meer.",
    cost: { wood: 15, stone: 5 },
    unlockLevel: 1,
    allowedBiomes: LAND,
    workers: 2,
    produces: { resource: "food", perWorker: 0.35 },
    needsNeighbor: ["ocean"],
    adjacency: [{ biome: "ocean", bonus: 0.3 }],
    upgrades: [{ name: "Fischereihafen", cost: { planks: 10, cloth: 5 }, unlockLevel: 3, workers: 3, produces: { resource: "food", perWorker: 0.45 } }],
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
    description: "Fördert die Bodenschätze des Feldes, auch die ohne Werkzeug unerreichbaren. Nur auf einem Feld mit Vorkommen. +25 % je Nachbar-Gebirge. Verbraucht Werkzeug.",
    cost: { wood: 20, stone: 5 },
    unlockLevel: 1,
    allowedBiomes: ["mountains", "desert", "swamp", "tundra", "crystal", "forest", "savanna", "lava", "ash"],
    workers: 3,
    extracts: { resources: ["stone", "iron", "copper", "sand", "clay", "coal", "uranium", "aetherite"], perWorker: 0.6 },
    adjacency: [{ biome: "mountains", bonus: 0.25 }],
    needsDeposit: true,
    usesTools: true,
    upgrades: [
      {
        cost: { iron: 15, bricks: 10, tools: 5 },
        unlockLevel: 5,
        workers: 5,
        extracts: { resources: ["stone", "iron", "copper", "sand", "clay", "coal", "uranium", "aetherite", "gold"], perWorker: 0.8 },
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
    description: "Macht aus Öl Treibstoff für Raketen. +25 % je Nachbar-Pumpe. Laut für Hütten und Labore. Verbraucht Werkzeug.",
    cost: { planks: 15, stone: 20, iron: 10 },
    unlockLevel: 2,
    allowedBiomes: LAND,
    workers: 2,
    crafts: { recipes: ["fuel"], speed: 1 },
    adjacency: [{ building: "pump", bonus: 0.25 }],
    usesTools: true,
  },
  workshop: {
    name: "Werkstatt",
    icon: "🛠️",
    category: "production",
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
    category: "research",
    description: "Erzeugt Wissen. +15 % je Nachbar-Kristallfeld, +10 % je Nachbar-Hütte, +20 % je Nachbar-Bibliothek, −25 % je lautem Nachbarn (Mine, Gießerei, Raffinerie, Kohlekraftwerk).",
    cost: { stone: 20, planks: 10, water: 10 },
    unlockLevel: 2,
    allowedBiomes: LAND,
    workers: 2,
    produces: { resource: "science", perWorker: 0.2 },
    adjacency: [{ biome: "crystal", bonus: 0.15 }, { building: "housing", bonus: 0.1 }, { building: "library", bonus: 0.2 }, ...NOISY],
    upgrades: [{ cost: { bricks: 10, wire: 5, gold: 3 }, unlockLevel: 5, workers: 4, produces: { resource: "science", perWorker: 0.25 } }],
  },
  foundry: {
    name: "Gießerei",
    icon: "🏭",
    category: "production",
    description: "Brennt Ziegel, Holzkohle, Stahl oder Beton. Darf auf Lava stehen. Stufe 2 (Stahlwerk) braucht Strom. +30 % je Nachbar-Lavafeld, +10 % je Nachbar-Mine. Laut für Hütten und Labore.",
    cost: { stone: 25, clay: 15, planks: 10 },
    unlockLevel: 3,
    allowedBiomes: HOT_GROUND,
    workers: 2,
    crafts: { recipes: ["bricks", "charcoal", "steel", "concrete"], speed: 1 },
    adjacency: [
      { building: "mine", bonus: 0.1 },
      { biome: "lava", bonus: 0.3 },
    ],
    upgrades: [{ name: "Stahlwerk", cost: { bricks: 15, steel: 10 }, unlockLevel: 5, workers: 4, crafts: { recipes: ["bricks", "charcoal", "steel", "concrete"], speed: 1.5 }, energy: -1 }],
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
    description: "Vergärt übrige Nahrung mit Wasser zu Biogas für das Gaskraftwerk. +20 % je Nachbar-Farm, +15 % je Nachbar-Sumpf.",
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
    description: "Kocht aus Öl Plastik für Elektronik. +25 % je Nachbar-Pumpe. Laut für Hütten und Labore.",
    cost: { bricks: 15, steel: 10, planks: 10 },
    unlockLevel: 5,
    allowedBiomes: LAND,
    workers: 2,
    crafts: { recipes: ["plastic"], speed: 1 },
    adjacency: [{ building: "pump", bonus: 0.25 }],
  },
  electronics: {
    name: "Elektronikwerk",
    icon: "🔌",
    category: "production",
    description: "Lötet aus Kupferdraht, Plastik und Glas Elektronik, ab Stufe 2 (Chipfabrik) auch Computer. Braucht Strom. +15 % je Nachbar-Werkstatt.",
    cost: { steel: 15, glass: 10, bricks: 10 },
    unlockLevel: 6,
    allowedBiomes: LAND,
    workers: 2,
    crafts: { recipes: ["electronics"], speed: 1 },
    adjacency: [{ building: "workshop", bonus: 0.15 }],
    energy: -1,
    upgrades: [{ name: "Chipfabrik", cost: { concrete: 15, steel: 10, electronics: 5 }, unlockLevel: 8, workers: 3, crafts: { recipes: ["electronics", "computer"], speed: 1.25 }, energy: -2 }],
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
  market: {
    name: "Markt",
    icon: "🏪",
    category: "production",
    description: "Ein Händler tauscht Waren gegen andere, solange jemand am Stand arbeitet. Er nimmt 50 % Aufschlag. Nur einer pro Planet.",
    cost: { planks: 20, stone: 20, cloth: 5 },
    unlockLevel: 3,
    allowedBiomes: LAND,
    workers: 1,
    unique: true,
  },
  launchpad: {
    name: "Startrampe",
    icon: "🚀",
    category: "space",
    description: "Schickt Raketen mit Einwohnern zu anderen Planeten.",
    cost: { wood: 25, stone: 15 },
    unlockLevel: 2,
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
};

export type RecipeId =
  | "planks" | "tools" | "wire" | "cloth" | "bricks" | "charcoal" | "fuel" | "glass" | "steel" | "concrete" | "greens"
  | "plastic" | "biogas" | "electronics" | "computer";

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
  fuel: { name: "Treibstoff", inputs: { oil: 2 }, outputs: { fuel: 1 }, seconds: 8 },
  glass: { name: "Glas", inputs: { sand: 2, coal: 1 }, outputs: { glass: 1 }, seconds: 8 },
  steel: { name: "Stahl", inputs: { iron: 2, coal: 1 }, outputs: { steel: 1 }, seconds: 10 },
  concrete: { name: "Beton", inputs: { stone: 2, clay: 1, water: 1 }, outputs: { concrete: 1 }, seconds: 8 },
  greens: { name: "Gemüse", inputs: { water: 1 }, outputs: { food: 2 }, seconds: 5 },
  plastic: { name: "Plastik", inputs: { oil: 2 }, outputs: { plastic: 1 }, seconds: 10 },
  biogas: { name: "Biogas", inputs: { food: 3, water: 1 }, outputs: { biogas: 1 }, seconds: 6 },
  electronics: { name: "Elektronik", inputs: { wire: 2, plastic: 1, glass: 1 }, outputs: { electronics: 1 }, seconds: 16 },
  computer: { name: "Computer", inputs: { electronics: 2, glass: 1, gold: 1 }, outputs: { computer: 1 }, seconds: 24 },
};

/**
 * The market trader (Planet of Mine has trading too). Values are worker-seconds per unit, as in
 * src/data/balance/resources.ts; the trader asks `markup` times the value of what he hands out.
 * Wissen cannot be traded.
 */
export const MARKET = {
  markup: 1.5,
  values: {
    food: 3, wood: 3, stone: 3, sand: 3, clay: 3, fiber: 3, water: 2,
    iron: 4, coal: 4, copper: 4, oil: 5, biogas: 5,
    uranium: 12, aetherite: 15, gold: 15,
    planks: 10, tools: 12, wire: 9, cloth: 18, bricks: 9, fuel: 12,
    glass: 18, concrete: 18, steel: 22, plastic: 22, electronics: 80, computer: 220,
  } as Partial<Record<ResourceId, number>>,
  /** Units per trade the market offers. */
  lots: [1, 5] as const,
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
  /** Fuel = ceil(takeoff + distance × (perDistance + perPassenger × passengers)). */
  fuel: { resource: ResourceId; takeoff: number; perDistance: number; perPassenger: number };
  secondsPerDistance: number;
  maxRange: number;
  versusOnly?: boolean;
}

/**
 * Rockets (numbers after src/data/balance SPACE). Seb: flying should be harder and need oil, so
 * rockets burn refinery fuel; every start planet has an oil deposit (generate.ts), so nobody is
 * locked out of flying.
 */
export const ROCKET_IDS = ["colony", "combat"] as const;
export type RocketId = (typeof ROCKET_IDS)[number];

export const ROCKETS: Record<RocketId, RocketDef> = {
  colony: {
    name: "Siedlerrakete",
    icon: "🚀",
    cost: { planks: 20, iron: 15, tools: 5, cloth: 3 },
    unlockLevel: 4,
    capacity: 3,
    fuel: { resource: "fuel", takeoff: 6, perDistance: 1.5, perPassenger: 1 },
    secondsPerDistance: 3,
    maxRange: 16,
  },
  combat: {
    name: "Kampfrakete",
    icon: "⚔️",
    cost: { iron: 20, planks: 15, tools: 5 },
    unlockLevel: 3,
    capacity: 4,
    fuel: { resource: "fuel", takeoff: 6, perDistance: 1.5, perPassenger: 0.75 },
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
  arid: { name: "Trocken", biomeWeights: { desert: 4, savanna: 2, mountains: 2, ash: 0.5, ocean: 0.5 } },
  ice: { name: "Eis", biomeWeights: { tundra: 4, glacier: 3, mountains: 2, ocean: 1 } },
  ocean: { name: "Ozean", biomeWeights: { ocean: 5, swamp: 2, forest: 1, savanna: 1 } },
  lava: { name: "Lava", biomeWeights: { lava: 3, ash: 2.5, mountains: 2, crystal: 1 } },
  toxic: { name: "Giftig", biomeWeights: { swamp: 4, crystal: 2, desert: 1 } },
  asteroid: { name: "Asteroid", biomeWeights: { mountains: 3, crystal: 2 } },
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
  /** Workers pulled from their jobs to defend against an attack roll this much lower. */
  workerDefensePenalty: 1,
  /** Defenders fight at home: added to their rolls; ties go to the defenders too. */
  homeAdvantage: 1,
  maxTowerBonus: 2,
  /** versus: captives count for their original owner for this many cycles, then join the captor. */
  captiveAssimilationCycles: 10,
  /** versus: after this many cycles without a battle the game offers a draw. */
  drawOfferCycles: 300,
  /** Consumers on a planet short of power run at supply ÷ demand, but never slower than this. */
  energy: { unpoweredMul: 0.25 },
} as const;
