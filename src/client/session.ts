import { advanceOwnedWithEvents, applyCommand, createGame, type Command, type PeopleId, type GameOptions, type GameEvent, type GameState } from "../sim";

/** `events`: what the command caused right away, when the session knows it (local play). */
export type SendResult = { ok: true; events?: GameEvent[] } | { ok: false; error: string };

/**
 * What the renderer and UI talk to. They never touch the simulation directly, so a networked
 * session (coop, server authority) can replace LocalSession without changing any UI code.
 */
export interface GameSession {
  readonly state: GameState;
  /** The player this client acts as. */
  readonly playerId: string;
  /** Simulation speed multiplier; 0 pauses. A networked session may ignore it. */
  speed: number;
  send(cmd: Command): SendResult;
  /** Called every frame with real elapsed time; returns events of the ticks that ran. */
  update(elapsedMs: number): GameEvent[];
}

export const LOCAL_PLAYER = { id: "p1", name: "Ich" };

/**
 * Single player: this browser is the authority. It runs its own game clock (sim time), which
 * makes pause and fast-forward trivial and keeps the simulation independent of Date.now().
 */
export class LocalSession implements GameSession {
  speed = 1;
  readonly playerId = LOCAL_PLAYER.id;
  private clock: number;

  constructor(public state: GameState) {
    this.clock = state.simTime;
  }

  static newGame(seed = Math.floor(Math.random() * 2 ** 32).toString(36), options: GameOptions = {}, people?: PeopleId): LocalSession {
    return new LocalSession(createGame(seed, [{ ...LOCAL_PLAYER, people }], options));
  }

  send(cmd: Command): SendResult {
    const result = applyCommand(this.state, this.playerId, cmd, this.clock);
    if (!result.ok) return result;
    this.state = result.state;
    return { ok: true, events: result.events };
  }

  update(elapsedMs: number): GameEvent[] {
    // Cap a single frame (e.g. after the tab was in the background) to avoid a long freeze.
    this.clock += Math.min(elapsedMs, 1000) * this.speed;
    // The session owns its state (send() replaces it), so ticks run on it without a copy.
    return advanceOwnedWithEvents(this.state, this.clock);
  }
}
