import type { ResourceId } from "./resources";
import type { Cost, MonsterDef } from "./types";

/**
 * Core simulation constants. 10 ticks/s like the prototype. Cycle length depends on the mode
 * (MODES.*.secondsPerCycle), so rates that must not change with it are given per second or
 * per minute; counts like "ruinCycles" are deliberately in cycles.
 */
export const RULES = {
  ticksPerSecond: 10,
  /** coop: big shared start planet, space is not the bottleneck, workers are. */
  homeSegments: 32,
  /** versus: every player's own start planet (matches SYSTEM in src/sim/content.ts). */
  versusHomeSegments: 24,
  /** The home planet always has at least one segment of each, so every production chain works. */
  homeGuaranteedBiomes: ["forest", "savanna", "mountains", "ocean", "swamp", "desert"],
  startRevealRadius: 3,
  buildRevealRadius: 2,
  startPopulation: 3,
  /** coop: a joining player brings this many citizens (same as a solo start, design doc 4.6) … */
  coopJoinPopulation: 3,
  /** … plus one more for every this many team ascension levels (design doc 4.5). */
  coopJoinLevelsPerExtraCitizen: 2,
  baseHousing: 3,
  /** Wood 25: the first hut costs 15, so the player builds at once instead of waiting (playtest 2026-10-21). */
  startResources: { food: 30, wood: 25 } as Cost<ResourceId>,
  /** Citizens that can gather by hand on a segment without a building. */
  handWorkersPerSegment: 2,
  handRatePerWorker: 0.3,
  /** Food per citizen and minute (= 3 per 30 s): food should take ~25–30 % of the workforce. */
  foodPerInhabitantPerMinute: 6,
  /** Every citizen eats this much more per citizen on the planet: soft natural population cap. */
  foodUpkeepGrowthPerCitizen: 0.01,
  /** Production multiplier while starving. A second starving cycle in a row kills one citizen. */
  starvingRateFactor: 0.5,
  starvationDeathAfterCycles: 2,
  birthFoodCost: 15,
  /**
   * Food does not pile up forever (playtest: 60 000 food unused): what is above
   * base + perCitizen × citizens rots at the end of a cycle.
   */
  foodStock: { base: 120, perCitizen: 10 },
  /**
   * Seconds per birth on a planet = birthBase + birthPerCitizen × citizens on that planet
   * (values per mode in MODES). Growth slows as the people grows, so citizens stay the scarce
   * resource and every new planet (own births) is worth a lot.
   */
  /** Fraction of max that regrows per second on a deposit nobody works on. Empty deposits stay empty. */
  regenPerSecond: 0.01,
  demolishRefund: 0.5,
  /**
   * Tools wear out: every worker in a building with `usesTools` uses this many per minute.
   * Without tools in stock it works at withoutToolsMul. Off until the workshop exists.
   */
  tools: { perWorkerPerMinute: 0.1, withoutToolsMul: 0.6, fromLevel: 2 },
  /** Cycles a ruin blocks a segment after demolition or destruction. */
  ruinCycles: 2,
  /** The clock only runs while the host's lobby is open; an open lobby with nobody online closes after this. */
  lobbyAutoCloseMinutes: 10,
} as const;

/** Chosen by the host when creating a game: multiplies the game clock (all rates and cycles). */
export const TEMPO = {
  cozy: { name: "Gemütlich", speed: 0.75 },
  normal: { name: "Normal", speed: 1 },
  fast: { name: "Schnell", speed: 1.5 },
} as const;

/** AI aggression, ultimatums and monsters. "cozy" equals the original's peaceful mode. */
export const DIFFICULTY = {
  cozy: { name: "Gemütlich", aiAggressionMul: 0, ultimatums: false, monsterStrengthMul: 0.7 },
  normal: { name: "Normal", aiAggressionMul: 1, ultimatums: true, monsterStrengthMul: 1 },
  hard: { name: "Hart", aiAggressionMul: 1.5, ultimatums: true, monsterStrengthMul: 1.4 },
} as const;

export const ASCENSION = {
  /** Points per minute = population × pointsPerCitizenPerMinute + building bonuses. */
  pointsPerCitizenPerMinute: 2,
  /**
   * Every building stage above the first adds this much per minute, so the production chain
   * counts for ascension and not only the head count (playtest 2026-10-21: hut spam won).
   */
  pointsPerUpgradePerMinute: 2,
  maxLevel: 10,
} as const;

/**
 * Energy is a live balance per planet, not a stock. When demand exceeds supply, every consumer
 * runs at supply/demand speed (no hard off-switch, so a small deficit is a small penalty).
 */
export const ENERGY = {
  /** Consumers still run at this speed with zero supply, so a blackout never deadlocks. */
  minSpeed: 0.25,
  /** Energy per automaton (discovery "automation" lets one machine replace one worker per building). */
  perAutomaton: 2,
} as const;

