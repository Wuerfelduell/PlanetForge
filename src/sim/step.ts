import { BUILDINGS, RULES, type ResourceId } from "./content";
import { buildBlocker, cloneState, housing, NOT_AFFORDABLE, nextLevelThreshold, planetById, segmentOutput, TICK_MS, ticksPerCycle } from "./rules";
import { createUnit } from "./units";
import { grantPick, modified, resolveOffer } from "./discoveries";
import { placeBuilding } from "./build";
import { cycleChecks, landFlights } from "./space";
import { goalsCycle } from "./invaders";
import type { GameEvent, GameState, PlanetState } from "./state";

const DT = 1 / RULES.ticksPerSecond;

/**
 * Simulates in fixed ticks up to game time `now` (ms). Splitting the same interval into one or
 * many calls gives identical results. While the lobby is closed or paused the clock stands
 * still: simTime catches up with `now` but no tick runs. Never mutates the input.
 */
export function advance(state: GameState, now: number): GameState {
  return advanceWithEvents(state, now).state;
}

/** advance() plus the events of the ticks that ran, for UI feedback. */
export function advanceWithEvents(state: GameState, now: number): { state: GameState; events: GameEvent[] } {
  if (state.simTime + TICK_MS > now) return { state, events: [] };
  const next = cloneState(state);
  const events = advanceInPlace(next, now);
  appendLog(next, events);
  return { state: next, events };
}

/** Mutating variant for callers that already own a private copy. Does not write the log. */
export function advanceInPlace(state: GameState, now: number): GameEvent[] {
  const events: GameEvent[] = [];
  if (!state.lobby.open || state.lobby.paused) {
    state.simTime = Math.max(state.simTime, now);
    return events;
  }
  while (state.simTime + TICK_MS <= now) {
    stepInPlace(state, events);
    state.simTime += TICK_MS;
  }
  return events;
}

/** Keeps the last RULES.logLength events worth remembering (not the per-cycle tick). */
export function appendLog(state: GameState, events: GameEvent[]): void {
  for (const event of events) if (event.type !== "cycle") state.log.push({ tick: state.tick, event });
  if (state.log.length > RULES.logLength) state.log.splice(0, state.log.length - RULES.logLength);
}

/** Exactly one fixed tick. Deterministic: same state in, same state out. */
function stepInPlace(state: GameState, events: GameEvent[]): void {
  landFlights(state, events);

  // Workers per planet and segment, counted once per tick.
  const workers = new Map<string, number>();
  const residents = new Map<string, number>();
  for (const u of Object.values(state.units)) {
    residents.set(u.planetId, (residents.get(u.planetId) ?? 0) + 1);
    if (u.segment !== null) workers.set(`${u.planetId}:${u.segment}`, (workers.get(`${u.planetId}:${u.segment}`) ?? 0) + 1);
  }

  for (const planet of state.planets) {
    const economy = planet.economyId === null ? undefined : state.economies[planet.economyId];
    const rateFactor = economy?.starving ? RULES.starvingRateFactor : 1;

    for (const segment of planet.segments) {
      const producer = !!(segment.building && BUILDINGS[segment.building].produces);
      const output = economy ? segmentOutput(planet, segment, workers.get(`${planet.id}:${segment.index}`) ?? 0, economy) : {};
      const drawn = new Set<ResourceId>();
      for (const [resource, perSecond] of Object.entries(output) as [ResourceId, number][]) {
        let amount = perSecond * DT * rateFactor;
        // Producers (farm, pump, lab) create from nothing; everything else draws from the ground.
        const deposit = producer ? undefined : segment.deposits.find((d) => d.resource === resource);
        if (deposit && !deposit.infinite) {
          amount = Math.min(amount, deposit.amount);
          deposit.amount -= amount;
          drawn.add(resource);
          if (deposit.amount <= 1e-9) {
            deposit.amount = 0;
            events.push({ type: "depleted", planetId: planet.id, segment: segment.index, resource });
          }
        }
        economy!.resources[resource] += amount;
      }
      for (const d of segment.deposits) {
        // Exhausted deposits stay exhausted; untouched ones regrow.
        if (d.infinite || drawn.has(d.resource) || d.amount <= 0 || d.amount >= d.max) continue;
        d.amount = Math.min(d.max, d.amount + d.max * modified(economy, "regenRate", RULES.regenPerSecond) * DT);
      }
    }

    if (economy) birth(state, planet, residents.get(planet.id) ?? 0, events);
  }

  runQueues(state, events);

  state.tick += 1;
  if (state.tick % ticksPerCycle(state) === 0) endCycle(state, residents, events);
}

