import { Container, Sprite, type Texture } from "pixi.js";
import { artFrames, artTexture } from "./art";

/**
 * Short-lived decoration on the planet wheel: resource pops, smoke, dust, sparkles. Purely visual;
 * positions are in wheel coordinates, so particles turn with the planet.
 */
interface Particle {
  sprite: Sprite;
  age: number;
  life: number;
  /** Drift in wheel units per second. */
  vx: number;
  vy: number;
  frames: Texture[];
  /** Size at the end of its life relative to the start. */
  grow: number;
  baseScale: number;
  /** Fixed non-uniform scale for `once` animations (baseScale 0). */
  scaleX?: number;
  scaleY?: number;
  /** Fade out over the last 40 % (default true). */
  fade?: boolean;
  /** Small overshoot when appearing, for icons. */
  popIn: boolean;
}

/** Hard cap so a long pause in a background tab can't pile up sprites. */
const MAX_PARTICLES = 120;

export class Effects {
  readonly container = new Container();
  private readonly particles: Particle[] = [];
  private readonly spare: Sprite[] = [];

  /** Resource icon rising out of a segment. `angle` is the segment's outward direction. */
  pop(resource: string, x: number, y: number, angle: number, size: number): void {
    const icon = artTexture(`resource.${resource}.mini`) ?? artTexture(`resource.${resource}`);
    if (!icon) return;
    const burst = artFrames("fx.resource-pop");
    if (burst.length) this.spawn(burst, x, y, angle, size * 1.3, 0, 300, 1.2, false);
    this.spawn([icon], x, y, angle, size, size * 1.1, 1000, 1, true);
  }

  /** Puff of smoke drifting away from the planet. */
  smoke(x: number, y: number, angle: number, size: number): void {
    const frames = artFrames("fx.smoke");
    if (frames.length) this.spawn(frames, x, y, angle, size, size * 0.9, 1800, 1.8, false, (Math.random() - 0.5) * 0.4);
  }

  /** Construction or demolition dust on the surface. */
  dust(x: number, y: number, angle: number, size: number): void {
    const frames = artFrames("fx.dust");
    if (frames.length) this.spawn(frames, x, y, angle, size, size * 0.15, 800, 1.3, false);
  }

  /** Glitter, e.g. when fog lifts from a segment. */
  sparkle(x: number, y: number, angle: number, size: number): void {
    const frames = artFrames("fx.sparkle");
    if (frames.length) this.spawn(frames, x, y, angle, size, size * 0.3, 700, 1, false);
  }

  /**
   * Plays a frame animation once in place, stretched to `width` x `height` (no drift). Used for
   * screen-level effects such as beams and the supernova; `fade` false keeps it opaque to the end.
   */
  once(frames: Texture[], x: number, y: number, rotation: number, width: number, height: number, life: number, fade = true): void {
    if (!frames.length || this.particles.length >= MAX_PARTICLES) return;
    const texture = frames[0]!;
    const sprite = this.spare.pop() ?? new Sprite();
    sprite.texture = texture;
    sprite.anchor.set(texture.defaultAnchor?.x ?? 0.5, texture.defaultAnchor?.y ?? 0.5);
    sprite.position.set(x, y);
    sprite.rotation = rotation;
    sprite.alpha = 1;
    sprite.visible = true;
    sprite.scale.set(width / Math.max(1, texture.orig.width), height / Math.max(1, texture.orig.height));
    this.container.addChild(sprite);
    this.particles.push({ sprite, age: 0, life, vx: 0, vy: 0, frames, grow: 1, baseScale: 0, scaleX: sprite.scale.x, scaleY: sprite.scale.y, popIn: false, fade });
  }

  clear(): void {
    for (const p of this.particles) this.release(p.sprite);
    this.particles.length = 0;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.age += deltaMs;
      const t = p.age / p.life;
      if (t >= 1) {
        this.release(p.sprite);
        this.particles.splice(i, 1);
        continue;
      }
      const s = p.sprite;
      s.x += p.vx * dt;
      s.y += p.vy * dt;
      if (p.frames.length > 1) s.texture = p.frames[Math.min(p.frames.length - 1, Math.floor(t * p.frames.length))]!;
      if (p.baseScale > 0) {
        const pop = p.popIn && t < 0.15 ? 1 + 0.35 * Math.sin((t / 0.15) * Math.PI) : 1;
        s.scale.set(p.baseScale * (1 + (p.grow - 1) * t) * pop);
      }
      s.alpha = p.fade === false || t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    }
  }

  private spawn(frames: Texture[], x: number, y: number, angle: number, size: number, speed: number, life: number, grow: number, popIn: boolean, spin = 0): void {
    if (this.particles.length >= MAX_PARTICLES) return;
    const texture = frames[0]!;
    const sprite = this.spare.pop() ?? new Sprite();
    sprite.texture = texture;
    sprite.anchor.set(0.5);
    sprite.position.set(x, y);
    // Upright relative to the surface (outward = up on screen when the segment is on top).
    sprite.rotation = angle + Math.PI / 2 + spin;
    sprite.alpha = 1;
    sprite.visible = true;
    const baseScale = size / Math.max(1, texture.orig.width);
    sprite.scale.set(baseScale);
    this.container.addChild(sprite);
    this.particles.push({ sprite, age: 0, life, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, frames, grow, baseScale, popIn });
  }

  private release(sprite: Sprite): void {
    sprite.visible = false;
    this.container.removeChild(sprite);
    this.spare.push(sprite);
  }
}
