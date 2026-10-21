import { BUILDINGS, economyOf, housing, idleUnits, needsSuits, population, RULES, toolsWear, unitsOn, type GameState, type PlanetState } from "../sim";

/**
 * Contextual next-step hint. The original's biggest weakness is that it explains nothing;
 * this tells the player the one useful thing to do next.
 */
export function currentHint(state: GameState, planet: PlanetState, playerId: string): string {
  const economy = economyOf(state, planet);
  if (!economy) return "Auf diesem Planeten lebt noch niemand.";
  const buildings = planet.segments.filter((s) => s.building);
  const idle = idleUnits(state, planet, playerId).length;
  if (unitsOn(state, planet.id, playerId).every((u) => u.segment === null)) return "Dreh den Planeten, wähl ein freies Feld wie Wald und tipp auf ＋, damit deine Leute sammeln.";
  if (economy.starving) return "Hunger! Setz Einwohner auf Savanne oder Meer, oder bau eine Farm.";
  if (needsSuits(planet) && economy.resources.suits < unitsOn(state, planet.id).length * RULES.suits.perInhabitantPerCycle) {
    return "Hier gibt es keine Atemluft: ohne Raumanzüge stirbt jeden Umlauf ein Siedler. Die Werkstatt (Stufe 2) näht sie aus Stoff, Glas und Stahl.";
  }
  const inv = state.invasion;
  if (inv?.target === planet.id) {
    return inv.sieging
      ? "Belagerung! Nur freie Einwohner und Abwehrbatterien kämpfen. Nimm Leute von der Arbeit, sonst brennt der Boden."
      : "Invasoren im Anflug: freie Einwohner verteidigen, Arbeiter nicht. Mach Leute frei oder bau eine Abwehrbatterie.";
  }
  const cheapestWood = Math.min(...Object.values(BUILDINGS).map((b) => b.cost.wood ?? Infinity));
  const woodLeft = planet.segments.some((s) => s.revealed && !s.building && s.deposits.some((d) => d.resource === "wood" && (d.infinite || d.amount > 0)));
  if (economy.resources.wood < cheapestWood && !woodLeft && !planet.segments.some((s) => s.building === "forester")) {
    return "Kein freier Wald mehr: reiß ein Gebäude ab (gibt die Hälfte zurück) oder pflanze Bäume (🌱).";
  }
  if (!buildings.some((s) => s.building === "housing")) {
    return economy.resources.wood >= (BUILDINGS.housing.cost.wood ?? 0)
      ? "Genug Holz: bau eine Hütte am Rand, das deckt neue Felder auf."
      : "Sammle 15 Holz für eine Hütte.";
  }
  if (economy.resources.food < RULES.birthFoodCost && population(state, planet) < housing(state, planet)) {
    return `Für Nachwuchs braucht es ${RULES.birthFoodCost} Nahrung. Sammle Nahrung auf Savanne, Wald oder Meer.`;
  }
  if (idle > 0) return `${idle} deiner Einwohner haben nichts zu tun. Gib ihnen Arbeit.`;
  if (population(state, planet) >= housing(state, planet)) return "Alle Häuser sind voll. Eine weitere Hütte bringt mehr Einwohner.";
  if (economy.ascension.level === 0) return "Jeder Planetenumlauf bringt Aufstiegspunkte je Einwohner. Stufe 1 schaltet Mine und Pumpe frei.";
  if (economy.ascension.level === 1) return "Mit Minen förderst du auch Eisen. Stufe 2 schaltet das Labor frei.";
  if (toolsWear(economy) && economy.resources.tools <= 0 && planet.segments.some((s) => s.building && BUILDINGS[s.building].usesTools)) {
    return "Ohne Werkzeug arbeiten Minen und Sägewerke langsamer. Eine Werkstatt stellt Werkzeug her.";
  }
  if (planet.segments.some((s) => s.building === "launchpad") && economy.resources.fuel <= 0 && !planet.segments.some((s) => s.building === "refinery")) {
    return "Raketen brauchen Treibstoff: Pumpe auf ein Ölfeld, dann eine Raffinerie bauen.";
  }
  if (!planet.segments.some((s) => s.building === "launchpad")) return "Bau eine Startrampe: damit schickst du Einwohner zu freien Planeten und gründest Kolonien.";
  return "Bau ein Labor und sammle Wissen. Weitere Systeme folgen.";
}
