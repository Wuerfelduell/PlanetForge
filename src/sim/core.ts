import { BIOMES, CORE, RULES, type BiomeId, type ResourceId } from "./content";
import { buildingStats, hasBuilding, neighbors, planetById, powerFactor, ringDistance, toolFactor } from "./rules";
import { Rng, seedFromString } from "./rng";
import type { EconomyState, GameEvent, GameState, PlanetState, SegmentState, UnitState } from "./state";

/**
 * The planet interior (Seb, "Reise zum Mittelpunkt der Erde"). A core drill on the surface opens a
 * ring of cave fields inside the planet, stored as a planet of its own in GameState.cores. Workers
 * go down in deep suits and come back up when they stop working; nobody lives down there.
 */

const DT = 1 / RULES.ticksPerSecond;

/** Every planet the simulation runs: the planets, then the opened interiors. */
export function allPlanets(state: GameState): PlanetState[] {
  return state.cores?.length ? [...state.planets, ...state.cores] : state.planets;
}

/** The interior of a planet, once its core drill broke through. */
export function coreOf(state: GameState, planet: PlanetState): PlanetState | undefined {
  return state.cores?.find((c) => c.coreOf === planet.id);
}

/** The planet around an interior; a normal planet is its own surface. */
export function surfaceOf(state: GameState, planet: PlanetState): PlanetState {
  return planet.coreOf ? (planetById(state, planet.coreOf) ?? planet) : planet;
}

/** Workers of an economy inside planets; each one wears a deep suit. */
export function coreWorkers(state: GameState, economyId: string): UnitState[] {
  const cores = new Set((state.cores ?? []).filter((c) => c.economyId === economyId).map((c) => c.id));
  return cores.size ? Object.values(state.units).filter((u) => cores.has(u.planetId)) : [];
}

/** Deep suits in stock that nobody wears yet. */
export function freeDeepSuits(state: GameState, economy: EconomyState): number {
  return Math.max(0, Math.floor(economy.resources["deep-suit"] + 1e-9) - coreWorkers(state, economy.id).length);
}

/** Why `count` more workers cannot go down into this interior, or null. */
export function coreAccessBlocker(state: GameState, core: PlanetState, count: number): string | null {
  const surface = surfaceOf(state, core);
  if (!hasBuilding(surface, "core-drill")) return "Ohne Kernbohrung kommt niemand hinunter";
  const economy = core.economyId === null ? undefined : state.economies[core.economyId];
  if (!economy) return "Unbewohnter Planet";
  if (freeDeepSuits(state, economy) < count) return "Zu wenig Tiefenanzüge (Werkstatt Stufe 2)";
  return null;
}

/** Drilling progress 0 … 1 of a planet without interior yet. */
export function drillProgress(planet: PlanetState): number {
  return Math.min(1, (planet.drill ?? 0) / CORE.drillSeconds);
}

/** Chances per cycle on a cave field: a quake while somebody works there, a magma burst while something stands there. */
export function coreHazard(core: PlanetState, segment: SegmentState): { quake: number; eruption: number } {
  const near = neighbors(core, segment.index);
  const pillar = [segment, ...near].some((s) => s.building === "support-pillar") ? CORE.pillarMul : 1;
  const quake = CORE.quake[segment.biome] ?? 0;
  const eruption = segment.biome === "magma-lake" ? CORE.eruption.lake : near.some((n) => n.biome === "magma-lake") ? CORE.eruption.nextToLake : 0;
  return { quake: quake * pillar, eruption: eruption * pillar };
}

/** One tick of a worked core drill on a planet without interior: drills on, and opens it once through. */
export function drill(state: GameState, planet: PlanetState, segment: SegmentState, workers: number, economy: EconomyState, events: GameEvent[]): void {
  if (planet.coreOf || coreOf(state, planet) || workers <= 0) return;
  const def = buildingStats(segment)!;
  planet.drill = (planet.drill ?? 0) + DT * Math.min(1, workers / def.workers) * powerFactor(planet, segment) * toolFactor(segment, economy);
  if (planet.drill + 1e-9 < CORE.drillSeconds) return;
  delete planet.drill;
  const core = generateCore(state, planet);
  (state.cores ??= []).push(core);
  events.push({ type: "coreOpened", planetId: planet.id, coreId: core.id, playerId: segment.builtBy ?? "" });
}

/** Weights of the cave biomes by the kind of planet around them. */
function caveWeights(planet: PlanetState): [BiomeId, number][] {
  const w: Partial<Record<BiomeId, number>> = { "mushroom-forest": 3, "crystal-grotto": 3, "magma-lake": 2, "primal-sea": 2 };
  if (planet.type === "lava") w["magma-lake"]! += 2;
  if (planet.type === "ocean" || planet.type === "ice") w["primal-sea"]! += 2;
  if (planet.type === "toxic" || planet.type === "arid") w["crystal-grotto"]! += 2;
  return Object.entries(w) as [BiomeId, number][];
}

