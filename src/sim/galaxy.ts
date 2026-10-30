import { BIOMES, PEOPLE_IDS, RARE_RESOURCES, RESOURCE_IDS, RULES, SYSTEM, WARP, type PlanetTypeId, type ResourceId } from "./content";
import { FACTIONS, factionName, pickPersonality } from "./diplomacy";
import { createSegment, newEconomy, placeRareDeposit, planetName, shuffle, startPlanetBiomes, weightedBiomes } from "./generate";
import { Rng, seedFromString } from "./rng";
import { ringDistance } from "./rules";
import { createUnit } from "./units";
import type { GameEvent, GameState, PlanetState, StarSystemState } from "./state";

/** Breathable planet types for the homes of foreign peoples. */
const HOMELY: PlanetTypeId[] = ["temperate", "arid", "ocean", "toxic"];

/**
 * Creates the neighbor systems (once, when the first warp gate is built). Everything comes from
 * own seed streams, so the same seed always finds the same systems, whenever the gate is built,
 * and the home system stays as it was.
 */
export function discoverSystems(state: GameState, events: GameEvent[]): void {
  if (state.systems || state.settings.mode !== "coop") return;
  const rng = new Rng(seedFromString(`${state.seed}:galaxy`));
  const specialties = WARP.specialties.map((s) => [...s]);
  shuffle(specialties, rng);
  // Sun by the system's main exotic matter (art: space.sun-nebula / -neutron / -crystal).
  const suns: Record<string, string> = { antimatter: "nebula", neutronium: "neutron", xenocrystal: "crystal" };

  // Seb: each system is inhabited with 30 %, but at least one and at most two are.
  const order = Array.from({ length: WARP.systems }, (_, i) => i + 1);
  let inhabited = order.filter(() => rng.next() < WARP.inhabitedChance);
  shuffle(inhabited, rng);
  if (inhabited.length < WARP.inhabited[0]) {
    const free = order.filter((i) => !inhabited.includes(i));
    shuffle(free, rng);
    inhabited = [...inhabited, ...free.slice(0, WARP.inhabited[0] - inhabited.length)];
  }
  inhabited = inhabited.slice(0, WARP.inhabited[1]);
  // Every exotic resource also lies in a system nobody lives in, so no one has to fight for it.
  const empty = order.filter((i) => !inhabited.includes(i));
  for (const r of ["antimatter", "neutronium", "xenocrystal"] as ResourceId[]) {
    if (empty.some((i) => specialties[i - 1]!.includes(r))) continue;
    specialties[empty[rng.int(0, empty.length - 1)]! - 1]!.push(r);
  }

  const usedNames = new Set(state.planets.map((p) => p.name));
  state.systems = [];
  for (const index of order) {
    let name = planetName(rng);
    while (usedNames.has(name)) name = planetName(rng);
    usedNames.add(name);
    const angle = ((index - 1) * Math.PI * 2) / WARP.systems + (rng.next() - 0.5) * 0.6;
    const distance = 0.8 + rng.next() * 0.4;
    const system: StarSystemState = {
      index,
      name,
      sun: suns[specialties[index - 1]![0]!]!,
      specialties: specialties[index - 1]!,
      position: { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance },
      faction: null,
    };
    state.systems.push(system);
    const settled = inhabited.includes(index);
    const { planets, homes } = generateSystemPlanets(state, system, settled, usedNames);
    state.planets.push(...planets);
    if (homes.length) system.faction = settlePeople(state, system, homes);
  }
  events.push({ type: "systemsFound", count: state.systems.length, inhabited: inhabited.length });
}

function generateSystemPlanets(state: GameState, system: StarSystemState, settled: boolean, usedNames: Set<string>): { planets: PlanetState[]; homes: PlanetState[] } {
  const rng = new Rng(seedFromString(`${state.seed}:system:${system.index}`));
  const count = rng.int(...WARP.planets);
  const homeCount = settled ? Math.min(count, WARP.settledPlanets + rng.int(0, 1)) : 0;
  // Foreign peoples live in the green zone, the main planet right in its middle.
  const homeSlots = Array.from({ length: count }, (_, i) => i)
    .sort((a, b) => Math.abs(share(a, count) - WARP.homeZone) - Math.abs(share(b, count) - WARP.homeZone))
    .slice(0, homeCount);
  const planets: PlanetState[] = [];
  for (let i = 0; i < count; i++) {
    const home = homeSlots.includes(i);
    let type = zoneType(rng, share(i, count));
    if (home && !HOMELY.includes(type)) type = rng.pick(HOMELY);
    planets.push(systemPlanet(rng, system, `w${system.index}p${i}`, type, home, usedNames));
  }
  layOut(planets, rng);
  return { planets, homes: homeSlots.map((i) => planets[i]!) };
}

/** How far out orbit slot `i` of `count` lies: 0 innermost, 1 outermost. */
function share(i: number, count: number): number {
  return count > 1 ? i / (count - 1) : 0;
}

/** Seb: hot planets near the sun, ice far out, the breathable ones in between. */
function zoneType(rng: Rng, at: number): PlanetTypeId {
  return rng.pick((WARP.zones.find((z) => at <= z.until) ?? WARP.zones[WARP.zones.length - 1]!).types);
}

/** Hot to cold, for sorting planets of an existing system onto the orbit slots. */
const HEAT: Record<PlanetTypeId, number> = { lava: 0, toxic: 1, arid: 2, asteroid: 2.5, temperate: 3, ocean: 4, ice: 5 };

/**
 * Orbits in list order, evenly out to WARP.maxOrbit; neighbors sit a golden angle apart around the
 * sun, so even twelve planets never overlap on the star map.
 */
