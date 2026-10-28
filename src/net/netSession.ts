import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { GameSession, SendResult } from "../client/session";
import { advanceOwnedWithEvents, applyCommand, type Command, type GameEvent, type GameState } from "../sim";
import type { ChatMessage } from "./chat";
import { unpack } from "./pack";
import { ensureSignedIn, supabase } from "./supabase";

/** How often the lead client tells the server someone is online, so the live game clock keeps running. */
const HEARTBEAT_MS = 20_000;
const CATCH_UP_MS = 6_000;

type ServerReply =
  | { ok: true; version: number; state: GameState; events: GameEvent[]; errors?: string[] }
  | { ok: false; error: string; version?: number; state?: GameState | null };

interface StateMessage {
  version: number;
  /** Gzipped + base64 (see pack.ts); older servers sent `state` instead. */
  packed?: string;
  state?: GameState;
  events: GameEvent[];
  by: string | null;
}

/** Most commands per request; the server takes up to 30 (MAX_BATCH in game-command). */
const MAX_BATCH = 30;

/**
 * A game whose authority is the game-command Edge Function. Commands are applied locally right
 * away (prediction) and sent to the server; every saved state comes back to all players over the
 * private Realtime room game:<id> and replaces the local one.
 *
 * Only one request per player is in flight: commands made meanwhile wait and go out together as
 * one batch, so a fast player doesn't queue up many saves that collide with the others'. Until
 * the server has answered, the player's own commands are replayed on top of every state that
 * arrives, so moves of other players don't make them flicker away.
 */
export class NetworkSession implements GameSession {
  /** Server time decides; the speed control has no effect online. */
  speed = 1;
  /** Players currently online (presence), by playerId. */
  online: string[] = [];
  onError: (message: string) => void = () => {};
  onPresence: (online: string[]) => void = () => {};
  /** A chat message arrived on the room (see chat.ts). */
  onChat: (message: ChatMessage) => void = () => {};
  /** The host removed this player; the session is closed and must not be rendered any more. */
  onRemoved: () => void = () => {};

  private clock: number;
  private version: number;
  /** Last state the server saved; `state` is this plus the player's unanswered commands. */
  private base: GameState;
  private inFlight: Command[] = [];
  private queued: Command[] = [];
  private pendingEvents: GameEvent[] = [];
  private heartbeat: ReturnType<typeof setInterval> | undefined;
  private catchUp: ReturnType<typeof setTimeout> | undefined;

  private constructor(
    private readonly sb: SupabaseClient,
    readonly gameId: string,
    readonly playerId: string,
    public state: GameState,
    version: number,
    private readonly channel: RealtimeChannel,
  ) {
    this.clock = state.simTime;
    this.version = version;
    this.base = state;
  }

