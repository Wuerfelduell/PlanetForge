import { BIOMES, RESOURCE_IDS, type BiomeId, type ResourceId } from "./content";
import { economyOf } from "./rules";
import type { GameEvent, GameState, PlanetState, SegmentState, TerraformKind } from "./state";

export interface TerraformDef {
  name: string;
  icon: string;
  /** Biomes the action works on. */
  from: readonly BiomeId[];
  /** Biome the segment becomes; unset keeps the biome (replanting). */
  to?: BiomeId;
  cost: Partial<Record<ResourceId, number>>;
}

/**
 * Seb (2nd playtest): trees can be planted, water can be filled in with sand or earth.
 * New land and fresh trees start with a small deposit that regrows like any untouched one.
 */
export const TERRAFORM: Record<TerraformKind, TerraformDef> = {
  plantTrees: { name: "Bäume pflanzen", icon: "🌱", from: ["forest", "savanna", "ash"], to: "forest", cost: { food: 5 } },
  fillSand: { name: "Mit Sand aufschütten", icon: "🏜️", from: ["ocean"], to: "desert", cost: { sand: 30 } },
  fillClay: { name: "Mit Erde aufschütten", icon: "🟫", from: ["ocean"], to: "savanna", cost: { clay: 30 } },
  // Seb: draining a swamp works too, but costs more sand than filling in the sea.
  drainSwamp: { name: "Sumpf trockenlegen", icon: "🏜️", from: ["swamp"], to: "savanna", cost: { sand: 50 } },
  // Seb: undefended invaders burn the surface; clearing it lets the ground recover.
  clearScorched: {
    name: "Verbrannte Erde aufräumen",
    icon: "🧹",
    from: ["forest", "savanna", "mountains", "desert", "swamp", "tundra", "crystal", "lava", "ash"],
    cost: { food: 5, stone: 10 },
  },
  // Ice and lava worlds open up step by step: the glacier thaws to tundra, lava cools to ash.
  thawGlacier: { name: "Abtauen", icon: "🔥", from: ["glacier"], to: "tundra", cost: { wood: 30 } },
  coolLava: { name: "Abkühlen", icon: "💧", from: ["lava"], to: "ash", cost: { water: 30 } },
};

export const NOT_SCORCHED = "Hier ist nichts verbrannt";

/** Share of max a planted or newly filled deposit starts with. */
export const TERRAFORM_START_FILL = 0.15;

/** Why the action is not possible right now, or null. */
export function terraformBlocker(state: GameState, planet: PlanetState, segment: SegmentState, kind: TerraformKind): string | null {
  const def = TERRAFORM[kind];
  if (!def) return "Unbekannte Aktion";
  const economy = economyOf(state, planet);
  if (!economy) return "Unbewohnter Planet";
  if (!segment.revealed) return "Feld noch unerforscht";
  if (segment.building) return "Erst das Gebäude abreißen";
  if (!def.from.includes(segment.biome)) return `Nicht auf ${BIOMES[segment.biome].name}`;
  if (kind === "clearScorched" && !segment.scorched) return NOT_SCORCHED;
  if (kind !== "clearScorched" && segment.scorched) return "Erst die verbrannte Erde aufräumen";
  if (kind === "plantTrees" && segment.biome === "forest") {
    const wood = segment.deposits.find((d) => d.resource === "wood");
    if (wood && wood.amount > wood.max * 0.5) return "Hier stehen genug Bäume";
  }
  for (const r of RESOURCE_IDS) if (economy.resources[r] < (def.cost[r] ?? 0)) return "Nicht genug Rohstoffe";
  return null;
}

/** Pays and applies an action whose blocker came back null. */
export function terraform(state: GameState, planet: PlanetState, segment: SegmentState, kind: TerraformKind, playerId: string, events: GameEvent[]): void {
  const def = TERRAFORM[kind];
  const economy = economyOf(state, planet)!;
  for (const r of RESOURCE_IDS) economy.resources[r] -= def.cost[r] ?? 0;
  const to = def.to ?? segment.biome;
  if (kind === "clearScorched") {
    delete segment.scorched;
    delete segment.ruin;
    for (const d of segment.deposits) if (!d.infinite) d.amount = Math.max(d.amount, d.max * TERRAFORM_START_FILL);
  } else if (to !== segment.biome) {
    const old = new Set(BIOMES[segment.biome].deposits.map((d) => d.resource));
    // Rare deposits are not tied to the biome and stay.
    const kept = segment.deposits.filter((d) => !old.has(d.resource));
    const fresh = BIOMES[to].deposits
      .filter((d) => !kept.some((k) => k.resource === d.resource))
      .map((d) => {
        const previous = segment.deposits.find((p) => p.resource === d.resource && !p.infinite);
        const amount = Math.max(previous?.amount ?? 0, d.infinite ? 0 : d.max * TERRAFORM_START_FILL);
        return { resource: d.resource, amount: Math.min(d.max, amount), max: d.max, infinite: !!d.infinite, byHand: !!d.byHand };
      });
    segment.biome = to;
    segment.deposits = [...fresh, ...kept];
    if (!segment.deposits.some((d) => d.resource === segment.gather && d.byHand)) segment.gather = segment.deposits.find((d) => d.byHand)?.resource ?? null;
  } else {
    const wood = segment.deposits.find((d) => d.resource === "wood")!;
    wood.amount = Math.max(wood.amount, wood.max * TERRAFORM_START_FILL);
  }
  events.push({ type: "terraformed", planetId: planet.id, segment: segment.index, kind, playerId });
}