/** Starts the first queued build of each planet once it is affordable; drops orders that can no longer fit. */
function runQueues(state: GameState, events: GameEvent[]): void {
  for (const [planetId, queue] of Object.entries(state.queues)) {
    const planet = planetById(state, planetId);
    while (planet && queue.length > 0) {
      const order = queue[0]!;
      const segment = planet.segments[order.segment]!;
      const blocker = buildBlocker(state, planet, segment, order.building);
      if (blocker === NOT_AFFORDABLE) break;
      queue.shift();
      if (blocker) events.push({ type: "queueDropped", planetId, segment: order.segment, building: order.building, reason: blocker });
      else placeBuilding(state, planet, segment, order.building, order.playerId, events);
    }
  }
}

function birth(state: GameState, planet: PlanetState, residents: number, events: GameEvent[]): void {
  const economy = state.economies[planet.economyId!]!;
  if (residents === 0 || residents >= housing(state, planet) || economy.starving || economy.resources.food < RULES.birthFoodCost) return;
  planet.birthProgress += DT;
  if (planet.birthProgress < modified(economy, "birthTime", RULES.secondsPerBirth) - 1e-9) return;

  // The smallest people on the planet grows first (join order breaks ties), so nobody falls behind.
  const counts = new Map<string, number>();
  for (const u of Object.values(state.units)) if (u.planetId === planet.id) counts.set(u.owner, (counts.get(u.owner) ?? 0) + 1);
  const parents = state.players.filter((p) => counts.has(p.id));
  if (parents.length === 0) return;
  const parent = parents.reduce((a, b) => (counts.get(b.id)! < counts.get(a.id)! ? b : a));

  planet.birthProgress = 0;
  economy.resources.food -= RULES.birthFoodCost;
  const unitId = createUnit(state, parent.id, parent.people, planet.id);
  events.push({ type: "born", planetId: planet.id, playerId: parent.id, unitId });
}

function endCycle(state: GameState, residents: Map<string, number>, events: GameEvent[]): void {
  events.push({ type: "cycle", cycle: state.tick / ticksPerCycle(state) });

  for (const economy of Object.values(state.economies)) {
    const people = state.planets.filter((p) => p.economyId === economy.id).reduce((sum, p) => sum + (residents.get(p.id) ?? 0), 0);
    if (people === 0) continue;
    const upkeep = people * RULES.foodPerInhabitantPerCycle;
    if (economy.resources.food >= upkeep) {
      economy.resources.food -= upkeep;
      economy.starving = false;
    } else {
      economy.resources.food = 0;
      if (!economy.starving) events.push({ type: "starving", economyId: economy.id });
      economy.starving = true;
    }

    const a = economy.ascension;
    a.points += modified(economy, "ascensionPerCycle", people);
    for (let t = nextLevelThreshold(a.level); t !== null && a.points >= t; t = nextLevelThreshold(a.level)) {
      a.level += 1;
      events.push({ type: "levelUp", economyId: economy.id, level: a.level });
      grantPick(state, economy);
    }
    // The voting window closes with the cycle: most votes win, a tie decides nothing.
    resolveOffer(state, economy, true, events);
  }

  cycleChecks(state, events);
  goalsCycle(state, events);
}
