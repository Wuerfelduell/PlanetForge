import { BIOMES, BUILDINGS, CORE, CRYO, PLANET_TYPES, RECIPES, RESOURCE_IDS, ROCKETS, RULES, SUPERNOVA, WARP, type BuildingDef, type BiomeId, type BuildingId, type BuildingUpgrade, type RecipeId, type ResourceId, type RocketId } from "./content";
import { hasUnlock, modified } from "./discoveries";
import { atWar, factionOfEconomy } from "./diplomacy";
import { ASCENSION } from "../data/balance/progression";
import { ascensionThreshold, foodUpkeepPerSecond, secondsPerBirth as balanceSecondsPerBirth } from "../data/balance/index";
import type { EconomyState, GameState, PlanetState, PlayerState, SegmentState, UnitState } from "./state";

/** Read-only helpers shared by the simulation and the UI (so the UI never re-implements rules). */

export const TICK_MS = 1000 / RULES.ticksPerSecond;

export function ticksPerCycle(state: GameState): number {
  return Math.round(state.settings.cycleSeconds * RULES.ticksPerSecond);
}

export function cycleOf(state: GameState): number {
  return Math.floor(state.tick / ticksPerCycle(state));
}

/** Deep copy. The state is plain JSON by contract, so a JSON round trip is exact and works everywhere. */
export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function playerById(state: GameState, id: string): PlayerState | undefined {
  return state.players.find((p) => p.id === id);
}

/** A planet, or a planet interior (GameState.cores). */
export function planetById(state: GameState, id: string): PlanetState | undefined {
  return state.planets.find((p) => p.id === id) ?? state.cores?.find((p) => p.id === id);
}

export function economyOf(state: GameState, planet: PlanetState): EconomyState | undefined {
  return planet.economyId === null ? undefined : state.economies[planet.economyId];
}

export function economyOfPlayer(state: GameState, playerId: string): EconomyState | undefined {
  const player = playerById(state, playerId);
  return player ? state.economies[player.economyId] : undefined;
}

export function homePlanet(state: GameState, playerId: string): PlanetState | undefined {
  const player = playerById(state, playerId);
  return player ? planetById(state, player.homePlanetId) : undefined;
}

export function segmentAt(planet: PlanetState, index: number): SegmentState | undefined {
  const n = planet.segments.length;
  return planet.segments[((index % n) + n) % n];
}

export function neighbors(planet: PlanetState, index: number): SegmentState[] {
  return [segmentAt(planet, index - 1)!, segmentAt(planet, index + 1)!];
}

/** Units on a planet, optionally only those of one owner. Ordered by creation. */
export function unitsOn(state: GameState, planetId: string, owner?: string): UnitState[] {
  return Object.values(state.units).filter((u) => u.planetId === planetId && (owner === undefined || u.owner === owner));
}

export function population(state: GameState, planet: PlanetState, owner?: string): number {
  return unitsOn(state, planet.id, owner).length;
}

export function workersOn(state: GameState, planet: PlanetState, segment: number, owner?: string): UnitState[] {
  return unitsOn(state, planet.id, owner).filter((u) => u.segment === segment);
}

export function workerCount(state: GameState, planet: PlanetState, segment: number, owner?: string): number {
  return workersOn(state, planet, segment, owner).length;
}

export function idleUnits(state: GameState, planet: PlanetState, owner?: string): UnitState[] {
  return unitsOn(state, planet.id, owner).filter((u) => u.segment === null);
}

/** The building on a segment with the values of its current stage, or null. */
export function buildingStats(segment: SegmentState): BuildingDef | null {
  if (!segment.building) return null;
  const def = BUILDINGS[segment.building];
  const tier = segment.tier ?? 1;
  if (tier <= 1 || !def.upgrades) return def;
  let stats: BuildingDef = def;
  for (const u of def.upgrades.slice(0, tier - 1)) stats = { ...stats, ...u, cost: def.cost };
  return stats;
}