/** Planet-wide pollution, 0–100. */
export const POLLUTION = {
  max: 100,
  /** Natural cleanup: this fraction of the current value per second, so it settles at output ÷ 0.003. */
  decayFractionPerSecond: 0.003,
  /** Effects kick in above these values (glowsnails add pollutionTolerance). */
  /** Pollution slows births (design doc 2.5) instead of blocking regrowth. */
  thresholds: [
    { above: 30, effect: "birthTime", value: 1.25, note: "Nachwuchs 25 % langsamer" },
    { above: 60, effect: "birthTime", value: 1.6, note: "Nachwuchs 60 % langsamer" },
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
  asteroidsPerSystem: { min: 2, max: 4 },
  baseSightRadius: 6,
  /**
   * Fuel for one flight = ceil(takeoffFuel + distance × (fuelPerDistance + fuelPerPassenger × passengers)).
   * Seb (2026-10-21): flying was too easy. Rockets burn Treibstoff, refined from oil (2 : 1) in a
   * refinery, and every launch pays a flat takeoff on top. A first colony flight (distance 4,
   * 3 passengers) costs 24 fuel = 48 oil. Oil deposits do not refill once empty, so the home
   * planet's oil (one swamp and one desert field, about 90) carries two flights, not ten.
   */
  rockets: {
    /** versus: sabotage (design doc 5.3), 1–2 saboteurs, early. */
    "rocket-scout": {
      art: "rocket-small",
      cost: { planks: 15, iron: 10 },
      unlockLevel: 2,
      capacity: 2,
      fuel: "fuel",
      takeoffFuel: 4,
      fuelPerDistance: 1,
      fuelPerPassenger: 1,
      maxRange: 8,
      secondsPerDistance: 3,
    },
    /** versus: attack rocket with weapons upgrade (design doc 5.3). */
    "rocket-combat": {
      art: "rocket-small",
      cost: { iron: 20, planks: 15, tools: 5 },
      unlockLevel: 3,
      capacity: 4,
      fuel: "fuel",
      takeoffFuel: 6,
      fuelPerDistance: 1.5,
      fuelPerPassenger: 0.75,
      maxRange: 8,
      secondsPerDistance: 4,
    },
    /** The first colony ship (sim: ROCKETS.colony). Colonizing starts at level 4 in both modes. */
    "rocket-colony": {
      art: "rocket-small",
      cost: { planks: 20, iron: 15, tools: 5, cloth: 3 },
      unlockLevel: 4,
      capacity: 3,
      fuel: "fuel",
      takeoffFuel: 6,
      fuelPerDistance: 1.5,
      fuelPerPassenger: 1,
      maxRange: 8,
      secondsPerDistance: 4,
    },
    "rocket-small": {
      art: "rocket-small",
      cost: { plastic: 10, steel: 10, cloth: 5 },
      unlockLevel: 6,
      capacity: 3,
      fuel: "fuel",
      takeoffFuel: 6,
      fuelPerDistance: 1.5,
      fuelPerPassenger: 1,
      maxRange: 12,
      secondsPerDistance: 3,
    },
    "rocket-big": {
      art: "rocket-big",
      cost: { steel: 30, computer: 3, aetherite: 10 },
      unlockLevel: 9,
      capacity: 6,
      fuel: "uranium",
      takeoffFuel: 2,
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

/** AI factions (count per mode in MODES). Relation runs from −100 (war) to +100 (alliance). */
export const DIPLOMACY = {
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
 * - coop: one shared start planet, shared resources, shared ascension and discoveries; every
 *   player leads their own people there. Long games (level 10 after ~3 h), no cycle limit.
 *   Citizens of an absent player stay theirs (never handed to others), the host saves the lobby.
 * - versus: everyone on their own planet with own resources and ascension. Snappy; the game
 *   ends when only one people is left (the others eradicated by attacks, see VERSUS_COMBAT).
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
    /** Like the original (design doc 3). */
    secondsPerCycle: 60,
    birthBase: 30,
    birthPerCitizen: 6,
    /** Cumulative ascension points for level 1 … 10. */
    thresholds: [25, 100, 270, 600, 1150, 2050, 3300, 5200, 8300, 12900],
    discoveryCostMul: 1,
    /**
     * Design doc 4.6: base × (0.7 + 0.3·n). One planet, one birth queue (the population cap
     * does not grow with n), so a bigger team has to found colonies earlier.
     */
    playerThresholdMul: [1, 1.3, 1.6, 1.9],
    playerDiscoveryCostMul: [1, 1.3, 1.6, 1.9],
    monsterStrengthMul: [1, 1.3, 1.6, 1.9],
    /** Planets 4 + 2·n, AI factions 1 + n, events × n with at most one active per player. */
    planets: [6, 8, 10, 12],
    aiFactions: [2, 3, 4, 5],
    eventsMul: [1, 2, 3, 4],
    victory: "none",
    cycleLimit: null,
    /** Workers of a player who is offline keep working where they were, nobody else can move them. */
    releaseAbsentWorkers: false,
  },
  versus: {
    name: "Gegeneinander",
    sharedResources: false,
    sharedAscension: false,
    sameStartPlanet: false,
    /** Short cycles for a snappy game (design doc 3). */
    secondsPerCycle: 20,
    birthBase: 12,
    birthPerCitizen: 3,
    thresholds: [20, 55, 130, 220, 370, 600, 910, 1210, 1550, 1900],
    discoveryCostMul: 0.5,
    /** Everyone plays their own economy, so nothing scales with player count. */
    playerThresholdMul: [1, 1, 1, 1],
    playerDiscoveryCostMul: [1, 1, 1, 1],
    monsterStrengthMul: [1, 1, 1, 1],
    /** Design doc 5.7: 1 + 2·n planets and n AI factions, smaller than coop so players meet fast. */
    planets: [3, 5, 7, 9],
    aiFactions: [1, 2, 3, 4],
    /** Start planets are mirrored: same biomes, deposits, sun distance and distance to each other. */
    mirroredStartPlanets: true,
    /** No joining after the start; reconnecting is always possible. */
    joinAfterStart: false,
    eventsMul: [1, 1, 1, 1],
    /** Last people standing wins, or all remaining players agree on a draw. */
    victory: "eradication",
    cycleLimit: null,
    /** Stalemate guard (design doc open point 1): offer a draw after this many cycles without a fight. */
    drawOfferAfterPeacefulCycles: 300,
    releaseAbsentWorkers: false,
  },
} as const;

/**
 * Player-versus-player fights (versus mode, design doc 5.2). Flights are visible on the star map
 * with their arrival time, so the defender can pull citizens off work.
 *
 * Attack: citizens fly in a combat rocket. On arrival they fight the defenders (idle citizens
 * plus those marked as defenders, who stop working). Each round both sides roll 1d6 + bonuses;
 * the lower side loses a citizen, a tie costs both. The attacker may retreat if he brought fuel
 * for the way back. If the attackers win they occupy the planet: buildings and storage become
 * theirs, survivors stay as citizens, and the defender's workers become prisoners who work for
 * the winner but still count for their own people until they die or are assimilated.
 *
 * Sabotage: 1–2 saboteurs destroy a chosen building or steal cargo if the best roll beats the
 * target; otherwise they die.
 */
export const VERSUS_COMBAT = {
  sabotageMinLevel: 2,
  attackMinLevel: 3,
  /** Unlocks the combat rocket before attackMinLevel (design doc: "ab Ascension 3 oder passender Discovery"). */
  earlyAttackDiscovery: "rocketry",
  /** Weapons: +1 on attack rolls. Shields: +1 on defense rolls. */
  weaponsDiscovery: "rocketry",
  shieldsDiscovery: "fortification",
  /** The attacker may retreat if he brought fuel for the way back; otherwise his citizens stay. */
  retreatAllowed: true,
  /** Default defenders: all idle citizens; workers marked as defenders stop working. */
  defaultDefenders: "idle",
  /** Never attack citizens in flight, never use this rule against AI planets (AI war stays separate). */
  attackFlights: false,
  attackAiPlanets: false,
  die: 6,
  attackerBonus: 0,
  defenderHomeBonus: 1,
  /** Sabotage succeeds if the best saboteur roll + bonuses ≥ target + watchtowers on the planet. */
  sabotageTarget: 5,
  /** Cargo stolen by a successful sabotage, as a share of one resource's stock. */
  sabotageStealShare: 0.3,
  /** Prisoners join the winner's people after this many cycles (design doc open point 2). */
  prisonerAssimilationCycles: 10,
  /** Discovery that assimilates prisoners at once. */
  instantAssimilationDiscovery: "diplomacy",
  /** Peoples' battleRoll and battleLosses modifiers apply to these fights too. */
  usesPeopleModifiers: true,
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
    /** Sabotage from level 2 (~4 min), attacks from level 3 (~7 min); a 2-player game should end in 30–60 min. */
    targetMinute: [2, 4, 7, 10, 14, 19, 25, 30, 35, 40],
    discoveriesPerGame: { min: 7, max: 12 },
  },
  /** Share of citizens working in labs, and science per lab worker per minute (t1/t2 average). */
  labWorkerShare: 0.1,
  sciencePerLabWorkerPerMinute: 7,
  /** A built-out home planet should offer at least this many jobs per citizen. */
  jobsPerCitizen: 1.4,
} as const;
