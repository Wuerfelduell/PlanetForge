import {
  BIOMES,
  CRYO,
  GEMS,
  PEOPLE_IDS,
  PLANET_TYPE_IDS,
  PLANET_TYPES,
  RARE_RESOURCES,
  RESOURCE_IDS,
  RULES,
  SUPERNOVA,
  SYSTEM,
  type BiomeId,
  type PeopleId,
  type PlanetTypeId,
  type ResourceId,
} from "./content";
import { Rng, seedFromString } from "./rng";
import { appendLog, advanceInPlace } from "./step";
import { createUnit } from "./units";
import { ringDistance } from "./rules";
import { FACTIONS, factionName, pickPersonality } from "./diplomacy";
import type { DepositState, Difficulty, EconomyState, GameMode, GameState, PlanetState, PlayerInit, SegmentState } from "./state";

export interface GameOptions {
  /** Start game time (ms). Later advance()/applyCommand() calls use the same clock. */
  now?: number;
  /** Default coop. */
  mode?: GameMode;
  /** Player limit. In versus also the number of start planets, so others can join later via addPlayer(). */
  maxPlayers?: number;
  cycleSeconds?: number;
  difficulty?: Difficulty;
  /** coop only (design 13.4); versus has neither. Defaults: supernova, normal. */
  goal?: "endless" | "supernova";
  invaders?: "off" | "normal" | "strong";
  /** coop only: AI factions that start on own planets at the same time (0 = none, at most FACTIONS.max). */
  factions?: number;
  /** How the star system looks (Seb: like Planet of Mine). Left out = random as before. */
  world?: WorldOptions;
}

export type SunType = (typeof SYSTEM.sunTypes)[number];
export type WorldSize = "small" | "normal" | "large";

/** Every field is optional; a missing field (or "random") keeps the seed's choice. */
export interface WorldOptions {
  /** Free planets besides the start planet(s), WORLD_LIMITS.planets (1-16). Missing: SYSTEM.freePlanets drawn from the seed. */
  planets?: number;
  /** Biome mix of the start planet(s). Missing: temperate; "random": one of PLANET_TYPE_IDS. */
  start?: (typeof PLANET_TYPE_IDS)[number] | "random";
  /** Missing or "random": drawn from the seed. */
  sun?: SunType | "random";
  /** Segments of the start planet(s). Missing: normal; "random": drawn from the seed. */
  size?: WorldSize | "random";
}

export const WORLD_LIMITS = {
  planets: { min: 1, max: 16 },
  sizeMul: { small: 0.75, normal: 1, large: 1.25 } as Record<WorldSize, number>,
} as const;

/**
 * Builds a whole star system from the seed: same seed, same system, on every client and on the
 * server. coop: one shared start planet. versus: one start planet per possible player, taken in
 * order; unused ones wait for later joiners. The first player is the host.
 */