/** Everything paid for a segment's building so far: build cost plus every upgrade. */
export function paidFor(segment: SegmentState): Partial<Record<ResourceId, number>> {
  if (!segment.building) return {};
  const def = BUILDINGS[segment.building];
  const total: Partial<Record<ResourceId, number>> = { ...def.cost };
  for (const u of def.upgrades?.slice(0, (segment.tier ?? 1) - 1) ?? []) {
    for (const [r, v] of Object.entries(u.cost) as [ResourceId, number][]) total[r] = (total[r] ?? 0) + v;
  }
  return total;
}

/** The next stage of a segment's building, or undefined at the top. */
export function nextUpgrade(segment: SegmentState): BuildingUpgrade | undefined {
  return segment.building ? BUILDINGS[segment.building].upgrades?.[(segment.tier ?? 1) - 1] : undefined;
}

/** Why the building on a segment cannot be upgraded right now, or null. */
export function upgradeBlocker(state: GameState, planet: PlanetState, segment: SegmentState): string | null {
  const economy = economyOf(state, planet);
  if (!economy) return "Unbewohnter Planet";
  const next = nextUpgrade(segment);
  if (!next) return "Höchste Stufe erreicht";
  if (economy.ascension.level < next.unlockLevel) return `Ab Aufstiegsstufe ${next.unlockLevel}`;
  if (!canPay(economy, next.cost)) return NOT_AFFORDABLE;
  return null;
}

export function housing(state: GameState, planet: PlanetState): number {
  if (planet.economyId === null) return 0;
  // Every additional people on a shared planet brings its own shelter for the inhabitants it arrives with.
  const peoples = new Set(unitsOn(state, planet.id).map((u) => u.owner)).size;
  const total = RULES.baseHousing + Math.max(0, peoples - 1) * RULES.coopJoinPopulation + housedInBuildings(state, planet);
  return Math.floor(total + 1e-9);
}

/** Living space in actual houses on the planet, without the base shelter. */
function housedInBuildings(state: GameState, planet: PlanetState): number {
  const economy = economyOf(state, planet);
  let total = 0;
  for (const s of planet.segments) {
    const h = buildingStats(s)?.housing;
    // Noisy neighbors take living space, forests add a little.
    if (h) total += modified(economy, "housing", h, { building: s.building! }) * adjacencyMultiplier(planet, s) * powerFactor(planet, s);
  }
  return total;
}

export function workerCapacity(segment: SegmentState): number {
  if (segment.building) return buildingStats(segment)!.workers;
  return !segment.scorched && segment.deposits.some((d) => d.byHand) ? RULES.handWorkersPerSegment : 0;
}

export function adjacencyMultiplier(planet: PlanetState, segment: SegmentState): number {
  if (!segment.building) return 1;
  const adj = BUILDINGS[segment.building].adjacency;
  if (!adj) return 1;
  let mult = 1;
  for (const n of neighbors(planet, segment.index)) {
    for (const a of adj) if ((a.biome && n.biome === a.biome) || (a.building && n.building === a.building)) mult += a.bonus;
  }
  return Math.max(0, mult);
}

/** Power a segment feeds into the planet's grid with `workers` on it (manned plants also need their fuel). */
export function energySupply(planet: PlanetState, segment: SegmentState, workers: number, economy?: EconomyState): number {
  const def = buildingStats(segment);
  if (!def?.energy || def.energy <= 0) return 0;
  if (def.burns && !(economy && economy.resources[def.burns.resource] > 0)) return 0;
  const crew = def.workers > 0 ? Math.min(1, workers / def.workers) : 1;
  return def.energy * adjacencyMultiplier(planet, segment) * crew;
}

/** Power a segment draws: always for unmanned consumers (housing), else only while somebody works there. */
export function energyDemand(segment: SegmentState, workers: number): number {
  const def = buildingStats(segment);
  if (!def?.energy || def.energy >= 0 || (def.workers > 0 && workers <= 0)) return 0;
  return -def.energy;
}

