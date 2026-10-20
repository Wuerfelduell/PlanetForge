import {
  adjacencyMultiplier,
  BIOMES,
  buildBlocker,
  BUILDING_IDS,
  BUILDINGS,
  cycleOf,
  housing,
  idleUnits,
  NOT_AFFORDABLE,
  population,
  workerCount,
  economyOf,
  nextLevelThreshold,
  RESOURCE_IDS,
  RESOURCES,
  segmentOutput,
  ticksPerCycle,
  workerCapacity,
  type Command,
  type GameState,
  type ResourceId,
  type GameEvent,
  type PlanetState,
} from "../sim";
import { currentHint } from "./hints";

export interface UiActions {
  send(cmd: Command): void;
  setSpeed(speed: number): void;
  newGame(): void;
}

/** HTML overlay: resource bar on top, segment panel at the bottom, toasts. */
export class Ui {
  private readonly hud = el("hud");
  private readonly panel = el("panel");
  private readonly toasts = el("toasts");
  private lastHud = "";
  private lastPanel = "";
  private selected = 0;
  private state: GameState | null = null;
  /** Planet currently shown (the player's home planet until there is a star map). */
  private planetId = "";
  private speed = 1;

  constructor(private readonly actions: UiActions) {
    // pointerup instead of click: the panel re-renders while the player taps, and a click needs
    // the same element under pointerdown and pointerup.
    for (const root of [this.hud, this.panel]) {
      root.addEventListener("pointerup", (e) => this.onAction(e));
    }
  }

  /** The local player, whose people the +/- buttons move. */
  playerId = "";

  setPlanet(planetId: string): void {
    this.planetId = planetId;
  }

  setSelected(index: number): void {
    this.selected = index;
  }

  render(state: GameState): void {
    this.state = state;
    const planet = state.planets.find((p) => p.id === this.planetId);
    if (!planet) return;
    const hud = this.renderHud(state, planet);
    if (hud !== this.lastHud) this.hud.innerHTML = this.lastHud = hud;
    const panel = this.renderPanel(state, planet);
    if (panel !== this.lastPanel) this.panel.innerHTML = this.lastPanel = panel;
  }

