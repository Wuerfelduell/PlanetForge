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
  version: 12;
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
  sun: SunState;
  /** Invaders (coop, design 13.1): at most one fleet at a time. */
  invasion: Invasion | null;
  /** Tick the next wave sets out, null until the team reaches INVADERS.minLevel. */
  nextWaveTick: number | null;
  wave: number;
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
  /** AI factions (coop with settings.factions > 0): neighbors in the system to trade, ally or fight with. */
  factions: FactionState[];
  /** Neighbor sun systems behind the warp gate (index 1 …); missing until the first warp gate is built. */
  systems?: StarSystemState[];
}

/** A neighbor sun system (WARP). Its planets live in `planets` with `system` set to its index. */
export interface StarSystemState {
  /** 1 … WARP.systems; the home system is 0 and has no entry. */
  index: number;
  name: string;
  sun: string;
  /** Exotic matter found there. */
  specialties: ResourceId[];
  /** Position on the galaxy map, home at (0, 0). */
  position: { x: number; y: number };
  /** Id of the foreign people (AI faction) living there, if any. */
  faction: string | null;
}

export interface GameSettings {
  mode: GameMode;
  /** coop goal: endless, or save the system from the supernova (design 13.4). */
  goal: "endless" | "supernova";
  invaders: "off" | "normal" | "strong";
  /** Seconds per planet cycle (food upkeep, ascension). */
  cycleSeconds: number;
  difficulty: Difficulty;
  maxPlayers: number;
  /** coop: number of AI factions in the system (0 = none). */
  factions: number;
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
  /** An AI faction (see GameState.factions): no human behind it, never counts toward maxPlayers. */
  ai?: true;
}

export type FactionPersonality = "trader" | "warlord" | "builder" | "diplomat";
export type FactionStance = "peace" | "war" | "allied" | "merged";
export type FactionOfferKind = "alliance" | "peace" | "merge" | "ultimatum";

/** The mind of an AI faction; its units, economy and planets live in the normal state under its player id. */
export interface FactionState {
  /** Same as its PlayerState.id. */
  id: string;
  name: string;
  personality: FactionPersonality;
  /** −100 … 100 toward the human team. */
  attitude: number;
  stance: FactionStance;
  /** No inhabitants left: its planets are free ruins. */
  eliminated: boolean;
  /** Tick the stance last changed (truces, "allied for N cycles"). */
  stanceTick: number;
  /** Peace holds at least until this tick (after a peace treaty or a paid ultimatum). */
  truceUntilTick: number;
  /** Open proposal to the human team, answered with the answerOffer command or expiring. */
  offer: { kind: FactionOfferKind; resource?: ResourceId; amount?: number; expiresTick: number } | null;
  /** Earliest tick for the faction's next proposal (so it does not nag). */
  nextOfferTick: number;
  /** Earliest tick the team may propose something again after a refusal. */
  nextProposalTick: number;
  /** Earliest tick for the next attack (at war). */
  nextAttackTick: number;
  /** Trades and gifts of the team so far (for the "known us for a while" bonus). */
  trades: number;
  /**
   * Open team vote (coop with several humans): war/peace/alliance/merge to propose, or "offer" =
   * answer the faction's open offer (yes accepts, no declines). True majority of the yes/no votes
   * decides as soon as everyone voted, otherwise at the end of the cycle; a tie decides nothing.
   */
  vote?: { action: FactionVoteAction; votes: Record<string, boolean>; startedBy: string } | null;
}

export type FactionVoteAction = "war" | "peace" | "alliance" | "merge" | "offer";

export type GameResult = { winner: string } | { draw: true } | { supernova: true };

export interface SunState {
  type: string;
  /** Tick of the supernova (goal "supernova"), pushed back by working shield segments; null = never. */
  novaTick: number | null;
  shield: { built: boolean; hp: number }[];
  /** The shield was completed once: the coop goal is reached, play goes on. */
  saved: boolean;
}