/** Speed factor of a power consumer: supply ÷ demand when short, never below RULES.energy.unpoweredMul (docs/balancing.md). */
export function powerFactor(planet: PlanetState, segment: SegmentState): number {
  if (!((buildingStats(segment)?.energy ?? 0) < 0)) return 1;
  const p = planet.power;
  if (!p || p.demand <= p.supply) return 1;
  return Math.max(RULES.energy.unpoweredMul, p.supply / p.demand);
}

/** Pumps also draw from a neighboring sea or glacier. */
const WATER_NEIGHBORS: readonly BiomeId[] = ["ocean", "glacier"];

/** Whether a building that needs a deposit (mine, pump) has something to work on this segment. */
export function hasWorkableDeposit(planet: PlanetState, segment: SegmentState, building: BuildingId): boolean {
  const def = BUILDINGS[building];
  const extractable = !!def.extracts && segment.deposits.some((d) => def.extracts!.resources.includes(d.resource) && (d.infinite || d.amount > 0));
  if (extractable) return true;
  if (def.produces) {
    const r = def.produces.resource;
    return segment.deposits.some((d) => d.resource === r) || neighbors(planet, segment.index).some((n) => WATER_NEIGHBORS.includes(n.biome));
  }
  return !def.extracts;
}

/** The recipe a crafting segment runs: its chosen one, else the building's first. */
export function segmentRecipe(segment: SegmentState): RecipeId | null {
  const crafts = buildingStats(segment)?.crafts;
  if (!crafts) return null;
  return crafts.recipes.find((r) => r === segment.gather) ?? crafts.recipes[0]!;
}

/** Whether tools wear out for this economy yet (from the workshop's level on). */
export function toolsWear(economy: EconomyState | undefined): boolean {
  return !!economy && economy.ascension.level >= RULES.tools.fromLevel;
}

/** Speed factor of a tool-using building: slower once tools wear out and none are in stock. */
export function toolFactor(segment: SegmentState, economy: EconomyState | undefined): number {
  const def = segment.building ? BUILDINGS[segment.building] : null;
  if (!def?.usesTools || !toolsWear(economy) || economy!.resources.tools > 0) return 1;
  return RULES.tools.withoutToolsMul;
}

/** Crafts per second of a crafting segment at full input supply. */
export function craftRate(planet: PlanetState, segment: SegmentState, workers: number, economy?: EconomyState): number {
  const recipe = segmentRecipe(segment);
  if (!recipe || workers <= 0) return 0;
  const speed = buildingStats(segment)!.crafts!.speed;
  return (workers * speed * adjacencyMultiplier(planet, segment) * toolFactor(segment, economy) * powerFactor(planet, segment)) / RECIPES[recipe].seconds;
}

export function canAfford(economy: EconomyState, building: BuildingId): boolean {
  return canPay(economy, BUILDINGS[building].cost);
}

export const NOT_AFFORDABLE = "Zu wenig Ressourcen";

/** Why a building cannot go on a segment right now, or null if it can. Pays from the planet's economy. */
export function buildBlocker(state: GameState, planet: PlanetState, segment: SegmentState, building: BuildingId): string | null {
  const def = BUILDINGS[building];
  const economy = economyOf(state, planet);
  if (!economy) return "Unbewohnter Planet";
  if (!segment.revealed) return "Feld noch unerforscht";
  if (segment.building) return "Feld ist schon bebaut";
  if (def.unique && hasBuilding(planet, building)) return "Nur eins pro Planet";
  if (building === "core-drill" && planet.type === "asteroid") return "Asteroiden haben keinen Kern";
  if (segment.scorched) return "Verbrannte Erde: erst aufräumen";
  if (!BIOMES[segment.biome].buildable) return `Auf ${BIOMES[segment.biome].name} kann man nicht bauen`;
  if (economy.ascension.level < def.unlockLevel) return `Ab Aufstiegsstufe ${def.unlockLevel}`;
  if (def.coopOnly && state.settings.mode !== "coop") return "Nur im Miteinander";
  if (!def.allowedBiomes.includes(segment.biome)) return `Nicht auf ${BIOMES[segment.biome].name}`;
  if (def.needsNeighbor && !neighbors(planet, segment.index).some((n) => def.needsNeighbor!.includes(n.biome))) {
    return `Muss neben ${def.needsNeighbor.map((b) => BIOMES[b].name).join(" oder ")} stehen`;
  }
  if (def.needsDeposit && !hasWorkableDeposit(planet, segment, building)) {
    return !def.produces ? "Hier gibt es nichts abzubauen" : "Braucht Wasser im Feld, ein Nachbar-Meer oder einen Nachbar-Gletscher";
  }
  if (!canAfford(economy, building)) return NOT_AFFORDABLE;
  return null;
}

