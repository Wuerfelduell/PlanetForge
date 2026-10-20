import { BUILDINGS, RULES, type ResourceId } from "./content";
import { housing, nextLevelThreshold, segmentOutput, TICKS_PER_CYCLE } from "./rules";
import type { GameState, SimEvent } from "./state";

const DT = 1 / RULES.ticksPerSecond;

/** Advances the simulation by exactly one fixed tick. Deterministic: same state in, same state out. */
export function step(state: GameState): SimEvent[] {
  const events: SimEvent[] = [];
  const rateFactor = state.starving ? RULES.starvingRateFactor : 1;

  for (const segment of state.planet.segments) {
    const output = segmentOutput(state, segment);
    const drawn = new Set<ResourceId>();
    const producer = !!(segment.building && BUILDINGS[segment.building].produces);
    for (const [resource, perSecond] of Object.entries(output) as [ResourceId, number][]) {
      let amount = perSecond * DT * rateFactor;
      // Producers (farm, well, lab) create from nothing; everything else draws from the ground.
      const deposit = producer ? undefined : segment.deposits.find((d) => d.resource === resource);
      if (deposit && !deposit.infinite) {
        amount = Math.min(amount, deposit.amount);
        deposit.amount -= amount;
        drawn.add(resource);
        if (deposit.amount <= 1e-9) {
          deposit.amount = 0;
          events.push({ type: "depleted", segment: segment.index, resource });
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
  return events;
}

function endCycle(state: GameState, events: SimEvent[]): void {
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
