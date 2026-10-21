import { describe, expect, it } from "vitest";
import { createGame, SYSTEM, WORLD_LIMITS, type GameState } from "./index";

const P1 = { id: "p1", name: "Seb" };
const starts = (g: GameState) => g.planets.filter((p) => p.startSlot !== null);
const free = (g: GameState) => g.planets.filter((p) => p.startSlot === null && p.type !== "asteroid");

describe("world options", () => {
  it("no options and all-random options give the seed's world", () => {
    const plain = createGame("w", [P1], { now: 0 });
    expect(createGame("w", [P1], { now: 0, world: {} })).toEqual(plain);
    expect(createGame("w", [P1], { now: 0, world: { sun: "random" } })).toEqual(plain);
    expect(starts(plain)[0]!.type).toBe("temperate");
    expect(starts(plain)[0]!.segments.length).toBe(SYSTEM.coopStartPlanetSegments);
  });

  it("sets the number of free planets, clamped to the limits", () => {
    expect(free(createGame("w", [P1], { now: 0, world: { planets: 6 } })).length).toBe(6);
    expect(free(createGame("w", [P1], { now: 0, world: { planets: 99 } })).length).toBe(WORLD_LIMITS.planets.max);
    expect(free(createGame("w", [P1], { now: 0, world: { planets: 0 } })).length).toBe(WORLD_LIMITS.planets.min);
  });

  it("picks the sun without changing the planets", () => {
    const plain = createGame("w", [P1], { now: 0 });
    const other = plain.sun.type === "red" ? "blue" : "red";
    const g = createGame("w", [P1], { now: 0, world: { sun: other } });
    expect(g.sun.type).toBe(other);
    expect(g.planets).toEqual(plain.planets);
  });

  it("gives the start planet the chosen type and size, keeping the playable start area", () => {
    const g = createGame("w", [P1], { now: 0, world: { start: "ice", size: "large" } });
    const home = starts(g)[0]!;
    expect(home.type).toBe("ice");
    expect(home.segments.length).toBe(Math.round(SYSTEM.coopStartPlanetSegments * 1.25));
    expect(home.segments.some((s) => s.biome === "tundra" || s.biome === "glacier")).toBe(true);
    const window = home.segments.filter((s) => s.revealed).map((s) => s.biome);
    expect(window).toContain("forest");
    expect(window).toContain("mountains");

    const versus = createGame("v", [P1], { now: 0, mode: "versus", maxPlayers: 2, world: { start: "arid", size: "small" } });
    for (const p of starts(versus)) {
      expect(p.type).toBe("arid");
      expect(p.segments.length).toBe(Math.round(SYSTEM.startPlanetSegments * 0.75));
    }
  });

  it("random start and size follow the seed", () => {
    const a = createGame("r", [P1], { now: 0, world: { start: "random", size: "random" } });
    const b = createGame("r", [P1], { now: 0, world: { start: "random", size: "random" } });
    expect(a).toEqual(b);
  });

  it("every start window has three forests", () => {
    for (const seed of ["echo", "a", "b", "c", "d"]) {
      const window = starts(createGame(seed, [P1], { now: 0 }))[0]!.segments.filter((s) => s.revealed);
      expect(window.filter((s) => s.biome === "forest").length).toBeGreaterThanOrEqual(3);
    }
  });

  it("every start planet has two oil fields", () => {
    for (const seed of ["a", "b", "c", "d"]) {
      for (const p of starts(createGame(seed, [P1], { now: 0, mode: "versus", maxPlayers: 4 }))) {
        expect(p.segments.filter((s) => s.deposits.some((d) => d.resource === "oil")).length).toBeGreaterThanOrEqual(SYSTEM.oilFieldsPerStartPlanet);
      }
    }
  });
});
