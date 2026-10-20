import { BIOMES, BIOME_IDS, RESOURCE_IDS, RULES, type BiomeId, type ResourceId } from "./content";
import { Rng } from "./rng";
import type { DepositState, GameState, SegmentState } from "./state";

export interface NewGameOptions {
  seed: number;
}

/** Same seed, same planet: needed for coop (every client can rebuild the world) and bug reports. */
export function createGame({ seed }: NewGameOptions): GameState {
  const rng = new Rng(seed);
  const biomes = generateBiomes(rng);
  const segments = biomes.map((biome, index) => createSegment(index, biome, rng));
  for (const s of segments) {
    if (ringDistance(s.index, 0, segments.length) <= RULES.startRevealRadius) s.revealed = true;
  }

  const resources = Object.fromEntries(RESOURCE_IDS.map((r) => [r, RULES.startResources[r] ?? 0])) as Record<ResourceId, number>;

  return {
    version: 1,
    seed,
    rng: rng.seed,
    tick: 0,
    resources,
    population: RULES.startPopulation,
    birthProgress: 0,
    starving: false,
    ascension: { level: 0, points: 0 },
    planet: { segments },
  };
}

function generateBiomes(rng: Rng): BiomeId[] {
  const n = RULES.segmentCount;
  const r = RULES.startRevealRadius;
  // The visible start area always offers wood, food and stone, so every seed is playable.
  const start = (["forest", "forest", "meadow", "mountain", rng.pick(BIOME_IDS)] as BiomeId[]).slice(0, 2 * r + 1);
  shuffle(start, rng);

  const rest: BiomeId[] = [];
  let previous: BiomeId = start[start.length - 1]!;
  while (rest.length < n - start.length) {
    let biome = rng.pick(BIOME_IDS);
    if (biome === previous) biome = rng.pick(BIOME_IDS);
    const run = rng.int(1, 3);
    for (let i = 0; i < run && rest.length < n - start.length; i++) rest.push(biome);
    previous = biome;
  }
  if (!rest.includes("sea")) rest[Math.floor(rest.length / 2)] = "sea";

  // Segment 0 is the middle of the start window; the window wraps around index 0.
  const out = new Array<BiomeId>(n);
  for (let i = 0; i < start.length; i++) out[(i - r + n) % n] = start[i]!;
  for (let i = 0; i < rest.length; i++) out[r + 1 + i] = rest[i]!;
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
    workers: 0,
    gather: deposits.find((d) => d.byHand)?.resource ?? null,
  };
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
