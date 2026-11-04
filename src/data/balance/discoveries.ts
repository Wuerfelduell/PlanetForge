import type { BiomeId, ResourceId } from "./resources";
import type { DiscoveryDef } from "./types";

/** Ids match the discovery icons in the asset brief (art/src/discoveries/); new ones fall back to `icon`. */
export const DISCOVERY_IDS = [
  "swift-feet", "green-thumb", "efficient-housing", "pure-science", "cartography",
  "medicine", "recycling",
  "long-range-sight", "fortification",
  "deep-drilling", "trade-routes",
  "rocketry", "festival", "energy-grid",
  "space-mining", "weather-control",
  "crystal-lore", "automation",
  // Pool extension (Seb 2026-11-04: more choices, every one with a real effect).
  "forestry", "preserves", "fishing-nets", "masonry", "ballistics", "metallurgy",
  "petrochemistry", "salvage", "shell-statics", "microchips",
  // Late game, levels 11–20 (coop goes on past level 10).
  "genetics", "nanotech", "deep-space-radar", "arcology", "warp-drive", "quantum-computing",
  "force-fields", "biosphere", "golden-age", "matter-replicator", "cloning", "star-forge",
  "galactic-council", "transcendence",
  "exobiology", "superconductors", "robotics", "orbital-defense",
] as const;
export type DiscoveryId = (typeof DISCOVERY_IDS)[number];

/**
 * Ids of discoveries that were removed (2026-11-04 audit): they were never offered because the
 * simulation had nothing for them to do (escape pods, pollution, storage caps, alliances) or
 * gave something everyone already has (terraforming, the atomic plant unlock by level).
 * upgradeState() drops them from old saves.
 */
export const REMOVED_DISCOVERIES = ["storage-tech", "diplomacy", "ecology", "survival-kits", "terraforming", "atomic-power"] as const;

type Res = ResourceId | "bronze" | "aluminium" | "titanium";

/**
 * Discoveries are side-grades and shortcuts, never required for the main path: every
 * building on the critical path unlocks by ascension level alone. Every discovery changes
 * something the simulation uses (discoveries.test.ts checks that each stat is applied);
 * `when` keeps combat and shield ones out of games without invaders, factions or supernova.
 */
