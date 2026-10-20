import { BUILDINGS, RESOURCE_IDS, RULES } from "./content";
import { ringDistance } from "./generate";
import { buildBlocker, cloneState, idleWorkers, planetById, segmentAt, workerCapacity } from "./rules";
import type { Command, CommandResult, GameEvent, GameState } from "./state";
import { advanceInPlace } from "./step";

/**
 * Simulates up to `now`, then validates and applies one command from `playerId`.
 * Never mutates the input; on failure nothing is returned but the error.
 */
export function applyCommand(state: GameState, playerId: string, cmd: Command, now: number): CommandResult {
  const next = cloneState(state);
  const events = advanceInPlace(next, now);
  const error = executeCommand(next, playerId, cmd, events);
  return error ? { ok: false, error } : { ok: true, state: next, events };
}

/** Validates and applies a command in place. Returns an error message, or null on success (then the state changed). */
function executeCommand(state: GameState, playerId: string, cmd: Command, events: GameEvent[]): string | null {
  if (!state.players.some((p) => p.id === playerId)) return "Unbekannter Spieler";
  const planet = planetById(state, cmd.planetId);
  if (!planet) return "Unbekannter Planet";
  const segment = Number.isInteger(cmd.segment) ? segmentAt(planet, cmd.segment) : undefined;
  if (!segment || segment.index !== cmd.segment) return "Unbekanntes Feld";
  if (!segment.revealed) return "Feld noch unerforscht";

  switch (cmd.type) {
    case "build": {
      if (!(cmd.building in BUILDINGS)) return "Unbekanntes Gebäude";
      const blocker = buildBlocker(state, segment, cmd.building);
      if (blocker) return blocker;
      const cost = BUILDINGS[cmd.building].cost;
      for (const r of RESOURCE_IDS) state.resources[r] -= cost[r] ?? 0;
      // Hand gatherers go back to idle; the player re-assigns them to the building.
      segment.workers = 0;
      segment.building = cmd.building;
      segment.builtBy = playerId;
      events.push({ type: "built", planetId: planet.id, segment: segment.index, building: cmd.building, playerId });
      const revealed: number[] = [];
      for (const s of planet.segments) {
        if (!s.revealed && ringDistance(s.index, segment.index, planet.segments.length) <= RULES.buildRevealRadius) {
          s.revealed = true;
          revealed.push(s.index);
        }
      }
      if (revealed.length) events.push({ type: "revealed", planetId: planet.id, segments: revealed });
      return null;
    }
    case "demolish": {
      if (!segment.building) return "Hier steht nichts";
      const def = BUILDINGS[segment.building];
      for (const r of RESOURCE_IDS) state.resources[r] += Math.floor((def.cost[r] ?? 0) * RULES.demolishRefund);
      segment.building = null;
      segment.builtBy = null;
      segment.workers = 0;
      events.push({ type: "demolished", planetId: planet.id, segment: segment.index, playerId });
      return null;
    }
    case "assign": {
      if (!Number.isInteger(cmd.delta) || cmd.delta === 0) return "Ungültige Anzahl";
      const target = segment.workers + cmd.delta;
      if (target < 0) return "Hier arbeitet niemand";
      if (target > workerCapacity(segment)) return "Kein Platz für weitere Einwohner";
      if (cmd.delta > idleWorkers(state)) return "Keine freien Einwohner";
      segment.workers = target;
      return null;
    }
    case "setGather": {
      if (segment.building) return "Gebäude bestimmt, was abgebaut wird";
      const deposit = segment.deposits.find((d) => d.resource === cmd.resource && d.byHand);
      if (!deposit) return "Kann man hier nicht von Hand sammeln";
      segment.gather = cmd.resource;
      return null;
    }
    default: {
      const unknown: never = cmd;
      return `Unbekannter Befehl ${(unknown as { type: string }).type}`;
    }
  }
}
