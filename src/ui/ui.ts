import {
  adjacencyMultiplier,
  BIOMES,
  buildBlocker,
  BUILDING_CATEGORIES,
  BUILDING_CATEGORY_IDS,
  BUILDING_IDS,
  BUILDINGS,
  type BuildingCategory,
  MARKET,
  tradeBlocker,
  tradePrice,
  cycleOf,
  housing,
  discoveryCost,
  OFFERABLE,
  discoveryDescription,
  discoveryName,
  flightPlan,
  novaTickNow,
  shieldBlocker,
  shieldFlightPlan,
  SUPERNOVA,
  PLANET_TYPES,
  hasBuilding,
  asteroidsVisible,
  rocketCapacity,
  idleUnits,
  launchBlocker,
  NOT_AFFORDABLE,
  ROCKETS,
  type RocketId,
  population,
  workerCount,
  economyOf,
  nextLevelThreshold,
  RESOURCE_IDS,
  RESOURCES,
  RULES,
  RECIPES,
  segmentOutput,
  segmentRecipe,
  buildingStats,
  energySupply,
  powerFactor,
  nextUpgrade,
  upgradeBlocker,
  toolFactor,
  ticksPerCycle,
  workerCapacity,
  type Command,
  type GameState,
  type ResourceId,
  type BuildingId,
  type GameEvent,
  type PlanetState,
  TERRAFORM,
  terraformBlocker,
  NOT_SCORCHED,
  type TerraformKind,
} from "../sim";
import { currentHint } from "./hints";
import { artTexture, buildingArt, buildingIconUrl, resourceIconUrl } from "../render/art";

export interface UiActions {
  send(cmd: Command): void;
  /** Shows another planet on the wheel. */
  showPlanet(planetId: string): void;
  /** Switches between the planet wheel and the star map. */
  showMap(open: boolean): void;
  setSpeed(speed: number): void;
  /** Opens the main menu (continue, new game, online, settings). */
  openMenu(): void;
}

/** HTML overlay: resource bar on top, segment panel at the bottom, toasts. */
export class Ui {
  private readonly hud = el("hud");
  private readonly panel = el("panel-body");
  private readonly toasts = el("toasts");
  private lastHud = NO_HUD;
  private hudParts: { chips: HTMLElement; controls: HTMLElement; rest: HTMLElement } | null = null;
  private lastPanel = "";
  private selected = 0;
  private state: GameState | null = null;
  /** Planet currently shown (the player's home planet until there is a star map). */
  private planetId = "";
  private speed = 1;
  /** Speed to resume with after a pause. */
  private lastSpeed = 1;

  constructor(private readonly actions: UiActions) {
    // pointerup instead of click: the panel re-renders while the player taps, and a click needs
    // the same element under pointerdown and pointerup.
    for (const root of [this.hud, this.panel]) {
      root.addEventListener("pointerup", (e) => this.onAction(e));
    }
  }

  /** Original art is loaded: icons come from the asset pipeline instead of emoji. */
  art = false;
  private showDiscoveries = false;
  /** Open tab of the build menu; kept while the player taps from field to field. */
  private buildTab: BuildingCategory | "terrain" = "housing";
  /** Market: what the player pays with and what they want. */
  private marketGive: ResourceId | null = null;
  private marketGet: ResourceId | null = null;
  /** Star map open, and the planet (or "sun") picked on it. */
  private mapOpen = false;
  /** Read by the star map to highlight the same planet. */
  mapTarget: string | null = null;

  /** A planet or the sun was tapped on the star map. */
  selectMapTarget(id: string): void {
    this.mapTarget = id;
    this.lastPanel = "";
  }

  private dicon(id: string): string {
    return this.art ? `<img class="bi" src="assets/sprites/discoveries/${id}.png" alt="">` : "📜";
  }

  /** HUD badge from the ui atlas (single PNG), the emoji until the art is loaded. */
  private badge(name: "invasion" | "shield", emoji: string): string {
    return this.art ? `<img class="ri" src="assets/sprites/ui/${name}.png" alt="${emoji}">` : emoji;
  }

  private res(resource: ResourceId): string {
    // The name as tooltip: planks and bricks look like gold and copper bars (Seb, 2026-10-21).
    const { name, icon } = RESOURCES[resource];
    return this.art && artTexture(`resource.${resource}`) ? `<img class="ri" src="${resourceIconUrl(resource)}" alt="${name}" title="${name}">` : `<span title="${name}">${icon}</span>`;
  }

  /** Icon of a field action: Codex art where it exists, else the emoji. */
  private ticon(kind: TerraformKind, emoji = TERRAFORM[kind].icon): string {
    return this.art && kind === "clearScorched" && artTexture("ui.icon-clear-scorched") ? `<img class="bi" src="assets/sprites/ui/icon-clear-scorched.png" alt="${emoji}">` : emoji;
  }