export const DISCOVERIES = {
  "swift-feet": {
    name: "Flinke Pfoten",
    icon: "🐾",
    description: "Sammeln von Hand +30 %.",
    minLevel: 1,
    modifiers: [{ stat: "handGatherRate", mul: 1.3 }],
  },
  "green-thumb": {
    name: "Grüner Daumen",
    icon: "🌱",
    description: "Farmen +25 %, alle Vorkommen wachsen 50 % schneller nach.",
    minLevel: 1,
    modifiers: [
      { stat: "buildingOutput", mul: 1.25, scope: { building: "farm" } },
      { stat: "regenRate", mul: 1.5 },
    ],
  },
  "efficient-housing": {
    name: "Gemütlich wohnen",
    icon: "🛋️",
    description: "+1 Platz in jedem Wohnhaus.",
    minLevel: 1,
    modifiers: [{ stat: "housing", add: 1, scope: { building: "housing" } }],
  },
  "pure-science": {
    name: "Reine Wissenschaft",
    icon: "🔬",
    description: "Sofort eine weitere Entdeckung zur Wahl, alle weiteren kosten 20 % weniger Wissen.",
    minLevel: 1,
    extraPicks: 1,
    modifiers: [{ stat: "discoveryCost", mul: 0.8 }],
  },
  cartography: {
    name: "Kartografie",
    icon: "🗺️",
    description: "Jedes neue Gebäude deckt ein Feld weiter auf.",
    minLevel: 1,
    modifiers: [{ stat: "revealRadius", add: 1 }],
  },
  medicine: {
    name: "Medizin",
    icon: "💊",
    description: "Nachwuchs kommt 30 % schneller, im Kampf stirbt einer weniger.",
    minLevel: 2,
    modifiers: [
      { stat: "birthTime", mul: 0.7 },
      { stat: "battleLosses", add: -1 },
    ],
  },
  recycling: {
    name: "Recycling",
    icon: "♻️",
    description: "Abriss gibt 90 % statt 50 % der Kosten zurück.",
    minLevel: 2,
    modifiers: [{ stat: "demolishRefund", add: 0.4 }],
  },
  "long-range-sight": {
    name: "Fernrohr",
    icon: "🔭",
    description: "Invasoren werden schon beim Aufbruch entdeckt, Batterien treffen 25 % härter.",
    minLevel: 3,
    when: "invaders",
    modifiers: [
      { stat: "sightRadius", add: 2 },
      { stat: "batteryDamage", mul: 1.25 },
    ],
  },
  fortification: {
    name: "Befestigung",
    icon: "🏰",
    description: "Wachtürme geben +2 extra, +1 auf jeden Kampfwurf.",
    minLevel: 3,
    when: "combat",
    modifiers: [
      { stat: "battleRoll", add: 2, scope: { building: "watchtower" } },
      { stat: "battleRoll", add: 1 },
    ],
  },
  "deep-drilling": {
    name: "Tiefbohrung",
    icon: "⛏️",
    description: "Minen und Tiefbohrer holen 25 % mehr aus jedem Vorkommen, bevor es erschöpft ist.",
    minLevel: 4,
    modifiers: [
      { stat: "depositYield", mul: 1.25, scope: { building: "mine" } },
      { stat: "depositYield", mul: 1.25, scope: { building: "deep-drill" } },
    ],
  },
  "trade-routes": {
    name: "Handelswege",
    icon: "🐪",
    description: "Handel mit Fraktionen bringt 25 % mehr.",
    minLevel: 4,
    when: "factions",
    modifiers: [{ stat: "tradeRate", mul: 1.25 }],
  },
  rocketry: {
    name: "Raketentechnik",
    icon: "🚀",
    description: "Raketen brauchen 25 % weniger Treibstoff und tragen einen Einwohner mehr.",
    minLevel: 2,
    modifiers: [
      { stat: "rocketFuel", mul: 0.75 },
      { stat: "rocketCapacity", add: 1 },
    ],
  },
  festival: {
    name: "Volksfest",
    icon: "🎉",
    description: "+15 % Aufstiegspunkte von den Einwohnern pro Umlauf.",
    minLevel: 5,
    modifiers: [{ stat: "ascensionPerCycle", mul: 1.15 }],
  },
  "energy-grid": {
    name: "Stromnetz",
    icon: "🔌",
    description: "Alle Kraftwerke liefern 25 % mehr Strom.",
    minLevel: 5,
    modifiers: [{ stat: "energyOutput", mul: 1.25 }],
  },
  "space-mining": {
    name: "Weltraumbergbau",
    icon: "☄️",
    description: "Asteroiden werden sichtbar und besiedelbar.",
    minLevel: 6,
    unlocks: { actions: ["colonize-asteroid"] },
  },
  "weather-control": {
    name: "Wetterkontrolle",
    icon: "🌦️",
    description: "Alle Vorkommen wachsen doppelt so schnell nach.",
    minLevel: 6,
    modifiers: [{ stat: "regenRate", mul: 2 }],
  },
  "crystal-lore": {
    name: "Kristallkunde",
    icon: "💎",
    description: "Ätherit-Vorkommen geben 50 % mehr her.",
    minLevel: 7,
    modifiers: [{ stat: "depositYield", mul: 1.5, scope: { resource: "aetherite" } }],
  },
  automation: {
    name: "Automatisierung",
    icon: "🤖",
    description: "Alle Werkstätten und Fabriken arbeiten 25 % schneller.",
    minLevel: 7,
    modifiers: [{ stat: "craftSpeed", mul: 1.25 }],
  },
  forestry: {
    name: "Forstwirtschaft",
    icon: "🪓",
    description: "Holz +30 %, Wälder wachsen 50 % schneller nach.",
    minLevel: 1,
    modifiers: [
      { stat: "handGatherRate", mul: 1.3, scope: { resource: "wood" } },
      { stat: "buildingOutput", mul: 1.3, scope: { resource: "wood" } },
      { stat: "regenRate", mul: 1.5, scope: { resource: "wood" } },
    ],
  },
  preserves: {
    name: "Vorratshaltung",
    icon: "🥫",
    description: "Alle Einwohner brauchen 15 % weniger Nahrung.",
    minLevel: 2,
    modifiers: [{ stat: "foodUpkeep", mul: 0.85 }],
  },
  "fishing-nets": {
    name: "Schleppnetze",
    icon: "🎣",
    description: "Fischereien fangen 40 % mehr.",
    minLevel: 2,
    modifiers: [{ stat: "buildingOutput", mul: 1.4, scope: { building: "fishery" } }],
  },
  masonry: {
    name: "Baukunst",
    icon: "🧱",
    description: "Gebäude und Ausbauten kosten 15 % weniger.",
    minLevel: 3,
    modifiers: [{ stat: "buildCost", mul: 0.85 }],
  },
  ballistics: {
    name: "Ballistik",
    icon: "🎯",
    description: "Batterien und Raketenwerfer treffen Invasoren 50 % härter.",
    minLevel: 4,
    when: "invaders",
    modifiers: [{ stat: "batteryDamage", mul: 1.5 }],
  },
  metallurgy: {
    name: "Metallurgie",
    icon: "⚒️",
    description: "Stahl, Bronze, Aluminium und Titan +25 %.",
    minLevel: 4,
    modifiers: [
      { stat: "buildingOutput", mul: 1.25, scope: { resource: "steel" } },
      { stat: "buildingOutput", mul: 1.25, scope: { resource: "bronze" } },
      { stat: "buildingOutput", mul: 1.25, scope: { resource: "aluminium" } },
      { stat: "buildingOutput", mul: 1.25, scope: { resource: "titanium" } },
    ],
  },
  petrochemistry: {
    name: "Petrochemie",
    icon: "🛢️",
    description: "Ölfelder geben 30 % mehr her, Treibstoff und Plastik +25 %.",
    minLevel: 5,
    modifiers: [
      { stat: "depositYield", mul: 1.3, scope: { resource: "oil" } },
      { stat: "buildingOutput", mul: 1.25, scope: { resource: "fuel" } },
      { stat: "buildingOutput", mul: 1.25, scope: { resource: "plastic" } },
    ],
  },
  salvage: {
    name: "Bergungstechnik",
    icon: "🧲",
    description: "Besiegte Invasoren hinterlassen doppelt so viel Beute.",
    minLevel: 5,
    when: "invaders",
    modifiers: [{ stat: "invaderLoot", mul: 2 }],
  },
  "shell-statics": {
    name: "Hüllenstatik",
    icon: "🌞",
    description: "Segmente der Sonnenschutzhülle und ihre Reparatur kosten 30 % weniger.",
    minLevel: 6,
    when: "supernova",
    modifiers: [{ stat: "shieldCost", mul: 0.7 }],
  },
  microchips: {
    name: "Mikroelektronik",
    icon: "💾",
    description: "Kupferdraht, Elektronik und Computer +25 %.",
    minLevel: 7,
    modifiers: [
      { stat: "buildingOutput", mul: 1.25, scope: { resource: "wire" } },
      { stat: "buildingOutput", mul: 1.25, scope: { resource: "electronics" } },
      { stat: "buildingOutput", mul: 1.25, scope: { resource: "computer" } },
    ],
  },
  genetics: {
    name: "Genetik",
    icon: "🧬",
    description: "Nachwuchs kommt 20 % schneller.",
    minLevel: 11,
    modifiers: [{ stat: "birthTime", mul: 0.8 }],
  },
  nanotech: {
    name: "Nanotechnik",
    icon: "🔩",
    description: "Alle Gebäude produzieren 15 % mehr.",
    minLevel: 11,
    modifiers: [{ stat: "buildingOutput", mul: 1.15 }],
  },
  "deep-space-radar": {
    name: "Tiefraumradar",
    icon: "📡",
    description: "Invasoren werden schon beim Aufbruch entdeckt, Batterien und Raketenwerfer treffen 50 % härter.",
    minLevel: 12,
    when: "invaders",
    modifiers: [
      { stat: "sightRadius", add: 4 },
      { stat: "batteryDamage", mul: 1.5 },
    ],
  },
  arcology: {
    name: "Arkologie",
    icon: "🏙️",
    description: "+2 Plätze in jedem Wohnhaus.",
    minLevel: 12,
    modifiers: [{ stat: "housing", add: 2, scope: { building: "housing" } }],
  },
  "warp-drive": {
    name: "Warpantrieb",
    icon: "🌀",
    description: "Raketen brauchen 40 % weniger Treibstoff und tragen zwei Einwohner mehr.",
    minLevel: 13,
    modifiers: [
      { stat: "rocketFuel", mul: 0.6 },
      { stat: "rocketCapacity", add: 2 },
    ],
  },
  "quantum-computing": {
    name: "Quantenrechner",
    icon: "🧮",
    description: "Sofort eine weitere Entdeckung zur Wahl, alle weiteren kosten 25 % weniger Wissen.",
    minLevel: 13,
    extraPicks: 1,
    modifiers: [{ stat: "discoveryCost", mul: 0.75 }],
  },
  "force-fields": {
    name: "Kraftfelder",
    icon: "🛡️",
    description: "+2 auf jeden Kampfwurf, im Kampf stirbt einer weniger.",
    minLevel: 14,
    when: "combat",
    modifiers: [
      { stat: "battleRoll", add: 2 },
      { stat: "battleLosses", add: -1 },
    ],
  },
  biosphere: {
    name: "Biosphäre",
    icon: "🌍",
    description: "Farmen +25 %, alle Vorkommen wachsen 50 % schneller nach.",
    minLevel: 14,
    modifiers: [
      { stat: "buildingOutput", mul: 1.25, scope: { building: "farm" } },
      { stat: "regenRate", mul: 1.5 },
    ],
  },
  "golden-age": {
    name: "Goldenes Zeitalter",
    icon: "👑",
    description: "+20 % Aufstiegspunkte von den Einwohnern pro Umlauf.",
    minLevel: 15,
    modifiers: [{ stat: "ascensionPerCycle", mul: 1.2 }],
  },
  "matter-replicator": {
    name: "Materiewandler",
    icon: "⚗️",
    description: "Gebäude und Ausbauten kosten 25 % weniger.",
    minLevel: 16,
    modifiers: [{ stat: "buildCost", mul: 0.75 }],
  },
  cloning: {
    name: "Klonlabor",
    icon: "🧪",
    description: "Nachwuchs kommt 25 % schneller.",
    minLevel: 17,
    modifiers: [{ stat: "birthTime", mul: 0.75 }],
  },
  "star-forge": {
    name: "Sternenschmiede",
    icon: "✨",
    description: "Alle Gebäude produzieren 20 % mehr.",
    minLevel: 18,
    modifiers: [{ stat: "buildingOutput", mul: 1.2 }],
  },
  "galactic-council": {
    name: "Galaktischer Rat",
    icon: "🌌",
    description: "+25 % Aufstiegspunkte von den Einwohnern pro Umlauf, Entdeckungen kosten 20 % weniger.",
    minLevel: 19,
    modifiers: [
      { stat: "ascensionPerCycle", mul: 1.25 },
      { stat: "discoveryCost", mul: 0.8 },
    ],
  },
  transcendence: {
    name: "Transzendenz",
    icon: "🌟",
    description: "Die höchste Erkenntnis: +50 % Aufstiegspunkte von den Einwohnern, alle Gebäude +25 %.",
    minLevel: 20,
    modifiers: [
      { stat: "ascensionPerCycle", mul: 1.5 },
      { stat: "buildingOutput", mul: 1.25 },
    ],
  },
  exobiology: {
    name: "Exobiologie",
    icon: "🦠",
    description: "Alle Einwohner brauchen 20 % weniger Nahrung, Raumanzüge halten doppelt so lange.",
    minLevel: 11,
    modifiers: [
      { stat: "foodUpkeep", mul: 0.8 },
      { stat: "suitWear", mul: 0.5 },
    ],
  },
  superconductors: {
    name: "Supraleiter",
    icon: "⚡",
    description: "Alle Kraftwerke liefern 30 % mehr Strom.",
    minLevel: 12,
    modifiers: [{ stat: "energyOutput", mul: 1.3 }],
  },
  robotics: {
    name: "Robotik",
    icon: "🦾",
    description: "Alle Werkstätten und Fabriken arbeiten 30 % schneller.",
    minLevel: 14,
    modifiers: [{ stat: "craftSpeed", mul: 1.3 }],
  },
  "orbital-defense": {
    name: "Orbitalabwehr",
    icon: "🛰️",
    description: "Batterien und Raketenwerfer treffen doppelt so hart, +1 auf jeden Kampfwurf.",
    minLevel: 15,
    when: "invaders",
    modifiers: [
      { stat: "batteryDamage", mul: 2 },
      { stat: "battleRoll", add: 1 },
    ],
  },
} as const satisfies Record<DiscoveryId, DiscoveryDef<Res, BiomeId>>;

export const DISCOVERY_RULES = {
  /** Cost of the n-th discovery bought (0-based): round(baseCost × growth^n). */
  baseCost: 30,
  growth: 1.35,
  /** From this many bought discoveries on, each one costs only lateGrowth × the previous one. */
  lateFrom: 14,
  lateGrowth: 1.15,
  /** New choices offered at every ascension level-up. Unbought offers stay. */
  offersPerLevel: 3,
  /** Science granted on reaching level L: sciencePerLevel × L. */
  sciencePerLevel: 15,
} as const;
