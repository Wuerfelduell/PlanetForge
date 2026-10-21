import { describe, expect, it } from "vitest";
import { applyCommand, BIOMES, buildBlocker, createGame, economyOfPlayer, homePlanet, type BiomeId, type GameState, type TerraformKind } from "./index";

const P1 = { id: "p1", name: "Seb" };
const home = (g: GameState) => homePlanet(g, P1.id)!;

/** A start planet whose revealed segment `index` (and its neighbors) get the given biomes. */
function setup(biome: BiomeId, neighbor?: BiomeId) {
  const g = createGame("ice-and-fire", [P1], { now: 1000 });
  const planet = home(g);
  const n = planet.segments.length;
  const turn = (i: number, b: BiomeId) => {
    const s = planet.segments[(i + n) % n]!;
    s.biome = b;
    s.building = null;
    s.deposits = BIOMES[b].deposits.map((d) => ({ resource: d.resource, amount: d.max, max: d.max, infinite: !!d.infinite, byHand: !!d.byHand }));
    s.gather = s.deposits.find((d) => d.byHand)?.resource ?? null;
  };
  turn(0, biome);
  turn(1, neighbor ?? "savanna");
  turn(-1, neighbor ?? "savanna");
  const r = economyOfPlayer(g, P1.id)!.resources;
  Object.assign(r, { food: 50, wood: 50, water: 50, stone: 50, clay: 50, planks: 50 });
  economyOfPlayer(g, P1.id)!.ascension.level = 5;
  return { g, planet, s: planet.segments[0]! };
}

const act = (g: GameState, kind: TerraformKind) => applyCommand(g, P1.id, { type: "terraform", planetId: home(g).id, segment: 0, kind }, g.simTime);

describe("ice and lava fields", () => {
  it("glacier: nothing to build, but it thaws to tundra", () => {
    const { g, planet, s } = setup("glacier");
    expect(buildBlocker(g, planet, s, "housing")).toBe("Auf Gletscher kann man nicht bauen");
    const r = act(g, "thawGlacier");
    if (!r.ok) throw new Error(r.error);
    expect(home(r.state).segments[0]!.biome).toBe("tundra");
    expect(economyOfPlayer(r.state, P1.id)!.resources.wood).toBe(20);
  });

  it("a glacier next door feeds a pump", () => {
    const { g, planet, s } = setup("savanna", "glacier");
    s.deposits = s.deposits.filter((d) => d.resource !== "water");
    expect(buildBlocker(g, planet, s, "pump")).toBeNull();
  });

  it("lava only takes what stands the heat, and cools to ash, which can be planted", () => {
    const { g, planet, s } = setup("lava");
    expect(buildBlocker(g, planet, s, "housing")).toBe("Nicht auf Lavafeld");
    expect(buildBlocker(g, planet, s, "foundry")).toBeNull();
    expect(buildBlocker(g, planet, s, "mine")).toBeNull();
    const cooled = act(g, "coolLava");
    if (!cooled.ok) throw new Error(cooled.error);
    const ash = home(cooled.state).segments[0]!;
    expect(ash.biome).toBe("ash");
    expect(buildBlocker(cooled.state, home(cooled.state), ash, "farm")).toBeNull();
    const planted = act(cooled.state, "plantTrees");
    if (!planted.ok) throw new Error(planted.error);
    expect(home(planted.state).segments[0]!.biome).toBe("forest");
  });

  it("ice and lava planets are made of their own fields", () => {
    const counts: Partial<Record<BiomeId, number>> = {};
    for (let seed = 0; seed < 40; seed++) {
      for (const p of createGame(`world-${seed}`, [P1]).planets) {
        if (p.type !== "ice" && p.type !== "lava") continue;
        for (const s of p.segments) counts[s.biome] = (counts[s.biome] ?? 0) + 1;
      }
    }
    expect(counts.glacier).toBeGreaterThan(0);
    expect(counts.lava).toBeGreaterThan(0);
    expect(counts.ash).toBeGreaterThan(0);
  });
});
