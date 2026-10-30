/**
 * Playtest bot: plays the simulation (src/sim) headless and measures pacing, food, power, piled-up
 * resources and how far the late game (rockets, interior, warp) is reachable. Not part of the game.
 *
 *   npm run playtest -- '{"seed":"alpha","mode":"coop","players":1,"minutes":240,"out":"r01"}' <outdir>
 *
 * The bot plays every human of the game as one perfectly coordinated team. It decides every
 * DECIDE_SECONDS of game time: discoveries, builds, upgrades, workers, rockets, shield, defense.
 */
import {
  advanceWithEvents,
  applyCommand,
  BIOMES,
  BUILDINGS,
  buildBlocker,
  buildingStats,
  createGame,
  CORE,
  economyThreshold,
  foodUpkeepPerCycle,
  housing,
  launchBlocker,
  flightPlan,
  neighbors,
  nextUpgrade,
  NOT_AFFORDABLE,
  PLANET_TYPES,
  RECIPES,
  RESOURCE_IDS,
  ROCKETS,
  RULES,
  secondsPerBirth,
  segmentOutput,
  segmentRecipe,
  shieldBlocker,
  SUPERNOVA,
  terraformBlocker,
  upgradeBlocker,
  workerCapacity,
  needsSuits,
  craftRate,
  ringDistance,
  coreAccessBlocker,
  freeDeepSuits,
  energySupply,
  type BuildingId,
  type Command,
  type EconomyState,
  type GameEvent,
  type GameState,
  type PlanetState,
  type RecipeId,
  type ResourceId,
  type SegmentState,
} from "../../src/sim/index";
import { resourceValue } from "../../src/sim/diplomacy";
import { modified } from "../../src/sim/discoveries";
import { writeFileSync, mkdirSync } from "node:fs";

type Strategy = "smart" | "naive";
interface Cfg {
  seed: string;
  mode: "coop" | "versus";
  players: number;
  minutes: number;
  strategy?: Strategy;
  invaders?: "off" | "normal" | "strong";
  goal?: "endless" | "supernova";
  factions?: number;
  world?: Record<string, unknown>;
  /** versus: player index that attacks (others only defend). */
  aggressor?: number;
  /** Pull workers off a deposit before it runs dry (untouched deposits regrow, empty ones never). */
  careful?: boolean;
  out: string;
}

const cfg: Cfg = JSON.parse(process.argv[2]!);
const outDir = process.argv[3] ?? ".";
const DECIDE_SECONDS = 5;
const strategy: Strategy = cfg.strategy ?? "smart";

const PLAYERS = Array.from({ length: cfg.players }, (_, i) => ({ id: `p${i + 1}`, name: `Bot${i + 1}` }));
let g: GameState = createGame(cfg.seed, PLAYERS, {
  now: 0,
  mode: cfg.mode,
  invaders: cfg.invaders ?? "normal",
  goal: cfg.goal ?? "supernova",
  factions: cfg.factions ?? 0,
  world: cfg.world as never,
});
const now = () => g.simTime;
const minute = () => +(g.simTime / 60000).toFixed(1);

// ---------------------------------------------------------------- stats

const stats = {
  commands: 0,
  rejected: new Map<string, number>(),
  events: new Map<string, number>(),
  starvingCycles: 0,
  births: 0,
  deaths: 0,
  suffocated: 0,
  quakes: 0,
  eruptionKills: 0,
  depleted: 0,
  demolishedDead: 0,
  filled: 0,
  queueDropped: 0,
  buildingsDestroyed: 0,
  scorched: 0,
  invasions: 0,
  invasionsDefeated: 0,
  siegeRounds: 0,
  invaderKills: 0,
  colonies: 0,
  shieldBuilt: 0,
  launches: new Map<string, number>(),
  discoveries: [] as { minute: number; id: string }[],
};
const levelTimes: Record<string, Record<number, number>> = {};
const milestones: Record<string, number> = {};
const milestone = (key: string) => {
  if (!(key in milestones)) milestones[key] = minute();
};
/** Per economy: samples per minute. */
const timeline: Record<string, { minute: number; level: number; points: number; pop: number; planets: number; food: number; foodShare: number; idleShare: number; power: string; science: number }[]> = {};
const peak: Record<string, Partial<Record<ResourceId, number>>> = {};
/** Waiting: what the top wish waited for, in decision steps per missing resource. */
const waits: Record<string, Map<string, number>> = {};
const powerSamples = { planetMinutes: 0, deficitMinutes: 0, worstRatio: 1 };
const foodSamples = { minutes: 0, atCap: 0, workerShareSum: 0 };
const idleSamples = { sum: 0, n: 0 };

function count<K>(map: Map<K, number>, key: K, n = 1) {
  map.set(key, (map.get(key) ?? 0) + n);
}

function onEvents(events: GameEvent[]) {
  for (const e of events) {
    count(stats.events, e.type);
    switch (e.type) {
      case "levelUp":
        (levelTimes[e.economyId] ??= {})[e.level] = minute();
        break;
      case "starving":
        break;
      case "born":
        stats.births++;
        break;
      case "suffocated":
        stats.suffocated++;
        break;
      case "quake":
        stats.quakes += e.killed;
        break;
      case "eruption":
        stats.eruptionKills += e.killed;
        break;
      case "depleted":
        stats.depleted++;
        break;
      case "queueDropped":
        stats.queueDropped++;
        break;
      case "siege":
        stats.siegeRounds++;
        if (e.destroyed) stats.buildingsDestroyed++;
        stats.invaderKills += e.killed + e.defenderLosses;
        stats.scorched += e.scorched?.length ?? 0;
        break;
      case "invasionSpotted":
        break;
      case "invasionArrived":
        stats.invasions++;
        break;
      case "invasionDefeated":
        stats.invasionsDefeated++;
        break;
      case "landed":
        if (e.colonized) {
          stats.colonies++;
          milestone(`colony${stats.colonies}`);
        }
        break;
      case "shieldBuilt":
        if (!e.repaired) stats.shieldBuilt++;
        milestone(`shield${stats.shieldBuilt}`);
        break;
      case "shieldComplete":
        milestone("shieldComplete");
        break;
      case "discovered":
        stats.discoveries.push({ minute: minute(), id: e.discovery });
        break;
      case "built":
        milestone(`built:${e.building}`);
        break;
      case "upgraded":
        milestone(`upgraded:${e.building}:${e.tier}`);
        break;
      case "coreOpened":
        milestone("coreOpened");
        break;
      case "systemsFound":
        milestone("systemsFound");
        break;
      case "launched":
        count(stats.launches, e.rocket);
        milestone(`launch:${e.to === "sun" ? "shield" : e.rocket}`);
        break;
      case "gameOver":
        milestone("gameOver");
        break;
      case "battle":
        break;
    }
  }
}

function run(playerId: string, cmd: Command): boolean {
  stats.commands++;
  const r = applyCommand(g, playerId, cmd, now());
  if (!r.ok) {
    count(stats.rejected, `${cmd.type}: ${r.error}`);
    return false;
  }
  g = r.state;
  onEvents(r.events);
  return true;
}

// ---------------------------------------------------------------- helpers

const ownPlanets = (eid: string) => g.planets.filter((p) => p.economyId === eid);
const ownCores = (eid: string) => (g.cores ?? []).filter((p) => p.economyId === eid);
const unitsOn = (planetId: string) => Object.values(g.units).filter((u) => u.planetId === planetId);
const membersOf = (eid: string) => g.players.filter((p) => p.economyId === eid && !p.ai && !p.eliminated);
const playerOf = (eid: string) => membersOf(eid)[0]!;
const residentsOf = (p: PlanetState) => Object.values(g.units).filter((u) => u.planetId === p.id || (g.cores ?? []).some((c) => c.coreOf === p.id && c.id === u.planetId)).length;
const countB = (p: PlanetState, b: BuildingId) => p.segments.filter((s) => s.building === b).length;
const allOwnSegments = (eid: string) => [...ownPlanets(eid), ...ownCores(eid)].flatMap((p) => p.segments.map((s) => ({ p, s })));
const countAll = (eid: string, b: BuildingId) => allOwnSegments(eid).filter(({ s }) => s.building === b).length;
const value = (r: ResourceId) => Math.max(1, resourceValue(r));

