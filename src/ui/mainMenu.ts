import type { Music } from "../audio/music";
import type { Sfx } from "../audio/sfx";
import { readName, writeName } from "../net/menu";
import { PEOPLE_IDS, PLANET_TYPE_IDS, PLANET_TYPES, SYSTEM, WORLD_LIMITS, type PeopleId, type WorldOptions } from "../sim";
import { isPeopleId, peopleArt, peoplePickerHtml } from "./peoplePicker";
import { KEY_HELP } from "./keyboard";
import "./mainMenu.css";

/**
 * Choices for a new game (design 13.4). Versus has neither goal nor invaders and runs online only.
 * Coop can add AI factions (neighbors in the system) as a world option.
 */
export interface NewGameOptions {
  mode: "coop" | "versus";
  goal: "endless" | "supernova";
  invaders: "off" | "normal" | "strong";
  /** coop: how many AI factions live in the system (0 = none), and how hard they play. */
  factions: 0 | 2 | 3 | 4;
  difficulty: "cozy" | "normal" | "hard";
  /** The player's own people (Volk). */
  people: PeopleId;
  /** World generation (all modes); "random" fields are drawn from the seed. */
  world: WorldChoice;
}

/** What the world screen shows; `planets: "random"` is sent as a missing field. */
export interface WorldChoice {
  planets: number | "random";
  start: NonNullable<WorldOptions["start"]>;
  sun: NonNullable<WorldOptions["sun"]>;
  size: NonNullable<WorldOptions["size"]>;
}

/** The sim's world options for a choice. */
export function worldOptions(world: WorldChoice): WorldOptions {
  const { planets, ...rest } = world;
  return planets === "random" ? rest : { ...rest, planets };
}

const SUN_NAMES: Record<string, string> = { yellow: "🟡 Gelb", red: "🔴 Rot", blue: "🔵 Blau", white: "⚪ Weiß" };
const SIZE_NAMES: Record<string, string> = { small: "Klein", normal: "Normal", large: "Groß" };
const PLANET_COUNTS = [1, 2, 3, 4, 6, 8, 10, 12, 16].filter((n) => n >= WORLD_LIMITS.planets.min && n <= WORLD_LIMITS.planets.max);
const DEFAULT_WORLD: WorldChoice = { planets: "random", start: "temperate", sun: "random", size: "normal" };

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

/** What a screen shows: a fixed title row, the scrolling content and a fixed bottom row. */
/** A choice card: icon on top, title, optional line below. */
type Pick = (group: string, value: string, icon: string, title: string, on: boolean, note?: string) => string;

