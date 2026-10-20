import type { BiomeId, BuildingId, ResourceId } from "./content";

/**
 * The complete game state. Plain JSON data only (no classes, no functions), so it can be
 * saved, sent over the network or diffed as is.
 */
export interface GameState {
  version: 1;
  seed: number;
  /** Current PRNG state; the simulation draws all randomness from here. */
  rng: number;
  tick: number;
  resources: Record<ResourceId, number>;
  population: number;
  /** Seconds of progress toward the next birth. */
  birthProgress: number;
  starving: boolean;
  ascension: { level: number; points: number };
  planet: PlanetState;
}

export interface PlanetState {
  segments: SegmentState[];
}

export interface SegmentState {
  index: number;
  biome: BiomeId;
  revealed: boolean;
  deposits: DepositState[];
  building: BuildingId | null;
  workers: number;
  /** Which deposit hand-gatherers collect when there is no building. */
  gather: ResourceId | null;
}

export interface DepositState {
  resource: ResourceId;
  amount: number;
  max: number;
  infinite: boolean;
  byHand: boolean;
}

/** Player intents. The only way anything outside the simulation changes the state. */
export type Command =
  | { type: "build"; segment: number; building: BuildingId }
  | { type: "demolish"; segment: number }
  | { type: "assign"; segment: number; delta: number }
  | { type: "setGather"; segment: number; resource: ResourceId };

/** Who sent a command. Unused in single player, needed for coop permissions and logs. */
export interface CommandMeta {
  playerId?: string;
}

export type CommandResult = { ok: true } | { ok: false; reason: string };

/** Things that happened during a tick, for UI feedback (toasts, sounds). Not part of the state. */
export type SimEvent =
  | { type: "born"; population: number }
  | { type: "cycle"; cycle: number }
  | { type: "levelUp"; level: number }
  | { type: "depleted"; segment: number; resource: ResourceId }
  | { type: "starving" }
  | { type: "revealed"; segments: number[] };
