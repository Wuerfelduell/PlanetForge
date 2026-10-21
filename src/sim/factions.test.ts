import { describe, expect, it } from "vitest";
import {
  activeFactions,
  advanceWithEvents,
  applyCommand,
  createGame,
  FACTIONS,
  factionById,
  factionEconomy,
  hasBuilding,
  homePlanet,
  launchBlocker,
  peopleOf,
  SYSTEM,
  TEAM_ECONOMY,
  tradeQuote,
  ticksPerCycle,
  TICK_MS,
  upgradeState,
  type GameEvent,
  type GameState,
} from "./index";

const P1 = { id: "p1", name: "Seb" };
const newGame = (seed: string, factions = 3, difficulty: "cozy" | "normal" | "hard" = "normal") => createGame(seed, [P1], { now: 0, factions, difficulty });

function runCycles(g: GameState, n: number): { state: GameState; events: GameEvent[] } {
  return advanceWithEvents(g, g.simTime + n * ticksPerCycle(g) * TICK_MS);
}

/** A well-off faction: level, stock and people, so its decisions are not bottlenecked by the economy. */
function boost(g: GameState, factionId: string, level: number, people: number): GameState {
  const next = structuredClone(g);
  const economy = factionEconomy(next, factionById(next, factionId)!)!;
  economy.ascension.level = level;
  for (const r of Object.keys(economy.resources) as (keyof typeof economy.resources)[]) economy.resources[r] = 500;
  const home = homePlanet(next, factionId)!;
  for (let i = Object.values(next.units).filter((u) => u.owner === factionId).length; i < people; i++) {
    const id = `u${next.nextUnitId++}`;
    next.units[id] = { id, owner: factionId, people: next.players.find((p) => p.id === factionId)!.people, planetId: home.id, segment: null, role: "worker" };
  }
  return next;
}

describe("world with factions", () => {
  it("seats every faction on its own start planet with its own economy and people", () => {
    const g = newGame("fraktionen", 3);
    expect(g.settings.factions).toBe(3);
    expect(g.factions).toHaveLength(3);
    const ai = g.players.filter((p) => p.ai);
    expect(ai).toHaveLength(3);
    expect(new Set(g.players.map((p) => p.people)).size).toBe(4);
    expect(new Set(ai.map((p) => p.economyId)).size).toBe(3);
    for (const p of ai) {
      const home = homePlanet(g, p.id)!;
      expect(home.startSlot).toBeGreaterThan(0);
      expect(home.economyId).toBe(p.economyId);
      expect(peopleOf(g, p.id)).toBe(3);
      expect(home.segments.length).toBe(SYSTEM.startPlanetSegments);
    }
    // The team keeps the big shared planet on slot 0.
    expect(homePlanet(g, P1.id)!.startSlot).toBe(0);
    expect(homePlanet(g, P1.id)!.segments.length).toBe(SYSTEM.coopStartPlanetSegments);
    expect(new Set(g.factions.map((f) => f.personality)).size).toBe(3);
  });

  it("has more planets, shares orbits and stays within the map", () => {
    const g = newGame("gross", 4);
    const planets = g.planets.filter((p) => p.type !== "asteroid");
    expect(planets.length).toBeGreaterThanOrEqual(1 + 4 + SYSTEM.freePlanets.min + 4);
    expect(Math.max(...planets.map((p) => p.orbit.radius))).toBeLessThanOrEqual(SYSTEM.maxOrbit);
    const without = createGame("gross", [P1], { now: 0 });
    expect(without.planets.filter((p) => p.type !== "asteroid").length).toBeLessThanOrEqual(1 + SYSTEM.freePlanets.max);
  });

  it("does not change worlds without factions", () => {
    const a = createGame("alt", [P1], { now: 0 });
    const b = createGame("alt", [P1], { now: 0, factions: 0 });
    expect(a.planets).toEqual(b.planets);
    expect(a.factions).toEqual([]);
  });

  it("factions do not take human seats", () => {
    const g = newGame("voll", 4);
    expect(g.players).toHaveLength(5);
    const joined = createGame("voll", [P1, { id: "p2", name: "Mo" }], { now: 0, factions: 4 });
    expect(joined.players.filter((p) => !p.ai)).toHaveLength(2);
    expect(homePlanet(joined, "p2")!.id).toBe(homePlanet(joined, P1.id)!.id);
  });

  it("is deterministic", () => {
    const a = runCycles(newGame("gleich"), 30).state;
    const b = runCycles(newGame("gleich"), 30).state;
    expect(a).toEqual(b);
  });
});

