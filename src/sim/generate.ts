import {
  BIOMES,
  PLANET_TYPE_IDS,
  PLANET_TYPES,
  RARE_RESOURCES,
  RESOURCE_IDS,
  RULES,
  SYSTEM,
  type BiomeId,
  type PlanetTypeId,
  type ResourceId,
} from "./content";
import { Rng, seedFromString } from "./rng";
import type { DepositState, GameState, PlanetState, PlayerInit, SegmentState } from "./state";

export interface GameOptions {
  /** Start timestamp (ms, caller's clock). Later advance()/applyCommand() calls use the same clock. */
  now?: number;
  /** Start planets to generate; players beyond the initial ones can join later via addPlayer(). */
  maxPlayers?: number;
}

/**
 * Builds a whole star system from the seed: same seed, same system, on every client and on the
 * server. Players take start slots in order; unused start planets wait for later joiners.
 */
export function createGame(seed: string, players: PlayerInit[], options: GameOptions = {}): GameState {
  const maxPlayers = options.maxPlayers ?? SYSTEM.maxPlayers;
  if (players.length === 0) throw new Error("createGame needs at least one player");
  if (players.length > maxPlayers) throw new Error(`At most ${maxPlayers} players`);

  const rng = new Rng(seedFromString(seed));
  const sun = { type: rng.pick(SYSTEM.sunTypes) };
  const planets = generatePlanets(rng, maxPlayers);

  let state: GameState = {
    version: 3,
    seed,
    rng: 0,
    simTime: options.now ?? 0,
    tick: 0,
    players: [],
    ascension: { level: 0, points: 0 },
    sun,
    planets,
  };
  for (const p of players) {
    const result = addPlayer(state, p);
    if (!result.ok) throw new Error(result.error);
    state = result.state;
  }
  state.rng = rng.seed;
  return state;
}

/** Lets a player join a running game on the next free start planet. Never mutates the input. */
export function addPlayer(state: GameState, player: PlayerInit): { ok: true; state: GameState } | { ok: false; error: string } {
  if (state.players.some((p) => p.id === player.id)) return { ok: false, error: "Spieler ist schon dabei" };
  const next = JSON.parse(JSON.stringify(state)) as GameState;
  const planet = next.planets
    .filter((p) => p.startSlot !== null && p.ownerId === null)
    .sort((a, b) => a.startSlot! - b.startSlot!)[0];
  if (!planet) return { ok: false, error: "Kein freier Startplanet mehr" };

  planet.ownerId = player.id;
  planet.population = RULES.startPopulation;
  for (const r of RESOURCE_IDS) planet.resources[r] = RULES.startResources[r] ?? 0;
  for (const s of planet.segments) {
    if (ringDistance(s.index, 0, planet.segments.length) <= RULES.startRevealRadius) s.revealed = true;
  }
  const usedColors = new Set(next.players.map((p) => p.color));
  let color = 0;
  while (usedColors.has(color)) color++;
  next.players.push({ id: player.id, name: player.name, color, homePlanetId: planet.id });
  return { ok: true, state: next };
}

function generatePlanets(rng: Rng, maxPlayers: number): PlanetState[] {
  const freeCount = rng.int(SYSTEM.freePlanets.min, SYSTEM.freePlanets.max);
  const kinds: (number | null)[] = [...Array.from({ length: maxPlayers }, (_, i) => i), ...Array<null>(freeCount).fill(null)];
  shuffle(kinds, rng);

  const rarePackages = startRarePackages(rng, maxPlayers);
  const usedNames = new Set<string>();

  return kinds.map((startSlot, i) => {
    const isStart = startSlot !== null;
    const type: PlanetTypeId = isStart ? "temperate" : rng.pick(PLANET_TYPE_IDS);
    const size = isStart ? SYSTEM.startPlanetSegments : rng.pick(SYSTEM.freePlanetSegments);
    const biomes = isStart ? startPlanetBiomes(rng, size) : weightedBiomes(rng, type, size);
    const segments = biomes.map((biome, index) => createSegment(index, biome, rng));

    const rare = isStart
      ? rarePackages[startSlot]!
      : pickDistinct(rng, Object.keys(RARE_RESOURCES) as ResourceId[], rng.int(SYSTEM.rarePerFreePlanet.min, SYSTEM.rarePerFreePlanet.max));
    for (const resource of rare) placeRareDeposit(rng, segments, resource, isStart);

    let name = planetName(rng);
    while (usedNames.has(name)) name = planetName(rng);
    usedNames.add(name);

    return {
      id: `p${i}`,
      name,
      type,
      orbit: { radius: i + 1, angle: rng.next() * Math.PI * 2 },
      startSlot,
      ownerId: null,
      resources: Object.fromEntries(RESOURCE_IDS.map((r) => [r, 0])) as Record<ResourceId, number>,
      population: 0,
      birthProgress: 0,
      starving: false,
      segments,
    };
  });
}

/**
 * Splits the rare resources over the start slots so that the first two players together have
 * all of them and every player has something the others lack (design/koop-design.md, 4.1).
 */
