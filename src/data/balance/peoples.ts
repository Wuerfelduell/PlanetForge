import type { BiomeId, ResourceId } from "./resources";
import type { PeopleDef } from "./types";

/** Ids and animals match the asset brief (art/src/peoples/). */
export const PEOPLE_IDS = [
  "burrowbeavers", "quillfolk", "axolings", "shellguards", "dunehoppers", "starowls",
  "tideotters", "hornbeetles", "frostseals", "swapcoons", "glowsnails", "echobats",
] as const;
export type PeopleId = (typeof PEOPLE_IDS)[number];

/**
 * Bonuses every people gets on top of its ability:
 * +30 % hand gathering and building output on its favorite biome, +25 % on its favorite resource.
 */
export const PEOPLE_BASE = {
  favoriteBiomeBonus: 0.3,
  favoriteResourceBonus: 0.25,
} as const;

/**
 * Abilities are deliberately worth about the same (~+15 % economy each); they change *how*
 * a game plays, not how fast. The two P0 peoples are the easiest to learn.
 */
export const PEOPLES = {
  burrowbeavers: {
    name: "Dammbiber",
    animal: "Biber",
    favoriteBiome: "forest",
    favoriteResource: "wood",
    startBonus: { wood: 20 },
    ability: {
      name: "Baumeister",
      description: "Gebäude und Ausbauten kosten 20 % weniger Holz und Bretter.",
      modifiers: [
        { stat: "buildCost", mul: 0.8, scope: { resource: "wood" } },
        { stat: "buildCost", mul: 0.8, scope: { resource: "planks" } },
      ],
    },
    startDiscovery: null,
    aggression: 0.2,
  },
  quillfolk: {
    name: "Stachelvolk",
    animal: "Igel",
    favoriteBiome: "savanna",
    favoriteResource: "food",
    startBonus: { food: 20 },
    ability: {
      name: "Sammler",
      description: "Sammeln von Hand ist 25 % schneller, Beeren wachsen doppelt so schnell nach.",
      modifiers: [
        { stat: "handGatherRate", mul: 1.25 },
        { stat: "regenRate", mul: 2, scope: { resource: "food" } },
      ],
    },
    startDiscovery: null,
    aggression: 0.1,
  },
  axolings: {
    name: "Axolinge",
    animal: "Axolotl",
    favoriteBiome: "swamp",
    favoriteResource: "water",
    startBonus: { water: 20, food: 10 },
    ability: {
      name: "Heiler",
      description: "Nachwuchs kommt 25 % schneller, im Kampf stirbt einer weniger.",
      modifiers: [
        { stat: "birthTime", mul: 0.75 },
        { stat: "battleLosses", add: -1 },
      ],
    },
    startDiscovery: null,
    aggression: 0.1,
  },
  shellguards: {
    name: "Panzerlinge",
    animal: "Gürteltier",
    favoriteBiome: "mountains",
    favoriteResource: "stone",
    startBonus: { stone: 20 },
    ability: {
      name: "Bergleute",
      description: "Minen haben einen Arbeitsplatz mehr, +1 auf jeden Kampfwurf.",
      modifiers: [
        { stat: "workerSlots", add: 1, scope: { building: "mine" } },
        { stat: "battleRoll", add: 1 },
      ],
    },
    startDiscovery: null,
    aggression: 0.5,
  },
  dunehoppers: {
    name: "Dünenhüpfer",
    animal: "Wüstenspringmaus",
    favoriteBiome: "desert",
    favoriteResource: "sand",
    startBonus: { sand: 20, food: 10 },
    ability: {
      name: "Flink",
      description: "Raketen brauchen 30 % weniger Treibstoff, Einwohner sammeln in der Wüste schneller.",
      modifiers: [
        { stat: "rocketFuel", mul: 0.7 },
        { stat: "handGatherRate", mul: 1.2, scope: { biome: "desert" } },
      ],
    },
    startDiscovery: null,
    aggression: 0.3,
  },
  starowls: {
    name: "Sterneulen",
    animal: "Eule",
    favoriteBiome: "mountains",
    favoriteResource: "iron",
    startBonus: { stone: 10, wood: 10 },
    ability: {
      name: "Sternkunde",
      description: "Sehen Invasoren schon beim Aufbruch kommen, Labore +20 %.",
      modifiers: [
        { stat: "sightRadius", add: 1 },
        { stat: "buildingOutput", mul: 1.2, scope: { building: "lab" } },
      ],
    },
    startDiscovery: null,
    aggression: 0.2,
  },
  tideotters: {
    name: "Gezeitenotter",
    animal: "Otter",
    favoriteBiome: "ocean",
    favoriteResource: "water",
    startBonus: { food: 20 },
    ability: {
      name: "Schwimmer",
      description: "Drei statt zwei Sammler pro Meeresfeld, Pumpen +25 %.",
      modifiers: [
        { stat: "workerSlots", add: 1, scope: { biome: "ocean" } },
        { stat: "buildingOutput", mul: 1.25, scope: { building: "pump" } },
      ],
    },
    startDiscovery: null,
    aggression: 0.2,
  },
  hornbeetles: {
    name: "Hornkäfer",
    animal: "Nashornkäfer",
    favoriteBiome: "savanna",
    favoriteResource: "iron",
    startBonus: { stone: 15 },
    ability: {
      name: "Schmiede",
      description: "Die Gießerei arbeitet 20 % schneller, +1 auf jeden Kampfwurf.",
      modifiers: [
        { stat: "craftSpeed", mul: 1.2, scope: { building: "foundry" } },
        { stat: "battleRoll", add: 1 },
      ],
    },
    startDiscovery: null,
    aggression: 0.7,
  },
  frostseals: {
    name: "Frostrobben",
    animal: "Robbe",
    favoriteBiome: "tundra",
    favoriteResource: "water",
    startBonus: { food: 15, water: 10 },
    ability: {
      name: "Dickes Fell",
      description: "Brauchen 20 % weniger Nahrung, Raumanzüge halten doppelt so lange.",
      modifiers: [
        { stat: "foodUpkeep", mul: 0.8 },
        { stat: "suitWear", mul: 0.5 },
      ],
    },
    startDiscovery: null,
    aggression: 0.2,
  },
  swapcoons: {
    name: "Tauschbären",
    animal: "Waschbär",
    favoriteBiome: "forest",
    favoriteResource: "coal",
    startBonus: { wood: 10, food: 10 },
    ability: {
      name: "Händler",
      description: "Handel bringt 25 % mehr, Abriss gibt 80 % der Kosten zurück.",
      modifiers: [
        { stat: "tradeRate", mul: 1.25 },
        { stat: "demolishRefund", add: 0.3 },
      ],
    },
    startDiscovery: "trade-routes",
    aggression: 0.3,
  },
  glowsnails: {
    name: "Glimmschnecken",
    animal: "Schnecke",
    favoriteBiome: "swamp",
    favoriteResource: "biogas",
    startBonus: { clay: 20 },
    ability: {
      name: "Schneckenhaus",
      description: "Jedes Wohngebäude fasst einen Einwohner mehr, Biogasanlagen +30 %.",
      modifiers: [
        { stat: "housing", add: 1 },
        { stat: "buildingOutput", mul: 1.3, scope: { building: "biogas-plant" } },
      ],
    },
    startDiscovery: null,
    aggression: 0.1,
  },
  echobats: {
    name: "Echoflatterer",
    animal: "Fledermaus",
    favoriteBiome: "crystal",
    favoriteResource: "aetherite",
    startBonus: { stone: 15 },
    ability: {
      name: "Echoortung",
      description: "Jedes Gebäude deckt ein Feld weiter auf.",
      modifiers: [{ stat: "revealRadius", add: 1 }],
    },
    startDiscovery: "crystal-lore",
    aggression: 0.4,
  },
} as const satisfies Record<PeopleId, PeopleDef<ResourceId, BiomeId>>;
