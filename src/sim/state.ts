import type { BiomeId, BuildingId, ResourceId } from "./content";

/**
 * The complete game state. Plain JSON data only (no classes, Maps, Sets or functions), so it
 * can be saved, stored in a database row, sent over the network or diffed as is.
 */
export interface GameState {
  version: 2;
  seed: string;
  /** Current PRNG state; the simulation draws all randomness from here. */
  rng: number;
  /** Timestamp (ms, caller's clock) up to which the simulation has been computed. */
  simTime: number;
  tick: number;
  players: PlayerState[];
  /** Shared economy: in coop all players work on the same stockpile and population. */
  resources: Record<ResourceId, number>;
  population: number;
  /** Seconds of progress toward the next birth. */
  birthProgress: number;
  starving: boolean;
  ascension: { level: number; points: number };
  planets: PlanetState[];
}

export interface PlayerInit {
  id: string;
  name: string;
}

export interface PlayerState extends PlayerInit {
  /** Index into a shared player color palette (the renderer picks the actual color). */
  color: number;
}

export interface PlanetState {
  id: string;
  segments: SegmentState[];
}

export interface SegmentState {
  index: number;
  biome: BiomeId;
  revealed: boolean;
  deposits: DepositState[];
  building: BuildingId | null;
  /** playerId of whoever built the building, null without building. */
  builtBy: string | null;
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
  | { type: "build"; planetId: string; segment: number; building: BuildingId }
  | { type: "demolish"; planetId: string; segment: number }
  | { type: "assign"; planetId: string; segment: number; delta: number }
  | { type: "setGather"; planetId: string; segment: number; resource: ResourceId };

/** Things that happened, for UI feedback (toasts, sounds). Not part of the state. */
export type GameEvent =
  | { type: "born"; population: number }
  | { type: "cycle"; cycle: number }
  | { type: "levelUp"; level: number }
  | { type: "depleted"; planetId: string; segment: number; resource: ResourceId }
  | { type: "starving" }
  | { type: "revealed"; planetId: string; segments: number[] }
  | { type: "built"; planetId: string; segment: number; building: BuildingId; playerId: string }
  | { type: "demolished"; planetId: string; segment: number; playerId: string };

export type CommandResult = { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: string };