/** Missing amounts of a cost. */
function missing(econ: EconomyState, cost: Partial<Record<ResourceId, number>>): Partial<Record<ResourceId, number>> {
  const out: Partial<Record<ResourceId, number>> = {};
  for (const [r, v] of Object.entries(cost) as [ResourceId, number][]) if (econ.resources[r] < v) out[r] = v - econ.resources[r];
  return out;
}

function adjacencyEstimate(planet: PlanetState, seg: SegmentState, b: BuildingId): number {
  const adj = BUILDINGS[b].adjacency;
  if (!adj) return 1;
  let mult = 1;
  for (const n of neighbors(planet, seg.index)) for (const a of adj) if ((a.biome && n.biome === a.biome) || (a.building && n.building === a.building)) mult += a.bonus;
  return Math.max(0, mult);
}

const NOISY: BuildingId[] = ["mine", "foundry", "refinery", "power-coal", "plastics"];
const QUIET: BuildingId[] = ["housing", "lab", "observatory", "datacenter"];

/** Usefulness of a field for a building; null = cannot go there. */
function siteScore(planet: PlanetState, seg: SegmentState, b: BuildingId, wantOres?: ResourceId[], explore = false): number | null {
  const blocker = buildBlocker(g, planet, seg, b);
  if (blocker && blocker !== NOT_AFFORDABLE) return null;
  if ((g.queues[planet.id] ?? []).some((q) => q.segment === seg.index)) return null;
  let score = adjacencyEstimate(planet, seg, b);
  const def = BUILDINGS[b];
  const has = (r: ResourceId) => seg.deposits.some((d) => d.resource === r && (d.infinite || d.amount > 0));
  const freeForests = planet.segments.filter((x) => x.revealed && x.biome === "forest" && !x.building).length;
  if (b === "mine" || b === "deep-drill" || b === "gem-mine" || b === "exo-drill" || b === "core-mine" || (b === "pump" && wantOres)) {
    const reach = def.extracts!.resources.filter((r) => has(r) && (b !== "mine" || !seg.deposits.find((d) => d.resource === r && (d as { tier?: number }).tier)));
    if (!reach.length) return null;
    if (wantOres) {
      const good = reach.filter((r) => wantOres.includes(r));
      if (!good.length) return null;
      score += (2 * good.length) / reach.length;
    }
    if (has("oil") && b !== "pump") score -= 3;
    if (seg.biome === "forest" && freeForests <= 5) score -= 2;
  } else {
    // Never build over the last field where stone can be picked by hand.
    const handStone = (x: SegmentState) => x.revealed && !x.building && x.deposits.some((d) => d.resource === "stone" && d.byHand && d.amount > 5);
    if (handStone(seg) && planet.segments.filter(handStone).length <= 1 && countB(planet, "mine") === 0) return null;
    // Keep the ground for what needs it.
    if (seg.biome === "forest" && b !== "farm") score -= freeForests <= 5 ? 3 : 1;
    if (has("oil") && b !== "pump") score -= 3;
    if (seg.biome === "mountains") score -= 1.5;
    if (seg.biome === "savanna" && b !== "farm") score -= 0.3;
    if (seg.deposits.some((d) => ["diamond", "emerald", "ruby", "platinum", "uranium", "aetherite", "antimatter", "neutronium", "xenocrystal"].includes(d.resource))) score -= 2;
  }
  if (b === "pump") score += has("oil") ? 2 : 0;
  // Noise.
  const ns = neighbors(planet, seg.index);
  if (NOISY.includes(b)) score -= 0.25 * ns.filter((n) => n.building && QUIET.includes(n.building)).length;
  if (QUIET.includes(b)) score -= 0.25 * ns.filter((n) => n.building && NOISY.includes(n.building)).length;
  // Building at the edge of the known land reveals more.
  const n = planet.segments.length;
  const reveals = planet.segments.filter((s) => !s.revealed && ringDistance(s.index, seg.index, n) <= RULES.buildRevealRadius).length;
  score += reveals ? 0.6 : 0;
  if (explore) score += reveals * 3 - (reveals ? 0 : 20);
  return score;
}

function bestSite(planet: PlanetState, b: BuildingId, wantOres?: ResourceId[], explore = false): SegmentState | null {
  let best: SegmentState | null = null;
  let bestScore = -Infinity;
  for (const s of planet.segments) {
    const sc = siteScore(planet, s, b, wantOres, explore);
    if (sc !== null && sc > bestScore) {
      bestScore = sc;
      best = s;
    }
  }
  return best;
}

/** Net flows per second (production minus crafting inputs, fuel burn, tools wear, food upkeep). */
function flows(eid: string): Partial<Record<ResourceId, number>> {
  const econ = g.economies[eid]!;
  const out: Partial<Record<ResourceId, number>> = {};
  const add = (r: ResourceId, v: number) => (out[r] = (out[r] ?? 0) + v);
  for (const p of [...ownPlanets(eid), ...ownCores(eid)]) {
    for (const s of p.segments) {
      const w = unitsOn(p.id).filter((u) => u.segment === s.index).length;
      if (!w) continue;
      for (const [r, v] of Object.entries(segmentOutput(p, s, w, econ)) as [ResourceId, number][]) add(r, v);
      const def = buildingStats(s);
      if (def?.crafts) {
        const rate = craftRate(p, s, w, econ);
        for (const [r, v] of Object.entries(RECIPES[segmentRecipe(s)!].inputs) as [ResourceId, number][]) add(r, -v * rate);
      }
      if (def?.burns) add(def.burns.resource, -def.burns.perSecond * Math.min(1, w / def.workers));
      if (def?.usesTools && econ.ascension.level >= RULES.tools.fromLevel) add("tools", (-w * RULES.tools.perWorkerPerMinute) / 60);
    }
  }
  const people = ownPlanets(eid).reduce((sum, p) => sum + residentsOf(p), 0);
  add("food", -foodUpkeepPerCycle(g, people) / g.settings.cycleSeconds);
  return out;
}

// ---------------------------------------------------------------- wishes

interface Wish {
  b: BuildingId;
  planet: PlanetState;
  ores?: ResourceId[];
  why: string;
  explore?: boolean;
}

/** Little known land left: put something cheap at the edge to see more (wood only). */
function exploreWish(p: PlanetState): Wish | null {
  const hidden = p.segments.filter((s) => !s.revealed).length;
  const free = p.segments.filter((s) => s.revealed && !s.building && BIOMES[s.biome].buildable).length;
  if (!hidden || free > 3) return null;
  for (const b of ["farm", "housing"] as BuildingId[]) {
    const site = bestSite(p, b, undefined, true);
    if (site && siteScore(p, site, b, undefined, true)! > -5) return { b, planet: p, why: "explore", explore: true };
  }
  return null;
}

/** Raw goods and the buildings that extract them. */
const MINE_ORES: ResourceId[] = ["stone", "iron", "copper", "clay", "coal", "tin", "bauxite", "ilmenite", "uranium", "aetherite", "sand", "gold", "silver"];

function producers(r: ResourceId): BuildingId[] {
  const out: BuildingId[] = [];
  for (const [id, def] of Object.entries(BUILDINGS) as [BuildingId, (typeof BUILDINGS)[BuildingId]][]) {
    const stages = [def, ...(def.upgrades ?? [])];
    if (stages.some((d) => d.produces?.resource === r || d.crafts?.recipes.some((x) => (RECIPES[x].outputs as Record<string, number>)[r]))) out.push(id);
  }
  return out;
}

/** Ores a resource chain needs from the ground. */
function chainOres(r: ResourceId, depth = 0, seen = new Set<ResourceId>()): ResourceId[] {
  if (seen.has(r) || depth > 4) return [];
  seen.add(r);
  if (MINE_ORES.includes(r) && !["sand", "clay", "stone"].includes(r)) return [r];
  const recipe = Object.values(RECIPES).find((x) => r in x.outputs && !("food" in x.inputs && r === "coal"));
  if (!recipe) return MINE_ORES.includes(r) ? [r] : [];
  return Object.keys(recipe.inputs).flatMap((x) => chainOres(x as ResourceId, depth + 1, seen));
}