  private bicon(building: BuildingId): string {
    return this.art && buildingArt(building) ? `<img class="bi" src="${buildingIconUrl(building)}" alt="${BUILDINGS[building].icon}">` : BUILDINGS[building].icon;
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
    // Three parts, so the resource strip stays the same element and keeps its scroll position
    // (and an ongoing swipe) while the numbers tick.
    if (!this.hudParts) {
      this.hud.innerHTML = `<div class="row resources"><div class="res-scroll"></div><span class="spacer"></span><div class="hud-controls"></div></div><div class="hud-rest"></div>`;
      this.hudParts = { chips: this.hud.querySelector(".res-scroll")!, controls: this.hud.querySelector(".hud-controls")!, rest: this.hud.querySelector(".hud-rest")! };
    }
    if (hud.chips !== this.lastHud.chips) this.hudParts.chips.innerHTML = hud.chips;
    if (hud.controls !== this.lastHud.controls) this.hudParts.controls.innerHTML = hud.controls;
    if (hud.rest !== this.lastHud.rest) this.hudParts.rest.innerHTML = hud.rest;
    this.lastHud = hud;
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
          this.toast(`${RESOURCES[e.resource].icon} ${RESOURCES[e.resource].name} auf Feld ${e.segment + 1} erschöpft${e.resource === "wood" ? ". Tipp: Bäume pflanzen (🌱) oder ein Förster lässt ihn nachwachsen" : ""}`, "warn");
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
        case "launched": {
          const to = this.planetName(e.to);
          if (e.playerId === this.playerId) this.toast(`${ROCKETS[e.rocket].icon} Rakete nach ${to} gestartet`);
          else if (this.isMine(e.to)) this.toast(`⚠️ ${this.playerName(e.playerId)} greift ${to} an! Alle Einwohner verteidigen, freie am besten.`, "bad");
          break;
        }
        case "landed":
          if (e.playerId === this.playerId) this.toast(e.colonized ? `🚩 Kolonie auf ${this.planetName(e.planetId)} gegründet` : `🚀 ${e.count} Einwohner auf ${this.planetName(e.planetId)} gelandet`, "good");
          break;
        case "battle": {
          const where = this.planetName(e.planetId);
          if (e.attacker === this.playerId) {
            this.toast(e.won ? `⚔️ ${where} erobert! ${e.captured} Gefangene` : `⚔️ Angriff auf ${where} gescheitert`, e.won ? "good" : "bad");
          } else if (e.defender === this.playerId) {
            this.toast(e.won ? `💥 ${where} ist verloren` : `🛡️ ${where} gehalten, ${e.attackerLosses} Angreifer besiegt`, e.won ? "bad" : "good");
          }
          break;
        }
        case "assimilated":
          if (e.playerId === this.playerId) this.toast(`🤝 ${e.count} Gefangene gehören jetzt zu deinem Volk`);
          break;
        case "eliminated":
          this.toast(e.playerId === this.playerId ? "💀 Dein Volk ist ausgelöscht" : `💀 ${this.playerName(e.playerId)} ist ausgeschieden`, e.playerId === this.playerId ? "bad" : "info");
          break;
        case "surrendered":
          if (e.playerId !== this.playerId) this.toast(`🏳️ ${this.playerName(e.playerId)} gibt auf`);
          break;
        case "drawOffer":
          if (e.playerId !== this.playerId && e.offer) this.toast(`🤝 ${this.playerName(e.playerId)} bietet Unentschieden an`);
          break;
        case "drawSuggested":
          this.toast("🤝 Lange kein Kampf mehr. Ihr könnt euch auf Unentschieden einigen.");
          break;
        case "discovered":
          if (this.state?.players.find((p) => p.id === this.playerId)?.economyId === e.economyId) this.toast(`🔬 Entdeckt: ${discoveryName(e.discovery)}`, "good");
          break;
        case "discoveryVote":
          if (e.playerId !== this.playerId) this.toast(`🗳️ ${this.playerName(e.playerId)} stimmt für ${discoveryName(e.discovery)}`);
          break;
        case "invasionSpotted":
          this.toast(`👾 Invasoren (Welle ${e.wave}) im Anflug auf ${this.targetName(e.target)}! Ankunft in ${this.secondsUntil(e.arrivalTick)} s`, "bad");
          break;
        case "invasionArrived":
          this.toast(`👾 Invasoren belagern ${this.targetName(e.target)}. Freie Einwohner und Abwehrbatterien kämpfen.`, "bad");
          break;
        case "siege":
          if (e.scorched?.length) this.toast(`🔥 Niemand wehrt sich: Invasoren verbrennen ${e.scorched.length} Felder auf ${this.targetName(e.target)}${e.destroyed ? ` und zerstören ${BUILDINGS[e.destroyed].name}` : ""}`, "bad");
          else if (e.destroyed) this.toast(`💥 Invasoren zerstören ${BUILDINGS[e.destroyed].name} auf ${this.targetName(e.target)}`, "bad");
          else if (e.shieldSegment !== null) this.toast(`💥 Hüllensegment ${e.shieldSegment + 1} beschädigt`, "bad");
          break;
        case "invasionDefeated":
          this.toast(`🏆 Mutterschiff über ${this.targetName(e.target)} zerstört! Wrackteile geborgen.`, "good");
          break;
        case "invasionMoved":
          this.toast(`👾 Die Invasoren ziehen von ${this.targetName(e.from)} weiter nach ${this.targetName(e.target)}! Ankunft in ${this.secondsUntil(e.arrivalTick)} s`, "bad");
          break;
        case "sunWarning":
          this.toast(`☀️ Die Sonne wird unruhig: Supernova in etwa ${e.cyclesLeft} Umläufen. Baut die Schutzhülle!`, "bad");
          break;
        case "shieldBuilt":
          this.toast(e.repaired ? `🛠️ Hüllensegment ${e.segment + 1} repariert` : `🌞 Hüllensegment ${e.segment + 1} steht`, "good");
          break;
        case "shieldComplete":
          this.toast("🌞 Die Schutzhülle ist geschlossen. Das System ist gerettet!", "good");
          break;
        case "gameOver":
          this.toast(this.resultText(e.result), "supernova" in e.result ? "bad" : "good");
          break;
        case "upgraded":
          if (e.playerId === this.playerId) this.toast(`⬆️ ${BUILDINGS[e.building].name} auf Stufe ${e.tier} ausgebaut`, "good");
          break;
        case "traded":
          if (e.playerId === this.playerId) this.toast(`🏪 ${e.count} ${RESOURCES[e.get].name} für ${e.paid} ${RESOURCES[e.give].name} getauscht`, "good");
          break;
        case "cycle":
        case "built":
        case "demolished":
        case "terraformed":
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
      case "upgrade":
        this.actions.send({ type: "upgrade", ...at });
        break;
      case "terraform":
        this.actions.send({ type: "terraform", ...at, kind: value as TerraformKind });
        break;
      case "launch": {
        const [to, rocket, count, from] = value!.split(":");
        this.actions.send({ type: "launch", planetId: from || this.planetId, to: to!, rocket: rocket as RocketId, count: Number(count) });
        break;
      }
      case "planet": {
        const own = this.ownPlanets();
        const next = own[(own.findIndex((p) => p.id === this.planetId) + 1) % own.length];
        if (next) this.actions.showPlanet(next.id);
        break;
      }
      case "draw": {
        const me = this.state?.players.find((p) => p.id === this.playerId);
        this.actions.send({ type: "offerDraw", offer: !me?.offersDraw });
        break;
      }
      case "marketGive":
      case "marketGet":
        this[action] = value as ResourceId;
        this.lastPanel = "";
        break;
      case "trade": {
        const [count, give, get] = value!.split(":");
        this.actions.send({ type: "trade", planetId: this.planetId, give: give as ResourceId, get: get as ResourceId, count: Number(count) });
        break;
      }
      case "buildTab":
        this.buildTab = value as BuildingCategory | "terrain";
        this.lastPanel = "";
        break;
      case "discoveries":
        this.showDiscoveries = !this.showDiscoveries;
        this.lastPanel = "";
        break;
      case "vote":
        this.actions.send({ type: "voteDiscovery", discovery: value! });
        break;
      case "shield": {
        const [segment, repair, from] = value!.split(":");
        this.actions.send({ type: "shieldFlight", planetId: from || this.planetId, segment: Number(segment), repair: repair === "1" });
        break;
      }
      case "openLobby":
        this.actions.send({ type: "openLobby" });
        break;
      case "surrender":
        if (confirm("Wirklich aufgeben? Dein Volk verschwindet.")) this.actions.send({ type: "surrender" });
        break;
      case "gather":
        this.actions.send({ type: "setGather", ...at, resource: value as ResourceId });
        break;
      case "speed":
        if (this.speed > 0) this.lastSpeed = this.speed;
        this.speed = Number(value);
        this.actions.setSpeed(this.speed);
        this.lastHud = NO_HUD;
        break;
      case "map":
        this.mapOpen = !this.mapOpen;
        this.showDiscoveries = false;
        this.lastPanel = "";
        this.lastHud = NO_HUD;
        this.actions.showMap(this.mapOpen);
        break;
      case "mapTarget":
        this.selectMapTarget(value!);
        this.actions.showMap(true);
        break;
      case "view":
        this.mapOpen = false;
        this.lastPanel = "";
        this.lastHud = NO_HUD;
        this.actions.showMap(false);
        this.actions.showPlanet(value!);
        break;
      case "home": {
        const own = this.ownPlanets()[0];
        if (own) this.actions.showPlanet(own.id);
        break;
      }
      case "menu":
        this.actions.openMenu();
        break;
    }
  }

  private renderHud(state: GameState, planet: PlanetState): HudHtml {
    // Always the viewer's own stock, also while looking at someone else's planet.
    const economy = this.myEconomy(state) ?? economyOf(state, planet);
    if (!economy) return NO_HUD;
    const shown = RESOURCE_IDS.filter((r) => r === "food" || r === "wood" || economy.resources[r] >= 1);
    const chips = shown
      .map((r) => `<span class="chip${r === "food" && economy.starving ? " bad" : ""}" title="${RESOURCES[r].name}">${this.res(r)} ${Math.floor(economy.resources[r])}</span>`)
      .join("");
    const ascension = economy.ascension;
    const lvl = ascension.level;
    const prev = lvl === 0 ? 0 : (nextLevelThreshold(lvl - 1) ?? 0);
    const next = nextLevelThreshold(lvl);
    const progress = next === null ? 1 : (ascension.points - prev) / (next - prev);
    const cycleProgress = (state.tick % ticksPerCycle(state)) / ticksPerCycle(state);
    // Pause plus one 1×/3× toggle instead of three buttons, to keep the bar to one line on phones.
    const paused = this.speed === 0;
    const pace = paused ? this.lastSpeed : this.speed;
    const speeds =
      `<button class="speed${paused ? " on" : ""}" data-action="speed" data-value="${paused ? pace : 0}" title="${paused ? "Weiter" : "Pause"}">${paused ? "▶" : "⏸"}</button>` +
      `<button class="speed${pace === 3 ? " on" : ""}" data-action="speed" data-value="${pace === 3 ? 1 : 3}" title="Tempo">${pace}×</button>`;
    const own = this.ownPlanets();
    const planetChip = !own.some((p) => p.id === planet.id)
      ? `<span class="chip name" title="Planet">🪐 ${planet.name}</span>${own.length ? `<button class="chip glow" data-action="home" title="Zurück zum eigenen Planeten">↩ Zurück</button>` : ""}`
      : own.length > 1
        ? `<button class="chip name" data-action="planet" title="Nächster eigener Planet">🪐 ${planet.name} <small>${own.findIndex((p) => p.id === planet.id) + 1}/${own.length} ▸</small></button>`
        : `<span class="chip name" title="Planet">🪐 ${planet.name}</span>`;
    const me = state.players.find((p) => p.id === this.playerId);
    const duel = state.settings.mode === "versus" && state.players.length > 1 && !state.result && me && !me.eliminated;
    const versusButtons = duel
      ? `<button class="speed${me.offersDraw ? " on" : ""}" data-action="draw" title="Unentschieden anbieten">🤝</button><button class="speed" data-action="surrender" title="Aufgeben">🏳️</button>`
      : "";
    const controls = `${speeds}<button class="speed" id="menu-button" data-action="menu" title="Menü und Speichern" aria-label="Menü und Speichern">☰</button>`;
    const rest = `
      <div class="row status main">
        ${planetChip}
        <button class="chip${this.mapOpen ? " on" : ""}" data-action="map" title="${this.mapOpen ? "Zurück zum Planeten" : "Sternkarte"}">${this.mapOpen ? "🪐" : "🌌"}</button>
        <span class="chip" title="Einwohner / Wohnraum, davon frei">👥 ${population(state, planet)}/${housing(state, planet)} <small>${idleUnits(state, planet, this.playerId).length} frei</small></span>
        ${planet.power ? `<span class="chip${planet.power.demand > planet.power.supply ? " bad" : ""}" title="Strom: erzeugt / gebraucht">⚡ ${fmt(planet.power.supply)}/${fmt(planet.power.demand)}</span>` : ""}
        <span class="level" title="Aufstieg: ${ascension.points}${next ? ` / ${next}` : ""} Punkte">⭐ ${lvl}<span class="bar"><span style="width:${Math.round(Math.min(1, progress) * 100)}%"></span></span></span>
        <span class="cycle" title="Planetenumlauf ${cycleOf(state) + 1}" style="--p:${Math.round(cycleProgress * 100)}"></span>
      </div>${this.renderFlights(state, versusButtons)}`;
    return { chips, controls, rest };
  }

  /** Own rockets and attacks on own planets, with time to arrival. */
  /** One short line of status chips (details in their tooltips); the versus buttons ride along at its end. */
  private renderFlights(state: GameState, versusButtons = ""): string {
    const chips: string[] = [];
    const economy = state.economies[state.players.find((p) => p.id === this.playerId)?.economyId ?? ""];
    if (economy?.offer || economy?.discoveries.length) {
      const label = economy.offer ? `🔬 Wählen <small>${Math.floor(economy.resources.science)}/${discoveryCost(state, economy)}</small>` : `🔬 ${economy.discoveries.length}`;
      const title = economy.offer ? "Entdeckung wählen" : `${economy.discoveries.length} Entdeckungen`;
      chips.push(`<button class="chip${economy.offer ? " glow" : ""}" data-action="discoveries" title="${title}">${label}</button>`);
    }
    // The server closes the lobby after 10 idle minutes; only the host can open it again.
    if (!state.lobby.open) {
      chips.push(
        state.hostId === this.playerId
          ? `<button class="chip" data-action="openLobby" title="Spiel geschlossen. Tippen zum Öffnen">🔓 Öffnen</button>`
          : `<span class="chip" title="Spiel geschlossen. Warte auf ${this.playerName(state.hostId)}">🔒 Zu</span>`,
      );
    }
    const result = state.result;
    if (result) {
      chips.push(`<span class="chip">${this.resultText(result)}</span>`);
    } else if (state.players.find((p) => p.id === this.playerId)?.eliminated) {
      chips.push(`<span class="chip bad">💀 Ausgeschieden</span>`);
    }
    const inv = state.invasion;
    if (inv && (inv.spotted || inv.sieging)) {
      chips.push(
        inv.sieging
          ? `<span class="chip bad" title="Belagerung von ${this.targetName(inv.target)}, Mutterschiff ${inv.hp}/${inv.maxHp}">${this.badge("invasion", "👾")} ${this.targetName(inv.target)} <small>${inv.hp}/${inv.maxHp}</small></span>`
          : `<span class="chip bad" title="Welle ${inv.wave} im Anflug auf ${this.targetName(inv.target)}">${this.badge("invasion", "👾")} ${this.targetName(inv.target)} <small>${this.secondsUntil(inv.arrivalTick)} s</small></span>`,
      );
    }
    const nova = novaTickNow(state);
    const built = state.sun.shield.filter((x) => x.built).length;
    if (state.sun.saved) chips.push(`<span class="chip" title="Schutzhülle geschlossen">${this.badge("shield", "🌞")} ✓</span>`);
    else if (nova !== null && (built > 0 || cycleOf(state) >= SUPERNOVA.firstHintCycle)) {
      const minutes = Math.ceil((nova - state.tick) / RULES.ticksPerSecond / 60);
      chips.push(`<span class="chip${cycleOf(state) >= SUPERNOVA.firstHintCycle ? " bad" : ""}" title="Schutzhülle ${built}/${SUPERNOVA.segments}, Supernova in etwa ${minutes} min">${this.badge("shield", "☀️")} ${built}/${SUPERNOVA.segments} <small>~${minutes} min</small></span>`);
    }
    for (const f of state.flights) {
      const seconds = Math.ceil((f.arrivalTick - state.tick) / RULES.ticksPerSecond);
      if (f.owner === this.playerId) chips.push(`<span class="chip">${ROCKETS[f.rocket].icon} ${this.planetName(f.to)} <small>${f.units.length}👤 ${seconds} s</small></span>`);
      else if (this.isMine(f.to)) chips.push(`<span class="chip bad">⚠️ ${this.planetName(f.to)} <small>${f.units.length} Angreifer ${seconds} s</small></span>`);
    }
    return chips.length || versusButtons ? `<div class="row status extra">${chips.join("")}${versusButtons ? `<span class="spacer"></span>${versusButtons}` : ""}</div>` : "";
  }

  private resultText(result: NonNullable<GameState["result"]>): string {
    if ("draw" in result) return "🤝 Unentschieden";
    if ("supernova" in result) return "💥 Die Sonne ist zur Supernova geworden. Spiel verloren.";
    return result.winner === this.playerId ? "🏆 Du hast gewonnen!" : `🏁 ${this.playerName(result.winner)} hat gewonnen`;
  }

  private targetName(target: string): string {
    return target === "sun" ? "die Schutzhülle" : this.planetName(target);
  }

  private secondsUntil(tick: number): number {
    return Math.max(0, Math.ceil((tick - (this.state?.tick ?? 0)) / RULES.ticksPerSecond));
  }

  private myEconomy(state: GameState) {
    return state.economies[state.players.find((p) => p.id === this.playerId)?.economyId ?? ""] ?? null;
  }

  /** Someone else's or a free planet: look only, with a way back. */
  private renderForeign(state: GameState, planet: PlanetState): string {
    const people = population(state, planet);
    const back = this.ownPlanets().length ? `<button class="build" data-action="home">↩ Zurück zum eigenen Planeten</button>` : "";
    return `<h2>${planet.type === "asteroid" ? "🪨" : "🪐"} ${planet.name} <small>${this.planetStatus(state, planet)}</small></h2>
      <p class="muted">${PLANET_TYPES[planet.type].name} · ${planet.segments.length} Felder${people ? ` · ${people} Einwohner` : ""}. Hier hast du nichts. Mit einer Rakete von deiner Startrampe kannst du hinfliegen.</p>
      <div class="row">${back}<button class="build" data-action="map">🌌 Karte</button></div>`;
  }

  private ownPlanets(): PlanetState[] {
    const state = this.state;
    const me = state?.players.find((p) => p.id === this.playerId);
    return state && me ? state.planets.filter((p) => p.economyId === me.economyId) : [];
  }

  private isMine(planetId: string): boolean {
    return this.ownPlanets().some((p) => p.id === planetId);
  }

  private planetName(planetId: string): string {
    return this.state?.planets.find((p) => p.id === planetId)?.name ?? "?";
  }

  private playerName(playerId: string): string {
    return this.state?.players.find((p) => p.id === playerId)?.name ?? "Mitspieler";
  }

  /** Rocket buttons from one own planet to a target (colony to free or own planets, attacks elsewhere). */
  private launchButtons(state: GameState, planet: PlanetState, to: PlanetState, from = ""): string {
    const me = state.players.find((p) => p.id === this.playerId);
    const idle = idleUnits(state, planet, this.playerId).length;
    const rockets: RocketId[] = to.economyId !== null && to.economyId !== me?.economyId ? ["combat"] : ["colony"];
    return rockets
      .map((rocket) => {
        const count = Math.max(1, Math.min(rocketCapacity(economyOf(state, planet), rocket), idle));
        const plan = flightPlan(planet, to, rocket, count, economyOf(state, planet));
        const blocker = launchBlocker(state, this.playerId, planet, to, rocket, count);
        const economy = economyOf(state, planet)!;
        const cost = Object.entries(plan.cost)
          .map(([r, v]) => `<span class="${economy.resources[r as ResourceId] >= (v as number) ? "" : "short"}">${this.res(r as ResourceId)}${v}</span>`)
          .join(" ");
        const label = rocket === "combat" ? `⚔️ Angriff mit ${count}` : `🚀 ${count} hinschicken`;
        return `<button class="build" data-action="launch" data-value="${to.id}:${rocket}:${count}${from ? `:${from}` : ""}" ${blocker ? `disabled title="${blocker}"` : ""}><span class="name">${label}</span><span class="cost">${cost} · ${plan.seconds} s${blocker && blocker !== NOT_AFFORDABLE ? `<br>${blocker}` : ""}</span></button>`;
      })
      .join("");
  }

  /** Planets the player knows of: asteroids only with "Weltraumbergbau" (or once someone lives there). */
  private visiblePlanets(state: GameState): PlanetState[] {
    const me = state.players.find((p) => p.id === this.playerId);
    const see = asteroidsVisible(me ? state.economies[me.economyId] : undefined);
    return state.planets.filter((p) => p.type !== "asteroid" || see || p.economyId !== null);
  }

  private planetStatus(state: GameState, to: PlanetState): string {
    const me = state.players.find((p) => p.id === this.playerId);
    return to.economyId === null ? "unbewohnt" : to.economyId === me?.economyId ? "eigener Planet" : `von ${this.playerName(state.players.find((p) => p.economyId === to.economyId)?.id ?? "")}`;
  }

  /** Launch pad: one row per reachable planet with the rockets that can go there. */
  /** Market stand: pick what to pay with, then what to get, then how much. */
  private renderMarket(state: GameState, planet: PlanetState): string {
    const economy = economyOf(state, planet);
    if (!economy) return "";
    const tradeable = RESOURCE_IDS.filter((r) => MARKET.values[r]);
    const owned = tradeable.filter((r) => economy.resources[r] >= 1);
    const give = this.marketGive && owned.includes(this.marketGive) ? this.marketGive : null;
    const chip = (r: ResourceId, action: string, on: boolean, extra = "") =>
      `<button class="deposit${on ? " on" : ""}" data-action="${action}" data-value="${r}" title="${RESOURCES[r].name}">${this.res(r)}${extra}</button>`;
    let html = `<p class="tab-name">Du gibst</p><div class="deposits">${owned.map((r) => chip(r, "marketGive", r === give, ` <small>${Math.floor(economy.resources[r])}</small>`)).join("") || `<small class="muted">Nichts zum Tauschen da</small>`}</div>`;
    if (!give) return html;
    const get = this.marketGet && this.marketGet !== give ? this.marketGet : null;
    html += `<p class="tab-name">Du bekommst</p><div class="deposits">${tradeable.filter((r) => r !== give).map((r) => chip(r, "marketGet", r === get)).join("")}</div>`;
    if (!get) return html;
    const offers = MARKET.lots
      .map((count) => {
        const price = tradePrice(give, get, count)!;
        const blocker = tradeBlocker(state, planet, give, get, count);
        return `<button class="build" data-action="trade" data-value="${count}:${give}:${get}" ${blocker ? `disabled title="${blocker}"` : ""}><span class="name">${count} ${this.res(get)} kaufen</span><span class="cost"><span class="${economy.resources[give] >= price ? "" : "short"}">${price} ${this.res(give)}</span>${blocker && blocker !== NOT_AFFORDABLE ? `<br>${blocker}` : ""}</span></button>`;
      })
      .join("");
    return `${html}<div class="choices">${offers}</div>`;
  }

  private renderLaunches(state: GameState, planet: PlanetState): string {
    const idle = idleUnits(state, planet, this.playerId).length;
    const rows = this.visiblePlanets(state)
      .filter((p) => p.id !== planet.id)
      .map((to) => `<div class="target"><span>🪐 ${to.name} <small>${this.planetStatus(state, to)} · ${to.segments.length} Felder</small></span>${this.launchButtons(state, planet, to)}</div>`)
      .join("");
    return `<p class="muted">${BUILDINGS.launchpad.description} Es fliegen freie Einwohner (${idle} frei).</p><div class="targets">${rows}</div>${this.renderShield(state, planet)}`;
  }

  /** Star map panel: what was tapped, and the flights that can go there from own launch pads. */
  private renderMap(state: GameState): string {
    const pads = this.ownPlanets().filter((p) => hasBuilding(p, "launchpad"));
    let html = `<h2>🌌 Sternsystem <button class="speed" data-action="map" title="Zurück zum Planeten">✕</button></h2>`;
    const target = this.mapTarget;
    if (target === "sun") {
      const nova = novaTickNow(state);
      const built = state.sun.shield.filter((x) => x.built).length;
      html += `<p><b>☀️ Die Sonne</b></p>`;
      if (state.sun.saved) html += `<p class="muted">Die Schutzhülle ist geschlossen. Die Sonne ist gerettet.</p>`;
      else if (nova === null) html += `<p class="muted">In diesem Spiel droht keine Supernova.</p>`;
      else {
        html += `<p class="muted">Hülle ${built}/${SUPERNOVA.segments}${cycleOf(state) >= SUPERNOVA.firstHintCycle || built > 0 ? `, Supernova in ~${Math.ceil((nova - state.tick) / ticksPerCycle(state))} Umläufen` : ". Noch ist die Sonne ruhig."}</p>`;
        html += pads.length ? this.renderShield(state, pads[0]!, pads[0]!.id) : `<p class="muted">Für Bauflüge zur Sonne braucht es eine Startrampe.</p>`;
      }
      return html;
    }
    const planet = state.planets.find((p) => p.id === target);
    if (!planet) {
      const list = this.visiblePlanets(state)
        .map((p) => `<button class="chip" data-action="mapTarget" data-value="${p.id}">${p.type === "asteroid" ? "🪨" : "🪐"} ${p.name} <small>${this.planetStatus(state, p)}</small></button>`)
        .join("");
      return `${html}<p class="muted">Tippe auf einen Planeten oder die Sonne.</p><div class="choices">${list}</div>`;
    }
    const people = Object.values(state.units).filter((u) => u.planetId === planet.id).length;
    html += `<div class="target"><span>${planet.type === "asteroid" ? "🪨" : "🪐"} <b>${planet.name}</b> <small>${PLANET_TYPES[planet.type].name} · ${planet.segments.length} Felder · ${this.planetStatus(state, planet)}${people ? ` · ${people} Einwohner` : ""}</small></span><button class="build" data-action="view" data-value="${planet.id}">🔍 Ansehen</button></div>`;
    const from = pads.filter((p) => p.id !== planet.id);
    if (from.length) {
      html += `<div class="targets">${from.map((p) => `<div class="target"><span>von ${p.name} <small>${idleUnits(state, p, this.playerId).length} frei</small></span>${this.launchButtons(state, p, planet, p.id)}</div>`).join("")}</div>`;
    } else if (!this.isMine(planet.id)) {
      html += `<p class="muted">Bau eine Startrampe, um hierhin zu fliegen.</p>`;
    }
    return html;
  }

  /** Shield around the sun (coop goal "supernova"): build missing segments, repair damaged ones. */
  private renderShield(state: GameState, planet: PlanetState, from = ""): string {
    if (state.sun.novaTick === null || state.sun.saved) return "";
    const economy = economyOf(state, planet)!;
    const build = shieldFlightPlan(planet, false, economy);
    const segments = state.sun.shield
      .map((seg, i) => {
        const repair = seg.built && seg.hp < 100;
        if (seg.built && !repair) return `<button class="seg ok" disabled title="Segment ${i + 1}: ${seg.hp} %">🌞</button>`;
        const blocker = shieldBlocker(state, this.playerId, planet, i, repair);
        return `<button class="seg${repair ? " hurt" : ""}" data-action="shield" data-value="${i}:${repair ? 1 : 0}${from ? `:${from}` : ""}" ${blocker ? `disabled title="${blocker}"` : `title="${repair ? `Reparieren (${seg.hp} %)` : "Bauen"}"`}>${repair ? "🛠️" : "＋"}</button>`;
      })
      .join("");
    const cost = Object.entries(build.cost)
      .filter(([, v]) => (v as number) > 0)
      .map(([r, v]) => `<span class="${economy.resources[r as ResourceId] >= (v as number) ? "" : "short"}">${this.res(r as ResourceId)}${v}</span>`)
      .join(" ");
    // The ring around the sun as it stands: dashed = missing, cracked = under half.
    const ring = this.art
      ? `<div class="shield-ring"><img src="assets/sprites/space/sun-${state.sun.type}.png" alt="">${state.sun.shield
          .map((seg, i) => {
            const look = !seg.built ? "empty" : seg.hp < 50 ? "damaged" : "built";
            return `<img style="transform: rotate(${(i * 360) / state.sun.shield.length}deg)" src="assets/sprites/space/sun-shield-segment-${look}.png" alt="">`;
          })
          .join("")}</div>`
      : "";
    return `<h2>${this.badge("shield", "☀️")} Schutzhülle</h2><p class="muted">Jedes Segment verschiebt die Supernova, alle ${SUPERNOVA.segments} verhindern sie. Bau: ${SUPERNOVA.crew} Einwohner fliegen hin (${build.seconds} s) und kommen zurück. Kosten: ${cost}</p>${ring}<div class="shield">${segments}</div>`;
  }

  /** Discovery choice (coop: everyone votes, most votes win, a tie decides nothing) and what the team owns. */
  private renderDiscoveries(state: GameState): string {
    const me = state.players.find((p) => p.id === this.playerId);
    const economy = me ? state.economies[me.economyId] : undefined;
    if (!economy) return "";
    const members = state.players.filter((p) => p.economyId === economy.id && !p.eliminated);
    const cost = discoveryCost(state, economy);
    let html = `<h2>🔬 Entdeckungen <button class="speed" data-action="discoveries" title="Zurück">✕</button></h2>`;
    if (economy.offer) {
      const offer = economy.offer;
      const enough = economy.resources.science >= cost;
      html += `<p class="muted">Kostet ${this.res("science")} ${cost} Wissen (${Math.floor(economy.resources.science)} da).${members.length > 1 ? " Alle stimmen ab; die meisten Stimmen gewinnen am Ende des Umlaufs, bei Gleichstand passiert nichts." : ""}</p>`;
      html += `<div class="targets">${offer.options
        .map((id) => {
          const voters = members.filter((p) => offer.votes[p.id] === id).map((p) => p.name);
          const mine = offer.votes[this.playerId] === id;
          return `<div class="target"><span>${this.dicon(id)} <b>${discoveryName(id)}</b><small>${discoveryDescription(id)}${voters.length && members.length > 1 ? ` · 🗳️ ${voters.join(", ")}` : ""}</small></span><button class="build${mine ? " on" : ""}" data-action="vote" data-value="${id}">${members.length > 1 ? (mine ? "✓ Deine Stimme" : "Dafür stimmen") : mine ? "✓ Vorgemerkt" : enough ? "Erforschen" : "Vormerken"}</button></div>`;
        })
        .join("")}</div>`;
      if (!enough) html += `<p class="muted">Labore erzeugen Wissen. Die Wahl gilt, sobald genug da ist.</p>`;
    } else {
      const open = OFFERABLE.some((id) => !economy.discoveries.includes(id));
      html += `<p class="muted">${open ? "Die nächste Wahl kommt mit der nächsten Aufstiegsstufe." : "Alle Entdeckungen sind erforscht."}</p>`;
    }
    if (economy.discoveries.length) {
      html += `<p class="muted">Schon entdeckt:</p><ul class="owned">${economy.discoveries.map((id) => `<li>${this.dicon(id)} <b>${discoveryName(id)}</b> <small>${discoveryDescription(id)}</small></li>`).join("")}</ul>`;
    }
    return html;
  }

  /** Power line of a plant or consumer: what it feeds in or needs, and how the grid stands. */
  private renderPower(state: GameState, planet: PlanetState, s: PlanetState["segments"][number]): string {
    const def = buildingStats(s);
    if (!def?.energy) return "";
    const grid = planet.power ?? { supply: 0, demand: 0 };
    const net = `Netz ${fmt(grid.supply)}/${fmt(grid.demand)}`;
    if (def.energy > 0) {
      const now = energySupply(planet, s, workerCount(state, planet, s.index), economyOf(state, planet));
      const fuel = def.burns && now === 0 && workerCount(state, planet, s.index) > 0 ? ` · ohne ${RESOURCES[def.burns.resource].name} kein Strom` : "";
      return `<p class="power">⚡ liefert ${fmt(now)} Strom <small>(${net})${fuel}</small></p>`;
    }
    const factor = powerFactor(planet, s);
    return `<p class="power${factor < 1 ? " short" : ""}">⚡ braucht ${-def.energy} Strom <small>(${net})${factor < 1 ? ` · zu wenig Strom: ${Math.round(factor * 100)} %` : ""}</small></p>`;
  }

  private renderPanel(state: GameState, planet: PlanetState): string {
    if (this.mapOpen) return this.renderMap(state);
    if (this.showDiscoveries) return this.renderDiscoveries(state);
    if (!this.isMine(planet.id)) return this.renderForeign(state, planet);
    const economy = economyOf(state, planet);
    if (!economy) return "";
    const s = planet.segments[this.selected]!;
    const hint = `<p class="hint">💡 ${currentHint(state, planet, this.playerId)}</p>`;
    if (!s.revealed) {
      return `<h2>❔ Unerforschtes Feld</h2><p class="muted">Bau ein Gebäude in der Nähe, um es aufzudecken.</p>${hint}`;
    }
    const biome = BIOMES[s.biome];
    const def = buildingStats(s);
    const stage = def?.upgrades ? ` <small>Stufe ${s.tier ?? 1}</small>` : "";
    const title = def ? `${this.bicon(s.building!)} ${def.name}${stage} <small>auf ${biome.name}</small>` : s.scorched ? `${this.ticon("clearScorched", "🔥")} Verbrannte Erde <small>${biome.name}</small>` : biome.name;

    const output = segmentOutput(planet, s, workerCount(state, planet, s.index), economy);
    const depositButton = (d: (typeof s.deposits)[number]) => {
        // Only whether something is left, not how much: players read the field, not a counter.
        const empty = !d.infinite && d.amount <= 0;
        const amount = d.infinite ? "<small>unerschöpflich</small>" : empty ? "<small>aufgebraucht</small>" : "";
        const active = output[d.resource] ? " active" : empty ? " empty" : "";
        const deep = BIOMES[s.biome].deposits.find((x) => x.resource === d.resource)?.tier;
        const tag = deep ? `<small>Mine ${deep}</small>` : "";
        const selectable = !def && d.byHand;
        return `<button class="deposit${active}${selectable && s.gather === d.resource ? " on" : ""}" ${selectable ? `data-action="gather" data-value="${d.resource}"` : "disabled"}>${this.res(d.resource)} ${amount} ${tag}</button>`;
    };
    // Two layers (Seb): what grows or lies on top, and the ground below that only a mine reaches.
    const surface = s.deposits.filter((d) => d.byHand).map(depositButton).join("");
    const ground = s.deposits.filter((d) => !d.byHand).map(depositButton).join("");
    const deposits =
      (surface ? `<div class="deposits"><span class="layer">Oberfläche</span>${surface}</div>` : "") +
      (ground ? `<div class="deposits"><span class="layer">Untergrund</span>${ground}</div>` : "");

    const cap = workerCapacity(s);
    const rate = Object.entries(output)
      .map(([r, v]) => `+${(v as number).toFixed(1)} ${this.res(r as ResourceId)}/s`)
      .join(" ");
    const mult = adjacencyMultiplier(planet, s);
    const workers = cap
      ? `<div class="workers">
          <button class="round" data-action="assign" data-value="-1" ${workerCount(state, planet, s.index, this.playerId) > 0 ? "" : "disabled"}>－</button>
          <span>👤 ${workerCount(state, planet, s.index)}/${cap}${workerCount(state, planet, s.index) !== workerCount(state, planet, s.index, this.playerId) ? ` <small>(${workerCount(state, planet, s.index, this.playerId)} von dir)</small>` : ""}</span>
          <button class="round" data-action="assign" data-value="1" ${workerCount(state, planet, s.index) < cap && idleUnits(state, planet, this.playerId).length > 0 ? "" : "disabled"}>＋</button>
          <span class="rate">${rate}${mult !== 1 ? ` <small>Nachbarn ×${mult.toFixed(2)}</small>` : ""}${toolFactor(s, economy) < 1 ? ` <small>🔧 ohne Werkzeug langsamer</small>` : ""}</span>
        </div>`
      : "";
    const recipe = segmentRecipe(s);
    const recipes = def?.crafts
      ? `<div class="deposits">${def.crafts.recipes
          .map((id) => {
            const r = RECIPES[id];
            const list = (c: Partial<Record<ResourceId, number>>) => Object.entries(c).map(([k, v]) => `${v}${this.res(k as ResourceId)}`).join(" ");
            return `<button class="deposit${id === recipe ? " on" : ""}" data-action="gather" data-value="${id}" title="${r.name}">${list(r.inputs)} → ${list(r.outputs)}</button>`;
          })
          .join("")}</div>`
      : "";

    const queue = state.queues[planet.id] ?? [];
    const queued = queue.find((q) => q.segment === s.index);
    const queuedNote = queued
      ? `<p class="muted">⏳ Geplant: ${BUILDINGS[queued.building].icon} ${BUILDINGS[queued.building].name}, wird gebaut, sobald genug da ist. <button data-action="dequeue" data-value="${queue.indexOf(queued)}">Abbrechen</button></p>`
      : "";
    // Planting trees and filling in water (only offered where it does something).
    const terraforms = def
      ? ""
      : (Object.keys(TERRAFORM) as TerraformKind[])
          .filter((k) => TERRAFORM[k].from.includes(s.biome))
          .map((k) => {
            const t = TERRAFORM[k];
            const blocker = terraformBlocker(state, planet, s, k);
            if (blocker === "Hier stehen genug Bäume" || blocker === NOT_SCORCHED) return "";
            const cost = Object.entries(t.cost)
              .map(([r, v]) => `<span class="${economy.resources[r as ResourceId] >= (v as number) ? "" : "short"}">${this.res(r as ResourceId)}${v}</span>`)
              .join(" ");
            const result = t.to && t.to !== s.biome ? `wird ${BIOMES[t.to].name}` : "wächst nach";
            return `<button class="build" data-action="terraform" data-value="${k}" ${blocker ? `disabled title="${blocker}"` : ""}>
              <span class="icon">${this.ticon(k)}</span><span class="name">${t.name}</span><span class="cost">${cost}<br><small>${result}</small></span>
            </button>`;
          })
          .join("");
    let actions = "";
    if (def) {
      const info =
        s.building === "launchpad"
          ? this.renderLaunches(state, planet)
          : `<p class="muted">${def.description}</p>${this.renderPower(state, planet, s)}${s.building === "market" ? this.renderMarket(state, planet) : ""}`;
      const next = nextUpgrade(s);
      let upgrade = "";
      if (next) {
        const blocker = upgradeBlocker(state, planet, s);
        const locked = economy.ascension.level < next.unlockLevel;
        const cost = Object.entries(next.cost)
          .map(([r, v]) => `<span class="${economy.resources[r as ResourceId] >= (v as number) ? "" : "short"}">${this.res(r as ResourceId)}${v}</span>`)
          .join(" ");
        const short = Object.entries(next.cost)
          .filter(([r, v]) => economy.resources[r as ResourceId] < (v as number))
          .map(([r]) => RESOURCES[r as ResourceId].name);
        const missing = !locked && short.length ? `<br>Fehlt: ${short.join(", ")}` : "";
        upgrade = `<button class="build" data-action="upgrade" ${blocker ? "disabled" : ""} title="${blocker ?? ""}"><span class="icon">${locked ? "🔒" : "⬆️"}</span><span class="name">${next.name ? `Ausbauen zu ${next.name}` : `Ausbauen auf Stufe ${(s.tier ?? 1) + 1}`}</span><span class="cost">${locked ? `Stufe ${next.unlockLevel}` : cost}${missing}</span></button>`;
      }
      actions = `${info}${upgrade}<button class="wide danger" data-action="demolish">Abreißen (50 % zurück)</button>`;
    } else if (biome.buildable) {
      const buildable = BUILDING_IDS.filter((b) => BUILDINGS[b].allowedBiomes.includes(s.biome));
      const tabs: (BuildingCategory | "terrain")[] = [...(terraforms ? ["terrain" as const] : []), ...BUILDING_CATEGORY_IDS.filter((c) => buildable.some((b) => BUILDINGS[b].category === c))];
      const tab = tabs.includes(this.buildTab) ? this.buildTab : tabs.find((t) => t !== "terrain") ?? tabs[0];
      const tabBar = tabs
        .map((t) => {
          const { icon, name } = t === "terrain" ? { icon: "🌱", name: "Gelände" } : BUILDING_CATEGORIES[t];
          // A dot marks tabs with something that can be built right now.
          const ready = t !== "terrain" && buildable.some((b) => BUILDINGS[b].category === t && !buildBlocker(state, planet, s, b));
          return `<button class="tab${t === tab ? " on" : ""}" data-action="buildTab" data-value="${t}" title="${name}" aria-label="${name}">${icon}${ready ? `<i class="dot"></i>` : ""}</button>`;
        })
        .join("");
      const items = tab === "terrain"
        ? terraforms
        : buildable
            .filter((b) => BUILDINGS[b].category === tab)
            .map((b) => {
          const bd = BUILDINGS[b];
          const blocker = buildBlocker(state, planet, s, b);
          const locked = economy.ascension.level < bd.unlockLevel;
          const cost = Object.entries(bd.cost)
            .map(([r, v]) => `<span class="${economy.resources[r as ResourceId] >= (v as number) ? "" : "short"}">${this.res(r as ResourceId)}${v}</span>`)
            .join(" ");
          // Missing resources only: offer to queue the build instead of greying it out.
          const queueable = blocker === NOT_AFFORDABLE && !queued;
          return `<button class="build" data-action="${queueable ? "enqueue" : "build"}" data-value="${b}" ${blocker && !queueable ? "disabled" : ""} title="${blocker && !queueable && !locked ? `${blocker}. ` : ""}${bd.description}">
              <span class="icon">${locked ? "🔒" : this.bicon(b)}</span><span class="name">${bd.name}</span><span class="cost">${locked ? `Stufe ${bd.unlockLevel}` : cost}${queueable ? "<br>⏳ einplanen" : ""}</span>
            </button>`;
        })
        .join("");
      const tabName = tab === "terrain" ? "Gelände" : tab ? BUILDING_CATEGORIES[tab].name : "";
      actions = `<div class="tabs">${tabBar}</div><p class="tab-name">${tabName}</p><div class="builds">${items}</div>`;
    } else {
      actions = `<p class="muted">Hier kann man nicht bauen, aber Einwohner können sammeln.</p>${terraforms ? `<div class="builds">${terraforms}</div>` : ""}`;
    }

    return `<h2>${title}</h2>${deposits}${recipes}${workers}${queuedNote}${actions}${hint}`;
  }
}

/** Power values: whole numbers stay whole, the rest gets one decimal. */
function fmt(v: number): string {
  return Number.isInteger(Math.round(v * 10) / 10) ? String(Math.round(v)) : v.toFixed(1);
}

interface HudHtml {
  chips: string;
  controls: string;
  rest: string;
}
const NO_HUD: HudHtml = { chips: "", controls: "", rest: "" };

function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} missing`);
  return node;
}
