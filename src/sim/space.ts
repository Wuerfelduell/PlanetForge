import { RESOURCE_IDS, RULES } from "./content";
import { Rng } from "./rng";
import { modified } from "./discoveries";
import { landAtSun } from "./invaders";
import { checkFactionEliminations, checkTeamWipe, onBattle } from "./diplomacy";
import { activePlayers, countsFor, flightPlan, peopleOf, planetById, planetDefense, playerById, ringDistance, ticksPerCycle, unitsOn } from "./rules";
import type { Flight, GameEvent, GameState, PlanetState, PlayerState, UnitState } from "./state";
import type { RocketId } from "./content";

/** Pays for a rocket (already validated by launchBlocker) and puts `count` idle units of the player into it. */
export function launch(state: GameState, player: PlayerState, from: PlanetState, to: PlanetState, rocket: RocketId, count: number, events: GameEvent[]): void {
  const economy = state.economies[player.economyId]!;
  const plan = flightPlan(from, to, rocket, count, economy);
  for (const r of RESOURCE_IDS) economy.resources[r] -= plan.cost[r] ?? 0;
  const units = unitsOn(state, from.id, player.id)
    .filter((u) => u.segment === null)
    .slice(0, count);
  for (const u of units) delete state.units[u.id];
  const flight: Flight = {
    id: `f${state.nextFlightId++}`,
    owner: player.id,
    rocket,
    from: from.id,
    to: to.id,
    units,
    launchTick: state.tick,
    arrivalTick: state.tick + plan.seconds * RULES.ticksPerSecond,
  };
  state.flights.push(flight);
  events.push({ type: "launched", flightId: flight.id, playerId: player.id, from: from.id, to: to.id, rocket, count, arrivalTick: flight.arrivalTick });
}

/** Lands every rocket that is due: colonize, reinforce or fight. Runs once per tick. */
export function landFlights(state: GameState, events: GameEvent[]): void {
  const due = state.flights.filter((f) => f.arrivalTick <= state.tick);
  if (due.length === 0) return;
  state.flights = state.flights.filter((f) => f.arrivalTick > state.tick);
  for (const flight of due) {
    if (flight.to === "sun") {
      landAtSun(state, flight, events);
      continue;
    }
    const planet = planetById(state, flight.to)!;
    const player = playerById(state, flight.owner);
    // A removed player's rocket simply vanishes with its passengers.
    if (!player) continue;
    if (planet.economyId === null || planet.economyId === player.economyId) {
      const colonized = planet.economyId === null;
      if (colonized) colonize(planet, player.economyId, events);
      for (const u of flight.units) state.units[u.id] = { ...u, planetId: planet.id, segment: null };
      events.push({ type: "landed", flightId: flight.id, playerId: player.id, planetId: planet.id, count: flight.units.length, colonized });
    } else {
      // Someone else lives there (versus): every arrival is an attack.
      battle(state, flight, planet, player, events);
    }
  }
  checkEliminations(state, events);
  if (state.settings.factions > 0) {
    checkFactionEliminations(state, events);
    checkTeamWipe(state, events);
  }
}

function colonize(planet: PlanetState, economyId: string, events: GameEvent[]): void {
  planet.economyId = economyId;
  planet.birthProgress = 0;
  // Land on segment 0, where the wheel starts, so the new colony is in view.
  const site = planet.segments[0]!;
  const revealed: number[] = [];
  for (const s of planet.segments) {
    if (!s.revealed && ringDistance(s.index, site.index, planet.segments.length) <= RULES.colonyRevealRadius) {
      s.revealed = true;
      revealed.push(s.index);
    }
  }
  if (revealed.length) events.push({ type: "revealed", planetId: planet.id, segments: revealed });
}

/**
 * Dice battle on arrival: each round both sides roll one die, defenders add home advantage and
 * watchtowers and win ties; the loser of the round loses one inhabitant. Defenders are the idle
 * inhabitants of the planet's economy; workers do not fight. If the attackers win, the planet,
 * its workers (as captives) and a share of the loser's stockpile go to the attacker.
 */
