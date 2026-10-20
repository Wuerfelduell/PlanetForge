import { NetworkSession } from "./netSession";
import { createSave, firstFreeSlot, inviteLink, joinSave, leaveGame, listSaves, removeSave, SLOT_COUNT, type SaveSlot } from "./saves";
import { ensureSignedIn } from "./supabase";
import "./menu.css";

const NAME_KEY = "planetforge.playerName";

export interface MenuActions {
  /** A cloud game was opened; the caller swaps it in as the active session. */
  play(session: NetworkSession): void;
}

/**
 * Save menu for cloud games: 5 slots (own and joined games), new game, join by code or link,
 * invite friends, leave or remove. Opens on its own when the page was opened with ?join=CODE.
 */
export class OnlineMenu {
  private readonly root = document.createElement("div");
  private readonly button = document.createElement("button");
  private current: NetworkSession | null = null;
  private busy = false;

  constructor(private readonly actions: MenuActions) {
    this.root.id = "online-menu";
    this.root.hidden = true;
    this.root.addEventListener("click", (e) => {
      if (e.target === this.root) this.close();
    });
    document.body.append(this.root);

    this.button.id = "online-button";
    this.button.type = "button";
    this.button.textContent = "☁️ Online";
    this.button.addEventListener("click", () => void this.open());
    document.body.append(this.button);

    const code = new URLSearchParams(window.location.search).get("join");
    if (code) void this.open(code);
  }

  /** The session that is running now, so the menu can show its code and who is online. */
  setCurrent(session: NetworkSession | null): void {
    this.current = session;
    this.button.textContent = session ? `☁️ ${session.online.length || 1} online` : "☁️ Online";
    if (session) session.onPresence = (online) => (this.button.textContent = `☁️ ${online.length} online`);
  }

  async open(joinCode?: string): Promise<void> {
    this.root.hidden = false;
    this.root.innerHTML = `<div class="sheet"><p class="muted">Verbinde …</p></div>`;
    try {
      await ensureSignedIn();
      this.render(await listSaves(), joinCode);
    } catch (e) {
      this.renderError(e);
    }
  }

  close(): void {
    this.root.hidden = true;
  }

  private render(saves: SaveSlot[], joinCode?: string): void {
    const free = firstFreeSlot(saves);
    const sheet = el("div", "sheet");
    sheet.append(el("h2", "", "Spielstände"));

    const nameRow = el("label", "field");
    nameRow.append(el("span", "", "Dein Name"));
    const nameInput = document.createElement("input");
    nameInput.id = "online-name";
    nameInput.maxLength = 24;
    nameInput.value = readName();
    nameInput.addEventListener("change", () => writeName(nameInput.value));
    nameRow.append(nameInput);
    sheet.append(nameRow);

    const list = el("div", "slots");
    for (let s = 1; s <= SLOT_COUNT; s++) {
      const save = saves.find((g) => g.slot === s);
      const row = el("div", "slot");
      row.append(el("span", "slot-no", String(s)));
      if (!save) {
        row.append(el("span", "slot-name muted", "Frei"));
        const create = button("Neues Spiel", () =>
          this.run(async () => {
            const id = await createSave(s, `Welt ${s}`, name(nameInput));
            await this.play(id);
          }),
        );
        row.append(create);
      } else {
        const info = el("span", "slot-name");
        info.append(el("b", "", save.name));
        info.append(el("small", "", `${save.isHost ? "Host" : "Gast"} · ${save.playerCount} Spieler · Code ${save.joinCode}`));
        row.append(info);
        row.append(button(this.current?.gameId === save.id ? "Läuft" : "Spielen", () => this.run(() => this.play(save.id))));
        row.append(
          button(save.isHost ? "Entfernen" : "Verlassen", () =>
            this.confirm(row, save.isHost ? "Spielstand für alle entfernen?" : "Spiel verlassen?", () =>
              this.run(async () => {
                if (save.isHost) await removeSave(save.id);
                else await leaveGame(save.id);
                this.render(await listSaves());
              }),
            ),
          "quiet",
          ),
        );
      }
      list.append(row);
    }
    sheet.append(list);

    const join = el("div", "join");
    const codeInput = document.createElement("input");
    codeInput.id = "online-code";
    codeInput.placeholder = "Code eines Freundes";
    codeInput.maxLength = 6;
    codeInput.value = joinCode ?? "";
    codeInput.autocapitalize = "characters";
    join.append(codeInput);
    join.append(
      button("Beitreten", () =>
        this.run(async () => {
          if (free === null) throw new Error("Alle 5 Plätze sind belegt. Verlasse oder entferne zuerst ein Spiel.");
          const id = await joinSave(codeInput.value, free, name(nameInput));
          history.replaceState(null, "", window.location.pathname);
          await this.play(id);
        }),
      ),
    );
    sheet.append(join);

    if (this.current) {
      const code = saves.find((g) => g.id === this.current!.gameId)?.joinCode;
      if (code) {
        const invite = el("div", "invite");
        invite.append(el("span", "", `Freunde einladen: Code ${code}`));
        invite.append(
          button("Link kopieren", () => {
            const link = inviteLink(code);
            navigator.clipboard?.writeText(link).then(
              () => this.flash(invite, "Link kopiert"),
              () => this.flash(invite, link),
            );
          }),
        );
        sheet.append(invite);
      }
    }

    sheet.append(el("p", "muted note", "Deine Spielstände hängen an diesem Browser. Werden die Browserdaten gelöscht, sind sie nicht mehr erreichbar."));
    sheet.append(button("Schließen", () => this.close(), "quiet"));
    this.root.replaceChildren(sheet);
  }

  private async play(gameId: string): Promise<void> {
    if (this.current?.gameId === gameId) return this.close();
    const session = await NetworkSession.open(gameId);
    await this.current?.close();
    this.actions.play(session);
    this.setCurrent(session);
    this.close();
  }

  private run(task: () => Promise<void>): void {
    if (this.busy) return;
    this.busy = true;
    this.root.classList.add("busy");
    task()
      .catch((e) => this.renderError(e, true))
      .finally(() => {
        this.busy = false;
        this.root.classList.remove("busy");
      });
  }

  /** Inline confirmation (the game runs in places where confirm() is unavailable). */
  private confirm(row: HTMLElement, question: string, yes: () => void): void {
    const box = el("div", "confirm");
    box.append(el("span", "", question));
    box.append(button("Ja", yes, "danger"));
    box.append(button("Nein", () => box.remove(), "quiet"));
    row.after(box);
  }

  private flash(parent: HTMLElement, text: string): void {
    const note = el("small", "flash", text);
    parent.append(note);
    setTimeout(() => note.remove(), 4000);
  }

  private renderError(e: unknown, keep = false): void {
    const message = e instanceof Error ? e.message : String(e);
    const sheet = keep ? this.root.querySelector(".sheet") : null;
    const box = el("p", "error", message);
    if (sheet) {
      sheet.querySelector(".error")?.remove();
      sheet.prepend(box);
      return;
    }
    const fresh = el("div", "sheet");
    fresh.append(box, button("Schließen", () => this.close(), "quiet"));
    this.root.replaceChildren(fresh);
  }
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label: string, onClick: () => void, kind = ""): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  if (kind) b.className = kind;
  b.addEventListener("click", onClick);
  return b;
}

function name(input: HTMLInputElement): string {
  const value = input.value.trim().slice(0, 24) || "Spieler";
  writeName(value);
  return value;
}

function readName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeName(value: string): void {
  try {
    localStorage.setItem(NAME_KEY, value);
  } catch {
    // ignore: the name is only a convenience
  }
}
