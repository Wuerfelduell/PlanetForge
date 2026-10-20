import { BUILDINGS, RESOURCE_IDS, RULES } from "./content";
import { ringDistance } from "./generate";
import { buildBlocker, idleWorkers, segmentAt, workerCapacity } from "./rules";
import type { Command, CommandMeta, CommandResult, GameState, SimEvent } from "./state";

/**
 * Validates and applies one command, mutating the state. Invalid commands change nothing.
 * The authority (local session today, host or server in coop) is the only caller.
 */
export function applyCommand(state: GameState, cmd: Command, _meta: CommandMeta = {}, events: SimEvent[] = []): CommandResult {
  const segment = segmentAt(state, cmd.segment);
  if (!segment || !Number.isInteger(cmd.segment)) return fail("Unbekanntes Feld");
  if (!segment.revealed) return fail("Feld noch unerforscht");

  switch (cmd.type) {
    case "build": {
      if (!(cmd.building in BUILDINGS)) return fail("Unbekanntes Gebäude");
      const blocker = buildBlocker(state, segment, cmd.building);
      if (blocker) return fail(blocker);
      const cost = BUILDINGS[cmd.building].cost;
      for (const r of RESOURCE_IDS) state.resources[r] -= cost[r] ?? 0;
      // Hand gatherers go back to idle; the player re-assigns them to the building.
      segment.workers = 0;
      segment.building = cmd.building;
      const revealed: number[] = [];
      for (const s of state.planet.segments) {
        if (!s.revealed && ringDistance(s.index, segment.index, state.planet.segments.length) <= RULES.buildRevealRadius) {
          s.revealed = true;
          revealed.push(s.index);
        }
      }
      if (revealed.length) events.push({ type: "revealed", segments: revealed });
      return ok();
    }
    case "demolish": {
      if (!segment.building) return fail("Hier steht nichts");
      const def = BUILDINGS[segment.building];
      for (const r of RESOURCE_IDS) state.resources[r] += Math.floor((def.cost[r] ?? 0) * RULES.demolishRefund);
      segment.building = null;
      segment.workers = 0;
      return ok();
    }
    case "assign": {
      if (!Number.isInteger(cmd.delta) || cmd.delta === 0) return fail("Ungültige Anzahl");
      const target = segment.workers + cmd.delta;
      if (target < 0) return fail("Hier arbeitet niemand");
      if (target > workerCapacity(segment)) return fail("Kein Platz für weitere Einwohner");
      if (cmd.delta > idleWorkers(state)) return fail("Keine freien Einwohner");
      segment.workers = target;
      return ok();
    }
    case "setGather": {
      if (segment.building) return fail("Gebäude bestimmt, was abgebaut wird");
      const deposit = segment.deposits.find((d) => d.resource === cmd.resource && d.byHand);
      if (!deposit) return fail("Kann man hier nicht von Hand sammeln");
      segment.gather = cmd.resource;
      return ok();
    }
    default: {
      const unknown: never = cmd;
      return fail(`Unbekannter Befehl ${(unknown as { type: string }).type}`);
    }
  }
}

const ok = (): CommandResult => ({ ok: true });
const fail = (reason: string): CommandResult => ({ ok: false, reason });
