import type { ResourceId } from "./resources";
import type { Cost, MonsterDef } from "./types";

/** Core simulation constants. Same units as the prototype: 10 ticks/s, 30 s per cycle. */
export const RULES = {
  ticksPerSecond: 10,
  /** One planet rotation; drives food upkeep, ascension and events. */
  secondsPerCycle: 30,
  /** Big home planet: space is not the bottleneck, workers are. */
  homeSegments: 32,
  /** The home planet always has at least one segment of each, so every production chain works. */
  homeGuaranteedBiomes: ["forest", "savanna", "mountains", "ocean", "swamp", "desert"],
  startRevealRadius: 3,
  buildRevealRadius: 2,
  /** Per player. */
  startPopulation: 3,
  baseHousing: 3,
  startResources: { food: 30, wood: 15 } as Cost<ResourceId>,
  /** Citizens that can gather by hand on a segment without a building. */
  handWorkersPerSegment: 2,
  handRatePerWorker: 0.3,
  /** Raised from the prototype's 2: food should take ~25–30 % of the workforce. */
  foodPerInhabitantPerCycle: 3,
  /** Production multiplier while starving. A second starving cycle in a row kills one citizen. */
  starvingRateFactor: 0.5,
  starvationDeathAfterCycles: 2,
  birthFoodCost: 15,
  /**
   * Seconds per birth on a planet = birthBase + birthPerCitizen × citizens on that planet
   * (values per mode in MODES). Growth slows as the people grows, so citizens stay the scarce
   * resource and every new planet (own births) is worth a lot.
   */
  /** Fraction of max that regrows per second on a deposit nobody works on. Empty deposits stay empty. */
  regenPerSecond: 0.01,
  demolishRefund: 0.5,
  /** Cycles a ruin blocks a segment after demolition or destruction. */
  ruinCycles: 2,
} as const;

export const ASCENSION = {
  /** Points per cycle = population × pointsPerCitizen + building bonuses. */
  pointsPerCitizen: 1,
  maxLevel: 10,
} as const;

/**
 * Energy is a live balance per planet, not a stock. When demand exceeds supply, every consumer
 * runs at supply/demand speed (no hard off-switch, so a small deficit is a small penalty).
 */
export const ENERGY = {
  /** Consumers still run at this speed with zero supply, so a blackout never deadlocks. */
  minSpeed: 0.25,
} as const;

/** Planet-wide pollution, 0–100. */
export const POLLUTION = {
  max: 100,
  /** Natural cleanup: this fraction of the current value per second, so it settles at output ÷ 0.003. */
  decayFractionPerSecond: 0.003,
  /** Effects kick in above these values (glowsnails add pollutionTolerance). */
  thresholds: [
    { above: 30, effect: "noRegrowth", note: "Wald und Beeren wachsen nicht mehr nach" },
    { above: 60, effect: "foodPenalty", value: 0.75, note: "Nahrungserträge −25 %" },
    { above: 85, effect: "noBirths", note: "Kein Nachwuchs mehr" },
  ],
} as const;

/**
 * Monsters appear on a planet with free land. Battle: send citizens, each rolls 1d6, add the
 * planet's defense (watchtowers, people and discovery bonuses). Total ≥ strength wins. Every
 * die showing 1 is a citizen lost (win or lose). Losing keeps the monster there.
 */
export const MONSTER_IDS = ["rockmunch", "stormjelly", "thornback"] as const;
export type MonsterId = (typeof MONSTER_IDS)[number];

export const MONSTERS = {
  rockmunch: {
    name: "Steinmampfer",
    description: "Frisst sich durch Minen und Lager.",
    minLevel: 3,
    strength: 12,
    spawnChancePerCycle: 0.03,
    damage: { destroyBuildingEvery: 4 },
    reward: { science: 40, resources: { stone: 40, iron: 20 } },
  },
  stormjelly: {
    name: "Sturmqualle",
    description: "Schwebt über dem Planeten, saugt Energie ab und vergiftet die Luft.",
    minLevel: 5,
    strength: 20,
    spawnChancePerCycle: 0.03,
    damage: { pollution: 3 },
    reward: { science: 80, ascension: 40 },
  },
  thornback: {
    name: "Dornrücken",
    description: "Zertrampelt Gebäude und frisst die Vorräte.",
    minLevel: 7,
    strength: 30,
    spawnChancePerCycle: 0.025,
    damage: { destroyBuildingEvery: 2, stealFood: 15 },
    reward: { science: 150, ascension: 100, resources: { steel: 10 } },
  },
} as const satisfies Record<MonsterId, MonsterDef>;

export const BATTLE = {
  die: 6,
  /** Faces that kill the citizen who rolled them. */
  deathFaces: [1],
  /** Grace period: no monsters in the first cycles of a game or after a battle. */
  graceCycles: 20,
  maxSendPerBattle: 10,
} as const;

