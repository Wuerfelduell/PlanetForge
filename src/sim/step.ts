import { RECIPES, RULES, type ResourceId } from "./content";
import {
  buildBlocker,
  buildingStats,
  cloneState,
  craftRate,
  energyDemand,
  energySupply,
  housing,
  settlersOutside,
  neighbors,
  NOT_AFFORDABLE,
  ascensionIncome,
  economyThreshold,
  foodUpkeepPerCycle,
  secondsPerBirth,
  planetById,
  segmentOutput,
  foodOutputMul,
  segmentRecipe,
  TICK_MS,
  ticksPerCycle,
  toolsWear,
} from "./rules";
import { createUnit } from "./units";
import { grantPick, modified, resolveOffer } from "./discoveries";
import { placeBuilding } from "./build";
import { cycleChecks, landFlights } from "./space";
import { goalsCycle } from "./invaders";
import { factionsCycle } from "./factions";
import { resolveVote } from "./diplomacy";
import { allPlanets, coreCycle, drill, shaftOpen, syncCores } from "./core";
import type { EconomyState, GameEvent, GameState, PlanetState } from "./state";

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
  syncCores(state);
  const planets = allPlanets(state);
  // Workers inside a planet sleep up on its surface (CORE): they count as its residents.
  const surfaceIds = new Map((state.cores ?? []).map((c) => [c.id, c.coreOf!]));

  // Workers per planet and segment, counted once per tick.
  const workers = new Map<string, number>();
  const residents = new Map<string, number>();
  for (const u of Object.values(state.units)) {
    const home = surfaceIds.get(u.planetId) ?? u.planetId;
    residents.set(home, (residents.get(home) ?? 0) + 1);
    if (u.segment !== null) workers.set(`${u.planetId}:${u.segment}`, (workers.get(`${u.planetId}:${u.segment}`) ?? 0) + 1);
  }

  // Power grids of this tick, read by every consumer below (powerFactor). A planet and its
  // interior share one grid.
  const grids = new Map<string, { supply: number; demand: number }>();
  for (const planet of planets) {
    const economy = planet.economyId === null ? undefined : state.economies[planet.economyId];
    const grid = grids.get(surfaceIds.get(planet.id) ?? planet.id) ?? { supply: 0, demand: 0 };
    const shut = planet.coreOf !== undefined && !shaftOpen(state, planet);
    for (const segment of planet.segments) {
      const working = shut ? 0 : (workers.get(`${planet.id}:${segment.index}`) ?? 0);
      grid.supply += energySupply(planet, segment, working, economy);
      grid.demand += energyDemand(segment, working);
    }
    grids.set(surfaceIds.get(planet.id) ?? planet.id, grid);
  }

  for (const planet of planets) {
    const economy = planet.economyId === null ? undefined : state.economies[planet.economyId];
    const rateFactor = economy?.starving ? RULES.starvingRateFactor : 1;
    const grid = grids.get(surfaceIds.get(planet.id) ?? planet.id)!;
    if (grid.supply > 0 || grid.demand > 0) planet.power = { ...grid };
    else delete planet.power;
    // Without the shaft nobody gets down or up: work inside stands still.
    if (planet.coreOf !== undefined && !shaftOpen(state, planet)) continue;

    // Forests next to a worked forester regrow faster, empty ones get replanted.
    const forested = new Map<number, { mul: number; replant: boolean }>();
    for (const segment of planet.segments) {
      const f = buildingStats(segment)?.forester;
      if (!f || !workers.get(`${planet.id}:${segment.index}`)) continue;
      for (const n of neighbors(planet, segment.index)) if (n.biome === "forest") forested.set(n.index, { mul: f.neighborRegenMul, replant: f.replantsDepleted });
    }

    for (const segment of planet.segments) {
      const def = buildingStats(segment);
      const working = workers.get(`${planet.id}:${segment.index}`) ?? 0;
      if (economy && def?.crafts) craft(planet, segment, working, economy, rateFactor);
      if (economy && segment.building === "core-drill") drill(state, planet, segment, working, economy, events);
      if (economy && def?.usesTools && working > 0 && toolsWear(economy)) {
        economy.resources.tools = Math.max(0, economy.resources.tools - (working * RULES.tools.perWorkerPerMinute * DT) / 60);
      }
      if (economy && def?.burns && working > 0) {
        const r = def.burns.resource;
        economy.resources[r] = Math.max(0, economy.resources[r] - def.burns.perSecond * Math.min(1, working / def.workers) * DT);
      }
      const made = def?.produces?.resource;
      const output = economy && !def?.crafts ? segmentOutput(planet, segment, working, economy) : {};
      const drawn = new Set<ResourceId>();
      for (const [resource, perSecond] of Object.entries(output) as [ResourceId, number][]) {
        // Hunger slows every job except getting food, so a hungry people can always eat its way out.
        let amount = perSecond * DT * (resource === "food" ? 1 : rateFactor);
        // Producers (farm, pump, lab) create from nothing; everything else draws from the ground.
        const deposit = resource === made ? undefined : segment.deposits.find((d) => d.resource === resource);
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
        const forester = d.resource === "wood" ? forested.get(segment.index) : undefined;
        // Inside a planet nothing grows back (CORE).
        if (planet.coreOf || segment.scorched || d.infinite || drawn.has(d.resource) || d.amount >= d.max || (d.amount <= 0 && !forester?.replant)) continue;
        d.amount = Math.min(d.max, d.amount + d.max * modified(economy, "regenRate", RULES.regenPerSecond) * (forester?.mul ?? 1) * DT);
      }
    }

    if (economy && !planet.coreOf) birth(state, planet, residents.get(planet.id) ?? 0, events);
  }

  runQueues(state, events);

  state.tick += 1;
  if (state.tick % ticksPerCycle(state) === 0) endCycle(state, residents, events);
}

