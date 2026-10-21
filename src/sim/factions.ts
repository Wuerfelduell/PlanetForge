import { BUILDINGS, RECIPES, RESOURCE_IDS, ROCKETS, RULES, type BuildingId, type ResourceId } from "./content";
import {
  activeFactions,
  atWar,
  checkFactionEliminations,
  checkTeamWipe,
  cycles,
  declareWar,
  FACTIONS,
  factionEconomy,
  makeOffer,
  sellable,
  setStance,
  shiftAttitude,
  strength,
  TEAM_ECONOMY,
  teamPlanets,
} from "./diplomacy";
import { placeBuilding } from "./build";
import { modified } from "./discoveries";
import { Rng } from "./rng";
import {
  asteroidsVisible,
  buildBlocker,
  buildingStats,
  foodUpkeepPerCycle,
  housing,
  idleUnits,
  launchBlocker,
  NOT_AFFORDABLE,
  nextUpgrade,
  paidFor,
  planetDefense,
  planetDistance,
  playerById,
  population,
  rocketCapacity,
  rocketUnlockLevel,
  segmentOutput,
  segmentRecipe,
  unitsOn,
  upgradeBlocker,
  workerCapacity,
  workerCount,
} from "./rules";
import { launch } from "./space";
import { TERRAFORM, terraform, terraformBlocker } from "./terraform";
import { cycleOf } from "./rules";
import type { EconomyState, FactionState, GameEvent, GameState, PlanetState, PlayerState, SegmentState, TerraformKind } from "./state";

/**
 * The AI factions' turn, once per cycle: each one runs its economy (workers, buildings,
 * discoveries), expands, keeps its mood toward the team up to date and acts on it (offers,
 * ultimatums, war, attacks, presents). Everything draws from the state's RNG, so it is as
 * deterministic as the rest of the simulation.
 */
export function factionsCycle(state: GameState, events: GameEvent[]): void {
  if (state.settings.factions === 0 || state.result) return;
  const rng = new Rng(state.rng);
  try {
    for (const faction of activeFactions(state)) {
      const player = playerById(state, faction.id);
      const economy = factionEconomy(state, faction);
      if (!player || !economy) continue;
      const planets = state.planets.filter((p) => p.economyId === economy.id);
      stipend(state, economy, planets);
      expireOffer(state, faction, events);
      for (const planet of planets) {
        build(state, faction, player, economy, planet, events);
        assignWorkers(state, faction, economy, planet);
      }
      vote(faction, economy, rng);
      mood(state, faction, economy, rng, events);
      if (faction.stance === "war") attack(state, faction, player, planets, rng, events);
      expand(state, faction, player, economy, planets, events);
    }
  } finally {
    state.rng = rng.seed;
  }
  checkFactionEliminations(state, events);
  checkTeamWipe(state, events);
}

/** A simple AI cannot plan like a human; the difficulty tops up its basics every cycle. */
function stipend(state: GameState, economy: EconomyState, planets: PlanetState[]): void {
  const per = FACTIONS.stipend[state.settings.difficulty] ?? FACTIONS.stipend.normal!;
  let people = 0;
  for (const p of planets) people += population(state, p);
  for (const r of ["food", "wood", "stone"] as const) economy.resources[r] += people * per;
  economy.resources.science += people * per * 0.25;
}

function expireOffer(state: GameState, faction: FactionState, events: GameEvent[]): void {
  const offer = faction.offer;
  if (!offer || state.tick < offer.expiresTick) return;
  faction.offer = null;
  if (offer.kind === "ultimatum") declareWar(state, faction, "ultimatumRefused", events);
  else shiftAttitude(faction, -3);
}

/** Buildings in the order a faction wants them; `housing` and `farm` repeat as it grows. */
const LADDER: BuildingId[] = [
  "farm",
  "housing",
  "mine",
  "sawmill",
  "housing",
  "workshop",
  "lab",
  "launchpad",
  "watchtower",
  "pump",
  "refinery",
  "housing",
  "foundry",
  "mine",
  "library",
  "pump",
  "glassworks",
  "housing",
  "observatory",
  "watchtower",
  "housing",
  "mine",
  "lab",
];

/** A mine or pump whose fields are empty: nothing to do here any more. */
function exhausted(planet: PlanetState, s: SegmentState, economy: EconomyState): boolean {
  const def = buildingStats(s);
  if (!def?.extracts || def.produces) return false;
  return Object.keys(segmentOutput(planet, s, 1, economy)).length === 0;
}

