import { describe, expect, it } from "vitest";
import type { SegmentState } from "../sim";
import { propFill } from "./props";

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
