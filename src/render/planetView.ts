import { AnimatedSprite, Application, Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import { BIOMES, BUILDINGS, workerCount, type GameEvent, type GameState, type PlanetState } from "../sim";
import { artAnimation, artTexture, buildingArt, hasArt } from "./art";

const TOP = -Math.PI / 2;
const TAP_SLOP_PX = 8;
const HIDDEN_COLOR = 0x2b3150;
const CORE_COLOR = 0x5a3b2e;
/** Ground band of the art: planet body radius 400, surface at 460 (art/BRIEF.md). */
const ART_SURFACE = 460;
const ART_BODY = 400;
/** Buildings are drawn for a 200 px footprint per segment (art/BRIEF.md). */
const ART_FOOTPRINT = 200;
const PROP_SIZE = 128;

/** Reuses sprites between redraws; one pool per layer keeps the draw order fixed. */
class SpritePool {
  readonly container = new Container();
  private readonly sprites: Sprite[] = [];
  private used = 0;

  begin(): void {
    this.used = 0;
  }

  take(texture: Texture): Sprite {
    let sprite = this.sprites[this.used];
    if (!sprite) {
      sprite = new Sprite();
      this.container.addChild(sprite);
      this.sprites.push(sprite);
    }
    this.used++;
    sprite.texture = texture;
    sprite.anchor.set(texture.defaultAnchor?.x ?? 0.5, texture.defaultAnchor?.y ?? 0.5);
    sprite.visible = true;
    sprite.alpha = 1;
    sprite.position.set(0, 0);
    sprite.rotation = 0;
    return sprite;
  }

  end(): void {
    for (let i = this.used; i < this.sprites.length; i++) this.sprites[i]!.visible = false;
  }
}

/** Player colors by PlayerState.color; the first one stays white for single player. */
const PLAYER_COLORS = [0xffffff, 0xffd166, 0x7bd3ff, 0xff8fab];

interface SegmentSprites {
  icon: Text;
  mystery: Text;
}

/**
 * Draws the planet wheel and handles rotate/tap input. Read-only towards the game: it renders a
 * GameState and reports which segment the player selected. Placeholder art until real assets land.
 */
export class PlanetView {
  readonly stage = new Container();
  private readonly stars = new Graphics();
  private readonly wheel = new Container();
  private readonly ground = new Graphics();
  private readonly marker = new Graphics();
  private sprites: SegmentSprites[] = [];
  /** One-shot effects (dust, explosions, rockets) on top of the wheel. */
  private readonly fx = new Container();
  private rockets: { sprite: Container; age: number; angle: number }[] = [];
  /** Art layers, bottom to top; empty while the placeholder drawing is used. */
  private readonly layers = { body: new SpritePool(), ground: new SpritePool(), props: new SpritePool(), buildings: new SpritePool(), citizens: new SpritePool(), overlays: new SpritePool() };
  private segmentCount = 0;

  private cx = 0;
  private cy = 0;
  private radius = 100;
  private rotation = 0;
  private targetRotation = 0;
  private selected = 0;
  private lastDrawnTick = -1;
  private dirty = true;

  private drag: { pointerId: number; startAngle: number; startRotation: number; startX: number; startY: number; moved: boolean; lastAngle: number; lastTime: number; velocity: number } | null = null;

  constructor(
    app: Application,
    private readonly onSelect: (index: number) => void,
  ) {
    this.stage.addChild(this.stars, this.wheel, this.marker);
    const l = this.layers;
    this.wheel.addChild(l.body.container, this.ground, l.ground.container, l.props.container, l.buildings.container, l.citizens.container, l.overlays.container, this.fx);
    this.bindInput(app.canvas);
  }

  /** Planet shown on the wheel. */
  planetId = "";

  /** Shows another planet (planets differ in size), starting at segment 0. */
  setPlanet(planetId: string, segmentCount: number): void {
    this.planetId = planetId;
    if (segmentCount !== this.segmentCount) {
      for (const sp of this.sprites) {
        sp.icon.destroy();
        sp.mystery.destroy();
      }
      this.sprites = [];
      for (let i = 0; i < segmentCount; i++) {
        const icon = new Text({ text: "", style: { fontSize: 28 } });
        icon.anchor.set(0.5, 0.9);
        const mystery = new Text({ text: "?", style: { fontSize: 20, fill: 0x8890b8, fontWeight: "700" } });
        mystery.anchor.set(0.5);
        this.wheel.addChild(icon, mystery);
        this.sprites.push({ icon, mystery });
      }
      this.segmentCount = segmentCount;
    }
    this.selected = 0;
    this.rotation = this.targetRotation = rotationFor(0, segmentCount);
    this.dirty = true;
    this.onSelect(0);
  }

  private planet(state: GameState) {
    return state.planets.find((p) => p.id === this.planetId) ?? state.planets[0]!;
  }

  /** Plays effects for events on the shown planet. Needs the art; silently does nothing without it. */
  play(events: GameEvent[], state: GameState): void {
    if (!hasArt()) return;
    const planet = this.planet(state);
    const step = (Math.PI * 2) / this.segmentCount;
    const segWidth = step * ART_SURFACE;
    for (const e of events) {
      switch (e.type) {
        case "built":
          if (e.planetId === planet.id) this.effect("fx.dust", e.segment * step, 1, segWidth * 1.4, 128);
          break;
        case "depleted":
          if (e.planetId === planet.id) this.effect("fx.resource-pop", e.segment * step, 1.15, segWidth * 0.8, 64);
          break;
        case "born":
          if (e.planetId === planet.id) this.effect("fx.heart", this.selected * step, 1.25, segWidth * 0.7, 64);
          break;
        case "levelUp":
          if (e.economyId === planet.economyId) this.effect("fx.ascension", 0, 0, ART_SURFACE * 1.6, 512);
          break;
        case "discovered":
          if (e.economyId === planet.economyId) this.effect("fx.sparkle", this.selected * step, 1.3, segWidth, 64);
          break;
        case "battle":
          if (e.planetId === planet.id) for (let i = 0; i < 3; i++) this.effect("fx.explosion", (this.selected + i * 3 - 3) * step, 1.05, segWidth * 1.6, 256);
          break;
        case "launched":
          if (e.from === planet.id) this.launchRocket(planet, step, segWidth);
          break;
        default:
          break;
      }
    }
  }

  /** One animation at `radius` × surface (0 = planet center), `size` in art units of the planet (surface = 460). */
  private effect(id: string, angle: number, radius: number, size: number, artSize: number): void {
    const anim = artAnimation(id);
    if (!anim) return;
    const k = this.radius / ART_SURFACE;
    const sprite = new AnimatedSprite(anim.textures);
    sprite.anchor.set(0.5);
    sprite.loop = false;
    sprite.animationSpeed = anim.fps / 60;
    sprite.scale.set((k * size) / artSize);
    sprite.position.set(Math.cos(angle) * this.radius * radius, Math.sin(angle) * this.radius * radius);
    sprite.rotation = angle + Math.PI / 2;
    sprite.onComplete = () => sprite.destroy();
    this.fx.addChild(sprite);
    sprite.play();
  }

  private launchRocket(planet: PlanetState, step: number, segWidth: number): void {
    const body = artTexture("building.rocket-small");
    const flame = artAnimation("fx.rocket-flame");
    if (!body) return;
    const pad = planet.segments.find((s) => s.building === "launchpad")?.index ?? this.selected;
    const k = this.radius / ART_SURFACE;
    const rocket = new Container();
    const hull = new Sprite(body);
    hull.anchor.set(0.5, 0.9);
    rocket.addChild(hull);
    if (flame) {
      const fire = new AnimatedSprite(flame.textures);
      fire.anchor.set(0.5, 0);
      fire.animationSpeed = flame.fps / 60;
      fire.position.set(0, 0);
      fire.scale.set(0.6);
      fire.play();
      rocket.addChildAt(fire, 0);
    }
    rocket.scale.set((k * segWidth) / 200);
    const angle = pad * step;
    rocket.rotation = angle + Math.PI / 2;
    this.fx.addChild(rocket);
    this.rockets.push({ sprite: rocket, age: 0, angle });
  }

  private updateRockets(deltaMs: number): void {
    for (const r of this.rockets) {
      r.age += deltaMs;
      // Ease out of the atmosphere over 2.5 s, fading at the end.
      const t = Math.min(1, r.age / 2500);
      const dist = this.radius * (1 + 1.6 * t * t);
      r.sprite.position.set(Math.cos(r.angle) * dist, Math.sin(r.angle) * dist);
      r.sprite.alpha = 1 - Math.max(0, t - 0.7) / 0.3;
    }
    for (const r of this.rockets.filter((x) => x.age >= 2500)) r.sprite.destroy({ children: true });
    this.rockets = this.rockets.filter((x) => x.age < 2500);
  }

  /** Redraws on the next frame, e.g. after the art finished loading. */
  invalidate(): void {
    this.dirty = true;
  }

  get selectedIndex(): number {
    return this.selected;
  }

  /** Area left free between the HUD (top) and the panel (bottom). */
  layout(width: number, height: number, topInset: number, bottomInset: number): void {
    const free = Math.max(120, height - topInset - bottomInset);
    this.radius = Math.min(width * 0.4, free * 0.4);
    this.cx = width / 2;
    this.cy = topInset + free / 2 + this.radius * 0.06;
    this.drawStars(width, height);
    this.dirty = true;
  }

  select(index: number): void {
    const n = this.segmentCount;
    const current = this.rotation;
    // Turn the shortest way round.
    let target = rotationFor(index, n);
    while (target - current > Math.PI) target -= Math.PI * 2;
    while (target - current < -Math.PI) target += Math.PI * 2;
    this.targetRotation = target;
    this.setSelected(index);
  }

  update(state: GameState, deltaMs: number): void {
    if (!this.drag) {
      const k = Math.min(1, deltaMs / 80);
      this.rotation += (this.targetRotation - this.rotation) * k;
    }
    this.wheel.position.set(this.cx, this.cy);
    this.wheel.rotation = this.rotation;
    this.updateRockets(deltaMs);
    if (this.dirty || state.tick !== this.lastDrawnTick) {
      this.draw(state);
      this.lastDrawnTick = state.tick;
      this.dirty = false;
    }
  }

  private setSelected(index: number): void {
    if (index === this.selected) return;
    this.selected = index;
    this.dirty = true;
    this.onSelect(index);
  }

  private draw(state: GameState): void {
    const planet = this.planet(state);
    const art = hasArt() && planet.segments.length === this.segmentCount && artTexture(`biome.forest.wedge.${this.segmentCount}`);
    for (const pool of Object.values(this.layers)) pool.begin();
    if (art) this.drawArt(state, planet);
    else this.drawPlaceholder(state);
    for (const pool of Object.values(this.layers)) pool.end();
    this.drawMarker();
  }

  /** Original art: planet body, ground wedges, props, buildings and working inhabitants. */
  private drawArt(state: GameState, planet: PlanetState): void {
    const n = this.segmentCount;
    const step = (Math.PI * 2) / n;
    const R = this.radius;
    const k = R / ART_SURFACE;
    const segWidth = step * ART_SURFACE;
    const l = this.layers;
    const g = this.ground;
    g.clear();
    for (const sp of this.sprites) {
      sp.icon.visible = false;
      sp.mystery.visible = false;
    }

    g.circle(0, 0, R * 1.08).fill({ color: 0x7fb0ff, alpha: 0.08 });
    const body = artTexture(`planet.planet-${planet.type}`);
    if (body) l.body.take(body).scale.set(k);
    else g.circle(0, 0, ART_BODY * k).fill(CORE_COLOR);

    const wedge = (id: string, i: number) => {
      const texture = artTexture(`${id}.${n}`);
      if (!texture) return;
      const sprite = (id.startsWith("overlay") ? l.overlays : l.ground).take(texture);
      sprite.scale.set(k);
      sprite.rotation = i * step + Math.PI / 2;
    };
    const multiplayer = state.players.length > 1;

    planet.segments.forEach((s, i) => {
      const mid = i * step;
      const surface = { x: Math.cos(mid) * R, y: Math.sin(mid) * R };
      if (!s.revealed) {
        g.poly(sector(ART_BODY * k, R, mid - step / 2, mid + step / 2)).fill(HIDDEN_COLOR);
        wedge("overlay.fog", i);
        return;
      }
      wedge(`biome.${s.biome}.wedge`, i);
      if (s.deposits.length > 0 && s.deposits.every((d) => !d.infinite && d.amount <= 0)) wedge("overlay.depleted", i);

      if (s.building) {
        const empty = BUILDINGS[s.building].workers > 0 && workerCount(state, planet, i) === 0;
        const texture = buildingArt(s.building, empty ? "off" : undefined);
        if (texture) {
          const sprite = l.buildings.take(texture);
          sprite.position.set(surface.x, surface.y);
          sprite.rotation = mid + Math.PI / 2;
          sprite.scale.set((k * segWidth) / ART_FOOTPRINT);
        }
      } else {
        const props = PROPS[s.biome] ?? [];
        const texture = props.length ? artTexture(`biome.${s.biome}.prop.${props[(i * 7) % props.length]}`) : undefined;
        if (texture) {
          const sprite = l.props.take(texture);
          sprite.position.set(surface.x, surface.y);
          sprite.rotation = mid + Math.PI / 2;
          sprite.scale.set((k * segWidth * 0.7) / PROP_SIZE);
        }
      }

      // Working inhabitants stand in front, each in their people's look.
      const workers = Object.values(state.units).filter((u) => u.planetId === planet.id && u.segment === i);
      workers.forEach((u, w) => {
        const frame = 1 + ((Math.floor(state.tick / 5) + w) % 2);
        const texture = artTexture(`people.${u.people}.citizen.work.f${frame}`) ?? artTexture(`people.${u.people}.citizen.idle.f1`);
        const a = mid - step / 2 + (step * (w + 1)) / (workers.length + 1);
        const x = Math.cos(a) * R;
        const y = Math.sin(a) * R;
        if (texture) {
          const sprite = l.citizens.take(texture);
          sprite.position.set(x, y);
          sprite.rotation = a + Math.PI / 2;
          sprite.scale.set((k * segWidth * 0.5) / PROP_SIZE);
        }
        if (multiplayer) {
          const owner = state.players.find((p) => p.id === u.owner);
          g.circle(Math.cos(a) * R * 0.97, Math.sin(a) * R * 0.97, Math.max(2.5, R * 0.018)).fill(PLAYER_COLORS[(owner?.color ?? 0) % PLAYER_COLORS.length]!);
        }
      });
    });

    if (artTexture(`overlay.selected.${n}`)) wedge("overlay.selected", this.selected);
    else {
      const sa0 = this.selected * step - step / 2;
      g.poly(sector(ART_BODY * k, R, sa0, sa0 + step)).stroke({ width: 3, color: 0xffffff });
    }
  }

  private drawPlaceholder(state: GameState): void {
    const n = this.segmentCount;
    const step = (Math.PI * 2) / n;
    const R = this.radius;
    const rInner = R * 0.62;
    const g = this.ground;
    g.clear();

    g.circle(0, 0, R * 1.08).fill({ color: 0x7fb0ff, alpha: 0.08 });
    g.circle(0, 0, rInner).fill(CORE_COLOR);
    g.circle(0, 0, rInner * 0.55).fill(0x7a4b34);

    const planet = this.planet(state);
    const workers = new Map<string, number>();
    for (const u of Object.values(state.units)) {
      if (u.planetId === planet.id && u.segment !== null) workers.set(`${u.owner}:${u.segment}`, (workers.get(`${u.owner}:${u.segment}`) ?? 0) + 1);
    }
    planet.segments.forEach((s, i) => {
      const a0 = i * step - step / 2;
      const a1 = a0 + step;
      const mid = i * step;
      const exhausted = s.deposits.length > 0 && s.deposits.every((d) => !d.infinite && d.amount <= 0);
      const color = s.revealed ? BIOMES[s.biome].color : HIDDEN_COLOR;
      g.poly(sector(rInner, R, a0, a1)).fill({ color, alpha: exhausted ? 0.55 : 1 });
      g.poly(sector(rInner, R, a0, a1)).stroke({ width: 1.5, color: 0x1a1d2e, alpha: 0.6 });

      // One dot per worker, tinted with the owner's player color.
      const dots = state.players.flatMap((p) => Array<number>(workers.get(`${p.id}:${i}`) ?? 0).fill(PLAYER_COLORS[p.color % PLAYER_COLORS.length]!));
      if (s.revealed) {
        dots.forEach((color, w) => {
          const a = a0 + (step * (w + 1)) / (dots.length + 1);
          const r = (rInner + R) / 2;
          g.circle(Math.cos(a) * r, Math.sin(a) * r, Math.max(3, R * 0.03)).fill(color).stroke({ width: 1.5, color: 0x1a1d2e });
        });
      }

      const sp = this.sprites[i]!;
      const iconText = s.revealed && s.building ? BUILDINGS[s.building].icon : "";
      if (sp.icon.text !== iconText) sp.icon.text = iconText;
      setFontSize(sp.icon, Math.max(16, R * 0.17));
      sp.icon.position.set(Math.cos(mid) * (R + 2), Math.sin(mid) * (R + 2));
      sp.icon.rotation = mid + Math.PI / 2;

      sp.mystery.visible = !s.revealed;
      setFontSize(sp.mystery, Math.max(12, R * 0.1));
      const rm = (rInner + R) / 2;
      sp.mystery.position.set(Math.cos(mid) * rm, Math.sin(mid) * rm);
      sp.mystery.rotation = mid + Math.PI / 2;
    });

    const sa0 = this.selected * step - step / 2;
    g.poly(sector(rInner, R, sa0, sa0 + step)).stroke({ width: 3, color: 0xffffff });
  }

  /** Fixed pointer above the wheel marking the "top" slot. */
  private drawMarker(): void {
    const R = this.radius;
    const m = this.marker;
    m.clear();
    const tipY = this.cy - R - R * 0.2;
    const size = Math.max(8, R * 0.06);
    m.poly([this.cx, tipY + size, this.cx - size, tipY - size * 0.4, this.cx + size, tipY - size * 0.4]).fill(0xffd166);
  }

  private drawStars(width: number, height: number): void {
    const g = this.stars;
    g.clear();
    let seed = 1234;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 140; i++) {
      g.circle(rand() * width, rand() * height, rand() * 1.4 + 0.3).fill({ color: 0xffffff, alpha: 0.25 + rand() * 0.6 });
    }
  }

  private bindInput(canvas: HTMLCanvasElement): void {
    const angleOf = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return Math.atan2(e.clientY - rect.top - this.cy, e.clientX - rect.left - this.cx);
    };

    canvas.addEventListener("pointerdown", (e) => {
      if (this.drag) return;
      canvas.setPointerCapture(e.pointerId);
      const angle = angleOf(e);
      this.drag = { pointerId: e.pointerId, startAngle: angle, startRotation: this.rotation, startX: e.clientX, startY: e.clientY, moved: false, lastAngle: angle, lastTime: performance.now(), velocity: 0 };
    });

    canvas.addEventListener("pointermove", (e) => {
      const d = this.drag;
      if (!d || d.pointerId !== e.pointerId) return;
      if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > TAP_SLOP_PX) d.moved = true;
      if (!d.moved) return;
      const angle = angleOf(e);
      const now = performance.now();
      const delta = wrapAngle(angle - d.lastAngle);
      const dt = Math.max(1, now - d.lastTime);
      d.velocity = d.velocity * 0.6 + (delta / dt) * 0.4;
      d.lastAngle = angle;
      d.lastTime = now;
      this.rotation += delta;
      this.targetRotation = this.rotation;
      this.setSelected(indexAtTop(this.rotation, this.segmentCount));
    });

    const end = (e: PointerEvent) => {
      const d = this.drag;
      if (!d || d.pointerId !== e.pointerId) return;
      this.drag = null;
      if (!d.moved) {
        const hit = this.hitTest(e, canvas);
        if (hit !== null) this.select(hit);
        return;
      }
      // Coast a little in the flick direction, then snap to the nearest segment.
      const coasted = this.rotation + d.velocity * 120;
      const index = indexAtTop(coasted, this.segmentCount);
      this.targetRotation = coasted + wrapAngle(rotationFor(index, this.segmentCount) - coasted);
      this.setSelected(index);
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }

  private hitTest(e: PointerEvent, canvas: HTMLCanvasElement): number | null {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - this.cx;
    const y = e.clientY - rect.top - this.cy;
    const dist = Math.hypot(x, y);
    if (dist > this.radius * 1.25) return null;
    const step = (Math.PI * 2) / this.segmentCount;
    const local = Math.atan2(y, x) - this.rotation;
    return mod(Math.round(local / step), this.segmentCount);
  }
}

