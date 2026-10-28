import { describe, expect, it } from "vitest";
import world from "../../art/manifest/world.json";
import scorched from "../../art/manifest/scorched.json";
import { SYSTEM } from "../sim/content";
import { WORLD_LIMITS } from "../sim/generate";

// The planet view only draws art when wedges exist for the planet's field count; otherwise it falls back to flat colors.
const counts = new Set<number>(SYSTEM.freePlanetSegments);
for (const base of [SYSTEM.startPlanetSegments, SYSTEM.coopStartPlanetSegments]) {
  for (const mul of Object.values(WORLD_LIMITS.sizeMul)) counts.add(Math.round(base * mul));
}
const ids = new Set([...world.assets, ...scorched.assets].map((a) => a.id));

describe("planet wedge art", () => {
  for (const n of [...counts].sort((a, b) => a - b)) {
    it(`has ground wedges and overlays for ${n} fields`, () => {
      const missing = ["biome.forest.wedge", "overlay.fog", "overlay.depleted", "overlay.selected", "overlay.scorched"].filter((id) => !ids.has(`${id}.${n}`));
      expect(missing).toEqual([]);
    });
  }
});