/** Home planet build list in priority order (only the first unmet entries matter). */
function homeWishes(eid: string, home: PlanetState, need: Partial<Record<ResourceId, number>>): Wish[] {
  const econ = g.economies[eid]!;
  const L = econ.ascension.level;
  const pop = residentsOf(home);
  const cap = housing(g, home);
  const wishes: Wish[] = [];
  const want = (b: BuildingId, n: number, why: string, ores?: ResourceId[]) => {
    if (BUILDINGS[b].unlockLevel > L) return;
    if (countB(home, b) < n) wishes.push({ b, planet: home, why, ores });
  };
  const fl = flows(eid);
  const foodNeed = foodUpkeepPerCycle(g, pop) / g.settings.cycleSeconds;
  const foodCapacity = foodSlotsCapacity(eid, home);

  if (strategy === "naive") {
    if (foodCapacity < foodNeed * 1.3 + 0.2) want("farm", countB(home, "farm") + 1, "food");
    if (pop >= cap - 1) want("housing", countB(home, "housing") + 1, "space");
    want("mine", 1, "stone", ["stone"]);
    want("launchpad", L >= 4 ? 1 : 0, "space");
    return wishes;
  }

  const ex = exploreWish(home);
  if (ex) wishes.push(ex);
  // Food first: farms while the farm slots can't feed the people plus growth.
  if (foodCapacity < foodNeed * 1.35 + 0.3) {
    const fishSite = bestSite(home, "fishery");
    const farmSite = bestSite(home, "farm");
    if (farmSite) want("farm", countB(home, "farm") + 1, "food");
    else if (fishSite) want("fishery", countB(home, "fishery") + 1, "food");
    else want("hydro-farm", countB(home, "hydro-farm") + 1, "food");
  }
  if (pop >= cap - 1 && !hutUpgradeAvailable(home, econ)) want("housing", countB(home, "housing") + 1, "space");
  want("forester", L >= 1 ? 1 : 0, "wood");
  want("mine", 1, "stone", ["stone", "iron"]);
  want("sawmill", 1, "planks");
  if (bestSite(home, "pump", ["oil"])) want("pump", countB(home, "pump") + (home.segments.some((x) => x.building === "pump" && x.deposits.some((d) => d.resource === "oil" && d.amount > 0)) ? 0 : 1), "oil", ["oil"]);
  want("workshop", 1, "tools");
  want("lab", 1, "science");
  want("mine", oreMinesWanted(eid, home, need), "ores", oreWants(eid, home, need));
  want("launchpad", L >= 3 ? 1 : 0, "space");
  want("refinery", L >= 3 ? 1 : 0, "fuel");
  want("foundry", 1, "bricks");
  want("glassworks", 1, "glass");
  want("library", 1, "science");
  want("watchtower", L >= 4 ? 1 : 0, "defense");
  want("smelter", 1, "bronze");
  want("bell-tower", 1, "ascension");
  want("biogas-plant", 1, "biogas");
  want("observatory", 1, "science");
  want("battery", L >= 5 ? Math.min(6, 2 + Math.floor(g.wave / 2)) : 0, "invaders");
  want("treasury", 1, "ascension");
  want("plastics", 1, "plastic");
  want("lab", L >= 5 ? 2 : 1, "science");
  want("gem-mine", 1, "gems");
  want("electronics", 1, "electronics");
  want("workshop", L >= 6 ? 2 : 1, "tools");
  want("sawmill", L >= 6 ? 2 : 1, "planks");
  want("foundry", L >= 6 ? 3 : L >= 4 ? 2 : 1, "steel+charcoal");
  want("forester", L >= 4 ? 2 : 1, "wood");
  want("flak", L >= 6 ? 1 : 0, "invaders");
  want("missile-launcher", 1, "invaders");
  want("ruby-laser", econ.resources.ruby >= 2 ? 1 : 0, "invaders");
  want("monument", 1, "ascension");
  want("datacenter", 1, "science");
  want("prism-dome", econ.resources.emerald >= 2 ? 1 : 0, "science");
  want("crystal-palace", 1, "ascension");
  want("shield-generator", 1, "invaders");
  want("core-drill", 1, "interior");
  want("ion-cannon", 1, "invaders");
  want("warpgate", 1, "warp");
  want("xeno-lab", econ.resources.xenocrystal >= 12 ? 1 : 0, "science");
  want("quantum-lab", econ.resources["deep-quartz"] >= 6 ? 1 : 0, "science");
  want("warp-core", econ.resources["deep-quartz"] >= 8 ? 1 : 0, "warp");
  want("shell-armor", econ.resources.neutronium >= 20 ? 1 : 0, "shield");
  want("core-armor", econ.resources["core-iron"] >= 10 ? 1 : 0, "shield");
  want("power-antimatter", econ.resources.antimatter >= 10 ? 1 : 0, "power");
  // Power: one more plant whenever the grid is short.
  const pw = home.power;
  if (pw && pw.demand > pw.supply * 0.95 && countB(home, "power-wind") + countB(home, "power-solar") + countB(home, "power-coal") + countB(home, "power-atomic") + countB(home, "power-tower") + countB(home, "power-gas") < 8) {
    const plant = bestPowerPlant(eid, home);
    if (plant) wishes.unshift({ b: plant, planet: home, why: "power" });
  }
  // Bottlenecks: a needed good whose producers are all full gets one more producer.
  for (const [r, n] of Object.entries(need) as [ResourceId, number][]) {
    if (n < 1 || (fl[r] ?? 0) > 0.05) continue;
    const makers = producers(r).filter((b) => BUILDINGS[b].unlockLevel <= L && b !== "treasury");
    const built = home.segments.filter((s) => s.building && makers.includes(s.building));
    const full = built.every((s) => unitsOn(home.id).filter((u) => u.segment === s.index).length >= workerCapacity(s));
    if (built.length && full && built.length < 4 && !["food", "science"].includes(r)) wishes.push({ b: built[0]!.building!, planet: home, why: `bottleneck ${r}` });
  }
  return wishes;
}

function hutUpgradeAvailable(p: PlanetState, econ: EconomyState): boolean {
  return p.segments.some((s) => s.building === "housing" && nextUpgrade(s) && nextUpgrade(s)!.unlockLevel <= econ.ascension.level);
}

function bestPowerPlant(eid: string, p: PlanetState): BuildingId | null {
  const econ = g.economies[eid]!;
  const L = econ.ascension.level;
  const options: BuildingId[] = [];
  if (L >= 8 && econ.resources.uranium > 20) options.push("power-atomic");
  if (L >= 6 && econ.resources.silver >= 4 && econ.resources.aluminium >= 10) options.push("power-tower");
  if (L >= 6) options.push("power-solar");
  if (L >= 4 && (econ.resources.coal > 20 || allOwnSegments(eid).some(({ s }) => s.deposits.some((d) => d.resource === "coal" && d.amount > 0)))) options.push("power-coal");
  if (L >= 5 && econ.resources.biogas > 10) options.push("power-gas");
  options.push("power-wind");
  for (const b of options) if (BUILDINGS[b].unlockLevel <= L && bestSite(p, b)) return b;
  return null;
}

/** Ores wanted from the ground right now and not mined yet. */
function oreWants(eid: string, p: PlanetState, need: Partial<Record<ResourceId, number>>): ResourceId[] {
  const mined = new Set<ResourceId>();
  for (const s of p.segments) {
    const def = buildingStats(s);
    if (def?.extracts) for (const d of s.deposits) if (def.extracts.resources.includes(d.resource) && d.amount > 0) mined.add(d.resource);
  }
  const L = g.economies[eid]!.ascension.level;
  const base: ResourceId[] = ["stone", "iron", "copper"];
  if (L >= 3) base.push("coal", "clay");
  if (L >= 4) base.push("tin", "bauxite");
  if (L >= 6) base.push("ilmenite");
  if (L >= 7) base.push("uranium", "aetherite");
  const wanted = new Set<ResourceId>([...base, ...(Object.keys(need) as ResourceId[]).flatMap((r) => chainOres(r))]);
  return [...wanted].filter((r) => MINE_ORES.includes(r) && !mined.has(r) && r !== "gold" && r !== "silver");
}

function oreMinesWanted(eid: string, p: PlanetState, need: Partial<Record<ResourceId, number>>): number {
  const ores = oreWants(eid, p, need);
  const L = g.economies[eid]!.ascension.level;
  const mines = countB(p, "mine");
  if (mines >= 2 + Math.floor(L / 2)) return mines;
  return mines + (ores.length && bestSite(p, "mine", ores) ? 1 : 0);
}

