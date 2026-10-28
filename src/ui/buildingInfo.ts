import { BIOMES, BUILDINGS, RECIPES, RESOURCES, type BuildingDef, type BuildingId, type BuildingUpgrade, type ResourceId } from "../sim/content";

/** Renders one resource icon (Ui.res, so the art and name bubble come along). */
export type ResIcon = (resource: ResourceId) => string;

/** Rates: 0.5 stays 0.5, 0.35 stays 0.35, 2 stays 2. */
function num(v: number): string {
  return String(Math.round(v * 100) / 100).replace(".", ",");
}

function signed(v: number): string {
  return `${v > 0 ? "+" : "−"}${num(Math.abs(v))}`;
}

function list(res: ResIcon, items: Partial<Record<ResourceId, number>>): string {
  return Object.entries(items)
    .map(([r, v]) => `${v} ${res(r as ResourceId)}`)
    .join(" ");
}

function name(id: BuildingId): string {
  return `${BUILDINGS[id].icon} ${BUILDINGS[id].name}`;
}

/**
 * What a building (stage) does, one line each, made from its data alone: new buildings and
 * fields get their info without anyone writing it.
 */
export function statLines(def: Partial<BuildingDef>, res: ResIcon): string[] {
  const lines: string[] = [];
  const workers = def.workers ?? 0;
  if (def.housing) lines.push(`🏠 Wohnraum für ${def.housing} Einwohner`);
  if (workers) lines.push(`👤 bis zu ${workers} Arbeiter`);
  if (def.produces) {
    const { resource, perWorker } = def.produces;
    lines.push(`Erzeugt ${res(resource)} ${RESOURCES[resource].name}: +${num(perWorker)}/s je Arbeiter${workers > 1 ? `, voll besetzt +${num(perWorker * workers)}/s` : ""}`);
  }
  if (def.extracts) {
    const { resources, perWorker } = def.extracts;
    lines.push(`Baut aus dem Feld ab: ${resources.map((r) => res(r)).join(" ")} +${num(perWorker)}/s je Arbeiter${workers > 1 ? `, voll besetzt +${num(perWorker * workers)}/s` : ""}`);
  }
  if (def.crafts) {
    for (const id of def.crafts.recipes) {
      const r = RECIPES[id];
      const seconds = r.seconds / def.crafts.speed;
      const out = r.ascension ? `${list(res, r.outputs)}${r.ascension} ⭐` : list(res, r.outputs);
      lines.push(`Stellt her: ${list(res, r.inputs)} → ${out} <small>(${num(seconds)} s je Arbeiter)</small>`);
    }
  }
  if (def.energy) lines.push(def.energy > 0 ? `⚡ Liefert ${signed(def.energy)} Strom${workers ? " (voll besetzt)" : ""}` : `⚡ Braucht ${num(-def.energy)} Strom, ohne läuft es viel langsamer`);
  if (def.burns) lines.push(`Verbrennt ${res(def.burns.resource)} ${num(def.burns.perSecond)}/s, ohne gibt es keinen Strom`);
  if (def.defense) lines.push(`🛡️ Verteidigung ${signed(def.defense)} auf die Würfel der Verteidiger`);
  if (def.battery) lines.push(`💥 ${num(def.battery)} Schaden je Arbeiter und Runde an Invasoren-Schiffen`);
  if (def.ammo) lines.push(`Munition: ${res(def.ammo.resource)} ${num(def.ammo.perShot)} je Schuss`);
  if (def.intercept) lines.push(`🎯 Schießt ${num(def.intercept)} Angreifer ${workers ? "je Arbeiter " : ""}beim Anflug ab`);
  if (def.attack) lines.push(`⚔️ Angriff ${signed(def.attack)} für Kampfraketen von diesem Planeten`);
  if (def.shield) lines.push(`🔰 Schutzschild: Invasoren zerstören nichts, Angreifer würfeln ${num(def.shield)} weniger`);
  if (def.ascension) lines.push(`⭐ +${num(def.ascension)} Aufstiegspunkte je Zyklus`);
  if (def.shellArmor) lines.push(`🌞 Treffer auf die Schutzhülle machen ${num(def.shellArmor)} weniger Schaden`);
  return lines;
}

/** What a stage changes, with the stage below it: more workers also mean more output when full. */
function upgradeLine(below: BuildingDef, u: BuildingUpgrade, stage: number, res: ResIcon): string {
  const merged: BuildingDef = { ...below, ...u };
  const view: Partial<BuildingDef> = {};
  const keys = Object.keys(u).filter((k) => !["cost", "unlockLevel", "name", "icon"].includes(k)) as (keyof BuildingDef)[];
  if (u.workers) keys.push("produces", "extracts");
  for (const k of keys) (view as Record<string, unknown>)[k] = merged[k];
  const title = `Stufe ${stage}${u.name ? ` (${u.icon ? `${u.icon} ` : ""}${u.name})` : ""}`;
  const stats = statLines(view, res);
  return `<li><b>${title}</b> <small>ab Aufstieg ${u.unlockLevel} · ${list(res, u.cost)}</small><br>${stats.length ? stats.join("<br>") : "gleiche Werte"}</li>`;
}

/** The whole info card body for a building, as HTML. */
export function buildingInfoHtml(id: BuildingId, res: ResIcon, icon: string): string {
  const def = BUILDINGS[id];
  const notes: string[] = [];
  if (def.needsNeighbor) notes.push(`Muss neben ${def.needsNeighbor.map((b) => BIOMES[b].name).join(" oder ")} stehen`);
  if (def.needsDeposit) notes.push("Nur auf einem Feld mit passendem Vorkommen");
  if (def.usesTools) notes.push(`Arbeiter nutzen ${res("tools")} Werkzeug ab, ohne geht es langsamer`);
  if (def.forester) notes.push(`Benachbarte Wälder wachsen ${num(def.forester.neighborRegenMul)}× schneller nach${def.forester.replantsDepleted ? ", leere werden neu gepflanzt" : ""}`);
  if (def.unique) notes.push("Höchstens eins pro Planet");
  if (def.coopOnly) notes.push("Nur im Koop-Modus");
  const adjacency = (def.adjacency ?? [])
    .map((a) => `<span class="${a.bonus < 0 ? "bad" : "good"}">${signed(a.bonus * 100)} % ${a.building ? name(a.building) : BIOMES[a.biome!].name}</span>`)
    .join(", ");
  const stats = statLines(def, res);
  // Stages replace the values below them (see buildingStats), so each one is read on top of the last.
  let below = def;
  const upgrades = (def.upgrades ?? [])
    .map((u, i) => {
      const line = upgradeLine(below, u, i + 2, res);
      below = { ...below, ...u, cost: def.cost };
      return line;
    })
    .join("");
  return `<div class="binfo-head"><span class="icon">${icon}</span><div><b>${def.name}</b><small>Kostet ${list(res, def.cost)}${def.unlockLevel ? ` · ab Aufstieg ${def.unlockLevel}` : ""}</small></div></div>
    <p>${def.description}</p>
    ${stats.length ? `<ul>${stats.map((l) => `<li>${l}</li>`).join("")}</ul>` : ""}
    ${adjacency ? `<p><small>Je Nachbar:</small> ${adjacency}</p>` : ""}
    ${notes.length ? `<p><small>${notes.join(" · ")}</small></p>` : ""}
    <p><small>Baubar auf: ${def.allowedBiomes.map((b) => BIOMES[b].name).join(", ")}</small></p>
    ${upgrades ? `<p class="binfo-sub">Ausbaustufen</p><ul class="binfo-stages">${upgrades}</ul>` : ""}`;
}
