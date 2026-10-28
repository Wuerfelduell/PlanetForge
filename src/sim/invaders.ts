import { BIOMES, BUILDINGS, INVADERS, RULES, SUPERNOVA, WARP, type ResourceId } from "./content";
import { modified } from "./discoveries";
import { Rng } from "./rng";
import { buildingStats, economyOf, planetById, planetDefense, planetShield, systemOf, ticksPerCycle } from "./rules";
import type { EconomyState, Flight, GameEvent, GameState, Invasion, PlanetState } from "./state";

/**
 * Coop goals (design section 13): invader waves and the supernova with its shield. Everything
 * follows from seed and tick inside advance(), so the server needs no extra job.
 */

/** The team economy invaders and the supernova play against (coop has exactly one). */
function teamEconomy(state: GameState): EconomyState | undefined {
  return state.settings.mode === "coop" ? state.economies.e0 : undefined;
}

/** Called at the end of every cycle. */
export function goalsCycle(state: GameState, events: GameEvent[]): void {
  const economy = teamEconomy(state);
  if (!economy) return;
  if (state.settings.invaders !== "off") invadersCycle(state, economy, events);
  supernovaCycle(state, events);
}

function cycles(state: GameState, n: number): number {
  return Math.round(n * ticksPerCycle(state));
}

function invadersCycle(state: GameState, economy: EconomyState, events: GameEvent[]): void {
  const rng = new Rng(state.rng);
  try {
    if (!state.invasion && state.nextWaveTick === null && economy.ascension.level >= INVADERS.minLevel && Object.keys(state.units).length >= INVADERS.minPeople) {
      state.nextWaveTick = state.tick + cycles(state, rng.int(...INVADERS.firstWaveCycles));
    }
    if (!state.invasion && state.nextWaveTick !== null && state.tick >= state.nextWaveTick) {
      spawn(state, economy, rng, events);
    }
    const inv = state.invasion;
    if (!inv) return;
    if (!inv.sieging) {
      if (!inv.spotted && inv.arrivalTick - state.tick <= cycles(state, INVADERS.blindWarningCycles)) spot(inv, events);
      if (state.tick < inv.arrivalTick) return;
      inv.sieging = true;
      inv.siegeEndTick = state.tick + cycles(state, INVADERS.siegeCycles);
      events.push({ type: "invasionArrived", target: inv.target, wave: inv.wave });
    }
    siegeRound(state, economy, inv, rng, events);
  } finally {
    state.rng = rng.seed;
  }
}

function spawn(state: GameState, economy: EconomyState, rng: Rng, events: GameEvent[]): void {
  // Invaders come for the home system; colonies behind the warp gate are out of their reach.
  const planets = state.planets.filter((p) => p.economyId === economy.id && systemOf(p) === 0 && Object.values(state.units).some((u) => u.planetId === p.id));
  const shieldUp = state.sun.shield.some((s) => s.built);
  let target: string | undefined;
  if (shieldUp && rng.next() < INVADERS.shieldTargetChance) target = "sun";
  else if (planets.length) target = rng.pick(planets).id;
  if (!target) return;
  state.wave += 1;
  state.nextWaveTick = null;
  const strength = state.settings.invaders === "strong" ? INVADERS.strongMul : 1;
  const { perPeople, min, max } = INVADERS.hpTeamScale;
  const team = Math.min(max, Math.max(min, Object.keys(state.units).length / perPeople));
  const maxHp = Math.round((INVADERS.shipHp.base + INVADERS.shipHp.perWave * state.wave) * strength * team);
  const inv: Invasion = {
    wave: state.wave,
    target,
    arrivalTick: state.tick + cycles(state, INVADERS.approachCycles),
    spotted: false,
    sieging: false,
    siegeEndTick: 0,
    hp: maxHp,
    maxHp,
    bonus: Math.floor(state.wave * INVADERS.escortBonusPerWave * strength),
  };
  state.invasion = inv;
  // Long-range sight sees the fleet as soon as it sets out.
  if (modified(economy, "sightRadius", 0) > 0) spot(inv, events);
}

