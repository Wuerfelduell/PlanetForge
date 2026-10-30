import { describe, expect, it } from "vitest";
import type { SegmentState } from "../sim";
import { propFill, propOf } from "./props";

const forest = (wood: number): SegmentState => ({
  index: 0,
  biome: "forest",
  revealed: true,
  deposits: [
    { resource: "wood", amount: wood, max: 80, infinite: false, byHand: true },
    { resource: "food", amount: 25, max: 25, infinite: false, byHand: true },
  ],
  building: null,
  builtBy: null,
  gather: "wood",
});

const desert = (gather: "sand" | "water", index = 0): SegmentState => ({
  index,
  biome: "desert",
  revealed: true,
  deposits: [
    { resource: "sand", amount: 45, max: 90, infinite: false, byHand: true },
    { resource: "water", amount: 20, max: 20, infinite: false, byHand: true },
  ],
  building: null,
  builtBy: null,
  gather,
});

describe("propFill", () => {
  it("follows the deposit the prop stands for", () => {
    expect(propFill(forest(80))).toBe(1);
    expect(propFill(forest(40))).toBe(0.5);
    expect(propFill(forest(0))).toBe(0);
  });

  it("keeps props of biomes without a matching deposit", () => {
    expect(propFill({ ...forest(0), biome: "ocean" })).toBe(1);
  });
});

describe("propOf", () => {
  it("shows what is gathered: sand is the dune, never a cactus", () => {
    for (let i = 0; i < 6; i++) {
      expect(propOf(desert("sand", i))).toEqual({ id: "biome.desert.prop.dune", fill: 0.5 });
      expect(propOf(desert("water", i))!.id).toMatch(/cactus/);
    }
  });
});
