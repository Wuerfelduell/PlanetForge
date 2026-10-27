import { describe, expect, it } from "vitest";
import { createGame } from "../sim";
import { pack, unpack } from "./pack";

describe("pack", () => {
  it("round-trips a game state and makes it much smaller", async () => {
    const state = createGame("pack-test", [{ id: "p1", name: "A" }, { id: "p2", name: "B" }], { world: { planets: 16 } });
    const packed = await pack(state);
    expect(await unpack(packed)).toEqual(state);
    expect(packed.length).toBeLessThan(JSON.stringify(state).length / 3);
  });
});
