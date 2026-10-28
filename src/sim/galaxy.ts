import { BIOMES, PEOPLE_IDS, PLANET_TYPE_IDS, RARE_RESOURCES, RESOURCE_IDS, RULES, SYSTEM, WARP, type PlanetTypeId, type ResourceId } from "./content";
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
  const homes = settled ? Math.min(count, WARP.settledPlanets + rng.int(0, 1)) : 0;
  const planets: PlanetState[] = [];
  for (let i = 0; i < count; i++) {
    const home = i < homes;
    const type: PlanetTypeId = home ? rng.pick(HOMELY) : rng.pick(PLANET_TYPE_IDS);
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
    planets.push({
      id: `w${system.index}p${i}`,
      name,
      type,
      orbit: { radius: i + 1, angle: rng.next() * Math.PI * 2 },
      startSlot: null,
      economyId: null,
      birthProgress: 0,
      segments,
      system: system.index,
    });
  }
  // Settled planets are not always the inner ones.
  const radii = planets.map((p) => p.orbit.radius);
  shuffle(radii, rng);
  planets.forEach((p, i) => (p.orbit.radius = radii[i]!));
  return { planets, homes: planets.slice(0, homes) };
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
