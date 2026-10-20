import { describe, expect, it } from "vitest";
import {
  addPlayer,
  advanceWithEvents,
  applyCommand,
  createGame,
  economyOfPlayer,
  flightPlan,
  homePlanet,
  peopleOf,
  planetById,
  RESOURCE_IDS,
  RULES,
  TICK_MS,
  unitsOn,
  type Command,
  type GameEvent,
  type GameState,
} from "./index";

const P1 = { id: "p1", name: "Seb" };
const MO = { id: "p2", name: "Mo" };

function exec(g: GameState, cmd: Command, playerId = P1.id): { state: GameState; events: GameEvent[] } {
  const result = applyCommand(g, playerId, cmd, g.simTime);
  if (!result.ok) throw new Error(result.error);
  return result;
}

function run(g: GameState, ticks: number) {
  return advanceWithEvents(g, g.simTime + ticks * TICK_MS);
}

/** Test setup shortcut: rich, level 3, with a launch pad on the first land segment of the home planet. */
function prepare(g: GameState, playerId = P1.id): GameState {
  const next = JSON.parse(JSON.stringify(g)) as GameState;
  const economy = economyOfPlayer(next, playerId)!;
  for (const r of RESOURCE_IDS) economy.resources[r] = 500;
  economy.ascension.level = 3;
  const home = homePlanet(next, playerId)!;
  const pad = home.segments.find((s) => s.revealed && s.biome !== "ocean" && !s.building)!;
  pad.building = "launchpad";
  pad.builtBy = playerId;
  return next;
}

const freePlanet = (g: GameState) => g.planets.find((p) => p.economyId === null && p.startSlot === null)!;

function versusGame(): GameState {
  let g = createGame("duel", [P1], { now: 0, mode: "versus", maxPlayers: 2 });
  const r = addPlayer(g, MO.id, MO.name, 0);
  if (!r.ok) throw new Error(r.error);
  g = prepare(prepare(r.state), MO.id);
  return g;
}

/** Puts every unit of a player on its home planet to work (or idle), so the test controls who defends. */
function setIdle(g: GameState, playerId: string, idle: boolean): GameState {
  const next = JSON.parse(JSON.stringify(g)) as GameState;
  const home = homePlanet(next, playerId)!;
  for (const u of unitsOn(next, home.id, playerId)) u.segment = idle ? null : home.segments.find((s) => s.revealed)!.index;
  return next;
}

describe("rockets and colonies", () => {
  it("needs a launch pad and ascension level 2", () => {
    const g = createGame("pad", [P1], { now: 0 });
    const home = homePlanet(g, P1.id)!;
    const cmd: Command = { type: "launch", planetId: home.id, to: freePlanet(g).id, rocket: "colony", count: 1 };
    expect(applyCommand(g, P1.id, cmd, 0)).toEqual({ ok: false, error: "Dafür braucht es eine Startrampe" });
    const low = prepare(g);
    economyOfPlayer(low, P1.id)!.ascension.level = 1;
    expect(applyCommand(low, P1.id, cmd, 0)).toEqual({ ok: false, error: "Ab Aufstiegsstufe 2" });
  });

  it("flies idle inhabitants to a free planet and founds a colony there", () => {
    let g = prepare(createGame("colony", [P1], { now: 0 }));
    const home = homePlanet(g, P1.id)!;
    const target = freePlanet(g);
    const plan = flightPlan(home, target, "colony", 2);
    const before = economyOfPlayer(g, P1.id)!.resources.wood;

    const launched = exec(g, { type: "launch", planetId: home.id, to: target.id, rocket: "colony", count: 2 });
    g = launched.state;
    expect(launched.events).toContainEqual(expect.objectContaining({ type: "launched", count: 2, to: target.id }));
    expect(g.flights).toHaveLength(1);
    expect(unitsOn(g, home.id)).toHaveLength(RULES.startPopulation - 2);
    expect(peopleOf(g, P1.id)).toBe(RULES.startPopulation);
    expect(economyOfPlayer(g, P1.id)!.resources.wood).toBe(before - plan.cost.wood!);

    const { state, events } = run(g, plan.seconds * RULES.ticksPerSecond + 1);
    expect(events).toContainEqual(expect.objectContaining({ type: "landed", planetId: target.id, colonized: true, count: 2 }));
    const colony = planetById(state, target.id)!;
    expect(colony.economyId).toBe(economyOfPlayer(state, P1.id)!.id);
    expect(unitsOn(state, colony.id, P1.id)).toHaveLength(2);
    expect(colony.segments.some((s) => s.revealed)).toBe(true);
    expect(state.flights).toHaveLength(0);
  });

  it("coop has no attacks", () => {
    const g = prepare(createGame("peace", [P1], { now: 0 }));
    const home = homePlanet(g, P1.id)!;
    const result = applyCommand(g, P1.id, { type: "launch", planetId: home.id, to: freePlanet(g).id, rocket: "combat", count: 1 }, 0);
    expect(result).toEqual({ ok: false, error: "Angriffe gibt es nur im Gegeneinander-Modus" });
  });
});