/** Production per second of one segment with `workers` working on it, before starvation. `economy` adds discovery bonuses. */
export function segmentOutput(planet: PlanetState, segment: SegmentState, workers: number, economy?: EconomyState): Partial<Record<ResourceId, number>> {
  const out: Partial<Record<ResourceId, number>> = {};
  if (workers <= 0) return out;
  const mult = adjacencyMultiplier(planet, segment) * toolFactor(segment, economy) * powerFactor(planet, segment);
  const def = buildingStats(segment);
  const bonus = (resource: ResourceId) => modified(economy, "buildingOutput", 1, { building: segment.building ?? undefined, resource });
  if (def?.produces) {
    const r = def.produces.resource;
    out[r] = def.produces.perWorker * workers * mult * bonus(r);
  }
  if (def?.extracts) {
    const available = segment.deposits.filter((d) => def.extracts!.resources.includes(d.resource) && (d.infinite || d.amount > 0));
    // Workers split evenly over everything the building can reach.
    for (const d of available) out[d.resource] = ((def.extracts.perWorker * workers * mult) / available.length) * bonus(d.resource);
  }
  if (def?.crafts) {
    const recipe = RECIPES[segmentRecipe(segment)!];
    const rate = craftRate(planet, segment, workers, economy);
    for (const [r, v] of Object.entries(recipe.outputs) as [ResourceId, number][]) out[r] = v * rate * bonus(r);
  }
  if (!def && !segment.scorched) {
    const d = segment.deposits.find((x) => x.resource === segment.gather);
    if (d && d.byHand && (d.infinite || d.amount > 0)) out[d.resource] = modified(economy, "handGatherRate", RULES.handRatePerWorker) * workers;
  }
  return out;
}

/**
 * Points needed to go from `level` to the next one (cumulative). Coop thresholds grow with the
 * team: × (0.7 + 0.3 · players), design doc 4.6.
 */
export function nextLevelThreshold(level: number, mode: GameState["settings"]["mode"] = "coop", players = 1): number | null {
  return ascensionThreshold(level + 1, mode, players);
}

/** Players who share this economy and are still in the game. */
export function economyPlayers(state: GameState, economy: EconomyState): number {
  return Math.max(1, state.players.filter((p) => p.economyId === economy.id && !p.eliminated).length);
}

/** Threshold for the economy's next level, with its mode and team size. */
export function economyThreshold(state: GameState, economy: EconomyState, level = economy.ascension.level): number | null {
  return nextLevelThreshold(level, state.settings.mode, economyPlayers(state, economy));
}

/** Seconds per birth on a planet with `residents` inhabitants: base + perCitizen × residents (per mode). */
export function secondsPerBirth(state: GameState, residents: number): number {
  return balanceSecondsPerBirth(residents, state.settings.mode);
}

/** Food all `people` of an economy eat in one cycle; grows a little faster than the head count. */
export function foodUpkeepPerCycle(state: GameState, people: number): number {
  return people * foodUpkeepPerSecond(people) * state.settings.cycleSeconds;
}

