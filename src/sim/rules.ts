import { BIOMES, BUILDINGS, RESOURCE_IDS, RULES, type BuildingId, type ResourceId } from "./content";
import type { GameState, PlanetState, SegmentState, TeamState } from "./state";

/** Read-only helpers shared by the simulation and the UI (so the UI never re-implements rules). */

export const TICK_MS = 1000 / RULES.ticksPerSecond;
export const TICKS_PER_CYCLE = RULES.secondsPerCycle * RULES.ticksPerSecond;

/** Deep copy. The state is plain JSON by contract, so a JSON round trip is exact and works everywhere. */
export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function planetById(state: GameState, id: string): PlanetState | undefined {
  return state.planets.find((p) => p.id === id);
}

export function segmentAt(planet: PlanetState, index: number): SegmentState | undefined {
  const n = planet.segments.length;
  return planet.segments[((index % n) + n) % n];
}

export function neighbors(planet: PlanetState, index: number): SegmentState[] {
  return [segmentAt(planet, index - 1)!, segmentAt(planet, index + 1)!];
}

export function teamById(state: GameState, id: string | null): TeamState | undefined {
  return id === null ? undefined : state.teams.find((t) => t.id === id);
}

export function teamOfPlayer(state: GameState, playerId: string): TeamState | undefined {
  return teamById(state, state.players.find((p) => p.id === playerId)?.teamId ?? null);
}

export function homePlanet(state: GameState, playerId: string): PlanetState | undefined {
  const player = state.players.find((p) => p.id === playerId);
  return player ? planetById(state, player.homePlanetId) : undefined;
}

export function housing(planet: PlanetState): number {
  if (!planet.teamId) return 0;
  let total = RULES.baseHousing;
  for (const s of planet.segments) if (s.building) total += BUILDINGS[s.building].housing ?? 0;
  return total;
}

export function assignedWorkers(planet: PlanetState): number {
  return planet.segments.reduce((sum, s) => sum + s.workers, 0);
}

export function idleWorkers(planet: PlanetState): number {
  return planet.population - assignedWorkers(planet);
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

export function canAfford(planet: PlanetState, building: BuildingId): boolean {
  const cost = BUILDINGS[building].cost;
  return RESOURCE_IDS.every((r) => planet.resources[r] >= (cost[r] ?? 0));
}

/** Why a building cannot go on a segment right now, or null if it can. Pays from the planet's own stockpile. */
export function buildBlocker(state: GameState, planet: PlanetState, segment: SegmentState, building: BuildingId): string | null {
  const def = BUILDINGS[building];
  if (!segment.revealed) return "Feld noch unerforscht";
  if (segment.building) return "Feld ist schon bebaut";
  if (!BIOMES[segment.biome].buildable) return `Auf ${BIOMES[segment.biome].name} kann man nicht bauen`;
  if ((teamById(state, planet.teamId)?.ascension.level ?? 0) < def.unlockLevel) return `Ab Aufstiegsstufe ${def.unlockLevel}`;
  if (!def.allowedBiomes.includes(segment.biome)) return `Nicht auf ${BIOMES[segment.biome].name}`;
  if (!canAfford(planet, building)) return "Zu wenig Ressourcen";
  return null;
}

/** Production per second of one segment at its current staffing, before starvation. */
export function segmentOutput(planet: PlanetState, segment: SegmentState): Partial<Record<ResourceId, number>> {
  const out: Partial<Record<ResourceId, number>> = {};
  if (segment.workers <= 0) return out;
  const mult = adjacencyMultiplier(planet, segment);
  const def = segment.building ? BUILDINGS[segment.building] : null;
  if (def?.produces) {
    out[def.produces.resource] = def.produces.perWorker * segment.workers * mult;
  } else if (def?.extracts) {
    const available = segment.deposits.filter((d) => def.extracts!.resources.includes(d.resource) && (d.infinite || d.amount > 0));
    // Workers split evenly over everything the building can reach.
    for (const d of available) out[d.resource] = (def.extracts.perWorker * segment.workers * mult) / available.length;
  } else if (!def) {
    const d = segment.deposits.find((x) => x.resource === segment.gather);
    if (d && d.byHand && (d.infinite || d.amount > 0)) out[d.resource] = RULES.handRatePerWorker * segment.workers;
  }
  return out;
}

export function nextLevelThreshold(level: number): number | null {
  return RULES.ascensionThresholds[level] ?? null;
}

export function cycleOf(state: GameState): number {
  return Math.floor(state.tick / TICKS_PER_CYCLE);
}
