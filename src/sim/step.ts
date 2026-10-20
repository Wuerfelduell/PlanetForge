import { BUILDINGS, RULES, type ResourceId } from "./content";
import { cloneState, housing, nextLevelThreshold, teamById, segmentOutput, TICK_MS, TICKS_PER_CYCLE } from "./rules";
import type { GameEvent, GameState } from "./state";

const DT = 1 / RULES.ticksPerSecond;

/**
 * Simulates in fixed ticks up to `now` (ms, same clock as createGame's `now`). Splitting the
 * same interval into one or many calls gives identical results. Never mutates the input.
 */
export function advance(state: GameState, now: number): GameState {
  return advanceWithEvents(state, now).state;
}

/** advance() plus the events of the ticks that ran, for UI feedback. */
export function advanceWithEvents(state: GameState, now: number): { state: GameState; events: GameEvent[] } {
  if (state.simTime + TICK_MS > now) return { state, events: [] };
  const next = cloneState(state);
  return { state: next, events: advanceInPlace(next, now) };
}

/** Mutating variant for callers that already own a private copy. */
export function advanceInPlace(state: GameState, now: number): GameEvent[] {
  const events: GameEvent[] = [];
  while (state.simTime + TICK_MS <= now) {
    stepInPlace(state, events);
    state.simTime += TICK_MS;
  }
  return events;
}

/** Exactly one fixed tick. Deterministic: same state in, same state out. */
function stepInPlace(state: GameState, events: GameEvent[]): void {
  for (const planet of state.planets) {
    const rateFactor = planet.starving ? RULES.starvingRateFactor : 1;
    for (const segment of planet.segments) {
      const output = segmentOutput(planet, segment);
      const drawn = new Set<ResourceId>();
      const producer = !!(segment.building && BUILDINGS[segment.building].produces);
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
        planet.resources[resource] += amount;
      }
      for (const d of segment.deposits) {
        // Exhausted deposits stay exhausted; untouched ones regrow.
        if (d.infinite || drawn.has(d.resource) || d.amount <= 0 || d.amount >= d.max) continue;
        d.amount = Math.min(d.max, d.amount + d.max * RULES.regenPerSecond * DT);
      }
    }

    if (planet.population < housing(planet) && !planet.starving && planet.resources.food >= RULES.birthFoodCost) {
      planet.birthProgress += DT;
      if (planet.birthProgress >= RULES.secondsPerBirth - 1e-9) {
        planet.birthProgress = 0;
        planet.population += 1;
        planet.resources.food -= RULES.birthFoodCost;
        events.push({ type: "born", planetId: planet.id, population: planet.population });
      }
    }
  }

  state.tick += 1;
  if (state.tick % TICKS_PER_CYCLE === 0) endCycle(state, events);
}

function endCycle(state: GameState, events: GameEvent[]): void {
  events.push({ type: "cycle", cycle: state.tick / TICKS_PER_CYCLE });

  for (const planet of state.planets) {
    if (planet.population === 0) continue;
    const upkeep = planet.population * RULES.foodPerInhabitantPerCycle;
    if (planet.resources.food >= upkeep) {
      planet.resources.food -= upkeep;
      planet.starving = false;
    } else {
      planet.resources.food = 0;
      if (!planet.starving) events.push({ type: "starving", planetId: planet.id });
      planet.starving = true;
    }
    const team = teamById(state, planet.teamId);
    if (team) team.ascension.points += planet.population;
  }

  for (const team of state.teams) {
    const a = team.ascension;
    for (let t = nextLevelThreshold(a.level); t !== null && a.points >= t; t = nextLevelThreshold(a.level)) {
      a.level += 1;
      events.push({ type: "levelUp", teamId: team.id, level: a.level });
    }
  }
}