export interface Invasion {
  wave: number;
  /** A planet id, or "sun" for the shield. */
  target: string;
  arrivalTick: number;
  /** The team has seen it coming (long-range sight, or shortly before arrival). */
  spotted: boolean;
  sieging: boolean;
  siegeEndTick: number;
  hp: number;
  maxHp: number;
  bonus: number;
}

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
  /** Flight to the sun to build or repair a shield segment (to = "sun"). */
  shield?: { segment: number; repair: boolean };
  /** Combat rockets: roll bonus from barracks on the launch planet. */
  attackBonus?: number;
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
  /** Power grid of the last tick; missing while nothing on the planet makes or uses power. */
  power?: { supply: number; demand: number };
  /** Neighbor sun system (GameState.systems); missing = the home system. */
  system?: number;
  /** playerId of whoever settled the planet first (the last time it was free); only they may rename it. */
  founder?: string;
}

export interface SegmentState {
  index: number;
  biome: BiomeId;
  revealed: boolean;
  deposits: DepositState[];
  building: BuildingId | null;
  /** playerId of whoever built the building, null without building. */
  builtBy: string | null;
  /** Which deposit hand-gatherers collect when there is no building (crafting buildings: the recipe). */
  gather: ResourceId | null;
  /** Upgrade stage of the building, 1 when missing. */
  tier?: number;
  /** Burnt by invaders: no building, no gathering, no regrowth until cleared. */
  scorched?: true;
  /** Rubble of a building invaders destroyed (looks only); gone once something is built or cleared. */
  ruin?: true;
  /** Cryo pod with frozen members of another people (Planet of Mine), found by exploring; thaw to recruit them. */
  cryo?: { people: PeopleId; count: number };
}

export interface DepositState {
  resource: ResourceId;
  amount: number;
  max: number;
  infinite: boolean;
  byHand: boolean;
}

export type TerraformKind = "plantTrees" | "fillSand" | "fillClay" | "drainSwamp" | "clearScorched" | "thawGlacier" | "coolLava";

