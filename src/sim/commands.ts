import { BUILDINGS, CRYO, PEOPLE_IDS, RESOURCE_IDS, RULES, SUPERNOVA, type RecipeId } from "./content";
import { createUnit } from "./units";
import { placeBuilding } from "./build";
import { buildingStats, nextUpgrade, paidFor, shieldBlocker, shieldFlightPlan, thawBlocker, upgradeBlocker } from "./rules";
import { tradeBlocker, tradePrice } from "./rules";
import { buildBlocker, cloneState, NOT_AFFORDABLE, idleUnits, launchBlocker, planetById, playerById, segmentAt, workerCapacity, workerCount, workersOn } from "./rules";
import { modified, resolveOffer } from "./discoveries";
import { checkEliminations, checkResult, launch, surrender } from "./space";
import { decide, factionById, gift, trade, vote } from "./diplomacy";
import type { Command, CommandResult, GameEvent, GameState, PlanetState, PlayerState } from "./state";
import { advanceInPlace, appendLog } from "./step";
import { terraform, terraformBlocker } from "./terraform";

/**
 * Simulates up to `now`, then validates and applies one command from `playerId`.
 * Never mutates the input; on failure nothing is returned but the error.
 */
export function applyCommand(state: GameState, playerId: string, cmd: Command, now: number): CommandResult {
  const next = cloneState(state);
  const events = advanceInPlace(next, now);
  const error = executeCommand(next, playerId, cmd, events);
  if (error) return { ok: false, error };
  appendLog(next, events);
  return { ok: true, state: next, events };
}