export function createGame(seed: string, players: PlayerInit[], options: GameOptions = {}): GameState {
  const mode = options.mode ?? "coop";
  const maxPlayers = options.maxPlayers ?? SYSTEM.maxPlayers;
  if (players.length === 0) throw new Error("createGame needs at least one player");
  if (players.length > maxPlayers) throw new Error(`At most ${maxPlayers} players`);

  const rng = new Rng(seedFromString(seed));
  const world = options.world ?? {};
  // The seed's draw always happens, so a chosen sun leaves the rest of the world as it was.
  const seedSun = rng.pick(SYSTEM.sunTypes);
  const sunType = world.sun && world.sun !== "random" && SYSTEM.sunTypes.includes(world.sun) ? world.sun : seedSun;
  // Own stream for the random choices, so they don't shift the world either.
  const choice = new Rng(seedFromString(`${seed}:world`));
  const startType: PlanetTypeId =
    world.start === "random" ? choice.pick(PLANET_TYPE_IDS) : world.start && PLANET_TYPE_IDS.includes(world.start) ? world.start : "temperate";
  const sizes = Object.keys(WORLD_LIMITS.sizeMul) as WorldSize[];
  const size: WorldSize = world.size === "random" ? choice.pick(sizes) : world.size && sizes.includes(world.size) ? world.size : "normal";
  const freePlanets =
    typeof world.planets === "number" && Number.isFinite(world.planets)
      ? Math.min(WORLD_LIMITS.planets.max, Math.max(WORLD_LIMITS.planets.min, Math.round(world.planets)))
      : undefined;
  const cycleSeconds = options.cycleSeconds ?? RULES.defaultCycleSeconds;
  const goal = mode === "coop" ? (options.goal ?? "supernova") : "endless";
  // Own stream so the world itself stays the same as before the supernova existed.
  const novaCycle = new Rng(seedFromString(`${seed}:sun`)).int(...SUPERNOVA.cycles);
  const sun = {
    type: sunType,
    novaTick: goal === "supernova" ? novaCycle * Math.round(cycleSeconds * RULES.ticksPerSecond) : null,
    shield: Array.from({ length: SUPERNOVA.segments }, () => ({ built: false, hp: 0 })),
    saved: false,
  };
  const startSize = Math.round((mode === "coop" ? SYSTEM.coopStartPlanetSegments : SYSTEM.startPlanetSegments) * WORLD_LIMITS.sizeMul[size]);
  const factions = mode === "coop" ? Math.max(0, Math.min(FACTIONS.max, Math.floor(options.factions ?? 0))) : 0;
  const planets = generatePlanets(rng, mode === "coop" ? 1 : maxPlayers, startSize, startType, freePlanets, factions);
  planets.push(...generateAsteroids(new Rng(seedFromString(`${seed}:asteroids`)), planets));
  // Rockets burn fuel from oil: every start planet gets oil fields, from its own stream so worlds stay the same.
  const oilRng = new Rng(seedFromString(`${seed}:oil`));
  for (const p of planets) {
    if (p.startSlot === null) continue;
    // Two oil fields (playtest: one field was about one colony flight, and easy to build over).
    const oilFields = () => p.segments.filter((x) => x.deposits.some((d) => d.resource === "oil")).length;
    for (let tries = 0; tries < 6 && oilFields() < SYSTEM.oilFieldsPerStartPlanet; tries++) placeRareDeposit(oilRng, p.segments, "oil", true, true);
  }
  // Gems: one field on every start planet, now and then one elsewhere. Own stream as well.
  const gemRng = new Rng(seedFromString(`${seed}:gems`));
  for (const p of planets) {
    if (p.startSlot === null && gemRng.next() >= GEMS.planetChance) continue;
    const gem = gemRng.pick(GEMS.ids);
    const n = p.segments.length;
    const away = p.segments.filter((s) => p.startSlot === null || ringDistance(s.index, 0, n) > RULES.startRevealRadius);
    const fitting = away.filter((s) => GEMS.biomes[gem]!.includes(s.biome));
    const land = away.filter((s) => BIOMES[s.biome].buildable);
    const pool = fitting.length ? fitting : land;
    if (!pool.length) continue;
    const s = gemRng.pick(pool);
    const amount = gemRng.int(...GEMS.amount);
    s.deposits.push({ resource: gem, amount, max: amount, infinite: false, byHand: false });
  }
  // Cryo pods with frozen peoples on free planets, from their own stream as well.
  const cryoRng = new Rng(seedFromString(`${seed}:cryo`));
  for (const p of planets) {
    if (p.startSlot !== null || cryoRng.next() >= CRYO.planetChance) continue;
    const land = p.segments.filter((s) => BIOMES[s.biome].buildable);
    const s = cryoRng.pick(land.length ? land : p.segments);
    s.cryo = { people: cryoRng.pick(PEOPLE_IDS), count: cryoRng.int(...CRYO.count) };
  }

  let state: GameState = {
    version: 12,
    seed,
    rng: 0,
    simTime: options.now ?? 0,
    tick: 0,
    settings: {
      mode,
      cycleSeconds,
      goal,
      invaders: mode === "coop" ? (options.invaders ?? "normal") : "off",
      difficulty: options.difficulty ?? "normal",
      maxPlayers,
      factions,
    },
    lobby: { open: true, paused: false },
    hostId: players[0]!.id,
    players: [],
    economies: mode === "coop" ? { e0: newEconomy("e0") } : {},
    sun,
    invasion: null,
    nextWaveTick: null,
    wave: 0,
    planets,
    units: {},
    nextUnitId: 0,
    flights: [],
    nextFlightId: 0,
    queues: {},
    lastCombatTick: 0,
    drawSuggested: false,
    result: null,
    log: [],
    factions: [],
  };
  for (const p of players) {
    const result = addPlayer(state, p.id, p.name, state.simTime, p.people);
    if (!result.ok) throw new Error(result.error);
    state = result.state;
  }
  // Factions come after the humans, so they take peoples nobody picked. Own stream: the world stays the same.
  const factionRng = new Rng(seedFromString(`${seed}:factions`));
  for (let i = 0; i < factions; i++) addFaction(state, i, factionRng);
  state.rng = rng.seed;
  return state;
}