/** Ascension points per cycle: inhabitants plus every building stage above the first. */
export function ascensionPerCycle(state: GameState, people: number, upgrades: number): { people: number; upgrades: number } {
  const perMinute = state.settings.cycleSeconds / 60;
  return { people: people * ASCENSION.pointsPerCitizenPerMinute * perMinute, upgrades: upgrades * ASCENSION.pointsPerUpgradePerMinute * perMinute };
}

/** Where an economy's ascension points per cycle come from (the cycle adds `total`). */
export interface AscensionIncome {
  citizens: number;
  /** Points from the inhabitants, after discovery bonuses. */
  people: number;
  /** Discovery bonus on the inhabitants' points, e.g. 0.1 for +10 %. */
  bonus: number;
  /** Building stages above the first, and the points they bring. */
  stages: number;
  upgrades: number;
  /** Bell tower, monument, crystal palace and the like. */
  buildings: number;
  total: number;
}

/** `residents` overrides the head count (the cycle uses the one taken before births and deaths). */
export function ascensionIncome(state: GameState, economy: EconomyState, residents?: number): AscensionIncome {
  let citizens = 0;
  let stages = 0;
  let buildings = 0;
  // Interiors count too: their workers and their building stages.
  for (const p of [...state.planets, ...(state.cores ?? [])]) {
    if (p.economyId !== economy.id) continue;
    if (residents === undefined) citizens += Object.values(state.units).filter((u) => u.planetId === p.id).length;
    for (const s of p.segments) {
      buildings += buildingStats(s)?.ascension ?? 0;
      if (s.building) stages += (s.tier ?? 1) - 1;
    }
  }
  if (residents !== undefined) citizens = residents;
  const earned = ascensionPerCycle(state, citizens, stages);
  const people = modified(economy, "ascensionPerCycle", earned.people);
  const bonus = earned.people > 0 ? people / earned.people - 1 : modified(economy, "ascensionPerCycle", 1) - 1;
  return { citizens, people, bonus, stages, upgrades: earned.upgrades, buildings, total: people + earned.upgrades + buildings };
}

export function ringDistance(a: number, b: number, n: number): number {
  const d = Math.abs(a - b) % n;
  return Math.min(d, n - d);
}

/** Sun system of a planet: 0 = home, 1 … = the neighbor systems behind the warp gate. */
export function systemOf(planet: Pick<PlanetState, "system">): number {
  return planet.system ?? 0;
}

/** Straight-line distance between two planets on the star map (orbit radius and angle); a warp jump between systems counts WARP.distance. */
export function planetDistance(a: PlanetState, b: PlanetState): number {
  if (systemOf(a) !== systemOf(b)) return WARP.distance;
  const ax = Math.cos(a.orbit.angle) * a.orbit.radius;
  const ay = Math.sin(a.orbit.angle) * a.orbit.radius;
  const bx = Math.cos(b.orbit.angle) * b.orbit.radius;
  const by = Math.sin(b.orbit.angle) * b.orbit.radius;
  return Math.hypot(ax - bx, ay - by);
}

export interface FlightPlan {
  distance: number;
  /** Rocket plus fuel. */
  cost: Partial<Record<ResourceId, number>>;
  seconds: number;
}

export function flightPlan(from: PlanetState, to: PlanetState, rocket: RocketId, passengers: number, economy?: EconomyState): FlightPlan {
  const def = ROCKETS[rocket];
  const distance = planetDistance(from, to);
  const cost: Partial<Record<ResourceId, number>> = { ...def.cost };
  const fuel = Math.ceil(modified(economy, "rocketFuel", def.fuel.takeoff + distance * (def.fuel.perDistance + def.fuel.perPassenger * passengers)));
  // Short of the main fuel (warp ship without antimatter): burn the replacement instead.
  if (def.altFuel && economy && economy.resources[def.fuel.resource] < fuel + (cost[def.fuel.resource] ?? 0)) {
    cost[def.altFuel.resource] = (cost[def.altFuel.resource] ?? 0) + fuel * def.altFuel.mul;
  } else cost[def.fuel.resource] = (cost[def.fuel.resource] ?? 0) + fuel;
  const seconds = def.warp ? WARP.seconds * (hasBuilding(from, "warp-core") ? CORE.warpCoreMul : 1) : Math.round(distance * def.secondsPerDistance);
  return { distance, cost, seconds: Math.max(1, seconds) };
}