/** Validates and applies a command in place. Returns an error message, or null on success (then the state changed). */
function executeCommand(state: GameState, playerId: string, cmd: Command, events: GameEvent[]): string | null {
  const player = playerById(state, playerId);
  if (!player) return "Unbekannter Spieler";

  switch (cmd.type) {
    case "openLobby":
    case "closeLobby": {
      if (playerId !== state.hostId) return "Nur der Gastgeber kann das Spiel öffnen oder schließen";
      state.lobby.open = cmd.type === "openLobby";
      if (state.lobby.open) state.lobby.paused = false;
      events.push({ type: "lobby", ...state.lobby, playerId });
      return null;
    }
    case "kickPlayer": {
      if (playerId !== state.hostId) return "Nur der Gastgeber kann Spieler entfernen";
      if (cmd.playerId === playerId) return "Du kannst dich nicht selbst entfernen";
      const index = state.players.findIndex((p) => p.id === cmd.playerId);
      if (index < 0) return "Unbekannter Spieler";
      if (state.players[index]!.ai) return "Fraktionen kann man nicht entfernen";
      state.players.splice(index, 1);
      // Seb: the removed player's people simply vanish; nobody inherits them.
      for (const [id, u] of Object.entries(state.units)) if (u.owner === cmd.playerId) delete state.units[id];
      for (const queue of Object.values(state.queues)) {
        for (let i = queue.length - 1; i >= 0; i--) if (queue[i]!.playerId === cmd.playerId) queue.splice(i, 1);
      }
      state.flights = state.flights.filter((f) => f.owner !== cmd.playerId);
      for (const u of Object.values(state.units)) {
        if (u.originalOwner !== cmd.playerId) continue;
        delete u.originalOwner;
        delete u.capturedTick;
      }
      // versus: their planets become free ruins (in coop the team keeps the shared planet).
      for (const planet of state.planets) {
        if (planet.economyId && !state.players.some((p) => p.economyId === planet.economyId)) {
          planet.economyId = null;
          delete state.queues[planet.id];
        }
      }
      events.push({ type: "removed", playerId: cmd.playerId, by: playerId });
      checkEliminations(state, events);
      return null;
    }
  }

  // Everything below changes the game itself.
  if (state.result) return "Das Spiel ist vorbei";
  if (player.eliminated) return "Du bist ausgeschieden";

  switch (cmd.type) {
    case "surrender":
    case "offerDraw": {
      if (state.settings.mode !== "versus") return "Nur im Gegeneinander-Modus";
      if (cmd.type === "surrender") {
        surrender(state, player, events);
        return null;
      }
      if (state.players.length < 2) return "Allein gibt es kein Unentschieden";
      player.offersDraw = cmd.offer;
      events.push({ type: "drawOffer", playerId, offer: cmd.offer });
      checkResult(state, events);
      return null;
    }
    case "voteDiscovery": {
      const economy = state.economies[player.economyId]!;
      if (!economy.offer) return "Gerade gibt es keine Entdeckung zur Wahl";
      if (!economy.offer.options.includes(cmd.discovery)) return "Diese Entdeckung steht nicht zur Wahl";
      economy.offer.votes[playerId] = cmd.discovery;
      events.push({ type: "discoveryVote", playerId, discovery: cmd.discovery });
      resolveOffer(state, economy, false, events);
      return null;
    }
    case "pause":
    case "resume": {
      if (!state.lobby.open) return "Das Spiel ist geschlossen";
      state.lobby.paused = cmd.type === "pause";
      events.push({ type: "lobby", ...state.lobby, playerId });
      return null;
    }
    case "factionTrade":
    case "gift":
    case "diplomacy":
    case "answerOffer":
    case "voteDiplomacy": {
      if (!state.lobby.open) return "Das Spiel ist geschlossen";
      const faction = factionById(state, cmd.faction);
      if (!faction) return "Unbekannte Fraktion";
      if (cmd.type === "factionTrade") return trade(state, player, faction, cmd.resource, cmd.amount, events);
      if (cmd.type === "gift") return gift(state, player, faction, cmd.resource, cmd.amount, events);
      // Seb: war, peace and alliances are team decisions (true majority); alone they happen at once.
      if (cmd.type === "diplomacy") return decide(state, player, faction, cmd.action, true, events);
      if (cmd.type === "answerOffer") return decide(state, player, faction, "offer", cmd.accept, events);
      return vote(state, player, faction, cmd.yes, events);
    }
    case "assignUnit": {
      if (!state.lobby.open) return "Das Spiel ist geschlossen";
      const unit = state.units[cmd.unitId];
      if (!unit) return "Unbekannter Einwohner";
      if (unit.owner !== playerId) return "Dieser Einwohner gehört dir nicht";
      const planet = planetById(state, unit.planetId)!;
      if (cmd.segment === null) {
        unit.segment = null;
        return null;
      }
      const target = checkSegment(player, planet, cmd.segment);
      if (typeof target === "string") return target;
      if (unit.segment === cmd.segment) return null;
      if (workerCount(state, planet, cmd.segment) >= workerCapacity(target)) return "Kein Platz für weitere Einwohner";
      unit.segment = cmd.segment;
      return null;
    }
  }

  if (!state.lobby.open) return "Das Spiel ist geschlossen";
  const planet = planetById(state, cmd.planetId);
  if (!planet) return "Unbekannter Planet";
  if (cmd.type === "trade") {
    if (planet.economyId !== player.economyId) return "Dieser Planet gehört dir nicht";
    const blocker = tradeBlocker(state, planet, cmd.give, cmd.get, cmd.count);
    if (blocker) return blocker;
    const economy = state.economies[planet.economyId!]!;
    const paid = tradePrice(cmd.give, cmd.get, cmd.count)!;
    economy.resources[cmd.give] -= paid;
    economy.resources[cmd.get] += cmd.count;
    events.push({ type: "traded", planetId: planet.id, give: cmd.give, paid, get: cmd.get, count: cmd.count, playerId });
    return null;
  }
  if (cmd.type === "dequeue") {
    if (planet.economyId !== player.economyId) return "Dieser Planet gehört dir nicht";
    const queue = state.queues[planet.id] ?? [];
    if (!queue[cmd.index]) return "Diesen Auftrag gibt es nicht";
    queue.splice(cmd.index, 1);
    return null;
  }
  if (cmd.type === "shieldFlight") {
    const blocker = shieldBlocker(state, playerId, planet, cmd.segment, cmd.repair);
    if (blocker) return blocker;
    const economy = state.economies[player.economyId]!;
    const plan = shieldFlightPlan(planet, cmd.repair, economy);
    for (const r of RESOURCE_IDS) economy.resources[r] -= plan.cost[r] ?? 0;
    const crew = idleUnits(state, planet, playerId).slice(0, SUPERNOVA.crew);
    for (const u of crew) delete state.units[u.id];
    const id = `f${state.nextFlightId++}`;
    const arrivalTick = state.tick + plan.seconds * RULES.ticksPerSecond;
    state.flights.push({ id, owner: playerId, rocket: "colony", from: planet.id, to: "sun", units: crew, launchTick: state.tick, arrivalTick, shield: { segment: cmd.segment, repair: cmd.repair } });
    events.push({ type: "launched", flightId: id, playerId, from: planet.id, to: "sun", rocket: "colony", count: crew.length, arrivalTick });
    return null;
  }
  if (cmd.type === "launch") {
    const to = planetById(state, cmd.to);
    if (!to) return "Unbekanntes Ziel";
    const blocker = launchBlocker(state, playerId, planet, to, cmd.rocket, cmd.count);
    if (blocker) return blocker;
    launch(state, player, planet, to, cmd.rocket, cmd.count, events);
    return null;
  }
  const segment = checkSegment(player, planet, cmd.segment);
  if (typeof segment === "string") return segment;

  switch (cmd.type) {
    case "build": {
      if (!(cmd.building in BUILDINGS)) return "Unbekanntes Gebäude";
      const blocker = buildBlocker(state, planet, segment, cmd.building);
      if (blocker) return blocker;
      placeBuilding(state, planet, segment, cmd.building, playerId, events);
      return null;
    }
    case "enqueue": {
      if (!(cmd.building in BUILDINGS)) return "Unbekanntes Gebäude";
      const queue = (state.queues[planet.id] ??= []);
      if (queue.length >= RULES.queueLength) return `Höchstens ${RULES.queueLength} Aufträge`;
      if (queue.some((q) => q.segment === segment.index)) return "Für dieses Feld ist schon etwas geplant";
      const blocker = buildBlocker(state, planet, segment, cmd.building);
      // Only missing resources may be waited for; everything else must already fit.
      if (blocker && blocker !== NOT_AFFORDABLE) return blocker;
      queue.push({ segment: segment.index, building: cmd.building, playerId });
      return null;
    }
    case "demolish": {
      if (!segment.building) return "Hier steht nichts";
      // On a shared planet nobody tears down a teammate's work (unless the builder left the game).
      // A conquered planet's buildings belong to the conqueror: the old builder is no teammate.
      const builder = segment.builtBy && segment.builtBy !== playerId ? playerById(state, segment.builtBy) : undefined;
      if (builder && builder.economyId === player.economyId) return "Das hat ein Mitspieler gebaut";
      const economy = state.economies[planet.economyId!]!;
      const paid = paidFor(segment);
      for (const r of RESOURCE_IDS) economy.resources[r] += Math.floor((paid[r] ?? 0) * modified(economy, "demolishRefund", RULES.demolishRefund));
      for (const u of workersOn(state, planet, segment.index)) u.segment = null;
      segment.building = null;
      segment.builtBy = null;
      delete segment.tier;
      events.push({ type: "demolished", planetId: planet.id, segment: segment.index, playerId });
      return null;
    }
    case "upgrade": {
      if (!segment.building) return "Hier steht nichts";
      const blocker = upgradeBlocker(state, planet, segment);
      if (blocker) return blocker;
      const economy = state.economies[planet.economyId!]!;
      const next = nextUpgrade(segment)!;
      for (const r of RESOURCE_IDS) economy.resources[r] -= next.cost[r] ?? 0;
      segment.tier = (segment.tier ?? 1) + 1;
      events.push({ type: "upgraded", planetId: planet.id, segment: segment.index, building: segment.building, tier: segment.tier, playerId });
      return null;
    }
    case "assign": {
      if (!Number.isInteger(cmd.delta) || cmd.delta === 0) return "Ungültige Anzahl";
      if (cmd.delta > 0) {
        if (workerCount(state, planet, segment.index) + cmd.delta > workerCapacity(segment)) return "Kein Platz für weitere Einwohner";
        const idle = idleUnits(state, planet, playerId);
        if (idle.length < cmd.delta) return "Keine freien Einwohner";
        for (const u of idle.slice(0, cmd.delta)) u.segment = segment.index;
      } else {
        const own = workersOn(state, planet, segment.index, playerId);
        if (own.length < -cmd.delta) return "Hier arbeiten keine Leute von dir";
        for (const u of own.slice(cmd.delta)) u.segment = null;
      }
      return null;
    }
    case "thaw": {
      const blocker = thawBlocker(state, planet, segment);
      if (blocker) return blocker;
      const economy = state.economies[planet.economyId!]!;
      for (const r of RESOURCE_IDS) economy.resources[r] -= CRYO.thawCost[r] ?? 0;
      const pod = segment.cryo!;
      // Peoples somebody plays (AI factions included) stay theirs: take the next free one.
      const taken = new Set(state.players.map((p) => p.people));
      const start = PEOPLE_IDS.indexOf(pod.people);
      const people = PEOPLE_IDS.map((_, i) => PEOPLE_IDS[(start + i) % PEOPLE_IDS.length]!).find((id) => !taken.has(id)) ?? pod.people;
      for (let i = 0; i < pod.count; i++) createUnit(state, playerId, people, planet.id);
      delete segment.cryo;
      events.push({ type: "thawed", planetId: planet.id, segment: segment.index, people, count: pod.count, playerId });
      return null;
    }
    case "setGather": {
      const crafts = buildingStats(segment)?.crafts;
      if (crafts) {
        // Crafting buildings: `gather` picks the recipe.
        if (!crafts.recipes.includes(cmd.resource as RecipeId)) return "Das stellt dieses Gebäude nicht her";
        segment.gather = cmd.resource;
        return null;
      }
      if (segment.building) return "Gebäude bestimmt, was abgebaut wird";
      const deposit = segment.deposits.find((d) => d.resource === cmd.resource && d.byHand);
      if (!deposit) return "Kann man hier nicht von Hand sammeln";
      segment.gather = cmd.resource;
      return null;
    }
    case "terraform": {
      const blocker = terraformBlocker(state, planet, segment, cmd.kind);
      if (blocker) return blocker;
      terraform(state, planet, segment, cmd.kind, playerId, events);
      return null;
    }
    default: {
      const unknown: never = cmd;
      return `Unbekannter Befehl ${(unknown as { type: string }).type}`;
    }
  }
}

/** The revealed segment of a planet the player's economy controls, or an error message. */
function checkSegment(player: PlayerState, planet: PlanetState, index: number) {
  if (planet.economyId !== player.economyId) return "Dieser Planet gehört dir nicht";
  const segment = Number.isInteger(index) ? segmentAt(planet, index) : undefined;
  if (!segment || segment.index !== index) return "Unbekanntes Feld";
  if (!segment.revealed) return "Feld noch unerforscht";
  return segment;
}