/** Seats AI faction `index` on start slot index + 1 with its own economy and the start package of a versus player. */
function addFaction(state: GameState, index: number, rng: Rng): void {
  const planet = state.planets.find((p) => p.startSlot === index + 1);
  if (!planet) throw new Error("Kein Startplanet für die Fraktion");
  const id = `ai${index}`;
  const economyId = `f${index}`;
  state.economies[economyId] = newEconomy(economyId);
  const economy = state.economies[economyId]!;
  for (const r of RESOURCE_IDS) economy.resources[r] += RULES.startResources[r] ?? 0;
  planet.economyId = economyId;
  for (const s of planet.segments) if (ringDistance(s.index, 0, planet.segments.length) <= RULES.startRevealRadius) s.revealed = true;
  const taken = new Set(state.players.map((p) => p.people));
  const free = PEOPLE_IDS.filter((p) => !taken.has(p));
  const people = free.length ? rng.pick(free) : PEOPLE_IDS[index % PEOPLE_IDS.length]!;
  for (let i = 0; i < RULES.startPopulation; i++) createUnit(state, id, people, planet.id);
  const personality = pickPersonality(rng, state.factions.map((f) => f.personality));
  // Colors after the four human ones.
  state.players.push({ id, name: factionName(people), color: SYSTEM.maxPlayers + index, people, economyId, homePlanetId: planet.id, joinedTick: 0, eliminated: false, surrendered: false, offersDraw: false, ai: true });
  state.factions.push({
    id,
    name: factionName(people),
    personality,
    attitude: FACTIONS.baseline[personality],
    stance: "peace",
    eliminated: false,
    stanceTick: 0,
    truceUntilTick: 0,
    offer: null,
    nextOfferTick: 0,
    nextProposalTick: 0,
    nextAttackTick: 0,
    trades: 0,
  });
}

/**
 * Lets a player join a running game, after simulating up to `now`. coop: joins the shared planet
 * and brings an own people. versus: takes the next free start planet with an own economy.
 * Never mutates the input.
 */
export function addPlayer(state: GameState, playerId: string, name: string, now: number, people?: PeopleId): { ok: true; state: GameState } | { ok: false; error: string } {
  if (state.players.some((p) => p.id === playerId)) return { ok: false, error: "Spieler ist schon dabei" };
  if (state.players.filter((p) => !p.ai).length >= state.settings.maxPlayers) return { ok: false, error: "Das Spiel ist voll" };
  if (state.result) return { ok: false, error: "Das Spiel ist vorbei" };
  const next = JSON.parse(JSON.stringify(state)) as GameState;
  const events = advanceInPlace(next, now);
  const coop = next.settings.mode === "coop";

  const planet = next.planets
    .filter((p) => p.startSlot !== null && (coop ? p.startSlot === 0 : p.economyId === null))
    .sort((a, b) => a.startSlot! - b.startSlot!)[0];
  if (!planet) return { ok: false, error: "Kein freier Startplanet mehr" };

  let economyId: string;
  if (coop) {
    economyId = "e0";
  } else {
    economyId = `e${Object.keys(next.economies).length}`;
    next.economies[economyId] = newEconomy(economyId);
  }

  const takenPeoples = new Set(next.players.map((p) => p.people));
  const chosen = people ?? PEOPLE_IDS.find((id) => !takenPeoples.has(id)) ?? PEOPLE_IDS[0];
  let arriving: number = RULES.coopJoinPopulation;
  if (planet.economyId === null) {
    planet.economyId = economyId;
    arriving = RULES.startPopulation;
    const economy = next.economies[economyId]!;
    for (const r of RESOURCE_IDS) economy.resources[r] += RULES.startResources[r] ?? 0;
    for (const s of planet.segments) {
      if (ringDistance(s.index, 0, planet.segments.length) <= RULES.startRevealRadius) s.revealed = true;
    }
  }
  for (let i = 0; i < arriving; i++) createUnit(next, playerId, chosen, planet.id);

  const usedColors = new Set(next.players.map((p) => p.color));
  let color = 0;
  while (usedColors.has(color)) color++;
  next.players.push({ id: playerId, name, color, people: chosen, economyId, homePlanetId: planet.id, joinedTick: next.tick, eliminated: false, surrendered: false, offersDraw: false });
  events.push({ type: "joined", playerId });
  appendLog(next, events);
  return { ok: true, state: next };
}