/** Exhausted deposits never come back: a mine on an empty field only takes up space. */
function demolishDead(eid: string) {
  for (const p of [...ownPlanets(eid), ...ownCores(eid)]) {
    for (const s of p.segments) {
      const def = buildingStats(s);
      if (!def?.extracts || def.produces) continue;
      if (s.deposits.some((d) => def.extracts!.resources.includes(d.resource) && (d.infinite || d.amount > 0))) continue;
      stats.demolishedDead++;
      run(playerOf(eid).id, { type: "demolish", planetId: p.id, segment: s.index });
    }
  }
}

/** Food per second the food slots of a planet give when fully staffed. */
function foodSlotsCapacity(eid: string, p: PlanetState): number {
  const econ = g.economies[eid]!;
  let total = 0;
  for (const s of p.segments) {
    if (!s.building) continue;
    const out = segmentOutput(p, s, workerCapacity(s), econ).food ?? 0;
    total += out;
  }
  return total;
}

function colonyWishes(eid: string, p: PlanetState): Wish[] {
  const econ = g.economies[eid]!;
  const L = econ.ascension.level;
  const pop = residentsOf(p);
  const wishes: Wish[] = [];
  const want = (b: BuildingId, n: number, why: string, ores?: ResourceId[]) => {
    if (BUILDINGS[b].unlockLevel > L) return;
    if (countB(p, b) < n) wishes.push({ b, planet: p, why, ores });
  };
  const foodNeed = foodUpkeepPerCycle(g, pop) / g.settings.cycleSeconds;
  const ex = exploreWish(p);
  if (ex) wishes.push(ex);
  if (foodSlotsCapacity(eid, p) < foodNeed * 1.2 + 0.2) {
    if (bestSite(p, "farm")) want("farm", countB(p, "farm") + 1, "food");
    else if (bestSite(p, "fishery")) want("fishery", countB(p, "fishery") + 1, "food");
    else want("hydro-farm", countB(p, "hydro-farm") + 1, "food");
  }
  if (pop >= housing(g, p) - 1 && !hutUpgradeAvailable(p, econ)) want("housing", countB(p, "housing") + 1, "space");
  // Rare ground: platinum, gems, exotic matter.
  const has = (r: ResourceId) => p.segments.some((s) => s.revealed && s.deposits.some((d) => d.resource === r && d.amount > 0));
  if (has("platinum")) want("deep-drill", 1, "platinum", ["platinum"]);
  if (["antimatter", "neutronium", "xenocrystal"].some((r) => has(r as ResourceId))) want("exo-drill", 2, "exotic", ["antimatter", "neutronium", "xenocrystal"]);
  if (["diamond", "emerald", "ruby"].some((r) => has(r as ResourceId))) want("gem-mine", 1, "gems");
  want("mine", 1, "ores", ["iron", "copper", "tin", "bauxite", "ilmenite", "coal", "uranium", "aetherite", "stone"]);
  want("lab", 1, "science");
  const pw = p.power;
  const consumers = p.segments.reduce((n, x) => n + Math.max(0, -(buildingStats(x)?.energy ?? 0)), 0);
  if (consumers > 0 && (!pw || pw.supply < Math.max(pw.demand, consumers * 0.6))) {
    const plant = bestPowerPlant(eid, p);
    if (plant) wishes.unshift({ b: plant, planet: p, why: "power" });
  }
  if (needsSuits(p)) want("workshop", 1, "suits");
  return wishes;
}

// ---------------------------------------------------------------- needs

/** How much each good is wanted now (0 = only for piling up). */
function computeNeeds(eid: string, wishes: Wish[]): Partial<Record<ResourceId, number>> {
  const econ = g.economies[eid]!;
  const need: Partial<Record<ResourceId, number>> = {};
  const add = (r: ResourceId, v: number) => (need[r] = Math.min(20, (need[r] ?? 0) + v));
  wishes.slice(0, 6).forEach((w, i) => {
    for (const [r, v] of Object.entries(missing(econ, BUILDINGS[w.b].cost)) as [ResourceId, number][]) add(r, (6 - i) * 0.7 * Math.min(3, 0.5 + v / 10));
  });
  const L = econ.ascension.level;
  if (L >= 2 && econ.resources.tools < 15) add("tools", 3);
  if (econ.resources.wood < 40) add("wood", 2);
  for (const p of ownPlanets(eid)) {
    const wet = boxedIn(p);
    if (wet) add(wet.biome === "glacier" ? "wood" : econ.resources.clay > econ.resources.sand ? "clay" : "sand", 4);
  }
  if (econ.resources.planks < 20 && L >= 1) add("planks", 1);
  if (econ.resources.stone < 40) add("stone", 1);
  if (econ.resources.science < 300 || econ.offer) add("science", 1 + (econ.offer ? 1 : 0));
  // Rockets and shield.
  if (spaceWanted(eid)) {
    for (const [r, v] of Object.entries(missing(econ, { ...ROCKETS.colony.cost, fuel: 30 })) as [ResourceId, number][]) add(r, Math.min(2, v / 10));
  }
  if (g.sun.novaTick !== null && L >= SUPERNOVA.unlockLevel && !g.sun.saved && cfg.mode === "coop") {
    for (const [r, v] of Object.entries(missing(econ, { ...SUPERNOVA.segmentCost, fuel: 30 })) as [ResourceId, number][]) add(r, Math.min(3, v / 10));
  }
  // Power plant fuel.
  for (const { s } of allOwnSegments(eid)) {
    const def = buildingStats(s);
    if (def?.burns && econ.resources[def.burns.resource] < 30) add(def.burns.resource, 2);
  }
  if (ownPlanets(eid).some((p) => needsSuits(p)) && econ.resources.suits < 5) add("suits", 3);
  if (ownCores(eid).length && freeDeepSuits(g, econ) < 2) add("deep-suit", 3);
  if (L >= 9 && !milestones["coreOpened"]) for (const r of ["titanium", "platinum", "concrete", "steel", "electronics"] as ResourceId[]) add(r, 1);
  if (L >= 10 && !milestones["built:warpgate"]) for (const r of ["titanium", "computer", "aetherite", "steel"] as ResourceId[]) add(r, 1);
  if (L >= 10 && milestones["built:warpgate"]) for (const r of ["titanium", "computer"] as ResourceId[]) add(r, 1);
  // Chains: a wanted good makes its inputs wanted too (if they run short).
  for (let pass = 0; pass < 3; pass++) {
    for (const [r, v] of Object.entries(need) as [ResourceId, number][]) {
      const coalLeft = allOwnSegments(eid).some(({ s }) => s.building && buildingStats(s)?.extracts && s.deposits.some((d) => d.resource === "coal" && d.amount > 1));
      const recipe = Object.entries(RECIPES).find(([id, x]) => r in x.outputs && !id.startsWith("tribute") && (id !== "charcoal" || !coalLeft) && id !== "bioplastic" && id !== "ember-fuel" && id !== "neutron-steel" && id !== "quantum-chip");
      if (!recipe) continue;
      for (const [i, n] of Object.entries(recipe[1].inputs) as [ResourceId, number][]) if (econ.resources[i] < n * 15) add(i, v * 0.5);
    }
  }
  return need;
}

// ---------------------------------------------------------------- workers

interface Slot {
  planet: PlanetState;
  seg: SegmentState;
  cap: number;
  score: number;
  outputs: ResourceId[];
  food: number;
  gather?: ResourceId;
  recipe?: RecipeId;
}

function isMilitary(def: ReturnType<typeof buildingStats>): boolean {
  return !!def && (!!def.battery || !!def.shield || !!def.silo || !!def.antiMissile || !!def.radar || !!def.attack);
}

