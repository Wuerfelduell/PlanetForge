import { RESOURCES as RESOURCE_VALUES } from "../data/balance/resources";
import { PEOPLES, RESOURCE_IDS, type PeopleId, type ResourceId } from "./content";
import type { Rng } from "./rng";
import { buildingStats, peopleOf, playerById, ticksPerCycle } from "./rules";
import type { EconomyState, FactionOfferKind, FactionPersonality, FactionState, FactionStance, GameEvent, GameState, PlayerState } from "./state";

/**
 * Diplomacy with the AI factions (coop with settings.factions > 0): stances, attitude, trade,
 * gifts, proposals and merges. Pure state operations; the factions' own decisions live in
 * factions.ts. The human team is always the shared coop economy "e0".
 */

export const TEAM_ECONOMY = "e0";

export const FACTIONS = {
  max: 4,
  /** Attitude the personality drifts back to while nothing happens. */
  baseline: { trader: 25, diplomat: 35, builder: 15, warlord: -15 } as Record<FactionPersonality, number>,
  /** A faction never sells its stock below this. */
  keep: 15,
  /** Units per trade bundle: cheap goods in tens, precious ones in fives. */
  bundle: { common: 10, precious: 5, preciousFrom: 10 },
  /** Resources a faction accepts as payment (common goods it can always use). */
  payment: ["food", "wood", "stone", "iron", "clay", "sand", "planks", "tools", "coal", "copper", "fiber", "bricks", "cloth", "fuel", "oil", "glass", "steel", "uranium", "aetherite", "gold"] as readonly ResourceId[],
  allianceAttitude: 50,
  mergeAttitude: 85,
  /** Cycles an alliance must have lasted before a merge is on the table. */
  mergeAlliedCycles: 10,
  /** Attitude at which a faction declares war (warlords sooner), unless a truce holds. */
  warAttitude: { warlord: -30, other: -55 },
  truceCycles: 12,
  /** Offers to the team expire after this many cycles. */
  offerCycles: 3,
  /** After a refusal the team waits this long before proposing again. */
  proposalCooldownCycles: 2,
  /** Cycles between a faction's own proposals. */
  offerCooldownCycles: 8,
  attackEveryCycles: { warlord: 3, other: 6 },
  giftEveryCycles: 6,
  /** Peace proposal of the team: accepted above this attitude, or when the faction is losing. */
  peaceAttitude: -40,
  /** Per inhabitant per cycle, so a simple AI keeps pace with a human (food, wood, stone). */
  stipend: { cozy: 0.2, normal: 0.6, hard: 1.2 } as Record<string, number>,
  /** A faction stops adding housing once it has popCap.base + cycle × pace inhabitants. */
  popCap: { base: 6 },
  pace: { cozy: 0.3, normal: 0.5, hard: 0.8 } as Record<string, number>,
  /** Stock a faction tries to keep of every crafted good. */
  stockTarget: 40,
} as const;

const PERSONALITIES: FactionPersonality[] = ["trader", "warlord", "builder", "diplomat"];

export const PERSONALITY_NAMES: Record<FactionPersonality, { name: string; icon: string; description: string }> = {
  trader: { name: "Händler", icon: "⚖️", description: "Handelt gern und vergisst gute Geschäfte nicht." },
  warlord: { name: "Kriegsherr", icon: "⚔️", description: "Stellt Forderungen, wenn er sich stark fühlt." },
  builder: { name: "Baumeister", icon: "🏗️", description: "Baut lieber, als zu streiten." },
  diplomat: { name: "Diplomat", icon: "🕊️", description: "Sucht Freunde und schlägt früh ein Bündnis vor." },
};

export const STANCE_NAMES: Record<FactionStance, { name: string; icon: string }> = {
  peace: { name: "Frieden", icon: "🕊️" },
  war: { name: "Krieg", icon: "⚔️" },
  allied: { name: "Verbündet", icon: "🤝" },
  merged: { name: "Vereint", icon: "🫂" },
};

export function factionName(people: PeopleId): string {
  return PEOPLES[people].name;
}

