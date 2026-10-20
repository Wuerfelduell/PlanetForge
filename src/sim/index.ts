/**
 * PlanetForge simulation: pure TypeScript, no rendering, no DOM, no Node or Deno APIs, no
 * Math.random() or Date.now(). Time comes in as `now`, randomness from the seeded RNG in the state.
 * Runs identically in the browser and in a Supabase Edge Function.
 *
 *   createGame(seed, players, { now }) -> GameState
 *   advance(state, now)                -> GameState
 *   applyCommand(state, playerId, cmd, now) -> { ok, state, events } | { ok: false, error }
 */
export * from "./content";
export * from "./state";
export * from "./rules";
export { createGame, ringDistance, HOME_PLANET_ID, type GameOptions } from "./generate";
export { applyCommand } from "./commands";
export { advance, advanceWithEvents } from "./step";
export { nextRandom, Rng, seedFromString } from "./rng";