export function canPay(economy: EconomyState, cost: Partial<Record<ResourceId, number>>): boolean {
  return RESOURCE_IDS.every((r) => economy.resources[r] >= (cost[r] ?? 0));
}

export function hasBuilding(planet: PlanetState, building: BuildingId): boolean {
  return planet.segments.some((s) => s.building === building);
}

/** Longest planet name (in characters). */
export const PLANET_NAME_MAX = 20;

/** A planet name as typed, made safe: no markup or control characters, single spaces, at most PLANET_NAME_MAX characters. */
export function cleanPlanetName(name: string): string {
  const plain = name.replace(/[\u0000-\u001f\u007f<>&"'`\\]/g, "").replace(/\s+/g, " ").trim();
  return Array.from(plain).slice(0, PLANET_NAME_MAX).join("").trim();
}

/** Why `playerId` cannot rename the planet right now, or null. Only its founder can, while their side still lives there. */
export function renameBlocker(state: GameState, playerId: string, planet: PlanetState): string | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || planet.founder !== playerId) return "Nur wer den Planeten zuerst besiedelt hat, kann ihn umbenennen";
  if (planet.economyId !== player.economyId) return "Der Planet gehört dir nicht mehr";
  return null;
}

/**
 * Why `playerId` cannot send a rocket from `from` to `to` with `count` passengers right now, or
 * null. Shared by the launch command and the UI.
 */
export function launchBlocker(state: GameState, playerId: string, from: PlanetState, to: PlanetState, rocket: RocketId, count: number): string | null {
  const player = playerById(state, playerId);
  const def = ROCKETS[rocket];
  if (!player || !def) return "Unbekannte Rakete";
  if (from.economyId !== player.economyId) return "Dieser Planet gehört dir nicht";
  if (from.id === to.id) return "Ziel ist der Startplanet";
  const warp = systemOf(from) !== systemOf(to);
  if (warp && !def.warp) return "In andere Sonnensysteme kommt nur das Warpschiff";
  if (!warp && def.warp) return "Das Warpschiff fliegt nur in andere Sonnensysteme";
  if (def.warp ? !hasBuilding(from, "warpgate") : !hasBuilding(from, "launchpad")) return def.warp ? "Dafür braucht es ein Warptor" : "Dafür braucht es eine Startrampe";
  if (to.type === "asteroid" && !asteroidsVisible(state.economies[player.economyId])) return "Dafür braucht es die Entdeckung Weltraumbergbau";
  if (blockaded(state, from)) return BLOCKADED;
  const economy = state.economies[player.economyId]!;
  // coop: only a faction at war with the team can be attacked (and attacks).
  const factionsInvolved = !!(factionOfEconomy(state, to.economyId) ?? factionOfEconomy(state, from.economyId));
  if (def.versusOnly && state.settings.mode !== "versus" && !factionsInvolved) return "Angriffe gibt es nur im Gegeneinander-Modus";
  if (rocket === "combat" && (to.economyId === null || to.economyId === player.economyId)) return "Angreifen kann man nur fremde Planeten";
  if (def.versusOnly && state.settings.mode !== "versus" && !atWar(state, from.economyId, to.economyId)) return "Dafür müsste Krieg herrschen";
  if (def.warp && to.economyId !== null && to.economyId !== player.economyId) return "Dort lebt schon jemand";
  if (rocket === "colony" && state.settings.mode !== "versus" && to.economyId !== null && to.economyId !== player.economyId) return "Dort lebt schon jemand";
  if (!Number.isInteger(count) || count < 1) return "Mindestens ein Einwohner muss mitfliegen";
  const capacity = rocketCapacity(economy, rocket);
  if (count > capacity) return `Höchstens ${capacity} Einwohner pro Rakete`;
  if (idleUnits(state, from, playerId).length < count) return "Nicht genug freie Einwohner";
  const plan = flightPlan(from, to, rocket, count, economy);
  if (plan.distance > def.maxRange) return "Zu weit weg";
  if (!canPay(economy, plan.cost)) return NOT_AFFORDABLE;
  return null;
}

