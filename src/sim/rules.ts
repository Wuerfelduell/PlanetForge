import { BIOMES, BUILDINGS, RESOURCE_IDS, RULES, type BuildingId, type ResourceId } from "./content";
import type { GameState, SegmentState } from "./state";

/** Read-only helpers shared by the simulation and the UI (so the UI never re-implements rules). */

export function segmentAt(state: GameState, index: number): SegmentState | undefined {
  const n = state.planet.segments.length;
  return state.planet.segments[((index % n) + n) % n];
}

export function neighbors(state: GameState, index: number): SegmentState[] {
  return [segmentAt(state, index - 1)!, segmentAt(state, index + 1)!];
}

export function housing(state: GameState): number {
  let total = RULES.baseHousing;
  for (const s of state.planet.segments) if (s.building) total += BUILDINGS[s.building].housing ?? 0;
  return total;
}

export function assignedWorkers(state: GameState): number {
  return state.planet.segments.reduce((sum, s) => sum + s.workers, 0);
}

export function idleWorkers(state: GameState): number {
  return state.population - assignedWorkers(state);
}

export function workerCapacity(segment: SegmentState): number {
  if (segment.building) return BUILDINGS[segment.building].workers;
  return segment.deposits.some((d) => d.byHand) ? RULES.handWorkersPerSegment : 0;
}

export function adjacencyMultiplier(state: GameState, segment: SegmentState): number {
  if (!segment.building) return 1;
  const adj = BUILDINGS[segment.building].adjacency;
  if (!adj) return 1;
  const count = neighbors(state, segment.index).filter((n) => n.biome === adj.biome).length;
  return 1 + count * adj.bonus;
}

export function canAfford(state: GameState, building: BuildingId): boolean {
  const cost = BUILDINGS[building].cost;
  return RESOURCE_IDS.every((r) => state.resources[r] >= (cost[r] ?? 0));
}

/** Why a building cannot go on a segment right now, or null if it can. */
export function buildBlocker(state: GameState, segment: SegmentState, building: BuildingId): string | null {
  const def = BUILDINGS[building];
  if (!segment.revealed) return "Feld noch unerforscht";
  if (segment.building) return "Feld ist schon bebaut";
  if (!BIOMES[segment.biome].buildable) return `Auf ${BIOMES[segment.biome].name} kann man nicht bauen`;
  if (state.ascension.level < def.unlockLevel) return `Ab Aufstiegsstufe ${def.unlockLevel}`;
  if (!def.allowedBiomes.includes(segment.biome)) return `Nicht auf ${BIOMES[segment.biome].name}`;
  if (!canAfford(state, building)) return "Zu wenig Ressourcen";
  return null;
}

/** Production per second of one segment at its current staffing, before starvation. */
export function segmentOutput(state: GameState, segment: SegmentState): Partial<Record<ResourceId, number>> {
  const out: Partial<Record<ResourceId, number>> = {};
  if (segment.workers <= 0) return out;
  const mult = adjacencyMultiplier(state, segment);
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

export const TICKS_PER_CYCLE = RULES.secondsPerCycle * RULES.ticksPerSecond;

export function cycleOf(state: GameState): number {
  return Math.floor(state.tick / TICKS_PER_CYCLE);
}