/** Every personality once before any repeats. */
export function pickPersonality(rng: Rng, used: FactionPersonality[]): FactionPersonality {
  const free = PERSONALITIES.filter((p) => !used.includes(p));
  return rng.pick(free.length ? free : PERSONALITIES);
}

export function factionById(state: GameState, id: string): FactionState | undefined {
  return state.factions.find((f) => f.id === id);
}

/** The faction an economy belongs to, if any. */
export function factionOfEconomy(state: GameState, economyId: string | null): FactionState | undefined {
  if (economyId === null) return undefined;
  const player = state.players.find((p) => p.ai && p.economyId === economyId);
  return player ? factionById(state, player.id) : undefined;
}

/** Factions still in the game (not merged, not wiped out). */
export function activeFactions(state: GameState): FactionState[] {
  return state.factions.filter((f) => !f.eliminated && f.stance !== "merged");
}

export function attitudeLabel(attitude: number): string {
  if (attitude >= 60) return "freundlich";
  if (attitude >= 20) return "wohlgesonnen";
  if (attitude > -20) return "neutral";
  if (attitude > -60) return "misstrauisch";
  return "feindselig";
}

/** Whether two economies are at war (only the team and a faction can be). */
export function atWar(state: GameState, a: string | null, b: string | null): boolean {
  if (a === null || b === null || a === b) return false;
  const faction = factionOfEconomy(state, a) ?? factionOfEconomy(state, b);
  if (!faction || faction.stance !== "war") return false;
  const other = faction.id === factionOfEconomy(state, a)?.id ? b : a;
  return other === TEAM_ECONOMY;
}

export function shiftAttitude(faction: FactionState, delta: number): void {
  faction.attitude = Math.max(-100, Math.min(100, Math.round((faction.attitude + delta) * 10) / 10));
}

/** Rough military weight of an economy: inhabitants plus its towers. */
export function strength(state: GameState, economyId: string): number {
  let people = 0;
  for (const p of state.players) if (p.economyId === economyId) people += peopleOf(state, p.id);
  let towers = 0;
  for (const planet of state.planets) if (planet.economyId === economyId) for (const s of planet.segments) towers += buildingStats(s)?.defense ?? 0;
  return people + towers * 2;
}

export function resourceValue(resource: ResourceId): number {
  return RESOURCE_VALUES[resource].value;
}

export function bundleSize(resource: ResourceId): number {
  return resourceValue(resource) >= FACTIONS.bundle.preciousFrom ? FACTIONS.bundle.precious : FACTIONS.bundle.common;
}

/** What a faction has to spare: everything above its reserve, at least one bundle. */
export function sellable(state: GameState, faction: FactionState): ResourceId[] {
  const economy = factionEconomy(state, faction);
  if (!economy) return [];
  return RESOURCE_IDS.filter((r) => r !== "science" && economy.resources[r] - FACTIONS.keep >= bundleSize(r));
}

/** Price factor: friends sell cheap, strangers dear. */
export function markup(faction: FactionState): number {
  return Math.max(0.9, Math.min(2.6, 1.8 - faction.attitude / 100 + (faction.stance === "allied" ? -0.2 : 0)));
}

export interface TradeQuote {
  give: ResourceId;
  giveAmount: number;
  /** The buyer can pay right now. */
  affordable: boolean;
}

/**
 * The faction's price for `amount` of `resource`: it asks for what it is short of, in a
 * common good the buyer owns, worth value × markup. Null when the faction cannot or will not sell.
 */
export function tradeQuote(state: GameState, faction: FactionState, resource: ResourceId, amount: number, buyer: EconomyState): TradeQuote | null {
  if (faction.stance === "war" || faction.stance === "merged" || faction.eliminated) return null;
  const economy = factionEconomy(state, faction);
  if (!economy || !Number.isInteger(amount) || amount < 1 || economy.resources[resource] - amount < FACTIONS.keep) return null;
  const worth = resourceValue(resource) * amount * markup(faction);
  const candidates = FACTIONS.payment.filter((r) => r !== resource).map((r) => ({ give: r, giveAmount: Math.max(1, Math.ceil(worth / resourceValue(r))) }));
  // Wants first what it has least of, among what the buyer can actually pay.
  candidates.sort((a, b) => economy.resources[a.give] - economy.resources[b.give]);
  const affordable = candidates.find((c) => buyer.resources[c.give] >= c.giveAmount);
  if (affordable) return { ...affordable, affordable: true };
  const best = candidates.reduce((x, y) => (buyer.resources[y.give] / y.giveAmount > buyer.resources[x.give] / x.giveAmount ? y : x));
  return { ...best, affordable: false };
}

