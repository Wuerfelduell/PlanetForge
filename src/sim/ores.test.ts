import { describe, expect, it } from "vitest";
import {
  advance,
  applyCommand,
  buildBlocker,
  BUILDINGS,
  createGame,
  economyOfPlayer,
  homePlanet,
  TICK_MS,
  upgradeState,
  type BiomeId,
  type BuildingId,
  type Command,
  type GameState,
  type SegmentState,
} from "./index";

const P1 = { id: "p1", name: "Seb" };
const clone = (g: GameState) => JSON.parse(JSON.stringify(g)) as GameState;

/** A fresh coop game with a hand-made strip of segments 0..n and plenty in stock. */
function world(biomes: BiomeId[], level = 9): GameState {
  const g = clone(createGame("ores", [P1], { now: 0, invaders: "off", goal: "endless" }));
  const home = homePlanet(g, P1.id)!;
  biomes.forEach((biome, i) => {
    const s = home.segments[i]!;
    s.biome = biome;
    s.revealed = true;
    s.building = null;
    s.deposits = [];
  });
  home.segments.at(-1)!.biome = "savanna";
  home.segments[biomes.length]!.biome = "savanna";
  const economy = economyOfPlayer(g, P1.id)!;
  economy.ascension.level = level;
  for (const r of Object.keys(economy.resources) as (keyof typeof economy.resources)[]) economy.resources[r] = 500;
  return g;
}

const seg = (g: GameState, i: number): SegmentState => homePlanet(g, P1.id)!.segments[i]!;
const econ = (g: GameState) => economyOfPlayer(g, P1.id)!;

function exec(g: GameState, cmd: Command): GameState {
  const r = applyCommand(g, P1.id, cmd, g.simTime);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

function build(g: GameState, segment: number, building: BuildingId, workers = 0): GameState {
  const planetId = homePlanet(g, P1.id)!.id;
  g = exec(g, { type: "build", planetId, segment, building });
  return workers ? exec(g, { type: "assign", planetId, segment, delta: workers }) : g;
}

const run = (g: GameState, seconds: number) => advance(g, g.simTime + seconds * 1000 + TICK_MS / 2);
const NEW_ORES = ["tin", "silver", "bauxite", "ilmenite", "platinum"];

describe("new ores", () => {
  it("the mine digs tin, a smelter with power makes bronze from copper and tin", () => {
    let g = world(["tundra", "savanna", "savanna"]);
    seg(g, 0).deposits = [{ resource: "tin", amount: 30, max: 30, infinite: false, byHand: false }];
    g = build(g, 0, "mine", 2);
    g = build(g, 1, "smelter", 1);
    g = build(g, 2, "power-wind");
    g = exec(g, { type: "setGather", planetId: homePlanet(g, P1.id)!.id, segment: 1, resource: "bronze" });
    const before = { copper: econ(g).resources.copper, tin: econ(g).resources.tin };
    g = run(g, 20);
    expect(econ(g).resources.bronze).toBeGreaterThan(500);
    expect(econ(g).resources.copper).toBeLessThan(before.copper);
    expect(seg(g, 0).deposits[0]!.amount).toBeLessThan(30);
  });

  it("titanium needs the smelter's second stage, platinum only the deep drill", () => {
    expect(BUILDINGS.smelter.crafts!.recipes).not.toContain("titanium");
    expect(BUILDINGS.smelter.upgrades![0]!.crafts!.recipes).toContain("titanium");
    expect(BUILDINGS.mine.upgrades!.at(-1)!.extracts!.resources).not.toContain("platinum");

    let g = world(["mountains", "savanna"]);
    seg(g, 0).deposits = [{ resource: "platinum", amount: 20, max: 20, infinite: false, byHand: false }];
    expect(buildBlocker(g, homePlanet(g, P1.id)!, seg(g, 0), "deep-drill")).toBeNull();
    g = build(g, 0, "deep-drill", 3);
    g = run(g, 5);
    expect(econ(g).resources.platinum).toBeGreaterThan(500);
  });

  it("platinum lies never on a start planet, but on asteroids", () => {
    let asteroidFields = 0;
    for (const seed of ["a", "b", "c", "d", "e", "f"]) {
      const g = createGame(seed, [P1], { now: 0 });
      const platinum = (p: GameState["planets"][number]) => p.segments.filter((s) => s.deposits.some((d) => d.resource === "platinum")).length;
      expect(platinum(homePlanet(g, P1.id)!)).toBe(0);
      asteroidFields += g.planets.filter((p) => p.type === "asteroid").reduce((n, p) => n + platinum(p), 0);
    }
    expect(asteroidFields).toBeGreaterThan(0);
  });

  it("every world has platinum somewhere, so the core drill can always be built", () => {
    // Without the guarantee these seeds drew no platinum field at all (playtest 2026-10-28).
    for (const seed of ["seed7", "seed24", "seed82"]) {
      const g = createGame(seed, [P1], { now: 0 });
      const fields = g.planets.filter((p) => p.segments.some((s) => s.deposits.some((d) => d.resource === "platinum")));
      expect(fields.length, seed).toBeGreaterThan(0);
      expect(fields.every((p) => p.startSlot === null), seed).toBe(true);
    }
  });

  it("old saves get the new ores and the platinum of a new game, once", () => {
    const fresh = createGame("old-ores", [P1], { now: 1000 });
    const old = clone(fresh);
    for (const p of old.planets) for (const s of p.segments) s.deposits = s.deposits.filter((d) => !NEW_ORES.includes(d.resource));
    for (const e of Object.values(old.economies)) for (const r of [...NEW_ORES, "bronze", "aluminium", "titanium"]) delete (e.resources as Record<string, number>)[r];
    const up = upgradeState(clone(old))!;
    const again = upgradeState(clone(up))!;
    for (const e of Object.values(again.economies)) expect(e.resources.titanium).toBe(0);
    const ores = (g: GameState) => g.planets.flatMap((p) => p.segments.flatMap((s) => s.deposits.filter((d) => NEW_ORES.includes(d.resource)).map((d) => `${p.id}.${s.index}.${d.resource}`))).sort();
    expect(ores(again)).toEqual(ores(fresh));
  });
});