describe("versus battles", () => {
  const attack = (g: GameState, count: number) =>
    exec(g, { type: "launch", planetId: homePlanet(g, P1.id)!.id, to: homePlanet(g, MO.id)!.id, rocket: "combat", count }).state;
  const arrive = (g: GameState) => run(g, g.flights[0]!.arrivalTick - g.tick + 1);

  it("only targets foreign planets", () => {
    const g = versusGame();
    const home = homePlanet(g, P1.id)!;
    const result = applyCommand(g, P1.id, { type: "launch", planetId: home.id, to: freePlanet(g).id, rocket: "combat", count: 1 }, 0);
    expect(result).toEqual({ ok: false, error: "Angreifen kann man nur fremde Planeten" });
  });

  it("an undefended planet falls: workers become captives, the stockpile is shared, the captor wins after assimilation", () => {
    let g = setIdle(versusGame(), MO.id, false);
    const target = homePlanet(g, MO.id)!;
    const moPeople = peopleOf(g, MO.id);
    const moFood = economyOfPlayer(g, MO.id)!.resources.food;
    g = attack(g, 2);

    const landed = arrive(g);
    g = landed.state;
    expect(landed.events).toContainEqual(expect.objectContaining({ type: "battle", won: true, attackerLosses: 0, defenderLosses: 0, captured: moPeople }));
    const planet = planetById(g, target.id)!;
    expect(planet.economyId).toBe(economyOfPlayer(g, P1.id)!.id);
    expect(unitsOn(g, planet.id).every((u) => u.owner === P1.id)).toBe(true);
    // Mo's whole people lived there, so Mo's whole stockpile changes hands.
    expect(economyOfPlayer(g, MO.id)!.resources.food).toBe(0);
    expect(economyOfPlayer(g, P1.id)!.resources.food).toBeGreaterThanOrEqual(moFood);
    // Captives still count for Mo, so Mo is not out yet.
    expect(peopleOf(g, MO.id)).toBe(moPeople);
    expect(g.result).toBeNull();
    expect(applyCommand(g, MO.id, { type: "assignUnit", unitId: unitsOn(g, planet.id)[0]!.id, segment: null }, g.simTime)).toEqual({ ok: false, error: "Dieser Einwohner gehört dir nicht" });

    const later = run(g, (RULES.captiveAssimilationCycles + 1) * g.settings.cycleSeconds * RULES.ticksPerSecond);
    expect(later.events).toContainEqual({ type: "assimilated", playerId: P1.id, count: moPeople });
    expect(later.events).toContainEqual({ type: "eliminated", playerId: MO.id });
    expect(later.events).toContainEqual({ type: "gameOver", result: { winner: P1.id } });
    expect(later.state.result).toEqual({ winner: P1.id });
    expect(applyCommand(later.state, P1.id, { type: "assignUnit", unitId: unitsOn(later.state, planet.id)[0]!.id, segment: null }, later.state.simTime)).toEqual({ ok: false, error: "Das Spiel ist vorbei" });
  });

  it("idle defenders fight with home advantage; a lost attack costs every attacker", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      let g = setIdle(versusGame(), MO.id, true);
      g.seed = seed;
      g.rng = seed.charCodeAt(0);
      const defenders = unitsOn(g, homePlanet(g, MO.id)!.id, MO.id).length;
      g = attack(g, 1);
      const { state, events } = arrive(g);
      const battle = events.find((e) => e.type === "battle");
      if (battle?.type !== "battle") throw new Error("no battle");
      if (battle.won) {
        expect(battle.defenderLosses).toBe(defenders);
        expect(homePlanet(state, MO.id)!.economyId).toBe(economyOfPlayer(state, P1.id)!.id);
      } else {
        expect(battle.attackerLosses).toBe(1);
        expect(battle.defenderLosses).toBeLessThan(defenders);
        expect(homePlanet(state, MO.id)!.economyId).toBe(economyOfPlayer(state, MO.id)!.id);
        expect(unitsOn(state, homePlanet(state, MO.id)!.id, MO.id)).toHaveLength(defenders - battle.defenderLosses);
      }
      expect(state.lastCombatTick).toBe(state.tick - 1);
    }
  });

  it("surrender hands the win to the other player and leaves ruins", () => {
    const g = versusGame();
    const moHome = homePlanet(g, MO.id)!;
    const { state, events } = exec(g, { type: "surrender" }, MO.id);
    expect(events).toContainEqual({ type: "gameOver", result: { winner: P1.id } });
    expect(planetById(state, moHome.id)!.economyId).toBeNull();
    expect(planetById(state, moHome.id)!.segments.some((s) => s.building === "launchpad")).toBe(true);
    expect(peopleOf(state, MO.id)).toBe(0);
  });

  it("a draw needs every remaining player; long peace makes the game offer one", () => {
    let g = versusGame();
    g = exec(g, { type: "offerDraw", offer: true }).state;
    expect(g.result).toBeNull();
    const { state, events } = exec(g, { type: "offerDraw", offer: true }, MO.id);
    expect(events).toContainEqual({ type: "gameOver", result: { draw: true } });
    expect(state.result).toEqual({ draw: true });

    let quiet = createGame("quiet", [P1], { now: 0, mode: "versus", maxPlayers: 2, cycleSeconds: 1 });
    const joined = addPlayer(quiet, MO.id, MO.name, 0);
    if (!joined.ok) throw new Error(joined.error);
    quiet = joined.state;
    const ticks = RULES.drawOfferCycles * RULES.ticksPerSecond;
    expect(run(quiet, ticks - 1).state.drawSuggested).toBe(false);
    const offered = run(quiet, ticks);
    expect(offered.events).toContainEqual({ type: "drawSuggested" });
  });

  it("coop knows no surrender", () => {
    const g = createGame("team", [P1], { now: 0 });
    expect(applyCommand(g, P1.id, { type: "surrender" }, 0)).toEqual({ ok: false, error: "Nur im Gegeneinander-Modus" });
  });
});