  showEvents(events: GameEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case "born":
          this.toast(`👶 Neuer Einwohner${e.playerId === this.playerId ? "" : ` bei ${this.state?.players.find((p) => p.id === e.playerId)?.name ?? "Mitspieler"}`}`);
          break;
        case "levelUp": {
          const unlocked = BUILDING_IDS.filter((b) => BUILDINGS[b].unlockLevel === e.level).map((b) => `${BUILDINGS[b].icon} ${BUILDINGS[b].name}`);
          this.toast(`⭐ Aufstieg auf Stufe ${e.level}!${unlocked.length ? ` Neu: ${unlocked.join(", ")}` : ""}`, "good");
          break;
        }
        case "depleted":
          this.toast(`${RESOURCES[e.resource].icon} ${RESOURCES[e.resource].name} auf Feld ${e.segment + 1} erschöpft`, "warn");
          break;
        case "starving":
          this.toast("🍂 Hunger! Ohne Nahrung arbeiten alle nur halb so schnell.", "bad");
          break;
        case "revealed":
          this.toast(`🔭 ${e.segments.length} neue Felder entdeckt`);
          break;
        case "queueDropped":
          this.toast(`⏳ Geplante ${BUILDINGS[e.building].name} entfällt: ${e.reason}`, "warn");
          break;
        case "removed":
          this.toast(`👋 ${e.playerId === this.playerId ? "Du wurdest" : "Ein Spieler wurde"} aus dem Spiel entfernt`, "warn");
          break;
        case "cycle":
        case "built":
        case "demolished":
        case "joined":
        case "lobby":
          break;
      }
    }
  }

  toast(text: string, kind: "info" | "good" | "warn" | "bad" = "info"): void {
    const node = document.createElement("div");
    node.className = `toast ${kind}`;
    node.textContent = text;
    this.toasts.appendChild(node);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild!.remove();
    setTimeout(() => node.classList.add("out"), 2600);
    setTimeout(() => node.remove(), 3000);
  }

  private onAction(e: Event): void {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target || target.hasAttribute("disabled")) return;
    const { action, value } = target.dataset;
    const at = { planetId: this.planetId, segment: this.selected };
    switch (action) {
      case "assign":
        this.actions.send({ type: "assign", ...at, delta: Number(value) });
        break;
      case "build":
        this.actions.send({ type: "build", ...at, building: value as (typeof BUILDING_IDS)[number] });
        break;
      case "enqueue":
        this.actions.send({ type: "enqueue", ...at, building: value as (typeof BUILDING_IDS)[number] });
        break;
      case "dequeue":
        this.actions.send({ type: "dequeue", planetId: this.planetId, index: Number(value) });
        break;
      case "demolish":
        this.actions.send({ type: "demolish", ...at });
        break;
      case "gather":
        this.actions.send({ type: "setGather", ...at, resource: value as ResourceId });
        break;
      case "speed":
        this.speed = Number(value);
        this.actions.setSpeed(this.speed);
        this.lastHud = "";
        break;
      case "new":
        if (confirm("Neues Spiel starten? Der aktuelle Planet geht verloren.")) this.actions.newGame();
        break;
    }
  }

  private renderHud(state: GameState, planet: PlanetState): string {
    const economy = economyOf(state, planet);
    if (!economy) return "";
    const shown = RESOURCE_IDS.filter((r) => r === "food" || r === "wood" || economy.resources[r] >= 1);
    const chips = shown
      .map((r) => `<span class="chip${r === "food" && economy.starving ? " bad" : ""}" title="${RESOURCES[r].name}">${RESOURCES[r].icon} ${Math.floor(economy.resources[r])}</span>`)
      .join("");
    const ascension = economy.ascension;
    const lvl = ascension.level;
    const prev = lvl === 0 ? 0 : (nextLevelThreshold(lvl - 1) ?? 0);
    const next = nextLevelThreshold(lvl);
    const progress = next === null ? 1 : (ascension.points - prev) / (next - prev);
    const cycleProgress = (state.tick % ticksPerCycle(state)) / ticksPerCycle(state);
    const speeds = [0, 1, 3]
      .map((s) => `<button class="speed${s === this.speed ? " on" : ""}" data-action="speed" data-value="${s}">${s === 0 ? "⏸" : `${s}×`}</button>`)
      .join("");
    return `
      <div class="row resources">${chips}<span class="spacer"></span>${speeds}<button class="speed" data-action="new" title="Neues Spiel">↻</button></div>
      <div class="row status">
        <span class="chip" title="Planet">🪐 ${planet.name}</span>
        <span class="chip" title="Einwohner (frei) / Wohnraum">👥 ${population(state, planet)}/${housing(state, planet)} <small>(${idleUnits(state, planet, this.playerId).length} frei)</small></span>
        <span class="level" title="Aufstieg: ${ascension.points}${next ? ` / ${next}` : ""} Punkte">⭐ ${lvl}<span class="bar"><span style="width:${Math.round(Math.min(1, progress) * 100)}%"></span></span></span>
        <span class="cycle" title="Planetenumlauf ${cycleOf(state) + 1}" style="--p:${Math.round(cycleProgress * 100)}"></span>
      </div>`;
  }

  private renderPanel(state: GameState, planet: PlanetState): string {
    const economy = economyOf(state, planet);
    if (!economy) return "";
    const s = planet.segments[this.selected]!;
    const hint = `<p class="hint">💡 ${currentHint(state, planet, this.playerId)}</p>`;
    if (!s.revealed) {
      return `<h2>❔ Unerforschtes Feld</h2><p class="muted">Bau ein Gebäude in der Nähe, um es aufzudecken.</p>${hint}`;
    }
    const biome = BIOMES[s.biome];
    const def = s.building ? BUILDINGS[s.building] : null;
    const title = def ? `${def.icon} ${def.name} <small>auf ${biome.name}</small>` : biome.name;

    const output = segmentOutput(planet, s, workerCount(state, planet, s.index));
    const deposits = s.deposits
      .map((d) => {
        const amount = d.infinite ? "∞" : `${Math.floor(d.amount)}/${d.max}`;
        const active = output[d.resource] ? " active" : "";
        const tag = d.byHand ? "" : `<small>Mine</small>`;
        const selectable = !def && d.byHand;
        return `<button class="deposit${active}${selectable && s.gather === d.resource ? " on" : ""}" ${selectable ? `data-action="gather" data-value="${d.resource}"` : "disabled"}>${RESOURCES[d.resource].icon} ${amount} ${tag}</button>`;
      })
      .join("");

    const cap = workerCapacity(s);
    const rate = Object.entries(output)
      .map(([r, v]) => `+${(v as number).toFixed(1)} ${RESOURCES[r as ResourceId].icon}/s`)
      .join(" ");
    const mult = adjacencyMultiplier(planet, s);
    const workers = cap
      ? `<div class="workers">
          <button class="round" data-action="assign" data-value="-1" ${workerCount(state, planet, s.index, this.playerId) > 0 ? "" : "disabled"}>－</button>
          <span>👤 ${workerCount(state, planet, s.index)}/${cap}${workerCount(state, planet, s.index) !== workerCount(state, planet, s.index, this.playerId) ? ` <small>(${workerCount(state, planet, s.index, this.playerId)} von dir)</small>` : ""}</span>
          <button class="round" data-action="assign" data-value="1" ${workerCount(state, planet, s.index) < cap && idleUnits(state, planet, this.playerId).length > 0 ? "" : "disabled"}>＋</button>
          <span class="rate">${rate}${mult > 1 ? ` <small>Nachbarbonus ×${mult.toFixed(2)}</small>` : ""}</span>
        </div>`
      : "";

    const queue = state.queues[planet.id] ?? [];
    const queued = queue.find((q) => q.segment === s.index);
    const queuedNote = queued
      ? `<p class="muted">⏳ Geplant: ${BUILDINGS[queued.building].icon} ${BUILDINGS[queued.building].name}, wird gebaut, sobald genug da ist. <button data-action="dequeue" data-value="${queue.indexOf(queued)}">Abbrechen</button></p>`
      : "";
    let actions = "";
    if (def) {
      actions = `<p class="muted">${def.description}</p><button class="wide danger" data-action="demolish">Abreißen (50 % zurück)</button>`;
    } else if (biome.buildable) {
      actions = `<div class="builds">${BUILDING_IDS.filter((b) => BUILDINGS[b].allowedBiomes.includes(s.biome))
        .map((b) => {
          const bd = BUILDINGS[b];
          const blocker = buildBlocker(state, planet, s, b);
          const locked = economy.ascension.level < bd.unlockLevel;
          const cost = Object.entries(bd.cost)
            .map(([r, v]) => `<span class="${economy.resources[r as ResourceId] >= (v as number) ? "" : "short"}">${RESOURCES[r as ResourceId].icon}${v}</span>`)
            .join(" ");
          // Missing resources only: offer to queue the build instead of greying it out.
          const queueable = blocker === NOT_AFFORDABLE && !queued;
          return `<button class="build" data-action="${queueable ? "enqueue" : "build"}" data-value="${b}" ${blocker && !queueable ? "disabled" : ""} title="${bd.description}">
              <span class="icon">${locked ? "🔒" : bd.icon}</span><span class="name">${bd.name}</span><span class="cost">${locked ? `Stufe ${bd.unlockLevel}` : cost}${queueable ? "<br>⏳ einplanen" : ""}</span>
            </button>`;
        })
        .join("")}</div>`;
    } else {
      actions = `<p class="muted">Hier kann man nicht bauen, aber Einwohner können sammeln.</p>`;
    }

    return `<h2>${title}</h2><div class="deposits">${deposits}</div>${workers}${queuedNote}${actions}${hint}`;
  }
}

function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} missing`);
  return node;
}