function newEconomy(id: string): EconomyState {
  return {
    id,
    resources: Object.fromEntries(RESOURCE_IDS.map((r) => [r, 0])) as Record<ResourceId, number>,
    ascension: { level: 0, points: 0 },
    starving: false,
    discoveries: [],
    picks: 0,
    offer: null,
  };
}

/**
 * `factions` > 0 (coop): slot 0 is the shared human planet, slots 1 … n belong to the AI factions
 * (versus-sized), and the belt gets one more free planet per faction. The rare resources are
 * split like in versus, so the team has a reason to trade. Big systems share orbits (compact).
 */
function generatePlanets(rng: Rng, startPlanets: number, startSize: number, startType: PlanetTypeId, chosenFree?: number, factions = 0): PlanetState[] {
  const drawnFree = rng.int(SYSTEM.freePlanets.min, SYSTEM.freePlanets.max);
  const freeCount = (chosenFree ?? drawnFree) + factions;
  const starts = startPlanets + factions;
  const kinds: (number | null)[] = [...Array.from({ length: starts }, (_, i) => i), ...Array<null>(freeCount).fill(null)];
  shuffle(kinds, rng);

  // A single (coop) start planet gets every rare resource; several (versus, factions) split them.
  const rarePackages = starts === 1 ? [Object.keys(RARE_RESOURCES) as ResourceId[]] : startRarePackages(rng, starts);
  const usedNames = new Set<string>();
  const compact = kinds.length > SYSTEM.compactFrom;

  return kinds.map((startSlot, i) => {
    const isStart = startSlot !== null;
    const factionPlanet = factions > 0 && startSlot !== null && startSlot > 0;
    // Faction homes are always temperate and versus-sized, whatever the team picked for its own start.
    const type: PlanetTypeId = isStart ? (factionPlanet ? "temperate" : startType) : rng.pick(PLANET_TYPE_IDS);
    const size = isStart ? (factionPlanet ? SYSTEM.startPlanetSegments : startSize) : rng.pick(SYSTEM.freePlanetSegments);
    const biomes = isStart ? startPlanetBiomes(rng, size, type, factionPlanet) : weightedBiomes(rng, type, size);
    const segments = biomes.map((biome, index) => createSegment(index, biome, rng));

    const rare = isStart
      ? rarePackages[startSlot]!
      : pickDistinct(rng, Object.keys(RARE_RESOURCES) as ResourceId[], rng.int(SYSTEM.rarePerFreePlanet.min, SYSTEM.rarePerFreePlanet.max));
    for (const resource of rare) placeRareDeposit(rng, segments, resource, isStart);

    let name = planetName(rng);
    while (usedNames.has(name)) name = planetName(rng);
    usedNames.add(name);

    return {
      id: `p${i}`,
      name,
      type,
      // Compact: at most SYSTEM.maxOrbit units out, spread around the sun by the golden angle so neighbors never overlap.
      orbit: compact ? { radius: 1 + (i * (SYSTEM.maxOrbit - 1)) / (kinds.length - 1), angle: (i * 2.399963 + rng.next() * 0.6) % (Math.PI * 2) } : { radius: i + 1, angle: rng.next() * Math.PI * 2 },
      startSlot,
      economyId: null,
      birthProgress: 0,
      segments,
    };
  });
}

/**
 * The asteroid belt: a few small rocks between the planet orbits, each with rare deposits. Own
 * random stream, so the planets of a seed stay the same as before asteroids existed.
 */
function generateAsteroids(rng: Rng, planets: PlanetState[]): PlanetState[] {
  const usedNames = new Set(planets.map((p) => p.name));
  const maxOrbit = Math.max(...planets.map((p) => p.orbit.radius));
  const count = rng.int(SYSTEM.asteroids.min, SYSTEM.asteroids.max);
  return Array.from({ length: count }, (_, i) => {
    const biomes = weightedBiomes(rng, "asteroid", SYSTEM.asteroids.segments);
    const segments = biomes.map((biome, index) => createSegment(index, biome, rng));
    const rare = pickDistinct(rng, Object.keys(RARE_RESOURCES) as ResourceId[], rng.int(SYSTEM.asteroids.rare.min, SYSTEM.asteroids.rare.max));
    for (const resource of rare) placeRareDeposit(rng, segments, resource, false);
    let name = planetName(rng);
    while (usedNames.has(name)) name = planetName(rng);
    usedNames.add(name);
    return {
      id: `a${i}`,
      name,
      type: "asteroid" as const,
      // Between two planet orbits, never on one.
      orbit: { radius: 1.5 + rng.int(0, Math.max(0, maxOrbit - 2)) + (rng.next() - 0.5) * 0.3, angle: rng.next() * Math.PI * 2 },
      startSlot: null,
      economyId: null,
      birthProgress: 0,
      segments,
    };
  });
}