/** Player intents. The only way anything outside the simulation changes the state. */
export type Command =
  | { type: "build"; planetId: string; segment: number; building: BuildingId }
  | { type: "demolish"; planetId: string; segment: number }
  /** Upgrades the building on a segment to its next stage. */
  | { type: "upgrade"; planetId: string; segment: number }
  | { type: "thaw"; planetId: string; segment: number }
  /** Moves `delta` of the sender's units onto (+) or off (−) a segment. */
  | { type: "assign"; planetId: string; segment: number; delta: number }
  /** Moves one specific unit; segment null makes it idle. */
  | { type: "assignUnit"; unitId: string; segment: number | null }
  | { type: "setGather"; planetId: string; segment: number; resource: ResourceId }
  /** Plants trees or fills in water with sand or earth (see sim/terraform.ts). */
  | { type: "terraform"; planetId: string; segment: number; kind: TerraformKind }
  /** Queues a build that runs once the economy can pay for it. */
  | { type: "enqueue"; planetId: string; segment: number; building: BuildingId }
  | { type: "dequeue"; planetId: string; index: number }
  /** Sends `count` idle units of the sender from a planet with a launch pad. combat: versus attack. */
  | { type: "launch"; planetId: string; to: string; rocket: RocketId; count: number }
  /** Votes for one option of the economy's open discovery offer (alone: picks it). */
  | { type: "voteDiscovery"; discovery: string }
  /** Votes yes or no in the open team vote about a faction (see FactionState.vote). */
  | { type: "voteDiplomacy"; faction: string; yes: boolean }
  /** Sends SUPERNOVA.crew idle inhabitants from a launch pad to build (or repair) a shield segment. */
  | { type: "shieldFlight"; planetId: string; segment: number; repair: boolean }
  /** versus: gives up; the player's units vanish and their planets become free ruins. */
  | { type: "surrender" }
  /** versus: agree to (or withdraw from) a draw; it happens once every remaining player agrees. */
  | { type: "offerDraw"; offer: boolean }
  /** Host only: removes a player; their units vanish (Seb: no gifting to teammates). */
  | { type: "kickPlayer"; playerId: string }
  /** Buys `amount` of a resource the faction has in surplus; the faction names its price (tradeQuote). */
  | { type: "factionTrade"; faction: string; resource: ResourceId; amount: number }
  /** Gives a faction resources; it remembers that. */
  | { type: "gift"; faction: string; resource: ResourceId; amount: number }
  /** Declares war, or proposes peace, an alliance or a merge (the faction may refuse). */
  | { type: "diplomacy"; faction: string; action: "war" | "peace" | "alliance" | "merge" }
  /** Answers the faction's open offer. */
  | { type: "answerOffer"; faction: string; accept: boolean }
  /** Founder only: gives the planet a new name (PLANET_NAME_MAX characters at most). */
  | { type: "renamePlanet"; planetId: string; name: string }
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
  | { type: "upgraded"; planetId: string; segment: number; building: BuildingId; tier: number; playerId: string }
  | { type: "terraformed"; planetId: string; segment: number; kind: TerraformKind; playerId: string }
  | { type: "joined"; playerId: string }
  | { type: "renamed"; planetId: string; name: string; from: string; playerId: string }
  | { type: "removed"; playerId: string; by: string }
  | { type: "queueDropped"; planetId: string; segment: number; building: BuildingId; reason: string }
  | { type: "lobby"; open: boolean; paused: boolean; playerId: string }
  | { type: "launched"; flightId: string; playerId: string; from: string; to: string; rocket: RocketId; count: number; arrivalTick: number }
  | { type: "landed"; flightId: string; playerId: string; planetId: string; count: number; colonized: boolean }
  | { type: "battle"; planetId: string; attacker: string; defender: string; attackerLosses: number; defenderLosses: number; won: boolean; captured: number; intercepted?: number }
  | { type: "assimilated"; playerId: string; count: number }
  | { type: "eliminated"; playerId: string }
  | { type: "surrendered"; playerId: string }
  | { type: "drawOffer"; playerId: string; offer: boolean }
  | { type: "drawSuggested" }
  | { type: "discovered"; economyId: string; discovery: string }
  | { type: "invasionSpotted"; target: string; wave: number; arrivalTick: number }
  | { type: "invasionArrived"; target: string; wave: number }
  | { type: "siege"; target: string; damage: number; hp: number; defenderLosses: number; destroyed: BuildingId | null; killed: number; shieldSegment: number | null; scorched?: number[] }
  | { type: "invasionDefeated"; target: string; wave: number; /** What the wreck gave the team (missing in older events). */ loot?: Partial<Record<ResourceId, number>> }
  | { type: "suffocated"; planetId: string; left: number }
  | { type: "thawed"; planetId: string; segment: number; people: PeopleId; count: number; playerId: string }
  | { type: "invasionMoved"; from: string; target: string; wave: number; arrivalTick: number }
  | { type: "sunWarning"; cyclesLeft: number }
  | { type: "shieldBuilt"; segment: number; repaired: boolean }
  | { type: "shieldComplete" }
  | { type: "discoveryVote"; playerId: string; discovery: string }
  | { type: "gameOver"; result: GameResult }
  | { type: "factionOffer"; faction: string; kind: FactionOfferKind; resource?: ResourceId; amount?: number; expiresTick: number }
  | { type: "factionStance"; faction: string; stance: FactionStance; reason: "declaredWar" | "attacked" | "ultimatumRefused" | "peace" | "alliance" | "merged" | "brokenAlliance" }
  | { type: "factionDeclined"; faction: string; action: "peace" | "alliance" | "merge" }
  | { type: "factionVote"; faction: string; playerId: string; action: FactionVoteAction; yes: boolean }
  /** The vote closed: passed = the majority said yes and the action happened; otherwise nothing happened. */
  | { type: "factionVoteResult"; faction: string; action: FactionVoteAction; passed: boolean }
  | { type: "factionTrade"; faction: string; playerId: string; got: ResourceId; gotAmount: number; gave: ResourceId; gaveAmount: number }
  /** `from` is the faction (a present to its ally) or the player who gave. */
  | { type: "factionGift"; faction: string; from: string; resource: ResourceId; amount: number }
  | { type: "factionMerged"; faction: string; playerId: string; units: number; planets: number }
  | { type: "factionEliminated"; faction: string }
  /** The first warp gate found the neighbor systems. */
  | { type: "systemsFound"; count: number; inhabited: number };

export type LogEntry = { tick: number; event: GameEvent };

export type CommandResult = { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: string };