/** Recipe a crafting building should run now. */
function chooseRecipe(eid: string, s: SegmentState, need: Partial<Record<ResourceId, number>>): RecipeId | null {
  const econ = g.economies[eid]!;
  const crafts = buildingStats(s)?.crafts;
  if (!crafts) return null;
  let best: RecipeId | null = null;
  let bestScore = 0;
  for (const id of crafts.recipes) {
    const rec = RECIPES[id];
    if (!(Object.entries(rec.inputs) as [ResourceId, number][]).every(([r, n]) => econ.resources[r] >= n * 2)) continue;
    // Keep the rare stuff for its real use.
    if (id === "tribute-aetherite" && econ.resources.aetherite < 60) continue;
    if (id === "tribute-gold" && econ.resources.gold < 15) continue;
    if (id === "tribute-silver" && econ.resources.silver < 15) continue;
    if (id === "tribute-quartz" && econ.resources["deep-quartz"] < 20) continue;
    if (id === "charcoal" && econ.resources.wood < 9) continue;
    if (id === "biogas" && econ.resources.food < 150) continue;
    if (id === "ember-fuel" && econ.resources["ember-crystal"] < 10) continue;
    let sc = 0;
    for (const [r, n] of Object.entries(rec.outputs) as [ResourceId, number][]) sc += n * value(r) * (0.2 + (need[r] ?? 0)) * stockDamp(econ, r, need);
    if (rec.ascension) sc += rec.ascension * 3;
    sc /= rec.seconds;
    if (sc > bestScore) {
      bestScore = sc;
      best = id;
    }
  }
  return best;
}

/** Piles beyond what anyone needs are worth little. */
function stockDamp(econ: EconomyState, r: ResourceId, need: Partial<Record<ResourceId, number>>): number {
  if ((need[r] ?? 0) > 0) return 1;
  const v = econ.resources[r];
  if (r === "science") return v > 600 ? 0 : 1;
  const cap = 400 / Math.sqrt(value(r));
  return v > cap ? 0.1 : 1;
}

function slotsFor(eid: string, planet: PlanetState, need: Partial<Record<ResourceId, number>>, siegeHere: boolean, drilling: boolean): Slot[] {
  const econ = g.economies[eid]!;
  const slots: Slot[] = [];
  const powerShort = planet.power ? planet.power.supply < planet.power.demand : false;
  for (const s of planet.segments) {
    if (!s.revealed) continue;
    const cap = workerCapacity(s);
    if (cap <= 0) continue;
    const def = buildingStats(s);
    if (!def) {
      // Hand gathering: the most needed deposit here.
      let best: ResourceId | null = null;
      let bestScore = 0;
      for (const d of s.deposits) {
        if (!d.byHand || !(d.infinite || d.amount > (cfg.careful ? 3 : 1))) continue;
        if (d.resource === "food") continue;
        const sc = RULES.handRatePerWorker * value(d.resource) * (0.15 + (need[d.resource] ?? 0)) * stockDamp(econ, d.resource, need);
        if (sc > bestScore) {
          bestScore = sc;
          best = d.resource;
        }
      }
      const food = s.deposits.find((d) => d.resource === "food" && d.byHand && (d.infinite || d.amount > 1));
      const foodRate = food ? modified(econ, "handGatherRate", RULES.handRatePerWorker) * RULES.foodOutputMul : 0;
      if (best) slots.push({ planet, seg: s, cap, score: bestScore * 0.8, outputs: [best], food: 0, gather: best });
      if (food) slots.push({ planet, seg: s, cap, score: 0, outputs: ["food"], food: foodRate, gather: "food" });
      continue;
    }
    const one = segmentOutput(planet, s, 1, econ);
    if (s.building === "core-drill") {
      if (drilling) slots.push({ planet, seg: s, cap, score: 50, outputs: [], food: 0 });
      continue;
    }
    if (isMilitary(def)) {
      if (siegeHere) slots.push({ planet, seg: s, cap, score: 100, outputs: [], food: 0 });
      continue;
    }
    if (def.forester) {
      slots.push({ planet, seg: s, cap, score: 4 * (0.3 + (need.wood ?? 0)), outputs: [], food: 0 });
      continue;
    }
    if (def.energy && def.energy > 0) {
      if (powerShort && (!def.burns || econ.resources[def.burns.resource] > 1)) slots.push({ planet, seg: s, cap, score: 60, outputs: [], food: 0 });
      continue;
    }
    if (def.crafts) {
      const recipe = chooseRecipe(eid, s, need);
      if (!recipe) continue;
      const rec = RECIPES[recipe];
      const rate = craftRate(planet, s, 1, econ);
      let sc = 0;
      for (const [r, n] of Object.entries(rec.outputs) as [ResourceId, number][]) sc += n * rate * value(r) * (0.2 + (need[r] ?? 0)) * stockDamp(econ, r, need);
      if (rec.ascension) sc += rec.ascension * rate * 3;
      // Crafting into a pile only burns the inputs.
      if (!rec.ascension && (Object.keys(rec.outputs) as ResourceId[]).every((r) => stockDamp(econ, r, need) < 1)) continue;
      const food = (rec.outputs as Partial<Record<ResourceId, number>>).food ? (rec.outputs.food ?? 0) * rate : 0;
      slots.push({ planet, seg: s, cap, score: food ? 0 : sc, outputs: Object.keys(rec.outputs) as ResourceId[], food, recipe });
      continue;
    }
    if (one.food) {
      slots.push({ planet, seg: s, cap, score: 0, outputs: ["food"], food: one.food });
      continue;
    }
    if (cfg.careful && def.extracts && s.deposits.some((d) => def.extracts!.resources.includes(d.resource) && !d.infinite && d.amount > 0 && d.amount < 3)) continue;
    let sc = 0;
    for (const [r, v] of Object.entries(one) as [ResourceId, number][]) sc += v * value(r) * (0.2 + (need[r] ?? 0)) * stockDamp(econ, r, need);
    if (sc > 0) slots.push({ planet, seg: s, cap, score: sc, outputs: Object.keys(one) as ResourceId[], food: 0 });
  }
  return slots;
}

/**
 * Decides who works where on a planet (plus its interior), then sends only the changes.
 * Food first (enough for upkeep and growth), then power, then by value of what is needed.
 */
