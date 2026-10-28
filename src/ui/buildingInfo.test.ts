import { describe, expect, it } from "vitest";
import { BUILDING_IDS, BUILDINGS } from "../sim/content";
import { buildingInfoHtml } from "./buildingInfo";

const res = (r: string) => `[${r}]`;

describe("building info card", () => {
  it("explains every building from its data", () => {
    for (const id of BUILDING_IDS) {
      const html = buildingInfoHtml(id, res, BUILDINGS[id].icon);
      expect(html).toContain(BUILDINGS[id].name);
      expect(html).not.toContain("undefined");
      expect(html).not.toContain("NaN");
    }
  });

  it("shows output per worker, full crew and the stages", () => {
    const html = buildingInfoHtml("farm", res, "🌾");
    expect(html).toContain("+0,5/s je Arbeiter, voll besetzt +1/s");
    // Stage 2 only adds workers: the full-crew output follows.
    expect(html).toContain("Stufe 2");
    expect(html).toContain("voll besetzt +2/s");
    expect(html).toContain("Bewässerte Farm");
    expect(html).toContain("Braucht 1 Strom");
  });
});
