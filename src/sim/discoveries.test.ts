import { describe, expect, it } from "vitest";
import {
  addPlayer,
  advanceWithEvents,
  applyCommand,
  createGame,
  discoveryCost,
  economyOfPlayer,
  homePlanet,
  OFFERABLE,
  nextLevelThreshold,
  segmentOutput,
  TICK_MS,
  ticksPerCycle,
  type GameState,
} from "./index";

const P1 = { id: "p1", name: "Seb" };
const MO = { id: "p2", name: "Mo" };

const clone = (g: GameState) => JSON.parse(JSON.stringify(g)) as GameState;
const runCycle = (g: GameState) => advanceWithEvents(g, g.simTime + ticksPerCycle(g) * TICK_MS);

/** A game one cycle before reaching ascension level 1. */
function almostLevelOne(players = [P1]): GameState {
  let g = createGame("disc", [players[0]!], { now: 0 });
  for (const p of players.slice(1)) {
    const r = addPlayer(g, p.id, p.name, 0);
    if (!r.ok) throw new Error(r.error);
    g = r.state;
  }
  g = clone(g);
  const economy = economyOfPlayer(g, P1.id)!;
  economy.ascension.points = nextLevelThreshold(0, "coop", players.length)! - 1;
  economy.resources.food = 500;
  return g;
}

describe("discoveries", () => {
  it("only offers discoveries whose effects the simulation implements", () => {
    expect(OFFERABLE).toContain("swift-feet");
    expect(OFFERABLE).toContain("rocketry");
    expect(OFFERABLE).not.toContain("storage-tech");
    expect(OFFERABLE).not.toContain("atomic-power");
  });

  it("a level-up offers three choices and some science", () => {
    const { state, events } = runCycle(almostLevelOne());
    const economy = economyOfPlayer(state, P1.id)!;
    expect(events).toContainEqual(expect.objectContaining({ type: "levelUp", level: 1 }));
    expect(economy.picks).toBe(1);
    expect(economy.offer?.options).toHaveLength(3);
    expect(new Set(economy.offer!.options).size).toBe(3);
    expect(economy.resources.science).toBeGreaterThan(0);
  });

  it("alone, a vote picks right away once the science is there", () => {
    let g = runCycle(almostLevelOne()).state;
    const economy = economyOfPlayer(g, P1.id)!;
    const choice = economy.offer!.options[0]!;
    economy.resources.science = 0;
    let r = applyCommand(g, P1.id, { type: "voteDiscovery", discovery: choice }, g.simTime);
    if (!r.ok) throw new Error(r.error);
    expect(economyOfPlayer(r.state, P1.id)!.discoveries).toEqual([]);

    g = clone(r.state);
    const cost = discoveryCost(g, economyOfPlayer(g, P1.id)!);
    economyOfPlayer(g, P1.id)!.resources.science = cost;
    r = applyCommand(g, P1.id, { type: "voteDiscovery", discovery: choice }, g.simTime);
    if (!r.ok) throw new Error(r.error);
    const after = economyOfPlayer(r.state, P1.id)!;
    expect(r.events).toContainEqual({ type: "discovered", economyId: after.id, discovery: choice });
    expect(after.discoveries).toEqual([choice]);
    expect(after.resources.science).toBe(0);
    expect(after.offer).toBeNull();
    expect(applyCommand(r.state, P1.id, { type: "voteDiscovery", discovery: choice }, r.state.simTime)).toEqual({ ok: false, error: "Gerade gibt es keine Entdeckung zur Wahl" });
  });

  it("coop: a tie decides nothing, a true majority does", () => {
    let g = runCycle(almostLevelOne([P1, MO])).state;
    g = clone(g);
    const economy = economyOfPlayer(g, P1.id)!;
    economy.resources.science = 1000;
    const [a, b] = economy.offer!.options as [string, string];
    const vote = (state: GameState, playerId: string, discovery: string) => {
      const r = applyCommand(state, playerId, { type: "voteDiscovery", discovery }, state.simTime);
      if (!r.ok) throw new Error(r.error);
      return r.state;
    };
    g = vote(g, P1.id, a);
    expect(economyOfPlayer(g, P1.id)!.offer).not.toBeNull();
    g = vote(g, MO.id, b);
    expect(economyOfPlayer(g, P1.id)!.offer).not.toBeNull();
    // Still a tie when the cycle ends.
    g = runCycle(g).state;
    expect(economyOfPlayer(g, P1.id)!.discoveries).toEqual([]);
    g = vote(g, MO.id, a);
    expect(economyOfPlayer(g, P1.id)!.discoveries).toEqual([a]);
  });

  it("coop: one vote and silence decides at the end of the cycle", () => {
    let g = clone(runCycle(almostLevelOne([P1, MO])).state);
    economyOfPlayer(g, P1.id)!.resources.science = 1000;
    const choice = economyOfPlayer(g, P1.id)!.offer!.options[1]!;
    const r = applyCommand(g, P1.id, { type: "voteDiscovery", discovery: choice }, g.simTime);
    if (!r.ok) throw new Error(r.error);
    g = r.state;
    expect(economyOfPlayer(g, P1.id)!.discoveries).toEqual([]);
    expect(economyOfPlayer(runCycle(g).state, P1.id)!.discoveries).toEqual([choice]);
  });

  it("discoveries change the rules: swift feet gathers faster", () => {
    const g = clone(createGame("feet", [P1], { now: 0 }));
    const planet = homePlanet(g, P1.id)!;
    const forest = planet.segments.find((s) => s.revealed && s.biome === "forest")!;
    const economy = economyOfPlayer(g, P1.id)!;
    const before = segmentOutput(planet, forest, 2, economy).wood!;
    economy.discoveries.push("swift-feet");
    expect(segmentOutput(planet, forest, 2, economy).wood!).toBeCloseTo(before * 1.2);
  });
});