/**
 * Splits the rare resources over the start slots so that the first two players together have
 * all of them and every player has something the others lack (design/koop-design.md, 4.1).
 */
function startRarePackages(rng: Rng, maxPlayers: number): ResourceId[][] {
  const rare = Object.keys(RARE_RESOURCES) as ResourceId[];
  shuffle(rare, rng);
  const half = Math.ceil(rare.length / 2);
  const evens = rare.filter((_, i) => i % 2 === 0);
  const odds = rare.filter((_, i) => i % 2 === 1);
  const patterns = [rare.slice(0, half), rare.slice(half), evens, odds];
  return Array.from({ length: maxPlayers }, (_, slot) => patterns[slot % patterns.length]!.slice(0, SYSTEM.rarePerStartPlanet));
}

function placeRareDeposit(
  rng: Rng,
  segments: SegmentState[],
  resource: ResourceId,
  keepStartArea: boolean,
  newField = false,
): void {
  const allowed = RARE_RESOURCES[resource]!;
  const n = segments.length;
  // On start planets the rare stuff waits outside the start area, as a reason to explore.
  // A new field skips segments that already hold this resource instead of topping them up.
  const eligible = segments.filter(
    (s) =>
      (!keepStartArea || ringDistance(s.index, 0, n) > RULES.startRevealRadius) &&
      (!newField || !s.deposits.some((d) => d.resource === resource)),
  );
  if (eligible.length === 0) return;
  let candidates = eligible.filter((s) => allowed.includes(s.biome));
  if (candidates.length === 0) {
    // Somewhere a mine can reach it, without wiping out another rare deposit placed before.
    const own = (s: SegmentState) => s.deposits.every((d) => BIOMES[s.biome].deposits.some((b) => b.resource === d.resource));
    const land = eligible.filter((s) => BIOMES[s.biome].buildable && own(s));
    const target = rng.pick(land.length ? land : eligible);
    const fresh = createSegment(target.index, allowed[0]!, rng);
    segments[target.index] = fresh;
    candidates = [fresh];
  }
  const segment = rng.pick(candidates);
  const max = Math.round(SYSTEM.rareDepositMax * (0.75 + rng.next() * 0.5));
  const existing = segment.deposits.find((d) => d.resource === resource);
  if (existing) {
    existing.max += max;
    existing.amount += max;
  } else {
    segment.deposits.push({ resource, amount: max, max, infinite: false, byHand: false });
  }
}

function startPlanetBiomes(rng: Rng, size: number, type: PlanetTypeId, openEdges = false): BiomeId[] {
  const r = RULES.startRevealRadius;
  // The visible start area always offers wood, food and stone, so every seed is playable.
  // Three forests (playtest: two built over meant no wood ever again). The old draw stays so
  // the rest of the world keeps its seed.
  rng.pick(["forest", "savanna", "mountains", "ocean", "swamp"]);
  const start = (["forest", "forest", "savanna", "mountains", "forest"] as BiomeId[]).slice(0, 2 * r + 1);
  shuffle(start, rng);
  // Outside the start area the planet shows its type; the start area stays the same everywhere.
  const rest = weightedBiomes(rng, type, size - start.length);
  if (!rest.includes("ocean")) rest[Math.floor(rest.length / 2)] = "ocean";

  // Segment 0 is the middle of the start window; the window wraps around index 0.
  const out = new Array<BiomeId>(size);
  for (let i = 0; i < start.length; i++) out[(i - r + size) % size] = start[i]!;
  for (let i = 0; i < rest.length; i++) out[r + 1 + i] = rest[i]!;
  // AI factions cannot think their way around a sea: the fields next to their start window are land.
  if (openEdges) for (const i of [r + 1, size - r - 1]) if (!BIOMES[out[i]!].buildable) out[i] = "savanna";
  return out;
}

