import { advance, applyCommand, createGame, type Command, type GameEvent, type GameState } from "../../../src/sim/index";

/**
 * Server-side rules around the simulation, kept free of I/O so they can be unit tested.
 *
 * Live mode: the game clock only runs while someone is online. Every command and every
 * heartbeat moves sim time forward by the wall-clock gap since the last save, but never by
 * more than MAX_GAP_MS; a longer gap means nobody was online and counts as a pause.
 */
export const MAX_GAP_MS = 60_000;

// Available in Deno, browsers and Node; declared here because this file is checked without DOM types.
declare function atob(data: string): string;

export type Request = { gameId: string; kind: "sync" } | { gameId: string; kind: "command"; cmd: Command };

export interface Member {
  playerId: string;
  name: string;
}

export interface StepInput {
  state: GameState | null;
  /** Wall-clock ms that state.simTime corresponds to, null before the first save. */
  clockAt: number | null;
  members: Member[];
  playerId: string;
  request: Request;
  now: number;
}

export type StepResult =
  | { ok: true; state: GameState; events: GameEvent[]; changed: boolean }
  | { ok: false; error: string };

export function nextSimTime(state: GameState, clockAt: number | null, now: number): number {
  if (clockAt === null) return state.simTime;
  return state.simTime + Math.min(Math.max(0, now - clockAt), MAX_GAP_MS);
}

/** Adds members who joined after the game started (coop drop-in). */
export function ensurePlayers(state: GameState, members: Member[]): GameState {
  const missing = members.filter((m) => !state.players.some((p) => p.id === m.playerId));
  if (!missing.length) return state;
  // TODO: replace with the sim's own addPlayer once it exists (start planet per player).
  return {
    ...state,
    players: [...state.players, ...missing.map((m, i) => ({ id: m.playerId, name: m.name, color: state.players.length + i }))],
  };
}

export function step(input: StepInput): StepResult {
  const { members, playerId, request, now } = input;
  if (!members.some((m) => m.playerId === playerId)) return { ok: false, error: "Du bist nicht in diesem Spiel" };

  let state = input.state;
  let clockAt = input.clockAt;
  if (!state) {
    state = createGame(request.gameId, members.map((m) => ({ id: m.playerId, name: m.name })), { now: 0 });
    clockAt = now;
  }
  state = ensurePlayers(state, members);
  const simNow = nextSimTime(state, clockAt, now);

  if (request.kind === "sync") {
    return { ok: true, state: advance(state, simNow), events: [], changed: true };
  }
  const result = applyCommand(state, playerId, request.cmd, simNow);
  if (!result.ok) return result;
  return { ok: true, state: result.state, events: result.events, changed: true };
}

/**
 * Reads the user id from a bearer token whose signature the Edge Function gateway already
 * verified (verify_jwt). Only signed-in users count, not the bare anon key.
 */
export function userIdFromJwt(header: string | null): string | null {
  const token = header?.match(/^Bearer (.+)$/)?.[1];
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: unknown; role?: unknown };
    return claims.role === "authenticated" && typeof claims.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}

export function parseRequest(body: unknown): Request | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.gameId !== "string" || !/^[0-9a-f-]{36}$/.test(b.gameId)) return null;
  if (b.kind === "sync") return { gameId: b.gameId, kind: "sync" };
  if (b.kind === "command" && b.cmd && typeof b.cmd === "object" && typeof (b.cmd as { type?: unknown }).type === "string") {
    // The simulation validates every field of the command itself.
    return { gameId: b.gameId, kind: "command", cmd: b.cmd as Command };
  }
  return null;
}