describe("faction economy", () => {
  it("builds, works and grows on its own", () => {
    const g = newGame("fleissig", 2, "normal");
    const { state } = runCycles(g, 40);
    for (const f of activeFactions(state)) {
      const home = homePlanet(state, f.id)!;
      expect(home.segments.some((s) => s.building)).toBe(true);
      expect(hasBuilding(home, "farm") || hasBuilding(home, "fishery")).toBe(true);
      expect(peopleOf(state, f.id)).toBeGreaterThan(3);
      expect(Object.values(state.units).some((u) => u.owner === f.id && u.segment !== null)).toBe(true);
    }
  });

  it("levels up and picks discoveries by itself", () => {
    const g = newGame("klug", 2, "hard");
    const { state } = runCycles(g, 50);
    const f = activeFactions(state)[0]!;
    const economy = factionEconomy(state, f)!;
    expect(economy.ascension.level).toBeGreaterThanOrEqual(2);
    expect(economy.discoveries.length + economy.picks).toBeGreaterThanOrEqual(1);
  }, 30000);
});

describe("trade and gifts", () => {
  it("quotes a price in something the faction lacks and swaps the goods", () => {
    const g = newGame("handel");
    const f = g.factions[0]!;
    const seller = factionEconomy(g, f)!;
    seller.resources.coal = 60;
    const buyer = g.economies[TEAM_ECONOMY]!;
    buyer.resources.wood = 200;
    const quote = tradeQuote(g, f, "coal", 10, buyer)!;
    expect(quote).not.toBeNull();
    expect(quote.affordable).toBe(true);
    expect(quote.giveAmount).toBeGreaterThan(0);
    const r = applyCommand(g, P1.id, { type: "factionTrade", faction: f.id, resource: "coal", amount: 10 }, g.simTime);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.economies[TEAM_ECONOMY]!.resources.coal).toBe(10);
    expect(factionEconomy(r.state, r.state.factions[0]!)!.resources.coal).toBe(50);
    expect(r.state.economies[TEAM_ECONOMY]!.resources[quote.give]).toBe(buyer.resources[quote.give] - quote.giveAmount);
    expect(r.events.some((e) => e.type === "factionTrade")).toBe(true);
    expect(r.state.factions[0]!.attitude).toBeGreaterThan(f.attitude);
  });

  it("never sells below its reserve and not at all in war", () => {
    const g = newGame("knapp");
    const f = g.factions[0]!;
    factionEconomy(g, f)!.resources.coal = FACTIONS.keep + 5;
    expect(tradeQuote(g, f, "coal", 10, g.economies[TEAM_ECONOMY]!)).toBeNull();
    factionEconomy(g, f)!.resources.coal = 100;
    f.stance = "war";
    expect(tradeQuote(g, f, "coal", 10, g.economies[TEAM_ECONOMY]!)).toBeNull();
    const r = applyCommand(g, P1.id, { type: "factionTrade", faction: f.id, resource: "coal", amount: 10 }, g.simTime);
    expect(r).toEqual({ ok: false, error: "Im Krieg wird nicht gehandelt" });
  });

  it("a gift raises the attitude", () => {
    const g = newGame("geschenk");
    const f = g.factions[0]!;
    const food = g.economies[TEAM_ECONOMY]!.resources.food;
    const r = applyCommand(g, P1.id, { type: "gift", faction: f.id, resource: "food", amount: 10 }, g.simTime);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.factions[0]!.attitude).toBeGreaterThan(f.attitude);
    expect(r.state.economies[TEAM_ECONOMY]!.resources.food).toBe(food - 10);
  });
});

