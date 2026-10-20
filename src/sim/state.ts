import type { BiomeId, BuildingId, PeopleId, PlanetTypeId, ResourceId } from "./content";

/**
 * The complete game state. Plain JSON data only (no classes, Maps, Sets or functions), so it
 * can be saved, stored in a database row, sent over the network or diffed as is.
 */
/**
 * coop: everyone shares one start planet, its stockpile and the ascension (long-term play).
 * versus: every player has an own start planet, stockpile and ascension (short matches).
 */
export type GameMode = "coop" | "versus";

export interface GameState {
  version: 5;
  mode: GameMode;
  maxPlayers: number;
  seed: string;
  /** Current PRNG state; the simulation draws all randomness from here. */
  rng: number;
  /** Timestamp (ms, caller's clock) up to which the simulation has been computed. */
  simTime: number;
  tick: number;
  players: PlayerState[];
  /** coop: one team for everybody. versus: one team per player. */
  teams: TeamState[];
  sun: { type: string };
  planets: PlanetState[];
}

export interface TeamState {
  id: string;
  /** Points from every planet of the team add up; levels unlock buildings for the whole team. */
  ascension: { level: number; points: number };
}

export interface PlayerInit {
  id: string;
  name: string;
  /** People (animal faction) the player plays; picked automatically if left out. */
  people?: PeopleId;
}

export interface PlayerState extends PlayerInit {
  /** Index into a shared player color palette (the renderer picks the actual color). */
  color: number;
  people: PeopleId;
  teamId: string;
  homePlanetId: string;
}

export interface PlanetState {
  id: string;
  name: string;
  type: PlanetTypeId;
  /** Position on the star map: orbit radius in arbitrary units, angle in radians. */
  orbit: { radius: number; angle: number };
  /** Start slot (0 … maxPlayers-1) if this is a start planet, else null. */
  startSlot: number | null;
  /** Team that controls the planet, null while nobody lives here. Every team member may act on it. */
  teamId: string | null;
  /** Stockpile, population and food are local to each planet. */
  resources: Record<ResourceId, number>;
  /** Inhabitants per playerId. In coop every player brings an own people to the shared planet. */
  citizens: Record<string, number>;
  /** Seconds of progress toward the next birth. */
  birthProgress: number;
  starving: boolean;
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
  /** Assigned inhabitants per playerId; only their owner moves them. */
  workers: Record<string, number>;
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
  | { type: "born"; planetId: string; playerId: string; population: number }
  | { type: "cycle"; cycle: number }
  | { type: "levelUp"; teamId: string; level: number }
  | { type: "depleted"; planetId: string; segment: number; resource: ResourceId }
  | { type: "starving"; planetId: string }
  | { type: "revealed"; planetId: string; segments: number[] }
  | { type: "built"; planetId: string; segment: number; building: BuildingId; playerId: string }
  | { type: "demolished"; planetId: string; segment: number; playerId: string };

export type CommandResult = { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: string };
