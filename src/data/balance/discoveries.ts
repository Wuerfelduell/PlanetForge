import type { BiomeId, ResourceId } from "./resources";
import type { DiscoveryDef } from "./types";

/** Ids match the discovery icons in the asset brief (art/src/discoveries/). */
export const DISCOVERY_IDS = [
  "swift-feet", "green-thumb", "efficient-housing", "pure-science", "cartography",
  "medicine", "recycling", "storage-tech", "diplomacy",
  "ecology", "long-range-sight", "fortification", "survival-kits",
  "deep-drilling", "trade-routes",
  "rocketry", "festival", "energy-grid",
  "space-mining", "weather-control",
  "crystal-lore", "automation",
  "terraforming", "atomic-power",
  // Late game, levels 11–20 (coop goes on past level 10).
  "genetics", "nanotech", "deep-space-radar", "arcology", "warp-drive", "quantum-computing",
  "force-fields", "biosphere", "golden-age", "matter-replicator", "cloning", "star-forge",
  "galactic-council", "transcendence",
] as const;
export type DiscoveryId = (typeof DISCOVERY_IDS)[number];

/**
 * Discoveries are side-grades and shortcuts, never required for the main path: every
 * building on the critical path unlocks by ascension level alone. Exceptions are optional
 * buildings (air filter, atomic plant) and hidden deposits (uranium, aetherite on the home
 * planet; on other planets they need the discovery as well).
 */