function layOut(planets: PlanetState[], rng: Rng): void {
  const n = planets.length;
  planets.forEach((p, i) => {
    p.orbit = { radius: 1 + share(i, n) * (WARP.maxOrbit - 1), angle: (i * 2.399963 + rng.next() * 0.6) % (Math.PI * 2) };
  });
}

function systemPlanet(rng: Rng, system: StarSystemState, id: string, type: PlanetTypeId, home: boolean, usedNames: Set<string>): PlanetState {
  const size = rng.pick(SYSTEM.freePlanetSegments);
  const biomes = home ? startPlanetBiomes(rng, size, type, true) : weightedBiomes(rng, type, size);
  const segments = biomes.map((biome, index) => createSegment(index, biome, rng));
  for (const r of Object.keys(RARE_RESOURCES) as ResourceId[]) if (rng.next() < 0.4) placeRareDeposit(rng, segments, r, home);
  // Exotic matter: the reason to come here. Settled planets keep it outside their start area.
  const fields = rng.int(...WARP.fields);
  for (let f = 0; f < fields; f++) {
    const resource = rng.pick(system.specialties);
    const pool = segments.filter((s) => BIOMES[s.biome].buildable && !s.deposits.some((d) => WARP.specialties.flat().includes(d.resource)) && (!home || ringDistance(s.index, 0, size) > RULES.startRevealRadius));
    if (!pool.length) continue;
    const amount = rng.int(...WARP.amount);
    rng.pick(pool).deposits.push({ resource, amount, max: amount, infinite: false, byHand: false });
  }
  let name = planetName(rng);
  while (usedNames.has(name)) name = planetName(rng);
  usedNames.add(name);
  return { id, name, type, orbit: { radius: 1, angle: 0 }, startSlot: null, economyId: null, birthProgress: 0, segments, system: system.index };
}

/**
 * Saves whose systems were found with 3–5 planets each get the missing ones (Seb: 7–12), and every
 * system is sorted by distance to its sun again. Planets that exist keep everything but their orbit.
 */
export function growSystems(state: GameState): void {
  if (!state.systems) return;
  const usedNames = new Set(state.planets.map((p) => p.name));
  for (const system of state.systems) {
    const own = state.planets.filter((p) => p.system === system.index);
    if (own.length >= WARP.planets[0]) continue;
    const rng = new Rng(seedFromString(`${state.seed}:system-grow:${system.index}`));
    const count = Math.max(own.length, rng.int(...WARP.planets));
    const wanted = Array.from({ length: count }, (_, i) => zoneType(rng, share(i, count)));
    const slots: (PlanetState | null)[] = Array<PlanetState | null>(count).fill(null);
    // Each planet that exists takes the free slot whose wished type is closest to its own.
    for (const planet of own.slice().sort((a, b) => HEAT[a.type] - HEAT[b.type])) {
      let best = -1;
      for (let i = 0; i < count; i++) {
        if (slots[i]) continue;
        if (best < 0 || Math.abs(HEAT[wanted[i]!] - HEAT[planet.type]) < Math.abs(HEAT[wanted[best]!] - HEAT[planet.type])) best = i;
      }
      slots[best] = planet;
    }
    const ids = new Set(state.planets.map((p) => p.id));
    let next = 0;
    for (let i = 0; i < count; i++) {
      if (slots[i]) continue;
      while (ids.has(`w${system.index}p${next}`)) next++;
      const id = `w${system.index}p${next}`;
      ids.add(id);
      const planet = systemPlanet(rng, system, id, wanted[i]!, false, usedNames);
      slots[i] = planet;
      state.planets.push(planet);
    }
    layOut(slots as PlanetState[], rng);
  }
}

/** A foreign people (an AI faction) on the given planets of a system. Returns its id. */
function settlePeople(state: GameState, system: StarSystemState, homes: PlanetState[]): string {
  const rng = new Rng(seedFromString(`${state.seed}:aliens:${system.index}`));
  const n = state.factions.length;
  const id = `ai${n}`;
  const economyId = `f${n}`;
  const economy = newEconomy(economyId);
  // Older than the team's neighbors at home: a people that has lived here for ages.
  economy.ascension.level = 8;
  for (const r of RESOURCE_IDS) economy.resources[r] += (RULES.startResources[r] ?? 0) * 3;
  state.economies[economyId] = economy;
  const taken = new Set(state.players.map((p) => p.people));
  const free = PEOPLE_IDS.filter((p) => !taken.has(p));
  const people = free.length ? rng.pick(free) : PEOPLE_IDS[n % PEOPLE_IDS.length]!;
  homes.forEach((planet, i) => {
    planet.economyId = economyId;
    planet.founder = id;
    for (const s of planet.segments) if (ringDistance(s.index, 0, planet.segments.length) <= RULES.startRevealRadius) s.revealed = true;
    for (let u = 0; u < (i === 0 ? WARP.people.main : WARP.people.other); u++) createUnit(state, id, people, planet.id);
  });
  const personality = pickPersonality(rng, state.factions.map((f) => f.personality));
  state.players.push({ id, name: factionName(people), color: SYSTEM.maxPlayers + n, people, economyId, homePlanetId: homes[0]!.id, joinedTick: state.tick, eliminated: false, surrendered: false, offersDraw: false, ai: true });
  state.factions.push({
    id,
    name: factionName(people),
    personality,
    attitude: FACTIONS.baseline[personality],
    stance: "peace",
    eliminated: false,
    stanceTick: state.tick,
    truceUntilTick: 0,
    offer: null,
    nextOfferTick: state.tick,
    nextProposalTick: 0,
    nextAttackTick: state.tick,
    trades: 0,
  });
  return id;
}