describe("war and peace", () => {
  it("attacks need a declared war, then combat rockets fly in coop", () => {
    let g = boost(newGame("krieg"), "ai0", 0, 3);
    const teamEconomy = g.economies[TEAM_ECONOMY]!;
    teamEconomy.ascension.level = 4;
    for (const r of Object.keys(teamEconomy.resources) as (keyof typeof teamEconomy.resources)[]) teamEconomy.resources[r] = 500;
    const home = homePlanet(g, P1.id)!;
    home.segments[0]!.building = "launchpad";
    home.segments[0]!.builtBy = P1.id;
    for (let i = 0; i < 6; i++) g.units[`u${g.nextUnitId++}`] = { id: `u${g.nextUnitId - 1}`, owner: P1.id, people: "burrowbeavers", planetId: home.id, segment: null, role: "worker" };
    const target = homePlanet(g, "ai0")!;
    expect(launchBlocker(g, P1.id, home, target, "combat", 3)).toBe("Dafür müsste Krieg herrschen");
    expect(launchBlocker(g, P1.id, home, target, "colony", 3)).toBe("Dort lebt schon jemand");

    const declared = applyCommand(g, P1.id, { type: "diplomacy", faction: "ai0", action: "war" }, g.simTime);
    expect(declared.ok).toBe(true);
    if (!declared.ok) return;
    g = declared.state;
    expect(factionById(g, "ai0")!.stance).toBe("war");
    expect(declared.events).toContainEqual({ type: "factionStance", faction: "ai0", stance: "war", reason: "declaredWar" });
    expect(launchBlocker(g, P1.id, homePlanet(g, P1.id)!, homePlanet(g, "ai0")!, "combat", 3)).toBeNull();
    // Other factions stay out of it.
    expect(launchBlocker(g, P1.id, homePlanet(g, P1.id)!, homePlanet(g, "ai1")!, "combat", 3)).toBe("Dafür müsste Krieg herrschen");
  });

  it("a faction at war sends combat rockets at the team", () => {
    let g = boost(newGame("angriff"), "ai0", 3, 12);
    factionById(g, "ai0")!.stance = "war";
    const home = homePlanet(g, "ai0")!;
    const site = home.segments.find((s) => s.revealed && !s.building && s.biome !== "ocean")!;
    site.building = "launchpad";
    site.builtBy = "ai0";
    let launched = false;
    for (let i = 0; i < 15 && !launched; i++) {
      const r = runCycles(g, 1);
      g = r.state;
      launched = r.events.some((e) => e.type === "launched" && e.playerId === "ai0" && e.rocket === "combat");
    }
    expect(launched).toBe(true);
    expect(g.flights.some((f) => f.owner === "ai0" && g.planets.find((p) => p.id === f.to)!.economyId === TEAM_ECONOMY)).toBe(true);
  });

  it("peace is accepted when the faction is not too bitter", () => {
    const g = newGame("frieden");
    const f = factionById(g, "ai0")!;
    f.stance = "war";
    f.attitude = -20;
    const r = applyCommand(g, P1.id, { type: "diplomacy", faction: "ai0", action: "peace" }, g.simTime);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(factionById(r.state, "ai0")!.stance).toBe("peace");
    expect(factionById(r.state, "ai0")!.truceUntilTick).toBeGreaterThan(0);
  });

  it("peace is refused by a bitter, stronger faction", () => {
    const g = boost(newGame("stur"), "ai0", 0, 10);
    const f = factionById(g, "ai0")!;
    f.stance = "war";
    f.attitude = -80;
    const r = applyCommand(g, P1.id, { type: "diplomacy", faction: "ai0", action: "peace" }, g.simTime);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(factionById(r.state, "ai0")!.stance).toBe("war");
    expect(r.events).toContainEqual({ type: "factionDeclined", faction: "ai0", action: "peace" });
    const again = applyCommand(r.state, P1.id, { type: "diplomacy", faction: "ai0", action: "peace" }, r.state.simTime);
    expect(again.ok).toBe(false);
  });

  it("a refused ultimatum means war, a paid one buys a truce", () => {
    const g = newGame("ultimatum");
    const f = factionById(g, "ai0")!;
    f.offer = { kind: "ultimatum", resource: "food", amount: 10, expiresTick: 1000 };
    const refused = applyCommand(g, P1.id, { type: "answerOffer", faction: "ai0", accept: false }, g.simTime);
    expect(refused.ok && factionById(refused.state, "ai0")!.stance).toBe("war");
    const paid = applyCommand(g, P1.id, { type: "answerOffer", faction: "ai0", accept: true }, g.simTime);
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    expect(paid.state.economies[TEAM_ECONOMY]!.resources.food).toBe(g.economies[TEAM_ECONOMY]!.resources.food - 10);
    expect(factionById(paid.state, "ai0")!.stance).toBe("peace");
    expect(factionById(paid.state, "ai0")!.truceUntilTick).toBeGreaterThan(0);
  });

  it("an unprovoked attack by the team starts a war", () => {
    const g = newGame("ueberfall");
    const f = factionById(g, "ai0")!;
    expect(f.stance).toBe("peace");
    // Simulate a landing of a team combat rocket, as if war had been declared and then forgotten.
    const home = homePlanet(g, "ai0")!;
    g.flights.push({ id: "fx", owner: P1.id, rocket: "combat", from: homePlanet(g, P1.id)!.id, to: home.id, units: [], launchTick: 0, arrivalTick: 1 });
    const { state } = advanceWithEvents(g, g.simTime + 2 * TICK_MS);
    expect(factionById(state, "ai0")!.stance).toBe("war");
  });

  it("a faction without people is gone and its planets are ruins; a wiped team loses", () => {
    const g = newGame("ende");
    for (const [id, u] of Object.entries(g.units)) if (u.owner === "ai0") delete g.units[id];
    const { state, events } = runCycles(g, 1);
    expect(factionById(state, "ai0")!.eliminated).toBe(true);
    expect(homePlanet(state, "ai0")!.economyId).toBeNull();
    expect(events).toContainEqual({ type: "factionEliminated", faction: "ai0" });
    expect(state.result).toBeNull();

    for (const [id, u] of Object.entries(state.units)) if (u.owner === P1.id) delete state.units[id];
    const wiped = runCycles(state, 1);
    expect(wiped.state.result).toEqual({ winner: expect.stringMatching(/^ai[12]$/) });
  });
});

