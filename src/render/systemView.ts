import { Application, Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import { asteroidsVisible, INVADERS, SUPERNOVA, ticksPerCycle, type GameState } from "../sim";
import { artFrames, artTexture, hasArt } from "./art";

const TAP_SLOP_PX = 10;
const ZOOM_MAX = 5;
const PLAYER_COLORS = [0xffffff, 0xffd166, 0x7bd3ff, 0xff8fab];
const SUN_COLORS: Record<string, number> = { yellow: 0xffd23f, red: 0xff7a4d, blue: 0x8fc7ff, white: 0xf4f1ff };
const PLANET_COLORS: Record<string, number> = { temperate: 0x6fbf73, arid: 0xe0b35a, ice: 0xbfe6ff, lava: 0xe2603a, ocean: 0x4f8fdc, toxic: 0x9bd04a };
/** Sun body in sim units (orbit radius 1 is the innermost planet). */
const SUN_SIZE = 0.5;

/**
 * Star map: the sun with its shield shell, the planets on their orbits, rockets in flight and
 * invader fleets. Read-only towards the game like PlanetView; taps report the planet (or "sun").
 */
export class SystemView {
  readonly stage = new Container();
  private readonly back = new Graphics();
  private readonly lines = new Graphics();
  private readonly sprites = new Container();
  private readonly labels = new Container();
  private readonly front = new Graphics();
  private readonly pool: Sprite[] = [];
  private readonly texts: Text[] = [];
  private used = 0;
  private textsUsed = 0;

  private cx = 0;
  private cy = 0;
  /** Pixels per sim unit. */
  private scale = 40;
  /** Fit-all layout; zoom and pan (pinch, wheel, drag) apply on top, so big systems stay readable. */
  private base = { scale: 40, cx: 0, cy: 0, maxOrbit: 1 };
  private zoom = 1;
  private pan = { x: 0, y: 0 };
  /** Label boxes of the current draw, for collision avoidance. */
  private placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
  private width = 0;
  private height = 0;
  private time = 0;
  /** Planet ids and screen positions of the last draw, for taps. */
  private hits: { id: string; x: number; y: number; r: number }[] = [];

  /** Planet (or "sun") highlighted on the map. */
  selected: string | null = null;
  /** The local player: own planets and flights are marked. */
  playerId = "";

  constructor(
    app: Application,
    private readonly onSelect: (id: string) => void,
  ) {
    this.stage.addChild(this.back, this.lines, this.sprites, this.front, this.labels);
    this.stage.visible = false;
    this.bindInput(app.canvas);
  }

  layout(width: number, height: number, topInset: number, bottomInset: number, state: GameState): void {
    this.width = width;
    this.height = height;
    const free = Math.max(160, height - topInset - bottomInset);
    const maxOrbit = Math.max(1, ...state.planets.map((p) => p.orbit.radius));
    this.base = { scale: Math.min(width * 0.48, free * 0.48) / (maxOrbit + 0.45), cx: width / 2, cy: topInset + free / 2, maxOrbit };
    this.applyView();
  }

  private applyView(): void {
    this.zoom = Math.min(ZOOM_MAX, Math.max(1, this.zoom));
    // Pan only as far as the system reaches, and not at all when zoomed out.
    const reach = this.base.maxOrbit * this.base.scale * (this.zoom - 1);
    this.pan.x = Math.min(reach, Math.max(-reach, this.pan.x));
    this.pan.y = Math.min(reach, Math.max(-reach, this.pan.y));
    this.scale = this.base.scale * this.zoom;
    this.cx = this.base.cx + this.pan.x;
    this.cy = this.base.cy + this.pan.y;
  }

  /** Zooms by `factor` keeping the screen point (px, py) in place. */
  private zoomAt(factor: number, px: number, py: number): void {
    const wx = (px - this.cx) / this.scale;
    const wy = (py - this.cy) / this.scale;
    this.zoom *= factor;
    const scale = this.base.scale * Math.min(ZOOM_MAX, Math.max(1, this.zoom));
    this.pan.x = px - wx * scale - this.base.cx;
    this.pan.y = py - wy * scale - this.base.cy;
    this.applyView();
  }

  /**
   * Places a label at the first candidate anchor (dx, dy = side of the point) that overlaps no
   * earlier label; returns false when all do. `force` places it at the first candidate anyway.
   */
  private placeLabel(t: Text, x: number, y: number, dist: number, sides: [number, number][], force: boolean): boolean {
    const put = ([dx, dy]: [number, number]) => {
      t.anchor.set(0.5 - dx * 0.5, 0.5 - dy * 0.5);
      t.position.set(x + dx * dist, y + dy * dist);
      // Keep it on screen.
      const left = t.x - t.anchor.x * t.width;
      if (left < 4) t.x += 4 - left;
      else if (left + t.width > this.width - 4) t.x -= left + t.width - (this.width - 4);
      const x0 = t.x - t.anchor.x * t.width;
      const y0 = t.y - t.anchor.y * t.height;
      return { x0, y0, x1: x0 + t.width, y1: y0 + t.height };
    };
    for (const side of sides) {
      const box = put(side);
      if (!this.placed.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0)) {
        this.placed.push(box);
        return true;
      }
    }
    if (!force) return false;
    this.placed.push(put(sides[0]!));
    return true;
  }

  update(state: GameState, deltaMs: number): void {
    if (!this.stage.visible) return;
    this.time += deltaMs / 1000;
    this.draw(state);
  }

  /** Screen position of a planet (or the sun at the center). */
  private at(state: GameState, id: string): { x: number; y: number } {
    const planet = state.planets.find((p) => p.id === id);
    if (!planet) return { x: this.cx, y: this.cy };
    return { x: this.cx + Math.cos(planet.orbit.angle) * planet.orbit.radius * this.scale, y: this.cy + Math.sin(planet.orbit.angle) * planet.orbit.radius * this.scale };
  }

  private sprite(texture: Texture, x: number, y: number, size: number, rotation = 0): Sprite {
    let s = this.pool[this.used];
    if (!s) {
      s = new Sprite();
      s.anchor.set(0.5);
      this.pool.push(s);
      this.sprites.addChild(s);
    }
    this.used++;
    s.visible = true;
    s.texture = texture;
    s.position.set(x, y);
    s.rotation = rotation;
    s.alpha = 1;
    s.tint = 0xffffff;
    s.anchor.set(0.5);
    s.scale.set(size / Math.max(texture.width, texture.height));
    return s;
  }

  private label(text: string, x: number, y: number, size: number, color = 0xe8eaf6): Text {
    let t = this.texts[this.textsUsed];
    if (!t) {
      t = new Text({ text: "", style: { fontSize: 12, fill: 0xe8eaf6, fontWeight: "600", stroke: { color: 0x0e1022, width: 4 } } });
      this.texts.push(t);
      this.labels.addChild(t);
    }
    this.textsUsed++;
    t.visible = true;
    if (t.text !== text) t.text = text;
    if (t.style.fontSize !== size) t.style.fontSize = size;
    t.style.fill = color;
    t.anchor.set(0.5, 0);
    t.position.set(x, y);
    return t;
  }

  private draw(state: GameState): void {
    this.used = 0;
    this.textsUsed = 0;
    this.hits = [];
    this.placed = [];
    const g = this.back;
    const lines = this.lines;
    const front = this.front;
    g.clear();
    lines.clear();
    front.clear();
    const k = this.scale;
    const art = hasArt();
    const me = state.players.find((p) => p.id === this.playerId);
    const font = Math.max(11, Math.min(15, k * 0.28));

    // Orbits.
    for (const p of state.planets) if (p.type !== "asteroid") g.circle(this.cx, this.cy, p.orbit.radius * k).stroke({ width: 1.5, color: 0x8890b8, alpha: 0.25 });

    // Sun and its shield shell.
    const sunPx = SUN_SIZE * k * 2;
    const sunTexture = art ? artTexture(`space.sun-${state.sun.type}`) : undefined;
    // Sun and shell art share a 1024 canvas: glow to the edge, shell at radius 303-337.
    const canvasPx = k * 2.3;
    if (sunTexture) this.sprite(sunTexture, this.cx, this.cy, canvasPx).rotation = this.time * 0.05;
    else {
      g.circle(this.cx, this.cy, sunPx * 0.62).fill({ color: SUN_COLORS[state.sun.type] ?? 0xffd23f, alpha: 0.25 });
      g.circle(this.cx, this.cy, sunPx * 0.42).fill(SUN_COLORS[state.sun.type] ?? 0xffd23f);
    }
    if (state.sun.novaTick !== null) this.drawShield(state, canvasPx);
    this.hits.push({ id: "sun", x: this.cx, y: this.cy, r: sunPx * 0.6 });
    if (this.selected === "sun") front.circle(this.cx, this.cy, sunPx * 0.9).stroke({ width: 2.5, color: 0xffffff, alpha: 0.9 });

    // Planets: size by segment count, a ring in the owner's color. Asteroids need "Weltraumbergbau".
    const seeAsteroids = asteroidsVisible(me ? state.economies[me.economyId] : undefined);
    for (const p of state.planets) {
      if (p.type === "asteroid" && !seeAsteroids && p.economyId === null) continue;
      const { x, y } = this.at(state, p.id);
      const r = Math.max(Math.min(9, k * 0.4), k * (0.16 + p.segments.length / 160));
      const asteroid = p.type === "asteroid";
      const rich = p.segments.some((s) => s.deposits.some((d) => d.resource === "aetherite"));
      const texture = !art ? undefined : asteroid ? artTexture(rich ? "space.asteroid-rich" : `space.asteroid-${"abcd"[Number(p.id.slice(1)) % 4]}`) : artTexture(`planet.planet-${p.type}`);
      if (texture) this.sprite(texture, x, y, r * 2.3);
      else g.circle(x, y, r).fill(PLANET_COLORS[p.type] ?? 0x9aa0b5).stroke({ width: 2, color: 0x1a1d2e });
      const owners = state.players.filter((pl) => pl.economyId && pl.economyId === p.economyId);
      if (owners.length) {
        const own = owners.some((pl) => pl.id === me?.id);
        const color = own ? 0x7bf0a0 : PLAYER_COLORS[owners[0]!.color % PLAYER_COLORS.length]!;
        g.circle(x, y, r * 1.3).stroke({ width: 2.5, color, alpha: 0.9 });
        // A small flag in the owner's color on top.
        const flag = art ? artTexture("space.planet-owned-flag") : undefined;
        if (flag) {
          const f = this.sprite(flag, x + r * 0.35, y - r * 0.75, Math.max(10, r * 0.9));
          f.anchor.set(0.5, 1);
          f.tint = color;
        }
      }
      if (this.selected === p.id) {
        const ring = art ? artTexture("space.planet-ring-selected") : undefined;
        // Ring art: inner edge at radius 100 of 256 for a planet 200 wide.
        if (ring) this.sprite(ring, x, y, r * 2.3 * 1.28);
        else front.circle(x, y, r * 1.6).stroke({ width: 2.5, color: 0xffffff, alpha: 0.9 });
      }
      const people = Object.values(state.units).filter((u) => u.planetId === p.id).length;
      // Label on the side away from the sun, else whichever side is free. Planets nobody lives
      // on lose their label when crowded (zoom in to read them); owned or selected ones keep it.
      const out = p.orbit.angle;
      const ox = Math.cos(out);
      const oy = Math.sin(out);
      const t = this.label(people ? `${p.name} · ${people}👤` : p.name, x, y, font, owners.length ? 0xffffff : 0xb8bedc);
      const important = people > 0 || this.selected === p.id;
      if (!this.placeLabel(t, x, y, r * 1.5, [[ox, oy], [0, 1], [0, -1], [-ox, -oy], [1, 0], [-1, 0]], important)) t.visible = false;
      this.hits.push({ id: p.id, x, y, r: Math.max(r * 1.5, 22) });
    }

    // Rockets: a dotted path and the rocket on it.
    for (const f of state.flights) {
      const a = this.at(state, f.from);
      const b = this.at(state, f.to);
      const t = Math.min(1, Math.max(0, (state.tick - f.launchTick) / Math.max(1, f.arrivalTick - f.launchTick)));
      const mine = f.owner === this.playerId;
      const hostile = !mine && state.planets.some((p) => p.id === f.to && p.economyId === me?.economyId) && f.rocket === "combat";
      const color = hostile ? 0xff5c5c : mine ? 0x7bf0a0 : 0xb8bedc;
      dotted(lines, a.x, a.y, b.x, b.y, color, Math.max(4, k * 0.12));
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      // Ship art points right; the launch pad rocket (fallback) points up.
      const ship = art ? artFrames(`ship.${f.rocket !== "colony" ? "rocket-big" : "rocket-small"}`) : [];
      const rocket = ship.length ? ship[Math.floor(this.time * 6) % ship.length] : art ? artTexture(f.rocket !== "colony" ? "building.rocket-big" : "building.rocket-small") : undefined;
      if (rocket) this.sprite(rocket, x, y, Math.max(18, k * 0.5), angle + (ship.length ? 0 : Math.PI / 2));
      else {
        const s = Math.max(5, k * 0.12);
        front.poly([x + Math.cos(angle) * s * 1.6, y + Math.sin(angle) * s * 1.6, x + Math.cos(angle + 2.4) * s, y + Math.sin(angle + 2.4) * s, x + Math.cos(angle - 2.4) * s, y + Math.sin(angle - 2.4) * s]).fill(color);
      }
    }

    this.drawInvasion(state, font);

    for (let i = this.used; i < this.pool.length; i++) this.pool[i]!.visible = false;
    for (let i = this.textsUsed; i < this.texts.length; i++) this.texts[i]!.visible = false;
  }

  /** Twelve arcs around the sun: dashed while missing, gold when built, orange when damaged. */
  private drawShield(state: GameState, canvasPx: number): void {
    const art = hasArt();
    const g = this.back;
    const step = (Math.PI * 2) / SUPERNOVA.segments;
    // The art draws each segment at 12 o'clock on a 1024 canvas, radius 303-337.
    const r0 = (canvasPx * 303) / 1024;
    const r1 = (canvasPx * 337) / 1024;
    state.sun.shield.forEach((seg, i) => {
      const kind = !seg.built ? "empty" : seg.hp < SUPERNOVA.workingHp ? "damaged" : "built";
      const texture = art ? artTexture(`sun.shield.segment.${kind}`) : undefined;
      if (texture) {
        this.sprite(texture, this.cx, this.cy, canvasPx, i * step);
        return;
      }
      const a0 = -Math.PI / 2 + i * step - step / 2 + 0.04;
      const a1 = a0 + step - 0.08;
      const color = kind === "empty" ? 0x8890b8 : kind === "damaged" ? 0xff9f43 : 0xffd166;
      const rm = (r0 + r1) / 2;
      g.moveTo(this.cx + Math.cos(a0) * rm, this.cy + Math.sin(a0) * rm)
        .arc(this.cx, this.cy, rm, a0, a1)
        .stroke({ width: r1 - r0, color, alpha: kind === "empty" ? 0.25 : 0.95 });
    });
  }

  /** The fleet flies in from the edge of the map towards its target and then hovers there. */
  private drawInvasion(state: GameState, font: number): void {
    const inv = state.invasion;
    if (!inv || !(inv.spotted || inv.sieging)) return;
    const k = this.scale;
    const target = this.at(state, inv.target);
    const maxOrbit = Math.max(1, ...state.planets.map((p) => p.orbit.radius));
    const angle = inv.wave * 2.399;
    const edge = { x: this.cx + Math.cos(angle) * (maxOrbit + 0.6) * k, y: this.cy + Math.sin(angle) * (maxOrbit + 0.6) * k };
    const start = inv.arrivalTick - INVADERS.approachCycles * ticksPerCycle(state);
    const t = inv.sieging ? 1 : Math.min(1, Math.max(0, (state.tick - start) / Math.max(1, inv.arrivalTick - start)));
    const hover = { x: target.x + k * 0.35, y: target.y - k * 0.35 };
    const x = edge.x + (hover.x - edge.x) * t;
    const y = edge.y + (hover.y - edge.y) * t + Math.sin(this.time * 2) * k * 0.03;
    if (!inv.sieging) dotted(this.lines, x, y, hover.x, hover.y, 0xff5c5c, Math.max(4, k * 0.12));
    const size = Math.max(22, k * 0.55);
    const idle = hasArt() ? artFrames("invader.mothership.idle") : [];
    const texture = inv.hp < inv.maxHp / 2 && hasArt() ? (artTexture("invader.mothership.damaged") ?? idle[0]) : idle[Math.floor(this.time * 3) % Math.max(1, idle.length)];
    if (texture) this.sprite(texture, x, y, size);
    else this.label("🛸", x, y - size / 2, size * 0.8);
    // Escorts circle the mothership.
    const escort = hasArt() ? artFrames("invader.escort") : [];
    const escorts = Math.min(4, 1 + Math.floor(inv.bonus));
    for (let i = 0; i < escorts; i++) {
      const a = this.time * 1.5 + (i * Math.PI * 2) / escorts;
      const ex = x + Math.cos(a) * size * 0.7;
      const ey = y + Math.sin(a) * size * 0.45;
      const e = escort[Math.floor(this.time * 4) % Math.max(1, escort.length)];
      if (e) this.sprite(e, ex, ey, size * 0.3);
      else this.front.circle(ex, ey, Math.max(2.5, size * 0.07)).fill(0xff8f8f);
    }
    const tag = this.label(inv.sieging ? `Belagerung ${inv.hp}/${inv.maxHp}` : `Welle ${inv.wave}`, x, y, font, 0xff8f8f);
    this.placeLabel(tag, x, y, size * 0.55, [[0, 1], [0, -1], [1, 0], [-1, 0]], true);
  }

  private bindInput(canvas: HTMLCanvasElement): void {
    // Screen point in layout pixels.
    const local = (e: { clientX: number; clientY: number }) => {
      const rect = canvas.getBoundingClientRect();
      return { x: ((e.clientX - rect.left) / rect.width) * this.width, y: ((e.clientY - rect.top) / rect.height) * this.height };
    };
    const pointers = new Map<number, { x: number; y: number }>();
    let down: { id: number; x: number; y: number; moved: boolean } | null = null;
    canvas.addEventListener("pointerdown", (e) => {
      if (!this.stage.visible) return;
      pointers.set(e.pointerId, local(e));
      down = pointers.size === 1 ? { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false } : null;
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!this.stage.visible || !pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId)!;
      const next = local(e);
      if (pointers.size === 2) {
        // Pinch: zoom around the midpoint, pan with it.
        const other = [...pointers.entries()].find(([id]) => id !== e.pointerId)![1];
        const before = Math.hypot(prev.x - other.x, prev.y - other.y);
        const after = Math.hypot(next.x - other.x, next.y - other.y);
        if (before > 0) this.zoomAt(after / before, (next.x + other.x) / 2, (next.y + other.y) / 2);
      } else if (down && down.id === e.pointerId) {
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > TAP_SLOP_PX) down.moved = true;
        if (down.moved) {
          this.pan.x += next.x - prev.x;
          this.pan.y += next.y - prev.y;
          this.applyView();
        }
      }
      pointers.set(e.pointerId, next);
    });
    const release = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      const tap = this.stage.visible && down && down.id === e.pointerId && !down.moved && e.type === "pointerup";
      if (down?.id === e.pointerId) down = null;
      if (!tap) return;
      const { x, y } = local(e);
      let best: { id: string; d: number } | null = null;
      for (const h of this.hits) {
        const d = Math.hypot(h.x - x, h.y - y);
        if (d <= h.r && (!best || d < best.d)) best = { id: h.id, d };
      }
      if (best) this.onSelect(best.id);
    };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener(
      "wheel",
      (e) => {
        if (!this.stage.visible) return;
        e.preventDefault();
        const { x, y } = local(e);
        this.zoomAt(Math.exp(-e.deltaY * 0.0015), x, y);
      },
      { passive: false },
    );
  }
}

function dotted(g: Graphics, x0: number, y0: number, x1: number, y1: number, color: number, gap: number): void {
  const length = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.floor(length / gap);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    g.circle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 1.6).fill({ color, alpha: 0.7 });
  }
}