function spot(inv: Invasion, events: GameEvent[]): void {
  inv.spotted = true;
  events.push({ type: "invasionSpotted", target: inv.target, wave: inv.wave, arrivalTick: inv.arrivalTick });
}

/**
 * One siege round per cycle: batteries fire (1 hit per worker), idle inhabitants duel the
 * escorts with the dice (defenders add home advantage, towers and discoveries), every win is a
 * hit on the mothership, every loss a dead defender. Then the fleet wrecks one building, or
 * damages its shield segment.
 */
function siegeRound(state: GameState, economy: EconomyState, inv: Invasion, rng: Rng, events: GameEvent[]): void {
  let damage = 0;
  let defenderLosses = 0;
  let destroyed: PlanetState["segments"][number]["building"] = null;
  let killed = 0;
  let shieldSegment: number | null = null;
  const scorched: number[] = [];

  if (inv.target === "sun") {
    const standing = state.sun.shield.map((s, i) => ({ s, i })).filter(({ s }) => s.built && s.hp > 0);
    if (standing.length) {
      const hit = rng.pick(standing);
      hit.s.hp = Math.max(0, hit.s.hp - Math.round(INVADERS.shieldDamage * (1 - shellArmor(state, economy))));
      shieldSegment = hit.i;
    }
  } else {
    const planet = planetById(state, inv.target)!;
    const residents = Object.values(state.units).filter((u) => u.planetId === planet.id);
    const stock = economyOf(state, planet) ?? economy;
    for (const s of planet.segments) {
      const stats = buildingStats(s);
      if (!stats?.battery) continue;
      let crew = residents.filter((u) => u.segment === s.index).length;
      // Missile launchers fire only while there is fuel for them.
      if (stats.ammo) {
        crew = Math.min(crew, Math.floor(stock.resources[stats.ammo.resource] / stats.ammo.perShot));
        stock.resources[stats.ammo.resource] -= crew * stats.ammo.perShot;
      }
      damage += stats.battery * crew;
    }
    const defenders = residents.filter((u) => u.segment === null).slice(0, 10);
    const defense = planetDefense(state, planet);
    for (const d of defenders) {
      if (inv.hp - damage <= 0) break;
      const ours = rng.int(1, RULES.battleDie) + defense;
      const theirs = rng.int(1, RULES.battleDie) + inv.bonus;
      if (ours >= theirs) damage++;
      else if (residents.length - defenderLosses > INVADERS.minSurvivors) {
        delete state.units[d.id];
        defenderLosses++;
      }
    }
    if (inv.hp - damage > 0 && planetShield(state, planet) === 0) {
      // Nobody fought back: the surface burns along with the building.
      const undefended = damage === 0 && defenders.length === 0;
      const built = planet.segments.filter((s) => s.building);
      if (built.length) {
        const s = rng.pick(built);
        destroyed = s.building;
        for (const u of residents) if (u.segment === s.index && state.units[u.id]) u.segment = null;
        s.building = null;
        s.builtBy = null;
        delete s.tier;
        s.ruin = true;
        if (undefended) scorched.push(s.index);
      }
      if (undefended) {
        const land = planet.segments.filter((s) => s.revealed && !s.scorched && !s.building && BIOMES[s.biome].buildable && !scorched.includes(s.index));
        for (let i = 0; i < INVADERS.scorchPerUndefendedRound && land.length; i++) scorched.push(land.splice(rng.int(0, land.length - 1), 1)[0]!.index);
      }
      for (const index of scorched) {
        const s = planet.segments[index]!;
        s.scorched = true;
        for (const d of s.deposits) if (!d.infinite) d.amount = 0;
        for (const u of residents) if (u.segment === index && state.units[u.id]) u.segment = null;
      }
      // Without anyone fighting back they take lives too.
      const alive = residents.filter((u) => state.units[u.id]);
      if (defenders.length === 0 && alive.length > INVADERS.minSurvivors) {
        delete state.units[rng.pick(alive).id];
        killed = 1;
      }
    }
  }
  inv.hp = Math.max(0, inv.hp - damage);
  events.push({ type: "siege", target: inv.target, damage, hp: inv.hp, defenderLosses, destroyed, killed, shieldSegment, ...(scorched.length ? { scorched } : {}) });

  if (inv.hp <= 0) {
    const loot: Partial<Record<ResourceId, number>> = {};
    for (const [r, v] of Object.entries(INVADERS.reward) as [ResourceId, number][]) {
      economy.resources[r] += v * inv.wave;
      loot[r] = v * inv.wave;
    }
    events.push({ type: "invasionDefeated", target: inv.target, wave: inv.wave, loot });
    endInvasion(state, rng);
  } else if (inv.target === "sun" ? state.tick >= inv.siegeEndTick : !hasResidents(state, inv.target)) {
    // The fleet never gives up on its own (Seb): it can't be fought at the sun, so after a while
    // it moves on to a populated planet; an emptied planet is left for the next populated one.
    moveOn(state, economy, inv, rng, events);
  }
}

