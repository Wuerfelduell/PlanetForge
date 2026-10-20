import type { ResourceId } from "./resources";
import type { Cost, MonsterDef } from "./types";

/** Core simulation constants. Same units as the prototype: 10 ticks/s, 30 s per cycle. */
export const RULES = {
  ticksPerSecond: 10,
  /** One planet rotation; drives food upkeep, ascension and events. */
  secondsPerCycle: 30,
  homeSegments: 24,
  /** The home planet always has at least one segment of each, so every production chain works. */
  homeGuaranteedBiomes: ["forest", "savanna", "mountains", "ocean", "swamp", "desert"],
  startRevealRadius: 2,
  buildRevealRadius: 2,
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
  birthFoodCost: 10,
  secondsPerBirth: 12,
  /** Fraction of max that regrows per second on a deposit nobody works on. Empty deposits stay empty. */
  regenPerSecond: 0.01,
  demolishRefund: 0.5,
  /** Cycles a ruin blocks a segment after demolition or destruction. */
  ruinCycles: 2,
} as const;

export const ASCENSION = {
  /** Points per cycle = population × pointsPerCitizen + building bonuses. */
  pointsPerCitizen: 1,
  /** Cumulative points needed for level 1, 2, … 10 (single player). */
  thresholds: [15, 50, 120, 250, 450, 750, 1200, 1800, 2600, 3600],
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
 * Coop: 1–4 players in one system. Ascension and science are a shared team pool (one level for
 * everyone), so costs grow with player count, but slower than linearly: playing together
 * should feel a bit faster, not slower. Each player brings their own citizens and start goods.
 * Index = player count − 1.
 */
export const COOP = {
  maxPlayers: 4,
  ascensionThresholdMul: [1, 1.7, 2.4, 3.1],
  discoveryCostMul: [1, 1.6, 2.2, 2.8],
  monsterStrengthMul: [1, 1.5, 2, 2.5],
  /** Extra AI factions and planets so the system does not feel crowded. */
  extraAiFactions: [0, 0, 1, 1],
  extraPlanets: [0, 1, 2, 3],
  /** Every player starts with RULES.startResources and RULES.startPopulation of their own. */
  perPlayerStart: true,
  /** Discoveries apply to the whole team; peoples' abilities only to that player's citizens. */
  discoveriesShared: true,
  /** Gifts between players are free; nothing is lost in transfer. */
  playerTradeLoss: 0,
} as const;

/**
 * What the numbers above should produce for a normal single player game. pacing.ts checks the
 * thresholds against this; when a playtest disagrees, fix the data, then this table.
 */
export const PACING = {
  /** Expected population when a level is reached (index = level − 1). */
  expectedPopulation: [4, 6, 9, 12, 16, 20, 25, 30, 35, 40],
  /** Target minute at which a level is reached, ±20 %. */
  targetMinute: [2, 6, 10, 16, 24, 32, 42, 53, 65, 78],
  /** Science per cycle from labs, expected at each level (index = level − 1). */
  expectedLabSciencePerCycle: [0, 3, 6, 8, 12, 15, 20, 24, 28, 32],
  /** Discoveries bought in a typical full game (of 24). */
  discoveriesPerGame: { min: 9, max: 14 },
} as const;
