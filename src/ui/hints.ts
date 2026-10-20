import { assignedWorkers, BUILDINGS, housing, idleWorkers, type GameState, type PlanetState } from "../sim";

/**
 * Contextual next-step hint. The original's biggest weakness is that it explains nothing;
 * this tells the player the one useful thing to do next.
 */
export function currentHint(state: GameState, planet: PlanetState): string {
  const buildings = planet.segments.filter((s) => s.building);
  if (assignedWorkers(planet) === 0) return "Dreh den Planeten, wähl ein freies Feld wie Wald und tipp auf ＋, damit Einwohner sammeln.";
  if (planet.starving) return "Hunger! Setz Einwohner auf Savanne oder Meer, oder bau eine Farm.";
  if (!buildings.some((s) => s.building === "housing")) {
    return planet.resources.wood >= (BUILDINGS.housing.cost.wood ?? 0)
      ? "Genug Holz: bau eine Hütte am Rand, das deckt neue Felder auf."
      : "Sammle 15 Holz für eine Hütte.";
  }
  if (planet.resources.food < 10 && planet.population < housing(planet)) return "Für Nachwuchs braucht es 10 Nahrung. Sammle Nahrung auf Savanne, Wald oder Meer.";
  if (idleWorkers(planet) > 0) return `${idleWorkers(planet)} Einwohner haben nichts zu tun. Gib ihnen Arbeit.`;
  if (planet.population >= housing(planet)) return "Alle Häuser sind voll. Eine weitere Hütte bringt mehr Einwohner.";
  if (state.ascension.level === 0) return "Jeder Planetenumlauf bringt Aufstiegspunkte je Einwohner. Stufe 1 schaltet Mine und Pumpe frei.";
  if (state.ascension.level === 1) return "Mit Minen förderst du auch Eisen. Stufe 2 schaltet das Labor frei.";
  return "Bau ein Labor und sammle Wissen. Weitere Systeme folgen.";
}
