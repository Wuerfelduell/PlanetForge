import type { PeopleId } from "./content";
import type { GameState } from "./state";

/** Adds a new idle unit to the state (mutating) and returns its id. */
export function createUnit(state: GameState, owner: string, people: PeopleId, planetId: string): string {
  const id = `u${state.nextUnitId++}`;
  state.units[id] = { id, owner, people, planetId, segment: null, role: "worker" };
  return id;
}