describe("alliance and merge", () => {
  it("friends ally, allies merge into the team", () => {
    let g = newGame("freunde");
    const f = factionById(g, "ai1")!;
    f.attitude = 70;
    const ally = applyCommand(g, P1.id, { type: "diplomacy", faction: "ai1", action: "alliance" }, g.simTime);
    expect(ally.ok).toBe(true);
    if (!ally.ok) return;
    g = ally.state;
    expect(factionById(g, "ai1")!.stance).toBe("allied");
    // Too early for a merge.
    const early = applyCommand(g, P1.id, { type: "diplomacy", faction: "ai1", action: "merge" }, g.simTime);
    expect(early.ok && early.events).toContainEqual({ type: "factionDeclined", faction: "ai1", action: "merge" });

    g = runCycles(g, FACTIONS.mergeAlliedCycles + 1).state;
    const fa = factionById(g, "ai1")!;
    fa.attitude = 95;
    fa.nextProposalTick = 0;
    const planetsBefore = g.planets.filter((p) => p.economyId === g.players.find((p) => p.id === "ai1")!.economyId).length;
    const unitsBefore = Object.values(g.units).filter((u) => u.owner === "ai1").length;
    const teamFood = g.economies[TEAM_ECONOMY]!.resources.food;
    const factionFood = factionEconomy(g, fa)!.resources.food;
    const merged = applyCommand(g, P1.id, { type: "diplomacy", faction: "ai1", action: "merge" }, g.simTime);
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    g = merged.state;
    expect(g.players.some((p) => p.id === "ai1")).toBe(false);
    expect(factionById(g, "ai1")!.stance).toBe("merged");
    expect(Object.values(g.units).filter((u) => u.owner === "ai1")).toHaveLength(0);
    expect(g.planets.filter((p) => p.economyId === TEAM_ECONOMY).length).toBe(1 + planetsBefore);
    expect(g.economies[TEAM_ECONOMY]!.resources.food).toBeCloseTo(teamFood + factionFood, 5);
    expect(merged.events).toContainEqual(expect.objectContaining({ type: "factionMerged", faction: "ai1", playerId: P1.id, units: unitsBefore }));
    expect(activeFactions(g)).toHaveLength(2);
    // The merged people keep working for the team.
    const { state } = runCycles(g, 2);
    expect(peopleOf(state, P1.id)).toBeGreaterThanOrEqual(3 + unitsBefore);
  });

  it("a diplomat proposes an alliance by itself when it likes the team", () => {
    let g = newGame("diplomat", 4);
    const f = g.factions.find((x) => x.personality === "diplomat")!;
    f.attitude = 80;
    let offered = false;
    for (let i = 0; i < 12 && !offered; i++) {
      const r = runCycles(g, 1);
      g = r.state;
      offered = r.events.some((e) => e.type === "factionOffer" && e.faction === f.id && e.kind === "alliance");
    }
    expect(offered).toBe(true);
    const accepted = applyCommand(g, P1.id, { type: "answerOffer", faction: f.id, accept: true }, g.simTime);
    expect(accepted.ok && factionById(accepted.state, f.id)!.stance).toBe("allied");
  });
});

