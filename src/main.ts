import { Application } from "pixi.js";
import { homePlanet, type GameEvent } from "./sim";
import { LocalSession, type GameSession } from "./client/session";
import { clearSave, loadGame, saveGame } from "./client/save";
import { ChatPanel } from "./net/chat";
import { OnlineMenu } from "./net/menu";
import { NetworkSession } from "./net/netSession";
import { PlanetView } from "./render/planetView";
import { SystemView } from "./render/systemView";
import { sfx, type SfxId } from "./audio/sfx";
import { loadArt } from "./render/art";
import { Ui } from "./ui/ui";
import { music } from "./audio/music";
import { mountMusicControl, unlockMusicOnFirstGesture } from "./audio/musicControl";
import "./style.css";

async function boot(): Promise<void> {
  const host = document.getElementById("stage")!;
  const app = new Application();
  await app.init({
    resizeTo: host,
    background: 0x0e1022,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  host.appendChild(app.canvas);

  mountMusicControl(music);
  unlockMusicOnFirstGesture(music);

  const saved = loadGame();
  let session: GameSession = saved ? new LocalSession(saved) : LocalSession.newGame();

  const ui = new Ui({
    send(cmd) {
      const result = session.send(cmd);
      if (!result.ok) ui.toast(result.error, "warn");
      else if (result.events?.length) {
        ui.showEvents(result.events);
        view.play(result.events, session.state);
      }
      ui.render(session.state);
    },
    showPlanet,
    showMap(open) {
      view.stage.visible = !open;
      map.stage.visible = open;
      map.playerId = session.playerId;
      if (!open) map.selected = null;
      relayout();
      ui.render(session.state);
    },
    setSpeed(speed) {
      session.speed = speed;
    },
    newGame(options) {
      clearSave();
      const speed = session.speed;
      leaveOnline();
      session = LocalSession.newGame(undefined, options);
      session.speed = speed;
      showHome();
      view.select(0);
      ui.render(session.state);
    },
  });

  // What the player is looking at, for chat pins.
  const focus = { planetId: "", segment: 0 };
  function showPlanet(planetId: string): void {
    const planet = session.state.planets.find((p) => p.id === planetId);
    if (!planet) return;
    focus.planetId = planet.id;
    ui.setPlanet(planet.id);
    view.setPlanet(planet.id, planet.segments.length);
    ui.render(session.state);
  }
  const chat = new ChatPanel({
    state: () => session.state,
    focus: () => ({ ...focus }),
    jump(planetId, segment) {
      showPlanet(planetId);
      view.select(segment);
    },
    toast: (message) => ui.toast(message),
  });

  // Cloud games (coop and solo saves): the server is the authority, nothing is saved locally.
  const online = new OnlineMenu({
    play(next) {
      if (session instanceof LocalSession) saveGame(session.state);
      next.onError = (message) => ui.toast(message, "warn");
      next.onRemoved = () => {
        ui.toast("Du wurdest aus dem Spiel entfernt", "warn");
        online.setCurrent(null);
        chat.attach(null);
        const local = loadGame();
        session = local ? new LocalSession(local) : LocalSession.newGame();
        showHome();
        view.select(0);
        ui.render(session.state);
      };
      session = next;
      chat.attach(next);
      showHome();
      view.select(0);
      ui.render(session.state);
    },
  });
  const leaveOnline = () => {
    if (session instanceof NetworkSession) void session.close();
    online.setCurrent(null);
    chat.attach(null);
  };
  const saveLocal = () => {
    if (session instanceof LocalSession) saveGame(session.state);
  };

  // The home planet, or any own planet once it has been conquered (versus).
  const home = () => {
    const state = session.state;
    const economyId = state.players.find((p) => p.id === session.playerId)?.economyId;
    const start = homePlanet(state, session.playerId)!;
    return start.economyId === economyId ? start : (state.planets.find((p) => p.economyId === economyId) ?? start);
  };
  const view = new PlanetView(app, (index) => {
    focus.segment = index;
    ui.setSelected(index);
    ui.render(session.state);
  });
  const showHome = () => {
    ui.playerId = session.playerId;
    focus.planetId = home().id;
    ui.setPlanet(home().id);
    view.setPlanet(home().id, home().segments.length);
  };
  const map = new SystemView(app, (id) => {
    map.selected = id;
    ui.selectMapTarget(id);
    ui.render(session.state);
  });
  showHome();
  app.stage.addChild(view.stage, map.stage);

  const relayout = () => {
    const hud = document.getElementById("hud")!.getBoundingClientRect();
    const panel = document.getElementById("panel")!.getBoundingClientRect();
    view.layout(app.screen.width, app.screen.height, hud.bottom, app.screen.height - panel.top);
    map.layout(app.screen.width, app.screen.height, hud.bottom, app.screen.height - panel.top, session.state);
  };
  const resize = new ResizeObserver(relayout);
  resize.observe(document.body);
  resize.observe(document.getElementById("hud")!);
  ui.render(session.state);
  relayout();

  // The art loads in the background; until then (or without a built atlas) placeholders are shown.
  void loadArt().then((ok) => {
    if (!ok) return;
    ui.art = true;
    view.invalidate();
    ui.render(session.state);
  });

  let uiTimer = 0;
  app.ticker.add((ticker) => {
    const events = session.update(ticker.deltaMS);
    if (events.length) {
      ui.showEvents(events);
      view.play(events, session.state);
      view.onEvents(events);
      playEventSounds(events);
      updateMusicMood(events, session.playerId);
    }
    if (events.some((e) => e.type === "cycle")) saveLocal();
    view.update(session.state, ticker.deltaMS);
    map.selected = ui.mapTarget;
    map.update(session.state, ticker.deltaMS);
    uiTimer += ticker.deltaMS;
    if (uiTimer > 200) {
      uiTimer = 0;
      ui.render(session.state);
    }
  });

  window.addEventListener("pagehide", saveLocal);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveLocal();
  });
}

boot();

// Browsers only allow audio after a user gesture; the first tap anywhere unlocks it.
window.addEventListener("pointerdown", () => sfx.unlock(), { once: true, capture: true });

/** Sounds for events that are not tied to a spot on the planet (those play in PlanetView). */
const EVENT_SOUNDS: Partial<Record<GameEvent["type"], SfxId>> = {
  born: "citizen.born",
  levelUp: "ascension.levelup",
  depleted: "alert.warning",
  starving: "alert.hungry",
  launched: "rocket.launch",
  landed: "rocket.land",
  battle: "battle.dice",
  joined: "coop.join",
  removed: "coop.leave",
  queueDropped: "ui.error",
  discovered: "discovery.unlock",
  invasionSpotted: "war.declare",
  invasionArrived: "monster.roar",
  siege: "battle.dice",
  invasionDefeated: "ascension.levelup",
  invasionLeft: "alert.warning",
  sunWarning: "alert.warning",
  shieldBuilt: "build.complete",
  shieldComplete: "ascension.levelup",
  eliminated: "coop.leave",
};

function playEventSounds(events: GameEvent[]): void {
  for (const e of events) {
    const id = EVENT_SOUNDS[e.type];
    if (id) sfx.play(id);
  }
}

/** Tense music while the own people fight or invaders besiege the planet, calm again once they are gone. */
function updateMusicMood(events: GameEvent[], playerId: string): void {
  for (const e of events) {
    if (e.type === "battle" && (e.attacker === playerId || e.defender === playerId)) music.alert();
    else if (e.type === "invasionArrived" || e.type === "siege") music.alert();
    else if (e.type === "invasionDefeated" || e.type === "invasionLeft") music.setMood("calm");
  }
}