  static async open(gameId: string): Promise<NetworkSession> {
    const sb = supabase();
    const userId = await ensureSignedIn();
    const { data: me, error } = await sb.from("game_members").select("player_id").eq("game_id", gameId).eq("user_id", userId).is("left_at", null).maybeSingle();
    if (error || !me) throw new Error("Du bist nicht in diesem Spiel");

    const first = await invoke(sb, { gameId, kind: "sync" });
    if (!first.ok) throw new Error(first.error);

    const { data: auth } = await sb.auth.getSession();
    await sb.realtime.setAuth(auth.session?.access_token ?? null);
    const channel = sb.channel(`game:${gameId}`, { config: { private: true, presence: { key: me.player_id } } });
    const session = new NetworkSession(sb, gameId, me.player_id, first.state, first.version, channel);

    channel.on("broadcast", { event: "state" }, ({ payload }) => {
      const msg = payload as StateMessage;
      void (msg.packed ? unpack<GameState>(msg.packed) : Promise.resolve(msg.state)).then((state) => {
        if (!state) return;
        if (msg.by !== session.playerId) session.pendingEvents.push(...(msg.events ?? []));
        session.accept(msg.version, state);
      });
    });
    channel.on("broadcast", { event: "chat" }, ({ payload }) => session.onChat(payload as ChatMessage));
    channel.on("presence", { event: "sync" }, () => {
      session.online = Object.keys(channel.presenceState()).sort();
      session.onPresence(session.online);
    });
    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status, err) => {
        if (status === "SUBSCRIBED") resolve();
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error(err?.message ?? "Verbindung zum Raum fehlgeschlagen"));
      });
    });
    await channel.track({ at: Date.now() });

    session.heartbeat = setInterval(() => session.beat(), HEARTBEAT_MS);
    // A Realtime room that was idle takes a few seconds to start delivering, and changes made
    // between the first sync and subscribing are missed too, so catch up once after joining.
    session.catchUp = setTimeout(() => session.resync(), CATCH_UP_MS);
    return session;
  }

  send(cmd: Command): SendResult {
    const predicted = applyCommand(this.state, this.playerId, cmd, this.clock);
    if (!predicted.ok) return predicted;
    this.state = predicted.state;
    this.queued.push(cmd);
    this.flush();
    return { ok: true };
  }

  private flush(): void {
    if (this.inFlight.length || !this.queued.length) return;
    this.inFlight = this.queued.splice(0, MAX_BATCH);
    const body = this.inFlight.length === 1 ? { gameId: this.gameId, kind: "command", cmd: this.inFlight[0] } : { gameId: this.gameId, kind: "commands", cmds: this.inFlight };
    void invoke(this.sb, body).then((reply) => {
      this.inFlight = [];
      if (reply.ok) {
        if (reply.errors?.length) this.onError(reply.errors[0]);
        this.accept(reply.version, reply.state, true);
      } else {
        this.onError(reply.error);
        if (reply.state && reply.version !== undefined) this.accept(reply.version, reply.state, true);
        else this.rebuild();
      }
      this.flush();
    });
  }

  update(elapsedMs: number): GameEvent[] {
    this.clock += Math.min(elapsedMs, 1000);
    // Every state here is the session's own (unpacked or built by applyCommand), so ticks run on it
    // without a copy. When nothing is pending, state is base: base moves on too, which changes
    // nothing for later replays (splitting the time into steps gives the same result).
    const events = advanceOwnedWithEvents(this.state, this.clock);
    if (!this.inFlight.length && !this.queued.length) this.base = this.state;
    return this.pendingEvents.length ? [...this.pendingEvents.splice(0), ...events] : events;
  }

  async close(): Promise<void> {
    clearInterval(this.heartbeat);
    clearTimeout(this.catchUp);
    await this.sb.removeChannel(this.channel);
  }

  /**
   * Server state wins; the player's unanswered commands are replayed on top of it. `force` (a
   * reply to this player's own request) rebuilds even from an older or equal version, because
   * the commands it answered must stop being predicted.
   */
  private accept(version: number, state: GameState, force = false): void {
    if (version < this.version || (version === this.version && !force)) {
      if (force) this.rebuild();
      return;
    }
    if (!state.players.some((p) => p.id === this.playerId)) {
      void this.close();
      this.onRemoved();
      return;
    }
    this.version = version;
    this.base = state;
    this.clock = state.simTime;
    this.rebuild();
  }

  /** state = base + commands the server hasn't answered yet (dropping ones that no longer apply). */
  private rebuild(): void {
    let state = this.base;
    for (const cmd of [...this.inFlight, ...this.queued]) {
      const r = applyCommand(state, this.playerId, cmd, this.clock);
      if (r.ok) state = r.state;
    }
    this.state = state;
  }

  /** Only the online player with the lowest id sends heartbeats, one per game is enough. */
  private beat(): void {
    if (this.online.length && this.online[0] !== this.playerId) return;
    this.resync();
  }

  private resync(): void {
    void invoke(this.sb, { gameId: this.gameId, kind: "sync" }).then((reply) => {
      if (reply.ok) this.accept(reply.version, reply.state);
    });
  }
}

async function invoke(sb: SupabaseClient, body: Record<string, unknown>): Promise<ServerReply> {
  // packed: the server answers with the packed state it saves anyway (see pack.ts) instead of
  // serializing the whole state a second time; older servers ignore the flag.
  const { data, error } = await sb.functions.invoke("game-command", { body: { ...body, packed: true } });
  if (data && typeof data === "object" && "ok" in data) return unpackReply(data);
  // Non-2xx responses still carry our JSON body in error.context.
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === "function") {
    const parsed = await ctx.json().catch(() => null);
    if (parsed && "ok" in parsed) return unpackReply(parsed);
  }
  return { ok: false, error: error?.message ?? "Server nicht erreichbar" };
}

async function unpackReply(reply: ServerReply & { packed?: string }): Promise<ServerReply> {
  if (typeof reply.packed !== "string") return reply;
  const { packed, ...rest } = reply;
  return { ...rest, state: await unpack<GameState>(packed) } as ServerReply;
}