describe("team votes", () => {
  const P2 = { id: "p2", name: "Mira" };
  const P3 = { id: "p3", name: "Ola" };
  const teamGame = (seed: string, players = [P1, P2]) => createGame(seed, players, { now: 0, factions: 2 });
  const stance = (g: GameState) => factionById(g, "ai0")!.stance;

  it("with several humans a declaration of war opens a vote instead of happening at once", () => {
    const g = teamGame("vote-war");
    const r = applyCommand(g, P1.id, { type: "diplomacy", faction: "ai0", action: "war" }, g.simTime);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(stance(r.state)).toBe("peace");
    expect(factionById(r.state, "ai0")!.vote).toEqual({ action: "war", votes: { p1: true }, startedBy: "p1" });
    expect(r.events).toContainEqual({ type: "factionVote", faction: "ai0", playerId: "p1", action: "war", yes: true });
    // The other player cannot start a different vote meanwhile, but can vote.
    expect(applyCommand(r.state, P2.id, { type: "diplomacy", faction: "ai0", action: "alliance" }, r.state.simTime)).toMatchObject({ ok: false });
    const no = applyCommand(r.state, P2.id, { type: "voteDiplomacy", faction: "ai0", yes: false }, r.state.simTime);
    expect(no.ok).toBe(true);
    if (!no.ok) return;
    // 1:1 is a tie: nothing happens and the vote is over.
    expect(stance(no.state)).toBe("peace");
    expect(factionById(no.state, "ai0")!.vote).toBeNull();
    expect(no.events).toContainEqual({ type: "factionVoteResult", faction: "ai0", action: "war", passed: false });
    const again = applyCommand(no.state, P1.id, { type: "diplomacy", faction: "ai0", action: "war" }, no.state.simTime);
    const yes = again.ok ? applyCommand(again.state, P2.id, { type: "voteDiplomacy", faction: "ai0", yes: true }, again.state.simTime) : again;
    expect(yes.ok && stance(yes.state)).toBe("war");
    expect(yes.ok && yes.events).toContainEqual({ type: "factionVoteResult", faction: "ai0", action: "war", passed: true });
  });

  it("an unfinished vote closes with the cycle, a true majority decides", () => {
    const g = teamGame("vote-cycle", [P1, P2, P3]);
    const r = applyCommand(g, P1.id, { type: "diplomacy", faction: "ai0", action: "war" }, g.simTime);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const one = runCycles(r.state, 1);
    // 1:0 with one voter missing: war.
    expect(stance(one.state)).toBe("war");
    expect(factionById(one.state, "ai0")!.vote).toBeNull();
    // Peace: p1 for, p2 against, p3 silent -> tie at the end of the cycle, still war.
    const f = factionById(one.state, "ai0")!;
    f.attitude = 50;
    f.nextProposalTick = 0;
    const p = applyCommand(one.state, P1.id, { type: "diplomacy", faction: "ai0", action: "peace" }, one.state.simTime);
    const q = p.ok ? applyCommand(p.state, P2.id, { type: "voteDiplomacy", faction: "ai0", yes: false }, p.state.simTime) : p;
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    expect(stance(q.state)).toBe("war");
    expect(factionById(q.state, "ai0")!.vote).not.toBeNull();
    const two = runCycles(q.state, 1);
    expect(factionById(two.state, "ai0")!.vote).toBeNull();
    expect(stance(two.state)).toBe("war");
    expect(two.events).toContainEqual({ type: "factionVoteResult", faction: "ai0", action: "peace", passed: false });
  });

  it("a faction's offer is answered by vote: yes accepts, no declines", () => {
    const g = teamGame("vote-offer");
    const f = factionById(g, "ai0")!;
    f.offer = { kind: "alliance", expiresTick: 100000 };
    const a = applyCommand(g, P1.id, { type: "answerOffer", faction: "ai0", accept: true }, g.simTime);
    expect(a.ok && stance(a.state)).toBe("peace");
    expect(a.ok && factionById(a.state, "ai0")!.vote?.action).toBe("offer");
    const b = a.ok ? applyCommand(a.state, P2.id, { type: "answerOffer", faction: "ai0", accept: true }, a.state.simTime) : a;
    expect(b.ok && stance(b.state)).toBe("allied");
    expect(b.ok && factionById(b.state, "ai0")!.offer).toBeNull();

    const h = teamGame("vote-offer-no");
    factionById(h, "ai0")!.offer = { kind: "alliance", expiresTick: 100000 };
    const c = applyCommand(h, P1.id, { type: "answerOffer", faction: "ai0", accept: false }, h.simTime);
    const d = c.ok ? applyCommand(c.state, P2.id, { type: "voteDiplomacy", faction: "ai0", yes: false }, c.state.simTime) : c;
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(stance(d.state)).toBe("peace");
    expect(factionById(d.state, "ai0")!.offer).toBeNull();
    expect(factionById(d.state, "ai0")!.attitude).toBeLessThan(factionById(h, "ai0")!.attitude);
  });

  it("alone there is no vote and the voting command has nothing to do", () => {
    const g = newGame("vote-solo");
    expect(applyCommand(g, P1.id, { type: "voteDiplomacy", faction: "ai0", yes: true }, g.simTime)).toEqual({ ok: false, error: "Gerade läuft keine Abstimmung" });
    const r = applyCommand(g, P1.id, { type: "diplomacy", faction: "ai0", action: "war" }, g.simTime);
    expect(r.ok && stance(r.state)).toBe("war");
    expect(r.ok && factionById(r.state, "ai0")!.vote).toBeFalsy();
  });
});

describe("saves", () => {
  it("old saves without factions load with none", () => {
    const g = createGame("alt", [P1], { now: 0 });
    const raw = JSON.parse(JSON.stringify(g)) as Record<string, unknown>;
    delete raw.factions;
    delete (raw.settings as Record<string, unknown>).factions;
    const up = upgradeState(raw)!;
    expect(up.factions).toEqual([]);
    expect(up.settings.factions).toBe(0);
  });
});
