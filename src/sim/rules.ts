import { BIOMES, BUILDINGS, RESOURCE_IDS, RULES, type BuildingId, type ResourceId } from "./content";
import type { EconomyState, GameState, PlanetState, PlayerState, SegmentState, UnitState } from "./state";

/** Read-only helpers shared by the simulation and the UI (so the UI never re-implements rules). */

export const TICK_MS = 1000 / RULES.ticksPerSecond;

export function ticksPerCycle(state: GameState): number {
  return Math.round(state.settings.cycleSeconds * RULES.ticksPerSecond);
}

export function cycleOf(state: GameState): number {
  return Math.floor(state.tick / ticksPerCycle(state));
}

/** Deep copy. The state is plain JSON by contract, so a JSON round trip is exact and works everywhere. */
export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function playerById(state: GameState, id: string): PlayerState | undefined {
  return state.players.find((p) => p.id === id);
}

export function planetById(state: GameState, id: string): PlanetState | undefined {
  return state.planets.find((p) => p.id === id);
}

export function economyOf(state: GameState, planet: PlanetState): EconomyState | undefined {
  return planet.economyId === null ? undefined : state.economies[planet.economyId];
}

export function economyOfPlayer(state: GameState, playerId: string): EconomyState | undefined {
  const player = playerById(state, playerId);
  return player ? state.economies[player.economyId] : undefined;
}

export function homePlanet(state: GameState, playerId: string): PlanetState | undefined {
  const player = playerById(state, playerId);
  return player ? planetById(state, player.homePlanetId) : undefined;
}

export function segmentAt(planet: PlanetState, index: number): SegmentState | undefined {
  const n = planet.segments.length;
  return planet.segments[((index % n) + n) % n];
}

export function neighbors(planet: PlanetState, index: number): SegmentState[] {
  return [segmentAt(planet, index - 1)!, segmentAt(planet, index + 1)!];
}

/** Units on a planet, optionally only those of one owner. Ordered by creation. */
export function unitsOn(state: GameState, planetId: string, owner?: string): UnitState[] {
  return Object.values(state.units).filter((u) => u.planetId === planetId && (owner === undefined || u.owner === owner));
}

export function population(state: GameState, planet: PlanetState, owner?: string): number {
  return unitsOn(state, planet.id, owner).length;
}

export function workersOn(state: GameState, planet: PlanetState, segment: number, owner?: string): UnitState[] {
  return unitsOn(state, planet.id, owner).filter((u) => u.segment === segment);
}

export function workerCount(state: GameState, planet: PlanetState, segment: number, owner?: string): number {
  return workersOn(state, planet, segment, owner).length;
}

export function idleUnits(state: GameState, planet: PlanetState, owner?: string): UnitState[] {
  return unitsOn(state, planet.id, owner).filter((u) => u.segment === null);
}

export function housing(state: GameState, planet: PlanetState): number {
  if (planet.economyId === null) return 0;
  // Every additional people on a shared planet brings its own shelter for the inhabitants it arrives with.
  const peoples = new Set(unitsOn(state, planet.id).map((u) => u.owner)).size;
  let total = RULES.baseHousing + Math.max(0, peoples - 1) * RULES.coopJoinPopulation;
  for (const s of planet.segments) if (s.building) total += BUILDINGS[s.building].housing ?? 0;
  return total;
}

export function workerCapacity(segment: SegmentState): number {
  if (segment.building) return BUILDINGS[segment.building].workers;
  return segment.deposits.some((d) => d.byHand) ? RULES.handWorkersPerSegment : 0;
}

export function adjacencyMultiplier(planet: PlanetState, segment: SegmentState): number {
  if (!segment.building) return 1;
  const adj = BUILDINGS[segment.building].adjacency;
  if (!adj) return 1;
  const count = neighbors(planet, segment.index).filter((n) => n.biome === adj.biome).length;
  return 1 + count * adj.bonus;
}

export function canAfford(economy: EconomyState, building: BuildingId): boolean {
  const cost = BUILDINGS[building].cost;
  return RESOURCE_IDS.every((r) => economy.resources[r] >= (cost[r] ?? 0));
}

export const NOT_AFFORDABLE = "Zu wenig Ressourcen";

/** Why a building cannot go on a segment right now, or null if it can. Pays from the planet's economy. */
export function buildBlocker(state: GameState, planet: PlanetState, segment: SegmentState, building: BuildingId): string | null {
  const def = BUILDINGS[building];
  const economy = economyOf(state, planet);
  if (!economy) return "Unbewohnter Planet";
  if (!segment.revealed) return "Feld noch unerforscht";
  if (segment.building) return "Feld ist schon bebaut";
  if (!BIOMES[segment.biome].buildable) return `Auf ${BIOMES[segment.biome].name} kann man nicht bauen`;
  if (economy.ascension.level < def.unlockLevel) return `Ab Aufstiegsstufe ${def.unlockLevel}`;
  if (!def.allowedBiomes.includes(segment.biome)) return `Nicht auf ${BIOMES[segment.biome].name}`;
  if (!canAfford(economy, building)) return NOT_AFFORDABLE;
  return null;
}

/** Production per second of one segment with `workers` working on it, before starvation. */
export function segmentOutput(planet: PlanetState, segment: SegmentState, workers: number): Partial<Record<ResourceId, number>> {
  const out: Partial<Record<ResourceId, number>> = {};
  if (workers <= 0) return out;
  const mult = adjacencyMultiplier(planet, segment);
  const def = segment.building ? BUILDINGS[segment.building] : null;
  if (def?.produces) {
    out[def.produces.resource] = def.produces.perWorker * workers * mult;
  } else if (def?.extracts) {
    const available = segment.deposits.filter((d) => def.extracts!.resources.includes(d.resource) && (d.infinite || d.amount > 0));
    // Workers split evenly over everything the building can reach.
    for (const d of available) out[d.resource] = (def.extracts.perWorker * workers * mult) / available.length;
  } else if (!def) {
    const d = segment.deposits.find((x) => x.resource === segment.gather);
    if (d && d.byHand && (d.infinite || d.amount > 0)) out[d.resource] = RULES.handRatePerWorker * workers;
  }
  return out;
}

export function nextLevelThreshold(level: number): number | null {
  return RULES.ascensionThresholds[level] ?? null;
}

export function ringDistance(a: number, b: number, n: number): number {
  const d = Math.abs(a - b) % n;
  return Math.min(d, n - d);
}
