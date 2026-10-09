import { clamp } from "../sim/geom";

export type RangeMode = "snap" | "follow" | "chain" | "rush" | "line";

type Target = { yaw: number; pitch: number; radius: number; born: number; live: boolean };

export type RangeSnapshot = {
  targets: Target[];
  score: number;
  hits: number;
  misses: number;
  secondsLeft: number;
  mode: RangeMode;
};

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ang(y1: number, p1: number, y2: number, p2: number): number {
  const dy = (y1 - y2) * (Math.PI / 180);
  const dp = (p1 - p2) * (Math.PI / 180);
  return Math.hypot(dy, dp) * (180 / Math.PI);
}

export class RangeSession {
  yaw = 0;
  pitch = 0;
  hits = 0;
  misses = 0;
  points = 0;
  trackOn = 0;
  trackOff = 0;
  jitter = 0;
  samples = 0;
  private targets: Target[] = [];
  private elapsed = 0;
  private nextTick = 0.05;
  private rng = mulberry(1);
  private prevErr = 0;

  constructor(
    readonly mode: RangeMode,
    readonly duration = 20,
    seed = 1,
  ) {
    this.rng = mulberry(seed || 1);
    if (mode === "chain") {
      this.targets = [0, 1, 2].map((i) => this.spawn(0, (i - 1) * 12, i === 0));
    } else if (mode === "follow" || mode === "line") {
      this.targets = [this.spawn(0, 0, true)];
    } else {
      this.targets = [this.spawn(0, 0, true)];
    }
  }

  get finished(): boolean {
    return this.elapsed >= this.duration;
  }

  update(dt: number, lookYaw: number, lookPitch: number, shot: boolean, firing: boolean): void {
    if (this.finished) return;
    this.elapsed += dt;
    this.yaw += lookYaw;
    this.pitch = clamp(this.pitch + lookPitch, -40, 40);
    this.moveBots();
    if (this.mode === "follow" || this.mode === "line") {
      const t = this.targets[0];
      const err = ang(this.yaw, this.pitch, t.yaw, t.pitch);
      if (this.samples > 0) this.jitter += Math.abs(err - this.prevErr);
      this.prevErr = err;
      this.samples += 1;
      while (this.nextTick <= this.elapsed) {
        this.nextTick += 0.05;
        if (!firing) continue;
        if (err <= t.radius) {
          this.trackOn += 1;
          this.points += this.mode === "line" ? 8 : 10;
        } else {
          this.trackOff += 1;
          this.points -= this.mode === "line" ? 7 : 6;
        }
      }
      return;
    }
    if (!shot) return;
    const pool = this.mode === "chain" ? this.targets.filter((t) => t.live) : this.targets.filter((t) => t.live);
    let best: Target | null = null;
    let bestErr = 99;
    for (const t of pool) {
      const err = ang(this.yaw, this.pitch, t.yaw, t.pitch);
      if (err < bestErr) {
        bestErr = err;
        best = t;
      }
    }
    if (!best || bestErr > best.radius) {
      this.misses += 1;
      this.points -= this.mode === "rush" ? 28 : 22;
      return;
    }
    const rt = (this.elapsed - best.born) * 1000;
    const bonus = clamp((420 - rt) / 320, 0, 1) * 40;
    this.points += 80 + bonus;
    this.hits += 1;
    if (this.mode === "chain") {
      const idx = this.targets.indexOf(best);
      const a = this.rng() * Math.PI * 2;
      const dist = 8 + this.rng() * 10;
      best.yaw = clamp(Math.cos(a) * dist, -40, 40);
      best.pitch = clamp(Math.sin(a) * dist * 0.4, -18, 18);
      best.born = this.elapsed;
      this.targets.forEach((t, i) => {
        t.live = i === (idx + 1) % this.targets.length;
      });
      this.targets[this.targets.findIndex((t) => t.live)].born = this.elapsed;
    } else {
      const spread = this.mode === "rush" ? 14 : 18;
      const min = this.mode === "rush" ? 3 : 4;
      const dist = min + this.rng() * spread;
      const a = this.rng() * Math.PI * 2;
      best.yaw = clamp(this.yaw + Math.cos(a) * dist, -50, 50);
      best.pitch = clamp(this.pitch + Math.sin(a) * dist * 0.55, -24, 24);
      best.born = this.elapsed;
      best.radius = this.mode === "rush" ? 0.85 : 1.15;
    }
  }

  snapshot(): RangeSnapshot {
    return {
      targets: this.targets.map((t) => ({ ...t })),
      score: Math.max(0, Math.round(this.points)),
      hits: this.hits + this.trackOn,
      misses: this.misses + this.trackOff,
      secondsLeft: Math.max(0, this.duration - this.elapsed),
      mode: this.mode,
    };
  }

  smoothness(): number {
    if (this.samples < 5) return 1;
    return this.jitter / this.samples;
  }

  private moveBots(): void {
    if (this.mode !== "follow" && this.mode !== "line") return;
    const t = this.targets[0];
    const speed = this.mode === "line" ? 0.55 : 1;
    t.yaw = Math.sin(this.elapsed * 1.3 * speed) * 14 + Math.sin(this.elapsed * 0.45 * speed) * 6;
    t.pitch = Math.sin(this.elapsed * 0.9 * speed + 1) * 7;
    t.radius = this.mode === "line" ? 1.5 : 1.35;
  }

  private spawn(time: number, yaw: number, live: boolean): Target {
    return {
      yaw,
      pitch: (this.rng() - 0.5) * 8,
      radius: this.mode === "rush" ? 0.85 : 1.15,
      born: time,
      live,
    };
  }
}
