import { BARS_PER_THEME, BEATS_PER_BAR, Composer, THEMES, barSeconds, type Mood, type Note, type Theme } from './composer';

export type { Mood } from './composer';

const STORAGE_KEY = 'planetforge.music';
/** How far ahead notes are scheduled, in seconds. Covers timer hiccups on busy frames. */
const LOOKAHEAD = 0.8;
const TICK_MS = 100;
/** Fade when switching music on/off or changing themes, in seconds. */
const FADE = 1.5;
/** After a battle the music stays tense this long, in milliseconds. */
const TENSE_HOLD_MS = 45_000;

export interface MusicSettings {
  enabled: boolean;
  /** 0..1 */
  volume: number;
}

export function loadMusicSettings(raw: string | null): MusicSettings {
  const fallback: MusicSettings = { enabled: true, volume: 0.5 };
  if (!raw) return fallback;
  try {
    const s = JSON.parse(raw) as Partial<MusicSettings>;
    return {
      enabled: typeof s.enabled === 'boolean' ? s.enabled : fallback.enabled,
      volume: typeof s.volume === 'number' && Number.isFinite(s.volume) ? Math.max(0, Math.min(1, s.volume)) : fallback.volume,
    };
  } catch {
    return fallback;
  }
}

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Plays generative background music through Web Audio.
 * Browsers (iOS especially) only allow audio after a user gesture, so call `unlock()` from a
 * tap/click handler; nothing plays before that. Pauses while the page is hidden.
 */
export class Music {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  private composer: Composer;
  private calmIndex = 0;
  private bar = 0;
  private nextBarTime = 0;
  /** Theme gain node of the theme currently being scheduled. */
  private themeGain: GainNode | null = null;
  private mood: Mood = 'calm';
  private tenseUntil = 0;
  private settings: MusicSettings;
  private listeners = new Set<(s: MusicSettings) => void>();

