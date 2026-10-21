import { Assets, Spritesheet, Texture } from "pixi.js";

/**
 * Original art from the asset pipeline (scripts/assets). The atlases are generated, not
 * committed: without `assets:build` the game falls back to the placeholder drawing.
 */
interface AtlasIndex {
  scales: Record<string, Record<string, { atlas?: string; frame?: string; standalone?: string }>>;
  animations?: Record<string, { frames: string[]; fps: number }>;
}

/** Atlas categories the planet view needs. */
const CATEGORIES = ["biomes", "buildings", "peoples", "planets", "resources", "fx", "invaders", "space", "ui", "ships"];

const textures = new Map<string, Texture>();
let animations: NonNullable<AtlasIndex["animations"]> = {};
let ready = false;

/** True once the atlases are loaded. */
export function hasArt(): boolean {
  return ready;
}

/** Loads the atlases; resolves false (placeholders stay) if they were not built. */
export async function loadArt(): Promise<boolean> {
  try {
    const response = await fetch("assets/atlas/index.json");
    if (!response.ok) return false;
    const index = (await response.json()) as AtlasIndex;
    animations = index.animations ?? {};
    const scale = (window.devicePixelRatio || 1) > 1.25 ? "2" : "1";
    const entries = index.scales[scale] ?? index.scales["1"]!;
    // First page of each category; PixiJS follows related_multi_packs to the others.
    const sheets = new Set<string>();
    for (const e of Object.values(entries)) {
      if (e.atlas && CATEGORIES.some((c) => e.atlas!.endsWith(`/${c}@${scale}x.json`))) sheets.add(e.atlas);
    }
    const loaded = await Promise.all([...sheets].map((url) => Assets.load<Spritesheet>(url)));
    // Linked pages point back at each other.
    const seen = new Set<Spritesheet>();
    const collect = (sheet: Spritesheet) => {
      if (seen.has(sheet)) return;
      seen.add(sheet);
      for (const [name, texture] of Object.entries(sheet.textures)) textures.set(name, texture);
      for (const linked of sheet.linkedSheets) collect(linked);
    };
    for (const sheet of loaded) collect(sheet);
    ready = textures.size > 0;
    return ready;
  } catch (error) {
    console.warn("Art not loaded, using placeholders", error);
    return false;
  }
}

/** Frames and speed of an animation (e.g. fx.explosion), if all its frames are loaded. */
export function artAnimation(id: string): { textures: Texture[]; fps: number } | undefined {
  const anim = animations[id];
  const frames = anim?.frames.map((f) => textures.get(f));
  if (!anim || !frames || frames.some((t) => !t)) return undefined;
  return { textures: frames as Texture[], fps: anim.fps };
}

export function artTexture(id: string): Texture | undefined {
  return textures.get(id);
}

/** Sprite of a building at its stage, falling back to the first stage or the single-stage name. */
export function buildingArt(building: string, state?: "off" | "construction", tier = 1): Texture | undefined {
  const suffix = state ? `.${state}` : "";
  return textures.get(`building.${building}.t${tier}${suffix}`) ?? textures.get(`building.${building}.t1${suffix}`) ?? textures.get(`building.${building}${suffix}`);
}

/** Split sprites of a building with a moving part (scripts/assets/gen-parts.mjs), if it has one. */
export function buildingAnim(building: string, tier = 1): { key: string; back: Texture; part: Texture; front: Texture } | undefined {
  // A drawn higher stage wins over the first stage's animation.
  const keys = tier > 1 && textures.has(`building.${building}.t${tier}`) ? [`building.${building}.t${tier}`] : [`building.${building}.t1`, `building.${building}`];
  for (const key of keys) {
    const back = textures.get(`${key}.anim.back`);
    const part = textures.get(`${key}.anim.part`);
    const front = textures.get(`${key}.anim.front`);
    if (back && part && front) return { key, back, part, front };
  }
  return undefined;
}

/** Frames of an animated asset (`<id>.f1`, `<id>.f2`, …); empty if not loaded. */
export function artFrames(id: string): Texture[] {
  const frames: Texture[] = [];
  for (let f = 1; textures.has(`${id}.f${f}`); f++) frames.push(textures.get(`${id}.f${f}`)!);
  return frames;
}

/** Single PNG of a resource icon for HTML (generated next to the atlases). */
export function resourceIconUrl(resource: string): string {
  return `assets/sprites/resources/${resource}.png`;
}

/** Single PNG of a building for HTML buttons. */
export function buildingIconUrl(building: string): string {
  const id = textures.has(`building.${building}.t1`) ? `${building}-t1` : building;
  return `assets/sprites/buildings/${id}.png`;
}