function startRarePackages(rng: Rng, maxPlayers: number): ResourceId[][] {
  const rare = Object.keys(RARE_RESOURCES) as ResourceId[];
  shuffle(rare, rng);
  const half = Math.ceil(rare.length / 2);
  const evens = rare.filter((_, i) => i % 2 === 0);
  const odds = rare.filter((_, i) => i % 2 === 1);
  const patterns = [rare.slice(0, half), rare.slice(half), evens, odds];
  return Array.from({ length: maxPlayers }, (_, slot) => patterns[slot % patterns.length]!.slice(0, SYSTEM.rarePerStartPlanet));
}

function placeRareDeposit(rng: Rng, segments: SegmentState[], resource: ResourceId, keepStartArea: boolean): void {
  const allowed = RARE_RESOURCES[resource]!;
  const n = segments.length;
  // On start planets the rare stuff waits outside the start area, as a reason to explore.
  const eligible = segments.filter((s) => !keepStartArea || ringDistance(s.index, 0, n) > RULES.startRevealRadius);
  let candidates = eligible.filter((s) => allowed.includes(s.biome));
  if (candidates.length === 0) {
    const land = eligible.filter((s) => s.biome !== "ocean");
    const target = rng.pick(land.length ? land : eligible);
    const fresh = createSegment(target.index, allowed[0]!, rng);
    segments[target.index] = fresh;
    candidates = [fresh];
  }
  const segment = rng.pick(candidates);
  const max = Math.round(SYSTEM.rareDepositMax * (0.75 + rng.next() * 0.5));
  const existing = segment.deposits.find((d) => d.resource === resource);
  if (existing) {
    existing.max += max;
    existing.amount += max;
  } else {
    segment.deposits.push({ resource, amount: max, max, infinite: false, byHand: false });
  }
}

function startPlanetBiomes(rng: Rng, size: number): BiomeId[] {
  const r = RULES.startRevealRadius;
  // The visible start area always offers wood, food and stone, so every seed is playable.
  const start = (["forest", "forest", "savanna", "mountains", rng.pick(["forest", "savanna", "mountains", "ocean", "swamp"])] as BiomeId[]).slice(0, 2 * r + 1);
  shuffle(start, rng);
  const rest = weightedBiomes(rng, "temperate", size - start.length);
  if (!rest.includes("ocean")) rest[Math.floor(rest.length / 2)] = "ocean";

  // Segment 0 is the middle of the start window; the window wraps around index 0.
  const out = new Array<BiomeId>(size);
  for (let i = 0; i < start.length; i++) out[(i - r + size) % size] = start[i]!;
  for (let i = 0; i < rest.length; i++) out[r + 1 + i] = rest[i]!;
  return out;
}

/** Biomes in runs of 1–3 equal segments, drawn by the planet type's weights. */
function weightedBiomes(rng: Rng, type: PlanetTypeId, count: number): BiomeId[] {
  const weights = Object.entries(PLANET_TYPES[type].biomeWeights) as [BiomeId, number][];
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  const draw = (): BiomeId => {
    let x = rng.next() * total;
    for (const [biome, w] of weights) if ((x -= w) < 0) return biome;
    return weights[weights.length - 1]![0];
  };
  const out: BiomeId[] = [];
  let previous: BiomeId | null = null;
  while (out.length < count) {
    let biome = draw();
    if (biome === previous) biome = draw();
    const run = rng.int(1, 3);
    for (let i = 0; i < run && out.length < count; i++) out.push(biome);
    previous = biome;
  }
  return out;
}

function createSegment(index: number, biome: BiomeId, rng: Rng): SegmentState {
  const deposits: DepositState[] = BIOMES[biome].deposits.map((d) => {
    // ±25 % variation per segment.
    const max = d.infinite ? 0 : Math.round(d.max * (0.75 + rng.next() * 0.5));
    return { resource: d.resource, amount: max, max, infinite: !!d.infinite, byHand: !!d.byHand };
  });
  return {
    index,
    biome,
    revealed: false,
    deposits,
    building: null,
    builtBy: null,
    workers: 0,
    gather: deposits.find((d) => d.byHand)?.resource ?? null,
  };
}

const SYLLABLES = ["ka", "lo", "mi", "ra", "ven", "tu", "sel", "dor", "ny", "quo", "bri", "za", "fen", "ol", "ix", "mar", "pe", "su"];

function planetName(rng: Rng): string {
  const parts = rng.int(2, 3);
  let name = "";
  for (let i = 0; i < parts; i++) name += rng.pick(SYLLABLES);
  return name[0]!.toUpperCase() + name.slice(1);
}

function pickDistinct<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const copy = [...items];
  shuffle(copy, rng);
  return copy.slice(0, Math.min(count, copy.length));
}

function shuffle<T>(items: T[], rng: Rng): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
}

export function ringDistance(a: number, b: number, n: number): number {
  const d = Math.abs(a - b) % n;
  return Math.min(d, n - d);
}
