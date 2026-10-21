import type { Music } from "../audio/music";
import type { Sfx } from "../audio/sfx";
import { readName, writeName } from "../net/menu";
import { BIOMES, PEOPLE_IDS, PEOPLES as PEOPLE_ICONS, type PeopleId } from "../sim";
import { PEOPLES } from "../data/balance/peoples";
import { RESOURCES } from "../data/balance/resources";
import "./mainMenu.css";

/** Choices for a new game (design 13.4). Versus has neither goal nor invaders and runs online only. */
export interface NewGameOptions {
  mode: "coop" | "versus";
  goal: "endless" | "supernova";
  invaders: "off" | "normal" | "strong";
  /** The player's own people (Volk). */
  people: PeopleId;
}

export type Where = "local" | "online";

export interface MainMenuActions {
  /** One line about the running game for the "Weiter" button, or null when there is none. */
  current(): string | null;
  /** Starts a game on this device (replaces the local save) or in a free cloud slot. */
  newGame(options: NewGameOptions, where: Where, slot?: number): Promise<void> | void;
  /** Opens the cloud save list (slots, join by code, invite). */
  openOnline(): void;
  /** Called when the menu opens or closes, so the game can pause behind it. */
  onToggle(open: boolean): void;
  /** Saves the running game now; returns what to tell the player. */
  save(): { ok: boolean; text: string };
}

type Screen = "home" | "pause" | "new" | "settings" | "credits";

const OPTIONS_KEY = "planetforge.newGameOptions";

/**
 * Start screen and pause menu: continue, new game (goal, invaders, alone or online), online
 * saves, settings (name, music, sounds) and credits. The planet keeps turning behind it.
 */
export class MainMenu {
  private readonly root = document.createElement("div");
  private screen: Screen = "home";
  private choice = readOptions();
  private where: Where = "local";
  /** Cloud slot picked in the online menu; otherwise the first free one. */
  private slot: number | undefined;
  private confirmNew = false;
  private busy = false;
  private error = "";

  constructor(
    private readonly actions: MainMenuActions,
    private readonly music: Music,
    private readonly sfx: Sfx,
  ) {
    this.root.id = "main-menu";
    this.root.hidden = true;
    this.root.addEventListener("click", (e) => this.onClick(e));
    this.root.addEventListener("input", (e) => this.onInput(e));
    document.body.append(this.root);
  }

  /** Original menu art is loaded: icons and buttons come from the asset pipeline instead of emoji. */
  set art(on: boolean) {
    this.hasArt = on;
    this.root.classList.toggle("art", on);
    // Set here, not in the CSS, so the paths resolve against the page like the other art.
    const images = { "--menu-bg": "brand/menu-bg", "--menu-bg-landscape": "brand/menu-bg-landscape", "--menu-button": "ui/ui-button-menu", "--menu-button-pressed": "ui/ui-button-menu-pressed" };
    const hd = (window.devicePixelRatio || 1) > 1.25 ? "@2x" : "";
    // Absolute URLs: a url() inside a custom property resolves against the built stylesheet otherwise.
    for (const [name, path] of Object.entries(images)) this.root.style.setProperty(name, `url("${new URL(`assets/sprites/${path}${hd}.png`, document.baseURI).href}")`);
    if (this.isOpen) this.render();
  }
  private hasArt = false;
  /** Where "Zurück" leads: the pause menu in a game, otherwise the title screen. */
  private base: "home" | "pause" = "home";
  /** Result of the last save, shown on the home screen. */
  private saved: { ok: boolean; text: string } | null = null;