function assignWorkers(eid: string, planet: PlanetState, need: Partial<Record<ResourceId, number>>, extraFood = 0): number {
  const econ = g.economies[eid]!;
  const core = (g.cores ?? []).find((c) => c.coreOf === planet.id && c.economyId === eid);
  const siegeHere = !!g.invasion && g.invasion.target === planet.id && (g.invasion.sieging || g.invasion.arrivalTick - g.tick < 600);
  const drilling = !core && countB(planet, "core-drill") > 0;
  const units = unitsOn(planet.id).concat(core ? unitsOn(core.id) : []);
  const total = units.length;
  let slots = slotsFor(eid, planet, need, siegeHere, drilling);
  // Interior: only as many as there are deep suits.
  let coreBudget = core ? freeDeepSuits(g, econ) + unitsOn(core.id).length : 0;
  if (core) for (const s of slotsFor(eid, core, need, false, false)) slots.push(s);

  const desired = new Map<string, number>();
  const key = (s: Slot) => `${s.planet.id}:${s.seg.index}`;
  let left = total;
  // During a siege keep a few idle defenders (they duel the escorts).
  const keepIdle = siegeHere ? Math.min(10, Math.floor(total / 3)) : 0;
  left -= keepIdle;
  const take = (s: Slot, n: number) => {
    const k = key(s);
    const have = desired.get(k) ?? 0;
    let room = Math.min(n, s.cap - have, left);
    if (s.planet.coreOf) room = Math.min(room, coreBudget);
    if (room <= 0) return 0;
    desired.set(k, have + room);
    left -= room;
    if (s.planet.coreOf) coreBudget -= room;
    return room;
  };
  // 1. Military during a siege, drill, power.
  for (const s of slots.filter((x) => x.score >= 50).sort((a, b) => b.score - a.score)) take(s, s.cap);
  // 2. Food.
  const pop = residentsOf(planet);
  const people = ownPlanets(eid).reduce((sum, p) => sum + residentsOf(p), 0);
  const upkeepShare = (foodUpkeepPerCycle(g, people) / g.settings.cycleSeconds) * (pop / Math.max(1, people));
  const cap = RULES.foodStock.base + RULES.foodStock.perCitizen * people;
  const growth = pop < housing(g, planet) ? RULES.birthFoodCost / secondsPerBirth(g, pop) : 0;
  const stock = econ.resources.food;
  const margin = stock < upkeepShare * g.settings.cycleSeconds * 2 ? 1.5 : stock > cap * 0.7 ? 0.9 : 1.15;
  let foodWanted = (upkeepShare + growth) * margin + extraFood;
  if (strategy === "naive") foodWanted = Math.max(foodWanted, (upkeepShare + growth) * 1.5);
  const foodSlots = slots.filter((x) => x.food > 0).sort((a, b) => b.food / b.cap - a.food / a.cap);
  for (const s of foodSlots) {
    while (foodWanted > 0 && left > 0) {
      const got = take(s, 1);
      if (!got) break;
      foodWanted -= s.food;
    }
  }
  const shortfall = Math.max(0, foodWanted);
  // 3. Everything else by score, with diminishing need per good.
  const used = new Map<ResourceId, number>();
  const others = slots.filter((x) => x.food === 0 && x.score > 0 && x.score < 50);
  while (left > 0) {
    let best: Slot | null = null;
    let bestScore = 0;
    for (const s of others) {
      if ((desired.get(key(s)) ?? 0) >= s.cap) continue;
      if (s.planet.coreOf && coreBudget <= 0) continue;
      const damp = s.outputs.reduce((m, r) => Math.min(m, 0.8 ** (used.get(r) ?? 0)), 1);
      const sc = s.score * damp;
      if (sc > bestScore) {
        bestScore = sc;
        best = s;
      }
    }
    if (!best) break;
    take(best, 1);
    for (const r of best.outputs) used.set(r, (used.get(r) ?? 0) + 1);
  }
  // Leftover hands gather food if there is room (better than idling).
  if (left > 0 && econ.resources.food < cap * 0.9) for (const s of foodSlots) if (left > 0) take(s, s.cap);

  // Apply: gather/recipe settings, removals, then additions.
  for (const s of slots) {
    const k = key(s);
    if (!desired.get(k)) continue;
    if (s.gather && s.seg.gather !== s.gather) {
      // A field can only gather one thing; food and the other deposit compete.
      run(playerOf(eid).id, { type: "setGather", planetId: s.planet.id, segment: s.seg.index, resource: s.gather });
    }
    if (s.recipe && segmentRecipe(s.seg) !== s.recipe) run(playerOf(eid).id, { type: "setGather", planetId: s.planet.id, segment: s.seg.index, resource: s.recipe as ResourceId });
  }
  const fresh = () => unitsOn(planet.id).concat(core ? unitsOn(core.id) : []);
  for (const p of [planet, ...(core ? [core] : [])]) {
    for (const seg of p.segments) {
      const want = desired.get(`${p.id}:${seg.index}`) ?? 0;
      const on = fresh().filter((u) => u.planetId === p.id && u.segment === seg.index);
      for (const u of on.slice(want)) run(u.owner, { type: "assignUnit", unitId: u.id, segment: null });
    }
  }
  for (const p of [planet, ...(core ? [core] : [])]) {
    for (const seg of p.segments) {
      const want = desired.get(`${p.id}:${seg.index}`) ?? 0;
      let have = fresh().filter((u) => u.planetId === p.id && u.segment === seg.index).length;
      while (have < want) {
        const idle = unitsOn(planet.id).filter((u) => u.segment === null);
        if (!idle.length) break;
        const u = idle[0]!;
        const ok = p.coreOf
          ? run(u.owner, { type: "assign", planetId: p.id, segment: seg.index, delta: 1 })
          : run(u.owner, { type: "assignUnit", unitId: u.id, segment: seg.index });
        if (!ok) break;
        have++;
      }
    }
  }
  return shortfall;
}

// ---------------------------------------------------------------- building

function tryBuild(eid: string, wishes: Wish[]) {
  const econ = g.economies[eid]!;
  const pid = playerOf(eid).id;
  const reserved = new Set<ResourceId>();
  const fl = flows(eid);
  let reservers = 0;
  for (const w of wishes) {
    const site = bestSite(w.planet, w.b, w.ores, w.explore);
    if (!site) continue;
    const miss = missing(econ, BUILDINGS[w.b].cost);
    const conflict = Object.keys(BUILDINGS[w.b].cost).some((r) => reserved.has(r as ResourceId));
    if (!Object.keys(miss).length && !conflict) {
      if (run(pid, { type: "build", planetId: w.planet.id, segment: site.index, building: w.b })) return true;
    } else {
      for (const r of Object.keys(miss)) {
        const ws = (waits[eid] ??= new Map());
        count(ws, `${w.b}<-${r}`);
      }
      // Save up only for what is on its way; a wish whose missing goods nobody makes yet must not block the rest.
      if (reservers < 3 && Object.keys(miss).every((r) => (fl[r as ResourceId] ?? 0) > 0.01)) {
        reservers++;
        for (const r of Object.keys(BUILDINGS[w.b].cost)) reserved.add(r as ResourceId);
      }
    }
  }
  return false;
}

const UPGRADE_ORDER: BuildingId[] = ["housing", "farm", "fishery", "lab", "mine", "workshop", "foundry", "sawmill", "smelter", "electronics", "watchtower", "barracks"];

function tryUpgrades(eid: string, wishes: Wish[]) {
  const econ = g.economies[eid]!;
  const pid = playerOf(eid).id;
  const reserved = new Set<ResourceId>();
  for (const w of wishes.slice(0, 2)) for (const r of Object.keys(missing(econ, BUILDINGS[w.b].cost))) reserved.add(r as ResourceId);
  for (const b of UPGRADE_ORDER) {
    for (const p of ownPlanets(eid)) {
      for (const s of p.segments) {
        if (s.building !== b) continue;
        if (upgradeBlocker(g, p, s)) continue;
        const next = nextUpgrade(s)!;
        if (Object.keys(next.cost).some((r) => reserved.has(r as ResourceId))) continue;
        // Upgrades that need power only with power to spare (or a plant to come).
        if ((next.energy ?? 0) < 0 && p.power && p.power.supply < p.power.demand + -(next.energy ?? 0)) {
          const plant = bestPowerPlant(eid, p);
          if (plant && !buildBlocker(g, p, bestSite(p, plant) ?? s, plant)) {
            const site = bestSite(p, plant);
            if (site) run(pid, { type: "build", planetId: p.id, segment: site.index, building: plant });
          }
          continue;
        }
        if (b === "housing" && residentsOf(p) < housing(g, p) - 2) continue;
        if (run(pid, { type: "upgrade", planetId: p.id, segment: s.index })) return;
      }
    }
  }
}

// ---------------------------------------------------------------- space

function spaceWanted(eid: string): boolean {
  if (strategy === "naive") return false;
  const home = ownPlanets(eid)[0];
  if (!home) return false;
  const free = home.segments.filter((s) => s.revealed && !s.building && BIOMES[s.biome].buildable).length;
  const L = g.economies[eid]!.ascension.level;
  return L >= 3 && (free <= 4 || residentsOf(home) >= 18 || L >= 7);
}

function colonyTarget(eid: string, from: PlanetState): PlanetState | null {
  const econ = g.economies[eid]!;
  const L = econ.ascension.level;
  const own = ownPlanets(eid);
  let best: PlanetState | null = null;
  let bestScore = -Infinity;
  for (const p of g.planets) {
    if (p.economyId !== null) continue;
    if ((p.system ?? 0) !== (from.system ?? 0)) continue;
    if (launchBlocker(g, playerOf(eid).id, from, p, "colony", 3)?.includes("Weltraumbergbau")) continue;
    let sc = PLANET_TYPES[p.type].breathable ? 3 : needsSuitsPossible(econ) ? 0 : -10;
    if (p.segments.some((s) => s.deposits.some((d) => d.resource === "platinum"))) sc += L >= 6 ? 6 : 1;
    if (p.segments.some((s) => s.deposits.some((d) => ["diamond", "emerald", "ruby"].includes(d.resource)))) sc += 1;
    sc += p.segments.length / 16;
    sc -= flightPlan(from, p, "colony", 3, econ).distance / 4;
    if (sc > bestScore) {
      bestScore = sc;
      best = p;
    }
  }
  if (own.length >= 1 + Math.max(2, L - 2)) return null;
  return bestScore > -5 ? best : null;
}

function needsSuitsPossible(econ: EconomyState) {
  return econ.resources.suits >= 10;
}

