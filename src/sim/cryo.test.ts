import { describe, expect, it } from "vitest";
import { applyCommand, createGame, CRYO, PEOPLE_IDS, type GameState } from "./index";

const P1 = { id: "p1", name: "Seb", people: PEOPLE_IDS[0] };
const clone = (g: GameState) => JSON.parse(JSON.stringify(g)) as GameState;
const pods = (g: GameState) => g.planets.flatMap((p) => p.segments.filter((s) => s.cryo).map((s) => ({ planet: p, segment: s })));

describe("cryo pods", () => {
  it("lie hidden on free planets only, and the world around them stays the same", () => {
    let found = 0;
    for (const seed of ["a", "b", "c", "d", "e", "f"]) {
      const g = createGame(seed, [P1], { now: 0 });
      for (const { planet, segment } of pods(g)) {
        expect(planet.startSlot).toBeNull();
        expect(segment.revealed).toBe(false);
        expect(segment.cryo!.count).toBeGreaterThanOrEqual(CRYO.count[0]);
        found++;
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  it("thawing costs, adds inhabitants of another people and empties the pod", () => {
    const g = clone(createGame("b", [P1], { now: 0 }));
    const { planet, segment } = pods(g)[0]!;
    planet.economyId = "e0";
    segment.revealed = true;
    segment.cryo!.people = P1.people; // taken: the next free people wakes up instead
    const economy = g.economies.e0!;
    economy.resources.food = 100;
    economy.resources.science = 100;
    const count = segment.cryo!.count;
    const r = applyCommand(g, P1.id, { type: "thaw", planetId: planet.id, segment: segment.index }, 0);
    if (!r.ok) throw new Error(r.error);
    const woken = Object.values(r.state.units).filter((u) => u.planetId === planet.id);
    expect(woken).toHaveLength(count);
    expect(woken.every((u) => u.owner === P1.id && u.people === PEOPLE_IDS[1])).toBe(true);
    expect(r.state.economies.e0!.resources.science).toBe(100 - (CRYO.thawCost.science ?? 0));
    expect(r.state.planets.find((p) => p.id === planet.id)!.segments[segment.index]!.cryo).toBeUndefined();
    expect(r.events).toContainEqual(expect.objectContaining({ type: "thawed", count, people: PEOPLE_IDS[1] }));
    expect(applyCommand(r.state, P1.id, { type: "thaw", planetId: planet.id, segment: segment.index }, 0)).toEqual({ ok: false, error: "Hier liegt keine Kryokapsel" });
  });

  it("needs the planet and an explored field", () => {
    const g = clone(createGame("b", [P1], { now: 0 }));
    const { planet, segment } = pods(g)[0]!;
    expect(applyCommand(g, P1.id, { type: "thaw", planetId: planet.id, segment: segment.index }, 0)).toEqual({ ok: false, error: "Dieser Planet gehört dir nicht" });
    planet.economyId = "e0";
    expect(applyCommand(g, P1.id, { type: "thaw", planetId: planet.id, segment: segment.index }, 0)).toEqual({ ok: false, error: "Feld noch unerforscht" });
  });
});
