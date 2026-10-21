import { upgradeState, type GameState } from "../sim";

const KEY = "planetforge.save.v12";
/** Older keys whose saves upgradeState can still read. */
const OLD_KEYS = ["planetforge.save.v11"];

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY) ?? OLD_KEYS.map((k) => localStorage.getItem(k)).find((r) => r);
    if (!raw) return null;
    return upgradeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode or full storage: the game still runs, it just does not persist.
  }
}

export function clearSave(): void {
  try {
    for (const k of [KEY, ...OLD_KEYS]) localStorage.removeItem(k);
  } catch {
    // ignore
  }
}
