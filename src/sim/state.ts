import type { BiomeId, BuildingId, PeopleId, PlanetTypeId, ResourceId } from "./content";

/**
 * coop: everyone shares one start planet and one economy (stockpile + ascension); long-term play.
 * versus: every player has an own start planet and economy; short matches.
 * Solo is coop with one player, so there is only one code path.
 */
export type GameMode = "coop" | "versus";
export type Difficulty = "cozy" | "normal" | "hard";

/**
 * The complete game state (design/koop-design.md, section 10). Plain JSON data only (no classes,
 * Maps, Sets or functions), so it can be saved, stored in a database row, sent over the network
 * or diffed as is.
 */
export interface GameState {
  version: 7;
  seed: string;
  /** Current PRNG state; the simulation draws all randomness from here. */
  rng: number;
  /** Game time (ms) up to which the simulation has been computed. */
  simTime: number;
  tick: number;
  settings: GameSettings;
  /** The clock only runs while the lobby is open and not paused. */
  lobby: { open: boolean; paused: boolean };
  /** Owner of the save; may open/close the lobby. */
  hostId: string;
  /** In join order. */
  players: PlayerState[];
  /** One economy per side: exactly one in coop, one per player in versus. */
  economies: Record<string, EconomyState>;
  sun: { type: string };
  planets: PlanetState[];
  /** Every inhabitant is a unit with an owner; the owner alone moves it. */
  units: Record<string, UnitState>;
  nextUnitId: number;
  /** Per planet up to RULES.queueLength build orders that run as soon as the economy can pay. */
  queues: Record<string, QueuedBuild[]>;
  /** Recent events for the "since your last visit" view, newest last, at most RULES.logLength. */
  log: LogEntry[];
}

export interface GameSettings {
  mode: GameMode;
  /** Seconds per planet cycle (food upkeep, ascension). */
  cycleSeconds: number;
  difficulty: Difficulty;
  maxPlayers: number;
}

export interface PlayerInit {
  id: string;
  name: string;
  /** People (animal faction) the player plays; picked automatically if left out. */
  people?: PeopleId;
}

export interface PlayerState {
  id: string;
  name: string;
  people: PeopleId;
  /** Index into a shared player color palette (the renderer picks the actual color). */
  color: number;
  economyId: string;
  homePlanetId: string;
  joinedTick: number;
}

export interface EconomyState {
  id: string;
  resources: Record<ResourceId, number>;
  /** Points from every planet of the economy add up; levels unlock buildings for all its players. */
  ascension: { level: number; points: number };
  starving: boolean;
}

export interface UnitState {
  id: string;
  /** Never "free": units always belong to a player. */
  owner: string;
  people: PeopleId;
  planetId: string;
  /** null = idle. */
  segment: number | null;
  role: "worker";
}

export interface QueuedBuild {
  segment: number;
  building: BuildingId;
  playerId: string;
}

export interface PlanetState {
  id: string;
  name: string;
  type: PlanetTypeId;
  /** Position on the star map: orbit radius in arbitrary units, angle in radians. */
  orbit: { radius: number; angle: number };
  /** Start slot (0 … n-1) if this is a start planet, else null. */
  startSlot: number | null;
  /** Economy the planet belongs to, null while nobody lives here. */
  economyId: string | null;
  /** Seconds of progress toward the next birth. */
  birthProgress: number;
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
  /** Moves `delta` of the sender's units onto (+) or off (−) a segment. */
  | { type: "assign"; planetId: string; segment: number; delta: number }
  /** Moves one specific unit; segment null makes it idle. */
  | { type: "assignUnit"; unitId: string; segment: number | null }
  | { type: "setGather"; planetId: string; segment: number; resource: ResourceId }
  /** Queues a build that runs once the economy can pay for it. */
  | { type: "enqueue"; planetId: string; segment: number; building: BuildingId }
  | { type: "dequeue"; planetId: string; index: number }
  /** Host only: removes a player; their units vanish (Seb: no gifting to teammates). */
  | { type: "kickPlayer"; playerId: string }
  | { type: "openLobby" }
  | { type: "closeLobby" }
  | { type: "pause" }
  | { type: "resume" };

/** Things that happened, for UI feedback (toasts, sounds) and the log. Not part of the state. */
export type GameEvent =
  | { type: "born"; planetId: string; playerId: string; unitId: string }
  | { type: "cycle"; cycle: number }
  | { type: "levelUp"; economyId: string; level: number }
  | { type: "depleted"; planetId: string; segment: number; resource: ResourceId }
  | { type: "starving"; economyId: string }
  | { type: "revealed"; planetId: string; segments: number[] }
  | { type: "built"; planetId: string; segment: number; building: BuildingId; playerId: string }
  | { type: "demolished"; planetId: string; segment: number; playerId: string }
  | { type: "joined"; playerId: string }
  | { type: "removed"; playerId: string; by: string }
  | { type: "queueDropped"; planetId: string; segment: number; building: BuildingId; reason: string }
  | { type: "lobby"; open: boolean; paused: boolean; playerId: string };

export type LogEntry = { tick: number; event: GameEvent };

export type CommandResult = { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: string };
