import { describe, expect, it } from "vitest";
import { createGame, homePlanet } from "../../../src/sim/index";
import { LOBBY_IDLE_MS, MAX_GAP_MS, nextSimTime, parseRequest, step, userIdFromJwt, type Member } from "./logic";

const GAME = "0f3c2a4e-1b2c-4d5e-8f90-123456789abc";
const alice: Member = { playerId: "p1", name: "Alice" };
const bob: Member = { playerId: "p2", name: "Bob" };

describe("game-command logic", () => {
  it("creates the game on the first sync, with every member as a player", () => {
    const r = step({ state: null, clockAt: null, members: [alice, bob], playerId: "p1", request: { gameId: GAME, kind: "sync" }, now: 1_000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.simTime).toBe(0);
    expect(r.state.players.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(r.state.seed).toBe(GAME);
  });

  it("creates the game with the options the host picked", () => {
    const input = { state: null, clockAt: null, members: [alice], playerId: "p1", request: { gameId: GAME, kind: "sync" as const }, now: 1_000 };
    const picked = step({ ...input, options: { goal: "endless", invaders: "strong", maxPlayers: 2 } });
    expect(picked.ok && picked.state.settings).toMatchObject({ goal: "endless", invaders: "strong", maxPlayers: 2 });
    expect(picked.ok && picked.state.sun.novaTick).toBeNull();
    const defaults = step(input);
    expect(defaults.ok && defaults.state.settings).toMatchObject({ goal: "supernova", invaders: "normal", maxPlayers: 4 });
  });

  it("builds the world the host picked", () => {
    const input = { state: null, clockAt: null, members: [alice], playerId: "p1", request: { gameId: GAME, kind: "sync" as const }, now: 1_000 };
    const picked = step({ ...input, options: { world: { planets: 1, sun: "blue", size: "large" } } });
    const plain = step(input);
    if (!picked.ok || !plain.ok) throw new Error("step failed");
    expect(picked.state.planets.length).toBeLessThan(plain.state.planets.length);
    expect(picked.state.sun).toMatchObject({ type: "blue" });
  });

  it("creates versus games with one economy and start planet per player", () => {
    const r = step({ state: null, clockAt: null, members: [alice, bob], playerId: "p1", request: { gameId: GAME, kind: "sync" }, now: 1_000, options: { mode: "versus", goal: "supernova", maxPlayers: 2 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.settings).toMatchObject({ mode: "versus", goal: "endless", invaders: "off", maxPlayers: 2 });
    const [a, b] = r.state.players;
    expect(a.economyId).not.toBe(b.economyId);
    expect(a.homePlanetId).not.toBe(b.homePlanetId);
  });

  it("gives every member the people they picked, and a free one on a clash", () => {
    const r = step({ state: null, clockAt: null, members: [{ ...alice, people: "starowls" }, { ...bob, people: "starowls" }, { playerId: "p3", name: "Carol", people: "nope" }], playerId: "p1", request: { gameId: GAME, kind: "sync" }, now: 1_000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const peoples = r.state.players.map((p) => p.people);
    expect(peoples[0]).toBe("starowls");
    expect(new Set(peoples).size).toBe(3);
  });

  it("seats a member who joins later with their pick unless it is taken", () => {
    const first = step({ state: null, clockAt: null, members: [{ ...alice, people: "echobats" }], playerId: "p1", request: { gameId: GAME, kind: "sync" }, now: 1_000 });
    if (!first.ok) throw new Error(first.error);
    const join = (people: string) =>
      step({ state: first.state, clockAt: 1_000, members: [{ ...alice, people: "echobats" }, { ...bob, people }], playerId: "p2", request: { gameId: GAME, kind: "sync" }, now: 2_000 });
    const picked = join("frostseals");
    expect(picked.ok && picked.state.players.find((p) => p.id === "p2")?.people).toBe("frostseals");
    const clash = join("echobats");
    expect(clash.ok && clash.state.players.find((p) => p.id === "p2")?.people).not.toBe("echobats");
  });

  it("keeps members the simulation can't seat as spectators", () => {
    const carol: Member = { playerId: "p3", name: "Carol" };
    const input = { state: null, clockAt: null, members: [alice, bob], playerId: "p1", request: { gameId: GAME, kind: "sync" as const }, now: 1_000, options: { mode: "versus" as const, maxPlayers: 2 } };
    const first = step(input);
    if (!first.ok) throw new Error(first.error);
    const later = step({ ...input, state: first.state, clockAt: 1_000, members: [alice, bob, carol], now: 2_000 });
    expect(later.ok).toBe(true);
    expect(later.ok && later.state.players.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("runs the clock by the wall-clock gap, but pauses gaps longer than a minute", () => {
    const state = createGame("s", [{ id: "p1", name: "A" }]);
    expect(nextSimTime(state, 10_000, 15_000)).toBe(5_000);
    expect(nextSimTime(state, 10_000, 10_000 + 7 * 24 * 3600_000)).toBe(MAX_GAP_MS);
    expect(nextSimTime(state, 10_000, 5_000)).toBe(0);
  });

  it("adds players who joined a running game", () => {
    const state = createGame("s", [{ id: "p1", name: "Alice" }]);
    const r = step({ state, clockAt: 0, members: [alice, bob], playerId: "p2", request: { gameId: GAME, kind: "sync" }, now: 2_000 });
    expect(r.ok && r.state.players.map((p) => [p.id, p.color])).toEqual([["p1", 0], ["p2", 1]]);
  });

  it("rejects players who are not members", () => {
    const r = step({ state: null, clockAt: null, members: [alice], playerId: "p9", request: { gameId: GAME, kind: "sync" }, now: 0 });
    expect(r.ok).toBe(false);
  });

  it("applies valid commands and passes simulation errors through", () => {
    const state = createGame("s", [{ id: "p1", name: "Alice" }]);
    const bad = step({
      state,
      clockAt: 0,
      members: [alice],
      playerId: "p1",
      request: { gameId: GAME, kind: "command", cmd: { type: "assign", planetId: homePlanet(state, "p1")!.id, segment: 0, delta: 0 } },
      now: 100,
    });
    expect(bad).toEqual({ ok: false, error: "Ungültige Anzahl" });
  });

  it("reports players the host kicked, so their membership ends", () => {
    const state = createGame("s", [{ id: "p1", name: "Alice" }, { id: "p2", name: "Bob" }]);
    const r = step({ state, clockAt: 0, members: [alice, bob], playerId: "p1", request: { gameId: GAME, kind: "command", cmd: { type: "kickPlayer", playerId: "p2" } }, now: 100 });
    expect(r.ok && r.removed).toEqual(["p2"]);
    expect(r.ok && r.state.players.map((p) => p.id)).toEqual(["p1"]);
  });

  it("applies a batch of commands in order and keeps the ones that worked", () => {
    const state = createGame("s", [{ id: "p1", name: "Alice" }, { id: "p2", name: "Bob" }]);
    const bad = { type: "assign", planetId: homePlanet(state, "p1")!.id, segment: 0, delta: 0 } as const;
    const kick = { type: "kickPlayer", playerId: "p2" } as const;
    const run = (cmds: Parameters<typeof step>[0]["request"] & { kind: "commands" }) =>
      step({ state, clockAt: 0, members: [alice, bob], playerId: "p1", request: cmds, now: 100 });
    const r = run({ gameId: GAME, kind: "commands", cmds: [bad, kick] });
    expect(r.ok && r.errors).toEqual(["Ungültige Anzahl"]);
    expect(r.ok && r.removed).toEqual(["p2"]);
    expect(run({ gameId: GAME, kind: "commands", cmds: [bad, bad] })).toEqual({ ok: false, error: "Ungültige Anzahl" });
  });

  it("closes the lobby when nobody was online for ten minutes", () => {
    const state = createGame("s", [{ id: "p1", name: "Alice" }, { id: "p2", name: "Bob" }]);
    const sync = { gameId: GAME, kind: "sync" } as const;
    const soon = step({ state, clockAt: 0, members: [alice, bob], playerId: "p2", request: sync, now: LOBBY_IDLE_MS - 1 });
    expect(soon.ok && soon.state.lobby.open).toBe(true);
    const later = step({ state, clockAt: 0, members: [alice, bob], playerId: "p2", request: sync, now: LOBBY_IDLE_MS });
    expect(later.ok && later.state.lobby.open).toBe(false);
    expect(later.ok && later.events.some((e) => e.type === "lobby")).toBe(true);
  });

  it("starts over when the save was written by an older simulation", () => {
    const old = { ...createGame("s", [{ id: "p1", name: "Alice" }]), version: 1 } as unknown as Parameters<typeof step>[0]["state"];
    const r = step({ state: old, clockAt: 0, members: [alice], playerId: "p1", request: { gameId: GAME, kind: "sync" }, now: LOBBY_IDLE_MS * 2 });
    expect(r.ok && r.state.seed).toBe(GAME);
    expect(r.ok && r.state.lobby.open).toBe(true);
  });

  it("parses only well-formed requests", () => {
    expect(parseRequest({ gameId: GAME, kind: "sync" })).toEqual({ gameId: GAME, kind: "sync" });
    expect(parseRequest({ gameId: "x", kind: "sync" })).toBeNull();
    expect(parseRequest({ gameId: GAME, kind: "command" })).toBeNull();
    expect(parseRequest({ gameId: GAME, kind: "commands", cmds: [{ type: "a" }, { type: "b" }] })).toEqual({ gameId: GAME, kind: "commands", cmds: [{ type: "a" }, { type: "b" }] });
    expect(parseRequest({ gameId: GAME, kind: "commands", cmds: [] })).toBeNull();
    expect(parseRequest({ gameId: GAME, kind: "commands", cmds: [{ type: "a" }, 5] })).toBeNull();
    expect(parseRequest({ gameId: GAME, kind: "commands", cmds: Array(31).fill({ type: "a" }) })).toBeNull();
    expect(parseRequest(null)).toBeNull();
  });

  it("takes the user id only from signed-in tokens", () => {
    const jwt = (claims: object) => "Bearer h." + btoa(JSON.stringify(claims)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_") + ".s";
    expect(userIdFromJwt(jwt({ sub: "u1", role: "authenticated" }))).toBe("u1");
    expect(userIdFromJwt(jwt({ role: "anon" }))).toBeNull();
    expect(userIdFromJwt("Bearer nonsense")).toBeNull();
    expect(userIdFromJwt(null)).toBeNull();
  });
});