/** Biomes in runs of 1–3 equal segments, drawn by the planet type's weights. */
function weightedBiomes(rng: Rng, type: PlanetTypeId, count: number): BiomeId[] {
  const weights = Object.entries(PLANET_TYPES[type].biomeWeights) as [BiomeId, number][];
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  const draw = (): BiomeId => {
    let x = rng.next() * total;
    for (const [biome, w] of weights) if ((x -= w) < 0) return biome;
    return weights[weights.length - 1]![0];
  };
  const out: BiomeId[] = [];
  let previous: BiomeId | null = null;
  while (out.length < count) {
    let biome = draw();
    if (biome === previous) biome = draw();
    const run = rng.int(1, 3);
    for (let i = 0; i < run && out.length < count; i++) out.push(biome);
    previous = biome;
  }
  return out;
}

const TINKER_DEPOSITS = new Set<string>(["fiber", "copper", "gold"]);

function createSegment(index: number, biome: BiomeId, rng: Rng): SegmentState {
  // Tinkering deposits vary from a side stream so worlds of older seeds stay the same.
  const side = new Rng(rng.seed ^ 0x5eed);
  const deposits: DepositState[] = BIOMES[biome].deposits.map((d) => {
    // ±25 % variation per segment.
    const max = d.infinite ? 0 : Math.round(d.max * (0.75 + (TINKER_DEPOSITS.has(d.resource) ? side : rng).next() * 0.5));
    return { resource: d.resource, amount: max, max, infinite: !!d.infinite, byHand: !!d.byHand };
  });
  return {
    index,
    biome,
    revealed: false,
    deposits,
    building: null,
    builtBy: null,
    gather: deposits.find((d) => d.byHand)?.resource ?? null,
  };
}

const SYLLABLES = ["ka", "lo", "mi", "ra", "ven", "tu", "sel", "dor", "ny", "quo", "bri", "za", "fen", "ol", "ix", "mar", "pe", "su"];

function planetName(rng: Rng): string {
  const parts = rng.int(2, 3);
  let name = "";
  for (let i = 0; i < parts; i++) name += rng.pick(SYLLABLES);
  return name[0]!.toUpperCase() + name.slice(1);
}

function pickDistinct<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const copy = [...items];
  shuffle(copy, rng);
  return copy.slice(0, Math.min(count, copy.length));
}

function shuffle<T>(items: T[], rng: Rng): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
}

/**
 * Brings a saved state from an older version up to date, or null if that is not possible.
 * 11 → 12: the tinkering resources start at 0 (new deposits only appear on new planets).
 * Resources that are new since a state was saved start at 0 too.
 */
export function upgradeState(state: unknown): GameState | null {
  const s = state as GameState | null;
  if (!s || typeof s !== "object") return null;
  if ((s.version as number) !== 11 && s.version !== 12) return null;
  // Resources added later (bricks, gold) are also filled into version 12 states.
  for (const economy of Object.values(s.economies)) for (const r of RESOURCE_IDS) economy.resources[r] ??= 0;
  // Saves from before AI factions existed simply have none.
  s.settings.factions ??= 0;
  s.factions ??= [];
  // Ground deposits added later (Seb: a mine works under a forest too) appear on existing fields.
  for (const planet of s.planets) {
    for (const segment of planet.segments) {
      if (segment.scorched) continue;
      for (const d of BIOMES[segment.biome].deposits) {
        if (d.byHand || segment.deposits.some((x) => x.resource === d.resource)) continue;
        segment.deposits.push({ resource: d.resource, amount: d.max, max: d.max, infinite: !!d.infinite, byHand: false });
      }
    }
  }
  // The market is gone (Seb: swapping water for ore felt like cheating): built ones are refunded in full.
  const marketCost: Partial<Record<ResourceId, number>> = { planks: 20, stone: 20, cloth: 5 };
  for (const planet of s.planets) {
    for (const segment of planet.segments) {
      if ((segment.building as string) !== "market") continue;
      const economy = planet.economyId ? s.economies[planet.economyId] : undefined;
      if (economy) for (const [r, n] of Object.entries(marketCost) as [ResourceId, number][]) economy.resources[r] += n;
      for (const u of Object.values(s.units)) if (u.planetId === planet.id && u.segment === segment.index) u.segment = null;
      segment.building = null;
      segment.builtBy = null;
      delete segment.tier;
    }
    if (s.queues[planet.id]) s.queues[planet.id] = s.queues[planet.id]!.filter((q) => (q.building as string) !== "market");
  }
  (s as { version: number }).version = 12;
  return s;
}
