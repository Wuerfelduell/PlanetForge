import { BIOMES, PEOPLE_IDS, PEOPLES as PEOPLE_ICONS, type PeopleId } from "../sim";
import { PEOPLE_BASE, PEOPLES } from "../data/balance/peoples";
import { discoveryName } from "../sim";
import { RESOURCES } from "../data/balance/resources";

/** Portraits instead of emoji once the art is loaded (set by the main menu). */
export const peopleArt = { on: false };

/**
 * The 12 peoples as a portrait grid plus the chosen one's strengths. Buttons carry
 * `data-pick="people"` and `data-value=<id>`; taken peoples (online, coop) are disabled.
 */
export function peoplePickerHtml(chosen: PeopleId, taken: ReadonlySet<string> = new Set()): string {
  const face = (id: PeopleId) =>
    peopleArt.on ? `<img src="assets/sprites/peoples/${id}-portrait.png" alt="">` : `<span class="people-emoji">${PEOPLE_ICONS[id].icon}</span>`;
  const grid = PEOPLE_IDS.map((id) => {
    const gone = taken.has(id);
    const title = `${PEOPLES[id].name}${gone ? " (schon vergeben)" : ""}`;
    return `<button type="button" class="people-pick${id === chosen ? " on" : ""}" data-pick="people" data-value="${id}" title="${escape(title)}"${gone ? " disabled" : ""}>${face(id)}</button>`;
  }).join("");
  const def = PEOPLES[chosen];
  return `
    <div class="people-grid">${grid}</div>
    <div class="people-info">
      <b>${escape(def.name)}</b> <small>(${escape(def.animal)})</small>
      <p><b>${escape(def.ability.name)}:</b> ${escape(def.ability.description)}</p>
      <p class="people-note">Mag ${escape(BIOMES[def.favoriteBiome].name)} (+${pct(PEOPLE_BASE.favoriteBiomeBonus)} dort) und ${escape(RESOURCES[def.favoriteResource].name)} (+${pct(PEOPLE_BASE.favoriteResourceBonus)}) beim Sammeln und in Gebäuden.</p>
      <p class="people-note">Bringt mit: ${escape(startGoods(def))}</p>
    </div>`;
}

/** First people that is not taken, preferring `wanted`. */
export function freePeople(wanted: PeopleId, taken: ReadonlySet<string>): PeopleId {
  if (!taken.has(wanted)) return wanted;
  return PEOPLE_IDS.find((id) => !taken.has(id)) ?? wanted;
}

export function isPeopleId(value: unknown): value is PeopleId {
  return typeof value === "string" && (PEOPLE_IDS as readonly string[]).includes(value);
}

const OPTIONS_KEY = "planetforge.newGameOptions";

/** The people last picked in the new-game screen (stored with the other new-game options). */
export function preferredPeople(): PeopleId {
  try {
    const people = JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? "{}").people;
    return isPeopleId(people) ? people : PEOPLE_IDS[0];
  } catch {
    return PEOPLE_IDS[0];
  }
}

const pct = (bonus: number) => `${Math.round(bonus * 100)} %`;

/** Start goods and start discovery of a people, e.g. "20 Holz, Entdeckung Handelswege". */
function startGoods(def: (typeof PEOPLES)[PeopleId]): string {
  const goods = Object.entries(def.startBonus).map(([r, n]) => `${n} ${RESOURCES[r as keyof typeof RESOURCES].name}`);
  if (def.startDiscovery) goods.push(`Entdeckung ${discoveryName(def.startDiscovery)}`);
  return goods.join(", ");
}

function escape(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
