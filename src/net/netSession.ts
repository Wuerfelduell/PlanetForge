import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { GameSession, SendResult } from "../client/session";
import { advanceWithEvents, applyCommand, type Command, type GameEvent, type GameState } from "../sim";
import type { ChatMessage } from "./chat";
import { unpack } from "./pack";
import { ensureSignedIn, supabase } from "./supabase";

/** How often the lead client tells the server someone is online, so the live game clock keeps running. */
const HEARTBEAT_MS = 20_000;
const CATCH_UP_MS = 6_000;

type ServerReply =
  | { ok: true; version: number; state: GameState; events: GameEvent[] }
  | { ok: false; error: string; version?: number; state?: GameState | null };

interface StateMessage {
  version: number;
  /** Gzipped + base64 (see pack.ts); older servers sent `state` instead. */
  packed?: string;
  state?: GameState;
  events: GameEvent[];
  by: string | null;
}

/**
 * A game whose authority is the game-command Edge Function. Commands are applied locally right
 * away (prediction) and sent to the server; every saved state comes back to all players over the
 * private Realtime room game:<id> and replaces the local one.
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
    void invoke(this.sb, { gameId: this.gameId, kind: "command", cmd }).then((reply) => {
      if (reply.ok) this.accept(reply.version, reply.state);
      else {
        this.onError(reply.error);
        if (reply.state && reply.version !== undefined) this.accept(reply.version, reply.state, true);
      }
    });
    return { ok: true };
  }

  update(elapsedMs: number): GameEvent[] {
    this.clock += Math.min(elapsedMs, 1000);
    const { state, events } = advanceWithEvents(this.state, this.clock);
    this.state = state;
    return this.pendingEvents.length ? [...this.pendingEvents.splice(0), ...events] : events;
  }

  async close(): Promise<void> {
    clearInterval(this.heartbeat);
    clearTimeout(this.catchUp);
    await this.sb.removeChannel(this.channel);
  }

  /** Server state wins. `force` also takes an equal version, to undo a rejected prediction. */
  private accept(version: number, state: GameState, force = false): void {
    if (version < this.version || (version === this.version && !force)) return;
    if (!state.players.some((p) => p.id === this.playerId)) {
      void this.close();
      this.onRemoved();
      return;
    }
    this.version = version;
    this.state = state;
    this.clock = state.simTime;
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
  const { data, error } = await sb.functions.invoke("game-command", { body });
  if (data && typeof data === "object" && "ok" in data) return data as ServerReply;
  // Non-2xx responses still carry our JSON body in error.context.
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === "function") {
    const parsed = await ctx.json().catch(() => null);
    if (parsed && "ok" in parsed) return parsed as ServerReply;
  }
  return { ok: false, error: error?.message ?? "Server nicht erreichbar" };
}