/** One tick of a crafting building: as much of its recipe as workers and the stock allow. */
function craft(planet: PlanetState, segment: PlanetState["segments"][number], working: number, economy: GameState["economies"][string], rateFactor: number): void {
  const recipe = RECIPES[segmentRecipe(segment)!];
  let crafts = craftRate(planet, segment, working, economy) * DT * ("food" in recipe.outputs ? 1 : rateFactor);
  for (const [r, v] of Object.entries(recipe.inputs) as [ResourceId, number][]) crafts = Math.min(crafts, economy.resources[r] / v);
  if (crafts <= 0) return;
  for (const [r, v] of Object.entries(recipe.inputs) as [ResourceId, number][]) economy.resources[r] = Math.max(0, economy.resources[r] - v * crafts);
  for (const [r, v] of Object.entries(recipe.outputs) as [ResourceId, number][]) {
    economy.resources[r] += v * crafts * modified(economy, "buildingOutput", 1, { building: segment.building!, resource: r }) * foodOutputMul(r);
  }
  if (recipe.ascension) economy.ascension.points += recipe.ascension * crafts;
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
  if (planet.birthProgress < modified(economy, "birthTime", secondsPerBirth(state, residents)) - 1e-9) return;

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

/** Settlers outside on airless planets wear out suits; without any left, one of them dies per cycle. */
function breathe(state: GameState, economy: EconomyState, events: GameEvent[]): void {
  for (const planet of state.planets) {
    if (planet.economyId !== economy.id) continue;
    const outside = settlersOutside(state, planet);
    if (!outside.length) continue;
    const need = outside.length * RULES.suits.perInhabitantPerCycle;
    if (economy.resources.suits >= need) {
      economy.resources.suits -= need;
      continue;
    }
    economy.resources.suits = 0;
    delete state.units[outside[outside.length - 1]!.id];
    const left = Object.values(state.units).filter((u) => u.planetId === planet.id).length;
    events.push({ type: "suffocated", planetId: planet.id, left });
  }
}

function endCycle(state: GameState, residents: Map<string, number>, events: GameEvent[]): void {
  events.push({ type: "cycle", cycle: state.tick / ticksPerCycle(state) });
  coreCycle(state, events);

  for (const economy of Object.values(state.economies)) {
    const people = state.planets.filter((p) => p.economyId === economy.id).reduce((sum, p) => sum + (residents.get(p.id) ?? 0), 0);
    if (people === 0) continue;
    const upkeep = foodUpkeepPerCycle(state, people);
    if (economy.resources.food >= upkeep) {
      economy.resources.food -= upkeep;
      economy.starving = false;
    } else {
      economy.resources.food = 0;
      if (!economy.starving) events.push({ type: "starving", economyId: economy.id });
      economy.starving = true;
    }

    breathe(state, economy, events);

    const a = economy.ascension;
    // Inhabitants, upgraded buildings and monuments (rules.ts, also shown in the HUD).
    a.points += ascensionIncome(state, economy, people).total;
    // Food beyond the stock limit rots, so it cannot pile up for the rest of the game.
    economy.resources.food = Math.min(economy.resources.food, RULES.foodStock.base + RULES.foodStock.perCitizen * people);
    for (let t = economyThreshold(state, economy); t !== null && a.points >= t; t = economyThreshold(state, economy)) {
      a.level += 1;
      events.push({ type: "levelUp", economyId: economy.id, level: a.level });
      grantPick(state, economy);
    }
    // The voting window closes with the cycle: most votes win, a tie decides nothing.
    resolveOffer(state, economy, true, events);
  }

  cycleChecks(state, events);
  goalsCycle(state, events);
  // Team votes about factions close with the cycle too.
  for (const f of state.factions) resolveVote(state, f, true, events);
  factionsCycle(state, events);
}