/** Player whose people a unit counts for: captives still count for the player they came from. */
export function countsFor(unit: UnitState): string {
  return unit.originalOwner ?? unit.owner;
}

/** All inhabitants that count for a player, on planets and in flight. */
export function peopleOf(state: GameState, playerId: string): number {
  let n = 0;
  for (const u of Object.values(state.units)) if (countsFor(u) === playerId) n++;
  for (const f of state.flights) for (const u of f.units) if (countsFor(u) === playerId) n++;
  return n;
}

export function activePlayers(state: GameState): PlayerState[] {
  return state.players.filter((p) => !p.eliminated);
}

/** Asteroids show up on the map and can be flown to with the discovery "Weltraumbergbau". */
export function asteroidsVisible(economy: EconomyState | undefined): boolean {
  return hasUnlock(economy, "colonize-asteroid");
}

export const BLOCKADED = "Invasoren blockieren diesen Planeten";

/** Invaders besieging a planet block all launches from it. */
export function blockaded(state: GameState, planet: PlanetState): boolean {
  return !!state.invasion?.sieging && state.invasion.target === planet.id;
}

/** The sun as a flight target: the center of the star map. */
export const SUN_POSITION = { orbit: { radius: 0, angle: 0 } } as PlanetState;

/** Why a shield flight (build or repair a segment) cannot start, or null. */
export function shieldBlocker(state: GameState, playerId: string, from: PlanetState, segment: number, repair: boolean): string | null {
  const player = playerById(state, playerId);
  if (!player) return "Unbekannter Spieler";
  if (state.sun.novaTick === null) return "In diesem Spiel droht keine Supernova";
  if (from.economyId !== player.economyId) return "Dieser Planet gehört dir nicht";
  if (systemOf(from) !== 0) return "Zur Sonne fliegt man nur aus dem Heimatsystem";
  if (!hasBuilding(from, "launchpad")) return "Dafür braucht es eine Startrampe";
  if (blockaded(state, from)) return BLOCKADED;
  const economy = state.economies[player.economyId]!;
  if (economy.ascension.level < SUPERNOVA.unlockLevel) return `Ab Aufstiegsstufe ${SUPERNOVA.unlockLevel}`;
  const s = state.sun.shield[segment];
  if (!Number.isInteger(segment) || !s) return "Unbekanntes Hüllensegment";
  if (repair ? !s.built || s.hp >= 100 : s.built) return repair ? "Da gibt es nichts zu reparieren" : "Dieses Segment steht schon";
  if (state.flights.some((f) => f.shield?.segment === segment)) return "Dorthin ist schon eine Mannschaft unterwegs";
  if (idleUnits(state, from, playerId).length < SUPERNOVA.crew) return `Es braucht ${SUPERNOVA.crew} freie Einwohner`;
  if (!canPay(economy, shieldFlightPlan(from, repair, economy).cost)) return NOT_AFFORDABLE;
  return null;
}

/** Cost (segment or repair plus fuel) and flight time of a shield flight. */
export function shieldFlightPlan(from: PlanetState, repair: boolean, economy?: EconomyState): FlightPlan {
  const plan = flightPlan(from, SUN_POSITION, "colony", SUPERNOVA.crew, economy);
  const cost = { ...plan.cost };
  for (const [r, v] of Object.entries(repair ? SUPERNOVA.repairCost : SUPERNOVA.segmentCost)) cost[r as ResourceId] = (cost[r as ResourceId] ?? 0) + (v as number);
  // The colony rocket price is not paid twice: the crew rides a shuttle.
  for (const [r, v] of Object.entries(ROCKETS.colony.cost)) cost[r as ResourceId] = (cost[r as ResourceId] ?? 0) - (v as number);
  return { ...plan, cost, seconds: plan.seconds + SUPERNOVA.flightSeconds };
}