/** The interior of a planet, from its own seed stream so nothing else in the world changes. */
export function generateCore(state: GameState, planet: PlanetState): PlanetState {
  const rng = new Rng(seedFromString(`${state.seed}:core:${planet.id}`));
  const weights = caveWeights(planet);
  const total = weights.reduce((sum, [, v]) => sum + v, 0);
  const pick = (): BiomeId => {
    let r = rng.next() * total;
    for (const [b, v] of weights) if ((r -= v) < 0) return b;
    return weights[0]![0];
  };
  const segments: SegmentState[] = [];
  for (let index = 0; index < CORE.segments; index++) {
    // The shaft comes down on safe ground.
    let biome = pick();
    if (index === 0 && biome === "magma-lake") biome = "mushroom-forest";
    const deposits = BIOMES[biome].deposits.map((d) => {
      const amount = Math.max(1, Math.round(d.max * (CORE.amount[0] + rng.next() * (CORE.amount[1] - CORE.amount[0]))));
      return { resource: d.resource, amount, max: amount, infinite: false, byHand: false };
    });
    const revealed = ringDistance(index, 0, CORE.segments) <= CORE.revealRadius;
    segments.push({ index, biome, revealed, deposits, building: null, builtBy: null, gather: null });
  }
  const extras = rng.int(...CORE.extra.count);
  for (let i = 0; i < extras; i++) {
    const s = segments[rng.int(0, CORE.segments - 1)]!;
    const resource: ResourceId = rng.pick(CORE.extra.rare);
    const amount = rng.int(...CORE.extra.amount);
    const d = s.deposits.find((x) => x.resource === resource);
    if (d) {
      d.amount += amount;
      d.max += amount;
    } else s.deposits.push({ resource, amount, max: amount, infinite: false, byHand: false });
  }
  const core: PlanetState = {
    id: `${planet.id}-core`,
    name: "Inneres",
    type: planet.type,
    orbit: { ...planet.orbit },
    startSlot: null,
    economyId: planet.economyId,
    birthProgress: 0,
    segments,
    coreOf: planet.id,
  };
  if (planet.system !== undefined) core.system = planet.system;
  return core;
}

/**
 * Every tick: an interior belongs to whoever holds its planet (workers of another side are lost
 * down there), and workers who stopped working ride back up.
 */
export function syncCores(state: GameState): void {
  if (!state.cores?.length) return;
  const cores = new Map(state.cores.map((c) => [c.id, c]));
  for (const core of state.cores) {
    const surface = planetById(state, core.coreOf!);
    const economyId = surface?.economyId ?? null;
    if (core.economyId === economyId) continue;
    core.economyId = economyId;
    delete state.queues[core.id];
  }
  for (const [id, u] of Object.entries(state.units)) {
    const core = cores.get(u.planetId);
    if (!core) continue;
    const owner = state.players.find((p) => p.id === u.owner);
    if (!owner || owner.economyId !== core.economyId) delete state.units[id];
    else if (u.segment === null) u.planetId = core.coreOf!;
  }
}

/** End of a cycle: quakes and magma bursts in every interior. Draws from the game's random stream. */
export function coreCycle(state: GameState, events: GameEvent[]): void {
  if (!state.cores?.length) return;
  const rng = new Rng(state.rng);
  for (const core of state.cores) {
    if (core.economyId === null) continue;
    const economy = state.economies[core.economyId]!;
    for (const s of core.segments) {
      const { quake, eruption } = coreHazard(core, s);
      const workers = () => Object.values(state.units).filter((u) => u.planetId === core.id && u.segment === s.index);
      if (quake > 0 && workers().length > 0 && rng.next() < quake) {
        kill(state, economy, workers()[0]!);
        events.push({ type: "quake", planetId: core.id, segment: s.index, killed: 1 });
      }
      if (eruption > 0 && s.building && rng.next() < eruption) {
        const building = s.building;
        const victim = workers()[0];
        if (victim) kill(state, economy, victim);
        const tier = s.tier ?? 1;
        const wrecked = tier <= 1;
        if (wrecked) {
          for (const u of workers()) u.segment = null;
          s.building = null;
          s.builtBy = null;
          s.ruin = true;
          delete s.tier;
        } else s.tier = tier - 1;
        // A lower stage may hold fewer workers: the rest climbs back up.
        const cap = s.building ? buildingStats(s)!.workers : 0;
        for (const u of workers().slice(cap)) u.segment = null;
        events.push({ type: "eruption", planetId: core.id, segment: s.index, killed: victim ? 1 : 0, building, wrecked });
      }
    }
  }
  state.rng = rng.seed;
  syncCores(state);
}

/** A worker dies down there, and the suit is lost with them. */
function kill(state: GameState, economy: EconomyState, unit: UnitState): void {
  delete state.units[unit.id];
  economy.resources["deep-suit"] = Math.max(0, economy.resources["deep-suit"] - 1);
}

/** Whether work inside this interior runs: the shaft (core drill) must stand on the surface. */
export function shaftOpen(state: GameState, core: PlanetState): boolean {
  return hasBuilding(surfaceOf(state, core), "core-drill");
}