interface View {
  head?: string;
  body: string;
  foot?: string;
}

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
    // <details> toggles do not bubble; remember the world fold so a re-render keeps it.
    this.root.addEventListener(
      "toggle",
      (e) => {
        const fold = e.target as HTMLDetailsElement;
        if (fold.dataset?.fold === "world") this.worldOpen = fold.open;
      },
      true,
    );
    document.body.append(this.root);
  }

  /** Original menu art is loaded: icons and buttons come from the asset pipeline instead of emoji. */
  set art(on: boolean) {
    this.hasArt = on;
    this.root.classList.toggle("art", on);
    peopleArt.on = on;
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

  /** Menu icon from the art (ui/<file>.png), else the emoji. Short names mean ui-icon-<name>. */
  private icon(name: string, emoji: string): string {
    const file = name.includes("/") ? name : `ui/ui-icon-${name}`;
    return this.hasArt ? `<img class="menu-icon" src="assets/sprites/${file}.png" alt="">` : emoji;
  }

  /** A big menu entry: icon tile, title, one line below, arrow. */
  private item(go: string, icon: string, title: string, sub = "", primary = false): string {
    return `<button class="menu-item${primary ? " primary" : ""}" data-go="${go}"><span class="mi-icon">${icon}</span><span class="mi-text"><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</span><span class="mi-chev" aria-hidden="true">›</span></button>`;
  }

  /** Title row of a sub screen with a back arrow. */
  private head(icon: string, title: string, back = "back"): string {
    return `<header class="menu-head"><button class="menu-back" data-go="${back}" aria-label="Zurück" title="Zurück (Esc)">‹</button><h2>${icon} ${title}</h2></header>`;
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

  /** Esc: one screen back, or back to the game from the top screen. */
  back(): void {
    if (this.busy) return;
    if (this.screen !== this.base) {
      this.sfx.play("ui.close");
      this.toBase();
    } else if (this.actions.current()) this.close();
  }

  private toBase(): void {
    this.error = "";
    this.confirmNew = false;
    this.screen = this.base;
    if (this.base === "home") this.slot = undefined;
    this.render();
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
    const screen = this.screen;
    const keep = this.lastScreen === screen ? (this.root.querySelector(".menu-body")?.scrollTop ?? 0) : 0;
    this.lastScreen = screen;
    const view =
      screen === "pause" ? this.renderPause() : screen === "new" ? this.renderNew() : screen === "settings" ? this.renderSettings() : screen === "credits" ? this.renderCredits() : this.renderHome();
    const error = this.error ? `<p class="menu-error">⚠️ ${escape(this.error)}</p>` : "";
    this.root.innerHTML = `<div class="menu-card screen-${screen}${this.busy ? " busy" : ""}">${view.head ?? ""}<div class="menu-body">${error}${view.body}</div>${view.foot ? `<footer class="menu-foot">${view.foot}</footer>` : ""}</div>`;
    const body = this.root.querySelector(".menu-body");
    if (body && keep) body.scrollTop = keep;
    if (!keep) this.root.querySelector(".menu-card")?.classList.add("enter");
  }
  /** Screen of the last render: picking an option keeps the scroll position, a new screen starts at the top. */
  private lastScreen: Screen | null = null;
  /** Whether the world options are unfolded in the new-game screen. */
  private worldOpen = false;

  private renderHome(): View {
    const current = this.actions.current();
    const logo = this.hasArt
      ? `<img class="menu-logo" src="assets/sprites/brand/logo${(window.devicePixelRatio || 1) > 1.25 ? "@2x" : ""}.png" alt="PlanetForge">`
      : `<h1>PlanetForge</h1>`;
    const saved = this.saved && current ? `<p class="menu-saved${this.saved.ok ? "" : " bad"}">${this.saved.ok ? "✅" : "⚠️"} ${escape(this.saved.text)}</p>` : "";
    return {
      head: `<header class="menu-title">${logo}<p>Baue deinen Planeten, rette dein Sonnensystem.</p></header>`,
      body: `${saved}
      <nav class="menu-list">
        ${current ? this.item("continue", this.icon("continue", "▶️"), "Weiter", escape(current), true) : ""}
        ${this.item("new", this.icon("new-game", "✨"), "Neues Spiel", "Allein oder mit Freunden", !current)}
        ${this.item("online", this.icon("load", "☁️"), "Online-Spiele", "Spielstände, mit Code beitreten, einladen")}
        ${this.item("settings", this.icon("ui/tab-settings", "⚙️"), "Einstellungen", "Name, Musik, Geräusche, Tasten")}
        ${this.item("credits", this.icon("credits", "📜"), "Credits", "Wer PlanetForge gemacht hat")}
      </nav>`,
      foot: `<p class="menu-fine">Fan-Projekt · inspiriert von <i>A Planet of Mine</i></p>`,
    };
  }

  /** In-game menu behind ☰: the game is already saved when it opens. */
  private renderPause(): View {
    const current = this.actions.current() ?? "";
    const saved = this.saved;
    return {
      head: `<header class="menu-head"><h2>${this.icon("ui/icon-pause", "⏸️")} Pause</h2><button class="menu-back close" data-go="continue" aria-label="Weiterspielen" title="Weiterspielen (Esc)">✕</button></header>`,
      body: `
      <p class="menu-note center">${escape(current)}</p>
      ${saved ? `<p class="menu-saved${saved.ok ? "" : " bad"}">${saved.ok ? "✅" : "⚠️"} ${escape(saved.text)}</p>` : ""}
      <nav class="menu-list">
        ${this.item("continue", this.icon("continue", "▶️"), "Weiterspielen", "", true)}
        ${this.item("save", this.icon("load", "💾"), "Speichern", "Spielstand jetzt sichern")}
        ${this.item("toHome", this.icon("quit", "🏠"), "Speichern &amp; zum Hauptmenü", "Neues Spiel, Online-Spiele, Credits")}
        ${this.item("settings", this.icon("ui/tab-settings", "⚙️"), "Einstellungen", "Name, Musik, Geräusche, Tasten")}
      </nav>`,
    };
  }

  private renderNew(): View {
    const c = this.choice;
    const pick: Pick = (group, value, icon, title, on, note = "") =>
      `<button class="menu-choice${on ? " on" : ""}" data-pick="${group}" data-value="${value}" aria-pressed="${on}">${icon ? `<span class="ci">${icon}</span>` : ""}<b>${title}</b>${note ? `<small>${note}</small>` : ""}</button>`;
    const versus = c.mode === "versus";
    const confirm = this.confirmNew
      ? `<div class="menu-confirm"><span>Dein Planet auf diesem Gerät wird überschrieben.</span><button class="danger" data-go="start!">Ja, neu starten</button><button data-go="cancelStart">Nein</button></div>`
      : "";
    const online = versus || this.where === "online";
    return {
      head: this.head(this.icon("new-game", "✨"), "Neues Spiel", "home"),
      body: `
      <div class="menu-columns">
        <div class="menu-col">
          <section class="menu-section">
            <p class="menu-label">Spielmodus</p>
            <div class="menu-choices">
              ${pick("mode", "coop", this.icon("mode-coop", "🤝"), "Koop", !versus, "Gemeinsamer Planet")}
              ${pick("mode", "versus", this.icon("mode-versus", "⚔️"), "Versus", versus, "Jeder gegen jeden")}
            </div>
            ${versus ? `<p class="menu-note">Jeder hat einen eigenen Planeten. Wer zuletzt noch ein Volk hat, gewinnt. Nur online, lade Freunde per Code ein.</p>` : ""}
            <p class="menu-label">Spielen</p>
            <div class="menu-choices">
              ${versus ? `<button class="menu-choice" disabled><span class="ci">🧑</span><b>Allein</b><small>Nur im Koop</small></button>` : pick("where", "local", "🧑", "Allein", this.where === "local", "Offline auf diesem Gerät")}
              ${pick("where", "online", this.icon("join", "👥"), "Online", online, this.slot ? `Platz ${this.slot}, Freunde per Code` : "Freunde per Code einladen")}
            </div>
          </section>
          ${versus ? "" : this.renderCoopChoices(pick)}
        </div>
        <div class="menu-col">
          ${this.renderPeople()}
          ${this.renderWorld(!versus)}
        </div>
      </div>`,
      foot: `${confirm}
      <div class="menu-actions">
        <button class="secondary" data-go="home">Zurück</button>
        <button class="primary" data-go="start">Los geht's</button>
      </div>`,
    };
  }

  /** One line about the chosen world, shown on the folded world options. */
  private worldSummary(withFactions: boolean): string {
    const c = this.choice;
    const w = c.world;
    const parts = [
      w.planets === "random" ? "🎲 Planeten" : `${w.planets} Planet${w.planets === 1 ? "" : "en"}`,
      w.start === "random" ? "🎲 Start" : PLANET_TYPES[w.start as keyof typeof PLANET_TYPES]?.name ?? String(w.start),
      w.size === "random" ? "🎲 Größe" : SIZE_NAMES[w.size] ?? w.size,
      w.sun === "random" ? "🎲 Sonne" : `${SUN_NAMES[w.sun] ?? w.sun}`,
    ];
    if (withFactions) parts.push(c.factions ? `${c.factions} Fraktionen` : "keine Fraktionen");
    return parts.join(" · ");
  }

  /**
   * Star system like in Planet of Mine: planet count, start planet, sun, size, each with Zufall.
   * Coop adds the AI factions living in the system (each on its own extra planet) and their strength.
   * Folded by default so the new-game screen stays short; the summary shows what is chosen.
   */
  private renderWorld(withFactions: boolean): string {
    const c = this.choice;
    const w = c.world;
    const chip = (group: string, value: string | number, label: string) => {
      const on = String(w[group as keyof WorldChoice]) === String(value);
      return `<button class="menu-chip${on ? " on" : ""}" data-pick="world.${group}" data-value="${value}" aria-pressed="${on}">${label}</button>`;
    };
    const random = (group: string) => chip(group, "random", "🎲 Zufall");
    const option = (group: "factions" | "difficulty", value: string | number, label: string) => {
      const on = String(c[group]) === String(value);
      return `<button class="menu-chip${on ? " on" : ""}" data-pick="${group}" data-value="${value}" aria-pressed="${on}">${label}</button>`;
    };
    const factions = withFactions
      ? `
        <span>🏳️ Fraktionen</span><div class="menu-chips">${option("factions", 0, "Keine")}${([2, 3, 4] as const).map((n) => option("factions", n, String(n))).join("")}</div>
        ${c.factions ? `<span>Stärke der Fraktionen</span><div class="menu-chips">${option("difficulty", "cozy", "Entspannt")}${option("difficulty", "normal", "Normal")}${option("difficulty", "hard", "Hart")}</div>` : ""}`
      : "";
    const note = withFactions && c.factions ? `<p class="menu-note">Andere Völker starten gleichzeitig auf eigenen Planeten im System. Handelt mit ihnen, verbündet euch, schließt euch zusammen oder führt Krieg.</p>` : "";
    return `
      <details class="menu-section menu-fold" data-fold="world"${this.worldOpen ? " open" : ""}>
        <summary><span class="menu-label">Welt</span><small>${escape(this.worldSummary(withFactions))}</small></summary>
        <div class="menu-world">
          <span>Planeten</span><div class="menu-chips">${random("planets")}${PLANET_COUNTS.map((n) => chip("planets", n, String(n))).join("")}</div>
          <span>Startplanet</span><div class="menu-chips">${random("start")}${PLANET_TYPE_IDS.map((t) => chip("start", t, PLANET_TYPES[t].name)).join("")}</div>
          <span>Größe</span><div class="menu-chips">${random("size")}${chip("size", "small", "Klein")}${chip("size", "normal", "Normal")}${chip("size", "large", "Groß")}</div>
          <span>Sonne</span><div class="menu-chips">${random("sun")}${SYSTEM.sunTypes.map((s) => chip("sun", s, SUN_NAMES[s] ?? s)).join("")}</div>${factions}
        </div>${note}
      </details>`;
  }

  private renderPeople(): string {
    return `<section class="menu-section"><p class="menu-label">Dein Volk</p>${peoplePickerHtml(this.choice.people)}</section>`;
  }

  private renderCoopChoices(pick: Pick): string {
    const c = this.choice;
    return `
      <section class="menu-section">
        <p class="menu-label">Ziel</p>
        <div class="menu-choices">
          ${pick("goal", "supernova", "☀️", "Supernova", c.goal === "supernova", "Schild um die Sonne bauen")}
          ${pick("goal", "endless", "♾️", "Endlos", c.goal === "endless", "Ohne Ende weiterbauen")}
        </div>
        <p class="menu-label">Invasoren</p>
        <div class="menu-choices compact">
          ${pick("invaders", "off", "", "Aus", c.invaders === "off")}
          ${pick("invaders", "normal", "", "Normal", c.invaders === "normal")}
          ${pick("invaders", "strong", "", "Stark", c.invaders === "strong")}
        </div>
      </section>`;
  }

  private renderSettings(): View {
    const m = this.music.state;
    const s = this.sfx.settings;
    return {
      head: this.head(this.icon("ui/tab-settings", "⚙️"), "Einstellungen"),
      body: `
      <section class="menu-section">
        <p class="menu-label">Profil</p>
        <label class="menu-field"><span>Dein Name</span><input data-set="name" maxlength="24" value="${escape(readName())}" placeholder="Spieler"></label>
      </section>
      <section class="menu-section">
        <p class="menu-label">Ton</p>
        <div class="menu-field">
          <label><input type="checkbox" data-set="music" ${m.enabled ? "checked" : ""}> 🎵 Musik</label>
          <input type="range" data-set="musicVolume" min="0" max="100" step="5" value="${Math.round(m.volume * 100)}" ${m.enabled ? "" : "disabled"} aria-label="Musik-Lautstärke">
        </div>
        <div class="menu-field">
          <label><input type="checkbox" data-set="sfx" ${s.muted ? "" : "checked"}> 🔊 Geräusche</label>
          <input type="range" data-set="sfxVolume" min="0" max="100" step="5" value="${Math.round(s.volume * 100)}" ${s.muted ? "disabled" : ""} aria-label="Geräusch-Lautstärke">
        </div>
      </section>
      <details class="menu-section menu-fold menu-keys"${matchMedia("(pointer: fine)").matches ? " open" : ""}>
        <summary><span class="menu-label">⌨️ Tastatur am PC</span></summary>
        <dl>${KEY_HELP.map(([keys, what]) => `<dt>${keys}</dt><dd>${what}</dd>`).join("")}</dl>
      </details>
      <p class="menu-note center">Alles wird in diesem Browser gespeichert.</p>`,
    };
  }

  private renderCredits(): View {
    const logo = this.hasArt ? `<img class="menu-logo small" src="assets/sprites/brand/logo-mark.png" alt="">` : "";
    return {
      head: this.head(this.icon("credits", "📜"), "Credits"),
      body: `
      <section class="menu-section credits">
        ${logo}
        <p>Ein Fan-Projekt von <b>Seb</b>, inspiriert von <i>A Planet of Mine</i> (Tuesday Quest).</p>
        <dl class="menu-credits">
          <dt>Programmierung</dt><dd>Claude</dd>
          <dt>Grafiken</dt><dd>Codex</dd>
          <dt>Musik &amp; Geräusche</dt><dd>Live im Code erzeugt, ohne fremde Aufnahmen</dd>
          <dt>Technik</dt><dd>TypeScript, PixiJS, Supabase, Capacitor</dd>
        </dl>
      </section>`,
    };
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
      else if (pick === "factions") this.choice.factions = Number(value) as NewGameOptions["factions"];
      else if (pick === "difficulty") this.choice.difficulty = value as NewGameOptions["difficulty"];
      else if (pick === "where") this.where = value as Where;
      else if (pick.startsWith("world.")) {
        const key = pick.slice(6) as keyof WorldChoice;
        this.choice.world = { ...this.choice.world, [key]: key === "planets" && value !== "random" ? Number(value) : value };
      }
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
        this.toBase();
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
        if (this.where === "local" && this.choice.mode !== "versus" && this.actions.current()) {
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
  const fallback: NewGameOptions = { mode: "coop", goal: "supernova", invaders: "normal", people: PEOPLE_IDS[0], world: DEFAULT_WORLD, factions: 0, difficulty: "normal" };
  try {
    const raw = { ...fallback, ...JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? "{}") } as Omit<NewGameOptions, "mode"> & { mode: string };
    // The former "Fraktionen" mode is coop with factions.
    const mode: NewGameOptions["mode"] = raw.mode === "versus" ? "versus" : "coop";
    const saved: NewGameOptions = { ...raw, mode };
    if (raw.mode === "factions" && !saved.factions) saved.factions = 3;
    if (![0, 2, 3, 4].includes(saved.factions)) saved.factions = 0;
    if (!isPeopleId(saved.people)) saved.people = fallback.people;
    saved.world = { ...DEFAULT_WORLD, ...saved.world };
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
