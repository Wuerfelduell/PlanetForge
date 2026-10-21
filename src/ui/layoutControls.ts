const COLLAPSED_KEY = "planetforge.panelCollapsed";
const ZOOM_KEY = "planetforge.zoom";

/** HUD buttons that open something in the panel, so a collapsed panel opens with them. */
const OPENS_PANEL = new Set(["new", "discoveries"]);

/**
 * Small-screen helpers: the bottom panel folds down to its title row, and the planet switches
 * between a close-up of the top fields and the whole wheel. Both choices are remembered.
 */
export function mountLayoutControls(setPlanetZoom: (zoomed: boolean) => void): void {
  const panel = document.getElementById("panel")!;
  const grip = document.getElementById("panel-grip")!;
  const zoom = document.getElementById("zoom-toggle")!;

  const setCollapsed = (collapsed: boolean) => {
    document.body.classList.toggle("panel-collapsed", collapsed);
    grip.setAttribute("aria-expanded", String(!collapsed));
    if (collapsed) panel.scrollTop = 0;
    store(COLLAPSED_KEY, collapsed ? "1" : "");
  };
  const collapsed = () => document.body.classList.contains("panel-collapsed");
  setCollapsed(read(COLLAPSED_KEY) === "1");
  grip.addEventListener("click", () => setCollapsed(!collapsed()));
  // A collapsed panel opens when tapped anywhere; its buttons only work once it is open.
  panel.addEventListener("pointerup", (e) => {
    if (!collapsed() || (e.target instanceof Node && grip.contains(e.target))) return;
    e.stopPropagation();
    setCollapsed(false);
  }, true);
  document.getElementById("hud")!.addEventListener("pointerup", (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>("[data-action]")?.dataset.action;
    if (action && OPENS_PANEL.has(action)) setCollapsed(false);
  });

  let zoomed = false;
  const setZoom = (on: boolean) => {
    zoomed = on;
    setPlanetZoom(zoomed);
    zoom.textContent = zoomed ? "🪐" : "🔍";
    zoom.title = zoomed ? "Ganzen Planeten zeigen" : "Felder heranzoomen";
    store(ZOOM_KEY, zoomed ? "close" : "whole");
  };
  // Phones start with the close-up; wide screens have room for the whole planet.
  const saved = read(ZOOM_KEY);
  setZoom(saved ? saved === "close" : window.innerWidth < 700);
  zoom.addEventListener("click", () => setZoom(!zoomed));
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Private mode: the choice just isn't remembered.
  }
}
