import { buildingInfoHtml } from "./buildingInfo";
import {
  adjacencyMultiplier,
  BIOMES,
  buildBlocker,
  cleanPlanetName,
  PLANET_NAME_MAX,
  renameBlocker,
  BUILDING_CATEGORIES,
  BUILDING_CATEGORY_IDS,
  BUILDING_IDS,
  BUILDINGS,
  systemOf,
  WARP,
  type BuildingCategory,
  GEMS,
  cycleOf,
  housing,
  discoveryCost,
  needsSuits,
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
  MISSILES,
  type RocketId,
  empActive,
  missileDefenseLeft,
  planetDefense,
  planetIntercept,
  planetShield,
  radarIn,
  population,
  workerCount,
  economyOf,
  economyThreshold,
  ascensionIncome,
  ascensionPerCycle,
  type EconomyState,
  RESOURCE_IDS,
  INVADERS,
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
  thawBlocker,
  CRYO,
  toolFactor,
  ticksPerCycle,
  workerCapacity,
  buildCost,
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
  attitudeLabel,
  bundleSize,
  factionById,
  factionEconomy,
  factionOfEconomy,
  PEOPLES,
  PERSONALITY_NAMES,
  sellable,
  STANCE_NAMES,
  VOTE_NAMES,
  voters,
  strength,
  TEAM_ECONOMY,
  tradeQuote,
  type FactionState,
  CORE,
  coreAccessBlocker,
  coreHazard,
  coreOf,
  coreWorkers,
  drillProgress,
  planetById,
  shaftOpen,
  surfaceOf,
} from "../sim";
import { currentHint } from "./hints";
import { artTexture, buildingArt, buildingIconUrl, resourceIconUrl } from "../render/art";
import { sfx } from "../audio/sfx";

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
  /** Factions panel open, and the faction whose trade list is unfolded. */
  private showFactions = false;
  private tradeWith: string | null = null;
  /** Full resource list open under the top bar. */
  private showResources = false;
  private showAscension = false;
  /** Planet list under the top bar, and how it groups the planets. */
  private showPlanets = false;
  private planetGroups: "founder" | "system" = "founder";
  /** Resources that just ran out on a field, until when their "!" shows. */
  private readonly depleted = new Map<ResourceId, number>();
  /** Open tab of the build menu; kept while the player taps from field to field. */
  private buildTab: BuildingCategory | "terrain" = "housing";
  /** Star map open, and the planet (or "sun") picked on it. */
  private mapOpen = false;
  /** Read by the star map to highlight the same planet. */
  mapTarget: string | null = null;
  /** Sun system shown on the star map: 0 = home, 1 … = neighbor systems, -1 = the galaxy. */
  mapSystem = 0;

  /** A planet or the sun was tapped on the star map. */
  selectMapTarget(id: string): void {
    this.mapTarget = id;
    this.lastPanel = "";
  }

  /** Shows another sun system (or the galaxy, -1) on the star map. */
  private selectSystem(system: number): void {
    this.mapSystem = system;
    this.mapTarget = system === -1 || !this.state?.systems ? null : this.mapTarget;
    this.lastPanel = "";
  }

  private dicon(id: string): string {
    // Late discoveries may not have art yet: fall back to the scroll.
    return this.art ? `<img class="bi" src="assets/sprites/discoveries/${id}.png" alt="" onerror="this.replaceWith('📜')">` : "📜";
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
  private ticon(kind: TerraformKind, emoji = TERRAFORM[kind].icon, irradiated = false): string {
    if (this.art && kind === "clearScorched" && irradiated && artTexture("ui.icon-clear-irradiated")) return `<img class="bi" src="assets/sprites/ui/icon-clear-irradiated.png" alt="${emoji}">`;
    return this.art && kind === "clearScorched" && artTexture("ui.icon-clear-scorched") ? `<img class="bi" src="assets/sprites/ui/icon-clear-scorched.png" alt="${emoji}">` : emoji;
  }

  /** UI icon from the art (ui.<name>) once Codex drew it, else the emoji. */
  private uicon(name: string, emoji: string): string {
    return this.art && artTexture(`ui.${name}`) ? `<img class="ri" src="assets/sprites/ui/${name}.png" alt="${emoji}">` : emoji;
  }

  private bicon(building: BuildingId): string {
    return this.art && buildingArt(building) ? `<img class="bi" src="${buildingIconUrl(building)}" alt="${BUILDINGS[building].icon}">` : BUILDINGS[building].icon;
  }

  /** Small ⓘ in the corner of a build button: tapping it shows what the building does. */
  private infoBadge(building: BuildingId): string {
    return `<span class="info" data-info="${building}" role="button" aria-label="Was macht ${BUILDINGS[building].name}?">i</span>`;
  }

  /** Card over the game with everything a building does, made from its data (buildingInfo.ts). */
  private showBuildingInfo(building: BuildingId): void {
    document.querySelector(".binfo")?.remove();
    sfx.play("ui.open");
    const node = document.createElement("div");
    node.className = "binfo";
    node.innerHTML = `<div class="binfo-card">${buildingInfoHtml(building, (r) => this.res(r), this.bicon(building))}<button class="wide" data-close>OK</button></div>`;
    // Tap anywhere outside the card (or OK) to close.
    node.addEventListener("pointerup", (e) => {
      if (e.target === node || (e.target as HTMLElement).closest("[data-close]")) node.remove();
    });
    document.body.appendChild(node);
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
    this.celebrateShield(state);
    const planet = planetById(state, this.planetId);
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
          // Faction births are their business.
          if (this.state?.players.find((p) => p.id === e.playerId)?.ai) break;
          this.toast(`👶 Neuer Einwohner${e.playerId === this.playerId ? "" : ` bei ${this.state?.players.find((p) => p.id === e.playerId)?.name ?? "Mitspieler"}`}`);
          break;
        case "levelUp": {
          const unlocked = BUILDING_IDS.filter((b) => BUILDINGS[b].unlockLevel === e.level).map((b) => `${BUILDINGS[b].icon} ${BUILDINGS[b].name}`);
          this.toast(`⭐ Aufstieg auf Stufe ${e.level}!${unlocked.length ? ` Neu: ${unlocked.join(", ")}` : ""}`, "good");
          break;
        }
        case "depleted":
          // No toast (too big on phones): a "!" on the resource in the top bar for a minute.
          this.depleted.set(e.resource, performance.now() + DEPLETED_MARK_MS);
          break;
        case "thawed":
          if (this.isMine(e.planetId)) this.toast(`🧊 ${e.count} ${PEOPLES[e.people].name} aufgetaut! Sie wohnen jetzt auf ${this.planetName(e.planetId)}.`, "good");
          break;
        case "coreOpened":
          if (this.isMine(e.planetId)) this.toast(`🕳️ Durchbruch! Die Kernbohrung auf ${this.planetName(e.planetId)} hat das Planeteninnere erreicht. Tippe auf ⬇ Inneres.`, "good");
          break;
        case "quake":
          if (this.isMine(e.planetId)) this.toast(`💥 Beben im Inneren von ${this.planetName(e.planetId)}: ein Arbeiter ist verschüttet, sein Tiefenanzug ist verloren. Stützpfeiler helfen.`, "bad");
          break;
        case "eruption":
          if (this.isMine(e.planetId)) {
            const what = e.building ? `${BUILDINGS[e.building].name} ${e.wrecked ? "zerstört" : "beschädigt"}` : "";
            this.toast(`🌋 Magmaausbruch im Inneren von ${this.planetName(e.planetId)}${what ? `: ${what}` : ""}${e.killed ? ", ein Arbeiter ist umgekommen" : ""}.`, "bad");
          }
          break;
        case "suffocated":
          if (this.isMine(e.planetId)) this.toast(`🧑‍🚀 Keine Raumanzüge mehr: ein Siedler auf ${this.planetName(e.planetId)} ist erstickt. Eine Werkstatt (Stufe 2) näht neue.`, "bad");
          break;
        case "starving":
          this.toast("🍂 Hunger! Ohne Nahrung arbeiten alle nur halb so schnell, nur Nahrung sammeln geht voll weiter.", "bad");
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
          const def = ROCKETS[e.rocket];
          const friendly = this.state?.players.find((p) => p.id === e.playerId)?.economyId === this.myEconomy(this.state!)?.id;
          if (e.playerId === this.playerId) this.toast(`${def.icon} ${def.unmanned ? def.name : "Rakete"} nach ${to} gestartet`);
          else if (friendly || !this.isMine(e.to)) break;
          else if (def.unmanned) {
            // Missiles come unseen; only a manned radar in the system reports the launch.
            const target = this.state?.planets.find((p) => p.id === e.to);
            if (target && radarIn(this.state!, target.economyId, systemOf(target))) this.toast(`📡 Radar: ${def.icon} ${def.name} von ${this.playerName(e.playerId)} auf ${to}! Einschlag in ${this.secondsUntil(e.arrivalTick)} s`, "bad");
          } else this.toast(`⚠️ ${this.playerName(e.playerId)} greift ${to} an! Alle Einwohner verteidigen, freie am besten.`, "bad");
          break;
        }
        case "landed":
          if (e.playerId === this.playerId) this.toast(e.colonized ? `🚩 Kolonie auf ${this.planetName(e.planetId)} gegründet. Umbenennen kannst du sie in der 🪐-Liste.` : `🚀 ${e.count} Einwohner auf ${this.planetName(e.planetId)} gelandet`, "good");
          break;
        case "renamed":
          if (e.playerId !== this.playerId && this.isMine(e.planetId)) this.toast(`✏️ ${this.playerName(e.playerId)} hat ${e.from} in ${e.name} umbenannt`);
          break;
        case "battle": {
          const where = this.planetName(e.planetId);
          if (e.attacker === this.playerId) {
            this.toast(e.won ? `⚔️ ${where} erobert! ${e.captured} Gefangene` : `⚔️ Angriff auf ${where} gescheitert`, e.won ? "good" : "bad");
          } else if (e.defender === this.playerId) {
            const trapped = e.intercepted ? ` (${e.intercepted} schon beim Landen)` : "";
            this.toast(e.won ? `💥 ${where} ist verloren` : `🛡️ ${where} gehalten, ${e.attackerLosses} Angreifer besiegt${trapped}`, e.won ? "bad" : "good");
          }
          break;
        }
        case "missileHit":
          this.missileToast(e);
          break;
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
          this.showLoot(e.target, e.wave, e.loot);
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
          // The celebration comes from the state (sun.saved), so every client sees it, also when
          // the server state already had the shell closed and no event played here.
          break;
        case "gameOver":
          this.toast(this.resultText(e.result), "supernova" in e.result ? "bad" : "good");
          break;
        case "upgraded":
          if (e.playerId === this.playerId) this.toast(`⬆️ ${BUILDINGS[e.building].name} auf Stufe ${e.tier} ausgebaut`, "good");
          break;
        case "factionOffer": {
          const name = this.factionName(e.faction);
          const text =
            e.kind === "ultimatum"
              ? `${name} fordern ${e.amount} ${RESOURCES[e.resource!].name}, sonst Krieg!`
              : e.kind === "alliance"
                ? `${name} schlagen ein Bündnis vor`
                : e.kind === "peace"
                  ? `${name} bieten Frieden an`
                  : `${name} wollen sich deinem Volk anschließen`;
          this.toast(`💬 ${text} (🏳️ Fraktionen)`, e.kind === "ultimatum" ? "bad" : "good");
          break;
        }
        case "factionStance": {
          const name = this.factionName(e.faction);
          if (e.stance === "war") this.toast(`⚔️ Krieg mit ${name}!${e.reason === "attacked" ? " Dein Angriff hat sie verfeindet." : e.reason === "ultimatumRefused" ? " Das Ultimatum ist abgelehnt." : ""}`, "bad");
          else if (e.stance === "peace") this.toast(e.reason === "brokenAlliance" ? `💔 ${name} kündigen das Bündnis` : `🕊️ Frieden mit ${name}`, e.reason === "brokenAlliance" ? "warn" : "good");
          else if (e.stance === "allied") this.toast(`🤝 Bündnis mit ${name}`, "good");
          break;
        }
        case "factionVote":
          if (e.playerId !== this.playerId) this.toast(`🗳️ ${this.playerName(e.playerId)} stimmt ${e.yes ? "für" : "gegen"} „${VOTE_NAMES[e.action]}“ (${this.factionName(e.faction)})`);
          break;
        case "factionVoteResult":
          if (!e.passed) this.toast(`🗳️ Keine Mehrheit für „${VOTE_NAMES[e.action]}“ (${this.factionName(e.faction)})`, "warn");
          break;
        case "factionDeclined":
          this.toast(`🙅 ${this.factionName(e.faction)} lehnen ${e.action === "peace" ? "Frieden" : e.action === "alliance" ? "das Bündnis" : "den Zusammenschluss"} ab`, "warn");
          break;
        case "factionTrade":
          if (e.playerId === this.playerId) this.toast(`⚖️ ${e.gotAmount} ${RESOURCES[e.got].name} für ${e.gaveAmount} ${RESOURCES[e.gave].name} von ${this.factionName(e.faction)}`, "good");
          break;
        case "factionGift":
          if (e.from === e.faction) this.toast(`🎁 ${this.factionName(e.faction)} schenken dir ${e.amount} ${RESOURCES[e.resource].name}`, "good");
          break;
        case "factionMerged":
          this.toast(`🫂 ${this.factionName(e.faction)} gehören jetzt zu deinem Volk: ${e.units} Einwohner, ${e.planets} Planet${e.planets === 1 ? "" : "en"}`, "good");
          break;
        case "factionEliminated":
          this.toast(`💀 ${this.factionName(e.faction)} sind ausgelöscht`, "warn");
          break;
        case "systemsFound":
          this.toast(`🌀 Das Warptor ortet ${e.count} Nachbarsysteme, ${e.inhabited === 1 ? "eins davon ist" : `${e.inhabited} davon sind`} bewohnt. Öffne die Karte → 🌌 Galaxie.`, "good");
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

  /** Game whose closed shell was already celebrated in this session (by seed). */
  private shieldSeen = "";

  /**
   * Coop goal reached: a big popup with a fanfare once per game and device. Driven by
   * state.sun.saved instead of the shieldComplete event, which a client misses when another
   * player's server reply already contains the last segment.
   */
  private celebrateShield(state: GameState): void {
    if (!state.sun.saved || this.shieldSeen === state.seed) return;
    this.shieldSeen = state.seed;
    const key = `planetforge.shieldParty.${state.seed}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // No storage (private mode): celebrate once per session instead.
    }
    const players = state.players.map((p) => p.name).join(", ");
    this.popup(
      this.heroArt("popup-system-saved", "🌞"),
      "System gerettet!",
      `<p>Die Schutzhülle um die Sonne ist geschlossen. Die Supernova ist abgewendet.</p><p class="muted">Geschafft im ${cycleOf(state) + 1}. Planetenumlauf${players ? ` von ${players}` : ""}.</p><p class="muted">Ihr könnt weiterspielen. Haltet die Hülle heil, Invasoren können sie noch beschädigen.</p>`,
      28,
    );
    sfx.play("victory.fanfare");
  }

  /** Mothership destroyed: what the wreck gave the team. Older servers send no loot, then it is computed. */
  private showLoot(target: string, wave: number, loot?: Partial<Record<ResourceId, number>>): void {
    const items = Object.entries(loot ?? Object.fromEntries(Object.entries(INVADERS.reward).map(([r, v]) => [r, v * wave]))) as [ResourceId, number][];
    const list = items.map(([r, n]) => `<span class="loot-item">${this.res(r)} +${n} <small>${RESOURCES[r].name}</small></span>`).join("");
    this.popup(this.heroArt("popup-loot", "🏆"), "Mutterschiff zerstört!", `<p>Die Invasoren über ${this.targetName(target)} sind besiegt (Welle ${wave}). Aus dem Wrack geborgen:</p><div class="loot">${list}</div>`, 14);
  }

  /** Codex picture on top of a popup, the spinning emoji until the art is loaded. */
  private heroArt(name: "popup-system-saved" | "popup-loot", emoji: string): string {
    return this.art && artTexture(`ui.${name}`) ? `<img class="celebration-art" src="assets/sprites/ui/${name}.png" alt="">` : `<div class="celebration-sun">${emoji}</div>`;
  }

  /** Big popup over the game (goal reached, invaders beaten) with a little confetti. */
  private popup(icon: string, title: string, body: string, confettiCount: number): void {
    const node = document.createElement("div");
    node.className = "celebration";
    const confetti = Array.from({ length: confettiCount }, (_, i) => `<i style="--x:${(i * 37) % 100}vw;--d:${(i % 7) * 0.35}s;--h:${(i * 53) % 360}"></i>`).join("");
    node.innerHTML = `${confetti}<div class="celebration-card">${icon}<h2>${title}</h2>${body}<button class="wide" data-close>Weiterspielen</button></div>`;
    node.querySelector("[data-close]")!.addEventListener("click", () => node.remove());
    document.body.appendChild(node);
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

  get mapIsOpen(): boolean {
    return this.mapOpen;
  }

  /** Keyboard shortcut: does what tapping this button (or the first one matching) would. False if there is none. */
  press(target: string | HTMLElement): boolean {
    const el = typeof target === "string" ? this.hud.querySelector<HTMLElement>(target) ?? this.panel.querySelector<HTMLElement>(target) : target;
    if (!el) return false;
    if (el.hasAttribute("disabled")) {
      sfx.play("ui.error");
      return true;
    }
    this.onAction({ target: el } as unknown as Event);
    if (this.state) this.render(this.state);
    return true;
  }

  /** Esc: closes the star map, discoveries, factions or the lists under the top bar. False if none was open. */
  closeOverlay(): boolean {
    const info = document.querySelector(".binfo");
    if (info) {
      info.remove();
      return true;
    }
    if (this.mapOpen) return this.press(`[data-action="map"]`);
    if (this.showDiscoveries || this.showFactions) {
      this.showDiscoveries = this.showFactions = false;
      this.lastPanel = "";
    } else if (this.showAscension || this.showResources || this.showPlanets) {
      this.showAscension = this.showResources = this.showPlanets = false;
      this.lastHud = NO_HUD;
    } else return false;
    if (this.state) this.render(this.state);
    return true;
  }

  private onAction(e: Event): void {
    // The ⓘ on a build button only explains the building, it never builds (works on greyed-out ones too).
    const info = (e.target as HTMLElement).closest<HTMLElement>("[data-info]");
    if (info) {
      this.showBuildingInfo(info.dataset.info as BuildingId);
      return;
    }
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
      case "thaw":
        this.actions.send({ type: "thaw", ...at });
        break;
      case "terraform":
        this.actions.send({ type: "terraform", ...at, kind: value as TerraformKind });
        break;
      case "launch": {
        const [to, rocket, count, from] = value!.split(":");
        this.actions.send({ type: "launch", planetId: from || this.planetId, to: to!, rocket: rocket as RocketId, count: Number(count) });
        break;
      }
      case "missile": {
        const [from, to, rocket, segment] = value!.split(":");
        this.actions.send({ type: "launch", planetId: from!, to: to!, rocket: rocket as RocketId, count: 0, ...(segment ? { segment: Number(segment) } : {}) });
        break;
      }
      case "interior":
      case "surface": {
        // Down into the planet and back up (CORE).
        const state = this.state;
        const planet = state && planetById(state, this.planetId);
        if (!state || !planet) break;
        const to = action === "interior" ? coreOf(state, planet) : surfaceOf(state, planet);
        if (to && to.id !== planet.id) this.actions.showPlanet(to.id);
        break;
      }
      case "planet": {
        // In the order of the planet list, so ▸ walks it from top to bottom.
        const own = this.planetGroupsOf(this.state!).flatMap((g) => g.planets);
        const next = own[(own.findIndex((p) => p.id === this.planetId) + 1) % own.length];
        if (next) this.actions.showPlanet(next.id);
        break;
      }
      case "planets":
        this.showPlanets = !this.showPlanets;
        this.showAscension = this.showResources = false;
        break;
      case "planetGroups":
        this.planetGroups = value as "founder" | "system";
        break;
      case "gotoPlanet":
        this.showPlanets = false;
        if (this.mapOpen) this.press(`[data-action="map"]`);
        this.actions.showPlanet(value!);
        break;
      case "rename":
        this.askPlanetName(value!);
        break;
      case "draw": {
        const me = this.state?.players.find((p) => p.id === this.playerId);
        this.actions.send({ type: "offerDraw", offer: !me?.offersDraw });
        break;
      }
      case "buildTab":
        this.buildTab = value as BuildingCategory | "terrain";
        this.lastPanel = "";
        break;
      case "resources":
        this.showResources = !this.showResources;
        this.showAscension = this.showPlanets = false;
        break;
      case "ascension":
        this.showAscension = !this.showAscension;
        this.showResources = this.showPlanets = false;
        break;
      case "discoveries":
        this.showDiscoveries = !this.showDiscoveries;
        this.lastPanel = "";
        break;
      case "vote":
        this.actions.send({ type: "voteDiscovery", discovery: value! });
        break;
      case "factions":
        this.showFactions = !this.showFactions;
        this.showDiscoveries = false;
        this.lastPanel = "";
        break;
      case "tradeWith":
        this.tradeWith = this.tradeWith === value ? null : value!;
        this.lastPanel = "";
        break;
      case "factionTrade": {
        const [faction, resource, amount] = value!.split(":");
        this.actions.send({ type: "factionTrade", faction: faction!, resource: resource as ResourceId, amount: Number(amount) });
        break;
      }
      case "gift": {
        const [faction, resource, amount] = value!.split(":");
        this.actions.send({ type: "gift", faction: faction!, resource: resource as ResourceId, amount: Number(amount) });
        break;
      }
      case "diplomacy": {
        const [faction, action] = value!.split(":") as [string, "war" | "peace" | "alliance" | "merge"];
        if (action === "war" && !confirm(this.state && voters(this.state).length > 1 ? `Abstimmung über Krieg mit ${this.factionName(faction)} starten?` : `Wirklich ${this.factionName(faction)} den Krieg erklären?`)) break;
        this.actions.send({ type: "diplomacy", faction, action });
        break;
      }
      case "answerOffer": {
        const [faction, accept] = value!.split(":");
        this.actions.send({ type: "answerOffer", faction: faction!, accept: accept === "1" });
        break;
      }
      case "voteDiplomacy": {
        const [faction, yes] = value!.split(":");
        this.actions.send({ type: "voteDiplomacy", faction: faction!, yes: yes === "1" });
        break;
      }
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
        this.showFactions = false;
        this.lastPanel = "";
        this.lastHud = NO_HUD;
        this.actions.showMap(this.mapOpen);
        break;
      case "mapTarget": {
        // A planet picked from a list may lie in another system: show that one.
        const planet = this.state?.planets.find((p) => p.id === value);
        if (planet && systemOf(planet) !== this.mapSystem) this.mapSystem = systemOf(planet);
        this.selectMapTarget(value!);
        this.actions.showMap(true);
        break;
      }
      case "system":
        this.selectSystem(Number(value));
        this.actions.showMap(true);
        break;
      case "view":
        this.mapOpen = false;
        this.showFactions = false;
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
    const now = performance.now();
    for (const [r, until] of this.depleted) if (until <= now) this.depleted.delete(r);
    const shown = RESOURCE_IDS.filter((r) => r === "food" || r === "wood" || economy.resources[r] >= 1 || this.depleted.has(r));
    const mark = (r: ResourceId) => (this.depleted.has(r) ? `<b class="alert">!</b>` : "");
    const markTitle = (r: ResourceId) =>
      this.depleted.has(r) ? `. Auf einem Feld aufgebraucht${r === "wood" ? ", Tipp: Bäume pflanzen (🌱) oder ein Förster lässt ihn nachwachsen" : ""}` : "";
    const chip = (r: ResourceId) => `<span class="chip${r === "food" && economy.starving ? " bad" : ""}" title="${RESOURCES[r].name}: ${Math.floor(economy.resources[r])}${markTitle(r)}">${this.res(r)} ${short(economy.resources[r])}${mark(r)}</span>`;
    // Only the key resources stay in the bar; the rest open as a list with a tap on "+n".
    const key = shown.filter((r) => KEY_RESOURCES.has(r));
    const more = shown.length - key.length;
    const chips = key.map(chip).join("");
    const moreButton =
      (more > 0 ? `<button class="chip more${this.showResources ? " on" : ""}" data-action="resources" title="Alle Rohstoffe">+${more}${shown.some((r) => !KEY_RESOURCES.has(r) && this.depleted.has(r)) ? `<b class="alert">!</b>` : ""} ${this.showResources ? "▴" : "▾"}</button>` : "");
    const list = this.showResources && more > 0
      ? `<div class="res-list">${shown.map((r) => `<span class="res-item${r === "food" && economy.starving ? " bad" : ""}">${this.res(r)} <span class="res-name" title="${markTitle(r).slice(2)}">${RESOURCES[r].name}${mark(r)}</span> <b>${Math.floor(economy.resources[r])}</b></span>`).join("")}</div>`
      : "";
    const ascension = economy.ascension;
    const lvl = ascension.level;
    const prev = lvl === 0 ? 0 : (economyThreshold(state, economy, lvl - 1) ?? 0);
    const next = economyThreshold(state, economy, lvl);
    const progress = next === null ? 1 : (ascension.points - prev) / (next - prev);
    const cycleProgress = (state.tick % ticksPerCycle(state)) / ticksPerCycle(state);
    // Pause plus one 1×/3× toggle instead of three buttons, to keep the bar to one line on phones.
    const paused = this.speed === 0;
    const pace = paused ? this.lastSpeed : this.speed;
    const speeds =
      `<button class="speed${paused ? " on" : ""}" data-action="speed" data-value="${paused ? pace : 0}" title="${paused ? "Weiter" : "Pause"}">${paused ? "▶" : "⏸"}</button>` +
      `<button class="speed${pace === 3 ? " on" : ""}" data-action="speed" data-value="${pace === 3 ? 1 : 3}" title="Tempo">${pace}×</button>`;
    // Same order as the 🪐 list and ▸. Inside a planet (CORE) the chip names the planet around it.
    const own = this.planetGroupsOf(state).flatMap((g) => g.planets);
    const surface = surfaceOf(state, planet);
    const inside = planet.coreOf !== undefined;
    const at = own.findIndex((p) => p.id === surface.id);
    const listChip = `<button class="chip name${this.showPlanets ? " on" : ""}" data-action="planets" title="Alle Planeten">🪐 ${surface.name}${inside ? " <small>Inneres</small>" : ""}${at >= 0 && own.length > 1 ? ` <small>${at + 1}/${own.length}</small>` : ""} ${this.showPlanets ? "▴" : "▾"}</button>`;
    const planetChip =
      (at < 0
        ? `${listChip}${own.length ? `<button class="chip glow" data-action="home" title="Zurück zum eigenen Planeten">↩ Zurück</button>` : ""}`
        : `${listChip}${own.length > 1 && !inside ? `<button class="chip" data-action="planet" title="Nächster eigener Planet">▸</button>` : ""}`) +
      (inside
        ? `<button class="chip glow" data-action="surface" title="Zurück an die Oberfläche (I)">${this.uicon("icon-surface", "⬆")}<span class="wide"> Oberfläche</span></button>`
        : coreOf(state, planet)
          ? `<button class="chip" data-action="interior" title="Ins Planeteninnere (I)">${this.uicon("icon-interior", "⬇")}<span class="wide"> Inneres</span></button>`
          : "");
    const me = state.players.find((p) => p.id === this.playerId);
    const duel = state.settings.mode === "versus" && state.players.length > 1 && !state.result && me && !me.eliminated;
    const versusButtons = duel
      ? `<button class="speed${me.offersDraw ? " on" : ""}" data-action="draw" title="Unentschieden anbieten">🤝</button><button class="speed" data-action="surrender" title="Aufgeben">🏳️</button>`
      : "";
    const controls = `${moreButton}${speeds}<button class="speed" id="menu-button" data-action="menu" title="Menü und Speichern" aria-label="Menü und Speichern">☰</button>`;
    const rest = `
      <div class="row status main">
        ${planetChip}
        <button class="chip${this.mapOpen ? " on" : ""}" data-action="map" title="${this.mapOpen ? "Zurück zum Planeten" : "Sternkarte"}">${this.mapOpen ? "🪐" : "🌌"}</button>
        ${inside
          ? `<span class="chip" title="Arbeiter im Inneren / Tiefenanzüge">${this.res("deep-suit")} ${planet.economyId ? coreWorkers(state, planet.economyId).length : 0}/${Math.floor(economy.resources["deep-suit"])} <small>${idleUnits(state, surface, this.playerId).length} frei<span class="wide"> oben</span></small></span>`
          : `<span class="chip" title="Einwohner / Wohnraum, davon frei">👥 ${population(state, planet)}/${housing(state, planet)} <small>${idleUnits(state, planet, this.playerId).length} frei</small></span>`}
        ${planet.power ? `<span class="chip${planet.power.demand > planet.power.supply ? " bad" : ""}" title="Strom: erzeugt / gebraucht">⚡ ${fmt(planet.power.supply)}/${fmt(planet.power.demand)}</span>` : ""}
        <button class="level${this.showAscension ? " on" : ""}" data-action="ascension" title="Aufstieg: ${Math.floor(ascension.points)}${next ? ` / ${next}` : ""} Punkte">⭐ ${lvl}<span class="bar"><span style="width:${Math.round(Math.min(1, progress) * 100)}%"></span></span></button>
        <span class="cycle" title="Planetenumlauf ${cycleOf(state) + 1}" style="--p:${Math.round(cycleProgress * 100)}"></span>
      </div>${this.renderFlights(state, versusButtons)}${list}${this.showAscension ? this.renderAscension(state, economy) : ""}${this.showPlanets ? this.renderPlanetList(state) : ""}`;
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
    if (state.factions.length > 0) {
      const live = state.factions.filter((f) => !f.eliminated && f.stance !== "merged");
      const offers = live.filter((f) => f.offer && f.offer.expiresTick > state.tick).length;
      const war = live.some((f) => f.stance === "war");
      chips.push(`<button class="chip${offers ? " glow" : war ? " bad" : ""}" data-action="factions">🏳️ Fraktionen${offers ? ` <small>${offers} Angebot${offers === 1 ? "" : "e"}</small>` : war ? " <small>Krieg</small>" : ""}</button>`);
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
    const myEconomy = this.myEconomy(state)?.id;
    for (const f of state.flights) {
      const seconds = Math.ceil((f.arrivalTick - state.tick) / RULES.ticksPerSecond);
      const def = ROCKETS[f.rocket];
      const friendly = state.players.find((p) => p.id === f.owner)?.economyId === myEconomy;
      if (f.owner === this.playerId) chips.push(`<span class="chip">${def.icon} ${this.targetName(f.to)} <small>${def.unmanned ? (f.segment !== undefined ? `Feld ${f.segment + 1}` : "") : `${f.units.length}👤`} ${seconds} s</small></span>`);
      else if (friendly || !this.isMine(f.to)) continue;
      else if (def.unmanned) {
        const target = state.planets.find((p) => p.id === f.to);
        if (target && radarIn(state, target.economyId, systemOf(target))) chips.push(`<span class="chip bad" title="${def.name}${f.segment !== undefined ? ` auf Feld ${f.segment + 1}` : ""}">${this.uicon("badge-incoming-missile", "📡")} ${def.icon} ${this.planetName(f.to)} <small>${f.segment !== undefined ? `Feld ${f.segment + 1} ` : ""}${seconds} s</small></span>`);
      } else chips.push(`<span class="chip bad">⚠️ ${this.planetName(f.to)} <small>${f.units.length} Angreifer ${seconds} s</small></span>`);
    }
    for (const p of this.ownPlanets()) {
      if (empActive(state, p)) chips.push(`<span class="chip bad" title="EMP: kein Strom, kein Schild, keine bemannte Abwehr">${this.uicon("badge-emp", "⚡")} ${p.name} <small>${this.secondsUntil(p.empUntilTick!)} s</small></span>`);
    }
    return chips.length || versusButtons ? `<div class="row status extra">${chips.join("")}${versusButtons ? `<span class="spacer"></span>${versusButtons}` : ""}</div>` : "";
  }

  private missileToast(e: Extract<GameEvent, { type: "missileHit" }>): void {
    const def = ROCKETS[e.rocket];
    const where = this.planetName(e.planetId);
    const lost = [e.destroyed.length ? `${e.destroyed.map((b) => BUILDINGS[b].name).join(", ")} zerstört` : "", e.killed ? `${e.killed} Tote` : "", e.emp ? `Strom und Abwehr ${MISSILES.empCycles} Umläufe lahmgelegt` : ""].filter(Boolean).join(", ");
    if (e.invaderDamage !== undefined || e.defender === e.attacker) {
      if (e.attacker === this.playerId) this.toast(e.invaderDamage ? `🎯 Treffer! Das Mutterschiff verliert ${e.invaderDamage}` : `🎯 Das Mutterschiff ist schon weg`, e.invaderDamage ? "good" : "info");
    } else if (e.attacker === this.playerId) {
      this.toast(e.intercepted ? `${def.icon} ${def.name} über ${where} abgeschossen` : `${def.icon} Einschlag auf ${where}${lost ? `: ${lost}` : ""}`, e.intercepted ? "bad" : "good");
    } else if (this.isMine(e.planetId)) {
      this.toast(e.intercepted ? `🔰 ${def.name} über ${where} abgefangen!` : `${def.icon} ${def.name} schlägt auf ${where} ein${lost ? `: ${lost}` : ""}`, e.intercepted ? "good" : "bad");
    }
  }

  private resultText(result: NonNullable<GameState["result"]>): string {
    if ("draw" in result) return "🤝 Unentschieden";
    if ("supernova" in result) return "💥 Die Sonne ist zur Supernova geworden. Spiel verloren.";
    if (this.state && factionById(this.state, result.winner)) return `💀 Dein Volk ist ausgelöscht. ${this.factionName(result.winner)} beherrschen das System.`;
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
    const faction = factionOfEconomy(state, planet.economyId);
    const note = faction
      ? `Hier leben die ${faction.name} (${PERSONALITY_NAMES[faction.personality].name}, ${STANCE_NAMES[faction.stance].icon} ${STANCE_NAMES[faction.stance].name}). ${faction.stance === "war" ? "Mit einer Kampfrakete von deiner Startrampe kannst du angreifen, vom Raketensilo aus mit Raketen auf ein Feld (antippen)." : "Handeln und verhandeln kannst du unter 🏳️ Fraktionen."}`
      : "Hier hast du nichts. Mit einer Rakete von deiner Startrampe kannst du hinfliegen.";
    const s = planet.segments[this.selected];
    const missiles = planet.economyId !== null && s ? this.missileButtons(state, planet, ["homing", "emp", "nuke"], s.index) : "";
    const field = missiles ? `<p><b>Feld ${s!.index + 1}</b> <small>${s!.building ? `${this.bicon(s!.building)} ${BUILDINGS[s!.building].name}` : s!.irradiated ? "verstrahlt" : s!.scorched ? "verbrannt" : BIOMES[s!.biome].name}</small></p><div class="builds">${missiles}</div>` : "";
    return `<h2>${planet.type === "asteroid" ? "🪨" : "🪐"} ${planet.name} <small>${this.planetStatus(state, planet)}</small></h2>
      <p class="muted">${PLANET_TYPES[planet.type].name} · ${planet.segments.length} Felder${people ? ` · ${people} Einwohner` : ""}. ${note}</p>
      ${this.radarIntel(state, planet)}${field}
      <div class="row">${back}<button class="build" data-action="map">🌌 Karte</button>${faction ? `<button class="build" data-action="factions">🏳️ Fraktionen</button>` : ""}</div>`;
  }

  private factionName(id: string): string {
    return this.state ? (factionById(this.state, id)?.name ?? "Fraktion") : "Fraktion";
  }

  /** The factions panel: who lives in the system, how they feel about the team, trade and diplomacy. */
  private renderFactions(state: GameState): string {
    const me = state.players.find((p) => p.id === this.playerId);
    const team = me ? state.economies[me.economyId] : undefined;
    let html = `<h2>🏳️ Fraktionen <button class="speed" data-action="factions" title="Zurück">✕</button></h2>`;
    if (!team) return html;
    const order = [...state.factions].sort((a, b) => Number(a.eliminated || a.stance === "merged") - Number(b.eliminated || b.stance === "merged"));
    for (const f of order) html += this.renderFaction(state, f, team);
    if (voters(state).length > 1) html += `<p class="muted">Krieg, Frieden, Bündnis und Angebote entscheidet ihr per Abstimmung: Mehrheit entscheidet, spätestens am Ende des Zyklus; handeln und schenken kann jeder.</p>`;
    return html;
  }

  private renderFaction(state: GameState, f: FactionState, team: GameState["economies"][string]): string {
    const player = state.players.find((p) => p.id === f.id);
    const people = PEOPLES[player?.people ?? state.players[0]!.people];
    const icon = `${people.icon}`;
    if (f.eliminated || f.stance === "merged") {
      return `<div class="target faction"><span>${icon} <b>${f.name}</b> <small>${f.stance === "merged" ? "🫂 Gehören zu deinem Volk" : "💀 Ausgelöscht"}</small></span></div>`;
    }
    const economy = factionEconomy(state, f)!;
    const planets = state.planets.filter((p) => p.economyId === economy.id);
    const pop = Object.values(state.units).filter((u) => u.owner === f.id).length;
    const stance = STANCE_NAMES[f.stance];
    const personality = PERSONALITY_NAMES[f.personality];
    const mood = f.stance === "war" ? "" : ` · ${attitudeLabel(f.attitude)}`;
    const power = strength(state, economy.id) > strength(state, TEAM_ECONOMY) * 1.3 ? " · stärker als ihr" : strength(state, economy.id) * 1.3 < strength(state, TEAM_ECONOMY) ? " · schwächer als ihr" : "";
    let html = `<div class="target faction"><span>${icon} <b>${f.name}</b> <small>${personality.icon} ${personality.name} · ${stance.icon} ${stance.name}${mood} · ⭐ ${economy.ascension.level} · ${planets.length} Planet${planets.length === 1 ? "" : "en"} · ${pop} Einwohner${power}</small></span>${planets[0] ? `<button class="build" data-action="view" data-value="${planets[0].id}">🔍 Ansehen</button>` : ""}</div>`;

    const offer = f.offer && f.offer.expiresTick > state.tick ? f.offer : null;
    if (offer) {
      const text =
        offer.kind === "ultimatum"
          ? `fordern ${offer.amount} ${this.res(offer.resource!)} ${RESOURCES[offer.resource!].name}, sonst erklären sie den Krieg.`
          : offer.kind === "alliance"
            ? "schlagen ein Bündnis vor: kein Krieg, ab und zu ein Geschenk, bessere Preise."
            : offer.kind === "peace"
              ? "bieten Frieden an."
              : "wollen sich deinem Volk anschließen: ihre Planeten, Einwohner und Vorräte werden deine.";
      html += `<p class="offer">💬 ${f.name} ${text} <small>Noch ${this.secondsUntil(offer.expiresTick)} s</small></p>`;
      if (!f.vote) html += `<div class="choices"><button class="chip glow" data-action="answerOffer" data-value="${f.id}:1">✅ Annehmen</button><button class="chip" data-action="answerOffer" data-value="${f.id}:0">❌ Ablehnen</button></div>`;
    }

    if (f.vote) {
      const members = voters(state);
      const yes = members.filter((p) => f.vote!.votes[p.id] === true).length;
      const no = members.filter((p) => f.vote!.votes[p.id] === false).length;
      const mine = f.vote.votes[this.playerId];
      const open = members.filter((p) => f.vote!.votes[p.id] === undefined).map((p) => p.name);
      html += `<p class="offer">🗳️ Abstimmung „${VOTE_NAMES[f.vote.action]}“: ${yes} dafür · ${no} dagegen${open.length ? ` · es fehlt ${open.join(", ")}` : ""} <small>Mehrheit entscheidet, spätestens am Zyklusende</small></p>`;
      html += `<div class="choices"><button class="chip${mine === true ? " on" : " glow"}" data-action="voteDiplomacy" data-value="${f.id}:1">👍 Dafür</button><button class="chip${mine === false ? " on" : ""}" data-action="voteDiplomacy" data-value="${f.id}:0">👎 Dagegen</button></div>`;
    }

    const chips: string[] = [];
    if (f.stance !== "war") chips.push(`<button class="chip${this.tradeWith === f.id ? " on" : ""}" data-action="tradeWith" data-value="${f.id}">⚖️ Handeln</button>`);
    if (!f.vote) {
      if (f.stance === "war") chips.push(`<button class="chip" data-action="diplomacy" data-value="${f.id}:peace">🕊️ Frieden anbieten</button>`);
      if (f.stance === "peace") chips.push(`<button class="chip" data-action="diplomacy" data-value="${f.id}:alliance">🤝 Bündnis vorschlagen</button>`);
      if (f.stance === "allied") chips.push(`<button class="chip" data-action="diplomacy" data-value="${f.id}:merge">🫂 Zusammenschluss</button>`);
      if (f.stance !== "war") chips.push(`<button class="chip bad" data-action="diplomacy" data-value="${f.id}:war">⚔️ Krieg erklären</button>`);
    }
    html += `<div class="choices">${chips.join("")}</div>`;

    if (this.tradeWith === f.id && f.stance !== "war") {
      const goods = sellable(state, f);
      const rows = goods
        .map((r) => {
          const amount = bundleSize(r);
          const quote = tradeQuote(state, f, r, amount, team);
          if (!quote) return "";
          return `<div class="target"><span>${this.res(r)} ${amount} ${RESOURCES[r].name} <small>für ${this.res(quote.give)} ${quote.giveAmount} ${RESOURCES[quote.give].name}</small></span><button class="build" data-action="factionTrade" data-value="${f.id}:${r}:${amount}" ${quote.affordable ? "" : `disabled title="Zu wenig ${RESOURCES[quote.give].name}"`}>Kaufen</button></div>`;
        })
        .join("");
      html += rows ? `<p class="muted">Sie verkaufen, was sie übrig haben${f.stance === "allied" ? "; Verbündete zahlen weniger" : ""}:</p><div class="targets">${rows}</div>` : `<p class="muted">Gerade haben sie nichts übrig.</p>`;
      const gifts = (["food", "wood", "stone", "planks", "tools", "iron"] as ResourceId[]).filter((r) => team.resources[r] >= 10);
      if (gifts.length) html += `<p class="muted">Schenken (macht sie freundlicher):</p><div class="choices">${gifts.map((r) => `<button class="chip" data-action="gift" data-value="${f.id}:${r}:10">🎁 10 ${this.res(r)}</button>`).join("")}</div>`;
    }
    return `<div class="faction-card">${html}</div>`;
  }

  private ownPlanets(): PlanetState[] {
    const state = this.state;
    const me = state?.players.find((p) => p.id === this.playerId);
    return state && me ? state.planets.filter((p) => p.economyId === me.economyId) : [];
  }

  /**
   * Own planets in groups, for the 🪐 list and ▸: by founder (own first, then teammates, then
   * conquered or joined ones), or by sun system. Start planets lead, the rest goes by name.
   */
  private planetGroupsOf(state: GameState): { title: string; planets: PlanetState[] }[] {
    const own = this.ownPlanets();
    const order = (a: PlanetState, b: PlanetState) => (b.startSlot !== null ? 1 : 0) - (a.startSlot !== null ? 1 : 0) || a.name.localeCompare(b.name, "de");
    const groups = new Map<string, { title: string; planets: PlanetState[] }>();
    const keys: string[] = [];
    const add = (key: string, title: string, planet: PlanetState) => {
      if (!groups.has(key)) groups.set(key, { title, planets: [] });
      groups.get(key)!.planets.push(planet);
    };
    if (this.planetGroups === "system") {
      keys.push("0", ...(state.systems ?? []).map((s) => String(s.index)));
      for (const p of own) add(String(systemOf(p)), this.systemLabel(state, systemOf(p)), p);
    } else {
      keys.push(this.playerId, ...state.players.map((p) => p.id), "");
      for (const p of own) {
        const founder = state.players.find((x) => x.id === p.founder);
        if (founder?.id === this.playerId) add(founder.id, "🚩 Von dir besiedelt", p);
        else if (founder && founder.economyId === p.economyId) add(founder.id, `${PEOPLES[founder.people].icon} Von ${founder.name} besiedelt`, p);
        else add("", "⚔️ Erobert oder übernommen", p);
      }
    }
    return [...new Set(keys)].flatMap((k) => (groups.has(k) ? [groups.get(k)!] : [])).map((g) => ({ ...g, planets: g.planets.sort(order) }));
  }

  /** The 🪐 list: every own planet, grouped, with people, power and danger at a glance. */
  private renderPlanetList(state: GameState): string {
    const groups = this.planetGroupsOf(state);
    const systems = new Set(this.ownPlanets().map(systemOf)).size > 1;
    const toggle = (key: "founder" | "system", label: string) => `<button class="chip${this.planetGroups === key ? " on" : ""}" data-action="planetGroups" data-value="${key}">${label}</button>`;
    const danger = new Set<string>([
      ...state.flights.filter((f) => f.owner !== this.playerId && f.to !== "sun" && this.isMine(f.to)).map((f) => f.to),
      ...(state.invasion && state.invasion.target !== "sun" ? [state.invasion.target] : []),
    ]);
    const row = (p: PlanetState) => {
      const shown = this.state && planetById(this.state, this.planetId);
      const here = p.id === this.planetId || (!!shown && p.id === shown.coreOf);
      const idle = idleUnits(state, p, this.playerId).length;
      const facts = [`👥 ${population(state, p)}/${housing(state, p)}`, idle ? `${idle} frei` : "", p.power && p.power.demand > p.power.supply ? `<span class="short">⚡ zu wenig</span>` : "", danger.has(p.id) ? `<span class="short">⚠️ Angriff</span>` : "", PLANET_TYPES[p.type].name];
      const rename = renameBlocker(state, this.playerId, p) ? "" : `<button class="speed" data-action="rename" data-value="${p.id}" title="Umbenennen">✏️</button>`;
      return `<div class="planet-row${here ? " here" : ""}"><button class="planet-go" data-action="gotoPlanet" data-value="${p.id}"><span>${p.type === "asteroid" ? "🪨" : "🪐"} <b>${p.name}</b>${here ? " ◂" : ""}</span><small>${facts.filter(Boolean).join(" · ")}</small></button>${rename}</div>`;
    };
    const lists = groups.map((g) => `<p class="group">${g.title} <small>${g.planets.length}</small></p>${g.planets.map(row).join("")}`).join("");
    return `<div class="res-list planets">
      <p><b>🪐 Deine Planeten</b> <small>${this.ownPlanets().length}</small>${systems || this.planetGroups === "system" ? ` <span class="toggle">${toggle("founder", "nach Siedler")}${toggle("system", "nach System")}</span>` : ""}</p>
      ${lists || `<p class="muted">Du hast gerade keinen Planeten.</p>`}
      <p class="muted">Umbenennen (✏️) darf nur, wer den Planeten zuerst besiedelt hat.</p>
    </div>`;
  }

  /** Small dialog for a new planet name; the sim cleans and checks it again. */
  private askPlanetName(planetId: string): void {
    const planet = this.state?.planets.find((p) => p.id === planetId);
    if (!planet) return;
    const node = document.createElement("div");
    node.className = "celebration rename";
    node.innerHTML = `<form class="celebration-card"><h2>✏️ Planet umbenennen</h2><input name="name" maxlength="${PLANET_NAME_MAX}" autocomplete="off" enterkeyhint="done"><p class="muted">Höchstens ${PLANET_NAME_MAX} Zeichen. Alle Mitspieler sehen den neuen Namen.</p><div class="row"><button type="button" class="wide secondary" data-close>Abbrechen</button><button class="wide">Umbenennen</button></div></form>`;
    const input = node.querySelector<HTMLInputElement>("input")!;
    input.value = planet.name;
    const close = () => node.remove();
    node.querySelector("[data-close]")!.addEventListener("click", close);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
    node.querySelector("form")!.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = cleanPlanetName(input.value);
      close();
      if (name && name !== planet.name) this.actions.send({ type: "renamePlanet", planetId, name });
    });
    document.body.appendChild(node);
    input.focus();
    input.select();
  }

  private isMine(planetId: string): boolean {
    const planet = this.state && planetById(this.state, planetId);
    // A planet interior is ours when its planet is.
    return !!planet && this.ownPlanets().some((p) => p.id === surfaceOf(this.state!, planet).id);
  }

  private planetName(planetId: string): string {
    const planet = this.state && planetById(this.state, planetId);
    if (!planet) return "?";
    return planet.coreOf ? `${surfaceOf(this.state!, planet).name} (Inneres)` : planet.name;
  }

  private playerName(playerId: string): string {
    return this.state?.players.find((p) => p.id === playerId)?.name ?? "Mitspieler";
  }

  /** The ⭐ panel: where the points come from and how long the next level takes. */
  private renderAscension(state: GameState, economy: EconomyState): string {
    const a = economy.ascension;
    const next = economyThreshold(state, economy, a.level);
    const income = ascensionIncome(state, economy);
    const fmt1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString("de-DE");
    const rows = [
      `<span>👥 ${income.citizens} Einwohner</span><b>+${fmt1(income.people)}</b>`,
      income.bonus ? `<span class="muted">davon Entdeckungen +${Math.round(income.bonus * 100)} %</span><span></span>` : "",
      `<span>⬆️ ${income.stages} Ausbaustufe${income.stages === 1 ? "" : "n"}</span><b>+${fmt1(income.upgrades)}</b>`,
      income.buildings ? `<span>🔔 Sondergebäude</span><b>+${fmt1(income.buildings)}</b>` : "",
    ].filter(Boolean);
    let eta = "Höchste Stufe erreicht.";
    if (next !== null) {
      const left = Math.max(0, next - a.points);
      const cycles = income.total > 0 ? Math.ceil(left / income.total) : Infinity;
      const minutes = Math.ceil((cycles * state.settings.cycleSeconds) / 60);
      const unlocked = BUILDING_IDS.filter((b) => BUILDINGS[b].unlockLevel === a.level + 1).map((b) => `${BUILDINGS[b].icon} ${BUILDINGS[b].name}`);
      eta =
        `Noch <b>${Math.ceil(left)}</b> Punkte bis Stufe ${a.level + 1}` +
        (Number.isFinite(cycles) ? `: ca. ${cycles} Uml${cycles === 1 ? "auf" : "äufe"} (≈ ${minutes} min)` : "") +
        `.${unlocked.length ? `<br>Dann neu: ${unlocked.join(", ")}` : ""}`;
    }
    return `<div class="res-list ascension">
      ${this.levelStrip(state, economy)}
      <p><b>⭐ Stufe ${a.level}</b> · ${Math.floor(a.points)}${next !== null ? ` / ${next}` : ""} Punkte</p>
      <p>Pro Umlauf: <b>+${fmt1(income.total)}</b></p>
      <div class="asc-rows">${rows.map((r) => `<div>${r}</div>`).join("")}</div>
      <p>${eta}</p>
      <p class="muted">Mehr Punkte: mehr Einwohner (jeder +${fmt1(ascensionPerCycle(state, 1, 0).people)} pro Umlauf), Gebäude ausbauen (jede Stufe +${fmt1(ascensionPerCycle(state, 0, 1).upgrades)}), Glockenturm, Monument, Kristallpalast.</p>
    </div>`;
  }

  /** Medallions for every ascension level: reached, current (glowing) and locked ones. */
  private levelStrip(state: GameState, economy: EconomyState): string {
    if (!this.art || !artTexture("ui.ascension-level")) return "";
    const level = economy.ascension.level;
    let max = level;
    while (max < 50 && economyThreshold(state, economy, max) !== null) max++;
    const medals = Array.from({ length: max }, (_, i) => {
      const n = i + 1;
      const kind = n === level ? "ascension-level-current" : n < level ? "ascension-level" : "ascension-level-locked";
      return `<span class="medal${n > level ? " locked" : ""}" title="Stufe ${n}"><img src="assets/sprites/ui/${kind}.png" alt=""><b>${n}</b></span>`;
    });
    return `<div class="level-strip">${medals.join("")}</div>`;
  }

  /** Rocket buttons from one own planet to a target (colony to free or own planets, attacks elsewhere). */
  private launchButtons(state: GameState, planet: PlanetState, to: PlanetState, from = ""): string {
    const me = state.players.find((p) => p.id === this.playerId);
    const idle = idleUnits(state, planet, this.playerId).length;
    const rockets: RocketId[] = systemOf(planet) !== systemOf(to) ? ["warp"] : to.economyId !== null && to.economyId !== me?.economyId ? ["combat", "dropship"] : ["colony", "starship"];
    return rockets
      .map((rocket) => {
        const count = Math.max(1, Math.min(rocketCapacity(economyOf(state, planet), rocket), idle));
        const plan = flightPlan(planet, to, rocket, count, economyOf(state, planet));
        const blocker = launchBlocker(state, this.playerId, planet, to, rocket, count);
        const economy = economyOf(state, planet)!;
        const cost = Object.entries(plan.cost)
          .map(([r, v]) => `<span class="${economy.resources[r as ResourceId] >= (v as number) ? "" : "short"}">${this.res(r as ResourceId)}${v}</span>`)
          .join(" ");
        const label = rocket === "combat" ? `⚔️ Angriff mit ${count}` : rocket === "dropship" ? `🛩️ Landung mit ${count}` : `${ROCKETS[rocket].icon} ${count} hinschicken`;
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
    const faction = factionOfEconomy(state, to.economyId);
    const owner = faction ? `${STANCE_NAMES[faction.stance].icon} ${faction.name}` : to.economyId === null ? "unbewohnt" : to.economyId === me?.economyId ? "eigener Planet" : `von ${this.playerName(state.players.find((p) => p.economyId === to.economyId)?.id ?? "")}`;
    return needsSuits(to) ? `${owner} · keine Atemluft, draußen braucht man Raumanzüge` : owner;
  }

  /** Buttons for missiles from own manned silos in the target's system at `to` (aimed ones at `segment`). */
  private missileButtons(state: GameState, to: PlanetState, rockets: RocketId[], segment?: number): string {
    const me = state.players.find((p) => p.id === this.playerId);
    const silos = this.ownPlanets().filter((p) => systemOf(p) === systemOf(to) && p.segments.some((x) => x.building === "missile-silo"));
    if (!me || !silos.length) return "";
    return rockets
      .map((rocket) => {
        const def = ROCKETS[rocket];
        const aimed = to.economyId !== me.economyId && (rocket === "homing" || rocket === "nuke");
        const at = aimed ? segment : undefined;
        // The first silo that can fire, else the first one (to show why not).
        const from = silos.find((p) => !launchBlocker(state, this.playerId, p, to, rocket, 0, at)) ?? silos[0]!;
        const blocker = launchBlocker(state, this.playerId, from, to, rocket, 0, at);
        const economy = economyOf(state, from)!;
        const plan = flightPlan(from, to, rocket, 0, economy);
        const cost = Object.entries(plan.cost)
          .map(([r, v]) => `<span class="${economy.resources[r as ResourceId] >= (v as number) ? "" : "short"}">${this.res(r as ResourceId)}${v}</span>`)
          .join(" ");
        const label = to.economyId === me.economyId ? `${def.icon} ${def.name} aufs Mutterschiff` : `${def.icon} ${def.name}${aimed && segment !== undefined ? ` auf Feld ${segment + 1}` : ""}`;
        return `<button class="build" data-action="missile" data-value="${from.id}:${to.id}:${rocket}:${at ?? ""}" ${blocker ? `disabled title="${blocker}"` : ""}><span class="name">${label}</span><span class="cost">${cost} · ${plan.seconds} s${from.id !== this.planetId ? ` · von ${from.name}` : ""}${blocker && blocker !== NOT_AFFORDABLE ? `<br>${blocker}` : ""}</span></button>`;
      })
      .join("");
  }

  /** Silo: what it can do, the mothership if one besieges the system, and the enemy planets in reach. */
  private renderSilo(state: GameState, planet: PlanetState, silo: PlanetState["segments"][number]): string {
    const me = state.players.find((p) => p.id === this.playerId);
    const reload = (silo.reloadUntilTick ?? 0) > state.tick ? `<p class="muted">☢️ Lädt die nächste Atomrakete: noch ${this.secondsUntil(silo.reloadUntilTick!)} s.</p>` : "";
    const inv = state.invasion;
    const besieged = inv?.sieging ? state.planets.find((p) => p.id === inv.target && p.economyId === me?.economyId && systemOf(p) === systemOf(planet)) : undefined;
    const hunt = besieged ? `<p><b>👾 Mutterschiff über ${besieged.name}</b> <small>${inv!.hp}/${inv!.maxHp}</small></p><div class="builds">${this.missileButtons(state, besieged, ["homing"])}</div>` : "";
    const enemies = this.visiblePlanets(state).filter((p) => systemOf(p) === systemOf(planet) && p.economyId !== null && p.economyId !== me?.economyId);
    const rows = enemies
      .map((to) => `<div class="target"><span>🪐 ${to.name} <small>${this.planetStatus(state, to)}</small></span>${this.missileButtons(state, to, ["emp"])}<button class="build" data-action="view" data-value="${to.id}">🔍 Ziel wählen</button></div>`)
      .join("");
    return `<p class="muted">${BUILDINGS["missile-silo"].description} Für Zielsuch- und Atomraketen: Planet ansehen und ein Feld antippen.</p>${reload}${hunt}${rows ? `<div class="targets">${rows}</div>` : `<p class="muted">Kein feindlicher Planet in diesem Sonnensystem.</p>`}`;
  }

  /** What a manned radar tells about a foreign planet's defenses. */
  private radarIntel(state: GameState, planet: PlanetState): string {
    const me = state.players.find((p) => p.id === this.playerId);
    if (!radarIn(state, me?.economyId, systemOf(planet))) return "";
    const parts = [`🛡️ Verteidigung +${planetDefense(state, planet)}`, `🕳️ fängt ${planetIntercept(state, planet)} Angreifer ab`, `🔰 ${missileDefenseLeft(state, planet)} Raketen abwehrbar`, planetShield(state, planet) ? "Schild aktiv" : "kein Schild", empActive(state, planet) ? "⚡ lahmgelegt" : ""].filter(Boolean);
    return `<p class="muted">📡 Radar: ${parts.join(" · ")}</p>`;
  }

  /** Launch pad: one row per reachable planet with the rockets that can go there. */
  private renderLaunches(state: GameState, planet: PlanetState): string {
    const idle = idleUnits(state, planet, this.playerId).length;
    const rows = this.visiblePlanets(state)
      .filter((p) => p.id !== planet.id && systemOf(p) === systemOf(planet))
      .map((to) => `<div class="target"><span>🪐 ${to.name} <small>${this.planetStatus(state, to)} · ${to.segments.length} Felder</small></span>${this.launchButtons(state, planet, to)}</div>`)
      .join("");
    return `<p class="muted">${BUILDINGS.launchpad.description} Es fliegen freie Einwohner (${idle} frei).</p><div class="targets">${rows}</div>${this.renderShield(state, planet)}`;
  }

  /** Warp gate: the free planets of the other systems, by system, with the warp ship. */
  private renderWarps(state: GameState, planet: PlanetState): string {
    const idle = idleUnits(state, planet, this.playerId).length;
    const me = state.players.find((p) => p.id === this.playerId);
    let html = `<p class="muted">${BUILDINGS.warpgate.description} Es fliegen freie Einwohner (${idle} frei).</p>`;
    for (const sys of [{ index: 0, name: "Heimatsystem" }, ...(state.systems ?? [])]) {
      if (sys.index === systemOf(planet)) continue;
      const targets = state.planets.filter((p) => systemOf(p) === sys.index && (p.economyId === null || p.economyId === me?.economyId) && (p.type !== "asteroid" || this.visiblePlanets(state).includes(p)));
      if (!targets.length) continue;
      html += `<p><b>${this.systemLabel(state, sys.index)}</b></p><div class="targets">${targets
        .map((to) => `<div class="target"><span>🪐 ${to.name} <small>${this.planetStatus(state, to)} · ${to.segments.length} Felder${this.exotics(to)}</small></span>${this.launchButtons(state, planet, to)}</div>`)
        .join("")}</div>`;
    }
    return html;
  }

  /** Name of a sun system with what it is known for. */
  private systemLabel(state: GameState, index: number): string {
    if (index === 0) return "☀️ Heimatsystem";
    const sys = state.systems?.find((s) => s.index === index);
    if (!sys) return "?";
    const faction = sys.faction ? state.factions.find((f) => f.id === sys.faction) : undefined;
    const people = faction && !faction.eliminated && faction.stance !== "merged" ? ` · ${STANCE_NAMES[faction.stance].icon} ${faction.name}` : "";
    return `✨ ${sys.name} ${sys.specialties.map((r) => this.res(r)).join("")}${people}`;
  }

  /** Exotic matter on a planet, as icons. */
  private exotics(planet: PlanetState): string {
    const found = new Set<ResourceId>();
    for (const s of planet.segments) for (const d of s.deposits) if ((WARP.specialties.flat() as ResourceId[]).includes(d.resource) && d.amount > 0) found.add(d.resource);
    return found.size ? ` · ${[...found].map((r) => this.res(r)).join("")}` : "";
  }

  /** Chips to switch the star map between the home system, the neighbor systems and the galaxy. */
  private renderSystemTabs(state: GameState): string {
    if (!state.systems) return "";
    const chip = (index: number, label: string) => `<button class="chip${this.mapSystem === index ? " on" : ""}" data-action="system" data-value="${index}">${label}</button>`;
    return `<div class="choices">${chip(-1, "🌌 Galaxie")}${chip(0, "☀️ Heimat")}${state.systems.map((s) => chip(s.index, `${s.faction ? "👽" : "✨"} ${s.name}`)).join("")}</div>`;
  }

  /** Galaxy panel: the systems, who lives there and what they hold. */
  private renderGalaxy(state: GameState): string {
    const target = this.mapTarget?.startsWith("sys:") ? Number(this.mapTarget.slice(4)) : null;
    const rows = [0, ...(state.systems ?? []).map((s) => s.index)]
      .filter((i) => target === null || i === target)
      .map((i) => {
        const planets = state.planets.filter((p) => systemOf(p) === i && p.type !== "asteroid");
        const own = planets.filter((p) => this.isMine(p.id)).length;
        return `<div class="target"><span>${this.systemLabel(state, i)} <small>${planets.length} Planeten${own ? ` · ${own} eigene` : ""}</small></span><button class="build" data-action="system" data-value="${i}">🔍 Ansehen</button></div>`;
      })
      .join("");
    const hint = target === null ? `<p class="muted">Tippe auf ein System. Hin kommt man nur mit dem Warpschiff vom Warptor. ✨ unbewohnt, 👽 ein fremdes Volk lebt dort.</p>` : "";
    return `${hint}<div class="targets">${rows}</div>`;
  }

  /** Star map panel: what was tapped, and the flights that can go there from own launch pads. */
  private renderMap(state: GameState): string {
    if (!state.systems && this.mapSystem !== 0) this.mapSystem = 0;
    const system = this.mapSystem;
    const pads = this.ownPlanets().filter((p) => hasBuilding(p, "launchpad") && systemOf(p) === system);
    const gates = this.ownPlanets().filter((p) => hasBuilding(p, "warpgate") && systemOf(p) !== system);
    const title = system === -1 ? "🌌 Galaxie" : system === 0 ? "🌌 Sternsystem" : this.systemLabel(state, system);
    let html = `<h2>${title} <button class="speed" data-action="map" title="Zurück zum Planeten">✕</button></h2>${this.renderSystemTabs(state)}`;
    if (system === -1) return html + this.renderGalaxy(state);
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
    const planet = state.planets.find((p) => p.id === target && systemOf(p) === system);
    if (!planet) {
      const list = this.visiblePlanets(state)
        .filter((p) => systemOf(p) === system)
        .map((p) => `<button class="chip" data-action="mapTarget" data-value="${p.id}">${p.type === "asteroid" ? "🪨" : "🪐"} ${p.name} <small>${this.planetStatus(state, p)}</small></button>`)
        .join("");
      return `${html}<p class="muted">Tippe auf einen Planeten${system === 0 ? " oder die Sonne" : ""}.</p><div class="choices">${list}</div>`;
    }
    const people = Object.values(state.units).filter((u) => u.planetId === planet.id).length;
    html += `<div class="target"><span>${planet.type === "asteroid" ? "🪨" : "🪐"} <b>${planet.name}</b> <small>${PLANET_TYPES[planet.type].name} · ${planet.segments.length} Felder · ${this.planetStatus(state, planet)}${people ? ` · ${people} Einwohner` : ""}${this.exotics(planet)}</small></span><button class="build" data-action="view" data-value="${planet.id}">🔍 Ansehen</button></div>`;
    // Warp ships from gates in other systems go to free or own planets.
    const mine = planet.economyId === null || this.isMine(planet.id);
    const from = [...pads.filter((p) => p.id !== planet.id), ...(mine ? gates : [])];
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
    if (this.showFactions) return this.renderFactions(state);
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
    const title = def ? `${this.bicon(s.building!)} ${def.name}${stage} <small>auf ${biome.name}</small>` : s.scorched ? (s.irradiated ? `${this.ticon("clearScorched", "☢️", true)} Verstrahlte Erde <small>${biome.name}</small>` : `${this.ticon("clearScorched", "🔥")} Verbrannte Erde <small>${biome.name}</small>`) : biome.name;

    const output = segmentOutput(planet, s, workerCount(state, planet, s.index), economy);
    const depositButton = (d: (typeof s.deposits)[number]) => {
        // Only whether something is left, not how much: players read the field, not a counter.
        const empty = !d.infinite && d.amount <= 0;
        const amount = d.infinite ? "<small>unerschöpflich</small>" : empty ? "<small>aufgebraucht</small>" : "";
        const active = output[d.resource] ? " active" : empty ? " empty" : "";
        const deep = BIOMES[s.biome].deposits.find((x) => x.resource === d.resource)?.tier;
        const tag = planet.coreOf ? `<small>Kernmine</small>` : deep ? `<small>Mine ${deep}</small>` : GEMS.ids.includes(d.resource) ? `<small>Edelsteinmine</small>` : d.resource === "platinum" ? `<small>Tiefbohrer</small>` : "";
        const selectable = !def && d.byHand;
        return `<button class="deposit${active}${selectable && s.gather === d.resource ? " on" : ""}" ${selectable ? `data-action="gather" data-value="${d.resource}"` : "disabled"}>${this.res(d.resource)} ${amount} ${tag}</button>`;
    };
    // Two layers (Seb): what grows or lies on top, and the ground below that only a mine reaches.
    const surface = s.deposits.filter((d) => d.byHand).map(depositButton).join("");
    const ground = s.deposits.filter((d) => !d.byHand).map(depositButton).join("");
    const deposits =
      (surface ? `<div class="deposits"><span class="layer">Oberfläche</span>${surface}</div>` : "") +
      (ground ? `<div class="deposits"><span class="layer">Untergrund</span>${ground}</div>` : "");

    const cap = workerCapacity(s, economy);
    const rate = Object.entries(output)
      .map(([r, v]) => `+${(v as number).toFixed(1)} ${this.res(r as ResourceId)}/s`)
      .join(" ");
    const mult = adjacencyMultiplier(planet, s);
    const workers = cap
      ? `<div class="workers">
          <button class="round" data-action="assign" data-value="-1" ${workerCount(state, planet, s.index, this.playerId) > 0 ? "" : "disabled"}>－</button>
          <span>👤 ${workerCount(state, planet, s.index)}/${cap}${workerCount(state, planet, s.index) !== workerCount(state, planet, s.index, this.playerId) ? ` <small>(${workerCount(state, planet, s.index, this.playerId)} von dir)</small>` : ""}</span>
          <button class="round" data-action="assign" data-value="1" ${workerCount(state, planet, s.index) < cap && idleUnits(state, surfaceOf(state, planet), this.playerId).length > 0 && !(planet.coreOf && coreAccessBlocker(state, planet, 1)) ? "" : "disabled"} title="${planet.coreOf ? (coreAccessBlocker(state, planet, 1) ?? "Ein freier Einwohner fährt im Tiefenanzug hinunter") : ""}">＋</button>
          <span class="rate">${rate}${mult !== 1 ? ` <small>Nachbarn ×${mult.toFixed(2)}</small>` : ""}${toolFactor(s, economy) < 1 ? ` <small>🔧 ohne Werkzeug langsamer</small>` : ""}</span>
        </div>`
      : "";
    const recipe = segmentRecipe(s);
    const recipes = def?.crafts
      ? `<div class="deposits">${def.crafts.recipes
          .map((id) => {
            const r = RECIPES[id];
            const list = (c: Partial<Record<ResourceId, number>>) => Object.entries(c).map(([k, v]) => `${v}${this.res(k as ResourceId)}`).join(" ");
            return `<button class="deposit${id === recipe ? " on" : ""}" data-action="gather" data-value="${id}" title="${r.name}">${list(r.inputs)} → ${list(r.outputs)}${r.ascension ? `${r.ascension}⭐` : ""}</button>`;
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
          : s.building === "warpgate"
            ? this.renderWarps(state, planet)
            : s.building === "missile-silo"
              ? this.renderSilo(state, planet, s)
              : `<p class="muted">${def.description}</p>${this.renderPower(state, planet, s)}`;
      const next = nextUpgrade(s);
      let upgrade = "";
      if (next) {
        const blocker = upgradeBlocker(state, planet, s);
        const locked = economy.ascension.level < next.unlockLevel;
        const cost = Object.entries(buildCost(economy, next.cost))
          .map(([r, v]) => `<span class="${economy.resources[r as ResourceId] >= (v as number) ? "" : "short"}">${this.res(r as ResourceId)}${v}</span>`)
          .join(" ");
        const short = Object.entries(buildCost(economy, next.cost))
          .filter(([r, v]) => economy.resources[r as ResourceId] < (v as number))
          .map(([r]) => RESOURCES[r as ResourceId].name);
        const missing = !locked && short.length ? `<br>Fehlt: ${short.join(", ")}` : "";
        upgrade = `<button class="build" data-action="upgrade" ${blocker ? "disabled" : ""} title="${blocker ?? ""}">${this.infoBadge(s.building!)}<span class="icon">${locked ? "🔒" : "⬆️"}</span><span class="name">${next.name ? `Ausbauen zu ${next.name}` : `Ausbauen auf Stufe ${(s.tier ?? 1) + 1}`}</span><span class="cost">${locked ? `Stufe ${next.unlockLevel}` : cost}${missing}</span></button>`;
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
          const cost = Object.entries(buildCost(economy, bd.cost))
            .map(([r, v]) => `<span class="${economy.resources[r as ResourceId] >= (v as number) ? "" : "short"}">${this.res(r as ResourceId)}${v}</span>`)
            .join(" ");
          // Missing resources only: offer to queue the build instead of greying it out.
          const queueable = blocker === NOT_AFFORDABLE && !queued;
          return `<button class="build" data-action="${queueable ? "enqueue" : "build"}" data-value="${b}" ${blocker && !queueable ? "disabled" : ""} title="${blocker && !queueable && !locked ? `${blocker}. ` : ""}${bd.description}">
              ${this.infoBadge(b)}<span class="icon">${locked ? "🔒" : this.bicon(b)}</span><span class="name">${bd.name}</span><span class="cost">${locked ? `Stufe ${bd.unlockLevel}` : cost}${queueable ? "<br>⏳ einplanen" : ""}</span>
            </button>`;
        })
        .join("");
      const tabName = tab === "terrain" ? "Gelände" : tab ? BUILDING_CATEGORIES[tab].name : "";
      actions = `<div class="tabs">${tabBar}</div><p class="tab-name">${tabName}</p><div class="builds">${items}</div>`;
    } else {
      actions = `<p class="muted">Hier kann man nicht bauen, aber Einwohner können sammeln.</p>${terraforms ? `<div class="builds">${terraforms}</div>` : ""}`;
    }

    const pod = s.cryo;
    const thawBlock = pod ? thawBlocker(state, planet, s) : null;
    const thawCost = Object.entries(CRYO.thawCost)
      .map(([r, v]) => `<span class="${economy.resources[r as ResourceId] >= (v as number) ? "" : "short"}">${this.res(r as ResourceId)}${v}</span>`)
      .join(" ");
    const cryo = pod
      ? `<p class="muted">🧊 Eine Kryokapsel: ${pod.count} eingefrorene ${PEOPLES[pod.people].icon} ${PEOPLES[pod.people].name} schlafen hier.</p><button class="build" data-action="thaw" ${thawBlock ? `disabled title="${thawBlock}"` : ""}><span class="icon">🧊</span><span class="name">Auftauen: ${pod.count} neue Einwohner</span><span class="cost">${thawCost}</span></button>`
      : "";
    return `<h2>${title}</h2>${this.renderDepths(state, planet, s)}${cryo}${deposits}${recipes}${workers}${queuedNote}${actions}${hint}`;
  }

  /** Planet interior (CORE): the drill's progress on the surface, the dangers and suits inside. */
  private renderDepths(state: GameState, planet: PlanetState, s: PlanetState["segments"][number]): string {
    if (s.building === "core-drill" && !planet.coreOf) {
      if (coreOf(state, planet)) return `<p class="power">🕳️ Durchgebrochen. <button data-action="interior">⬇ Ins Innere</button></p>`;
      const p = drillProgress(planet);
      return `<p class="power">🕳️ Bohrt in die Tiefe: ${Math.floor(p * 100)} % <span class="bar"><span style="width:${Math.round(p * 100)}%"></span></span></p>`;
    }
    if (!planet.coreOf) return "";
    const economy = economyOf(state, planet);
    const used = planet.economyId ? coreWorkers(state, planet.economyId).length : 0;
    const suits = `${this.res("deep-suit")} ${used}/${Math.floor(economy?.resources["deep-suit"] ?? 0)} Tiefenanzüge getragen`;
    const { quake, eruption } = coreHazard(planet, s);
    const risk = [quake ? `Beben ${Math.round(quake * 100)} %` : "", eruption ? `Magma ${Math.round(eruption * 100)} %` : ""].filter(Boolean).join(", ");
    const shut = shaftOpen(state, planet) ? "" : `<p class="power short">🕳️ Die Kernbohrung oben fehlt: niemand kommt hinunter, die Arbeit steht still.</p>`;
    const warn = quake >= CORE.warnFrom || eruption >= CORE.warnFrom ? " short" : "";
    return `${shut}<p class="power${warn}">${risk ? `⚠️ Gefahr je Umlauf: ${risk}. ` : ""}<small>${suits}</small></p>`;
  }
}

/** Power values: whole numbers stay whole, the rest gets one decimal. */
function fmt(v: number): string {
  return Number.isInteger(Math.round(v * 10) / 10) ? String(Math.round(v)) : v.toFixed(1);
}

const DEPLETED_MARK_MS = 60_000;

/** Bar numbers: 12 345 becomes "12k" so more chips fit on a phone. */
function short(amount: number): string {
  const n = Math.floor(amount);
  return n >= 10000 ? `${Math.floor(n / 1000)}k` : String(n);
}

/** Resources always shown in the top bar; the others sit behind "+n". */
const KEY_RESOURCES = new Set<ResourceId>(["food", "wood", "stone", "iron", "science", "fuel"]);

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