/** Star system and rockets. Distances are in map units (home planet to neighbor ≈ 3–5). */
export const SPACE = {
  planetsPerSystem: { min: 5, max: 8 },
  asteroidsPerSystem: { min: 2, max: 4 },
  baseSightRadius: 6,
  /** Fuel for one flight = ceil(distance × (fuelPerDistance + fuelPerPassenger × passengers)). */
  rockets: {
    "rocket-small": {
      art: "rocket-small",
      cost: { plastic: 10, steel: 10, glass: 5 },
      unlockLevel: 6,
      capacity: 3,
      fuel: "oil",
      fuelPerDistance: 2,
      fuelPerPassenger: 1.5,
      maxRange: 8,
      secondsPerDistance: 4,
    },
    "rocket-big": {
      art: "rocket-big",
      cost: { steel: 30, computer: 3, aetherite: 10 },
      unlockLevel: 9,
      capacity: 6,
      fuel: "uranium",
      fuelPerDistance: 0.3,
      fuelPerPassenger: 0.2,
      maxRange: 20,
      secondsPerDistance: 2,
    },
  },
  /** A rocket is used up on landing and becomes the colony's first resources. */
  landingSalvage: { steel: 5, plastic: 3 } as Cost<ResourceId>,
  colony: {
    startRevealRadius: 1,
    /** survival-kits doubles this. */
    startResources: { wood: 10, food: 10 } as Cost<ResourceId>,
  },
  escapePods: {
    perPlanet: { min: 0, max: 1 },
    /** One of these, rolled by the sim rng. escapePodReward multiplies amounts. */
    rewards: [
      { weight: 3, science: 40 },
      { weight: 3, resources: { steel: 10, glass: 10 } },
      { weight: 2, citizens: 2 },
      { weight: 1, freeDiscovery: true },
    ],
  },
} as const;

/** AI factions. Relation runs from −100 (war) to +100 (alliance). */
export const DIPLOMACY = {
  aiFactions: { min: 2, max: 3 },
  startRelation: 0,
  thresholds: { war: -60, peace: 20, alliance: 70 },
  /** Relation change per action. */
  trade: 5,
  /** Gift: +1 relation per 10 value given. */
  giftValuePerPoint: 10,
  refusedUltimatum: -40,
  acceptedUltimatum: 10,
  /** Trade: the AI sells its surplus resource at value × sellMul and buys at value × buyMul. */
  sellMul: 1.3,
  buyMul: 0.7,
  /** Ultimatum: demand worth demandValuePerLevel × player level, at most once per minCyclesBetween. */
  ultimatum: { demandValuePerLevel: 40, minCyclesBetween: 25, chancePerCycle: 0.04, minLevel: 4 },
  /** Alliance shares one discovery the player lacks every allianceShareCycles. */
  allianceShareCycles: 20,
  /** Peaceful mode turns ultimatums and AI war off. */
  peacefulMode: { ultimatums: false, aiWar: false },
} as const;

/**
 * Game modes (decided by Seb, 2026-10-20). Solo is "coop" with one player.
 * - coop: one shared start planet, shared resources, shared ascension and discoveries. Long
 *   games (level 10 after ~3 h), endless afterwards.
 * - versus: everyone on their own planet with own resources and ascension. Short and snappy:
 *   first to winLevel wins, otherwise the highest ascension at the time limit.
 * Per-player arrays: index = player count − 1.
 */
export const MODE_IDS = ["coop", "versus"] as const;
export type ModeId = (typeof MODE_IDS)[number];

export const MODES = {
  coop: {
    name: "Gemeinsam",
    sharedResources: true,
    sharedAscension: true,
    sameStartPlanet: true,
    birthBase: 30,
    birthPerCitizen: 6,
    /** Cumulative ascension points for level 1 … 10. */
    thresholds: [25, 100, 270, 600, 1150, 2050, 3300, 5200, 8300, 12900],
    discoveryCostMul: 1,
    /** One planet, one birth queue: extra players add start citizens and run colonies in parallel. */
    playerThresholdMul: [1, 1.15, 1.3, 1.45],
    playerDiscoveryCostMul: [1, 1.1, 1.2, 1.3],
    monsterStrengthMul: [1, 1.3, 1.6, 1.9],
    extraAiFactions: [0, 0, 1, 1],
    extraPlanets: [0, 1, 2, 3],
    winLevel: null,
    timeLimitMinutes: null,
    endless: true,
  },
  versus: {
    name: "Gegeneinander",
    sharedResources: false,
    sharedAscension: false,
    sameStartPlanet: false,
    birthBase: 12,
    birthPerCitizen: 3,
    thresholds: [20, 55, 130, 220, 370, 600, 910, 1210, 1550, 1900],
    discoveryCostMul: 0.5,
    /** Everyone plays their own economy, so nothing scales with player count. */
    playerThresholdMul: [1, 1, 1, 1],
    playerDiscoveryCostMul: [1, 1, 1, 1],
    monsterStrengthMul: [1, 1, 1, 1],
    extraAiFactions: [0, 0, 0, 0],
    /** One home planet per player plus a few free ones to race for. */
    extraPlanets: [0, 1, 2, 3],
    winLevel: 8,
    timeLimitMinutes: 35,
    endless: false,
  },
} as const;

export const COOP = {
  maxPlayers: 4,
  /** coop mode: discoveries apply to the team; peoples' abilities only to that player's citizens. */
  discoveriesShared: true,
  /** versus mode: trading between players goes through markets and loses this share. */
  versusTradeLoss: 0.2,
} as const;

/**
 * What the numbers above should produce. pacing.ts checks the thresholds against this; when a
 * playtest disagrees, fix the data, then this table.
 */
export const PACING = {
  coop: {
    /** Target minute at which a level is reached (index = level − 1), ±20 %. */
    targetMinute: [3, 8, 15, 25, 38, 55, 75, 100, 135, 180],
    discoveriesPerGame: { min: 12, max: 18 },
  },
  versus: {
    targetMinute: [2, 4, 7, 10, 14, 19, 25, 30, 35, 40],
    discoveriesPerGame: { min: 7, max: 12 },
  },
  /** Share of citizens working in labs, and science per lab worker per cycle (t1/t2 average). */
  labWorkerShare: 0.1,
  sciencePerLabWorkerPerCycle: 3.5,
  /** A built-out home planet should offer at least this many jobs per citizen. */
  jobsPerCitizen: 1.4,
} as const;