export function factionEconomy(state: GameState, faction: FactionState): EconomyState | undefined {
  const player = playerById(state, faction.id);
  return player ? state.economies[player.economyId] : undefined;
}

/** Team buys from a faction. Returns an error message or null. */
export function trade(state: GameState, player: PlayerState, faction: FactionState, resource: ResourceId, amount: number, events: GameEvent[]): string | null {
  if (player.ai) return "Fraktionen handeln nicht untereinander";
  if (faction.eliminated || faction.stance === "merged") return "Diese Fraktion gibt es nicht mehr";
  if (faction.stance === "war") return "Im Krieg wird nicht gehandelt";
  const buyer = state.economies[player.economyId]!;
  const quote = tradeQuote(state, faction, resource, amount, buyer);
  if (!quote) return "Das verkauft die Fraktion gerade nicht";
  if (!quote.affordable) return `Dafür fehlen dir ${quote.giveAmount} ${RESOURCES_NAME(quote.give)}`;
  const seller = factionEconomy(state, faction)!;
  buyer.resources[quote.give] -= quote.giveAmount;
  seller.resources[quote.give] += quote.giveAmount;
  seller.resources[resource] -= amount;
  buyer.resources[resource] += amount;
  faction.trades += 1;
  shiftAttitude(faction, 2);
  events.push({ type: "factionTrade", faction: faction.id, playerId: player.id, got: resource, gotAmount: amount, gave: quote.give, gaveAmount: quote.giveAmount });
  return null;
}

function RESOURCES_NAME(resource: ResourceId): string {
  return RESOURCE_VALUES[resource].name;
}

/** Team gives a faction something; the goodwill scales with the value. */
export function gift(state: GameState, player: PlayerState, faction: FactionState, resource: ResourceId, amount: number, events: GameEvent[]): string | null {
  if (player.ai) return "Fraktionen beschenken sich nicht untereinander";
  if (faction.eliminated || faction.stance === "merged") return "Diese Fraktion gibt es nicht mehr";
  if (faction.stance === "war") return "Im Krieg nimmt sie nichts an";
  if (!Number.isInteger(amount) || amount < 1) return "Ungültige Menge";
  const giver = state.economies[player.economyId]!;
  if (giver.resources[resource] < amount) return "So viel hast du nicht";
  giver.resources[resource] -= amount;
  factionEconomy(state, faction)!.resources[resource] += amount;
  faction.trades += 1;
  shiftAttitude(faction, Math.min(15, (resourceValue(resource) * amount) / 12));
  events.push({ type: "factionGift", faction: faction.id, from: player.id, resource, amount });
  return null;
}

export function setStance(state: GameState, faction: FactionState, stance: FactionStance, reason: Extract<GameEvent, { type: "factionStance" }>["reason"], events: GameEvent[]): void {
  faction.stance = stance;
  faction.stanceTick = state.tick;
  faction.offer = null;
  events.push({ type: "factionStance", faction: faction.id, stance, reason });
}

/** War, declared by the team or the faction itself. */
export function declareWar(state: GameState, faction: FactionState, reason: "declaredWar" | "attacked" | "ultimatumRefused", events: GameEvent[]): void {
  if (faction.stance === "war") return;
  // Breaking an alliance hurts more than a plain declaration.
  shiftAttitude(faction, reason === "declaredWar" ? (faction.stance === "allied" ? -60 : -30) : reason === "attacked" ? -40 : -20);
  setStance(state, faction, "war", reason, events);
  faction.nextAttackTick = state.tick + cycles(state, 1);
}

export function cycles(state: GameState, n: number): number {
  return Math.round(n * ticksPerCycle(state));
}

