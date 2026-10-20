import type { BiomeId, BuildingId, PeopleId, PlanetTypeId, ResourceId, RocketId } from "./content";

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
  version: 9;
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
  /** Rockets on their way; their passengers live inside the flight, not in `units`. */
  flights: Flight[];
  nextFlightId: number;
  /** Per planet up to RULES.queueLength build orders that run as soon as the economy can pay. */
  queues: Record<string, QueuedBuild[]>;
  /** versus: last tick with a battle, for the draw offer after RULES.drawOfferCycles quiet cycles. */
  lastCombatTick: number;
  /** versus: the game offered a draw already (once per game). */
  drawSuggested: boolean;
  /** Set once the game is decided (versus); no game commands are accepted afterwards. */
  result: GameResult | null;
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
  /** versus: has no inhabitants left (captives count for their original owner) or surrendered. */
  eliminated: boolean;
  surrendered: boolean;
  /** versus: agrees to end the game as a draw. */
  offersDraw: boolean;
}

export type GameResult = { winner: string } | { draw: true };

export interface Flight {
  id: string;
  owner: string;
  rocket: RocketId;
  from: string;
  to: string;
  /** Passengers; back in GameState.units once they land. */
  units: UnitState[];
  launchTick: number;
  arrivalTick: number;
}

export interface EconomyState {
  id: string;
  resources: Record<ResourceId, number>;
  /** Points from every planet of the economy add up; levels unlock buildings for all its players. */
  ascension: { level: number; points: number };
  starving: boolean;
  /** Discoveries owned, in the order they were made. */
  discoveries: string[];
  /** Discoveries earned by level-ups and not chosen yet. */
  picks: number;
  /** Open choice: up to three options, one vote per member (coop: true majority decides). */
  offer: { options: string[]; votes: Record<string, string> } | null;
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
  /** versus: captured from this player; still counts as theirs until assimilated. */
  originalOwner?: string;
  capturedTick?: number;
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
  /** Sends `count` idle units of the sender from a planet with a launch pad. combat: versus attack. */
  | { type: "launch"; planetId: string; to: string; rocket: RocketId; count: number }
  /** Votes for one option of the economy's open discovery offer (alone: picks it). */
  | { type: "voteDiscovery"; discovery: string }
  /** versus: gives up; the player's units vanish and their planets become free ruins. */
  | { type: "surrender" }
  /** versus: agree to (or withdraw from) a draw; it happens once every remaining player agrees. */
  | { type: "offerDraw"; offer: boolean }
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
  | { type: "lobby"; open: boolean; paused: boolean; playerId: string }
  | { type: "launched"; flightId: string; playerId: string; from: string; to: string; rocket: RocketId; count: number; arrivalTick: number }
  | { type: "landed"; flightId: string; playerId: string; planetId: string; count: number; colonized: boolean }
  | { type: "battle"; planetId: string; attacker: string; defender: string; attackerLosses: number; defenderLosses: number; won: boolean; captured: number }
  | { type: "assimilated"; playerId: string; count: number }
  | { type: "eliminated"; playerId: string }
  | { type: "surrendered"; playerId: string }
  | { type: "drawOffer"; playerId: string; offer: boolean }
  | { type: "drawSuggested" }
  | { type: "discovered"; economyId: string; discovery: string }
  | { type: "discoveryVote"; playerId: string; discovery: string }
  | { type: "gameOver"; result: GameResult };

export type LogEntry = { tick: number; event: GameEvent };

export type CommandResult = { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: string };