function battle(state: GameState, flight: Flight, planet: PlanetState, attacker: PlayerState, events: GameEvent[]): void {
  const residents = Object.values(state.units).filter((u) => u.planetId === planet.id && playerById(state, u.owner)?.economyId === planet.economyId);
  const defenders = residents.filter((u) => u.segment === null);
  const defenderId = mainOwner(residents) ?? state.players.find((p) => p.economyId === planet.economyId)?.id ?? "";
  const loserEconomy = state.economies[planet.economyId!]!;
  const loserPeople = state.players.filter((p) => p.economyId === planet.economyId).reduce((sum, p) => sum + peopleOf(state, p.id), 0);

  const rng = new Rng(state.rng);
  const bonus = planetDefense(state, planet);
  const attackBonus = modified(state.economies[attacker.economyId], "battleRoll", 0);
  let attackers = flight.units.length;
  let attackerLosses = 0;
  let defenderLosses = 0;
  while (attackers > 0 && defenderLosses < defenders.length) {
    const a = rng.int(1, RULES.battleDie) + attackBonus;
    const d = rng.int(1, RULES.battleDie) + bonus;
    if (a > d) defenderLosses++;
    else {
      attackers--;
      attackerLosses++;
    }
  }
  state.rng = rng.seed;
  state.lastCombatTick = state.tick;
  // Medicine: the side that holds the field loses one fewer.
  if (attackers > 0 && attackerLosses > 0 && modified(state.economies[attacker.economyId], "battleLosses", 0) < 0) {
    attackers++;
    attackerLosses--;
  } else if (attackers === 0 && defenderLosses > 0 && modified(loserEconomy, "battleLosses", 0) < 0) {
    defenderLosses--;
  }

  for (const u of defenders.slice(0, defenderLosses)) delete state.units[u.id];
  const won = attackers > 0;
  let captured = 0;
  if (won) {
    // Share of the stockpile = the planet's share of the loser's people (design 5.4).
    const share = loserPeople > 0 ? Math.min(1, residents.length / loserPeople) : 1;
    const winnerEconomy = state.economies[attacker.economyId]!;
    for (const r of RESOURCE_IDS) {
      const amount = Math.floor(loserEconomy.resources[r] * share);
      loserEconomy.resources[r] -= amount;
      winnerEconomy.resources[r] += amount;
    }
    planet.economyId = attacker.economyId;
    planet.birthProgress = 0;
    delete state.queues[planet.id];
    for (const u of residents.slice()) {
      if (!state.units[u.id]) continue;
      if (u.originalOwner === attacker.id) {
        // Freed: own people taken back.
        delete u.originalOwner;
        delete u.capturedTick;
      } else if (u.owner !== attacker.id) {
        u.originalOwner = countsFor(u);
        u.capturedTick = state.tick;
        captured++;
      }
      u.owner = attacker.id;
    }
    for (const u of flight.units.slice(attackerLosses)) state.units[u.id] = { ...u, planetId: planet.id, segment: null };
  }
  events.push({ type: "battle", planetId: planet.id, attacker: attacker.id, defender: defenderId, attackerLosses, defenderLosses, won, captured });
  if (state.settings.factions > 0) onBattle(state, attacker, loserEconomy.id, won, events);
}

function mainOwner(units: UnitState[]): string | undefined {
  const counts = new Map<string, number>();
  for (const u of units) counts.set(countsFor(u), (counts.get(countsFor(u)) ?? 0) + 1);
  let best: string | undefined;
  for (const [id, n] of counts) if (best === undefined || n > counts.get(best)!) best = id;
  return best;
}

/** versus: removes a player's units and flights, frees their planets as ruins. */
export function surrender(state: GameState, player: PlayerState, events: GameEvent[]): void {
  player.surrendered = true;
  for (const [id, u] of Object.entries(state.units)) if (u.owner === player.id) delete state.units[id];
  state.flights = state.flights.filter((f) => f.owner !== player.id);
  for (const planet of state.planets) {
    if (planet.economyId !== player.economyId) continue;
    // Ruins: buildings stay for whoever settles here first. A shared economy keeps the planet.
    if (state.players.some((p) => p !== player && p.economyId === player.economyId && !p.eliminated)) continue;
    planet.economyId = null;
    delete state.queues[planet.id];
  }
  events.push({ type: "surrendered", playerId: player.id });
  checkEliminations(state, events);
}

/** versus: marks players without inhabitants as eliminated and decides the game. */
export function checkEliminations(state: GameState, events: GameEvent[]): void {
  if (state.settings.mode !== "versus" || state.result) return;
  for (const p of activePlayers(state)) {
    if (!p.surrendered && peopleOf(state, p.id) > 0) continue;
    p.eliminated = true;
    p.offersDraw = false;
    // Nobody is left to win their captives back.
    for (const u of Object.values(state.units)) {
      if (u.originalOwner === p.id) {
        delete u.originalOwner;
        delete u.capturedTick;
      }
    }
    events.push({ type: "eliminated", playerId: p.id });
  }
  checkResult(state, events);
}

/** Decides a versus game: one player left wins; nobody left, or everyone left agreeing, is a draw. */
export function checkResult(state: GameState, events: GameEvent[]): void {
  if (state.settings.mode !== "versus" || state.result || state.players.length < 2) return;
  const active = activePlayers(state);
  if (active.length === 1) state.result = { winner: active[0]!.id };
  else if (active.length === 0 || active.every((p) => p.offersDraw)) state.result = { draw: true };
  if (state.result) events.push({ type: "gameOver", result: state.result });
}

/** Once per cycle: captives join their captor after a while; versus offers a draw after long peace. */
export function cycleChecks(state: GameState, events: GameEvent[]): void {
  if (state.settings.mode !== "versus") return;
  const assimilated = new Map<string, number>();
  const limit = RULES.captiveAssimilationCycles * ticksPerCycle(state);
  for (const u of Object.values(state.units)) {
    if (u.capturedTick === undefined || state.tick - u.capturedTick < limit) continue;
    delete u.originalOwner;
    delete u.capturedTick;
    assimilated.set(u.owner, (assimilated.get(u.owner) ?? 0) + 1);
  }
  for (const [playerId, count] of assimilated) events.push({ type: "assimilated", playerId, count });
  if (assimilated.size) checkEliminations(state, events);

  if (!state.drawSuggested && !state.result && activePlayers(state).length >= 2 && state.tick - state.lastCombatTick >= RULES.drawOfferCycles * ticksPerCycle(state)) {
    state.drawSuggested = true;
    events.push({ type: "drawSuggested" });
  }
}