/** Team proposals (the faction decides at once). Returns an error message or null. */
export function propose(state: GameState, player: PlayerState, faction: FactionState, action: "war" | "peace" | "alliance" | "merge", events: GameEvent[]): string | null {
  if (player.ai) return "Nur Spieler führen Verhandlungen";
  if (faction.eliminated || faction.stance === "merged") return "Diese Fraktion gibt es nicht mehr";
  if (action === "war") {
    if (faction.stance === "war") return "Ihr seid schon im Krieg";
    declareWar(state, faction, "declaredWar", events);
    return null;
  }
  if (state.tick < faction.nextProposalTick) return "Sie wollen gerade nicht verhandeln. Versuch es später";
  const team = strength(state, TEAM_ECONOMY);
  const own = strength(state, factionEconomy(state, faction)!.id);
  let accepted: boolean;
  switch (action) {
    case "peace":
      if (faction.stance !== "war") return "Ihr habt keinen Krieg";
      accepted = faction.attitude >= FACTIONS.peaceAttitude || own < team * 0.6;
      if (accepted) {
        shiftAttitude(faction, 10);
        setStance(state, faction, "peace", "peace", events);
        faction.truceUntilTick = state.tick + cycles(state, FACTIONS.truceCycles);
      }
      break;
    case "alliance":
      if (faction.stance === "allied") return "Ihr seid schon verbündet";
      if (faction.stance === "war") return "Erst Frieden schließen";
      accepted = faction.attitude >= FACTIONS.allianceAttitude;
      if (accepted) {
        shiftAttitude(faction, 10);
        setStance(state, faction, "allied", "alliance", events);
      }
      break;
    case "merge":
      if (faction.stance !== "allied") return "Nur Verbündete schließen sich an";
      accepted = (faction.attitude >= FACTIONS.mergeAttitude && state.tick - faction.stanceTick >= cycles(state, FACTIONS.mergeAlliedCycles)) || own < team * 0.4;
      if (accepted) merge(state, faction, player, events);
      break;
  }
  if (!accepted) {
    shiftAttitude(faction, -3);
    faction.nextProposalTick = state.tick + cycles(state, FACTIONS.proposalCooldownCycles);
    events.push({ type: "factionDeclined", faction: faction.id, action });
  }
  return null;
}

/** Answers the faction's open offer. Returns an error message or null. */
export function answerOffer(state: GameState, player: PlayerState, faction: FactionState, accept: boolean, events: GameEvent[]): string | null {
  if (player.ai) return "Nur Spieler führen Verhandlungen";
  const offer = faction.offer;
  if (!offer || state.tick >= offer.expiresTick) return "Da liegt kein Angebot vor";
  faction.offer = null;
  if (!accept) {
    if (offer.kind === "ultimatum") declareWar(state, faction, "ultimatumRefused", events);
    else shiftAttitude(faction, -5);
    return null;
  }
  switch (offer.kind) {
    case "ultimatum": {
      const economy = state.economies[player.economyId]!;
      if (economy.resources[offer.resource!] < offer.amount!) {
        faction.offer = offer;
        return "So viel hast du nicht";
      }
      economy.resources[offer.resource!] -= offer.amount!;
      factionEconomy(state, faction)!.resources[offer.resource!] += offer.amount!;
      shiftAttitude(faction, 15);
      faction.truceUntilTick = state.tick + cycles(state, FACTIONS.truceCycles);
      events.push({ type: "factionGift", faction: faction.id, from: player.id, resource: offer.resource!, amount: offer.amount! });
      return null;
    }
    case "peace":
      shiftAttitude(faction, 10);
      setStance(state, faction, "peace", "peace", events);
      faction.truceUntilTick = state.tick + cycles(state, FACTIONS.truceCycles);
      return null;
    case "alliance":
      shiftAttitude(faction, 10);
      setStance(state, faction, "allied", "alliance", events);
      return null;
    case "merge":
      merge(state, faction, player, events);
      return null;
  }
}