/** Tears down exhausted mines, like a player would, so the field is free again (half the cost comes back). */
function tidy(state: GameState, economy: EconomyState, planet: PlanetState, player: PlayerState, events: GameEvent[]): void {
  for (const s of planet.segments) {
    if (!s.building || !exhausted(planet, s, economy)) continue;
    const paid = paidFor(s);
    for (const r of RESOURCE_IDS) economy.resources[r] += Math.floor((paid[r] ?? 0) * modified(economy, "demolishRefund", RULES.demolishRefund));
    for (const u of unitsOn(state, planet.id)) if (u.segment === s.index) u.segment = null;
    s.building = null;
    s.builtBy = null;
    delete s.tier;
    events.push({ type: "demolished", planetId: planet.id, segment: s.index, playerId: player.id });
  }
}

/** Places at most one building per cycle (two on hard): what the planet needs most, if it fits and is affordable. */
function build(state: GameState, faction: FactionState, player: PlayerState, economy: EconomyState, planet: PlanetState, events: GameEvent[]): void {
  tidy(state, economy, planet, player, events);
  const builds = state.settings.difficulty === "hard" ? 2 : 1;
  for (let i = 0; i < builds; i++) {
    const wanted = wants(state, faction, economy, planet);
    let placed = false;
    for (const building of wanted) {
      const def = BUILDINGS[building];
      if (economy.ascension.level < def.unlockLevel) continue;
      let affordable = true;
      for (const segment of candidates(planet, building, economy)) {
        const blocker = buildBlocker(state, planet, segment, building);
        if (blocker === null) {
          placeBuilding(state, planet, segment, building, player.id, events);
          placed = true;
          break;
        }
        if (blocker === NOT_AFFORDABLE) affordable = false;
      }
      if (placed) break;
      // Saving up for something it needs: nothing cheaper gets built in the meantime.
      if (!affordable) break;
    }
    if (!placed) {
      upgradeHousing(state, planet, events, player);
      if (!candidates(planet, "housing", economy).some((s) => !buildBlocker(state, planet, s, "housing") || buildBlocker(state, planet, s, "housing") === NOT_AFFORDABLE)) makeLand(state, planet, player, events);
      return;
    }
  }
}

/**
 * Revealed, free segments, best first: fields with the deposits a mine or pump works on, then
 * plain land; forests last, so hand gathering keeps its wood.
 */
function candidates(planet: PlanetState, building: BuildingId, economy: EconomyState): SegmentState[] {
  const def = BUILDINGS[building];
  const score = (s: SegmentState) => {
    let n = s.biome === "forest" ? -1 : 0;
    // Ore it can dig, scarce ore (oil for the rockets) first.
    if (def.extracts) for (const d of s.deposits) if (def.extracts.resources.includes(d.resource) && (d.infinite || d.amount > 0)) n += (d.byHand ? 1 : 3) + (economy.resources[d.resource] < 20 ? 2 : 0);
    if (def.produces) for (const d of s.deposits) if (d.resource === def.produces.resource) n += 2;
    // Houses and workshops stay off the ore: those fields are for mines.
    if (!def.extracts && !def.produces) n -= s.deposits.filter((d) => !d.byHand && (d.infinite || d.amount > 0)).length * 2;
    return n;
  };
  return planet.segments.filter((s) => s.revealed && !s.building && !s.scorched).sort((a, b) => score(b) - score(a));
}

/** Boxed in by sea or swamp: fills in a revealed field so the colony can grow (a human would do the same). */
function makeLand(state: GameState, planet: PlanetState, player: PlayerState, events: GameEvent[]): void {
  const kinds: TerraformKind[] = ["fillClay", "fillSand", "drainSwamp", "thawGlacier", "coolLava"];
  for (const s of planet.segments) {
    if (!s.revealed || s.building) continue;
    for (const kind of kinds) {
      if (!TERRAFORM[kind].from.includes(s.biome) || terraformBlocker(state, planet, s, kind)) continue;
      terraform(state, planet, s, kind, player.id, events);
      return;
    }
  }
}

