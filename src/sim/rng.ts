/** Deterministic PRNG (mulberry32). The state is a plain number so it can live inside GameState. */
export function nextRandom(seed: number): [value: number, nextSeed: number] {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Small mutable wrapper for code that draws many numbers in a row (e.g. world generation). */
export class Rng {
  constructor(public seed: number) {}

  next(): number {
    const [value, seed] = nextRandom(this.seed);
    this.seed = seed;
    return value;
  }

  int(minInclusive: number, maxInclusive: number): number {
    return minInclusive + Math.floor(this.next() * (maxInclusive - minInclusive + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]!;
  }
}

/** Turns any string (e.g. a room code) into a 32-bit seed. */
export function seedFromString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}
