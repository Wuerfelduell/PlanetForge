import {
  adjacencyMultiplier,
  BIOMES,
  buildBlocker,
  BUILDING_IDS,
  BUILDINGS,
  cycleOf,
  housing,
  idleWorkers,
  nextLevelThreshold,
  RESOURCE_IDS,
  RESOURCES,
  segmentOutput,
  TICKS_PER_CYCLE,
  workerCapacity,
  type Command,
  type GameState,
  type ResourceId,
  type SimEvent,
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
  private speed = 1;

  constructor(private readonly actions: UiActions) {
    // pointerup instead of click: the panel re-renders while the player taps, and a click needs
    // the same element under pointerdown and pointerup.
    for (const root of [this.hud, this.panel]) {
      root.addEventListener("pointerup", (e) => this.onAction(e));
    }
  }

  setSelected(index: number): void {
    this.selected = index;
  }

  render(state: GameState): void {
    const hud = this.renderHud(state);
    if (hud !== this.lastHud) this.hud.innerHTML = this.lastHud = hud;
    const panel = this.renderPanel(state);
    if (panel !== this.lastPanel) this.panel.innerHTML = this.lastPanel = panel;
  }

  showEvents(events: SimEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case "born":
          this.toast(`👶 Neuer Einwohner (${e.population})`);
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
        case "cycle":
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
    const segment = this.selected;
    switch (action) {
      case "assign":
        this.actions.send({ type: "assign", segment, delta: Number(value) });
        break;
      case "build":
        this.actions.send({ type: "build", segment, building: value as (typeof BUILDING_IDS)[number] });
        break;
      case "demolish":
        this.actions.send({ type: "demolish", segment });
        break;
      case "gather":
        this.actions.send({ type: "setGather", segment, resource: value as ResourceId });
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

  private renderHud(state: GameState): string {
    const shown = RESOURCE_IDS.filter((r) => r === "food" || r === "wood" || state.resources[r] >= 1);
    const chips = shown
      .map((r) => `<span class="chip${r === "food" && state.starving ? " bad" : ""}" title="${RESOURCES[r].name}">${RESOURCES[r].icon} ${Math.floor(state.resources[r])}</span>`)
      .join("");
    const lvl = state.ascension.level;
    const prev = lvl === 0 ? 0 : (nextLevelThreshold(lvl - 1) ?? 0);
    const next = nextLevelThreshold(lvl);
    const progress = next === null ? 1 : (state.ascension.points - prev) / (next - prev);
    const cycleProgress = (state.tick % TICKS_PER_CYCLE) / TICKS_PER_CYCLE;
    const speeds = [0, 1, 3]
      .map((s) => `<button class="speed${s === this.speed ? " on" : ""}" data-action="speed" data-value="${s}">${s === 0 ? "⏸" : `${s}×`}</button>`)
      .join("");
    return `
      <div class="row resources">${chips}<span class="spacer"></span>${speeds}</div>
      <div class="row status">
        <span class="chip" title="Einwohner (frei) / Wohnraum">👥 ${state.population}/${housing(state)} <small>(${idleWorkers(state)} frei)</small></span>
        <span class="level" title="Aufstieg: ${state.ascension.points}${next ? ` / ${next}` : ""} Punkte">⭐ ${lvl}<span class="bar"><span style="width:${Math.round(Math.min(1, progress) * 100)}%"></span></span></span>
        <span class="cycle" title="Planetenumlauf ${cycleOf(state) + 1}" style="--p:${Math.round(cycleProgress * 100)}"></span>
        <span class="spacer"></span>
        <button class="speed" data-action="new" title="Neues Spiel">↻</button>
      </div>`;
  }

  private renderPanel(state: GameState): string {
    const s = state.planet.segments[this.selected]!;
    const hint = `<p class="hint">💡 ${currentHint(state)}</p>`;
    if (!s.revealed) {
      return `<h2>❔ Unerforschtes Feld</h2><p class="muted">Bau ein Gebäude in der Nähe, um es aufzudecken.</p>${hint}`;
    }
    const biome = BIOMES[s.biome];
    const def = s.building ? BUILDINGS[s.building] : null;
    const title = def ? `${def.icon} ${def.name} <small>auf ${biome.name}</small>` : biome.name;

    const output = segmentOutput(state, s);
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
    const mult = adjacencyMultiplier(state, s);
    const workers = cap
      ? `<div class="workers">
          <button class="round" data-action="assign" data-value="-1" ${s.workers > 0 ? "" : "disabled"}>－</button>
          <span>👤 ${s.workers}/${cap}</span>
          <button class="round" data-action="assign" data-value="1" ${s.workers < cap && idleWorkers(state) > 0 ? "" : "disabled"}>＋</button>
          <span class="rate">${rate}${mult > 1 ? ` <small>Nachbarbonus ×${mult.toFixed(2)}</small>` : ""}</span>
        </div>`
      : "";

    let actions = "";
    if (def) {
      actions = `<p class="muted">${def.description}</p><button class="wide danger" data-action="demolish">Abreißen (50 % zurück)</button>`;
    } else if (biome.buildable) {
      actions = `<div class="builds">${BUILDING_IDS.filter((b) => BUILDINGS[b].allowedBiomes.includes(s.biome))
        .map((b) => {
          const bd = BUILDINGS[b];
          const blocker = buildBlocker(state, s, b);
          const locked = state.ascension.level < bd.unlockLevel;
          const cost = Object.entries(bd.cost)
            .map(([r, v]) => `<span class="${state.resources[r as ResourceId] >= (v as number) ? "" : "short"}">${RESOURCES[r as ResourceId].icon}${v}</span>`)
            .join(" ");
          return `<button class="build" data-action="build" data-value="${b}" ${blocker ? "disabled" : ""} title="${bd.description}">
              <span class="icon">${locked ? "🔒" : bd.icon}</span><span class="name">${bd.name}</span><span class="cost">${locked ? `Stufe ${bd.unlockLevel}` : cost}</span>
            </button>`;
        })
        .join("")}</div>`;
    } else {
      actions = `<p class="muted">Hier kann man nicht bauen, aber Einwohner können sammeln.</p>`;
    }

    return `<h2>${title}</h2><div class="deposits">${deposits}</div>${workers}${actions}${hint}`;
  }
}

function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} missing`);
  return node;
}