function wants(state: GameState, faction: FactionState, economy: EconomyState, planet: PlanetState): BuildingId[] {
  const pop = population(state, planet);
  const have = new Map<BuildingId, number>();
  for (const s of planet.segments) if (s.building && !exhausted(planet, s, economy)) have.set(s.building, (have.get(s.building) ?? 0) + 1);
  const out: BuildingId[] = [];
  const push = (b: BuildingId) => {
    if (!out.includes(b)) out.push(b);
  };
  // Grows only as fast as the difficulty allows, so a casual player is not buried.
  const cap = FACTIONS.popCap.base + cycleOf(state) * (FACTIONS.pace[state.settings.difficulty] ?? FACTIONS.pace.normal!);
  const total = state.planets.reduce((sum, p) => (p.economyId === economy.id ? sum + population(state, p) : sum), 0);
  if (pop >= housing(state, planet) - 1 && total < cap) push("housing");
  const farms = (have.get("farm") ?? 0) + (have.get("fishery") ?? 0);
  if (farms === 0 || economy.resources.food < foodUpkeepPerCycle(state, pop) * 3) {
    push("farm");
    push("fishery");
  }
  if (faction.stance === "war" || faction.attitude < 0) push("watchtower");
  const counted = new Map<BuildingId, number>();
  for (const b of LADDER) {
    counted.set(b, (counted.get(b) ?? 0) + 1);
    if ((have.get(b) ?? 0) < counted.get(b)!) push(b);
  }
  return total < cap ? out : out.filter((b) => b !== "housing");
}

function upgradeHousing(state: GameState, planet: PlanetState, events: GameEvent[], player: PlayerState): void {
  if (population(state, planet) < housing(state, planet) - 1) return;
  for (const s of planet.segments) {
    if (s.building !== "housing" || !nextUpgrade(s) || upgradeBlocker(state, planet, s)) continue;
    const economy = state.economies[planet.economyId!]!;
    const next = nextUpgrade(s)!;
    for (const r of RESOURCE_IDS) economy.resources[r] -= next.cost[r] ?? 0;
    s.tier = (s.tier ?? 1) + 1;
    events.push({ type: "upgraded", planetId: planet.id, segment: s.index, building: s.building, tier: s.tier, playerId: player.id });
    return;
  }
}

/**
 * Re-seats every inhabitant each cycle: the most useful work first, a few stay idle as
 * defenders (more at war). Deterministic and adapts to depleted fields and new buildings.
 */