export const DISCOVERIES = {
  "swift-feet": {
    name: "Flinke Pfoten",
    description: "Sammeln von Hand +20 %.",
    minLevel: 1,
    modifiers: [{ stat: "handGatherRate", mul: 1.2 }],
  },
  "green-thumb": {
    name: "Grüner Daumen",
    description: "Farmen +25 %, Beeren und Wald wachsen 50 % schneller nach.",
    minLevel: 1,
    modifiers: [
      { stat: "buildingOutput", mul: 1.25, scope: { building: "farm" } },
      { stat: "regenRate", mul: 1.5 },
    ],
  },
  "efficient-housing": {
    name: "Gemütlich wohnen",
    description: "+1 Platz in jedem Wohnhaus.",
    minLevel: 1,
    modifiers: [{ stat: "housing", add: 1, scope: { building: "housing" } }],
  },
  "pure-science": {
    name: "Reine Wissenschaft",
    description: "Alle weiteren Entdeckungen kosten 20 % weniger.",
    minLevel: 1,
    modifiers: [{ stat: "discoveryCost", mul: 0.8 }],
  },
  cartography: {
    name: "Kartografie",
    description: "Jedes neue Gebäude deckt ein Feld weiter auf.",
    minLevel: 1,
    modifiers: [{ stat: "revealRadius", add: 1 }],
  },
  medicine: {
    name: "Medizin",
    description: "Nachwuchs kommt 30 % schneller, im Kampf stirbt einer weniger.",
    minLevel: 2,
    modifiers: [
      { stat: "birthTime", mul: 0.7 },
      { stat: "battleLosses", add: -1 },
    ],
  },
  recycling: {
    name: "Recycling",
    description: "Abriss gibt 90 % statt 50 % der Kosten zurück, Ruinen verschwinden sofort.",
    minLevel: 2,
    modifiers: [{ stat: "demolishRefund", add: 0.4 }],
  },
  "storage-tech": {
    name: "Lagertechnik",
    description: "Alle Lagergrenzen +50 %.",
    minLevel: 2,
    modifiers: [{ stat: "storage", mul: 1.5 }],
  },
  diplomacy: {
    name: "Diplomatie",
    description: "Bündnisse werden möglich, Handel bringt 10 % mehr. Gegeneinander: Gefangene werden sofort Teil des eigenen Volks.",
    minLevel: 2,
    unlocks: { actions: ["alliance"] },
    modifiers: [{ stat: "tradeRate", mul: 1.1 }],
  },
  ecology: {
    name: "Ökologie",
    description: "Schaltet den Luftfilter frei, Verschmutzung baut sich 50 % schneller ab.",
    minLevel: 3,
    unlocks: { buildings: ["air-filter"] },
    modifiers: [{ stat: "pollutionDecay", mul: 1.5 }],
  },
  "long-range-sight": {
    name: "Fernrohr",
    description: "+2 Sichtweite auf der Sternkarte.",
    minLevel: 3,
    modifiers: [{ stat: "sightRadius", add: 2 }],
  },
  fortification: {
    name: "Befestigung",
    description: "Wachtürme geben +2 extra, +1 auf jeden Kampfwurf (Schilde gegen Angriffe anderer Spieler).",
    minLevel: 3,
    modifiers: [
      { stat: "battleRoll", add: 2, scope: { building: "watchtower" } },
      { stat: "battleRoll", add: 1 },
    ],
  },
  "survival-kits": {
    name: "Notfallkisten",
    description: "Rettungskapseln geben doppelt so viel, neue Kolonien starten mit 20 Holz und 20 Nahrung.",
    minLevel: 3,
    modifiers: [{ stat: "escapePodReward", mul: 2 }],
  },
  "deep-drilling": {
    name: "Tiefbohrung",
    description: "Minen-Vorkommen +50 %, Uran in der Tundra wird sichtbar.",
    minLevel: 4,
    modifiers: [{ stat: "depositMax", mul: 1.5, scope: { building: "mine" } }],
  },
  "trade-routes": {
    name: "Handelswege",
    description: "Handel bringt 25 % mehr.",
    minLevel: 4,
    modifiers: [{ stat: "tradeRate", mul: 1.25 }],
  },
  rocketry: {
    name: "Raketentechnik",
    description:
      "Raketen brauchen 25 % weniger Treibstoff und tragen einen Einwohner mehr. Gegeneinander: +1 auf Angriffswürfe.",
    minLevel: 2,
    modifiers: [
      { stat: "rocketFuel", mul: 0.75 },
      { stat: "rocketCapacity", add: 1 },
    ],
  },
  festival: {
    name: "Volksfest",
    description: "+10 % Aufstiegspunkte pro Umlauf.",
    minLevel: 5,
    modifiers: [{ stat: "ascensionPerCycle", mul: 1.1 }],
  },
  "energy-grid": {
    name: "Stromnetz",
    description: "Alle Kraftwerke +20 %.",
    minLevel: 5,
    modifiers: [{ stat: "energyOutput", mul: 1.2 }],
  },
  "space-mining": {
    name: "Weltraumbergbau",
    description: "Asteroiden werden sichtbar und besiedelbar.",
    minLevel: 6,
    unlocks: { actions: ["colonize-asteroid"] },
  },
  "weather-control": {
    name: "Wetterkontrolle",
    description: "Alle Vorkommen wachsen doppelt so schnell nach.",
    minLevel: 6,
    modifiers: [{ stat: "regenRate", mul: 2 }],
  },
  "crystal-lore": {
    name: "Kristallkunde",
    description: "Ätherit auf Kristallfeldern wird sichtbar, Ätherit-Abbau +20 %.",
    minLevel: 7,
    modifiers: [{ stat: "buildingOutput", mul: 1.2, scope: { resource: "aetherite" } }],
  },
  automation: {
    name: "Automatisierung",
    description: "In jedem Produktionsgebäude kann ein Automat einen Einwohner ersetzen. Jeder Automat braucht 2 Energie.",
    minLevel: 7,
    modifiers: [{ stat: "automatonSlots", add: 1 }],
  },
  terraforming: {
    name: "Terraforming",
    description: "Erschöpfte Felder lassen sich für 20 Wasser und 10 Beton wieder zu Wald oder Savanne machen.",
    minLevel: 8,
    unlocks: { actions: ["terraform"] },
  },
  "atomic-power": {
    name: "Kernkraft",
    description: "Schaltet das Atomkraftwerk frei.",
    minLevel: 9,
    unlocks: { buildings: ["power-atomic"] },
  },
  genetics: {
    name: "Genetik",
    description: "Nachwuchs kommt 20 % schneller.",
    minLevel: 11,
    modifiers: [{ stat: "birthTime", mul: 0.8 }],
  },
  nanotech: {
    name: "Nanotechnik",
    description: "Alle Gebäude produzieren 15 % mehr.",
    minLevel: 11,
    modifiers: [{ stat: "buildingOutput", mul: 1.15 }],
  },
  "deep-space-radar": {
    name: "Tiefraumradar",
    description: "+4 Sichtweite auf der Sternkarte, jedes neue Gebäude deckt ein Feld weiter auf.",
    minLevel: 12,
    modifiers: [
      { stat: "sightRadius", add: 4 },
      { stat: "revealRadius", add: 1 },
    ],
  },
  arcology: {
    name: "Arkologie",
    description: "+2 Plätze in jedem Wohnhaus.",
    minLevel: 12,
    modifiers: [{ stat: "housing", add: 2, scope: { building: "housing" } }],
  },
  "warp-drive": {
    name: "Warpantrieb",
    description: "Raketen brauchen 40 % weniger Treibstoff und tragen zwei Einwohner mehr.",
    minLevel: 13,
    modifiers: [
      { stat: "rocketFuel", mul: 0.6 },
      { stat: "rocketCapacity", add: 2 },
    ],
  },
  "quantum-computing": {
    name: "Quantenrechner",
    description: "Alle weiteren Entdeckungen kosten 25 % weniger.",
    minLevel: 13,
    modifiers: [{ stat: "discoveryCost", mul: 0.75 }],
  },
  "force-fields": {
    name: "Kraftfelder",
    description: "+2 auf jeden Kampfwurf, im Kampf stirbt einer weniger.",
    minLevel: 14,
    modifiers: [
      { stat: "battleRoll", add: 2 },
      { stat: "battleLosses", add: -1 },
    ],
  },
  biosphere: {
    name: "Biosphäre",
    description: "Farmen +25 %, alle Vorkommen wachsen 50 % schneller nach.",
    minLevel: 14,
    modifiers: [
      { stat: "buildingOutput", mul: 1.25, scope: { building: "farm" } },
      { stat: "regenRate", mul: 1.5 },
    ],
  },
  "golden-age": {
    name: "Goldenes Zeitalter",
    description: "+20 % Aufstiegspunkte pro Umlauf.",
    minLevel: 15,
    modifiers: [{ stat: "ascensionPerCycle", mul: 1.2 }],
  },
  "matter-replicator": {
    name: "Materiewandler",
    description: "Sammeln von Hand +50 %.",
    minLevel: 16,
    modifiers: [{ stat: "handGatherRate", mul: 1.5 }],
  },
  cloning: {
    name: "Klonlabor",
    description: "Nachwuchs kommt 25 % schneller.",
    minLevel: 17,
    modifiers: [{ stat: "birthTime", mul: 0.75 }],
  },
  "star-forge": {
    name: "Sternenschmiede",
    description: "Alle Gebäude produzieren 20 % mehr.",
    minLevel: 18,
    modifiers: [{ stat: "buildingOutput", mul: 1.2 }],
  },
  "galactic-council": {
    name: "Galaktischer Rat",
    description: "+25 % Aufstiegspunkte pro Umlauf, Entdeckungen kosten 20 % weniger.",
    minLevel: 19,
    modifiers: [
      { stat: "ascensionPerCycle", mul: 1.25 },
      { stat: "discoveryCost", mul: 0.8 },
    ],
  },
  transcendence: {
    name: "Transzendenz",
    description: "Die höchste Erkenntnis: +50 % Aufstiegspunkte, alle Gebäude +25 %.",
    minLevel: 20,
    modifiers: [
      { stat: "ascensionPerCycle", mul: 1.5 },
      { stat: "buildingOutput", mul: 1.25 },
    ],
  },
} as const satisfies Record<DiscoveryId, DiscoveryDef<ResourceId, BiomeId>>;

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
