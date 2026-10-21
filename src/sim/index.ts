/**
 * PlanetForge simulation: pure TypeScript, no rendering, no DOM, no Node or Deno APIs, no
 * Math.random() or Date.now(). Time comes in as `now`, randomness from the seeded RNG in the state.
 * Runs identically in the browser and in a Supabase Edge Function.
 *
 *   createGame(seed, players, { now }) -> GameState
 *   advance(state, now)                -> GameState
 *   applyCommand(state, playerId, cmd, now) -> { ok, state, events } | { ok: false, error }
 *   addPlayer(state, playerId, name, now, people?) -> { ok, state } | { ok: false, error }   (join a running game)
 *
 * `now` is game time in ms (the server pauses it while nobody is online), not wall-clock time.
 */
export * from "./content";
export * from "./state";
export * from "./rules";
export { addPlayer, createGame, upgradeState, type GameOptions } from "./generate";
export { applyCommand } from "./commands";
export { NOT_SCORCHED, TERRAFORM, TERRAFORM_START_FILL, terraformBlocker, type TerraformDef } from "./terraform";
export { novaTickNow } from "./invaders";
export { discoveryCost, discoveryDescription, discoveryName, modified, OFFERABLE, type DiscoveryId } from "./discoveries";
export { advance, advanceWithEvents } from "./step";
export { nextRandom, Rng, seedFromString } from "./rng";