  private icon(name: string, emoji: string): string {
    return this.hasArt ? `<img class="menu-icon" src="assets/sprites/ui/ui-icon-${name}.png" alt="">` : emoji;
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /** "pause" from the game (☰), "home" for the title screen. */
  open(screen: Screen = "home"): void {
    const wasOpen = this.isOpen;
    this.screen = screen;
    if (screen === "home" || screen === "pause") this.base = screen;
    this.confirmNew = false;
    this.error = "";
    this.root.hidden = false;
    document.body.classList.add("menu-open");
    // Coming back to the menu from a game always saves it first.
    if (!wasOpen && this.actions.current()) this.saved = this.actions.save();
    this.render();
    if (!wasOpen) this.actions.onToggle(true);
  }

  /** New-game screen preset to a cloud slot (from the online menu's free slots). */
  openNewOnline(slot: number): void {
    this.where = "online";
    this.slot = slot;
    this.open("new");
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.hidden = true;
    document.body.classList.remove("menu-open");
    this.slot = undefined;
    this.actions.onToggle(false);
  }

  private render(): void {
    const body =
      this.screen === "pause" ? this.renderPause() : this.screen === "new" ? this.renderNew() : this.screen === "settings" ? this.renderSettings() : this.screen === "credits" ? this.renderCredits() : this.renderHome();
    this.root.innerHTML = `<div class="menu-card${this.busy ? " busy" : ""}">${this.error ? `<p class="menu-error">${escape(this.error)}</p>` : ""}${body}</div>`;
  }

  private renderHome(): string {
    const current = this.actions.current();
    return `
      <header class="menu-title">
        <h1>PlanetForge</h1>
        <p>Baue deinen Planeten, rette dein Sonnensystem.</p>
      </header>
      <nav class="menu-list">
        ${current ? `<button class="menu-item primary" data-go="continue"><span>${this.icon("continue", "▶️")} Weiter</span><small>${escape(current)}</small></button>` : ""}
        <button class="menu-item${current ? "" : " primary"}" data-go="new"><span>${this.icon("new-game", "✨")} Neues Spiel</span><small>Allein oder mit Freunden</small></button>
        <button class="menu-item" data-go="online"><span>${this.icon("load", "☁️")} Online-Spiele</span><small>Spielstände, mit Code beitreten, einladen</small></button>
        <button class="menu-item" data-go="settings"><span>${this.icon("profile", "⚙️")} Einstellungen</span><small>Name, Musik, Geräusche</small></button>
        <button class="menu-item" data-go="credits"><span>${this.icon("credits", "📜")} Credits</span></button>
      </nav>`;
  }

  /** In-game menu behind ☰: the game is already saved when it opens. */
  private renderPause(): string {
    const current = this.actions.current() ?? "";
    const saved = this.saved;
    return `
      <h2>⏸️ Pause</h2>
      <p class="menu-note">${escape(current)}</p>
      ${saved ? `<p class="menu-saved${saved.ok ? "" : " bad"}">${saved.ok ? "✅" : "⚠️"} ${escape(saved.text)}</p>` : ""}
      <nav class="menu-list">
        <button class="menu-item primary" data-go="continue"><span>${this.icon("continue", "▶️")} Weiterspielen</span></button>
        <button class="menu-item" data-go="save"><span>💾 Speichern</span><small>Spielstand jetzt sichern</small></button>
        <button class="menu-item" data-go="toHome"><span>🏠 Speichern &amp; zum Hauptmenü</span><small>Neues Spiel, Online-Spiele, Credits</small></button>
        <button class="menu-item" data-go="settings"><span>${this.icon("profile", "⚙️")} Einstellungen</span><small>Name, Musik, Geräusche</small></button>
      </nav>`;
  }

  private renderNew(): string {
    const c = this.choice;
    const pick = (group: string, value: string, label: string, on: boolean, note = "") =>
      `<button class="menu-choice${on ? " on" : ""}" data-pick="${group}" data-value="${value}">${label}${note ? `<small>${note}</small>` : ""}</button>`;
    const versus = c.mode === "versus";
    const confirm = this.confirmNew
      ? `<div class="menu-confirm"><span>Dein Planet auf diesem Gerät wird überschrieben.</span><button class="danger" data-go="start!">Ja, neu starten</button><button data-go="cancelStart">Nein</button></div>`
      : "";
    return `
      <h2>${this.icon("new-game", "✨")} Neues Spiel</h2>
      <p class="menu-label">Spielmodus</p>
      <div class="menu-choices">
        ${pick("mode", "coop", `${this.icon("mode-coop", "🤝")} Koop`, !versus, "Gemeinsamer Planet")}
        ${pick("mode", "versus", `${this.icon("mode-versus", "⚔️")} Versus`, versus, "Jeder gegen jeden")}
      </div>
      ${versus ? `<p class="menu-note">Jeder hat einen eigenen Planeten. Wer zuletzt noch ein Volk hat, gewinnt. Nur online, lade Freunde per Code ein.</p>` : this.renderCoopChoices(pick)}
      ${this.renderPeople()}
      <p class="menu-label">Spielen</p>
      <div class="menu-choices">
        ${versus ? `<button class="menu-choice" disabled>🧑 Allein<small>Nur im Koop</small></button>` : pick("where", "local", "🧑 Allein", this.where === "local", "Offline auf diesem Gerät")}
        ${pick("where", "online", `${this.icon("join", "👥")} Online`, versus || this.where === "online", this.slot ? `Platz ${this.slot}, Freunde per Code` : "Freunde per Code einladen")}
      </div>
      ${confirm}
      <div class="menu-actions">
        <button data-go="home">Zurück</button>
        <button class="primary" data-go="start">Los geht's</button>
      </div>`;
  }

  /** Portrait grid of the 12 peoples; the chosen one shows its strengths below. */
  private renderPeople(): string {
    const chosen = this.choice.people;
    const def = PEOPLES[chosen];
    const face = (id: PeopleId) =>
      this.hasArt ? `<img src="assets/sprites/peoples/${id}-portrait.png" alt="">` : `<span class="people-emoji">${PEOPLE_ICONS[id].icon}</span>`;
    const grid = PEOPLE_IDS.map(
      (id) => `<button class="people-pick${id === chosen ? " on" : ""}" data-pick="people" data-value="${id}" title="${escape(PEOPLES[id].name)}">${face(id)}</button>`,
    ).join("");
    return `
      <p class="menu-label">Dein Volk</p>
      <div class="people-grid">${grid}</div>
      <div class="people-info">
        <b>${escape(def.name)}</b> <small>(${escape(def.animal)})</small>
        <p><b>${escape(def.ability.name)}:</b> ${escape(def.ability.description)}</p>
        <p class="menu-note">Mag ${escape(BIOMES[def.favoriteBiome].name)} und ${escape(RESOURCES[def.favoriteResource].name)} (Bonus beim Sammeln und Bauen).</p>
      </div>`;
  }

  private renderCoopChoices(pick: (group: string, value: string, label: string, on: boolean, note?: string) => string): string {
    const c = this.choice;
    return `
      <p class="menu-label">Ziel</p>
      <div class="menu-choices">
        ${pick("goal", "supernova", "☀️ Supernova abwenden", c.goal === "supernova", "Schild um die Sonne bauen")}
        ${pick("goal", "endless", "♾️ Endlos", c.goal === "endless", "Ohne Ende weiterbauen")}
      </div>
      <p class="menu-label">Invasoren</p>
      <div class="menu-choices">
        ${pick("invaders", "off", "Aus", c.invaders === "off")}
        ${pick("invaders", "normal", "Normal", c.invaders === "normal")}
        ${pick("invaders", "strong", "Stark", c.invaders === "strong")}
      </div>`;
  }

  private renderSettings(): string {
    const m = this.music.state;
    const s = this.sfx.settings;
    return `
      <h2>${this.icon("profile", "⚙️")} Einstellungen</h2>
      <label class="menu-field"><span>Dein Name</span><input data-set="name" maxlength="24" value="${escape(readName())}" placeholder="Spieler"></label>
      <div class="menu-field">
        <label><input type="checkbox" data-set="music" ${m.enabled ? "checked" : ""}> 🎵 Musik</label>
        <input type="range" data-set="musicVolume" min="0" max="100" step="5" value="${Math.round(m.volume * 100)}" ${m.enabled ? "" : "disabled"} aria-label="Musik-Lautstärke">
      </div>
      <div class="menu-field">
        <label><input type="checkbox" data-set="sfx" ${s.muted ? "" : "checked"}> 🔊 Geräusche</label>
        <input type="range" data-set="sfxVolume" min="0" max="100" step="5" value="${Math.round(s.volume * 100)}" ${s.muted ? "disabled" : ""} aria-label="Geräusch-Lautstärke">
      </div>
      <p class="menu-note">Alles wird in diesem Browser gespeichert.</p>
      <div class="menu-actions"><button data-go="back">Zurück</button></div>`;
  }

  private renderCredits(): string {
    return `
      <h2>${this.icon("credits", "📜")} Credits</h2>
      <p>Ein Fan-Projekt von <b>Seb</b>, inspiriert von <i>A Planet of Mine</i> (Tuesday Quest).</p>
      <p class="menu-note">Programmiert mit Claude. Grafiken mit Codex erstellt. Musik und Geräusche werden live im Code erzeugt, ohne fremde Aufnahmen.</p>
      <p class="menu-note">Technik: TypeScript, PixiJS, Supabase, Capacitor.</p>
      <div class="menu-actions"><button data-go="back">Zurück</button></div>`;
  }

  private onClick(e: MouseEvent): void {
    if (e.target === this.root) {
      if (this.actions.current()) this.close();
      return;
    }
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-go], [data-pick]");
    if (!target || this.busy) return;
    this.music.unlock();
    this.sfx.unlock();
    const pick = target.dataset.pick;
    if (pick) {
      const value = target.dataset.value!;
      if (pick === "mode") this.choice.mode = value as NewGameOptions["mode"];
      else if (pick === "people") this.choice.people = value as PeopleId;
      else if (pick === "goal") this.choice.goal = value as NewGameOptions["goal"];
      else if (pick === "invaders") this.choice.invaders = value as NewGameOptions["invaders"];
      else if (pick === "where") this.where = value as Where;
      writeOptions(this.choice);
      this.confirmNew = false;
      this.sfx.play("ui.toggle");
      this.render();
      return;
    }
    const go = target.dataset.go!;
    this.sfx.play(go === "home" || go === "back" ? "ui.close" : "ui.tap");
    switch (go) {
      case "continue":
        this.close();
        break;
      case "save":
        this.saved = this.actions.save();
        this.render();
        break;
      case "toHome":
        this.saved = this.actions.save();
        this.base = this.screen = "home";
        this.render();
        break;
      case "back":
        this.error = "";
        this.confirmNew = false;
        this.screen = this.base;
        if (this.base === "home") this.slot = undefined;
        this.render();
        break;
      case "online":
        this.actions.openOnline();
        break;
      case "new":
      case "settings":
      case "credits":
      case "home":
        this.error = "";
        this.confirmNew = false;
        this.screen = go;
        if (go === "home") this.slot = undefined;
        this.render();
        break;
      case "start":
        // Starting alone over a running local game asks first; online games use a free slot.
        if (this.where === "local" && this.choice.mode === "coop" && this.actions.current()) {
          this.confirmNew = true;
          this.render();
          break;
        }
        this.start();
        break;
      case "start!":
        this.start();
        break;
      case "cancelStart":
        this.confirmNew = false;
        this.render();
        break;
    }
  }

