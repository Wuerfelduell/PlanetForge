import { describe, expect, it } from "vitest";
import { PEOPLES as PEOPLE_DEFS } from "../data/balance/peoples";
import { SUPPORTED_STATS } from "./discoveries";
import {
  advance,
  buildCost,
  createGame,
  economyOfPlayer,
  foodUpkeepPerCycle,
  homePlanet,
  modified,
  planetDefense,
  RULES,
  segmentOutput,
  TICK_MS,
  workerCapacity,
  type GameState,
  type PeopleId,
  type SegmentState,
} from "./index";

/** A solo game as `people`, one tick in (so the economy knows its people). */
function game(people: PeopleId): GameState {
  const g = createGame("5", [{ id: "p1", name: "Seb", people }], { now: 1000 });
  return advance(g, g.simTime + TICK_MS);
}
const econ = (g: GameState) => economyOfPlayer(g, "p1")!;
const home = (g: GameState) => homePlanet(g, "p1")!;
const field = (biome: string, building: string | null = null, deposits: SegmentState["deposits"] = []): SegmentState =>
  ({ index: 0, biome, building, deposits, revealed: true, builtBy: null, gather: deposits[0]?.resource ?? null }) as unknown as SegmentState;

describe("peoples", () => {
  it("only use stats the simulation reads", () => {
    const peopleOnly = ["buildCost", "workerSlots", "craftSpeed", "foodUpkeep", "tradeRate", "suitWear"];
    for (const [id, def] of Object.entries(PEOPLE_DEFS)) {
      for (const m of def.ability.modifiers) expect([...SUPPORTED_STATS, ...peopleOnly], `${id}: ${m.stat}`).toContain(m.stat);
    }
  });

  it("bring their start goods and start discovery", () => {
    const beavers = econ(game("burrowbeavers"));
    const coons = econ(game("swapcoons"));
    expect(beavers.resources.wood - coons.resources.wood).toBe(20 - 10);
    expect(coons.discoveries).toContain("trade-routes");
    expect(econ(game("echobats")).discoveries).toContain("crystal-lore");
    expect(beavers.peoples).toEqual(["burrowbeavers"]);
  });

  it("gather faster on their favorite biome and resource", () => {
    const g = game("quillfolk");
    const food = field("savanna", null, [{ resource: "food", amount: 50, max: 50, infinite: false, byHand: true }]);
    const wood = field("forest", null, [{ resource: "wood", amount: 50, max: 50, infinite: false, byHand: true }]);
    const base = RULES.handRatePerWorker;
    // Stachelvolk: savanna +30 %, food +25 %, Sammler +25 % on everything.
    expect(segmentOutput(home(g), food, 1, econ(g)).food).toBeCloseTo(base * 1.25 * 1.3 * 1.25 * RULES.foodOutputMul, 9);
    expect(segmentOutput(home(g), wood, 1, econ(g)).wood).toBeCloseTo(base * 1.25, 9);
  });

  it("Dammbiber pay less wood and planks", () => {
    expect(buildCost(econ(game("burrowbeavers")), { wood: 15, planks: 10, stone: 10 })).toEqual({ wood: 12, planks: 8, stone: 10 });
    expect(buildCost(econ(game("quillfolk")), { wood: 15 })).toEqual({ wood: 15 });
  });

  it("Stachelvolk regrow berries twice as fast", () => {
    const g = game("quillfolk");
    expect(modified(econ(g), "regenRate", 1, { resource: "food" })).toBe(2);
    expect(modified(econ(g), "regenRate", 1, { resource: "wood" })).toBe(1);
  });

  it("Axolinge are born faster and lose one fewer in battle", () => {
    const e = econ(game("axolings"));
    expect(modified(e, "birthTime", 100)).toBe(75);
    expect(modified(e, "battleLosses", 0)).toBeLessThan(0);
  });

  it("Panzerlinge and Hornkäfer roll +1 when defending", () => {
    const plain = planetDefense(game("quillfolk"), home(game("quillfolk")));
    const shell = game("shellguards");
    const beetle = game("hornbeetles");
    expect(planetDefense(shell, home(shell))).toBe(plain + 1);
    expect(planetDefense(beetle, home(beetle))).toBe(plain + 1);
  });

  it("Panzerlinge have one more miner, Gezeitenotter one more gatherer on the sea", () => {
    const mine = field("mountains", "mine");
    expect(workerCapacity(mine, econ(game("shellguards")))).toBe(workerCapacity(mine) + 1);
    const sea = field("ocean", null, [{ resource: "water", amount: 0, max: 0, infinite: true, byHand: true }]);
    expect(workerCapacity(sea)).toBe(2);
    expect(workerCapacity(sea, econ(game("tideotters")))).toBe(3);
    expect(workerCapacity(sea, econ(game("shellguards")))).toBe(2);
  });

  it("Dünenhüpfer save rocket fuel and gather faster in the desert", () => {
    const e = econ(game("dunehoppers"));
    expect(modified(e, "rocketFuel", 10)).toBeCloseTo(7, 9);
    expect(modified(e, "handGatherRate", 1, { biome: "desert" })).toBeCloseTo(1.2 * 1.3, 9);
  });

  it("Sterneulen spot invaders early and run better labs", () => {
    const e = econ(game("starowls"));
    expect(modified(e, "sightRadius", 0)).toBeGreaterThan(0);
    expect(modified(e, "buildingOutput", 1, { building: "lab", resource: "science" })).toBeCloseTo(1.2, 9);
  });

  it("Hornkäfer run the foundry faster", () => {
    const e = econ(game("hornbeetles"));
    expect(modified(e, "craftSpeed", 1, { building: "foundry" })).toBeCloseTo(1.2, 9);
    expect(modified(e, "craftSpeed", 1, { building: "sawmill" })).toBe(1);
  });

  it("Frostrobben eat less and wear out suits more slowly", () => {
    const seals = game("frostseals");
    const owls = game("starowls");
    expect(foodUpkeepPerCycle(seals, 10, econ(seals))).toBeCloseTo(foodUpkeepPerCycle(owls, 10, econ(owls)) * 0.8, 9);
    expect(modified(econ(seals), "suitWear", 1)).toBe(0.5);
  });

  it("Tauschbären trade better and get more back from demolishing", () => {
    const e = econ(game("swapcoons"));
    // Ability ×1.25 and their start discovery Handelswege ×1.25.
    expect(modified(e, "tradeRate", 1)).toBeCloseTo(1.25 * 1.25, 9);
    expect(modified(e, "demolishRefund", RULES.demolishRefund)).toBeCloseTo(RULES.demolishRefund + 0.3, 9);
  });

  it("Glimmschnecken house one more per building and run better biogas plants", () => {
    const e = econ(game("glowsnails"));
    expect(modified(e, "housing", 4, { building: "housing" })).toBe(5);
    expect(modified(e, "buildingOutput", 1, { building: "biogas-plant", resource: "oil" })).toBeCloseTo(1.3, 9);
  });

  it("Echoflatterer reveal one field further", () => {
    expect(modified(econ(game("echobats")), "revealRadius", RULES.buildRevealRadius)).toBe(RULES.buildRevealRadius + 1);
  });
});
