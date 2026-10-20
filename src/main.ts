import { Application } from "pixi.js";
import { homePlanet } from "./sim";
import { LocalSession, type GameSession } from "./client/session";
import { clearSave, loadGame, saveGame } from "./client/save";
import { PlanetView } from "./render/planetView";
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
    setSpeed(speed) {
      session.speed = speed;
    },
    newGame() {
      clearSave();
      const speed = session.speed;
      session = LocalSession.newGame();
      session.speed = speed;
      showHome();
      view.select(0);
      ui.render(session.state);
    },
  });

  const home = () => homePlanet(session.state, session.playerId)!;
  const view = new PlanetView(app, home().segments.length, (index) => {
    ui.setSelected(index);
    ui.render(session.state);
  });
  const showHome = () => {
    ui.setPlanet(home().id);
    view.planetId = home().id;
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

  let uiTimer = 0;
  app.ticker.add((ticker) => {
    const events = session.update(ticker.deltaMS);
    if (events.length) ui.showEvents(events);
    if (events.some((e) => e.type === "cycle")) saveGame(session.state);
    view.update(session.state, ticker.deltaMS);
    uiTimer += ticker.deltaMS;
    if (uiTimer > 200) {
      uiTimer = 0;
      ui.render(session.state);
    }
  });

  window.addEventListener("pagehide", () => saveGame(session.state));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveGame(session.state);
  });
}

boot();