function assignWorkers(state: GameState, faction: FactionState, economy: EconomyState, planet: PlanetState): void {
  const units = unitsOn(state, planet.id, faction.id);
  for (const u of units) u.segment = null;
  const reserve = faction.stance === "war" ? Math.max(2, Math.ceil(units.length * 0.3)) : faction.attitude < 0 ? 1 : 0;
  let free = units.length - reserve;
  if (free <= 0) return;
  const pop = population(state, planet);
  const foodLow = economy.resources.food < foodUpkeepPerCycle(state, pop) * 3;
  for (const s of planet.segments) {
    pickRecipe(s, economy);
    pickGather(s, economy, foodUpkeepPerCycle(state, pop));
  }
  const scored = planet.segments
    .map((s) => ({ s, score: workScore(planet, s, economy, foodLow) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  let next = 0;
  for (const { s } of scored) {
    const capacity = workerCapacity(s) - workerCount(state, planet, s.index);
    for (let i = 0; i < capacity && free > 0; i++) {
      units[next++]!.segment = s.index;
      free--;
    }
    if (free <= 0) break;
  }
}

/** Crafting buildings make whatever the stock is shortest of, as long as the inputs are there. */
function pickRecipe(s: SegmentState, economy: EconomyState): void {
  const crafts = buildingStats(s)?.crafts;
  if (!crafts) return;
  let best: { id: (typeof crafts.recipes)[number]; need: number } | null = null;
  for (const id of crafts.recipes) {
    const recipe = RECIPES[id];
    const inputs = Object.entries(recipe.inputs) as [ResourceId, number][];
    if (inputs.some(([r, v]) => economy.resources[r] < v * 5)) continue;
    const made = Object.keys(recipe.outputs)[0] as ResourceId;
    const need = economy.resources[made] / FACTIONS.stockTarget;
    if (!best || need < best.need) best = { id, need };
  }
  if (best) s.gather = best.id as ResourceId;
}

/** Hand gatherers collect what the stock is shortest of (fibers for cloth, sand for land, …). */
function pickGather(s: SegmentState, economy: EconomyState, foodPerCycle: number): void {
  if (s.building || !s.revealed) return;
  const target = (r: ResourceId) => (r === "food" ? Math.max(40, foodPerCycle * 4) : r === "wood" || r === "stone" ? 80 : FACTIONS.stockTarget);
  let best: { r: ResourceId; need: number } | null = null;
  for (const d of s.deposits) {
    if (!d.byHand || (!d.infinite && d.amount <= 0)) continue;
    const need = economy.resources[d.resource] / target(d.resource);
    if (!best || need < best.need) best = { r: d.resource, need };
  }
  if (best) s.gather = best.r;
}

function workScore(planet: PlanetState, s: SegmentState, economy: EconomyState, foodLow: boolean): number {
  if (!s.revealed || s.scorched || workerCapacity(s) === 0) return 0;
  const def = buildingStats(s);
  if (def?.crafts) {
    const recipe = RECIPES[segmentRecipe(s)!];
    // Only with the inputs in stock, and not when the shelf is already full.
    for (const [r, v] of Object.entries(recipe.inputs) as [ResourceId, number][]) if (economy.resources[r] < v * 5) return 0;
    const made = Object.keys(recipe.outputs)[0] as ResourceId;
    if (economy.resources[made] > FACTIONS.stockTarget * 2) return 1;
    return made === "planks" || made === "tools" ? 6 : 5;
  }
  const out = segmentOutput(planet, s, 1, economy);
  const resources = Object.keys(out) as ResourceId[];
  if (resources.length === 0) return 0;
  let score = 0;
  for (const r of resources) {
    if (r === "food") score = Math.max(score, foodLow ? 10 : economy.resources.food > 120 ? 1 : 4);
    else if (r === "wood") score = Math.max(score, economy.resources.wood < 80 ? 4 : 1);
    else if (r === "stone") score = Math.max(score, economy.resources.stone < 80 ? 4 : 1);
    else if (r === "science") score = Math.max(score, 3);
    else score = Math.max(score, economy.resources[r] < 60 ? 3 : 1);
  }
  return def ? score + 0.5 : score;
}

/** Discoveries: votes for one option (the sole member, so the choice stands at the end of the cycle). */
function vote(faction: FactionState, economy: EconomyState, rng: Rng): void {
  const offer = economy.offer;
  if (!offer || offer.votes[faction.id]) return;
  offer.votes[faction.id] = rng.pick(offer.options);
}

/** Attitude drifts, personalities act: ultimatums, wars, peace feelers, alliances, merges, presents. */
function mood(state: GameState, faction: FactionState, economy: EconomyState, rng: Rng, events: GameEvent[]): void {
  const own = strength(state, economy.id);
  const team = strength(state, TEAM_ECONOMY);
  const baseline = FACTIONS.baseline[faction.personality] + (faction.stance === "allied" ? 30 : 0) + Math.min(20, faction.trades * 2);
  shiftAttitude(faction, Math.sign(baseline - faction.attitude) * Math.min(1, Math.abs(baseline - faction.attitude)));
  if (faction.stance === "war") shiftAttitude(faction, -1);
  if (faction.personality === "warlord" && own > team * 1.3 && faction.stance !== "allied") shiftAttitude(faction, -2);

  const canOffer = state.tick >= faction.nextOfferTick && !faction.offer;
  const level = economy.ascension.level;
  const armed = level >= rocketUnlockLevel(economy, "combat") && state.planets.some((p) => p.economyId === economy.id && p.segments.some((s) => s.building === "launchpad"));
  const truce = state.tick < faction.truceUntilTick;

  switch (faction.stance) {
    case "peace": {
      const threshold = faction.personality === "warlord" ? FACTIONS.warAttitude.warlord : FACTIONS.warAttitude.other;
      if (faction.attitude <= threshold && armed && !truce) {
        declareWar(state, faction, "declaredWar", events);
        return;
      }
      if (!canOffer || truce) return;
      if (faction.personality === "warlord" && faction.attitude < -10 && own > team * 1.2 && armed) {
        // Demands what the team has most of.
        const teamEconomy = state.economies[TEAM_ECONOMY];
        if (!teamEconomy) return;
        const resource = FACTIONS.payment.reduce((a, b) => (teamEconomy.resources[b] > teamEconomy.resources[a] ? b : a));
        const amount = Math.max(10, Math.floor(teamEconomy.resources[resource] * 0.3));
        if (teamEconomy.resources[resource] >= amount) makeOffer(state, faction, "ultimatum", events, resource, amount);
        return;
      }
      const soon = faction.personality === "diplomat" ? 4 : 8;
      if (faction.attitude >= FACTIONS.allianceAttitude + 10 && state.tick - faction.stanceTick >= cycles(state, soon)) makeOffer(state, faction, "alliance", events);
      return;
    }
    case "war": {
      if (!canOffer) return;
      const losing = own < team * 0.6;
      const long = state.tick - faction.stanceTick >= cycles(state, 20);
      if ((losing || long) && faction.attitude > -70) makeOffer(state, faction, "peace", events);
      return;
    }
    case "allied": {
      const allied = state.tick - faction.stanceTick;
      // Every few cycles a present from the surplus.
      if (allied > 0 && allied % cycles(state, FACTIONS.giftEveryCycles) < cycles(state, 1)) present(state, faction, economy, rng, events);
      if (faction.attitude < 0) {
        setStance(state, faction, "peace", "brokenAlliance", events);
        return;
      }
      if (!canOffer) return;
      const ripe = allied >= cycles(state, FACTIONS.mergeAlliedCycles);
      if ((ripe && faction.attitude >= 90) || (ripe && own < team * 0.4 && faction.attitude >= FACTIONS.mergeAttitude - 20)) makeOffer(state, faction, "merge", events);
      return;
    }
    case "merged":
      return;
  }
}

function present(state: GameState, faction: FactionState, economy: EconomyState, rng: Rng, events: GameEvent[]): void {
  const team = state.economies[TEAM_ECONOMY];
  const spare = sellable(state, faction);
  if (!team || spare.length === 0) return;
  const resource = rng.pick(spare);
  const amount = Math.min(10, Math.floor(economy.resources[resource] - FACTIONS.keep));
  if (amount <= 0) return;
  economy.resources[resource] -= amount;
  team.resources[resource] += amount;
  events.push({ type: "factionGift", faction: faction.id, from: faction.id, resource, amount });
}

/** At war: every few cycles a combat rocket at the team planet that is easiest to take. */
function attack(state: GameState, faction: FactionState, player: PlayerState, planets: PlanetState[], rng: Rng, events: GameEvent[]): void {
  if (state.tick < faction.nextAttackTick) return;
  const every = faction.personality === "warlord" ? FACTIONS.attackEveryCycles.warlord : FACTIONS.attackEveryCycles.other;
  faction.nextAttackTick = state.tick + cycles(state, every);
  const economy = state.economies[player.economyId]!;
  const targets = teamPlanets(state)
    .filter((p) => atWar(state, p.economyId, economy.id))
    .map((p) => ({ p, defense: idleUnits(state, p).filter((u) => !playerById(state, u.owner)?.ai).length + planetDefense(state, p) }))
    .sort((a, b) => a.defense - b.defense);
  for (const from of planets) {
    const capacity = rocketCapacity(economy, "combat");
    const count = Math.min(capacity, idleUnits(state, from, player.id).length - 1);
    if (count < 3) continue;
    for (const { p: to } of targets) {
      if (launchBlocker(state, player.id, from, to, "combat", count)) continue;
      // A little hesitation keeps attacks from falling into a rhythm.
      if (rng.next() < 0.25) return;
      launch(state, player, from, to, "combat", count, events);
      return;
    }
  }
}

/** Colonizes the nearest free planet once the home planet is well populated. */
function expand(state: GameState, faction: FactionState, player: PlayerState, economy: EconomyState, planets: PlanetState[], events: GameEvent[]): void {
  if (economy.ascension.level < ROCKETS.colony.unlockLevel) return;
  const capacity = rocketCapacity(economy, "colony");
  const asteroids = asteroidsVisible(economy);
  for (const from of planets) {
    if (population(state, from) < 7 || idleUnits(state, from, player.id).length < capacity + 1) continue;
    const free = state.planets
      .filter((p) => p.economyId === null && (asteroids || p.type !== "asteroid"))
      .sort((a, b) => planetDistance(from, a) - planetDistance(from, b));
    for (const to of free) {
      if (launchBlocker(state, player.id, from, to, "colony", capacity)) continue;
      launch(state, player, from, to, "colony", capacity, events);
      return;
    }
  }
  void faction;
}
