import { Application, Container, Graphics, Text } from "pixi.js";
import { BIOMES, BUILDINGS, type GameState } from "../sim";

const TOP = -Math.PI / 2;
const TAP_SLOP_PX = 8;
const HIDDEN_COLOR = 0x2b3150;
const CORE_COLOR = 0x5a3b2e;

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
  private readonly sprites: SegmentSprites[] = [];

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
    private readonly segmentCount: number,
    private readonly onSelect: (index: number) => void,
  ) {
    this.stage.addChild(this.stars, this.wheel, this.marker);
    this.wheel.addChild(this.ground);
    for (let i = 0; i < segmentCount; i++) {
      const icon = new Text({ text: "", style: { fontSize: 28 } });
      icon.anchor.set(0.5, 0.9);
      const mystery = new Text({ text: "?", style: { fontSize: 20, fill: 0x8890b8, fontWeight: "700" } });
      mystery.anchor.set(0.5);
      this.wheel.addChild(icon, mystery);
      this.sprites.push({ icon, mystery });
    }
    this.rotation = this.targetRotation = rotationFor(0, segmentCount);
    this.bindInput(app.canvas);
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
    const n = this.segmentCount;
    const step = (Math.PI * 2) / n;
    const R = this.radius;
    const rInner = R * 0.62;
    const g = this.ground;
    g.clear();

    g.circle(0, 0, R * 1.08).fill({ color: 0x7fb0ff, alpha: 0.08 });
    g.circle(0, 0, rInner).fill(CORE_COLOR);
    g.circle(0, 0, rInner * 0.55).fill(0x7a4b34);

    state.planet.segments.forEach((s, i) => {
      const a0 = i * step - step / 2;
      const a1 = a0 + step;
      const mid = i * step;
      const exhausted = s.deposits.length > 0 && s.deposits.every((d) => !d.infinite && d.amount <= 0);
      const color = s.revealed ? BIOMES[s.biome].color : HIDDEN_COLOR;
      g.poly(sector(rInner, R, a0, a1)).fill({ color, alpha: exhausted ? 0.55 : 1 });
      g.poly(sector(rInner, R, a0, a1)).stroke({ width: 1.5, color: 0x1a1d2e, alpha: 0.6 });

      if (s.revealed && s.workers > 0) {
        for (let w = 0; w < s.workers; w++) {
          const t = (w + 1) / (s.workers + 1);
          const a = a0 + step * t;
          const r = (rInner + R) / 2;
          g.circle(Math.cos(a) * r, Math.sin(a) * r, Math.max(3, R * 0.03)).fill(0xffffff).stroke({ width: 1.5, color: 0x1a1d2e });
        }
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

    // Fixed pointer above the wheel marking the "top" slot.
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