  private start(): void {
    this.busy = true;
    this.error = "";
    this.render();
    const where = this.choice.mode === "versus" ? "online" : this.where;
    Promise.resolve(this.actions.newGame({ ...this.choice }, where, this.slot))
      .then(() => {
        this.busy = false;
        this.close();
      })
      .catch((err: unknown) => {
        this.busy = false;
        this.confirmNew = false;
        this.error = err instanceof Error ? err.message : String(err);
        this.render();
      });
  }

  private onInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    switch (input.dataset.set) {
      case "name":
        writeName(input.value.trim().slice(0, 24));
        break;
      case "music":
        this.music.unlock();
        this.music.setEnabled(input.checked);
        this.render();
        break;
      case "musicVolume":
        this.music.setVolume(Number(input.value) / 100);
        break;
      case "sfx":
        this.sfx.unlock();
        this.sfx.setMuted(!input.checked);
        this.render();
        break;
      case "sfxVolume":
        this.sfx.setVolume(Number(input.value) / 100);
        break;
    }
  }
}

function escape(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function readOptions(): NewGameOptions {
  const fallback: NewGameOptions = { mode: "coop", goal: "supernova", invaders: "normal", people: PEOPLE_IDS[0] };
  try {
    const saved = { ...fallback, ...JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? "{}") } as NewGameOptions;
    if (!PEOPLE_IDS.includes(saved.people)) saved.people = fallback.people;
    return saved;
  } catch {
    return fallback;
  }
}

function writeOptions(options: NewGameOptions): void {
  try {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
  } catch {
    // ignore: only a convenience
  }
}
