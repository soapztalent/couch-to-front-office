import { linePlaySeconds } from "../sim/pov";
import type { RangeDot } from "../range/draw";

export type SkillShot = "mark" | "glide" | "relay";

export type SkillFrame = {
  yaw: number;
  pitch: number;
  targets: RangeDot[];
  flash: boolean;
  shot: SkillShot;
};

export type SkillBeat = { shot: SkillShot; lineId: string; text: string };

export type SkillMark = SkillBeat & { t0: number; t1: number; shotT0: number };

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

function ping(t: number, cycle: number): number {
  const u = (t % cycle) / cycle;
  return u < 0.5 ? u * 2 : 2 - u * 2;
}

function markSpot(slot: number): { yaw: number; pitch: number } {
  const spots = [
    { yaw: -16, pitch: 2 },
    { yaw: 10, pitch: -4 },
    { yaw: 18, pitch: 5 },
    { yaw: -8, pitch: -6 },
    { yaw: 4, pitch: 3 },
  ];
  return spots[((slot % spots.length) + spots.length) % spots.length];
}

/** Crosshair travels onto the next mark and leaves again. It does not sit. */
export function sampleMark(t: number): SkillFrame {
  const cycle = 1.45;
  const slot = Math.floor(t / cycle);
  const u = (t % cycle) / cycle;
  const from = markSpot(slot);
  const to = markSpot(slot + 1);
  return {
    yaw: lerp(from.yaw, to.yaw, u),
    pitch: lerp(from.pitch, to.pitch, u),
    targets: [{ yaw: to.yaw, pitch: to.pitch, radius: 1.3, live: true }],
    flash: u > 0.9,
    shot: "mark",
  };
}

/** The bot keeps moving. The crosshair stays with it, then slips, then comes back. */
export function sampleGlide(t: number): SkillFrame {
  const yaw = Math.sin(t * 0.85) * 20;
  const pitch = Math.sin(t * 0.5 + 0.6) * 7;
  const slip = Math.sin(ping(t, 3.1) * Math.PI) * 9;
  return {
    yaw: yaw - slip,
    pitch,
    targets: [{ yaw, pitch, radius: 1.45, live: true }],
    flash: false,
    shot: "glide",
  };
}

const RELAY = [-16, 0, 16];

/** Look goes to the lit mark. The others stay dark. Then the next one lights. */
export function sampleRelay(t: number): SkillFrame {
  const cycle = 1.35;
  const slot = Math.floor(t / cycle);
  const u = (t % cycle) / cycle;
  const from = RELAY[((slot % 3) + 3) % 3];
  const live = (slot + 1) % 3;
  const to = RELAY[live];
  const travel = Math.min(1, u / 0.62);
  return {
    yaw: lerp(from, to, travel),
    pitch: 0,
    targets: RELAY.map((yaw, i) => ({ yaw, pitch: 0, radius: 1.25, live: i === live })),
    flash: u > 0.78 && u < 0.92,
    shot: "relay",
  };
}

/** The three skills, one after another, on one clock. */
export function sampleStep(t: number): SkillFrame {
  const slice = t % 4.2;
  if (slice < 1.4) return sampleMark(t);
  if (slice < 2.8) return sampleGlide(t);
  return sampleRelay(t);
}

export function sampleShot(shot: SkillShot, t: number): SkillFrame {
  if (shot === "glide") return sampleGlide(t);
  if (shot === "relay") return sampleRelay(t);
  return sampleMark(t);
}

export function skillTimeline(beats: SkillBeat[]): { marks: SkillMark[]; total: number } {
  const marks: SkillMark[] = [];
  let t = 0;
  let shotT0 = 0;
  let prev: SkillShot | null = null;
  for (const beat of beats) {
    if (beat.shot !== prev) {
      shotT0 = t;
      prev = beat.shot;
    }
    const dur = linePlaySeconds(beat.text);
    marks.push({ ...beat, t0: t, t1: t + dur, shotT0 });
    t += dur;
  }
  return { marks, total: t };
}

export function skillAt(marks: SkillMark[], total: number, t: number): SkillMark & { local: number } {
  const last = marks[marks.length - 1];
  const clamped = Math.min(Math.max(0, t), Math.max(0, total - 1e-4));
  const hit = marks.find((mark) => clamped >= mark.t0 && clamped < mark.t1) ?? last;
  return { ...hit, local: clamped - hit.shotT0 };
}

export function gapDeg(frame: SkillFrame): number {
  const live = frame.targets.find((target) => target.live) ?? frame.targets[0];
  const dy = (frame.yaw - live.yaw) * (Math.PI / 180);
  const dp = (frame.pitch - live.pitch) * (Math.PI / 180);
  return Math.hypot(dy, dp) * (180 / Math.PI);
}
