import { addPlayer, advance, applyCommand, createGame, PEOPLE_IDS, upgradeState, type Command, type GameEvent, type GameOptions, type GameState, type PeopleId } from "../../../src/sim/index";

/**
 * Server-side rules around the simulation, kept free of I/O so they can be unit tested.
 *
 * Live mode: the game clock only runs while someone is online. Every command and every
 * heartbeat moves sim time forward by the wall-clock gap since the last save, but never by
 * more than MAX_GAP_MS; a longer gap means nobody was online and counts as a pause.
 */
export const MAX_GAP_MS = 60_000;
/** Seb: the lobby closes after 10 minutes without players; without heartbeats nobody was online. */
export const LOBBY_IDLE_MS = 10 * 60_000;
/** State shape the bundled simulation writes; saves of another shape start over (prototype phase). */
export const SIM_VERSION = createGame("version-probe", [{ id: "p1", name: "p" }]).version;

// Available in Deno, browsers and Node; declared here because this file is checked without DOM types.
declare function atob(data: string): string;

export type Request = { gameId: string; kind: "sync" } | { gameId: string; kind: "command"; cmd: Command };

export interface Member {
  playerId: string;
  name: string;
  /** People picked when creating or joining the save; null/undefined = first free one. */
  people?: string | null;
}

/**
 * Peoples for members who aren't seated yet. A pick that is unknown or already in use (in the
 * state or by an earlier member) falls back to the first free people, like a member who didn't
 * pick, so the database check and the simulation can never hand out one people twice.
 */
export function assignPeoples(state: GameState | null, members: Member[]): Map<string, PeopleId> {
  const seated = new Set(state?.players.map((p) => p.id) ?? []);
  const pending = members.filter((m) => !seated.has(m.playerId));
  const taken = new Set<string>(state?.players.map((p) => p.people) ?? []);
  const out = new Map<string, PeopleId>();
  for (const m of pending) {
    const pick = m.people as PeopleId | null | undefined;
    if (pick && PEOPLE_IDS.includes(pick) && !taken.has(pick)) {
      out.set(m.playerId, pick);
      taken.add(pick);
    }
  }
  for (const m of pending) {
    if (out.has(m.playerId)) continue;
    const free = PEOPLE_IDS.find((id) => !taken.has(id));
    if (!free) continue;
    out.set(m.playerId, free);
    taken.add(free);
  }
  return out;
}

export interface StepInput {
  state: GameState | null;
  /** Wall-clock ms that state.simTime corresponds to, null before the first save. */
  clockAt: number | null;
  members: Member[];
  playerId: string;
  request: Request;
  now: number;
  /** What the host picked when creating the save; used when the state is (re)created. */
  options?: Pick<GameOptions, "mode" | "goal" | "invaders" | "maxPlayers" | "world">;
}

export type StepResult =
  /** `removed`: players the host kicked, whose memberships have to end with this save. */
  | { ok: true; state: GameState; events: GameEvent[]; changed: boolean; removed: string[] }
  | { ok: false; error: string };

export function nextSimTime(state: GameState, clockAt: number | null, now: number): number {
  if (clockAt === null) return state.simTime;
  return state.simTime + Math.min(Math.max(0, now - clockAt), MAX_GAP_MS);
}

/**
 * Adds members who joined after the game started (coop drop-in), at the current sim time.
 * Members the simulation can't seat (a versus game that is over or has no start planet left)
 * stay spectators instead of blocking everyone else's moves.
 */
export function ensurePlayers(state: GameState, members: Member[], simNow: number): GameState {
  const peoples = assignPeoples(state, members);
  for (const m of members) {
    if (state.players.some((p) => p.id === m.playerId)) continue;
    const joined = addPlayer(state, m.playerId, m.name, simNow, peoples.get(m.playerId));
    if (joined.ok) state = joined.state;
  }
  return state;
}

export function step(input: StepInput): StepResult {
  const { members, playerId, request, now } = input;
  if (!members.some((m) => m.playerId === playerId)) return { ok: false, error: "Du bist nicht in diesem Spiel" };

  let state = upgradeState(input.state);
  let clockAt = input.clockAt;
  if (!state) {
    const peoples = assignPeoples(null, members);
    state = createGame(request.gameId, members.map((m) => ({ id: m.playerId, name: m.name, people: peoples.get(m.playerId) })), { ...input.options, now: 0 });
    clockAt = now;
  }
  const simNow = nextSimTime(state, clockAt, now);
  const events: GameEvent[] = [];
  if (clockAt !== null && now - clockAt >= LOBBY_IDLE_MS && state.lobby.open) {
    const closed = applyCommand(state, state.hostId, { type: "closeLobby" }, simNow);
    if (closed.ok) {
      state = closed.state;
      events.push(...closed.events);
    }
  }
  state = ensurePlayers(state, members, simNow);

  if (request.kind === "sync") {
    return { ok: true, state: advance(state, simNow), events, changed: true, removed: [] };
  }
  const result = applyCommand(state, playerId, request.cmd, simNow);
  if (!result.ok) return result;
  events.push(...result.events);
  const removed = result.events.flatMap((e) => (e.type === "removed" ? [e.playerId] : []));
  return { ok: true, state: result.state, events, changed: true, removed };
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