function space(eid: string) {
  const econ = g.economies[eid]!;
  const pid = playerOf(eid).id;
  for (const from of ownPlanets(eid)) {
    if (!from.segments.some((s) => s.building === "launchpad")) continue;
    // Shield flights (supernova goal).
    if (cfg.mode === "coop" && g.sun.novaTick !== null && !g.sun.saved && econ.ascension.level >= SUPERNOVA.unlockLevel) {
      const repair = g.sun.shield.findIndex((s) => s.built && s.hp < 60);
      const build = g.sun.shield.findIndex((s) => !s.built);
      const seg = repair >= 0 ? repair : build;
      if (seg >= 0) {
        const r = repair >= 0;
        let blocker = shieldBlocker(g, pid, from, seg, r);
        if (blocker?.startsWith("Es braucht")) {
          freeIdle(from, SUPERNOVA.crew);
          blocker = shieldBlocker(g, pid, from, seg, r);
        }
        if (!blocker) run(pid, { type: "shieldFlight", planetId: from.id, segment: seg, repair: r });
        else {
          const miss = Object.keys(missing(econ, { ...SUPERNOVA.segmentCost, ...shieldFuel(from, econ) }));
          count((waits[eid] ??= new Map()), `shield<-${miss.length ? miss.join("+") : blocker}`);
        }
      }
    }
    if (!spaceWanted(eid)) continue;
    if (residentsOf(from) < 8) continue;
    if (g.flights.some((f) => f.owner === pid && f.rocket === "colony" && !f.shield)) continue;
    const target = colonyTarget(eid, from);
    if (!target) continue;
    const blocker = launchBlocker(g, pid, from, target, "colony", 3);
    if (blocker === "Nicht genug freie Einwohner") freeIdle(from, 3);
    const b2 = launchBlocker(g, pid, from, target, "colony", 3);
    if (!b2) run(pid, { type: "launch", planetId: from.id, to: target.id, rocket: "colony", count: 3 });
    else count((waits[eid] ??= new Map()), `colony<-${b2 === NOT_AFFORDABLE ? Object.keys(missing(econ, flightPlan(from, target, "colony", 3, econ).cost)).join("+") : b2}`);
  }
  // Warp: from a planet with a gate to an empty planet of a neighbor system with exotic matter.
  for (const from of ownPlanets(eid)) {
    if (!from.segments.some((s) => s.building === "warpgate")) continue;
    if (g.flights.some((f) => f.owner === pid && f.rocket === "warp")) continue;
    if (ownPlanets(eid).filter((p) => (p.system ?? 0) > 0).length >= 2) continue;
    const targets = g.planets.filter((p) => (p.system ?? 0) > 0 && p.economyId === null && p.segments.some((s) => s.deposits.some((d) => ["antimatter", "neutronium", "xenocrystal"].includes(d.resource))));
    for (const t of targets) {
      const blocker = launchBlocker(g, pid, from, t, "warp", 4);
      if (blocker === "Nicht genug freie Einwohner") freeIdle(from, 4);
      if (!launchBlocker(g, pid, from, t, "warp", 4)) {
        run(pid, { type: "launch", planetId: from.id, to: t.id, rocket: "warp", count: 4 });
        break;
      } else count((waits[eid] ??= new Map()), `warp<-${launchBlocker(g, pid, from, t, "warp", 4)}`);
    }
  }
}

function shieldFuel(from: PlanetState, econ: EconomyState): Partial<Record<ResourceId, number>> {
  const plan = flightPlan(from, { orbit: { radius: 0, angle: 0 } } as PlanetState, "colony", SUPERNOVA.crew, econ);
  return { fuel: plan.cost.fuel ?? 0 };
}

function freeIdle(p: PlanetState, n: number) {
  let idle = unitsOn(p.id).filter((u) => u.segment === null).length;
  for (const u of unitsOn(p.id)) {
    if (idle >= n) break;
    if (u.segment === null) continue;
    run(u.owner, { type: "assignUnit", unitId: u.id, segment: null });
    idle++;
  }
}

/** Versus: attack the weakest opponent with a combat rocket when clearly stronger. */
function attack(eid: string) {
  const pid = playerOf(eid).id;
  if (g.flights.some((f) => f.owner === pid && ROCKETS[f.rocket].attack)) return;
  const home = ownPlanets(eid)[0];
  if (!home) return;
  const mine = residentsOf(home);
  for (const other of g.planets) {
    if (!other.economyId || other.economyId === eid) continue;
    const theirs = residentsOf(other);
    if (mine < theirs + 6) continue;
    const blocker = launchBlocker(g, pid, home, other, "combat", 4);
    if (blocker === "Nicht genug freie Einwohner") freeIdle(home, 4);
    if (!launchBlocker(g, pid, home, other, "combat", 4)) {
      run(pid, { type: "launch", planetId: home.id, to: other.id, rocket: "combat", count: 4 });
      return;
    }
  }
}

// ---------------------------------------------------------------- misc

const DISCOVERY_PRIORITY = ["green-thumb", "efficient-housing", "medicine", "space-mining", "pure-science", "long-range-sight", "fortification", "energy-grid", "automation", "festival", "recycling", "storage-tech", "deep-drilling", "rocketry", "crystal-lore", "swift-feet"];

function discoveries(eid: string) {
  const econ = g.economies[eid]!;
  if (!econ.offer) return;
  const opts = econ.offer.options;
  const pick = [...opts].sort((a, b) => rank(a) - rank(b))[0]!;
  for (const m of membersOf(eid)) if (econ.offer?.votes[m.id] !== pick) run(m.id, { type: "voteDiscovery", discovery: pick });
}
const rank = (id: string) => {
  const i = DISCOVERY_PRIORITY.indexOf(id);
  return i < 0 ? 50 : i;
};

/** Boxed in by sea or ice: fill (or thaw) the field nearest to the unknown land. */
function boxedIn(p: PlanetState): SegmentState | null {
  const hidden = p.segments.filter((s) => !s.revealed);
  if (!hidden.length || exploreWish(p)) return null;
  const free = p.segments.filter((s) => s.revealed && !s.building && BIOMES[s.biome].buildable).length;
  if (free > 3) return null;
  const n = p.segments.length;
  const wet = p.segments.filter((s) => s.revealed && !s.building && (s.biome === "ocean" || s.biome === "glacier"));
  wet.sort((a, b) => Math.min(...hidden.map((h) => ringDistance(h.index, a.index, n))) - Math.min(...hidden.map((h) => ringDistance(h.index, b.index, n))));
  return wet[0] ?? null;
}

function terraformChores(eid: string) {
  const pid = playerOf(eid).id;
  for (const p of ownPlanets(eid)) {
    const wet = boxedIn(p);
    if (wet) {
      milestone(`boxedIn:${p.startSlot !== null ? "home" : "colony"}`);
      // No wood left to work with: tear down a hut on a forest to get the trees back.
      const econ = g.economies[eid]!;
      const woodIn = p.segments.some((x) => x.revealed && !x.building && x.biome === "forest" && x.deposits.some((d) => d.resource === "wood" && d.amount > 1));
      if (!woodIn && econ.resources.wood < 20) {
        const hut = p.segments.find((x) => x.biome === "forest" && x.building && x.building !== "forester");
        if (hut && run(pid, { type: "demolish", planetId: p.id, segment: hut.index })) {
          milestone("escapeDemolish");
          return;
        }
      }
      for (const kind of wet.biome === "glacier" ? (["thawGlacier"] as const) : (["fillClay", "fillSand"] as const)) {
        if (!terraformBlocker(g, p, wet, kind)) {
          run(pid, { type: "terraform", planetId: p.id, segment: wet.index, kind });
          stats.filled++;
          return;
        }
      }
    }
    for (const s of p.segments) {
      if (s.scorched && !terraformBlocker(g, p, s, "clearScorched")) {
        run(pid, { type: "terraform", planetId: p.id, segment: s.index, kind: "clearScorched" });
        return;
      }
      const wood = s.deposits.find((d) => d.resource === "wood");
      if (s.biome === "forest" && !s.building && wood && wood.amount <= 0 && !terraformBlocker(g, p, s, "plantTrees")) {
        run(pid, { type: "terraform", planetId: p.id, segment: s.index, kind: "plantTrees" });
        return;
      }
    }
  }
}

function thawPods(eid: string) {
  const econ = g.economies[eid]!;
  if (econ.resources.food < 60 || econ.resources.science < 10) return;
  for (const p of ownPlanets(eid)) for (const s of p.segments) if (s.cryo && s.revealed) run(playerOf(eid).id, { type: "thaw", planetId: p.id, segment: s.index });
}

// ---------------------------------------------------------------- sampling

