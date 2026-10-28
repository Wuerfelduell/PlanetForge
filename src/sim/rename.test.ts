import { describe, expect, it } from "vitest";
import {
  addPlayer,
  advanceWithEvents,
  applyCommand,
  cleanPlanetName,
  createGame,
  flightPlan,
  homePlanet,
  planetById,
  RESOURCE_IDS,
  RULES,
  TICK_MS,
  upgradeState,
  economyOfPlayer,
  type GameState,
} from "./index";

const P1 = { id: "p1", name: "Seb" };
const MO = { id: "p2", name: "Mo" };

function coop(): GameState {
  const r = addPlayer(createGame("names", [P1], { now: 0 }), MO.id, MO.name, 0);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

const rename = (g: GameState, playerId: string, planetId: string, name: string) => applyCommand(g, playerId, { type: "renamePlanet", planetId, name }, g.simTime);

describe("renaming planets", () => {
  it("lets only the first settler rename, and everyone sees it", () => {
    const g = coop();
    const home = homePlanet(g, P1.id)!;
    expect(home.founder).toBe(P1.id);
    expect(rename(g, MO.id, home.id, "Mos Welt")).toEqual({ ok: false, error: "Nur wer den Planeten zuerst besiedelt hat, kann ihn umbenennen" });
    const r = rename(g, P1.id, home.id, "  Neue   Heimat ");
    if (!r.ok) throw new Error(r.error);
    expect(planetById(r.state, home.id)!.name).toBe("Neue Heimat");
    expect(r.events).toContainEqual({ type: "renamed", planetId: home.id, name: "Neue Heimat", from: home.name, playerId: P1.id });
  });

  it("cleans and limits names, and rejects empty or taken ones", () => {
    expect(cleanPlanetName("<b>Gaia</b>")).toBe("bGaia/b");
    expect(cleanPlanetName("a".repeat(40))).toHaveLength(20);
    expect(Array.from(cleanPlanetName("🪐".repeat(30)))).toHaveLength(20);
    const g = coop();
    const home = homePlanet(g, P1.id)!;
    expect(rename(g, P1.id, home.id, "  ").ok).toBe(false);
    const other = g.planets.find((p) => p.id !== home.id)!;
    expect(rename(g, P1.id, home.id, other.name.toUpperCase())).toEqual({ ok: false, error: "So heißt schon ein anderer Planet" });
  });

  it("makes whoever lands first on a free planet its founder", () => {
    let g = coop();
    const economy = economyOfPlayer(g, MO.id)!;
    for (const r of RESOURCE_IDS) economy.resources[r] = 500;
    const home = homePlanet(g, MO.id)!;
    const pad = home.segments.find((s) => s.revealed && s.biome !== "ocean" && !s.building)!;
    pad.building = "launchpad";
    pad.builtBy = MO.id;
    const target = g.planets.find((p) => p.economyId === null && p.startSlot === null)!;
    const launched = applyCommand(g, MO.id, { type: "launch", planetId: home.id, to: target.id, rocket: "colony", count: 1 }, g.simTime);
    if (!launched.ok) throw new Error(launched.error);
    g = advanceWithEvents(launched.state, launched.state.simTime + (flightPlan(home, target, "colony", 1).seconds * RULES.ticksPerSecond + 1) * TICK_MS).state;
    expect(planetById(g, target.id)!.founder).toBe(MO.id);
    expect(rename(g, P1.id, target.id, "Seb-Land").ok).toBe(false);
    expect(rename(g, MO.id, target.id, "Mo-Land").ok).toBe(true);
  });

  it("gives old saves founders", () => {
    const g = coop();
    for (const p of g.planets) delete p.founder;
    const up = upgradeState(JSON.parse(JSON.stringify(g)))!;
    expect(homePlanet(up, P1.id)!.founder).toBe(P1.id);
    expect(up.planets.filter((p) => p.economyId === null).every((p) => p.founder === undefined)).toBe(true);
  });
});
