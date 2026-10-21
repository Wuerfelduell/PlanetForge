import { describe, expect, it } from "vitest";
import { BIOMES, BUILDINGS, buildBlocker, createGame, economyOfPlayer, homePlanet } from "./index";

describe("ground layer", () => {
  it("gives every buildable biome something a mine can dig", () => {
    for (const [id, biome] of Object.entries(BIOMES)) {
      if (!biome.buildable) continue;
      expect(biome.deposits.some((d) => !d.byHand || BUILDINGS.mine.extracts!.resources.includes(d.resource)), id).toBe(true);
    }
  });

  it("allows a mine in the forest", () => {
    const g = createGame("ground", [{ id: "p1", name: "Seb" }], { now: 1000 });
    const planet = homePlanet(g, "p1")!;
    const forest = planet.segments.find((s) => s.revealed && s.biome === "forest" && !s.building)!;
    const economy = economyOfPlayer(g, "p1")!;
    Object.assign(economy.resources, { wood: 100, stone: 100 });
    economy.ascension.level = 1;
    expect(buildBlocker(g, planet, forest, "mine")).toBeNull();
  });
});

describe("old saves", () => {
  it("get the new ground deposits once", async () => {
    const { upgradeState } = await import("./index");
    const g = createGame("old", [{ id: "p1", name: "Seb" }], { now: 1000 });
    const forest = homePlanet(g, "p1")!.segments.find((s) => s.biome === "forest")!;
    forest.deposits = forest.deposits.filter((d) => d.byHand);
    const up = upgradeState(JSON.parse(JSON.stringify(g)))!;
    const again = upgradeState(JSON.parse(JSON.stringify(up)))!;
    const deposits = homePlanet(again, "p1")!.segments[forest.index]!.deposits;
    expect(deposits.filter((d) => !d.byHand).map((d) => d.resource).sort()).toEqual(["clay", "stone"]);
  });
});
