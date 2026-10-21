import { DISCOVERIES, DISCOVERY_RULES, type DiscoveryId } from "../data/balance/discoveries";
import { MODES } from "../data/balance/progression";
import { Rng } from "./rng";
import type { EconomyState, GameEvent, GameState } from "./state";

export { DISCOVERIES, type DiscoveryId };

/** Stats the simulation applies so far; discoveries that change anything else are not offered yet. */
export const SUPPORTED_STATS = [
  "handGatherRate",
  "buildingOutput",
  "regenRate",
  "housing",
  "discoveryCost",
  "revealRadius",
  "birthTime",
  "battleLosses",
  "demolishRefund",
  "battleRoll",
  "rocketFuel",
  "rocketCapacity",
  "ascensionPerCycle",
  "sightRadius",
] as const;
export type StatId = (typeof SUPPORTED_STATS)[number];
/** Unlocked actions the simulation implements. */
const SUPPORTED_ACTIONS = ["rocket-combat-early", "colonize-asteroid"] as const;

interface Modifier {
  stat: string;
  mul?: number;
  add?: number;
  scope?: { building?: string; resource?: string; biome?: string };
}

const defOf = (id: string) => (DISCOVERIES as Record<string, { name: string; description: string; minLevel: number; modifiers?: readonly Modifier[]; unlocks?: { actions?: readonly string[] } }>)[id];

/** Discoveries that can be offered: everything they do is implemented. */
export const OFFERABLE: DiscoveryId[] = (Object.keys(DISCOVERIES) as DiscoveryId[]).filter((id) => {
  const def = defOf(id)!;
  const mods = def.modifiers ?? [];
  const actions = def.unlocks?.actions ?? [];
  return mods.length + actions.length > 0 && mods.every((m) => (SUPPORTED_STATS as readonly string[]).includes(m.stat)) && actions.every((a) => (SUPPORTED_ACTIONS as readonly string[]).includes(a));
});

/**
 * Applies the economy's discoveries to a base value. `scope` narrows to modifiers for one
 * building or resource; unscoped modifiers always apply, scoped ones only when the scope matches.
 */
export function modified(economy: EconomyState | undefined, stat: StatId, base: number, scope: { building?: string; resource?: string } = {}): number {
  if (!economy) return base;
  let value = base;
  for (const id of economy.discoveries) {
    for (const m of defOf(id)?.modifiers ?? []) {
      if (m.stat !== stat) continue;
      if (m.scope?.building && m.scope.building !== scope.building) continue;
      if (m.scope?.resource && m.scope.resource !== scope.resource) continue;
      if (m.mul !== undefined) value *= m.mul;
      if (m.add !== undefined) value += m.add;
    }
  }
  return value;
}

export function hasUnlock(economy: EconomyState | undefined, action: string): boolean {
  return !!economy?.discoveries.some((id) => defOf(id)?.unlocks?.actions?.includes(action));
}

/** Science for the next discovery of this economy. */
export function discoveryCost(state: GameState, economy: EconomyState): number {
  const players = state.players.filter((p) => p.economyId === economy.id).length || 1;
  const mode = MODES[state.settings.mode];
  const playerMul = mode.playerDiscoveryCostMul[Math.min(players, mode.playerDiscoveryCostMul.length) - 1] ?? 1;
  const base = DISCOVERY_RULES.baseCost * DISCOVERY_RULES.growth ** economy.discoveries.length * mode.discoveryCostMul * playerMul;
  return Math.round(modified(economy, "discoveryCost", base));
}

/** One more choice earned (level-up); opens an offer if none is open. */
export function grantPick(state: GameState, economy: EconomyState): void {
  economy.picks += 1;
  economy.resources.science += DISCOVERY_RULES.sciencePerLevel * economy.ascension.level;
  ensureOffer(state, economy);
}

function ensureOffer(state: GameState, economy: EconomyState): void {
  if (economy.offer || economy.picks <= 0) return;
  const eligible = OFFERABLE.filter((id) => defOf(id)!.minLevel <= economy.ascension.level && !economy.discoveries.includes(id));
  if (eligible.length === 0) return;
  const rng = new Rng(state.rng);
  const options: DiscoveryId[] = [];
  while (options.length < Math.min(DISCOVERY_RULES.offersPerLevel, eligible.length)) {
    const pick = rng.pick(eligible);
    if (!options.includes(pick)) options.push(pick);
  }
  state.rng = rng.seed;
  economy.offer = { options, votes: {} };
}

/**
 * Resolves the open offer of an economy: the option with the most votes wins, a tie decides
 * nothing (Seb: true majority). `final` = the voting window closed (cycle end); otherwise only
 * once every active member voted. Needs the science to pay for it.
 */
export function resolveOffer(state: GameState, economy: EconomyState, final: boolean, events: GameEvent[]): void {
  const offer = economy.offer;
  if (!offer) return;
  const members = state.players.filter((p) => p.economyId === economy.id && !p.eliminated);
  const votes = members.map((p) => offer.votes[p.id]).filter((v): v is DiscoveryId => !!v);
  if (votes.length === 0 || (!final && votes.length < members.length)) return;
  const cost = discoveryCost(state, economy);
  if (economy.resources.science < cost) return;
  const counts = new Map<DiscoveryId, number>();
  for (const v of votes) counts.set(v, (counts.get(v) ?? 0) + 1);
  const best = Math.max(...counts.values());
  const top = [...counts].filter(([, n]) => n === best);
  if (top.length !== 1) return;
  const chosen = top[0]![0];
  economy.resources.science -= cost;
  economy.discoveries.push(chosen);
  economy.picks -= 1;
  economy.offer = null;
  events.push({ type: "discovered", economyId: economy.id, discovery: chosen });
  ensureOffer(state, economy);
}

export function discoveryName(id: string): string {
  return defOf(id)?.name ?? id;
}

export function discoveryDescription(id: string): string {
  return defOf(id)?.description ?? "";
}
