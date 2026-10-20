import type { GameState } from "../sim";
import type { NetworkSession } from "./netSession";
import { supabase } from "./supabase";
import "./chat.css";

/** A row of chat_messages, as stored and as broadcast on the room (event "chat"). */
export interface ChatMessage {
  id: number;
  game_id: string;
  player_id: string;
  kind: "text" | "quick" | "pin";
  body: string;
  pin: { planetId: string; segment: number } | null;
  created_at: string;
}

const VISIBLE = 50;
const QUICK = ["🆘 Brauche Hilfe hier", "👍 Guter Platz", "⚠️ Angriff kommt"];

export async function loadChat(gameId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase()
    .from("chat_messages")
    .select("*")
    .eq("game_id", gameId)
    .order("id", { ascending: false })
    .limit(VISIBLE);
  if (error) throw new Error(error.message);
  return (data as ChatMessage[]).reverse();
}

export async function sendChat(gameId: string, body: string, kind: ChatMessage["kind"] = "text", pin: ChatMessage["pin"] = null): Promise<void> {
  const { error } = await supabase().rpc("send_chat", { p_game: gameId, p_body: body, p_kind: kind, p_pin: pin });
  if (error) throw new Error(error.message.includes("too many") ? "Langsam, zu viele Nachrichten" : "Nachricht nicht gesendet");
}

export interface ChatHost {
  state(): GameState;
  /** Planet and segment the player is looking at, for pins. */
  focus(): { planetId: string; segment: number };
  jump(planetId: string, segment: number): void;
  toast(message: string): void;
}

/**
 * Chat for online games (design §8): a button with an unread count, opening a bar at the bottom
 * with the last 50 messages, one input line, quick messages and a pin of the current segment.
 */
export class ChatPanel {
  private readonly button = document.createElement("button");
  private readonly root = document.createElement("div");
  private messages: ChatMessage[] = [];
  private session: NetworkSession | null = null;
  private unread = 0;

  constructor(private readonly host: ChatHost) {
    this.button.id = "chat-button";
    this.button.type = "button";
    this.button.hidden = true;
    this.button.addEventListener("click", () => this.toggle());
    this.root.id = "chat";
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="log" aria-live="polite"></div>
      <div class="quick">${QUICK.map((q) => `<button type="button" data-quick="${q}">${q}</button>`).join("")}</div>
      <form><button type="button" class="pin" title="Aktuelles Feld markieren">📍</button><input maxlength="200" placeholder="Nachricht …" enterkeyhint="send"><button type="submit">➤</button></form>`;
    this.root.querySelector(".quick")!.addEventListener("click", (e) => {
      const quick = (e.target as HTMLElement).dataset.quick;
      if (quick) this.send(quick, "quick");
    });
    this.root.querySelector(".pin")!.addEventListener("click", () => {
      const input = this.input();
      const focus = this.host.focus();
      this.send(input.value.trim() || "Hier", "pin", focus);
      input.value = "";
    });
    this.root.querySelector("form")!.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = this.input();
      if (input.value.trim()) this.send(input.value.trim(), "text");
      input.value = "";
    });
    this.root.querySelector(".log")!.addEventListener("click", (e) => {
      const link = (e.target as HTMLElement).closest<HTMLElement>("[data-planet]");
      if (link) this.host.jump(link.dataset.planet!, Number(link.dataset.segment));
    });
    document.body.append(this.root, this.button);
  }

  /** Shows the chat of an online game; null hides it (local game). */
  attach(session: NetworkSession | null): void {
    this.session = session;
    this.messages = [];
    this.unread = 0;
    this.button.hidden = !session;
    if (!session) {
      this.root.hidden = true;
      return;
    }
    session.onChat = (message) => this.add(message);
    this.renderButton();
    this.reload();
  }

  /** Broadcasts can be missed (a Realtime room waking up), the table has every message. */
  private reload(): void {
    const session = this.session;
    if (!session) return;
    void loadChat(session.gameId)
      .then((history) => {
        if (this.session !== session) return;
        const ids = new Set(history.map((m) => m.id));
        this.messages = [...history, ...this.messages.filter((m) => !ids.has(m.id))].sort((a, b) => a.id - b.id).slice(-VISIBLE);
        if (!this.root.hidden) this.renderLog();
      })
      .catch(() => {});
  }

  private add(message: ChatMessage): void {
    if (this.messages.some((m) => m.id === message.id)) return;
    this.messages = [...this.messages, message].slice(-VISIBLE);
    if (this.root.hidden) {
      this.unread++;
      if (message.player_id !== this.session?.playerId) this.host.toast(`💬 ${this.name(message.player_id)}: ${message.body}`);
      this.renderButton();
    } else this.renderLog();
  }

  private send(body: string, kind: ChatMessage["kind"], pin: ChatMessage["pin"] = null): void {
    const session = this.session;
    if (!session) return;
    sendChat(session.gameId, body, kind, pin).catch((e: Error) => this.host.toast(e.message));
  }

  private toggle(): void {
    this.root.hidden = !this.root.hidden;
    if (!this.root.hidden) {
      this.unread = 0;
      this.renderLog();
      this.reload();
    }
    this.renderButton();
  }

  private input(): HTMLInputElement {
    return this.root.querySelector("input")!;
  }

  private name(playerId: string): string {
    return this.host.state().players.find((p) => p.id === playerId)?.name ?? "Ehemaliger Spieler";
  }

  private renderButton(): void {
    this.button.textContent = this.unread ? `💬 ${this.unread}` : "💬";
    this.button.classList.toggle("unread", this.unread > 0);
  }

  private renderLog(): void {
    const log = this.root.querySelector<HTMLElement>(".log")!;
    log.replaceChildren(
      ...this.messages.map((m) => {
        const line = document.createElement("p");
        const who = document.createElement("b");
        who.textContent = `${this.name(m.player_id)}: `;
        const text = document.createElement(m.pin ? "a" : "span");
        text.textContent = m.pin ? `📍 ${m.body}` : m.body;
        if (m.pin) {
          text.dataset.planet = m.pin.planetId;
          text.dataset.segment = String(m.pin.segment);
        }
        line.append(who, text);
        if (m.player_id === this.session?.playerId) line.classList.add("mine");
        return line;
      }),
    );
    if (!this.messages.length) log.innerHTML = `<p class="muted">Noch keine Nachrichten</p>`;
    log.scrollTop = log.scrollHeight;
  }
}
