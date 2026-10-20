import { BUILDINGS, RESOURCE_IDS, RULES } from "./content";
import { ringDistance } from "./generate";
import { buildBlocker, cloneState, idleUnits, planetById, playerById, segmentAt, workerCapacity, workerCount, workersOn } from "./rules";
import type { Command, CommandResult, GameEvent, GameState, PlanetState, PlayerState } from "./state";
import { advanceInPlace, appendLog } from "./step";

/**
 * Simulates up to `now`, then validates and applies one command from `playerId`.
 * Never mutates the input; on failure nothing is returned but the error.
 */
export function applyCommand(state: GameState, playerId: string, cmd: Command, now: number): CommandResult {
  const next = cloneState(state);
  const events = advanceInPlace(next, now);
  const error = executeCommand(next, playerId, cmd, events);
  if (error) return { ok: false, error };
  appendLog(next, events);
  return { ok: true, state: next, events };
}

/** Validates and applies a command in place. Returns an error message, or null on success (then the state changed). */
function executeCommand(state: GameState, playerId: string, cmd: Command, events: GameEvent[]): string | null {
  const player = playerById(state, playerId);
  if (!player) return "Unbekannter Spieler";

  switch (cmd.type) {
    case "openLobby":
    case "closeLobby": {
      if (playerId !== state.hostId) return "Nur der Gastgeber kann das Spiel öffnen oder schließen";
      state.lobby.open = cmd.type === "openLobby";
      if (state.lobby.open) state.lobby.paused = false;
      events.push({ type: "lobby", ...state.lobby, playerId });
      return null;
    }
    case "pause":
    case "resume": {
      if (!state.lobby.open) return "Das Spiel ist geschlossen";
      state.lobby.paused = cmd.type === "pause";
      events.push({ type: "lobby", ...state.lobby, playerId });
      return null;
    }
    case "assignUnit": {
      if (!state.lobby.open) return "Das Spiel ist geschlossen";
      const unit = state.units[cmd.unitId];
      if (!unit) return "Unbekannter Einwohner";
      if (unit.owner !== playerId) return "Dieser Einwohner gehört dir nicht";
      const planet = planetById(state, unit.planetId)!;
      if (cmd.segment === null) {
        unit.segment = null;
        return null;
      }
      const target = checkSegment(player, planet, cmd.segment);
      if (typeof target === "string") return target;
      if (unit.segment === cmd.segment) return null;
      if (workerCount(state, planet, cmd.segment) >= workerCapacity(target)) return "Kein Platz für weitere Einwohner";
      unit.segment = cmd.segment;
      return null;
    }
  }

  if (!state.lobby.open) return "Das Spiel ist geschlossen";
  const planet = planetById(state, cmd.planetId);
  if (!planet) return "Unbekannter Planet";
  const segment = checkSegment(player, planet, cmd.segment);
  if (typeof segment === "string") return segment;

  switch (cmd.type) {
    case "build": {
      if (!(cmd.building in BUILDINGS)) return "Unbekanntes Gebäude";
      const blocker = buildBlocker(state, planet, segment, cmd.building);
      if (blocker) return blocker;
      const economy = state.economies[planet.economyId!]!;
      const cost = BUILDINGS[cmd.building].cost;
      for (const r of RESOURCE_IDS) economy.resources[r] -= cost[r] ?? 0;
      // Hand gatherers go back to idle; their owners re-assign them to the building.
      for (const u of workersOn(state, planet, segment.index)) u.segment = null;
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
      // On a shared planet nobody tears down a teammate's work (unless the builder left the game).
      if (segment.builtBy && segment.builtBy !== playerId && playerById(state, segment.builtBy)) return "Das hat ein Mitspieler gebaut";
      const economy = state.economies[planet.economyId!]!;
      const def = BUILDINGS[segment.building];
      for (const r of RESOURCE_IDS) economy.resources[r] += Math.floor((def.cost[r] ?? 0) * RULES.demolishRefund);
      for (const u of workersOn(state, planet, segment.index)) u.segment = null;
      segment.building = null;
      segment.builtBy = null;
      events.push({ type: "demolished", planetId: planet.id, segment: segment.index, playerId });
      return null;
    }
    case "assign": {
      if (!Number.isInteger(cmd.delta) || cmd.delta === 0) return "Ungültige Anzahl";
      if (cmd.delta > 0) {
        if (workerCount(state, planet, segment.index) + cmd.delta > workerCapacity(segment)) return "Kein Platz für weitere Einwohner";
        const idle = idleUnits(state, planet, playerId);
        if (idle.length < cmd.delta) return "Keine freien Einwohner";
        for (const u of idle.slice(0, cmd.delta)) u.segment = segment.index;
      } else {
        const own = workersOn(state, planet, segment.index, playerId);
        if (own.length < -cmd.delta) return "Hier arbeiten keine Leute von dir";
        for (const u of own.slice(cmd.delta)) u.segment = null;
      }
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

/** The revealed segment of a planet the player's economy controls, or an error message. */
function checkSegment(player: PlayerState, planet: PlanetState, index: number) {
  if (planet.economyId !== player.economyId) return "Dieser Planet gehört dir nicht";
  const segment = Number.isInteger(index) ? segmentAt(planet, index) : undefined;
  if (!segment || segment.index !== index) return "Unbekanntes Feld";
  if (!segment.revealed) return "Feld noch unerforscht";
  return segment;
}