/** Neutronium plates on the shield (WARP): share of shield damage they take away. */
function shellArmor(state: GameState, economy: EconomyState): number {
  let armor = 0;
  for (const p of state.planets) if (p.economyId === economy.id) for (const s of p.segments) armor += (s.building && BUILDINGS[s.building].shellArmor) || 0;
  return Math.min(WARP.maxShellArmor, armor);
}

function hasResidents(state: GameState, planetId: string): boolean {
  return Object.values(state.units).some((u) => u.planetId === planetId);
}

function moveOn(state: GameState, economy: EconomyState, inv: Invasion, rng: Rng, events: GameEvent[]): void {
  const planets = state.planets.filter((p) => p.economyId === economy.id && systemOf(p) === 0 && p.id !== inv.target && hasResidents(state, p.id));
  if (!planets.length) return;
  const from = inv.target;
  inv.target = rng.pick(planets).id;
  inv.sieging = false;
  inv.arrivalTick = state.tick + cycles(state, INVADERS.moveOnCycles);
  events.push({ type: "invasionMoved", from, target: inv.target, wave: inv.wave, arrivalTick: inv.arrivalTick });
}

function endInvasion(state: GameState, rng: Rng): void {
  state.invasion = null;
  state.nextWaveTick = state.tick + cycles(state, rng.int(...INVADERS.waveIntervalCycles));
}

/** Working segments push the supernova back; hints come from SUPERNOVA.firstHintCycle on. */
export function novaTickNow(state: GameState): number | null {
  if (state.sun.novaTick === null || state.sun.saved) return null;
  const working = state.sun.shield.filter((s) => s.built && s.hp >= SUPERNOVA.workingHp).length;
  return state.sun.novaTick + cycles(state, working * SUPERNOVA.delayPerSegmentCycles);
}

function supernovaCycle(state: GameState, events: GameEvent[]): void {
  const nova = novaTickNow(state);
  if (nova === null || state.result) return;
  const tpc = ticksPerCycle(state);
  if (state.tick >= nova) {
    state.result = { supernova: true };
    events.push({ type: "gameOver", result: state.result });
    return;
  }
  const cycle = Math.floor(state.tick / tpc);
  if (cycle >= SUPERNOVA.firstHintCycle && (cycle - SUPERNOVA.firstHintCycle) % SUPERNOVA.hintEveryCycles === 0) {
    events.push({ type: "sunWarning", cyclesLeft: Math.ceil((nova - state.tick) / tpc) });
  }
}

/** A shield flight reached the sun: build or repair, then the crew flies home. */
export function landAtSun(state: GameState, flight: Flight, events: GameEvent[]): void {
  const job = flight.shield!;
  const segment = state.sun.shield[job.segment]!;
  segment.built = true;
  segment.hp = 100;
  events.push({ type: "shieldBuilt", segment: job.segment, repaired: job.repair });
  if (!state.sun.saved && state.sun.novaTick !== null && state.sun.shield.every((s) => s.built && s.hp >= SUPERNOVA.workingHp)) {
    state.sun.saved = true;
    events.push({ type: "shieldComplete" });
  }
  const home = planetById(state, flight.from);
  if (!home) return;
  const duration = flight.arrivalTick - flight.launchTick;
  state.flights.push({ ...flight, id: `f${state.nextFlightId++}`, from: "sun", to: home.id, launchTick: state.tick, arrivalTick: state.tick + duration, shield: undefined });
}
