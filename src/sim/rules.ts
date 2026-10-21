import { BIOMES, BUILDINGS, RESOURCE_IDS, ROCKETS, RULES, SUPERNOVA, type BuildingId, type ResourceId, type RocketId } from "./content";
import { hasUnlock, modified } from "./discoveries";
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

export function planetById(state: GameState, id: string): PlanetState | undefined {
  return state.planets.find((p) => p.id === id);
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

export function housing(state: GameState, planet: PlanetState): number {
  if (planet.economyId === null) return 0;
  // Every additional people on a shared planet brings its own shelter for the inhabitants it arrives with.
  const peoples = new Set(unitsOn(state, planet.id).map((u) => u.owner)).size;
  let total = RULES.baseHousing + Math.max(0, peoples - 1) * RULES.coopJoinPopulation;
  const economy = economyOf(state, planet);
  for (const s of planet.segments) {
    const h = s.building ? BUILDINGS[s.building].housing : undefined;
    if (h) total += modified(economy, "housing", h, { building: s.building! });
  }
  return total;
}

export function workerCapacity(segment: SegmentState): number {
  if (segment.building) return BUILDINGS[segment.building].workers;
  return segment.deposits.some((d) => d.byHand) ? RULES.handWorkersPerSegment : 0;
}

export function adjacencyMultiplier(planet: PlanetState, segment: SegmentState): number {
  if (!segment.building) return 1;
  const adj = BUILDINGS[segment.building].adjacency;
  if (!adj) return 1;
  const count = neighbors(planet, segment.index).filter((n) => n.biome === adj.biome).length;
  return 1 + count * adj.bonus;
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
  if (!BIOMES[segment.biome].buildable) return `Auf ${BIOMES[segment.biome].name} kann man nicht bauen`;
  if (economy.ascension.level < def.unlockLevel) return `Ab Aufstiegsstufe ${def.unlockLevel}`;
  if (!def.allowedBiomes.includes(segment.biome)) return `Nicht auf ${BIOMES[segment.biome].name}`;
  if (!canAfford(economy, building)) return NOT_AFFORDABLE;
  return null;
}

/** Production per second of one segment with `workers` working on it, before starvation. `economy` adds discovery bonuses. */
export function segmentOutput(planet: PlanetState, segment: SegmentState, workers: number, economy?: EconomyState): Partial<Record<ResourceId, number>> {
  const out: Partial<Record<ResourceId, number>> = {};
  if (workers <= 0) return out;
  const mult = adjacencyMultiplier(planet, segment);
  const def = segment.building ? BUILDINGS[segment.building] : null;
  const bonus = (resource: ResourceId) => modified(economy, "buildingOutput", 1, { building: segment.building ?? undefined, resource });
  if (def?.produces) {
    const r = def.produces.resource;
    out[r] = def.produces.perWorker * workers * mult * bonus(r);
  } else if (def?.extracts) {
    const available = segment.deposits.filter((d) => def.extracts!.resources.includes(d.resource) && (d.infinite || d.amount > 0));
    // Workers split evenly over everything the building can reach.
    for (const d of available) out[d.resource] = ((def.extracts.perWorker * workers * mult) / available.length) * bonus(d.resource);
  } else if (!def) {
    const d = segment.deposits.find((x) => x.resource === segment.gather);
    if (d && d.byHand && (d.infinite || d.amount > 0)) out[d.resource] = modified(economy, "handGatherRate", RULES.handRatePerWorker) * workers;
  }
  return out;
}

export function nextLevelThreshold(level: number): number | null {
  return RULES.ascensionThresholds[level] ?? null;
}

export function ringDistance(a: number, b: number, n: number): number {
  const d = Math.abs(a - b) % n;
  return Math.min(d, n - d);
}

/** Straight-line distance between two planets on the star map (orbit radius and angle). */
export function planetDistance(a: PlanetState, b: PlanetState): number {
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
  const fuel = Math.ceil(modified(economy, "rocketFuel", distance * (def.fuel.perDistance + def.fuel.perPassenger * passengers)));
  cost[def.fuel.resource] = (cost[def.fuel.resource] ?? 0) + fuel;
  return { distance, cost, seconds: Math.max(1, Math.round(distance * def.secondsPerDistance)) };
}

export function canPay(economy: EconomyState, cost: Partial<Record<ResourceId, number>>): boolean {
  return RESOURCE_IDS.every((r) => economy.resources[r] >= (cost[r] ?? 0));
}

export function hasBuilding(planet: PlanetState, building: BuildingId): boolean {
  return planet.segments.some((s) => s.building === building);
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
  if (!hasBuilding(from, "launchpad")) return "Dafür braucht es eine Startrampe";
  if (to.type === "asteroid" && !asteroidsVisible(state.economies[player.economyId])) return "Dafür braucht es die Entdeckung Weltraumbergbau";
  if (blockaded(state, from)) return BLOCKADED;
  const economy = state.economies[player.economyId]!;
  const unlockLevel = rocketUnlockLevel(economy, rocket);
  if (economy.ascension.level < unlockLevel) return `Ab Aufstiegsstufe ${unlockLevel}`;
  if (def.versusOnly && state.settings.mode !== "versus") return "Angriffe gibt es nur im Gegeneinander-Modus";
  if (rocket === "combat" && (to.economyId === null || to.economyId === player.economyId)) return "Angreifen kann man nur fremde Planeten";
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
  return { ...plan, cost };
}

export function rocketCapacity(economy: EconomyState | undefined, rocket: RocketId): number {
  return modified(economy, "rocketCapacity", ROCKETS[rocket].capacity);
}

export function rocketUnlockLevel(economy: EconomyState | undefined, rocket: RocketId): number {
  // Rocketry: combat rockets one level earlier.
  return rocket === "combat" && hasUnlock(economy, "rocket-combat-early") ? ROCKETS.combat.unlockLevel - 1 : ROCKETS[rocket].unlockLevel;
}

/** Bonus on the defenders' rolls on a planet. */
export function planetDefense(state: GameState, planet: PlanetState): number {
  let towers = 0;
  for (const s of planet.segments) if (s.building) towers += BUILDINGS[s.building].defense ?? 0;
  const economy = economyOf(state, planet);
  const general = modified(economy, "battleRoll", 0);
  const towerExtra = towers > 0 ? modified(economy, "battleRoll", 0, { building: "watchtower" }) - general : 0;
  return RULES.homeAdvantage + Math.min(RULES.maxTowerBonus, towers) + general + towerExtra;
}