  constructor() {
    this.settings = loadMusicSettings(this.read());
    const calm = THEMES.filter((t) => t.mood === 'calm');
    this.calmIndex = Math.floor(Math.random() * calm.length);
    this.composer = new Composer(calm[this.calmIndex], Math.floor(Math.random() * 1e6));
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => this.refresh());
    }
  }

  get state(): MusicSettings {
    return { ...this.settings };
  }

  onChange(fn: (s: MusicSettings) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      this.bus = this.ctx.createGain();
      this.bus.connect(this.master);
      this.addEcho(this.bus, this.master);
      this.noise = this.makeNoise();
    }
    this.refresh();
  }

  setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    this.save();
    this.refresh();
  }

  setVolume(volume: number): void {
    this.settings.volume = Math.max(0, Math.min(1, volume));
    this.save();
    this.refresh();
  }

  /** Switches between calm and tense music at the next bar. */
  setMood(mood: Mood): void {
    if (mood === this.mood) return;
    this.mood = mood;
    const next = mood === 'tense' ? THEMES.find((t) => t.mood === 'tense')! : this.nextCalm();
    this.switchTo(next);
  }

  /** Something dangerous happened (a battle, later invasions): tense music for a while. */
  alert(): void {
    this.tenseUntil = performance.now() + TENSE_HOLD_MS;
    this.setMood('tense');
  }

  private nextCalm(): Theme {
    const calm = THEMES.filter((t) => t.mood === 'calm');
    this.calmIndex = (this.calmIndex + 1) % calm.length;
    return calm[this.calmIndex];
  }

  private switchTo(theme: Theme): void {
    this.composer = new Composer(theme, Math.floor(Math.random() * 1e6));
    this.bar = 0;
    const ctx = this.ctx;
    if (!ctx || !this.themeGain) return;
    // Let the old theme's tails fade, the new theme fades in on its own gain node.
    const t = Math.max(ctx.currentTime, this.nextBarTime);
    const old = this.themeGain;
    old.gain.setTargetAtTime(0, t, FADE / 3);
    setTimeout(() => old.disconnect(), (t - ctx.currentTime + 10) * 1000);
    this.themeGain = null;
  }

  /** Brings playback in line with settings and page visibility. */
  private refresh(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const visible = typeof document === 'undefined' || document.visibilityState !== 'hidden';
    const playing = this.settings.enabled && visible && this.settings.volume > 0;
    const target = playing ? this.settings.volume * 0.9 : 0;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(target, ctx.currentTime, FADE / 4);

    if (playing) {
      if (ctx.state === 'suspended') void ctx.resume();
      if (!this.timer) {
        this.nextBarTime = ctx.currentTime + 0.1;
        this.timer = setInterval(() => this.tick(), TICK_MS);
      }
    } else if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      // Suspend after the fade so a hidden tab costs no battery.
      const ctxRef = ctx;
      setTimeout(() => {
        if (!this.timer && ctxRef.state === 'running') void ctxRef.suspend();
      }, FADE * 1000);
    }
  }

  private tick(): void {
    const ctx = this.ctx;
    if (!ctx || !this.bus) return;
    if (this.mood === 'tense' && performance.now() > this.tenseUntil) this.setMood('calm');
    // After a long pause (tab in background) do not try to catch up.
    if (this.nextBarTime < ctx.currentTime) this.nextBarTime = ctx.currentTime + 0.05;

    while (this.nextBarTime < ctx.currentTime + LOOKAHEAD) {
      const theme = this.composer.theme;
      if (theme.mood === 'calm' && this.bar >= BARS_PER_THEME) this.switchTo(this.nextCalm());
      if (!this.themeGain) {
        this.themeGain = ctx.createGain();
        this.themeGain.gain.setValueAtTime(0, this.nextBarTime);
        this.themeGain.gain.setTargetAtTime(1, this.nextBarTime, FADE / 3);
        this.themeGain.connect(this.bus);
      }
      const t = this.composer.theme;
      const beat = barSeconds(t) / BEATS_PER_BAR;
      for (const note of this.composer.bar(this.bar)) {
        this.play(note, this.nextBarTime + note.beat * beat, note.length * beat, this.themeGain);
      }
      this.nextBarTime += barSeconds(t);
      this.bar++;
    }
  }

  private play(note: Note, at: number, dur: number, out: AudioNode): void {
    const ctx = this.ctx!;
    const v = note.velocity;
    const env = ctx.createGain();
    env.connect(out);
    const g = env.gain;
    g.setValueAtTime(0, at);

    const osc = (type: OscillatorType, hz: number, detune = 0): OscillatorNode => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = hz;
      o.detune.value = detune;
      return o;
    };
    const run = (src: AudioScheduledSourceNode, dest: AudioNode, stop: number) => {
      src.connect(dest);
      src.start(at);
      src.stop(stop);
    };

    switch (note.voice) {
      case 'pad': {
        const attack = Math.min(1.2, dur / 3);
        const release = 1.6;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        lp.Q.value = 0.3;
        lp.connect(env);
        g.linearRampToValueAtTime(0.05 * v, at + attack);
        g.setValueAtTime(0.05 * v, at + dur);
        g.linearRampToValueAtTime(0, at + dur + release);
        const hz = midiToHz(note.midi);
        run(osc('sawtooth', hz, -7), lp, at + dur + release);
        run(osc('sawtooth', hz, 7), lp, at + dur + release);
        break;
      }
      case 'bass': {
        const peak = 0.22 * v;
        g.linearRampToValueAtTime(peak, at + 0.02);
        g.setTargetAtTime(peak * 0.6, at + 0.02, 0.3);
        g.setValueAtTime(peak * 0.6, at + dur);
        g.linearRampToValueAtTime(0, at + dur + 0.15);
        const hz = midiToHz(note.midi);
        run(osc('sine', hz), env, at + dur + 0.2);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 400;
        const tri = ctx.createGain();
        tri.gain.value = 0.4;
        lp.connect(tri).connect(env);
        run(osc('triangle', hz), lp, at + dur + 0.2);
        break;
      }
      case 'pluck': {
        const peak = 0.09 * v;
        g.linearRampToValueAtTime(peak, at + 0.008);
        g.setTargetAtTime(0, at + 0.008, Math.max(0.12, dur * 0.35));
        run(osc('triangle', midiToHz(note.midi)), env, at + dur + 1.2);
        break;
      }
      case 'bell': {
        const peak = 0.06 * v;
        g.linearRampToValueAtTime(peak, at + 0.005);
        g.setTargetAtTime(0, at + 0.005, dur * 0.4);
        const hz = midiToHz(note.midi);
        run(osc('sine', hz), env, at + dur * 2.5);
        const partial = ctx.createGain();
        partial.gain.value = 0.25;
        partial.connect(env);
        run(osc('sine', hz * 2.76), partial, at + dur * 2.5);
        break;
      }
      case 'kick': {
        const o = osc('sine', 120);
        o.frequency.setValueAtTime(120, at);
        o.frequency.exponentialRampToValueAtTime(42, at + 0.12);
        g.linearRampToValueAtTime(0.35 * v, at + 0.004);
        g.setTargetAtTime(0, at + 0.004, 0.08);
        run(o, env, at + 0.5);
        break;
      }
      case 'hat': {
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 7000;
        hp.connect(env);
        g.linearRampToValueAtTime(0.05 * v, at + 0.002);
        g.setTargetAtTime(0, at + 0.002, 0.025);
        run(src, hp, at + 0.15);
        break;
      }
    }
  }

  /** A soft feedback delay, so the sparse notes sound like they are in space. */
  private addEcho(from: AudioNode, to: AudioNode): void {
    const ctx = this.ctx!;
    const send = ctx.createGain();
    send.gain.value = 0.3;
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.45;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.4;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    from.connect(send).connect(delay).connect(lp).connect(feedback).connect(delay);
    lp.connect(to);
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private read(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Private mode or storage full: the setting just is not remembered.
    }
    for (const fn of this.listeners) fn(this.state);
  }
}

/** Shared instance for the whole game. */
export const music = new Music();