export function makeOffer(state: GameState, faction: FactionState, kind: FactionOfferKind, events: GameEvent[], resource?: ResourceId, amount?: number): void {
  const expiresTick = state.tick + cycles(state, FACTIONS.offerCycles);
  faction.offer = { kind, resource, amount, expiresTick };
  faction.nextOfferTick = state.tick + cycles(state, FACTIONS.offerCooldownCycles);
  events.push({ type: "factionOffer", faction: faction.id, kind, resource, amount, expiresTick });
}

/**
 * The faction joins the team: its inhabitants become `player`'s (they keep their people), its
 * planets, stock and discoveries go to the team economy, and its player entry disappears.
 */
export function merge(state: GameState, faction: FactionState, player: PlayerState, events: GameEvent[]): void {
  const ai = playerById(state, faction.id)!;
  const from = state.economies[ai.economyId]!;
  const team = state.economies[player.economyId]!;
  let units = 0;
  for (const u of Object.values(state.units)) {
    if (u.owner !== ai.id) continue;
    u.owner = player.id;
    delete u.originalOwner;
    delete u.capturedTick;
    units++;
  }
  for (const f of state.flights) if (f.owner === ai.id) f.owner = player.id;
  let planets = 0;
  for (const p of state.planets) {
    if (p.economyId !== ai.economyId) continue;
    p.economyId = team.id;
    planets++;
    for (const q of state.queues[p.id] ?? []) q.playerId = player.id;
    for (const s of p.segments) if (s.builtBy === ai.id) s.builtBy = player.id;
  }
  for (const r of RESOURCE_IDS) team.resources[r] += from.resources[r];
  for (const d of from.discoveries) if (!team.discoveries.includes(d)) team.discoveries.push(d);
  delete state.economies[ai.economyId];
  state.players.splice(state.players.indexOf(ai), 1);
  faction.stance = "merged";
  faction.stanceTick = state.tick;
  faction.offer = null;
  events.push({ type: "factionStance", faction: faction.id, stance: "merged", reason: "merged" });
  events.push({ type: "factionMerged", faction: faction.id, playerId: player.id, units, planets });
}

/** A battle touched a faction: an unprovoked attack by the team means war, a lost fight makes it bitter. */
export function onBattle(state: GameState, attacker: PlayerState, defenderEconomyId: string, won: boolean, events: GameEvent[]): void {
  const target = factionOfEconomy(state, defenderEconomyId);
  if (target && !attacker.ai) {
    if (target.stance !== "war") declareWar(state, target, "attacked", events);
    else shiftAttitude(target, won ? -6 : -2);
    return;
  }
  const source = attacker.ai ? factionById(state, attacker.id) : undefined;
  if (source && defenderEconomyId === TEAM_ECONOMY) shiftAttitude(source, won ? 0 : -3);
}

/** Factions without inhabitants are gone; their planets become free ruins. */
export function checkFactionEliminations(state: GameState, events: GameEvent[]): void {
  for (const faction of activeFactions(state)) {
    const player = playerById(state, faction.id);
    if (!player || peopleOf(state, player.id) > 0) continue;
    faction.eliminated = true;
    faction.offer = null;
    player.eliminated = true;
    for (const planet of state.planets) {
      if (planet.economyId !== player.economyId) continue;
      planet.economyId = null;
      delete state.queues[planet.id];
    }
    events.push({ type: "factionEliminated", faction: faction.id });
  }
}

/** With factions around, a team without any inhabitants has lost: the strongest faction wins. */
export function checkTeamWipe(state: GameState, events: GameEvent[]): void {
  if (state.result || state.settings.factions === 0) return;
  const humans = state.players.filter((p) => !p.ai);
  if (humans.length === 0 || humans.some((p) => peopleOf(state, p.id) > 0)) return;
  const winner = activeFactions(state)
    .map((f) => ({ f, s: strength(state, playerById(state, f.id)!.economyId) }))
    .sort((a, b) => b.s - a.s)[0];
  if (!winner) return;
  state.result = { winner: winner.f.id };
  events.push({ type: "gameOver", result: state.result });
}

/** Team planets a faction could attack (inhabited by the team). */
export function teamPlanets(state: GameState) {
  return state.planets.filter((p) => p.economyId === TEAM_ECONOMY);
}