function sample(eid: string) {
  const econ = g.economies[eid]!;
  const planets = ownPlanets(eid);
  const pop = planets.reduce((sum, p) => sum + residentsOf(p), 0);
  let foodWorkers = 0;
  let idle = 0;
  const powers: string[] = [];
  for (const p of planets) {
    for (const u of unitsOn(p.id)) {
      if (u.segment === null) {
        idle++;
        continue;
      }
      const s = p.segments[u.segment]!;
      const out = segmentOutput(p, s, 1, econ);
      if ((out.food ?? 0) > 0) foodWorkers++;
    }
    if (p.power) {
      powers.push(`${p.power.supply.toFixed(0)}/${p.power.demand.toFixed(0)}`);
      powerSamples.planetMinutes++;
      if (p.power.supply < p.power.demand) powerSamples.deficitMinutes++;
      if (p.power.demand > 0) powerSamples.worstRatio = Math.min(powerSamples.worstRatio, p.power.supply / p.power.demand);
    }
  }
  const people = Math.max(1, pop);
  const foodCap = RULES.foodStock.base + RULES.foodStock.perCitizen * pop;
  foodSamples.minutes++;
  if (econ.resources.food >= foodCap * 0.98) foodSamples.atCap++;
  foodSamples.workerShareSum += foodWorkers / people;
  idleSamples.sum += idle / people;
  idleSamples.n++;
  if (econ.starving) stats.starvingCycles++;
  (timeline[eid] ??= []).push({
    minute: minute(),
    level: econ.ascension.level,
    points: Math.round(econ.ascension.points),
    pop,
    planets: planets.length,
    food: Math.round(econ.resources.food),
    foodShare: +(foodWorkers / people).toFixed(2),
    idleShare: +(idle / people).toFixed(2),
    power: powers.join(" "),
    science: Math.round(econ.resources.science),
  });
  for (const p of planets.filter((x) => x.startSlot !== null)) {
    const left = new Map<ResourceId, number>();
    for (const s of p.segments) for (const d of s.deposits) if (!d.infinite) left.set(d.resource, (left.get(d.resource) ?? 0) + d.amount);
    for (const [r, v] of left) if (v < 1) milestone(`exhausted:${r}`);
  }
  const pk = (peak[eid] ??= {});
  for (const r of RESOURCE_IDS) pk[r] = Math.max(pk[r] ?? 0, econ.resources[r]);
}

// ---------------------------------------------------------------- main loop

const humanEconomies = () => [...new Set(g.players.filter((p) => !p.ai && !p.eliminated).map((p) => p.economyId))];
const started = Date.now();
for (let s = DECIDE_SECONDS; s <= cfg.minutes * 60; s += DECIDE_SECONDS) {
  const r = advanceWithEvents(g, s * 1000);
  g = r.state;
  onEvents(r.events);
  if (g.result) break;
  for (const eid of humanEconomies()) {
    if (!membersOf(eid).length) continue;
    const planets = ownPlanets(eid);
    if (!planets.length) continue;
    discoveries(eid);
    const home = planets.find((p) => p.startSlot !== null) ?? planets[0]!;
    // Needs from the wish list of the last round (stable enough), then the real wish list.
    let wishes = homeWishes(eid, home, {});
    let need = computeNeeds(eid, wishes);
    wishes = homeWishes(eid, home, need);
    const colonyWish = planets.filter((p) => p !== home).flatMap((p) => colonyWishes(eid, p));
    need = computeNeeds(eid, [...wishes, ...colonyWish]);
    if (s % 10 === 0) {
      tryBuild(eid, wishes);
      for (const p of planets.filter((x) => x !== home)) tryBuild(eid, colonyWishes(eid, p));
      if (strategy === "smart") tryUpgrades(eid, wishes);
    }
    if (strategy === "smart") {
      space(eid);
      if (cfg.mode === "versus" && (cfg.aggressor === undefined || playerOf(eid).id === `p${cfg.aggressor + 1}`)) attack(eid);
      if (s % 30 === 0) {
        demolishDead(eid);
        terraformChores(eid);
        thawPods(eid);
      }
    }
    // Colonies feed themselves as far as they can, the home planet makes up the rest.
    let short = 0;
    for (const p of ownPlanets(eid)) if (p !== home) short += assignWorkers(eid, p, need);
    assignWorkers(eid, home, need, short);
    if (s % 60 === 0) sample(eid);
  }
  if (s % 60 === 0) {
    const L = Object.values(g.economies).map((e) => e.ascension.level);
    if (s % 1800 === 0) console.error(`[${cfg.out}] min ${s / 60} levels ${L.join("/")} pop ${humanEconomies().map((e) => ownPlanets(e).reduce((n, p) => n + residentsOf(p), 0)).join("/")} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  }
}

// ---------------------------------------------------------------- report

const report = {
  cfg,
  endMinute: minute(),
  result: g.result,
  levelTimes,
  milestones,
  final: humanEconomies().map((eid) => {
    const econ = g.economies[eid]!;
    const planets = ownPlanets(eid);
    return {
      economy: eid,
      level: econ.ascension.level,
      points: Math.round(econ.ascension.points),
      nextThreshold: economyThreshold(g, econ),
      pop: planets.reduce((n, p) => n + residentsOf(p), 0),
      planets: planets.map((p) => ({ name: p.name, type: p.type, system: p.system ?? 0, pop: residentsOf(p), segments: p.segments.length, built: p.segments.filter((s) => s.building).length, free: p.segments.filter((s) => s.revealed && !s.building && BIOMES[s.biome].buildable).length, hidden: p.segments.filter((s) => !s.revealed).length, power: p.power })),
      cores: ownCores(eid).map((c) => ({ built: c.segments.filter((s) => s.building).length, workers: unitsOn(c.id).length })),
      discoveries: econ.discoveries,
      resources: Object.fromEntries(RESOURCE_IDS.filter((r) => econ.resources[r] >= 0.5).map((r) => [r, Math.round(econ.resources[r])])),
      peak: Object.fromEntries(Object.entries(peak[eid] ?? {}).filter(([, v]) => v! >= 1).map(([r, v]) => [r, Math.round(v!)])),
      flows: Object.fromEntries(Object.entries(flows(eid)).map(([r, v]) => [r, +(v! * 60).toFixed(1)])),
      buildings: Object.fromEntries(
        Object.entries(
          allOwnSegments(eid).reduce<Record<string, number>>((acc, { s }) => {
            if (s.building) acc[`${s.building}${(s.tier ?? 1) > 1 ? `:${s.tier}` : ""}`] = (acc[`${s.building}${(s.tier ?? 1) > 1 ? `:${s.tier}` : ""}`] ?? 0) + 1;
            return acc;
          }, {}),
        ).sort((a, b) => b[1] - a[1]),
      ),
      waits: [...(waits[eid] ?? new Map()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => [k, +((v * 10) / 60).toFixed(1)]),
      timeline: timeline[eid],
    };
  }),
  stats: {
    ...stats,
    rejected: [...stats.rejected.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
    events: Object.fromEntries(stats.events),
    launches: Object.fromEntries(stats.launches),
    foodWorkerShare: +(foodSamples.workerShareSum / Math.max(1, foodSamples.minutes)).toFixed(2),
    foodAtCapShare: +(foodSamples.atCap / Math.max(1, foodSamples.minutes)).toFixed(2),
    idleShare: +(idleSamples.sum / Math.max(1, idleSamples.n)).toFixed(2),
    powerDeficitShare: +(powerSamples.deficitMinutes / Math.max(1, powerSamples.planetMinutes)).toFixed(2),
    powerWorstRatio: +powerSamples.worstRatio.toFixed(2),
  },
  invasion: g.invasion,
  sun: { saved: g.sun.saved, built: g.sun.shield.filter((s) => s.built).length, novaTick: g.sun.novaTick, novaMinute: g.sun.novaTick === null ? null : +((g.sun.novaTick / 10 / 60).toFixed(0)) },
  runSeconds: Math.round((Date.now() - started) / 1000),
};
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/${cfg.out}.json`, JSON.stringify(report, null, 1));
writeFileSync(`${outDir}/${cfg.out}.state.json`, JSON.stringify(g));
console.error(`[${cfg.out}] done in ${report.runSeconds}s: levels ${JSON.stringify(levelTimes)}`);
void CORE;
void coreAccessBlocker;
void energySupply;
