/**
 * Schema for all balancing data. Pure types, no runtime code: the simulation, the UI and the
 * coop edge function all read the same tables.
 *
 * Units used everywhere:
 * - rates are per worker and second (the sim runs 10 ticks per second),
 * - one cycle = one planet rotation (MODES.*.secondsPerCycle: 60 s coop, 20 s versus),
 * - costs are whole resource units,
 * - pollution is a planet-wide value from 0 to 100.
 */

export type ResourceCategory = "raw" | "refined" | "special";

export interface ResourceDef {
  name: string;
  category: ResourceCategory;
  /** Sprite id from art/manifest.json. */
  icon: string;
  /** Storage cap before any storage building (special resources have none). */
  baseCap?: number;
  /** Rough worth in "worker-seconds", used by trade and ultimatums. */
  value: number;
}

export interface DepositDef<R extends string = string> {
  resource: R;
  /** Starting and maximum amount per segment (±25 % random spread). Ignored when infinite. */
  max: number;
  infinite?: boolean;
  /** Citizens can gather it without a building. */
  byHand?: boolean;
  /** Hidden until this discovery is owned (e.g. aetherite, uranium). */
  requires?: string;
  /** Deep deposit: only a tier-2 mine reaches it (gold). */
  tier?: 2;
}

export interface BiomeDef<R extends string = string> {
  name: string;
  /** Asset prefix: art/src/biomes/<id>-*. */
  art: string;
  buildable: boolean;
  deposits: DepositDef<R>[];
}

export interface PlanetTypeDef<B extends string = string> {
  name: string;
  /** Sprite id of the planet body. */
  art: string;
  segments: 12 | 16 | 24 | 32;
  /** Relative weights for random biome runs. Missing biome = never. */
  biomeWeights: Partial<Record<B, number>>;
  /** Multiplier on all deposit sizes (small rich asteroids, big poor planets). */
  depositMul: number;
}

export type Cost<R extends string = string> = Partial<Record<R, number>>;

export interface BuildingTier<R extends string = string, B extends string = string> {
  /** Cost to build this tier (tier 1) or to upgrade from the tier below. */
  cost: Cost<R>;
  /** Ascension level needed. */
  unlockLevel: number;
  /** Seconds of construction (the sprite shows the -construction state meanwhile). */
  buildSeconds: number;
  /** Max citizens working here. 0 = runs without workers. */
  workers: number;
  housing?: number;
  /** Creates a resource from nothing (farms, labs). */
  produces?: { resource: R; perWorker: number };
  /** Pulls resources out of the segment's deposits. */
  extracts?: { resources: readonly R[]; perWorker: number; fromNeighbors?: readonly B[] };
  /** Runs recipes whose `building` is this one; speed multiplier on recipe time. */
  crafts?: { speed: number };
  /** Workers use up tools (RULES.tools); without tools the building runs slower. */
  usesTools?: boolean;
  /** Flat output without workers (wind, solar), per second. */
  flat?: Cost<R>;
  /** Consumed per second while running. Energy is a balance, not a stock. */
  upkeep?: Cost<R>;
  /** Energy supplied (+) or needed (-) while running. */
  energy?: number;
  /** Pollution added per second while running (negative cleans). */
  pollution?: number;
  /** Extra storage for every raw and refined resource. */
  storage?: number;
  /** Extra ascension points per cycle. */
  ascension?: number;
  /** Added to battle rolls on this planet. */
  defense?: number;
  /** Forester: neighbor forests regrow faster, and empty forest neighbors are replanted. */
  forester?: { neighborRegenMul: number; replantsDepleted: boolean };
}

export interface AdjacencyDef<B extends string = string> {
  biome?: B;
  building?: string;
  /**
   * Multiplier change per matching neighbor (2 neighbors max on the ring). Negative = penalty,
   * e.g. dust from a mine on a farm. All entries add up, the total never goes below 0.
   */
  bonus: number;
}

export interface BuildingDef<R extends string = string, B extends string = string> {
  name: string;
  description: string;
  /** Asset id stem: sprite is building.<art>.t<n> (or building.<art> for single-tier). */
  art: string;
  /** "any-land" = every buildable biome. */
  biomes: readonly B[] | "any-land";
  /** Needs at least one neighbor of one of these biomes (sawmill next to forest). */
  needsNeighbor?: readonly B[];
  /** Only on a segment that still has a deposit this building can extract. */
  needsDeposit?: boolean;
  /** Needs this discovery as well as the ascension level. */
  requires?: string;
  adjacency?: AdjacencyDef<B>[];
  /** +multiplier when standing on this biome itself (solar in the desert). */
  biomeBonus?: { biome: B; bonus: number };
  /** Only one per planet. */
  unique?: boolean;
  tiers: BuildingTier<R, B>[];
}

export interface RecipeDef<R extends string = string> {
  name: string;
  inputs: Cost<R>;
  outputs: Cost<R>;
  /** Seconds per craft with one worker at foundry speed 1. */
  seconds: number;
  unlockLevel: number;
  /** Which building crafts it (default foundry) and its minimum tier. */
  building?: string;
  tier: 1 | 2;
  energy?: number;
  pollution?: number;
  requires?: string;
}

/** Generic stat modifier, used by peoples and discoveries. */
export interface Modifier<R extends string = string, B extends string = string> {
  stat: StatKey;
  /** Multiplies the stat (1.2 = +20 %). Applied after add. */
  mul?: number;
  add?: number;
  /** Restricts the modifier, e.g. only farms or only wood. */
  scope?: { building?: string; resource?: R; biome?: B };
}

export type StatKey =
  | "handGatherRate"
  | "buildingOutput"
  | "craftSpeed"
  | "buildCost"
  | "buildTime"
  | "discoveryCost"
  | "foodUpkeep"
  | "birthTime"
  | "housing"
  | "workerSlots"
  | "sightRadius"
  | "revealRadius"
  | "rocketFuel"
  | "rocketCapacity"
  | "pollutionOutput"
  | "pollutionDecay"
  | "pollutionTolerance"
  | "depositMax"
  | "regenRate"
  | "tradeRate"
  | "battleRoll"
  | "battleLosses"
  | "storage"
  | "energyOutput"
  | "ascensionPerCycle"
  | "demolishRefund"
  | "escapePodReward"
  | "automatonSlots";

export interface PeopleDef<R extends string = string, B extends string = string> {
  name: string;
  animal: string;
  favoriteBiome: B;
  favoriteResource: R;
  /** Extra start resources on top of RULES.startResources. */
  startBonus: Cost<R>;
  ability: { name: string; description: string; modifiers: Modifier<R, B>[] };
  /** Discovery owned from the start (null = none). */
  startDiscovery: string | null;
  /** AI personality when this people is not played: 0 = peaceful, 1 = aggressive. */
  aggression: number;
}

export interface DiscoveryDef<R extends string = string, B extends string = string> {
  name: string;
  description: string;
  /** Can be offered from this ascension level on. */
  minLevel: number;
  modifiers?: Modifier<R, B>[];
  unlocks?: { buildings?: string[]; recipes?: string[]; actions?: string[] };
}

export interface MonsterDef {
  name: string;
  description: string;
  /** Earliest ascension level it can appear at. */
  minLevel: number;
  /** Total of the defenders' dice needed to win. */
  strength: number;
  /** Chance per cycle once eligible (rolled by the sim's rng). */
  spawnChancePerCycle: number;
  /** What it does every cycle it is left alone. */
  damage: { destroyBuildingEvery?: number; stealFood?: number; pollution?: number };
  reward: { science?: number; ascension?: number; resources?: Cost };
}
