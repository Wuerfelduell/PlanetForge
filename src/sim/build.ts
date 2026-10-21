import { BUILDINGS, RESOURCE_IDS, RULES, type BuildingId } from "./content";
import { ringDistance, workersOn } from "./rules";
import { modified } from "./discoveries";
import type { GameEvent, GameState, PlanetState, SegmentState } from "./state";

/** Pays for and places a building (already validated by buildBlocker), then reveals the area around it. */
export function placeBuilding(state: GameState, planet: PlanetState, segment: SegmentState, building: BuildingId, playerId: string, events: GameEvent[]): void {
  const economy = state.economies[planet.economyId!]!;
  const cost = BUILDINGS[building].cost;
  for (const r of RESOURCE_IDS) economy.resources[r] -= cost[r] ?? 0;
  // Hand gatherers go back to idle; their owners re-assign them to the building.
  for (const u of workersOn(state, planet, segment.index)) u.segment = null;
  segment.building = building;
  delete segment.ruin;
  segment.builtBy = playerId;
  events.push({ type: "built", planetId: planet.id, segment: segment.index, building, playerId });
  const revealed: number[] = [];
  for (const s of planet.segments) {
    if (!s.revealed && ringDistance(s.index, segment.index, planet.segments.length) <= modified(economy, "revealRadius", RULES.buildRevealRadius)) {
      s.revealed = true;
      revealed.push(s.index);
    }
  }
  if (revealed.length) events.push({ type: "revealed", planetId: planet.id, segments: revealed });
}
