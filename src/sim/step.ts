import { BUILDINGS, RULES, type ResourceId } from "./content";
import { cloneState, housing, nextLevelThreshold, segmentOutput, TICK_MS, TICKS_PER_CYCLE } from "./rules";
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
  const rateFactor = state.starving ? RULES.starvingRateFactor : 1;

  for (const planet of state.planets) {
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
        state.resources[resource] += amount;
      }
      for (const d of segment.deposits) {
        // Exhausted deposits stay exhausted; untouched ones regrow.
        if (d.infinite || drawn.has(d.resource) || d.amount <= 0 || d.amount >= d.max) continue;
        d.amount = Math.min(d.max, d.amount + d.max * RULES.regenPerSecond * DT);
      }
    }
  }

  if (state.population < housing(state) && !state.starving && state.resources.food >= RULES.birthFoodCost) {
    state.birthProgress += DT;
    if (state.birthProgress >= RULES.secondsPerBirth - 1e-9) {
      state.birthProgress = 0;
      state.population += 1;
      state.resources.food -= RULES.birthFoodCost;
      events.push({ type: "born", population: state.population });
    }
  }

  state.tick += 1;
  if (state.tick % TICKS_PER_CYCLE === 0) endCycle(state, events);
}

function endCycle(state: GameState, events: GameEvent[]): void {
  events.push({ type: "cycle", cycle: state.tick / TICKS_PER_CYCLE });

  const upkeep = state.population * RULES.foodPerInhabitantPerCycle;
  if (state.resources.food >= upkeep) {
    state.resources.food -= upkeep;
    state.starving = false;
  } else {
    state.resources.food = 0;
    if (!state.starving) events.push({ type: "starving" });
    state.starving = true;
  }

  state.ascension.points += state.population;
  for (let t = nextLevelThreshold(state.ascension.level); t !== null && state.ascension.points >= t; t = nextLevelThreshold(state.ascension.level)) {
    state.ascension.level += 1;
    events.push({ type: "levelUp", level: state.ascension.level });
  }
}