/** Only touch the style when it changes; every style write re-rasterizes the text. */
function setFontSize(text: Text, size: number): void {
  const rounded = Math.round(size);
  if (text.style.fontSize !== rounded) text.style.fontSize = rounded;
}

function rotationFor(index: number, n: number): number {
  return TOP - index * ((Math.PI * 2) / n);
}

function indexAtTop(rotation: number, n: number): number {
  const step = (Math.PI * 2) / n;
  return mod(Math.round((TOP - rotation) / step), n);
}

/** Decoration per biome on empty segments (ids from the asset manifest). */
const PROPS: Partial<Record<string, string[]>> = {
  forest: ["tree-a", "tree-b", "tree-c"],
  savanna: ["acacia", "bush-a", "bush-b"],
  mountains: ["peak-a", "peak-b", "peak-c"],
  ocean: ["wave-a", "buoy", "wave-b"],
  desert: ["cactus-a", "dune", "cactus-b"],
  swamp: ["reed-a", "mushroom", "reed-b"],
  tundra: ["pine-snow-a", "ice-rock", "pine-snow-b"],
  crystal: ["crystal-a", "crystal-b", "crystal-c"],
};

function sector(r0: number, r1: number, a0: number, a1: number): number[] {
  const pts: number[] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pts.push(Math.cos(a) * r1, Math.sin(a) * r1);
  }
  for (let i = steps; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pts.push(Math.cos(a) * r0, Math.sin(a) * r0);
  }
  return pts;
}

function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}
