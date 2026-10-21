import { describe, expect, it } from "vitest";
import { applyCommand, createGame, economyOfPlayer, homePlanet, TERRAFORM_START_FILL, type GameState, type TerraformKind } from "./index";

const P1 = { id: "p1", name: "Seb" };
const home = (g: GameState) => homePlanet(g, P1.id)!;

function setup(biome: "forest" | "ocean" | "savanna") {
  const g = createGame("terra", [P1], { now: 1000 });
  const s = home(g).segments.find((x) => x.revealed && !x.building)!;
  s.biome = biome;
  s.deposits =
    biome === "forest"
      ? [{ resource: "wood", amount: 0, max: 80, infinite: false, byHand: true }, { resource: "food", amount: 25, max: 25, infinite: false, byHand: true }]
      : biome === "ocean"
        ? [{ resource: "food", amount: 40, max: 40, infinite: false, byHand: true }, { resource: "water", amount: 0, max: 0, infinite: true, byHand: true }]
        : [{ resource: "food", amount: 50, max: 50, infinite: false, byHand: true }];
  const r = economyOfPlayer(g, P1.id)!.resources;
  r.food = 50;
  r.sand = 50;
  r.clay = 50;
  return { g, index: s.index };
}

const act = (g: GameState, segment: number, kind: TerraformKind) => applyCommand(g, P1.id, { type: "terraform", planetId: home(g).id, segment, kind }, g.simTime);

describe("terraform", () => {
  it("replants a cleared forest, which then regrows", () => {
    const { g, index } = setup("forest");
    const r = act(g, index, "plantTrees");
    if (!r.ok) throw new Error(r.error);
    const wood = home(r.state).segments[index]!.deposits.find((d) => d.resource === "wood")!;
    expect(wood.amount).toBe(80 * TERRAFORM_START_FILL);
    expect(economyOfPlayer(r.state, P1.id)!.resources.food).toBe(45);
    // A full forest needs no planting.
    expect(act(r.state, index, "plantTrees").ok).toBe(true);
    wood.amount = 80;
    expect(act(r.state, index, "plantTrees").ok).toBe(false);
  });

  it("turns savanna into a young forest and keeps its food", () => {
    const { g, index } = setup("savanna");
    const r = act(g, index, "plantTrees");
    if (!r.ok) throw new Error(r.error);
    const s = home(r.state).segments[index]!;
    expect(s.biome).toBe("forest");
    expect(s.deposits.find((d) => d.resource === "wood")!.amount).toBe(80 * TERRAFORM_START_FILL);
    expect(s.deposits.find((d) => d.resource === "food")!.amount).toBe(25);
  });

  it("fills water with sand or earth", () => {
    const { g, index } = setup("ocean");
    const sand = act(g, index, "fillSand");
    if (!sand.ok) throw new Error(sand.error);
    expect(home(sand.state).segments[index]!.biome).toBe("desert");
    expect(home(sand.state).segments[index]!.gather).toBe("sand");
    expect(economyOfPlayer(sand.state, P1.id)!.resources.sand).toBe(20);
    const clay = act(g, index, "fillClay");
    if (!clay.ok) throw new Error(clay.error);
    expect(home(clay.state).segments[index]!.biome).toBe("savanna");
    expect(act(sand.state, index, "fillClay").ok).toBe(false);
  });

  it("drains a swamp with more sand", () => {
    const { g, index } = setup("ocean");
    const s = home(g).segments[index]!;
    s.biome = "swamp";
    s.deposits = [{ resource: "clay", amount: 70, max: 70, infinite: false, byHand: true }, { resource: "water", amount: 40, max: 40, infinite: false, byHand: false }];
    expect(act(g, index, "fillSand").ok).toBe(false);
    const r = act(g, index, "drainSwamp");
    if (!r.ok) throw new Error(r.error);
    expect(home(r.state).segments[index]!.biome).toBe("savanna");
    expect(home(r.state).segments[index]!.gather).toBe("food");
    expect(economyOfPlayer(r.state, P1.id)!.resources.sand).toBe(0);
  });

  it("needs the resources", () => {
    const { g, index } = setup("ocean");
    economyOfPlayer(g, P1.id)!.resources.sand = 5;
    const r = act(g, index, "fillSand");
    expect(r.ok).toBe(false);
  });
});
