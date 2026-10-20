import { applyCommand, createGame, RULES, step, type Command, type CommandResult, type GameState, type SimEvent } from "../sim";

/**
 * What the renderer and UI talk to. They never touch the simulation directly, so a networked
 * session (coop, server authority) can replace LocalSession without changing any UI code.
 */
export interface GameSession {
  readonly state: GameState;
  /** Simulation speed multiplier; 0 pauses. */
  speed: number;
  send(cmd: Command): CommandResult;
  /** Called every frame with real elapsed time; returns events of the ticks that ran. */
  update(elapsedMs: number): SimEvent[];
}

const TICK_MS = 1000 / RULES.ticksPerSecond;
/** Avoid a spiral of death after the tab was in the background. */
const MAX_TICKS_PER_UPDATE = 50;

/** Single player: this browser is the authority and applies commands immediately. */
export class LocalSession implements GameSession {
  speed = 1;
  private accumulator = 0;

  constructor(public state: GameState) {}

  static newGame(seed = (Math.random() * 2 ** 32) | 0): LocalSession {
    return new LocalSession(createGame({ seed }));
  }

  send(cmd: Command): CommandResult {
    return applyCommand(this.state, cmd);
  }

  update(elapsedMs: number): SimEvent[] {
    const events: SimEvent[] = [];
    this.accumulator += elapsedMs * this.speed;
    let ticks = 0;
    while (this.accumulator >= TICK_MS && ticks < MAX_TICKS_PER_UPDATE) {
      events.push(...step(this.state));
      this.accumulator -= TICK_MS;
      ticks++;
    }
    if (ticks === MAX_TICKS_PER_UPDATE) this.accumulator = 0;
    return events;
  }
}
