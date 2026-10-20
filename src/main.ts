import { Application } from "pixi.js";
import { homePlanet } from "./sim";
import { LocalSession, type GameSession } from "./client/session";
import { clearSave, loadGame, saveGame } from "./client/save";
import { OnlineMenu } from "./net/menu";
import { NetworkSession } from "./net/netSession";
import { PlanetView } from "./render/planetView";
import { loadArt } from "./render/art";
import { Ui } from "./ui/ui";
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

  const saved = loadGame();
  let session: GameSession = saved ? new LocalSession(saved) : LocalSession.newGame();

  const ui = new Ui({
    send(cmd) {
      const result = session.send(cmd);
      if (!result.ok) ui.toast(result.error, "warn");
      ui.render(session.state);
    },
    showPlanet(planetId) {
      const planet = session.state.planets.find((p) => p.id === planetId);
      if (!planet) return;
      ui.setPlanet(planet.id);
      view.setPlanet(planet.id, planet.segments.length);
      ui.render(session.state);
    },
    setSpeed(speed) {
      session.speed = speed;
    },
    newGame() {
      clearSave();
      const speed = session.speed;
      leaveOnline();
      session = LocalSession.newGame();
      session.speed = speed;
      showHome();
      view.select(0);
      ui.render(session.state);
    },
  });

  // Cloud games (coop and solo saves): the server is the authority, nothing is saved locally.
  const online = new OnlineMenu({
    play(next) {
      if (session instanceof LocalSession) saveGame(session.state);
      next.onError = (message) => ui.toast(message, "warn");
      next.onRemoved = () => {
        ui.toast("Du wurdest aus dem Spiel entfernt", "warn");
        online.setCurrent(null);
        const local = loadGame();
        session = local ? new LocalSession(local) : LocalSession.newGame();
        showHome();
        view.select(0);
        ui.render(session.state);
      };
      session = next;
      showHome();
      view.select(0);
      ui.render(session.state);
    },
  });
  const leaveOnline = () => {
    if (session instanceof NetworkSession) void session.close();
    online.setCurrent(null);
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
    ui.setSelected(index);
    ui.render(session.state);
  });
  const showHome = () => {
    ui.playerId = session.playerId;
    ui.setPlanet(home().id);
    view.setPlanet(home().id, home().segments.length);
  };
  showHome();
  app.stage.addChild(view.stage);

  const relayout = () => {
    const hud = document.getElementById("hud")!.getBoundingClientRect();
    const panel = document.getElementById("panel")!.getBoundingClientRect();
    view.layout(app.screen.width, app.screen.height, hud.bottom, app.screen.height - panel.top);
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
    if (events.length) ui.showEvents(events);
    if (events.some((e) => e.type === "cycle")) saveLocal();
    view.update(session.state, ticker.deltaMS);
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
