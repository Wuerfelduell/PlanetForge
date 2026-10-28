import type { Ui } from "./ui";

/** Shown in the settings, in this order. */
export const KEY_HELP: [keys: string, what: string][] = [
  ["A / ←", "Planet drehen: Feld links"],
  ["D / →", "Planet drehen: Feld rechts"],
  ["W / ↑", "Arbeiter auf das Feld setzen"],
  ["S / ↓", "Arbeiter vom Feld abziehen"],
  ["Q / E", "Bau-Reiter wechseln"],
  ["1 – 9", "Gebäude im offenen Reiter bauen"],
  ["U", "Gebäude ausbauen"],
  ["M", "Sternkarte"],
  ["F", "Entdeckungen"],
  ["L", "Aufstieg (Level)"],
  ["R", "Alle Rohstoffe"],
  ["H", "Zurück zum eigenen Planeten"],
  ["Z", "Heranzoomen / ganzer Planet"],
  ["Leertaste", "Pause / weiter"],
  ["T", "Tempo 1× / 3×"],
  ["C", "Chat (online)"],
  ["Esc", "Schließen, sonst Pausenmenü"],
  ["?", "Diese Tastenliste"],
];

export interface KeyboardActions {
  ui: Ui;
  /** Next field to the right (+1) or left (-1). */
  turn(step: number): void;
  menuOpen(): boolean;
  /** Esc in the menu: back one screen, or close it when already at the top. */
  menuBack(): void;
  openMenu(screen: "pause" | "settings"): void;
}

/** PC controls. Off while typing (chat, name) and while the menu covers the game, except Esc. */
export function mountKeyboard(a: KeyboardActions): void {
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (a.menuOpen() || covered()) {
      if (key === "Escape" && a.menuOpen()) {
        a.menuBack();
        e.preventDefault();
      }
      return;
    }
    // Holding a key repeats only turning and placing workers.
    if (e.repeat && !["a", "d", "w", "s", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return;
    if (handle(a, key)) e.preventDefault();
  });
}

function handle(a: KeyboardActions, key: string): boolean {
  const { ui } = a;
  const onPlanet = !ui.mapIsOpen;
  switch (key) {
    case "a":
    case "ArrowLeft":
      if (onPlanet) a.turn(-1);
      return onPlanet;
    case "d":
    case "ArrowRight":
      if (onPlanet) a.turn(1);
      return onPlanet;
    case "w":
    case "ArrowUp":
      return ui.press(`#panel-body [data-action="assign"][data-value="1"]`);
    case "s":
    case "ArrowDown":
      return ui.press(`#panel-body [data-action="assign"][data-value="-1"]`);
    case "q":
    case "e":
      return cycleTab(ui, key === "e" ? 1 : -1);
    case "u":
      return ui.press(`[data-action="upgrade"]`);
    case "m":
      return ui.press(`#hud [data-action="map"]`);
    case "f":
      return ui.press(`#hud [data-action="discoveries"]`);
    case "l":
      return ui.press(`[data-action="ascension"]`);
    case "r":
      return ui.press(`[data-action="resources"]`);
    case "h":
      return ui.press(`[data-action="home"]`);
    case "z":
      return click(document.getElementById("zoom-toggle"));
    case " ":
      return ui.press(`[data-action="speed"]`);
    case "t":
      return ui.press(`[data-action="speed"][title="Tempo"]`);
    case "c":
      return click(document.getElementById("chat-button"));
    case "Escape":
      if (!ui.closeOverlay()) a.openMenu("pause");
      return true;
    case "?":
      a.openMenu("settings");
      return true;
  }
  if (/^[1-9]$/.test(key)) {
    const choice = document.querySelectorAll<HTMLElement>("#panel-body .builds button.build")[Number(key) - 1];
    return choice ? ui.press(choice) : false;
  }
  return false;
}

function cycleTab(ui: Ui, step: number): boolean {
  const tabs = [...document.querySelectorAll<HTMLElement>("#panel-body .tabs button.tab")];
  if (!tabs.length) return false;
  const at = tabs.findIndex((t) => t.classList.contains("on"));
  return ui.press(tabs[(at + step + tabs.length) % tabs.length]);
}

function click(el: HTMLElement | null): boolean {
  if (!el || el.hidden || !el.getClientRects().length) return false;
  el.click();
  return true;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  // Checkboxes and sliders keep their own keys only while focused; text inputs always.
  return target instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit"].includes(target.type);
}

/** The online menu on top of the game. */
function covered(): boolean {
  const online = document.getElementById("online-menu");
  return !!online && !online.hidden;
}