export function rocketCapacity(economy: EconomyState | undefined, rocket: RocketId): number {
  return modified(economy, "rocketCapacity", ROCKETS[rocket].capacity);
}


/** Bonus on the defenders' rolls on a planet. */
export function planetDefense(state: GameState, planet: PlanetState): number {
  let towers = 0;
  for (const s of planet.segments) towers += buildingStats(s)?.defense ?? 0;
  const economy = economyOf(state, planet);
  const general = modified(economy, "battleRoll", 0);
  const towerExtra = towers > 0 ? modified(economy, "battleRoll", 0, { building: "watchtower" }) - general : 0;
  return RULES.homeAdvantage + Math.min(RULES.maxTowerBonus, towers) + general + towerExtra;
}

/** Attackers downed on arrival at a planet, before the dice: pitfalls and worked flak. */
export function planetIntercept(state: GameState, planet: PlanetState): number {
  let total = 0;
  for (const s of planet.segments) {
    const stats = buildingStats(s);
    if (stats?.intercept) total += stats.intercept * (stats.workers > 0 ? workerCount(state, planet, s.index) : 1);
  }
  return Math.min(RULES.maxIntercept, total);
}

/** Roll bonus of combat rockets launched from this planet: worked barracks. */
export function planetAttackBonus(state: GameState, planet: PlanetState): number {
  let total = 0;
  for (const s of planet.segments) {
    const stats = buildingStats(s);
    if (stats?.attack && workerCount(state, planet, s.index) > 0) total += stats.attack;
  }
  return Math.min(RULES.maxAttackBonus, total);
}

/** Strength of a worked shield generator on the planet, 0 without one. */
export function planetShield(state: GameState, planet: PlanetState): number {
  let best = 0;
  for (const s of planet.segments) {
    const stats = buildingStats(s);
    if (stats?.shield && workerCount(state, planet, s.index) > 0) best = Math.max(best, stats.shield);
  }
  return best;
}

/** Settlers here need space suits: no breathable air, and not a start planet (those have a dome). */
export function needsSuits(planet: PlanetState): boolean {
  // Down inside a planet the deep suit does it (CORE).
  return planet.startSlot === null && !planet.coreOf && !PLANET_TYPES[planet.type].breathable;
}

/**
 * Settlers outside on an airless planet, who wear out suits: workers first, then idle settlers
 * without a bed. Seb: idle residents who fit into the houses there stay inside and need none.
 */
export function settlersOutside(state: GameState, planet: PlanetState): UnitState[] {
  if (!needsSuits(planet)) return [];
  const settlers = Object.values(state.units).filter((u) => u.planetId === planet.id);
  const idle = settlers.filter((u) => u.segment === null);
  // Only real houses keep the air in, not the base shelter every planet has.
  const indoors = Math.min(idle.length, planet.economyId === null ? 0 : Math.floor(housedInBuildings(state, planet) + 1e-9));
  return [...settlers.filter((u) => u.segment !== null), ...idle.slice(indoors)];
}

/** Why a cryo pod can't be thawed right now, or null. */
export function thawBlocker(state: GameState, planet: PlanetState, segment: SegmentState): string | null {
  if (!segment.cryo) return "Hier liegt keine Kryokapsel";
  const economy = planet.economyId ? state.economies[planet.economyId] : undefined;
  if (!economy) return "Dieser Planet gehört niemandem";
  for (const [r, v] of Object.entries(CRYO.thawCost)) if (economy.resources[r as ResourceId] < (v as number)) return NOT_AFFORDABLE;
  return null;
}
